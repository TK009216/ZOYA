export type MediaType = 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'youtube' | 'website';

export interface MediaSource {
  type: MediaType;
  url?: string;
  src?: string;
  content?: string;
  language?: string;
  title?: string;
  poster?: string;
}

export interface MediaViewerProps {
  source: MediaSource;
  onClose?: () => void;
  fullscreen?: boolean;
}
