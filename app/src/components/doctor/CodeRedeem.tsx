import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase, handleSupabaseError } from '@/lib/supabase';

interface CodeRedeemProps {
  onRedeemed: (patientId: string) => void;
}

export function CodeRedeem({ onRedeemed }: CodeRedeemProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function redeem() {
    const cleaned = code.trim();
    if (!cleaned) {
      toast.error('Syötä jakokoodi');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('redeem_patient_access_code', {
        p_code: cleaned
      });
      if (error) throw error;
      const payload = data as {
        patient_id?: string;
        full_name?: string | null;
        email?: string;
        error?: string;
      };
      if (payload?.error) throw new Error(payload.error);
      if (!payload?.patient_id) throw new Error('Potilasta ei löytynyt');
      toast.success(`Avattu: ${payload.full_name ?? payload.email ?? 'potilas'}`);
      setCode('');
      onRedeemed(payload.patient_id);
    } catch (err) {
      toast.error(handleSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <h3 className="font-bold mb-1">Avaa potilas koodilla</h3>
      <p className="text-sm text-[var(--mid)] mb-3">
        Potilas luo koodin omassa sovelluksessaan. Pääsy on määräaikainen.
      </p>
      <div className="flex gap-2">
        <input
          className="field flex-1 font-mono tracking-wider uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX"
          autoComplete="off"
        />
        <button
          type="button"
          className="btn-primary shrink-0"
          disabled={busy}
          onClick={() => void redeem()}
        >
          Avaa
        </button>
      </div>
    </div>
  );
}
