/**
 * @license
 * Copyright 2025 ZOYA (zoya.local)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { configService } from '@/common/config/configService';
import type { IConversationMcpStatus, IProvider, TChatConversation, TProviderWithModel } from '@/common/config/storage';
import { uuid } from '@/common/utils';
import addChatIcon from '@/renderer/assets/icons/add-chat.svg';
import AgentModeSelector, { type AgentModeSelectorHandle } from '@/renderer/components/agent/AgentModeSelector';
import { CronJobManager } from '@/renderer/pages/cron';
import { useLayoutContext } from '@/renderer/hooks/context/LayoutContext';
import { usePresetAssistantInfo, resolveAssistantConfigId } from '@/renderer/hooks/agent/usePresetAssistantInfo';
import { iconColors } from '@/renderer/styles/colors';
import { Button, Dropdown, Menu, Message, Tooltip, Typography } from '@arco-design/web-react';
import { History } from '@icon-park/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { emitter } from '../../../utils/emitter';
import AcpChat from '../platforms/acp/AcpChat';
import ChatLayout from './ChatLayout';
import ChatSlider from './ChatSlider.tsx';
import AcpModelSelector from '@/renderer/components/agent/AcpModelSelector';
import { saveAionrsDefaultModel } from '@/renderer/pages/guid/hooks/agentSelectionUtils';
import { getConversationOrNull } from '@/renderer/pages/conversation/utils/conversationCache';
import { getConversationCreateErrorMessage } from '@/renderer/pages/conversation/utils/conversationCreateError';

import GoogleModelSelector from '../platforms/gemini/GoogleModelSelector';
import AionrsChat from '../platforms/aionrs/AionrsChat';
import AionrsModelSelector from '../platforms/aionrs/AionrsModelSelector';
import { useAionrsModelSelection } from '../platforms/aionrs/useAionrsModelSelection';
import { useConversationRuntimeView } from '../runtime/useConversationRuntimeView';
import { isConversationProcessing } from '../utils/conversationRuntime';
import { isLegacyReadOnlyConversationType } from '../utils/conversationRuntime';
import LegacyReadOnlyConversation from '../platforms/legacy/LegacyReadOnlyConversation';
// import SkillRuleGenerator from './components/SkillRuleGenerator'; // Temporarily hidden

/** Check whether a specific skill is mounted on the conversation. */
const hasLoadedSkill = (conversation: TChatConversation | undefined, skillName: string): boolean => {
  const skills = (conversation?.extra as { skills?: string[] } | undefined)?.skills;
  return skills?.includes(skillName) ?? false;
};

const _AssociatedConversation: React.FC<{ conversation_id: string }> = ({ conversation_id }) => {
  const { data } = useSWR(['getAssociateConversation', conversation_id], () =>
    ipcBridge.conversation.getAssociateConversation.invoke({ conversation_id })
  );
  const navigate = useNavigate();
  const list = useMemo(() => {
    if (!data?.length) return [];
    return data.filter((conversation) => conversation.id !== conversation_id);
  }, [data]);
  if (!list.length) return null;
  return (
    <Dropdown
      droplist={
        <Menu
          onClickMenuItem={(key) => {
            Promise.resolve(navigate(`/conversation/${key}`)).catch((error) => {
              console.error('Navigation failed:', error);
            });
          }}
        >
          {list.map((conversation) => {
            return (
              <Menu.Item key={conversation.id}>
                <Typography.Ellipsis className={'max-w-300px'}>{conversation.name}</Typography.Ellipsis>
              </Menu.Item>
            );
          })}
        </Menu>
      }
      trigger={['click']}
    >
      <Button
        size='mini'
        icon={
          <History
            theme='filled'
            size='14'
            fill={iconColors.primary}
            strokeWidth={2}
            strokeLinejoin='miter'
            strokeLinecap='square'
          />
        }
      ></Button>
    </Dropdown>
  );
};

const _AddNewConversation: React.FC<{ conversation: TChatConversation }> = ({ conversation }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isCreatingRef = useRef(false);
  if (!conversation.extra?.workspace) return null;
  return (
    <Tooltip content={t('conversation.workspace.createNewConversation')}>
      <Button
        size='mini'
        icon={<img src={addChatIcon} alt='Add chat' className='w-14px h-14px block m-auto' />}
        onClick={async () => {
          if (isCreatingRef.current) return;
          isCreatingRef.current = true;
          try {
            const id = uuid();
            // Fetch latest conversation from DB to ensure session_mode is current
            const latest = await getConversationOrNull(conversation.id);
            const source = latest || conversation;
            await ipcBridge.conversation.createWithConversation.invoke({
              conversation: {
                ...source,
                id,
                created_at: Date.now(),
                modified_at: Date.now(),
                // Clear ACP session fields to prevent new conversation from inheriting old session context
                extra:
                  source.type === 'acp'
                    ? { ...source.extra, acp_session_id: undefined, acp_session_updated_at: undefined }
                    : source.extra,
              } as TChatConversation,
            });

            // NEW: Apply the global default model immediately after creation
            const global = configService.get('aionrs.globalDefault');
            if (global?.providerId && global?.model) {
              await ipcBridge.conversation.update.invoke({
                id,
                updates: {
                  model: {
                    id: global.providerId,
                    use_model: global.model,
                  } as TProviderWithModel,
                },
              });
            }

            void navigate(`/conversation/${id}`);
            emitter.emit('chat.history.refresh');
          } catch (error) {
            console.error('Failed to create conversation:', error);
            Message.error(getConversationCreateErrorMessage(error, t));
          } finally {
            isCreatingRef.current = false;
          }
        }}
      />
    </Tooltip>
  );
};

type AionrsConversation = Extract<TChatConversation, { type: 'aionrs' }>;

const AionrsConversationPanel: React.FC<{ conversation: AionrsConversation; sliderTitle: React.ReactNode }> = ({
  conversation,
  sliderTitle,
}) => {
  const runtimeView = useConversationRuntimeView(conversation.id);
  const aionrsAssistantId = resolveAssistantConfigId(conversation) ?? undefined;
  const persistGlobalPreference = !aionrsAssistantId;
  const onSelectModel = useCallback(
    async (_provider: IProvider, modelName: string) => {
      const selected = { ..._provider, use_model: modelName } as TProviderWithModel;
      // Kill running agent on model switch — will be rebuilt with new model on next message
      if (runtimeView.activeTurnId) {
        const result = await ipcBridge.conversation.stop.invoke({
          conversation_id: conversation.id,
          turn_id: runtimeView.activeTurnId,
        });
        runtimeView.markStopAcknowledged(runtimeView.activeTurnId, result.runtime);
      }
      const ok = await ipcBridge.conversation.update.invoke({ id: conversation.id, updates: { model: selected } });
      if (ok && persistGlobalPreference) void saveAionrsDefaultModel(_provider.id, modelName);
      return Boolean(ok);
    },
    [conversation.id, persistGlobalPreference, runtimeView]
  );

  const modelSelection = useAionrsModelSelection({
    initialModel: conversation.model,
    onSelectModel,
  });
  const workspaceEnabled = Boolean(conversation.extra?.workspace);
  const { info: presetAssistantInfo } = usePresetAssistantInfo(conversation);
  const layout = useLayoutContext();
  // Mobile: model selection moved into the sendbox `+` action sheet to free up
  // header space; the dropdown stays available on desktop and tablets ≥768px.
  const isMobile = Boolean(layout?.isMobile);

  const chatLayoutProps = {
    title: conversation.name,
    siderTitle: sliderTitle,
    sider: <ChatSlider conversation={conversation} />,
    headerExtra: (
      <div className='flex items-center gap-8px'>
        <CronJobManager
          conversation_id={conversation.id}
          cron_job_id={conversation.extra?.cron_job_id as string | undefined}
          hasCronSkill={hasLoadedSkill(conversation, 'cron')}
        />
        {/* Model selector hidden – default model is applied automatically */}
      </div>
    ),
    workspaceEnabled,
    workspacePath: conversation.extra?.workspace,
    isTemporaryWorkspace: (conversation.extra as { is_temporary_workspace?: boolean } | undefined)
      ?.is_temporary_workspace,
    backend: 'aionrs' as const,
    presetAssistant: presetAssistantInfo ? { ...presetAssistantInfo, id: aionrsAssistantId } : undefined,
  };

  return (
    <ChatLayout {...chatLayoutProps} conversation_id={conversation.id}>
      <AionrsChat
        conversation_id={conversation.id}
        workspace={conversation.extra.workspace}
        modelSelection={modelSelection}
        session_mode={conversation.extra?.session_mode}
        cron_job_id={(conversation.extra as { cron_job_id?: string })?.cron_job_id}
        loadedSkills={(conversation.extra as { skills?: string[] } | undefined)?.skills}
        loadedMcpServers={(conversation.extra as { mcp_servers?: string[] } | undefined)?.mcp_servers}
        loadedMcpStatuses={
          (conversation.extra as { mcp_statuses?: IConversationMcpStatus[] } | undefined)?.mcp_statuses
        }
        agent_name={presetAssistantInfo?.name}
        assistantId={aionrsAssistantId}
      />
    </ChatLayout>
  );
};

const ChatConversation: React.FC<{
  conversation?: TChatConversation;
  hideSendBox?: boolean;
}> = ({ conversation, hideSendBox }) => {
  const { t } = useTranslation();
  const workspaceEnabled = Boolean(conversation?.extra?.workspace);
  const layout = useLayoutContext();
  const isMobile = Boolean(layout?.isMobile);

  const isAionrsConversation = conversation?.type === 'aionrs';
  const isLegacyReadOnlyConversation = isLegacyReadOnlyConversationType(conversation?.type);
  const resolvedHideSendBox = hideSendBox || isLegacyReadOnlyConversationType(conversation?.type);

  // ACP runtime view — used for mid-reply mode lock
  const acpRuntimeView = useConversationRuntimeView(conversation?.id ?? '');
  const isProcessing = acpRuntimeView.isProcessing;

  // 使用统一的 Hook 获取预设助手信息（ACP/Codex 会话）
  // Use unified hook for preset assistant info (ACP/Codex conversations)
  const acpConversation = isAionrsConversation ? undefined : conversation;
  const { info: presetAssistantInfo, isLoading: isLoadingPreset } = usePresetAssistantInfo(acpConversation);
  const acpAssistantId = acpConversation ? (resolveAssistantConfigId(acpConversation) ?? undefined) : undefined;

  const conversationAgentName = (conversation?.extra as { agent_name?: string } | undefined)?.agent_name;
  const assistantDisplayName = presetAssistantInfo?.name || conversationAgentName;

  const conversationNode = useMemo(() => {
    if (!conversation || isAionrsConversation) return null;
    if (isLegacyReadOnlyConversation) {
      return <LegacyReadOnlyConversation key={conversation.id} conversation={conversation} />;
    }
    switch (conversation.type) {
      case 'acp':
        return (
          <AcpChat
            key={conversation.id}
            conversation_id={conversation.id}
            workspace={conversation.extra?.workspace}
            backend={conversation.extra?.backend || 'claude'}
            session_mode={conversation.extra?.session_mode}
            agent_name={assistantDisplayName}
            cron_job_id={(conversation.extra as { cron_job_id?: string })?.cron_job_id}
            hideSendBox={resolvedHideSendBox}
            loadedSkills={(conversation.extra as { skills?: string[] } | undefined)?.skills}
            loadedMcpServers={(conversation.extra as { mcp_servers?: string[] } | undefined)?.mcp_servers}
            loadedMcpStatuses={
              (conversation.extra as { mcp_statuses?: IConversationMcpStatus[] } | undefined)?.mcp_statuses
            }
            assistantId={acpAssistantId}
          ></AcpChat>
        );
      default:
        return null;
    }
  }, [conversation, isAionrsConversation, isLegacyReadOnlyConversation, assistantDisplayName, resolvedHideSendBox]);

  const sliderTitle = useMemo(() => {
    return (
      <div className='flex items-center justify-between'>
        <span className='text-16px font-bold text-t-primary'>{t('conversation.workspace.title')}</span>
      </div>
    );
  }, [t]);

  if (conversation && conversation.type === 'aionrs') {
    return <AionrsConversationPanel key={conversation.id} conversation={conversation} sliderTitle={sliderTitle} />;
  }

  // 如果有预设助手信息，使用预设助手的 logo 和名称；加载中时不进入 fallback；否则使用 backend 的 logo
  // If preset assistant info exists, use preset logo/name; while loading, avoid fallback; otherwise use backend logo
  const chatLayoutProps = presetAssistantInfo
    ? {
        presetAssistant: { ...presetAssistantInfo, id: acpAssistantId },
      }
    : isLoadingPreset
      ? {} // Still loading custom agents — avoid showing backend logo prematurely
      : {
          backend:
            conversation?.type === 'acp'
              ? conversation?.extra?.backend
              : conversation?.type === 'aionrs'
                ? 'aionrs'
                : conversation?.type === 'codex'
                  ? 'codex'
                  : conversation?.type === 'openclaw-gateway'
                    ? 'openclaw-gateway'
                    : conversation?.type === 'nanobot'
                      ? 'nanobot'
                      : conversation?.type === 'remote'
                        ? 'remote'
                        : undefined,
          agent_name: conversationAgentName,
        };

  // Ref for queued mode changes during processing
  const modeSelectorRef = useRef<AgentModeSelectorHandle>(null);
  const prevProcessingRef = useRef(isProcessing);
  const [modeSyncKey, setModeSyncKey] = useState(0);

  // Apply queued mode changes and sync mode when processing completes
  useEffect(() => {
    if (prevProcessingRef.current && !isProcessing) {
      // Processing just completed — apply any queued mode change
      modeSelectorRef.current?.applyQueuedMode();
      // Refresh mode from backend (in case popup tool changed it)
      if (conversation?.id) {
        ipcBridge.acpConversation.getMode.invoke({ conversation_id: conversation.id }).then((result) => {
          if (result?.mode) {
            setModeSyncKey((k) => k + 1);
          }
        }).catch(() => {});
      }
    }
    prevProcessingRef.current = isProcessing;
  }, [isProcessing, conversation?.id]);

  // Wrapper component to properly position the mode selector in the header
  // Show for ACP and AionRS conversation types (covers ZOYA, Claude, Qwen, etc.)
  const AcpModeSelector = conversation && conversation.type === 'acp' ? (
    <Tooltip
      content={isProcessing ? t('conversation.modeSwitchDuringReply') || 'Mode change after reply completes' : undefined}
    >
      <div className='flex items-center gap-6px'>
        <span className='text-12px text-t-secondary whitespace-nowrap'>Mode:</span>
        <AgentModeSelector
          ref={modeSelectorRef}
          backend={conversation.extra?.backend || 'claude'}
          conversation_id={conversation.id}
          initialMode={conversation.extra?.session_mode}
          compact
          compactLabelType='mode'
          hideCompactLabelPrefixOnMobile
          persistGlobalPreference={false}
          disabled={isProcessing}
          modeSyncKey={modeSyncKey}
          key={conversation.id}
        />
        {isProcessing && (
          <span className='relative flex w-6px h-6px'>
            <span className='animate-ping absolute inline-flex w-full h-full rounded-full bg-sky-400 opacity-75'></span>
            <span className='relative inline-flex rounded-full w-6px h-6px bg-sky-500'></span>
          </span>
        )}
      </div>
    </Tooltip>
  ) : null;

  const headerExtraNode = (
    <div className='flex items-center gap-8px'>
      {conversation && (
        <div className='shrink-0'>
          <CronJobManager
            conversation_id={conversation.id}
            cron_job_id={conversation.extra?.cron_job_id as string | undefined}
            hasCronSkill={hasLoadedSkill(conversation, 'cron')}
          />
        </div>
      )}
      {AcpModeSelector}
    </div>
  );

  return (
    <ChatLayout
      title={conversation?.name}
      {...chatLayoutProps}
      headerExtra={headerExtraNode}
      siderTitle={sliderTitle}
      sider={<ChatSlider conversation={conversation} />}
      workspaceEnabled={workspaceEnabled}
      workspacePath={conversation?.extra?.workspace}
      isTemporaryWorkspace={
        (conversation?.extra as { is_temporary_workspace?: boolean } | undefined)?.is_temporary_workspace
      }
      conversation_id={conversation?.id}
    >
      {conversationNode}
    </ChatLayout>
  );
};

export default ChatConversation;
