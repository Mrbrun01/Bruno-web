'use strict';
/* =========================================================
   NÚCLEO COMPARTIDO  (se carga en todas las páginas)
   Utilidades, iconos, avisos y confirmaciones, la estructura de la página
   (menú lateral + barra superior) y las preferencias de interfaz: tema,
   estilo visual, nombre, barra lateral y sonido.

   Cada página carga este archivo y después el de su herramienta, que se
   anuncia con registerView(). El catálogo de herramientas está en tools.js.
   ========================================================= */

/* Carpeta raíz de la web, deducida de la ubicación de este mismo archivo (assets/js/core.js) */
const ROOT = new URL('../../', document.currentScript.src).href;
function toolUrl(id) {
  const t = TOOLS.find((x) => x.id === id);
  return ROOT + (t ? t.path : '') + 'index.html' + (t && t.query ? t.query : '');
}

/* =========================================================
   UTILIDADES
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const pad2 = (n) => String(n).padStart(2, '0');
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const fold = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Crea elementos sin pasar por innerHTML (el texto siempre se escapa) */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => {
    if (c == null || c === false) return;
    el.append(c.nodeType ? c : document.createTextNode(c));
  });
  return el;
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/* localStorage puede fallar (modo privado, archivos locales…): siempre protegido */
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } },
  json(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  setJson(k, v) { return store.set(k, JSON.stringify(v)); }
};

function download(name, mime, content) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Dígitos de ancho fijo para relojes (los usan Inicio y Reloj) */
function digitSpans(text) {
  return text.split('').map((c) => (/\d/.test(c) ? '<span class="dg">' + c + '</span>' : '<span class="cn">' + c + '</span>')).join('');
}

/* =========================================================
   ICONOS (trazo, 24×24)
   ========================================================= */
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h4.5v-6h4v6h4.5V10"/>',
  horario: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9.5h18M9 9.5V20"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/>',
  notes: '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  board: '<path d="M5 6.5V4h14v2.5M12 4v16M9 20h6"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-1.2-1-1.6-1-2.6 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4c0-4-4-8-9-8z"/><circle cx="7.5" cy="11" r=".9" fill="currentColor"/><circle cx="10" cy="7" r=".9" fill="currentColor"/><circle cx="15" cy="7" r=".9" fill="currentColor"/>',
  verbs: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  spell: '<text x="3.2" y="16.5" font-size="12" font-weight="800" fill="currentColor" stroke="none" font-family="Arial,sans-serif">Pq</text>',
  chat: '<text x="3" y="18" font-size="13" font-weight="800" fill="currentColor" stroke="none" font-family="Arial,sans-serif">¿!</text>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7.5h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
  guess: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 .4c0 1.7-2.5 2.1-2.5 3.6M12 17h.01"/>',
  snake: '<path d="M3 15c2 2.1 4 2.1 6 0s4-2.1 6 0 4 2.1 6 0"/><circle cx="19.6" cy="13.9" r=".9" fill="currentColor"/>',
  fruit: '<circle cx="8.5" cy="15" r="4.3"/><circle cx="15" cy="10.2" r="3.5"/><path d="M13.3 5.3c.9-1.4 2.6-1.9 3.9-1.2" /><path d="M8.7 10.7c.5-1.1 1.5-1.7 2.3-1.7"/>',
  ttt: '<path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 9.4v5.2l4.6-2.6z" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4"/><path d="M5 20h14"/>',
  upload: '<path d="M12 15V4m0 0L8 8m4-4 4 4"/><path d="M5 20h14"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0 0-3l-1-1a2.1 2.1 0 0 0-3 0L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  star: '<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6z"/>',
  bookmark: '<path d="M6 3.5h12v17l-6-4-6 4z"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
  eraser: '<path d="M8 20h12"/><path d="M5.4 14.6l8.2-8.2a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11.2 20H7.4l-2-2a2 2 0 0 1 0-2.8z"/>',
  bucket: '<path d="M4.5 12L12 4.5 19.5 12 12 19.5z"/><path d="M19 15.5s2 2.1 2 3.4a2 2 0 0 1-4 0c0-1.3 2-3.4 2-3.4z"/>',
  line: '<path d="M5 19L19 5"/>',
  rect: '<rect x="4" y="5.5" width="16" height="13" rx="2"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v5h5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  chevL: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  chevR: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  prev: '<path d="M6 5v14M19 5.5v13L9 12z"/>',
  next: '<path d="M18 5v14M5 5.5v13L15 12z"/>',
  repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H20M7 21l-3-3 3-3"/><path d="M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H4"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  pawn: '<circle cx="12" cy="6.3" r="2.3"/><path d="M9.4 10.6c0-1.4 1.2-2.1 2.6-2.1s2.6.7 2.6 2.1c0 1.2-.9 2.1-1.5 3.3h2l1.2 5.6H7.7l1.2-5.6h2c-.6-1.2-1.5-2.1-1.5-3.3z"/><path d="M7.2 21h9.6"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="8.3" cy="8.3" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.7" cy="8.3" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.3" cy="15.7" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.7" cy="15.7" r="1.1" fill="currentColor" stroke="none"/>',
  cards: '<rect x="3" y="6" width="12" height="15" rx="2" transform="rotate(-8 9 13.5)"/><rect x="9" y="4" width="12" height="15" rx="2"/>',
  spade: '<path d="M12 3c3.6 3.6 7 6.1 7 9.5a3.6 3.6 0 0 1-6.1 2.5c.1 1.6.6 3 1.7 4.5H9.4c1.1-1.5 1.6-2.900 1.700-4.500A3.600 3.600 0 0 1 5 12.500C5 9.100 8.400 6.600 12 3z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7M18.1 18.1l-1.7-1.7M7.6 7.6 5.9 5.9"/>'
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

/* =========================================================
   HERRAMIENTAS PROPIAS
   Ejercicios que la persona publica desde el Creador de ejercicios.
   En el navegador se guardan dos cosas:
     · un índice pequeño (nombre, icono, nº de preguntas) que lee CADA página
       para pintar el menú lateral y Inicio;
     · el ejercicio completo de cada herramienta, que solo lee su propia página.
   Cada herramienta propia se abre en practicar/personalizado/?id=…
   Su icono es uno de la lista (builtin) o trazos SVG dibujados por la persona
   (paths); estos se validan para que solo contengan comandos de trazado.
   ========================================================= */
const ICON_PICKS = ['book', 'edit', 'star', 'flag', 'bookmark', 'check', 'spell', 'verbs', 'chat', 'globe', 'cards', 'dice', 'pawn', 'ttt', 'guess', 'calc', 'clock', 'notes', 'calendar', 'film', 'link', 'user', 'palette', 'board'];
const ICON_PATH_RE = /^[MmLlCcAaZzHhVv0-9eE+\-., ]{1,2600}$/;
const custom = {
  INDEX: 'crear:herramientas',
  EDITING: 'crear:editando',
  exKey: (id) => 'crear:ejercicio:' + id,
  progressKeys: (id) => ['ex_progreso_custom_' + id, 'bm_custom_' + id],
  newId: () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
  cleanIcon(spec) {
    if (!spec || typeof spec !== 'object') return null;
    if (typeof spec.builtin === 'string' && ICON_PICKS.includes(spec.builtin)) return { builtin: spec.builtin };
    if (Array.isArray(spec.paths)) {
      const paths = spec.paths.filter((d) => typeof d === 'string' && ICON_PATH_RE.test(d)).slice(0, 24);
      if (paths.length) return { paths };
    }
    return null;
  },
  iconInner(spec) {
    const s = this.cleanIcon(spec) || { builtin: 'book' };
    return s.builtin ? ICONS[s.builtin] : s.paths.map((d) => '<path d="' + d + '"/>').join('');
  },
  svg(spec, cls = '') {
    return '<svg class="i ' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + this.iconInner(spec) + '</svg>';
  },
  list() {
    const raw = store.json(this.INDEX, []);
    return (Array.isArray(raw) ? raw : [])
      .filter((t) => t && typeof t.id === 'string' && /^[a-z0-9]{3,24}$/.test(t.id) && typeof t.name === 'string' && t.name.trim())
      .map((t) => ({ id: t.id, name: t.name.trim().slice(0, 40), desc: String(t.desc || '').slice(0, 200), n: Number(t.n) || 0, icon: this.cleanIcon(t.icon) }));
  },
  get(id) { return this.list().find((t) => t.id === id) || null; },
  exercise(id) { const e = store.json(this.exKey(id), null); return e && typeof e === 'object' ? e : null; },
  save(entry, exercise) {
    const list = this.list(), i = list.findIndex((t) => t.id === entry.id);
    const clean = { id: entry.id, name: String(entry.name).trim().slice(0, 40), desc: String(entry.desc || '').trim().slice(0, 200), n: Number(entry.n) || 0, icon: this.cleanIcon(entry.icon) };
    if (i >= 0) list[i] = clean; else list.push(clean);
    return store.setJson(this.exKey(entry.id), exercise) && store.setJson(this.INDEX, list);
  },
  remove(id) {
    store.setJson(this.INDEX, this.list().filter((t) => t.id !== id));
    store.del(this.exKey(id));
    this.progressKeys(id).forEach((k) => store.del(k));
    if (store.get(this.EDITING) === id) store.del(this.EDITING);
  },
  /* Vuelca el índice en el catálogo (TOOLS) y en los iconos; así el menú y Inicio las ven como a cualquier otra */
  sync() {
    for (let i = TOOLS.length - 1; i >= 0; i--) if (TOOLS[i].custom) TOOLS.splice(i, 1);
    Object.keys(ICONS).forEach((k) => { if (k.startsWith('custom-')) delete ICONS[k]; });
    this.list().forEach((t) => {
      const key = 'custom-' + t.id;
      ICONS[key] = this.iconInner(t.icon);
      TOOLS.push({
        id: key, path: 'practicar/personalizado/', query: '?id=' + t.id, group: 'practicar', icon: key, title: t.name,
        desc: t.desc || 'Ejercicio creado por ti en el Creador de ejercicios.',
        tile: (t.n ? t.n + (t.n === 1 ? ' pregunta' : ' preguntas') + ' · ' : '') + 'ejercicio tuyo',
        custom: true
      });
    });
  },
  refreshNav() {
    this.sync(); shell.buildNav();
    $$('.nav-link').forEach((a) => { if (a.dataset.id === app.current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
};
custom.sync();

/* =========================================================
   AVISO (toast) Y CONFIRMACIÓN
   ========================================================= */
let toastEl, toastText, toastBtn, toastTimer, toastAction = null;
function toast(message, action) {
  if (!toastEl) {
    toastText = h('span');
    toastBtn = h('button', { type: 'button', hidden: true, onclick: () => { const a = toastAction; hideToast(); if (a) a.run(); } });
    toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }, toastText, toastBtn);
    document.body.append(toastEl);
  }
  toastText.textContent = message;
  toastAction = action || null;
  toastBtn.hidden = !action;
  if (action) toastBtn.textContent = action.label;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 7000 : 3200);
}
function hideToast() { if (toastEl) toastEl.classList.remove('show'); }

let confirmDlg;
function confirmDialog({ title, text = '', ok = 'Aceptar', cancel = 'Cancelar', danger = false }) {
  if (!confirmDlg) {
    confirmDlg = h('dialog', { class: 'dlg', 'aria-labelledby': 'confirm-title' },
      h('div', { class: 'dlg-head' }, h('h2', { id: 'confirm-title' })),
      h('div', { class: 'dlg-body' }, h('p', { class: 'muted', style: 'margin:0' })),
      h('div', { class: 'dlg-foot' },
        h('button', { type: 'button', class: 'btn', 'data-r': '0' }),
        h('button', { type: 'button', class: 'btn primary', 'data-r': '1' })));
    document.body.append(confirmDlg);
  }
  $('h2', confirmDlg).textContent = title;
  $('.dlg-body p', confirmDlg).textContent = text;
  $('.dlg-body', confirmDlg).hidden = !text;
  const [bCancel, bOk] = $$('button', confirmDlg);
  bCancel.textContent = cancel;
  bOk.textContent = ok;
  bOk.className = 'btn ' + (danger ? 'danger' : 'primary');
  return new Promise((resolve) => {
    const done = (v) => { confirmDlg.removeEventListener('close', onClose); confirmDlg.close(); resolve(v); };
    const onClose = () => resolve(false);
    bCancel.onclick = () => done(false);
    bOk.onclick = () => done(true);
    confirmDlg.addEventListener('close', onClose, { once: true });
    if (typeof confirmDlg.showModal === 'function') confirmDlg.showModal();
    else resolve(window.confirm(title));
  });
}

/* Botones de «dos pasos»: el primer clic pide confirmar, el segundo actúa */
function armedClick(btn, armedText, action) {
  if (btn.dataset.armed) { action(); return; }
  btn.dataset.armed = '1';
  btn.dataset.label = btn.textContent;
  btn.textContent = armedText;
  btn.classList.add('armed');
  setTimeout(() => {
    if (!btn.isConnected) return;
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
    btn.classList.remove('armed');
  }, 2500);
}

/* =========================================================
   VISTA DE LA PÁGINA Y ESTADO GLOBAL
   Cada página registra una única vista: su herramienta. Los metadatos
   (título, icono, descripción…) salen de TOOLS (tools.js).
   ========================================================= */
const VIEWS = [];
function registerView(v) {
  const meta = TOOLS.find((t) => t.id === v.id) || {};
  VIEWS.push(Object.assign({}, meta, v));
}

const app = {
  current: null,
  isActive: (id) => app.current === id,
  name: () => shell.userName || 'Bruno',
  go: (id) => { location.href = toolUrl(id); }
};

/* =========================================================
   ESTRUCTURA DE LA PÁGINA: navegación, rutas y temas
   ========================================================= */
const shell = {
  buildNav() {
    const nav = $('#nav');
    nav.textContent = '';
    const groups = {};
    TOOLS.forEach((v) => { (groups[v.group] = groups[v.group] || []).push(v); });
    Object.keys(GROUPS).forEach((g) => {
      if (!groups[g]) return;
      const box = h('div', { class: 'nav-group' });
      if (GROUPS[g]) box.append(h('h2', { text: GROUPS[g] }));
      groups[g].forEach((v) => {
        box.append(h('a', { class: 'nav-link', href: toolUrl(v.id), 'data-id': v.id, title: v.short || v.title, html: icon(v.icon) + '<span>' + esc(v.short || v.title) + '</span>' }));
      });
      nav.append(box);
    });
  },

  routeId() {
    return document.body.dataset.tool || (VIEWS[0] && VIEWS[0].id) || 'inicio';
  },

  show(id) {
    const view = VIEWS.find((v) => v.id === id);
    if (!view) { console.error('Herramienta no registrada: ' + id); return; }
    app.current = id;

    const section = h('section', { class: 'view', id: 'view-' + id, hidden: true });
    const body = h('div', { class: 'view-body' });
    if (!view.noHead) {
      section.append(h('header', { class: 'page-head' },
        h('h1', { tabindex: '-1', text: view.title }),
        view.desc ? h('p', { text: view.desc }) : null));
    }
    section.append(body);
    $('#main').append(section);
    let api = {};
    try {
      api = view.mount(body, { view }) || {};
    } catch (err) {
      console.error(err);
      body.append(h('div', { class: 'card empty' }, h('h2', { text: 'No se ha podido cargar esta herramienta' }), h('p', { text: 'Recarga la página. Si el fallo continúa, el detalle está en la consola del navegador.' })));
    }
    section.hidden = false;
    if (api.show) api.show();

    $$('.nav-link').forEach((a) => {
      if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    this.updateTitle();
  },

  updateTitle() {
    const view = VIEWS.find((v) => v.id === app.current);
    if (!view) return;
    document.title = (view.id === 'inicio' ? 'Inicio' : view.title) + ' · ' + app.name();
  },

  route() { this.show(this.routeId()); },

  /* ---------- Tema claro / oscuro / automático ---------- */
  theme: 'auto',
  applyTheme(mode) {
    this.theme = mode;
    const root = document.documentElement;
    if (mode === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
    store.set('ui-tema', mode);
  },
  cycleTheme() {
    const order = ['auto', 'light', 'dark'];
    this.applyTheme(order[(order.indexOf(this.theme) + 1) % order.length]);
  },

  /* ---------- Estilo visual: Index (por defecto), Board o Fiz ---------- */
  styleName: 'index',
  applyStyle(name) {
    if (!['index', 'board', 'fiz', 'pastel', 'bosque', 'oceano'].includes(name)) name = 'index';
    this.styleName = name;
    document.documentElement.setAttribute('data-style', name);
    store.set('ui-estilo', name);
    document.dispatchEvent(new CustomEvent('estilo-cambiado'));
  },

  /* ---------- Nombre de usuario ---------- */
  userName: 'Bruno',
  applyName(name) {
    const clean = String(name || '').trim().slice(0, 30) || 'Bruno';
    this.userName = clean;
    store.set('ui-nombre', clean);
    const initial = clean.charAt(0).toUpperCase();
    $$('[data-name]').forEach((el) => { el.textContent = clean; });
    $$('[data-initial]').forEach((el) => { el.textContent = initial; });
    let fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = h('link', { rel: 'icon' }); document.head.append(fav); }
    fav.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23FFD426'/%3E%3Ctext x='12' y='17.5' font-family='Arial,sans-serif' font-weight='800' font-size='14' text-anchor='middle' fill='%23171C33'%3E" + encodeURIComponent(initial) + "%3C/text%3E%3C/svg%3E";
    this.updateTitle();
  },

  /* ---------- Modo de la barra lateral: fija, contraída o contraída con hover ---------- */
  navMode: 'full',
  applyNav(mode) {
    if (!['full', 'compact', 'hover'].includes(mode)) mode = 'full';
    this.navMode = mode;
    document.body.setAttribute('data-nav', mode);
    store.set('ui-nav', mode);
  },

  /* ---------- Sonido de la interfaz ---------- */
  soundOn: true,
  audioCtx: null,
  applySound(on) {
    this.soundOn = !!on;
    store.set('ui-sonido', this.soundOn ? '1' : '0');
  },
  ensureAudio() {
    if (!this.audioCtx) { try { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.audioCtx = null; } }
    return this.audioCtx;
  },
  playClick() {
    if (!this.soundOn) return;
    const ctx = this.ensureAudio(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(760, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.09);
  }
};

/* La estructura de la página (menú lateral, barra superior y contenedor principal) la crea el núcleo,
   así hay un único sitio donde cambiarla para todas las herramientas. */
function buildShell() {
  document.body.insertAdjacentHTML('afterbegin', `
<div class="shell">
  <aside class="side" id="side" aria-label="Navegación principal">
    <a class="brand" href="${toolUrl('ajustes')}" aria-label="Ir a personalización"><span class="brand-mark" data-initial>B</span><span><span class="brand-name" data-name>Bruno</span><span class="brand-sub">Personalización</span></span></a>
    <nav class="nav" id="nav" aria-label="Herramientas"></nav>
    <div class="side-foot">
      <p>© 2024 Bruno Iglesias Cal</p>
    </div>
  </aside>
  <div class="scrim" id="scrim"></div>
  <div class="content">
    <header class="topbar">
      <button class="icon-btn" id="menuBtn" type="button" aria-label="Abrir el menú" aria-expanded="false" aria-controls="side"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      <a class="brand" href="${toolUrl('ajustes')}" aria-label="Ir a personalización"><span class="brand-mark" data-initial>B</span><span><span class="brand-name" data-name>Bruno</span></span></a>
    </header>
    <main class="main" id="main"></main>
  </div>
</div>
`);
}

function bootShell() {
  buildShell();
  shell.buildNav();
  $('#menuBtn').addEventListener('click', () => {
    const open = !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', open);
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  });
  $('#scrim').addEventListener('click', () => { document.body.classList.remove('nav-open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      document.body.classList.remove('nav-open');
      $('#menuBtn').setAttribute('aria-expanded', 'false');
      $('#menuBtn').focus();
    }
  });
  const savedTheme = store.get('ui-tema', 'auto');
  shell.applyTheme(['auto', 'light', 'dark'].includes(savedTheme) ? savedTheme : 'auto');
  const savedStyle = store.get('ui-estilo', 'index');
  shell.applyStyle(['index', 'board', 'fiz', 'pastel', 'bosque', 'oceano'].includes(savedStyle) ? savedStyle : 'index');
  shell.applyName(store.get('ui-nombre', 'Bruno'));
  shell.applyNav(store.get('ui-nav', 'full'));
  shell.applySound(store.get('ui-sonido', '1') !== '0');
  document.addEventListener('click', (e) => {
    const src = (e.composedPath && e.composedPath()[0]) || e.target; /* también cuenta lo pulsado dentro de un shadow root */
    const t = src.closest && src.closest('button, a, [role="link"], [role="radio"], [role="tab"], [role="button"]');
    if (t) shell.playClick();
  }, true);

  shell.route();
}

/* Los scripts de la página (incluido el de su herramienta) ya se han ejecutado cuando se dispara este evento */
document.addEventListener('DOMContentLoaded', bootShell);
