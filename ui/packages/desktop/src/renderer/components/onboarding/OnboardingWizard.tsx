import { Button, Steps, Typography } from '@arco-design/web-react';
import React, { useCallback, useState } from 'react';
import { onboardingManager } from './OnboardingManager';
import StepWelcome from './steps/StepWelcome';
import StepApiKey from './steps/StepApiKey';
import StepPreferences from './steps/StepPreferences';
import StepProvider from './steps/StepProvider';
import StepTheme from './steps/StepTheme';
import StepLocation from './steps/StepLocation';
import StepDirectories from './steps/StepDirectories';
import StepPcScan from './steps/StepPcScan';
import StepReady from './steps/StepReady';
import type { OnboardingState } from './types';
import { DEFAULT_ONBOARDING, STEP_ICONS, STEP_LABELS, TOTAL_STEPS } from './types';
import './onboarding.css';

interface Props {
  onComplete: () => void;
}

const OnboardingWizard: React.FC<Props> = ({ onComplete }) => {
  const [state, setState] = useState<OnboardingState>(onboardingManager.getState);

  const update = useCallback((partial: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      onboardingManager.update(partial);
      return next;
    });
  }, []);

  const goToStep = (step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setState((prev) => ({ ...prev, currentStep: step }));
      onboardingManager.goToStep(step);
    }
  };

  const next = () => {
    if (state.currentStep < TOTAL_STEPS - 1) {
      goToStep(state.currentStep + 1);
      onboardingManager.nextStep();
    }
  };

  const prev = () => {
    if (state.currentStep > 0) {
      goToStep(state.currentStep - 1);
      onboardingManager.prevStep();
    }
  };

  const handleComplete = useCallback(async () => {
    onboardingManager.complete();
    await onboardingManager.savePreferences();
    onComplete();
  }, [onComplete]);

  const handleReset = () => {
    onboardingManager.reset();
    setState({ ...DEFAULT_ONBOARDING });
  };

  const canNext = (): boolean => {
    switch (state.currentStep) {
      case 0: return state.name.trim().length > 0;
      case 1: return state.apiVerified;
      case 2: return true;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7: return state.scanCompleted;
      case 8: return true;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 0: return <StepWelcome state={state} onUpdate={update} />;
      case 1: return <StepApiKey state={state} onUpdate={update} />;
      case 2: return <StepPreferences state={state} onUpdate={update} />;
        case 3: return <StepProvider apiKey={state.apiKey} />;
      case 4: return <StepTheme state={state} onUpdate={update} />;
      case 5: return <StepLocation state={state} onUpdate={update} />;
      case 6: return <StepDirectories state={state} onUpdate={update} />;
      case 7: return <StepPcScan state={state} onUpdate={update} />;
      case 8: return <StepReady state={state} onComplete={handleComplete} />;
      default: return null;
    }
  };

  return (
    <div className='onboarding-overlay'>
      <div className='onboarding-container'>
        <div className='onboarding-sidebar'>
          <div className='onboarding-brand'>
            <div className='onboarding-logo'>✦</div>
            <Typography.Title heading={5} style={{ margin: 0, color: '#fff' }}>ZOYA Setup</Typography.Title>
          </div>
          <Steps
            direction='vertical'
            current={state.currentStep}
            onChange={goToStep}
            style={{ marginTop: 24 }}
          >
            {STEP_LABELS.map((label, i) => (
              <Steps.Step key={i} title={label} description={STEP_ICONS[i]} />
            ))}
          </Steps>
        </div>
        <div className='onboarding-main'>
          <div className='onboarding-header'>
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              Step {state.currentStep + 1} of {TOTAL_STEPS}
            </Typography.Text>
            <Button type='text' size='mini' onClick={handleReset} style={{ color: 'var(--text-disabled)' }}>
              Reset
            </Button>
          </div>
          <div className='onboarding-step-content'>
            {renderStep()}
          </div>
          <div className='onboarding-footer'>
            <div>
              {state.currentStep > 0 && (
                <Button onClick={prev}>Back</Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {state.currentStep < TOTAL_STEPS - 1 && (
                <Button type='primary' disabled={!canNext()} onClick={next}>
                  Continue
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
