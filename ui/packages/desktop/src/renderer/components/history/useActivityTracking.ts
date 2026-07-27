import { useEffect, useRef } from 'react';

const HEARTBEAT_INTERVAL = 60000; // 1 minute
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'focus'];

export function useActivityTracking(sessionId?: string) {
  const lastBeatRef = useRef(0);

  useEffect(() => {
    if (!sessionId) return;

    const sendHeartbeat = () => {
      const now = Date.now();
      if (now - lastBeatRef.current < 30000) return; // throttle to 30s
      lastBeatRef.current = now;

      fetch('/api/zoya/heartbeat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, timestamp: now }),
      }).catch(() => {});
    };

    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    const handleActivity = () => sendHeartbeat();
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    sendHeartbeat(); // immediate first beat

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [sessionId]);
}
