import os
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

TEST_DIR = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = 'sqlite:///' + (Path(TEST_DIR.name) / 'test.db').as_posix()
os.environ['FLAG_SECRET'] = 'test-only-secret-' + 'x' * 32
os.environ['COOKIE_SECURE'] = 'false'
os.environ['ALLOWED_ORIGIN'] = 'http://testserver'

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from app.database import Base, Sessions, engine
from app.models import Challenge, Solve, Team, User
from app.main import app
from app.security import flag_for, passwords


@pytest.fixture(scope='session', autouse=True)
def cleanup_database():
    yield
    engine.dispose()
    TEST_DIR.cleanup()


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with Sessions.begin() as db:
        for i in (1, 2):
            db.add(Team(id=i, name=f'Team {i}'))
            db.flush()
            db.add(User(id=i, username=f'user{i}', password_hash=passwords.hash('long-test-password'), team_id=i))
        now = int(time.time())
        db.add(Challenge(id=1, title='Test', description='Test', points=100,
                         opens_at=now-60, closes_at=now+3600, active=True))


def logged_in(username='user1'):
    client = TestClient(app)
    result = client.post('/auth/login', headers={'Origin': 'http://testserver'},
                         json={'username': username, 'password': 'long-test-password'})
    assert result.status_code == 200
    headers = {'Origin': 'http://testserver', 'X-CSRF-Token': result.json()['csrf_token']}
    return client, headers


def test_auth_csrf_and_revocation():
    client = TestClient(app)
    assert client.get('/challenges').status_code == 401
    assert client.post('/auth/login', json={'username': 'user1', 'password': 'long-test-password'}).status_code == 403
    client, headers = logged_in()
    assert client.get('/auth/me').json()['team_id'] == 1
    assert client.post('/challenges/1/submissions', json={'flag': 'wrong'}).status_code == 403
    assert client.post('/auth/logout', headers=headers).status_code == 204
    assert client.get('/auth/me').status_code == 401


def test_team_flags_and_extra_fields():
    client, headers = logged_in()
    url = '/challenges/1/submissions'
    assert client.post(url, headers=headers, json={'flag': flag_for(2, 1)}).json()['correct'] is False
    assert client.post(url, headers=headers, json={'flag': flag_for(1, 1), 'team_id': 2, 'points': 999}).status_code == 422
    assert client.get('/leaderboard').json()[0]['score'] == 0


def test_concurrent_solve_awards_once():
    client, headers = logged_in()
    # Separate clients share the session to simulate concurrent browser requests.
    token = client.cookies.get('ctf_session')
    def submit(_):
        with TestClient(app) as parallel:
            parallel.cookies.set('ctf_session', token)
            return parallel.post('/challenges/1/submissions', headers=headers, json={'flag': flag_for(1, 1)})
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(submit, range(4)))
    assert all(r.status_code == 200 for r in results)
    assert sum(r.json()['awarded_points'] for r in results) == 100
    with Sessions() as db:
        assert db.scalar(select(func.count()).select_from(Solve)) == 1
    assert client.get('/leaderboard').json()[0]['score'] == 100


def test_rate_limit_and_closed_challenge():
    client, headers = logged_in()
    for _ in range(20):
        assert client.post('/challenges/1/submissions', headers=headers, json={'flag': 'wrong'}).status_code == 200
    assert client.post('/challenges/1/submissions', headers=headers, json={'flag': 'wrong'}).status_code == 429
    other, other_headers = logged_in('user2')
    with Sessions.begin() as db:
        db.get(Challenge, 1).closes_at = int(time.time()) - 1
    assert other.post('/challenges/1/submissions', headers=other_headers, json={'flag': flag_for(2, 1)}).status_code == 404
