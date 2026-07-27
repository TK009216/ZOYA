import { Alert, Button, Typography } from '@arco-design/web-react';
import React, { useState } from 'react';

interface Suggestion {
  label: string;
  action: () => void;
}

interface Props {
  title: string;
  description: string;
  type?: 'error' | 'warning' | 'info';
  suggestions?: Suggestion[];
  details?: string;
  onDismiss?: () => void;
}

const ErrorMessage: React.FC<Props> = ({ title, description, type = 'error', suggestions, details, onDismiss }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Alert
      type={type}
      title={title}
      content={(
        <div>
          <Typography.Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{description}</Typography.Text>
          {suggestions && suggestions.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {suggestions.map((s, i) => (
                <Button key={i} size='mini' type='outline' onClick={s.action}>{s.label}</Button>
              ))}
            </div>
          )}
          {details && (
            <div style={{ marginTop: 8 }}>
              <Button type='text' size='mini' onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Hide details' : 'Show details'}
              </Button>
              {showDetails && (
                <pre style={{ fontSize: 11, marginTop: 4, padding: 8, background: 'var(--bg-2)', borderRadius: 4, maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {details}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
      closable={!!onDismiss}
      onClose={onDismiss}
      style={{ margin: '4px 0' }}
    />
  );
};

export default ErrorMessage;
