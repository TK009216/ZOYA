import { Typography } from '@arco-design/web-react';
import React from 'react';
import { useUserEnvironment } from '@renderer/hooks/useUserEnvironment';

interface Props {
  compact?: boolean;
}

const DynamicGreeting: React.FC<Props> = ({ compact }) => {
  const env = useUserEnvironment();

  if (compact) {
    return (
      <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {env.greeting}, {env.userName}
      </Typography.Text>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-2)', marginBottom: 12 }}>
      <div style={{ fontSize: 32 }}>{env.weather?.icon || '👋'}</div>
      <div>
        <Typography.Text style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
          {env.greeting}, {env.userName}!
        </Typography.Text>
        <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {env.pcName} · {env.timezone}
          {env.weather && ` · ${env.weather.temp}°C ${env.weather.condition}`}
        </Typography.Text>
      </div>
    </div>
  );
};

export default DynamicGreeting;
