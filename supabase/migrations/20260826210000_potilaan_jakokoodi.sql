-- Potilas luo jakokoodin, laakari avaa potilaan datan koodilla.
-- Ei pysyvaa potilaslistaa — paasy care_sessions-istunnon kautta.

create table if not exists public.patient_access_codes (
  id text primary key default ('pac_' || replace((extensions.gen_random_uuid())::text, '-', '')),
  patient_id text not null references public.users(id),
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_doctor_id text references public.users(id),
  constraint patient_access_codes_expires_check
    check (expires_at > created_at)
);
comment on table public.patient_access_codes is
  'Potilaan luoma jakokoodi laakarille. Kantaan vain hash, ei selvakielista koodia.';

create index if not exists patient_access_codes_patient_idx
  on public.patient_access_codes (patient_id, created_at desc);
create index if not exists patient_access_codes_hash_idx
  on public.patient_access_codes (code_hash)
  where revoked_at is null and redeemed_at is null;

create table if not exists public.care_sessions (
  id text primary key default ('cs_' || replace((extensions.gen_random_uuid())::text, '-', '')),
  patient_id text not null references public.users(id),
  doctor_id text not null references public.users(id),
  access_code_id text references public.patient_access_codes(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint care_sessions_expires_check
    check (expires_at > created_at)
);
comment on table public.care_sessions is
  'Laakarin valiaikainen paasy potilaaseen koodin lunastuksen jalkeen.';

create index if not exists care_sessions_doctor_active_idx
  on public.care_sessions (doctor_id, expires_at desc)
  where ended_at is null;
create index if not exists care_sessions_patient_idx
  on public.care_sessions (patient_id, created_at desc);

-- Laakarin paasy: enrollment TAI aktiivinen care_session.
create or replace function private.is_my_patient(p_patient_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    where e.patient_id = p_patient_id
      and e.doctor_id = private.app_user_id()
      and e.status = 'active'
  )
  or exists (
    select 1 from public.care_sessions cs
    where cs.patient_id = p_patient_id
      and cs.doctor_id = private.app_user_id()
      and cs.ended_at is null
      and cs.expires_at > now()
  );
$$;

create or replace function private.satunnainen_jakokoodi()
returns text language sql volatile set search_path = '' as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::int + 1, 1),
    ''
  )
  from generate_series(1, 8);
$$;

revoke all on function private.satunnainen_jakokoodi() from public;
grant execute on function private.satunnainen_jakokoodi() to authenticated;

create or replace function public.create_patient_access_code()
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_patient_id text;
  v_code text;
  v_hash text;
  v_expires timestamptz;
begin
  v_patient_id := private.app_user_id();
  if v_patient_id is null then
    raise exception 'Kirjautuminen vaaditaan';
  end if;
  if private.app_role() <> 'potilas' then
    raise exception 'Vain potilas voi luoda jakokoodin';
  end if;

  update public.patient_access_codes
  set revoked_at = now()
  where patient_id = v_patient_id
    and revoked_at is null
    and redeemed_at is null;

  v_code := private.satunnainen_jakokoodi();
  v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');
  v_expires := now() + interval '24 hours';

  insert into public.patient_access_codes (patient_id, code_hash, expires_at)
  values (v_patient_id, v_hash, v_expires);

  return json_build_object(
    'code', substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4),
    'expires_at', v_expires
  );
end $$;

create or replace function public.revoke_patient_access_code()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_patient_id text;
begin
  v_patient_id := private.app_user_id();
  if v_patient_id is null then
    raise exception 'Kirjautuminen vaaditaan';
  end if;
  update public.patient_access_codes
  set revoked_at = now()
  where patient_id = v_patient_id
    and revoked_at is null
    and redeemed_at is null;
end $$;

create or replace function public.redeem_patient_access_code(p_code text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_doctor_id text;
  v_normalized text;
  v_hash text;
  v_row public.patient_access_codes%rowtype;
  v_patient public.users%rowtype;
begin
  v_doctor_id := private.app_user_id();
  if v_doctor_id is null then
    raise exception 'Kirjautuminen vaaditaan';
  end if;
  if private.app_role() not in ('laakari', 'yllapito') then
    raise exception 'Vain laakari voi lunastaa koodin';
  end if;

  v_normalized := upper(regexp_replace(trim(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g'));
  if length(v_normalized) <> 8 then
    raise exception 'Koodi on virheellinen';
  end if;

  v_hash := encode(extensions.digest(v_normalized, 'sha256'), 'hex');

  select * into v_row
  from public.patient_access_codes
  where code_hash = v_hash
    and revoked_at is null
    and redeemed_at is null
    and expires_at > now()
  limit 1;

  if not found then
    raise exception 'Koodi on vanhentunut, peruttu tai virheellinen';
  end if;

  select * into v_patient from public.users where id = v_row.patient_id;
  if not found then
    raise exception 'Potilasta ei loydy';
  end if;

  insert into public.care_sessions (patient_id, doctor_id, access_code_id, expires_at)
  values (v_row.patient_id, v_doctor_id, v_row.id, v_row.expires_at);

  update public.patient_access_codes
  set redeemed_at = now(),
      redeemed_by_doctor_id = v_doctor_id
  where id = v_row.id;

  return json_build_object(
    'patient_id', v_patient.id,
    'full_name', v_patient.full_name,
    'email', v_patient.email,
    'expires_at', v_row.expires_at
  );
end $$;

revoke all on function public.create_patient_access_code() from public;
revoke all on function public.revoke_patient_access_code() from public;
revoke all on function public.redeem_patient_access_code(text) from public;
grant execute on function public.create_patient_access_code() to authenticated;
grant execute on function public.revoke_patient_access_code() to authenticated;
grant execute on function public.redeem_patient_access_code(text) to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.patient_access_codes enable row level security;
alter table public.patient_access_codes force row level security;
alter table public.care_sessions enable row level security;
alter table public.care_sessions force row level security;

drop policy if exists access_codes_select on public.patient_access_codes;
create policy access_codes_select on public.patient_access_codes
  for select to authenticated
  using (patient_id = private.app_user_id());

drop policy if exists care_sessions_select on public.care_sessions;
create policy care_sessions_select on public.care_sessions
  for select to authenticated
  using (
    patient_id = private.app_user_id()
    or doctor_id = private.app_user_id()
  );

revoke all on table public.patient_access_codes from anon;
revoke all on table public.care_sessions from anon;
revoke insert, update, delete on table public.patient_access_codes from authenticated;
revoke insert, update, delete on table public.care_sessions from authenticated;
grant select on table public.patient_access_codes to authenticated;
grant select on table public.care_sessions to authenticated;

drop trigger if exists access_codes_audit on public.patient_access_codes;
create trigger access_codes_audit
  after insert or update or delete on public.patient_access_codes
  for each row execute function private.kirjaa_audit();

drop trigger if exists care_sessions_audit on public.care_sessions;
create trigger care_sessions_audit
  after insert or update or delete on public.care_sessions
  for each row execute function private.kirjaa_audit();
