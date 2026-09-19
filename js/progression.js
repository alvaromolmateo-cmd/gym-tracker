// Motor de sobrecarga progresiva.
//
// Idea: doble progresión (primero reps dentro del rango, luego carga) con dos matices que vienen
// de la literatura:
//   1) El salto de carga se calcula como un % del peso actual, con la banda de la ACSM (2009):
//      2-4 % en músculos pequeños, hasta 5-10 % en los grandes. Nunca por debajo del incremento
//      mínimo que hay en el gimnasio (`step` del ejercicio).
//   2) Cuando el incremento mínimo disponible obliga a un salto mayor que esa banda —el caso típico
//      de las mancuernas en laterales: de 12,5 a 15 kg son 20 %— se aplica la regla 2×2 de la NSCA:
//      hay que superar el tope de reps en dos sesiones seguidas (o sacar 2 reps de más) antes de subir.
//
// Cada tipo de serie tiene su propio criterio de «listo para subir», porque el objetivo cambia:
// en myo-reps manda la serie de activación, en rest-pause el total de reps del cluster y en
// drop set las reps del primer escalón.

import { profileOf, myoPlan, muscleName, MYO_TARGET } from './catalog.js';
import { num, setReps, setWeight, leadReps } from './sets.js';
import { fmtNum } from './ui.js';

export const roundToStep = (w, step) => (step > 0 ? Math.round(w / step) * step : Math.round(w));

// Incremento de carga a aplicar sobre un peso dado.
export function increment(weight, exercise) {
  const step = exercise.step || profileOf(exercise.muscle).step || 2.5;
  const [lo, hi] = profileOf(exercise.muscle).pct;
  const ideal = roundToStep((num(weight) || 0) * (lo / 100), step);
  const inc = Math.max(step, ideal);
  const pct = weight > 0 ? (inc / weight) * 100 : 0;
  return { inc, step, pct, band: [lo, hi], oversized: pct > hi + 0.01 };
}

// Banda de subida de un grupo muscular, con coma decimal: «2,5-5 %».
export function bandText(muscle) {
  const [lo, hi] = profileOf(muscle).pct;
  return `${fmtNum(lo, 1)}-${fmtNum(hi, 1)} %`;
}

// Texto corto del perfil de un ejercicio, para mostrarlo en la ficha.
export function profileSummary(exercise) {
  const p = profileOf(exercise.muscle);
  const step = exercise.step || p.step;
  return `saltos de ${fmtNum(step, 2)} kg · banda ${bandText(exercise.muscle)} · objetivo ≈${fmtNum(p.weekly, 1)} %/semana`;
}

export const weeklyTarget = (muscle) => profileOf(muscle).weekly;

// ---------- ¿La última sesión pide subir carga? ----------
// Devuelve { ready, extra, detail } donde `extra` indica que además sobró margen (reps de más).
function readyNormal(entry, plan) {
  const sets = (entry.sets || []).filter((s) => num(s.r) != null);
  if (!sets.length) return { ready: false };
  const top = plan.repsMax ?? plan.repsMin ?? 8;
  const rirCap = plan.rirMax ?? 1;
  const repsOk = sets.every((s) => num(s.r) >= top);
  const rirOk = sets.every((s) => num(s.rir) == null || num(s.rir) <= rirCap);
  const extra = sets.every((s) => num(s.r) >= top + 2);
  const low = sets.filter((s) => num(s.r) < (plan.repsMin ?? top)).length;
  return {
    ready: repsOk && rirOk,
    repsOk,
    rirOk,
    extra,
    deload: low > sets.length / 2,
    detail: `${sets.map((s) => s.r).join(' · ')} reps`,
  };
}

function readyMyo(entry) {
  const set = (entry.sets || [])[0];
  const act = num(set?.r);
  if (act == null) return { ready: false };
  const plan = myoPlan(act);
  return {
    ready: act > MYO_TARGET[1],
    extra: plan.verdict === 'light',
    deload: act < 6,
    detail: `una activación de ${act} reps`,
  };
}

function readyRestPause(entry, plan) {
  const set = (entry.sets || [])[0];
  const total = setReps(set, 'restpause');
  const target = (plan.scheme || []).reduce((a, b) => a + b, 0);
  if (!total) return { ready: false };
  return {
    ready: total >= target,
    extra: total >= target + 3,
    deload: total < target * 0.8,
    detail: `${total} de ${target} reps`,
  };
}

function readyDrop(entry, plan) {
  const set = (entry.sets || [])[0];
  const first = leadReps(set, 'dropset');
  const target = (plan.dropScheme || [])[0] ?? 6;
  if (first == null) return { ready: false };
  return { ready: first >= target, extra: first >= target + 2, deload: first < target - 2, detail: `${first} reps en el primer escalón` };
}

function readiness(entry, plan) {
  switch (entry.type) {
    case 'myo': return readyMyo(entry);
    case 'restpause': return readyRestPause(entry, plan);
    case 'dropset': return readyDrop(entry, plan);
    default: return readyNormal(entry, plan);
  }
}

// ---------- Sugerencia ----------
// history: entradas pasadas de este ejercicio, de la más reciente a la más antigua, ya filtradas por
// tipo de serie y, si hay, del mismo día de la rutina (ver `historyOf` en store.js).
// Devuelve { weight, reps, action, reason, inc } — `action` ∈ up | reps | hold | down | start.
export function suggest({ exercise, plan, history = [] }) {
  const type = plan.type;
  // Reps que acompañan al peso: en un drop set, las del primer escalón. En myo-reps y rest-pause no
  // hay una cifra única que dar, porque mandan la activación y el esquema.
  const firstStep = (plan.dropScheme || [])[0] ?? null;
  const baseReps = type === 'normal' ? (plan.repsMin ?? null) : type === 'dropset' ? firstStep : null;
  // Cifra y unidad con espacio indivisible, para que «20 %» no se parta entre dos líneas.
  const kg = (v) => `${fmtNum(v, 2)}\u00a0kg`;
  const pc = (v, d = 1) => `${fmtNum(v, d)}\u00a0%`;

  const last = history[0];
  if (!last) {
    const aim = {
      myo: `con el que la activación caiga entre ${MYO_TARGET[0]} y ${MYO_TARGET[1]} reps`,
      restpause: 'con el que completes el esquema justo',
      dropset: 'con el que el primer escalón llegue justo a sus reps',
    }[type] || 'que te deje en el RIR objetivo';
    return { weight: null, reps: baseReps, action: 'start', reason: `Primera vez: busca un peso ${aim} y quedará como referencia.` };
  }

  // Ojo: 0 es un peso válido (peso corporal), así que no vale un simple `||`.
  const weights = (last.sets || []).map((s) => setWeight(s, type)).filter((w) => w != null);
  const lastWeight = type === 'dropset'
    ? setWeight((last.sets || [])[0], 'dropset')
    : (weights.length ? Math.max(...weights) : null);

  if (lastWeight == null) {
    return { weight: null, reps: baseReps, action: 'start', reason: 'La última sesión quedó sin registrar peso.' };
  }

  // Referencia prestada de otro día de la rutina: sirve para arrancar, pero no para decidir si toca
  // subir, porque allí el ejercicio iba en otro orden y con otra fatiga encima.
  if (last.otherDay) {
    return {
      weight: lastWeight,
      reps: baseReps,
      action: 'start',
      reason: `En este día aún no lo has hecho: empieza con el peso de «${last.dayName || 'otro día'}», con la misma técnica, y ajusta. Desde hoy se compara con este día.`,
    };
  }

  const r = readiness(last, plan);
  const { inc, pct, band, oversized } = increment(lastWeight, exercise);

  if (r.deload) {
    return {
      weight: Math.max(0, roundToStep(lastWeight - inc, exercise.step || inc)),
      reps: baseReps,
      action: 'down',
      inc: -inc,
      reason: `Te quedaste corto, con ${r.detail}. Baja ${kg(inc)} y reconstruye desde ahí.`,
    };
  }

  if (r.ready) {
    // Salto forzado por el material: exige la regla 2×2 antes de subir.
    if (oversized && !r.extra) {
      const prev = history[1];
      const prevReady = prev && readiness(prev, plan).ready;
      if (!prevReady) {
        const moreReps = type === 'normal' ? (plan.repsMax ?? plan.repsMin) : type === 'dropset' ? firstStep : null;
        return {
          weight: lastWeight,
          reps: moreReps != null ? moreReps + 1 : null,
          action: 'reps',
          reason: `Con ${kg(lastWeight)} el siguiente escalón son ${kg(inc)}, un ${pc(pct, 0)}, por encima del ${pc(band[1])} que le corresponde a ${muscleName(exercise.muscle).toLowerCase()}. Repite el peso y súmale reps: al encadenar dos sesiones cumpliendo el objetivo, subes.`,
        };
      }
    }
    return {
      weight: roundToStep(lastWeight + inc, exercise.step || inc),
      reps: baseReps,
      action: 'up',
      inc,
      reason: `Cumpliste el objetivo con ${r.detail}. Sube ${kg(inc)}, un ${pc(pct)}, y vuelve a la parte baja del rango.`,
    };
  }

  // Llegó a las reps pero con demasiado margen: el trabajo pendiente es de intensidad, no de carga.
  if (r.repsOk && !r.rirOk) {
    return {
      weight: lastWeight,
      reps: plan.repsMax ?? plan.repsMin ?? null,
      action: 'hold',
      reason: `Sacaste ${r.detail}, pero con más margen del que pide el objetivo, que es RIR ${plan.rir}. Mismo peso y apriétalo hasta ahí; cuando lo cumplas, sube.`,
    };
  }

  if (type === 'myo') {
    const act = num((last.sets || [])[0]?.r);
    return {
      weight: lastWeight,
      reps: null,
      action: 'hold',
      reason: `Activación de ${act} reps, aún dentro de la banda objetivo de ${MYO_TARGET[0]}-${MYO_TARGET[1]}. Mantén el peso y busca más reps.`,
    };
  }

  const goal = type === 'restpause'
    ? 'Cuando completes el total del esquema, toca subir.'
    : type === 'dropset'
      ? 'Cuando el primer escalón llegue a sus reps, toca subir.'
      : 'Cuando llegues al tope del rango en todas las series, toca subir.';
  const lastTop = Math.max(0, ...(last.sets || []).map((s) => num(s.r) || 0));
  return {
    weight: lastWeight,
    reps: type === 'normal' ? (Math.min(plan.repsMax ?? 99, lastTop + 1) || plan.repsMin) : baseReps,
    action: 'reps',
    reason: `Mismo peso y una rep más que la última vez${r.detail ? `, que fueron ${r.detail}` : ''}. ${goal}`,
  };
}

// ---------- Pesos sugeridos para un drop set ----------
export function dropWeights(top, exercise, steps, pct = 15) {
  const step = exercise.step || 2.5;
  const first = num(top);
  // Sin un peso de partida no hay cascada que sugerir: mejor dejar las casillas en blanco.
  if (first == null || first <= 0) return Array.from({ length: steps }, () => null);
  const out = [];
  let w = first;
  for (let i = 0; i < steps; i += 1) {
    out.push(w);
    w = Math.max(step, roundToStep(w * (1 - pct / 100), step));
  }
  return out;
}

// ---------- Progresión real frente al objetivo ----------
// serie: [{ week, value }] de e1RM. Devuelve el % de cambio semanal medio.
export function weeklyChange(points) {
  const vals = points.filter((p) => p.value != null);
  if (vals.length < 2) return null;
  const first = vals[0];
  const last = vals[vals.length - 1];
  const weeks = Math.max(1, vals.length - 1);
  if (!first.value) return null;
  return ((last.value / first.value) ** (1 / weeks) - 1) * 100;
}
