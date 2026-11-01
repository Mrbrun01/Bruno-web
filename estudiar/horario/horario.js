'use strict';

/* =========================================================
   HORARIO
   Clave de almacenamiento: «asignaturas» (la misma de siempre)
   ========================================================= */
registerView({
  id: 'horario',
  mount(root) {
    const WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const KEY = 'asignaturas';
    let items = load();
    let editing = -1;
    let onlyToday = false;
    let query = '';

    function load() {
      const raw = store.json(KEY, []);
      return (Array.isArray(raw) ? raw : []).filter((a) => a && typeof a.nombre === 'string' && WEEK.includes(a.dia) && typeof a.hora === 'string')
        .map((a) => ({ nombre: a.nombre, dia: a.dia, hora: a.hora }));
    }
    const save = () => store.setJson(KEY, items);

    /* ---------- Formulario ---------- */
    const fName = h('input', { class: 'input', id: 'h-nombre', type: 'text', placeholder: 'Matemáticas', required: true, maxlength: '60', autocomplete: 'off' });
    const fDay = h('select', { class: 'select', id: 'h-dia' }, WEEK.map((d) => h('option', { value: d, text: d })));
    const fTime = h('input', { class: 'input', id: 'h-hora', type: 'time', required: true });
    const btnSave = h('button', { class: 'btn primary', type: 'submit' });
    const btnCancel = h('button', { class: 'btn', type: 'button', text: 'Cancelar', hidden: true, onclick: () => stopEdit() });
    const form = h('form', { class: 'card h-form', autocomplete: 'off' },
      h('label', { class: 'field grow', for: 'h-nombre' }, 'Asignatura', fName),
      h('label', { class: 'field', for: 'h-dia' }, 'Día', fDay),
      h('label', { class: 'field', for: 'h-hora' }, 'Hora', fTime),
      h('div', { class: 'h-actions' }, btnSave, btnCancel));

    /* ---------- Filtros e importar/exportar ---------- */
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Buscar asignatura o día', 'aria-label': 'Buscar asignatura o día', autocomplete: 'off' });
    const todayBtn = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false', text: 'Solo hoy' });
    const fileIn = h('input', { type: 'file', accept: '.json,.csv,application/json,text/csv', hidden: true });
    const importBtn = h('button', { class: 'icon-btn', type: 'button', title: 'Importar horario (JSON o CSV)', 'aria-label': 'Importar horario', html: icon('upload'), onclick: () => fileIn.click() });
    const exportJsonBtn = h('button', { class: 'btn sm', type: 'button', text: 'Descargar como JSON', onclick: () => doExport('json') });
    const exportCsvBtn = h('button', { class: 'btn sm', type: 'button', text: 'Descargar como CSV', onclick: () => doExport('csv') });
    const exportMenu = h('div', { class: 'h-menu', hidden: true }, exportJsonBtn, exportCsvBtn);
    const exportBtn = h('button', { class: 'icon-btn', type: 'button', title: 'Exportar horario', 'aria-label': 'Exportar horario', 'aria-expanded': 'false', html: icon('download'), onclick: () => toggleExportMenu() });
    const tools = h('div', { class: 'h-tools' }, search, todayBtn, h('span', { class: 'h-spacer' }), importBtn, h('div', { class: 'h-menu-wrap' }, exportBtn, exportMenu), fileIn);

    function toggleExportMenu(open) {
      const v = open === undefined ? exportMenu.hidden : !open;
      exportMenu.hidden = !v;
      exportBtn.setAttribute('aria-expanded', String(v));
    }
    document.addEventListener('click', (e) => { if (!exportMenu.hidden && !e.target.closest('.h-menu-wrap')) toggleExportMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !exportMenu.hidden) toggleExportMenu(false); });

    function doExport(formato) {
      toggleExportMenu(false);
      if (!items.length) { toast('No hay nada que exportar. Añade una asignatura primero.'); return; }
      if (formato === 'json') {
        download('horario.json', 'application/json', JSON.stringify({ version: 1, asignaturas: items }, null, 2));
      } else {
        const escCsv = (s) => { if (/^[=+\-@]/.test(s)) s = "'" + s; return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        const lines = [['Asignatura', 'Día', 'Hora'], ...items.map((a) => [a.nombre, a.dia, a.hora])].map((f) => f.map(escCsv).join(';'));
        download('horario.csv', 'text/csv;charset=utf-8', '\ufeff' + lines.join('\r\n') + '\r\n');
      }
      toast('Horario descargado como horario.' + formato + '.');
    }

    function parseCSV(text) {
      text = text.replace(/^\uFEFF/, '');
      const first = text.split(/\r?\n/, 1)[0];
      const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
      const rows = []; let row = [], field = '', quoted = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c; }
        else if (c === '"') quoted = true;
        else if (c === sep) { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); field = ''; rows.push(row); row = []; }
        else field += c;
      }
      if (field !== '' || row.length) { row.push(field); rows.push(row); }
      return rows.filter((r) => r.some((x) => x.trim() !== ''));
    }
    function normalizeRow(nombre, dia, hora) {
      nombre = String(nombre ?? '').trim();
      if (/^'[=+\-@]/.test(nombre)) nombre = nombre.slice(1);
      const d = WEEK.find((x) => fold(x) === fold(String(dia ?? '').trim()));
      const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(hora ?? '').trim());
      if (!nombre || !d || !m) return null;
      const hh = Number(m[1]), mm = Number(m[2]);
      if (hh > 23 || mm > 59) return null;
      return { nombre: nombre.slice(0, 200), dia: d, hora: pad2(hh) + ':' + m[2] };
    }
    function readImport(text) {
      const t = text.replace(/^\uFEFF/, '').trim();
      let candidates;
      if (t.startsWith('[') || t.startsWith('{')) {
        let data; try { data = JSON.parse(t); } catch (e) { return null; }
        const list = Array.isArray(data) ? data : data && data.asignaturas;
        if (!Array.isArray(list)) return null;
        candidates = list.map((a) => (a && typeof a === 'object' ? normalizeRow(a.nombre, a.dia, a.hora) : null));
      } else {
        let rows = parseCSV(t);
        if (rows.length && fold((rows[0][0] || '').trim()) === 'asignatura') rows = rows.slice(1);
        candidates = rows.map((r) => normalizeRow(r[0], r[1], r[2]));
      }
      const valid = candidates.filter(Boolean);
      return { valid, skipped: candidates.length - valid.length };
    }
    async function doImport(file) {
      if (file.size > 1024 * 1024) { toast('El archivo es demasiado grande. Usa un JSON o CSV de menos de 1 MB.'); return; }
      let result = null;
      try { result = readImport(await file.text()); } catch (e) { result = null; }
      if (!result || !result.valid.length) { toast('No se encontró ninguna asignatura válida en ese archivo.'); return; }
      const previous = items;
      if (editing >= 0) stopEdit();
      items = result.valid;
      save(); render();
      toast('Horario importado: ' + items.length + (items.length === 1 ? ' asignatura.' : ' asignaturas.') + (result.skipped ? ' (' + result.skipped + ' fila no válida omitida.)' : ''),
        { label: 'Deshacer', run: () => { items = previous; save(); render(); } });
    }
    fileIn.addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) doImport(f); });

    const week = h('div', { class: 'week' });
    const emptyMsg = h('div', { class: 'card empty', hidden: true },
      h('h2', { text: 'Todavía no hay clases' }),
      h('p', { text: 'Escribe la primera arriba, o importa un horario con el botón de subir archivo.' }));
    root.append(form, tools, week, emptyMsg);

    function paintForm() {
      btnSave.textContent = editing >= 0 ? 'Guardar cambios' : 'Añadir clase';
      btnCancel.hidden = editing < 0;
      form.classList.toggle('editing', editing >= 0);
    }
    function stopEdit() {
      editing = -1;
      form.reset();
      fDay.value = WEEK[Math.min(4, Math.max(0, (new Date().getDay() + 6) % 7))];
      paintForm();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = fName.value.trim();
      if (!nombre || !fTime.value) return;
      const entry = { nombre, dia: fDay.value, hora: fTime.value };
      if (editing >= 0) items[editing] = entry; else items.push(entry);
      save();
      const wasEditing = editing >= 0;
      stopEdit();
      render();
      toast(wasEditing ? 'Clase actualizada.' : 'Clase añadida.');
      fName.focus();
    });

    function startEdit(i) {
      const a = items[i];
      editing = i;
      fName.value = a.nombre; fDay.value = a.dia; fTime.value = a.hora;
      paintForm();
      form.scrollIntoView({ block: 'center', behavior: 'smooth' });
      fName.focus({ preventScroll: true });
    }
    function remove(i) {
      const [gone] = items.splice(i, 1);
      if (editing === i) stopEdit(); else if (editing > i) editing--;
      save();
      render();
      toast('Clase eliminada.', { label: 'Deshacer', run: () => { items.splice(Math.min(i, items.length), 0, gone); save(); render(); } });
    }

    search.addEventListener('input', () => { query = fold(search.value.trim()); render(); });
    todayBtn.addEventListener('click', () => {
      onlyToday = !onlyToday;
      todayBtn.setAttribute('aria-pressed', String(onlyToday));
      render();
    });

    /* ---------- Semana ---------- */
    function render() {
      const todayName = DAYS[new Date().getDay()];
      week.textContent = '';
      emptyMsg.hidden = items.length > 0;
      week.hidden = items.length === 0;

      const matches = (a) => !query || fold(a.nombre).includes(query) || fold(a.dia).includes(query);
      const filtering = !!query || onlyToday;

      WEEK.forEach((day) => {
        if (onlyToday && day !== todayName) return;
        const rows = items.map((a, i) => ({ a, i })).filter((x) => x.a.dia === day && matches(x.a))
          .sort((x, y) => x.a.hora.localeCompare(y.a.hora));
        const weekend = day === 'Sábado' || day === 'Domingo';
        if (!rows.length && (filtering || weekend)) return;

        const list = h('ul', { class: 'slots' });
        rows.forEach(({ a, i }) => {
          list.append(h('li', { class: 'slot' + (editing === i ? ' is-editing' : '') },
            h('time', { class: 'num', text: a.hora }),
            h('span', { class: 'slot-name', text: a.nombre }),
            h('span', { class: 'slot-tools' },
              h('button', { class: 'icon-btn sm', type: 'button', title: 'Editar', 'aria-label': 'Editar ' + a.nombre + ', ' + a.dia, html: icon('edit'), onclick: () => startEdit(i) }),
              h('button', { class: 'icon-btn sm', type: 'button', title: 'Eliminar', 'aria-label': 'Eliminar ' + a.nombre + ', ' + a.dia, html: icon('trash'), onclick: () => remove(i) }))));
        });
        week.append(h('section', { class: 'day' + (day === todayName ? ' is-today' : '') },
          h('header', null, h('h2', { text: day }), day === todayName ? h('span', { class: 'chip tag-hi', text: 'Hoy' }) : null),
          rows.length ? list : h('p', { class: 'muted', text: 'Sin clases' })));
      });
      if (!week.children.length && items.length) {
        week.append(h('div', { class: 'card empty', style: 'grid-column:1/-1' }, h('h2', { text: 'Nada coincide' }), h('p', { text: 'Prueba con otra palabra o quita el filtro «Solo hoy».' })));
      }
    }

    stopEdit();
    render();
    return { show() { render(); } };
  }
});
