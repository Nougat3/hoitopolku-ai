-- Hoitopolku v1 -- perustaulut.
-- Taman migraation sisalto on haettu tuotantokannasta (supabase_migrations.schema_migrations,
-- versio 20260823123211). Tiedosto puuttui repositoriosta, jolloin skeemaa ei voinut
-- rakentaa tyhjasta: kaikki myohemmat migraatiot vain muokkaavat naita tauluja.

create table if not exists users (
  id text primary key,
  email text not null unique,
  role text not null,
  idp_sub text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invites (
  id text primary key,
  token_hash text not null unique,
  email text not null,
  role text not null,
  invited_by_id text not null references users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  initial_step text,
  created_at timestamptz not null default now()
);

create table if not exists consents (
  id text primary key,
  user_id text not null references users(id),
  version text not null,
  accepted_at timestamptz not null default now()
);

create table if not exists enrollments (
  id text primary key,
  patient_id text not null references users(id),
  doctor_id text not null references users(id),
  status text not null,
  pregnancy_excluded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists htn_evidence (
  id text primary key,
  enrollment_id text not null references enrollments(id),
  type text not null,
  note text,
  confirmed_by_id text not null references users(id),
  confirmed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists baselines (
  id text primary key,
  patient_id text not null references users(id),
  rr_sys integer,
  rr_dia integer,
  ldl double precision,
  glucose double precision,
  hba1c integer,
  weight double precision,
  height_cm integer,
  recorded_at timestamptz not null default now()
);

create table if not exists bp_measurements (
  id text primary key,
  patient_id text not null references users(id),
  sys integer not null,
  dia integer not null,
  measured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists steps (
  id text primary key,
  patient_id text not null references users(id),
  body text not null,
  status text not null,
  acked_by_id text references users(id),
  acked_at timestamptz,
  home_target_sys integer not null default 135,
  home_target_dia integer not null default 85,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists baseline_studies (
  id text primary key,
  enrollment_id text not null references enrollments(id),
  code text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_log (
  id text primary key,
  actor_id text not null references users(id),
  action text not null,
  entity text not null,
  entity_id text not null,
  at timestamptz not null default now(),
  meta text
);
