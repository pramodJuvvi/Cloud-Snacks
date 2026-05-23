param(
    [string]$BackendUrl = "http://192.168.1.8:8000",
    [string]$OutputApkName = "cloudsnacks-test.apk",
    [string]$ShowDevOtp = "false"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildRoot = Join-Path $env:USERPROFILE "cs_snack_box_build"
$androidRoot = Join-Path $buildRoot "android"
$builtApkPath = Join-Path $androidRoot "app\build\outputs\apk\release\app-release.apk"
$outputApkPath = Join-Path $projectRoot $OutputApkName

if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
    $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $defaultSdk) {
        $env:ANDROID_HOME = $defaultSdk
        $env:ANDROID_SDK_ROOT = $defaultSdk
    }
}

$env:EXPO_PUBLIC_API_URL = $BackendUrl
$env:EXPO_PUBLIC_SHOW_DEV_OTP = $ShowDevOtp
$env:NODE_ENV = "production"

$excludedDirs = @(
    (Join-Path $projectRoot "android\build"),
    (Join-Path $projectRoot "android\app\build"),
    (Join-Path $projectRoot "android\.gradle"),
    (Join-Path $projectRoot "android\app\.cxx"),
    (Join-Path $projectRoot ".expo")
)

robocopy $projectRoot $buildRoot /E /XD $excludedDirs /XF "*.apk" "build-apk.ps1" /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -gt 7) {
    throw "Failed to sync build folder with robocopy exit code $LASTEXITCODE"
}

Push-Location $androidRoot
try {
    .\gradlew.bat assembleRelease
}
finally {
    Pop-Location
}

Copy-Item -Force $builtApkPath $outputApkPath
Write-Host "APK created at: $outputApkPath"
