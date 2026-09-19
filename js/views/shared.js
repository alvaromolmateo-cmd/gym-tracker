// Piezas de interfaz compartidas entre vistas.

import { esc, icon, fmtNum } from '../ui.js';
import {
  MUSCLE, MUSCLES, muscleName, myoPlan, profileOf, descOf, dropSteps,
  SET_TYPES, MYO_REST_FIRST, MYO_REST, MYO_MINIS,
} from '../catalog.js';
import { exerciseById } from '../store.js';
import { fmtSet, entryTotals } from '../sets.js';
import { sessionTotals, loadOf } from '../metrics.js';

export const muscleChip = (id) => `<span class="chip chip-${esc(id)}">${MUSCLE[id]?.emoji || ''} ${esc(MUSCLE[id]?.short || 'Otro')}</span>`;

// Las series normales no llevan chip: lo que toca hacer ya lo dicen las fichas de series/reps/RIR.
export const typeChip = (type) => {
  const t = SET_TYPES[type];
  if (!t || type === 'normal') return '';
  return `<span class="chip chip-type chip-${esc(type)}">${icon(t.icon)}${esc(t.short)}</span>`;
};

export const FEELS = [
  { v: 1, emoji: '😵', label: 'Fatal' },
  { v: 2, emoji: '😕', label: 'Flojo' },
  { v: 3, emoji: '🙂', label: 'Normal' },
  { v: 4, emoji: '😃', label: 'Bien' },
  { v: 5, emoji: '🔥', label: 'Brutal' },
];

export const feelEmoji = (v) => FEELS.find((f) => f.v === v)?.emoji || '';

// ---------- Prescripción ----------
// Reps de una serie normal: el texto libre manda («7+6»), si no, el rango.
export const repsLabel = (plan) => String(
  plan.repsText || (plan.repsMin === plan.repsMax ? (plan.repsMin ?? '—') : `${plan.repsMin ?? '?'}-${plan.repsMax ?? '?'}`),
);

// Texto corto de lo que toca hacer, para las listas de una sola línea. Devuelve texto plano.
export function planText(plan) {
  if (!plan) return '';
  switch (plan.type) {
    case 'myo':
      return 'Myo-reps';
    case 'restpause':
      return `Rest-pause · ${(plan.scheme || []).join('+')} con ${plan.clusterRest || 15}" entre tandas`;
    case 'dropset':
      return `Drop set · ${plan.sets || 1} × (${dropSteps(plan).join(' → ') || '—'})`;
    default: {
      const rir = plan.rir ? ` · RIR ${plan.rir}` : '';
      return `${plan.sets ?? 1} × ${repsLabel(plan)}${rir}`;
    }
  }
}

// Lo mismo, pero en fichas: cada tipo de serie enseña lo suyo y se lee de un vistazo.
// `wide` marca el dato largo (el esquema), que se lleva toda la fila cuando no cabe.
export function planSpecs(plan) {
  if (!plan) return [];
  switch (plan.type) {
    case 'myo':
      return [
        { label: 'Activación', value: 'al fallo' },
        { label: 'Mini-series', value: `${MYO_MINIS} · tabla` },
        { label: 'Final', value: 'al fallo' },
      ];
    case 'restpause':
      return [
        { label: 'Series', value: plan.sets || 1 },
        { label: 'Tandas', value: (plan.scheme || []).join('+') || '—', wide: true },
        { label: 'Descanso', value: `${plan.clusterRest || 15}"` },
      ];
    case 'dropset':
      return [
        { label: 'Series', value: plan.sets || 1 },
        { label: 'Escalones', value: dropSteps(plan).join(' → ') || '—', wide: true },
        { label: 'Bajada', value: `−${plan.dropPct || 15} %` },
      ];
    default:
      return [
        { label: 'Series', value: plan.sets ?? 1 },
        { label: 'Reps', value: repsLabel(plan) },
        ...(plan.rir ? [{ label: 'RIR', value: plan.rir }] : []),
      ];
  }
}

// Fila de fichas. Va en `span` para poder vivir dentro de un botón (la cabecera del ejercicio).
export const specRow = (plan, lead = '') => `
  <span class="spec">${lead}${planSpecs(plan).map((sp) => `
    <span class="spec-item${sp.wide ? ' spec-wide' : ''}"><small>${esc(sp.label)}</small><b>${esc(String(sp.value))}</b></span>`).join('')}</span>`;

// Detalles secundarios: la descripción del ejercicio, el tempo y la nota del entrenador.
// Solo salen si se han escrito, para no llenar la pantalla de texto.
export function planDetails(plan) {
  const bits = [];
  const desc = descOf(plan);
  if (desc) bits.push(`${icon('info')} ${esc(desc)}`);
  if (plan.tempo) bits.push(`${icon('clock')} ${esc(plan.tempo)}`);
  if (plan.note) bits.push(`${icon('quote')} ${esc(plan.note)}`);
  return bits.length ? `<span class="plan-details">${bits.map((b) => `<span>${b}</span>`).join('')}</span>` : '';
}

// Guía de myo-reps: la secuencia entera dibujada, con las reps que toca en cada mini-serie.
export function myoGuide(activation) {
  const p = myoPlan(activation);
  const mini = activation ? `${p.reps} reps` : '—';
  const verdict = !activation
    ? '<span class="muted">Apunta las reps de la activación y te digo las de las mini-series.</span>'
    : p.verdict === 'heavy'
      ? '<span class="warn">Menos de 6 reps – El peso se te ha ido, baja para la próxima.</span>'
      : p.verdict === 'light'
        ? '<span class="warn">Más de 20 reps – Demasiado ligero, sube en la próxima sesión.</span>'
        : `<span class="muted">Activación de ${activation} reps → mini-series de ${p.reps}.</span>`;
  const step = (name, value, key = false) => `<span class="chain-step${key ? ' is-key' : ''}"><small>${name}</small><b>${value}</b></span>`;
  const rest = (secs) => `<span class="chain-rest">${secs}"</span>`;
  return `
    <div class="myo-guide">
      <div class="chain">
        ${step('Activación', 'al fallo', true)}
        ${rest(MYO_REST_FIRST)}
        ${step('Mini 1', mini)}
        ${rest(MYO_REST)}
        ${step('Mini 2', mini)}
        ${rest(MYO_REST)}
        ${step('Final', 'al fallo', true)}
      </div>
      ${verdict}
    </div>`;
}

// ---------- Resumen de una sesión ----------
export function sessionSummary(session, { compact = false } = {}) {
  const t = sessionTotals(session);
  const bits = [
    `<b>${t.reps}</b> reps`,
    `<b>${fmtNum(t.effective, 1)}</b> series`,
    `<b>${fmtNum(Math.round(t.tonnage))}</b> kg`,
  ];
  if (!compact && t.avgRir != null) bits.push(`RIR medio <b>${fmtNum(t.avgRir, 1)}</b>`);
  return `<div class="summary-row">${bits.map((b) => `<span>${b}</span>`).join('')}</div>`;
}

// Lista de lo registrado en una sesión, tal cual quedaría en la libreta.
export function entryLines(session) {
  return (session.entries || []).map((entry) => {
    const ex = exerciseById(entry.exerciseId);
    const t = entryTotals(entry, loadOf(ex));
    if (!t.sets) return '';
    const sets = entry.sets.filter((s) => fmtSet(s, entry.type, { bw: ex.bw }) !== '—');
    return `
      <div class="log-line">
        <div class="log-name">${esc(ex.name)} ${muscleChip(ex.muscle)} ${typeChip(entry.type)}</div>
        <div class="log-sets">${sets.map((s) => `<span class="log-set">${esc(fmtSet(s, entry.type, { bw: ex.bw }))}</span>`).join('')}</div>
        ${entry.note ? `<div class="log-note">${icon('edit')} ${esc(entry.note)}</div>` : ''}
      </div>`;
  }).join('');
}

// ---------- Volumen por grupo muscular ----------
// Barras con la banda de referencia (12-20 series semanales en los grupos grandes, Baz-Valle 2022).
export function volumeBars(byMuscle) {
  const rows = MUSCLES
    .map((m) => ({ m, v: byMuscle[m.id] || 0, range: profileOf(m.id).sets }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);
  if (!rows.length) return '<p class="muted">Sin series registradas.</p>';
  const max = Math.max(...rows.map((r) => Math.max(r.v, r.range[1])));
  return `<div class="vol-list">${rows.map(({ m, v, range }) => {
    const state = v < range[0] ? 'low' : v > range[1] ? 'high' : 'ok';
    return `
      <div class="vol-row" title="${esc(m.name)}: ${fmtNum(v, 1)} series · referencia ${range[0]}-${range[1]}">
        <span class="vol-name">${m.emoji} ${esc(m.short)}</span>
        <span class="vol-track">
          <span class="vol-band" style="left:${((range[0] / max) * 100).toFixed(1)}%;width:${(((range[1] - range[0]) / max) * 100).toFixed(1)}%"></span>
          <span class="vol-fill vol-${state}" style="width:${Math.min(100, (v / max) * 100).toFixed(1)}%"></span>
        </span>
        <span class="vol-val vol-${state}">${fmtNum(v, 1)}<small>/${range[0]}-${range[1]}</small></span>
      </div>`;
  }).join('')}</div>`;
}

// ---------- Selectores ----------
export const dayOptions = (days, selected) => days.map((d) => `<option value="${esc(d.id)}"${d.id === selected ? ' selected' : ''}>${esc(d.name)} · ${esc(d.focus)}</option>`).join('');

export const exerciseOptions = (exercises, selected) => exercises
  .filter((e) => !e.archived)
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  .map((e) => `<option value="${esc(e.id)}"${e.id === selected ? ' selected' : ''}>${esc(e.name)} — ${esc(muscleName(e.muscle))}</option>`)
  .join('');

export const emptyState = (text, action = '') => `<div class="empty">${icon('feather')}<p>${esc(text)}</p>${action}</div>`;
