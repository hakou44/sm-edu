"""Parent-only account authentication for SM SCHOOL AI.

Passwords are PBKDF2-SHA256 hashed; opaque bearer tokens are stored only as
SHA-256 hashes. This module intentionally does not expose student records.
"""
from __future__ import annotations
import hashlib, hmac, os, re, secrets, sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

DB_PATH = Path(os.getenv("PARENT_AUTH_DB", str(Path(__file__).resolve().parents[1] / "data" / "parents.sqlite3")))
PBKDF2_ROUNDS = 310_000
TOKEN_DAYS = 30
LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW_MINUTES = 15
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    return db


def init_db():
    with _connect() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS parent_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'parent' CHECK(role='parent'),
            created_at TEXT NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS parent_sessions (
            token_hash TEXT PRIMARY KEY,
            parent_id INTEGER NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        )""")
        db.execute("CREATE INDEX IF NOT EXISTS idx_parent_sessions_expiry ON parent_sessions(expires_at)")
        db.execute("""CREATE TABLE IF NOT EXISTS parent_login_attempts (
            bucket_hash TEXT NOT NULL,
            failed_at TEXT NOT NULL
        )""")
        db.execute("CREATE INDEX IF NOT EXISTS idx_parent_login_attempts_bucket ON parent_login_attempts(bucket_hash, failed_at)")
        db.execute("""CREATE TABLE IF NOT EXISTS parent_login_attempts (
            bucket_hash TEXT NOT NULL,
            failed_at TEXT NOT NULL
        )""")
        db.execute("CREATE INDEX IF NOT EXISTS idx_parent_login_attempts_bucket ON parent_login_attempts(bucket_hash, failed_at)")
        db.execute("""CREATE TABLE IF NOT EXISTS parent_sync_packages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE,
            code_hash TEXT NOT NULL UNIQUE,
            encrypted_payload TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        )""")
        db.execute("CREATE INDEX IF NOT EXISTS idx_parent_sync_expiry ON parent_sync_packages(expires_at)")


def _password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ROUNDS, dklen=32)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_parent(name: str, email: str, password: str):
    name = " ".join(name.strip().split())
    email = email.strip().lower()
    if len(name) < 2 or len(name) > 80:
        raise ValueError("Enter a parent name between 2 and 80 characters.")
    if len(email) > 254 or not EMAIL_RE.fullmatch(email):
        raise ValueError("Enter a valid email address.")
    if len(password) < 10 or len(password) > 128:
        raise ValueError("Password must be between 10 and 128 characters.")
    salt = secrets.token_bytes(16)
    digest = _password(password, salt)
    now = datetime.now(timezone.utc)
    token = secrets.token_urlsafe(40)
    try:
        with _connect() as db:
            cur = db.execute("INSERT INTO parent_accounts(name,email,password_hash,password_salt,created_at) VALUES(?,?,?,?,?)", (name,email,digest.hex(),salt.hex(),now.isoformat()))
            parent_id = cur.lastrowid
            db.execute("INSERT INTO parent_sessions(token_hash,parent_id,expires_at,created_at) VALUES(?,?,?,?)", (_token_hash(token),parent_id,(now+timedelta(days=TOKEN_DAYS)).isoformat(),now.isoformat()))
            return {"id": parent_id, "name": name, "email": email, "role": "parent"}, token
    except sqlite3.IntegrityError as exc:
        raise ValueError("An account with this email already exists.") from exc



def _login_bucket(kind: str, value: str) -> str:
    return hashlib.sha256((kind + ":" + value.strip().lower()).encode("utf-8")).hexdigest()


def login_throttle_status(email: str, client_ip: str):
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(minutes=LOGIN_WINDOW_MINUTES)).isoformat()
    buckets = (_login_bucket("email", email), _login_bucket("ip", client_ip or "unknown"))
    with _connect() as db:
        db.execute("DELETE FROM parent_login_attempts WHERE failed_at < ?", (cutoff,))
        for bucket in buckets:
            rows = db.execute("SELECT failed_at FROM parent_login_attempts WHERE bucket_hash=? AND failed_at>=? ORDER BY failed_at", (bucket, cutoff)).fetchall()
            if len(rows) >= LOGIN_MAX_FAILURES:
                retry_at = datetime.fromisoformat(rows[0]["failed_at"]) + timedelta(minutes=LOGIN_WINDOW_MINUTES)
                return max(1, int((retry_at - now).total_seconds()))
    return 0


def record_login_failure(email: str, client_ip: str):
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as db:
        db.executemany("INSERT INTO parent_login_attempts(bucket_hash,failed_at) VALUES(?,?)", [
            (_login_bucket("email", email), now), (_login_bucket("ip", client_ip or "unknown"), now)])


def clear_login_failures(email: str, client_ip: str):
    with _connect() as db:
        db.executemany("DELETE FROM parent_login_attempts WHERE bucket_hash=?", [
            (_login_bucket("email", email),), (_login_bucket("ip", client_ip or "unknown"),)])


def login_parent(email: str, password: str):
    email = email.strip().lower()
    now = datetime.now(timezone.utc)
    with _connect() as db:
        row = db.execute("SELECT * FROM parent_accounts WHERE email=? AND role='parent'", (email,)).fetchone()
        # Use a fixed dummy salt/hash path for unknown accounts to reduce timing differences.
        if row is None:
            _password(password, b"sm-school-ai-dummy"); return None
        try: salt = bytes.fromhex(row["password_salt"]); expected = bytes.fromhex(row["password_hash"])
        except ValueError: return None
        if not hmac.compare_digest(_password(password, salt), expected): return None
        token = secrets.token_urlsafe(40)
        db.execute("INSERT INTO parent_sessions(token_hash,parent_id,expires_at,created_at) VALUES(?,?,?,?)", (_token_hash(token),row["id"],(now+timedelta(days=TOKEN_DAYS)).isoformat(),now.isoformat()))
        db.execute("DELETE FROM parent_sessions WHERE expires_at < ?", (now.isoformat(),))
        return {"id": row["id"], "name": row["name"], "email": row["email"], "role": "parent"}, token


def get_parent(token: str | None):
    if not token: return None
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as db:
        row = db.execute("SELECT a.id,a.name,a.email,a.role FROM parent_sessions s JOIN parent_accounts a ON a.id=s.parent_id WHERE s.token_hash=? AND s.expires_at>? AND a.role='parent'", (_token_hash(token),now)).fetchone()
        return dict(row) if row else None


def revoke_token(token: str | None):
    if not token: return
    with _connect() as db: db.execute("DELETE FROM parent_sessions WHERE token_hash=?", (_token_hash(token),))


def change_password(parent_id: int, current: str, new: str):
    if len(new) < 10 or len(new) > 128: raise ValueError("New password must be between 10 and 128 characters.")
    with _connect() as db:
        row=db.execute("SELECT password_hash,password_salt FROM parent_accounts WHERE id=? AND role='parent'",(parent_id,)).fetchone()
        if not row or not hmac.compare_digest(_password(current,bytes.fromhex(row['password_salt'])),bytes.fromhex(row['password_hash'])):
            raise ValueError("Current password is incorrect.")
        salt=secrets.token_bytes(16); digest=_password(new,salt)
        db.execute("UPDATE parent_accounts SET password_hash=?,password_salt=? WHERE id=?",(digest.hex(),salt.hex(),parent_id))
        db.execute("DELETE FROM parent_sessions WHERE parent_id=?",(parent_id,))
        db.execute("DELETE FROM parent_sync_packages WHERE parent_id=?",(parent_id,))


def create_sync_package(parent_id: int, code_hash: str, encrypted_payload: str):
    """Store an opaque client-encrypted backup for one-time cross-device transfer."""
    if not re.fullmatch(r"[a-f0-9]{64}", code_hash):
        raise ValueError("Invalid transfer code fingerprint.")
    if not encrypted_payload or len(encrypted_payload) > 8_000_000:
        raise ValueError("Encrypted backup is empty or exceeds 8 MB.")
    now = datetime.now(timezone.utc)
    with _connect() as db:
        db.execute("DELETE FROM parent_sync_packages WHERE expires_at < ?", (now.isoformat(),))
        db.execute("DELETE FROM parent_sync_packages WHERE parent_id=? AND id NOT IN (SELECT id FROM parent_sync_packages WHERE parent_id=? ORDER BY created_at DESC LIMIT 2)", (parent_id,parent_id))
        db.execute("INSERT INTO parent_sync_packages(parent_id,code_hash,encrypted_payload,created_at,expires_at) VALUES(?,?,?,?,?)", (parent_id,code_hash,encrypted_payload,now.isoformat(),(now+timedelta(minutes=20)).isoformat()))
    return {"expires_in_minutes": 20}


def redeem_sync_package(parent_id: int, code_hash: str):
    """Atomically consume a one-time encrypted package belonging to this parent."""
    if not re.fullmatch(r"[a-f0-9]{64}", code_hash):
        return None
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT id,encrypted_payload FROM parent_sync_packages WHERE parent_id=? AND code_hash=? AND expires_at>?", (parent_id,code_hash,now)).fetchone()
        if not row:
            return None
        db.execute("DELETE FROM parent_sync_packages WHERE id=?", (row["id"],))
        return {"encrypted_payload": row["encrypted_payload"]}
