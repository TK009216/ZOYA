import { Button, List, Message, Modal, Tag, Typography } from '@arco-design/web-react';
import React, { useCallback, useState } from 'react';

interface ForkNode {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: number;
  messageCount: number;
  active: boolean;
}

interface Props {
  conversationId: string;
  forks: ForkNode[];
  currentForkId: string;
  onSwitchFork: (forkId: string) => void;
  onCreateFork: (name: string) => Promise<string>;
  onDeleteFork: (forkId: string) => void;
}

const ConversationFork: React.FC<Props> = ({ conversationId, forks, currentForkId, onSwitchFork, onCreateFork, onDeleteFork }) => {
  const [forkName, setForkName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateFork = useCallback(async () => {
    if (!forkName.trim()) { Message.warning('Enter a name for this branch'); return; }
    setCreating(true);
    await onCreateFork(forkName.trim());
    setForkName('');
    setCreating(false);
    Message.success(`Branch "${forkName}" created`);
  }, [forkName, onCreateFork]);

  const tree = useCallback(() => {
    const map = new Map<string, ForkNode & { children: ForkNode[] }>();
    const roots: (ForkNode & { children: ForkNode[] })[] = [];
    for (const f of forks) {
      map.set(f.id, { ...f, children: [] });
    }
    for (const f of forks) {
      const node = map.get(f.id)!;
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }, [forks]);

  const renderNode = (node: ForkNode & { children: ForkNode[] }, depth: number = 0): React.ReactNode => {
    const isActive = node.id === currentForkId;
    return (
      <div key={node.id} style={{ marginLeft: depth * 20 }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6,
            background: isActive ? 'var(--bg-3)' : 'transparent', cursor: 'pointer',
            marginBottom: 4, border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
          }}
          onClick={() => onSwitchFork(node.id)}
        >
          <Tag color={isActive ? 'blue' : 'default'} size='small'>
            {node.active ? '●' : '○'} {node.name}
          </Tag>
          <Typography.Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
            {node.messageCount} msgs
          </Typography.Text>
          {!isActive && (
            <Button type='text' size='mini' style={{ marginLeft: 'auto' }}
              onClick={(e) => { e.stopPropagation(); Modal.confirm({ title: 'Delete branch?', okButtonProps: { status: 'danger' }, onOk: () => onDeleteFork(node.id) }); }}>
              ✕
            </Button>
          )}
        </div>
        {node.children.length > 0 && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ padding: 12 }}>
      <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 12 }}>🌿 Conversation Branches</Typography.Text>

      {tree().map((root) => renderNode(root))}

      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <input
          placeholder='New branch name...'
          value={forkName}
          onChange={(e) => setForkName(e.target.value)}
          style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-base)', background: 'var(--bg-1)', color: 'var(--text-primary)', fontSize: 12 }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFork(); }}
        />
        <Button size='mini' type='primary' loading={creating} onClick={handleCreateFork}>+ Branch</Button>
      </div>
    </div>
  );
};

export default ConversationFork;
