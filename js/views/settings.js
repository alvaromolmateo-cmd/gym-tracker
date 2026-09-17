// Vista «Ajustes»: preferencias, copia de seguridad y la letra pequeña de cómo calcula la app.

import { esc, icon, fmtNum, toast, confirmDialog } from '../ui.js';
import { getState, setSetting, exportJSON, importJSON, resetAll, storageInfo } from '../store.js';
import { MYO_TABLE, MYO_REST_FIRST, MYO_REST, MYO_MINIS } from '../catalog.js';

// De dónde sale cada número de la app. Se listan aparte para que no se coman la explicación.
const REFERENCES = [
  {
    who: 'ACSM (2009)',
    what: 'Progression models in resistance training for healthy adults',
    use: 'La banda de subida de carga: del 2-4 % en músculos pequeños al 5-10 % en los grandes, cuando superas el objetivo de reps.',
  },
  {
    who: 'Baechle y Earle (NSCA)',
    what: 'Essentials of Strength Training and Conditioning',
    use: 'La regla 2×2: dos sesiones seguidas cumpliendo el objetivo antes de subir. La app la exige cuando el material obliga a un salto mayor que la banda.',
  },
  {
    who: 'Nunes et al. (2023)',
    what: 'PLOS ONE',
    use: 'El tren inferior progresa más rápido por semana que el superior: de ahí el objetivo semanal de cada grupo (2 % en cuádriceps, 0,6 % en deltoides lateral).',
  },
  {
    who: 'Baz-Valle et al. (2022)',
    what: 'Revisión sistemática sobre volumen e hipertrofia',
    use: 'Las bandas de 12-20 series semanales por grupo que ves en Rutina, Historial y Progreso.',
  },
  {
    who: 'Epley (1985)',
    what: 'Fórmula del 1RM estimado',
    use: 'El 1RM estimado de cada serie, sumando las reps en reserva y con tope de 12 reps efectivas.',
  },
  {
    who: 'Børge Fagerli',
    what: 'Creador del método myo-reps',
    use: 'La idea de activación + mini-series con descansos cortos. La tabla de reps concreta es la de tu entrenador, no la del método original.',
  },
  {
    who: 'Prestes et al. (2019)',
    what: 'Rest-pause vs. series tradicionales, J Strength Cond Res',
    use: 'Por qué el rest-pause se trata como una serie troceada y no como varias series completas.',
  },
  {
    who: 'Schoenfeld y Grgic (2018)',
    what: 'Can Drop Set Training Enhance Muscle Growth?, Strength Cond J',
    use: 'Los drop sets suman volumen efectivo en menos tiempo; por eso cada escalón extra cuenta media serie.',
  },
  {
    who: 'Fink et al. (2018)',
    what: 'Drop sets: estrés agudo, hipertrofia y fuerza',
    use: 'Apoya lo anterior: con menos carga total se llega a adaptaciones parecidas si se llega cerca del fallo.',
  },
];

const THEMES = [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']];

export function render(ctx) {
  const s = getState().settings;
  const info = storageInfo();

  return `
    <div class="page-head">
      <h1>Ajustes</h1>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2>${icon('settings')} Preferencias</h2>

        <label class="lbl">Tema</label>
        <div class="seg">${THEMES.map(([v, l]) => `<button class="seg-btn${s.theme === v ? ' on' : ''}" data-theme="${v}">${l}</button>`).join('')}</div>

        <div class="form-row" style="margin-top:14px">
          <label class="fld">Peso corporal (kg)
            <input class="input" type="number" step="0.1" min="0" placeholder="—" value="${s.bodyweight ?? ''}" data-bodyweight>
          </label>
          <label class="fld grow">Lema
            <input class="input" type="text" value="${esc(s.motto)}" data-motto>
          </label>
        </div>
        <p class="hint">El peso corporal se suma a la carga en los ejercicios que tiran de él (fondos), para que el tonelaje no se quede corto.</p>

        <p class="hint">La app no cronometra descansos: vas por sensaciones. Los únicos pautados son los de las myo-reps (${MYO_REST_FIRST}" y ${MYO_REST}"), y ahí solo te los recuerda.</p>
      </div>

      <div class="card">
        <h2>${icon('archive')} Copia de seguridad</h2>
        <p class="muted">Todo se guarda en este dispositivo. Exporta de vez en cuando para no perder el histórico.</p>
        <div class="btn-row">
          <button class="btn" data-export>${icon('download')} Exportar JSON</button>
          <button class="btn" data-import>${icon('upload')} Importar</button>
          <input type="file" accept="application/json,.json" hidden data-file>
        </div>
        <p class="hint">${info.sessions} entrenos · ${fmtNum(info.bytes / 1024, 1)} KB ocupados.</p>

        ${ctx.installPrompt && !ctx.standalone ? `
          <h3 class="sub-h">${icon('phone')} Instalar</h3>
          <p class="muted">Instálala en el móvil y la tendrás como una app más, también sin cobertura en el gimnasio.</p>
          <button class="btn btn-primary" data-install>${icon('download')} Instalar app</button>` : ''}

        <h3 class="sub-h">${icon('trash')} Zona peligrosa</h3>
        <button class="btn btn-danger-ghost" data-reset>${icon('trash')} Borrar todo y empezar de cero</button>
      </div>
    </div>

    <div class="card">
      <h2>${icon('info')} Cómo calcula la app</h2>
      <div class="about-grid">
        <div class="about-box">
          <h3 class="sub-h">${icon('trending')} Sobrecarga progresiva</h3>
          <p class="muted">Doble progresión: primero subes reps dentro del rango y, cuando llegas al tope en todas las series, subes carga. El salto no es fijo: se calcula como porcentaje del peso actual dentro de la banda que la <b>ACSM (2009)</b> recomienda para cada grupo —del 2-4 % en músculos pequeños al 5-10 % en los grandes— y nunca baja del incremento mínimo que hay en tu gimnasio.</p>
          <p class="muted">Cuando el material obliga a un salto mayor que esa banda (de 12,5 a 15 kg en unas mancuernas son un 20 %), se aplica la <b>regla 2×2 de la NSCA</b>: hay que superar el objetivo en dos sesiones seguidas antes de subir.</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('zap')} Myo-reps</h3>
          <p class="muted">Serie de activación al fallo, ${MYO_REST_FIRST}" de descanso, ${MYO_MINIS} mini-series con las reps de la tabla y ${MYO_REST}" entre medias, y una última serie al fallo. La tabla es la de tu entrenador.</p>
          <div class="tbl-wrap">
            <table class="tbl">
              <thead><tr><th>Activación</th><th>Mini-series</th></tr></thead>
              <tbody>${MYO_TABLE.map((b) => `<tr><td>${b.min}-${b.max} reps</td><td>${MYO_MINIS} × ${b.reps}</td></tr>`).join('')}</tbody>
            </table>
          </div>
          <p class="hint">Menos de 6 reps en la activación: el peso se te ha ido. Más de 20: toca subir.</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('clock')} Rest-pause</h3>
          <p class="muted">Una sola serie troceada en tandas: llegas cerca del fallo, descansas los segundos que marque el esquema (15-30" en tu rutina) y sigues con el mismo peso hasta completarlo. Las tandas van cayendo —8+5+5+3+3+3+3— porque cada una arranca con la fatiga de la anterior.</p>
          <p class="muted">La app te guarda el peso y las reps de cada tanda, te va sumando el total y lo compara con el objetivo del esquema: <b>si llegas al total, toca subir carga</b>. Como es una serie partida, cuenta 1 serie efectiva y media por cada tanda extra (<b>Prestes et al., 2019</b>).</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('arrow-down')} Drop sets</h3>
          <p class="muted">Una serie en cascada: llegas al tope de reps del primer escalón, bajas el peso sin descansar y sigues con el siguiente, hasta el último —que si lo tienes marcado, va al fallo—. El porcentaje de bajada lo eliges en la rutina y la app te sugiere los pesos de cada escalón redondeados al disco que tengas.</p>
          <p class="muted">Ojo con leerlo mal: <b>«2 × (6 → 8)» son 2 series</b>, cada una con dos escalones; los escalones no son series. Para subir carga manda el primer escalón, que es el que lleva el peso de verdad (<b>Schoenfeld y Grgic, 2018</b>).</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('layers')} Series efectivas</h3>
          <p class="muted">Una serie normal cuenta 1. En myo-reps, rest-pause y drop sets la tanda inicial cuenta 1 y cada tramo extra 0,5: comparten fatiga con la primera, así que no equivalen a series completas. Los músculos secundarios de un ejercicio suman la mitad.</p>
          <h3 class="sub-h">${icon('target')} 1RM estimado</h3>
          <p class="muted">Fórmula de <b>Epley</b> sumando las reps en reserva (RIR), limitada a 12 reps efectivas. Es un indicador de tendencia, no una marca real.</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('list')} Lo que la app no hace</h3>
          <p class="muted">No cronometra descansos ni mide la duración de la sesión: entrenas por sensaciones y el reloj solo mentiría si te olvidas de cerrar el entreno. Lo que se mide es reps, series y tonelaje.</p>
          <p class="muted">Tampoco decide por ti: las sugerencias de carga son eso, sugerencias. Si el día viene torcido, apunta lo que hayas hecho y la próxima vez se recalcula solo.</p>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>${icon('archive')} Referencias</h2>
      <p class="muted">Cada número de la app sale de algún sitio. Estos son los sitios.</p>
      <ul class="ref-list">
        ${REFERENCES.map((r) => `
          <li>
            <div class="ref-head"><b>${esc(r.who)}</b> <i>${esc(r.what)}</i></div>
            <div class="ref-use">${esc(r.use)}</div>
          </li>`).join('')}
      </ul>
    </div>
  `;
}

export function mount(root, ctx) {
  root.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => {
    setSetting('theme', b.dataset.theme);
    ctx.applyTheme();
  }));

  root.querySelector('[data-bodyweight]')?.addEventListener('change', (e) => setSetting('bodyweight', e.target.value === '' ? null : Number(e.target.value)));
  root.querySelector('[data-motto]')?.addEventListener('input', (e) => setSetting('motto', e.target.value, { silent: true }));
  root.querySelector('[data-motto]')?.addEventListener('change', () => ctx.refreshShell());

  root.querySelector('[data-export]')?.addEventListener('click', () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `entrenamientos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Copia descargada');
  });

  const file = root.querySelector('[data-file]');
  root.querySelector('[data-import]')?.addEventListener('click', () => file.click());
  file?.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    const ok = await confirmDialog({
      title: 'Importar datos',
      message: 'Se sustituye todo lo que tienes ahora por el contenido del archivo.',
      confirmText: 'Importar',
      danger: false,
    });
    if (!ok) {
      file.value = '';
      return;
    }
    try {
      importJSON(await f.text());
      toast('Datos importados');
    } catch (err) {
      toast(`No se pudo importar: ${err.message}`);
    }
    file.value = '';
  });

  root.querySelector('[data-install]')?.addEventListener('click', () => ctx.install());

  root.querySelector('[data-reset]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Borrar todo',
      message: 'Se borran los entrenos, la rutina y los ajustes, y vuelve la planificación de partida. No hay vuelta atrás.',
      confirmText: 'Borrar todo',
    });
    if (ok) {
      resetAll();
      toast('Todo a cero');
    }
  });
}
