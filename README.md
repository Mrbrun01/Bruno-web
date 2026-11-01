# Bruno · web modular (v4.5)

Cada herramienta es una página independiente (`index.html` propia). Todas comparten tema, estilos visuales,
menú lateral y preferencias (nombre, sonido, barra lateral).

## Estructura

```
index.html · inicio.css · inicio.js     Página principal
ajustes/                                 Personalización (se abre pulsando el nombre del menú)
assets/
  js/tools.js                            Catálogo de herramientas (fuente única: menú y tarjetas de Inicio)
  js/core.js                             Núcleo: menú lateral, tema, estilo, nombre, avisos, iconos…
  js/search.js · css/search.css          Caja de búsqueda (Inicio + Buscador)
  js/theme-init.js                       Aplica tema/estilo antes de pintar (evita parpadeos)
  css/bruno.css                          Temas, base y componentes compartidos
estudiar/         horario · calendario · notas · board · pizarra
practicar/        verbos · porque · modalidades · crear · personalizado   (+ ejercicios.js/.css compartidos)
mates-y-tiempo/   calculadora · reloj
juegos/           adivina · tres-en-raya · ajedrez · snake · fruit-merge · parchis · uno · el-tapete   (+ juegos.css)
video-y-busqueda/ brunotube · buscador
```

Cada herramienta vive en `categoria/herramienta/` con `index.html`, `herramienta.js` y, si lo necesita,
`herramienta.css`.

## Añadir una herramienta

1. Copia la carpeta de otra herramienta (p. ej. `juegos/adivina/`) a la categoría que quieras y renombra sus archivos.
2. En `assets/js/tools.js` añade una entrada (`id`, `path`, `group`, `icon`, `title`, `desc`, `tile`).
3. En tu `.js`, `registerView({ id: '...', mount(root) { ... } })`. El título y la descripción salen del catálogo.
4. Ajusta las rutas `../../` del `index.html` si cambias de profundidad. Nada más: el menú y Inicio la recogen solos.

## Creador de ejercicios y herramientas propias

En `practicar/crear/` se escribe un ejercicio (preguntas, tabla de referencia…) y se puede **añadir a la web como una herramienta
más**: se le da un nombre y un icono, y aparece en el menú (dentro de «Practicar») y en Inicio, igual que las demás.

- **Mis herramientas** (pestaña del Creador): abrir, editar, exportar a `.json`, eliminar e importar. Mientras se edita una herramienta,
  «Aplicar y practicar» también la guarda.
- **Dónde viven:** en el navegador (`localStorage`): un índice pequeño (`crear:herramientas`: nombre, icono, nº de preguntas) que lee
  cada página para pintar el menú —véase `custom` en `assets/js/core.js`—, y un ejercicio por herramienta (`crear:ejercicio:<id>`).
  Todas se abren en `practicar/personalizado/?id=<id>`, una única página que ejecuta el ejercicio guardado. Exportar/importar sirve
  para llevarlas a otro navegador o dispositivo.
- **Icono:** se dibuja en una ventana (ratón, dedo o lápiz) o se elige de una lista. El dibujo pasa por `practicar/crear/vectorizar.js`,
  que lo limpia y lo convierte en SVG: rectas rectas (alineadas a 0°, 45° y 90° si van casi así), esquinas calculadas como cruce de rectas,
  círculos, elipses y rectángulos reconocidos, curvas ajustadas a arcos o a curvas Bézier, y extremos cercanos unidos. El deslizador
  «Corrección» regula cuánto corrige. `vectorizar.js` no usa el DOM, así que se puede probar con Node.
  Solo se guardan comandos de trazado (`M L C A Z…`), validados al leerlos.

## El Tapete (Blackjack, Tute, Póker y Solitario)

Es una sola herramienta con cuatro mesas, que se eligen con pestañas (o con `#blackjack`, `#tute`, `#poker`, `#solitario`
en la dirección). Su CSS usa nombres como `.card`, `.btn` o `.chip`, que chocarían con los estilos compartidos, así que el
juego se monta dentro de un *shadow root*. Su aspecto no tiene colores ni tipografías propios: `tapete.css` usa solo las
variables del tema compartido (`--surface`, `--ink`, `--line`, `--hi`…), que sí atraviesan el shadow root, así que el juego
sigue el estilo (Index, Board, Fiz…) y el tema claro/oscuro que se elija. Las cartas son siempre claras, como el papel.

## Cómo abrirla

Funciona desde cualquier servidor o hosting estático. Las preferencias y datos se guardan en `localStorage`, que
solo se comparte entre páginas del mismo origen: si la abres haciendo doble clic (`file://`), algunos navegadores
tratan cada archivo como un origen distinto y el tema/datos no se compartirían. En ese caso, usa un servidor local
(`python3 -m http.server`).

## Diferencia con la versión de una sola página

Al cambiar de herramienta se recarga la página, así que lo que solo estaba en memoria ya no sobrevive:
un temporizador en marcha, un dibujo de Pizarra sin descargar, una partida empezada o la lista de vídeos de BrunoTube.
Lo que se guardaba en el navegador (horario, calendario, notas, board, récords, progreso de ejercicios…) sigue igual,
con las mismas claves.
