// Rutina de ejemplo con la que arranca la app.
//
// Es solo un punto de partida para ver cómo funciona: cuatro días (pierna y torso alternos) con los
// ejercicios del catálogo y un ejemplo de cada técnica (myo-reps, rest-pause y drop set). Se cambia
// entera desde Rutina. El historial empieza vacío.

// Atajos para no repetir campos: n = series normales, myo, rp = rest-pause, drop = drop set.
// Los descansos no se guardan: van por sensaciones y los de las myo-reps son siempre los mismos.
const n = (exerciseId, sets, repsMin, repsMax, rir, rirMax, opts = {}) => ({
  exerciseId, type: 'normal', sets, repsMin, repsMax, rir, rirMax, ...opts,
});
const myo = (exerciseId, opts = {}) => ({ exerciseId, type: 'myo', sets: 1, ...opts });
const rp = (exerciseId, scheme, clusterRest, opts = {}) => ({
  exerciseId, type: 'restpause', sets: 1, scheme, clusterRest, ...opts,
});
const drop = (exerciseId, dropScheme, sets, dropPct, opts = {}) => ({
  exerciseId, type: 'dropset', sets, dropScheme, dropFail: true, dropPct, ...opts,
});

export const ROUTINE_DAYS = [
  {
    id: 'd1',
    name: 'Día 1',
    focus: 'Pierna · cuádriceps',
    items: [
      n('hack-squat', 3, 6, 8, '1-2', 2, { tempo: '2" de bajada' }),
      rp('prensa', [10, 6, 4], 20),
      drop('extension-cuadriceps', [10, 12], 2, 20),
      n('curl-femoral', 3, 10, 12, '1', 1),
      n('gemelo', 3, 12, 15, '0-1', 1),
      n('abdominales-polea', 3, 10, 12, '1', 1),
    ],
  },
  {
    id: 'd2',
    name: 'Día 2',
    focus: 'Torso · empuje',
    items: [
      n('press-inclinado-mancuernas', 3, 8, 10, '1-2', 2),
      n('press-pectoral-maquina', 3, 8, 10, '1', 1),
      n('press-militar-mancuerna', 3, 8, 10, '1-2', 2),
      myo('laterales-mancuerna'),
      n('triceps-barra', 3, 10, 12, '0-1', 1),
      n('fondos', 2, 8, 12, '1', 1),
    ],
  },
  {
    id: 'd3',
    name: 'Día 3',
    focus: 'Pierna · femoral y glúteo',
    items: [
      n('peso-muerto-rumano', 3, 8, 10, '1-2', 2, { tempo: '3" de bajada' }),
      n('hip-thrust', 3, 8, 10, '1', 1),
      n('sentadilla-bulgara', 3, 8, 10, '1-2', 2),
      n('aductor', 2, 12, 15, '0-1', 1),
      myo('abductor'),
      n('abdominales-maquina', 3, 12, 15, '1', 1),
    ],
  },
  {
    id: 'd4',
    name: 'Día 4',
    focus: 'Torso · tirón',
    items: [
      n('jalon', 3, 8, 10, '1-2', 2),
      n('remo-polea-alta', 3, 8, 10, '1', 1),
      drop('remo-t', [8, 10], 2, 20, { dropFail: false }),
      n('pull-over', 2, 10, 12, '1', 1),
      myo('posterior-polea'),
      n('curl-biceps-inclinado', 3, 8, 10, '1', 1),
      n('curl-biceps-polea', 2, 10, 12, '0-1', 1),
    ],
  },
];

// Entrenos con los que venía precargada la app hasta la v1.3 (una semana de registro de ejemplo,
// del 24 al 28/8/2026). Ya no se crean, pero quien instaló la app antes los tiene en su historial:
// se reconocen por su fecha y por las horas fijas con que se generaron (18:00-19:30 UTC), y desde
// Ajustes se pueden quitar. Un entreno que se haya reabierto o creado a mano no encaja y no se toca.
const LEGACY_DATES = ['2026-08-24', '2026-08-25', '2026-08-27', '2026-08-28'];
export const isLegacySampleSession = (s) => LEGACY_DATES.includes(s.date)
  && s.startedAt === `${s.date}T18:00:00.000Z`
  && s.endedAt === `${s.date}T19:30:00.000Z`;
