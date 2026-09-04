import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/shared/Modal';
import { supabase, handleSupabaseError } from '@/lib/supabase';

const OPTIONS = [
  'Huimaus',
  'Päänsärky',
  'Väsymys',
  'Turvotus',
  'Rintakipu',
  'Hengenahdistus',
  'Pahoinvointi'
];

interface SymptomModalProps {
  open: boolean;
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SymptomModal({ open, patientId, onClose, onSaved }: SymptomModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState(3);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(s: string) {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function save() {
    if (!selected.length) {
      setError('Valitse vähintään yksi oire');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('symptom_reports').insert({
        patient_id: patientId,
        symptoms: selected,
        severity,
        note: note.trim() || null
      });
      if (err) throw err;
      toast.success('Oireet kirjattu');
      setSelected([]);
      setNote('');
      onSaved();
      onClose();
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Kirjaa oireita" onClose={onClose}>
      <div className="flex flex-wrap gap-2 mb-4">
        {OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
              selected.includes(s)
                ? 'bg-[var(--k)] text-white border-[var(--k)]'
                : 'border-[var(--line)] text-[var(--mid)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <label className="block mb-3">
        <span className="text-sm text-[var(--mid)]">Voimakkuus {severity}/5</span>
        <input
          type="range"
          min={1}
          max={5}
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
          className="w-full mt-1"
        />
      </label>
      <label className="block">
        <span className="text-sm text-[var(--mid)]">Lisätieto</span>
        <textarea
          className="field min-h-[80px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
        />
      </label>
      {error && <p className="text-[var(--red)] text-sm mt-2">{error}</p>}
      <button
        type="button"
        className="btn-primary w-full mt-4"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? 'Tallennetaan…' : 'Tallenna'}
      </button>
    </Modal>
  );
}
