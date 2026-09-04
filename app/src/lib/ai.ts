import { supabase } from '@/lib/supabase';
import type { DataPoint } from '@/utils/calculations';
import { formatValue } from '@/utils/formatting';

export interface AiPatientSnapshot {
  id: string;
  name: string;
  startLabel: string;
  bp: DataPoint[];
  glucose: DataPoint[];
  weight: DataPoint[];
  meds: { name: string; dose: string; note?: string | null }[];
  symptoms: string[];
  labs: { name: string; value: number; unit: string; decimals?: boolean }[];
  bpTarget: number;
}

type DocType = 'yhteenveto' | 'seuranta' | 'lahete' | 'A';

const TPL: Record<DocType, { t: string; s: string[] }> = {
  yhteenveto: {
    t: 'Käynnin yhteenveto',
    s: ['Käynnin syy', 'Nykytila', 'Lääkitys', 'Oireet', 'Arvio', 'Suunnitelma']
  },
  seuranta: {
    t: 'Seurantamuistio',
    s: ['Seurantajakso', 'Mittaustulokset', 'Lääkitys ja muutokset', 'Arvio', 'Suunnitelma']
  },
  lahete: {
    t: 'Lähete',
    s: [
      'Lähettämisen syy',
      'Diagnoosi',
      'Nykytila',
      'Tehdyt tutkimukset',
      'Kokeiltu hoito',
      'Kysymyksenasettelu'
    ]
  },
  A: {
    t: 'Lääkärinlausunto A',
    s: ['Diagnoosi', 'Nykytila', 'Löydökset', 'Laboratorio', 'Hoito', 'Arvio työkyvystä', 'Yhteenveto']
  }
};

function firstLast(points: DataPoint[]) {
  if (!points.length) return { first: 0, last: 0, change: 0 };
  const first = points[0].v;
  const last = points[points.length - 1].v;
  return { first, last, change: first - last };
}

/** Paikallinen luonnos — sama logiikka kuin LääkäriPRO-demossa. */
export function localDraft(
  type: DocType,
  patient: AiPatientSnapshot,
  extra = ''
): string {
  const T = TPL[type];
  const bp = firstLast(patient.bp);
  const gl = firstLast(patient.glucose);
  const wt = firstLast(patient.weight);
  const d = new Date();
  const pv = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  const symTxt =
    patient.symptoms.length > 0
      ? patient.symptoms.join('; ')
      : 'ei kirjattuja oireita';

  const B: Record<string, string> = {
    'Käynnin syy':
      'Kohonneen verenpaineen seurantakäynti hoitopolussa. Potilas on kirjannut kotimittauksia ' +
      patient.startLabel +
      ' alkaen.',
    Seurantajakso:
      'Hoitopolku alkoi ' +
      patient.startLabel +
      '. Kotimittauksia ' +
      patient.bp.length +
      ' kirjausta.',
    'Lähettämisen syy':
      'Kohonnut verenpaine, joka ei ole saavuttanut tavoitetta nykyisellä lääkityksellä.',
    Diagnoosi: 'I10 Essentiaalinen verenpainetauti',
    Nykytila:
      'Kotiverenpaineen seitsemän vuorokauden keskiarvo ' +
      formatValue(bp.last, false) +
      ' mmHg, lähtötaso ' +
      formatValue(bp.first, false) +
      ' mmHg, muutos −' +
      formatValue(bp.change, false) +
      ' mmHg. Tavoite alle ' +
      patient.bpTarget +
      ' mmHg ' +
      (bp.last <= patient.bpTarget ? 'saavutettu' : 'ei vielä saavutettu') +
      '.\nPaastoglukoosi ' +
      formatValue(gl.last, true) +
      ' mmol/l. Paino ' +
      formatValue(wt.last, true) +
      ' kg.',
    Mittaustulokset:
      'Verenpaine ' +
      formatValue(bp.first, false) +
      ' → ' +
      formatValue(bp.last, false) +
      ' mmHg.\nPaastoglukoosi ' +
      formatValue(gl.first, true) +
      ' → ' +
      formatValue(gl.last, true) +
      ' mmol/l.\nPaino ' +
      formatValue(wt.first, true) +
      ' → ' +
      formatValue(wt.last, true) +
      ' kg.',
    Löydökset: 'Kotiverenpaine ' + formatValue(bp.last, false) + ' mmHg.',
    Laboratorio: patient.labs
      .map((l) => `${l.name} ${formatValue(l.value, !!l.decimals)} ${l.unit}`)
      .join('\n') || '—',
    'Tehdyt tutkimukset':
      'Kotiverenpaineseuranta. Laboratorio: ' +
      (patient.labs.map((l) => `${l.name} ${formatValue(l.value, !!l.decimals)}`).join(', ') ||
        'ei kirjauksia') +
      '.',
    Lääkitys: patient.meds.map((m) => `• ${m.name} ${m.dose}`).join('\n') || '—',
    'Lääkitys ja muutokset':
      patient.meds.map((m) => `• ${m.name} ${m.dose}`).join('\n') || '—',
    'Kokeiltu hoito':
      patient.meds.map((m) => `${m.name} ${m.dose}`).join(', ') || '—' + '. Elintapaohjaus annettu.',
    Hoito: patient.meds.map((m) => `${m.name} ${m.dose}`).join(', ') || '—',
    Oireet: symTxt.charAt(0).toUpperCase() + symTxt.slice(1) + '.',
    Arvio:
      'Verenpaine on ' +
      (bp.change > 0
        ? 'laskenut ' + formatValue(bp.change, false) + ' mmHg'
        : 'pysynyt ennallaan') +
      (bp.last <= patient.bpTarget ? ' ja tavoite on saavutettu.' : ' mutta jää tavoitteesta.'),
    Yhteenveto:
      'Verenpaine ' +
      formatValue(bp.first, false) +
      ' → ' +
      formatValue(bp.last, false) +
      ' mmHg. Paino −' +
      formatValue(wt.change, true) +
      ' kg.',
    Kysymyksenasettelu:
      'Pyydetään arviota jatkohoidosta ja sekundaarisen verenpainetaudin selvittelyn tarpeesta.',
    'Arvio työkyvystä':
      'Sairaus ei aiheuta työkyvyn rajoitusta. Seuranta jatkuu avohoidossa.',
    Suunnitelma:
      '• Kotimittausten jatko, uusi seitsemän vuorokauden sarja\n• Kontrollikäynti 6 viikon kuluttua\n• Laboratorio 2–4 vk mahdollisen lääkemuutoksen jälkeen'
  };

  let out = `${T.t}\n${pv} · ${patient.name} (${patient.id})\n\n`;
  for (const sec of T.s) {
    out += `## ${sec}\n${B[sec] || '—'}\n\n`;
  }
  if (extra.trim()) out += `## Lääkärin lisätiedot\n${extra.trim()}\n\n`;
  return out + '—\nLuonnos koottu potilaan kirjaamista tiedoista. Tarkistettava ennen käyttöä.';
}

export async function generateAIStatement(
  type: DocType,
  patient: AiPatientSnapshot,
  extra = ''
): Promise<{ text: string; source: 'ai' | 'local' }> {
  const draft = localDraft(type, patient, extra);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { text: draft, source: 'local' };

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ type, patient, extra })
    });
    if (!res.ok) return { text: draft, source: 'local' };
    const json = (await res.json()) as { text?: string };
    if (json.text && json.text.trim()) return { text: json.text, source: 'ai' };
    return { text: draft, source: 'local' };
  } catch {
    return { text: draft, source: 'local' };
  }
}
