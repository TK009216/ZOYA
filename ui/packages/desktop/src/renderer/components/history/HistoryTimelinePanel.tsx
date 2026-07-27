import { Typography } from '@arco-design/web-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatHistoryTimeline from './ChatHistoryTimeline';
import ConversationFork from './ConversationFork';

const HistoryTimelinePanel: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/conversations?limit=500');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || data.data || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const handleSelect = useCallback((id: string) => {
    navigate(`/conversation/${id}`);
  }, [navigate]);

  const handleDelete = useCallback(async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    } catch {}
  }, []);

  const handleStar = useCallback(async (id: string, starred: boolean) => {
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, extra: { ...c.extra, pinned: starred, pinned_at: starred ? Date.now() : undefined }, starred } : c));
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ extra: { pinned: starred, pinned_at: starred ? Date.now() : undefined }, merge_extra: true }),
      });
    } catch {}
  }, []);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid var(--border-base)' }}>
        <Typography.Title heading={4} style={{ margin: 0 }}>📜 Chat History Timeline</Typography.Title>
        <Typography.Text type='secondary' style={{ fontSize: 12, marginTop: 4, display: 'block', marginBottom: 8 }}>
          Search, filter, star, and export your conversations
        </Typography.Text>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatHistoryTimeline conversations={conversations} onSelect={handleSelect} onDelete={handleDelete} onStar={handleStar} />
      </div>
    </div>
  );
};

export default HistoryTimelinePanel;
