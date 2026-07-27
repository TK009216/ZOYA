import { Button, Progress, Typography } from '@arco-design/web-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RetryState } from './types';
import { DEFAULT_RETRY_CONFIG } from './types';

interface Props {
  onRetry: () => Promise<boolean>;
  onGiveUp: () => void;
  config?: Partial<typeof DEFAULT_RETRY_CONFIG>;
  label?: string;
}

const RetryHandler: React.FC<Props> = ({ onRetry, onGiveUp, config, label }) => {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  const [state, setState] = useState<RetryState>({ attempt: 0, maxAttempts: cfg.maxAttempts, delayMs: cfg.delayMs, lastError: '', active: false });
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRetry = useCallback(async () => {
    setState((prev) => ({ ...prev, active: true }));
    for (let i = 1; i <= cfg.maxAttempts; i++) {
      setState((prev) => ({ ...prev, attempt: i, active: true }));
      // countdown
      let cd = cfg.delayMs / 1000;
      setCountdown(cd);
      await new Promise<void>((resolve) => {
        timerRef.current = setInterval(() => {
          cd--;
          setCountdown(cd);
          if (cd <= 0) { if (timerRef.current) clearInterval(timerRef.current); resolve(); }
        }, 1000);
      });
      const ok = await onRetry();
      if (ok) { setState((prev) => ({ ...prev, active: false })); return; }
    }
    setState((prev) => ({ ...prev, active: false, attempt: cfg.maxAttempts }));
  }, [onRetry, cfg.maxAttempts, cfg.delayMs]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const progress = state.attempt > 0 ? Math.round((state.attempt / cfg.maxAttempts) * 100) : 0;

  return (
    <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-1)', margin: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Typography.Text style={{ color: 'var(--text-warning)', fontWeight: 600, fontSize: 13 }}>
          {label || '⚠️ Connection issue'}
        </Typography.Text>
        {state.active && (
          <Typography.Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Attempt {state.attempt}/{cfg.maxAttempts}
          </Typography.Text>
        )}
      </div>
      {state.active && (
        <div style={{ marginBottom: 8 }}>
          <Progress percent={progress} size='small' />
          {countdown > 0 && (
            <Typography.Text style={{ fontSize: 11, color: 'var(--text-disabled)', display: 'block', marginTop: 4 }}>
              Retrying in {countdown}s...
            </Typography.Text>
          )}
        </div>
      )}
      {state.lastError && (
        <Typography.Text type='danger' style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
          {state.lastError}
        </Typography.Text>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        {!state.active && (
          <Button type='primary' size='mini' onClick={startRetry}>
            🔄 Retry Now
          </Button>
        )}
        {(state.attempt >= cfg.maxAttempts || !state.active) && (
          <Button size='mini' onClick={onGiveUp}>Skip</Button>
        )}
      </div>
    </div>
  );
};

export default RetryHandler;
