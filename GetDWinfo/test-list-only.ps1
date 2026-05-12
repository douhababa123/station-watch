param(
  [string]$Base = 'http://localhost:4000',
  [switch]$ForceRefresh
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$listPath = if ($ForceRefresh) { '/proxy/homeappliances?refresh=1' } else { '/proxy/homeappliances' }

Write-Host '=== Clear request log ===' -ForegroundColor Cyan
Invoke-RestMethod -Method Post -Uri "$Base/debug/request-log/clear" | Out-Null

Write-Host ''
Write-Host "=== Request appliance list only: $listPath ===" -ForegroundColor Cyan
try {
  $response = Invoke-WebRequest -Uri "$Base$listPath" -UseBasicParsing
  Write-Host "HTTP $($response.StatusCode)" -ForegroundColor Green
  $body = $response.Content | ConvertFrom-Json
  if ($body.data.homeappliances) {
    Write-Host ("Appliance count: {0}" -f $body.data.homeappliances.Count) -ForegroundColor Green
  } elseif ($body.error) {
    $errorText = if ($body.error.description) { $body.error.description } else { $body.error.key }
    Write-Host ("API error: {0}" -f $errorText) -ForegroundColor Yellow
  }
} catch {
  $errorResponse = $_.Exception.Response
  if ($errorResponse -ne $null) {
    Write-Host "HTTP $($errorResponse.StatusCode.value__)" -ForegroundColor Yellow
    $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
    $bodyText = $reader.ReadToEnd()
    $reader.Close()
    if ($bodyText) {
      Write-Host $bodyText
    }
  } else {
    throw
  }
}

Write-Host ''
Write-Host '=== Request log after list-only probe ===' -ForegroundColor Cyan
$log = Invoke-RestMethod -Uri "$Base/debug/request-log"
$log.entries | ConvertTo-Json -Depth 8

$nonListEntries = @($log.entries | Where-Object { $_.path -ne '/homeappliances' })
$listEntries = @($log.entries | Where-Object { $_.path -eq '/homeappliances' })

Write-Host ''
if ($nonListEntries.Count -eq 0 -and $listEntries.Count -le 1) {
  Write-Host 'PASS: list-only probe did not trigger status/settings/programs/events requests.' -ForegroundColor Green
} else {
  Write-Host 'FAIL: extra requests were recorded during list-only probe.' -ForegroundColor Red
  exit 1
}