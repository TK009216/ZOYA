import { Button, Modal, Collapse, Tag, Typography } from '@arco-design/web-react';
import React from 'react';
import type { Notification } from './types';

const TYPE_COLORS: Record<string, string> = {
  success: 'green', error: 'red', warning: 'orange', info: 'blue', question: 'purple', mode_switch: 'cyan',
};

interface Props {
  visible: boolean;
  history: Notification[];
  onClose: () => void;
  onClear: () => void;
}

const NotificationHistory: React.FC<Props> = ({ visible, history, onClose, onClear }) => {
  const byDate = history.reduce<Record<string, Notification[]>>((acc, n) => {
    const d = new Date(n.timestamp).toLocaleDateString();
    (acc[d] ??= []).push(n);
    return acc;
  }, {});

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>Notification History</span>
          <Tag>{history.length} total</Tag>
        </div>
      }
      visible={visible}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <Button status='danger' onClick={onClear}>Clear All</Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      }
      style={{ maxWidth: 600, maxHeight: '70vh' }}
    >
      {history.length === 0 ? (
        <Typography.Text type='secondary'>No notifications yet.</Typography.Text>
      ) : (
        <Collapse defaultActiveKey={Object.keys(byDate).slice(0, 1)}>
          {Object.entries(byDate).map(([date, notes]) => (
            <Collapse.Item key={date} name={date} header={<strong>{date} ({notes.length})</strong>}>
              {notes.map((n) => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <Tag color={TYPE_COLORS[n.type]} size='small'>{n.type}</Tag>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{n.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </Collapse.Item>
          ))}
        </Collapse>
      )}
    </Modal>
  );
};

export default NotificationHistory;
