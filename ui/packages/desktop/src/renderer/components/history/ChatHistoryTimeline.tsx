import { Button, DatePicker, Empty, Input, List, Message, Modal, Select, Tag, Tooltip, Typography } from '@arco-design/web-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface HistoryEntry {
  id: string;
  name: string;
  mode: string;
  model: string;
  messageCount: number;
  createdAt: number;
  modifiedAt: number;
  starred: boolean;
  project: string;
  preview: string;
}

interface Props {
  conversations: any[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onStar: (id: string, starred: boolean) => void;
}

const ChatHistoryTimeline: React.FC<Props> = ({ conversations, onSelect, onDelete, onStar }) => {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[number, number] | null>(null);
  const [starredOnly, setStarredOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const entries: HistoryEntry[] = useMemo(() => {
    return (conversations || []).map((c: any) => ({
      id: c.id || '',
      name: c.name || 'Untitled',
      mode: c.extra?.session_mode || c.mode || 'pro',
      model: c.model?.id || c.current_model_id || '',
      messageCount: c.messageCount || 0,
      createdAt: c.created_at || 0,
      modifiedAt: c.modified_at || c.created_at || 0,
      starred: !!c.extra?.pinned || !!c.starred,
      project: c.extra?.workspace || '',
      preview: c.preview || c.name || '',
    }));
  }, [conversations]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.preview.toLowerCase().includes(search.toLowerCase())) return false;
      if (modeFilter.length && !modeFilter.includes(e.mode)) return false;
      if (starredOnly && !e.starred) return false;
      if (dateRange && (e.createdAt < dateRange[0] || e.createdAt > dateRange[1])) return false;
      return true;
    }).sort((a, b) => b.modifiedAt - a.modifiedAt);
  }, [entries, search, modeFilter, starredOnly, dateRange]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    Modal.confirm({
      title: `Delete ${selectedIds.size} conversations?`,
      content: 'This action cannot be undone.',
      okButtonProps: { status: 'danger' },
      onOk: () => { selectedIds.forEach((id) => onDelete(id)); setSelectedIds(new Set()); Message.success(`Deleted ${selectedIds.size} conversations`); },
    });
  };

  const handleExportJson = useCallback(async () => {
    const data = JSON.stringify(filtered, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `zoya-history-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const handleExportTxt = useCallback(async () => {
    const lines = filtered.map((e) => `[${new Date(e.modifiedAt).toLocaleDateString()}] ${e.name} (${e.mode}) — ${e.messageCount} messages`);
    const blob = new Blob([lines.join('\n\n---\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `zoya-history-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 172800000) return 'Yesterday';
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const modeColors: Record<string, string> = { fast: 'cyan', pro: 'blue', expert: 'orange' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filters */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-base)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input.Search placeholder='Search conversations...' value={search} onChange={setSearch} style={{ width: 200 }} size='mini' allowClear />
        <Select mode='multiple' placeholder='Mode' value={modeFilter} onChange={setModeFilter} size='mini' style={{ minWidth: 100 }}>
          <Select.Option value='fast'>⚡ Fast</Select.Option>
          <Select.Option value='pro'>🔧 Pro</Select.Option>
          <Select.Option value='expert'>🧠 Expert</Select.Option>
        </Select>
        <DatePicker.RangePicker
          size='mini'
          style={{ width: 200 }}
          onChange={(_, ds) => {
            if (ds && ds[0] && ds[1]) setDateRange([new Date(ds[0]).getTime(), new Date(ds[1]).getTime()]);
            else setDateRange(null);
          }}
        />
        <Button type={starredOnly ? 'primary' : 'outline'} size='mini' onClick={() => setStarredOnly(!starredOnly)}>⭐ Starred</Button>
        <div style={{ flex: 1 }} />
        <Button size='mini' onClick={handleExportJson}>📥 JSON</Button>
        <Button size='mini' onClick={handleExportTxt}>📥 TXT</Button>
        {selectedIds.size > 0 && (
          <Button size='mini' status='danger' onClick={handleBatchDelete}>🗑 Delete ({selectedIds.size})</Button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {filtered.length === 0 ? (
          <Empty description='No conversations match your filters' />
        ) : (
          <List size='small' dataSource={filtered} render={(item: HistoryEntry) => (
            <List.Item
              key={item.id}
              style={{ cursor: 'pointer', padding: '10px 16px' }}
              onClick={() => onSelect(item.id)}
              extra={(
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip content={item.starred ? 'Unstar' : 'Star'}>
                    <Button type='text' size='mini' onClick={() => { onStar(item.id, !item.starred); }}>
                      {item.starred ? '⭐' : '☆'}
                    </Button>
                  </Tooltip>
                  <Tooltip content='Delete'>
                    <Button type='text' size='mini' onClick={() => { Modal.confirm({ title: 'Delete?', content: `"${item.name}"`, okButtonProps: { status: 'danger' }, onOk: () => { onDelete(item.id); Message.success('Deleted'); } }); }}>
                      🗑
                    </Button>
                  </Tooltip>
                  <input type='checkbox' checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ marginLeft: 4 }} />
                </div>
              )}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={modeColors[item.mode] || 'default'} size='small'>{item.mode}</Tag>
                <Typography.Text style={{ fontWeight: 600, fontSize: 13 }} ellipsis>{item.name}</Typography.Text>
                <Typography.Text type='secondary' style={{ fontSize: 11 }}>{formatDate(item.modifiedAt)}</Typography.Text>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-disabled)', marginTop: 2 }}>
                <span>{item.messageCount} msgs</span>
                {item.model && <span>· {item.model}</span>}
                {item.project && <span>· 📁 {item.project}</span>}
              </div>
            </List.Item>
          )} />
        )}
      </div>

      {/* Stats footer */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-base)', fontSize: 11, color: 'var(--text-disabled)', display: 'flex', gap: 16 }}>
        <span>{entries.length} total</span>
        <span>{entries.filter((e) => e.starred).length} starred</span>
        <span>{filtered.length} shown</span>
      </div>
    </div>
  );
};

export default ChatHistoryTimeline;
