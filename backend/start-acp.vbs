Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\PROJECTS\ZOYA_009\backend"
WshShell.Run "cmd.exe /c C:\Users\PC\.bun\bin\bun.exe run --cwd D:\PROJECTS\ZOYA_009\backend\packages\zoya --conditions=browser src/index.ts acp 2>D:\PROJECTS\ZOYA_009\backend\zoya-acp-vbs.log", 0, False
