import { Progress, Tag, Typography } from '@arco-design/web-react';
import React from 'react';
import type { ScanProgress as ScanProgressType } from '../types';

interface Props {
  progress: ScanProgressType;
}

const ScanProgress: React.FC<Props> = ({ progress }) => {
  if (progress.status === 'idle') return null;

  return (
    <div style={{ padding: 16, borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Typography.Text style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
          {progress.status === 'scanning' ? '🔍 Scanning PC...' : progress.status === 'complete' ? '✅ Scan Complete!' : progress.status === 'error' ? '❌ Scan Error' : ''}
        </Typography.Text>
        <Tag color={progress.status === 'scanning' ? 'blue' : progress.status === 'complete' ? 'green' : 'red'}>
          {progress.status}
        </Tag>
      </div>

      <Progress percent={progress.percent} style={{ marginBottom: 12 }} />

      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        <div><strong>Stage:</strong> {progress.stage}</div>
        <div><strong>Current:</strong> {progress.currentPath || '—'}</div>
        <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
          <span>📁 {progress.foldersFound.toLocaleString()} folders</span>
          <span>📄 {progress.filesFound.toLocaleString()} files</span>
        </div>
      </div>

      {progress.error && (
        <Typography.Text type='danger' style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          {progress.error}
        </Typography.Text>
      )}
    </div>
  );
};

export default ScanProgress;
