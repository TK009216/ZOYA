import { configService } from '@/common/config/configService';
import type { OnboardingState } from './types';
import { DEFAULT_ONBOARDING } from './types';

const KEY = 'zoya.onboarding';

export class OnboardingManager {
  private state: OnboardingState;

  constructor() {
    this.state = this.load();
  }

  private load(): OnboardingState {
    try {
      const saved = configService.get(KEY);
      if (saved && typeof saved === 'object') {
        return { ...DEFAULT_ONBOARDING, ...saved } as OnboardingState;
      }
    } catch {}
    return { ...DEFAULT_ONBOARDING };
  }

  private save() {
    try { configService.set(KEY, this.state); } catch {}
  }

  getState(): OnboardingState { return this.state; }

  isCompleted(): boolean { return this.state.completed; }

  update(partial: Partial<OnboardingState>) {
    this.state = { ...this.state, ...partial };
    this.save();
  }

  goToStep(step: number) {
    if (step >= 0 && step < 9) {
      this.state.currentStep = step;
      this.save();
    }
  }

  nextStep() {
    if (this.state.currentStep < 8) {
      this.state.currentStep++;
      this.save();
    }
  }

  prevStep() {
    if (this.state.currentStep > 0) {
      this.state.currentStep--;
      this.save();
    }
  }

  complete() {
    this.state.completed = true;
    this.state.completedAt = Date.now();
    this.save();
  }

  reset() {
    this.state = { ...DEFAULT_ONBOARDING };
    this.save();
  }

  async verifyApiKey(key: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.opencode.ai/v1/models', {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      try {
        const res = await fetch('https://api.opencode.ai/v1/models?limit=1', {
          headers: { Authorization: `Bearer ${key}` },
        });
        return res.ok;
      } catch { return false; }
    }
  }

  async verifyModel(apiKey: string, modelId: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.opencode.ai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      const models = data.data ?? data.models ?? [];
      return models.some((m: any) => (m.id ?? m.name ?? '').includes(modelId));
    } catch { return false; }
  }

  requestLocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve(null),
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  async savePreferences() {
    try {
      const prefs = {
        userName: this.state.name || 'Sir',
        preferredMode: this.state.preferredMode,
        knownFacts: this.state.hobbies.length ? [`Hobbies: ${this.state.hobbies.join(', ')}`] : [],
        commonTasks: this.state.favoriteWork ? [this.state.favoriteWork] : [],
        homeLocation: this.state.homeLocation,
        latitude: this.state.latitude,
        longitude: this.state.longitude,
        locationAccuracy: this.state.locationAccuracy,
        preferences: { nature: this.state.nature },
      };
      await fetch('/api/zoya/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prefs),
      });
    } catch {}
  }
}

export const onboardingManager = new OnboardingManager();
