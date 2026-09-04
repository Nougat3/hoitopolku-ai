import { describe, expect, it } from 'vitest';
import { BILLING_PLANS } from '@/lib/billing/types';
import { getStripeConfig, isStripeReady } from '@/lib/billing/config';

describe('billing foundation', () => {
  it('defines three plans', () => {
    expect(BILLING_PLANS.map((p) => p.id)).toEqual(['starter', 'pro', 'clinic']);
    expect(BILLING_PLANS.every((p) => p.priceEur > 0)).toBe(true);
  });

  it('defaults to disabled / not ready without env', () => {
    const cfg = getStripeConfig();
    expect(cfg.enabled).toBe(false);
    expect(isStripeReady()).toBe(false);
  });
});
