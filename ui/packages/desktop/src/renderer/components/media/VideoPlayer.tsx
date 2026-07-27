import React, { useRef, useState } from 'react';
import type { MediaViewerProps } from './types';

const VideoPlayer: React.FC<MediaViewerProps> = ({ source }) => {
  const vidRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const togglePlay = () => {
    if (!vidRef.current) return;
    if (playing) { vidRef.current.pause(); } else { vidRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div style={{ position: 'relative', maxWidth: '90vw' }}>
      <video
        ref={vidRef}
        src={source.url}
        poster={source.poster}
        onEnded={() => setPlaying(false)}
        style={{ width: '100%', maxHeight: '70vh', borderRadius: 8 }}
        controls={false}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 8, background: 'var(--bg-1)', borderRadius: '0 0 8px 8px' }}>
        <button onClick={togglePlay} style={ctrlBtn}>{playing ? '⏸' : '▶'}</button>
        <button onClick={() => setMuted(!muted)} style={ctrlBtn}>{muted ? '🔇' : '🔊'}</button>
        <button onClick={() => vidRef.current?.requestFullscreen()} style={ctrlBtn}>⛶</button>
      </div>
    </div>
  );
};

const ctrlBtn: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 4, border: '1px solid var(--border-base)',
  background: 'var(--bg-2)', cursor: 'pointer', fontSize: 16, color: 'var(--text-primary)',
};

export default VideoPlayer;
