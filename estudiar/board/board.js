'use strict';

/* =========================================================
   BOARD (editor de texto enriquecido)
   Claves: «board_content» y «board_saved_at» (las de siempre)
   ========================================================= */
registerView({
  id: 'board',
  mount(root) {
    const KEY = 'board_content', KEY_AT = 'board_saved_at';
    let currentSize = '18', saveTimer = null, savedRange = null;

    const tool = (cmd, label, inner, extra) => h('button', { type: 'button', class: 'bd-tool', 'data-cmd': cmd, title: label, 'aria-label': label, 'aria-pressed': extra === 'toggle' ? 'false' : null, html: inner });
    const grp = (...k) => h('div', { class: 'bd-group' }, k);
    const fontSel = h('select', { class: 'select bd-sel', 'aria-label': 'Tipo de letra', title: 'Tipo de letra' },
      [['Avenir Next, Segoe UI, Helvetica Neue, Arial, sans-serif', 'Sin serifa'], ['Georgia, Cambria, Times New Roman, serif', 'Con serifa'], ['Segoe Print, Bradley Hand, Comic Sans MS, cursive', 'Manuscrita'], ['Consolas, Menlo, Courier New, monospace', 'Monoespaciada']].map(([v, t]) => h('option', { value: v, text: t })));
    const sizeSel = h('select', { class: 'select bd-sel', 'aria-label': 'Tamaño de letra', title: 'Tamaño de letra' },
      [12, 14, 16, 18, 20, 24, 32, 40, 48].map((n) => h('option', { value: n, text: n, selected: n === 18 })));
    const colorTool = (id, label, inner, val, swatch) => {
      const inp = h('input', { type: 'color', id, value: val, 'aria-label': label });
      return { inp, el: h('label', { class: 'bd-tool bd-color', title: label, style: '--swatch:' + swatch }, h('span', { html: inner }), inp) };
    };
    const tc = colorTool('bd-tc', 'Color del texto', '<b style="font-family:Georgia,serif">A</b>', '#c2410c', '#c2410c');
    const hc = colorTool('bd-hc', 'Resaltar texto', icon('pencil'), '#facc15', '#facc15');

    const toolbar = h('div', { class: 'bd-toolbar', role: 'toolbar', 'aria-label': 'Formato de texto' },
      grp(tool('undo', 'Deshacer (Ctrl+Z)', icon('undo')), tool('redo', 'Rehacer (Ctrl+Y)', icon('redo'))),
      grp(fontSel, sizeSel),
      grp(tool('bold', 'Negrita (Ctrl+B)', '<b class="read">B</b>', 'toggle'), tool('italic', 'Cursiva (Ctrl+I)', '<i class="read">I</i>', 'toggle'), tool('underline', 'Subrayado (Ctrl+U)', '<u class="read">U</u>', 'toggle'), tool('strikeThrough', 'Tachado', '<s class="read">S</s>', 'toggle')),
      grp(tc.el, hc.el),
      grp(tool('insertUnorderedList', 'Lista con viñetas', '<svg class="i" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>', 'toggle'),
        tool('insertOrderedList', 'Lista numerada', '<svg class="i" viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10"/><g fill="currentColor" stroke="none" font-size="7" font-weight="700"><text x="2" y="8.5">1</text><text x="2" y="14.5">2</text><text x="2" y="20.5">3</text></g></svg>', 'toggle')),
      grp(tool('justifyLeft', 'Alinear a la izquierda', '<svg class="i" viewBox="0 0 24 24"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>', 'toggle'), tool('justifyCenter', 'Centrar', '<svg class="i" viewBox="0 0 24 24"><path d="M4 6h16M7 10h10M4 14h16M7 18h10"/></svg>', 'toggle'), tool('justifyRight', 'Alinear a la derecha', '<svg class="i" viewBox="0 0 24 24"><path d="M4 6h16M10 10h10M4 14h16M10 18h10"/></svg>', 'toggle')),
      grp(tool('removeFormat', 'Quitar formato', '<svg class="i" viewBox="0 0 24 24"><path d="M4 5h11M9.5 5v11"/><path d="m14 15 6 6M20 15l-6 6"/></svg>')));

    const editor = h('div', { class: 'bd-editor', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Contenido del board', spellcheck: 'true', 'data-placeholder': 'Escribe una nota o pega texto aquí.' });
    const statusText = h('span');
    const status = h('span', { class: 'bd-status', 'data-state': 'idle', role: 'status' }, statusText);
    const countEl = h('span', { class: 'muted' });
    const foot = h('footer', { class: 'bd-foot' }, status, countEl,
      h('div', { class: 'bd-actions' },
        h('button', { type: 'button', class: 'btn sm', html: icon('download') + '<span>HTML</span>', onclick: () => {
          download('board-' + isoDate(new Date()) + '.html', 'text/html;charset=utf-8', '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Board</title>\n<style>body{max-width:720px;margin:2rem auto;padding:0 1rem;background:#fff;color:#1c2733;font:18px/1.65 "Avenir Next","Segoe UI",Arial,sans-serif}</style>\n</head>\n<body>\n' + editor.innerHTML + '\n</body>\n</html>\n');
        } }),
        h('button', { type: 'button', class: 'btn sm', html: icon('download') + '<span>Texto</span>', onclick: () => download('board-' + isoDate(new Date()) + '.txt', 'text/plain;charset=utf-8', editor.innerText || editor.textContent) }),
        h('button', { type: 'button', class: 'btn sm danger', html: icon('trash') + '<span>Vaciar</span>', onclick: askClear })));
    root.append(h('section', { class: 'bd-sheet' }, toolbar, editor, foot));

    function setStatus(state, text) { status.dataset.state = state; statusText.textContent = text; }
    function savedLabel(ts) {
      const d = new Date(ts), t = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      return d.toDateString() === new Date().toDateString() ? 'Guardado a las ' + t : 'Guardado el ' + d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ', ' + t;
    }
    function save() {
      clearTimeout(saveTimer); saveTimer = null;
      const now = Date.now();
      const ok = store.set(KEY, editor.innerHTML) && store.set(KEY_AT, String(now));
      if (ok) setStatus('ok', savedLabel(now)); else setStatus('error', 'No se puede guardar aquí. Descarga tu nota para no perderla.');
    }
    function scheduleSave() { setStatus('saving', 'Guardando…'); clearTimeout(saveTimer); saveTimer = setTimeout(save, 500); }

    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (sel.rangeCount && editor.contains(sel.anchorNode)) { savedRange = sel.getRangeAt(0).cloneRange(); updateToolState(); }
    });
    function restoreSelection() {
      editor.focus({ preventScroll: true });
      if (savedRange) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
    }
    function updateToolState() {
      $$('.bd-tool[aria-pressed]', toolbar).forEach((b) => { try { b.setAttribute('aria-pressed', String(document.queryCommandState(b.dataset.cmd))); } catch (e) { /* no disponible */ } });
    }
    // execCommand('fontSize') solo admite 1-7: se marca con 7 y se cambia por el tamaño real
    function normalizeSizes() {
      $$('font[size="7"]', editor).forEach((el) => { el.removeAttribute('size'); el.style.fontSize = currentSize + 'px'; });
      $$('span[style*="xxx-large"]', editor).forEach((el) => { el.style.fontSize = currentSize + 'px'; });
    }
    function updateCount() {
      const t = (editor.innerText || editor.textContent || '').trim(), w = t ? t.split(/\s+/).length : 0;
      countEl.textContent = w + (w === 1 ? ' palabra' : ' palabras') + ', ' + t.length + ' caracteres';
    }
    function afterEdit() {
      normalizeSizes();
      if (['<br>', '<div><br></div>', '<p><br></p>'].includes(editor.innerHTML)) editor.innerHTML = '';
      updateCount(); scheduleSave();
    }
    function run(fn) { restoreSelection(); fn(); afterEdit(); updateToolState(); }

    toolbar.addEventListener('mousedown', (e) => { if (e.target.closest('button.bd-tool')) e.preventDefault(); });
    $$('button.bd-tool[data-cmd]', toolbar).forEach((b) => b.addEventListener('click', () => run(() => document.execCommand(b.dataset.cmd))));
    fontSel.addEventListener('change', () => run(() => document.execCommand('fontName', false, fontSel.value)));
    sizeSel.addEventListener('change', () => {
      currentSize = sizeSel.value;
      run(() => { document.execCommand('styleWithCSS', false, false); document.execCommand('fontSize', false, '7'); document.execCommand('styleWithCSS', false, true); });
    });
    function bindColor(c, cmd) {
      c.inp.addEventListener('input', () => c.el.style.setProperty('--swatch', c.inp.value));
      c.inp.addEventListener('change', () => run(() => {
        if (cmd === 'hiliteColor') { if (!document.execCommand('hiliteColor', false, c.inp.value)) document.execCommand('backColor', false, c.inp.value); }
        else document.execCommand(cmd, false, c.inp.value);
      }));
    }
    bindColor(tc, 'foreColor'); bindColor(hc, 'hiliteColor');

    editor.addEventListener('input', afterEdit);
    editor.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
    document.addEventListener('keydown', (e) => { if (app.isActive('board') && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } });
    window.addEventListener('pagehide', () => { if (saveTimer) save(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) save(); });

    function clearBoard() {
      const backup = editor.innerHTML;
      editor.innerHTML = ''; save(); updateCount();
      toast('Board vaciado.', { label: 'Deshacer', run: () => { editor.innerHTML = backup; save(); updateCount(); } });
    }
    async function askClear() {
      if (!editor.innerHTML.trim()) { toast('El board ya está vacío.'); return; }
      if (await confirmDialog({ title: '¿Vaciar el board?', text: 'Se borrará todo el contenido guardado. Podrás deshacerlo durante unos segundos.', ok: 'Vaciar board', danger: true })) clearBoard();
    }

    try { document.execCommand('defaultParagraphSeparator', false, 'div'); document.execCommand('styleWithCSS', false, true); } catch (e) { /* ignorar */ }
    const stored = store.get(KEY);
    if (stored) editor.innerHTML = stored;
    const at = Number(store.get(KEY_AT));
    setStatus(stored && at ? 'ok' : 'idle', stored && at ? savedLabel(at) : 'Se guarda solo mientras escribes');
    updateCount();
    return { show() { editor.focus({ preventScroll: true }); }, hide() { if (saveTimer) save(); } };
  }
});
