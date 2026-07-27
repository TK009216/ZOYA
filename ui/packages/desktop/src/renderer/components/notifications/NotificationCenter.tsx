import { Modal, Button } from '@arco-design/web-react';
import React from 'react';
import type { Notification } from './types';

interface Props {
  visible: boolean;
  notification: Notification | null;
  onClose: () => void;
  onAction?: () => void;
}

const NotificationCenter: React.FC<Props> = ({ visible, notification, onClose, onAction }) => {
  if (!notification) return null;

  return (
    <Modal
      title={notification.title}
      visible={visible}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {notification.action && (
            <Button type='primary' onClick={() => { onAction?.(); onClose(); }}>
              {notification.action.label}
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </div>
      }
      style={{ maxWidth: 500 }}
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{notification.message}</p>
    </Modal>
  );
};

export default NotificationCenter;
