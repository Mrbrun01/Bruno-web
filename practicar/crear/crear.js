'use strict';

const SAMPLE_EXERCISE = {
  title: 'Capitales de Europa',
  description: 'Ejemplo para probar el creador: edítalo o sustitúyelo por el tuyo en la pestaña «Crear ejercicio».',
  fuzzy: true,
  questions: [
    { sentence: 'La capital de Francia es ___.', correct: 'París', accepted: 'Paris', distractors: 'Lyon, Marsella, Burdeos', term: 'país: Francia', form: 'Europa occidental', explanation: 'París es la capital de Francia y su mayor ciudad.' },
    { sentence: 'Berlín es la capital de ___.', correct: 'Alemania', accepted: '', distractors: 'Austria, Suiza, Polonia', term: '', form: 'Europa central y oriental', explanation: 'Berlín es la capital de Alemania desde la reunificación de 1990.' },
    { sentence: '___ es la capital de Portugal.', correct: 'Lisboa', accepted: '', distractors: 'Oporto, Coímbra, Faro', term: 'país: Portugal', form: 'Europa occidental', explanation: 'Lisboa está en la desembocadura del río Tajo.' },
    { sentence: 'La capital de Polonia es ___.', correct: 'Varsovia', accepted: '', distractors: 'Cracovia, Gdansk, Breslavia', term: 'país: Polonia', form: 'Europa central y oriental', explanation: 'Cracovia fue capital hasta 1596; hoy lo es Varsovia.' },
    { sentence: '¿Cuál es la capital de Italia?', correct: 'Roma', accepted: '', distractors: 'Milán, Nápoles, Turín', term: '', form: 'Europa occidental', explanation: 'Roma es también la sede del Vaticano, un estado independiente en su interior.' },
    { sentence: '¿Cuál es la capital de Hungría?', correct: 'Budapest', accepted: '', distractors: 'Viena, Praga, Bucarest', term: '', form: 'Europa central y oriental', explanation: 'Budapest nació de la unión de Buda y Pest, a orillas del Danubio.' }
  ],
  table: {
    headers: ['País', 'Capital', 'Moneda', 'Idioma oficial'],
    rows: [
      { c1: 'Francia', c2: 'París', c3: 'Euro', note: 'Francés' },
      { c1: 'Alemania', c2: 'Berlín', c3: 'Euro', note: 'Alemán' },
      { c1: 'Portugal', c2: 'Lisboa', c3: 'Euro', note: 'Portugués' },
      { c1: 'Polonia', c2: 'Varsovia', c3: 'Esloti / Zloty', note: 'Polaco' },
      { c1: 'Italia', c2: 'Roma', c3: 'Euro', note: 'Italiano' },
      { c1: 'Hungría', c2: 'Budapest', c3: 'Forinto', note: 'Húngaro' }
    ]
  }
};

/* =========================================================
   CREADOR DE EJERCICIOS
   Edita un ejercicio y, además, permite añadirlo a la web como una herramienta
   más (con nombre e icono propios), que sale en el menú y en Inicio.
   Las herramientas propias se guardan en el navegador (ver `custom` en core.js)
   y se abren en practicar/personalizado/.
   ========================================================= */
const slugOf = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'herramienta';
/* Forma guardada de un borrador (sin identificadores internos) */
const shapeOf = (d) => ({ title: d.title, description: d.description, fuzzy: d.fuzzy, questions: d.questions.map((q) => { const c = { ...q }; delete c.id; return c; }), table: d.table });

registerView({
  id: 'crear',
  mount(root) {
    const state = { editing: null, icon: null };
    let editor = null, pub = null;

    /* ---------- Guardar en el índice de herramientas ---------- */
    function persist(id, name, iconSpec) {
      const shape = editor.shape(false);
      return custom.save({ id, name, desc: shape.description, n: editor.compile().data.items.length, icon: iconSpec }, shape);
    }

    /* ---------- Tarjeta «Añadir a la web como herramienta» ---------- */
    function buildPublish(el) {
      el.innerHTML = `
        <div class="card ex-sec pub">
          <h2>Añadir a la web como herramienta</h2>
          <p class="muted ex-hint">Publica este ejercicio como una herramienta más: saldrá en el menú y en Inicio, dentro de «Practicar», y se abrirá en su propia página.</p>
          <div class="pub-banner" data-p="banner" hidden></div>
          <div class="pub-row">
            <label class="field">Nombre de la herramienta<input type="text" class="input" data-p="name" maxlength="40" autocomplete="off" placeholder="Ej.: Capitales de Europa"></label>
            <div class="field pub-icon"><span>Icono</span>
              <div class="pub-icon-row"><span class="pub-prev" data-p="prev"></span><button type="button" class="btn" data-p="draw">${icon('pencil')}<span>Dibujar o elegir…</span></button><button type="button" class="btn ghost sm" data-p="noicon" hidden>Quitar</button></div>
            </div>
          </div>
          <div class="ex-apply"><span class="ex-status" data-p="status" role="status" aria-live="polite"></span><button type="button" class="btn primary lg" data-p="go">Añadir a la web</button></div>
        </div>`;
      const p = (k) => $('[data-p="' + k + '"]', el);
      const setStatus = (t, kind) => { p('status').textContent = t; p('status').className = 'ex-status ' + (kind || ''); };

      function renderIcon() {
        p('prev').innerHTML = custom.svg(state.icon || { builtin: 'book' });
        p('prev').classList.toggle('is-default', !state.icon);
        p('noicon').hidden = !state.icon;
      }
      function renderBanner() {
        const t = state.editing && custom.get(state.editing);
        p('banner').hidden = !t;
        p('go').textContent = t ? 'Guardar cambios' : 'Añadir a la web';
        if (!t) return;
        p('banner').innerHTML = '<span>Estás editando <b>«' + esc(t.name) + '»</b>, que ya está en el menú. Al pulsar «Aplicar y practicar» los cambios se guardan en ella.</span>';
        p('banner').append(h('button', { type: 'button', class: 'btn sm', text: 'Empezar uno nuevo', onclick: startNew }));
      }
      p('draw').addEventListener('click', () => openIconEditor({
        spec: state.icon, name: p('name').value || editor.draft().title,
        onSave: (spec) => { state.icon = spec; renderIcon(); setStatus('Icono listo. Falta añadir la herramienta.', 'dirty'); }
      }));
      p('noicon').addEventListener('click', () => { state.icon = null; renderIcon(); });
      p('go').addEventListener('click', () => {
        const name = (p('name').value.trim() || editor.draft().title.trim()).slice(0, 40);
        if (!name) { setStatus('Escribe un nombre para la herramienta.', 'err'); p('name').focus(); return; }
        if (!editor.apply(false)) { setStatus('Corrige antes los errores del ejercicio (más arriba).', 'err'); return; }
        const id = state.editing || custom.newId();
        if (!persist(id, name, state.icon)) { setStatus('Este navegador no permite guardar datos, no se pudo añadir.', 'err'); return; }
        state.editing = id; store.set(custom.EDITING, id);
        p('name').value = name;
        custom.refreshNav(); renderBanner(); setStatus('', '');
        toast('«' + name + '» ya está en el menú.', { label: 'Abrir', run: () => { location.href = toolUrl('custom-' + id); } });
        editor.showPane('tools');
      });
      return {
        name: () => p('name').value.trim(),
        fill(entry) {
          state.icon = entry ? entry.icon : null;
          p('name').value = entry ? entry.name : '';
          setStatus('', ''); renderIcon(); renderBanner();
        },
        refresh() { renderBanner(); }
      };
    }

    /* ---------- Empezar uno nuevo / editar uno existente ---------- */
    function startNew() {
      state.editing = null; store.del(custom.EDITING);
      editor.blank(); pub.fill(null); editor.showPane('editor');
    }
    function loadForEdit(id) {
      const t = custom.get(id), exr = custom.exercise(id);
      if (!t || !exr) { toast('No se encontró el ejercicio de esa herramienta en este navegador.'); return false; }
      state.editing = id; store.set(custom.EDITING, id);
      editor.load(exr, 'Editando «' + t.name + '»'); pub.fill(t); editor.showPane('editor');
      return true;
    }

    /* ---------- Pestaña «Mis herramientas» ---------- */
    function renderTools(el) {
      const list = custom.list();
      const row = (t) => `
        <li class="tool-row" data-id="${t.id}">
          <span class="tool-ico" aria-hidden="true">${custom.svg(t.icon)}</span>
          <div class="tool-main"><b>${esc(t.name)}</b><span class="muted">${t.n} ${t.n === 1 ? 'pregunta' : 'preguntas'}${state.editing === t.id ? ' · la estás editando' : ''}</span></div>
          <div class="tool-acts">
            <a class="btn sm" href="${esc(toolUrl('custom-' + t.id))}">Abrir</a>
            <button type="button" class="btn sm" data-a="edit">Editar</button>
            <button type="button" class="btn sm" data-a="export">Exportar</button>
            <button type="button" class="btn sm ghost danger" data-a="del">Eliminar</button>
          </div>
        </li>`;
      el.innerHTML = `
        <div class="card ex-sec tools">
          <div class="tools-head">
            <div><h2>Mis herramientas</h2><p class="muted ex-hint">Los ejercicios que has añadido a la web. Se guardan en este navegador: expórtalos para llevarlos a otro.</p></div>
            <div class="actions"><button type="button" class="btn" data-a="new">${icon('plus')}<span>Nueva herramienta</span></button><button type="button" class="btn" data-a="import">${icon('upload')}<span>Importar…</span></button><input type="file" accept=".json,application/json" hidden data-a="file"></div>
          </div>
          ${list.length ? '<ul class="tool-list">' + list.map(row).join('') + '</ul>' : '<p class="tools-empty">Todavía no has añadido ninguna. Escribe un ejercicio en «Crear ejercicio» y pulsa «Añadir a la web».</p>'}
        </div>`;
      el.onclick = async (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const li = b.closest('.tool-row'), id = li && li.dataset.id, a = b.dataset.a;
        if (a === 'new') {
          if (editor.isDirty() && !(await confirmDialog({ title: '¿Descartar lo que hay en el editor?', text: 'Tienes cambios sin aplicar que se perderán.', ok: 'Descartar', danger: true }))) return;
          startNew();
        } else if (a === 'import') { $('input[data-a="file"]', el).click(); }
        else if (a === 'edit') {
          if (editor.isDirty() && !(await confirmDialog({ title: '¿Descartar lo que hay en el editor?', text: 'Tienes cambios sin aplicar que se perderán al abrir esta herramienta.', ok: 'Descartar', danger: true }))) return;
          loadForEdit(id);
        } else if (a === 'export') {
          const t = custom.get(id);
          download('herramienta-' + slugOf(t.name) + '.json', 'application/json', JSON.stringify({ formato: 'bruno-herramienta', version: 1, nombre: t.name, icono: t.icon, ejercicio: custom.exercise(id) }, null, 2));
          toast('Descarga iniciada.');
        } else if (a === 'del') {
          armedClick(b, '¿Eliminar?', () => {
            const t = custom.get(id);
            custom.remove(id);
            if (state.editing === id) { state.editing = null; pub.fill(null); }
            custom.refreshNav(); renderTools(el); toast('«' + (t ? t.name : 'Herramienta') + '» eliminada.');
          });
        }
      };
      $('input[data-a="file"]', el).onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => importTool(String(rd.result), el);
        rd.onerror = () => toast('No se pudo leer el archivo.');
        rd.readAsText(f); e.target.value = '';
      };
    }
    function importTool(text, el) {
      try {
        const p = JSON.parse(text);
        const isTool = p && p.formato === 'bruno-herramienta';
        const exr = isTool ? p.ejercicio : p;                       // también acepta un ejercicio suelto (JSON del editor)
        if (!exr || typeof exr !== 'object' || !Array.isArray(exr.questions)) throw new Error('no contiene un ejercicio con «questions»');
        const draft = cleanDraft(exr, false), res = compileDraft(draft);
        if (res.errors.length) throw new Error(res.errors[0].msg);
        const name = String((isTool && p.nombre) || draft.title || 'Ejercicio importado').trim().slice(0, 40) || 'Ejercicio importado';
        const id = custom.newId();
        if (!custom.save({ id, name, desc: draft.description, n: res.data.items.length, icon: isTool ? p.icono : null }, shapeOf(draft))) throw new Error('el navegador no permite guardar');
        custom.refreshNav(); renderTools(el); toast('«' + name + '» importada y añadida al menú.');
      } catch (err) { toast('No se pudo importar: ' + err.message + '.'); }
    }

    /* ---------- Montaje ---------- */
    const ex = createExercise(root, {
      id: 'crear', editable: true, defaultPane: 'quiz', sample: SAMPLE_EXERCISE,
      keys: { progress: 'ex_progreso_plantilla_base', bookmarks: 'bm_plantilla_base', exercise: 'ex_plantilla_base' },
      extraTabs: [{ id: 'tools', label: 'Mis herramientas', show: renderTools }],
      editorExtra: (el, api) => { editor = api; pub = buildPublish(el); },
      /* Si se está editando una herramienta, «Aplicar y practicar» también la guarda */
      onApply: () => {
        if (!state.editing) return;
        const t = custom.get(state.editing);
        if (!t) { state.editing = null; store.del(custom.EDITING); pub.fill(null); return; }
        if (persist(t.id, pub.name() || t.name, state.icon)) { custom.refreshNav(); editor.setStatus('Aplicado y guardado en «' + (pub.name() || t.name) + '»', 'ok'); pub.refresh(); }
      }
    });

    const want = new URLSearchParams(location.search).get('editar') || store.get(custom.EDITING);
    if (want) {
      const t = custom.get(want);
      if (!t) store.del(custom.EDITING);
      else if (new URLSearchParams(location.search).get('editar')) { loadForEdit(want); try { history.replaceState(null, '', location.pathname); } catch (e) { /* sin historial */ } }
      else { state.editing = want; pub.fill(t); }
    }
    return ex;
  }
});
