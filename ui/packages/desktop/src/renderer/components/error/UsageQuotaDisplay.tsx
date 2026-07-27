import { Progress, Tag, Typography, Tooltip } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import type { UsageQuota } from './types';

interface Props {
  onRefresh?: () => Promise<UsageQuota | null>;
}

const UsageQuotaDisplay: React.FC<Props> = ({ onRefresh }) => {
  const [quota, setQuota] = useState<UsageQuota | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!onRefresh) return;
    setLoading(true);
    onRefresh().then(setQuota).finally(() => setLoading(false));
  }, [onRefresh]);

  if (!quota) {
    if (loading) return <Typography.Text style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Loading usage...</Typography.Text>;
    return null;
  }

  const pct = quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0;
  const color = pct > 80 ? 'danger' : pct > 50 ? 'warning' : 'normal';
  const resetDate = new Date(quota.resetAt).toLocaleString();

  return (
    <Tooltip content={`Resets ${resetDate}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 4, background: 'var(--bg-2)', cursor: 'default' }}>
        <Tag color={color} size='small' style={{ fontSize: 10, lineHeight: '14px', border: 'none' }}>
          {quota.tier.toUpperCase()}
        </Tag>
        <div style={{ flex: 1, minWidth: 60 }}>
          <Progress percent={pct} size='small' style={{ margin: 0 }} />
        </div>
        <Typography.Text style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {quota.used.toLocaleString()}/{quota.limit.toLocaleString()}
        </Typography.Text>
      </div>
    </Tooltip>
  );
};

export default UsageQuotaDisplay;
