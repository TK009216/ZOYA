import { Card, Typography } from '@arco-design/web-react';
import React from 'react';
import type { OnboardingState } from '../types';
import { useThemeContext } from '@renderer/hooks/context/ThemeContext';

const THEMES = [
  { id: 'zoya-fast', name: '⚡ Fast', color: '#00bcd4', desc: 'Cyan energy, modern vibe' },
  { id: 'zoya-pro', name: '🔧 Pro', color: '#2196f3', desc: 'Professional blue, balanced' },
  { id: 'zoya-expert', name: '🧠 Expert', color: '#ff9800', desc: 'Deep amber, analytical' },
  { id: 'zoya-pink', name: '🌸 ZOYA Pink', color: '#e91e63', desc: 'Signature pink' },
  { id: 'hacker-green', name: '💚 Hacker', color: '#2ecc71', desc: 'Terminal green' },
  { id: 'midnight-purple', name: '🌙 Midnight', color: '#9c27b0', desc: 'Dark purple' },
];

interface Props {
  state: OnboardingState;
  onUpdate: (p: Partial<OnboardingState>) => void;
}

const StepTheme: React.FC<Props> = ({ state, onUpdate }) => {
  const { selectTheme } = useThemeContext();

  const handleSelect = (id: string) => {
    onUpdate({ selectedTheme: id });
    selectTheme(id);
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎨</div>
      <Typography.Title heading={4}>Choose Your Theme</Typography.Title>
      <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 24 }}>
        Jo look pasand ho woh chuno — baad mein bhi change kar sakte ho
      </Typography.Text>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 500, margin: '0 auto' }}>
        {THEMES.map((t) => (
          <Card
            key={t.id}
            hoverable
            size='small'
            style={{
              cursor: 'pointer', textAlign: 'center',
              border: state.selectedTheme === t.id ? `2px solid ${t.color}` : '1px solid var(--border-base)',
              boxShadow: state.selectedTheme === t.id ? `0 0 12px ${t.color}66` : 'none',
              transition: 'all 0.2s',
            }}
            onClick={() => handleSelect(t.id)}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>●</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StepTheme;
