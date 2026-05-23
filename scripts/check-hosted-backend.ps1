param(
    [Parameter(Mandatory = $true)]
    [string]$BackendUrl
)

$ErrorActionPreference = "Stop"

$cleanUrl = $BackendUrl.TrimEnd("/")
$homeResponse = Invoke-RestMethod -Method Get -Uri $cleanUrl -TimeoutSec 30
Write-Host "Backend home:"
$homeResponse | ConvertTo-Json

$snacks = Invoke-RestMethod -Method Get -Uri "$cleanUrl/snacks" -TimeoutSec 30
Write-Host "Snack count: $($snacks.Count)"

$otpBody = @{
    phone = "9999999999"
    purpose = "register"
} | ConvertTo-Json

$otp = Invoke-RestMethod -Method Post -Uri "$cleanUrl/auth/request-otp" -ContentType "application/json" -Body $otpBody -TimeoutSec 30
Write-Host "OTP channel: $($otp.delivery_channel)"
Write-Host "OTP message: $($otp.message)"
