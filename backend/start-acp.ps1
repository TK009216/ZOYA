$logFile = "D:\PROJECTS\ZOYA_009\backend\zoya-acp-test.log"
Start-Process -WindowStyle Hidden -FilePath "bun.exe" -ArgumentList "run --cwd D:\PROJECTS\ZOYA_009\backend\packages\zoya --conditions=browser src/index.ts acp" -WorkingDirectory "D:\PROJECTS\ZOYA_009\backend" -RedirectStandardError $logFile
Write-Output "ACP started, PID: $($proc.Id)"
