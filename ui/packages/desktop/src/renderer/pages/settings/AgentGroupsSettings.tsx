/**
 * @license
 * Copyright 2025 ZOYA (zoya.local)
 * SPDX-License-Identifier: Apache-2.0
 *
 * ZOYA Agent Groups Settings — manage agent groups and their agents.
 */

import { Button, Input, Message, Modal, Select, Tag, Card, Collapse, Space, Switch, Typography } from '@arco-design/web-react';
import { AddOne, Delete, Edit, SettingConfig, ThumbsUp, Theme } from '@icon-park/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { configService } from '@/common/config/configService';
import { useThemeContext } from '@renderer/hooks/context/ThemeContext';
import SettingsPageWrapper from './components/SettingsPageWrapper';

const MODE_THEME_MAP: Record<string, string> = {
  fast: 'zoya-fast',
  pro: 'zoya-pro',
  expert: 'zoya-expert',
};

interface GroupAgent {
  name: string;
  description: string;
  systemPrompt: string;
  mode: 'fast' | 'pro' | 'expert' | 'any';
  skills?: string[];
  canAccess?: string[];
}

interface AgentGroup {
  name: string;
  description: string;
  agents: GroupAgent[];
  skills?: string[];
}

interface AgentGroupsConfig {
  currentMode: 'fast' | 'pro' | 'expert';
  groups: AgentGroup[];
}

const MODE_OPTIONS = [
  { label: 'Fast', value: 'fast' },
  { label: 'Pro', value: 'pro' },
  { label: 'Expert', value: 'expert' },
  { label: 'Any', value: 'any' },
];

const MODE_COLORS: Record<string, string> = {
  fast: 'arcoblue',
  pro: 'purple',
  expert: 'red',
  any: 'gray',
};

const defaultAgent: GroupAgent = {
  name: '',
  description: '',
  systemPrompt: '',
  mode: 'fast',
  skills: [],
  canAccess: [],
};

const emptyConfig: AgentGroupsConfig = {
  currentMode: 'fast',
  groups: [],
};

const AgentGroupsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [message, msgContext] = Message.useMessage();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AgentGroupsConfig>(emptyConfig);
  const [editingGroup, setEditingGroup] = useState<AgentGroup | null>(null);
  const [editingAgent, setEditingAgent] = useState<{ groupIdx: number; agent: GroupAgent; agentIdx: number } | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [autoSwitch, setAutoSwitch] = useState(() => configService.get('theme.autoSwitchWithMode') ?? true);
  const { selectTheme } = useThemeContext();
  const didFetch = useRef(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/zoya/agent-groups');
      const data = await res.json();
      if (data && Array.isArray(data.groups)) {
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load agent groups:', err);
    }
  }, []);

  const saveConfig = useCallback(async (cfg: AgentGroupsConfig) => {
    try {
      const res = await fetch('/api/zoya/agent-groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error(await res.text());
      message.success('Agent groups saved');
    } catch (err) {
      message.error(`Failed to save: ${err}`);
    }
  }, [message]);

  const saveMode = useCallback(async (mode: string) => {
    try {
      await fetch('/api/zoya/mode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentMode: mode }),
      });
    } catch (err) {
      console.error('Failed to save mode:', err);
    }
  }, []);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    fetchConfig().finally(() => setLoading(false));
  }, [fetchConfig]);

  const handleModeChange = useCallback((mode: string) => {
    const newConfig = { ...config, currentMode: mode as 'fast' | 'pro' | 'expert' };
    setConfig(newConfig);
    saveMode(mode);
    if (autoSwitch && MODE_THEME_MAP[mode]) {
      selectTheme(MODE_THEME_MAP[mode]);
    }
  }, [config, saveMode, autoSwitch, selectTheme]);

  const handleAutoSwitchChange = useCallback((checked: boolean) => {
    setAutoSwitch(checked);
    configService.setLocal('theme.autoSwitchWithMode', checked);
    if (checked && MODE_THEME_MAP[config.currentMode]) {
      selectTheme(MODE_THEME_MAP[config.currentMode]);
    }
  }, [config.currentMode, selectTheme]);

  const handleAddGroup = useCallback(() => {
    if (!newGroupName.trim()) {
      message.warning('Group name is required');
      return;
    }
    if (config.groups.some((g) => g.name === newGroupName.trim())) {
      message.warning('Group name already exists');
      return;
    }
    const newGroup: AgentGroup = {
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      agents: [],
      skills: [],
    };
    const newConfig = { ...config, groups: [...config.groups, newGroup] };
    setConfig(newConfig);
    saveConfig(newConfig);
    setNewGroupName('');
    setNewGroupDesc('');
    setShowGroupModal(false);
  }, [config, newGroupName, newGroupDesc, saveConfig, message]);

  const handleDeleteGroup = useCallback((idx: number) => {
    const newConfig = { ...config, groups: config.groups.filter((_, i) => i !== idx) };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const handleAddAgent = useCallback((groupIdx: number) => {
    setEditingAgent({ groupIdx, agent: { ...defaultAgent }, agentIdx: -1 });
    setShowAgentModal(true);
  }, []);

  const handleEditAgent = useCallback((groupIdx: number, agentIdx: number) => {
    const agent = config.groups[groupIdx].agents[agentIdx];
    setEditingAgent({ groupIdx, agent: { ...agent }, agentIdx });
    setShowAgentModal(true);
  }, [config]);

  const handleDeleteAgent = useCallback((groupIdx: number, agentIdx: number) => {
    const groups = [...config.groups];
    groups[groupIdx] = { ...groups[groupIdx], agents: groups[groupIdx].agents.filter((_, i) => i !== agentIdx) };
    const newConfig = { ...config, groups };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const handleSaveAgent = useCallback(() => {
    if (!editingAgent) return;
    const { groupIdx, agent, agentIdx } = editingAgent;
    if (!agent.name.trim()) {
      message.warning('Agent name is required');
      return;
    }
    const groups = [...config.groups];
    if (agentIdx === -1) {
      groups[groupIdx] = { ...groups[groupIdx], agents: [...groups[groupIdx].agents, agent] };
    } else {
      const agents = [...groups[groupIdx].agents];
      agents[agentIdx] = agent;
      groups[groupIdx] = { ...groups[groupIdx], agents };
    }
    const newConfig = { ...config, groups };
    setConfig(newConfig);
    saveConfig(newConfig);
    setShowAgentModal(false);
    setEditingAgent(null);
  }, [config, editingAgent, saveConfig, message]);

  if (loading) {
    return (
      <SettingsPageWrapper contentClassName='max-w-1100px'>
        <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
      </SettingsPageWrapper>
    );
  }

  return (
    <SettingsPageWrapper contentClassName='max-w-1100px'>
      {msgContext}
      <Typography.Title heading={4} style={{ marginTop: 0 }}>
        Agent Groups
      </Typography.Title>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Typography.Text>Current Mode:</Typography.Text>
          <Select
            value={config.currentMode}
            onChange={handleModeChange}
            options={MODE_OPTIONS}
            style={{ width: 120 }}
          />
          <Tag color={MODE_COLORS[config.currentMode]}>{config.currentMode.toUpperCase()}</Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Theme />
          <Typography.Text>Auto-switch theme with mode:</Typography.Text>
          <Switch checked={autoSwitch} onChange={handleAutoSwitchChange} />
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            {autoSwitch
              ? `Current: ${config.currentMode.toUpperCase()} → ${MODE_THEME_MAP[config.currentMode] ?? '—'}`
              : 'Theme stays independent of mode'
            }
          </Typography.Text>
        </div>
      </Card>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button type='primary' icon={<AddOne />} onClick={() => setShowGroupModal(true)}>
          Add Group
        </Button>
        <Button onClick={() => { fetchConfig(); message.success('Refreshed'); }}>
          Refresh
        </Button>
      </div>

      {config.groups.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>
            No agent groups yet. Click "Add Group" to create one.
          </div>
        </Card>
      )}

      <Collapse defaultActiveKey={config.groups.map((_, i) => String(i))}>
        {config.groups.map((group, gi) => (
          <Collapse.Item key={String(gi)} name={String(gi)}
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <SettingConfig />
                <strong>{group.name}</strong>
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>{group.description}</Typography.Text>
                <Tag>{group.agents.length} agents</Tag>
              </div>
            }
          >
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <Button size='mini' type='primary' icon={<AddOne />} onClick={() => handleAddAgent(gi)}>
                Add Agent
              </Button>
              <Button size='mini' status='danger' icon={<Delete />} onClick={() => handleDeleteGroup(gi)}>
                Delete Group
              </Button>
            </div>

            {group.agents.map((agent, ai) => (
              <Card key={ai} size='small' style={{ marginBottom: 8 }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThumbsUp />
                    <strong>{agent.name}</strong>
                    <Tag color={MODE_COLORS[agent.mode]}>{agent.mode}</Tag>
                  </div>
                }
                extra={
                  <Space>
                    <Button size='mini' icon={<Edit />} onClick={() => handleEditAgent(gi, ai)} />
                    <Button size='mini' status='danger' icon={<Delete />} onClick={() => handleDeleteAgent(gi, ai)} />
                  </Space>
                }
              >
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>{agent.description}</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Typography.Text style={{ fontSize: 12, fontWeight: 600 }}>Skills: </Typography.Text>
                  {agent.skills && agent.skills.length > 0
                    ? agent.skills.map((s, si) => <Tag key={si} size='small' style={{ marginRight: 4 }}>{s}</Tag>)
                    : <Typography.Text type='secondary' style={{ fontSize: 12 }}>None</Typography.Text>
                  }
                </div>
                <div style={{ marginTop: 4 }}>
                  <Typography.Text style={{ fontSize: 12, fontWeight: 600 }}>Can Access: </Typography.Text>
                  {agent.canAccess && agent.canAccess.length > 0
                    ? agent.canAccess.map((a, ai2) => <Tag key={ai2} size='small' style={{ marginRight: 4 }}>{a}</Tag>)
                    : <Typography.Text type='secondary' style={{ fontSize: 12 }}>ZOYA only</Typography.Text>
                  }
                </div>
              </Card>
            ))}
          </Collapse.Item>
        ))}
      </Collapse>

      {/* Add Group Modal */}
      <Modal
        title='Add Agent Group'
        visible={showGroupModal}
        onOk={handleAddGroup}
        onCancel={() => { setShowGroupModal(false); setNewGroupName(''); setNewGroupDesc(''); }}
      >
        <div style={{ marginBottom: 12 }}>
          <Typography.Text>Group Name *</Typography.Text>
          <Input value={newGroupName} onChange={(v) => setNewGroupName(v)} placeholder='e.g. planner, coding' />
        </div>
        <div>
          <Typography.Text>Description</Typography.Text>
          <Input value={newGroupDesc} onChange={(v) => setNewGroupDesc(v)} placeholder='What this group does' />
        </div>
      </Modal>

      {/* Add/Edit Agent Modal */}
      <Modal
        title={editingAgent?.agentIdx === -1 ? 'Add Agent' : 'Edit Agent'}
        visible={showAgentModal}
        onOk={handleSaveAgent}
        onCancel={() => { setShowAgentModal(false); setEditingAgent(null); }}
        style={{ width: 700 }}
      >
        {editingAgent && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text>Name *</Typography.Text>
              <Input
                value={editingAgent.agent.name}
                onChange={(v) => setEditingAgent({ ...editingAgent, agent: { ...editingAgent.agent, name: v } })}
                placeholder='e.g. fast-planner'
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text>Description</Typography.Text>
              <Input
                value={editingAgent.agent.description}
                onChange={(v) => setEditingAgent({ ...editingAgent, agent: { ...editingAgent.agent, description: v } })}
                placeholder='What this agent does'
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text>Mode</Typography.Text>
              <Select
                value={editingAgent.agent.mode}
                onChange={(v) => setEditingAgent({ ...editingAgent, agent: { ...editingAgent.agent, mode: v } })}
                options={MODE_OPTIONS}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text>System Prompt</Typography.Text>
              <Input.TextArea
                value={editingAgent.agent.systemPrompt}
                onChange={(v) => setEditingAgent({ ...editingAgent, agent: { ...editingAgent.agent, systemPrompt: v } })}
                placeholder='The system prompt for this agent'
                style={{ minHeight: 150 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text>Skills (comma-separated)</Typography.Text>
              <Input
                value={(editingAgent.agent.skills ?? []).join(', ')}
                onChange={(v) => setEditingAgent({
                  ...editingAgent,
                  agent: { ...editingAgent.agent, skills: v.split(',').map((s) => s.trim()).filter(Boolean) },
                })}
                placeholder='plan, architecture, estimation'
              />
            </div>
            <div>
              <Typography.Text>Can Access (comma-separated agent names)</Typography.Text>
              <Input
                value={(editingAgent.agent.canAccess ?? []).join(', ')}
                onChange={(v) => setEditingAgent({
                  ...editingAgent,
                  agent: { ...editingAgent.agent, canAccess: v.split(',').map((s) => s.trim()).filter(Boolean) },
                })}
                placeholder='expert-planner-2, code-reviewer'
              />
            </div>
          </div>
        )}
      </Modal>
    </SettingsPageWrapper>
  );
};

export default AgentGroupsSettings;
