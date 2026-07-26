/**
 * @license
 * Copyright 2025 ZOYA (zoya.local)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add/Edit Provider Modal — Create or modify AI providers with real model fetching.
 */

import { Button, Form, Input, Message, Modal, Select } from '@arco-design/web-react';
import { Search, Loading } from '@icon-park/react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MODEL_PLATFORMS,
  getPlatformByValue,
  getProviderLogo,
  type PlatformConfig,
} from '@/renderer/utils/model/modelPlatforms';

interface IProvider {
  id: string;
  platform?: string;
  name: string;
  base_url: string;
  api_key: string;
  models: string[];
  enabled?: boolean;
  model_enabled?: Record<string, boolean>;
}

interface AddProviderModalProps {
  visible: boolean;
  initialData?: IProvider;
  onCancel: () => void;
  onSubmit: (provider: IProvider) => Promise<void>;
}

const AddProviderModal: React.FC<AddProviderModalProps> = ({ visible, initialData, onCancel, onSubmit }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [message, msgContext] = Message.useMessage();
  const [fetching, setFetching] = useState(false);
  const [modelOptions, setModelOptions] = useState<{ label: string; value: string }[]>([]);
  const isEditing = !!initialData;

  const selectedPlatform = Form.useWatch('platform', form);
  const baseUrl = Form.useWatch('base_url', form);
  const apiKey = Form.useWatch('api_key', form);

  const platformConfig = useMemo(() => getPlatformByValue(selectedPlatform), [selectedPlatform]);

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue(initialData);
      setModelOptions((initialData.models || []).map((m) => ({ label: m, value: m })));
    } else if (visible) {
      form.resetFields();
      setModelOptions([]);
    }
  }, [visible, initialData, form]);

  const handleFetchModels = async () => {
    const values = form.getFields();
    const url = values.base_url || platformConfig?.base_url;
    const key = values.api_key;

    if (!url) {
      message.warning(t('settings.pleaseEnterBaseUrl'));
      return;
    }

    setFetching(true);
    try {
      const res = await fetch('/api/providers/fetch-models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          base_url: url,
          api_key: key || '',
          platform: platformConfig?.platform || 'custom',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const models: { id: string; name?: string }[] = data.models || [];
        const opts = models.map((m) => ({ label: m.name || m.id, value: m.id }));
        setModelOptions(opts);
        if (opts.length > 0) {
          message.success(`Found ${opts.length} models`);
        } else {
          message.info('No models returned — you can type model IDs manually');
        }
      } else {
        message.error('Failed to fetch models — you can type model IDs manually');
      }
    } catch {
      message.error('Connection failed — you can type model IDs manually');
    }
    setFetching(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validate();
      const provider: IProvider = {
        id: initialData?.id || values.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        platform: platformConfig?.platform || 'custom',
        name: values.name || platformConfig?.name || values.platform,
        base_url: values.base_url || platformConfig?.base_url || '',
        api_key: values.api_key || '',
        models: values.models || [],
        enabled: true,
      };
      await onSubmit(provider);
    } catch {
      // form validation error — already shown by Arco
    }
  };

  const selectedLogo = useMemo(() => {
    if (platformConfig) {
      return getProviderLogo({ name: platformConfig.name, platform: platformConfig.platform });
    }
    return null;
  }, [platformConfig]);

  return (
    <Modal
      title={isEditing ? t('settings.editPlatform') : t('settings.addPlatform')}
      visible={visible}
      onCancel={onCancel}
      footer={
        <div className='flex items-center justify-end gap-8px'>
          <Button onClick={onCancel}>{t('settings.cancel')}</Button>
          <Button type='primary' onClick={handleSubmit}>
            {isEditing ? t('settings.save') : t('settings.add')}
          </Button>
        </div>
      }
      style={{ maxWidth: 520 }}
      autoFocus={false}
      mountOnEnter={false}
    >
      {msgContext}
      <Form form={form} layout='vertical' size='small'>
        {/* Platform selector (only in add mode) */}
        {!isEditing && (
          <Form.Item
            label={t('settings.platform')}
            field='platform'
            rules={[{ required: true, message: t('settings.selectPlatform') }]}
          >
            <Select
              showSearch
              placeholder={t('settings.selectPlatform')}
              renderFormat={(_, value) => {
                const p = getPlatformByValue(value);
                return p?.name || value;
              }}
            >
              {MODEL_PLATFORMS.map((p) => (
                <Select.Option key={p.value} value={p.value}>
                  <div className='flex items-center gap-8px'>
                    {p.logo ? (
                      <img src={p.logo} alt={p.name} className='size-18px object-contain' />
                    ) : null}
                    <span>{p.name}</span>
                    {p.base_url && <span className='text-10px text-t-tertiary ml-auto'>{p.base_url}</span>}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Provider name */}
        {isEditing ? (
          <Form.Item label={t('settings.providerName')} field='name'>
            <Input disabled />
          </Form.Item>
        ) : (
          <Form.Item
            label={t('settings.providerName')}
            field='name'
            extra={t('settings.optional')}
          >
            <Input placeholder={platformConfig?.name || 'Provider name'} />
          </Form.Item>
        )}

        {/* Base URL */}
        <Form.Item
          label={t('settings.zoyaModel.baseUrl')}
          field='base_url'
          rules={[{ required: !platformConfig?.base_url, message: t('settings.pleaseEnterBaseUrl') }]}
        >
          <Input placeholder={platformConfig?.base_url || 'https://api.example.com/v1'} />
        </Form.Item>

        {/* API Key */}
        <Form.Item
          label={t('settings.zoyaModel.apiKey')}
          field='api_key'
        >
          <Input.Password
            placeholder={isEditing ? '••••••••' : 'sk-...'}
            autoComplete='off'
          />
        </Form.Item>

        {/* Models */}
        <Form.Item
          label={t('settings.modelName')}
          field='models'
          rules={[{ required: true, message: t('settings.zoyaModel.selectModelFirst') }]}
        >
          <Select
            mode='multiple'
            showSearch
            allowCreate
            placeholder={t('settings.zoyaModel.selectModel')}
            options={modelOptions}
            suffixIcon={
              <Search
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleFetchModels();
                }}
                theme='outline'
                size={16}
                className='cursor-pointer text-t-secondary hover:text-t-primary'
              />
            }
          />
        </Form.Item>

        {/* Fetch status */}
        {fetching && (
          <div className='flex items-center gap-6px text-12px text-t-secondary'>
            <Loading theme='outline' size={14} className='animate-spin' />
            <span>Fetching models...</span>
          </div>
        )}

        {/* Selected platform info */}
        {selectedLogo && (
          <div className='flex items-center gap-8px text-12px text-t-secondary mt-4px'>
            <img src={selectedLogo} alt='' className='size-16px object-contain' />
            <span>{platformConfig?.name}</span>
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default AddProviderModal;
