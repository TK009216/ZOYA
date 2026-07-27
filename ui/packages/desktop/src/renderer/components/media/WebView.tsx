import React, { useState } from 'react';
import type { MediaViewerProps } from './types';

const WebView: React.FC<MediaViewerProps> = ({ source }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-base)', maxWidth: '90vw' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-2)', fontSize: 12, color: 'var(--text-secondary)' }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.url}</span>
        {loading && <span style={{ color: 'var(--zoya-primary)' }}>Loading...</span>}
        {error && <span style={{ color: 'var(--danger)' }}>Failed to load</span>}
      </div>
      {error ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-disabled)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌐</div>
          <div>Could not load this website. It may have blocked embedding.</div>
        </div>
      ) : (
        <iframe
          src={source.url}
          title={source.title ?? 'Website'}
          onLoad={() => setLoading(false)}
          onError={() => { setError(true); setLoading(false); }}
          style={{ width: '100%', height: '65vh', border: 'none', background: '#fff' }}
          sandbox='allow-scripts allow-same-origin'
        />
      )}
    </div>
  );
};

export default WebView;
