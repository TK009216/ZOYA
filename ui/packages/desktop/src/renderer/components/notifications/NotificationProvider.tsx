import React, { createContext, useCallback, useRef, useState } from 'react';
import { Switch, Typography } from '@arco-design/web-react';
import NotificationToast from './NotificationToast';
import NotificationCenter from './NotificationCenter';
import NotificationHistory from './NotificationHistory';
import type { Notification } from './types';

let nextId = 1;
function genId() { return `notif_${nextId++}_${Date.now()}`; }

interface NotificationContextValue {
  add: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  remove: (id: string) => void;
  dnd: boolean;
  setDnd: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  history: Notification[];
  clearHistory: () => void;
  showHistory: () => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<Notification[]>([]);
  const [history, setHistory] = useState<Notification[]>([]);
  const [dnd, setDnd] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [centerNotif, setCenterNotif] = useState<Notification | null>(null);
  const [showHist, setShowHist] = useState(false);
  const maxHistory = 200;

  const add = useCallback((n: Omit<Notification, 'id' | 'timestamp'>) => {
    if (dnd && !n.persistent) return;
    const notif: Notification = { ...n, id: genId(), timestamp: Date.now() };
    if (n.persistent) {
      setCenterNotif(notif);
    } else {
      setQueue((q) => [...q, notif]);
      setTimeout(() => setQueue((q) => q.filter((x) => x.id !== notif.id)), n.duration ?? 3000 + 300);
    }
    setHistory((h) => [notif, ...h].slice(0, maxHistory));
    if (soundEnabled && n.sound !== false && n.type !== 'info') {
      try { new Audio(`data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+AgIB/f39/gIB/f39/gICAf39/f4CAf39/gICAf39/f4CAf39/f4CAgH9/f3+AgICAf39/gIB/f39/gICAf39/gICAf39/f4CAf39/gH+AgH9/f3+AgH9/f3+AgIB/f39/gIB/f39/gICAf39/f4B/f3+AgH9/f3+AgH9/f4B/f39/gICAf39/f4CAf39/gICAf39/f39/gICAf39/gH+AgH9/f39/gIB/f39/gIB/f39/gICAf39/f4CAf3+AgICAf39/f39/gH+AgICAf39/f39/gICAf39/f39/f39/f39/f4B/f39/gICAf39/f3+AgH9/f39/gH+Af3+AgH9/f39/gICAf39/f39/gICAf39/gICAf39/f39/gH+AgICAf39/f3+AgH+AgICAf39/f39/gICAf39/f3+Af39/gICAf39/f39/gICAf39/f39/f3+AgIB/f39/f4B/f3+AgICAf39/gH9/f3+AgICAf39/f4B/f39/gICAf3+AgH+AgH9/f39/gICAf39/gH+AgIB/f39/gICAf39/X19/gICAf39/gH+AgICAf39/f39/gH9/f39/gH+AgICAf39/gH9/f39/gICAf39/f4B/f39/gICAf39/f4CAf39/f4B/f39/gICAf39/f39/gH+AgH9/f39/f39/f39/f39/f39/f4B/f39/f4B/f39/f4B/f39/f3+Af39/gH+AgH9/f39/gICAf39/f39/f39/f39/f4B/f39/f4CAf39/f4B/f39/f3+Af3+AgH9/f39/gICAf39/f39/gH+AgICAf39/f39/f39/gH+Af39/f3+Af39/f39/gH+Af4B/f39/gH9/f39/f39/f39/f39/f39/f39/f3+Af3+AgH+AgH9/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/gH9/f39/gH9/f39/f39/f39/f39/f39/f39/f3+Af39/f3+Af39/f3+Af39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f4B/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f4B/f39/f4B/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f4B/f39/f4B/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f4B/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f4B/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+Af39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f4A`).play(); } catch {}
    }
  }, [dnd, soundEnabled]);

  const remove = useCallback((id: string) => setQueue((q) => q.filter((x) => x.id !== id)), []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return (
    <NotificationContext.Provider value={{ add, remove, dnd, setDnd, soundEnabled, setSoundEnabled, history, clearHistory, showHistory: () => setShowHist(true) }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {queue.map((n) => <NotificationToast key={n.id} notification={n} onClose={remove} />)}
        </div>
      </div>
      {centerNotif && (
        <NotificationCenter
          visible={!!centerNotif}
          notification={centerNotif}
          onClose={() => setCenterNotif(null)}
          onAction={centerNotif.action?.onClick}
        />
      )}
      {showHist && (
        <NotificationHistory
          visible={showHist}
          history={history}
          onClose={() => setShowHist(false)}
          onClear={clearHistory}
        />
      )}
      {/* DND indicator */}
      {dnd && (
        <div style={{ position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'var(--warning, #f39c12)', color: '#000', padding: '4px 16px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
          🔇 Do Not Disturb
        </div>
      )}
    </NotificationContext.Provider>
  );
};
