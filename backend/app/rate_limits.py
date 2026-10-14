import time
from fastapi import HTTPException
from .database import engine, Sessions
from .models import RateBucket
from .security import digest

def limit(scope: str, identity: str, maximum: int, seconds: int):
    """Shared atomic counter across API workers; old buckets need periodic cleanup."""
    key = f'{scope}:{digest(identity)}:{int(time.time()) // seconds}'
    # Both supported DBs provide atomic upsert. No in-process limiter state.
    if engine.dialect.name == 'postgresql':
        from sqlalchemy.dialects.postgresql import insert
    elif engine.dialect.name == 'sqlite':
        from sqlalchemy.dialects.sqlite import insert
    else:
        raise RuntimeError('Unsupported database for rate limiter')
    stmt = insert(RateBucket).values(key=key, count=1)
    stmt = stmt.on_conflict_do_update(index_elements=['key'], set_={'count': RateBucket.count + 1})
    with Sessions.begin() as session:
        count = session.scalar(stmt.returning(RateBucket.count))
    if count > maximum:
        raise HTTPException(429, 'Rate limit reached', headers={'Retry-After': str(seconds)})


