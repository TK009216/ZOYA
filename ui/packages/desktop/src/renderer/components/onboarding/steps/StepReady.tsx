import { Button, Typography, Tag, Descriptions } from '@arco-design/web-react';
import React from 'react';
import type { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onComplete: () => void;
}

const StepReady: React.FC<Props> = ({ state, onComplete }) => (
  <div style={{ textAlign: 'center', padding: '20px' }}>
    <div style={{ fontSize: 72, marginBottom: 16 }}>🚀</div>
    <Typography.Title heading={3}>All Set, {state.name || 'Bande'}!</Typography.Title>
    <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 24, maxWidth: 450, margin: '0 auto 24px', lineHeight: 1.6 }}>
      ZOYA ready hai! Jo bhi kaam ho — coding, research, PC control, automation — bas bolo.
    </Typography.Text>

    <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left', marginBottom: 24 }}>
      <Descriptions
        column={1}
        title='Setup Summary'
        data={[
          { label: '👤 Name', value: state.name || '—' },
          { label: '🎯 Mode', value: <Tag>{state.preferredMode}</Tag> },
          { label: '🔑 API Verified', value: state.apiVerified ? '✅ Yes' : '❌ No' },
          { label: '📍 Location', value: state.locationGiven ? state.homeLocation : '⏳ Later' },
          { label: '🎨 Theme', value: state.selectedTheme },
          { label: '🔍 PC Scan', value: state.scanCompleted ? '✅ Done' : '⏳ Skipped' },
        ]}
        labelStyle={{ paddingRight: 16, fontWeight: 600 }}
        valueStyle={{ color: 'var(--text-secondary)' }}
      />
    </div>

    <Button type='primary' size='large' onClick={onComplete} style={{ minWidth: 200 }}>
      🚀 Start Using ZOYA!
    </Button>
  </div>
);

export default StepReady;
