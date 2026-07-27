export interface RetryState {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  lastError: string;
  active: boolean;
}

export interface UsageQuota {
  used: number;
  limit: number;
  resetAt: number;
  tier: 'free' | 'pro' | 'enterprise';
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter: number;
}

export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 5,
  delayMs: 5000,
};
