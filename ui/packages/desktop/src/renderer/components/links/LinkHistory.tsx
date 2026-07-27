import { Button, Empty, List, Typography } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import type { LinkHistoryEntry } from './types';

const STORAGE_KEY = 'zoya.link_history';

function loadHistory(): LinkHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveHistory(entries: LinkHistoryEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 100))); } catch {}
}

export function addLinkToHistory(url: string, title: string) {
  const entries = loadHistory();
  const idx = entries.findIndex((e) => e.url === url);
  if (idx >= 0) entries.splice(idx, 1);
  entries.unshift({ url, title: title || url, visitedAt: Date.now(), pinned: false });
  saveHistory(entries);
}

interface Props {
  maxItems?: number;
}

const LinkHistory: React.FC<Props> = ({ maxItems = 20 }) => {
  const [entries, setEntries] = useState<LinkHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory().slice(0, maxItems));
  }, [maxItems]);

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setEntries([]);
  };

  const togglePin = (url: string) => {
    const updated = entries.map((e) => e.url === url ? { ...e, pinned: !e.pinned } : e);
    saveHistory(updated);
    setEntries(updated);
  };

  const removeEntry = (url: string) => {
    const updated = entries.filter((e) => e.url !== url);
    saveHistory(updated);
    setEntries(updated);
  };

  if (entries.length === 0) return <Empty description='No links yet' />;

  const sorted = [...entries].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.visitedAt - a.visitedAt);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Typography.Text style={{ fontWeight: 600 }}>Link History</Typography.Text>
        <Button type='text' size='mini' onClick={handleClear}>Clear</Button>
      </div>
      <List size='small' dataSource={sorted} render={(item: LinkHistoryEntry) => (
        <List.Item
          key={item.url}
          extra={(
            <div style={{ display: 'flex', gap: 4 }}>
              <Button type='text' size='mini' onClick={() => togglePin(item.url)}>
                {item.pinned ? '📌' : '📍'}
              </Button>
              <Button type='text' size='mini' onClick={() => removeEntry(item.url)}>✕</Button>
            </div>
          )}
        >
          <a href={item.url} target='_blank' rel='noreferrer' style={{ fontSize: 13, color: 'var(--text-link)', wordBreak: 'break-all' }}>
            {item.title || item.url}
          </a>
        </List.Item>
      )} />
    </div>
  );
};

export default LinkHistory;
