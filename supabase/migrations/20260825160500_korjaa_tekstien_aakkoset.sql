-- Demosisalto kirjoitettiin ensin ilman aakkosia, joten tekstit nakyivat
-- kayttajalle vaarin kirjoitettuina. Aiempi migraatio on sittemmin korjattu
-- lahteessa, joten tuoreessa kannassa nama paivitykset eivat osu mihinkaan.
update public.users set title = 'Yleislääketieteen erikoislääkäri, LL' where id = 'usr_laakari_demo';
update public.users set title = 'Sisätautien erikoislääkäri, LT'      where id = 'usr_laakari_toinen';

update public.patient_tasks set
  title = 'Käy verikokeissa'
  where patient_id = 'usr_potilas_demo' and title = 'Kay verikokeissa';
update public.patient_tasks set
  title = 'Täytä oirekysely'
  where patient_id = 'usr_potilas_demo' and title = 'Tayta oirekysely';
update public.patient_tasks set
  detail = 'Kaksi mittausta viiden minuutin välein'
  where patient_id = 'usr_potilas_demo' and detail = 'Kaksi mittausta viiden minuutin valein';
update public.patient_tasks set
  due_hint = 'Tämän viikon aikana'
  where patient_id = 'usr_potilas_demo' and due_hint = 'Taman viikon aikana';
update public.patient_tasks set
  detail = 'Etävastaanotto, 40 min'
  where patient_id = 'usr_potilas_demo' and detail = 'Etavastaanotto, 40 min';
update public.patient_tasks set
  due_hint = 'Kestää noin minuutin'
  where patient_id = 'usr_potilas_demo' and due_hint = 'Kestaa noin minuutin';

update public.care_events set
  detail = 'Valitsit lääkäriksesi Anna Lehtisen.'
  where patient_id = 'usr_potilas_demo' and detail = 'Valitsit laakariksesi Anna Lehtisen.';
update public.care_events set
  title = 'Lääkärin etävastaanotto',
  detail = '40 min. Käytte tulokset läpi ja tarkistatte hoidon vasteen.',
  card_note = 'Lääkärilläsi on jo kaikki tuloksesi. Sinun ei tarvitse valmistautua mitenkään.'
  where patient_id = 'usr_potilas_demo' and title = 'Laakarin etavastaanotto';
update public.care_events set
  detail = '7 vrk mittauksia annoksen noston jälkeen.'
  where patient_id = 'usr_potilas_demo' and detail = '7 vrk mittauksia annoksen noston jalkeen.';
update public.care_events set
  detail = '20 min. Vaste, haittavaikutukset ja tarvittaessa annoksen säätö.'
  where patient_id = 'usr_potilas_demo' and detail = '20 min. Vaste, haittavaikutukset ja tarvittaessa annoksen saato.';
update public.care_events set
  detail = 'Samat kokeet kuin alussa, jotta muutos on nähtävissä.'
  where patient_id = 'usr_potilas_demo' and detail = 'Samat kokeet kuin alussa, jotta muutos on nahtavissa.';
update public.care_events set
  detail = 'Katsotaan kaikki neljä lukua ja sovitaan jatkosta.'
  where patient_id = 'usr_potilas_demo' and detail = 'Katsotaan kaikki nelja lukua ja sovitaan jatkosta.';
