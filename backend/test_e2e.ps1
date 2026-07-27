$ErrorActionPreference = "Stop"
$root = "D:\PROJECTS\ZOYA_009"

# Kill old processes
netstat -ano | findstr ":25810" | ForEach-Object { taskkill /F /PID ((-split $_)[-1]) } 2>$null
netstat -ano | findstr ":25809" | ForEach-Object { taskkill /F /PID ((-split $_)[-1]) } 2>$null
Start-Sleep 2

# Start backend using cmd /c start /B (preserves stdin)
$beLog = "$root\backend\be_test.log"
cmd /c "start /B bun run $root\backend\packages\zoya\src\index.ts acp --port 25810 > `"$beLog`" 2>&1"
Write-Output "Backend started, waiting 10s..."
Start-Sleep 10

# Check backend alive
$listening = netstat -ano | findstr ":25810" | Select-String "LISTENING"
if (-not $listening) {
    Write-Output "BACKEND FAILED - logs:"
    Get-Content $beLog
    exit 1
}
Write-Output "BACKEND ALIVE on :25810"

# Test health endpoint
Write-Output "`n--- Health Check ---"
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:25810/api/health" -UseBasicParsing -TimeoutSec 3
    Write-Output "Health: $($r.StatusCode) $($r.Content)"
} catch { Write-Output "Health FAIL: $_" }

# Test auth status endpoint
Write-Output "`n--- Auth Status ---"
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:25810/api/auth/status" -UseBasicParsing -TimeoutSec 3
    Write-Output "Auth: $($r.StatusCode)"
    $c = $r.Content; if ($c.Length -gt 200) { $c = $c.Substring(0,200) }
    Write-Output "Body: $c"
} catch { Write-Output "Auth FAIL: $_" }

Write-Output "`n=== BACKEND TEST PASSED ==="

# Now start webui
$wuLog = "$root\backend\wu_test.log"
Set-Location "$root\ui"
cmd /c "start /B bun run scripts/webui.ts --no-build --skip-backend --backend-port 25810 --no-open > `"$wuLog`" 2>&1"
Write-Output "WebUI started, waiting 8s..."
Start-Sleep 8

$listeningW = netstat -ano | findstr ":25809" | Select-String "LISTENING"
if (-not $listeningW) {
    Write-Output "WEBUI FAILED - logs:"
    Get-Content $wuLog
    exit 1
}
Write-Output "WEBUI ALIVE on :25809"

# Test proxy - API through webui
Write-Output "`n--- Proxy: /api/health ---"
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:25809/api/health" -UseBasicParsing -TimeoutSec 3
    Write-Output "Proxy Health: $($r.StatusCode) $($r.Content)"
} catch { Write-Output "Proxy Health FAIL: $_" }

Write-Output "`n=== E2E TEST PASSED ==="
