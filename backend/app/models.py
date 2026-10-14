from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class Team(Base):
    __tablename__ = 'teams'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)


class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    team_id: Mapped[int] = mapped_column(ForeignKey('teams.id'))


class LoginSession(Base):
    __tablename__ = 'sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    csrf_hash: Mapped[str] = mapped_column(String(64))
    expires: Mapped[int]


class Challenge(Base):
    __tablename__ = 'challenges'
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(4000))
    points: Mapped[int]
    opens_at: Mapped[int]
    closes_at: Mapped[int]
    active: Mapped[bool] = mapped_column(default=True)


class Submission(Base):
    __tablename__ = 'submissions'
    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey('teams.id'))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    challenge_id: Mapped[int] = mapped_column(ForeignKey('challenges.id'))
    correct: Mapped[bool]
    created: Mapped[int]
    # Never store the submitted flag.


class Solve(Base):
    __tablename__ = 'solves'
    __table_args__ = (UniqueConstraint('team_id', 'challenge_id', name='one_solve_per_team'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey('teams.id'))
    challenge_id: Mapped[int] = mapped_column(ForeignKey('challenges.id'))
    points: Mapped[int]  # Snapshot award; later challenge edits don't rewrite results.
    created: Mapped[int]


class RateBucket(Base):
    __tablename__ = 'rate_buckets'
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    count: Mapped[int]


