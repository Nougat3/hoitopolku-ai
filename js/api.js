// Hoitopolun tietokantakerros.
//
// Muuntaa tietokannan rivit siihen muotoon jota kayttoliittymat piirtavat:
// mittaukset indeksoidaan paivanumerolla 0..DAYS-1 seurantaikkunan alusta, jolloin
// kayrien piirtologiikka voi kasitella niita suoraan taulukkoina.

import { select, insert, update, rpc, authUserId } from './supabase.js';

/** Seurantaikkunan pituus paivina. Sama kuin kayrien x-akselilla. */
export const DAYS = 84;

/** Tietokannan metriikkatunnukset. bp on oma taulunsa, muut metric_measurements. */
export const METRIC = {
  GLUCOSE: 'glucose',
  WEIGHT: 'weight',
  WAIST: 'waist',
  LDL: 'ldl',
  HBA1C: 'hba1c',
  SODIUM: 'sodium',
  POTASSIUM: 'potassium',
  CREATININE: 'creatinine'
};

/** Laboratoriokokeet naytetaan omassa listassaan, aikasarjametriikat kayrilla. */
const LAB_METRICS = [METRIC.LDL, METRIC.HBA1C, METRIC.POTASSIUM, METRIC.CREATININE, METRIC.SODIUM];

export function windowStart(days = DAYS) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

/** Paivaindeksi seurantaikkunassa. Ikkunan ulkopuoliset arvot ovat negatiivisia tai >= days. */
export function dayIndex(timestamp, start) {
  const at = new Date(timestamp);
  at.setHours(0, 0, 0, 0);
  return Math.round((at - start) / 86_400_000);
}

function inWindow(d, days = DAYS) {
  return d >= 0 && d < days;
}

/** Tietokannan 'aamu' / 'ilta' vastaa kayttoliittyman 'am' / 'pm'. */
function timeOfDayToUi(value) {
  if (value === 'aamu') return 'am';
  if (value === 'ilta') return 'pm';
  return null;
}

function timeOfDayToDb(value) {
  if (value === 'am' || value === 'aamu' || value === 'Aamu') return 'aamu';
  if (value === 'pm' || value === 'ilta' || value === 'Ilta') return 'ilta';
  return null;
}

/**
 * Kirjautuneen kayttajan rivi users-taulusta.
 *
 * Haku on rajattava auth-tunnisteella: rivitason suojaus palauttaa myos
 * hoitosuhteessa olevien kayttajien rivit, joten ilman rajausta rooli voisi
 * tulla vaaralta rivilta.
 */
export async function currentUser() {
  const uid = authUserId();
  if (!uid) return null;
  const rows = await select(
    'users',
    `select=id,email,role,full_name,title&auth_user_id=eq.${encodeURIComponent(uid)}`
  );
  return rows?.[0] ?? null;
}

export function isDoctor(user) {
  return user?.role === 'laakari' || user?.role === 'yllapito';
}

/**
 * Lataa potilaan koko tilan yhdella kertaa. Lääkäri saa saman datan, jos hänellä
 * on voimassa oleva hoitoistunto: rivitason suojaus ratkaisee paasyn.
 */
export async function loadPatientBundle(patientId, { days = DAYS } = {}) {
  const start = windowStart(days);
  const since = start.toISOString();
  const pid = encodeURIComponent(patientId);

  const [bpRows, metricRows, medRows, taskRows, eventRows, symptomRows, targetRows] = await Promise.all([
    select('bp_measurements', `select=id,sys,dia,pulse,time_of_day,measured_at&patient_id=eq.${pid}&measured_at=gte.${since}&order=measured_at.asc`),
    select('metric_measurements', `select=id,metric,value,measured_at,source&patient_id=eq.${pid}&order=measured_at.asc`),
    select('patient_medications', `select=id,name,dose,note,started_on,ended_on,linked_metric&patient_id=eq.${pid}&order=started_on.asc`),
    select('patient_tasks', `select=id,title,detail,due_hint,target_view,sort_order,done,done_at&patient_id=eq.${pid}&order=sort_order.asc`),
    select('care_events', `select=id,title,detail,when_label,status,card_note,card_button,sort_order,occurs_at&patient_id=eq.${pid}&order=sort_order.asc`),
    select('symptom_reports', `select=id,symptoms,severity,note,reported_at&patient_id=eq.${pid}&order=reported_at.asc`),
    select('patient_targets', `select=*&patient_id=eq.${pid}`)
  ]);

  const bp = [];
  for (const row of bpRows ?? []) {
    const d = dayIndex(row.measured_at, start);
    if (!inWindow(d, days)) continue;
    bp.push({
      id: row.id,
      d,
      t: timeOfDayToUi(row.time_of_day) ?? (new Date(row.measured_at).getHours() < 12 ? 'am' : 'pm'),
      v: row.sys,
      sys: row.sys,
      dia: row.dia,
      pulse: row.pulse,
      at: row.measured_at
    });
  }

  const series = {};
  const labs = {};
  for (const row of metricRows ?? []) {
    if (LAB_METRICS.includes(row.metric)) {
      (labs[row.metric] ??= []).push({ v: row.value, at: row.measured_at, source: row.source });
    }
    const d = dayIndex(row.measured_at, start);
    if (!inWindow(d, days)) continue;
    (series[row.metric] ??= []).push({
      id: row.id,
      d,
      t: row.metric === METRIC.WEIGHT ? 'wk' : 'am',
      v: row.value,
      at: row.measured_at
    });
  }

  return {
    patientId,
    start,
    days,
    bp,
    glucose: series[METRIC.GLUCOSE] ?? [],
    weight: series[METRIC.WEIGHT] ?? [],
    series,
    labs,
    meds: (medRows ?? []).filter((m) => !m.ended_on),
    tasks: taskRows ?? [],
    events: eventRows ?? [],
    symptoms: symptomRows ?? [],
    targets: targetRows?.[0] ?? null
  };
}

export function addBloodPressure(patientId, { sys, dia, pulse = null, timeOfDay = null, measuredAt = null }) {
  return insert('bp_measurements', {
    patient_id: patientId,
    sys,
    dia,
    pulse,
    time_of_day: timeOfDayToDb(timeOfDay),
    measured_at: measuredAt ?? new Date().toISOString()
  });
}

export function addMetric(patientId, metric, value, { source = 'patient', measuredAt = null } = {}) {
  return insert('metric_measurements', {
    patient_id: patientId,
    metric,
    value,
    source,
    measured_at: measuredAt ?? new Date().toISOString()
  });
}

export function addSymptomReport(patientId, symptoms, severity, note = null) {
  return insert('symptom_reports', {
    patient_id: patientId,
    symptoms,
    severity,
    note: note || null,
    reported_at: new Date().toISOString()
  });
}

export function addMedication(patientId, { name, dose, note = null, startedOn = null, linkedMetric = 'bp' }, createdBy) {
  return insert('patient_medications', {
    patient_id: patientId,
    name,
    dose,
    note,
    started_on: startedOn ?? new Date().toISOString().slice(0, 10),
    linked_metric: linkedMetric,
    created_by: createdBy
  });
}

/** Potilas saa muuttaa tehtavasta vain done-sarakkeen; done_at tulee triggerista. */
export function setTaskDone(taskId, done) {
  return update('patient_tasks', `id=eq.${encodeURIComponent(taskId)}`, { done });
}

export async function createShareCode() {
  const result = await rpc('create_patient_access_code');
  return Array.isArray(result) ? result[0] : result;
}

export function revokeShareCode() {
  return rpc('revoke_patient_access_code');
}

export async function redeemShareCode(code) {
  const result = await rpc('redeem_patient_access_code', { p_code: code });
  return Array.isArray(result) ? result[0] : result;
}

/** Voimassa olevan jakokoodin tiedot, jos potilaalla on sellainen. */
export async function activeShareCode() {
  const rows = await select(
    'patient_access_codes',
    'select=id,expires_at,created_at,redeemed_at&revoked_at=is.null&order=created_at.desc&limit=1'
  );
  const row = rows?.[0];
  if (!row) return null;
  return new Date(row.expires_at) > new Date() ? row : null;
}

/**
 * Laakarin avoimet hoitoistunnot ja niihin liittyvat potilaat. Jokainen istunto
 * syntyy jakokoodin lunastuksesta ja vanhenee koodin mukana.
 */
export async function activeCareSessions() {
  const now = new Date().toISOString();
  const sessions = await select(
    'care_sessions',
    `select=id,patient_id,expires_at,created_at&ended_at=is.null&expires_at=gt.${now}&order=created_at.desc`
  );
  if (!sessions?.length) return [];

  const ids = [...new Set(sessions.map((s) => s.patient_id))];
  const patients = await select('users', `select=id,full_name,email&id=in.(${ids.map(encodeURIComponent).join(',')})`);
  const byId = new Map((patients ?? []).map((p) => [p.id, p]));

  // Sama potilas voi olla useassa istunnossa; naytetaan tuorein kustakin.
  const seen = new Set();
  return sessions
    .filter((s) => (seen.has(s.patient_id) ? false : seen.add(s.patient_id)))
    .map((s) => ({ ...s, patient: byId.get(s.patient_id) ?? null }));
}
