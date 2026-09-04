import { consumeStrongAuthPkce, getActiveStrongAuthProvider } from '@/lib/strong-auth';
import { supabase, handleSupabaseError } from '@/lib/supabase';

export type StrongAuthExchangeResult =
  | { ok: true; roleHint?: string }
  | { ok: false; reason: string };

/**
 * Exchange authorization code via Edge Function → Supabase session.
 * Until Telia/Signicat credentials + function secrets exist, returns a clear stub error.
 */
export async function exchangeStrongAuthCode(
  code: string,
  returnedState: string
): Promise<StrongAuthExchangeResult> {
  const { state, verifier } = consumeStrongAuthPkce();
  if (!state || state !== returnedState) {
    return { ok: false, reason: 'Tunnistusistunto vanhentui (state). Yritä uudelleen.' };
  }
  if (!verifier) {
    return { ok: false, reason: 'PKCE-verifier puuttuu. Yritä uudelleen.' };
  }

  const provider = getActiveStrongAuthProvider();
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const bearer = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strong-auth-exchange`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearer}`
        },
        body: JSON.stringify({
          provider: provider.id,
          code,
          code_verifier: verifier,
          redirect_uri: `${window.location.origin}/auth/callback`
        })
      }
    );

    if (res.status === 501 || res.status === 503) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        reason:
          body.error ??
          'Vahva tunnistus odottaa IdP-sopimusta ja Edge Function -secretiä. Ominaisuus on valmis kytkettäväksi.'
      };
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, reason: body.error ?? `Vaihto epäonnistui (${res.status})` };
    }

    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      role?: string;
    };

    if (!json.access_token || !json.refresh_token) {
      return {
        ok: false,
        reason: 'Palvelin ei palauttanut sessiota. Tarkista strong-auth-exchange -funktio.'
      };
    }

    const { error } = await supabase.auth.setSession({
      access_token: json.access_token,
      refresh_token: json.refresh_token
    });
    if (error) return { ok: false, reason: handleSupabaseError(error) };

    return { ok: true, roleHint: json.role };
  } catch (err) {
    return { ok: false, reason: handleSupabaseError(err) };
  }
}
