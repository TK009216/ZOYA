import { Button, Card, Input, Message, Typography } from '@arco-design/web-react';
import React, { useState } from 'react';

interface Props {
  url: string;
  title?: string;
  description?: string;
}

const LinkShare: React.FC<Props> = ({ url, title, description }) => {
  const [copied, setCopied] = useState(false);

  const shareText = title
    ? `${title}${description ? `\n${description}` : ''}\n\n${url}`
    : url;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      Message.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { Message.error('Failed to copy'); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || '', text: description || '', url });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <Card size='small' style={{ margin: '4px 0' }} bodyStyle={{ padding: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Share this link</div>
      <Input value={url} readOnly size='mini' style={{ marginBottom: 6 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <Button type='primary' size='mini' onClick={handleCopy}>{copied ? '✅ Copied' : '📋 Copy'}</Button>
        <Button size='mini' onClick={handleShare}>📤 Share</Button>
      </div>
    </Card>
  );
};

export default LinkShare;
