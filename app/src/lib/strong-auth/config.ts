import type { StrongAuthProviderId } from '@/lib/strong-auth/types';

function flag(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export interface StrongAuthConfig {
  enabled: boolean;
  /** Show button even when disabled (greyed / "Tulossa") */
  showComingSoon: boolean;
  provider: StrongAuthProviderId;
  telia: {
    issuer: string;
    clientId: string;
    authorizePath: string;
  };
  signicat: {
    issuer: string;
    clientId: string;
    authorizePath: string;
  };
  callbackPath: string;
}

export function getStrongAuthConfig(): StrongAuthConfig {
  const providerRaw = (import.meta.env.VITE_STRONG_AUTH_PROVIDER ?? 'telia').toLowerCase();
  const provider: StrongAuthProviderId =
    providerRaw === 'signicat' ? 'signicat' : 'telia';

  return {
    enabled: flag(import.meta.env.VITE_STRONG_AUTH_ENABLED),
    showComingSoon: flag(import.meta.env.VITE_STRONG_AUTH_SHOW_COMING_SOON ?? 'true'),
    provider,
    telia: {
      issuer: import.meta.env.VITE_TELIA_OIDC_ISSUER ?? '',
      clientId: import.meta.env.VITE_TELIA_OIDC_CLIENT_ID ?? '',
      authorizePath: import.meta.env.VITE_TELIA_OIDC_AUTHORIZE_PATH ?? '/authorize'
    },
    signicat: {
      issuer: import.meta.env.VITE_SIGNICAT_OIDC_ISSUER ?? '',
      clientId: import.meta.env.VITE_SIGNICAT_OIDC_CLIENT_ID ?? '',
      authorizePath:
        import.meta.env.VITE_SIGNICAT_OIDC_AUTHORIZE_PATH ?? '/auth/open/connect/authorize'
    },
    callbackPath: '/auth/callback'
  };
}

export function strongAuthCallbackUrl(): string {
  if (typeof window === 'undefined') return getStrongAuthConfig().callbackPath;
  return `${window.location.origin}${getStrongAuthConfig().callbackPath}`;
}
