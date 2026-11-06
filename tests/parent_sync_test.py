import hashlib, tempfile, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app import parent_auth, main
from fastapi.testclient import TestClient


def run():
    old = parent_auth.DB_PATH
    with tempfile.TemporaryDirectory() as td:
        parent_auth.DB_PATH = Path(td) / 'parents.sqlite3'
        parent_auth.init_db()
        parent, token = parent_auth.create_parent('Sync Parent', 'sync@example.com', 'StrongPass123!')
        other, other_token = parent_auth.create_parent('Other Parent', 'other@example.com', 'StrongPass123!')
        code_hash = hashlib.sha256(b'ABCDE-FGHIJ-KLMNP-QRSTU-VWXYZ').hexdigest()
        envelope = '{"format":"SM-SCHOOL-AI-ENC-1","data":"opaque-ciphertext-value"}'
        with TestClient(main.app) as client:
            headers = {'Authorization': 'Bearer ' + token}
            other_headers = {'Authorization': 'Bearer ' + other_token}
            assert client.post('/api/v1/parents/sync/create', headers=headers, json={'code_hash': code_hash, 'encrypted_payload': envelope}).status_code == 200
            assert client.post('/api/v1/parents/sync/redeem', headers=other_headers, json={'code_hash': code_hash}).status_code == 404
            redeemed = client.post('/api/v1/parents/sync/redeem', headers=headers, json={'code_hash': code_hash})
            assert redeemed.status_code == 200 and redeemed.json()['encrypted_payload'] == envelope
            assert client.post('/api/v1/parents/sync/redeem', headers=headers, json={'code_hash': code_hash}).status_code == 404
            assert client.post('/api/v1/parents/sync/create', json={'code_hash': code_hash, 'encrypted_payload': envelope}).status_code == 401
            assert client.post('/api/v1/parents/sync/create', headers=headers, json={'code_hash': 'bad', 'encrypted_payload': envelope}).status_code == 422
            assert client.post('/api/v1/parents/sync/create', headers=headers, json={'code_hash': hashlib.sha256(b'new').hexdigest(), 'encrypted_payload': 'x'}).status_code == 422
        print('PASS: parent-authenticated encrypted package creation, account isolation, one-time redemption and request validation')
    parent_auth.DB_PATH = old

if __name__ == '__main__':
    run()
