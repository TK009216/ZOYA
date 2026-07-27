import React, { useRef, useState } from 'react';
import type { MediaViewerProps } from './types';

const AudioPlayer: React.FC<MediaViewerProps> = ({ source }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={{ padding: 16, borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-1)', minWidth: 300, maxWidth: 500 }}>
      <audio
        ref={audioRef}
        src={source.url}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onEnded={() => setPlaying(false)}
      />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{source.title ?? 'Audio'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => { if (!audioRef.current) return; playing ? audioRef.current.pause() : audioRef.current.play(); setPlaying(!playing); }} style={playBtn}>
          {playing ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg-3)', position: 'relative', cursor: 'pointer' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            if (audioRef.current) { audioRef.current.currentTime = pct * duration; }
          }}
        >
          <div style={{ height: '100%', width: `${duration ? (current / duration) * 100 : 0}%`, borderRadius: 2, background: 'var(--zoya-primary, var(--brand))', transition: 'width 0.1s' }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmt(current)} / {fmt(duration)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>🔊</span>
        <input type='range' min={0} max={1} step={0.05} value={volume}
          onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }}
          style={{ flex: 1, accentColor: 'var(--zoya-primary, var(--brand))' }}
        />
      </div>
    </div>
  );
};

const playBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--zoya-primary, var(--brand))',
  background: 'var(--bg-2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: 'var(--zoya-primary, var(--brand))',
};

export default AudioPlayer;
