-- Nimet: sovellus tervehtii etunimella ja nayttaa laakarin kortissa nimikkeen.
update public.users set full_name = 'Matti Korhonen'  where id = 'usr_potilas_demo';
update public.users set full_name = 'Liisa Virtanen'  where id = 'usr_potilas_toinen';
update public.users set full_name = 'Anna Lehtinen',
                        title = 'Yleislääketieteen erikoislääkäri, LL'
  where id = 'usr_laakari_demo';
update public.users set full_name = 'Pekka Salo',
                        title = 'Sisätautien erikoislääkäri, LT'
  where id = 'usr_laakari_toinen';

-- Migraatio on ajettavissa uudelleen: demopotilaan sisalto rakennetaan aina
-- puhtaalta poydalta, jotta rivit eivat kertaudu.
delete from public.bp_measurements    where patient_id = 'usr_potilas_demo';
delete from public.metric_measurements where patient_id = 'usr_potilas_demo';
delete from public.patient_tasks      where patient_id = 'usr_potilas_demo';
delete from public.care_events        where patient_id = 'usr_potilas_demo';
delete from public.patient_targets    where patient_id = 'usr_potilas_demo';

-- ── verenpaine: 12 viikon kotimittaussarja ───────────────────────────
-- Taso laskee kahdessa portaassa: laakitys viikolla 2 ja annoksen nosto
-- viikolla 6. Vaihtelu on satunnaista, koska oikea kotimittaus ei ole tasainen.
with paivat as (
  select d,
         152
         - least(8.0, greatest(0, d - 14) * 0.5)
         - least(5.0, greatest(0, d - 42) * 0.35) as base
  from generate_series(0, 83) as d
),
kirjaukset as (
  select d, base + 3 as keskus, 'aamu' as tod, interval '7 hours 10 minutes' as kello from paivat
  union all
  select d, base - 2 as keskus, 'ilta' as tod, interval '20 hours 30 minutes' as kello from paivat
),
arvot as (
  select k.tod,
         (current_date - (83 - k.d)) + k.kello as hetki,
         greatest(70, least(260, round(k.keskus + (random() - 0.5) * 22)))::int as sys,
         k.d
  from kirjaukset k
  -- Pari prosenttia paivista jaa valiin ja paivat 28-37 ovat lomatauko.
  where random() > 0.12
    and not (k.d between 28 and 37 and random() > 0.05)
)
insert into public.bp_measurements (patient_id, sys, dia, pulse, time_of_day, measured_at)
select 'usr_potilas_demo',
       a.sys,
       greatest(40, least(160, round(a.sys * 0.615 + (random() - 0.5) * 6)))::int,
       round(66 + (random() - 0.5) * 12)::int,
       a.tod,
       a.hetki
from arvot a
where a.hetki <= now();

-- ── paino: viikkopunnitus ────────────────────────────────────────────
insert into public.metric_measurements (patient_id, metric, value, measured_at, source)
select 'usr_potilas_demo', 'weight',
       round((94.2 - w * 0.55 + (random() - 0.5) * 0.6)::numeric, 1),
       (current_date - (83 - w * 7)) + interval '7 hours',
       'patient'
from generate_series(0, 11) as w
where (current_date - (83 - w * 7)) + interval '7 hours' <= now();

insert into public.metric_measurements (patient_id, metric, value, measured_at, source)
values
  ('usr_potilas_demo', 'waist', 102, (current_date - 81) + interval '7 hours', 'patient'),
  ('usr_potilas_demo', 'ldl',   4.6, (current_date - 75) + interval '9 hours', 'lab'),
  ('usr_potilas_demo', 'ldl',   3.1, (current_date - 3)  + interval '9 hours', 'lab'),
  ('usr_potilas_demo', 'hba1c', 51,  (current_date - 75) + interval '9 hours', 'lab'),
  ('usr_potilas_demo', 'hba1c', 49,  (current_date - 3)  + interval '9 hours', 'lab');

-- ── taman viikon tehtavat ────────────────────────────────────────────
insert into public.patient_tasks (patient_id, title, detail, due_hint, target_view, sort_order, done, done_at)
values
  ('usr_potilas_demo', 'Mittaa aamun verenpaine', 'Kaksi mittausta viiden minuutin välein',
   'Tehty klo 7.10', null, 1, true, now() - interval '6 hours'),
  ('usr_potilas_demo', 'Punnitse itsesi', 'Kerran viikossa, mieluiten samana aamuna',
   'Tämän viikon aikana', 'mittaa', 2, false, null),
  ('usr_potilas_demo', 'Käy verikokeissa', 'Kolesteroli, verensokeri ja munuaisarvot',
   'Tehty viikko sitten', null, 3, true, now() - interval '3 days'),
  ('usr_potilas_demo', 'Vahvista vastaanottoaika', 'Etävastaanotto, 40 min',
   'Vahvista ennen maanantaita', 'hoitopolku', 4, false, null),
  ('usr_potilas_demo', 'Täytä oirekysely', 'Ennen seuraavaa vastaanottoa',
   'Kestää noin minuutin', 'kysely', 5, false, null);

-- ── hoitopolun aikajana ──────────────────────────────────────────────
insert into public.care_events (patient_id, when_label, title, detail, status, card_note, card_button, sort_order)
values
  ('usr_potilas_demo', 'Viikko 1', 'Hoitopolku alkoi',
   'Valitsit lääkäriksesi Anna Lehtisen.', 'done', null, null, 1),
  ('usr_potilas_demo', 'Viikko 1-2', 'Mittausjakso, 7 vrk',
   'Kotimittaukset kirjattu. Sarja riitti diagnoosiin.', 'done', null, null, 2),
  ('usr_potilas_demo', 'Viikko 2', 'Verikokeet',
   'Kolesteroli, verensokeri, munuaisarvot ja suolat.', 'done', null, null, 3),
  ('usr_potilas_demo', 'Ensi viikolla', 'Lääkärin etävastaanotto',
   '40 min. Käytte tulokset läpi ja tarkistatte hoidon vasteen.', 'now',
   'Lääkärilläsi on jo kaikki tuloksesi. Sinun ei tarvitse valmistautua mitenkään.',
   'Siirry vastaanotolle', 4),
  ('usr_potilas_demo', 'Viikko 14', 'Uusi mittausjakso',
   '7 vrk mittauksia annoksen noston jälkeen.', 'next', null, null, 5),
  ('usr_potilas_demo', 'Viikko 18', 'Kontrolli',
   '20 min. Vaste, haittavaikutukset ja tarvittaessa annoksen säätö.', 'next', null, null, 6),
  ('usr_potilas_demo', 'Viikko 20', 'Loppuverikokeet',
   'Samat kokeet kuin alussa, jotta muutos on nähtävissä.', 'next', null, null, 7),
  ('usr_potilas_demo', 'Kuukausi 6', 'Loppuarvio',
   'Katsotaan kaikki neljä lukua ja sovitaan jatkosta.', 'next', null, null, 8);

-- ── tavoitearvot ─────────────────────────────────────────────────────
insert into public.patient_targets (patient_id, bp_sys, bp_dia, ldl, hba1c, weight, weight_note)
values ('usr_potilas_demo', 135, 85, 2.6, 53, 89.5, 'noin 5 % laskua puolessa vuodessa');
