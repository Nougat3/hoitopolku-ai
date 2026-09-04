import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BigGraph } from '@/components/shared/BigGraph';
import { MetricTile } from '@/components/shared/MetricTile';
import type { MetricTileData } from '@/components/shared/MetricTile';
import { MeasurementModal } from '@/components/patient/MeasurementModal';
import { ShareCodePanel } from '@/components/patient/ShareCodePanel';
import { SymptomModal } from '@/components/patient/SymptomModal';
import { MedicationEditor } from '@/components/doctor/MedicationEditor';
import { useAuthStore } from '@/hooks/useAuthStore';
import {
  useBpMeasurements,
  useCareEvents,
  useDoctorForPatient,
  useMedications,
  useMetricMeasurements,
  useSymptoms,
  useTargets,
  useTasks
} from '@/hooks/usePatientData';
import { supabase } from '@/lib/supabase';
import { rolling } from '@/utils/calculations';
import { formatDate } from '@/utils/formatting';
import { bpToSeries, metricToSeries, startOfDay } from '@/utils/series';

type View = 'home' | 'graph' | 'care' | 'share';

export default function PatientDashboard() {
  const { appUser } = useAuthStore();
  const patientId = appUser?.id ?? null;
  const [view, setView] = useState<View>('home');
  const [measureOpen, setMeasureOpen] = useState(false);
  const [symptomOpen, setSymptomOpen] = useState(false);
  const [graphKey, setGraphKey] = useState<'bp' | 'glu' | 'wt'>('bp');

  const bp = useBpMeasurements(patientId);
  const metrics = useMetricMeasurements(patientId);
  const targets = useTargets(patientId);
  const meds = useMedications(patientId);
  const tasks = useTasks(patientId);
  const events = useCareEvents(patientId);
  const symptoms = useSymptoms(patientId);
  const doctor = useDoctorForPatient(patientId);

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

  const nowEvent = (events.data ?? []).find((e) => e.status === 'now');
  const openTasks = (tasks.data ?? []).filter((t) => !t.done);

  async function toggleTask(id: string, done: boolean) {
    const { error } = await supabase
      .from('patient_tasks')
      .update({ done: !done })
      .eq('id', id);
    if (error) toast.error(error.message);
    else void tasks.reload();
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!patientId) {
    return <div className="p-8 text-[var(--mid)]">Profiilia ei löytynyt.</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--w)] pb-24">
      <header className="app-container pt-6 pb-3 px-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--g)] uppercase tracking-wide">Hoitopolku</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Hei, {appUser?.full_name?.split(' ')[0] ?? 'potilas'}
          </h1>
          {doctor.data && (
            <p className="text-sm text-[var(--mid)] mt-1">
              Lääkäri: {doctor.data.full_name}
              {doctor.data.title ? `, ${doctor.data.title}` : ''}
            </p>
          )}
        </div>
        <button type="button" className="text-sm font-semibold text-[var(--mid)]" onClick={() => void signOut()}>
          Kirjaudu ulos
        </button>
      </header>

      <main className="app-container px-4 space-y-4">
        {view === 'home' && (
          <>
            {nowEvent && (
              <div className="rounded-2xl bg-[var(--k)] text-white p-4">
                <p className="text-xs uppercase tracking-wide opacity-70">Seuraava askel</p>
                <p className="font-bold text-lg mt-1">{nowEvent.title}</p>
                <p className="text-sm opacity-80 mt-1">{nowEvent.when_label}</p>
              </div>
            )}

            <div className="space-y-3">
              {tiles.map((t) => (
                <MetricTile
                  key={t.key}
                  metric={t}
                  onClick={() => {
                    setGraphKey(t.key as 'bp' | 'glu' | 'wt');
                    setView('graph');
                  }}
                />
              ))}
              {!tiles.length && (
                <p className="text-[var(--mid)] text-sm">Ei vielä mittauksia — kirjaa ensimmäinen.</p>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <h3 className="font-bold mb-2">Tehtävät</h3>
              <ul className="space-y-2">
                {openTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3">
                    <button
                      type="button"
                      className="mt-0.5 w-5 h-5 rounded border border-[var(--line)]"
                      onClick={() => void toggleTask(t.id, t.done)}
                      aria-label="Merkitse tehdyksi"
                    />
                    <div>
                      <div className="font-semibold text-sm">{t.title}</div>
                      {t.detail && <div className="text-xs text-[var(--mid)]">{t.detail}</div>}
                    </div>
                  </li>
                ))}
                {!openTasks.length && (
                  <li className="text-sm text-[var(--mid)]">Ei avoimia tehtäviä.</li>
                )}
              </ul>
            </div>

            <MedicationEditor
              patientId={patientId}
              doctorId={patientId}
              medications={meds.data ?? []}
              onChanged={() => void meds.reload()}
              readOnly
            />

            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Oireet</h3>
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--g)]"
                  onClick={() => setSymptomOpen(true)}
                >
                  + Kirjaa
                </button>
              </div>
              <ul className="space-y-2">
                {(symptoms.data ?? []).slice(0, 4).map((s) => (
                  <li key={s.id} className="text-sm">
                    {s.symptoms.join(', ')}
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
          </>
        )}

        {view === 'graph' && (
          <div className="space-y-4">
            {graphKey === 'bp' && (
              <BigGraph
                name="Verenpaine (sys)"
                color="#B3452C"
                data={bpToSeries(bp.data ?? [], origin)}
                target={targets.data?.bp_sys}
                unit="mmHg"
                dense
              />
            )}
            {graphKey === 'glu' && (
              <BigGraph
                name="Verensokeri"
                color="#2F6690"
                data={metricToSeries(metrics.data ?? [], origin, 'glucose')}
                target={targets.data?.glucose ?? undefined}
                unit="mmol/l"
                dense={false}
                decimals
              />
            )}
            {graphKey === 'wt' && (
              <BigGraph
                name="Paino"
                color="#6B5B95"
                data={metricToSeries(metrics.data ?? [], origin, 'weight')}
                target={targets.data?.weight ?? undefined}
                unit="kg"
                dense={false}
                decimals
              />
            )}
          </div>
        )}

        {view === 'care' && (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <h3 className="font-bold mb-3">Hoitopolku</h3>
            <ol className="space-y-4">
              {(events.data ?? []).map((e) => (
                <li key={e.id} className="relative pl-6">
                  <span
                    className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ${
                      e.status === 'done'
                        ? 'bg-[var(--green)]'
                        : e.status === 'now'
                          ? 'bg-[var(--g)]'
                          : 'bg-[var(--line)]'
                    }`}
                  />
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-sm text-[var(--mid)]">{e.when_label}</div>
                  {e.detail && <p className="text-sm mt-1">{e.detail}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {view === 'share' && <ShareCodePanel patientId={patientId} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-[var(--line)] bg-[var(--w)]/95 backdrop-blur">
        <div className="app-container px-2 py-2 grid grid-cols-5 gap-1">
          {(
            [
              ['home', 'Koti'],
              ['care', 'Polku'],
              ['+', ''],
              ['graph', 'Käyrä'],
              ['share', 'Jaa']
            ] as const
          ).map(([k, label]) =>
            k === '+' ? (
              <button
                key="add"
                type="button"
                className="mx-auto w-12 h-12 -mt-5 rounded-full bg-[var(--k)] text-white text-2xl font-bold shadow-lg"
                onClick={() => setMeasureOpen(true)}
                aria-label="Kirjaa mittaus"
              >
                +
              </button>
            ) : (
              <button
                key={k}
                type="button"
                className={`py-2 text-xs font-semibold ${
                  view === k ? 'text-[var(--k)]' : 'text-[var(--mid)]'
                }`}
                onClick={() => setView(k as View)}
              >
                {label}
              </button>
            )
          )}
        </div>
      </nav>

      <MeasurementModal
        open={measureOpen}
        patientId={patientId}
        onClose={() => setMeasureOpen(false)}
        onSaved={() => {
          void bp.reload();
          void metrics.reload();
        }}
      />
      <SymptomModal
        open={symptomOpen}
        patientId={patientId}
        onClose={() => setSymptomOpen(false)}
        onSaved={() => void symptoms.reload()}
      />
    </div>
  );
}
