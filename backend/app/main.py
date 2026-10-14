from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from .config import ORIGIN
from .routes import auth, challenges, leaderboard

app = FastAPI(title='CTF Competition API', version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=[ORIGIN], allow_credentials=True,
                   allow_methods=['GET', 'POST'], allow_headers=['Content-Type', 'X-CSRF-Token'])


@app.middleware('http')
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


@app.get('/health')
def health():
    return {'status': 'ok'}



app.include_router(auth.router)
app.include_router(challenges.router)
app.include_router(leaderboard.router)


@app.get('/', include_in_schema=False)
def root_redirect():
    return RedirectResponse(url='/docs', status_code=307)
