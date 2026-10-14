import os

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./ctf.db')
FLAG_SECRET = os.environ.get('FLAG_SECRET', '')
if len(FLAG_SECRET) < 32:
    raise RuntimeError('Set FLAG_SECRET to a random secret of at least 32 characters.')
ORIGIN = os.getenv('ALLOWED_ORIGIN', 'http://localhost:3000')
SECURE = os.getenv('COOKIE_SECURE', 'true').lower() == 'true'
