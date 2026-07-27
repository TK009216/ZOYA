import { Badge, Button, Card, List, Progress, Tag, Typography } from '@arco-design/web-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ScanStatus {
  active: boolean;
  currentPath: string;
  filesIndexed: number;
  totalFiles: number;
  percent: number;
  stage: string;
  projectTypes: string[];
}

interface ProjectInfo {
  path: string;
  type: string;
  files: number;
  lastModified: string;
}

const FileScannerPanel: React.FC = () => {
  const [status, setStatus] = useState<ScanStatus>({ active: false, currentPath: '', filesIndexed: 0, totalFiles: 0, percent: 0, stage: 'Idle', projectTypes: [] });
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/zoya/scan-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {}
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/zoya/scan-projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setStatus((prev) => ({ ...prev, totalFiles: data.totalFiles || 0, projectTypes: data.projectTypes || [] }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    pollStatus();
    fetchProjects();
  }, [pollStatus, fetchProjects]);

  const handleStartScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/zoya/start-scan', { method: 'POST' });
      if (res.ok) { setStatus((prev) => ({ ...prev, active: true })); pollStatus(); }
    } catch {}
    setScanning(false);
  };

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setAutoRefresh(false);
    } else {
      intervalRef.current = setInterval(() => { pollStatus(); fetchProjects(); }, 5000);
      setAutoRefresh(true);
    }
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <Card title='📂 File Scanner' style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button type='primary' loading={scanning} onClick={handleStartScan} disabled={status.active}>
            {status.active ? 'Scanning...' : '▶ Start Scan'}
          </Button>
          <Button onClick={toggleAutoRefresh}>
            {autoRefresh ? '⏹ Stop Auto-Refresh' : '🔄 Auto-Refresh'}
          </Button>
        </div>

        {status.active && (
          <div style={{ marginBottom: 12 }}>
            <Progress percent={status.percent} />
            <Typography.Text style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
              {status.stage} — {status.currentPath}
            </Typography.Text>
            <Typography.Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
              {status.filesIndexed.toLocaleString()} files indexed
            </Typography.Text>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <Badge count={projects.length}>
          <Tag color='blue'>Projects</Tag>
        </Badge>
        <Badge count={status.totalFiles}>
          <Tag color='green'>Files</Tag>
        </Badge>
        {status.projectTypes.map((t) => <Tag key={t}>{t}</Tag>)}
      </div>

      <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Discovered Projects</Typography.Text>
      {projects.length === 0 ? (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>No projects scanned yet. Start a scan above.</Typography.Text>
      ) : (
        <List
          size='small'
          dataSource={projects}
          render={(item: ProjectInfo) => (
            <List.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                  <Typography.Text style={{ fontSize: 13 }}>{item.path}</Typography.Text>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <Tag size='small' color='arcoblue'>{item.type}</Tag>
                    <Typography.Text style={{ fontSize: 10, color: 'var(--text-disabled)' }}>{item.files} files</Typography.Text>
                  </div>
                </div>
                <Typography.Text style={{ fontSize: 10, color: 'var(--text-disabled)' }}>{item.lastModified}</Typography.Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default FileScannerPanel;
