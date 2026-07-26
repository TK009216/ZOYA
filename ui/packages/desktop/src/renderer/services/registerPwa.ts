/**
 * @license
 * Copyright 2025 ZOYA (zoya.local)
 * SPDX-License-Identifier: Apache-2.0
 */

import { isElectronDesktop } from '@renderer/utils/platform';

const SERVICE_WORKER_URL = './sw.js';
const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isPwaRegistrationSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  if (isElectronDesktop() || !('serviceWorker' in navigator)) {
    return false;
  }

  const { protocol, hostname } = window.location;
  const isHttpOrigin = protocol === 'http:' || protocol === 'https:';
  if (!isHttpOrigin) {
    return false;
  }

  return window.isSecureContext || LOCALHOST_HOSTS.has(hostname);
}

export async function registerPwa(): Promise<ServiceWorkerRegistration | undefined> {
  if (!isPwaRegistrationSupported()) {
    return undefined;
  }

  // SW disabled — the server sends Cache-Control: no-store for all assets,
  // so a SW adds complexity (stale cache, white screen on hash mismatch)
  // without benefit. If SW is restored in the future, re-enable this block:
  //   const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: './' });
  //   registration.update().catch(...)
  return undefined;
}

export default registerPwa;
