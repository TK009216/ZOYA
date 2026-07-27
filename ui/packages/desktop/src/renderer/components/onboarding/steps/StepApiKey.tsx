import { Button, Input, Tag, Typography, Alert } from '@arco-design/web-react';
import React, { useState } from 'react';
import { onboardingManager } from '../OnboardingManager';
import type { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onUpdate: (p: Partial<OnboardingState>) => void;
}

const StepApiKey: React.FC<Props> = ({ state, onUpdate }) => {
  const [verifying, setVerifying] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleVerify = async () => {
    if (!state.apiKey.trim()) return;
    setVerifying(true);
    const ok = await onboardingManager.verifyApiKey(state.apiKey.trim());
    onUpdate({ apiVerified: ok });
    setVerifying(false);
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔑</div>
      <Typography.Title heading={4}>Enter API Key</Typography.Title>
      <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
        OpenCode API key dalo — ZOYA ko models se connect hone ke liye chahiye.
      </Typography.Text>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <Input.Password
          size='large'
          placeholder='sk-...'
          value={state.apiKey}
          onChange={(v) => onUpdate({ apiKey: v, apiVerified: false })}
          visibilityToggle={{ visible: showKey, onVisibleChange: setShowKey }}
          style={{ marginBottom: 12 }}
        />
        <Button
          type='primary'
          long
          loading={verifying}
          disabled={!state.apiKey.trim() || state.apiVerified}
          onClick={handleVerify}
          style={{ marginBottom: 12 }}
        >
          {state.apiVerified ? '✅ Verified' : verifying ? 'Verifying...' : 'Verify & Continue'}
        </Button>
        {state.apiVerified && (
          <Alert type='success' content='API key verified! Moving to next step...' style={{ marginBottom: 12 }} />
        )}
        {state.apiKey && !state.apiVerified && !verifying && (
          <Typography.Text type='warning' style={{ fontSize: 12 }}>
            Click "Verify & Continue" to check your key
          </Typography.Text>
        )}
        <Typography.Text type='secondary' style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
          Key secure store hoti hai — kabhi share nahi hoti
        </Typography.Text>
      </div>
    </div>
  );
};

export default StepApiKey;
