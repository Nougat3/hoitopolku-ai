-- Stripe billing mirror (webhook-updated). Clients read own row only.
-- Haettu tuotantokannasta (versio 20260904124057); puuttui repositoriosta.
create table if not exists public.billing_subscriptions (
  id text primary key default ('bil_'::text || replace((extensions.gen_random_uuid())::text, '-'::text, ''::text)),
  user_id text not null references public.users(id),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  price_id text,
  plan text not null default 'starter',
  status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint billing_subscriptions_plan_check check (plan in ('starter', 'pro', 'clinic')),
  constraint billing_subscriptions_status_check check (status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'))
);

create unique index if not exists billing_subscriptions_user_uidx
  on public.billing_subscriptions (user_id);

create index if not exists billing_subscriptions_customer_idx
  on public.billing_subscriptions (stripe_customer_id);

alter table public.billing_subscriptions enable row level security;
alter table public.billing_subscriptions force row level security;

drop policy if exists billing_subscriptions_select_own on public.billing_subscriptions;
create policy billing_subscriptions_select_own
  on public.billing_subscriptions
  for select
  to authenticated
  using (user_id = private.app_user_id());

-- No insert/update/delete for clients — service role / webhooks only.
revoke insert, update, delete on public.billing_subscriptions from authenticated, anon;
grant select on public.billing_subscriptions to authenticated;
