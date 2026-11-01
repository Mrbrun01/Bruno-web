'use strict';
/* =========================================================
   CATÁLOGO DE HERRAMIENTAS  (única fuente de verdad)
   Lo leen el menú lateral y las tarjetas de Inicio.
   Para añadir una herramienta: crea su carpeta, añade una entrada aquí
   y enlaza su index.html (mira el README).

   path   carpeta de la herramienta, relativa a la raíz de la web
   group  clave de GROUPS (decide en qué bloque del menú aparece)
   icon   nombre de un icono de ICONS (core.js)
   tile   texto corto de la tarjeta en Inicio (si falta, se usa desc)
   short  nombre corto para el menú (si falta, se usa title)
   ========================================================= */
const GROUPS = {
  inicio: '',
  estudiar: 'Estudiar',
  practicar: 'Practicar',
  mates: 'Mates y tiempo',
  juegos: 'Juegos',
  ocio: 'Vídeo y búsqueda'
};

const TOOLS = [
  { id: 'inicio', path: '', group: 'inicio', icon: 'home', title: 'Inicio', noHead: true,
    desc: 'Tu página de inicio.' },
  { id: 'horario', path: 'estudiar/horario/', group: 'estudiar', icon: 'horario', title: 'Horario',
    desc: 'Apunta tus clases por día y hora. Se guarda en este navegador.',
    tile: 'Tus clases de la semana' },
  { id: 'calendario', path: 'estudiar/calendario/', group: 'estudiar', icon: 'calendar', title: 'Calendario',
    desc: 'Marca exámenes, entregas y planes. Cada evento lleva su color.',
    tile: 'Exámenes, entregas y planes' },
  { id: 'notas', path: 'estudiar/notas/', group: 'estudiar', icon: 'notes', title: 'Notas',
    desc: 'Tareas y apuntes rápidos, con colores y favoritas. Se guardan en este navegador.',
    tile: 'Tareas y apuntes rápidos' },
  { id: 'board', path: 'estudiar/board/', group: 'estudiar', icon: 'board', title: 'Board',
    desc: 'Una nota rápida con formato que se guarda sola en este navegador.',
    tile: 'Nota rápida con formato' },
  { id: 'pizarra', path: 'estudiar/pizarra/', group: 'estudiar', icon: 'palette', title: 'Pizarra',
    desc: 'Dibuja, rellena y descarga tu pizarra como imagen PNG.',
    tile: 'Dibuja y descarga tu pizarra' },
  { id: 'verbos', path: 'practicar/verbos/', group: 'practicar', icon: 'verbs', title: 'Verbos irregulares',
    desc: 'Practica el pasado simple y el participio de los verbos irregulares en inglés: frases, tabla de referencia y ejercicios de completar.',
    tile: 'Pasado y participio en inglés' },
  { id: 'porque', path: 'practicar/porque/', group: 'practicar', icon: 'spell', title: 'Porque, porqué, por que, por qué', short: 'Porque y porqué',
    desc: 'Elige la forma correcta para completar cada oración.',
    tile: 'Elige la forma correcta' },
  { id: 'modalidades', path: 'practicar/modalidades/', group: 'practicar', icon: 'chat', title: 'Modalidades oracionales', short: 'Modalidades',
    desc: 'Identifica el tipo de modalidad de cada oración.',
    tile: 'Enunciativa, interrogativa, dubitativa…' },
  { id: 'crear', path: 'practicar/crear/', group: 'practicar', icon: 'plus', title: 'Creador de ejercicios',
    desc: 'Crea tu propio ejercicio con preguntas, categorías y tabla de repaso. Se guarda en este navegador.',
    tile: 'Crea tus propios ejercicios' },
  { id: 'calculadora', path: 'mates-y-tiempo/calculadora/', group: 'mates', icon: 'calc', title: 'Calculadora',
    desc: 'Básica y científica, con memoria, historial y un conversor de unidades.',
    tile: 'Científica, memoria y conversor' },
  { id: 'reloj', path: 'mates-y-tiempo/reloj/', group: 'mates', icon: 'clock', title: 'Reloj',
    desc: 'Hora, temporizador con alarma, cronómetro con vueltas y zonas horarias.',
    tile: 'Hora, temporizador y zonas horarias' },
  { id: 'adivina', path: 'juegos/adivina/', group: 'juegos', icon: 'guess', title: 'Adivina el número',
    desc: 'Piensa en un número del 1 al 100… ¿en cuántos intentos lo encuentras?',
    tile: 'Del 1 al 100, en pocos intentos' },
  { id: 'tres-en-raya', path: 'juegos/tres-en-raya/', group: 'juegos', icon: 'ttt', title: 'Tres en raya',
    desc: 'Dos jugadores en la misma pantalla, o contra la máquina.',
    tile: 'Dos jugadores o contra la máquina' },
  { id: 'ajedrez', path: 'juegos/ajedrez/', group: 'juegos', icon: 'pawn', title: 'Ajedrez',
    desc: 'Dos jugadores en la misma pantalla, o contra la máquina. Con enroque, captura al paso y coronación.',
    tile: 'Con enroque y captura al paso' },
  { id: 'snake', path: 'juegos/snake/', group: 'juegos', icon: 'snake', title: 'Snake',
    desc: 'La serpiente clásica: come, crece y no choques contigo misma.',
    tile: 'La serpiente clásica' },
  { id: 'fruit-merge', path: 'juegos/fruit-merge/', group: 'juegos', icon: 'fruit', title: 'Fruit Merge',
    desc: 'Deja caer frutas y fusiona las iguales para crear frutas más grandes.',
    tile: 'Fusiona frutas iguales' },
  { id: 'parchis', path: 'juegos/parchis/', group: 'juegos', icon: 'dice', title: 'Parchís',
    desc: 'De 2 a 4 jugadores en la misma pantalla, con casillas seguras y capturas.',
    tile: 'De 2 a 4 jugadores' },
  { id: 'uno', path: 'juegos/uno/', group: 'juegos', icon: 'cards', title: 'UNO',
    desc: 'De 2 a 4 jugadores pasándose el mismo dispositivo.',
    tile: 'De 2 a 4 jugadores, mismo dispositivo' },
  { id: 'el-tapete', path: 'juegos/el-tapete/', group: 'juegos', icon: 'spade', title: 'El Tapete',
    desc: 'Blackjack, Tute, Póker y Solitario. Contra la IA o con amigos en el mismo dispositivo.',
    tile: 'Blackjack, Tute, Póker y Solitario' },
  { id: 'brunotube', path: 'video-y-busqueda/brunotube/', group: 'ocio', icon: 'play', title: 'BrunoTube',
    desc: 'Reproduce tus vídeos locales. Ningún archivo se sube a internet.',
    tile: 'Reproduce vídeos de tu equipo' },
  { id: 'buscador', path: 'video-y-busqueda/buscador/', group: 'ocio', icon: 'search', title: 'Buscador',
    desc: 'Busca con Google o DuckDuckGo desde un mismo cuadro.',
    tile: 'Google o DuckDuckGo' },
  { id: 'ajustes', path: 'ajustes/', group: 'ajustes', icon: 'gear', title: 'Personalización',
    desc: 'Cambia tu nombre, el tema, el estilo visual y cómo se ve la barra lateral.' }
];
