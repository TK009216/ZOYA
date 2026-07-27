import { Modal } from '@arco-design/web-react';
import React from 'react';
import AudioPlayer from './AudioPlayer';
import CodeViewer from './CodeViewer';
import ImageViewer from './ImageViewer';
import PDFViewer from './PDFViewer';
import VideoPlayer from './VideoPlayer';
import WebView from './WebView';
import YouTubeEmbed from './YouTubeEmbed';
import type { MediaViewerProps } from './types';

const RENDERER: Record<string, React.FC<MediaViewerProps>> = {
  image: ImageViewer, video: VideoPlayer, audio: AudioPlayer,
  pdf: PDFViewer, code: CodeViewer, youtube: YouTubeEmbed, website: WebView,
};

const TITLES: Record<string, string> = {
  image: 'Image Viewer', video: 'Video Player', audio: 'Audio Player',
  pdf: 'PDF Viewer', code: 'Code Viewer', youtube: 'YouTube', website: 'Website',
};

const MediaViewer: React.FC<MediaViewerProps & { visible: boolean }> = ({ visible, source, onClose }) => {
  const Renderer = RENDERER[source.type];

  if (!Renderer) return null;

  return (
    <Modal
      title={source.title ?? TITLES[source.type] ?? 'Media'}
      visible={visible}
      onCancel={onClose}
      footer={null}
      style={{ maxWidth: '95vw' }}
      alignCenter
    >
      <Renderer source={source} onClose={onClose} />
    </Modal>
  );
};

export default MediaViewer;
