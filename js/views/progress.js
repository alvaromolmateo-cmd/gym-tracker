// Vista «Progreso»: lo que merece la pena mirar de verdad — carga, volumen por grupo,
// fuerza estimada, récords y si la progresión real va al ritmo que toca.

import { esc, icon, fmtNum, fmtDelta } from '../ui.js';
import { chart, barList, dataTable } from '../charts.js';
import { getState, allSessions, exerciseById } from '../store.js';
import { MUSCLES, muscleName, profileOf } from '../catalog.js';
import {
  weekSeries, weekStats, mondayOf, weekLabel, weekNumber, exerciseSeries, bestOf,
  muscleProgress, adherence, weekStreak, sessionTotals, hasLog,
} from '../metrics.js';
import { todayKey } from '../dates.js';
import { bandText } from '../progression.js';
import { volumeBars } from './shared.js';

const RANGES = [
  { id: '8', label: '8 semanas', weeks: 8 },
  { id: '12', label: '3 meses', weeks: 12 },
  { id: '26', label: '6 meses', weeks: 26 },
];

export function render(ctx) {
  const st = getState();
  const weeks = RANGES.find((r) => r.id === (ctx.range || '8'))?.weeks || 8;
  const series = weekSeries(weeks);
  const thisWeek = weekStats(mondayOf(todayKey()));
  const prev = series[series.length - 2];
  const trained = allSessions().filter(hasLog);

  const withData = st.exercises.filter((e) => exerciseSeries(e.id).length > 0);
  const exId = withData.some((e) => e.id === ctx.exercise) ? ctx.exercise : withData[0]?.id;

  // Volumen medio por semana en el rango, para comparar con la referencia semanal.
  const volAvg = {};
  const weeksWithWork = series.filter((w) => w.sessions > 0).length || 1;
  for (const w of series) for (const [m, v] of Object.entries(w.byMuscle)) volAvg[m] = (volAvg[m] || 0) + v / weeksWithWork;

  return `
    <div class="page-head">
      <div>
        <h1>Progreso</h1>
        <p class="muted">${trained.length} entrenos registrados · semana ${weekNumber(todayKey(), st.routine.startDate)} de la planificación</p>
      </div>
      <div class="page-actions">
        <div class="seg">${RANGES.map((r) => `<button class="seg-btn${(ctx.range || '8') === r.id ? ' on' : ''}" data-range="${r.id}">${r.label}</button>`).join('')}</div>
      </div>
    </div>

    <div class="tiles">
      <div class="tile tone-primary">
        <div class="tile-ic">${icon('flame')}</div>
        <div class="tile-body">
          <div class="tile-label">Racha</div>
          <div class="tile-value">${weekStreak()}<small> sem.</small></div>
          <div class="tile-sub">semanas completando la rutina</div>
        </div>
      </div>
      <div class="tile tone-accent">
        <div class="tile-ic">${icon('layers')}</div>
        <div class="tile-body">
          <div class="tile-label">Tonelaje esta semana</div>
          <div class="tile-value">${fmtNum(Math.round(thisWeek.tonnage))}<small> kg</small></div>
          <div class="tile-sub">${prev ? `${fmtDelta(thisWeek.tonnage - prev.tonnage, 'kg', 0)} vs. semana anterior` : 'sin comparación aún'}</div>
        </div>
      </div>
      <div class="tile tone-blue">
        <div class="tile-ic">${icon('list')}</div>
        <div class="tile-body">
          <div class="tile-label">Series efectivas</div>
          <div class="tile-value">${fmtNum(thisWeek.effective, 1)}</div>
          <div class="tile-sub">${thisWeek.sessions} de ${st.routine.days.length} entrenos</div>
        </div>
      </div>
      <div class="tile tone-danger">
        <div class="tile-ic">${icon('target')}</div>
        <div class="tile-body">
          <div class="tile-label">RIR medio</div>
          <div class="tile-value">${thisWeek.avgRir == null ? '—' : fmtNum(thisWeek.avgRir, 1)}</div>
          <div class="tile-sub">cuanto más bajo, más cerca del fallo</div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2>${icon('chart')} Tonelaje por semana</h2>
        <p class="muted">Kilos totales movidos: peso × reps de cada serie. Es la medida más directa de si estás haciendo más trabajo que antes.</p>
        ${chart('bars', {
          items: series.map((w) => ({ label: shortWeek(w.monday), value: Math.round(w.tonnage) || null, full: weekLabel(w.monday) })),
          unit: 'kg', decimals: 0, height: 220, color: 'var(--series-1)',
        })}
        ${dataTable(series.filter((w) => w.tonnage).map((w) => [weekLabel(w.monday), `${fmtNum(Math.round(w.tonnage))} kg`, fmtNum(w.effective, 1), String(w.reps)]), ['Semana', 'Tonelaje', 'Series', 'Reps'])}
      </div>

      <div class="card">
        <h2>${icon('layers')} Volumen por grupo muscular</h2>
        <p class="muted">Media de series efectivas por semana en el rango elegido. La banda clara marca las 12-20 series semanales que la revisión de Baz-Valle de 2022 sitúa como zona útil en gente entrenada.</p>
        ${volumeBars(volAvg)}
      </div>
    </div>

    <div class="card">
      <h2>${icon('trending')} Progresión real frente al objetivo</h2>
      <p class="muted">Cambio semanal medio del 1RM estimado por grupo muscular, comparado con el ritmo teórico que le corresponde. No se puede subir igual en una prensa que en unos laterales: por eso cada grupo tiene su propia vara de medir.</p>
      ${progressTable()}
    </div>

    ${withData.length ? `
      <div class="card">
        <div class="card-head">
          <h2>${icon('chart')} Fuerza estimada por ejercicio</h2>
          <select class="select" data-exercise>
            ${withData.sort((a, b) => a.name.localeCompare(b.name, 'es')).map((e) => `<option value="${esc(e.id)}"${e.id === exId ? ' selected' : ''}>${esc(e.name)}</option>`).join('')}
          </select>
        </div>
        ${exerciseChart(exId)}
      </div>` : ''}

    <div class="grid-2">
      <div class="card">
        <h2>${icon('trophy')} Récords</h2>
        ${records()}
      </div>
      <div class="card">
        <h2>${icon('check-circle')} Adherencia</h2>
        <p class="muted">Entrenos hechos frente a los ${st.routine.days.length} de la rutina, semana a semana.</p>
        ${chart('bars', {
          items: adherence(weeks).map((a) => ({ label: shortWeek(a.monday), value: Math.round(a.pct), full: `${weekLabel(a.monday)} · ${a.done}/${a.planned}` })),
          unit: '%', decimals: 0, max: 100, height: 180, color: 'var(--series-2)', showValues: false,
        })}
      </div>
    </div>
  `;
}

const shortWeek = (monday) => `${Number(monday.slice(8, 10))}/${Number(monday.slice(5, 7))}`;
const shortDate = (d) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}/${d.slice(2, 4)}`;

// ---------- Progresión por grupo ----------
function progressTable() {
  const rows = muscleProgress(12);
  if (!rows.length) return '<p class="muted">Hacen falta al menos dos semanas de registros del mismo ejercicio para medir la progresión.</p>';
  return `
    <div class="tbl-wrap">
      <table class="tbl prog-tbl">
        <thead><tr><th>Grupo</th><th>Real /sem.</th><th>Objetivo</th><th>Ritmo</th><th>Ejercicio que más tira</th></tr></thead>
        <tbody>
          ${rows.map((r) => {
            const ratio = r.target ? r.actual / r.target : 0;
            const state = ratio >= 0.9 ? 'ok' : ratio >= 0.4 ? 'mid' : 'low';
            return `
              <tr>
                <td>${esc(muscleName(r.muscle))}</td>
                <td class="num"><b class="prog-${state}">${fmtDelta(r.actual, '%', 2)}</b></td>
                <td class="num muted">+${fmtNum(r.target, 1)} %</td>
                <td><span class="prog-bar"><i class="prog-${state}" style="width:${Math.max(2, Math.min(100, ratio * 100)).toFixed(0)}%"></i></span></td>
                <td class="muted">${esc(r.exercises[0]?.name || '—')}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <p class="hint">Referencia: la ACSM recomienda subir la carga entre un 2 % en músculos pequeños y un 10 % en los grandes cuando se superan las reps objetivo; el ritmo semanal esperable es menor que ese salto porque no se sube todas las semanas.</p>`;
}

// ---------- Serie de un ejercicio ----------
function exerciseChart(exId) {
  if (!exId) return '';
  const ex = exerciseById(exId);
  const series = exerciseSeries(exId);
  const p = profileOf(ex.muscle);
  return `
    <p class="muted">1RM estimado con la fórmula de Epley sumando las reps en reserva. En myo-reps y rest-pause se toma la serie de activación, que va al fallo.</p>
    ${chart('line', {
      points: series.map((s) => ({ label: `${Number(s.date.slice(8, 10))}/${Number(s.date.slice(5, 7))}`, value: s.e1rm ? Math.round(s.e1rm * 10) / 10 : null, full: `${s.date} · ${fmtNum(s.weight, 2)} kg × ${s.reps} reps` })),
      unit: 'kg', decimals: 1, height: 220, color: 'var(--series-1)',
    })}
    <div class="ex-foot">
      <span class="muted">${esc(muscleName(ex.muscle))} · saltos de ${fmtNum(ex.step, 2)} kg · banda ${bandText(ex.muscle)} · objetivo ≈${fmtNum(p.weekly, 1)} %/semana</span>
    </div>
    ${dataTable(series.slice().reverse().map((s) => [shortDate(s.date), `${fmtNum(s.weight, 2)} kg`, String(s.reps), `${fmtNum(s.e1rm, 1)} kg`]), ['Fecha', 'Peso máx.', 'Reps', '1RM est.'])}`;
}

// ---------- Récords ----------
function records() {
  const rows = getState().exercises
    .map((e) => ({ e, best: bestOf(e.id) }))
    .filter((r) => r.best?.e1rm)
    .sort((a, b) => b.best.e1rm.e1rm - a.best.e1rm.e1rm);
  if (!rows.length) return '<p class="muted">Todavía no hay récords: registra algún entreno.</p>';
  return `
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th>Ejercicio</th><th>Mejor peso</th><th>1RM est.</th><th>Cuándo</th></tr></thead>
        <tbody>
          ${rows.slice(0, 12).map(({ e, best }) => `
            <tr>
              <td>${esc(e.name)}</td>
              <td class="num">${fmtNum(best.weight?.weight, 2)} kg</td>
              <td class="num"><b>${fmtNum(best.e1rm.e1rm, 1)} kg</b></td>
              <td class="muted num">${esc(shortDate(best.e1rm.date))}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

export function mount(root, ctx) {
  root.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => ctx.set('range', b.dataset.range)));
  root.querySelector('[data-exercise]')?.addEventListener('change', (e) => ctx.set('exercise', e.target.value));
}
