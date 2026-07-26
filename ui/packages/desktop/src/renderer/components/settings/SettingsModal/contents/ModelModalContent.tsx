/**
 * @license
 * Copyright 2025 ZOYA (zoya.local)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { configService } from '@/common/config/configService';
import type { IProvider } from '@/common/config/storage';
import { Button, Divider, Message, Popconfirm, Tag } from '@arco-design/web-react';
import { DeleteFour, Info, Plus, Write } from '@icon-park/react';
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AddModelModal from '@/renderer/pages/settings/components/AddModelModal';
import AddPlatformModal from '@/renderer/pages/settings/components/AddPlatformModal';
import EditModeModal from '@/renderer/pages/settings/components/EditModeModal';
import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import { useProvidersQuery } from '@/renderer/hooks/agent/useModelProviderList';
import { useSettingsViewMode } from '../settingsViewContext';
import { consumePendingDeepLink } from '@/renderer/hooks/system/useDeepLink';
import '../model-provider.css';

const ModelModalContent: React.FC = () => {
  const { t } = useTranslation();
  const viewMode = useSettingsViewMode();
  const isPageMode = viewMode === 'page';
  const { data, mutate } = useProvidersQuery();
  const [message, messageContext] = Message.useMessage();

  const persistPlatform = async (platform: IProvider): Promise<void> => {
    const existing = (data || []).some((item) => item.id === platform.id);
    if (existing) {
      const { id, ...body } = platform;
      await ipcBridge.mode.updateProvider.invoke({ id, ...body });
    } else {
      await ipcBridge.mode.createProvider.invoke(platform);
    }
  };

  const updatePlatform = (platform: IProvider, success: () => void) => {
    const existing = (data || []).find((item) => item.id === platform.id);
    const nextArray = existing
      ? (data || []).map((item) => (item.id === platform.id ? { ...item, ...platform } : item))
      : [...(data || []), platform];

    void mutate(nextArray, false);

    persistPlatform(platform)
      .then(async () => {
        const firstEnabled = (platform.models || []).find((m) => {
          if (!platform.model_enabled) return true;
          return platform.model_enabled?.[m] !== false;
        }) || platform.models?.[0] || '';
        if (firstEnabled) {
          await configService.set('aionrs.globalDefault', {
            providerId: platform.id,
            model: firstEnabled,
          });
          const acpConfig = configService.get('acp.config') || {};
          const backendKey = platform.id;
          const existing = acpConfig[backendKey] || {};
          await configService.set('acp.config', {
            ...acpConfig,
            [backendKey]: { ...existing, preferredModelId: firstEnabled },
          });
        }
        void mutate();
        success();
      })
      .catch((error) => {
        void mutate();
        console.error('Failed to save provider:', error);
        message.error(t('settings.saveModelConfigFailed'));
      });
  };

  const removePlatform = (id: string) => {
    const nextArray = (data ?? []).filter((item: IProvider) => item.id !== id);
    void mutate(nextArray, false);
    ipcBridge.mode.deleteProvider.invoke({ id }).then(() => void mutate()).catch((error) => {
      void mutate();
      console.error('Failed to delete provider:', error);
      message.error(t('settings.saveModelConfigFailed'));
    });
  };

  const [addPlatformModalCtrl, addPlatformModalContext] = AddPlatformModal.useModal({
    onSubmit(platform) {
      updatePlatform(platform, () => addPlatformModalCtrl.close());
    },
  });

  useEffect(() => {
    const pending = consumePendingDeepLink();
    if (pending) {
      // addPlatformModalCtrl.open({ deepLinkData: pending });
    }
  }, [addPlatformModalCtrl]);

  const [addModelModalCtrl, addModelModalContext] = AddModelModal.useModal({
    onSubmit(platform) {
      updatePlatform(platform, () => addModelModalCtrl.close());
    },
  });

  const [editModalCtrl, editModalContext] = EditModeModal.useModal({
    onChange(platform) {
      updatePlatform(platform, () => editModalCtrl.close());
    },
  });

  const selectModel = async (providerId: string, modelId: string) => {
    await configService.set('aionrs.globalDefault', {
      providerId,
      model: modelId,
    });
    const acpConfig = configService.get('acp.config') || {};
    const existing = acpConfig[providerId] || {};
    await configService.set('acp.config', {
      ...acpConfig,
      [providerId]: { ...existing, preferredModelId: modelId },
    });
    message.success(`Model ${modelId} selected for ${providerId}`);
  };

  const clearGlobalModel = async () => {
    await configService.set('aionrs.globalDefault', undefined);
    const acpConfig = configService.get('acp.config') || {};
    const newAcpConfig = { ...acpConfig };
    for (const key in newAcpConfig) {
      if (typeof newAcpConfig[key] === 'object' && newAcpConfig[key] !== null) {
        const entry = newAcpConfig[key] as any;
        if (entry.preferredModelId) delete entry.preferredModelId;
      }
    }
    await configService.set('acp.config', newAcpConfig);
    message.success('Global model preference cleared');
    mutate();
  };

  return (
    <div className='flex flex-col bg-2 rd-16px px-16px md:px-24px lg:px-28px py-16px md:py-18px'>
      {messageContext}
      {addPlatformModalContext}
      {editModalContext}
      {addModelModalContext}

      <div className='flex-shrink-0 border-b border-[var(--color-border-2)] pb-12px mb-14px flex flex-col gap-10px'>
        <div className='flex items-center justify-between gap-8px flex-wrap'>
          <div className='text-20px font-600 text-t-primary leading-34px'>{t('settings.model')}</div>
          <Button type='text' className='text-t-secondary hover:text-t-primary' onClick={clearGlobalModel}>
            {t('settings.clearSelection', 'Clear Selection')}
          </Button>
        </div>
      </div>

      <AionScrollArea className='flex-1 min-h-0' disableOverflow={isPageMode}>
        {!data || data.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-40px'>
            <Info theme='outline' size='48' className='text-t-secondary mb-16px' />
            <h3 className='text-16px font-500 text-t-primary mb-8px'>{t('settings.noConfiguredModels')}</h3>
            <p className='text-14px text-t-secondary text-center max-w-400px'>
              {t('settings.needHelpConfigGuide')}
              <a href='https://zoya.local/wiki/LLM-Configuration' target='_blank' rel='noopener noreferrer' className='text-[rgb(var(--primary-6))] hover:text-[rgb(var(--primary-5))] underline ml-4px'>
                {t('settings.configGuide')}
              </a>
              {t('settings.configGuideSuffix')}
            </p>
          </div>
        ) : (
          <div className='space-y-16px'>
            {(data || []).map((platform: IProvider) => (
              <div key={platform.id} className='bg-[var(--color-bg-2)] rd-12px p-16px mb-16px'>
                <div className='flex items-center justify-between mb-10px'>
                  <h4 className='text-16px font-500 text-t-primary'>{platform.name}</h4>
                  <div className='flex items-center gap-4px'>
                    <Button size='mini' className='!w-28px !h-28px !min-w-28px text-t-secondary hover:text-t-primary' icon={<Plus size='14' />} onClick={() => addModelModalCtrl.open({ data: platform })} />
                    <Button size='mini' className='!w-28px !h-28px !min-w-28px text-t-secondary hover:text-t-primary' icon={<Write size='14' />} onClick={() => editModalCtrl.open({ data: platform })} />
                    <Popconfirm title={t('settings.deleteAllModelConfirm')} onOk={() => removePlatform(platform.id)}>
                      <Button size='mini' className='!w-28px !h-28px !min-w-28px text-t-secondary hover:text-t-primary' icon={<DeleteFour size='18' strokeWidth={2} />} />
                    </Popconfirm>
                  </div>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8px'>
                  {(platform.models ?? []).map((model: string) => (
                    <Button key={model} type='outline' shape='round' size='default' onClick={() => selectModel(platform.id, model)} className='justify-start text-t-primary rd-100px h-40px px-16px'>
                      {model}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </AionScrollArea>
    </div>
  );
};

export default ModelModalContent;