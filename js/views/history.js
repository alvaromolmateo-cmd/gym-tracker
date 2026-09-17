// Vista «Historial»: la libreta. Una semana por pantalla, con sus días, lo levantado y las notas.

import { esc, icon, fmtNum, toast, confirmDialog, openModal, closeModal, modalHeader } from '../ui.js';
import { getState, allSessions, reopenSession, deleteSession, patchSession, sessionById } from '../store.js';
import { addDays, dayLabel, todayKey } from '../dates.js';
import { mondayOf, weekNumber, weekLabel, weekStats, sessionTotals, sessionPRs, hasLog } from '../metrics.js';
import { sessionSummary, entryLines, feelEmoji, FEELS, emptyState, volumeBars } from './shared.js';

export function render(ctx) {
  const st = getState();
  const monday = ctx.week || mondayOf(todayKey());
  const end = addDays(monday, 6);
  const week = weekStats(monday);
  const sessions = allSessions().filter((s) => s.date >= monday && s.date <= end);
  const n = weekNumber(monday, st.routine.startDate);
  const records = sessions.reduce((a, s) => a + sessionPRs(s).length, 0);

  return `
    <div class="page-head page-head-compact">
      <div class="month-nav">
        <button class="icon-btn" data-week="-1" aria-label="Semana anterior">${icon('chevron-left')}</button>
        <h1 class="month-title">Semana ${n} <small>${esc(weekLabel(monday))}</small></h1>
        <button class="icon-btn" data-week="1" aria-label="Semana siguiente">${icon('chevron-right')}</button>
      </div>
      <div class="page-actions">
        <button class="btn sm" data-week="today">Esta semana</button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat"><div class="stat-label">Entrenos</div><div class="stat-value">${week.sessions}<small>/${st.routine.days.length}</small></div></div>
      <div class="stat"><div class="stat-label">Tonelaje</div><div class="stat-value">${fmtNum(Math.round(week.tonnage))}<small> kg</small></div></div>
      <div class="stat"><div class="stat-label">Series efectivas</div><div class="stat-value">${fmtNum(week.effective, 1)}</div></div>
      <div class="stat"><div class="stat-label">Reps</div><div class="stat-value">${week.reps}</div></div>
      <div class="stat"><div class="stat-label">Récords</div><div class="stat-value">${records || '—'}</div></div>
      <div class="stat"><div class="stat-label">RIR medio</div><div class="stat-value">${week.avgRir == null ? '—' : fmtNum(week.avgRir, 1)}</div></div>
    </div>

    ${week.sessions ? `
      <div class="card">
        <h2>${icon('layers')} Volumen por grupo muscular</h2>
        <p class="muted">Series efectivas de la semana frente al rango de referencia de la literatura (12-20 para los grupos grandes).</p>
        ${volumeBars(week.byMuscle)}
      </div>` : ''}

    ${sessions.length
      ? sessions.map((s) => sessionCard(s)).join('')
      : emptyState('Ningún entreno registrado esta semana.', '<a class="btn btn-primary" href="#/entreno">Entrenar ahora</a>')}
  `;
}

function sessionCard(session) {
  const prs = sessionPRs(session);
  return `
    <div class="card session-card" data-session="${esc(session.id)}">
      <div class="card-head">
        <h2>${esc(session.dayName)} <span class="muted">· ${esc(session.focus)}</span></h2>
        <div class="page-actions">
          ${session.feel ? `<span class="badge">${feelEmoji(session.feel)}</span>` : ''}
          ${!session.endedAt ? '<span class="badge badge-open">Sin cerrar</span>' : ''}
          <button class="btn sm" data-edit="${esc(session.id)}">${icon('edit')} Retomar</button>
          <button class="icon-btn sm" data-detail="${esc(session.id)}" aria-label="Detalle">${icon('info')}</button>
          <button class="icon-btn sm danger" data-del="${esc(session.id)}" aria-label="Borrar">${icon('trash')}</button>
        </div>
      </div>
      <p class="muted session-date">${esc(dayLabel(session.date))}</p>
      ${sessionSummary(session)}
      ${prs.length ? `<div class="pr-inline">${icon('trophy')} ${prs.map((p) => `<span>${esc(p.name)} <b>${fmtNum(p.value, 1)} kg</b></span>`).join('')}</div>` : ''}
      <div class="log">${entryLines(session) || '<p class="muted">Sin series apuntadas.</p>'}</div>
      ${session.note ? `<p class="day-note">${icon('quote')} ${esc(session.note)}</p>` : ''}
    </div>`;
}

export function mount(root, ctx) {
  root.querySelectorAll('[data-week]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.week;
    ctx.set('week', v === 'today' ? mondayOf(todayKey()) : addDays(ctx.week || mondayOf(todayKey()), Number(v) * 7));
  }));

  root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
    reopenSession(b.dataset.edit);
    location.hash = '#/entreno';
  }));

  root.querySelectorAll('[data-detail]').forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.detail)));

  root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const s = sessionById(b.dataset.del);
    const ok = await confirmDialog({
      title: 'Borrar entreno',
      message: `Se borra <b>${esc(s.dayName)}</b> del ${esc(dayLabel(s.date))} y todo lo apuntado.`,
    });
    if (ok) {
      deleteSession(b.dataset.del);
      toast('Entreno borrado');
    }
  }));
}

function openDetail(id) {
  const s = sessionById(id);
  if (!s) return;
  const t = sessionTotals(s);
  openModal({
    render: () => `
      ${modalHeader(esc(s.dayName), esc(dayLabel(s.date)))}
      <div class="modal-body">
        <label class="fld">Fecha
          <input class="input" type="date" value="${esc(s.date)}" data-date>
        </label>
        ${sessionSummary(s)}
        <div class="detail-grid">
          <div><span class="muted">Series apuntadas</span><b>${t.done} de ${t.planned}</b></div>
          <div><span class="muted">Series efectivas</span><b>${fmtNum(t.effective, 1)}</b></div>
          <div><span class="muted">Reps</span><b>${t.reps}</b></div>
          <div><span class="muted">RIR medio</span><b>${t.avgRir == null ? '—' : fmtNum(t.avgRir, 1)}</b></div>
        </div>
        <label class="lbl">Sensación</label>
        <div class="feel-row">
          ${FEELS.map((f) => `<button class="feel${s.feel === f.v ? ' on' : ''}" data-feel="${f.v}"><span>${f.emoji}</span><small>${f.label}</small></button>`).join('')}
        </div>
        <label class="lbl">Nota del día</label>
        <textarea class="input textarea" rows="3" data-note>${esc(s.note)}</textarea>
        <h3 class="sub-h">${icon('list')} Registro</h3>
        <div class="log">${entryLines(s) || '<p class="muted">Sin series apuntadas.</p>'}</div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-modal-close>Cerrar</button>
        <button class="btn btn-primary" data-edit>${icon('edit')} Retomar</button>
      </div>`,
    mount: (panel) => {
      panel.querySelector('[data-date]').addEventListener('change', (e) => patchSession(id, { date: e.target.value }));
      panel.querySelector('[data-note]').addEventListener('input', (e) => patchSession(id, { note: e.target.value }, { silent: true }));
      panel.querySelectorAll('[data-feel]').forEach((b) => b.addEventListener('click', () => patchSession(id, { feel: Number(b.dataset.feel) })));
      panel.querySelector('[data-edit]').addEventListener('click', () => {
        reopenSession(id);
        closeModal();
        location.hash = '#/entreno';
      });
    },
  });
}
