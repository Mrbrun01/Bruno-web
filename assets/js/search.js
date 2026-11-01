'use strict';

/* =========================================================
   BUSCADOR (lo comparten Inicio y la vista «Buscador»)
   ========================================================= */
const ENGINES = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=' },
  { id: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' }
];

function searchUrl(engineId, query) {
  const q = query.trim();
  const maps = /^\/maps\b\s*(.*)$/i.exec(q);
  if (maps) return 'https://www.google.com/maps' + (maps[1] ? '/search/' + encodeURIComponent(maps[1]) : '');
  const e = ENGINES.find((x) => x.id === engineId) || ENGINES[0];
  if (e.cse) return 'https://cse.google.com/cse?cx=' + e.cse + '&gsc.tab=0&q=' + encodeURIComponent(q);
  return e.url + encodeURIComponent(q);
}

function makeSearch({ big = false } = {}) {
  let engine = store.get('ui-buscador', 'google');
  if (!ENGINES.some((e) => e.id === engine)) engine = 'google';

  const input = h('input', { class: 'input search-input', type: 'search', name: 'q', placeholder: '¡A buscar se ha dicho!', 'aria-label': 'Buscar en la web', autocomplete: 'off', enterkeyhint: 'search' });
  const chips = h('div', { class: 'seg search-engines', role: 'radiogroup', 'aria-label': 'Buscador' });
  const form = h('form', { class: 'search' + (big ? ' search-big' : ''), role: 'search' },
    h('div', { class: 'search-row' }, input, h('button', { class: 'btn primary', type: 'submit', html: icon('search') + '<span>Buscar</span>' })),
    chips);

  function paint() {
    chips.textContent = '';
    ENGINES.forEach((e) => {
      chips.append(h('button', { type: 'button', role: 'radio', 'aria-checked': String(e.id === engine), 'aria-pressed': String(e.id === engine), text: e.name, onclick: () => set(e.id) }));
    });
  }
  function set(id, silent) {
    engine = id;
    if (!silent) store.set('ui-buscador', id);
    paint();
    if (!silent) form.dispatchEvent(new CustomEvent('engine', { detail: id }));
  }
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!input.value.trim()) { input.focus(); return; }
    window.open(searchUrl(engine, input.value), '_blank', 'noopener');
  });
  paint();
  return {
    el: form, input,
    get engine() { return engine; },
    set,
    refresh() { const s = store.get('ui-buscador', 'google'); if (s !== engine && ENGINES.some((e) => e.id === s)) set(s, true); }
  };
}
