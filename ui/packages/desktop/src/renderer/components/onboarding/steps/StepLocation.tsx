import { Button, Input, Typography, Alert } from '@arco-design/web-react';
import React, { useState } from 'react';
import { onboardingManager } from '../OnboardingManager';
import type { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onUpdate: (p: Partial<OnboardingState>) => void;
}

const StepLocation: React.FC<Props> = ({ state, onUpdate }) => {
  const [locating, setLocating] = useState(false);

  const handleGetLocation = async () => {
    setLocating(true);
    const pos = await onboardingManager.requestLocation();
    if (pos) {
      onUpdate({
        latitude: pos.latitude,
        longitude: pos.longitude,
        locationAccuracy: pos.accuracy,
        locationGiven: true,
        homeLocation: `${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`,
      });
    }
    setLocating(false);
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px', maxWidth: 450, margin: '0 auto' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📍</div>
      <Typography.Title heading={4}>Location</Typography.Title>
      <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 24, lineHeight: 1.6 }}>
        ZOYA teri location jaanti hai to weather, time, aur local info accurately de sakti hai
      </Typography.Text>

      {state.locationGiven ? (
        <Alert
          type='success'
          content={`📍 ${state.homeLocation} (accuracy: ${Math.round(state.locationAccuracy)}m)`}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Button type='primary' long loading={locating} onClick={handleGetLocation} style={{ marginBottom: 12 }}>
          {locating ? 'Getting location...' : '📍 Allow Location Access'}
        </Button>
      )}

      <Typography.Text style={{ fontWeight: 600, display: 'block', marginBottom: 6, marginTop: 12 }}>
        Ya manually likho (city / area)
      </Typography.Text>
      <Input
        placeholder='e.g. Lahore, Pakistan'
        value={state.homeLocation}
        onChange={(v) => onUpdate({ homeLocation: v })}
        style={{ marginBottom: 12 }}
      />

      <Button
        type='text'
        size='small'
        onClick={() => onUpdate({ locationGiven: true, locationLater: true })}
        style={{ fontSize: 12, color: 'var(--text-disabled)' }}
      >
        Skip — I'll set it later
      </Button>
    </div>
  );
};

export default StepLocation;
