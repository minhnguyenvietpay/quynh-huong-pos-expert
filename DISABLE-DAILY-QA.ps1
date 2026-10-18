$ErrorActionPreference='Stop'
Unregister-ScheduledTask -TaskName 'QuynhHuong-QA-V42-Daily' -Confirm:$false
Write-Host 'Daily QA schedule removed.' -ForegroundColor Green
