import type { BillingPlanId } from '@/lib/billing/types';

function flag(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export interface StripeClientConfig {
  enabled: boolean;
  showComingSoon: boolean;
  publishableKey: string;
  priceIds: Record<BillingPlanId, string>;
  successPath: string;
  cancelPath: string;
}

export function getStripeConfig(): StripeClientConfig {
  return {
    enabled: flag(import.meta.env.VITE_STRIPE_ENABLED),
    showComingSoon: flag(import.meta.env.VITE_STRIPE_SHOW_COMING_SOON ?? 'true'),
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
    priceIds: {
      starter: import.meta.env.VITE_STRIPE_PRICE_STARTER ?? '',
      pro: import.meta.env.VITE_STRIPE_PRICE_PRO ?? '',
      clinic: import.meta.env.VITE_STRIPE_PRICE_CLINIC ?? ''
    },
    successPath: '/doctor/billing?status=success',
    cancelPath: '/doctor/billing?status=cancel'
  };
}

export function isStripeReady(): boolean {
  const cfg = getStripeConfig();
  if (!cfg.enabled) return false;
  // At least one price id + publishable key for live checkout
  const hasPrice = Object.values(cfg.priceIds).some((id) => Boolean(id));
  return Boolean(cfg.publishableKey && hasPrice);
}
