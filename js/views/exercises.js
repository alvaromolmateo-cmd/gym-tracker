// Vista «Ejercicios»: la biblioteca, con el perfil de progresión de cada uno y su histórico.

import { esc, icon, fmtNum, toast, confirmDialog, openModal, closeModal, modalHeader } from '../ui.js';
import { getState, addExercise, patchExercise, removeExercise, exerciseById } from '../store.js';
import { MUSCLES, EQUIPMENT, muscleName, profileOf } from '../catalog.js';
import { exerciseSeries, bestOf } from '../metrics.js';
import { increment, profileSummary, bandText } from '../progression.js';
import { fmtSet } from '../sets.js';
import { historyOf } from '../store.js';
import { muscleChip, typeChip, emptyState } from './shared.js';

// Escalones de carga habituales en el gimnasio, para no tener que teclearlos.
const STEPS = [1.25, 2.5, 5, 10];

// Sobrecarga progresiva que corresponde al grupo muscular elegido, con un ejemplo del próximo salto
// desde el mejor peso registrado (o desde 50 kg si aún no hay ninguno).
function profileBox(ex, best) {
  const p = profileOf(ex.muscle);
  const from = best?.weight?.weight || 50;
  const next = increment(from, ex);
  return `
    <div class="profile-head">${icon('target')} Sobrecarga progresiva para ${esc(muscleName(ex.muscle).toLowerCase())}</div>
    <p>Banda de subida <b>${bandText(ex.muscle)}</b> por salto · ritmo esperable <b>≈${fmtNum(p.weekly, 1)} %/semana</b> · referencia de volumen <b>${p.sets[0]}-${p.sets[1]} series/semana</b>.</p>
    <p class="muted">Con el incremento de ${fmtNum(ex.step, 2)} kg, desde ${fmtNum(from, 2)} kg el próximo escalón sería de ${fmtNum(next.inc, 2)} kg, un ${fmtNum(next.pct, 1)} %.</p>`;
}

export function render(ctx) {
  const st = getState();
  const filter = ctx.muscleFilter || 'all';
  const list = st.exercises
    .filter((e) => filter === 'all' || e.muscle === filter)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const used = new Set(st.routine.days.flatMap((d) => d.items.map((i) => i.exerciseId)));

  return `
    <div class="page-head">
      <div>
        <h1>Ejercicios</h1>
        <p class="muted">Cada ejercicio lleva su incremento mínimo real y la banda de subida que le corresponde por grupo muscular.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" data-new>${icon('plus')} Nuevo</button>
      </div>
    </div>

    <div class="card">
      <div class="seg seg-wrap">
        <button class="seg-btn${filter === 'all' ? ' on' : ''}" data-filter="all">Todos</button>
        ${MUSCLES.map((m) => `<button class="seg-btn${filter === m.id ? ' on' : ''}" data-filter="${m.id}">${m.emoji} ${esc(m.short)}</button>`).join('')}
      </div>
    </div>

    ${list.length ? `
      <div class="ex-grid">
        ${list.map((e) => {
          const best = bestOf(e.id);
          const inc = increment(best?.weight?.weight || 0, e);
          const p = profileOf(e.muscle);
          return `
            <button class="ex-card" data-open="${esc(e.id)}">
              <div class="ex-top">
                <span class="ex-name">${esc(e.name)}</span>
                ${used.has(e.id) ? '' : '<span class="badge badge-soft">fuera de la rutina</span>'}
              </div>
              <div class="ex-chips">${muscleChip(e.muscle)}<span class="chip chip-eq">${esc(e.equipment)}</span></div>
              <div class="ex-stats">
                <span><small>Mejor</small><b>${best?.weight ? `${fmtNum(best.weight.weight, 2)} kg` : '—'}</b></span>
                <span><small>1RM est.</small><b>${best?.e1rm ? `${fmtNum(best.e1rm.e1rm, 1)} kg` : '—'}</b></span>
                <span><small>Salto</small><b>${fmtNum(inc.inc, 2)} kg</b></span>
              </div>
              <div class="ex-profile">${esc(`${bandText(e.muscle)} por salto · ≈${fmtNum(p.weekly, 1)} %/semana`)}</div>
            </button>`;
        }).join('')}
      </div>` : emptyState('Ningún ejercicio con ese filtro.')}
  `;
}

export function mount(root, ctx) {
  root.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => ctx.set('muscleFilter', b.dataset.filter)));
  root.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openExercise(b.dataset.open)));
  root.querySelector('[data-new]')?.addEventListener('click', () => openExercise(null));
}

function openExercise(id) {
  const isNew = !id;
  const draft = { name: '', muscle: 'pecho', equipment: 'Máquina', step: 2.5, bw: false, secondary: [], notes: '' };

  const draw = () => {
    const ex = isNew ? draft : exerciseById(id);
    const history = isNew ? [] : historyOf(id);
    const best = isNew ? null : bestOf(id);

    return `
      ${modalHeader(isNew ? 'Nuevo ejercicio' : esc(ex.name), isNew ? '' : esc(profileSummary(ex)))}
      <div class="modal-body">
        <label class="fld">Nombre
          <input class="input" type="text" value="${esc(ex.name)}" data-f="name" placeholder="Press inclinado con mancuernas">
        </label>
        <div class="form-row">
          <label class="fld grow">Grupo principal
            <select class="select" data-f="muscle">
              ${MUSCLES.map((m) => `<option value="${m.id}"${ex.muscle === m.id ? ' selected' : ''}>${m.emoji} ${esc(m.name)}</option>`).join('')}
            </select>
          </label>
          <label class="fld">Material
            <select class="select" data-f="equipment">
              ${EQUIPMENT.map((q) => `<option value="${esc(q)}"${ex.equipment === q ? ' selected' : ''}>${esc(q)}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="fld">Incremento mínimo en kg
            <input class="input" type="number" step="0.25" min="0.25" value="${ex.step}" data-f="step">
          </label>
          <label class="fld">Cuenta el peso corporal
            <select class="select" data-f="bw"><option value="0"${!ex.bw ? ' selected' : ''}>No</option><option value="1"${ex.bw ? ' selected' : ''}>Sí</option></select>
          </label>
        </div>
        <div class="seg seg-wrap step-seg">
          ${STEPS.map((v) => `<button class="seg-btn${Number(ex.step) === v ? ' on' : ''}" data-step="${v}">${fmtNum(v, 2)} kg</button>`).join('')}
        </div>
        <p class="hint">En poleas, máquinas de placas y lastre puedes colgar el disco de sobrecarga de 1,25 kg. En mancuernas y barras el escalón real no baja de 2,5 kg, porque los discos van de dos en dos.</p>

        <div class="profile-box" data-profile>${profileBox(ex, best)}</div>

        <label class="fld">Notas
          <input class="input" type="text" value="${esc(ex.notes)}" data-f="notes" placeholder="Asiento en el 4, agarre cerrado…">
        </label>

        ${!isNew && history.length ? `
          <h3 class="sub-h">${icon('archive')} Histórico</h3>
          <div class="hist-list">
            ${history.slice(0, 10).map((h) => `
              <div class="hist-row">
                <span class="hist-date">${esc(h.date.slice(8, 10))}/${esc(h.date.slice(5, 7))}</span>
                <span class="hist-sets">${typeChip(h.type)}${h.sets.map((s) => esc(fmtSet(s, h.type, { bw: ex.bw }))).filter((x) => x !== '—').join(' · ')}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>
      <div class="modal-foot">
        ${isNew ? '' : `<button class="btn btn-danger-ghost" data-remove>${icon('trash')} Borrar</button>`}
        <button class="btn btn-primary" data-ok>${isNew ? 'Crear' : 'Hecho'}</button>
      </div>`;
  };

  openModal({
    render: draw,
    mount: (panel) => {
      // El grupo muscular y el incremento cambian la sobrecarga que toca: se repinta ese recuadro (y
      // el subtítulo) a mano, sin redibujar la ficha, para no perder lo que se esté escribiendo.
      const refreshProfile = () => {
        const ex = isNew ? draft : exerciseById(id);
        const box = panel.querySelector('[data-profile]');
        if (box) box.innerHTML = profileBox(ex, isNew ? null : bestOf(id));
        const sub = panel.querySelector('.modal-sub');
        if (sub && !isNew) sub.textContent = profileSummary(ex);
        panel.querySelectorAll('[data-step]').forEach((x) => x.classList.toggle('on', Number(x.dataset.step) === Number(ex.step)));
      };

      panel.querySelectorAll('[data-f]').forEach((input) => {
        const field = input.dataset.f;
        const read = () => {
          if (field === 'step') return Number(input.value) || 2.5;
          if (field === 'bw') return input.value === '1';
          return input.value;
        };
        const ev = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(ev, () => {
          if (isNew) draft[field] = read();
          else patchExercise(id, { [field]: read() }, { silent: ev === 'input' && field !== 'muscle' });
          if (field === 'muscle' || field === 'step') refreshProfile();
        });
      });
      panel.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
        const v = Number(b.dataset.step);
        if (isNew) {
          draft.step = v;
          panel.querySelector('[data-f="step"]').value = v;
          refreshProfile();
        } else {
          patchExercise(id, { step: v });
        }
      }));

      panel.querySelector('[data-ok]').addEventListener('click', () => {
        if (isNew) {
          if (!draft.name.trim()) {
            toast('Ponle un nombre');
            return;
          }
          addExercise(draft);
          toast('Ejercicio creado');
        }
        closeModal();
      });
      panel.querySelector('[data-remove]')?.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Borrar ejercicio',
          message: 'Se quita también de la rutina. Los entrenos ya registrados lo conservan.',
        });
        if (ok) {
          removeExercise(id);
          closeModal();
          toast('Ejercicio borrado');
        }
      });
    },
  });
}
