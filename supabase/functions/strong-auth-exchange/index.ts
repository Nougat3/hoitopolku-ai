// Strong auth code → Supabase session exchange.
// Deploy when Telia/Signicat credentials exist.
// Secrets: TELIA_OIDC_CLIENT_SECRET or SIGNICAT_OIDC_CLIENT_SECRET,
//          SUPABASE_SERVICE_ROLE_KEY (to create/link user + mint session)
//
// Until configured, returns 501 so the client shows a clear "ready to wire" message.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const body = await req.json();
    const provider = String(body.provider ?? 'telia');
    const code = String(body.code ?? '');
    const codeVerifier = String(body.code_verifier ?? '');
    const redirectUri = String(body.redirect_uri ?? '');

    if (!code || !codeVerifier || !redirectUri) {
      return new Response(JSON.stringify({ error: 'code, code_verifier ja redirect_uri vaaditaan' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const secret =
      provider === 'signicat'
        ? Deno.env.get('SIGNICAT_OIDC_CLIENT_SECRET')
        : Deno.env.get('TELIA_OIDC_CLIENT_SECRET');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const issuer =
      provider === 'signicat'
        ? Deno.env.get('SIGNICAT_OIDC_ISSUER')
        : Deno.env.get('TELIA_OIDC_ISSUER');
    const clientId =
      provider === 'signicat'
        ? Deno.env.get('SIGNICAT_OIDC_CLIENT_ID')
        : Deno.env.get('TELIA_OIDC_CLIENT_ID');

    if (!secret || !serviceRole || !issuer || !clientId) {
      return new Response(
        JSON.stringify({
          error:
            'strong-auth-exchange ei ole vielä konfiguroitu (IdP-secretit + service role). Ominaisuus on valmis kytkettäväksi julkaisussa.'
        }),
        {
          status: 501,
          headers: { ...cors, 'Content-Type': 'application/json' }
        }
      );
    }

    // Placeholder for production wiring:
    // 1) POST token endpoint with code + code_verifier
    // 2) Validate id_token, extract sub / name (hash hetu server-side)
    // 3) Upsert public.users by idp_sub
    // 4) Create/sign-in auth user via Admin API
    // 5) Return access_token + refresh_token
    void code;
    void codeVerifier;
    void redirectUri;
    void issuer;
    void clientId;

    return new Response(
      JSON.stringify({
        error:
          'Token-vaihto ei ole vielä toteutettu tuotantoon. Lisää IdP token-endpoint -kutsu tähän funktioon.'
      }),
      {
        status: 501,
        headers: { ...cors, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'error' }),
      {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' }
      }
    );
  }
});
