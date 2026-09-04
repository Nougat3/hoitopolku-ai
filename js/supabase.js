// Kevyt Supabase-asiakas.
//
// Sovellukset ovat staattisia HTML-tiedostoja ilman kaannosvaihetta, joten tassa
// puhutaan suoraan PostgREST- ja GoTrue-rajapinnoille fetchilla sen sijaan etta
// niputettaisiin supabase-js. Samalla sivujen CSP voi pysya tiukkana
// (script-src 'self'), koska mitaan ei ladata CDN:sta.

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const SESSION_KEY = 'hp.session';
const REST = `${SUPABASE_URL}/rest/v1`;
const AUTH = `${SUPABASE_URL}/auth/v1`;

let session = readStoredSession();

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeSession(next) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Privaatti selaustila voi estaa kirjoituksen; istunto jaa muistiin.
  }
}

/** Poimii virheviestin joko GoTrue- tai PostgREST-muotoisesta vastauksesta. */
async function errorFrom(res, fallback) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    return new Error(fallback);
  }
  const msg = body?.msg || body?.message || body?.error_description || body?.error || body?.hint;
  const err = new Error(msg || fallback);
  err.status = res.status;
  err.code = body?.code || body?.error_code;
  return err;
}

export function getSession() {
  return session;
}

export function isSignedIn() {
  return Boolean(session?.access_token);
}

function applyTokenResponse(body) {
  const next = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    // expires_in on sekunteina; tallennetaan absoluuttinen hetki millisekunteina.
    expires_at: Date.now() + (body.expires_in ?? 3600) * 1000,
    user: body.user ?? null
  };
  storeSession(next);
  return next;
}

export async function signIn(email, password) {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: String(email || '').trim(), password: String(password || '') })
  });
  if (!res.ok) {
    const err = await errorFrom(res, 'Kirjautuminen epaonnistui');
    if (err.code === 'invalid_credentials' || res.status === 400) {
      throw new Error('Sahkoposti tai salasana ei tasmaa.');
    }
    throw err;
  }
  return applyTokenResponse(await res.json());
}

export async function signOut() {
  const token = session?.access_token;
  storeSession(null);
  if (!token) return;
  try {
    await fetch(`${AUTH}/logout`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
    });
  } catch {
    // Paikallinen istunto on jo tyhjennetty, joten verkkovirhe ei haittaa.
  }
}

async function refreshSession() {
  if (!session?.refresh_token) return null;
  const res = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });
  if (!res.ok) {
    storeSession(null);
    return null;
  }
  return applyTokenResponse(await res.json());
}

/**
 * Varmistaa etta kaytossa on voimassa oleva paasytunnus. Palauttaa istunnon tai
 * null, jos kayttajan on kirjauduttava uudelleen.
 */
export async function ensureSession() {
  if (!session?.access_token) return null;
  const expiresSoon = !session.expires_at || session.expires_at - Date.now() < 60_000;
  if (expiresSoon) return refreshSession();
  return session;
}

async function request(path, options = {}, allowRetry = true) {
  const active = await ensureSession();
  if (!active) throw new Error('Istunto on vanhentunut. Kirjaudu uudelleen.');

  const res = await fetch(`${REST}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${active.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  // Paasytunnus voi vanhentua kesken istunnon; yritetaan kerran uusia.
  if (res.status === 401 && allowRetry) {
    const renewed = await refreshSession();
    if (renewed) return request(path, options, false);
  }

  if (!res.ok) throw await errorFrom(res, 'Tietojen haku epaonnistui');
  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Hakee rivit taulusta. `query` on PostgREST-hakuehto ilman alkavaa kysymysmerkkia,
 * esim. `select=*&patient_id=eq.usr_x&order=measured_at.asc`.
 */
export function select(table, query = 'select=*') {
  return request(`/${table}?${query}`);
}

export async function insert(table, rows) {
  const result = await request(`/${table}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(rows)
  });
  return Array.isArray(rows) ? result : result?.[0] ?? null;
}

export async function update(table, query, patch) {
  const result = await request(`/${table}?${query}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch)
  });
  return result?.[0] ?? null;
}

export function rpc(fn, args = {}) {
  return request(`/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
}
