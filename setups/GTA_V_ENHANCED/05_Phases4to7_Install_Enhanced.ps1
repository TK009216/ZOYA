<#
.SYNOPSIS
    PHASES 4-7 [ENHANCED] — Installation, Post-Install, Graphics, Update
    ALL exact commands + all edge cases + all step-by-step instructions.
#>

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " PHASES 4-7: 💿 INSTALL → 🔧 POST-INSTALL → 🎮 GRAPHICS → 🔄 UPDATE" -ForegroundColor Cyan
Write-Host " [ENHANCED] All exact commands + 7 edge case recovery paths" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# =====================================================================
# PHASE 4: INSTALLATION
# =====================================================================
Write-Host "`n`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host " PHASE 4: 💿 INSTALLATION — THE MAIN EVENT (2-4 HOURS ON HDD)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# TASK 4.1
Write-Host "`n─── TASK 4.1: Set TEMP to D: Drive ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [HIGH] [~2 mins]`n"
Write-Host "  EXACT CMDS:" -ForegroundColor Green
Write-Host "    [Environment]::SetEnvironmentVariable('TEMP','D:\GAMES\GTA_V\TEMP','Machine')" -ForegroundColor White
Write-Host "    [Environment]::SetEnvironmentVariable('TMP','D:\GAMES\GTA_V\TEMP','Machine')" -ForegroundColor White
Write-Host "    `$env:TEMP = 'D:\GAMES\GTA_V\TEMP'; `$env:TMP = 'D:\GAMES\GTA_V\TEMP'" -ForegroundColor White
Write-Host "    VERIFY: [Environment]::GetEnvironmentVariable('TEMP','Machine') → 'D:\GAMES\GTA_V\TEMP'" -ForegroundColor White
Write-Host "  ✅ VERIFY: TEMP/TMP point to D: drive" -ForegroundColor Green

# TASK 4.2
Write-Host "`n─── TASK 4.2: Find setup.exe ───" -ForegroundColor Yellow
Write-Host "  [terminal_auto] [HIGH] [~1 min]`n"
Write-Host "  EXACT CMD:" -ForegroundColor Green
Write-Host "    `$setup = Get-ChildItem -Path 'D:\GAMES\GTA_V\Downloads' -Recurse -Filter 'setup.exe' -Depth 4 -ErrorAction SilentlyContinue | Select-Object -First 1" -ForegroundColor White
Write-Host "    if(`$setup){ Write-Output \"✅ Found: `$(`$setup.FullName) `$([math]::Round(`$setup.Length/1MB,1)) MB\" } else { Write-Warning '❌ setup.exe NOT FOUND - check extracted folder' }" -ForegroundColor White
Write-Host "  ✅ VERIFY: setup.exe located and path recorded" -ForegroundColor Green

# TASK 4.3
Write-Host "`n─── TASK 4.3: Run setup.exe as Admin ───" -ForegroundColor Yellow
Write-Host "  [user_interaction] [HIGH] [~2-4 hours]`n"
Write-Host "  STEP-BY-STEP:" -ForegroundColor Green
Write-Host "    1. Navigate to extracted folder in File Explorer" -ForegroundColor White
Write-Host "    2. RIGHT-CLICK setup.exe > 'Run as Administrator'" -ForegroundColor Yellow
Write-Host "    3. UAC prompt → click 'Yes'" -ForegroundColor White
Write-Host "    4. If SmartScreen blocks: Right-click > Properties > check 'Unblock' > Apply > OK > Run again" -ForegroundColor Yellow
Write-Host "    5. Installer opens (WinRAR SFX + InnoSetup hybrid)" -ForegroundColor White
Write-Host "  ✅ VERIFY: Installer window opens" -ForegroundColor Green

# TASK 4.4-4.8
Write-Host "`n─── TASKS 4.4-4.8: Installation Wizard Steps ───" -ForegroundColor Yellow
Write-Host "  [user_interaction] [CRITICAL] [~5 mins settings + 2-4 hrs wait]`n"

Write-Host "  ▶ STEP 4.4: Welcome → 'Next' → Language = English → 'Next'" -ForegroundColor Green
Write-Host "  ▶ STEP 4.5: Press ↑ (UP ARROW) when black screen appears (FitGirl bypass) - CRITICAL!" -ForegroundColor Red
Write-Host "    ⚠️ EDGE CASE: ↑ key doesn't work → Click inside the black window, then press ↑" -ForegroundColor Yellow
Write-Host "    ⚠️ EDGE CASE: No black screen appears → Some repacks skip this. Proceed to next step." -ForegroundColor Yellow

Write-Host "  ▶ STEP 4.6: Destination → Browse → D:\GAMES\GTA_V → 'Next'" -ForegroundColor Green

Write-Host "  ▶ STEP 4.7: Components → Set as follows:" -ForegroundColor Green
Write-Host "    ☐ Desktop shortcut (UNCHECK - we'll make our own)" -ForegroundColor White
Write-Host "    ☑ Grand Theft Auto V (required)" -ForegroundColor White
Write-Host "    ☑ Grand Theft Auto V Enhanced (required - THIS IS THE ONE)" -ForegroundColor Yellow
Write-Host "    ☐ Red Dead Redemption 2 (UNCHECK - not related)" -ForegroundColor White
Write-Host "    ☑ DirectX Redistributable (keep)" -ForegroundColor White
Write-Host "    ☑ Social Club (required for crack emu)" -ForegroundColor White
Write-Host "    ☐ ALL non-English language packs (UNCHECK = save ~5-10 GB!)" -ForegroundColor Yellow

Write-Host "  ▶ STEP 4.8: Options → Set as follows:" -ForegroundColor Green
Write-Host "    ☐ Create backup copy → UNCHECK" -ForegroundColor White
Write-Host "    ☐ Limit to 4GB RAM → UNCHECK (we have 32GB!)" -ForegroundColor Green
Write-Host "    ☑ Check files integrity after install → CHECK (CRITICAL)" -ForegroundColor Yellow
Write-Host "    ☑ Auto-install DirectX → CHECK" -ForegroundColor White
Write-Host "    ☐ Half-duplex mode for slow CPUs → UNCHECK (Ryzen 5 3600 is fine)" -ForegroundColor White
Write-Host "    → Click 'Install'" -ForegroundColor Green

# TASK 4.9
Write-Host "`n─── TASK 4.9: WAIT for Installation (2-4 HOURS) [ENHANCED EDGE CASES] ───" -ForegroundColor Yellow
Write-Host "  [user_interaction] [CRITICAL] [~120-240 mins]`n"

Write-Host "  ▶ EXPECTED STAGES:" -ForegroundColor Green
Write-Host "    Stage 1: 'Extracting/Unpacking archives' — 30-60 mins (slow on HDD)" -ForegroundColor Gray
Write-Host "    Stage 2: 'Installing game files' — 60-120 mins (copying 95 GB)" -ForegroundColor Gray
Write-Host "    Stage 3: 'Applying crack/emu' — 5 mins" -ForegroundColor Gray
Write-Host "    Stage 4: 'Installing DirectX/VC++' — 5-10 mins" -ForegroundColor Gray
Write-Host "    Stage 5: 'Verifying integrity' — 15-30 mins" -ForegroundColor Gray

Write-Host "`n  ⚠️ EDGE CASE 1: Installer appears frozen (>30 mins no progress):" -ForegroundColor Red
Write-Host "    Check: Task Manager > Performance > Disk (D: drive 100% active = working)" -ForegroundColor Yellow
Write-Host "    Check: Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='D:'\" | Select @{N='UsedGB';E={[math]::Round((`$_.Size-`$_.FreeSpace)/1GB,0)}}" -ForegroundColor Yellow
Write-Host "    → If used space growing → it's working! WAIT MORE." -ForegroundColor Yellow

Write-Host "`n  ⚠️ EDGE CASE 2: Installer CRASHES mid-installation:" -ForegroundColor Red
Write-Host "    DO NOT reboot immediately!" -ForegroundColor Yellow
Write-Host "    Check: Get-Process -Name 'setup*' -ErrorAction SilentlyContinue → if dead, it crashed" -ForegroundColor Yellow
Write-Host "    Solution: Delete D:\GAMES\GTA_V (partial corrupt files), free space, restart from Phase 4.2" -ForegroundColor Yellow

Write-Host "`n  ⚠️ EDGE CASE 3: Disk runs out of space:" -ForegroundColor Red
Write-Host "    Check free space: [math]::Round((Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='D:'\").FreeSpace/1GB,1)" -ForegroundColor Yellow
Write-Host "    Solution: Delete D:\GAMES\GTA_V\Downloads (torrent files = freed 39.5 GB)" -ForegroundColor Yellow
Write-Host "    Solution: Run cleanmgr.exe /d D:" -ForegroundColor Yellow

Write-Host "`n  ⚠️ EDGE CASE 4: Defender re-enables itself:" -ForegroundColor Red
Write-Host "    Check: (Get-MpComputerStatus).RealTimeProtectionEnabled" -ForegroundColor Yellow
Write-Host "    If True: Set-MpPreference -DisableRealtimeMonitoring `$true (re-run Phase 2.5)" -ForegroundColor Yellow

Write-Host "`n  ⚠️ EDGE CASE 5: Power outage during install:" -ForegroundColor Red
Write-Host "    On reboot: chkdsk D: /f (check filesystem)" -ForegroundColor Yellow
Write-Host "    Delete D:\GAMES\GTA_V (corrupt partial files), START OVER from Phase 4.2" -ForegroundColor Yellow

Write-Host "  ✅ VERIFY: Installer shows 'Installation Complete' with no errors" -ForegroundColor Green

# TASK 4.10-4.11
Write-Host "`n─── TASK 4.10-4.11: Completion & Integrity Check ───" -ForegroundColor Yellow
Write-Host "  [user_interaction + terminal_elevated] [HIGH] [~5 + 15 mins]`n"

Write-Host "  ▶ TASK 4.10 (Completion):" -ForegroundColor Green
Write-Host "    UNCHECK 'Run Grand Theft Auto V Enhanced'" -ForegroundColor White
Write-Host "    UNCHECK 'Open Readme'" -ForegroundColor White
Write-Host "    Click 'Finish' or 'Close'" -ForegroundColor White

Write-Host "`n  ▶ TASK 4.11 (Verify Install - EXACT CMDS):" -ForegroundColor Green
Write-Host "    # Check exe exists:" -ForegroundColor Yellow
Write-Host "    Test-Path 'D:\GAMES\GTA_V\GTA5_Enhanced.exe' → Expect: True" -ForegroundColor White
Write-Host "    # Check total size:" -ForegroundColor Yellow
Write-Host "    `$size = (Get-ChildItem 'D:\GAMES\GTA_V' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum" -ForegroundColor White
Write-Host "    Write-Output \"Installed: `$([math]::Round(`$size/1GB,1)) GB (expect ~95 GB)\"" -ForegroundColor White
Write-Host "    # Check all critical dirs:" -ForegroundColor Yellow
Write-Host "    @('GTA5_Enhanced.exe','GTA5.exe','update','x64') | ForEach-Object {" -ForegroundColor White
Write-Host "      if(Test-Path \"D:\GAMES\GTA_V\`$_\"){Write-Output \"✅ `$_\`"}else{Write-Warning \"❌ `$_ MISSING\"}" -ForegroundColor White
Write-Host "    }" -ForegroundColor White
Write-Host "    # File count:" -ForegroundColor Yellow
Write-Host "    (Get-ChildItem 'D:\GAMES\GTA_V' -Recurse -File -ErrorAction SilentlyContinue).Count → Expect > 50000" -ForegroundColor White
Write-Host "  ✅ VERIFY: GTA5_Enhanced.exe exists, ~95 GB, >50000 files" -ForegroundColor Green

# =====================================================================
# PHASE 5: POST-INSTALL
# =====================================================================
Write-Host "`n`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host " PHASE 5: 🔧 POST-INSTALLATION — CLEANUP & CONFIGURATION" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n─── TASK 5.1: Verify Critical Game Files ───" -ForegroundColor Yellow
Write-Host "  [terminal_auto] [HIGH] [~5 mins]`n"
Write-Host "  EXACT CMD:" -ForegroundColor Green
Write-Host "    @('D:\GAMES\GTA_V\GTA5_Enhanced.exe','D:\GAMES\GTA_V\GTA5.exe'," -ForegroundColor White
Write-Host "      'D:\GAMES\GTA_V\update','D:\GAMES\GTA_V\x64') |" -ForegroundColor White
Write-Host "    ForEach-Object { if(Test-Path `$_){Write-Output \"✅ `$_\`"}else{Write-Warning \"❌ `$_ MISSING\"} }" -ForegroundColor White

Write-Host "`n─── TASK 5.2: Configure emu INI ───" -ForegroundColor Yellow
Write-Host "  [user_manual] [HIGH] [~5 mins]`n"
Write-Host "  STEP-BY-STEP:" -ForegroundColor Green
Write-Host "    1. Find INI: Get-ChildItem 'D:\GAMES\GTA_V' -Filter '*emu*' -Recurse" -ForegroundColor White
Write-Host "    2. Open in Notepad" -ForegroundColor White
Write-Host "    3. Check/Set: Language=english, Offline=1, AppId=271590" -ForegroundColor White
Write-Host "    4. Save and close" -ForegroundColor White

Write-Host "`n─── TASK 5.3: Create Desktop Shortcut ───" -ForegroundColor Yellow
Write-Host "  [terminal_auto] [HIGH] [~5 mins]`n"
Write-Host "  EXACT CMD:" -ForegroundColor Green
Write-Host "    `$WshShell = New-Object -ComObject WScript.Shell" -ForegroundColor White
Write-Host "    `$Shortcut = `$WshShell.CreateShortcut(\"`$env:USERPROFILE\Desktop\GTA V Enhanced.lnk\")" -ForegroundColor White
Write-Host "    `$Shortcut.TargetPath = 'D:\GAMES\GTA_V\GTA5_Enhanced.exe'" -ForegroundColor White
Write-Host "    `$Shortcut.WorkingDirectory = 'D:\GAMES\GTA_V'" -ForegroundColor White
Write-Host "    `$Shortcut.Description = 'Grand Theft Auto V - Enhanced Edition (DX12+FSR3.1)'" -ForegroundColor White
Write-Host "    `$Shortcut.Save()" -ForegroundColor White
Write-Host "    # Set 'Run as admin' bit:" -ForegroundColor Yellow
Write-Host "    `$bytes = [System.IO.File]::ReadAllBytes(\"`$env:USERPROFILE\Desktop\GTA V Enhanced.lnk\")" -ForegroundColor White
Write-Host "    `$bytes[0x15] = `$bytes[0x15] -bor 0x20" -ForegroundColor White
Write-Host "    [System.IO.File]::WriteAllBytes(\"`$env:USERPROFILE\Desktop\GTA V Enhanced.lnk\", `$bytes)" -ForegroundColor White
Write-Host "  ✅ VERIFY: Shortcut exists, Target = GTA5_Enhanced.exe, admin bit set" -ForegroundColor Green

Write-Host "`n─── TASK 5.4: Rename GTA5.exe to GTA5_Legacy.exe ───" -ForegroundColor Yellow
Write-Host "  [terminal_elevated] [MEDIUM] [~2 mins]`n"
Write-Host "  EXACT CMD:" -ForegroundColor Green
Write-Host "    Rename-Item -Path 'D:\GAMES\GTA_V\GTA5.exe' -NewName 'GTA5_Legacy.exe' -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "    # Create README:" -ForegroundColor Yellow
Write-Host "    Set-Content -Path 'D:\GAMES\GTA_V\README - Launch GTA5_Enhanced.exe.txt' -Value 'Launch GTA5_Enhanced.exe (not GTA5_Legacy.exe)!'" -ForegroundColor White
Write-Host "  ✅ VERIFY: GTA5.exe renamed to GTA5_Legacy.exe" -ForegroundColor Green

# =====================================================================
# PHASE 6: FIRST LAUNCH & GRAPHICS
# =====================================================================
Write-Host "`n`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host " PHASE 6: 🎮 FIRST LAUNCH & GRAPHICS CONFIGURATION" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n─── TASK 6.1: First Launch - Shader Compilation ───" -ForegroundColor Yellow
Write-Host "  [user_interaction] [CRITICAL] [~10-20 mins]`n"
Write-Host "  STEPS:" -ForegroundColor Green
Write-Host "    1. Double-click 'GTA V Enhanced' desktop shortcut" -ForegroundColor White
Write-Host "    2. 'Compiling Shaders...' appears - DO NOT INTERRUPT! (10-20 min on HDD)" -ForegroundColor Red
Write-Host "    3. May appear to hang at certain % - WAIT PATIENTLY" -ForegroundColor Yellow
Write-Host "    4. Game reaches main menu after compilation" -ForegroundColor White
Write-Host "  ✅ VERIFY: Game reaches main menu" -ForegroundColor Green

Write-Host "`n─── TASK 6.2: GTX 1660 SUPER Optimized Settings ───" -ForegroundColor Yellow
Write-Host "  [user_interaction] [HIGH] [~15-20 mins]`n"
Write-Host "  Settings to apply (1080p/60Hz/GTX 1660 SUPER 6GB):" -ForegroundColor Green
Write-Host "    Screen: Fullscreen 1920x1080 @ 60Hz" -ForegroundColor White
Write-Host "    FXAA: ON | MSAA: OFF | TXAA: OFF | VSync: ON" -ForegroundColor White
Write-Host "    Population Density: 70% | Population Variety: 70%" -ForegroundColor White
Write-Host "    Distance Scaling: 0% (huge VRAM saving - minimal visual diff)" -ForegroundColor Yellow
Write-Host "    Texture Quality: HIGH (NOT Very High - 6GB VRAM limit)" -ForegroundColor Yellow
Write-Host "    Shader: HIGH | Shadow: HIGH | Reflection: HIGH | Water: HIGH" -ForegroundColor White
Write-Host "    Particles: HIGH | Grass: HIGH (NOT Ultra - GTX 16 flicker bug!)" -ForegroundColor Yellow
Write-Host "    Post FX: HIGH | Motion Blur: 0% | Depth of Field: ON" -ForegroundColor White
Write-Host "    Anisotropic: x16 | Ambient Occlusion: HIGH | Tessellation: HIGH" -ForegroundColor White
Write-Host "    Long Shadows: ON | High Res Shadows: OFF" -ForegroundColor White
Write-Host "    Extended Distance: 0% | Extended Shadow Dist: 0%" -ForegroundColor White

Write-Host "`n─── TASK 6.3: Enable FSR 3.1 Upscaling ───" -ForegroundColor Yellow
Write-Host "  [user_interaction] [HIGH] [~5 mins]`n"
Write-Host "  (GTX 1660 SUPER has NO DLSS - must use FSR 3.1)" -ForegroundColor Red
Write-Host "  SETTINGS:" -ForegroundColor Green
Write-Host "    Upscaling Type: 'AMD FSR 3.1' or 'FSR 3'" -ForegroundColor White
Write-Host "    Upscaling Mode: 'Quality' (renders 1440p → outputs 1080p)" -ForegroundColor White
Write-Host "    Sharpness: 0.50-0.70 (adjust to preference)" -ForegroundColor White
Write-Host "    If FPS < 45: switch to 'Balanced' mode" -ForegroundColor Yellow

Write-Host "`n─── TASK 6.5: Run Benchmark ───" -ForegroundColor Yellow
Write-Host "  [user_interaction] [HIGH] [~5-7 mins]`n"
Write-Host "  EXPECTED RESULTS:" -ForegroundColor Green
Write-Host "    Scene 1 (Grass): 40-55 FPS | Scene 2 (City): 50-65 FPS" -ForegroundColor White
Write-Host "    Scene 3 (Desert): 55-70 FPS | Scene 4 (Airport): 50-60 FPS" -ForegroundColor White
Write-Host "    Scene 5 (High-rises): 45-60 FPS | Overall AVG: 45-60 FPS" -ForegroundColor White
Write-Host "  PASS CRITERIA: Avg >= 45 FPS, Min >= 30 FPS, 0 crashes" -ForegroundColor Yellow

# =====================================================================
# PHASE 7: UPDATE TO v1013.33
# =====================================================================
Write-Host "`n`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host " PHASE 7: 🔄 UPDATE TO v1013.33 (GTX 16 SERIES FIXES)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n─── TASK 7.1: Check Current Version ───" -ForegroundColor Yellow
Write-Host "  [terminal_auto] [MEDIUM] [~2 mins]`n"
Write-Host "  EXACT CMD:" -ForegroundColor Green
Write-Host "    (Get-Item 'D:\GAMES\GTA_V\GTA5_Enhanced.exe').VersionInfo.FileVersion" -ForegroundColor White
Write-Host "    → If 1013.33: SKIP Phase 7 entirely!" -ForegroundColor Gray

Write-Host "`n─── TASK 7.2: Backup Before Update ───" -ForegroundColor Yellow
Write-Host "  [terminal_auto] [CRITICAL] [~10 mins]`n"
Write-Host "  EXACT CMD:" -ForegroundColor Green
Write-Host "    Copy-Item 'D:\GAMES\GTA_V\GTA5_Enhanced.exe' 'D:\GAMES\GTA_V\_UpdateBackup\' -Force" -ForegroundColor White
Write-Host "    Copy-Item 'D:\GAMES\GTA_V\*.dll' 'D:\GAMES\GTA_V\_UpdateBackup\' -Force" -ForegroundColor White
Write-Host "    Copy-Item 'D:\GAMES\GTA_V\*.ini' 'D:\GAMES\GTA_V\_UpdateBackup\' -Force" -ForegroundColor White
Write-Host "    # Backup x64 file hashes:" -ForegroundColor Yellow
Write-Host "    Get-ChildItem 'D:\GAMES\GTA_V\x64' -Recurse | Get-FileHash -Algorithm MD5 | Export-Csv 'D:\GAMES\GTA_V\_UpdateBackup\x64_hashes.csv'" -ForegroundColor White
Write-Host "  ✅ VERIFY: All files in _UpdateBackup" -ForegroundColor Green

Write-Host "`n─── TASK 7.6: Verify Update Applied ───" -ForegroundColor Yellow
Write-Host "  [terminal_auto] [MEDIUM] [~2 mins]`n"
Write-Host "  EXACT CMD:" -ForegroundColor Green
Write-Host "    (Get-Item 'D:\GAMES\GTA_V\GTA5_Enhanced.exe').VersionInfo.FileVersion → Expect: 1013.33" -ForegroundColor White
Write-Host "  ✅ VERIFY: Version = 1013.33" -ForegroundColor Green

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " ✅ PHASES 4-7 COMPLETE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
