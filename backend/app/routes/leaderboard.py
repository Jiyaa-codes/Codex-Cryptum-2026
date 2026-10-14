from sqlalchemy import func, select
from ..dependencies import Auth, DB
from ..models import Team, Solve

from fastapi import APIRouter

router = APIRouter()

@router.get('/leaderboard')
def leaderboard(user: Auth, session: DB):
    score = func.coalesce(func.sum(Solve.points), 0)
    last_solve = func.max(Solve.created)
    rows = session.execute(select(Team.id, Team.name, score.label('score'))
                           .outerjoin(Solve, Solve.team_id == Team.id).group_by(Team.id, Team.name)
                           .order_by(score.desc(), last_solve.asc(), Team.id.asc()).limit(500))
    return [{'rank': i, 'team_id': r.id, 'team': r.name, 'score': r.score} for i, r in enumerate(rows, 1)]
