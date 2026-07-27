import { Button, Empty, Input, List, Tag, Typography } from '@arco-design/web-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BookmarkedLink } from './types';

const STORAGE_KEY = 'zoya.link_bookmarks';

function loadBookmarks(): BookmarkedLink[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}

function saveBookmarks(bookmarks: BookmarkedLink[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)); } catch {}
}

export function bookmarkLink(url: string, title: string, description = ''): BookmarkedLink {
  const bookmarks = loadBookmarks();
  const existing = bookmarks.find((b) => b.url === url);
  if (existing) return existing;
  const bm: BookmarkedLink = { id: Date.now().toString(36), url, title: title || url, description, tags: [], addedAt: Date.now() };
  bookmarks.push(bm);
  saveBookmarks(bookmarks);
  return bm;
}

interface Props {
  onSelect?: (link: BookmarkedLink) => void;
}

const BookmarkLinks: React.FC<Props> = ({ onSelect }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkedLink[]>([]);
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setBookmarks(loadBookmarks()); }, []);

  const refresh = useCallback(() => setBookmarks(loadBookmarks()), []);

  const addTag = (id: string) => {
    if (!tagInput.trim()) return;
    setBookmarks((prev) => {
      const next = prev.map((b) => b.id === id && !b.tags.includes(tagInput.trim()) ? { ...b, tags: [...b.tags, tagInput.trim()] } : b);
      saveBookmarks(next);
      return next;
    });
    setTagInput('');
  };

  const removeTag = (id: string, tag: string) => {
    setBookmarks((prev) => {
      const next = prev.map((b) => b.id === id ? { ...b, tags: b.tags.filter((t) => t !== tag) } : b);
      saveBookmarks(next);
      return next;
    });
  };

  const removeBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      saveBookmarks(next);
      return next;
    });
  };

  const filtered = filter ? bookmarks.filter((b) => b.title.toLowerCase().includes(filter.toLowerCase()) || b.tags.some((t) => t.includes(filter))) : bookmarks;

  if (bookmarks.length === 0) return <Empty description='No bookmarks yet' />;

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Input.Search placeholder='Search bookmarks...' value={filter} onChange={setFilter} size='mini' />
      </div>
      <List size='small' dataSource={filtered} render={(item: BookmarkedLink) => (
        <List.Item
          key={item.id}
          extra={<Button type='text' size='mini' onClick={() => removeBookmark(item.id)}>✕</Button>}
          style={{ cursor: onSelect ? 'pointer' : undefined }}
          onClick={() => onSelect?.(item)}
        >
          <div>
            <a href={item.url} target='_blank' rel='noreferrer' style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-link)', wordBreak: 'break-all' }}>
              {item.title || item.url}
            </a>
            {item.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.description}</div>}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
              {item.tags.map((t) => <Tag key={t} closable size='small' onClose={() => removeTag(item.id, t)}>{t}</Tag>)}
              {editingId === item.id && (
                <Input size='mini' placeholder='+tag' value={tagInput} onChange={setTagInput} onPressEnter={() => addTag(item.id)} ref={tagInputRef} style={{ width: 80 }} />
              )}
              <Button type='text' size='mini' onClick={() => { setEditingId(editingId === item.id ? null : item.id); setTagInput(''); }}>
                {editingId === item.id ? 'Done' : '+Tag'}
              </Button>
            </div>
          </div>
        </List.Item>
      )} />
    </div>
  );
};

export { BookmarkLinks, loadBookmarks, saveBookmarks };
