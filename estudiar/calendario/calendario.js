'use strict';

/* =========================================================
   CALENDARIO
   Clave de almacenamiento: «events» (la misma de siempre)
   ========================================================= */
registerView({
  id: 'calendario',
  mount(root) {
    const KEY = 'events';
    const PRESETS = ['#3f5bd8', '#d1495b', '#edae49', '#2f9e5f', '#7b4bb7', '#1c8ea6'];
    const today = new Date();
    const state = { view: new Date(today.getFullYear(), today.getMonth(), 1), selected: isoDate(today), color: PRESETS[0], events: load() };

    function load() { const d = store.json(KEY, {}); return d && typeof d === 'object' && !Array.isArray(d) ? d : {}; }
    const save = () => store.setJson(KEY, state.events);
    const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : PRESETS[0]);

    const title = h('h2', { class: 'cal-title', 'aria-live': 'polite' });
    const daysEl = h('div', { class: 'cal-days', role: 'group', 'aria-label': 'Días del mes' });
    const calPanel = h('section', { class: 'card cal-panel', 'aria-label': 'Calendario' },
      h('div', { class: 'cal-head' }, title,
        h('button', { class: 'btn sm', type: 'button', text: 'Hoy', onclick: () => selectDate(isoDate(new Date()), false) }),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Exportar calendario', title: 'Exportar como JSON', html: icon('download'), onclick: exportCal }),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Mes anterior', html: icon('chevL'), onclick: () => changeMonth(-1) }),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Mes siguiente', html: icon('chevR'), onclick: () => changeMonth(1) })),
      h('div', { class: 'cal-weekdays', 'aria-hidden': 'true' }, ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => h('span', { text: d }))),
      daysEl);

    const dayTitle = h('h3', { class: 'cal-daytitle' });
    const dayCount = h('p', { class: 'muted cal-count' });
    const list = h('ul', { class: 'ev-list' });
    const nameIn = h('input', { class: 'input', id: 'c-name', type: 'text', maxlength: '80', placeholder: 'Nombre del evento', required: true, autocomplete: 'off' });
    const colorsEl = h('div', { class: 'ev-colors', role: 'group', 'aria-label': 'Color del evento' });
    const custom = h('input', { type: 'color', value: PRESETS[0], 'aria-label': 'Color personalizado' });
    colorsEl.append(custom);
    const form = h('form', { class: 'ev-form', autocomplete: 'off' },
      h('label', { class: 'field', for: 'c-name' }, 'Nuevo evento', nameIn), colorsEl,
      h('button', { class: 'btn primary', type: 'submit', text: 'Añadir evento' }));
    const side = h('aside', { class: 'card', 'aria-label': 'Eventos del día' }, dayTitle, dayCount, list, form);
    function exportCal() {
      if (!Object.keys(state.events).length) { toast('No hay eventos que exportar.'); return; }
      download('calendario.json', 'application/json', JSON.stringify(state.events, null, 2));
      toast('Calendario descargado como calendario.json.');
    }
    document.addEventListener('keydown', (e) => {
      if (!app.isActive('calendario') || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault(); exportCal();
    });
    root.append(h('div', { class: 'cal-layout' }, calPanel, side));

    function renderCalendar(focusISO) {
      const y = state.view.getFullYear(), m = state.view.getMonth();
      const offset = (new Date(y, m, 1).getDay() + 6) % 7;
      const total = new Date(y, m + 1, 0).getDate();
      const todayISO = isoDate(today);
      title.textContent = MONTHS[m] + ' ' + y;
      daysEl.textContent = '';
      for (let i = 0; i < offset; i++) daysEl.append(h('span', { class: 'cal-day empty' }));
      for (let d = 1; d <= total; d++) {
        const iso = isoDate(new Date(y, m, d));
        const evs = state.events[iso] || [];
        const dots = h('span', { class: 'dots' });
        evs.slice(0, 3).forEach((ev) => dots.append(h('i', { style: 'background:' + safeColor(ev.color) })));
        const label = fromISO(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + (evs.length ? ', ' + evs.length + (evs.length === 1 ? ' evento' : ' eventos') : '');
        daysEl.append(h('button', {
          type: 'button', class: 'cal-day' + (iso === todayISO ? ' today' : '') + (iso === state.selected ? ' selected' : ''),
          'data-date': iso, 'aria-pressed': String(iso === state.selected), 'aria-label': label, tabindex: iso === state.selected ? '0' : '-1'
        }, h('span', { text: String(d) }), dots));
      }
      if (!$('[tabindex="0"]', daysEl)) { const f = $('.cal-day:not(.empty)', daysEl); if (f) f.tabIndex = 0; }
      if (focusISO) { const t = $(`[data-date="${focusISO}"]`, daysEl); if (t) t.focus(); }
    }
    function selectDate(iso, focus) {
      state.selected = iso;
      const d = fromISO(iso);
      if (d.getMonth() !== state.view.getMonth() || d.getFullYear() !== state.view.getFullYear()) state.view = new Date(d.getFullYear(), d.getMonth(), 1);
      renderCalendar(focus ? iso : null);
      renderDay();
    }
    function changeMonth(delta) { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + delta, 1); renderCalendar(); }

    daysEl.addEventListener('click', (e) => { const b = e.target.closest('.cal-day[data-date]'); if (b) selectDate(b.dataset.date, true); });
    daysEl.addEventListener('keydown', (e) => {
      const b = e.target.closest('.cal-day[data-date]');
      const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (!b || !(e.key in steps)) return;
      e.preventDefault();
      const d = fromISO(b.dataset.date);
      d.setDate(d.getDate() + steps[e.key]);
      selectDate(isoDate(d), true);
    });

    function renderDay() {
      const evs = state.events[state.selected] || [];
      dayTitle.textContent = cap(fromISO(state.selected).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
      dayCount.textContent = evs.length === 0 ? 'Sin eventos' : evs.length + (evs.length === 1 ? ' evento' : ' eventos');
      list.textContent = '';
      if (!evs.length) { list.append(h('li', { class: 'muted ev-empty', text: 'No hay nada planeado. Escribe un nombre abajo para añadir el primer evento.' })); return; }
      evs.forEach((ev, i) => list.append(h('li', { class: 'ev' },
        h('i', { class: 'dot', style: 'background:' + safeColor(ev.color) }),
        h('span', { class: 'ev-name', text: ev.name }),
        h('button', { class: 'btn ghost danger sm', type: 'button', text: 'Eliminar', 'aria-label': 'Eliminar evento ' + ev.name, onclick: () => del(state.selected, i) }))));
    }
    function del(date, i) {
      const l = state.events[date]; if (!l || i >= l.length) return;
      const [gone] = l.splice(i, 1);
      if (!l.length) delete state.events[date];
      save(); renderCalendar(); renderDay();
      toast('Evento eliminado.', { label: 'Deshacer', run: () => { (state.events[date] = state.events[date] || []).splice(i, 0, gone); save(); renderCalendar(); renderDay(); } });
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameIn.value.trim(); if (!name) return;
      (state.events[state.selected] = state.events[state.selected] || []).push({ name, color: state.color });
      save(); renderCalendar(); renderDay();
      nameIn.value = ''; nameIn.focus();
    });

    function paintColors() {
      $$('button', colorsEl).forEach((b) => b.remove());
      PRESETS.forEach((c) => colorsEl.insertBefore(h('button', {
        type: 'button', style: 'background:' + c, 'aria-label': 'Color ' + c, 'aria-pressed': String(state.color === c),
        onclick: () => { state.color = c; custom.value = c; paintColors(); }
      }), custom));
    }
    custom.addEventListener('input', () => { state.color = custom.value; paintColors(); });
    paintColors();
    renderCalendar(); renderDay();
    window.addEventListener('storage', (e) => { if (e.key === KEY) { state.events = load(); renderCalendar(); renderDay(); } });
    return { show() { state.events = load(); renderCalendar(); renderDay(); } };
  }
});
