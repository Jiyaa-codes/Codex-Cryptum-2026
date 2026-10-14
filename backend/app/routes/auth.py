import secrets
import time
from fastapi import HTTPException, Request, Response
from sqlalchemy import select
from ..config import SECURE
from ..dependencies import Auth, DB, require_origin
from ..models import LoginSession, User
from ..rate_limits import limit
from ..schemas import Credentials
from ..security import DUMMY_HASH, digest, passwords

from fastapi import APIRouter

router = APIRouter()

@router.post('/auth/login')
def login(body: Credentials, request: Request, response: Response, session: DB):
    require_origin(request)
    # Ignore arbitrary X-Forwarded-For. Configure trusted proxy handling at deployment.
    ip = request.client.host if request.client else 'unknown'
    limit('login-ip', ip, 30, 60)
    limit('login-account', body.username, 10, 60)
    user = session.scalar(select(User).where(User.username == body.username))
    valid = passwords.verify(body.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, 'Invalid credentials')
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    session.add(LoginSession(token_hash=digest(token), user_id=user.id,
                             csrf_hash=digest(csrf), expires=int(time.time()) + 8 * 3600))
    session.commit()
    response.set_cookie('ctf_session', token, httponly=True, secure=SECURE,
                        samesite='lax', max_age=8 * 3600, path='/')
    return {'csrf_token': csrf, 'user_id': user.id, 'team_id': user.team_id}


@router.get('/auth/me')
def me(user: Auth):
    return {'user_id': user.id, 'username': user.username, 'team_id': user.team_id}


@router.get('/auth/csrf')
def csrf_token(user: Auth, request: Request, session: DB):
    # Rotate token after page reload; old token intentionally stops working.
    token = secrets.token_urlsafe(32)
    login = session.get(LoginSession, digest(request.cookies['ctf_session']))
    login.csrf_hash = digest(token)
    session.commit()
    return {'csrf_token': token}


@router.post('/auth/logout', status_code=204)
def logout(user: Auth, request: Request, session: DB):
    login = session.get(LoginSession, digest(request.cookies['ctf_session']))
    session.delete(login)
    session.commit()
    response = Response(status_code=204)
    response.delete_cookie('ctf_session', path='/', secure=SECURE, httponly=True, samesite='lax')
    return response


