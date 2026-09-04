// Supabase Edge Function: AI statement proxy.
// Secret: ANTHROPIC_API_KEY (never expose to the browser).
// Falls back to client-side localDraft when this function is unavailable.

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
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 503,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const type = String(body.type ?? 'yhteenveto');
    const extra = String(body.extra ?? '');
    const patient = body.patient ?? {};

    const prompt =
      `Laadi suomeksi lääkärin ${type}-luonnos potilaasta. ` +
      `Käytä vain annettuja tietoja. Merkitse että kyseessä on luonnos.\n\n` +
      `Potilas: ${JSON.stringify(patient)}\n` +
      (extra ? `Lisätiedot: ${extra}\n` : '');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const text =
      Array.isArray(data.content) && data.content[0]?.text
        ? data.content[0].text
        : '';

    return new Response(JSON.stringify({ text }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
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
