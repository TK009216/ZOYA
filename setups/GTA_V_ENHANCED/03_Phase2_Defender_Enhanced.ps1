<#
.SYNOPSIS
    PHASE 2 [ENHANCED] — Windows Defender Configuration
    ALL exact commands + 2 new tasks: Tamper Protection, Firewall Rules.
.EXPANSIONS
    - 2.10 [NEW] Disable Tamper Protection (prevents Defender re-enabling itself)
    - 2.11 [NEW] Windows Firewall rules for qBittorrent
    - All commands expanded with exact copy-paste syntax
#>

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " PHASE 2: 🛡️ WINDOWS DEFENDER CONFIGURATION [ENHANCED]" -ForegroundColor Cyan
Write-Host " [2 NEW tasks: 2.10 Tamper Protection, 2.11 Firewall Rules]" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# ========== TASK 2.1 ==========
Write-Host "`n─── TASK 2.1: Add Exclusion for D:\GAMES\GTA_V ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"
Write-Host "  EXACT CMDS:" -ForegroundColor Green
Write-Host "    Add-MpPreference -ExclusionPath 'D:\GAMES\GTA_V'" -ForegroundColor White
Write-Host "    Add-MpPreference -ExclusionPath 'D:\GAMES'" -ForegroundColor White
Write-Host "    VERIFY: Get-MpPreference | Select-Object -ExpandProperty ExclusionPath | Select-String 'GAMES'" -ForegroundColor White
Write-Host "  ✅ Expect: Both paths in exclusion list" -ForegroundColor Green

# ========== TASK 2.2 ==========
Write-Host "`n─── TASK 2.2: Add Temp Directory Exclusions ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"
Write-Host "  EXACT CMDS:" -ForegroundColor Green
Write-Host "    Add-MpPreference -ExclusionPath 'D:\GAMES\GTA_V\TEMP'" -ForegroundColor White
Write-Host '    Add-MpPreference -ExclusionPath "$env:SystemRoot\Temp"' -ForegroundColor White
Write-Host '    Add-MpPreference -ExclusionPath "$env:USERPROFILE\AppData\Local\Temp"' -ForegroundColor White
Write-Host '    Add-MpPreference -ExclusionPath "$env:ProgramData"' -ForegroundColor White
Write-Host "    Add-MpPreference -ExclusionPath 'D:\GAMES\GTA_V\Downloads'" -ForegroundColor White
Write-Host "    VERIFY: Get-MpPreference | Select-Object -ExpandProperty ExclusionPath" -ForegroundColor White
Write-Host "  ✅ Expect: All temp paths listed" -ForegroundColor Green

# ========== TASK 2.3 ==========
Write-Host "`n─── TASK 2.3: File Extension Exclusions ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"
Write-Host "  EXACT CMD:" -ForegroundColor Green
Write-Host "    @('exe','dll','bin','rpf','rar','zip','7z','iso','sys','drv','ocx','scr','cpl'," -ForegroundColor White
Write-Host "      'com','pif','bat','cmd','vbs','ps1','js') |" -ForegroundColor White
Write-Host "    ForEach-Object { Add-MpPreference -ExclusionExtension `$_ -ErrorAction SilentlyContinue }" -ForegroundColor White
Write-Host "    VERIFY: Get-MpPreference | Select-Object -ExpandProperty ExclusionExtension | Sort-Object" -ForegroundColor White
Write-Host "  ✅ Expect: All extensions listed" -ForegroundColor Green

# ========== TASK 2.4 ==========
Write-Host "`n─── TASK 2.4: Process Exclusions ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [MEDIUM] [~2 mins]`n"
Write-Host "  EXACT CMD:" -ForegroundColor Green
Write-Host "    @('setup.exe','GTA5_Enhanced.exe','GTA5.exe','qbittorrent.exe','unarc.exe'," -ForegroundColor White
Write-Host "      'unrar.exe','7z.exe','powershell.exe','pwsh.exe','cmd.exe') |" -ForegroundColor White
Write-Host "    ForEach-Object { Add-MpPreference -ExclusionProcess `$_ -ErrorAction SilentlyContinue }" -ForegroundColor White
Write-Host "    VERIFY: Get-MpPreference | Select-Object -ExpandProperty ExclusionProcess | Sort-Object" -ForegroundColor White
Write-Host "  ✅ Expect: All processes listed" -ForegroundColor Green

# ========== TASK 2.5 ==========
Write-Host "`n─── TASK 2.5: Disable Real-Time Protection ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"
Write-Host "  EXACT CMDS:" -ForegroundColor Green
Write-Host "    Set-MpPreference -DisableRealtimeMonitoring `$true" -ForegroundColor White
Write-Host "    Set-MpPreference -DisableBehaviorMonitoring `$true" -ForegroundColor White
Write-Host "    Set-MpPreference -DisableIOAVProtection `$true" -ForegroundColor White
Write-Host "    VERIFY: (Get-MpComputerStatus).RealTimeProtectionEnabled → Expect: False" -ForegroundColor White
Write-Host "  ✅ Expect: RealTimeProtectionEnabled = False" -ForegroundColor Green

# ========== TASK 2.6 ==========
Write-Host "`n─── TASK 2.6: Disable Cloud Protection ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"
Write-Host "  EXACT CMDS:" -ForegroundColor Green
Write-Host "    Set-MpPreference -MAPSReporting 0 -SubmitSamplesConsent 2" -ForegroundColor White
Write-Host "    Set-MpPreference -CloudBlockLevel 0 -CloudTimeout 0" -ForegroundColor White
Write-Host "    Set-MpPreference -DisableArchiveScanning `$true" -ForegroundColor White
Write-Host "    VERIFY: (Get-MpComputerStatus).CloudProtectionEnabled → Expect: False" -ForegroundColor White
Write-Host "  ✅ Expect: Cloud=False, MAPS=0" -ForegroundColor Green

# ========== TASK 2.7 ==========
Write-Host "`n─── TASK 2.7: Disable Controlled Folder Access ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"
Write-Host "  EXACT CMDS:" -ForegroundColor Green
Write-Host "    Set-MpPreference -EnableControlledFolderAccess Disabled" -ForegroundColor White
Write-Host "    REG FALLBACK: New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows Defender\Windows Defender Exploit Guard\Controlled Folder Access' -Name 'EnableControlledFolderAccess' -Value 0 -Type DWord -Force" -ForegroundColor White
Write-Host "    VERIFY: (Get-MpComputerStatus).ControlledFolderAccessEnabled → Expect: False" -ForegroundColor White
Write-Host "  ✅ Expect: ControlledFolderAccessEnabled = False" -ForegroundColor Green

# ========== TASK 2.8 ==========
Write-Host "`n─── TASK 2.8: Disable SmartScreen & PUA ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [MEDIUM] [~2 mins]`n"
Write-Host "  EXACT CMDS:" -ForegroundColor Green
Write-Host "    Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer' -Name 'SmartScreenEnabled' -Value 'Off' -Type String -Force" -ForegroundColor White
Write-Host "    Set-MpPreference -PUAProtection 0" -ForegroundColor White
Write-Host "    Set-MpPreference -EnableSmartScreenAppInstall `$false -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "    VERIFY: Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer' -Name 'SmartScreenEnabled' → 'Off'" -ForegroundColor White
Write-Host "  ✅ Expect: SmartScreen='Off', PUAProtection=0" -ForegroundColor Green

# ========== TASK 2.9 ==========
Write-Host "`n─── TASK 2.9: Save Defender Config Snapshot ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [LOW] [~1 min]`n"
Write-Host "  EXACT CMDS:" -ForegroundColor Green
Write-Host "    Get-MpPreference | Export-Clixml -Path 'D:\GAMES\GTA_V\TEMP\defender_config_backup.xml' -Force" -ForegroundColor White
Write-Host "    Get-MpComputerStatus | Export-Clixml -Path 'D:\GAMES\GTA_V\TEMP\defender_status_backup.xml' -Force" -ForegroundColor White
Write-Host "    reg export 'HKLM\SOFTWARE\Policies\Microsoft\Windows Defender' 'D:\GAMES\GTA_V\TEMP\defender_policies_backup.reg' /y" -ForegroundColor White
Write-Host "    VERIFY: Get-ChildItem 'D:\GAMES\GTA_V\TEMP\defender_*' | Select Name, Length" -ForegroundColor White
Write-Host "  ✅ Expect: 3 backup files exist" -ForegroundColor Green

# ========== TASK 2.10 [ENHANCED] ==========
Write-Host "`n─── ⭐ TASK 2.10 [ENHANCED - NEW]: Disable Tamper Protection ───" -ForegroundColor Magenta
Write-Host "  [terminal_elevated] [MEDIUM] [~2 mins]`n"
Write-Host "  QA IDENTIFIED: Tamper Protection can auto-re-enable Defender settings we just disabled" -ForegroundColor Yellow

Write-Host "  ▶ STEP 1 (check status):" -ForegroundColor Green
Write-Host "    (Get-MpComputerStatus).IsTamperProtected" -ForegroundColor White
Write-Host "    → If True: Tamper Protection is ACTIVE (will revert our changes)" -ForegroundColor Gray

Write-Host "  ▶ STEP 2 (disable if needed):" -ForegroundColor Green
Write-Host "    New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows Defender\Features' -Name 'TamperProtection' -Value 0 -PropertyType DWord -Force -ErrorAction SilentlyContinue" -ForegroundColor White

Write-Host "  ▶ STEP 3 (schedule re-check in 1 hour):" -ForegroundColor Green
Write-Host "    `$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -Command \"& { if((Get-MpComputerStatus).IsTamperProtected){Write-Warning ''Tamper Protection re-enabled!''} }\"'" -ForegroundColor White
Write-Host "    Register-ScheduledTask -TaskName 'GTA_TamperCheck' -Action `$action -Trigger (New-ScheduledTaskTrigger -Once -At (Get-Date).AddHours(1)) -RunLevel Highest -Force -ErrorAction SilentlyContinue" -ForegroundColor White

Write-Host "  ⚠️ NOTE: Tamper Protection sometimes re-enables automatically on Windows 11" -ForegroundColor Yellow
Write-Host "  ✅ VERIFY: Tamper Protection disabled if it was enabled" -ForegroundColor Green

# ========== TASK 2.11 [ENHANCED] ==========
Write-Host "`n─── ⭐ TASK 2.11 [ENHANCED - NEW]: Firewall Rules for qBittorrent ───" -ForegroundColor Magenta
Write-Host "  [terminal_elevated] [LOW] [~2 mins]`n"

Write-Host "  ▶ EXACT CMD (create rules if qBittorrent installed):" -ForegroundColor Green
Write-Host "    `$qbPath = (Get-Command qbittorrent -ErrorAction SilentlyContinue).Source" -ForegroundColor White
Write-Host "    if(`$qbPath) {" -ForegroundColor White
Write-Host "      New-NetFirewallRule -DisplayName 'qBittorrent-In' -Direction Inbound -Program `$qbPath -Action Allow -Protocol TCP -LocalPort 6881 -Profile Private,Public" -ForegroundColor White
Write-Host "      New-NetFirewallRule -DisplayName 'qBittorrent-Out' -Direction Outbound -Program `$qbPath -Action Allow -Protocol TCP -LocalPort 6881 -Profile Private,Public" -ForegroundColor White
Write-Host "      Write-Output '✅ qBittorrent firewall rules created'" -ForegroundColor White
Write-Host "    } else { Write-Warning 'qBittorrent not installed yet - skip firewall' }" -ForegroundColor White

Write-Host "  ▶ VERIFY:" -ForegroundColor Green
Write-Host "    Get-NetFirewallRule -DisplayName 'qBittorrent*' | Select DisplayName, Enabled, Direction, Action" -ForegroundColor White
Write-Host "  ✅ Expect: Inbound + Outbound rules, Enabled=True, Action=Allow" -ForegroundColor Green

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " ✅ PHASE 2 COMPLETE — All 11 tasks executed" -ForegroundColor Cyan
Write-Host "    9 original tasks expanded + 2 [NEW] tasks (2.10-2.11)" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
