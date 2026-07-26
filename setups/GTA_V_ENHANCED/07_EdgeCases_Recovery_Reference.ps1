<#
.SYNOPSIS
    GTA V ENHANCED — ALL 12 EDGE CASE RECOVERY PATHS
    Quick-reference for when things go wrong during installation.
#>

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║  🆘 GTA V ENHANCED — EDGE CASE RECOVERY REFERENCE          ║" -ForegroundColor Red
Write-Host="║  12 Recovery Paths for Common Installation Failures        ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Red

# EDGE CASE 1
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 1: Torrent Download Stuck at 0%" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: Torrent added but shows 0% after 5+ minutes" -ForegroundColor Gray
Write-Host "  CAUSE: No peers found, trackers unavailable, or firewall blocking" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. Right-click torrent > 'Force re-announce'" -ForegroundColor White
Write-Host "    2. Right-click > Torrent > Edit Trackers → add more trackers (see Phase 3.4)" -ForegroundColor White
Write-Host "    3. Check firewall: Get-NetFirewallRule -DisplayName 'qBittorrent*'" -ForegroundColor White
Write-Host "    4. Temporarily disable firewall: netsh advfirewall set allprofiles state off" -ForegroundColor White
Write-Host "    5. Check if ISP blocks P2P: enable Protocol Encryption in qBittorrent settings" -ForegroundColor White

# EDGE CASE 2
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 2: WiFi Disconnects During Download" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: Internet drops, torrent shows 'Downloading from 0 peers'" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. qBittorrent auto-resumes on WiFi reconnect (wait 1-2 min)" -ForegroundColor White
Write-Host "    2. If not auto-resume: Right-click > Resume" -ForegroundColor White
Write-Host "    3. Verify WiFi reconnected: ping -n 2 8.8.8.8" -ForegroundColor White
Write-Host "    4. Check: powercfg /change standby-timeout-ac 0 (prevent sleep on disconnect)" -ForegroundColor White

# EDGE CASE 3
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 3: Installer Crashes Mid-Installation" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: setup.exe disappears, installer window gone" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. DO NOT reboot yet. Check for error messages on screen." -ForegroundColor White
Write-Host "    2. Check if process dead: Get-Process -Name 'setup*' -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "    3. Check D: drive space: `$f = (Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='D:'\").FreeSpace; [math]::Round(`$f/1GB,1)" -ForegroundColor White
Write-Host "       → If < 10 GB: DISK FULL! Free up space." -ForegroundColor Yellow
Write-Host "    4. If crashed: Delete D:\GAMES\GTA_V (partial corrupt files)" -ForegroundColor Yellow
Write-Host "    5. RUN CHKDSK: chkdsk D: /f (check filesystem)" -ForegroundColor Yellow
Write-Host "    6. Re-start from Phase 4.2 (find setup.exe and re-run)" -ForegroundColor Yellow

# EDGE CASE 4
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 4: Power Outage During Installation" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: PC shut down unexpectedly during install" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. On reboot: immediately run chkdsk D: /f" -ForegroundColor Yellow
Write-Host "    2. Check D: drive health: wmic diskdrive where index=1 get status" -ForegroundColor White
Write-Host "    3. Delete D:\GAMES\GTA_V entirely (files are corrupt/partial)" -ForegroundColor Yellow
Write-Host "    4. Re-run Phase 2 (Defender exclusions may have reset)" -ForegroundColor Yellow
Write-Host "    5. Start fresh from Phase 4.1 (set TEMP + find setup.exe)" -ForegroundColor Yellow

# EDGE CASE 5
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 5: ↑ Arrow Key Press Doesn't Work" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: Black screen with 'Press ↑' but nothing happens" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. Click INSIDE the black window (give it keyboard focus)" -ForegroundColor White
Write-Host "    2. Try pressing ↑ multiple times (some repacks need 2 presses)" -ForgroundColor White
Write-Host "    3. Press Enter first, then ↑" -ForegroundColor White
Write-Host "    4. Some repack versions SKIP this step altogether. Check if installer continues." -ForegroundColor White
Write-Host "    5. Last resort: Close installer, re-run as admin. Press ↑ immediately when black screen appears." -ForegroundColor Yellow

# EDGE CASE 6
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 6: Windows Defender Re-Enables During Install" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: Installer slows down or files get quarantined mid-install" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. Check: (Get-MpComputerStatus).RealTimeProtectionEnabled" -ForegroundColor White
Write-Host "    2. If True → Re-run Phase 2.5: Set-MpPreference -DisableRealtimeMonitoring `$true" -ForegroundColor White
Write-Host "    3. Check Tamper Protection: (Get-MpComputerStatus).IsTamperProtected" -ForegroundColor White
Write-Host "       → If True: New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows Defender\Features' -Name 'TamperProtection' -Value 0 -Type DWord -Force" -ForegroundColor White
Write-Host "    4. Check exclusions still exist: Get-MpPreference | Select -ExpandProperty ExclusionPath" -ForegroundColor White
Write-Host "    5. If quarantined files: Check Windows Security > Virus & threat protection > Protection history" -ForegroundColor White
Write-Host "       → Restore any crack-related files that were removed" -ForegroundColor Yellow

# EDGE CASE 7
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 7: Disk Runs Out of Space Mid-Install" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: Installer shows 'Not enough space' or crashes" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. Check space: `$f = (Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='D:'\").FreeSpace; [math]::Round(`$f/1GB,1)" -ForegroundColor White
Write-Host "    2. Delete D:\GAMES\GTA_V\Downloads (torrent files = free 39.5 GB INSTANTLY)" -ForegroundColor Yellow
Write-Host "    3. Delete D:\GAMES\GTA_V\TEMP (temp extraction files = free 20+ GB)" -ForegroundColor Yellow
Write-Host "    4. Run cleanmgr.exe /d D:" -ForegroundColor White
Write-Host "    5. If still low: temporarily move other games/files from D: drive" -ForegroundColor Yellow

# EDGE CASE 8
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 8: Windows Update Forces Reboot During Install" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: 'Windows needs to restart' dialog during install" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. Check pause status: Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'PauseUpdatesExpiryTime'" -ForegroundColor White
Write-Host "    2. If expired: re-run Phase 1.6 (pause updates again)" -ForegroundColor White
Write-Host "    3. Postpone reboot: in update dialog click 'Schedule later'" -ForegroundColor White
Write-Host "    4. After install: unpause updates in Phase 10.6" -ForegroundColor White

# EDGE CASE 9
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 9: Antivirus Flags Crack Files" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: Windows Defender or other AV deletes crack DLLs" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. Restore from Windows Security > Protection history > restore file" -ForegroundColor White
Write-Host "    2. Or restore from _CrackBackup: Copy-Item 'D:\GAMES\GTA_V\_CrackBackup\*' 'D:\GAMES\GTA_V\' -Force" -ForegroundColor White
Write-Host "    3. Re-verify exclusions: Add-MpPreference -ExclusionPath 'D:\GAMES\GTA_V'" -ForegroundColor White
Write-Host "    4. Process exclusion: Add-MpPreference -ExclusionProcess 'GTA5_Enhanced.exe'" -ForegroundColor White

# EDGE CASE 10
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 10: Crack Fails After Update (v1013.33)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: Game asks for Steam/activation after update" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. Check if crack was overwritten: Test-Path 'D:\GAMES\GTA_V\steam_api64.dll'" -ForegroundColor White
Write-Host "    2. Restore from _CrackBackup: Copy-Item 'D:\GAMES\GTA_V\_CrackBackup\*' 'D:\GAMES\GTA_V\' -Force" -ForegroundColor White
Write-Host "    3. If update includes its own crack (RUNE): use that instead" -ForegroundColor White
Write-Host "    4. If still fails: ROLLBACK the update (Phase 7.8):" -ForegroundColor Yellow
Write-Host "       Copy-Item 'D:\GAMES\GTA_V\_UpdateBackup\*' 'D:\GAMES\GTA_V\' -Force -Recurse" -ForegroundColor White
Write-Host "       (Get-Item 'D:\GAMES\GTA_V\GTA5_Enhanced.exe').VersionInfo.FileVersion → expect 1013.20" -ForegroundColor White

# EDGE CASE 11
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 11: Archive Corruption (CRC Errors During Extract)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: 7-Zip/WinRAR shows CRC error during extraction" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. Identify which RAR part failed (the error message shows the file)" -ForegroundColor White
Write-Host "    2. Test archives: 7z t 'D:\GAMES\GTA_V\Downloads\*.rar'" -ForegroundColor White
Write-Host "    3. Re-download only failed part from torrent (set priority to Normal)" -ForegroundColor White
Write-Host "    4. Check SFV file: Get-ChildItem 'D:\GAMES\GTA_V\Downloads' -Filter '*.sfv'" -ForegroundColor White
Write-Host "    5. Use 'QuickSFV' to verify file checksums against SFV" -ForegroundColor White

# EDGE CASE 12
Write-Host "`n─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host " 🔴 EDGE CASE 12: BSOD / System Crash During Install" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  SYMPTOM: Blue Screen of Death during installation" -ForegroundColor Gray
Write-Host "  RECOVERY:" -ForegroundColor Green
Write-Host "    1. On reboot: Check minidump for error analysis:" -ForegroundColor White
Write-Host "       Get-ChildItem 'C:\Windows\Minidump' | Sort-Object LastWriteTime -Descending | Select -First 1" -ForegroundColor White
Write-Host "    2. Common BSOD causes during FitGirl install:" -ForegroundColor Yellow
Write-Host "       - NTFS_FILE_SYSTEM: Disk corruption → chkdsk D: /f" -ForegroundColor Yellow
Write-Host "       - MEMORY_MANAGEMENT: RAM issue → memtest (but unlikely with 32GB)" -ForegroundColor Yellow
Write-Host "       - DRIVER_IRQL_NOT_LESS_OR_EQUAL: Driver conflict → update chipset driver" -ForegroundColor Yellow
Write-Host "    3. Check system files: sfc /scannow" -ForegroundColor White
Write-Host "    4. Check disk health: wmic diskdrive where index=1 get status" -ForegroundColor White
Write-Host "    5. If BSOD persists: try '2GB RAM limit' mode in installer options" -ForegroundColor Yellow

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ 12 EDGE CASE RECOVERY PATHS DOCUMENTED                  ║" -ForegroundColor Green
Write-Host "║  Copy this script to D:\GAMES\GTA_V\_EdgeCases.ps1         ║" -ForegroundColor Green
Write-Host "║  for quick reference during installation                   ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
