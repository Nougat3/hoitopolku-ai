import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BigGraph } from '@/components/shared/BigGraph';
import { MetricTile } from '@/components/shared/MetricTile';
import type { MetricTileData } from '@/components/shared/MetricTile';
import { MedicationEditor } from '@/components/doctor/MedicationEditor';
import {
  useBpMeasurements,
  useCareEvents,
  useMedications,
  useMetricMeasurements,
  useSymptoms,
  useTargets
} from '@/hooks/usePatientData';
import { generateAIStatement, type AiPatientSnapshot } from '@/lib/ai';
import { bpToSeries, metricToSeries, startOfDay } from '@/utils/series';
import { formatDate } from '@/utils/formatting';
import { rolling } from '@/utils/calculations';

interface PatientViewProps {
  patientId: string;
  patientName: string;
  doctorId: string;
  onBack: () => void;
}

type Tab = 'overview' | 'graph' | 'meds' | 'ai';

export function PatientView({
  patientId,
  patientName,
  doctorId,
  onBack
}: PatientViewProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [docType, setDocType] = useState<'yhteenveto' | 'seuranta' | 'lahete' | 'A'>('yhteenveto');
  const [extra, setExtra] = useState('');
  const [aiOut, setAiOut] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<'ai' | 'local' | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const bp = useBpMeasurements(patientId);
  const metrics = useMetricMeasurements(patientId);
  const meds = useMedications(patientId);
  const targets = useTargets(patientId);
  const symptoms = useSymptoms(patientId);
  const events = useCareEvents(patientId);

  const origin = useMemo(() => {
    const first = bp.data?.[0]?.measured_at;
    return first ? startOfDay(new Date(first)) : startOfDay(new Date());
  }, [bp.data]);

  const tiles: MetricTileData[] = useMemo(() => {
    const bpSeries = bpToSeries(bp.data ?? [], origin);
    const glu = metricToSeries(metrics.data ?? [], origin, 'glucose');
    const wt = metricToSeries(metrics.data ?? [], origin, 'weight');
    const bpVals = (bpSeries.length >= 7 ? rolling(bpSeries) : bpSeries).map((p) => p.v);
    return [
      {
        key: 'bp',
        name: 'Verenpaine',
        color: '#B3452C',
        unit: 'mmHg',
        values: bpVals,
        target: targets.data?.bp_sys,
        decimals: false
      },
      {
        key: 'glu',
        name: 'Verensokeri',
        color: '#2F6690',
        unit: 'mmol/l',
        values: glu.map((p) => p.v),
        target: targets.data?.glucose ?? undefined,
        decimals: true
      },
      {
        key: 'wt',
        name: 'Paino',
        color: '#6B5B95',
        unit: 'kg',
        values: wt.map((p) => p.v),
        target: targets.data?.weight ?? undefined,
        decimals: true
      }
    ].filter((t) => t.values.length > 0);
  }, [bp.data, metrics.data, origin, targets.data]);

  const snapshot: AiPatientSnapshot = useMemo(() => {
    const bpSeries = bpToSeries(bp.data ?? [], origin);
    const glu = metricToSeries(metrics.data ?? [], origin, 'glucose');
    const wt = metricToSeries(metrics.data ?? [], origin, 'weight');
    const labs = (metrics.data ?? [])
      .filter((m) => ['ldl', 'hba1c', 'creatinine', 'potassium', 'sodium'].includes(m.metric))
      .slice(-5)
      .map((m) => ({
        name: m.metric.toUpperCase(),
        value: m.value,
        unit: m.metric === 'hba1c' ? 'mmol/mol' : m.metric === 'ldl' ? 'mmol/l' : '',
        decimals: m.metric !== 'hba1c'
      }));
    return {
      id: patientId,
      name: patientName,
      startLabel: formatDate(origin),
      bp: bpSeries,
      glucose: glu,
      weight: wt,
      meds: (meds.data ?? []).map((m) => ({ name: m.name, dose: m.dose, note: m.note })),
      symptoms: (symptoms.data ?? []).flatMap((s) => s.symptoms),
      labs,
      bpTarget: targets.data?.bp_sys ?? 135
    };
  }, [bp.data, metrics.data, meds.data, symptoms.data, targets.data, origin, patientId, patientName]);

  async function runAi() {
    setAiBusy(true);
    try {
      const res = await generateAIStatement(docType, snapshot, extra);
      setAiOut(res.text);
      setAiSource(res.source);
      toast.success(res.source === 'ai' ? 'AI-luonnos valmis' : 'Paikallinen luonnos');
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="text-sm font-semibold text-[var(--blue)] mb-3" onClick={onBack}>
        ← Takaisin
      </button>
      <h2 className="text-2xl font-bold mb-1">{patientName}</h2>
      <p className="text-sm text-[var(--mid)] mb-4">Potilasnäkymä · {patientId}</p>

      <div className="flex gap-1 bg-[var(--g0)] rounded-full p-1 mb-4 overflow-x-auto">
        {(
          [
            ['overview', 'Yhteenveto'],
            ['graph', 'Käyrät'],
            ['meds', 'Lääkitys'],
            ['ai', 'AI']
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap ${
              tab === k ? 'bg-white shadow-sm' : 'text-[var(--mid)]'
            }`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-3">
          {tiles.map((t) => (
            <MetricTile key={t.key} metric={t} />
          ))}
          <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <h3 className="font-bold mb-2">Hoitopolun tapahtumat</h3>
            <ul className="space-y-2">
              {(events.data ?? []).slice(0, 6).map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="font-semibold">{e.title}</span>
                  <span className="text-[var(--mid)]"> · {e.when_label}</span>
                </li>
              ))}
              {!events.data?.length && (
                <li className="text-sm text-[var(--mid)]">Ei tapahtumia.</li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <h3 className="font-bold mb-2">Viimeisimmät oireet</h3>
            <ul className="space-y-2">
              {(symptoms.data ?? []).slice(0, 5).map((s) => (
                <li key={s.id} className="text-sm">
                  {s.symptoms.join(', ')}
                  {s.severity ? ` (${s.severity}/5)` : ''}
                  <span className="text-[var(--mid)]">
                    {' '}
                    · {formatDate(new Date(s.reported_at))}
                  </span>
                </li>
              ))}
              {!symptoms.data?.length && (
                <li className="text-sm text-[var(--mid)]">Ei oirekirjauksia.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {tab === 'graph' && (
        <div className="space-y-4">
          <BigGraph
            name="Verenpaine (sys)"
            color="#B3452C"
            data={bpToSeries(bp.data ?? [], origin)}
            target={targets.data?.bp_sys}
            unit="mmHg"
            dense
          />
          <BigGraph
            name="Verensokeri"
            color="#2F6690"
            data={metricToSeries(metrics.data ?? [], origin, 'glucose')}
            target={targets.data?.glucose ?? undefined}
            unit="mmol/l"
            dense={false}
            decimals
          />
        </div>
      )}

      {tab === 'meds' && (
        <MedicationEditor
          patientId={patientId}
          doctorId={doctorId}
          medications={meds.data ?? []}
          onChanged={() => void meds.reload()}
        />
      )}

      {tab === 'ai' && (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4 space-y-3">
          <h3 className="font-bold">Lausuntoapuri</h3>
          <select
            className="field"
            value={docType}
            onChange={(e) => setDocType(e.target.value as typeof docType)}
          >
            <option value="yhteenveto">Käynnin yhteenveto</option>
            <option value="seuranta">Seurantamuistio</option>
            <option value="lahete">Lähete</option>
            <option value="A">Lääkärinlausunto A</option>
          </select>
          <textarea
            className="field min-h-[80px]"
            placeholder="Lisätiedot (valinnainen)"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary w-full"
            disabled={aiBusy}
            onClick={() => void runAi()}
          >
            {aiBusy ? 'Koostetaan…' : 'Luo luonnos'}
          </button>
          {aiOut && (
            <div className="mt-2">
              <p className="text-xs text-[var(--mid)] mb-2">
                Lähde: {aiSource === 'ai' ? 'AI-proxy' : 'paikallinen varaluonnos'}
              </p>
              <pre className="whitespace-pre-wrap text-sm bg-[var(--g0)] rounded-xl p-3 max-h-96 overflow-y-auto">
                {aiOut}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
