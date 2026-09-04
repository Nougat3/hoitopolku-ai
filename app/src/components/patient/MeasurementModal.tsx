import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/shared/Modal';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { parseNumber } from '@/utils/formatting';

interface MeasurementModalProps {
  open: boolean;
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

type Kind = 'bp' | 'glucose' | 'weight';

export function MeasurementModal({
  open,
  patientId,
  onClose,
  onSaved
}: MeasurementModalProps) {
  const [kind, setKind] = useState<Kind>('bp');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [value, setValue] = useState('');
  const [tod, setTod] = useState<'aamu' | 'ilta'>('aamu');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      if (kind === 'bp') {
        const s = parseNumber(sys);
        const d = parseNumber(dia);
        const p = pulse ? parseNumber(pulse) : null;
        if (s === null || d === null) throw new Error('Syötä systolinen ja diastolinen');
        if (s < 70 || s > 260 || d < 40 || d > 160 || s <= d) {
          throw new Error('Tarkista verenpainearvot (sys 70–260, dia 40–160, sys > dia)');
        }
        const { error: err } = await supabase.from('bp_measurements').insert({
          patient_id: patientId,
          sys: Math.round(s),
          dia: Math.round(d),
          pulse: p !== null ? Math.round(p) : null,
          time_of_day: tod
        });
        if (err) throw err;
      } else {
        const v = parseNumber(value);
        if (v === null) throw new Error('Syötä arvo');
        if (kind === 'glucose' && (v < 1.5 || v > 35)) {
          throw new Error('Verensokeri 1,5–35 mmol/l');
        }
        if (kind === 'weight' && (v < 30 || v > 300)) {
          throw new Error('Paino 30–300 kg');
        }
        const { error: err } = await supabase.from('metric_measurements').insert({
          patient_id: patientId,
          metric: kind === 'glucose' ? 'glucose' : 'weight',
          value: v,
          source: 'patient'
        });
        if (err) throw err;
      }
      toast.success('Tallennettu');
      setSys('');
      setDia('');
      setPulse('');
      setValue('');
      onSaved();
      onClose();
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Kirjaa mittaus" onClose={onClose}>
      <div className="flex gap-2 mb-4">
        {(
          [
            ['bp', 'Verenpaine'],
            ['glucose', 'Verensokeri'],
            ['weight', 'Paino']
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${
              kind === k
                ? 'bg-[var(--k)] text-white border-[var(--k)]'
                : 'border-[var(--line)] text-[var(--mid)]'
            }`}
            onClick={() => setKind(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === 'bp' ? (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-[var(--mid)]">Systolinen</span>
            <input
              className="field"
              inputMode="numeric"
              value={sys}
              onChange={(e) => setSys(e.target.value)}
              placeholder="esim. 132"
            />
          </label>
          <label className="block">
            <span className="text-sm text-[var(--mid)]">Diastolinen</span>
            <input
              className="field"
              inputMode="numeric"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              placeholder="esim. 84"
            />
          </label>
          <label className="block">
            <span className="text-sm text-[var(--mid)]">Pulssi (valinnainen)</span>
            <input
              className="field"
              inputMode="numeric"
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              placeholder="esim. 68"
            />
          </label>
          <div className="flex gap-2">
            {(['aamu', 'ilta'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${
                  tod === t
                    ? 'bg-[var(--g0)] border-[var(--g)]'
                    : 'border-[var(--line)]'
                }`}
                onClick={() => setTod(t)}
              >
                {t === 'aamu' ? 'Aamu' : 'Ilta'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <label className="block">
          <span className="text-sm text-[var(--mid)]">
            {kind === 'glucose' ? 'mmol/l' : 'kg'}
          </span>
          <input
            className="field"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === 'glucose' ? 'esim. 6,2' : 'esim. 89,5'}
          />
        </label>
      )}

      {error && <p className="text-[var(--red)] text-sm mt-3 font-medium">{error}</p>}

      <button
        type="button"
        className="btn-primary w-full mt-5"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? 'Tallennetaan…' : 'Tallenna'}
      </button>
    </Modal>
  );
}
