import { getStrongAuthConfig, strongAuthCallbackUrl } from '@/lib/strong-auth/config';
import { signicatProvider, teliaProvider } from '@/lib/strong-auth/providers';
import {
  StrongAuthDisabledError,
  StrongAuthNotConfiguredError,
  type StrongAuthProvider
} from '@/lib/strong-auth/types';

const STATE_KEY = 'hp_strong_auth_state';
const VERIFIER_KEY = 'hp_strong_auth_verifier';

export function getActiveStrongAuthProvider(): StrongAuthProvider {
  const { provider } = getStrongAuthConfig();
  return provider === 'signicat' ? signicatProvider : teliaProvider;
}

function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Start strong auth redirect. Throws if feature disabled or provider not configured.
 */
export async function startStrongAuth(): Promise<void> {
  const cfg = getStrongAuthConfig();
  if (!cfg.enabled) throw new StrongAuthDisabledError();

  const provider = getActiveStrongAuthProvider();
  if (!provider.isConfigured()) {
    throw new StrongAuthNotConfiguredError(provider.id);
  }

  const state = randomString(16);
  const verifier = randomString(32);
  const challenge = await sha256Base64Url(verifier);

  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const url = provider.buildAuthorizeUrl({
    redirectUri: strongAuthCallbackUrl(),
    state,
    codeChallenge: challenge,
    intent: 'login'
  });

  window.location.assign(url);
}

export function consumeStrongAuthPkce(): {
  state: string | null;
  verifier: string | null;
} {
  const state = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  return { state, verifier };
}

export {
  getStrongAuthConfig,
  strongAuthCallbackUrl
} from '@/lib/strong-auth/config';
export type {
  StrongAuthIdentity,
  StrongAuthProvider,
  StrongAuthProviderId
} from '@/lib/strong-auth/types';
export {
  StrongAuthDisabledError,
  StrongAuthNotConfiguredError
} from '@/lib/strong-auth/types';
