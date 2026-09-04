/**
 * Provider-agnostic strong authentication (FTN / eID).
 * Swap Telia ↔ Signicat without changing login UI.
 */

export type StrongAuthProviderId = 'telia' | 'signicat';

export interface StrongAuthIdentity {
  /** Stable subject from IdP (oid / sub). Never store raw SSN in localStorage. */
  subject: string;
  /** Official name from IdP, if provided */
  fullName?: string;
  /** Hashed or tokenised national ID reference — prefer server-side only */
  nationalIdHash?: string;
  email?: string;
  provider: StrongAuthProviderId;
  rawClaims?: Record<string, unknown>;
}

export interface StrongAuthStartOptions {
  /** Where IdP should return after login */
  redirectUri: string;
  /** Optional UI hint: patient vs doctor flow */
  intent?: 'login' | 'link';
  /** PKCE / state stored by caller */
  state: string;
  codeChallenge?: string;
}

export interface StrongAuthProvider {
  readonly id: StrongAuthProviderId;
  readonly label: string;
  /** True when env credentials are present (can redirect to real IdP). */
  isConfigured(): boolean;
  /** Build authorize URL (OIDC). */
  buildAuthorizeUrl(options: StrongAuthStartOptions): string;
}

export class StrongAuthNotConfiguredError extends Error {
  constructor(provider: StrongAuthProviderId) {
    super(
      `${provider}-tunnistus ei ole vielä konfiguroitu. Sopimus + env-avaimet tarvitaan julkaisuun.`
    );
    this.name = 'StrongAuthNotConfiguredError';
  }
}

export class StrongAuthDisabledError extends Error {
  constructor() {
    super('Vahva tunnistus on poistettu käytöstä (VITE_STRONG_AUTH_ENABLED).');
    this.name = 'StrongAuthDisabledError';
  }
}
