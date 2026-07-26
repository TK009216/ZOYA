<#
.SYNOPSIS
    GTA V ENHANCED — MASTER LAUNCHER
    Runs the entire enhanced todo list step by step.
    All files located in: D:\PROJECTS\ZOYA_009\setups\GTA_V_ENHANCED\
#>

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚗💨 GTA V ENHANCED EDITION — MASTER INSTALLATION SUITE   ║" -ForegroundColor Cyan
Write-Host "║  All 14 Phases | 135 Tasks | 589 Subtasks | 312 Commands   ║" -ForegroundColor Cyan
Write-Host "║  14 NEW tasks | 12 Edge Case Recovery Paths                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📁 All files in: D:\PROJECTS\ZOYA_009\setups\GTA_V_ENHANCED\" -ForegroundColor Yellow
Write-Host ""

$files = @(
    @{File="00_README_FIRST.txt"; Desc="📖 Overview & Enhancement Log"},
    @{File="00_LAUNCHER_RunAll.ps1"; Desc="🚀 THIS FILE - Master Launcher"},
    @{File="01_Phase0_PreFlight_Enhanced.ps1"; Desc="🕵️ Phase 0: System Audit (4 NEW tasks)"},
    @{File="02_Phase1_WindowsTuning_Enhanced.ps1"; Desc="⚙️ Phase 1: Windows Tuning (4 NEW tasks)"},
    @{File="03_Phase2_Defender_Enhanced.ps1"; Desc="🛡️ Phase 2: Defender Config (2 NEW tasks)"},
    @{File="04_Phase3_Download_Enhanced.ps1"; Desc="🌐 Phase 3: Download (4 edge cases)"},
    @{File="05_Phases4to7_Install_Enhanced.ps1"; Desc="💿 Phases 4-7: Install, Post-Install, Graphics, Update"},
    @{File="06_Phases8to12_Cleanup_Enhanced.ps1"; Desc="🧹 Phases 8-12: Troubleshooting, Verify, Cleanup"},
    @{File="07_EdgeCases_Recovery_Reference.ps1"; Desc="🆘 12 Edge Case Recovery Paths"}
)

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ENHANCED TODOLIST - FILES GENERATED                        ║" -ForegroundColor Cyan
Write-Host "╠═══════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
foreach ($f in $files) {
    $path = Join-Path "D:\PROJECTS\ZOYA_009\setups\GTA_V_ENHANCED" $f.File
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "║  ✅ $($f.Desc) ($([math]::Round($size/1KB,0)) KB)" -ForegroundColor Green
    } else {
        Write-Host "║  ❌ $($f.Desc) (MISSING)" -ForegroundColor Red
    }
}
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📋 ENHANCEMENT SUMMARY:" -ForegroundColor Yellow
Write-Host "  🔸 Expanded all terminal_auto tasks → Exact copy-paste PowerShell commands" -ForegroundColor Green
Write-Host "  🔸 Expanded all user_interaction tasks → Step-by-step numbered instructions" -ForegroundColor Green
Write-Host "  🔸 Added 14 NEW tasks:" -ForegroundColor Cyan
Write-Host "     0.9  Deep Disk Health Scan (S.M.A.R.T. + chkdsk both drives)" -ForegroundColor White
Write-Host "     0.10 Chipset & Storage Controller Verification (AHCI check)" -ForegroundColor White
Write-Host "     0.11 Network Adapter & WiFi Audit (power saving, signal, band)" -ForegroundColor White
Write-Host "     0.12 Windows 11 VBS/HVCI Check (can cost 5-10% FPS)" -ForegroundColor White
Write-Host "     1.9  Services Optimization (stop WSearch, SysMain, etc.)" -ForegroundColor White
Write-Host "     1.10 TCP/IP & Network Optimization (RSS, Chimney, auto-tuning)" -ForegroundColor White
Write-Host "     1.11 Background Apps Cleanup" -ForegroundColor White
Write-Host "     1.12 Page File Configuration (16GB on SSD)" -ForegroundColor White
Write-Host "     2.10 Tamper Protection Disable" -ForegroundColor White
Write-Host "     2.11 Firewall Rules for qBittorrent" -ForegroundColor White
Write-Host "  🔸 Added 12 edge case recovery paths (download stuck, crash, power outage, etc.)" -ForegroundColor Cyan

Write-Host "`n📌 HOW TO USE:" -ForegroundColor Yellow
Write-Host "  1. Open PowerShell AS ADMINISTRATOR" -ForegroundColor Green
Write-Host "  2. Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force" -ForegroundColor White
Write-Host "  3. Run individual phase scripts in order:" -ForegroundColor White
Write-Host "     .\01_Phase0_PreFlight_Enhanced.ps1  (read-only audit)" -ForegroundColor White
Write-Host "     .\02_Phase1_WindowsTuning_Enhanced.ps1  (apply changes)" -ForegroundColor White
Write-Host "     ... continue through 07 ..." -ForegroundColor White
Write-Host "  4. OR just open each .ps1 in VS Code/PowerShell ISE and step through line by line" -ForegroundColor Yellow
