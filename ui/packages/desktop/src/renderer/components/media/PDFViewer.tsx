import React, { useState } from 'react';
import type { MediaViewerProps } from './types';

const PDFViewer: React.FC<MediaViewerProps> = ({ source }) => {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: '90vw' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} style={navBtn}>◀</button>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)} style={navBtn}>▶</button>
        <span style={{ width: 1, height: 20, background: 'var(--border-base)' }} />
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} style={navBtn}>−</button>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} style={navBtn}>+</button>
      </div>
      <iframe
        src={`${source.url}#page=${page}`}
        title={source.title ?? 'PDF'}
        style={{ width: '100%', height: '70vh', borderRadius: 8, border: '1px solid var(--border-base)', background: '#fff' }}
      />
    </div>
  );
};

const navBtn: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-base)',
  background: 'var(--bg-1)', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
};

export default PDFViewer;
