$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Virtual environment creation failed' }
    & .\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed; check internet access and try again' }
}
$env:DATABASE_URL = 'sqlite:///./ctf.db'
$env:COOKIE_SECURE = 'false'
$env:ALLOWED_ORIGIN = 'http://127.0.0.1:8000'
# Keep this local secret between restarts; replacing it changes challenge flags.
if (-not (Test-Path -LiteralPath '.local-secret')) {
    & .\.venv\Scripts\python.exe -c "import pathlib,secrets; pathlib.Path('.local-secret').write_text(secrets.token_hex(32))"
}
$env:FLAG_SECRET = (Get-Content -LiteralPath '.local-secret' -Raw).Trim()
& .\.venv\Scripts\python.exe manage.py init
if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed' }
Write-Host 'API docs: http://127.0.0.1:8000/docs'
Write-Host 'Use a second terminal for account creation; see README.md.'
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
