$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$cmd=Join-Path $root 'RUN-QA-V42.cmd'
if (!(Test-Path $cmd)) { throw 'Runner not found' }
# Scheduled task runs as the current Windows user, with no admin privileges requested.
$action=New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $cmd + '"') -WorkingDirectory $root
$trigger=New-ScheduledTaskTrigger -Daily -At '03:00'
$principal=New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'QuynhHuong-QA-V42-Daily' -Action $action -Trigger $trigger -Principal $principal -Description 'Offline Auto Safe QA at 03:00 when signed in' -Force | Out-Null
Write-Host 'Daily QA scheduled for 03:00 (when user is logged in).' -ForegroundColor Green
