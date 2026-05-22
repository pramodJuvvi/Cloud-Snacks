param(
    [Parameter(Mandatory = $true)]
    [string]$BackendUrl,

    [string]$OutputApkName = "cloudsnacks-hosted-dev.apk"
)

$ErrorActionPreference = "Stop"

if ($BackendUrl -notmatch "^https://") {
    throw "Use the public HTTPS Render URL, for example https://cloudsnacks-api.onrender.com"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$mobileRoot = Join-Path $repoRoot "mobile-app"

Push-Location $mobileRoot
try {
    powershell -ExecutionPolicy Bypass -File .\build-apk.ps1 -BackendUrl $BackendUrl -OutputApkName $OutputApkName
}
finally {
    Pop-Location
}
