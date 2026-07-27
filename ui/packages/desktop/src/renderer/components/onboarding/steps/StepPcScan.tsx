import { Button, Typography, Alert } from '@arco-design/web-react';
import React, { useCallback, useState } from 'react';
import { pcScanner } from '../pcScan/PcScanner';
import ScanProgress from '../pcScan/ScanProgress';
import type { OnboardingState, ScanProgress as SP } from '../types';

interface Props {
  state: OnboardingState;
  onUpdate: (p: Partial<OnboardingState>) => void;
}

const StepPcScan: React.FC<Props> = ({ state, onUpdate }) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<SP>(state.scanProgress);

  const handleScan = useCallback(async () => {
    if (scanning) { pcScanner.abort(); return; }
    setScanning(true);
    const p: SP = { status: 'scanning', currentPath: '', filesFound: 0, foldersFound: 0, percent: 0, stage: 'Starting scan...' };
    setProgress(p);
    onUpdate({ scanProgress: p, scanCompleted: false });

    const result = await pcScanner.scanTopFolders((p2) => {
      setProgress({ ...p2 });
      onUpdate({ scanProgress: p2 });
    });

    if (result) {
      await pcScanner.saveScanResult(result);
      onUpdate({ scanCompleted: true, scanProgress: { ...progress, status: 'complete', percent: 100, stage: 'Scan complete!' } });
    }
    setScanning(false);
  }, [scanning, progress, onUpdate]);

  return (
    <div style={{ padding: '20px', maxWidth: 550, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 64 }}>🔍</div>
        <Typography.Title heading={4}>PC Scan</Typography.Title>
        <Typography.Text type='secondary' style={{ display: 'block', lineHeight: 1.6 }}>
          Database agent ko current PC ka structure chahiye — drives, folders, files.
          Yeh background mein save ho jayega taake baad mein ZOYA ko kuch bhi dhundhne mein aasani ho.
        </Typography.Text>
      </div>

      <ScanProgress progress={progress} />

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        {progress.status !== 'complete' ? (
          <Button type='primary' long size='large' loading={scanning} onClick={handleScan}>
            {scanning ? '🔍 Scanning... (click to stop)' : '🔍 Start PC Scan'}
          </Button>
        ) : (
          <Alert
            type='success'
            content={`✅ Scan complete! ${progress.filesFound.toLocaleString()} files found in ${progress.foldersFound.toLocaleString()} folders.`}
          />
        )}
        <Button type='text' size='small' style={{ marginTop: 8, color: 'var(--text-disabled)', fontSize: 12 }}
          onClick={() => onUpdate({ scanCompleted: true, scanProgress: { ...progress, status: 'complete', percent: 100, stage: 'Skipped' } })}>
          Skip — scan later
        </Button>
      </div>
    </div>
  );
};

export default StepPcScan;
