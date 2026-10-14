# Your first CTF backend

This is a local learning starter for the protected competition API. It runs on Windows with Python 3.11+. FastAPI handles HTTP requests and validation; SQLite stores data in a local file. No GPU, Docker, or database installation is needed to learn this part.

Each participant initially belongs to their own team. Multiple accounts can later be assigned to the same team through the organizer CLI. Account creation is organizer-controlled; there is no public registration or team-joining endpoint yet.

## 1. Start on your laptop

Open PowerShell in the backend folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

The command-specific execution policy runs the local script without changing the machine's policy. The script installs the tested dependency versions on first run, creates a local flag secret and database, then listens only on your laptop at `http://127.0.0.1:8000`. Open `http://127.0.0.1:8000/docs` to inspect the API. Keep this terminal running. If installation is interrupted, run `.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt` before restarting.

In a second PowerShell terminal, open this folder and run:

```powershell
$env:FLAG_SECRET = (Get-Content .local-secret -Raw).Trim()
$env:DATABASE_URL = 'sqlite:///./ctf.db'
.\.venv\Scripts\python.exe manage.py account alice --team alice
```

Enter a password of 12â€“128 characters when prompted. It is hashed with Argon2 and is not echoed. For a second individual, create `bob --team bob`. For teammates, reuse the same team name.

## 2. Try the complete flow

Use the same second terminal. Replace the example password with the password you entered:

```powershell
$root = 'http://127.0.0.1:8000'
$loginBody = @{ username = 'alice'; password = 'YOUR_PASSWORD' } | ConvertTo-Json
$login = Invoke-RestMethod "$root/auth/login" -Method Post -ContentType 'application/json' -Headers @{ Origin = $root } -Body $loginBody -SessionVariable ctfWebSession
$headers = @{ Origin = $root; 'X-CSRF-Token' = $login.csrf_token }
Invoke-RestMethod "$root/auth/me" -WebSession $ctfWebSession
Invoke-RestMethod "$root/challenges" -WebSession $ctfWebSession
# Organizer-only shortcut for this local integration exercise:
$flag = & .\.venv\Scripts\python.exe manage.py flag $login.team_id 1
$submission = @{ flag = $flag } | ConvertTo-Json
Invoke-RestMethod "$root/challenges/1/submissions" -Method Post -ContentType 'application/json' -Headers $headers -WebSession $ctfWebSession -Body $submission
Invoke-RestMethod "$root/leaderboard" -WebSession $ctfWebSession
```

You should see 100 points. Submit again: it returns `already_solved: true`, with zero additional points. The CLI flag shortcut is for organizers testing the API; participants will get flags by solving their challenge.

## 3. What each stage does

| Stage | What happens | Why it matters |
|---|---|---|
| Login | Verify password; issue random session cookie and CSRF token | Establish identity without trusting a submitted user/team ID |
| Session lookup | Hash cookie token; look up user and expiry | Sessions can expire and be revoked on logout |
| Challenge listing | Return public challenge information and this team's solve status | Never disclose flag-generation secrets |
| Submission | Check team rate limit, challenge availability, and team-specific flag | Wrong-team flags and inactive challenges do not earn points |
| Scoring | Commit submission and unique solve in one transaction | Concurrent requests award points only once |
| Leaderboard | Sum awarded solve points | No client-supplied score field controls official standings |
| Logout | Delete session and clear browser cookie | Previously issued cookie no longer authenticates |

The flag is `HMAC(secret, team ID + challenge ID)` inside `CTF{...}`. The protected backend owns the secret. A future challenge provisioner receives only the flag for its instance. Keep the same secret throughout the event; rotating it changes flags. This starter uses stable per-team flags across resets, rather than per-instance flags.

## 4. Frontend integration

For a frontend on `http://localhost:3000`, set `ALLOWED_ORIGIN` to exactly that origin instead of the local docs origin. Prefer a single origin behind a proxy for the eventual event. Do not mix `localhost` and `127.0.0.1` in development requests.

```javascript
const API = 'http://localhost:8000';
const response = await fetch(`${API}/auth/login`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
if (!response.ok) throw new Error('Login failed');
const { csrf_token } = await response.json();
// Keep the CSRF token in memory. The browser manages the HttpOnly session cookie.
const result = await fetch(`${API}/challenges/1/submissions`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf_token },
  body: JSON.stringify({ flag })
});
```

Use `credentials: 'include'` on all authenticated calls. Obtain a replacement CSRF token through `GET /auth/csrf` after a reload; rotation invalidates the previous token, including in another tab. The browser supplies the Origin header itself. Handle `401` by logging in again, `403` as a CSRF/origin failure, `404` as challenge unavailable, `422` as invalid fields, and `429` by waiting before retrying. Incorrect flags return HTTP 200 with `correct: false`.

## 5. Run security/behavior tests

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Tests use a temporary SQLite database. They cover unauthenticated access, origin/CSRF enforcement, logout revocation, team-specific flags, forbidden extra score/team fields, concurrent duplicate solves, submission rate limiting, and closed challenges.

## 6. What remains before an event

This starter is not an event-ready deployment. Implement the following stages before exposing it publicly:

1. PostgreSQL and versioned schema migrations. Set `DATABASE_URL` for PostgreSQL; this code supports its driver and rate counter, but PostgreSQL has not been integration-tested here. `manage.py init` is only initial schema creation, not a migration system.
2. HTTPS, `COOKIE_SECURE=true`, trusted proxy settings, gateway body/request limits, and backups with a tested restore procedure. Rate counters here use a shared database and fixed windows; add gateway limits for all routes and periodic cleanup of old buckets/sessions.
3. Organizer administration with MFA, account lifecycle/recovery, team membership controls, event settings, registration policy, and a retained audit trail. No administrator HTTP endpoints are exposed in this starter.
4. Challenge provisioning on a separate host/network, resource quotas, resets, and restricted flag delivery. Challenge services must never get the competition database credentials or flag master secret.
5. Authenticated chat with conversation ownership, bounded inference queues, token budgets, and timeouts. Qwen/Ollama integration is not implemented in this first stage.
6. Pagination for a larger leaderboard (the starter returns at most 500 teams), monitoring, load testing, dependency vulnerability review, and deployment review. `requirements-lock.txt` records the versions tested locally; update and review it before the event. Rate-limit buckets and expired sessions currently accumulate until cleaned up.

The local server intentionally stays on loopback. Keep `.local-secret`, `.env`, and `ctf.db` private and out of version control. The flag-generation CLI prints flags only for organizer testing; do not paste them into public logs.

Reference: [FastAPI password hashing guidance](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/), [SQLAlchemy unique constraints](https://docs.sqlalchemy.org/en/20/core/constraints.html). This starter uses revocable opaque sessions rather than JWTs.

Opening the base URL http://127.0.0.1:8000 redirects to /docs. This is the backend API explorer; the participant frontend is a later integration. After editing Python code, stop the server with Ctrl+C and rerun start.ps1.
