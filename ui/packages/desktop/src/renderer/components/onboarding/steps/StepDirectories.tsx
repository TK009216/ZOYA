import { Input, Typography, Tag, Button } from '@arco-design/web-react';
import React from 'react';
import type { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onUpdate: (p: Partial<OnboardingState>) => void;
}

const home = () => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.HOME || process.env.USERPROFILE || 'C:\\Users\\Default';
  }
  return 'C:\\Users\\Default';
};

const StepDirectories: React.FC<Props> = ({ state, onUpdate }) => {

  return (
    <div style={{ padding: '20px', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 64 }}>💾</div>
        <Typography.Title heading={4}>Working Directories</Typography.Title>
        <Typography.Text type='secondary'>ZOYA ko batao kaam kahan karna hai</Typography.Text>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Working Directory <Tag size='small'>Projects yahan save honge</Tag>
        </Typography.Text>
        <Input
          placeholder={home()}
          value={state.workingDirectory}
          onChange={(v) => onUpdate({ workingDirectory: v })}
          addBefore='📁'
        />
        <Typography.Text type='secondary' style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
          Default: {home()}
        </Typography.Text>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Temp Directory <Tag size='small'>Temporary files here</Tag>
        </Typography.Text>
        <Input
          placeholder={`${home()}\\.zoya\\temp`}
          value={state.tempDirectory}
          onChange={(v) => onUpdate({ tempDirectory: v })}
          addBefore='📁'
        />
        <Typography.Text type='secondary' style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
          Default: {home()}\.zoya\temp
        </Typography.Text>
      </div>
    </div>
  );
};

export default StepDirectories;
