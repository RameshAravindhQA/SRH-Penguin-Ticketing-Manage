Set-Location -LiteralPath (Resolve-Path "$PSScriptRoot\..")
if (-not (Test-Path ".local")) { New-Item -ItemType Directory -Path ".local" | Out-Null }
$env:PORT = "6002"
$env:BASE_PATH = "/"
$env:VITE_API_BASE_URL = "http://localhost:6001"
node ./frontend/node_modules/vite/bin/vite.js --config ./frontend/vite.config.mjs --configLoader native --host 0.0.0.0 *> .local\frontend.log
