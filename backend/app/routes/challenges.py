import hmac
import time
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from ..dependencies import Auth, DB
from ..models import Challenge, Solve, Submission
from ..rate_limits import limit
from ..schemas import FlagInput
from ..security import flag_for

from fastapi import APIRouter

router = APIRouter()

@router.get('/challenges')
def challenges(user: Auth, session: DB):
    now = int(time.time())
    solved = set(session.scalars(select(Solve.challenge_id).where(Solve.team_id == user.team_id)))
    rows = session.scalars(select(Challenge).where(Challenge.active == True, Challenge.opens_at <= now))
    return [{'id': c.id, 'title': c.title, 'description': c.description, 'points': c.points,
             'solved': c.id in solved, 'accepting_submissions': now < c.closes_at} for c in rows]


@router.post('/challenges/{challenge_id}/submissions')
def submit(challenge_id: int, body: FlagInput, user: Auth, session: DB):
    limit('submit-team', str(user.team_id), 20, 60)
    challenge = session.get(Challenge, challenge_id)
    now = int(time.time())
    if not challenge or not challenge.active or not challenge.opens_at <= now < challenge.closes_at:
        raise HTTPException(404, 'Challenge unavailable')
    existing = session.scalar(select(Solve).where(Solve.team_id == user.team_id, Solve.challenge_id == challenge_id))
    if existing:
        return {'correct': True, 'already_solved': True, 'awarded_points': 0}
    correct = hmac.compare_digest(body.flag.encode(), flag_for(user.team_id, challenge_id).encode())
    session.add(Submission(team_id=user.team_id, user_id=user.id, challenge_id=challenge_id,
                           correct=correct, created=now))
    if correct:
        session.add(Solve(team_id=user.team_id, challenge_id=challenge_id, points=challenge.points, created=now))
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        # A competing correct submission may have committed first.
        existing = session.scalar(select(Solve).where(Solve.team_id == user.team_id, Solve.challenge_id == challenge_id))
        if not existing:
            raise
        return {'correct': True, 'already_solved': True, 'awarded_points': 0}
    return {'correct': correct, 'already_solved': False, 'awarded_points': challenge.points if correct else 0}


