import { Tooltip, Dropdown, Menu } from '@arco-design/web-react';
import React from 'react';
import { draftManager } from './DraftManager';

interface Props {
  conversationId: string;
  onRestore: (text: string) => void;
  onClear: () => void;
}

const DraftIndicator: React.FC<Props> = ({ conversationId, onRestore, onClear }) => {
  const drafts = draftManager.getAllDrafts(conversationId);
  if (drafts.length === 0) return null;

  const dropList = (
    <Menu>
      {drafts.map((d, i) => (
        <Menu.Item key={i} onClick={() => onRestore(d)}>
          <div style={{ fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.slice(0, 80)}{d.length > 80 ? '...' : ''}
          </div>
        </Menu.Item>
      ))}
      <Menu.Item key='clear' onClick={onClear}>
        <span style={{ color: 'var(--danger)', fontSize: 12 }}>Clear drafts</span>
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown droplist={dropList} trigger='click' position='top'>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '2px 8px', borderRadius: 4, background: 'var(--zoya-bg, var(--bg-2))', fontSize: 11, color: 'var(--zoya-primary, var(--text-secondary))' }}>
        <span>📝</span>
        <span>{drafts.length} draft{drafts.length > 1 ? 's' : ''}</span>
      </div>
    </Dropdown>
  );
};

export default DraftIndicator;
