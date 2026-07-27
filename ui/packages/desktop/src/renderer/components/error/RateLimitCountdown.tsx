import { Progress, Typography } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';

interface Props {
  resetAt: number;
  onExpired?: () => void;
}

const RateLimitCountdown: React.FC<Props> = ({ resetAt, onExpired }) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((resetAt - Date.now()) / 1000));
      setRemaining(diff);
      if (diff <= 0) onExpired?.();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [resetAt, onExpired]);

  if (remaining <= 0) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-warning)', background: 'var(--bg-warning-subtle)', margin: '4px 0' }}>
      <Typography.Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-warning)', display: 'block', marginBottom: 4 }}>
        ⏳ Rate limit reached
      </Typography.Text>
      <Progress percent={100 - Math.round((remaining / 300) * 100)} size='small' status='warning' />
      <Typography.Text style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
        Resets in {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
        {minutes === 0 && seconds <= 5 && ' — almost there!'}
      </Typography.Text>
    </div>
  );
};

export default RateLimitCountdown;
