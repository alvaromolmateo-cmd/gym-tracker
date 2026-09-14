// Vista «Entreno»: arranque de la sesión y registro en vivo, ejercicio a ejercicio.
// Sin temporizadores: los descansos van por sensaciones, salvo los de las myo-reps, que se indican como texto.

import { esc, icon, fmtNum, toast, confirmDialog, openModal, closeModal, modalHeader } from '../ui.js';
import {
  getState, activeSession, startSession, setActive, patchSession, patchEntry, patchSet,
  addSet, removeSet, addEntry, removeEntry, moveEntry, finishSession, deleteSession,
  exerciseById, historyOf, allSessions,
} from '../store.js';
import { todayKey, dayLabel } from '../dates.js';
import { myoPlan, MYO_MINIS, MYO_BLOCKS } from '../catalog.js';
import { fmtSet, fmtWeight, num, hasData, parseReps, entryTotals } from '../sets.js';
import { suggest, dropWeights } from '../progression.js';
import { sessionTotals, nextDay, dayVolume, sessionPRs, loadOf, weekNumber, mondayOf } from '../metrics.js';
import {
  muscleChip, typeChip, planText, planDetails, myoGuide, sessionSummary,
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
              <span class="preview-name">${esc(ex.name)}</span>
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
  const st = getState();
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
        <span><b data-since="${esc(session.startedAt)}">0 min</b><small>en marcha</small></span>
        <span><b data-progress>${t.done}/${t.planned}</b><small>series</small></span>
        <span><b>${fmtNum(Math.round(t.tonnage))}</b><small>kg</small></span>
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

  const state = t.sets === 0 ? '' : t.sets >= entry.sets.length ? ' is-done' : ' is-partial';

  return `
    <section class="entry${state}${open ? ' is-open' : ''}" data-entry="${esc(entry.id)}">
      <button class="entry-head" data-toggle-entry="${esc(entry.id)}">
        <span class="entry-num">${index + 1}</span>
        <span class="entry-titles">
          <span class="entry-name">${esc(ex.name)}</span>
          <span class="entry-sub">${muscleChip(ex.muscle)}${typeChip(entry.type)}${entry.type === 'myo' ? '' : `<span class="plan-text">${esc(planText(entry.plan))}</span>`}</span>
        </span>
        <span class="entry-state">${t.sets ? `${fmtNum(Math.round(t.tonnage))} kg` : ''}${t.sets >= entry.sets.length ? icon('check-circle') : ''}</span>
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

          ${renderSets(entry, ex)}

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
function renderSets(entry, ex) {
  switch (entry.type) {
    case 'myo': return renderMyo(entry, ex);
    case 'restpause': return renderRestPause(entry, ex);
    case 'dropset': return renderDrop(entry, ex);
    default: return renderNormal(entry, ex);
  }
}

const wInput = (entry, i, set, ex, extra = '') => `
  <input class="cell-input" type="number" inputmode="decimal" step="0.5" min="0" placeholder="${ex.bw ? 'BW' : 'kg'}"
    value="${set.w ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="w" ${extra}>`;

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
  const set = entry.sets[0] || {};
  const act = num(set.r);
  const p = myoPlan(act);
  const minis = set.minis && set.minis.length ? set.minis : Array.from({ length: MYO_BLOCKS }, () => null);
  return `
    <div class="sets sets-myo">
      <div class="myo-act">
        <label>Peso ${wInput(entry, 0, set, ex)}</label>
        <label>Activación (al fallo)
          <input class="cell-input" type="number" inputmode="numeric" step="1" min="0" placeholder="reps"
            value="${set.r ?? ''}" data-set="${esc(entry.id)}" data-i="0" data-field="r" data-myo-act>
        </label>
      </div>
      <div data-myo-guide>${myoGuide(act)}</div>
      <div class="myo-minis">
        ${minis.map((v, k) => {
          const fail = k >= MYO_MINIS;
          return `
          <label class="mini${fail ? ' mini-fail' : ''}">
            <span>${fail ? 'Final · al fallo' : `Mini ${k + 1}${act ? ` · ${p.reps}` : ''}`}</span>
            <input class="cell-input" type="number" inputmode="numeric" step="1" min="0" placeholder="${fail ? 'fallo' : (act ? p.reps : '—')}"
              value="${v ?? ''}" data-set="${esc(entry.id)}" data-i="0" data-field="mini" data-k="${k}">
            <button class="set-ok sm" data-ok="${esc(entry.id)}" data-i="0" aria-label="Tramo hecho">${icon('check')}</button>
          </label>`;
        }).join('')}
      </div>
    </div>`;
}

function renderRestPause(entry, ex) {
  const set = entry.sets[0] || {};
  const scheme = entry.plan.scheme || [];
  const clusters = set.clusters || scheme.map(() => null);
  return `
    <div class="sets sets-rp">
      <div class="rp-top">
        <label>Peso ${wInput(entry, 0, set, ex)}</label>
        <span class="muted">${scheme.join('×')} · ${entry.plan.clusterRest || 15}" entre tandas</span>
      </div>
      <div class="rp-boxes">
        ${clusters.map((v, k) => `
          <label class="mini">
            <span>${k + 1}.ª · ${scheme[k] ?? '—'}</span>
            <input class="cell-input" type="number" inputmode="numeric" step="1" min="0" placeholder="${scheme[k] ?? ''}"
              value="${v ?? ''}" data-set="${esc(entry.id)}" data-i="0" data-field="cluster" data-k="${k}">
            <button class="set-ok sm" data-ok="${esc(entry.id)}" data-i="0" aria-label="Tanda hecha">${icon('check')}</button>
          </label>`).join('')}
      </div>
    </div>`;
}

function renderDrop(entry, ex) {
  const scheme = [...(entry.plan.dropScheme || [])];
  if (entry.plan.dropFail) scheme.push('fallo');
  return `
    <div class="sets sets-drop">
      ${entry.sets.map((set, i) => {
        const drops = set.drops && set.drops.length ? set.drops : scheme.map(() => ({ w: null, r: null }));
        const sugg = dropWeights(drops[0]?.w, ex, scheme.length, entry.plan.dropPct || 15);
        return `
          <div class="drop-set">
            <div class="drop-head"><b>Serie ${i + 1}</b><span class="muted">${scheme.join('×')}</span></div>
            <div class="drop-rows">
              ${scheme.map((target, k) => `
                <div class="drop-row">
                  <span class="drop-num">${k + 1}</span>
                  <input class="cell-input" type="number" inputmode="decimal" step="0.5" min="0" placeholder="${sugg[k] ?? ''}"
                    value="${drops[k]?.w ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="dropw" data-k="${k}">
                  <input class="cell-input" type="number" inputmode="numeric" step="1" min="0" placeholder="${esc(String(target))}"
                    value="${drops[k]?.r ?? ''}" data-set="${esc(entry.id)}" data-i="${i}" data-field="dropr" data-k="${k}">
                </div>`).join('')}
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
          const scheme = [...(entry.plan.dropScheme || []), ...(entry.plan.dropFail ? ['fallo'] : [])];
          const drops = (set.drops && set.drops.length ? set.drops : scheme.map(() => ({ w: null, r: null }))).map((d) => ({ ...d }));
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
  root.querySelectorAll('[data-use-tip]').forEach((b) => b.addEventListener('click', () => {
    const entry = session.entries.find((e) => e.id === b.dataset.useTip);
    const w = Number(b.dataset.w);
    entry.sets.forEach((set, i) => {
      if (entry.type === 'dropset') {
        const drops = (set.drops || []).map((d) => ({ ...d }));
        if (drops[0] && drops[0].w == null) drops[0].w = w;
        patchSet(session.id, entry.id, i, { drops }, { silent: true });
      } else if (set.w == null) {
        patchSet(session.id, entry.id, i, { w }, { silent: true });
      }
    });
    patchSession(session.id, {});
    toast(`Cargado ${fmtNum(w, 1)} kg`);
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

  if (input.dataset.myoAct != null) {
    const guide = root.querySelector(`[data-entry="${CSS.escape(entryId)}"] [data-myo-guide]`);
    if (guide) guide.innerHTML = myoGuide(num(input.value));
    const p = myoPlan(num(input.value));
    root.querySelectorAll(`[data-entry="${CSS.escape(entryId)}"] .myo-minis .mini`).forEach((el, k) => {
      if (k >= MYO_MINIS) return;
      el.querySelector('span').textContent = `Mini ${k + 1}${input.value ? ` · ${p.reps}` : ''}`;
      el.querySelector('input').placeholder = input.value ? p.reps : '—';
    });
  }

  const t = sessionTotals(session);
  const badge = root.querySelector('[data-progress]');
  if (badge) badge.textContent = `${t.done}/${t.planned}`;
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
            <option value="normal">Series normales</option>
            <option value="myo">Myo-reps</option>
            <option value="restpause">Rest-pause</option>
            <option value="dropset">Drop set</option>
          </select>
        </label>
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
        ${sessionSummary(session)}
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
