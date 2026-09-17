// Agregados y estadísticas: tonelaje, series efectivas por grupo muscular, 1RM estimado,
// récords, adherencia y progresión real frente al objetivo teórico.

import { getState, allSessions, exerciseById } from './store.js';
import { addDays, parseKey, keyOf, todayKey } from './dates.js';
import { entryTotals, setE1RM, setWeight, setReps, effectiveSets, setTonnage, hasData, num } from './sets.js';
import { profileOf, dropSteps, MYO_BLOCKS } from './catalog.js';
import { weeklyChange } from './progression.js';

// ---------- Semanas (lunes a domingo) ----------
export function mondayOf(dateKey) {
  const d = parseKey(dateKey);
  const shift = (d.getDay() + 6) % 7;
  return keyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - shift));
}

export function weekNumber(dateKey, startDate) {
  const a = parseKey(mondayOf(startDate));
  const b = parseKey(mondayOf(dateKey));
  return Math.floor((b - a) / (7 * 86400000)) + 1;
}

export const weekLabel = (monday) => {
  const end = addDays(monday, 6);
  const f = (k) => `${Number(k.slice(8, 10))}/${Number(k.slice(5, 7))}`;
  return `${f(monday)} – ${f(end)}`;
};

// Últimas `count` semanas hasta la del día indicado, de la más antigua a la más reciente.
export function lastWeeks(count, from = todayKey()) {
  const base = mondayOf(from);
  return Array.from({ length: count }, (_, i) => addDays(base, -7 * (count - 1 - i)));
}

// ---------- Carga extra por peso corporal ----------
export const loadOf = (exercise) => (exercise?.bw ? (getState().settings.bodyweight || 0) : 0);

// ---------- Totales de una sesión ----------
export function sessionTotals(session) {
  const out = { tonnage: 0, reps: 0, sets: 0, effective: 0, byMuscle: {}, rirSum: 0, rirCount: 0, done: 0, planned: 0 };
  for (const entry of session.entries || []) {
    const ex = exerciseById(entry.exerciseId);
    const load = loadOf(ex);
    const t = entryTotals(entry, load);
    out.planned += entry.sets.length;
    out.done += t.sets;
    out.tonnage += t.tonnage;
    out.reps += t.reps;
    out.sets += t.sets;
    out.effective += t.effective;
    if (t.effective) {
      out.byMuscle[ex.muscle] = (out.byMuscle[ex.muscle] || 0) + t.effective;
      // Los músculos secundarios cuentan la mitad, como es habitual al contabilizar volumen.
      for (const m of ex.secondary || []) out.byMuscle[m] = (out.byMuscle[m] || 0) + t.effective * 0.5;
    }
    for (const s of entry.sets) {
      if (entry.type === 'normal' && hasData(s, 'normal') && num(s.rir) != null) {
        out.rirSum += num(s.rir);
        out.rirCount += 1;
      }
    }
  }
  out.avgRir = out.rirCount ? out.rirSum / out.rirCount : null;
  // La duración no se calcula a propósito: es fácil olvidarse de cerrar el entreno y el dato mentiría.
  out.complete = out.planned ? (out.done / out.planned) * 100 : 0;
  return out;
}

export const hasLog = (session) => sessionTotals(session).sets > 0;

// ---------- Series por semana ----------
export function weekStats(monday) {
  const end = addDays(monday, 6);
  const sessions = allSessions().filter((s) => s.date >= monday && s.date <= end);
  const agg = { monday, sessions: sessions.length, tonnage: 0, reps: 0, sets: 0, effective: 0, byMuscle: {}, rirSum: 0, rirCount: 0 };
  for (const s of sessions) {
    const t = sessionTotals(s);
    agg.tonnage += t.tonnage;
    agg.reps += t.reps;
    agg.sets += t.sets;
    agg.effective += t.effective;
    agg.rirSum += t.rirSum;
    agg.rirCount += t.rirCount;
    for (const [m, v] of Object.entries(t.byMuscle)) agg.byMuscle[m] = (agg.byMuscle[m] || 0) + v;
  }
  agg.avgRir = agg.rirCount ? agg.rirSum / agg.rirCount : null;
  return agg;
}

export function weekSeries(count, from = todayKey()) {
  return lastWeeks(count, from).map((monday) => weekStats(monday));
}

// ---------- Serie temporal de un ejercicio ----------
// Un punto por sesión: mejor 1RM estimado, peso máximo, tonelaje y reps.
export function exerciseSeries(exerciseId) {
  const ex = exerciseById(exerciseId);
  const load = loadOf(ex);
  const out = [];
  for (const s of allSessions()) {
    for (const e of s.entries) {
      if (e.exerciseId !== exerciseId) continue;
      const t = entryTotals(e, load);
      if (!t.sets) continue;
      out.push({
        date: s.date,
        sessionId: s.id,
        e1rm: t.best,
        weight: t.topWeight,
        tonnage: t.tonnage,
        reps: t.reps,
        sets: t.sets,
        type: e.type,
      });
    }
  }
  return out;
}

// ---------- Récords ----------
export function bestOf(exerciseId) {
  const series = exerciseSeries(exerciseId);
  if (!series.length) return null;
  const byE1rm = series.filter((p) => p.e1rm != null).sort((a, b) => b.e1rm - a.e1rm)[0];
  const byWeight = series.filter((p) => p.weight != null).sort((a, b) => b.weight - a.weight)[0];
  const byTonnage = series.slice().sort((a, b) => b.tonnage - a.tonnage)[0];
  return { e1rm: byE1rm, weight: byWeight, tonnage: byTonnage, sessions: series.length, last: series[series.length - 1] };
}

// Récords conseguidos en una sesión concreta, comparando con todo lo anterior.
export function sessionPRs(session) {
  const out = [];
  for (const entry of session.entries || []) {
    const ex = exerciseById(entry.exerciseId);
    const load = loadOf(ex);
    const t = entryTotals(entry, load);
    if (!t.sets) continue;
    const previous = [];
    for (const s of allSessions()) {
      if (s.id === session.id || s.date > session.date) continue;
      for (const e of s.entries) {
        if (e.exerciseId !== entry.exerciseId) continue;
        const pt = entryTotals(e, load);
        if (pt.sets) previous.push(pt);
      }
    }
    if (!previous.length) continue;
    const bestE1rm = Math.max(...previous.map((p) => p.best || 0));
    const bestWeight = Math.max(...previous.map((p) => p.topWeight || 0));
    if (t.best && t.best > bestE1rm + 0.01) {
      out.push({ exerciseId: entry.exerciseId, name: ex.name, kind: 'e1rm', value: t.best, prev: bestE1rm });
    } else if (t.topWeight && t.topWeight > bestWeight + 0.01) {
      out.push({ exerciseId: entry.exerciseId, name: ex.name, kind: 'weight', value: t.topWeight, prev: bestWeight });
    }
  }
  return out;
}

// ---------- Progresión real por grupo muscular ----------
// Compara el cambio semanal medio del 1RM estimado con el objetivo teórico del grupo.
export function muscleProgress(weeks = 6) {
  const mondays = lastWeeks(weeks);
  const byMuscle = {};
  for (const ex of getState().exercises) {
    const series = exerciseSeries(ex.id).filter((p) => p.date >= mondays[0] && p.e1rm != null);
    if (series.length < 2) continue;
    const perWeek = new Map();
    for (const p of series) {
      const k = mondayOf(p.date);
      perWeek.set(k, Math.max(perWeek.get(k) || 0, p.e1rm));
    }
    const points = [...perWeek.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, value]) => ({ value }));
    const change = weeklyChange(points);
    if (change == null) continue;
    const m = ex.muscle;
    byMuscle[m] = byMuscle[m] || { values: [], exercises: [] };
    byMuscle[m].values.push(change);
    byMuscle[m].exercises.push({ id: ex.id, name: ex.name, change });
  }
  return Object.entries(byMuscle).map(([muscle, d]) => ({
    muscle,
    actual: d.values.reduce((a, b) => a + b, 0) / d.values.length,
    target: profileOf(muscle).weekly,
    exercises: d.exercises.sort((a, b) => b.change - a.change),
  })).sort((a, b) => b.actual - a.actual);
}

// ---------- Adherencia ----------
export function adherence(weeks = 8) {
  const { routine } = getState();
  const perWeek = routine.days.length || 1;
  return lastWeeks(weeks).map((monday) => {
    const end = addDays(monday, 6);
    const done = allSessions().filter((s) => s.date >= monday && s.date <= end && hasLog(s)).length;
    return { monday, done, planned: perWeek, pct: Math.min(100, (done / perWeek) * 100) };
  });
}

// Semanas seguidas (hasta la última cerrada) completando todos los días de la rutina.
export function weekStreak() {
  const { routine } = getState();
  const perWeek = routine.days.length || 1;
  let streak = 0;
  let monday = mondayOf(todayKey());
  // La semana en curso solo cuenta si ya está completa.
  for (let i = 0; i < 260; i += 1) {
    const end = addDays(monday, 6);
    const done = allSessions().filter((s) => s.date >= monday && s.date <= end && hasLog(s)).length;
    if (done >= perWeek) streak += 1;
    else if (i > 0) break;
    monday = addDays(monday, -7);
  }
  return streak;
}

// ---------- Cuál toca hoy ----------
// El siguiente día de la rutina tras el último entrenado.
export function nextDay() {
  const { routine } = getState();
  const sessions = allSessions().filter(hasLog);
  const last = sessions[sessions.length - 1];
  if (!last) return routine.days[0];
  const i = routine.days.findIndex((d) => d.id === last.dayId);
  return routine.days[(i + 1) % routine.days.length] || routine.days[0];
}

// ---------- Resumen del día de rutina ----------
// Series efectivas que supone un ejercicio de la rutina: el tramo inicial cuenta 1
// y cada tramo extra de las técnicas troceadas, 0,5 (igual que al registrarlas).
export function planSets(item) {
  const sets = Math.max(1, item.sets || 1);
  if (item.type === 'myo') return sets * (1 + MYO_BLOCKS * 0.5);
  if (item.type === 'restpause') return sets * (1 + Math.max(0, (item.scheme?.length || 1) - 1) * 0.5);
  if (item.type === 'dropset') return sets * (1 + Math.max(0, dropSteps(item).length - 1) * 0.5);
  return sets;
}

export function dayVolume(day) {
  const byMuscle = {};
  let sets = 0;
  for (const item of day.items || []) {
    const ex = exerciseById(item.exerciseId);
    const count = planSets(item);
    sets += count;
    byMuscle[ex.muscle] = (byMuscle[ex.muscle] || 0) + count;
    for (const m of ex.secondary || []) byMuscle[m] = (byMuscle[m] || 0) + count * 0.5;
  }
  return { sets, byMuscle };
}

// Reexportado por comodidad para las vistas.
export { entryTotals, setE1RM, setWeight, setReps, effectiveSets, setTonnage };
