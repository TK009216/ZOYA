import { useCallback, useContext } from 'react';
import { NotificationContext } from './NotificationProvider';
import type { NotificationType } from './types';

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');

  const notify = useCallback((type: NotificationType, title: string, message?: string, opts?: {
    duration?: number; persistent?: boolean; sound?: boolean; action?: { label: string; onClick: () => void };
  }) => {
    ctx.add({ type, title, message, ...opts });
  }, [ctx]);

  return {
    success: (title: string, msg?: string) => notify('success', title, msg),
    error: (title: string, msg?: string) => notify('error', title, msg, { duration: 5000, sound: true }),
    warning: (title: string, msg?: string) => notify('warning', title, msg, { duration: 5000 }),
    info: (title: string, msg?: string) => notify('info', title, msg),
    question: (title: string, msg?: string, action?: { label: string; onClick: () => void }) => notify('question', title, msg, { persistent: true, action }),
    modeSwitch: (mode: string) => notify('mode_switch', `Switched to ${mode} mode`, undefined, { duration: 2000 }),
    notify,
    ...ctx,
  };
}
