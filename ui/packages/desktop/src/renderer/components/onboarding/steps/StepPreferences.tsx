import { Input, Select, Tag, Typography } from '@arco-design/web-react';
import React, { useState } from 'react';
import type { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onUpdate: (p: Partial<OnboardingState>) => void;
}

const MODE_OPTS = [
  { label: '⚡ Fast — Quick, concise', value: 'fast' },
  { label: '🔧 Pro — Balanced, detailed', value: 'pro' },
  { label: '🧠 Expert — Deep, comprehensive', value: 'expert' },
];

const NATURE_OPTS = [
  { label: '🎯 Goal-oriented, get things done', value: 'goal' },
  { label: '🔬 Curious, love exploring', value: 'curious' },
  { label: '🎨 Creative, experimental', value: 'creative' },
  { label: '📐 Structured, methodical', value: 'structured' },
  { label: '⚡ Fast-paced, efficiency first', value: 'fast' },
];

const HOBBIES_LIST = ['Coding', 'Design', 'Gaming', 'Music', 'Reading', 'Writing', 'Learning', 'Trading', 'Investing', 'Cooking', 'Travel', 'Photography', 'AI/ML', 'Cybersecurity', 'Data Science'];

const StepPreferences: React.FC<Props> = ({ state, onUpdate }) => {
  const [hobbyInput, setHobbyInput] = useState('');

  const toggleHobby = (h: string) => {
    const set = new Set(state.hobbies);
    if (set.has(h)) set.delete(h); else set.add(h);
    onUpdate({ hobbies: [...set] });
  };

  return (
    <div style={{ padding: '20px', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 64 }}>🎯</div>
        <Typography.Title heading={4}>Your Preferences</Typography.Title>
        <Typography.Text type='secondary'>ZOYA ko batao tum kaise ho — woh usi hisaab se adjust karegi</Typography.Text>
      </div>

      {/* Mode */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Default Mode</Typography.Text>
        <Select value={state.preferredMode} onChange={(v) => onUpdate({ preferredMode: v })} options={MODE_OPTS} style={{ width: '100%' }} />
      </div>

      {/* Nature */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Tumhari Nature</Typography.Text>
        <Select value={state.nature} onChange={(v) => onUpdate({ nature: v })} options={NATURE_OPTS} placeholder='Choose your style...' style={{ width: '100%' }} allowClear />
      </div>

      {/* Hobbies */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Hobbies (click to select)</Typography.Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {HOBBIES_LIST.map((h) => (
            <Tag
              key={h}
              color={state.hobbies.includes(h) ? 'blue' : undefined}
              style={{ cursor: 'pointer', padding: '2px 10px' }}
              onClick={() => toggleHobby(h)}
            >
              {h}
            </Tag>
          ))}
        </div>
        <Input
          size='mini'
          placeholder='Ya khud likho...'
          value={hobbyInput}
          onChange={setHobbyInput}
          onPressEnter={() => { if (hobbyInput.trim() && !state.hobbies.includes(hobbyInput.trim())) { onUpdate({ hobbies: [...state.hobbies, hobbyInput.trim()] }); setHobbyInput(''); } }}
          style={{ marginTop: 6, width: 200 }}
        />
      </div>

      {/* Favorite Work */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Favorite kaam / project type?</Typography.Text>
        <Input placeholder='e.g. Web apps, Automation, Data analysis...' value={state.favoriteWork} onChange={(v) => onUpdate({ favoriteWork: v })} />
      </div>
    </div>
  );
};

export default StepPreferences;
