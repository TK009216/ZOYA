export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'question' | 'mode_switch';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  sound?: boolean;
  persistent?: boolean;
  timestamp: number;
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
}

export interface NotificationState {
  queue: Notification[];
  history: Notification[];
  dnd: boolean;
  soundEnabled: boolean;
}
