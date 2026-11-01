'use strict';

/* =========================================================
   NOTAS
   Clave de almacenamiento: «notas» (la misma de siempre)
   ========================================================= */
registerView({
  id: 'notas',
  mount(root) {
    const KEY = 'notas';
    const DEFAULT_COLOR = '#f9f9f9';
    const PALETTE = [['Blanco', '#f9f9f9'], ['Amarillo', '#ffe9a8'], ['Melocotón', '#ffd5bf'], ['Rosa', '#fad1e6'], ['Lila', '#e1d8ff'], ['Azul', '#cfe4ff'], ['Menta', '#c9efdb'], ['Gris azulado', '#d9e1e6']];
    const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    function ink(hex) {
      const n = parseInt(hex.slice(1), 16);
      const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
      return L > 0.22 ? '#16202A' : '#FFFFFF';
    }
    function paint(el, hex) { el.style.setProperty('--note-bg', hex); el.style.setProperty('--note-ink', ink(hex)); }
    function fmtDate(iso) {
      const d = new Date(iso); if (isNaN(d)) return '';
      const o = { day: 'numeric', month: 'short' }; if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
      return d.toLocaleDateString('es-ES', o);
    }
    function sanitize(n) {
      if (!n || typeof n !== 'object') return null;
      const titulo = typeof n.titulo === 'string' ? n.titulo : '', contenido = typeof n.contenido === 'string' ? n.contenido : '';
      if (!titulo.trim() && !contenido.trim()) return null;
      return { id: typeof n.id === 'string' && /^[\w-]{1,64}$/.test(n.id) ? n.id : uid(), titulo, contenido, color: isHex(n.color) ? n.color : DEFAULT_COLOR, favorita: n.favorita === true, fecha: typeof n.fecha === 'string' && !isNaN(Date.parse(n.fecha)) ? n.fecha : null };
    }
    function load() {
      const raw = store.json(KEY, []);
      if (!Array.isArray(raw)) return { list: [], migrated: false };
      return { list: raw.map(sanitize).filter(Boolean), migrated: raw.some((n) => !(n && typeof n.id === 'string')) };
    }
    let notes = [];
    const st = { tab: 'all', query: '', sort: 'new' };
    let justAdded = null, editingId = null;
    const save = () => { if (!store.setJson(KEY, notes)) toast('No se han podido guardar los cambios. Comprueba que el navegador permite guardar datos.'); };

    /* ---------- Selector de color ---------- */
    function swatches(name, onChange) {
      let custom = false; const radios = [];
      const wrap = h('div', { class: 'swatches', role: 'group', 'aria-label': 'Color de fondo' });
      const ci = h('input', { type: 'color', value: DEFAULT_COLOR, 'aria-label': 'Color personalizado' });
      const cd = h('span', { class: 'sw-dot' });
      const cl = h('label', { class: 'sw sw-custom', title: 'Color personalizado' }, ci, cd);
      PALETTE.forEach(([label, hex]) => {
        const r = h('input', { type: 'radio', name, value: hex, 'aria-label': label });
        wrap.append(h('label', { class: 'sw', title: label }, r, h('span', { class: 'sw-dot', style: '--c:' + hex })));
        radios.push(r);
        r.addEventListener('change', () => { custom = false; cl.classList.remove('active'); onChange(r.value); });
      });
      wrap.append(cl);
      const setCustom = (hex) => { custom = true; radios.forEach((r) => { r.checked = false; }); cl.classList.add('active'); cd.style.setProperty('--c', hex); };
      ci.addEventListener('input', () => { setCustom(ci.value); onChange(ci.value); });
      return {
        el: wrap,
        get() { if (custom) return ci.value; const c = radios.find((r) => r.checked); return c ? c.value : DEFAULT_COLOR; },
        set(hex) {
          if (!isHex(hex)) hex = DEFAULT_COLOR;
          const m = radios.find((r) => r.value.toLowerCase() === hex.toLowerCase());
          if (m) { m.checked = true; custom = false; cl.classList.remove('active'); } else { ci.value = hex; setCustom(hex); }
        }
      };
    }

    /* ---------- Redactar ---------- */
    const cTitle = h('input', { class: 'nt-plain nt-title', type: 'text', placeholder: 'Título', 'aria-label': 'Título', autocomplete: 'off' });
    const cBody = h('textarea', { class: 'nt-plain nt-body', rows: '1', placeholder: 'Escribe una nota…', 'aria-label': 'Contenido' });
    const cErr = h('p', { class: 'nt-err', role: 'alert', hidden: true });
    const cColors = swatches('nt-c', (hex) => paint(composer, hex));
    const composer = h('form', { class: 'nt-composer', novalidate: true },
      cTitle, cBody, cErr,
      h('div', { class: 'nt-extra' }, cColors.el,
        h('div', { class: 'nt-actions' },
          h('span', { class: 'nt-hint', text: 'Ctrl + Intro para guardar' }),
          h('button', { type: 'button', class: 'btn ghost sm', text: 'Cancelar', onclick: () => closeComposer() }),
          h('button', { type: 'submit', class: 'btn primary sm', text: 'Guardar nota' }))));
    const empty = () => !cTitle.value.trim() && !cBody.value.trim();
    function closeComposer() { composer.reset(); cColors.set(DEFAULT_COLOR); paint(composer, DEFAULT_COLOR); cErr.hidden = true; composer.classList.remove('open'); if (composer.contains(document.activeElement)) document.activeElement.blur(); }
    paint(composer, DEFAULT_COLOR); cColors.set(DEFAULT_COLOR);
    composer.addEventListener('focusin', () => composer.classList.add('open'));
    document.addEventListener('pointerdown', (e) => { if (composer.classList.contains('open') && !composer.contains(e.target) && empty()) closeComposer(); });
    composer.addEventListener('input', () => { cErr.hidden = true; });
    composer.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); composer.requestSubmit(); }
      else if (e.key === 'Escape' && empty()) closeComposer();
    });
    composer.addEventListener('submit', (e) => {
      e.preventDefault();
      const titulo = cTitle.value.trim(), contenido = cBody.value.trim();
      if (!titulo && !contenido) { cErr.textContent = 'Escribe un título o el contenido de la nota.'; cErr.hidden = false; cBody.focus(); return; }
      const n = { id: uid(), titulo, contenido, color: cColors.get(), favorita: false, fecha: new Date().toISOString() };
      notes.push(n); save(); justAdded = n.id; closeComposer(); render();
    });

    /* ---------- Barra y lista ---------- */
    const count = h('span', { class: 'muted' });
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Buscar en tus notas', 'aria-label': 'Buscar en tus notas', autocomplete: 'off' });
    const tabAll = h('button', { type: 'button', 'aria-pressed': 'true' });
    const tabFav = h('button', { type: 'button', 'aria-pressed': 'false' });
    const sortSel = h('select', { class: 'select', 'aria-label': 'Ordenar' },
      h('option', { value: 'new', text: 'Más recientes' }), h('option', { value: 'old', text: 'Más antiguas' }), h('option', { value: 'az', text: 'Por título (A–Z)' }));
    const bar = h('div', { class: 'nt-bar', hidden: true }, h('div', { class: 'seg' }, tabAll, tabFav), sortSel);
    const listEl = h('div', { class: 'nt-list' });
    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    const exportBtn = h('button', { type: 'button', class: 'icon-btn', title: 'Exportar una copia de tus notas (se guardan solo en este navegador)', 'aria-label': 'Exportar copia de las notas', html: icon('download'), onclick: exportNotes });
    const importBtn = h('button', { type: 'button', class: 'icon-btn', title: 'Importar notas desde una copia', 'aria-label': 'Importar copia de notas', html: icon('upload'), onclick: () => fileIn.click() });

    /* ---------- Diálogo de edición ---------- */
    const eTitle = h('input', { class: 'nt-plain nt-title', type: 'text', placeholder: 'Título', 'aria-label': 'Título', autocomplete: 'off' });
    const eBody = h('textarea', { class: 'nt-plain nt-body', rows: '6', placeholder: 'Escribe tu nota…', 'aria-label': 'Contenido' });
    const eErr = h('p', { class: 'nt-err', role: 'alert', hidden: true });
    const eColors = swatches('nt-e', (hex) => paint(dlg, hex));
    const editForm = h('form', { novalidate: true, class: 'nt-editform' },
      h('h2', { class: 'nt-dlgh', id: 'nt-dlgh', text: 'Editar nota' }), eTitle, eBody, eErr,
      h('div', { class: 'nt-extra' }, eColors.el,
        h('div', { class: 'nt-actions' },
          h('button', { type: 'button', class: 'btn ghost sm', text: 'Cancelar', onclick: () => dlg.close() }),
          h('button', { type: 'submit', class: 'btn primary sm', text: 'Guardar cambios' }))));
    const dlg = h('dialog', { class: 'nt-dialog', 'aria-labelledby': 'nt-dlgh' }, editForm);
    root.append(h('div', { class: 'nt-tools' }, h('div', { class: 'nt-search' }, search, count), h('div', { class: 'nt-search-tools' }, importBtn, exportBtn, fileIn)), composer, bar, listEl, dlg);

    /* ---------- Render ---------- */
    const iconBtn = (action, label, ic, pressed) => h('button', { type: 'button', class: 'nt-ib', 'data-action': action, title: label, 'aria-label': label, 'aria-pressed': pressed === undefined ? null : String(pressed), html: icon(ic) });
    function noteEl(n) {
      const a = h('article', { class: 'nt-note' + (n.favorita ? ' is-fav' : '') + (n.id === justAdded ? ' just-added' : ''), 'data-id': n.id });
      paint(a, n.color);
      if (n.titulo) a.append(h('h3', { text: n.titulo }));
      if (n.contenido) a.append(h('p', { text: n.contenido }));
      a.append(h('div', { class: 'nt-notefoot' }, h('time', { datetime: n.fecha || null, text: n.fecha ? fmtDate(n.fecha) : '' }),
        h('div', { class: 'nt-noteacts' },
          iconBtn('fav', n.favorita ? 'Quitar de favoritas' : 'Marcar como favorita', 'star', n.favorita),
          iconBtn('edit', 'Editar nota', 'edit'), iconBtn('delete', 'Eliminar nota', 'trash'))));
      return a;
    }
    function compare(a, b) {
      if (st.sort === 'az') return (a.n.titulo || a.n.contenido).localeCompare(b.n.titulo || b.n.contenido, 'es', { sensitivity: 'base' }) || a.i - b.i;
      const da = a.n.fecha ? Date.parse(a.n.fecha) : 0, db = b.n.fecha ? Date.parse(b.n.fecha) : 0;
      return st.sort === 'old' ? (da - db) || (a.i - b.i) : (db - da) || (b.i - a.i);
    }
    function render() {
      const q = fold(st.query.trim());
      const favCount = notes.filter((n) => n.favorita).length;
      count.textContent = notes.length === 1 ? '1 nota' : notes.length + ' notas';
      tabAll.textContent = 'Todas ' + notes.length; tabFav.textContent = 'Favoritas ' + favCount;
      tabAll.setAttribute('aria-pressed', String(st.tab === 'all')); tabFav.setAttribute('aria-pressed', String(st.tab === 'fav'));
      bar.hidden = notes.length === 0;
      const items = notes.map((n, i) => ({ n, i })).filter((x) => (st.tab === 'all' || x.n.favorita) && (!q || fold(x.n.titulo + ' ' + x.n.contenido).includes(q))).sort(compare);
      listEl.textContent = '';
      if (!items.length) {
        const d = h('div', { class: 'empty' }, h('h2'), h('p'));
        if (q) { $('h2', d).textContent = 'Ninguna nota coincide con la búsqueda'; $('p', d).textContent = 'Prueba con otra palabra o borra la búsqueda.'; d.append(h('button', { class: 'btn', type: 'button', text: 'Borrar búsqueda', onclick: () => { st.query = ''; search.value = ''; render(); search.focus(); } })); }
        else if (st.tab === 'fav') { $('h2', d).textContent = 'Aún no tienes favoritas'; $('p', d).textContent = 'Pulsa la estrella de una nota para tenerla siempre arriba.'; }
        else { $('h2', d).textContent = 'Todavía no hay notas'; $('p', d).textContent = 'Escribe la primera en el cuadro de arriba.'; }
        listEl.append(d);
      } else {
        const favs = items.filter((x) => x.n.favorita), rest = items.filter((x) => !x.n.favorita);
        const grouped = favs.length && rest.length;
        [['Favoritas', favs], ['Otras notas', rest]].forEach(([label, arr]) => {
          if (!arr.length) return;
          const sec = h('section');
          if (grouped) sec.append(h('h2', { class: 'nt-group', text: label }));
          const grid = h('div', { class: 'nt-grid' }); arr.forEach((x) => grid.append(noteEl(x.n))); sec.append(grid); listEl.append(sec);
        });
      }
      justAdded = null;
    }
    const idx = (id) => notes.findIndex((n) => n.id === id);
    function openEdit(id) {
      const i = idx(id); if (i < 0) return;
      editingId = id; eTitle.value = notes[i].titulo; eBody.value = notes[i].contenido; eErr.hidden = true;
      eColors.set(notes[i].color); paint(dlg, notes[i].color); dlg.showModal(); eBody.focus();
    }
    listEl.addEventListener('click', (e) => {
      const card = e.target.closest('.nt-note'); if (!card) return;
      const id = card.dataset.id, btn = e.target.closest('button[data-action]');
      if (btn) {
        const a = btn.dataset.action;
        if (a === 'fav') { const i = idx(id); notes[i].favorita = !notes[i].favorita; save(); render(); const b = $(`.nt-note[data-id="${id}"] [data-action="fav"]`, listEl); if (b) b.focus(); }
        else if (a === 'edit') openEdit(id);
        else if (a === 'delete') { const i = idx(id); const [gone] = notes.splice(i, 1); save(); render(); toast('Nota eliminada.', { label: 'Deshacer', run: () => { notes.splice(Math.min(i, notes.length), 0, gone); save(); justAdded = gone.id; render(); } }); }
        return;
      }
      if (String(window.getSelection())) return;
      openEdit(id);
    });
    editForm.addEventListener('input', () => { eErr.hidden = true; });
    editForm.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); editForm.requestSubmit(); } });
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const titulo = eTitle.value.trim(), contenido = eBody.value.trim();
      if (!titulo && !contenido) { eErr.textContent = 'Escribe un título o el contenido de la nota.'; eErr.hidden = false; eBody.focus(); return; }
      const i = idx(editingId);
      if (i >= 0) { Object.assign(notes[i], { titulo, contenido, color: eColors.get() }); save(); }
      dlg.close(); render();
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    search.addEventListener('input', () => { st.query = search.value; render(); });
    tabAll.addEventListener('click', () => { st.tab = 'all'; render(); });
    tabFav.addEventListener('click', () => { st.tab = 'fav'; render(); });
    sortSel.addEventListener('change', () => { st.sort = sortSel.value; render(); });

    /* ---------- Copia de seguridad ---------- */
    function exportNotes() {
      if (!notes.length) { toast('Todavía no hay notas que exportar.'); return; }
      download('notas-' + isoDate(new Date()) + '.json', 'application/json', JSON.stringify(notes, null, 2));
      toast('Copia de seguridad descargada.');
    }
    fileIn.addEventListener('change', () => {
      const f = fileIn.files[0]; fileIn.value = ''; if (!f) return;
      f.text().then((txt) => {
        const data = JSON.parse(txt); if (!Array.isArray(data)) throw new Error('formato');
        const ids = {}, sigs = {};
        notes.forEach((n) => { ids[n.id] = true; sigs[n.titulo + '\u0000' + n.contenido] = true; });
        let added = 0;
        data.map(sanitize).filter(Boolean).forEach((n) => { const s = n.titulo + '\u0000' + n.contenido; if (ids[n.id] || sigs[s]) return; notes.push(n); ids[n.id] = sigs[s] = true; added++; });
        if (added) { save(); render(); }
        toast(added ? 'Importadas ' + added + (added === 1 ? ' nota.' : ' notas.') : 'No hay notas nuevas en ese archivo.');
      }).catch(() => toast('Ese archivo no es una copia de seguridad válida.'));
    });
    window.addEventListener('storage', (e) => { if (e.key === KEY) { notes = load().list; render(); } });

    const loaded = load(); notes = loaded.list; if (loaded.migrated && notes.length) save();
    render();
    return { show() { notes = load().list; render(); } };
  }
});
