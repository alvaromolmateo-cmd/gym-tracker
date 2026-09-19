# GymTracker

Plataforma personal de entrenamientos: la libreta del gimnasio, pero que hace las cuentas sola.
Registra la sesión en vivo, calcula la sobrecarga progresiva que toca en cada ejercicio y saca las
estadísticas que de verdad dicen si estás progresando.

**En marcha:** https://alvaromolmateo-cmd.github.io/gym-tracker/

Aplicación web instalable (PWA), sin build ni dependencias: HTML, CSS y módulos ES. Todo se guarda
en el dispositivo (`localStorage`), funciona sin cobertura y se puede exportar a JSON.

---

## Qué hace

### Entreno
La vista principal. Propone el día que toca, y dentro de cada ejercicio muestra:

- **La prescripción en fichas**: el nombre del ejercicio con su técnica al lado (myo-reps,
  rest-pause o drop set) y debajo, en fichas sueltas, lo que toca hacer — series / reps / RIR en las
  normales, y lo suyo en cada técnica: tandas y descanso en un rest-pause, escalones y % de bajada
  en un drop set, activación y mini-series en unas myo-reps. El tempo y las notas solo salen si las
  has escrito.
- **Qué hacer hoy**: peso y reps sugeridos por el motor de progresión, con el motivo explicado.
- **La última vez**: lo que levantaste, con tus anotaciones, y un botón para copiar los pesos.
  Siempre con la misma técnica y, si lo hay, del mismo día de la rutina (ver
  [Con qué se compara cada ejercicio](#con-qué-se-compara-cada-ejercicio)).
- **Las casillas para apuntar**, adaptadas al tipo de serie (normales, myo-reps, rest-pause, drop set).
- **Anotaciones** por ejercicio y nota del día al cerrar, como en la libreta de siempre.

**Sin cronómetros de descanso**: se descansa por sensaciones. Los únicos pautados son los de las
myo-reps, y ahí la app se limita a recordarte los 40" y los 20"; no hay temporizador que mirar en
mitad de la serie.

**Sin reloj de sesión tampoco**: es fácil olvidarse de cerrar el entreno y el tiempo acabaría
mintiendo. Lo que se mide, en la cabecera y al terminar, es **reps · series · tonelaje**.

### Historial
Una semana por pantalla, con sus cuatro días, todo lo levantado, los récords del día y tus notas.
Se puede retomar, editar la fecha o borrar cualquier entreno.

### Rutina
La planificación actual, editable, con las mismas fichas que el entreno. Tocas cualquier ejercicio y
se abre su ficha: **selector de técnica** (cada una con sus campos propios), series, reps o esquema,
RIR, tempo, nota y **texto descriptivo**, con una **vista previa en vivo** de cómo se verá en el
entreno — así no hay forma de confundir «2 series de 6→8» con «3 escalones». Muestra el volumen
semanal planificado por grupo muscular.

### Progreso
Tonelaje por semana, volumen por grupo muscular contra el rango de referencia, progresión real
frente al objetivo teórico de cada grupo, 1RM estimado por ejercicio, récords y adherencia.

### Ejercicios
La biblioteca, con el grupo muscular, el material, el **incremento mínimo real** que hay en tu
gimnasio para ese ejercicio (elegible de un toque entre 1,25 / 2,5 / 5 / 10 kg), el perfil de
progresión que le corresponde y su histórico.

En poleas, máquinas de placas y lastre el escalón es de **1,25 kg** —basta con colgar el disco de
sobrecarga—, y eso permite subir laterales, tríceps o curl en polea sin pegar saltos del 8 %. En
mancuernas y barras se queda en 2,5 kg, que es lo que de verdad se puede poner.

### Ajustes
Preferencias, la tarjeta **Aplicación** (versión instalada y cómo instalarla en el móvil), copia de
seguridad y la letra pequeña: cómo calcula la app la sobrecarga progresiva, con qué se compara cada
ejercicio, qué son y cómo se cuentan las **myo-reps, el rest-pause y los drop sets**, las series
efectivas y el 1RM estimado, y una sección de **referencias** con lo que aporta cada una.

---

## Sobrecarga progresiva

El motor no aplica «+2,5 kg a todo». Usa **doble progresión** (primero reps dentro del rango, luego
carga) con el salto calculado como porcentaje del peso actual, y ese porcentaje **depende del grupo
muscular**.

### De dónde salen los números

- **ACSM (2009), _Progression models in resistance training for healthy adults_.** Recomienda subir
  la carga entre un **2 % y un 10 %**, con el extremo bajo para ejercicios de poca masa muscular y
  el alto para los de mucha, cuando se logran 1-2 repeticiones por encima del objetivo.
  <https://pubmed.ncbi.nlm.nih.gov/19204579/>
- **Regla 2×2 (NSCA, _Essentials of Strength Training and Conditioning_).** Esa condición debe
  cumplirse en **dos sesiones seguidas** antes de subir carga.
- **Simão et al. (2012), _Sports Medicine_, «Exercise order in resistance training».** Un ejercicio
  rinde menos repeticiones cuando va al final de la sesión que cuando va al principio. Por eso cada
  ejercicio se compara con lo que hiciste en el mismo día de la rutina.
  <https://pubmed.ncbi.nlm.nih.gov/22292516/>
- **Nunes et al. (2023), PLOS ONE.** En personas ya entrenadas el **tren inferior progresa más
  rápido por semana** que el superior. Por eso el objetivo semanal no es el mismo en una prensa que
  en unos laterales. <https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0284216>
- **Baz-Valle et al. (2022), _Journal of Human Kinetics_.** **12-20 series semanales** por grupo
  muscular como zona de referencia en gente entrenada, con relación dosis-respuesta en forma de U
  invertida. <https://pubmed.ncbi.nlm.nih.gov/35291645/>
- **Sødal et al. (2023) y trabajos posteriores sobre cluster sets.** Rest-pause, drop sets y series
  agrupadas producen adaptaciones **comparables a las series tradicionales** cuando se igualan
  volumen y esfuerzo; su ventaja es la eficiencia de tiempo. Por eso aquí cuentan como volumen
  efectivo, pero no como series completas.
- **Prestes et al. (2019), _J Strength Cond Res_.** Rest-pause frente a series tradicionales en
  sujetos entrenados: mismo trabajo en menos tiempo y más repeticiones cerca del fallo.
- **Schoenfeld y Grgic (2018), _Strength and Conditioning Journal_; Fink et al. (2018).** Los drop
  sets suman volumen efectivo en menos tiempo; de ahí que cada escalón extra cuente media serie.

### Perfil por grupo muscular

| Grupo | Salto (banda ACSM) | Incremento típico | Objetivo semanal | Series/semana |
|---|---|---|---|---|
| Cuádriceps | 5-10 % | 5 kg | ≈2,0 % | 12-20 |
| Glúteo | 5-10 % | 5-10 kg | ≈2,0 % | 10-18 |
| Gemelo | 5-10 % | 5 kg | ≈1,5 % | 8-16 |
| Isquiosurales | 4-8 % | 2,5-5 kg | ≈1,5 % | 10-18 |
| Aductor / Abductor | 4-8 % | 5 kg | ≈1,5 % | 6-12 |
| Espalda | 3-6 % | 2,5-5 kg | ≈1,2 % | 12-20 |
| Abdomen | 3-6 % | 2,5 kg | ≈1,0 % | 8-16 |
| Pecho | 2,5-5 % | 2,5 kg | ≈1,0 % | 10-18 |
| Hombro anterior | 2-4 % | 2,5 kg | ≈0,8 % | 8-16 |
| Tríceps | 2-4 % | 2,5 kg | ≈0,8 % | 10-18 |
| Bíceps | 2-4 % | 1,25-2,5 kg | ≈0,7 % | 10-18 |
| Hombro lateral / posterior | 1-3 % | 1-2,5 kg | ≈0,6 % | 10-20 |

### El caso interesante: cuando el material no te deja

En unos laterales de 12,5 kg el siguiente par de mancuernas son 15 kg: un salto del **20 %**, muy por
encima del 1-3 % que le toca al hombro lateral. Ahí la app **no sube el peso**: te dice que
repitas carga y sumes repeticiones, y solo propone el salto cuando encadenas dos sesiones cumpliendo
el objetivo (regla 2×2) o sacas dos repeticiones de más. Lo mismo pasa con el press inclinado con
mancuernas o el press de pecho en máquina.

### Con qué se compara cada ejercicio

Cada sugerencia sale de la **última vez que hiciste ese ejercicio con la misma técnica y en el mismo
día de la rutina**:

- **Misma técnica.** Unas myo-reps solo se comparan con myo-reps y un drop set con drop sets. Si la
  extensión de cuádriceps va en drop set el día de cuádriceps y en myo-reps el de femoral, cada día
  progresa con lo suyo y la información de una técnica no se cuela en la otra.
- **Mismo día.** Aunque la técnica coincida, no rinde igual un ejercicio al principio del entreno que
  al final con toda la fatiga encima (Simão et al., 2012). Unas laterales que van segundas en «Brazo
  + Espalda» y últimas en «Brazo + Pecho» llevan cada una su propia progresión; mezclarlas haría que
  la sugerencia fuese en zigzag, pidiéndote de más el día cansado y de menos el día fresco.
- **Si en ese día aún no lo has hecho** (un ejercicio recién añadido, o un día nuevo), se toma como
  referencia la última vez con la misma técnica en otro día, avisando de cuál. Solo sirve para
  arrancar con ese peso: desde ese entreno ya se compara con su propio día.
- Un ejercicio que se quedó sin apuntar no cuenta como «la última vez».

### Criterio de «listo para subir» según el tipo de serie

| Tipo | Cuándo sube |
|---|---|
| Normales | Todas las series llegan al tope del rango **y** con el RIR dentro del objetivo |
| Myo-reps | La serie de activación pasa de 12 repeticiones (fuera de la banda 9-12) |
| Rest-pause | Se completa el total de repeticiones del esquema |
| Drop set | Se cumplen las repeticiones del primer escalón |

Si te quedas por debajo del rango en la mayoría de las series, propone bajar carga y reconstruir.
Si sacas las reps pero con demasiado margen de RIR, mantiene el peso: lo que falta es intensidad,
no carga.

---

## Técnicas especiales

Cada técnica se apunta con las casillas que le corresponden, y en la rutina se edita con sus propios
campos:

| Técnica | Qué se prescribe | Qué se apunta | Cuándo sube la carga |
|---|---|---|---|
| **Myo-reps** | nada: la secuencia es fija | peso, activación y cada tramo | activación por encima de 12 reps |
| **Rest-pause** | esquema de tandas (8+5+5+3…) y descanso entre ellas | peso y reps de cada tanda, con el total en vivo | se completa el total del esquema |
| **Drop set** | escalones de reps (6→8), nº de series, % de bajada y si el último va al fallo | peso y reps de cada escalón, con la cascada sugerida | se cumplen las reps del primer escalón |

Ojo con los drop sets: **«2 × (6 → 8)» son 2 series**, cada una con dos escalones. Los escalones no
son series, y por eso la app los enseña como «Serie 1 de 2» con sus escalones dentro.

## Myo-reps

Secuencia del entrenador, siempre la misma:

**1.ª serie al fallo → 40" → mini-serie → 20" → mini-serie → 20" → serie final al fallo.**

Las reps de las dos mini-series salen de la tabla, según lo que hayas sacado en la de activación:

| Si en la activación llegas a | Cada mini-serie |
|---|---|
| 6-8 reps | 2 reps |
| 9-12 reps | 3 reps |
| 13-16 reps | 4 reps |
| 17-20 reps | 5 reps |

En cuanto apuntas las repeticiones de la activación, la app te dice cuántas tocan en cada mini-serie
y te recuerda los descansos (no los cronometra). Por debajo de 6 avisa de que el peso se ha ido;
por encima de 20, de que es demasiado ligero.

---

## Cómo se cuentan las cosas

- **Tonelaje**: peso × repeticiones de cada serie. En ejercicios que tiran del peso corporal
  (fondos) se le suma tu peso, que se configura en Ajustes.
- **Series efectivas**: una serie normal cuenta 1. En myo-reps, rest-pause y drop sets la tanda
  inicial cuenta 1 y **cada tramo extra 0,5**, porque comparten la fatiga de la primera y no
  equivalen a series completas. Los músculos secundarios de un ejercicio suman la mitad.
- **1RM estimado**: fórmula de Epley sumando las repeticiones en reserva
  (`peso × (1 + (reps + RIR) / 30)`), limitada a 12 repeticiones efectivas porque más allá pierde
  fiabilidad. En myo-reps y rest-pause se toma la serie de activación, que va al fallo. Es un
  indicador de tendencia, no una marca real.
- **Progresión real**: cambio semanal medio del 1RM estimado, comparado con el objetivo del grupo.
- **Racha**: semanas seguidas completando todos los días de la rutina.

---

## Datos de partida

La app arranca con una **rutina de ejemplo** de cuatro días (pierna y torso alternos) hecha con los
ejercicios del catálogo, con un ejemplo de cada técnica: myo-reps, rest-pause y drop set. Se cambia
entera desde Rutina. El **historial empieza vacío** y la semana 1 es la semana en que se empieza a
usar la app (también se cambia desde Rutina).

Las versiones anteriores a la 1.4 venían con una semana de entrenos de ejemplo ya registrada. Quien
la tenga puede quitarla desde Ajustes → «Quitar los entrenos de ejemplo», que borra solo esos
entrenos y deja el resto intacto.

## Tus datos entre versiones

Todo se guarda en el propio navegador (`localStorage`); actualizar la app no borra nada:

- Los datos de ejemplo solo se usan la primera vez, cuando no hay nada guardado.
- Cuando cambia la estructura de los datos, la app los adapta (`migrate` en `store.js`) y antes
  guarda una **copia automática** tal cual estaban, que se puede descargar desde Ajustes.
- Si algún día no pudiera leerlos, los **aparta sin borrarlos** en vez de empezar encima, y avisa.
- Pide al navegador almacenamiento persistente para que no los borre cuando ande justo de espacio.
  Aun así, en iPhone conviene instalarla en la pantalla de inicio y exportar una copia de vez en cuando.

---

## Estructura

```
index.html            capa de la app, iconos SVG en línea
css/styles.css        tokens de diseño, componentes y responsive
js/
  app.js              enrutado por hash, tema, service worker, instalación
  catalog.js          grupos musculares, perfiles de progresión, tabla de myo-reps, ejercicios
  seed.js             rutina de ejemplo y detección del historial de ejemplo antiguo
  store.js            estado y persistencia (única capa que toca localStorage)
  sets.js             matemática de las series: reps, tonelaje, series efectivas, 1RM
  progression.js      motor de sobrecarga progresiva
  metrics.js          agregados: semanas, volumen por grupo, récords, adherencia
  charts.js           gráficas SVG a mano
  ui.js               escape, iconos, formato, modal y avisos
  views/              entreno, historial, rutina, progreso, ejercicios, ajustes
tools/make-icons.js   genera los iconos PNG de la PWA sin dependencias
sw.js                 service worker (red primero, caché si falla)
```

---

## Desarrollo

```bash
# servir en local (hace falta un servidor: son módulos ES)
python -m http.server 5177

# regenerar los iconos tras tocar la paleta
node tools/make-icons.js
```

Al cambiar cualquier archivo de la lista `ASSETS`, sube `VERSION` en `sw.js` (y la misma cifra en
`APP_VERSION`, en `js/views/settings.js`, que es la que se ve en Ajustes) para que el service
worker sirva la versión nueva.

---

## Pendiente

- Sincronización entre dispositivos (de momento, exportar/importar JSON desde Ajustes).
- Aviso de descarga (deload) cuando el rendimiento cae varias sesiones seguidas.
- Fotos o vídeos de técnica asociados al ejercicio.
