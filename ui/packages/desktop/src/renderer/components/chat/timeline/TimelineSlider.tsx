import { Slider, Tooltip, Tag, Button, Dropdown, Menu } from '@arco-design/web-react';
import React, { useMemo, useState } from 'react';
import { undoRedoManager } from './UndoRedoManager';
import type { TimelineEvent, TimelineBranch } from './types';

interface Props {
  events: TimelineEvent[];
  branches: TimelineBranch[];
  activeBranch: string;
  onJump: (eventId: string) => void;
  onFork: (name: string) => void;
  onSwitchBranch: (branchId: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  message: 'var(--zoya-primary, var(--brand))',
  mode_change: '#ff9800', task: '#2ecc71', system: '#9c27b0',
};

const TYPE_ICONS: Record<string, string> = {
  message: '💬', mode_change: '🔄', task: '✅', system: '⚙',
};

const TimelineSlider: React.FC<Props> = ({ events, branches, activeBranch, onJump, onFork, onSwitchBranch }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const marks = useMemo(() => {
    const m: Record<number, { style: React.CSSProperties; label: string }> = {};
    events.forEach((evt, i) => {
      if (i % Math.max(1, Math.floor(events.length / 10)) === 0 || i === events.length - 1) {
        m[i] = { style: { color: TYPE_COLORS[evt.type], fontSize: 10 }, label: '●' };
      }
    });
    return m;
  }, [events]);

  return (
    <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-1)' }}>
      {/* Branch selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Tag>{branches.length} branch{branches.length > 1 ? 'es' : ''}</Tag>
        <Dropdown
          trigger='click'
          droplist={
            <Menu>
              {branches.map((b) => (
                <Menu.Item key={b.id} onClick={() => onSwitchBranch(b.id)}>
                  <span style={{ fontWeight: b.id === activeBranch ? 600 : 400 }}>
                    {b.id === activeBranch ? '▶ ' : ''}{b.name} ({b.events.length})
                  </span>
                </Menu.Item>
              ))}
              <Menu.Item key='fork' onClick={() => onFork(prompt('Branch name:') ?? 'Fork')}>
                <span style={{ color: 'var(--zoya-primary)' }}>+ Fork current</span>
              </Menu.Item>
            </Menu>
          }
        >
          <Button size='mini'>Branches ▾</Button>
        </Dropdown>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip content='Undo (Ctrl+Z)'>
            <Button size='mini' disabled={!undoRedoManager.canUndo()} onClick={() => { const e = undoRedoManager.undo(); if (e) onJump(e.id); }}>↩</Button>
          </Tooltip>
          <Tooltip content='Redo (Ctrl+Shift+Z)'>
            <Button size='mini' disabled={!undoRedoManager.canRedo()} onClick={() => { const e = undoRedoManager.redo(); if (e) onJump(e.id); }}>↪</Button>
          </Tooltip>
        </div>
      </div>

      {/* Timeline slider */}
      <Slider
        value={events.length - 1}
        min={0}
        max={Math.max(0, events.length - 1)}
        marks={marks}
        onChange={(val) => { const evt = events[val as number]; if (evt) onJump(evt.id); }}
        style={{ marginBottom: 8 }}
      />

      {/* Event list */}
      <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {events.map((evt, i) => (
          <div
            key={evt.id}
            onClick={() => onJump(evt.id)}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 4,
              cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)',
              background: hoverIdx === i ? 'var(--bg-2)' : 'transparent',
              borderLeft: `3px solid ${TYPE_COLORS[evt.type]}`,
            }}
          >
            <span style={{ fontSize: 11 }}>{TYPE_ICONS[evt.type]}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>
              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineSlider;
