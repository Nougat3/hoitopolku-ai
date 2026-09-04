-- Hoitopolku ja LääkäriPRO — Tietomalli
-- Supabase Postgres-migraatio
-- Versio: 1.0
-- Kuvaus: Perusrakenne potilastietojen, hoitopolkujen ja mittausten hallintaan

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- ============================================================================
-- 1. PROFILES (Käyttäjäprofiilit)
-- ============================================================================
-- Laajennetaan Supabasen auth.users-taulua profiilitiedoilla

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Käyttäjät näkevät oman profiilinsa"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Käyttäjät voivat päivittää oman profiilinsa"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- 2. PATIENTS (Potilastiedot)
-- ============================================================================

CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  care_path_start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS policies
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Potilaat näkevät omat tietonsa"
  ON public.patients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Lääkärit näkevät hoitosuhteessa olevat potilaat"
  ON public.patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_paths
      WHERE care_paths.patient_id = patients.id
      AND care_paths.doctor_id IN (
        SELECT id FROM public.doctors WHERE user_id = auth.uid()
      )
      AND care_paths.status = 'active'
    )
  );

-- ============================================================================
-- 3. DOCTORS (Lääkäritiedot)
-- ============================================================================

CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  medical_title TEXT, -- esim. "LL", "LT", "EL"
  specialization TEXT,
  license_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS policies
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lääkärit näkevät oman profiilinsa"
  ON public.doctors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Potilaat näkevät omat lääkärinsä"
  ON public.doctors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_paths
      WHERE care_paths.doctor_id = doctors.id
      AND care_paths.patient_id IN (
        SELECT id FROM public.patients WHERE user_id = auth.uid()
      )
      AND care_paths.status = 'active'
    )
  );

-- ============================================================================
-- 4. CARE_PATHS (Hoitopolut)
-- ============================================================================

CREATE TABLE public.care_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  condition TEXT NOT NULL, -- esim. "hypertension", "diabetes_type2"
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  target_systolic INTEGER, -- tavoiteverenpaine yläpaine
  target_diastolic INTEGER, -- tavoiteverenpaine alapaine
  target_glucose DECIMAL(4,1), -- tavoiteverensokeri
  target_weight DECIMAL(5,1), -- tavoitepaino
  started_at DATE DEFAULT CURRENT_DATE,
  completed_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.care_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Potilaat näkevät omat hoitopolkunsa"
  ON public.care_paths FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Lääkärit näkevät omat hoitopolkunsa"
  ON public.care_paths FOR SELECT
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Lääkärit voivat luoda hoitopolkuja"
  ON public.care_paths FOR INSERT
  WITH CHECK (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Lääkärit voivat päivittää hoitopolkuja"
  ON public.care_paths FOR UPDATE
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 5. MEASUREMENTS (Mittaukset)
-- ============================================================================

CREATE TABLE public.measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_path_id UUID NOT NULL REFERENCES public.care_paths(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('blood_pressure', 'glucose', 'weight')),
  systolic INTEGER, -- verenpaineen yläpaine
  diastolic INTEGER, -- verenpaineen alapaine
  glucose DECIMAL(4,1), -- verensokeri mmol/l
  weight DECIMAL(5,1), -- paino kg
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'evening', 'night')),
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_measurements_care_path ON public.measurements(care_path_id);
CREATE INDEX idx_measurements_measured_at ON public.measurements(measured_at);

-- RLS policies
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Potilaat näkevät omat mittauksensa"
  ON public.measurements FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.patients p ON cp.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Potilaat voivat lisätä mittauksia"
  ON public.measurements FOR INSERT
  WITH CHECK (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.patients p ON cp.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Lääkärit näkevät potilaiden mittaukset"
  ON public.measurements FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.doctors d ON cp.doctor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. LAB_RESULTS (Laboratoriotulokset)
-- ============================================================================

CREATE TABLE public.lab_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_path_id UUID NOT NULL REFERENCES public.care_paths(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL, -- esim. "LDL-kolesteroli", "HbA1c"
  value DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL, -- esim. "mmol/l", "mmol/mol"
  reference_min DECIMAL(10,2),
  reference_max DECIMAL(10,2),
  test_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Potilaat näkevät omat tuloksensa"
  ON public.lab_results FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.patients p ON cp.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Potilaat voivat lisätä tuloksia"
  ON public.lab_results FOR INSERT
  WITH CHECK (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.patients p ON cp.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Lääkärit näkevät potilaiden tulokset"
  ON public.lab_results FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.doctors d ON cp.doctor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Lääkärit voivat lisätä tuloksia"
  ON public.lab_results FOR INSERT
  WITH CHECK (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.doctors d ON cp.doctor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. MEDICATIONS (Lääkitykset)
-- ============================================================================

CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_path_id UUID NOT NULL REFERENCES public.care_paths(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL, -- esim. "10 mg"
  morning BOOLEAN DEFAULT false,
  evening BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  started_at DATE DEFAULT CURRENT_DATE,
  ended_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Potilaat näkevät omat lääkkeensä"
  ON public.medications FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.patients p ON cp.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Lääkärit näkevät potilaiden lääkkeet"
  ON public.medications FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.doctors d ON cp.doctor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Lääkärit voivat hallita lääkityksiä"
  ON public.medications FOR ALL
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.doctors d ON cp.doctor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. MEDICATION_CHANGES (Lääkitysmuutokset)
-- ============================================================================

CREATE TABLE public.medication_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  old_dosage TEXT,
  new_dosage TEXT NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.medication_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Potilaat näkevät lääkkeittensä historian"
  ON public.medication_changes FOR SELECT
  USING (
    medication_id IN (
      SELECT m.id FROM public.medications m
      JOIN public.care_paths cp ON m.care_path_id = cp.id
      JOIN public.patients p ON cp.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Lääkärit näkevät muutoshistorian"
  ON public.medication_changes FOR SELECT
  USING (
    medication_id IN (
      SELECT m.id FROM public.medications m
      JOIN public.care_paths cp ON m.care_path_id = cp.id
      JOIN public.doctors d ON cp.doctor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. SYMPTOMS (Oireet)
-- ============================================================================

CREATE TABLE public.symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_path_id UUID NOT NULL REFERENCES public.care_paths(id) ON DELETE CASCADE,
  symptom_name TEXT NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 0 AND 5), -- 0 = ei oiretta, 1-5 = voimakkuus
  recorded_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_symptoms_care_path ON public.symptoms(care_path_id);
CREATE INDEX idx_symptoms_date ON public.symptoms(recorded_date);

-- RLS policies
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Potilaat näkevät omat oireensa"
  ON public.symptoms FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.patients p ON cp.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Potilaat voivat kirjata oireita"
  ON public.symptoms FOR INSERT
  WITH CHECK (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.patients p ON cp.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Lääkärit näkevät potilaiden oireet"
  ON public.symptoms FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.doctors d ON cp.doctor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 10. EVENTS (Tapahtumat)
-- ============================================================================

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_path_id UUID NOT NULL REFERENCES public.care_paths(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('medication_start', 'medication_change', 'lab_test', 'appointment', 'milestone')),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Potilaat näkevät omat tapahtumansa"
  ON public.events FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.patients p ON cp.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Lääkärit näkevät potilaiden tapahtumat"
  ON public.events FOR SELECT
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.doctors d ON cp.doctor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Lääkärit voivat hallita tapahtumia"
  ON public.events FOR ALL
  USING (
    care_path_id IN (
      SELECT cp.id FROM public.care_paths cp
      JOIN public.doctors d ON cp.doctor_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. ACCESS_LOG (Pääsyloki - GDPR & Läpinäkyvyys)
-- ============================================================================

CREATE TABLE public.access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  accessed_by UUID NOT NULL REFERENCES public.profiles(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'edit', 'share')),
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_access_log_patient ON public.access_log(patient_id);
CREATE INDEX idx_access_log_accessed_at ON public.access_log(accessed_at);

-- RLS policies
ALTER TABLE public.access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Potilaat näkevät oman access lokinsa"
  ON public.access_log FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

-- Lääkärit eivät näe access logia (tarkoituksella)
-- Vain potilaat näkevät kuka on avannut heidän tietonsa

-- ============================================================================
-- FUNKTIOT: Automaattinen päivitysaika
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Lisää triggerit tauluihin joissa on updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_care_paths_updated_at BEFORE UPDATE ON public.care_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_results_updated_at BEFORE UPDATE ON public.lab_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNKTIOT: Access log -kirjaus automaattisesti
-- ============================================================================

CREATE OR REPLACE FUNCTION log_patient_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Kirjaa vain jos kyseessä on lääkäri joka katsoo potilasta
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'doctor' THEN
    INSERT INTO public.access_log (patient_id, accessed_by, access_type, accessed_at)
    SELECT 
      NEW.patient_id,
      auth.uid(),
      'view',
      NOW()
    FROM public.care_paths
    WHERE id = NEW.care_path_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggerit mittausten katselulle (esimerkkiä)
-- Voidaan lisätä myös muihin tauluihin tarpeen mukaan

-- ============================================================================
-- VIEWS: Hyödyllisiä näkymiä
-- ============================================================================

-- Näkymä: Potilaan kaikki tiedot yhdessä paikassa (lääkärille)
CREATE OR REPLACE VIEW patient_overview AS
SELECT 
  p.id as patient_id,
  prof.full_name as patient_name,
  p.date_of_birth,
  p.gender,
  cp.id as care_path_id,
  cp.condition,
  cp.status as care_path_status,
  d.id as doctor_id,
  doc_prof.full_name as doctor_name,
  d.medical_title
FROM public.patients p
JOIN public.profiles prof ON p.user_id = prof.id
JOIN public.care_paths cp ON cp.patient_id = p.id
JOIN public.doctors d ON cp.doctor_id = d.id
JOIN public.profiles doc_prof ON d.user_id = doc_prof.id;

-- RLS policy näkymälle
ALTER VIEW patient_overview SET (security_invoker = true);

COMMENT ON TABLE public.profiles IS 'Käyttäjäprofiilit - laajennus auth.users-tauluun';
COMMENT ON TABLE public.patients IS 'Potilastiedot';
COMMENT ON TABLE public.doctors IS 'Lääkäritiedot';
COMMENT ON TABLE public.care_paths IS 'Hoitopolut - yhdistää potilaan ja lääkärin';
COMMENT ON TABLE public.measurements IS 'Kotimittaukset (verenpaine, sokeri, paino)';
COMMENT ON TABLE public.lab_results IS 'Laboratoriotulokset';
COMMENT ON TABLE public.medications IS 'Lääkitykset';
COMMENT ON TABLE public.medication_changes IS 'Lääkitysmuutosten historia';
COMMENT ON TABLE public.symptoms IS 'Oireiden kirjaukset';
COMMENT ON TABLE public.events IS 'Hoitopolun tapahtumat (käynnit, kokeet, muutokset)';
COMMENT ON TABLE public.access_log IS 'Pääsyloki - GDPR-vaatimus, potilaat näkevät kuka on avannut tiedot';
