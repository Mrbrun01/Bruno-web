'use strict';

/* =========================================================
   INICIO
   Enlaces externos: edítalos aquí. Cada grupo es una tarjeta.
   ========================================================= */
const LINKS = [
  { title: 'Diccionarios', items: [
    ['RAE', 'https://dle.rae.es/'],
    ['RAG', 'https://academia.gal/dicionario'],
    ['WordReference', 'https://www.wordreference.com/']
  ] },
  { title: 'Aulas virtuales', items: [
    ['Edixgal', 'https://eva.edu.xunta.gal'],
    ['Aula virtual Masa', 'https://centros.edu.xunta.gal/iesmariasarmiento/aulavirtual/course/index.php?categoryid=216']
  ] },
  { title: 'YouTube', items: [
    ['YouTube', 'https://www.youtube.com/']
  ] },
  { title: 'Buscadores', items: [
    ['Google', 'https://www.google.com/'],
    ['DuckDuckGo', 'https://duckduckgo.com/'],
    ['Jujel', 'https://www.jujel.com']
  ] },
  { title: 'Estudio y mates', items: [
    ['Canva', 'https://canva.com'],
    ['Bruno AI', 'https://the-best-ai.lovable.app'],
    ['La calculadora de Alicia', 'https://lacalculadoradealicia.es']
  ] }
];


/* =========================================================
   VISTA DE INICIO
   ========================================================= */
function greeting(hour) {
  if (hour < 6) return 'Buenas noches';
  if (hour < 13) return 'Buenos días';
  if (hour < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

registerView({
  id: 'inicio',
  mount(root) {
    const search = makeSearch();
    const dateEl = h('p', { class: 'hero-date' });
    const greetEl = h('span');
    const nameEl = h('span', { 'data-name': true, text: app.name() });
    const title = h('h1', { class: 'hero-title', tabindex: '-1' }, greetEl, ', ', nameEl, '.');
    const clockTime = h('div', { class: 'clock-time' });
    const clockSec = h('div', { class: 'clock-sec' });

    const hero = h('section', { class: 'hero' },
      h('div', { class: 'hero-text' }, dateEl, title, search.el),
      h('div', { class: 'clock-note', role: 'timer', 'aria-label': 'Hora actual' },
        h('div', { class: 'clock-row', 'aria-hidden': 'true' }, clockTime, clockSec)));

    const todayBox = h('section', { class: 'today', 'aria-label': 'Hoy' });
    const toolsBox = h('section', { class: 'block' });
    const linksBox = h('section', { class: 'block' });
    root.append(hero, todayBox, toolsBox, linksBox);

    /* ---- Reloj ---- */
    let lastMin = '', lastDay = '', timer = null;
    function tick() {
      const now = new Date();
      const hm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
      if (hm !== lastMin) {
        lastMin = hm;
        clockTime.innerHTML = digitSpans(hm);
        const g = greeting(now.getHours());
        greetEl.textContent = g;
      }
      clockSec.innerHTML = digitSpans(pad2(now.getSeconds()));
      const day = isoDate(now);
      if (day !== lastDay) {
        lastDay = day;
        const long = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        dateEl.textContent = cap(long);
        renderToday();
      }
    }
    function schedule() { tick(); timer = setTimeout(schedule, 1000 - (Date.now() % 1000) + 5); }

    /* ---- Panel «Hoy»: lee Horario, Calendario y Notas ---- */
    function todayCard(title, link, body) {
      return h('article', { class: 'card today-card', tabindex: '0', role: 'link', 'aria-label': 'Ir a ' + title,
        onclick: () => app.go(link), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); app.go(link); } } },
        h('div', { class: 'today-head' }, h('h2', { text: title })),
        body);
    }
    function renderToday() {
      const now = new Date();
      const dayName = DAYS[now.getDay()];
      const nowHM = pad2(now.getHours()) + ':' + pad2(now.getMinutes());

      // Clases
      const clases = store.json('asignaturas', []).filter((a) => a && a.dia === dayName && a.nombre)
        .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
      let nextIdx = clases.findIndex((c) => c.hora >= nowHM);
      const cList = h('ul', { class: 'mini-list' });
      clases.forEach((c, i) => {
        cList.append(h('li', { class: c.hora < nowHM ? 'past' : '' },
          h('time', { class: 'num', text: c.hora }), h('span', { text: c.nombre }),
          i === nextIdx ? h('span', { class: 'chip tag-hi', text: 'Siguiente' }) : null));
      });
      const cBody = clases.length ? cList : h('p', { class: 'muted', text: 'Hoy no tienes clases apuntadas.' });

      // Agenda
      const evs = (store.json('events', {}) || {})[isoDate(now)] || [];
      const eList = h('ul', { class: 'mini-list' });
      evs.forEach((ev) => eList.append(h('li', null, h('i', { class: 'dot', style: 'background:' + (/^#[0-9a-f]{3,8}$/i.test(ev.color) ? ev.color : 'var(--blue)') }), h('span', { text: ev.name }))));
      const eBody = evs.length ? eList : h('p', { class: 'muted', text: 'No hay nada planeado para hoy.' });

      // Notas destacadas (o las últimas)
      const notas = store.json('notas', []).filter((n) => n && (n.titulo || n.contenido));
      const favs = notas.filter((n) => n.favorita);
      const show = (favs.length ? favs : notas.slice(-3).reverse()).slice(0, 3);
      const nList = h('ul', { class: 'mini-list' });
      show.forEach((n) => nList.append(h('li', null, h('i', { class: 'dot', style: 'background:' + (/^#[0-9a-f]{6}$/i.test(n.color) ? n.color : 'var(--line-2)') + ';border:1px solid var(--line-2)' }), h('span', { text: n.titulo || String(n.contenido).slice(0, 60) }))));
      const nBody = show.length ? nList : h('p', { class: 'muted', text: 'Todavía no has escrito ninguna nota.' });

      todayBox.textContent = '';
      todayBox.append(
        todayCard('Clases de hoy', 'horario', cBody),
        todayCard('Agenda de hoy', 'calendario', eBody),
        todayCard(favs.length ? 'Notas favoritas' : 'Notas recientes', 'notas', nBody));
    }

    /* ---- Herramientas ---- */
    function renderTools() {
      toolsBox.textContent = '';
      toolsBox.append(h('h2', { class: 'block-title', text: 'Herramientas' }));
      Object.keys(GROUPS).forEach((g) => {
        const vs = TOOLS.filter((v) => v.group === g && v.id !== 'inicio');
        if (!vs.length) return;
        const grid = h('div', { class: 'tiles' });
        vs.forEach((v) => grid.append(h('a', { class: 'tile', href: toolUrl(v.id) },
          h('span', { class: 'tile-ico', html: icon(v.icon) }),
          h('span', { class: 'tile-txt' }, h('b', { text: v.short || v.title }), h('small', { text: v.tile || v.desc })))));
        toolsBox.append(h('h3', { class: 'group-title', text: GROUPS[g] }), grid);
      });
    }

    /* ---- Enlaces externos ---- */
    function renderLinks() {
      linksBox.textContent = '';
      linksBox.append(h('h2', { class: 'block-title', text: 'Enlaces' }));
      const grid = h('div', { class: 'link-groups' });
      LINKS.forEach((g) => {
        const ul = h('ul', { class: 'link-list' });
        g.items.forEach(([label, url]) => ul.append(h('li', null,
          h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, h('span', { text: label }), h('span', { html: icon('external'), class: 'ext' })))));
        grid.append(h('section', { class: 'card link-card' }, h('h3', { text: g.title }), ul));
      });
      linksBox.append(grid);
    }

    renderTools();
    renderLinks();
        window.addEventListener('storage', () => { if (app.isActive('inicio')) renderToday(); });

    return {
      show() { search.refresh(); lastDay = ''; schedule(); },
      hide() { clearTimeout(timer); }
    };
  }
});
