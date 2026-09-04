import { describe, expect, it } from 'vitest';
import { teliaProvider, signicatProvider } from '@/lib/strong-auth/providers';
import { StrongAuthNotConfiguredError } from '@/lib/strong-auth/types';

describe('strong-auth providers', () => {
  it('exposes stable ids and labels', () => {
    expect(teliaProvider.id).toBe('telia');
    expect(signicatProvider.id).toBe('signicat');
    expect(teliaProvider.label.length).toBeGreaterThan(0);
  });

  it('throws NotConfigured without issuer/client id', () => {
    expect(teliaProvider.isConfigured()).toBe(false);
    expect(() =>
      teliaProvider.buildAuthorizeUrl({
        redirectUri: 'http://localhost:3000/auth/callback',
        state: 'abc'
      })
    ).toThrow(StrongAuthNotConfiguredError);
  });
});
