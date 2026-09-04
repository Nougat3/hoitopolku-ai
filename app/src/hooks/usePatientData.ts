import { useCallback, useEffect, useState } from 'react';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import type {
  BpMeasurement,
  CareEvent,
  CareSession,
  MetricKey,
  MetricMeasurement,
  PatientMedication,
  PatientTask,
  PatientTargets,
  SymptomReport
} from '@/types/database';

function usePatientQuery<T>(
  patientId: string | null | undefined,
  fetcher: (patientId: string) => Promise<T>,
  realtimeTable?: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!patientId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetcher(patientId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }, [patientId, fetcher]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!patientId || !realtimeTable) return;

    const channel = supabase
      .channel(`rt-${patientId}-${realtimeTable}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: realtimeTable,
          filter: `patient_id=eq.${patientId}`
        },
        () => {
          void reload();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [patientId, realtimeTable, reload]);

  return { data, loading, error, reload };
}

export function useBpMeasurements(patientId: string | null | undefined) {
  const fetcher = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('bp_measurements')
      .select('*')
      .eq('patient_id', id)
      .order('measured_at', { ascending: true });
    if (error) throw error;
    return data as BpMeasurement[];
  }, []);

  return usePatientQuery(patientId, fetcher, 'bp_measurements');
}

export function useMetricMeasurements(
  patientId: string | null | undefined,
  metric?: MetricKey
) {
  const fetcher = useCallback(
    async (id: string) => {
      let q = supabase
        .from('metric_measurements')
        .select('*')
        .eq('patient_id', id)
        .order('measured_at', { ascending: true });
      if (metric) q = q.eq('metric', metric);
      const { data, error } = await q;
      if (error) throw error;
      return data as MetricMeasurement[];
    },
    [metric]
  );

  return usePatientQuery(patientId, fetcher, 'metric_measurements');
}

export function useMedications(patientId: string | null | undefined) {
  const fetcher = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_id', id)
      .order('started_on', { ascending: false });
    if (error) throw error;
    return data as PatientMedication[];
  }, []);

  return usePatientQuery(patientId, fetcher, 'patient_medications');
}

export function useTargets(patientId: string | null | undefined) {
  const fetcher = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('patient_targets')
      .select('*')
      .eq('patient_id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as PatientTargets | null) ?? null;
  }, []);

  return usePatientQuery(patientId, fetcher, 'patient_targets');
}

export function useTasks(patientId: string | null | undefined) {
  const fetcher = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('patient_tasks')
      .select('*')
      .eq('patient_id', id)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data as PatientTask[];
  }, []);

  return usePatientQuery(patientId, fetcher, 'patient_tasks');
}

export function useSymptoms(patientId: string | null | undefined) {
  const fetcher = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('symptom_reports')
      .select('*')
      .eq('patient_id', id)
      .order('reported_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return data as SymptomReport[];
  }, []);

  return usePatientQuery(patientId, fetcher, 'symptom_reports');
}

export function useCareEvents(patientId: string | null | undefined) {
  const fetcher = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('care_events')
      .select('*')
      .eq('patient_id', id)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data as CareEvent[];
  }, []);

  return usePatientQuery(patientId, fetcher, 'care_events');
}

export function useCareSessions(doctorId: string | null | undefined) {
  const [data, setData] = useState<(CareSession & { patient?: { full_name: string | null; email: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!doctorId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: sessions, error: sessErr } = await supabase
        .from('care_sessions')
        .select('*')
        .eq('doctor_id', doctorId)
        .is('ended_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (sessErr) throw sessErr;

      const rows = (sessions ?? []) as CareSession[];
      const patientIds = [...new Set(rows.map((s) => s.patient_id))];
      let patients: Record<string, { full_name: string | null; email: string }> = {};
      if (patientIds.length) {
        const { data: users, error: userErr } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', patientIds);
        if (userErr) throw userErr;
        patients = Object.fromEntries(
          (users ?? []).map((u) => [u.id, { full_name: u.full_name, email: u.email }])
        );
      }

      setData(rows.map((s) => ({ ...s, patient: patients[s.patient_id] })));
      setError(null);
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!doctorId) return;
    const channel = supabase
      .channel(`sessions-${doctorId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'care_sessions', filter: `doctor_id=eq.${doctorId}` },
        () => {
          void reload();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [doctorId, reload]);

  return { data, loading, error, reload };
}

export function useDoctorForPatient(patientId: string | null | undefined) {
  const fetcher = useCallback(async (id: string) => {
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .select('doctor_id, status')
      .eq('patient_id', id)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    if (!enrollment) return null;
    const { data: doctor, error: dErr } = await supabase
      .from('users')
      .select('id, full_name, title, email')
      .eq('id', enrollment.doctor_id)
      .single();
    if (dErr) throw dErr;
    return doctor;
  }, []);

  return usePatientQuery(patientId, fetcher);
}
