/**
 * @license
 * Copyright 2025 ZOYA (zoya.local)
 * SPDX-License-Identifier: Apache-2.0
 *
 * ZOYA Model Settings â€” Real provider & model management.
 */

import { Button, Input, Message, Popconfirm, Tag, Badge, Tooltip } from '@arco-design/web-react';
import {
  CheckOne,
  DeleteFour,
  Info,
  Loading,
  Plus,
  Refresh,
  Search,
  Write,
  CheckCorrect,
  Close,
} from '@icon-park/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsPageWrapper from './components/SettingsPageWrapper';
import AddProviderModal from './components/AddProviderModal';
import { getProviderLogo, getPlatformByValue } from '@/renderer/utils/model/modelPlatforms';

interface IProvider {
  id: string;
  platform?: string;
  name: string;
  base_url: string;
  api_key: string;
  models: string[];
  enabled?: boolean;
  model_enabled?: Record<string, boolean>;
  model_health?: Record<string, { status: 'unknown' | 'healthy' | 'unhealthy'; last_check?: number; latency?: number; error?: string }>;
}

interface ZoyaConfig {
  model?: string;
  small_model?: string;
}

interface ProviderHealth {
  status: 'testing' | 'ok' | 'fail';
  message: string;
}

const PLATFORM_TO_BACKEND_ID: Record<string, string> = {
  gemini: 'google',
  'gemini-vertex-ai': 'google-vertex',
  anthropic: 'anthropic',
  bedrock: 'bedrock',
  'new-api': 'new-api',
};

const ZoyaModelSettings: React.FC = () => {
  const { t } = useTranslation();
  const [message, msgContext] = Message.useMessage();
  const [providers, setProviders] = useState<IProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoyaConfig, setZoyaConfig] = useState<ZoyaConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState<string | null>(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [testingConn, setTestingConn] = useState<string | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState<IProvider | null>(null);
  const [providerHealth, setProviderHealth] = useState<Record<string, ProviderHealth>>({});
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const didFetch = useRef(false);

  const activeModel = zoyaConfig?.model || '';

  const getBackendProviderId = useCallback((provider: IProvider): string => {
    if (provider.platform && PLATFORM_TO_BACKEND_ID[provider.platform]) {
      return PLATFORM_TO_BACKEND_ID[provider.platform];
    }
    if (provider.platform === 'custom') {
      const platformCfg = getPlatformByValue(provider.name);
      if (platformCfg && platformCfg.platform !== 'custom') {
        return PLATFORM_TO_BACKEND_ID[platformCfg.platform] || platformCfg.platform;
      }
    }
    // Use the actual provider ID (assigned by the backend) instead of a slug of the name,
    // so that custom providers are correctly identified by the backend.
    return provider.id || provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(Array.isArray(data) ? data : data?.data ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/zoya/config');
      if (res.ok) {
        const cfg = await res.json();
        if (cfg) setZoyaConfig({ model: cfg.model || '', small_model: cfg.small_model || cfg.model || '' });
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    Promise.all([fetchProviders(), fetchConfig()]).finally(() => setLoading(false));
  }, [fetchProviders, fetchConfig]);

  const handleFetchProviderModels = useCallback(async (provider: IProvider) => {
    setFetchingModels(provider.id);
    try {
      const res = await fetch('/api/providers/fetch-models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          base_url: provider.base_url,
          api_key: provider.api_key || '',
          platform: provider.platform || 'custom',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rawModels = data.models || [];
        const newModels = rawModels
          .map((m: string | { id: string; name?: string }) => {
            if (typeof m === 'string') return m;
            const id = m.id || m.name;
            return id ? id : null;
          })
          .filter(Boolean) as string[];
        if (newModels.length > 0) {
          setProviders((prev) =>
            prev.map((p) => (p.id === provider.id ? { ...p, models: newModels } : p)),
          );
          message.success(`Fetched ${newModels.length} models for ${provider.name}`);
        } else {
          message.info(`No models returned from ${provider.name}`);
        }
      } else {
        const errText = await res.text().catch(() => '');
        message.error(`Fetch failed: ${errText.slice(0, 300)}`);
      }
    } catch (err) {
      message.error(`Connection failed: ${String(err)}`);
    }
    setFetchingModels(null);
  }, [message]);

  const PROVIDER_API_URLS: Record<string, { baseURL: string; npm: string }> = {
    google: { baseURL: 'https://generativelanguage.googleapis.com/v1beta/', npm: '@ai-sdk/google' },
    anthropic: { baseURL: 'https://api.anthropic.com/v1/', npm: '@ai-sdk/anthropic' },
    openai: { baseURL: 'https://api.openai.com/v1/', npm: '@ai-sdk/openai' },
    opencode: { baseURL: 'https://api.opencode.ai/v1/', npm: '@ai-sdk/openai-compatible' },
    deepseek: { baseURL: 'https://api.deepseek.com/v1/', npm: '@ai-sdk/openai-compatible' },
    openrouter: { baseURL: 'https://openrouter.ai/api/v1/', npm: '@openrouter/ai-sdk-provider' },
    xai: { baseURL: 'https://api.x.ai/v1/', npm: '@ai-sdk/openai-compatible' },
  };

  const detectProtocolFromUrl = useCallback((url: string): string => {
    if (!url) return 'unknown';
    if (url.includes('generativelanguage.googleapis.com')) return 'gemini';
    if (url.includes('api.anthropic.com')) return 'anthropic';
    if (url.includes('api.openai.com') || url.includes('.openai.com')) return 'openai';
    if (url.includes('opencode.ai')) return 'opencode';
    if (url.includes('deepseek.com')) return 'deepseek';
    if (url.includes('openrouter.ai')) return 'openrouter';
    if (url.includes('x.ai')) return 'xai';
    return 'openai-compatible';
  }, []);

  const handleFetchAllModels = useCallback(async () => {
    setFetchingAll(true);
    let total = 0;
    for (const provider of providers) {
      if (!provider.base_url) continue;
      setFetchingModels(provider.id);
      try {
        const res = await fetch('/api/providers/fetch-models', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            base_url: provider.base_url,
            api_key: provider.api_key || '',
            platform: provider.platform || 'custom',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const rawModels = data.models || [];
          const newModels = rawModels
            .map((m: string | { id: string; name?: string }) => {
              if (typeof m === 'string') return m;
              const id = m.id || m.name;
              return id ? id : null;
            })
            .filter(Boolean) as string[];
          if (newModels.length > 0) {
            setProviders((prev) =>
              prev.map((p) => (p.id === provider.id ? { ...p, models: newModels } : p)),
            );
            total += newModels.length;
          }
        }
      } catch { /* skip failed providers */ }
      setFetchingModels(null);
    }
    setFetchingAll(false);
    if (total > 0) {
      message.success(`Fetched ${total} models across all providers`);
    } else {
      message.info('No models returned â€” check provider URLs and API keys');
    }
  }, [providers, message]);

  const handleTestConnection = useCallback(async (provider: IProvider) => {
    setTestingConn(provider.id);
    setProviderHealth((prev) => ({ ...prev, [provider.id]: { status: 'testing', message: 'Testing...' } }));
    try {
      if (!provider.base_url) {
        setProviderHealth((prev) => ({
          ...prev,
          [provider.id]: { status: 'fail', message: 'No base URL configured' },
        }));
        message.error('Cannot test â€” no base URL');
        setTestingConn(null);
        return;
      }
      if (!provider.api_key) {
        message.warning('No API key set â€” test may fail for authenticated endpoints');
      }

      const res = await fetch('/api/providers/detect-protocol', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          base_url: provider.base_url,
          api_key: provider.api_key || '',
          timeout: 15000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const protocol = data.protocol || detectProtocolFromUrl(provider.base_url);
          const confidence = typeof data.confidence === 'number' ? data.confidence : 50;
          setProviderHealth((prev) => ({
            ...prev,
            [provider.id]: { status: 'ok', message: `${protocol} (${confidence}%)` },
          }));
          message.success(`Connected! Protocol: ${protocol}`);
          if (data.models && data.models.length > 0) {
            setProviders((prev) =>
              prev.map((p) =>
                p.id === provider.id
                  ? { ...p, models: [...new Set([...p.models, ...data.models])] as string[] }
                  : p,
              ),
            );
          }
        } else {
          setProviderHealth((prev) => ({
            ...prev,
            [provider.id]: { status: 'fail', message: data.error || 'Unknown error' },
          }));
          message.error(`Connection failed: ${data.error || 'Unknown error'}`);
        }
      } else {
        const errText = await res.text().catch(() => '');
        setProviderHealth((prev) => ({
          ...prev,
          [provider.id]: { status: 'fail', message: `HTTP ${res.status}` },
        }));
        message.error(`Connection test failed: ${res.status}`);
      }
    } catch (err) {
      setProviderHealth((prev) => ({
        ...prev,
        [provider.id]: { status: 'fail', message: String(err) },
      }));
      message.error(`Connection error: ${String(err)}`);
    }
    setTestingConn(null);
  }, [message, detectProtocolFromUrl]);

  const handleSetZoyaModel = useCallback(async (provider: IProvider, modelId: string) => {
    const backendId = getBackendProviderId(provider);
    const modelStr = `${backendId}/${modelId}`;
    setSaving(true);

    const knownProvider = PROVIDER_API_URLS[backendId];
    const baseURL = provider.base_url || knownProvider?.baseURL || '';
    const npm = knownProvider?.npm || '@ai-sdk/openai-compatible';

    const payload: Record<string, unknown> = {
      model: modelStr,
      small_model: modelStr,
      $schema: 'https://opencode.ai/config.json',
    };

    payload.provider = {
      [backendId]: {
        name: provider.name || backendId,
        ...(baseURL ? { api: baseURL } : {}),
        npm,
        options: {},
        models: {
          [modelId]: {
            name: modelId,
            tool_call: true,
            ...(baseURL ? { provider: { api: baseURL } } : {}),
          },
        },
      },
    };

    const provOpts = payload.provider[backendId].options as Record<string, string>;
    if (provider.api_key) provOpts.apiKey = provider.api_key;

    if (!provider.api_key) {
      message.warning('No API key â€” model set but authentication may fail');
    }

    try {
      const res = await fetch('/api/zoya/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        message.error(data.message || 'Failed to save config');
        setSaving(false);
        return;
      }

      setZoyaConfig({ model: modelStr, small_model: modelStr });
      message.success(`${modelId} set as active model â€” restarting ZOYA...`);

      const verifyRes = await fetch('/api/zoya/config');
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (verifyData.model !== modelStr) {
          message.warning('Config saved but verify mismatch â€” check config file');
        }
      }

      const restartRes = await fetch('/api/zoya/restart', { method: 'POST' });
      const restartData = await restartRes.json().catch(() => ({}));
      if (restartData.success) {
        message.success('ZOYA restarting with new model...');
      } else {
        message.warning('Model saved but restart signal may not have reached ZOYA');
      }
    } catch (err) {
      message.error(`Save error: ${String(err)}`);
    }
    setSaving(false);
  }, [message, getBackendProviderId]);

  const handleAddProvider = useCallback(async (provider: IProvider) => {
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(provider),
      });
      if (res.ok) {
        message.success(t('settings.zoyaModel.connectedSuccess', { provider: provider.name }));
        setAddModalVisible(false);
        await fetchProviders();
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to create provider' }));
        message.error(err.message);
      }
    } catch (err) {
      message.error(t('settings.zoyaModel.saveError', { error: String(err) }));
    }
  }, [message, t, fetchProviders]);

  const handleUpdateProvider = useCallback(async (provider: IProvider) => {
    try {
      const { id, ...body } = provider;
      const res = await fetch(`/api/providers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        message.success(`${provider.name} updated`);
        setEditingProvider(null);
        await fetchProviders();
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to update' }));
        message.error(err.message);
      }
    } catch (err) {
      message.error(t('settings.zoyaModel.saveError', { error: String(err) }));
    }
  }, [message, fetchProviders]);

  const handleDeleteProvider = useCallback(async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/providers/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        message.success(`${name} deleted`);
        await fetchProviders();
        setProviderHealth((prev) => { const next = { ...prev }; delete next[id]; return next; });
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to delete' }));
        message.error(err.message);
      }
    } catch (err) {
      message.error(t('settings.zoyaModel.saveError', { error: String(err) }));
    }
  }, [message, fetchProviders]);

  const providerLogo = (p: IProvider) => {
    const logo = getProviderLogo({ name: p.name, base_url: p.base_url, platform: p.platform });
    if (logo) return <img src={logo} alt={p.name} className='size-24px object-contain' />;
    return <Info theme="outline" size="20" className='text-t-secondary' />;
  };

  const renderHealthIndicator = (provider: IProvider) => {
    const health = providerHealth[provider.id];
    if (testingConn === provider.id) {
      return (
        <Tooltip content='Testing connection...'>
          <Loading theme="outline" size="14" className='text-[rgb(var(--primary-6))] animate-spin' />
        </Tooltip>
      );
    }
    if (health?.status === 'ok') {
      return (
        <Tooltip content={health.message}>
          <CheckCorrect theme="filled" size="14" className='text-[rgb(var(--green-6))]' />
        </Tooltip>
      );
    }
    if (health?.status === 'fail') {
      return (
        <Tooltip content={health.message}>
          <Close theme="filled" size="14" className='text-[rgb(var(--danger-6))]' />
        </Tooltip>
      );
    }
    return null;
  };

  return (
    <SettingsPageWrapper contentClassName='max-w-1100px'>
      {msgContext}

      <div className='flex flex-col gap-16px'>
        {/* Header */}
        <div className='bg-[var(--color-bg-2)] rd-16px px-24px py-18px border border-solid border-[var(--color-border-2)]'>
          <div className='flex items-center justify-between flex-wrap gap-12px'>
            <div>
              <div className='text-20px font-600 text-t-primary leading-34px'>{t('settings.zoyaModel.title')}</div>
              <div className='text-13px text-t-secondary mt-2px'>{t('settings.zoyaModel.description')}</div>
            </div>
            {zoyaConfig && (
              <Tag color='arcoblue' className='text-12px'>
                {t('settings.zoyaModel.active', { model: activeModel })}
              </Tag>
            )}
          </div>
          {zoyaConfig && (
            <div className='mt-10px flex items-center gap-8px text-13px text-t-primary'>
              <CheckOne theme="filled" size="16" className='text-[rgb(var(--green-6))]' />
              {t('settings.zoyaModel.currentlyActive')} <span className='font-500 text-[rgb(var(--primary-6))]'>{activeModel}</span>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className='flex items-center justify-center py-60px'>
            <Loading theme="outline" size="24" className='animate-spin text-t-secondary' />
          </div>
        )}

        {/* Empty */}
        {!loading && providers.length === 0 && (
          <div className='flex flex-col items-center justify-center py-60px bg-[var(--color-bg-2)] rd-16px border border-solid border-[var(--color-border-2)]'>
            <Info theme="outline" size="48" className='text-t-secondary mb-16px' />
            <h3 className='text-16px font-500 text-t-primary mb-8px'>{t('settings.noConfiguredModels')}</h3>
            <Button type='primary' onClick={() => setAddModalVisible(true)}>
              <Plus size="16" className='mr-4px' /> Add Provider
            </Button>
          </div>
        )}

        {/* Toolbar: search + fetch all */}
        {!loading && providers.length > 0 && (
          <div className='flex items-center gap-8px flex-wrap'>
            <Input.Search
              placeholder='Search models...'
              value={modelSearchQuery}
              onChange={(v) => setModelSearchQuery(v)}
              className='flex-1 min-w-200px'
              size='default'
              allowClear
            />
            <Button
              type='outline'
              size='default'
              loading={fetchingAll}
              onClick={handleFetchAllModels}
            >
              <Search size="16" className='mr-4px' /> Fetch All Models
            </Button>
          </div>
        )}

        {/* Provider cards */}
        {!loading && providers.length > 0 && (
          <div className='space-y-12px'>
            {providers.map((provider) => {
              const backendId = getBackendProviderId(provider);
              const isActive = activeModel.startsWith(backendId + '/');
              const models = provider.models || [];
              const enabledModels = models.filter((m) =>
                provider.model_enabled ? provider.model_enabled[m] !== false : true,
              ).filter((m) =>
                modelSearchQuery ? m.toLowerCase().includes(modelSearchQuery.toLowerCase()) : true,
              );

              return (
                <div
                  key={provider.id}
                  className='bg-[var(--color-bg-2)] rd-12px p-16px border border-solid border-[var(--color-border-2)] transition-all duration-200'
                  style={{
                    borderColor: isActive ? 'rgb(var(--primary-6))' : undefined,
                    boxShadow: isActive ? '0 0 0 1px rgba(var(--primary-6), 0.15)' : undefined,
                  }}
                >
                  {/* Provider header */}
                  <div className='flex items-center justify-between mb-12px'>
                    <div className='flex items-center gap-10px'>
                      <div className='size-36px rd-8px flex items-center justify-center bg-[var(--color-fill-2)]'>
                        {providerLogo(provider)}
                      </div>
                      <div>
                        <div className='text-15px font-500 text-t-primary flex items-center gap-6px'>
                          {provider.name}
                          {isActive && (
                            <Tag color='green' size='small' className='text-10px !px-6px !py-0px'>ZOYA</Tag>
                          )}
                          <span className='ml-2px'>{renderHealthIndicator(provider)}</span>
                        </div>
                        <div className='text-11px text-t-secondary mt-1px'>{provider.base_url || 'No base URL'}</div>
                      </div>
                    </div>
                    <div className='flex items-center gap-4px shrink-0'>
                      <Tooltip content='Test connection'>
                        <Button
                          size='mini'
                          className='!w-28px !h-28px !min-w-28px text-t-secondary hover:text-[rgb(var(--green-6))]'
                          icon={<CheckCorrect size='14' />}
                          loading={testingConn === provider.id}
                          onClick={() => handleTestConnection(provider)}
                        />
                      </Tooltip>
                      <Tooltip content='Fetch models from API'>
                        <Button
                          size='mini'
                          className='!w-28px !h-28px !min-w-28px text-t-secondary hover:text-t-primary'
                          icon={<Search size='14' />}
                          loading={fetchingModels === provider.id}
                          onClick={() => handleFetchProviderModels(provider)}
                        />
                      </Tooltip>
                      <Tooltip content='Edit provider'>
                        <Button
                          size='mini'
                          className='!w-28px !h-28px !min-w-28px text-t-secondary hover:text-t-primary'
                          icon={<Write size='14' />}
                          onClick={() => setEditingProvider(provider)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title='Delete Provider'
                        content={`Delete "${provider.name}"?`}
                        onOk={() => handleDeleteProvider(provider.id, provider.name)}
                      >
                        <Tooltip content='Delete provider'>
                          <Button
                            size='mini'
                            className='!w-28px !h-28px !min-w-28px text-t-secondary hover:text-[rgb(var(--danger-6))]'
                            icon={<DeleteFour size='18' />}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  </div>

                  {/* Models grid */}
                  {enabledModels.length > 0 && (
                    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6px'>
                      {enabledModels.map((model) => {
                        const isActiveModel = activeModel === `${backendId}/${model}`;
                        return (
                          <Button
                            key={model}
                            type={isActiveModel ? 'primary' : 'outline'}
                            size='small'
                            loading={saving && isActiveModel}
                            className='justify-start h-34px px-12px text-12px overflow-hidden'
                            onClick={() => handleSetZoyaModel(provider, model)}
                          >
                            <span className='truncate'>{model}</span>
                            {isActiveModel && <CheckOne theme="filled" size="12" className='shrink-0 ml-4px' />}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {enabledModels.length === 0 && (
                    <div className='text-12px text-t-tertiary py-8px text-center'>
                      {modelSearchQuery
                        ? `No models match "${modelSearchQuery}"`
                        : 'No models â€” click Fetch All Models or the Search button'}
                    </div>
                  )}

                  {providerHealth[provider.id]?.status === 'fail' && (
                    <div className='mt-8px text-11px text-[rgb(var(--danger-6))] bg-[rgba(var(--danger-6),0.08)] rd-6px px-10px py-6px'>
                      Connection error: {providerHealth[provider.id].message}
                    </div>
                  )}
                  {providerHealth[provider.id]?.status === 'ok' && (
                    <div className='mt-8px text-11px text-[rgb(var(--green-6))] bg-[rgba(var(--green-6),0.08)] rd-6px px-10px py-6px'>
                      Connected: {providerHealth[provider.id].message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add provider */}
        {!loading && providers.length > 0 && (
          <div className='flex justify-center pt-4px'>
            <Button type='outline' size='default' onClick={() => setAddModalVisible(true)}>
              <Plus size="16" className='mr-4px' /> Add Provider
            </Button>
          </div>
        )}

        {/* Help */}
        {!loading && (
          <div className='bg-[var(--color-bg-2)] rd-12px p-16px border border-solid border-[var(--color-border-2)]'>
            <div className='text-13px font-500 text-t-primary mb-8px'>{t('settings.zoyaModel.howItWorks')}</div>
            <ol className='text-12px text-t-secondary space-y-4px ml-16px list-decimal'>
              <li>Add a provider (OpenAI, Anthropic, DeepSeek, OpenCode, etc.)</li>
              <li>Click <Search theme="outline" size="12" className='inline-block' /> to fetch real models from the API</li>
              <li>Click the checkmark <CheckCorrect theme="outline" size="12" className='inline-block' /> to test the connection</li>
              <li>Click a model pill to set it as ZOYA&apos;s active model</li>
              <li>ZOYA auto-restarts and starts using the new model immediately</li>
              <li>The model stays selected even after future restarts</li>
            </ol>
            <div className='text-12px text-t-secondary mt-8px'>
              {t('settings.zoyaModel.personalityNote')}
            </div>
          </div>
        )}
      </div>

      <AddProviderModal
        visible={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onSubmit={handleAddProvider}
      />

      {editingProvider && (
        <AddProviderModal
          visible={!!editingProvider}
          initialData={editingProvider}
          onCancel={() => setEditingProvider(null)}
          onSubmit={handleUpdateProvider}
        />
      )}
    </SettingsPageWrapper>
  );
};

export default ZoyaModelSettings;
