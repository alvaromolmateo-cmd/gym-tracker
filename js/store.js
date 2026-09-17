// Estado de la aplicación y persistencia en localStorage.
// Capa aislada para poder cambiar el almacenamiento (sincronización en la nube) más adelante.

import { uid } from './ui.js';
import { todayKey } from './dates.js';
import { defaultExercises, isLegacyMyoDesc, defaultPlan } from './catalog.js';
import { emptySet } from './sets.js';
import { ROUTINE_DAYS, ROUTINE_START, SEED_SESSIONS } from './seed.js';

const STORAGE_KEY = 'plataforma-entrenamientos:data';
export const DATA_VERSION = 3;

// v3: en el gimnasio hay discos de sobrecarga de 1,25 kg, así que en poleas, máquinas de placas
// y lastre el escalón mínimo real es ese y no 2,5 kg. Solo se corrige si seguía en el valor viejo.
const STEP_V3 = {
  'abdominales-polea': 1.25,
  'laterales-polea': 1.25,
  'posterior-polea': 1.25,
  'curl-biceps-polea': 1.25,
  'triceps-cruzado': 1.25,
  'triceps-barra': 1.25,
  'press-pectoral-maquina': 1.25,
  fondos: 1.25,
};

export const DEFAULT_SETTINGS = {
  name: '',
  motto: 'Déjate los huevos. Del resto me encargo yo.',
  bodyweight: null,
  theme: 'auto',
};

const withIds = (items) => items.map((it) => ({ id: uid(), note: '', ...it }));

function defaultRoutine() {
  return {
    id: 'rutina-actual',
    name: 'Planificación actual',
    startDate: ROUTINE_START,
    days: ROUTINE_DAYS.map((d) => ({ ...d, items: withIds(d.items) })),
  };
}

// Construye una sesión a partir de un día de la rutina, con las series vacías listas para rellenar.
export function buildSession(routine, dayId, date) {
  const day = routine.days.find((d) => d.id === dayId) || routine.days[0];
  return {
    id: uid(),
    date: date || todayKey(),
    dayId: day.id,
    dayName: day.name,
    focus: day.focus,
    routineId: routine.id,
    startedAt: new Date().toISOString(),
    endedAt: null,
    note: '',
    feel: null,
    bodyweight: null,
    entries: day.items.map((item) => ({
      id: uid(),
      exerciseId: item.exerciseId,
      type: item.type,
      plan: { ...item },
      note: '',
      sets: plannedSets(item),
    })),
  };
}

// Número de filas de serie que toca preparar según el tipo.
function plannedSets(item) {
  return Array.from({ length: Math.max(1, item.sets || 1) }, () => emptySet(item.type, item));
}

function seedSessions(routine) {
  const out = {};
  for (const s of SEED_SESSIONS) {
    const session = buildSession(routine, s.dayId, s.date);
    session.startedAt = `${s.date}T18:00:00.000Z`;
    session.endedAt = `${s.date}T19:30:00.000Z`;
    session.note = s.note;
    session.feel = s.feel;
    for (const entry of session.entries) {
      const logged = s.entries[entry.exerciseId];
      if (!logged) continue;
      entry.note = logged.note || '';
      entry.sets = logged.sets.map((set) => ({ ...emptySet(entry.type, entry.plan), ...set }));
    }
    out[session.id] = session;
  }
  return out;
}

export function defaultState() {
  const routine = defaultRoutine();
  return {
    version: DATA_VERSION,
    createdAt: new Date().toISOString(),
    exercises: defaultExercises(),
    routine,
    sessions: seedSessions(routine),
    activeId: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

// ---------- Migración / saneado ----------
function migrate(data) {
  if (!data || typeof data !== 'object') throw new Error('Formato no válido');
  const from = Number(data.version) || 1;
  const out = { ...defaultState(), ...data };
  out.version = DATA_VERSION;

  out.exercises = Array.isArray(data.exercises) && data.exercises.length
    ? data.exercises.map((e) => ({
      id: e.id || uid(),
      name: e.name || 'Ejercicio',
      muscle: e.muscle || 'pecho',
      secondary: Array.isArray(e.secondary) ? e.secondary : [],
      equipment: e.equipment || 'Otro',
      step: Number(e.step) > 0 ? Number(e.step) : 2.5,
      bw: !!e.bw,
      notes: e.notes || '',
      archived: !!e.archived,
    }))
    : defaultExercises();

  if (from < 3) {
    for (const e of out.exercises) {
      if (STEP_V3[e.id] && e.step === 2.5) e.step = STEP_V3[e.id];
    }
  }

  const r = data.routine;
  out.routine = r && Array.isArray(r.days) && r.days.length
    ? {
      id: r.id || uid(),
      name: r.name || 'Planificación actual',
      startDate: r.startDate || ROUTINE_START,
      days: r.days.map((d) => ({
        id: d.id || uid(),
        name: d.name || 'Día',
        focus: d.focus || '',
        // v2: los ejercicios de la rutina ya no guardan descanso cronometrado ni serie extra.
        // v3: `dropSets` desaparece — el número de series de un drop set es `sets`, como en el resto.
        items: (Array.isArray(d.items) ? d.items : []).map(({ rest, extra, dropSets, ...it }) => ({
          ...it,
          id: it.id || uid(),
          ...(it.type === 'dropset' ? { sets: Math.max(Number(it.sets) || 1, Number(dropSets) || 1) } : {}),
          // El remo T son 2 series de 6→8, sin escalón extra al fallo (corrección del usuario).
          ...(from < 3 && it.type === 'dropset' && it.exerciseId === 'remo-t' ? { dropFail: false } : {}),
          ...(isLegacyMyoDesc(it.desc) ? { desc: null } : {}),
        })),
      })),
    }
    : defaultRoutine();

  out.sessions = data.sessions && typeof data.sessions === 'object' ? { ...data.sessions } : {};
  for (const [id, s] of Object.entries(out.sessions)) {
    out.sessions[id] = {
      ...s,
      id,
      date: s.date || todayKey(),
      entries: (Array.isArray(s.entries) ? s.entries : []).map((e) => ({
        ...e,
        id: e.id || uid(),
        sets: Array.isArray(e.sets) ? e.sets : [],
        ...(e.plan && isLegacyMyoDesc(e.plan.desc) ? { plan: { ...e.plan, desc: null } } : {}),
      })),
    };
  }
  if (out.activeId && !out.sessions[out.activeId]) out.activeId = null;

  // Solo las preferencias que siguen existiendo: así se van las de la barra de descanso (v1).
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  out.settings = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((k) => [k, settings[k]]));
  delete out.exportedAt;
  return out;
}

// ---------- Carga y guardado ----------
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw));
  } catch (err) {
    console.warn('No se pudo leer el almacenamiento:', err);
    return defaultState();
  }
}

let state = load();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('No se pudo guardar:', err);
  }
}

save(); // deja escrito el resultado de la migración sin esperar al primer cambio

const emit = () => listeners.forEach((fn) => fn(state));

export const getState = () => state;
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// `silent` evita repintar (útil mientras se escribe en un input).
export function update(mutator, { silent = false } = {}) {
  mutator(state);
  save();
  if (!silent) emit();
}

// ---------- Selectores ----------
export const exerciseById = (id) => state.exercises.find((e) => e.id === id) || { id, name: 'Ejercicio', muscle: 'pecho', step: 2.5, equipment: 'Otro' };
export const dayById = (id) => state.routine.days.find((d) => d.id === id);
export const sessionById = (id) => state.sessions[id];
export const activeSession = () => (state.activeId ? state.sessions[state.activeId] : null);

export const allSessions = () => Object.values(state.sessions).sort((a, b) => (a.date === b.date ? (a.startedAt || '').localeCompare(b.startedAt || '') : a.date.localeCompare(b.date)));

// Entradas pasadas de un ejercicio, de la más reciente a la más antigua.
// Con `type` se priorizan las del mismo tipo de serie (no tiene sentido sugerir carga para un
// drop set mirando una sesión de myo-reps); si no hay ninguna, se devuelven todas.
export function historyOf(exerciseId, { before = null, excludeSession = null, type = null } = {}) {
  const out = [];
  for (const s of allSessions().slice().reverse()) {
    if (excludeSession && s.id === excludeSession) continue;
    if (before && s.date > before) continue;
    for (const e of s.entries) {
      if (e.exerciseId !== exerciseId) continue;
      if (!e.sets.some((set) => Object.values(set).some((v) => v != null && v !== '' && !(Array.isArray(v) && v.every((x) => x == null))))) continue;
      out.push({ ...e, date: s.date, sessionId: s.id, dayName: s.dayName });
    }
  }
  if (!type) return out;
  const same = out.filter((e) => e.type === type);
  return same.length ? same : out;
}

// ---------- Sesiones ----------
export function startSession(dayId, date) {
  const session = buildSession(state.routine, dayId, date);
  update((st) => {
    st.sessions[session.id] = session;
    st.activeId = session.id;
  });
  return session.id;
}

export function setActive(id) {
  update((st) => { st.activeId = id; });
}

export function patchSession(id, patch, opts) {
  update((st) => {
    const s = st.sessions[id];
    if (s) Object.assign(s, patch);
  }, opts);
}

export function patchEntry(sessionId, entryId, patch, opts) {
  update((st) => {
    const e = st.sessions[sessionId]?.entries.find((x) => x.id === entryId);
    if (e) Object.assign(e, patch);
  }, opts);
}

export function patchSet(sessionId, entryId, index, patch, opts) {
  update((st) => {
    const e = st.sessions[sessionId]?.entries.find((x) => x.id === entryId);
    if (!e || !e.sets[index]) return;
    Object.assign(e.sets[index], patch);
  }, opts);
}

export function addSet(sessionId, entryId) {
  update((st) => {
    const e = st.sessions[sessionId]?.entries.find((x) => x.id === entryId);
    if (!e) return;
    const last = e.sets[e.sets.length - 1];
    const base = emptySet(e.type, e.plan);
    // Hereda el peso de la última serie para no volver a teclearlo.
    if (last && last.w != null) base.w = last.w;
    e.sets.push(base);
  });
}

export function removeSet(sessionId, entryId, index) {
  update((st) => {
    const e = st.sessions[sessionId]?.entries.find((x) => x.id === entryId);
    if (e && e.sets.length > 1) e.sets.splice(index, 1);
  });
}

export function addEntry(sessionId, exerciseId, type = 'normal') {
  update((st) => {
    const s = st.sessions[sessionId];
    if (!s) return;
    // Mismo punto de partida que en la rutina, para que un myo-reps suelto no salga como 3 series normales.
    const plan = { exerciseId, ...defaultPlan(type) };
    s.entries.push({ id: uid(), exerciseId, type, plan, note: '', sets: plannedSets(plan) });
  });
}

export function removeEntry(sessionId, entryId) {
  update((st) => {
    const s = st.sessions[sessionId];
    if (s) s.entries = s.entries.filter((e) => e.id !== entryId);
  });
}

export function moveEntry(sessionId, entryId, dir) {
  update((st) => {
    const s = st.sessions[sessionId];
    if (!s) return;
    const i = s.entries.findIndex((e) => e.id === entryId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.entries.length) return;
    [s.entries[i], s.entries[j]] = [s.entries[j], s.entries[i]];
  });
}

export function finishSession(id) {
  update((st) => {
    const s = st.sessions[id];
    if (s) s.endedAt = new Date().toISOString();
    if (st.activeId === id) st.activeId = null;
  });
}

export function reopenSession(id) {
  update((st) => {
    const s = st.sessions[id];
    if (s) s.endedAt = null;
    st.activeId = id;
  });
}

export function deleteSession(id) {
  update((st) => {
    delete st.sessions[id];
    if (st.activeId === id) st.activeId = null;
  });
}

// ---------- Rutina ----------
export function patchRoutine(patch, opts) {
  update((st) => { Object.assign(st.routine, patch); }, opts);
}

export function addDay() {
  update((st) => {
    st.routine.days.push({ id: uid(), name: `Día ${st.routine.days.length + 1}`, focus: '', items: [] });
  });
}

export function patchDay(dayId, patch, opts) {
  update((st) => {
    const d = st.routine.days.find((x) => x.id === dayId);
    if (d) Object.assign(d, patch);
  }, opts);
}

export function removeDay(dayId) {
  update((st) => { st.routine.days = st.routine.days.filter((d) => d.id !== dayId); });
}

export function moveDay(dayId, dir) {
  update((st) => {
    const days = st.routine.days;
    const i = days.findIndex((d) => d.id === dayId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= days.length) return;
    [days[i], days[j]] = [days[j], days[i]];
  });
}

export function addItem(dayId, exerciseId, type = 'normal') {
  const id = uid();
  update((st) => {
    const d = st.routine.days.find((x) => x.id === dayId);
    if (!d) return;
    d.items.push({
      id, exerciseId, note: '',
      repsMin: 8, repsMax: 10, rir: '0-1', rirMax: 1, // quedan guardados por si luego se pasa a series normales
      ...defaultPlan(type),
    });
  });
  return id;
}

export function patchItem(dayId, itemId, patch, opts) {
  update((st) => {
    const d = st.routine.days.find((x) => x.id === dayId);
    const it = d?.items.find((x) => x.id === itemId);
    if (it) Object.assign(it, patch);
  }, opts);
}

export function removeItem(dayId, itemId) {
  update((st) => {
    const d = st.routine.days.find((x) => x.id === dayId);
    if (d) d.items = d.items.filter((i) => i.id !== itemId);
  });
}

export function moveItem(dayId, itemId, dir) {
  update((st) => {
    const d = st.routine.days.find((x) => x.id === dayId);
    if (!d) return;
    const i = d.items.findIndex((x) => x.id === itemId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.items.length) return;
    [d.items[i], d.items[j]] = [d.items[j], d.items[i]];
  });
}

// ---------- Ejercicios ----------
export function addExercise(data) {
  const id = uid();
  update((st) => {
    st.exercises.push({
      id, name: data.name, muscle: data.muscle, secondary: data.secondary || [],
      equipment: data.equipment || 'Otro', step: Number(data.step) || 2.5, bw: !!data.bw,
      notes: data.notes || '', archived: false,
    });
  });
  return id;
}

export function patchExercise(id, patch, opts) {
  update((st) => {
    const e = st.exercises.find((x) => x.id === id);
    if (e) Object.assign(e, patch);
  }, opts);
}

export function removeExercise(id) {
  update((st) => {
    st.exercises = st.exercises.filter((e) => e.id !== id);
    st.routine.days.forEach((d) => { d.items = d.items.filter((i) => i.exerciseId !== id); });
  });
}

// ---------- Ajustes ----------
export function setSetting(field, value, opts) {
  update((st) => { st.settings[field] = value; }, opts);
}

// ---------- Importar / exportar ----------
export function exportJSON() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importJSON(text) {
  state = migrate(JSON.parse(text));
  save();
  emit();
}

export function resetAll() {
  state = defaultState();
  save();
  emit();
}

export function storageInfo() {
  let bytes = 0;
  try { bytes = (localStorage.getItem(STORAGE_KEY) || '').length; } catch { /* sin acceso */ }
  return { bytes, sessions: Object.keys(state.sessions).length };
}
