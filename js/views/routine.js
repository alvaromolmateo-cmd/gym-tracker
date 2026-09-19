// Vista «Rutina»: la planificación actual, editable día a día.
// Cada ejercicio se lee en fichas (series / reps / RIR o lo que pida su técnica) y se edita
// desde una ficha única con los campos propios de cada tipo de serie.

import { esc, icon, fmtNum, toast, confirmDialog, openModal, closeModal, modalHeader } from '../ui.js';
import {
  getState, exerciseById, patchRoutine, addDay, patchDay, removeDay, moveDay,
  addItem, patchItem, removeItem, moveItem,
} from '../store.js';
import { MUSCLES, SET_TYPES, descOf, defaultPlan } from '../catalog.js';
import { dayVolume } from '../metrics.js';
import { profileSummary } from '../progression.js';
import { muscleChip, typeChip, planDetails, specRow, exerciseOptions, volumeBars } from './shared.js';

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
        <p class="muted">Tu planificación. Lo que cambies aquí sale en el próximo entreno.</p>
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
  const top = Object.entries(vol.byMuscle).sort((a, b) => b[1] - a[1]).slice(0, 4);
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

      ${top.length ? `<div class="day-meta">${icon('layers')} ${day.items.length} ejercicios ${top.map(([m]) => muscleChip(m)).join('')}</div>` : ''}

      <ol class="item-list">
        ${day.items.map((item, i) => {
          const ex = exerciseById(item.exerciseId);
          return `
            <li class="item-row">
              <span class="item-num">${i + 1}</span>
              <button class="item-main" data-edit-item="${esc(item.id)}" data-day="${esc(day.id)}">
                <span class="item-name">${esc(ex.name)}${typeChip(item.type)}</span>
                ${specRow(item, muscleChip(ex.muscle))}
                ${planDetails(item)}
              </button>
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
  let type = 'normal';
  openModal({
    size: 'sm',
    render: () => `
      ${modalHeader('Añadir ejercicio a la rutina')}
      <div class="modal-body">
        <label class="fld">Ejercicio
          <select class="select" data-ex>${exerciseOptions(st.exercises)}</select>
        </label>
        <label class="lbl">Tipo de serie</label>
        ${typePicker(type)}
        <p class="hint" data-type-hint>${esc(SET_TYPES[type].hint)}</p>
      </div>
      <div class="modal-foot">
        <button class="btn" data-modal-close>Cancelar</button>
        <button class="btn btn-primary" data-ok>Añadir</button>
      </div>`,
    mount: (panel) => {
      panel.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
        type = b.dataset.type;
        panel.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('on', x.dataset.type === type));
        panel.querySelector('[data-type-hint]').textContent = SET_TYPES[type].hint;
      }));
      panel.querySelector('[data-ok]').addEventListener('click', () => {
        const id = addItem(dayId, panel.querySelector('[data-ex]').value, type);
        closeModal();
        if (id) openItem(dayId, id);
      });
    },
  });
}

// ---------- Edición de la prescripción ----------
// Acepta 10+10+10, 6→8, 6x8, «6 8» o 6,8: todo se convierte en la misma lista de números.
const parseList = (text) => String(text || '').split(/[x×,+\s→-]+/).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);

const typePicker = (current) => `
  <div class="seg seg-wrap type-seg">
    ${Object.values(SET_TYPES).map((t) => `
      <button class="seg-btn${current === t.id ? ' on' : ''}" data-type="${t.id}">${icon(t.icon)} ${esc(t.short)}</button>`).join('')}
  </div>`;

// Lo que verá en el entreno, para comprobar de un vistazo que la prescripción es la que toca.
const previewHtml = (item, ex) => `
  <div class="preview-head">${icon('play')} Así lo verás en el entreno</div>
  <div class="preview-entry">
    <span class="entry-name">${esc(ex.name)}</span>${typeChip(item.type)}
  </div>
  ${specRow(item, muscleChip(ex.muscle))}
  ${planDetails(item)}`;

function openItem(dayId, itemId) {
  const find = () => {
    const day = getState().routine.days.find((d) => d.id === dayId);
    return day?.items.find((i) => i.id === itemId);
  };

  const draw = () => {
    const item = find();
    if (!item) return '';
    const ex = exerciseById(item.exerciseId);

    const typeFields = {
      normal: `
        <div class="form-row">
          <label class="fld">Reps mín. <input class="input" type="number" min="1" value="${item.repsMin ?? 8}" data-f="repsMin"></label>
          <label class="fld">Reps máx. <input class="input" type="number" min="1" value="${item.repsMax ?? 10}" data-f="repsMax"></label>
          <label class="fld">RIR <input class="input" type="text" placeholder="0-1" value="${esc(item.rir || '')}" data-f="rir"></label>
        </div>
        <label class="fld">Reps encadenadas en texto libre
          <input class="input" type="text" placeholder="p. ej. 7+6" value="${esc(item.repsText || '')}" data-f="repsText">
        </label>
        <p class="hint">Para series seguidas dentro de la misma serie: «7+6» son 7 reps lentas y 6 normales sin soltar el peso. Si lo rellenas, manda sobre el rango.</p>
        <label class="fld">RIR máximo que cuenta como objetivo cumplido
          <input class="input" type="number" min="0" max="5" value="${item.rirMax ?? 1}" data-f="rirMax">
        </label>
        <p class="hint">Lo usa la sobrecarga progresiva: si llegas al tope de reps con este RIR o menos, toca subir peso.</p>`,
      myo: `
        <p class="hint">Secuencia fija del entrenador: activación al fallo → 40" → mini-serie de la tabla → 20" → mini-serie → 20" → última al fallo. Las reps de las mini-series salen de la tabla según la activación, no hay nada que rellenar aquí.</p>`,
      restpause: `
        <label class="fld">Esquema de reps
          <input class="input" type="text" value="${esc((item.scheme || []).join(' + '))}" data-f="scheme">
        </label>
        <p class="hint">Reps de cada tanda dentro de la misma serie, separadas por «+», por ejemplo 8 + 5 + 5 + 3 + 3 + 3 + 3.</p>
        <label class="fld">Descanso entre tandas en segundos
          <input class="input" type="number" min="5" max="60" value="${item.clusterRest ?? 15}" data-f="clusterRest">
        </label>`,
      dropset: `
        <label class="fld">Escalones de reps
          <input class="input" type="text" value="${esc((item.dropScheme || []).join(' → '))}" data-f="dropScheme">
        </label>
        <p class="hint">Reps objetivo en cada bajada de peso, de más pesado a más ligero, por ejemplo 6 → 8. Son escalones de la misma serie, no series distintas.</p>
        <div class="form-row">
          <label class="fld">Bajada de peso en %
            <input class="input" type="number" min="5" max="40" value="${item.dropPct ?? 15}" data-f="dropPct">
          </label>
          <div class="fld">Último escalón al fallo
            <span class="seg">
              <button class="seg-btn${item.dropFail ? ' on' : ''}" data-fail="1">Sí</button>
              <button class="seg-btn${!item.dropFail ? ' on' : ''}" data-fail="0">No</button>
            </span>
          </div>
        </div>
        <p class="hint">Con «Sí» se añade un escalón extra sin objetivo de reps: bajas el peso una vez más y aguantas hasta el fallo.</p>`,
    };

    return `
      ${modalHeader(esc(ex.name), esc(`${muscleLabel(ex.muscle)} · ${profileSummary(ex)}`))}
      <div class="modal-body">
        <div class="preview-box" data-preview>${previewHtml(item, ex)}</div>

        <label class="lbl">Tipo de serie</label>
        ${typePicker(item.type)}
        <p class="hint">${esc(SET_TYPES[item.type]?.hint || '')}</p>

        <label class="fld fld-sets">Series
          <input class="input" type="number" min="1" max="10" value="${item.sets ?? 1}" data-f="sets">
        </label>

        ${typeFields[item.type] ?? typeFields.normal}

        <h3 class="sub-h">${icon('quote')} Anotaciones opcionales</h3>
        <label class="fld">Tempo
          <input class="input" type="text" placeholder='3" de bajada + 1" isométrico' value="${esc(item.tempo || '')}" data-f="tempo">
        </label>
        <label class="fld">Nota del entrenador
          <input class="input" type="text" placeholder="Series descendentes, codos apoyados…" value="${esc(item.note || '')}" data-f="note">
        </label>
        <label class="fld">Descripción del ejercicio
          <textarea class="input textarea" rows="2" placeholder="Cómo se hace, qué buscar…" data-f="desc">${esc(descOf(item))}</textarea>
        </label>
        <p class="hint">Lo que escribas aquí sale en la rutina y durante el entreno. Si lo dejas vacío, no aparece nada.</p>
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
      if (!find()) return;
      const ex = () => exerciseById(find()?.exerciseId);
      // Con los campos de texto no se repinta la ficha (se perdería el foco): se refresca la vista previa a mano.
      const refreshPreview = () => {
        const box = panel.querySelector('[data-preview]');
        const item = find();
        if (box && item) box.innerHTML = previewHtml(item, ex());
      };

      panel.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
        const v = b.dataset.type;
        const item = find();
        if (!item || item.type === v) return;
        // Al cambiar de técnica se ponen sus campos propios y se suelta la descripción de la anterior.
        const patch = { ...defaultPlan(v), desc: null };
        if (v === 'restpause' && item.scheme?.length) delete patch.scheme;
        if (v === 'dropset' && item.dropScheme?.length) delete patch.dropScheme;
        patchItem(dayId, itemId, patch);
      }));

      panel.querySelectorAll('[data-fail]').forEach((b) => b.addEventListener('click', () => {
        patchItem(dayId, itemId, { dropFail: b.dataset.fail === '1' });
      }));

      panel.querySelectorAll('[data-f]').forEach((input) => {
        const field = input.dataset.f;
        input.addEventListener('input', () => {
          const v = input.value;
          const patch = {};
          if (field === 'scheme') patch.scheme = parseList(v);
          else if (field === 'dropScheme') patch.dropScheme = parseList(v);
          else if (['sets', 'repsMin', 'repsMax', 'rirMax', 'clusterRest', 'dropPct'].includes(field)) {
            patch[field] = v === '' ? null : Number(v);
          } else patch[field] = v;
          patchItem(dayId, itemId, patch, { silent: true });
          refreshPreview();
        });
      });

      panel.querySelector('[data-remove]')?.addEventListener('click', () => {
        removeItem(dayId, itemId);
        closeModal();
        toast('Ejercicio quitado');
      });
    },
  });
}

const muscleLabel = (id) => MUSCLES.find((m) => m.id === id)?.name || 'Otro';
