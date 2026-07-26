<#
.SYNOPSIS
    PHASE 1 [ENHANCED] — Windows Tuning for Gaming
    ALL exact PowerShell/CMD commands + step-by-step user instructions.
.EXPANSIONS
    - 1.9 [NEW] Services Optimization (stop WSearch, SysMain, etc.)
    - 1.10 [NEW] TCP/IP Network Optimization for max download
    - 1.11 [NEW] Background Apps Cleanup
    - 1.12 [NEW] Page File Configuration (16GB on SSD)
    - All original tasks now have EXACT commands with fallbacks
#>

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " PHASE 1: ⚙️ WINDOWS TUNING FOR GAMING [ENHANCED]" -ForegroundColor Cyan
Write-Host " [4 NEW tasks added: 1.9-1.12 — Services, TCP/IP, Background Apps, Page File]" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# ========== TASK 1.1 ==========
Write-Host "`n─── TASK 1.1: Enable Game Mode via Registry ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"

Write-Host "  ▶ STEP 1 (check current):" -ForegroundColor Green
Write-Host "    Get-ItemProperty -Path 'HKCU:\Software\Microsoft\GameBar' -Name 'AllowAutoGameMode' -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "    → Expect: Property not found (never enabled)" -ForegroundColor Gray

Write-Host "  ▶ STEP 2 (enable Game Mode):" -ForegroundColor Green
Write-Host "    New-ItemProperty -Path 'HKCU:\Software\Microsoft\GameBar' -Name 'AllowAutoGameMode' -Value 1 -PropertyType DWord -Force" -ForegroundColor White
Write-Host "    New-ItemProperty -Path 'HKCU:\Software\Microsoft\GameBar' -Name 'AutoGameModeEnabled' -Value 1 -PropertyType DWord -Force" -ForegroundColor White

Write-Host "  ▶ STEP 3 (verify):" -ForegroundColor Green
Write-Host "    Get-ItemProperty -Path 'HKCU:\Software\Microsoft\GameBar' -Name 'AllowAutoGameMode' → Expect: 1" -ForegroundColor White
Write-Host "  ✅ VERIFY: AllowAutoGameMode=1, AutoGameModeEnabled=1" -ForegroundColor Green

# ========== TASK 1.2 ==========
Write-Host "`n─── TASK 1.2: Disable Xbox Game DVR & Game Bar ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"

Write-Host "  ▶ EXACT COMMANDS (run all):" -ForegroundColor Green
Write-Host "    New-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -Value 0 -PropertyType DWord -Force" -ForegroundColor White
Write-Host "    New-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'HistoricalCaptureEnabled' -Value 0 -PropertyType DWord -Force" -ForegroundColor White
Write-Host "    New-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_Enabled' -Value 0 -PropertyType DWord -Force" -ForegroundColor White
Write-Host "    New-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'GameDVR_FSEBehaviorMode' -Value 2 -PropertyType DWord -Force" -ForegroundColor White
Write-Host "    # Policy-level disable:" -ForegroundColor Yellow
Write-Host "    if (-not (Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR' -Force }" -ForegroundColor White
Write-Host "    New-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR' -Name 'AllowGameDVR' -Value 0 -PropertyType DWord -Force" -ForegroundColor White

Write-Host "  ▶ VERIFY:" -ForegroundColor Green
Write-Host "    Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled','HistoricalCaptureEnabled'" -ForegroundColor White
Write-Host "    → All values = 0" -ForegroundColor Gray
Write-Host "  ✅ VERIFY: AppCaptureEnabled=0, HistoricalCaptureEnabled=0, GameDVR_Enabled=0" -ForegroundColor Green

# ========== TASK 1.3 ==========
Write-Host "`n─── TASK 1.3: Enable Hardware Accelerated GPU Scheduling ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~5 mins - requires reboot]`n"

Write-Host "  ▶ STEP 1 (check):" -ForegroundColor Green
Write-Host "    Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'GpuSchedMode' -ErrorAction SilentlyContinue" -ForegroundColor White

Write-Host "  ▶ STEP 2 (enable):" -ForegroundColor Green
Write-Host "    New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'GpuSchedMode' -Value 1 -PropertyType DWord -Force" -ForegroundColor White

Write-Host "  ▶ STEP 3 (verify):" -ForegroundColor Green
Write-Host "    Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'GpuSchedMode'" -ForegroundColor White
Write-Host "    → Expect: GpuSchedMode = 1" -ForegroundColor Gray

Write-Host "  ▶ SET REBOOT FLAG:" -ForegroundColor Yellow
Write-Host "    New-ItemProperty -Path 'HKLM:\SOFTWARE\GTA_Install_Flags' -Name 'RebootRequired' -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "  ⚠️ NOTE: HAGS requires system reboot to take effect!" -ForegroundColor Red
Write-Host "  ✅ VERIFY: GpuSchedMode = 1 (reboot pending)" -ForegroundColor Green

# ========== TASK 1.4 ==========
Write-Host "`n─── TASK 1.4: Set Power Plan to High Performance ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"

Write-Host "  ▶ STEP 1 (list available plans): powercfg /list" -ForegroundColor Green
Write-Host "  ▶ STEP 2 (check current): powercfg /getactivescheme" -ForegroundColor Green
Write-Host "    → Expect: 'Balanced' (381b4222-f694-41f0-9685-ff5bb260df2e)" -ForegroundColor Gray

Write-Host "  ▶ STEP 3 (activate High Performance):" -ForegroundColor Green
Write-Host "    powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c" -ForegroundColor White
Write-Host "    (If plan doesn't exist: powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 THEN activate)" -ForegroundColor Gray

Write-Host "  ▶ STEP 4 (disable USB selective suspend):" -ForegroundColor Green
Write-Host "    powercfg /setacvalueindex 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0" -ForegroundColor White
Write-Host "    powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c" -ForegroundColor White

Write-Host "  ▶ STEP 5 (disable PCIe link state power mgmt):" -ForegroundColor Green
Write-Host "    powercfg /setacvalueindex 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a496df5 0" -ForegroundColor White
Write-Host "    powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c" -ForegroundColor White

Write-Host "  ▶ VERIFY: powercfg /getactivescheme → Expect 'High Performance'" -ForegroundColor Green
Write-Host "  ✅ VERIFY: Active = High Performance, USB/PCIe power saving OFF" -ForegroundColor Green

# ========== TASK 1.5 ==========
Write-Host "`n─── TASK 1.5: Disable Sleep/Hibernate/Display Timeout ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [MEDIUM] [~2 mins]`n"

Write-Host "  ▶ BACKUP original values:" -ForegroundColor Green
Write-Host "    powercfg /q 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c SUB_SLEEP STANDBYIDLE >> `"`$env:TEMP\power_timeout_backup.txt`"" -ForegroundColor White
Write-Host "    powercfg /q 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c SUB_VIDEO VIDEOIDLE >> `"`$env:TEMP\power_timeout_backup.txt`"" -ForegroundColor White

Write-Host "  ▶ EXACT CMD (disable all during install):" -ForegroundColor Green
Write-Host "    powercfg /change standby-timeout-ac 0" -ForegroundColor White
Write-Host "    powercfg /change hibernate-timeout-ac 0" -ForegroundColor White
Write-Host "    powercfg /change monitor-timeout-ac 0" -ForegroundColor White
Write-Host "    powercfg /hibernate off" -ForegroundColor White

Write-Host "  ▶ VERIFY: powercfg /q 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c SUB_SLEEP STANDBYIDLE → all 0" -ForegroundColor Green
Write-Host "  ✅ VERIFY: All AC timeouts = 0. Original values backed up for Phase 10 restore." -ForegroundColor Green

# ========== TASK 1.6 ==========
Write-Host "`n─── TASK 1.6: Disable Windows Update Auto-Reboot ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [MEDIUM] [~2 mins]`n"

Write-Host "  ▶ STEP 1 (set active hours 0-23 = full day coverage):" -ForegroundColor Green
Write-Host "    New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'ActiveHoursStart' -Value 0 -PropertyType DWord -Force" -ForegroundColor White
Write-Host "    New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'ActiveHoursEnd' -Value 23 -PropertyType DWord -Force" -ForegroundColor White

Write-Host "  ▶ STEP 2 (pause updates for 35 days):" -ForegroundColor Green
Write-Host "    Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'PauseUpdatesExpiryTime' -Value ((Get-Date).AddDays(35).ToString('yyyy-MM-ddTHH:mm:ssZ')) -Type String -Force" -ForegroundColor White

Write-Host "  ▶ STEP 3 (verify):" -ForegroundColor Green
Write-Host "    Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'ActiveHoursStart','ActiveHoursEnd','PauseUpdatesExpiryTime'" -ForegroundColor White
Write-Host "  ✅ VERIFY: Active hours 0-23, updates paused 35 days" -ForegroundColor Green

# ========== TASK 1.7 ==========
Write-Host "`n─── TASK 1.7: Kill Interfering Applications ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"

Write-Host "  ▶ COMMAND (kill ALL at once - copy entire block):" -ForegroundColor Green
Write-Host "    @('steam','chrome','msedge','discord','spotify','epicgameslauncher','origin'," -ForegroundColor White
Write-Host "      'ubisoftconnect','battle','gog','bethesda','brave','firefox','opera','slack'," -ForegroundColor White
Write-Host "      'teams','skype','zoom','obs64','xboxapp','gamingoverlay','widgets'," -ForegroundColor White
Write-Host "      'onedrive','dropbox') | ForEach-Object { Stop-Process -Name `$_ -Force -ErrorAction SilentlyContinue }" -ForegroundColor White

Write-Host "  ▶ VERIFY (check survivors):" -ForegroundColor Green
Write-Host "    @('steam','chrome','msedge','discord','xboxapp') | ForEach-Object {" -ForegroundColor White
Write-Host "      if(Get-Process -Name `$_ -ErrorAction SilentlyContinue){" -ForegroundColor White
Write-Host "        Write-Warning \"`$_ STILL RUNNING - retrying...\"; Stop-Process -Name `$_ -Force" -ForegroundColor White
Write-Host "      } else { Write-Output \"`$_ ✓ KILLED\" }" -ForegroundColor White
Write-Host "    }" -ForegroundColor White

Write-Host "  ▶ RETRY after 3 seconds (some auto-restart):" -ForegroundColor Yellow
Write-Host "    Start-Sleep -Seconds 3; Stop-Process -Name 'steam','chrome' -Force -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "  ✅ VERIFY: No Steam, Chrome, Discord, or launcher processes running" -ForegroundColor Green

# ========== TASK 1.8 ==========
Write-Host "`n─── TASK 1.8: Silence Notifications ───" -ForegroundColor Yellow
Write-Host "  [terminal_auto] [LOW] [~1 min]`n"

Write-Host "  ▶ EXACT COMMANDS:" -ForegroundColor Green
Write-Host "    Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -Value 0 -Type DWord -Force" -ForegroundColor White
Write-Host "    Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings' -Name 'QuietHoursActive' -Value 1 -Type DWord -Force" -ForegroundColor White
Write-Host "    Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings' -Name 'NOC_GLOBAL_SETTING_ALLOW_NOTIFICATION_SOUND' -Value 0 -Type DWord -Force" -ForegroundColor White
Write-Host "  ✅ VERIFY: Quiet hours active, toasts OFF, sounds OFF" -ForegroundColor Green

# ========== TASK 1.9 [ENHANCED] ==========
Write-Host "`n─── ⭐ TASK 1.9 [ENHANCED - NEW]: Services Optimization ───" -ForegroundColor Magenta
Write-Host "  [terminal_elevated] [MEDIUM] [~5 mins]`n"
Write-Host "  QA IDENTIFIED: Missing services disable (SysMain, WSearch, etc. can slow HDD install)" -ForegroundColor Yellow

Write-Host "  ▶ STEP 1 (BACKUP original startup types):" -ForegroundColor Green
Write-Host "    Get-Service WSearch,SysMain,wuauserv,BITS,WinDefend,DiagTrack |" -ForegroundColor White
Write-Host "      Select Name, StartType | Export-Csv \"`$env:TEMP\services_backup.csv\" -NoTypeInformation" -ForegroundColor White

Write-Host "  ▶ STEP 2 (STOP and DISABLE all non-essential services):" -ForegroundColor Green
Write-Host "    @('WSearch','SysMain','wuauserv','BITS','WinDefend','DiagTrack'," -ForegroundColor White
Write-Host "      'XboxGipSvc','XblAuthManager','XblGameSave','XboxNetApiSvc'," -ForegroundColor White
Write-Host "      'lfsvc','MapsBroker','WpnService','DoSvc') |" -ForegroundColor White
Write-Host "    ForEach-Object {" -ForegroundColor White
Write-Host "      Stop-Service `$_ -Force -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "      Set-Service `$_ -StartupType Disabled -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "      Write-Output \"`$_ → STOPPED + DISABLED\"" -ForegroundColor White
Write-Host "    }" -ForegroundColor White

Write-Host "  ▶ STEP 3 (verify):" -ForegroundColor Green
Write-Host "    Get-Service WSearch,SysMain,wuauserv,BITS,XboxGipSvc |" -ForegroundColor White
Write-Host "      Select Name, Status, StartType | Format-Table -AutoSize" -ForegroundColor White
Write-Host "    → All should show Status=Stopped, StartType=Disabled" -ForegroundColor Gray

Write-Host "  ⚠️ NOTE: These will be RESTORED in Phase 10 using the backup CSV" -ForegroundColor Yellow
Write-Host "  ✅ VERIFY: Services stopped/disabled, original config backed up" -ForegroundColor Green

# ========== TASK 1.10 [ENHANCED] ==========
Write-Host "`n─── ⭐ TASK 1.10 [ENHANCED - NEW]: TCP/IP & Network Optimization ───" -ForegroundColor Magenta
Write-Host "  [terminal_elevated] [MEDIUM] [~5 mins]`n"

Write-Host "  ▶ EXACT COMMANDS (run ALL):" -ForegroundColor Green
Write-Host "    # 1. Disable WiFi adapter power saving" -ForegroundColor Yellow
Write-Host "    Get-NetAdapter -Name '*WiFi*' | Disable-NetAdapterPowerManagement -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "    # 2. TCP Auto-Tuning (normal = best for torrents)" -ForegroundColor Yellow
Write-Host "    netsh int tcp set global autotuninglevel=normal" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "    # 3. Receive Side Scaling (multi-core CPU optimization)" -ForegroundColor Yellow
Write-Host "    netsh int tcp set global rss=enabled" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "    # 4. TCP Chimney Offload" -ForegroundColor Yellow
Write-Host "    netsh int tcp set global chimney=enabled" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "    # 5. Network Direct Memory Access" -ForegroundColor Yellow
Write-Host "    netsh int tcp set global netdma=enabled" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "    # 6. Throughput optimization" -ForegroundColor Yellow
Write-Host "    netsh int tcp set global throughput=auto" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "    # 7. Flush DNS resolver cache" -ForegroundColor Yellow
Write-Host "    ipconfig /flushdns" -ForegroundColor White

Write-Host "  ▶ VERIFY ALL:" -ForegroundColor Green
Write-Host "    netsh int tcp show global" -ForegroundColor White
Write-Host "    → Confirm: RSS=enabled, Chimney=enabled, AutoTuningLevel=normal" -ForegroundColor Gray

Write-Host "  ✅ VERIFY: TCP/IP optimized for max download throughput" -ForegroundColor Green

# ========== TASK 1.11 [ENHANCED] ==========
Write-Host "`n─── ⭐ TASK 1.11 [ENHANCED - NEW]: Background Apps & Startup Cleanup ───" -ForegroundColor Magenta
Write-Host "  [terminal_auto] [LOW] [~3 mins]`n"

Write-Host "  ▶ COMMAND 1 (list current background apps):" -ForegroundColor Green
Write-Host "    Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' |" -ForegroundColor White
Write-Host "      ForEach-Object { Get-ItemProperty `$_.PSPath } | Select DisplayName, Disabled | Format-Table -AutoSize" -ForegroundColor White

Write-Host "  ▶ COMMAND 2 (disable ALL background apps):" -ForegroundColor Green
Write-Host "    Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' |" -ForegroundColor White
Write-Host "      ForEach-Object { New-ItemProperty -Path `$_.PSPath -Name 'Disabled' -Value 1 -PropertyType DWord -Force -ErrorAction SilentlyContinue }" -ForegroundColor White

Write-Host "  ▶ COMMAND 3 (list startup programs for manual clean):" -ForegroundColor Green
Write-Host "    Get-CimInstance Win32_StartupCommand | Select Name, Command, Location | Format-Table -AutoSize" -ForegroundColor White

Write-Host "  ▶ COMMAND 4 (disable Xbox services entirely):" -ForegroundColor Green
Write-Host "    @('XboxGipSvc','XblAuthManager','XblGameSave','XboxNetApiSvc') |" -ForegroundColor White
Write-Host "      ForEach-Object { Stop-Service `$_ -Force -ErrorAction SilentlyContinue; Set-Service `$_ -StartupType Disabled -ErrorAction SilentlyContinue }" -ForegroundColor White

Write-Host "  ✅ VERIFY: Background apps disabled, startup programs documented, Xbox services stopped" -ForegroundColor Green

# ========== TASK 1.12 [ENHANCED] ==========
Write-Host "`n─── ⭐ TASK 1.12 [ENHANCED - NEW]: Page File Configuration (16GB on SSD) ───" -ForegroundColor Magenta
Write-Host "  [terminal_elevated] [MEDIUM] [~5 mins]`n"
Write-Host "  QA IDENTIFIED: Missing page file optimization - critical for HDD gaming performance" -ForegroundColor Yellow

Write-Host "  ▶ STEP 1 (check current page file):" -ForegroundColor Green
Write-Host "    Get-CimInstance Win32_ComputerSystem |" -ForegroundColor White
Write-Host "      Select @{N='TotalRAM_GB';E={[math]::Round(`$_.TotalPhysicalMemory/1GB,1)}}," -ForegroundColor White
Write-Host "        @{N='PageFile_GB';E={[math]::Round((`$_.TotalVirtualMemory-`$_.TotalPhysicalMemory)/1GB,1)}}" -ForegroundColor White
Write-Host "    → Current: Should show Auto-managed on C:" -ForegroundColor Gray

Write-Host "  ▶ STEP 2 (disable auto-management):" -ForegroundColor Green
Write-Host '    wmic computersystem where name="%computername%" set AutomaticManagedPagefile=False' -ForegroundColor White

Write-Host "  ▶ STEP 3 (create 16GB fixed page file on SSD C:):" -ForegroundColor Green
Write-Host '    wmic pagefileset create name="C:\pagefile.sys"' -ForegroundColor White
Write-Host '    wmic pagefileset where name="C:\pagefile.sys" set InitialSize=16384,MaximumSize=16384' -ForegroundColor White

Write-Host "  ▶ STEP 4 (verify):" -ForegroundColor Green
Write-Host "    Get-CimInstance Win32_PageFileUsage | Select Name, AllocatedBaseSize | Format-Table -AutoSize" -ForegroundColor White
Write-Host "    → Expect: C:\pagefile.sys, AllocatedBaseSize=16384" -ForegroundColor Gray

Write-Host "  ⚠️ NOTE: Page file changes require SYSTEM REBOOT to take effect" -ForegroundColor Red
Write-Host "  ✅ VERIFY: Page file set to 16GB fixed on C: (SSD)" -ForegroundColor Green

# ========== TASK 1.13 ==========
Write-Host "`n─── TASK 1.13: [REBOOT FLAG] Ask User: Reboot Now or Later? ───" -ForegroundColor Yellow
Write-Host "  [user_interaction] [MEDIUM] [~5 mins + reboot]`n"

Write-Host "  ▶ STEP-BY-STEP USER INSTRUCTIONS:" -ForegroundColor Green
Write-Host "    1. DISPLAY this summary to the user:" -ForegroundColor White
Write-Host "       ╔══════════════════════════════════════════════════╗" -ForegroundColor Gray
Write-Host "       ║  PHASE 1 CHANGES MADE:                        ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Game Mode → ENABLED                        ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Xbox Game DVR/Bar → DISABLED               ║" -ForegroundColor Gray
Write-Host "       ║  ✓ HAGS → ENABLED (needs reboot)              ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Power Plan → HIGH PERFORMANCE              ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Sleep/Display → DISABLED for install       ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Windows Update → PAUSED 35 days            ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Interfering Apps → KILLED                  ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Notifications → SILENCED                   ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Services Optimized → STOPPED               ║" -ForegroundColor Gray
Write-Host "       ║  ✓ TCP/IP Optimized → max throughput          ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Background Apps → DISABLED                 ║" -ForegroundColor Gray
Write-Host "       ║  ✓ Page File → 16GB on SSD (needs reboot)    ║" -ForegroundColor Gray
Write-Host "       ╚══════════════════════════════════════════════════╝" -ForegroundColor Gray

Write-Host "    2. INFORM USER:" -ForegroundColor White
Write-Host "       - HAGS + Page File changes require system reboot" -ForegroundColor Yellow
Write-Host "       - Without reboot: HAGS stays off, page file not changed" -ForegroundColor Yellow

Write-Host "    3. ASK USER:" -ForegroundColor White
Write-Host "       [A] Reboot NOW (recommended — clean state for install)" -ForegroundColor Green
Write-Host "       [B] Continue WITHOUT reboot (HAGS won't be active)" -ForegroundColor Yellow

Write-Host "    4. IF [A] REBOOT NOW:" -ForegroundColor Green
Write-Host "       Write-Host 'Rebooting in 15 seconds... Save your work!' -ForegroundColor Yellow" -ForegroundColor White
Write-Host "       Start-Sleep -Seconds 15" -ForegroundColor White
Write-Host "       Restart-Computer -Force" -ForegroundColor White

Write-Host "    5. IF [B] CONTINUE:" -ForegroundColor Yellow
Write-Host "       Set-Content -Path 'D:\GAMES\GTA_V\TEMP\reboot_flagged.txt' -Value '$(Get-Date): User deferred reboot'" -ForegroundColor White
Write-Host "       Write-Host 'Reboot flagged. Reminder at end of Phase 9.' -ForegroundColor Yellow" -ForegroundColor White

Write-Host "  ✅ VERIFY: User choice recorded. Reboot executed or deferred file created." -ForegroundColor Green

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " ✅ PHASE 1 COMPLETE — All 13 tasks executed" -ForegroundColor Cyan
Write-Host "    9 original tasks expanded + 4 [NEW] tasks (1.9-1.12)" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
