import { Input, Typography } from '@arco-design/web-react';
import React from 'react';
import type { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onUpdate: (p: Partial<OnboardingState>) => void;
}

const StepWelcome: React.FC<Props> = ({ state, onUpdate }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <div style={{ fontSize: 72, marginBottom: 16 }}>👋</div>
    <Typography.Title heading={3}>Welcome to ZOYA!</Typography.Title>
    <Typography.Text type='secondary' style={{ fontSize: 15, display: 'block', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.7 }}>
      Tera apna AI assistant — coding, research, PC control, aur bhi bohot kuch. Pehle thoda setup kar lete hain.
    </Typography.Text>
    <div style={{ maxWidth: 320, margin: '0 auto' }}>
      <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Tera naam kya hai?</Typography.Text>
      <Input
        size='large'
        placeholder='e.g. T.K_009, Sir, Bande...'
        value={state.name}
        onChange={(v) => onUpdate({ name: v })}
        style={{ textAlign: 'center' }}
        onPressEnter={() => { if (state.name.trim()) onUpdate({ startedAt: Date.now() }); }}
      />
      {state.name.trim() && (
        <div style={{ marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
          {state.name === 'T.K_009' ? '🔥 Real one! Welcome back.' : `Nice to meet you, ${state.name}!`}
        </div>
      )}
    </div>
  </div>
);

export default StepWelcome;
