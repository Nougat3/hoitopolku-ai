# Tietokanta

Tuotantoprojekti: **hoitopolku-ai** (`tvkxzczwepfzlbocxqwd`), alue `eu-north-1`.

Skeema on `text`-avaimiin perustuva: `users.id` on esim. `usr_potilas_demo`, mittausrivit
`bp_...`, `met_...`. Kaikilla tauluilla on RLS päällä, ja kaikki pääsy kulkee
`private.app_user_id()`- ja `private.is_my_patient()`-funktioiden kautta.

## Roolit

`users.role` on suomenkielinen: `potilas`, `laakari`, `yllapito`.

## Jakokoodi

Lääkäri ei näe potilasta ennen kuin potilas on luonut jakokoodin ja lääkäri lunastanut sen.

| Funktio | Kutsuja | Palauttaa |
|---|---|---|
| `create_patient_access_code()` | potilas | `{ code, expires_at }`, koodi muodossa `XXXX-XXXX`, voimassa 24 h |
| `redeem_patient_access_code(p_code)` | lääkäri | `{ patient_id, full_name, email, expires_at }`, luo `care_sessions`-rivin |
| `revoke_patient_access_code()` | potilas | mitätöi lunastamattomat koodit |

Koodi tallennetaan vain SHA-256-tiivisteenä (`patient_access_codes.code_hash`).
Lunastus normalisoi syötteen muotoon `[A-Z0-9]{8}`, joten väliviivat ja pienet
kirjaimet ovat sallittuja.

## Migraatioiden ajautuminen

Tämän kansion tiedostot eivät ole täsmälleen sama joukko kuin tuotantoon ajetut
migraatiot. Tunnetut erot on kirjattu tähän, jotta `supabase db push` ei yllätä.

**Lisätty takaisin tuotannosta** (puuttuivat repositoriosta kokonaan):

- `20260823123211_init_hoitopolku_v1.sql` — perustaulut. Ilman tätä skeemaa ei voinut
  rakentaa tyhjästä, koska kaikki muut migraatiot vain muokkaavat näitä tauluja.
- `20260904124057_billing_subscriptions.sql`

**Tuotannossa mutta yhä puuttuvat täältä** (sisältö on demodataa tai siivousta):

`20260825104420_demo_kirjautumistilit`, `20260825104634_siivoa_testifunktiot`,
`20260825104826_siivoa_kirjaustesti`.

**Eri aikaleima repossa kuin tuotannossa** — sama looginen migraatio, eri
versionumero, joten `db push` yrittäisi ajaa ne uudelleen:

| Repo | Tuotanto |
|---|---|
| `20260825111500_rajaa_funktioiden_oikeudet` | `20260825111650` |
| `20260825111700_palauta_policyjen_tarvitsemat_oikeudet` | `20260825111732` |
| `20260825154500_potilas_nakee_oman_laakarin` | `20260825152625` |
| `20260825160500_korjaa_tekstien_aakkoset` | `20260825155830` |
| `20260825161000_siivoa_eristystestin_rivit` | `20260825160104` |
| `20260825162000_siirra_apufunktiot_private_schemaan` | `20260825160257` |
| `20260825180000_potilaan_laakitykset` | `20260825200125` |
| `20260826100000_laakarin_mallipotilaat` | `20260826194725` |
| `20260826210000_potilaan_jakokoodi` | `20260826210129` + `…145` + `…153` + `…155` |
| `20260827090000_mvp_verikokeet` | `20260827080144` |
| `20260827120000_korjaa_jakokoodin_normalisointi` | `20260827110135` |
| `20260827130000_verensokeri_ja_paino_etaarvio` | `20260827115430` |
| `20260828060000_paasy_vain_jakokoodilla` | `20260828043800` |

**Vain repossa, ei kirjattu tuotantoon:** `20260826050000_lyhyet_demotunnukset`,
`20260826053000_demo_ramipril_vaikutusajankohta`.

Nimeämistä ei ole yhtenäistetty, koska aikaleiman vaihtaminen jälkikäteen rikkoisi
`schema_migrations`-taulun ja vaatisi käsin tehtävän korjauksen tuotannossa.
