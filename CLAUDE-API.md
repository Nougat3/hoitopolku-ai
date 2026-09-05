# Claude-avain — liitä vain tähän

**Älä liitä `sk-ant-…` koodiin, GitHubiin äläkä LääkäriPRO-sivulle.** Selain paljastaisi avaimen.

## 1. Liitä avain (copy-paste)

1. Avaa [supabase.com/dashboard](https://supabase.com/dashboard) ja valitse projekti.
2. Vasemmalta alhaalta **Project Settings** (ratas).
3. **Edge Functions** → **Manage secrets** / **Secrets**.
4. **Add new secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: liitä Anthropic-avain (`sk-ant-…`)
5. Save.

## 2. Julkaise funktio (kerran)

Tietokoneella, repon juuressa:

```bash
supabase login
supabase link --project-ref SINUN_PROJECT_ID
supabase functions deploy ai-generate
```

Project ID on Settings → General, esim. `abcdefgh`.

## 3. LääkäriPRO-sivulla

Avaa AI-välilehti ja täytä **kaksi julkista kenttää** (Settings → API):

- Project URL (`https://xxxx.supabase.co`)
- anon public -avain

Tallenna. Sen jälkeen Vastaanottokirje / Yhteenveto / Hoitosuunnitelma käyttävät Claudea.
