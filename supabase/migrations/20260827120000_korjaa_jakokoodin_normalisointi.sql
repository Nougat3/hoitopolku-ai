-- Jakokoodin lunastus strippasi pienet kirjaimet ennen upper()-kutsua:
-- regexp_replace(..., '[^A-Z0-9]') + sitten upper() → "ab12-cd34" muuttui "1234".
-- UI:n text-transform:uppercase ei muuta input.valuea, joten manuaalinen syöttö
-- epäonnistui usein viestillä "Koodi on virheellinen".

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

  -- Upper ensin, sitten poista erottimet (viiva, välilyönti ym.).
  v_normalized := regexp_replace(upper(trim(coalesce(p_code, ''))), '[^A-Z0-9]', '', 'g');
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

revoke all on function public.redeem_patient_access_code(text) from public;
grant execute on function public.redeem_patient_access_code(text) to authenticated;
