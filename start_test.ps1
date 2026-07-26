$env:OPENCODE_SERVER_USERNAME = "opencode"
$env:OPENCODE_SERVER_PASSWORD = "a59f764a-f536-4fb7-acbb-bd6676629fba"
Set-Location "D:\PROJECTS\ZOYA_009"
bun run --cwd backend/packages/zoya --conditions=browser src/index.ts serve --port 25810 2> "D:\PROJECTS\ZOYA_009\server_debug.log"
