/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRONG_AUTH_ENABLED?: string;
  readonly VITE_STRONG_AUTH_SHOW_COMING_SOON?: string;
  readonly VITE_STRONG_AUTH_PROVIDER?: string;
  readonly VITE_TELIA_OIDC_ISSUER?: string;
  readonly VITE_TELIA_OIDC_CLIENT_ID?: string;
  readonly VITE_TELIA_OIDC_AUTHORIZE_PATH?: string;
  readonly VITE_SIGNICAT_OIDC_ISSUER?: string;
  readonly VITE_SIGNICAT_OIDC_CLIENT_ID?: string;
  readonly VITE_SIGNICAT_OIDC_AUTHORIZE_PATH?: string;
  readonly VITE_STRIPE_ENABLED?: string;
  readonly VITE_STRIPE_SHOW_COMING_SOON?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PRICE_STARTER?: string;
  readonly VITE_STRIPE_PRICE_PRO?: string;
  readonly VITE_STRIPE_PRICE_CLINIC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
