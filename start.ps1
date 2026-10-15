$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$nextCli = Join-Path $projectRoot 'apps/web/node_modules/next/dist/bin/next'
if (-not (Test-Path -LiteralPath $nextCli)) {
    throw 'Dependencies are missing. Run pnpm install from the project root first.'
}
Push-Location (Join-Path $projectRoot 'apps/web')
try {
    Write-Host 'Opening Codex Cryptum at http://localhost:3000. Keep this terminal running.'
    & node $nextCli dev --hostname 127.0.0.1
    if ($LASTEXITCODE -ne 0) { throw 'Next.js stopped with an error. See the output above.' }
} finally {
    Pop-Location
}
