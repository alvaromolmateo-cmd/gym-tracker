// Planificación actual y registro de partida.
//
// La rutina es la que aparece en el Excel del entrenador y en la libreta («PLANIFICACIÓN ACTUAL»).
// El histórico de la semana 2 (24-30/8/2026) es el que está escrito a mano en la libreta; sirve de
// punto de partida para que el motor de progresión ya tenga referencias desde el primer entreno.
// Los días de la semana concretos son una suposición razonable y se pueden cambiar desde Historial.

export const ROUTINE_START = '2026-08-17'; // lunes de la semana 1

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
    focus: 'Pierna · énfasis cuádriceps',
    items: [
      myo('curl-femoral'),
      n('aductor', 2, 13, 13, '0', 0, {
        repsText: '7+6',
        tempo: '7 reps lentas aguantando 1" isométrico + 6 normales',
      }),
      n('gemelo', 3, 15, 15, '0-1', 1),
      n('hack-squat', 3, 5, 8, '1-0', 1, {
        tempo: '3" de bajada + 1" isométrico',
        note: 'Series descendentes',
      }),
      rp('prensa', [8, 5, 5, 3, 3, 3, 3], 15),
      drop('extension-cuadriceps', [4, 6, 8, 10, 12], 2, 15, { note: 'Descendente hasta el fallo' }),
      myo('abdominales-maquina'),
    ],
  },
  {
    id: 'd2',
    name: 'Día 2',
    focus: 'Brazo + Espalda',
    items: [
      myo('press-militar-mancuerna'),
      myo('laterales-mancuerna', { note: 'En banco, eje lateral' }),
      myo('posterior-polea'),
      myo('curl-biceps-polea', { note: 'A una mano, con banco' }),
      n('triceps-cruzado', 3, 8, 10, 'fallo', 0, { tempo: 'reps lentas' }),
      n('jalon', 2, 5, 7, '1', 1),
      n('remo-polea-alta', 3, 8, 8, '0', 0),
      drop('remo-t', [6, 8], 2, 25, { dropFail: false }), // 2 series de 6→8, sin escalón extra al fallo
      n('pull-over', 2, 6, 8, '0', 0, { tempo: 'máximo estiramiento' }),
    ],
  },
  {
    id: 'd3',
    name: 'Día 3',
    focus: 'Pierna · énfasis femoral',
    items: [
      myo('extension-cuadriceps'),
      myo('aductor'),
      myo('abductor'),
      n('gemelo', 3, 15, 15, '0-1', 1),
      n('sentadilla-bulgara', 3, 5, 7, '0-1', 1),
      rp('hip-thrust', [10, 10, 10], 30),
      n('peso-muerto-rumano', 2, 8, 8, '0', 0, { tempo: '3" de bajada + 2" isométrico' }),
      n('abdominales-polea', 3, 8, 8, '0', 0),
    ],
  },
  {
    id: 'd4',
    name: 'Día 4',
    focus: 'Brazo + Pecho',
    items: [
      n('laterales-polea', 3, 10, 12, '0-1', 1, { note: 'Eje escapular, con muñequeras' }),
      myo('posterior-polea'),
      myo('triceps-barra'),
      n('curl-biceps-inclinado', 3, 8, 8, '1·1·0', 1, { note: 'Codos apoyados' }),
      n('press-pectoral-maquina', 3, 5, 8, '0-1', 1, { note: 'Series descendentes' }),
      n('press-inclinado-mancuernas', 2, 8, 8, '0-1', 1, { tempo: 'bajadas lentas' }),
      n('fondos', 3, 6, 8, 'fallo', 0),
      myo('laterales-mancuerna', { note: 'Eje lateral' }),
    ],
  },
];

// ---------- Registro de la semana 2 (libreta) ----------
// Clave: id del ejercicio → { note, sets }.
const S = (w, r, rir, raw) => ({ w, r, rir, raw: raw || (r == null ? '' : String(r)) });
const M = (w, r, minis) => ({ w, r, minis });

export const SEED_SESSIONS = [
  {
    date: '2026-08-24',
    dayId: 'd1',
    note: 'Buen entreno, solo y muy contento con la hacka.',
    feel: 4,
    entries: {
      'curl-femoral': { note: 'Mejorar técnica', sets: [M(65, 13, [4, 4, 3])] },
      aductor: { sets: [S(100, 13, 0, '7+6'), S(100, 13, 0, '7+6')] },
      gemelo: { note: 'La 3.ª con más descanso', sets: [S(110, 15, 1), S(110, 15, 0), S(110, 15, 1)] },
      'hack-squat': { sets: [S(130, 8, 1), S(130, 6, 0), S(120, 7, 0)] },
      prensa: { note: 'Con pausa', sets: [{ w: 180, clusters: [8, 5, 5, 3, 3, 3, 3] }] },
      'extension-cuadriceps': {
        note: 'Sin almohadilla',
        sets: [{ drops: [{ w: 95, r: 4 }, { w: 80, r: 6 }, { w: 67.5, r: 8 }, { w: 52.5, r: 10 }, { w: 40, r: 12 }, { w: 32.5, r: null }] }],
      },
      'abdominales-maquina': { sets: [M(60, 8, [2, 2, 1])] },
    },
  },
  {
    date: '2026-08-25',
    dayId: 'd2',
    note: 'Muy largo, pero muy buenas sensaciones y mejorando pesos.',
    feel: 4,
    entries: {
      'press-militar-mancuerna': { sets: [M(22.5, 8, [2, 2, 3])] },
      'laterales-mancuerna': { sets: [M(12.5, 8, [3, 3, 2])] },
      'posterior-polea': { sets: [M(12.5, 12, [3, 3, 8])] },
      'curl-biceps-polea': { sets: [M(30, 15, [3, 3, 3])] },
      'triceps-cruzado': { note: 'Muy fuerte', sets: [S(20, 8, 0), S(20, 8, 0), S(20, 8, 0)] },
      jalon: { sets: [S(95, 7, 1), S(95, 6, 1)] },
      'remo-polea-alta': { sets: [S(55, 10, 0), S(60, 8, 0), S(60, 7, 0)] },
      'remo-t': {
        sets: [
          { drops: [{ w: 40, r: 6 }, { w: 30, r: 8 }] },
          { drops: [{ w: 40, r: 6 }, { w: 30, r: 7 }] },
        ],
      },
      'pull-over': { sets: [S(22.5, 6, 0), S(20, 10, 0)] },
    },
  },
  {
    date: '2026-08-27',
    dayId: 'd3',
    note: 'Apretándome Aarón, reventado y realizado.',
    feel: 5,
    entries: {
      'extension-cuadriceps': { note: 'Sin almohadilla', sets: [M(110, 12, [3, 3, 6])] },
      aductor: { sets: [M(110, 14, [4, 4, 4])] },
      abductor: { sets: [M(70, 14, [4, 4, 6])] },
      gemelo: { sets: [S(110, 15, 1), S(110, 15, 1), S(110, 12, 0)] },
      'sentadilla-bulgara': { note: 'Me faltó 1 serie', sets: [S(80, 7, 1), S(80, 8, 0)] },
      'hip-thrust': { note: 'Con Aarón', sets: [{ w: 120, clusters: [10, 10, 10] }] },
      'peso-muerto-rumano': { note: 'Con straps', sets: [S(25, 8, 1), S(25, 8, 0)] },
      'abdominales-polea': { sets: [S(87.5, 12, 0), S(95, 9, 0), S(95, 8, 0)] },
    },
  },
  {
    date: '2026-08-28',
    dayId: 'd4',
    note: 'Entreno de puta madre físicamente… mentalmente no sé…',
    feel: 3,
    entries: {
      'laterales-polea': { sets: [S(20, 12, 0), S(20, 11, 0), S(20, 10, 0)] },
      'posterior-polea': { sets: [M(12.5, 11, [3, 3, 4])] },
      'triceps-barra': { sets: [M(75, 11, [3, 3, 4])] },
      'curl-biceps-inclinado': { sets: [S(20, 8, 1), S(20, 7, 0), S(17.5, 8, 0)] },
      'press-pectoral-maquina': { note: 'Sin respaldo', sets: [S(40, 9, 1), S(40, 9, 0), S(40, 8, 1)] },
      'press-inclinado-mancuernas': { sets: [S(22.5, 8, 0), S(22.5, 8, 0)] },
      fondos: { sets: [S(0, 12, 1), S(0, 9, 0), S(0, 8, 1)] },
      'laterales-mancuerna': { sets: [M(12.5, 8, [2, 2, 6])] },
    },
  },
];
