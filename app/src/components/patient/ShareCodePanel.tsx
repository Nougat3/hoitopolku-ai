import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { formatDate, formatTime } from '@/utils/formatting';

interface ShareCodePanelProps {
  /** Reserved for future patient-scoped UI; RPC uses auth session. */
  patientId?: string;
}

export function ShareCodePanel(_props: ShareCodePanelProps = {}) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createCode() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('create_patient_access_code');
      if (error) throw error;
      const payload = data as { code?: string; expires_at?: string };
      if (!payload?.code) throw new Error('Koodia ei saatu');
      setCode(payload.code);
      setExpiresAt(payload.expires_at ?? null);
      toast.success('Jakokoodi luotu');
    } catch (err) {
      toast.error(handleSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('revoke_patient_access_code');
      if (error) throw error;
      setCode(null);
      setExpiresAt(null);
      toast.success('Koodi mitätöity');
    } catch (err) {
      toast.error(handleSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <h3 className="font-bold mb-1">Jaa tiedot lääkärille</h3>
      <p className="text-sm text-[var(--mid)] mb-3">
        Luo kertakäyttöinen koodi. Lääkäri syöttää sen LääkäriPROssa — pääsy on määräaikainen.
      </p>
      {code ? (
        <div className="bg-[var(--g0)] rounded-xl p-4 text-center mb-3">
          <div className="text-3xl font-extrabold tracking-widest">{code}</div>
          {expiresAt && (
            <p className="text-xs text-[var(--mid)] mt-2">
              Voimassa {formatDate(new Date(expiresAt))} klo {formatTime(new Date(expiresAt))}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--mid)] mb-3">Ei aktiivista koodia.</p>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-primary flex-1" disabled={busy} onClick={() => void createCode()}>
          {code ? 'Luo uusi' : 'Luo koodi'}
        </button>
        {code && (
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void revoke()}>
            Mitätöi
          </button>
        )}
      </div>
    </div>
  );
}
