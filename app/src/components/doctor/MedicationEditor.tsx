import { useState } from 'react';
import toast from 'react-hot-toast';
import type { PatientMedication } from '@/types/database';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { formatDate } from '@/utils/formatting';

interface MedicationEditorProps {
  patientId: string;
  doctorId: string;
  medications: PatientMedication[];
  onChanged: () => void;
  readOnly?: boolean;
}

export function MedicationEditor({
  patientId,
  doctorId,
  medications,
  onChanged,
  readOnly = false
}: MedicationEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dose, setDose] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDose, setNewDose] = useState('');

  const active = medications.filter((m) => !m.ended_on);

  async function saveDose(id: string) {
    try {
      const { error } = await supabase
        .from('patient_medications')
        .update({ dose: dose.trim() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Annos päivitetty');
      setEditingId(null);
      onChanged();
    } catch (err) {
      toast.error(handleSupabaseError(err));
    }
  }

  async function addMed() {
    if (!newName.trim() || !newDose.trim()) {
      toast.error('Nimi ja annos pakollisia');
      return;
    }
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from('patient_medications').insert({
        patient_id: patientId,
        name: newName.trim(),
        dose: newDose.trim(),
        started_on: today,
        linked_metric: 'bp',
        created_by: doctorId
      });
      if (error) throw error;
      toast.success('Lääke lisätty');
      setAdding(false);
      setNewName('');
      setNewDose('');
      onChanged();
    } catch (err) {
      toast.error(handleSupabaseError(err));
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">Lääkitys</h3>
        {!readOnly && (
          <button
            type="button"
            className="text-sm font-semibold text-[var(--g)]"
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? 'Peruuta' : '+ Lisää'}
          </button>
        )}
      </div>

      {adding && (
        <div className="space-y-2 mb-4 p-3 rounded-xl bg-[var(--g0)]">
          <input
            className="field"
            placeholder="Lääkkeen nimi"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="field"
            placeholder="Annos, esim. 5 mg × 1"
            value={newDose}
            onChange={(e) => setNewDose(e.target.value)}
          />
          <button type="button" className="btn-primary w-full" onClick={() => void addMed()}>
            Tallenna lääke
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {active.map((m) => (
          <li key={m.id} className="border-b border-[var(--line)] pb-3 last:border-0">
            <div className="font-semibold">{m.name}</div>
            {editingId === m.id ? (
              <div className="flex gap-2 mt-2">
                <input
                  className="field flex-1"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void saveDose(m.id)}
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-[var(--mid)] text-sm">{m.dose}</span>
                {!readOnly && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--blue)]"
                    onClick={() => {
                      setEditingId(m.id);
                      setDose(m.dose);
                    }}
                  >
                    Muuta annosta
                  </button>
                )}
              </div>
            )}
            <div className="text-xs text-[var(--mid2)] mt-1">
              Alkoi {formatDate(new Date(m.started_on))}
              {m.note ? ` · ${m.note}` : ''}
            </div>
          </li>
        ))}
        {!active.length && (
          <li className="text-sm text-[var(--mid)]">Ei aktiivisia lääkkeitä.</li>
        )}
      </ul>
    </div>
  );
}
