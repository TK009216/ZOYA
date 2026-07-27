import React from 'react';
import type { MediaViewerProps } from './types';

function extractId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

const YouTubeEmbed: React.FC<MediaViewerProps> = ({ source }) => {
  const id = extractId(source.url);

  if (!id) {
    return <div style={{ padding: 20, color: 'var(--danger)', textAlign: 'center' }}>Invalid YouTube URL</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 720, aspectRatio: '16/9' }}>
      <iframe
        src={`https://www.youtube.com/embed/${id}?autoplay=0`}
        title={source.title ?? 'YouTube Video'}
        style={{ width: '100%', height: '100%', borderRadius: 8, border: '1px solid var(--border-base)' }}
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
      />
    </div>
  );
};

export default YouTubeEmbed;
