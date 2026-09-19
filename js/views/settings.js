// Vista «Ajustes»: preferencias, la aplicación, copia de seguridad y la letra pequeña de cómo calcula la app.

import { esc, icon, fmtNum, toast, confirmDialog } from '../ui.js';
import { getState, setSetting, exportJSON, importJSON, resetAll, storageInfo, safetyCopies, discardSafetyCopy, legacySampleSessions, removeLegacySampleSessions } from '../store.js';
import { MYO_TABLE, MYO_REST_FIRST, MYO_REST, MYO_MINIS } from '../catalog.js';

// Versión que se enseña en Ajustes. Se sube a la vez que `VERSION` en sw.js.
export const APP_VERSION = '1.5.0';

// De dónde sale cada número de la app. Se listan aparte para que no se coman la explicación.
const REFERENCES = [
  {
    who: 'ACSM, 2009',
    what: 'Progression models in resistance training for healthy adults',
    use: 'La banda de subida de carga – Del 2-4 % en músculos pequeños al 5-10 % en los grandes, cuando superas el objetivo de reps.',
  },
  {
    who: 'Baechle y Earle, NSCA',
    what: 'Essentials of Strength Training and Conditioning',
    use: 'La regla 2×2 – Dos sesiones seguidas cumpliendo el objetivo antes de subir. La app la exige cuando el material obliga a un salto mayor que la banda.',
  },
  {
    who: 'Simão et al., 2012',
    what: 'Exercise order in resistance training, Sports Medicine',
    use: 'Un ejercicio rinde menos al final del entreno que al principio – Por eso cada uno se compara con la última vez que lo hiciste en el mismo día de la rutina.',
  },
  {
    who: 'Nunes et al., 2023',
    what: 'PLOS ONE',
    use: 'El tren inferior progresa más rápido por semana que el superior – De ahí el objetivo semanal de cada grupo, del 2 % en cuádriceps al 0,6 % en hombro lateral.',
  },
  {
    who: 'Baz-Valle et al., 2022',
    what: 'Revisión sistemática sobre volumen e hipertrofia',
    use: 'Las bandas de 12-20 series semanales por grupo que ves en Rutina, Historial y Progreso.',
  },
  {
    who: 'Epley, 1985',
    what: 'Fórmula del 1RM estimado',
    use: 'El 1RM estimado de cada serie, sumando las reps en reserva y con tope de 12 reps efectivas.',
  },
  {
    who: 'Børge Fagerli',
    what: 'Creador del método myo-reps',
    use: 'La idea de activación + mini-series con descansos cortos. La tabla de reps concreta es la de mi entrenador, no la del método original.',
  },
  {
    who: 'Prestes et al., 2019',
    what: 'Rest-pause vs. series tradicionales, J Strength Cond Res',
    use: 'Por qué el rest-pause se trata como una serie troceada y no como varias series completas.',
  },
  {
    who: 'Schoenfeld y Grgic, 2018',
    what: 'Can Drop Set Training Enhance Muscle Growth?, Strength Cond J',
    use: 'Los drop sets suman volumen efectivo en menos tiempo; por eso cada escalón extra cuenta media serie.',
  },
  {
    who: 'Fink et al., 2018',
    what: 'Drop sets, estrés agudo, hipertrofia y fuerza',
    use: 'Apoya lo anterior – Con menos carga total se llega a adaptaciones parecidas si se llega cerca del fallo.',
  },
];

// Descarga un texto como archivo .json.
function download(text, name) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const fileDate = (iso) => (iso || new Date().toISOString()).slice(0, 10);
const longDate = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

// Copias automáticas de la red de seguridad del almacenamiento (ver store.js).
function safetyBlock() {
  const { backup, rescues, readOnly } = safetyCopies();
  if (!backup && !rescues.length && !readOnly) return '';
  return `
    <h3 class="sub-h">${icon('archive')} Copias automáticas</h3>
    ${readOnly ? '<p class="muted"><b>Los datos guardados no se pudieron abrir y no hay sitio para apartarlos</b>, así que la app no guarda nada para no pisarlos. Exporta o libera espacio antes de seguir.</p>' : ''}
    ${rescues.length ? `
      <p class="muted"><b>Hay datos antiguos que la app no pudo abrir.</b> No se han borrado y están apartados aquí. Descárgalos y guárdalos; se podrán importar cuando se corrija el fallo.</p>
      <div class="btn-row">
        <button class="btn" data-rescue-get>${icon('download')} Descargar datos apartados</button>
        <button class="btn btn-danger-ghost" data-rescue-drop>${icon('trash')} Descartar</button>
      </div>` : ''}
    ${backup ? `
      <p class="hint">Copia de antes de la última actualización de la app, del ${esc(longDate(backup.savedAt))}. Solo hace falta si algo se ve raro tras actualizar.</p>
      <div class="btn-row">
        <button class="btn" data-backup-get>${icon('download')} Descargar copia</button>
      </div>` : ''}`;
}

const THEMES = [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']];

export function render(ctx) {
  const s = getState().settings;
  const info = storageInfo();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return `
    <div class="page-head">
      <h1>Ajustes</h1>
    </div>

    <div class="grid-2">
      <div class="col">
        <div class="card">
          <h2>${icon('settings')} Preferencias</h2>

          <label class="lbl">Tema</label>
          <div class="seg">${THEMES.map(([v, l]) => `<button class="seg-btn${s.theme === v ? ' on' : ''}" data-theme="${v}">${l}</button>`).join('')}</div>

          <div class="form-row" style="margin-top:14px">
            <label class="fld">Peso corporal en kg
              <input class="input" type="number" step="0.1" min="0" placeholder="—" value="${s.bodyweight ?? ''}" data-bodyweight>
            </label>
            <label class="fld grow">Lema
              <input class="input" type="text" value="${esc(s.motto)}" data-motto>
            </label>
          </div>
          <p class="hint">El peso corporal se suma a la carga en ejercicios como los fondos, para que el tonelaje no se quede corto.</p>
        </div>

        <div class="card">
          <div class="card-head"><h2>${icon('phone')} Aplicación</h2><span class="muted">v${APP_VERSION}</span></div>
          ${ctx.standalone
            ? `<p class="ok">${icon('check-circle')} Instalada como aplicación en este dispositivo.</p>`
            : ctx.installPrompt
              ? `<p class="muted">Instálala para abrirla como una app, a pantalla completa y sin conexión.</p><button class="btn btn-primary" data-install>${icon('download')} Instalar aplicación</button>`
              : isIOS
                ? '<p class="muted">En iPhone o iPad, pulsa <b>Compartir</b> en Safari y luego <b>Añadir a pantalla de inicio</b>.</p>'
                : '<p class="muted">Si el navegador lo permite, verás la opción <b>Instalar aplicación</b> en el menú del navegador o en el icono de la barra de direcciones. En iPhone: Compartir → Añadir a pantalla de inicio.</p>'}
          <p class="hint">Funciona sin conexión. Los datos se guardan en este dispositivo; usa la copia de seguridad para pasarlos a otro.</p>
        </div>
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
        ${safetyBlock()}
        ${legacySampleSessions().length ? `
          <h3 class="sub-h">${icon('calendar')} Historial de ejemplo</h3>
          <p class="muted">Las versiones anteriores de la app venían con ${legacySampleSessions().length} entrenos de ejemplo ya registrados, del 24 al 28 de agosto de 2026. Si no son tuyos, puedes quitarlos; el resto de tu historial no se toca.</p>
          <button class="btn" data-legacy-drop>${icon('trash')} Quitar los entrenos de ejemplo</button>` : ''}

        <h3 class="sub-h">${icon('trash')} Zona peligrosa</h3>
        <button class="btn btn-danger-ghost" data-reset>${icon('trash')} Borrar todo y empezar de cero</button>
      </div>
    </div>

    <div class="card">
      <h2>${icon('info')} Cómo calcula la app</h2>
      <div class="about-grid">
        <div class="about-box">
          <h3 class="sub-h">${icon('trending')} Sobrecarga progresiva</h3>
          <p class="muted"><b>Doble progresión</b> – Primero subes reps dentro del rango y, cuando llegas al tope en todas las series, subes carga.</p>
          <p class="muted"><b>El salto no es fijo</b> – Se calcula como porcentaje del peso actual, dentro de la banda que la ACSM recomienda para cada grupo, del 2-4 % en músculos pequeños al 5-10 % en los grandes. Nunca baja del incremento mínimo que hay en tu gimnasio.</p>
          <p class="muted"><b>Regla 2×2 de la NSCA</b> – Cuando el material obliga a un salto mayor que esa banda, como pasar de 12,5 a 15 kg en unas mancuernas, que es un 20 %, hay que superar el objetivo en dos sesiones seguidas antes de subir.</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('archive')} Con qué se compara</h3>
          <p class="muted"><b>Misma técnica</b> – Unas myo-reps solo se comparan con myo-reps y un drop set con drop sets, aunque el ejercicio sea el mismo.</p>
          <p class="muted"><b>Mismo día de la rutina</b> – Un ejercicio no rinde igual al principio del entreno que al final, con toda la fatiga encima, así que se compara con la última vez que lo hiciste ese mismo día. Si ahí aún no lo has hecho, sirve de referencia otro día con la misma técnica.</p>
          <p class="muted"><b>Lo que apuntes manda</b> – Las sugerencias de carga son orientativas. Si el día viene torcido, apunta lo que hayas hecho y la próxima vez se recalcula desde ahí.</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('zap')} Myo-reps</h3>
          <p class="muted">Serie de activación al fallo, ${MYO_REST_FIRST}" de descanso, ${MYO_MINIS} mini-series con las reps de la tabla y ${MYO_REST}" entre medias, y una última serie al fallo. La tabla es la de mi entrenador.</p>
          <div class="tbl-wrap">
            <table class="tbl">
              <thead><tr><th>Activación</th><th>Mini-series</th></tr></thead>
              <tbody>${MYO_TABLE.map((b) => `<tr><td>${b.min}-${b.max} reps</td><td>${MYO_MINIS} × ${b.reps}</td></tr>`).join('')}</tbody>
            </table>
          </div>
          <p class="hint">Menos de 6 reps en la activación – El peso se te ha ido.<br>Más de 20 – Toca subir.</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('clock')} Rest-pause</h3>
          <p class="muted">Una sola serie troceada en tandas. Llegas cerca del fallo, descansas los segundos que marque el esquema, normalmente entre 15 y 30", y sigues con el mismo peso hasta completarlo. Las tandas van cayendo, como en 8+5+5+3+3+3+3, porque cada una arranca con la fatiga de la anterior.</p>
          <p class="muted">La app te guarda el peso y las reps de cada tanda, te va sumando el total y lo compara con el objetivo del esquema. <b>Si llegas al total, toca subir carga</b>. Como es una serie partida, cuenta 1 serie efectiva, más media por cada tanda extra, siguiendo a <b>Prestes et al., 2019</b>.</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('arrow-down')} Drop sets</h3>
          <p class="muted">Una serie en cascada. Llegas al tope de reps del primer escalón, bajas el peso sin descansar y sigues con el siguiente hasta el último, que va al fallo si lo tienes marcado. El porcentaje de bajada lo eliges en la rutina y la app te sugiere los pesos de cada escalón, redondeados al disco que tengas.</p>
          <p class="muted"><b>Ojo con leerlo mal</b> – «2 × (6 → 8)» son 2 series, cada una con dos escalones; los escalones no son series. Para subir carga manda el primer escalón, que es el que lleva el peso de verdad, y cada escalón extra suma media serie efectiva, como recogen <b>Schoenfeld y Grgic, 2018</b>.</p>
        </div>

        <div class="about-box">
          <h3 class="sub-h">${icon('layers')} Series efectivas</h3>
          <p class="muted">Una serie normal cuenta 1. En myo-reps, rest-pause y drop sets la tanda inicial cuenta 1 y cada tramo extra 0,5, porque comparten fatiga con la primera y no equivalen a series completas. Los músculos secundarios de un ejercicio suman la mitad.</p>
          <h3 class="sub-h">${icon('target')} 1RM estimado</h3>
          <p class="muted">Fórmula de <b>Epley</b> sumando las reps en reserva, el RIR, con un tope de 12 reps efectivas. Es un indicador de tendencia, no una marca real.</p>
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
    download(exportJSON(), `entrenamientos-${fileDate()}.json`);
    toast('Copia descargada');
  });

  root.querySelector('[data-backup-get]')?.addEventListener('click', () => {
    const { backup } = safetyCopies();
    if (backup) download(backup.raw, `entrenamientos-copia-${fileDate(backup.savedAt)}.json`);
  });
  root.querySelector('[data-rescue-get]')?.addEventListener('click', () => {
    safetyCopies().rescues.forEach((r, i) => download(r.raw, `entrenamientos-apartados-${fileDate(r.savedAt)}-${i + 1}.json`));
  });
  root.querySelector('[data-rescue-drop]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Descartar datos apartados',
      message: 'Se borran para siempre los datos que la app no pudo abrir. Descárgalos antes si hay algo que quieras conservar.',
      confirmText: 'Descartar',
    });
    if (ok) {
      discardSafetyCopy('rescue');
      ctx.rerender?.();
      toast('Datos apartados descartados');
    }
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

  root.querySelector('[data-legacy-drop]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Quitar entrenos de ejemplo',
      message: 'Se borran solo los entrenos de ejemplo del 24 al 28 de agosto de 2026 que venían con la app. Tus entrenos, la rutina y los ejercicios se quedan como están.',
      confirmText: 'Quitar',
    });
    if (ok) toast(`${removeLegacySampleSessions()} entrenos de ejemplo quitados`);
  });

  root.querySelector('[data-install]')?.addEventListener('click', () => ctx.install());

  root.querySelector('[data-reset]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Borrar todo',
      message: 'Se borran los entrenos, la rutina y los ajustes, y vuelve la rutina de ejemplo. No hay vuelta atrás.',
      confirmText: 'Borrar todo',
    });
    if (ok) {
      resetAll();
      toast('Todo a cero');
    }
  });
}
