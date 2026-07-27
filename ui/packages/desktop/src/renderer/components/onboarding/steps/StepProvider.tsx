import { Alert, Tag, Typography } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import { onboardingManager } from '../OnboardingManager';

interface Props {
  apiKey: string;
}

const StepProvider: React.FC<Props> = ({ apiKey }) => {
  const [checking, setChecking] = useState(true);
  const [found, setFound] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setChecking(true);
      const ok = await onboardingManager.verifyModel(apiKey, 'deepseek-v4-flash-free');
      if (!cancelled) {
        setFound(ok);
        setChecking(false);
        // Try to fetch model list
        try {
          const res = await fetch('https://api.opencode.ai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (res.ok) {
            const data = await res.json();
            const all = (data.data ?? data.models ?? []).map((m: any) => m.id ?? m.name ?? '');
            if (!cancelled) setModels(all.slice(0, 10));
          }
        } catch {}
      }
    }
    check();
    return () => { cancelled = true; };
  }, [apiKey]);

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🧠</div>
      <Typography.Title heading={4}>AI Provider Verification</Typography.Title>
      <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 24 }}>
        Verifying model: <Tag color='blue'>deepseek-v4-flash-free</Tag>
      </Typography.Text>

      {checking ? (
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <Typography.Text>Checking model availability...</Typography.Text>
        </div>
      ) : found ? (
        <div>
          <Alert type='success' content='✅ deepseek-v4-flash-free is available!' style={{ marginBottom: 16 }} />
          {models.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Available models:</div>
              {models.map((m) => <Tag key={m} size='small' style={{ margin: 2 }}>{m}</Tag>)}
            </div>
          )}
        </div>
      ) : (
        <div>
          <Alert type='warning' content='deepseek-v4-flash-free not found in model list. Your API key may use a different model.' style={{ marginBottom: 16 }} />
          <Typography.Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            You can still continue — models may update dynamically.
          </Typography.Text>
        </div>
      )}
    </div>
  );
};

export default StepProvider;
