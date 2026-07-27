import type { DriveInfo, FolderInfo, ScanProgress, ScanResult } from '../types';

type ProgressCb = (p: ScanProgress) => void;

export class PcScanner {
  private aborted = false;

  abort() { this.aborted = true; }

  async scanTopFolders(onProgress: ProgressCb): Promise<ScanResult | null> {
    this.aborted = false;
    const drives: DriveInfo[] = [];
    const folders: FolderInfo[] = [];
    let totalFiles = 0;
    let totalFolders = 0;

    onProgress({ status: 'scanning', currentPath: 'Starting...', filesFound: 0, foldersFound: 0, percent: 0, stage: 'Initializing scan...' });

    try {
      // Get drives via wmic
      const drivesRaw = await this.exec('wmic logicaldisk get caption,volumename,size,freespace /format:csv');
      const driveLines = drivesRaw.split('\n').filter(l => /^[A-Z]:/.test(l.trim()));
      const driveLetters = driveLines.map(l => l.trim().split(',')[0]?.trim()).filter(Boolean);

      for (let di = 0; di < driveLetters.length; di++) {
        if (this.aborted) return null;
        const letter = driveLetters[di];
        onProgress({
          status: 'scanning', currentPath: `Drive ${letter}`, filesFound: totalFiles, foldersFound: totalFolders,
          percent: Math.round((di / driveLetters.length) * 50), stage: `Scanning drive ${letter}...`,
        });

        // Get drive info
        const captionMatch = drivesRaw.match(new RegExp(`${letter},([^,]*),`));
        const label = captionMatch?.[1]?.trim() || 'Local Disk';
        drives.push({ letter, label, totalSize: '--', freeSpace: '--', folders: 0, files: 0 });

        // List top folders (depth 1)
        const dirsRaw = await this.exec(`cmd /c dir "${letter}\\" /b /ad 2>nul`);
        const dirNames = dirsRaw.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 50);

        for (let fi = 0; fi < dirNames.length; fi++) {
          if (this.aborted) return null;
          const dirName = dirNames[fi];
          const fullPath = `${letter}\\${dirName}`;

          onProgress({
            status: 'scanning', currentPath: fullPath, filesFound: totalFiles, foldersFound: totalFolders,
            percent: 50 + Math.round((fi / dirNames.length) * 40),
            stage: `Scanning ${dirName}...`,
          });

          try {
            const countRaw = await this.exec(`cmd /c dir "${fullPath}" /s /a-d 2>nul | find "File(s)"`);
            const fileCount = this.parseFileCount(countRaw);
            const folderCount = 0; // simplified for speed

            totalFiles += fileCount;
            totalFolders += folderCount;

            folders.push({
              path: fullPath,
              name: dirName,
              files: fileCount,
              folders: folderCount,
              sizeHint: fileCount > 1000 ? 'large' : fileCount > 100 ? 'medium' : 'small',
            });
          } catch {}
        }
      }

      onProgress({
        status: 'complete', currentPath: '', filesFound: totalFiles, foldersFound: totalFolders,
        percent: 100, stage: 'Scan complete!',
      });

      return {
        drives,
        topFolders: folders.slice(0, 200),
        totalFiles,
        totalFolders,
        scannedAt: Date.now(),
      };
    } catch (err: any) {
      onProgress({ status: 'error', currentPath: '', filesFound: totalFiles, foldersFound: totalFolders, percent: 0, stage: 'Error', error: err.message });
      return null;
    }
  }

  private async exec(cmd: string): Promise<string> {
    // Use the browser's available APIs or fallback
    try {
      const res = await fetch('/api/zoya/exec', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cmd }),
      });
      if (res.ok) return await res.text();
    } catch {}
    return '';
  }

  private parseFileCount(raw: string): number {
    const match = raw.match(/(\d+)\s+File\(s\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async saveScanResult(result: ScanResult) {
    try {
      await fetch('/api/zoya/scan-result', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(result),
      });
    } catch {}
  }
}

export const pcScanner = new PcScanner();
