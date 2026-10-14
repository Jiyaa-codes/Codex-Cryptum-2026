import hashlib
import hmac
import secrets
from pwdlib import PasswordHash
from .config import FLAG_SECRET

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash(secrets.token_urlsafe(32))


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def flag_for(team_id: int, challenge_id: int) -> str:
    message = f'ctf-v1:{team_id}:{challenge_id}'.encode()
    signature = hmac.new(FLAG_SECRET.encode(), message, hashlib.sha256).hexdigest()
    return f'CTF{{{signature}}}'


