// Catálogo: grupos musculares, perfiles de sobrecarga progresiva, tabla de myo-reps
// y biblioteca de ejercicios.
//
// Los perfiles de progresión salen de la evidencia disponible (ver README):
//  · ACSM (2009), «Progression models in resistance training for healthy adults»:
//    subir la carga entre un 2 % y un 10 %, con el extremo bajo para ejercicios de poca masa
//    muscular y el alto para los de mucha, cuando se logran 1-2 reps por encima del objetivo.
//  · Regla 2×2 (NSCA): esa condición debe cumplirse en DOS sesiones seguidas antes de subir.
//  · Nunes et al. (2023, PLOS ONE): en gente ya entrenada el tren inferior progresa más rápido
//    por semana que el superior; por eso el objetivo semanal baja según el grupo muscular.
//  · Baz-Valle et al. (2022): 12-20 series semanales por grupo como referencia de volumen.

export const MUSCLES = [
  { id: 'cuadriceps', name: 'Cuádriceps', short: 'Cuád.', emoji: '🦵', region: 'pierna' },
  { id: 'femoral', name: 'Isquiosurales', short: 'Femoral', emoji: '🦿', region: 'pierna' },
  { id: 'gluteo', name: 'Glúteo', short: 'Glúteo', emoji: '🍑', region: 'pierna' },
  { id: 'aductor', name: 'Aductor', short: 'Aductor', emoji: '🦵', region: 'pierna' },
  { id: 'abductor', name: 'Abductor', short: 'Abductor', emoji: '🦵', region: 'pierna' },
  { id: 'gemelo', name: 'Gemelo', short: 'Gemelo', emoji: '🦶', region: 'pierna' },
  { id: 'espalda', name: 'Espalda', short: 'Espalda', emoji: '🔙', region: 'torso' },
  { id: 'pecho', name: 'Pecho', short: 'Pecho', emoji: '🛡️', region: 'torso' },
  { id: 'hombro', name: 'Hombro anterior', short: 'Hombro', emoji: '🪖', region: 'torso' },
  { id: 'lateral', name: 'Hombro lateral', short: 'Lateral', emoji: '🦅', region: 'torso' },
  { id: 'posterior', name: 'Hombro posterior', short: 'Posterior', emoji: '🪶', region: 'torso' },
  { id: 'biceps', name: 'Bíceps', short: 'Bíceps', emoji: '💪', region: 'brazo' },
  { id: 'triceps', name: 'Tríceps', short: 'Tríceps', emoji: '🔺', region: 'brazo' },
  { id: 'abdomen', name: 'Abdomen', short: 'Abdomen', emoji: '🧱', region: 'core' },
];

export const MUSCLE = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));
export const muscleName = (id) => MUSCLE[id]?.name || 'Otro';
export const muscleShort = (id) => MUSCLE[id]?.short || 'Otro';
export const muscleEmoji = (id) => MUSCLE[id]?.emoji || '⚪';

// tier:   tamaño de la masa muscular implicada (marca la banda de la ACSM)
// pct:    [mín, máx] de subida de carga recomendada por salto
// weekly: % de progresión semanal razonable en e1RM para alguien ya entrenado
// sets:   [mín, máx] de series semanales de referencia
export const PROGRESSION = {
  cuadriceps: { tier: 'grande', pct: [5, 10], step: 5, weekly: 2.0, sets: [12, 20] },
  femoral: { tier: 'grande', pct: [4, 8], step: 2.5, weekly: 1.5, sets: [10, 18] },
  gluteo: { tier: 'grande', pct: [5, 10], step: 5, weekly: 2.0, sets: [10, 18] },
  aductor: { tier: 'media', pct: [4, 8], step: 5, weekly: 1.5, sets: [6, 12] },
  abductor: { tier: 'media', pct: [4, 8], step: 5, weekly: 1.5, sets: [6, 12] },
  gemelo: { tier: 'media', pct: [5, 10], step: 5, weekly: 1.5, sets: [8, 16] },
  espalda: { tier: 'grande', pct: [3, 6], step: 2.5, weekly: 1.2, sets: [12, 20] },
  pecho: { tier: 'grande', pct: [2.5, 5], step: 2.5, weekly: 1.0, sets: [10, 18] },
  hombro: { tier: 'media', pct: [2, 4], step: 2.5, weekly: 0.8, sets: [8, 16] },
  lateral: { tier: 'pequeña', pct: [1, 3], step: 1, weekly: 0.6, sets: [10, 20] },
  posterior: { tier: 'pequeña', pct: [1, 3], step: 1, weekly: 0.6, sets: [10, 18] },
  biceps: { tier: 'pequeña', pct: [2, 4], step: 1.25, weekly: 0.7, sets: [10, 18] },
  triceps: { tier: 'pequeña', pct: [2, 4], step: 2.5, weekly: 0.8, sets: [10, 18] },
  abdomen: { tier: 'media', pct: [3, 6], step: 2.5, weekly: 1.0, sets: [8, 16] },
};

export const profileOf = (muscle) => PROGRESSION[muscle] || PROGRESSION.pecho;

// ---------- Myo-reps ----------
// Secuencia del entrenador, siempre la misma:
//   1.ª serie al fallo → 40" → mini-serie de la tabla → 20" → mini-serie de la tabla → 20" → serie final al fallo.
// Las reps de las mini-series salen de la tabla según lo que hayas sacado en la serie de activación.
export const MYO_TABLE = [
  { min: 6, max: 8, reps: 2 },
  { min: 9, max: 12, reps: 3 },
  { min: 13, max: 16, reps: 4 },
  { min: 17, max: 20, reps: 5 },
];

export const MYO_REST_FIRST = 40; // segundos tras la serie de activación
export const MYO_REST = 20; // segundos entre mini-series
export const MYO_MINIS = 2; // mini-series con las reps de la tabla
export const MYO_BLOCKS = MYO_MINIS + 1; // tramos tras la activación: las mini-series y la final al fallo
export const MYO_TARGET = [9, 12]; // banda de activación en la que se busca estar

// Prescripción de mini-series para unas reps de activación dadas.
export function myoPlan(activation) {
  const a = Number(activation);
  const base = { minis: MYO_MINIS, blocks: MYO_BLOCKS, restFirst: MYO_REST_FIRST, rest: MYO_REST };
  if (!a || a < 6) return { ...base, reps: 2, band: null, verdict: 'heavy' };
  const band = MYO_TABLE.find((b) => a >= b.min && a <= b.max);
  if (!band) {
    const last = MYO_TABLE[MYO_TABLE.length - 1];
    return { ...base, reps: last.reps, band: last, verdict: 'light' };
  }
  return { ...base, reps: band.reps, band, verdict: 'ok' };
}

// ---------- Descripción de cada ejercicio ----------
// Todo ejercicio de la rutina arrastra un texto descriptivo editable. Si no se ha tocado,
// se usa el de su técnica, que por ahora es vacío en todas: con la etiqueta «Myo-reps» basta
// (la secuencia ya la recuerda la guía del entreno).
export function defaultDesc() {
  return '';
}

// Texto por defecto que tenían las myo-reps hasta la v2; si quedó guardado tal cual, se descarta.
export const isLegacyMyoDesc = (desc) => typeof desc === 'string' && desc.startsWith('Serie de activación al fallo, 40" de descanso');

export const descOf = (item) => (item && item.desc != null ? item.desc : defaultDesc(item && item.type));

// ---------- Tipos de serie ----------
// `hint` es la explicación corta que se ve al elegir el tipo en la rutina.
export const SET_TYPES = {
  normal: {
    id: 'normal', label: 'Series normales', short: 'Normal', icon: 'list',
    hint: 'Las de siempre: mismo peso en todas, reps dentro del rango y el RIR que marque el objetivo.',
  },
  myo: {
    id: 'myo', label: 'Myo-reps', short: 'Myo-reps', icon: 'zap',
    hint: `Activación al fallo, ${MYO_REST_FIRST}" y ${MYO_MINIS} mini-series con las reps de la tabla, con ${MYO_REST}" entre ellas, y una última al fallo.`,
  },
  restpause: {
    id: 'restpause', label: 'Rest-pause', short: 'Rest-pause', icon: 'clock',
    hint: 'Una sola serie troceada: haces la tanda, descansas unos segundos y sigues hasta completar el esquema.',
  },
  dropset: {
    id: 'dropset', label: 'Drop set', short: 'Drop set', icon: 'arrow-down',
    hint: 'Cada serie es una cascada: llegas al tope, bajas el peso y sigues sin descanso hasta el último escalón.',
  },
};

export const typeLabel = (t) => SET_TYPES[t]?.short || 'Normal';

// Escalones de un drop set: los del esquema y, si se pide, el último al fallo.
export const dropSteps = (plan) => [...((plan && plan.dropScheme) || []), ...(plan && plan.dropFail ? ['fallo'] : [])];

// Prescripción de partida al añadir un ejercicio de cada tipo.
// Un sitio único para que la rutina y el «ejercicio suelto» del entreno empiecen igual.
export function defaultPlan(type = 'normal') {
  switch (type) {
    case 'myo': return { type, sets: 1 };
    case 'restpause': return { type, sets: 1, scheme: [10, 10, 10], clusterRest: 20 };
    case 'dropset': return { type, sets: 2, dropScheme: [6, 8], dropPct: 20, dropFail: true };
    default: return { type, sets: 3, repsMin: 8, repsMax: 10, rir: '0-1', rirMax: 1 };
  }
}

// ---------- Biblioteca de ejercicios ----------
// step: incremento mínimo real disponible en el gimnasio (kg). Manda sobre el del perfil.
//       1,25 kg en poleas, máquinas de placas y lastre (basta con colgar el disco de sobrecarga);
//       en mancuernas y barras no baja de 2,5 kg porque no hay medio escalón que poner.
// bw:   el peso corporal forma parte de la carga (fondos, dominadas…).
const EXERCISES = [
  ['curl-femoral', 'Curl femoral', 'femoral', 'Máquina', 5, { secondary: ['gluteo'] }],
  ['aductor', 'Máquina aductor', 'aductor', 'Máquina', 5],
  ['abductor', 'Máquina abductor', 'abductor', 'Máquina', 5, { secondary: ['gluteo'] }],
  ['gemelo', 'Máquina gemelo', 'gemelo', 'Máquina', 5],
  ['hack-squat', 'Hack squat', 'cuadriceps', 'Máquina', 5, { secondary: ['gluteo'] }],
  ['prensa', 'Prensa 45°', 'cuadriceps', 'Máquina', 10, { secondary: ['gluteo', 'femoral'] }],
  ['extension-cuadriceps', 'Extensión de cuádriceps', 'cuadriceps', 'Máquina', 5],
  ['abdominales-maquina', 'Máquina de abdominales', 'abdomen', 'Máquina', 5],
  ['sentadilla-bulgara', 'Sentadilla búlgara', 'cuadriceps', 'Multipower', 5, { secondary: ['gluteo'] }],
  ['hip-thrust', 'Hip thrust', 'gluteo', 'Barra', 10, { secondary: ['femoral'] }],
  ['peso-muerto-rumano', 'Peso muerto rumano con mancuernas', 'femoral', 'Mancuernas', 2.5, { secondary: ['gluteo'] }],
  ['abdominales-polea', 'Abdominales en polea', 'abdomen', 'Polea', 1.25],

  ['press-militar-mancuerna', 'Press militar con mancuernas', 'hombro', 'Mancuernas', 2.5, { secondary: ['triceps'] }],
  ['laterales-mancuerna', 'Laterales con mancuernas', 'lateral', 'Mancuernas', 2.5],
  ['laterales-polea', 'Laterales en polea con muñequeras', 'lateral', 'Polea', 1.25],
  ['posterior-polea', 'Posterior en polea', 'posterior', 'Polea', 1.25],
  ['curl-biceps-polea', 'Curl de bíceps en polea a una mano con banco', 'biceps', 'Polea', 1.25],
  ['curl-biceps-inclinado', 'Curl bíceps inclinado con mancuerna', 'biceps', 'Mancuernas', 2.5],
  ['triceps-cruzado', 'Extensión de tríceps cruzado', 'triceps', 'Polea', 1.25],
  ['triceps-barra', 'Extensión de tríceps con barra W', 'triceps', 'Polea', 1.25],
  ['jalon', 'Jalón agarre neutro', 'espalda', 'Polea', 5, { secondary: ['biceps'] }],
  ['remo-polea-alta', 'Máquina de remo alto', 'espalda', 'Máquina', 5, { secondary: ['posterior'] }],
  ['remo-t', 'Remo T agarre cerrado', 'espalda', 'Barra', 5, { secondary: ['biceps'] }],
  ['pull-over', 'Pull over con mancuerna', 'espalda', 'Mancuernas', 2.5, { secondary: ['pecho'] }],
  ['press-pectoral-maquina', 'Press pectoral en máquina', 'pecho', 'Máquina', 1.25, { secondary: ['triceps'] }],
  ['press-inclinado-mancuernas', 'Press inclinado con mancuernas', 'pecho', 'Mancuernas', 2.5, { secondary: ['hombro', 'triceps'] }],
  ['fondos', 'Fondos', 'pecho', 'Peso corporal', 1.25, { secondary: ['triceps'], bw: true }],
];

export const EQUIPMENT = ['Máquina', 'Polea', 'Mancuernas', 'Barra', 'Multipower', 'Peso corporal', 'Otro'];

export function defaultExercises() {
  return EXERCISES.map(([id, name, muscle, equipment, step, opts = {}]) => ({
    id,
    name,
    muscle,
    secondary: opts.secondary || [],
    equipment,
    step,
    bw: !!opts.bw,
    notes: '',
    archived: false,
  }));
}
