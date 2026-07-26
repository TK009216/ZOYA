<#
.SYNOPSIS
    ZOYA IP Rotator - Quick Start Entry Point
.DESCRIPTION
    Menu-driven or command-line interface for the ZOYA IP Rotator system.
    Usage: .\run.ps1 [command]
    
    Commands:
        menu        Interactive menu (default)
        auto        Smart auto-rotation (check + bypass if needed)
        status      Show status dashboard
        monitor     Start continuous monitoring
        check       Quick rate limit check
        reset       Reset all state
        help        Show this help
.NOTES
    Part of ZOYA IP Rotator System
    Author: ZOYA (T.K)
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("menu", "auto", "status", "monitor", "check", "reset", "help")]
    [string]$Command = "menu",

    [Parameter()]
    [switch]$Quick
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Master = Join-Path $ScriptDir "master_controller.ps1"
$ConfigPath = Join-Path $ScriptDir "config.json"

function Show-Banner {
    Clear-Host
    Write-Host @"
=========================================
       ZOYA IP Rotator v1.0
   Multi-Layer Rate Limit Bypass

     [1] VPN Rotation (Planet/Proton)
     [2] Proxy Rotation (Free Pool)
     [3] API Key Fallback (Future)
=========================================
"@ -ForegroundColor Cyan
}

function Show-Menu {
    Show-Banner
    
    Write-Host "Select an option:`n" -ForegroundColor Yellow
    Write-Host "  [1] Auto-Rotate (check limits -> bypass)"
    Write-Host "  [2] Show Status Dashboard"
    Write-Host "  [3] Continuous Monitoring"
    Write-Host "  [4] Quick Limit Check"
    Write-Host "  [5] Force VPN Rotation"
    Write-Host "  [6] Force Proxy Rotation"
    Write-Host "  [7] Full Rotation (VPN -> Proxy -> API)"
    Write-Host "  [8] Reset State"
    Write-Host "  [0] Exit"
    Write-Host "`n-----------------------------" -ForegroundColor Gray
    
    $choice = Read-Host "`nEnter choice [0-8]"
    
    switch ($choice) {
        "1" { & $Master -Command "auto" -ConfigPath $ConfigPath }
        "2" { & $Master -Command "status" -ConfigPath $ConfigPath }
        "3" { 
            $interval = Read-Host "Check interval in seconds (default: 30)"
            if (-not $interval) { $interval = 30 }
            & $Master -Command "monitor" -MonitorInterval ([int]$interval) -ConfigPath $ConfigPath
        }
        "4" { & $Master -Command "check" -ConfigPath $ConfigPath }
        "5" { & $Master -Command "rotate-vpn" -ConfigPath $ConfigPath }
        "6" { & $Master -Command "rotate-proxy" -ConfigPath $ConfigPath }
        "7" { & $Master -Command "rotate-all" -ConfigPath $ConfigPath }
        "8" { & $Master -Command "reset" -ConfigPath $ConfigPath }
        "0" { Write-Host "Goodbye!" -ForegroundColor Cyan; exit }
        default { 
            Write-Host "`nInvalid choice: $choice" -ForegroundColor Red
            Start-Sleep -Seconds 2
            Show-Menu
        }
    }
    
    Write-Host "`n-----------------------------" -ForegroundColor Gray
    $again = Read-Host "`nPress Enter to continue, or 'q' to quit"
    if ($again -ne 'q') { Show-Menu }
}

switch ($Command) {
    "menu"   { Show-Menu }
    "auto"   { & $Master -Command "auto" -ConfigPath $ConfigPath }
    "status" { & $Master -Command "status" -ConfigPath $ConfigPath }
    "monitor" { 
        if ($Quick) {
            & $Master -Command "monitor" -MonitorInterval 30 -MonitorCount 10 -ConfigPath $ConfigPath
        } else {
            $interval = Read-Host "Check interval in seconds (default: 30)"
            if (-not $interval) { $interval = 30 }
            & $Master -Command "monitor" -MonitorInterval ([int]$interval) -MonitorCount 0 -ConfigPath $ConfigPath
        }
    }
    "check"  { & $Master -Command "check" -ConfigPath $ConfigPath }
    "reset"  { & $Master -Command "reset" -ConfigPath $ConfigPath }
    "help"   {
        Show-Banner
        Write-Host @"
Commands:
  .\run.ps1             Interactive menu (default)
  .\run.ps1 auto        Auto-rotate if rate limited
  .\run.ps1 status      Show system status
  .\run.ps1 monitor     Start monitoring
  .\run.ps1 check       Quick rate limit check
  .\run.ps1 reset       Reset all state

Examples:
  .\run.ps1 auto        -> One-click bypass
  .\run.ps1 status      -> Dashboard view
  .\run.ps1 monitor     -> Keep running in background

Files:
  config.json           Configuration
  vpn_manager.ps1       VPN service control
  proxy_engine.py       Proxy fetch/test/rotate
  limit_detector.py     Rate limit detection
  master_controller.ps1 Orchestration engine
  run.ps1               Entry point (this file)
  logs/                 Rotation history
  cache/                State + proxy cache

"@
    }
}
