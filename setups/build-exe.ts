/**
 * ZOYA Self-Contained Package Builder
 *
 * Builds a portable ZIP with everything included:
 *   - Compiled backend (bundled bun binary + compiled JS)
 *   - Compiled UI SPA
 *   - AionCore binary
 *   - One-click install.bat
 *
 * Usage: bun run setups/build-exe.ts
 * Output: dist/ZOYA_PACKAGE_v{version}.zip
 */

import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { arch, homedir, platform, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const PKG = join(DIST, 'ZOYA_PACKAGE');

const pkgJson = JSON.parse(readFileSync(join(ROOT, 'backend', 'packages', 'zoya', 'package.json'), 'utf-8'));
const VERSION = pkgJson.version;

function log(msg: string) { console.log(`[build] ${msg}`); }
function run(cmd: string, cwd?: string) {
  execSync(cmd, { cwd: cwd || ROOT, stdio: 'inherit', shell: true });
}

// ──────────────────────────────────────
// STEP 1: Clean & create structure
// ──────────────────────────────────────
log('STEP 1: Creating package structure...');
if (existsSync(PKG)) execSync(`rmdir /s /q "${PKG}"`);
mkdirSync(join(PKG, 'backend'), { recursive: true });
mkdirSync(join(PKG, 'ui', 'out'), { recursive: true });
mkdirSync(join(PKG, 'runtime'), { recursive: true });

// ──────────────────────────────────────
// STEP 2: Find bun binary
// ──────────────────────────────────────
log('STEP 2: Locating bun binary...');
let bunPath = '';
try { bunPath = execSync('where bun', { encoding: 'utf-8' }).trim().split('\n')[0].trim(); } catch {}
if (!bunPath || !existsSync(bunPath)) {
  bunPath = join(process.env.USERPROFILE || homedir(), '.bun', 'bin', 'bun.exe');
}
if (!existsSync(bunPath)) {
  log('ERROR: bun binary not found. Install bun first: https://bun.sh');
  process.exit(1);
}
log(`  Found bun at: ${bunPath}`);

// ──────────────────────────────────────
// STEP 3: Build backend
// ──────────────────────────────────────
log('STEP 3: Building backend (compiled JS)...');
const BACKEND_SRC = join(ROOT, 'backend');
run('bun run build', join(BACKEND_SRC, 'packages', 'zoya'));

// Copy compiled output
const backendOut = join(BACKEND_SRC, 'packages', 'zoya', 'dist');
if (existsSync(backendOut)) {
  cpSync(backendOut, join(PKG, 'backend', 'dist'), { recursive: true });
} else {
  // Some builds output to .zoya/ or similar; try source as fallback
  log('  No dist/ found, bundling source instead');
  cpSync(join(BACKEND_SRC, 'packages', 'zoya', 'src'), join(PKG, 'backend', 'src'), { recursive: true, filter: (s: string) => !s.includes('node_modules') });
}

// Copy node_modules (bundled — only production deps)
// In a real build, we'd do bun install --production, but for self-contained:
run(`xcopy /E /I /Y /Q "${BACKEND_SRC}\\packages\\zoya\\node_modules" "${PKG}\\backend\\node_modules\\"`, BACKEND_SRC);

// Copy workspace packages needed at runtime
const WS_PKGS = ['core', 'llm', 'sdk', 'server', 'tui', 'plugin', 'script'];
for (const pkg of WS_PKGS) {
  const src = join(BACKEND_SRC, 'packages', pkg);
  if (existsSync(src)) {
    const dest = join(PKG, 'backend', 'packages', pkg);
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true, filter: (s: string) => !s.includes('node_modules') && !s.includes('dist') && !s.includes('.git') });
  }
}

// Copy backend workspace package.json and config files
copyFileSync(join(BACKEND_SRC, 'package.json'), join(PKG, 'backend', 'package.json'));
if (existsSync(join(BACKEND_SRC, 'bun.lock'))) copyFileSync(join(BACKEND_SRC, 'bun.lock'), join(PKG, 'backend', 'bun.lock'));

// ──────────────────────────────────────
// STEP 4: Build UI SPA
// ──────────────────────────────────────
log('STEP 4: Building UI SPA...');
const UI_SRC = join(ROOT, 'ui');
try {
  run('bun run webui:prod --no-build', UI_SRC);
} catch {
  log('  webui:prod failed, trying webui...');
  run('bun run webui --no-build', UI_SRC);
}

// Find the built SPA output
const possibleOuts = [
  join(UI_SRC, 'out', 'renderer'),
  join(UI_SRC, 'packages', 'web-host', 'out'),
  join(UI_SRC, 'dist'),
  join(UI_SRC, 'build'),
];
let spaFound = false;
for (const out of possibleOuts) {
  if (existsSync(out) && existsSync(join(out, 'index.html') || existsSync(join(out, 'index.htm')))) {
    cpSync(out, join(PKG, 'ui', 'out', 'renderer'), { recursive: true });
    spaFound = true;
    log(`  SPA bundled from: ${out}`);
    break;
  }
}
if (!spaFound) {
  log('  WARNING: SPA build output not found. Include the out/ directory manually.');
  if (existsSync(join(UI_SRC, 'out'))) {
    cpSync(join(UI_SRC, 'out'), join(PKG, 'ui', 'out'), { recursive: true });
  }
}

// Copy web-host source (for static-server.ts)
cpSync(join(UI_SRC, 'packages', 'web-host'), join(PKG, 'ui', 'packages', 'web-host'), { recursive: true, filter: (s: string) => !s.includes('node_modules') && !s.includes('dist') });
cpSync(join(UI_SRC, 'scripts'), join(PKG, 'ui', 'scripts'), { recursive: true });
copyFileSync(join(UI_SRC, 'package.json'), join(PKG, 'ui', 'package.json'));

// ──────────────────────────────────────
// STEP 5: Bundle runtime
// ──────────────────────────────────────
log('STEP 5: Bundling runtime...');
copyFileSync(bunPath, join(PKG, 'runtime', 'bun.exe'));

// Try to find aioncore.exe
const aioncorePaths = [
  join(ROOT, 'aioncore.exe'),
  join(ROOT, 'bin', 'aioncore.exe'),
  join(ROOT, 'ui', 'aioncore.exe'),
  join(ROOT, 'backend', 'aioncore.exe'),
  join(ROOT, 'node_modules', '.bin', 'aioncore.exe'),
];
let aioncoreFound = false;
for (const ap of aioncorePaths) {
  if (existsSync(ap)) {
    copyFileSync(ap, join(PKG, 'aioncore.exe'));
    aioncoreFound = true;
    log(`  AionCore bundled from: ${ap}`);
    break;
  }
}
if (!aioncoreFound) {
  log('  WARNING: aioncore.exe not found. You will need to place it manually.');
}

// ──────────────────────────────────────
// STEP 6: Create launchers
// ──────────────────────────────────────
log('STEP 6: Creating launcher scripts...');

// zoya.bat — main launcher
writeFileSync(join(PKG, 'zoya.bat'), `@echo off
chcp 65001 >nul
title ZOYA v${VERSION}
cd /d "%~dp0"

echo [ZOYA] ========================================
echo [ZOYA]   ZOYA v${VERSION}
echo [ZOYA] ========================================
echo.

:: Kill old
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":25809"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":25810"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

:: Start backend (ACP server)
echo [ZOYA] [1/3] Starting backend...
start /B "" "%~dp0runtime\\bun.exe" run "%~dp0backend\\dist\\index.js" acp --port 25810

:: Wait
echo [ZOYA] [2/3] Waiting for backend...
timeout /t 10 /nobreak >nul

:: Start WebUI
echo [ZOYA] [3/3] Starting WebUI...
cd /d "%~dp0ui"
"%~dp0runtime\\bun.exe" run scripts/webui.ts --no-build --open
if errorlevel 1 (
    "%~dp0runtime\\bun.exe" run scripts/webui.ts --open
)
pause
`);

// zoya-acp.bat — ACP server only (for AionCore)
writeFileSync(join(PKG, 'zoya-acp.bat'), `@echo off
chcp 65001 >nul
title ZOYA ACP Server v${VERSION}
"%~dp0runtime\\bun.exe" run "%~dp0backend\\dist\\index.js" acp --port 25810
`);

// install.bat — one-click install for the package
writeFileSync(join(PKG, 'install.bat'), `@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title ZOYA v${VERSION} — Package Install

pushd "%~dp0"
set "PKG_DIR=%CD%"
popd

echo ╔══════════════════════════════════════════════════╗
echo ║     ZOYA v${VERSION} — Portable Install          ║
echo ╚══════════════════════════════════════════════════╝
echo.
echo   Installing to: %PKG_DIR%
echo.

:: Desktop shortcut
if not exist "%USERPROFILE%\\Desktop\\ZOYA.lnk" (
    powershell -Command "
        $ws = New-Object -ComObject WScript.Shell;
        $s = $ws.CreateShortcut('%USERPROFILE%\\Desktop\\ZOYA.lnk');
        $s.TargetPath = '%PKG_DIR%\\zoya.bat';
        $s.WorkingDirectory = '%PKG_DIR%';
        $s.Description = 'ZOYA AI Agent v${VERSION}';
        $s.Save();
    " >nul 2>&1
    if !errorlevel! equ 0 ( echo [OK] Desktop shortcut created. ) else ( echo [..] Could not create shortcut. )
)

:: PATH
echo %PATH% | find /i "%PKG_DIR%" >nul 2>&1
if errorlevel 1 (
    for /f "skip=2 tokens=3*" %%a in ('reg query "HKCU\\Environment" /v PATH 2^>nul') do set "USER_PATH=%%a%%b"
    echo !USER_PATH! | find /i "%PKG_DIR%" >nul 2>&1
    if errorlevel 1 (
        setx PATH "%PKG_DIR%;!USER_PATH!" >nul 2>&1
        if !errorlevel! equ 0 ( echo [OK] Added to PATH. ) else ( echo [..] PATH update skipped. )
    )
)

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║     ZOYA v${VERSION} Ready!                       ║
echo ╚══════════════════════════════════════════════════╝
echo.
echo   Open a NEW terminal and type: zoya
echo   Or double-click: %PKG_DIR%\\zoya.bat
echo.
pause
`);

// ──────────────────────────────────────
// STEP 7: Create ZIP
// ──────────────────────────────────────
log('STEP 7: Creating distribution archive...');
mkdirSync(DIST, { recursive: true });
const ZIP_NAME = `ZOYA_PACKAGE_v${VERSION}.zip`;
const ZIP_PATH = join(DIST, ZIP_NAME);

// Remove old zip if exists
if (existsSync(ZIP_PATH)) execSync(`del /f /q "${ZIP_PATH}"`);

// Use PowerShell to create the zip
const zipCmd = `powershell -Command "
Add-Type -AssemblyName System.IO.Compression.FileSystem;
[System.IO.Compression.ZipFile]::CreateFromDirectory('${PKG}', '${ZIP_PATH}', 'Optimal', $false);
Write-Output 'ZIP created';
"`;
try {
  const result = execSync(zipCmd, { encoding: 'utf-8', stdio: 'pipe' });
  if (result.includes('ZIP')) log(`  ${ZIP_NAME} created at: ${ZIP_PATH}`);
} catch {
  // Fallback: try 7-zip or just leave the folder
  log(`  ZIP creation failed. Package folder is at: ${PKG}`);
  log('  You can manually zip it.');
}

// ──────────────────────────────────────
// DONE
// ──────────────────────────────────────
log('');
log('═══════════════════════════════════════');
log('  BUILD COMPLETE!');
log('═══════════════════════════════════════');
log('');
log(`  Output: ${ZIP_PATH}`);
log(`  Size: ${existsSync(ZIP_PATH) ? Math.round(readFileSync(ZIP_PATH).length / 1024 / 1024 * 10) / 10 + ' MB' : 'N/A'}`);
log('');
log('  Share the ZIP with anyone — no dependencies needed.');
log('  They just unzip and run install.bat (or zoya.bat directly).');
