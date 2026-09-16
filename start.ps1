$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$localPython = Join-Path $PSScriptRoot '.tools/python/python.exe'
if (Test-Path -LiteralPath $localPython) {
    & $localPython server.py
} else {
    python server.py
}
