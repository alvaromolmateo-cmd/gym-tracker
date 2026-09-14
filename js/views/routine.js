// Vista «Rutina»: la planificación actual, editable día a día.

import { esc, icon, fmtNum, toast, confirmDialog, openModal, closeModal, modalHeader } from '../ui.js';
import {
  getState, exerciseById, patchRoutine, addDay, patchDay, removeDay, moveDay,
  addItem, patchItem, removeItem, moveItem,
} from '../store.js';
import { MUSCLES, profileOf, SET_TYPES, descOf } from '../catalog.js';
import { dayVolume } from '../metrics.js';
import { profileSummary } from '../progression.js';
import { muscleChip, typeChip, planText, planDetails, exerciseOptions, volumeBars } from './shared.js';

export function render() {
  const st = getState();
  const weekly = {};
  for (const d of st.routine.days) {
    const v = dayVolume(d);
    for (const [m, n] of Object.entries(v.byMuscle)) weekly[m] = (weekly[m] || 0) + n;
  }

  return `
    <div class="page-head">
      <div>
        <h1>Rutina</h1>
        <p class="muted">Lo que te ha puesto el entrenador. Lo que cambies aquí sale en el próximo entreno.</p>
      </div>
      <div class="page-actions">
        <button class="btn" data-add-day>${icon('plus')} Día</button>
      </div>
    </div>

    <div class="card">
      <div class="form-row">
        <label class="fld grow">Nombre de la planificación
          <input class="input" type="text" value="${esc(st.routine.name)}" data-routine-name>
        </label>
        <label class="fld fld-date">Semana 1 empezó el
          <input class="input" type="date" value="${esc(st.routine.startDate)}" data-routine-start>
        </label>
      </div>
      <h3 class="sub-h">${icon('layers')} Volumen semanal planificado</h3>
      <p class="muted">Series por grupo muscular si completas los ${st.routine.days.length} días. Las técnicas troceadas (myo-reps, rest-pause, drop sets) cuentan la serie inicial entera y cada tramo extra como media.</p>
      ${volumeBars(weekly)}
    </div>

    ${st.routine.days.map((day, i) => renderDay(day, i, st.routine.days.length)).join('')}
  `;
}

function renderDay(day, index, total) {
  const vol = dayVolume(day);
  return `
    <div class="card day-card" data-day="${esc(day.id)}">
      <div class="card-head">
        <div class="day-titles">
          <input class="day-name" type="text" value="${esc(day.name)}" data-day-name="${esc(day.id)}" aria-label="Nombre del día">
          <input class="day-focus" type="text" value="${esc(day.focus)}" placeholder="Énfasis" data-day-focus="${esc(day.id)}" aria-label="Énfasis del día">
        </div>
        <div class="page-actions">
          <span class="badge">${fmtNum(vol.sets, 1)} series</span>
          <button class="icon-btn sm" data-move-day="${esc(day.id)}" data-dir="-1" ${index === 0 ? 'disabled' : ''} aria-label="Subir">${icon('arrow-up')}</button>
          <button class="icon-btn sm" data-move-day="${esc(day.id)}" data-dir="1" ${index === total - 1 ? 'disabled' : ''} aria-label="Bajar">${icon('arrow-down')}</button>
          <button class="icon-btn sm danger" data-del-day="${esc(day.id)}" aria-label="Borrar día">${icon('trash')}</button>
        </div>
      </div>

      <ol class="item-list">
        ${day.items.map((item, i) => {
          const ex = exerciseById(item.exerciseId);
          return `
            <li class="item-row">
              <span class="item-num">${i + 1}</span>
              <div class="item-main">
                <div class="item-name">${esc(ex.name)} ${muscleChip(ex.muscle)} ${typeChip(item.type)}</div>
                ${item.type === 'myo' ? '' : `<div class="item-plan">${esc(planText(item))}</div>`}
                ${planDetails(item)}
              </div>
              <div class="item-actions">
                <button class="icon-btn sm" data-edit-item="${esc(item.id)}" data-day="${esc(day.id)}" aria-label="Editar">${icon('edit')}</button>
                <button class="icon-btn sm" data-move-item="${esc(item.id)}" data-day="${esc(day.id)}" data-dir="-1" aria-label="Subir">${icon('arrow-up')}</button>
                <button class="icon-btn sm" data-move-item="${esc(item.id)}" data-day="${esc(day.id)}" data-dir="1" aria-label="Bajar">${icon('arrow-down')}</button>
                <button class="icon-btn sm danger" data-del-item="${esc(item.id)}" data-day="${esc(day.id)}" aria-label="Quitar">${icon('trash')}</button>
              </div>
            </li>`;
        }).join('') || '<li class="muted">Este día está vacío.</li>'}
      </ol>

      <button class="btn sm" data-add-item="${esc(day.id)}">${icon('plus')} Ejercicio</button>
    </div>`;
}

export function mount(root) {
  root.querySelector('[data-routine-name]')?.addEventListener('input', (e) => patchRoutine({ name: e.target.value }, { silent: true }));
  root.querySelector('[data-routine-start]')?.addEventListener('change', (e) => patchRoutine({ startDate: e.target.value }));
  root.querySelector('[data-add-day]')?.addEventListener('click', () => addDay());

  root.querySelectorAll('[data-day-name]').forEach((i) => i.addEventListener('input', (e) => patchDay(i.dataset.dayName, { name: e.target.value }, { silent: true })));
  root.querySelectorAll('[data-day-focus]').forEach((i) => i.addEventListener('input', (e) => patchDay(i.dataset.dayFocus, { focus: e.target.value }, { silent: true })));
  root.querySelectorAll('[data-move-day]').forEach((b) => b.addEventListener('click', () => moveDay(b.dataset.moveDay, Number(b.dataset.dir))));
  root.querySelectorAll('[data-del-day]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Borrar día', message: 'Se borra el día de la rutina. Los entrenos ya registrados no se tocan.' });
    if (ok) removeDay(b.dataset.delDay);
  }));

  root.querySelectorAll('[data-move-item]').forEach((b) => b.addEventListener('click', () => moveItem(b.dataset.day, b.dataset.moveItem, Number(b.dataset.dir))));
  root.querySelectorAll('[data-del-item]').forEach((b) => b.addEventListener('click', () => removeItem(b.dataset.day, b.dataset.delItem)));
  root.querySelectorAll('[data-edit-item]').forEach((b) => b.addEventListener('click', () => openItem(b.dataset.day, b.dataset.editItem)));
  root.querySelectorAll('[data-add-item]').forEach((b) => b.addEventListener('click', () => openNewItem(b.dataset.addItem)));
}

// ---------- Alta de ejercicio en un día ----------
function openNewItem(dayId) {
  const st = getState();
  openModal({
    size: 'sm',
    render: () => `
      ${modalHeader('Añadir ejercicio a la rutina')}
      <div class="modal-body">
        <label class="fld">Ejercicio
          <select class="select" data-ex>${exerciseOptions(st.exercises)}</select>
        </label>
        <label class="fld">Tipo de serie
          <select class="select" data-type>
            ${Object.values(SET_TYPES).map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}
          </select>
        </label>
        <p class="hint">Luego puedes afinar series, reps, RIR y tempo desde el lápiz.</p>
      </div>
      <div class="modal-foot">
        <button class="btn" data-modal-close>Cancelar</button>
        <button class="btn btn-primary" data-ok>Añadir</button>
      </div>`,
    mount: (panel) => {
      panel.querySelector('[data-ok]').addEventListener('click', () => {
        addItem(dayId, panel.querySelector('[data-ex]').value, panel.querySelector('[data-type]').value);
        closeModal();
      });
    },
  });
}

// ---------- Edición de la prescripción ----------
const parseList = (text) => String(text || '').split(/[x×,\s]+/).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);

function openItem(dayId, itemId) {
  const draw = () => {
    const st = getState();
    const day = st.routine.days.find((d) => d.id === dayId);
    const item = day?.items.find((i) => i.id === itemId);
    if (!item) return '';
    const ex = exerciseById(item.exerciseId);

    const typeFields = {
      normal: `
        <div class="form-row">
          <label class="fld">Series <input class="input" type="number" min="1" max="10" value="${item.sets ?? 3}" data-f="sets"></label>
          <label class="fld">Reps mín. <input class="input" type="number" min="1" value="${item.repsMin ?? 8}" data-f="repsMin"></label>
          <label class="fld">Reps máx. <input class="input" type="number" min="1" value="${item.repsMax ?? 10}" data-f="repsMax"></label>
        </div>
        <div class="form-row">
          <label class="fld grow">Reps (texto libre) <input class="input" type="text" placeholder="p. ej. 7+6" value="${esc(item.repsText || '')}" data-f="repsText"></label>
          <label class="fld">RIR <input class="input" type="text" value="${esc(item.rir || '')}" data-f="rir"></label>
          <label class="fld">RIR máx. <input class="input" type="number" min="0" max="5" value="${item.rirMax ?? 1}" data-f="rirMax"></label>
        </div>
`,
      myo: `<p class="muted">Las reps de las mini-series salen de la tabla según la serie de activación.</p>`,
      restpause: `
        <div class="form-row">
          <label class="fld grow">Esquema de reps <input class="input" type="text" value="${esc((item.scheme || []).join('×'))}" data-f="scheme"></label>
          <label class="fld">Descanso entre tandas (s) <input class="input" type="number" min="5" max="60" value="${item.clusterRest ?? 15}" data-f="clusterRest"></label>
        </div>`,
      dropset: `
        <div class="form-row">
          <label class="fld grow">Escalones de reps <input class="input" type="text" value="${esc((item.dropScheme || []).join('×'))}" data-f="dropScheme"></label>
          <label class="fld">Series <input class="input" type="number" min="1" max="5" value="${item.sets ?? 2}" data-f="sets"></label>
        </div>
        <div class="form-row">
          <label class="fld">Bajada de peso (%) <input class="input" type="number" min="5" max="40" value="${item.dropPct ?? 15}" data-f="dropPct"></label>
          <label class="fld">Último al fallo
            <select class="select" data-f="dropFail"><option value="1"${item.dropFail ? ' selected' : ''}>Sí</option><option value="0"${!item.dropFail ? ' selected' : ''}>No</option></select>
          </label>
        </div>`,
    };

    return `
      ${modalHeader(esc(ex.name), esc(`${muscleLabel(ex.muscle)} · ${profileSummary(ex)}`))}
      <div class="modal-body">
        <label class="fld">Tipo de serie
          <select class="select" data-f="type">
            ${Object.values(SET_TYPES).map((t) => `<option value="${t.id}"${item.type === t.id ? ' selected' : ''}>${esc(t.label)}</option>`).join('')}
          </select>
        </label>
        ${typeFields[item.type] ?? typeFields.normal}
        <label class="fld">Descripción del ejercicio
          <textarea class="input textarea" rows="3" placeholder="Cómo se hace, qué buscar…" data-f="desc">${esc(descOf(item))}</textarea>
        </label>
        <p class="hint">Este texto es el que ves en la rutina y durante el entreno.</p>
        <label class="fld">Tempo
          <input class="input" type="text" placeholder='3" de bajada + 1" isométrico' value="${esc(item.tempo || '')}" data-f="tempo">
        </label>
        <label class="fld">Nota del entrenador
          <input class="input" type="text" value="${esc(item.note || '')}" data-f="note">
        </label>
      </div>
      <div class="modal-foot">
        <button class="btn btn-danger-ghost" data-remove>${icon('trash')} Quitar del día</button>
        <button class="btn btn-primary" data-modal-close>Hecho</button>
      </div>`;
  };

  openModal({
    render: draw,
    // Lo tecleado se guarda en silencio para no perder el foco: al cerrar se repinta la rutina.
    onClose: () => patchItem(dayId, itemId, {}),
    mount: (panel) => {
      panel.querySelectorAll('[data-f]').forEach((input) => {
        const field = input.dataset.f;
        const commit = (rerender) => {
          const v = input.value;
          const patch = {};
          if (field === 'type') {
            // Al cambiar de tipo hay que dejar puestos los campos que ese tipo necesita
            // y soltar la descripción del anterior para que vuelva la suya.
            patch.type = v;
            patch.desc = null;
            const item = getState().routine.days.find((d) => d.id === dayId).items.find((i) => i.id === itemId);
            if (v === 'restpause' && !item.scheme?.length) Object.assign(patch, { scheme: [10, 10, 10], clusterRest: 20, sets: 1 });
            if (v === 'dropset' && !item.dropScheme?.length) Object.assign(patch, { dropScheme: [6, 8], dropPct: 20, dropFail: true, sets: 2 });
            if (v === 'myo') patch.sets = 1;
            if (v === 'normal' && !item.repsMin) Object.assign(patch, { sets: 3, repsMin: 8, repsMax: 10, rir: '0-1', rirMax: 1 });
          } else if (field === 'scheme') patch.scheme = parseList(v);
          else if (field === 'dropScheme') patch.dropScheme = parseList(v);
          else if (field === 'dropFail') patch.dropFail = v === '1';
          else if (['sets', 'repsMin', 'repsMax', 'rirMax', 'clusterRest', 'dropPct'].includes(field)) {
            patch[field] = v === '' ? null : Number(v);
          } else patch[field] = v;
          patchItem(dayId, itemId, patch, { silent: !rerender });
        };
        const rerender = input.tagName === 'SELECT' || field === 'type';
        input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => commit(rerender));
      });
      panel.querySelector('[data-remove]').addEventListener('click', () => {
        removeItem(dayId, itemId);
        closeModal();
        toast('Ejercicio quitado');
      });
    },
  });
}

const muscleLabel = (id) => MUSCLES.find((m) => m.id === id)?.name || 'Otro';
