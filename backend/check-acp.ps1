# Write to file instead of stdout
$procs = Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -match 'packages/zoya.*acp' -and $_.ProcessName -eq 'bun.exe' } | Select-Object ProcessId, CommandLine
$procs | Out-File -FilePath "D:\PROJECTS\ZOYA_009\backend\acp-status.txt"
if ($procs) {
  "ACP running" | Out-File -FilePath "D:\PROJECTS\ZOYA_009\backend\acp-status.txt" -Append
  # Find listening port
  $procs | ForEach-Object {
    netstat -ano | Select-String $_.ProcessId | Select-String 'LISTENING' | Out-File -FilePath "D:\PROJECTS\ZOYA_009\backend\acp-status.txt" -Append
  }
} else {
  "No ACP process found" | Out-File -FilePath "D:\PROJECTS\ZOYA_009\backend\acp-status.txt"
}
# Also log
Get-Content -Path "D:\PROJECTS\ZOYA_009\backend\zoya-acp-test.log" -ErrorAction SilentlyContinue | Out-File -FilePath "D:\PROJECTS\ZOYA_009\backend\acp-status.txt" -Append
