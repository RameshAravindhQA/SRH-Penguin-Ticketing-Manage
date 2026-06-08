Set-Location -LiteralPath (Resolve-Path "$PSScriptRoot\..")

if (-not (Test-Path ".local")) {
  New-Item -ItemType Directory -Path ".local" | Out-Null
}

$envPath = Join-Path (Get-Location) ".env.local"
$localEnv = @{}
if (Test-Path $envPath) {
  Get-Content -LiteralPath $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $index = $line.IndexOf("=")
    $key = $line.Substring(0, $index).Trim()
    $value = $line.Substring($index + 1).Trim().Trim("'").Trim('"')
    if ($key) { $localEnv[$key] = $value }
  }
}

$env:PORT = if ($localEnv["BACKEND_PORT"]) { $localEnv["BACKEND_PORT"] } else { "6001" }
$env:DATABASE_URL = if ($localEnv["DATABASE_URL"]) { $localEnv["DATABASE_URL"] } else { "postgresql://postgres:postgres@localhost:5432/penguin" }

if (-not (Test-Path ".\backend\dist\index.mjs")) {
  Write-Error "Backend build not found. Run: pnpm --filter @workspace/api-server run build"
  exit 1
}

$port = [int]$env:PORT
$listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
$owners = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($owner in $owners) {
  if ($owner -and $owner -ne $PID) {
    Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Seconds 2

$nodeArgs = @("--enable-source-maps", ".\backend\dist\index.mjs")
$process = Start-Process -FilePath "node" -ArgumentList $nodeArgs -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru

Start-Sleep -Seconds 4

if ($process.HasExited) {
  Write-Error "Backend exited during startup."
  exit 1
}

try {
  Invoke-RestMethod -Method Get -Uri "http://localhost:$port/api/healthz" -TimeoutSec 10 | ConvertTo-Json
} catch {
  Write-Error "Backend started but health check failed: $($_.Exception.Message)"
  exit 1
}
