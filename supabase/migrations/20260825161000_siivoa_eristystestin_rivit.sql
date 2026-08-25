-- RLS-eristystesti tarvitsi toiselle potilaalle rivit, joita vasten
-- tarkistettiin ettei niita nay ristiin. Testin jaljet siivotaan pois.
delete from public.patient_tasks       where patient_id = 'usr_potilas_toinen' and title = 'SALAINEN TEHTAVA';
delete from public.symptom_reports     where patient_id = 'usr_potilas_toinen' and symptoms = array['SALAINEN OIRE'];
delete from public.metric_measurements where patient_id = 'usr_potilas_toinen' and metric = 'weight' and value = 77.7;
delete from public.care_events         where patient_id = 'usr_potilas_toinen' and title = 'SALAINEN TAPAHTUMA';
delete from public.patient_targets     where patient_id = 'usr_potilas_toinen';

-- Testit kuittasivat demopotilaan tehtavia; palautetaan lahtotilanne.
update public.patient_tasks
  set done = title in ('Mittaa aamun verenpaine', 'Käy verikokeissa')
  where patient_id = 'usr_potilas_demo';
