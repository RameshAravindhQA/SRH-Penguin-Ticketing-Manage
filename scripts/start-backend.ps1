Set-Location -LiteralPath (Resolve-Path "$PSScriptRoot\..")
if (-not (Test-Path ".local")) { New-Item -ItemType Directory -Path ".local" | Out-Null }
$env:PORT = "6001"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/penguin"
if (-not (Test-Path ".\backend\dist\index.mjs")) {
  Write-Error "Backend build not found. Run: pnpm --filter @workspace/api-server run build"
  exit 1
}
node --enable-source-maps ./backend/dist/index.mjs *> .local\backend.log
