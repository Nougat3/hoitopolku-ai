# Hoitopolku ja LääkäriPRO — tekninen siirtymäsuunnitelma
## Demoista tuotantosovellukseksi

Täydentää liiketoimintasuunnitelmaa ja Pro-mallia. Tämä dokumentti kuvaa, miten kaksi nykyistä demoa (`hoitopolku-demo.html`, `laakaripro.html`) muutetaan oikeaksi, jaettuun tietokantaan perustuvaksi sovellukseksi.

---

## 1. Nykytila ja ongelma

Kaksi itsenäistä HTML-tiedostoa, joilla on omat kovakoodatut tietonsa. Ne eivät kommunikoi. Kun lääkäri "nostaa annosta" LääkäriPROssa, muutos ei näy potilaan sovelluksessa — koska kyseessä on kaksi eri JavaScript-muuttujaa kahdessa eri tiedostossa, ei yksi totuus.

Kaikki laskentalogiikka (käyrät, trendit, ennusteet, tehtävälistat) on kuitenkin jo rakennettu ja testattu. Tämä on merkittävä etu: **käyttöliittymä ja logiikka eivät ole se, mitä pitää rakentaa uudelleen — tietovarasto on.**

---

## 2. Tavoitearkkitehtuuri

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│   Hoitopolku     │◄──────►│                   │◄──────►│   LääkäriPRO     │
│   (potilas, PWA) │        │  Supabase (EU)    │        │   (lääkäri, PWA)  │
└─────────────────┘        │  Postgres + Auth  │        └─────────────────┘
                            │  + Realtime       │
                            └──────────────────┘
```

| Kerros | Valinta | Perustelu |
|---|---|---|
| Käyttöliittymä | React, sama HTML/CSS-kieli kuin demoissa | Nopein siirtymä, sama visuaalinen identiteetti |
| Tietokanta | Supabase Postgres, Frankfurt-alue | EU-data, rivitason oikeudet, ei erillistä backend-palvelinta |
| Autentikointi | Supabase Auth (sähköposti + salasana, myöhemmin Suomi.fi) | Sisäänrakennettu, ei erillistä identiteettipalvelua |
| Reaaliaikaisuus | Supabase Realtime | Lääkärin annosmuutos näkyy potilaalla sekunneissa |
| Hosting | Vercel tai Netlify, EU-reuna | Ilmainen aloitustaso, PWA-tuki valmiina |
| AI (lausuntoapuri) | Anthropic API, oma backend-proxy | API-avainta ei koskaan paljasteta selaimelle |

---

## 3. Tietomalli — live (hoitopolku-ai)

> **Huom:** Alla oleva “suunnitelmataulu”-lista on historiallinen. **Live-kanta** käyttää suomenkielisiä rooleja ja tauluja:
> `users` (`potilas`/`laakari`), `bp_measurements`, `metric_measurements`, `patient_medications`,
> `patient_targets`, `patient_tasks`, `symptom_reports`, `care_events`, `care_sessions`,
> `patient_access_codes`, `enrollments`, `audit_log`.
> Pääsy lääkärille perustuu määräaikaiseen `care_sessions` + jakokoodi-RPC:hen — ei pelkkään enrollmentiin.

Historiallinen suunnitelmataulu (älä käytä uusissa migraatioissa sellaisenaan):

| Taulu | Sisältö | Vastaa demossa |
|---|---|---|
| `profiles` | Käyttäjä, rooli (potilas/lääkäri) | kirjautumisnäkymät |
| `patients` | Nimi, ikä, sukupuoli, hoitopolun alkupäivä | `PATIENTS`-taulukko |
| `doctors` | Nimi, arvo | "Anna Lehtinen, LL" |
| `care_paths` | Potilas + lääkäri + sairaus (verenpaine/kolesteroli/…) + tavoitearvot + tila | koko "hoitopolku"-käsite |
| `measurements` | Tyyppi, arvo, ajankohta, aamu/ilta | `BP`, `GLU`, `WT` |
| `lab_results` | Tutkimus, arvo, viitearvo, päivämäärä | `LABS` |
| `medications` | Nimi, annos, ottoajat, aktiivinen | `MEDS` |
| `medication_changes` | Vanha annos, uusi annos, kuka muutti, milloin | `hist`/`when`-kentät |
| `symptoms` | Oire, voimakkuus, päivämäärä | `SYMS` |
| `events` | Tyyppi, otsikko, ajankohta, tila | `PATH_STEPS`, `CAL_EVENTS` |
| `access_log` | Kuka avasi minkä potilaan tiedot, milloin | ei vielä demossa — lisätään tuotantoon |

**Rivitason suojaus (Row Level Security):** potilas näkee vain oman datansa; lääkäri näkee vain potilaat, joilla on aktiivinen `care_paths`-rivi hänen kanssaan. Tämä korvaa demon HP-4827-koodin todellisella, tietokantaan kirjatulla hoitosuhteella.

**`access_log`** on tärkeä lisäys, joka ei ole vielä missään demossa: se toteuttaa aiemmin kaavailun idean — potilas näkee, kun lääkäri on avannut hänen tietonsa. Tämä on sekä läpinäkyvyyttä että GDPR-vaatimus (käsittelyn jäljitettävyys).

---

## 4. Migraatiokartta: mikä siirtyy sellaisenaan, mikä pitää rakentaa uudelleen

### Siirtyy lähes muuttumattomana

- Kaikki piirtofunktiot: `spark()`, `smooth()`, `rolling()`, `project()`, `drawGraph()` / `drawBigGraphLP()` — nämä ovat puhtaita funktioita, jotka ottavat sisään `{d,v}`-taulukon. Data tulee jatkossa Supabasesta kovakoodatun taulukon sijaan, mutta laskenta pysyy samana.
- Kaikki visuaaliset komponentit: laatat, kortit, kalenteriruudukko, aikajana, oireiden pylväsjana
- Tehtävälogiikka (`renderTasks`, `renderNext`) — sama laskenta, uusi datalähde
- Kalenterin .ics-vienti
- LääkäriPROn AI-lausuntoapurin kehoterakenne ja paikallinen varajärjestelmä

### Pitää rakentaa uudelleen

- **Kirjautuminen** — demon "esitäytetty lomake" korvataan oikealla Supabase Auth -kirjautumisella
- **Datakerros** — globaalit JS-muuttujat (`BP`, `MEDS`, `CUR`) korvataan Supabase-kyselyillä ja tilanhallinnalla
- **Koodijärjestelmä** — HP-4827 korvautuu oikealla hoitosuhteella tietokannassa; koodi voi silti säilyä *lisänä* ulkopuolisen lääkärin tilapäistä pääsyä varten
- **AI-kutsut** — nykyinen `fetch()`-kutsu suoraan selaimesta Anthropic APIin pitää siirtää oman backend-proxyn taakse, jotta API-avain ei näy selaimen koodissa
- **Reaaliaikainen synkronointi** — annosmuutos LääkäriPROssa täytyy työntää potilaan näkymään (Supabase Realtime -tilaus)

---

## 5. Vaiheistus

Noudattaa liiketoimintasuunnitelman vaihejakoa.

| Vaihe | Sisältö | Kesto |
|---|---|---|
| **0** | Tietomallin suunnittelu lopulliseksi (taulut, RLS-säännöt), Supabase-projektin pystytys | 1–2 vk |
| **1** | Potilassovelluksen datakerroksen uudelleenrakennus: kirjautuminen, mittausten kirjaus ja luku Supabasesta | 3–4 vk |
| **2** | LääkäriPROn datakerros: potilaslista, koodilla/hoitosuhteella avaaminen, AI-proxy | 2–3 vk |
| **3** | Reaaliaikainen synkronointi kahden sovelluksen välillä, `access_log` | 1–2 vk |
| **4** | PWA-paketointi (asennettavuus, offline-sietokyky), MDR-dokumentaation viimeistely | 2 vk |

Yhteensä noin **9–13 viikkoa** yhdelle kokopäiväiselle kehittäjälle, tai vastaava osa-aikaisena pidemmällä aikavälillä.

---

## 6. Tietoturva ja MDR-kytkös

- Kaikki data Supabasen EU-alueella (Frankfurt) — täyttää aiemmin sovitun GDPR-vaatimuksen
- `access_log` tukee sekä läpinäkyvyyttä että MDR-luokka I:n markkinoille saattamisen jälkeistä seurantaa
- Koska tietomalli ja laskentalogiikka pysyvät samoina kuin jo arvioidussa demossa (ei uusia diagnostisia tai hoitopäätöksiä tekeviä ominaisuuksia), aiempi MDR-luokka I -arvio ei muutu tämän migraation myötä
- AI-proxy-kerros on myös tietoturvakysymys: nykyinen demo-toteutus ei sovi tuotantoon sellaisenaan, koska API-avain ei koskaan saa olla selaimen koodissa

---

## 7. Mitä tehdä ensin

1. Vahvista tietomalli (luku 3) — tämä on ainoa osa, jota on vaikea muuttaa jälkikäteen ilman datan siirtoa
2. Pystytä Supabase-projekti EU-alueelle ja luo taulut
3. Ala siirtää potilassovelluksen mittauskirjausta ensimmäisenä toiminnallisuutena — se on yksinkertaisin end-to-end-testi sille, että arkkitehtuuri toimii
4. Vasta sen jälkeen LääkäriPRO ja reaaliaikainen synkronointi

---

## Liittyvät dokumentit

- [Supabase-tietomalli SQL-skriptit](../supabase/migrations/) - Tietokantataulut ja RLS-säännöt
- [Funktioanalyysi](./FUNCTION_ANALYSIS.md) - Lista siirrettävistä funktioista
- [Setup-ohje](./SETUP.md) - Projektin pystytys ja kehitysympäristö
