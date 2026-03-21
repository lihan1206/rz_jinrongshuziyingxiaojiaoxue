import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.settings import get_cfg


cfg = get_cfg()


def make_hash(raw_pwd: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", raw_pwd.encode("utf-8"), salt.encode("utf-8"), 120000)
    return f"{salt}${digest.hex()}"


def verify_hash(raw_pwd: str, pwd_hash: str) -> bool:
    try:
        salt, saved = pwd_hash.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", raw_pwd.encode("utf-8"), salt.encode("utf-8"), 120000)
    return hmac.compare_digest(digest.hex(), saved)


def make_token(subject: str) -> str:
    expire_at = datetime.now(timezone.utc) + timedelta(minutes=cfg.token_expire_minutes)
    payload = {"sub": subject, "exp": expire_at}
    return jwt.encode(payload, cfg.secret_key, algorithm="HS256")


def read_subject(token: str) -> str | None:
    try:
        payload = jwt.decode(token, cfg.secret_key, algorithms=["HS256"])
        return payload.get("sub")
    except JWTError:
        return None
