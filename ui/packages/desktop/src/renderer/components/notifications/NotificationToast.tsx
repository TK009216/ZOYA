import { Trigger } from '@arco-design/web-react';
import { CheckOne, CloseOne, Caution, Info, Help, Refresh } from '@icon-park/react';
import React, { useEffect, useState } from 'react';
import type { Notification } from './types';

const ICON_MAP: Record<string, React.FC> = {
  success: CheckOne, error: CloseOne, warning: Caution, info: Info, question: Help, mode_switch: Refresh,
};

const COLOR_MAP: Record<string, string> = {
  success: '#2ecc71', error: '#e74c3c', warning: '#f39c12', info: '#2196f3', question: '#9c27b0', mode_switch: 'var(--zoya-primary, #2196f3)',
};

interface Props {
  notification: Notification;
  onClose: (id: string) => void;
}

const NotificationToast: React.FC<Props> = ({ notification, onClose }) => {
  const [exiting, setExiting] = useState(false);
  const Icon = ICON_MAP[notification.type];

  useEffect(() => {
    if (notification.persistent) return;
    const dur = notification.duration ?? (notification.type === 'error' ? 5000 : 3000);
    const timer = setTimeout(() => { setExiting(true); setTimeout(() => onClose(notification.id), 300); }, dur);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  return (
    <div
      onClick={() => { setExiting(true); setTimeout(() => onClose(notification.id), 300); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderRadius: 8, background: 'var(--bg-2, #1a1a2e)', border: `1px solid ${COLOR_MAP[notification.type]}`,
        boxShadow: `0 4px 12px ${COLOR_MAP[notification.type]}33, var(--zoya-glow-subtle, none)`,
        minWidth: 280, maxWidth: 420, cursor: 'pointer',
        opacity: exiting ? 0 : 1, transform: exiting ? 'translateX(100%)' : 'translateX(0)',
        transition: 'all 0.3s ease',
      }}
    >
      {Icon && <Icon style={{ color: COLOR_MAP[notification.type], fontSize: 20, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{notification.title}</div>
        {notification.message && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{notification.message}</div>}
      </div>
      {notification.action && (
        <Trigger trigger='click' popup={() => <div style={{ padding: 8 }}>{notification.action!.label}</div>}>
          <button style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-base)', background: 'var(--bg-1)', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)' }}>
            {notification.action.label}
          </button>
        </Trigger>
      )}
    </div>
  );
};

export default NotificationToast;
