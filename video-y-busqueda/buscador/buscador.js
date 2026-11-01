'use strict';

/* =========================================================
   BUSCADOR (Google y DuckDuckGo)
   ========================================================= */
registerView({
  id: 'buscador',
  mount(root) {
    const search = makeSearch({ big: true });
    const logo = h('p', { class: 'bs-logo', 'aria-hidden': 'true' });
    const acKey = 'ui-autocompletado';
    const acBtn = h('button', { class: 'btn sm', type: 'button', 'aria-pressed': 'false' });
    let ac = store.get(acKey) === '1';
    function paint() {
      const e = ENGINES.find((x) => x.id === search.engine) || ENGINES[0];
      logo.textContent = e.name;
      search.input.setAttribute('autocomplete', ac ? 'on' : 'off');
      acBtn.textContent = ac ? 'Autocompletado: activado' : 'Autocompletado: desactivado';
      acBtn.setAttribute('aria-pressed', String(ac));
    }
    acBtn.addEventListener('click', () => { ac = !ac; store.set(acKey, ac ? '1' : '0'); paint(); });
    search.el.addEventListener('engine', paint);

    const hint = h('p', { class: 'muted bs-hint' }, 'Consejo: escribe ', h('span', { class: 'kbd', text: '/maps' }), ' seguido de un lugar para abrirlo en Google Maps.');
    root.append(h('div', { class: 'card bs-card' }, logo, search.el, h('div', { class: 'bs-tools' }, acBtn), hint));
    paint();
    return { show() { search.refresh(); paint(); search.input.focus({ preventScroll: true }); } };
  }
});
