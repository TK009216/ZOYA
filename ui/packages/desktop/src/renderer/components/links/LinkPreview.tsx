import { Card, Skeleton, Typography } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import { openExternalUrl } from '@renderer/utils/platform';
import type { LinkPreviewData } from './types';

interface Props {
  url: string;
  onClose?: () => void;
}

function extractDomain(u: string): string {
  try { return new URL(u).hostname.replace('www.', ''); } catch { return u; }
}

function isInternalUrl(u: string): boolean {
  try {
    const host = new URL(u).hostname;
    const internal = ['127.0.0.1', 'localhost', '::1', '', '0.0.0.0'];
    return internal.includes(host) || host.endsWith('.local') || host.endsWith('.internal');
  } catch { return false; }
}

const LinkPreview: React.FC<Props> = ({ url, onClose }) => {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      setLoading(true);
      try {
        const res = await fetch('/api/zoya/link-preview', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setPreview(data);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    }
    fetchPreview();
    return () => { cancelled = true; };
  }, [url]);

  const handleOpen = () => openExternalUrl(url);

  if (loading) {
    return (
      <Card size='small' style={{ margin: '4px 0', maxWidth: 360 }}>
        <Skeleton text={{ rows: 2 }} animation />
      </Card>
    );
  }

  const internal = isInternalUrl(url);

  return (
    <Card
      size='small'
      hoverable
      style={{ margin: '4px 0', maxWidth: 360, cursor: 'pointer' }}
      onClick={handleOpen}
      bodyStyle={{ padding: 8 }}
    >
      {preview?.image && (
        <div style={{ width: '100%', height: 120, overflow: 'hidden', borderRadius: 4, marginBottom: 8, background: 'var(--bg-2)' }}>
          <img src={preview.image} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, lineClamp: 2 }}>
        {preview?.title || url}
      </div>
      {preview?.description && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, lineClamp: 2 }}>
          {preview.description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-disabled)' }}>
        {preview?.favicon && <img src={preview.favicon} alt='' style={{ width: 12, height: 12 }} />}
        <span>{preview?.siteName || extractDomain(url)}</span>
        {internal && <span style={{ background: 'var(--bg-3)', padding: '0 4px', borderRadius: 2 }}>internal</span>}
        <span style={{ marginLeft: 'auto', cursor: 'pointer', padding: '0 4px' }} onClick={(e) => { e.stopPropagation(); handleOpen(); }}>↗</span>
      </div>
    </Card>
  );
};

export { LinkPreview, isInternalUrl, extractDomain };
