const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Käytä POST" }, 405);
  }

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) {
    return json({ error: "ANTHROPIC_API_KEY puuttuu Supabase Secretsistä" }, 500);
  }

  let payload: { type?: string; patientData?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Virheellinen JSON" }, 400);
  }

  const type = String(payload.type || "summary");
  const allowed = new Set(["letter", "summary", "plan"]);
  if (!allowed.has(type)) {
    return json({ error: "Tuntematon tyyppi" }, 400);
  }

  const labels: Record<string, string> = {
    letter: "vastaanottokirjeen luonnos",
    summary: "seurantayhteenveto",
    plan: "seurantamuistio",
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system:
        "Olet suomenkielinen sihteeri. Kirjoita LUONNOS lääkärille. Älä tee diagnoosia, älä määrää hoitoa, älä väitä MDR/CE-merkintää. Merkitse teksti luonnokseksi.",
      messages: [
        {
          role: "user",
          content:
            "Kirjoita " +
            labels[type] +
            ". Seurantatiedot: " +
            JSON.stringify(payload.patientData || {}),
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return json(
      { error: data?.error?.message || "Claude-kutsu epäonnistui" },
      response.status,
    );
  }

  const text = Array.isArray(data.content)
    ? data.content.map((c: { text?: string }) => c.text || "").join("\n")
    : "";
  return json({ text: text.trim() });
});
