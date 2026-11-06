import tempfile, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app import parent_auth, main
from fastapi.testclient import TestClient


def run():
    old = parent_auth.DB_PATH
    with tempfile.TemporaryDirectory() as td:
        parent_auth.DB_PATH = Path(td) / 'parents.sqlite3'
        parent_auth.init_db()
        parent, token = parent_auth.create_parent('Parent One', 'PARENT@example.com', 'StrongPass123!')
        assert parent['role'] == 'parent' and parent['email'] == 'parent@example.com'
        assert parent_auth.get_parent(token)['id'] == parent['id']
        assert parent_auth.login_parent('parent@example.com', 'wrong-password') is None
        logged = parent_auth.login_parent('PARENT@example.com', 'StrongPass123!')
        assert logged and parent_auth.get_parent(logged[1])['role'] == 'parent'
        try:
            parent_auth.create_parent('Another Parent', 'parent@example.com', 'StrongPass123!')
            raise AssertionError('duplicate email accepted')
        except ValueError:
            pass
        try:
            parent_auth.create_parent('P', 'bad-email', 'StrongPass123!')
            raise AssertionError('invalid email accepted')
        except ValueError:
            pass
        try:
            parent_auth.create_parent('Parent Two', 'two@example.com', 'short')
            raise AssertionError('weak password accepted')
        except ValueError:
            pass
        parent_auth.change_password(parent['id'], 'StrongPass123!', 'NewStrongPass456!')
        assert parent_auth.get_parent(token) is None, 'password change must revoke sessions'
        assert parent_auth.login_parent('parent@example.com', 'NewStrongPass456!')
        with parent_auth._connect() as db:
            stored = db.execute('SELECT password_hash FROM parent_accounts').fetchone()[0]
            assert stored != 'NewStrongPass456!' and len(stored) == 64
        # Persistent throttling applies to both account and client-IP buckets.
        for _ in range(parent_auth.LOGIN_MAX_FAILURES):
            parent_auth.record_login_failure("locked@example.com", "203.0.113.8")
        assert parent_auth.login_throttle_status("locked@example.com", "203.0.113.9") > 0
        assert parent_auth.login_throttle_status("another@example.com", "203.0.113.8") > 0
        parent_auth.clear_login_failures("locked@example.com", "203.0.113.8")
        assert parent_auth.login_throttle_status("locked@example.com", "203.0.113.8") == 0
        # Exercise the actual API contract against an isolated account database.
        with TestClient(main.app) as client:
            assert client.get('/api/v1/parents/me').status_code == 401
            response = client.post('/api/v1/parents/register', json={'name':'API Parent','email':'api-parent@example.com','password':'AnotherStrong123!'})
            assert response.status_code == 200, response.text
            api_token = response.json()['access_token']
            assert client.get('/api/v1/parents/me', headers={'Authorization':'Bearer '+api_token}).json()['parent']['role'] == 'parent'
            assert client.post('/api/v1/parents/logout', headers={'Authorization':'Bearer '+api_token}).status_code == 200
            assert client.get('/api/v1/parents/me', headers={'Authorization':'Bearer '+api_token}).status_code == 401
            # Five bad attempts from one IP trigger a temporary 429 response.
            for _ in range(parent_auth.LOGIN_MAX_FAILURES):
                failed = client.post('/api/v1/parents/login', json={'email':'api-parent@example.com','password':'wrong-password'})
                assert failed.status_code == 401
            throttled = client.post('/api/v1/parents/login', json={'email':'api-parent@example.com','password':'AnotherStrong123!'})
            assert throttled.status_code == 429 and int(throttled.headers['retry-after']) > 0
            parent_auth.clear_login_failures('api-parent@example.com', 'testclient')
        print('PASS: parent-only account creation, password hashing, login, validation, session revocation, password change, persistent login throttling and protected API routes')
    parent_auth.DB_PATH = old

if __name__ == '__main__':
    run()
