'use strict';
/* =========================================================
   HERRAMIENTA PROPIA
   Una sola página para todas las herramientas creadas en el Creador de ejercicios:
   la dirección lleva el identificador (…/personalizado/?id=…) y el ejercicio se lee
   del navegador. El nombre y el icono ya salen del catálogo (custom.sync en core.js).
   ========================================================= */
const CUSTOM_ID = new URLSearchParams(location.search).get('id') || '';
const CUSTOM_ENTRY = custom.get(CUSTOM_ID);
document.body.dataset.tool = CUSTOM_ENTRY ? 'custom-' + CUSTOM_ID : 'personalizado';

const customView = {
  id: document.body.dataset.tool,
  mount(root) {
    const missing = (title, text) => {
      root.append(h('div', { class: 'card empty' }, h('h2', { text: title }), h('p', { class: 'muted', text }), h('a', { class: 'btn primary', href: toolUrl('crear'), text: 'Ir al Creador de ejercicios' })));
      return {};
    };
    if (!CUSTOM_ENTRY) return missing('Esta herramienta no existe aquí', 'Las herramientas propias se guardan en el navegador donde se crearon. Puedes crearla de nuevo o importarla desde «Mis herramientas».');
    const raw = custom.exercise(CUSTOM_ID);
    const compiled = raw ? compileDraft(cleanDraft(raw, true)) : null;
    if (!compiled || compiled.errors.length) return missing('No se pudo cargar el ejercicio', 'Faltan datos o están dañados. Ábrelo en el Creador de ejercicios para revisarlo.');

    const bar = h('div', { class: 'actions', style: 'margin-bottom:14px' },
      h('a', { class: 'btn sm', href: toolUrl('crear') + '?editar=' + CUSTOM_ID, html: icon('edit') + '<span>Editar en el Creador</span>' }));
    const box = h('div');
    root.append(bar, box);
    return createExercise(box, {
      id: 'custom-' + CUSTOM_ID, editable: false, defaultPane: 'quiz',
      keys: { progress: 'ex_progreso_custom_' + CUSTOM_ID, bookmarks: 'bm_custom_' + CUSTOM_ID },
      build: () => compiled.data
    });
  }
};
if (!CUSTOM_ENTRY) { customView.title = 'Herramienta no encontrada'; customView.desc = 'No hay ninguna herramienta propia con este identificador en este navegador.'; }
registerView(customView);
