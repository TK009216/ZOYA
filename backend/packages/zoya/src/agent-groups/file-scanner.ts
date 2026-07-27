import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

interface ProjectInfo {
  path: string;
  type: string;
  files: number;
  lastModified: string;
}

interface ScanResult {
  projects: ProjectInfo[];
  totalFiles: number;
  projectTypes: string[];
}

const PROJECT_SIGNATURES: [string, string][] = [
  ['package.json', 'Node.js'],
  ['Cargo.toml', 'Rust'],
  ['pyproject.toml', 'Python'],
  ['requirements.txt', 'Python'],
  ['pom.xml', 'Java'],
  ['go.mod', 'Go'],
  ['Gemfile', 'Ruby'],
  ['Makefile', 'C/C++'],
  ['CMakeLists.txt', 'C/C++'],
  ['composer.json', 'PHP'],
  ['index.html', 'Static'],
  ['docker-compose.yml', 'Docker'],
  ['Dockerfile', 'Docker'],
  ['.gitlab-ci.yml', 'CI/CD'],
  ['vite.config.ts', 'Vite'],
  ['next.config.js', 'Next.js'],
  ['next.config.ts', 'Next.js'],
];

function detectProjectType(dir: string): string {
  for (const [file, type] of PROJECT_SIGNATURES) {
    if (fs.existsSync(path.join(dir, file))) return type;
  }
  return 'Unknown';
}

function scanDirectory(root: string, depth: number): ScanResult {
  const projects: ProjectInfo[] = [];
  const projectTypes = new Set<string>();

  function walk(dir: string, currentDepth: number) {
    if (currentDepth > depth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const subdirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== '.git');
      const files = entries.filter((e) => e.isFile());

      if (files.length > 0 || subdirs.length > 0) {
        const type = detectProjectType(dir);
        if (type !== 'Unknown' || (currentDepth > 0 && files.length > 3)) {
          projectTypes.add(type);
          let stat: fs.Stats | null = null;
          try { stat = fs.statSync(dir); } catch {}
          projects.push({
            path: dir,
            type,
            files: files.length,
            lastModified: stat ? new Date(stat.mtimeMs).toISOString().slice(0, 10) : '',
          });
        }
      }

      for (const d of subdirs) {
        walk(path.join(dir, d), currentDepth + 1);
      }
    } catch {}
  }

  walk(root, 0);
  return {
    projects: projects.slice(0, 500),
    totalFiles: projects.reduce((s, p) => s + p.files, 0),
    projectTypes: [...projectTypes],
  };
}

function getScanPaths(): string[] {
  const home = homedir();
  const paths: string[] = [];
  // Common project directories
  const candidates = [
    path.join(home, 'projects'),
    path.join(home, 'Projects'),
    path.join(home, 'source'),
    path.join(home, 'repos'),
    path.join(home, 'code'),
    path.join(home, 'dev'),
    path.join(home, '.config', 'zoya', 'projects'),
    process.cwd(),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) paths.push(p);
  }
  return paths;
}

function saveScanResult(result: ScanResult): void {
  const configDir = path.join(homedir(), '.config', 'zoya');
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'scan-projects.json'), JSON.stringify(result, null, 2), 'utf-8');
  fs.writeFileSync(path.join(configDir, 'scan-status.json'), JSON.stringify({ active: false, currentPath: '', filesIndexed: result.totalFiles, totalFiles: result.totalFiles, percent: 100, stage: 'Complete', projectTypes: result.projectTypes }), 'utf-8');
}

function runScan() {
  const configDir = path.join(homedir(), '.config', 'zoya');
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'scan-status.json'), JSON.stringify({ active: true, currentPath: 'Scanning...', filesIndexed: 0, totalFiles: 0, percent: 0, stage: 'Scanning directories', projectTypes: [] }), 'utf-8');

  try {
    const scanPaths = getScanPaths();
    let allResults: ScanResult = { projects: [], totalFiles: 0, projectTypes: [] };
    for (const sp of scanPaths) {
      const result = scanDirectory(sp, 3);
      allResults.projects.push(...result.projects);
      allResults.totalFiles += result.totalFiles;
      for (const t of result.projectTypes) {
        if (!allResults.projectTypes.includes(t)) allResults.projectTypes.push(t);
      }
    }
    saveScanResult(allResults);
  } catch (err) {
    fs.writeFileSync(path.join(configDir, 'scan-status.json'), JSON.stringify({ active: false, currentPath: '', filesIndexed: 0, totalFiles: 0, percent: 0, stage: 'Error: ' + String(err), projectTypes: [] }), 'utf-8');
  }
}

if (require.main === module) {
  runScan();
}

export { scanDirectory, getScanPaths, saveScanResult, runScan };
export type { ProjectInfo, ScanResult };
