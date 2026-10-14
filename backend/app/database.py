from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import DATABASE_URL

engine = create_engine(DATABASE_URL)
if engine.dialect.name == 'sqlite':
    @event.listens_for(engine, 'connect')
    def enable_foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')

Sessions = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
