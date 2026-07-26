# Kill old processes
Get-WmiObject Win32_Process | Where-Object { $_.Name -match 'aioncore|bun' } | ForEach-Object {
  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
}
Start-Sleep -Seconds 3

# Start ACP backend with logging
$logFile = "D:\PROJECTS\ZOYA_009\backend\zoya-acp-final2.log"
Remove-Item -Force $logFile -ErrorAction SilentlyContinue

$acpProcess = Start-Process -WindowStyle Hidden -FilePath "C:\Users\PC\.bun\bin\bun.exe" `
  -ArgumentList "run --cwd D:\PROJECTS\ZOYA_009\backend\packages\zoya --conditions=browser src/index.ts acp" `
  -WorkingDirectory "D:\PROJECTS\ZOYA_009\backend" `
  -RedirectStandardError $logFile `
  -PassThru

Write-Output "ACP started, PID: $($acpProcess.Id)"

# Start WebUI
$webuiLog = "D:\PROJECTS\ZOYA_009\backend\webui-final.log"
Remove-Item -Force $webuiLog -ErrorAction SilentlyContinue
Start-Process -WindowStyle Hidden -FilePath "C:\Users\PC\.bun\bin\bun.exe" `
  -ArgumentList "run webui --no-build" `
  -WorkingDirectory "D:\PROJECTS\ZOYA_009\ui" `
  -RedirectStandardOutput $webuiLog `
  -RedirectStandardError $webuiLog

Write-Output "WebUI starting..."

# Wait and check status
Start-Sleep -Seconds 25

# Show ACP log
Write-Output "=== ACP Log ==="
Get-Content -Path $logFile -ErrorAction SilentlyContinue

# Show WebUI log (first 30 lines)
Write-Output "=== WebUI Log (first 30) ==="
Get-Content -Path $webuiLog -ErrorAction SilentlyContinue -TotalCount 30

# Show ports
Write-Output "=== ACP Ports ==="
netstat -ano | Select-String $acpProcess.Id | Select-String "LISTENING"
