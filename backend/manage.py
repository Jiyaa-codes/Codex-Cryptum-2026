"""Organizer-only local command. Never expose flag generation as a public API."""
import argparse
import getpass
import time
from sqlalchemy import select
from app.database import Base, Sessions, engine
from app.models import Challenge, Team, User
from app.security import flag_for, passwords

parser = argparse.ArgumentParser()
commands = parser.add_subparsers(dest='command', required=True)
commands.add_parser('init')
account = commands.add_parser('account')
account.add_argument('username')
account.add_argument('--team', required=True)
flag = commands.add_parser('flag')
flag.add_argument('team_id', type=int)
flag.add_argument('challenge_id', type=int)
args = parser.parse_args()

if args.command == 'init':
    Base.metadata.create_all(engine)
    with Sessions.begin() as db:
        if not db.get(Challenge, 1):
            now = int(time.time())
            db.add(Challenge(id=1, title='Local integration exercise',
                             description='Use the organizer CLI flag to test submission. Replace before the event.',
                             points=100, opens_at=now, closes_at=now + 86400 * 30))
    print('Database initialized with one local exercise.')
elif args.command == 'account':
    password = getpass.getpass('Password (12+ characters): ')
    if len(password) < 12 or len(password) > 128:
        parser.error('Password must be between 12 and 128 characters')
    with Sessions.begin() as db:
        if db.scalar(select(User).where(User.username == args.username)):
            parser.error('Username already exists')
        team = db.scalar(select(Team).where(Team.name == args.team))
        if team is None:
            team = Team(name=args.team)
            db.add(team)
            db.flush()
        db.add(User(username=args.username, password_hash=passwords.hash(password), team_id=team.id))
    print('Account created. Participants cannot choose arbitrary team membership through the API.')
elif args.command == 'flag':
    with Sessions() as db:
        if not db.get(Team, args.team_id) or not db.get(Challenge, args.challenge_id):
            parser.error('Team or challenge does not exist')
    print(flag_for(args.team_id, args.challenge_id))
