-- Seed data for development and testing
-- Run this after the initial schema migration

-- Insert test profiles (users must be created in Supabase Auth first)
-- These are example IDs - replace with actual user IDs from your Supabase project

-- Example Doctor Profile
INSERT INTO public.profiles (id, role, full_name, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'doctor', 'Anna Lehtinen', '+358401234567');

INSERT INTO public.doctors (id, user_id, medical_title, specialization, license_number) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'LL', 'Yleislääketiede', 'FI-12345');

-- Example Patient Profile
INSERT INTO public.profiles (id, role, full_name, phone) VALUES
  ('00000000-0000-0000-0000-000000000002', 'patient', 'Matti Meikäläinen', '+358501234567');

INSERT INTO public.patients (id, user_id, date_of_birth, gender, care_path_start_date) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '1975-05-15', 'male', '2026-06-01');

-- Create a care path (Hoitopolku)
INSERT INTO public.care_paths (
  id, patient_id, doctor_id, condition, status,
  target_systolic, target_diastolic, target_glucose, target_weight,
  started_at
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'hypertension',
  'active',
  135, 85, 6.0, 89.5,
  '2026-06-01'
);

-- Add medications
INSERT INTO public.medications (care_path_id, name, dosage, morning, evening, started_at) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Ramipriili', '10 mg', true, false, '2026-06-08'),
  ('30000000-0000-0000-0000-000000000001', 'Atorvastatiini', '20 mg', false, true, '2026-06-01'),
  ('30000000-0000-0000-0000-000000000001', 'Metformiini', '500 mg', true, true, '2026-01-01');

-- Add medication change history
INSERT INTO public.medication_changes (medication_id, changed_by, old_dosage, new_dosage, reason, changed_at) VALUES
  ((SELECT id FROM public.medications WHERE name = 'Ramipriili' LIMIT 1),
   '10000000-0000-0000-0000-000000000001',
   '5 mg', '10 mg',
   'Verenpaine ei saavuttanut tavoitetta pienemmällä annoksella',
   '2026-07-12'::timestamptz);

-- Add sample blood pressure measurements (last 14 days)
INSERT INTO public.measurements (care_path_id, measurement_type, systolic, diastolic, time_of_day, measured_at)
SELECT 
  '30000000-0000-0000-0000-000000000001',
  'blood_pressure',
  140 + (random() * 20)::int - 10,
  85 + (random() * 15)::int - 7,
  CASE WHEN random() > 0.5 THEN 'morning' ELSE 'evening' END,
  (NOW() - (i || ' days')::interval) + (CASE WHEN random() > 0.5 THEN '08:00'::time ELSE '20:00'::time END)
FROM generate_series(0, 13) AS i;

-- Add sample glucose measurements
INSERT INTO public.measurements (care_path_id, measurement_type, glucose, time_of_day, measured_at)
SELECT 
  '30000000-0000-0000-0000-000000000001',
  'glucose',
  6.5 + (random() * 2) - 1,
  'morning',
  (NOW() - (i || ' days')::interval) + '07:30'::time
FROM generate_series(0, 13) AS i
WHERE random() > 0.15; -- Some days missing

-- Add sample weight measurements (weekly)
INSERT INTO public.measurements (care_path_id, measurement_type, weight, time_of_day, measured_at)
SELECT 
  '30000000-0000-0000-0000-000000000001',
  'weight',
  94.2 - (i * 0.5) + (random() * 0.3),
  'morning',
  (NOW() - (i * 7 || ' days')::interval) + '07:00'::time
FROM generate_series(0, 11) AS i;

-- Add lab results
INSERT INTO public.lab_results (care_path_id, test_name, value, unit, reference_min, reference_max, test_date) VALUES
  ('30000000-0000-0000-0000-000000000001', 'LDL-kolesteroli', 3.1, 'mmol/l', 0, 3.0, '2026-08-20'),
  ('30000000-0000-0000-0000-000000000001', 'HbA1c', 49, 'mmol/mol', 20, 48, '2026-08-20'),
  ('30000000-0000-0000-0000-000000000001', 'Kalium', 4.2, 'mmol/l', 3.5, 5.0, '2026-08-20'),
  ('30000000-0000-0000-0000-000000000001', 'Kreatiniini', 82, 'µmol/l', 60, 100, '2026-08-20');

-- Add symptoms tracking
INSERT INTO public.symptoms (care_path_id, symptom_name, severity, recorded_date)
SELECT 
  '30000000-0000-0000-0000-000000000001',
  'Huimaus',
  CASE 
    WHEN i <= 3 THEN (random() * 3)::int
    WHEN i <= 7 THEN 0
    ELSE -1 -- ei kirjausta
  END,
  (CURRENT_DATE - i || ' days')::date
FROM generate_series(0, 13) AS i;

INSERT INTO public.symptoms (care_path_id, symptom_name, severity, recorded_date)
SELECT 
  '30000000-0000-0000-0000-000000000001',
  'Yskä',
  CASE 
    WHEN i <= 4 THEN 0
    WHEN i <= 9 THEN (2 + random() * 2)::int
    ELSE (1 + random())::int
  END,
  (CURRENT_DATE - i || ' days')::date
FROM generate_series(0, 13) AS i;

-- Add events to timeline
INSERT INTO public.events (care_path_id, event_type, title, description, event_date, status) VALUES
  ('30000000-0000-0000-0000-000000000001', 'lab_test', 'Verikokeet', 'LDL, HbA1c, K, krea', '2026-06-09', 'completed'),
  ('30000000-0000-0000-0000-000000000001', 'medication_start', 'Lääkitys aloitettu', 'Ramipriili 5 mg', '2026-06-15', 'completed'),
  ('30000000-0000-0000-0000-000000000001', 'medication_change', 'Annos nostettu', 'Ramipriili 5 mg → 10 mg', '2026-07-12', 'completed'),
  ('30000000-0000-0000-0000-000000000001', 'lab_test', 'Verikokeet', 'Turvakokeet annosnoston jälkeen', '2026-08-20', 'completed'),
  ('30000000-0000-0000-0000-000000000001', 'appointment', 'Kontrollikäynti', 'Etävastaanotto, 20 min', '2026-09-18', 'scheduled'),
  ('30000000-0000-0000-0000-000000000001', 'milestone', 'Loppuarvio, 6 kk', 'Kaikki neljä arvoa käydään läpi', '2026-12-10', 'scheduled');

COMMENT ON FILE IS 'Seed data for development - creates one doctor, one patient, and a complete care path with measurements';
