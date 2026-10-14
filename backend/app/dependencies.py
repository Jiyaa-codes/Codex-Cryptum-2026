import hmac
import time
from typing import Annotated
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from .config import ORIGIN
from .database import Sessions
from .models import LoginSession, User
from .security import digest

def db():
    with Sessions() as session:
        yield session


DB = Annotated[Session, Depends(db)]


def require_origin(request: Request):
    if request.headers.get('origin') != ORIGIN:
        raise HTTPException(403, 'Allowed Origin header required')


def current_user(request: Request, session: DB) -> User:
    raw = request.cookies.get('ctf_session', '')
    if not raw or len(raw) > 128:
        raise HTTPException(401, 'Login required')
    login = session.get(LoginSession, digest(raw))
    if not login or login.expires <= int(time.time()):
        raise HTTPException(401, 'Session expired or invalid')
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        require_origin(request)
        csrf = request.headers.get('x-csrf-token', '')
        if not csrf or not hmac.compare_digest(digest(csrf), login.csrf_hash):
            raise HTTPException(403, 'Invalid CSRF token')
    user = session.get(User, login.user_id)
    if user is None:
        raise HTTPException(401, 'Login required')
    return user


Auth = Annotated[User, Depends(current_user)]


