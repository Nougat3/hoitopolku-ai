import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BillingPanel } from '@/components/doctor/BillingPanel';
import { CodeRedeem } from '@/components/doctor/CodeRedeem';
import { PatientView } from '@/components/doctor/PatientView';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useCareSessions } from '@/hooks/usePatientData';
import { supabase } from '@/lib/supabase';
import { formatDate, formatTime } from '@/utils/formatting';

export default function DoctorDashboard() {
  const { appUser } = useAuthStore();
  const doctorId = appUser?.id ?? null;
  const sessions = useCareSessions(doctorId);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);

  const activePatient = useMemo(() => {
    if (!activePatientId) return null;
    const s = sessions.data.find((x) => x.patient_id === activePatientId);
    return {
      id: activePatientId,
      name: s?.patient?.full_name ?? s?.patient?.email ?? 'Potilas'
    };
  }, [activePatientId, sessions.data]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!doctorId) {
    return <div className="p-8 text-[var(--mid)]">Profiilia ei löytynyt.</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--w)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--g)] uppercase tracking-wide">LääkäriPRO</p>
            <h1 className="text-xl font-extrabold">
              {appUser?.full_name ?? 'Lääkäri'}
            </h1>
            {appUser?.title && (
              <p className="text-sm text-[var(--mid)]">{appUser.title}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/doctor/billing" className="text-sm font-semibold text-[var(--blue)]">
              Laskutus
            </Link>
            <button
              type="button"
              className="text-sm font-semibold text-[var(--mid)]"
              onClick={() => void signOut()}
            >
              Kirjaudu ulos
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {activePatient ? (
          <PatientView
            patientId={activePatient.id}
            patientName={activePatient.name}
            doctorId={doctorId}
            onBack={() => setActivePatientId(null)}
          />
        ) : (
          <div className="space-y-4">
            <CodeRedeem
              onRedeemed={(id) => {
                void sessions.reload();
                setActivePatientId(id);
              }}
            />

            <BillingPanel compact />
            <p className="text-sm text-[var(--mid)] -mt-2">
              <Link to="/doctor/billing" className="font-semibold text-[var(--blue)]">
                Avaa hinnoittelu →
              </Link>
            </p>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <h3 className="font-bold mb-3">Aktiiviset istunnot</h3>
              {sessions.loading && (
                <p className="text-sm text-[var(--mid)]">Ladataan…</p>
              )}
              <ul className="space-y-2">
                {sessions.data.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full text-left rounded-xl border border-[var(--line)] p-3 hover:bg-[var(--g0)]"
                      onClick={() => setActivePatientId(s.patient_id)}
                    >
                      <div className="font-semibold">
                        {s.patient?.full_name ?? s.patient?.email ?? s.patient_id}
                      </div>
                      <div className="text-xs text-[var(--mid)] mt-1">
                        Avattu {formatDate(new Date(s.created_at))} klo{' '}
                        {formatTime(new Date(s.created_at))} · päättyy{' '}
                        {formatDate(new Date(s.expires_at))}
                      </div>
                    </button>
                  </li>
                ))}
                {!sessions.loading && !sessions.data.length && (
                  <li className="text-sm text-[var(--mid)]">
                    Ei aktiivisia istuntoja. Avaa potilas jakokoodilla.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
