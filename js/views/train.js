// Vista «Entreno»: arranque de la sesión y registro en vivo, ejercicio a ejercicio.
// Sin temporizadores ni cronómetro de sesión: los descansos van por sensaciones y el tiempo total
// mentiría (es fácil olvidarse de cerrar el entreno). Lo que se mide es reps, series y tonelaje.

import { esc, icon, fmtNum, toast, confirmDialog, openModal, closeModal, modalHeader } from '../ui.js';
import {
  getState, activeSession, startSession, setActive, patchSession, patchEntry, patchSet,
  addSet, removeSet, addEntry, removeEntry, moveEntry, finishSession, deleteSession,
  exerciseById, historyOf, allSessions,
} from '../store.js';
import { todayKey, dayLabel } from '../dates.js';
import { myoPlan, dropSteps, MYO_MINIS, MYO_BLOCKS, SET_TYPES } from '../catalog.js';
import { fmtSet, fmtWeight, num, hasData, parseReps, entryTotals, setReps } from '../sets.js';
import { suggest, dropWeights } from '../progression.js';
import { sessionTotals, nextDay, dayVolume, sessionPRs, loadOf, weekNumber, mondayOf } from '../metrics.js';
import {
  muscleChip, typeChip, planText, planDetails, specRow, myoGuide, sessionSummary,
  dayOptions, exerciseOptions, FEELS,
} from './shared.js';

export function render(ctx) {
  const session = activeSession();
  return session ? renderSession(ctx, session) : renderStart(ctx);
}

// ============================ Arranque ============================
function renderStart(ctx) {
  const st = getState();
  const suggested = nextDay();
  const dayId = ctx.startDay && st.routine.days.some((d) => d.id === ctx.startDay) ? ctx.startDay : suggested.id;
  const day = st.routine.days.find((d) => d.id === dayId) || suggested;
  const vol = dayVolume(day);
  const pending = allSessions().filter((s) => !s.endedAt && s.id !== st.activeId);
  const recent = allSessions().filter((s) => s.endedAt).slice(-3).reverse();

  return `
    <div class="page-head">
      <div>
        <h1>Entreno</h1>
        <p class="muted">${esc(dayLabel(todayKey()))} · semana ${weekNumber(todayKey(), st.routine.startDate)} de «${esc(st.routine.name)}»</p>
      </div>
    </div>

    ${pending.length ? `
      <div class="card card-pending">
        <h2>${icon('clock')} Tienes un entreno sin cerrar</h2>
        ${pending.map((s) => `
          <div class="pending-row">
            <div><b>${esc(s.dayName)}</b> · ${esc(s.focus)}<br><small>${esc(dayLabel(s.date))}</small></div>
            <div class="btn-row">
              <button class="btn btn-primary sm" data-resume="${esc(s.id)}">Retomar</button>
              <button class="btn sm btn-danger-ghost" data-drop-session="${esc(s.id)}">Descartar</button>
            </div>
          </div>`).join('')}
      </div>` : ''}

    <div class="card next-card">
      <div class="next-head">
        <div>
          <div class="next-kicker">${day.id === suggested.id ? 'Te toca' : 'Has elegido'}</div>
          <h2 class="next-title">${esc(day.name)} · ${esc(day.focus)}</h2>
        </div>
        <button class="btn btn-primary btn-go" data-start="${esc(day.id)}">${icon('play')} Empezar</button>
      </div>

      <div class="next-meta">
        <span>${icon('list')} ${day.items.length} ejercicios</span>
        <span>${icon('layers')} ~${fmtNum(vol.sets, 1)} series</span>
        ${Object.entries(vol.byMuscle).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m]) => muscleChip(m)).join('')}
      </div>

      <ol class="preview-list">
        ${day.items.map((item) => {
          const ex = exerciseById(item.exerciseId);
          const last = historyOf(item.exerciseId, { type: item.type })[0];
          return `
            <li>
              <span class="preview-name">${esc(ex.name)}${typeChip(item.type)}</span>
              <span class="preview-plan">${esc(planText(item))}</span>
              <span class="preview-last">${last ? esc(fmtSet(last.sets.find((s) => hasData(s, last.type)) || last.sets[0], last.type, { bw: ex.bw })) : '—'}</span>
            </li>`;
        }).join('')}
      </ol>

      <div class="next-foot">
        <label class="fld">Otro día
          <select class="select" data-start-day>${dayOptions(st.routine.days, day.id)}</select>
        </label>
        <label class="fld">Fecha
          <input class="input" type="date" value="${esc(ctx.startDate || todayKey())}" data-start-date>
        </label>
      </div>
    </div>

    ${recent.length ? `
      <div class="card">
        <h2>${icon('archive')} Últimos entrenos</h2>
        ${recent.map((s) => `
          <button class="recent-row" data-open-session="${esc(s.id)}">
            <span class="recent-day"><b>${esc(s.dayName)}</b><small>${esc(dayLabel(s.date))}</small></span>
            ${sessionSummary(s, { compact: true })}
          </button>`).join('')}
      </div>` : ''}
  `;
}

// ============================ Sesión en vivo ============================
function renderSession(ctx, session) {
  const t = sessionTotals(session);
  const openId = ctx.openEntry && session.entries.some((e) => e.id === ctx.openEntry)
    ? ctx.openEntry
    : (session.entries.find((e) => entryTotals(e).sets === 0)?.id || session.entries[0]?.id);

  return `
    <div class="session-head">
      <div class="session-title">
        <h1>${esc(session.dayName)}</h1>
        <p class="muted">${esc(session.focus)} · ${esc(dayLabel(session.date))}</p>
      </div>
      <div class="session-stats">
        <span><b data-reps>${t.reps}</b><small>reps</small></span>
        <span><b data-progress>${t.done}/${t.planned}</b><small>series</small></span>
        <span><b data-tonnage>${fmtNum(Math.round(t.tonnage))}</b><small>kg</small></span>
      </div>
      <div class="btn-row">
        <button class="btn" data-exit>${icon('chevron-left')} Salir</button>
        <button class="btn btn-primary" data-finish>${icon('check')} Terminar</button>
      </div>
    </div>

    <div class="entries">
      ${session.entries.map((entry, i) => renderEntry(session, entry, i, entry.id === openId)).join('')}
    </div>

    <div class="card">
      <div class="btn-row">
        <button class="btn" data-add-exercise>${icon('plus')} Añadir ejercicio suelto</button>
      </div>
    </div>
  `;
}

function renderEntry(session, entry, index, open) {
  const ex = exerciseById(entry.exerciseId);
  const load = loadOf(ex);
  const t = entryTotals(entry, load);
  const history = historyOf(entry.exerciseId, { before: session.date, excludeSession: session.id, type: entry.type });
  const last = history[0];
  const tip = suggest({ exercise: ex, plan: entry.plan, history });

  const done = t.sets >= entry.sets.length;
  const state = t.sets === 0 ? '' : done ? ' is-done' : ' is-partial';

  return `
    <section class="entry${state}${open ? ' is-open' : ''}" data-entry="${esc(entry.id)}">
      <button class="entry-head" data-toggle-entry="${esc(entry.id)}">
        <span class="entry-num">${index + 1}</span>
        <span class="entry-top">
          <span class="entry-name">${esc(ex.name)}</span>
          ${typeChip(entry.type)}
        </span>
        <span class="entry-state">
          ${t.tonnage ? `<b>${fmtNum(Math.round(t.tonnage))} kg</b>` : ''}
          ${done ? icon('check-circle') : `<span class="entry-chev">${icon('chevron-right')}</span>`}
        </span>
        ${specRow(entry.plan, muscleChip(ex.muscle))}
      </button>

      ${open ? `
        <div class="entry-body">
          ${planDetails(entry.plan)}

          <div class="entry-cols">
            <div class="tip-box tip-${esc(tip.action)}">
              <div class="tip-head">${icon('target')} Hoy${tip.weight != null ? `: <b>${esc(fmtWeight(tip.weight, ex.bw))}</b>` : ''}${tip.reps ? ` × <b>${tip.reps}</b>` : ''}</div>
              <p>${esc(tip.reason)}</p>
              ${tip.weight != null ? `<button class="btn sm" data-use-tip="${esc(entry.id)}" data-w="${tip.weight}">Usar en todas las series</button>` : ''}
            </div>
            <div class="last-box">
              <div class="last-head">${icon('archive')} Última vez${last ? ` · <span class="muted">${esc(last.date.slice(8, 10))}/${esc(last.date.slice(5, 7))}</span>` : ''}</div>
              ${last
                ? `<div class="last-sets">${last.sets.filter((s) => hasData(s, last.type)).map((s) => `<span>${esc(fmtSet(s, last.type, { bw: ex.bw }))}</span>`).join('')}</div>
                   ${last.note ? `<p class="last-note">${esc(last.note)}</p>` : ''}
                   <button class="btn sm" data-copy-last="${esc(entry.id)}">Copiar pesos</button>`
                : '<p class="muted">Sin registros previos.</p>'}
            </div>
          </div>

          ${renderSets(entry, ex, tip)}

          <label class="fld entry-note-fld">Anotación
            <input class="input" type="text" placeholder="Técnica, sensaciones, ajustes de máquina…" value="${esc(entry.note)}" data-entry-note="${esc(entry.id)}">
          </label>

          <div class="entry-foot">
            <div class="btn-row">
              <button class="btn sm" data-add-set="${esc(entry.id)}">${icon('plus')} Serie</button>
              ${entry.sets.length > 1 ? `<button class="btn sm" data-del-set="${esc(entry.id)}">${icon('minus')} Serie</button>` : ''}
            </div>
            <div class="btn-row">
              <button class="icon-btn sm" data-move-entry="${esc(entry.id)}" data-dir="-1" aria-label="Subir">${icon('arrow-up')}</button>
              <button class="icon-btn sm" data-move-entry="${esc(entry.id)}" data-dir="1" aria-label="Bajar">${icon('arrow-down')}</button>
              <button class="icon-btn sm danger" data-del-entry="${esc(entry.id)}" aria-label="Quitar">${icon('trash')}</button>
            </div>
          </div>
        </div>` : ''}
    </section>`;
}

// ---------- Series según el tipo ----------
function renderSets(entry, ex, tip) {
  switch (entry.type) {
    case 'myo': return renderMyo(entry, ex);
    case 'restpause': return renderRestPause(entry, ex);
    case 'dropset': return renderDrop(entry, ex, tip);
    default: return renderNormal(entry, ex);
  }
}

const wInput = (entry, i, set, ex, extra = '') => `
  <input class="cell-input" type="number" inputmode="decimal" step="0.5" min="0" placeholder="${ex.bw ? 'BW' : 'kg'}"
    value="${set.w ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="w" ${extra}>`;

// Cabecera de una serie cuando hay más de una del mismo tipo troceado.
const subHead = (i, total, chain = '') => (total > 1
  ? `<div class="sub-head"><b>Serie ${i + 1} <small>de ${total}</small></b>${chain ? `<span class="chain-text">${esc(chain)}</span>` : ''}</div>`
  : '');

function renderNormal(entry, ex) {
  const plan = entry.plan;
  const normal = plan.sets || entry.sets.length;
  return `
    <div class="sets sets-normal">
      <div class="sets-head"><span></span><span>Peso</span><span>Reps</span><span>RIR</span><span></span></div>
      ${entry.sets.map((set, i) => `
        <div class="set-row${hasData(set, 'normal') ? ' is-filled' : ''}" data-row="${i}">
          <span class="set-num">${i < normal ? i + 1 : '+'}</span>
          ${wInput(entry, i, set, ex)}
          <input class="cell-input" type="text" inputmode="numeric" placeholder="${esc(String(plan.repsText || plan.repsMin || ''))}"
            value="${esc(set.raw || (set.r ?? ''))}" data-set="${esc(entry.id)}" data-i="${i}" data-field="raw">
          <input class="cell-input" type="number" inputmode="numeric" step="1" min="0" max="10" placeholder="${esc(String(plan.rirMax ?? 0))}"
            value="${set.rir ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="rir">
          <button class="set-ok" data-ok="${esc(entry.id)}" data-i="${i}" aria-label="Serie hecha">${icon('check')}</button>
        </div>`).join('')}
    </div>`;
}

// La secuencia es fija: activación al fallo, 40", mini de la tabla, 20", mini de la tabla, 20" y última al fallo.
function renderMyo(entry, ex) {
  return `
    <div class="sets sets-myo">
      ${entry.sets.map((set, i) => {
        const act = num(set.r);
        const p = myoPlan(act);
        const minis = set.minis && set.minis.length ? set.minis : Array.from({ length: MYO_BLOCKS }, () => null);
        return `
        <div class="myo-set">
          ${subHead(i, entry.sets.length)}
          <div class="myo-act">
            <label><span>Peso</span>${wInput(entry, i, set, ex)}</label>
            <label><span>Activación · al fallo</span>
              <input class="cell-input" type="number" inputmode="numeric" step="1" min="0" placeholder="reps"
                value="${set.r ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="r" data-myo-act>
            </label>
          </div>
          <div data-myo-guide>${myoGuide(act)}</div>
          <div class="myo-minis">
            ${minis.map((v, k) => {
              const fail = k >= MYO_MINIS;
              return `
              <label class="mini${fail ? ' mini-fail' : ''}${v != null && v !== '' ? ' is-filled' : ''}">
                <span>${fail ? 'Final · al fallo' : `Mini ${k + 1}${act ? ` · ${p.reps}` : ''}`}</span>
                <input class="cell-input" type="number" inputmode="numeric" step="1" min="0" placeholder="${fail ? 'fallo' : (act ? p.reps : '—')}"
                  value="${v ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="mini" data-k="${k}">
                <button class="set-ok sm" data-ok="${esc(entry.id)}" data-i="${i}" aria-label="Tramo hecho">${icon('check')}</button>
              </label>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderRestPause(entry, ex) {
  const scheme = entry.plan.scheme || [];
  const target = scheme.reduce((a, b) => a + b, 0);
  return `
    <div class="sets sets-rp">
      ${entry.sets.map((set, i) => {
        const clusters = set.clusters && set.clusters.length ? set.clusters : scheme.map(() => null);
        const total = setReps(set, 'restpause');
        return `
        <div class="rp-set">
          ${subHead(i, entry.sets.length)}
          <div class="rp-top">
            <label><span>Peso</span>${wInput(entry, i, set, ex)}</label>
            <div class="rp-goal">
              ${icon('clock')} <b>${entry.plan.clusterRest || 15}"</b> entre tandas · objetivo
              <b>${esc(scheme.join('+') || '—')}</b> = <b>${target}</b> reps
            </div>
          </div>
          <div class="rp-boxes">
            ${clusters.map((v, k) => `
              <label class="mini${v != null && v !== '' ? ' is-filled' : ''}">
                <span>${k + 1}.ª · ${scheme[k] ?? '—'}</span>
                <input class="cell-input" type="number" inputmode="numeric" step="1" min="0" placeholder="${scheme[k] ?? ''}"
                  value="${v ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="cluster" data-k="${k}">
                <button class="set-ok sm" data-ok="${esc(entry.id)}" data-i="${i}" aria-label="Tanda hecha">${icon('check')}</button>
              </label>`).join('')}
          </div>
          <div class="rp-total">Llevas <b data-rp-total>${total}</b> de <b>${target}</b> reps</div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderDrop(entry, ex, tip = {}) {
  const steps = dropSteps(entry.plan);
  const chain = steps.join(' → ');
  return `
    <div class="sets sets-drop">
      ${entry.sets.map((set, i) => {
        const drops = set.drops && set.drops.length ? set.drops : steps.map(() => ({ w: null, r: null }));
        // Pesos orientativos de la cascada: desde lo que ya haya puesto o desde la sugerencia de hoy.
        const sugg = dropWeights(drops[0]?.w ?? tip.weight, ex, steps.length, entry.plan.dropPct || 15);
        return `
          <div class="drop-set">
            <div class="drop-head">
              <b>Serie ${i + 1} <small>de ${entry.sets.length}</small></b>
              <span class="chain-text">${esc(chain)}</span>
            </div>
            <div class="drop-rows">
              <div class="drop-row drop-cols"><span></span><span>Peso</span><span>Reps</span></div>
              ${steps.map((tgt, k) => {
                const fail = tgt === 'fallo';
                const d = drops[k] || {};
                return `
                <div class="drop-row${fail ? ' is-fail' : ''}${d.r != null && d.r !== '' ? ' is-filled' : ''}">
                  <span class="drop-step">${fail ? 'Fallo' : `${k + 1}.º`}</span>
                  <input class="cell-input" type="number" inputmode="decimal" step="0.5" min="0" placeholder="${sugg[k] ?? (ex.bw ? 'BW' : 'kg')}"
                    value="${d.w ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="dropw" data-k="${k}">
                  <input class="cell-input" type="number" inputmode="numeric" step="1" min="0" placeholder="${esc(String(tgt))}"
                    value="${d.r ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="dropr" data-k="${k}">
                </div>`;
              }).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ============================ Montaje ============================
export function mount(root, ctx) {
  const session = activeSession();
  if (!session) return mountStart(root, ctx);

  // --- Toggle de ejercicios ---
  root.querySelectorAll('[data-toggle-entry]').forEach((b) => b.addEventListener('click', () => {
    ctx.set('openEntry', ctx.openEntry === b.dataset.toggleEntry ? null : b.dataset.toggleEntry);
  }));

  // --- Entrada de datos (silenciosa para no perder el foco) ---
  root.querySelectorAll('[data-set]').forEach((input) => {
    input.addEventListener('input', () => {
      const entryId = input.dataset.set;
      const i = Number(input.dataset.i);
      const k = Number(input.dataset.k);
      const raw = input.value.trim();
      const v = raw === '' ? null : Number(raw);
      const entry = session.entries.find((e) => e.id === entryId);
      if (!entry) return;
      const set = entry.sets[i];
      if (!set) return;

      switch (input.dataset.field) {
        case 'w': patchSet(session.id, entryId, i, { w: v }, { silent: true }); break;
        case 'r': patchSet(session.id, entryId, i, { r: v }, { silent: true }); break;
        case 'rir': patchSet(session.id, entryId, i, { rir: v }, { silent: true }); break;
        case 'raw': patchSet(session.id, entryId, i, { raw, r: parseReps(raw) }, { silent: true }); break;
        case 'mini': {
          const minis = [...(set.minis || [])];
          minis[k] = v;
          patchSet(session.id, entryId, i, { minis }, { silent: true });
          break;
        }
        case 'cluster': {
          const clusters = [...(set.clusters || [])];
          clusters[k] = v;
          patchSet(session.id, entryId, i, { clusters }, { silent: true });
          break;
        }
        case 'dropw':
        case 'dropr': {
          const steps = dropSteps(entry.plan);
          const drops = (set.drops && set.drops.length ? set.drops : steps.map(() => ({ w: null, r: null }))).map((d) => ({ ...d }));
          drops[k] = drops[k] || { w: null, r: null };
          drops[k][input.dataset.field === 'dropw' ? 'w' : 'r'] = v;
          patchSet(session.id, entryId, i, { drops }, { silent: true });
          break;
        }
        default: break;
      }

      refreshLive(root, session, entryId, input);
    });
  });

  // --- Botón de serie hecha: solo la marca, aquí ya no hay descansos que contar ---
  root.querySelectorAll('[data-ok]').forEach((b) => b.addEventListener('click', () => {
    b.closest('.set-row, .mini')?.classList.add('is-filled');
  }));

  // --- Sugerencia y copia ---
  // «Usar en todas las series» manda: pisa también los pesos que ya hubiera puestos.
  root.querySelectorAll('[data-use-tip]').forEach((b) => b.addEventListener('click', () => {
    const entry = session.entries.find((e) => e.id === b.dataset.useTip);
    const w = Number(b.dataset.w);
    entry.sets.forEach((set, i) => {
      if (entry.type === 'dropset') {
        const steps = dropSteps(entry.plan);
        const drops = (set.drops && set.drops.length ? set.drops : steps.map(() => ({ w: null, r: null }))).map((d) => ({ ...d }));
        drops[0] = { ...(drops[0] || { r: null }), w };
        patchSet(session.id, entry.id, i, { drops }, { silent: true });
      } else {
        patchSet(session.id, entry.id, i, { w }, { silent: true });
      }
    });
    patchSession(session.id, {});
    toast(`Cargado ${fmtNum(w, 1)} kg en todas las series`);
  }));

  root.querySelectorAll('[data-copy-last]').forEach((b) => b.addEventListener('click', () => {
    const entry = session.entries.find((e) => e.id === b.dataset.copyLast);
    const last = historyOf(entry.exerciseId, { before: session.date, excludeSession: session.id, type: entry.type })[0];
    if (!last) return;
    entry.sets.forEach((set, i) => {
      const src = last.sets[i];
      if (!src) return;
      if (entry.type === 'dropset') patchSet(session.id, entry.id, i, { drops: (src.drops || []).map((d) => ({ w: d.w, r: null })) }, { silent: true });
      else patchSet(session.id, entry.id, i, { w: src.w ?? null }, { silent: true });
    });
    patchSession(session.id, {});
    toast('Pesos copiados de la última vez');
  }));

  // --- Notas ---
  root.querySelectorAll('[data-entry-note]').forEach((input) => {
    input.addEventListener('input', () => patchEntry(session.id, input.dataset.entryNote, { note: input.value }, { silent: true }));
  });

  // --- Series y ejercicios ---
  root.querySelectorAll('[data-add-set]').forEach((b) => b.addEventListener('click', () => addSet(session.id, b.dataset.addSet)));
  root.querySelectorAll('[data-del-set]').forEach((b) => b.addEventListener('click', () => {
    const entry = session.entries.find((e) => e.id === b.dataset.delSet);
    removeSet(session.id, entry.id, entry.sets.length - 1);
  }));
  root.querySelectorAll('[data-move-entry]').forEach((b) => b.addEventListener('click', () => moveEntry(session.id, b.dataset.moveEntry, Number(b.dataset.dir))));
  root.querySelectorAll('[data-del-entry]').forEach((b) => b.addEventListener('click', async () => {
    const entry = session.entries.find((e) => e.id === b.dataset.delEntry);
    const ok = await confirmDialog({ title: 'Quitar ejercicio', message: `Se borra <b>${esc(exerciseById(entry.exerciseId).name)}</b> de este entreno.`, confirmText: 'Quitar' });
    if (ok) removeEntry(session.id, b.dataset.delEntry);
  }));
  root.querySelector('[data-add-exercise]')?.addEventListener('click', () => openAddExercise(session.id));

  // --- Cierre ---
  root.querySelector('[data-exit]')?.addEventListener('click', () => {
    setActive(null);
    toast('Entreno guardado sin cerrar');
  });
  root.querySelector('[data-finish]')?.addEventListener('click', () => openFinish(session.id));
}

function mountStart(root, ctx) {
  root.querySelector('[data-start-day]')?.addEventListener('change', (e) => ctx.set('startDay', e.target.value));
  root.querySelector('[data-start-date]')?.addEventListener('change', (e) => ctx.set('startDate', e.target.value));
  root.querySelector('[data-start]')?.addEventListener('click', (e) => {
    startSession(e.currentTarget.dataset.start, ctx.startDate || todayKey());
    ctx.set('openEntry', null);
  });
  root.querySelectorAll('[data-resume]').forEach((b) => b.addEventListener('click', () => setActive(b.dataset.resume)));
  root.querySelectorAll('[data-drop-session]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Descartar entreno', message: 'Se borra ese entreno sin cerrar y todo lo que tenga apuntado.' });
    if (ok) deleteSession(b.dataset.dropSession);
  }));
  root.querySelectorAll('[data-open-session]').forEach((b) => b.addEventListener('click', () => {
    const s = getState().sessions[b.dataset.openSession];
    if (s) ctx.week = mondayOf(s.date);
    location.hash = '#/historial';
  }));
}

// Actualiza a mano lo que depende de lo tecleado, sin repintar la vista.
function refreshLive(root, session, entryId, input) {
  const entry = session.entries.find((e) => e.id === entryId);
  if (!entry) return;

  const row = input.closest('.set-row, .mini, .drop-row');
  if (row) row.classList.toggle('is-filled', !!input.value);

  // Myo-reps: la guía y las reps de las mini-series salen de la activación.
  if (input.dataset.myoAct != null) {
    const block = input.closest('.myo-set');
    const act = num(input.value);
    const p = myoPlan(act);
    const guide = block?.querySelector('[data-myo-guide]');
    if (guide) guide.innerHTML = myoGuide(act);
    block?.querySelectorAll('.myo-minis .mini').forEach((el, k) => {
      if (k >= MYO_MINIS) return;
      el.querySelector('span').textContent = `Mini ${k + 1}${act ? ` · ${p.reps}` : ''}`;
      el.querySelector('input').placeholder = act ? p.reps : '—';
    });
  }

  // Rest-pause: cuántas reps llevas del esquema.
  if (input.dataset.field === 'cluster') {
    const block = input.closest('.rp-set');
    const total = block?.querySelector('[data-rp-total]');
    if (total) total.textContent = setReps(entry.sets[Number(input.dataset.i)], 'restpause');
  }

  const t = sessionTotals(session);
  const set = (sel, value) => {
    const el = root.querySelector(sel);
    if (el) el.textContent = value;
  };
  set('[data-progress]', `${t.done}/${t.planned}`);
  set('[data-reps]', t.reps);
  set('[data-tonnage]', fmtNum(Math.round(t.tonnage)));
}

// ---------- Añadir ejercicio suelto ----------
function openAddExercise(sessionId) {
  const st = getState();
  openModal({
    size: 'sm',
    render: () => `
      ${modalHeader('Añadir ejercicio')}
      <div class="modal-body">
        <label class="fld">Ejercicio
          <select class="select" data-ex>${exerciseOptions(st.exercises)}</select>
        </label>
        <label class="fld">Tipo de serie
          <select class="select" data-type>
            ${Object.values(SET_TYPES).map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}
          </select>
        </label>
        <p class="hint">Se añade solo a este entreno, con la prescripción de partida de ese tipo. La rutina no se toca.</p>
      </div>
      <div class="modal-foot">
        <button class="btn" data-modal-close>Cancelar</button>
        <button class="btn btn-primary" data-ok>Añadir</button>
      </div>`,
    mount: (panel) => {
      panel.querySelector('[data-ok]').addEventListener('click', () => {
        addEntry(sessionId, panel.querySelector('[data-ex]').value, panel.querySelector('[data-type]').value);
        closeModal();
      });
    },
  });
}

// ---------- Cierre de sesión ----------
function openFinish(sessionId) {
  const session = getState().sessions[sessionId];
  const prs = sessionPRs(session);
  const t = sessionTotals(session);
  openModal({
    render: () => `
      ${modalHeader('Terminar entreno', esc(`${session.dayName} · ${dayLabel(session.date)}`))}
      <div class="modal-body">
        <div class="finish-stats">
          <span><b>${t.reps}</b><small>reps</small></span>
          <span><b>${fmtNum(t.effective, 1)}</b><small>series</small></span>
          <span><b>${fmtNum(Math.round(t.tonnage))}</b><small>kg de tonelaje</small></span>
        </div>
        ${prs.length ? `
          <div class="pr-box">
            <div class="pr-head">${icon('trophy')} ${prs.length} récord${prs.length > 1 ? 's' : ''} hoy</div>
            ${prs.map((p) => `<div class="pr-row"><span>${esc(p.name)}</span><b>${fmtNum(p.value, 1)} kg</b><small>antes ${fmtNum(p.prev, 1)}</small></div>`).join('')}
          </div>` : ''}
        <label class="lbl">¿Cómo ha ido?</label>
        <div class="feel-row">
          ${FEELS.map((f) => `<button class="feel${session.feel === f.v ? ' on' : ''}" data-feel="${f.v}"><span>${f.emoji}</span><small>${f.label}</small></button>`).join('')}
        </div>
        <label class="lbl">Nota del día</label>
        <textarea class="input textarea" rows="3" placeholder="Sensaciones, lo que ha ido bien, lo que hay que ajustar…" data-note>${esc(session.note)}</textarea>
        ${t.done < t.planned ? `<p class="hint">Quedan ${t.planned - t.done} series sin apuntar; se guardan igual.</p>` : ''}
      </div>
      <div class="modal-foot">
        <button class="btn" data-modal-close>Seguir entrenando</button>
        <button class="btn btn-primary" data-ok>${icon('check')} Cerrar entreno</button>
      </div>`,
    mount: (panel) => {
      panel.querySelectorAll('[data-feel]').forEach((b) => b.addEventListener('click', () => {
        patchSession(sessionId, { feel: Number(b.dataset.feel) });
      }));
      panel.querySelector('[data-note]').addEventListener('input', (e) => patchSession(sessionId, { note: e.target.value }, { silent: true }));
      panel.querySelector('[data-ok]').addEventListener('click', () => {
        finishSession(sessionId);
        closeModal();
        toast('¡Entreno cerrado! A comer.');
      });
    },
  });
}
