/**
* ZOYA Self-Contained Package Builder
* Cross-platform: Windows, Linux, macOS
*/
import { execSync, spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from
'node:fs';
import { arch, homedir, platform, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const PKG = join(DIST, 'ZOYA_PACKAGE');
// Read version from backend package
let VERSION = '1.0.0';
try {
const pkgJson = JSON.parse(readFileSync(join(ROOT, 'backend', 'packages', 'zoya', 'package.json'),
'utf-8'));
VERSION = pkgJson.version || '1.0.0';
} catch {
console.log('[build] Could not read version, using default');
}
function log(msg: string) { console.log(`[build] ${msg}`); }
function run(cmd: string, cwd?: string) {
const result = spawnSync(cmd, { cwd: cwd || ROOT, stdio: 'inherit', shell: true });
if (result.status !== 0) {
throw new Error(`Command failed: ${cmd}`);
}
}
function safeRemove(dir: string) {
if (existsSync(dir)) {
rmSync(dir, { recursive: true, force: true });
}
}
function safeCopy(src: string, dest: string) {
if (!existsSync(src)) {
log(`WARNING: Source not found: ${src}`);
return;
}
cpSync(src, dest, { recursive: true, force: true });
}
// ============================================
// STEP 1: Clean & create structure
// ============================================
log('STEP 1: Creating package structure...');
safeRemove(PKG);
mkdirSync(join(PKG, 'backend'), { recursive: true });
mkdirSync(join(PKG, 'ui', 'out'), { recursive: true });
mkdirSync(join(PKG, 'runtime'), { recursive: true });
mkdirSync(join(PKG, 'logs'), { recursive: true });
mkdirSync(join(PKG, 'data'), { recursive: true });
// ============================================
// STEP 2: Find bun binary
// ============================================
log('STEP 2: Locating bun binary...');
let bunPath = '';
try {
const cmd = platform() === 'win32' ? 'where bun' : 'which bun';
bunPath = execSync(cmd, { encoding: 'utf-8' }).trim().split(/\r?\n/)[0].trim();
} catch {
// Fallback to common locations
const fallbacks = [
join(homedir(), '.bun', 'bin', platform() === 'win32' ? 'bun.exe' : 'bun'),
join(homedir(), '.local', 'share', 'bun', platform() === 'win32' ? 'bun.exe' : 'bun'),
];
for (const fb of fallbacks) {
if (existsSync(fb)) {
bunPath = fb;
break;
}
}
}
if (!bunPath || !existsSync(bunPath)) {
log('ERROR: bun binary not found. Install bun first: https://bun.sh');
process.exit(1);
}
log(`Found bun at: ${bunPath}`);
// ============================================
// STEP 3: Build backend
// ============================================
log('STEP 3: Building backend...');
const BACKEND_SRC = join(ROOT, 'backend');
try {
run('bun run build', join(BACKEND_SRC, 'packages', 'zoya'));
} catch (e) {
log('WARNING: Backend build failed. Will try to bundle source instead.');
}
// ============================================
// STEP 4: Build UI
// ============================================
log('STEP 4: Building UI...');
const UI_SRC = join(ROOT, 'ui');
try {
run('bun run package', UI_SRC);
} catch (e) {
log('ERROR: UI build failed. Cannot continue without UI.');
process.exit(1);
}
// ============================================
// STEP 5: Copy files to package
// ============================================
log('STEP 5: Copying files to package...');
// Copy backend source or dist
const backendDist = join(BACKEND_SRC, 'dist');
const backendSrc = join(BACKEND_SRC, 'packages', 'zoya');
if (existsSync(backendDist)) {
safeCopy(backendDist, join(PKG, 'backend', 'dist'));
} else {
safeCopy(backendSrc, join(PKG, 'backend', 'packages', 'zoya'));
}
// Copy UI output
const uiOut = join(UI_SRC, 'out');
if (existsSync(uiOut)) {
safeCopy(uiOut, join(PKG, 'ui', 'out'));
}
// Copy bun binary to runtime/
const bunName = platform() === 'win32' ? 'bun.exe' : 'bun';
copyFileSync(bunPath, join(PKG, 'runtime', bunName));
// Copy root config files
if (existsSync(join(ROOT, '.env.example'))) {
copyFileSync(join(ROOT, '.env.example'), join(PKG, '.env.example'));
}
// Copy launchers
if (platform() === 'win32') {
if (existsSync(join(ROOT, 'zoya.bat'))) {
copyFileSync(join(ROOT, 'zoya.bat'), join(PKG, 'zoya.bat'));
}
if (existsSync(join(ROOT, 'zoya-acp.bat'))) {
copyFileSync(join(ROOT, 'zoya-acp.bat'), join(PKG, 'zoya-acp.bat'));
}
} else {
if (existsSync(join(ROOT, 'zoya'))) {
copyFileSync(join(ROOT, 'zoya'), join(PKG, 'zoya'));
}
}
// ============================================
// STEP 6: Create package metadata
// ============================================
log('STEP 6: Creating package metadata...');
writeFileSync(join(PKG, 'VERSION'), VERSION, 'utf-8');
writeFileSync(join(PKG, 'README.txt'), `ZOYA AI Assistant v${VERSION}
Built: ${new Date().toISOString()}
Platform: ${platform()}-${arch()}
To run:
- Windows: Double-click zoya.bat
- Linux/Mac: Run ./zoya
See .env.example for configuration.
`, 'utf-8');
// ============================================
// STEP 7: Create archive
// ============================================
log('STEP 7: Creating archive...');
const archiveName = `ZOYA-v${VERSION}-${platform()}-${arch()}.zip`;
const archivePath = join(DIST, archiveName);
try {
if (platform() === 'win32') {
// Use PowerShell on Windows
const psCmd = `Add-Type -Assembly System.IO.Compression.FileSystem;
[System.IO.Compression.ZipFile]::CreateFromDirectory('${PKG.replace(/\//g, '\\')}',
'${archivePath.replace(/\//g, '\\')}')`;
execSync(psCmd, { shell: 'powershell.exe' });
} else {
// Use zip on Unix
execSync(`cd "${DIST}" && zip -r "${archiveName}" ZOYA_PACKAGE`, { stdio: 'inherit' });
}
log(`SUCCESS: Package created at ${archivePath}`);
} catch (e) {
log(`WARNING: Could not create archive. Package is available at: ${PKG}`);
}
log('Build complete!');
