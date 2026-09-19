// Matemática de las series: reps, tonelaje, series efectivas, 1RM estimado y formato.
//
// Cada entrada de ejercicio guarda un array `sets`. La forma de cada serie depende del tipo:
//   normal     { w, r, rir, raw? }                     una serie de trabajo
//   myo        { w, r, rir, minis:[n,n,n] }            activación + 2 mini-series + serie final al fallo
//   restpause  { w, clusters:[8,5,5,3,3,3,3] }         una sola serie troceada
//   dropset    { drops:[{w,r}, …] }                    cascada de bajadas de peso
// `w` a 0 significa peso corporal (ejercicios con bw: true).

import { fmtNum } from './ui.js';
import { dropSteps } from './catalog.js';

// «7+6» → 13. Acepta también «7 + 6», «13» y coma decimal.
export function parseReps(text) {
  if (text == null) return null;
  const s = String(text).trim().replace(',', '.');
  if (!s) return null;
  const parts = s.split('+').map((p) => Number(p.trim())).filter((n) => Number.isFinite(n));
  if (!parts.length) return null;
  return parts.reduce((a, b) => a + b, 0);
}

export const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

// ---------- Reps totales de una serie ----------
export function setReps(set, type) {
  if (!set) return 0;
  if (type === 'dropset') return (set.drops || []).reduce((a, d) => a + (num(d.r) || 0), 0);
  if (type === 'restpause') return (set.clusters || []).reduce((a, r) => a + (num(r) || 0), 0);
  const base = num(set.r) || 0;
  if (type === 'myo') return base + (set.minis || []).reduce((a, r) => a + (num(r) || 0), 0);
  return base;
}

// ---------- Tonelaje (kg levantados) ----------
export function setTonnage(set, type, load = 0) {
  if (!set) return 0;
  if (type === 'dropset') return (set.drops || []).reduce((a, d) => a + ((num(d.w) || 0) + load) * (num(d.r) || 0), 0);
  const w = (num(set.w) || 0) + load;
  return w * setReps(set, type);
}

// ---------- Series efectivas ----------
// Una serie normal cuenta 1. En las técnicas troceadas cada tramo extra suma 0,5:
// comparten la fatiga de la serie inicial, así que no equivalen a series completas.
export function effectiveSets(set, type) {
  if (!set) return 0;
  if (type === 'myo') return 1 + (set.minis || []).filter((r) => num(r)).length * 0.5;
  if (type === 'restpause') return 1 + Math.max(0, (set.clusters || []).filter((r) => num(r)).length - 1) * 0.5;
  if (type === 'dropset') return 1 + Math.max(0, (set.drops || []).filter((d) => num(d.r)).length - 1) * 0.5;
  return 1;
}

// ---------- Peso representativo (el más alto de la serie) ----------
export function setWeight(set, type) {
  if (!set) return null;
  if (type === 'dropset') {
    const first = (set.drops || []).find((d) => num(d.w) != null);
    return first ? num(first.w) : null;
  }
  return num(set.w);
}

// ---------- Reps del tramo principal (para estimar el 1RM) ----------
export function leadReps(set, type) {
  if (!set) return null;
  if (type === 'dropset') {
    const first = (set.drops || []).find((d) => num(d.r) != null);
    return first ? num(first.r) : null;
  }
  if (type === 'restpause') return num((set.clusters || [])[0]);
  return num(set.r);
}

// ---------- 1RM estimado ----------
// Epley con las reps en reserva sumadas: un RIR 2 equivale a dos reps más de las hechas.
// Se limita a 12 reps efectivas porque más allá la fórmula pierde fiabilidad.
export function e1rm(weight, reps, rir = 0) {
  const w = num(weight);
  const r = num(reps);
  if (w == null || r == null || r <= 0) return null;
  const eff = Math.min(12, r + (num(rir) || 0));
  return w * (1 + eff / 30);
}

export function setE1RM(set, type, load = 0) {
  const w = setWeight(set, type);
  const r = leadReps(set, type);
  if (w == null || r == null) return null;
  // En myo-reps y rest-pause la activación va al fallo, así que el RIR es 0.
  const rir = type === 'normal' ? (num(set.rir) ?? 0) : 0;
  return e1rm(w + load, r, rir);
}

export const hasData = (set, type) => setReps(set, type) > 0;

// ---------- Formato ----------
export const fmtWeight = (w, bw = false) => {
  const v = num(w);
  if (v == null) return '—';
  if (bw && v === 0) return 'BW';
  if (bw && v > 0) return `BW+${fmtNum(v, 2)}`;
  return `${fmtNum(v, 2)} kg`;
};

export function fmtSet(set, type, { bw = false } = {}) {
  if (!set) return '—';
  if (type === 'myo') {
    const chain = [set.r, ...(set.minis || [])].filter((r) => num(r) != null).join('×');
    return chain ? `${fmtWeight(set.w, bw)} — ${chain}` : '—';
  }
  if (type === 'restpause') {
    const chain = (set.clusters || []).filter((r) => num(r) != null).join('×');
    return chain ? `${fmtWeight(set.w, bw)} — ${chain}` : '—';
  }
  if (type === 'dropset') {
    // Se muestran también los escalones con peso pero sin reps apuntadas (el último suele ir al fallo).
    const chain = (set.drops || []).filter((d) => num(d.w) != null || num(d.r) != null)
      .map((d) => `${fmtNum(num(d.w) || 0, 2)}×${num(d.r) ?? '—'}`).join(' → ');
    return chain || '—';
  }
  const reps = set.raw || (num(set.r) != null ? String(set.r) : null);
  if (num(set.w) == null && reps == null) return '—';
  const rir = num(set.rir) != null ? ` · RIR ${set.rir}` : '';
  return `${fmtWeight(set.w, bw)} × ${reps ?? '—'}${rir}`;
}

// ---------- Agregados de una entrada de ejercicio ----------
export function entryTotals(entry, load = 0) {
  const sets = (entry.sets || []).filter((s) => hasData(s, entry.type));
  return {
    sets: sets.length,
    effective: sets.reduce((a, s) => a + effectiveSets(s, entry.type), 0),
    reps: sets.reduce((a, s) => a + setReps(s, entry.type), 0),
    tonnage: sets.reduce((a, s) => a + setTonnage(s, entry.type, load), 0),
    best: sets.reduce((a, s) => Math.max(a, setE1RM(s, entry.type, load) || 0), 0) || null,
    topWeight: sets.reduce((a, s) => Math.max(a, setWeight(s, entry.type) || 0), 0) || null,
  };
}

// ---------- Series vacías por tipo ----------
export const emptySet = (type, plan = {}) => {
  if (type === 'myo') return { w: null, r: null, minis: [null, null, null] };
  if (type === 'restpause') return { w: null, clusters: (plan.scheme || [8, 5, 5]).map(() => null) };
  if (type === 'dropset') {
    const steps = dropSteps(plan).length || 2; // el escalón al fallo también tiene su casilla
    return { drops: Array.from({ length: steps }, () => ({ w: null, r: null })) };
  }
  return { w: null, r: null, rir: null, raw: '' };
};

export const isSetDone = (set, type) => hasData(set, type);
