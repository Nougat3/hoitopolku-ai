import {
  StrongAuthNotConfiguredError,
  type StrongAuthProvider,
  type StrongAuthStartOptions
} from '@/lib/strong-auth/types';
import { getStrongAuthConfig } from '@/lib/strong-auth/config';

function buildOidcAuthorizeUrl(
  issuer: string,
  authorizePath: string,
  clientId: string,
  options: StrongAuthStartOptions,
  scope = 'openid profile'
): string {
  const base = issuer.replace(/\/$/, '');
  const path = authorizePath.startsWith('/') ? authorizePath : `/${authorizePath}`;
  const url = new URL(`${base}${path}`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', options.redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', options.state);
  if (options.codeChallenge) {
    url.searchParams.set('code_challenge', options.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }
  return url.toString();
}

export const teliaProvider: StrongAuthProvider = {
  id: 'telia',
  label: 'Telia Tunnistus',
  isConfigured() {
    const { telia } = getStrongAuthConfig();
    return Boolean(telia.issuer && telia.clientId);
  },
  buildAuthorizeUrl(options) {
    const { telia } = getStrongAuthConfig();
    if (!telia.issuer || !telia.clientId) {
      throw new StrongAuthNotConfiguredError('telia');
    }
    return buildOidcAuthorizeUrl(
      telia.issuer,
      telia.authorizePath,
      telia.clientId,
      options
    );
  }
};

export const signicatProvider: StrongAuthProvider = {
  id: 'signicat',
  label: 'Signicat',
  isConfigured() {
    const { signicat } = getStrongAuthConfig();
    return Boolean(signicat.issuer && signicat.clientId);
  },
  buildAuthorizeUrl(options) {
    const { signicat } = getStrongAuthConfig();
    if (!signicat.issuer || !signicat.clientId) {
      throw new StrongAuthNotConfiguredError('signicat');
    }
    return buildOidcAuthorizeUrl(
      signicat.issuer,
      signicat.authorizePath,
      signicat.clientId,
      options
    );
  }
};
