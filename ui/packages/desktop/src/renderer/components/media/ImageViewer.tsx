import React, { useState } from 'react';
import type { MediaViewerProps } from './types';

const ImageViewer: React.FC<MediaViewerProps> = ({ source, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} style={btnStyle}>−</button>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '0 8px', alignSelf: 'center' }>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))} style={btnStyle}>+</button>
        <button onClick={() => setRotation((r) => r - 90)} style={btnStyle}>↺</button>
        <button onClick={() => setRotation((r) => r + 90)} style={btnStyle}>↻</button>
        <button onClick={() => setFullscreen(!fullscreen)} style={btnStyle}>{fullscreen ? '⛶' : '⤢'}</button>
      </div>
      <div style={{ overflow: 'auto', maxWidth: '90vw', maxHeight: '70vh', cursor: 'grab' }}>
        <img
          src={source.url}
          alt={source.title ?? ''}
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: 'transform 0.2s', maxWidth: '100%' }}
        />
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-base)',
  background: 'var(--bg-1)', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)',
  lineHeight: 1.4,
};

export default ImageViewer;
