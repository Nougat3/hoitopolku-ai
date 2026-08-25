-- HUOM: taman migraation sarakekohtainen revoke ei toiminut tarkoitetusti.
-- Korjaus on migraatiossa 20260825104537_korjaa_roolin_korotusaukko.sql.
-- Rivit on jatetty tahan sellaisenaan, koska ne on jo ajettu tuotantoon.
revoke update (id, role, auth_user_id, email) on public.users from authenticated;
revoke update (id, role, auth_user_id, email) on public.users from anon;

-- Potilastietoa ei poisteta selaimesta lainkaan.
revoke delete on public.bp_measurements from authenticated, anon;
revoke delete on public.baselines from authenticated, anon;
revoke delete on public.consents from authenticated, anon;
revoke delete on public.enrollments from authenticated, anon;
revoke delete on public.htn_evidence from authenticated, anon;
revoke delete on public.steps from authenticated, anon;
revoke delete on public.baseline_studies from authenticated, anon;
revoke delete on public.users from authenticated, anon;

-- Audit-loki on muuttumaton.
revoke update, delete on public.audit_log from authenticated, anon;

-- Anon-avaimella ei paase potilastietoon lainkaan. Tama on toinen
-- suojakerros policyjen lisaksi: vaikka policy olisi vaarin, anon
-- ei paase tauluihin ollenkaan.
revoke all on public.users from anon;
revoke all on public.invites from anon;
revoke all on public.consents from anon;
revoke all on public.enrollments from anon;
revoke all on public.htn_evidence from anon;
revoke all on public.baselines from anon;
revoke all on public.bp_measurements from anon;
revoke all on public.steps from anon;
revoke all on public.baseline_studies from anon;
revoke all on public.audit_log from anon;

-- RLS paalle. Policyt on luotu edellisessa migraatiossa, joten
-- paasy ei katkea kirjautuneilta kayttajilta.
alter table public.users enable row level security;
alter table public.invites enable row level security;
alter table public.consents enable row level security;
alter table public.enrollments enable row level security;
alter table public.htn_evidence enable row level security;
alter table public.baselines enable row level security;
alter table public.bp_measurements enable row level security;
alter table public.steps enable row level security;
alter table public.baseline_studies enable row level security;
alter table public.audit_log enable row level security;

-- Estetaan RLS:n ohittaminen myos taulun omistajalta, jotta
-- vaara yhteys ei paase ohi policyjen.
alter table public.users force row level security;
alter table public.bp_measurements force row level security;
alter table public.baselines force row level security;
alter table public.audit_log force row level security;
