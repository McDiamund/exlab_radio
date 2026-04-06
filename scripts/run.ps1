# Install Node dependencies for EXLAB Radio (uses package-lock.json for reproducible installs).
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error 'Node.js is not installed or not on PATH. Install LTS from https://nodejs.org/ and try again.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error 'npm is not installed or not on PATH.'
}
if (Test-Path package-lock.json) {
    npm ci
} else {
    Write-Warning 'package-lock.json missing; running npm install instead of npm ci.'
    npm install
}
Write-Host 'install-dependencies: done. Next: npm run dev'
npm run dev
