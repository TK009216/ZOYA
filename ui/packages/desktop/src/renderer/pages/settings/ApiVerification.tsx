import { Alert, Button, Card, Input, Message, Select, Space, Steps, Table, Tag, Typography } from '@arco-design/web-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SettingsPageWrapper from './components/SettingsPageWrapper';

interface ProviderModel {
  id: string;
  name: string;
  free: boolean;
}

type Step = 'enter-key' | 'verifying' | 'verified' | 'select-model' | 'done';

const FREE_MODELS = ['deepseek-v4-flash-free', 'gpt-4o-mini', 'gemini-3-flash', 'claude-haiku-4-5'];

const ApiVerification: React.FC = () => {
  const [step, setStep] = useState<Step>('enter-key');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [valid, setValid] = useState(false);
  const [tier, setTier] = useState<'free' | 'pro' | 'enterprise' | ''>('');
  const didFetch = useRef(false);

  const fetchModels = useCallback(async (key: string) => {
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/providers/fetch-models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ api_key: key, provider: 'opencode' }),
      });
      if (!res.ok) { setError(`API returned ${res.status}`); setVerifying(false); return false; }
      const data = await res.json();
      if (!data.models || data.models.length === 0) { setError('No models found. Check your API key.'); setVerifying(false); return false; }
      const mapped: ProviderModel[] = (data.models as any[]).map((m: any) => ({
        id: m.id ?? m.name ?? '',
        name: m.name ?? m.id ?? '',
        free: FREE_MODELS.some((f) => (m.id ?? '').includes(f) || (m.name ?? '').includes(f)),
      }));
      setModels(mapped);
      setStep('verified');
      setValid(true);
      // detect tier
      const freeCount = mapped.filter((m) => m.free).length;
      setTier(freeCount > 0 ? 'free' : mapped.length > 50 ? 'enterprise' : 'pro');
      // auto-select best free model
      const best = mapped.find((m) => m.id === 'deepseek-v4-flash-free') || mapped.find((m) => m.free) || mapped[0];
      if (best) setSelectedModel(best.id);
      setVerifying(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Network error');
      setVerifying(false);
      return false;
    }
  }, []);

  const handleVerify = async () => {
    if (!apiKey.trim()) return;
    const ok = await fetchModels(apiKey.trim());
    if (ok) setStep('select-model');
  };

  const handleSave = async () => {
    try {
      await fetch('/api/zoya/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: `opencode/${selectedModel}`, provider: 'opencode', api_key: apiKey }),
      });
      await fetch('/api/zoya/restart', { method: 'POST' });
      setStep('done');
      Message.success('Config saved! ZOYA restarting...');
    } catch {
      Message.error('Failed to save config');
    }
  };

  const modelColumns = useMemo(() => [
    { title: 'Model ID', dataIndex: 'id', width: 300 },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Tier', render: (_: any, r: ProviderModel) => r.free ? <Tag color='green'>FREE</Tag> : <Tag>Paid</Tag> },
  ], []);

  return (
    <SettingsPageWrapper contentClassName='max-w-900px'>
      <Typography.Title heading={3} style={{ marginBottom: 8 }}>🔐 API Verification</Typography.Title>
      <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 24 }}>
        Verify your OpenCode API key, check available models, and auto-configure the best free model.
      </Typography.Text>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Steps current={['enter-key', 'verifying', 'verified', 'select-model', 'done'].indexOf(step)} size='small' style={{ flex: 1 }}>
            <Steps.Step title='Enter Key' />
            <Steps.Step title='Verify' />
            <Steps.Step title='Select Model' />
            <Steps.Step title='Done' />
          </Steps>
        </div>

        {step === 'enter-key' && (
          <div>
            <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>OpenCode API Key</Typography.Text>
            <Input.Password
              size='large'
              placeholder='sk-...'
              value={apiKey}
              onChange={(v) => { setApiKey(v); setError(''); }}
              visibilityToggle={{ visible: showKey, onVisibleChange: setShowKey }}
              style={{ marginBottom: 12 }}
            />
            <Button type='primary' disabled={!apiKey.trim() || verifying} loading={verifying} onClick={handleVerify}>
              {verifying ? 'Verifying...' : '🔍 Verify'}
            </Button>
          </div>
        )}

        {step === 'verified' && (
          <div>
            <Alert type='success' title='✅ API Key Valid!' content={`Your API key is valid. Detected tier: ${tier.toUpperCase()}`} style={{ marginBottom: 16 }} />
          </div>
        )}

        {step === 'select-model' && (
          <div>
            <Alert type='info' title='Available Models' content={`${models.length} models found. Auto-selected best free model.`} style={{ marginBottom: 16 }} />
            <div style={{ marginBottom: 12 }}>
              <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Select Model</Typography.Text>
              <Select value={selectedModel} onChange={setSelectedModel} style={{ width: 400 }} showSearch>
                {models.map((m) => (
                  <Select.Option key={m.id} value={m.id} disabled={!m.free}>
                    {m.id} {m.free ? '🆓' : '💳'}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <Table columns={modelColumns} data={models.slice(0, 20)} size='small' pagination={false} scroll={{ y: 200 }} />
            <Space style={{ marginTop: 12 }}>
              <Button type='primary' onClick={handleSave}>💾 Save & Restart ZOYA</Button>
              <Button onClick={() => setStep('enter-key')}>Back</Button>
            </Space>
          </div>
        )}

        {step === 'done' && (
          <Alert type='success' title='✅ All Set!' content='ZOYA is restarting with your verified API key and selected model.' />
        )}

        {error && <Alert type='error' title='Verification Failed' content={error} style={{ marginTop: 12 }} closable onClose={() => setError('')} />}
      </Card>
    </SettingsPageWrapper>
  );
};

export default ApiVerification;
