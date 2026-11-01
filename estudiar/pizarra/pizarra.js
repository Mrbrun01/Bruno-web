'use strict';

/* =========================================================
   PIZARRA
   ========================================================= */
registerView({
  id: 'pizarra',
  mount(root) {
    const COLORS = [['#1b1b1b', 'Negro'], ['#ffffff', 'Blanco'], ['#e53935', 'Rojo'], ['#fb8c00', 'Naranja'], ['#ffcc00', 'Amarillo'], ['#7cb342', 'Verde'], ['#00897b', 'Turquesa'], ['#1e88e5', 'Azul'], ['#5e35b1', 'Violeta'], ['#d81b60', 'Rosa'], ['#8d6e63', 'Marrón'], ['#9e9e9e', 'Gris']];
    const TOOLS = [['pencil', 'Lápiz', 'pencil'], ['eraser', 'Goma', 'eraser'], ['fill', 'Rellenar', 'bucket'], ['line', 'Línea', 'line'], ['rect', 'Cuadrado', 'rect'], ['ellipse', 'Círculo', 'ellipse']];
    const MAX_HISTORY = 40;
    const state = { tool: 'pencil', color: '#1b1b1b', size: 10, fillShapes: false };
    const undoStack = [], redoStack = [];
    let drawing = false, start = null, last = null, mid = null, baseImage = null;

    const canvas = h('canvas', { class: 'pz-canvas', width: '800', height: '600', 'aria-label': 'Pizarra de dibujo' });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const toolBtns = TOOLS.map(([id, label, ic]) => h('button', { type: 'button', class: 'pz-tool', 'data-tool': id, 'aria-pressed': String(id === 'pencil'), html: icon(ic) + '<span>' + label + '</span>', onclick: () => { state.tool = id; toolBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === id))); } }));
    const swatchBox = h('div', { class: 'pz-swatches' });
    const picker = h('input', { type: 'color', value: '#1b1b1b', 'aria-label': 'Elegir otro color', oninput: (e) => setColor(e.target.value) });
    const sizeDot = h('div', { class: 'pz-dot' });
    const sizeText = h('span');
    const slider = h('input', { type: 'range', min: '1', max: '200', value: '10', 'aria-label': 'Grosor del trazo', oninput: (e) => setSize(e.target.value) });
    const fillChk = h('input', { type: 'checkbox', onchange: (e) => { state.fillShapes = e.target.checked; } });
    const wIn = h('input', { class: 'input', id: 'pz-w', type: 'number', min: '100', max: '2000', value: '800' });
    const hIn = h('input', { class: 'input', id: 'pz-h', type: 'number', min: '100', max: '2000', value: '600' });
    const undoBtn = h('button', { type: 'button', class: 'btn sm', disabled: true, title: 'Ctrl + Z', html: icon('undo') + '<span>Deshacer</span>', onclick: undo });
    const redoBtn = h('button', { type: 'button', class: 'btn sm', disabled: true, title: 'Ctrl + Y', html: icon('redo') + '<span>Rehacer</span>', onclick: redo });
    const nameIn = h('input', { class: 'input', type: 'text', value: 'mi-dibujo', maxlength: '60', 'aria-label': 'Nombre del archivo' });

    const side = h('aside', { class: 'card pz-side', 'aria-label': 'Herramientas de dibujo' },
      h('div', { class: 'pz-group' }, h('h2', { text: 'Herramienta' }), h('div', { class: 'pz-tools' }, toolBtns)),
      h('div', { class: 'pz-group' }, h('h2', { text: 'Color' }), swatchBox, h('label', { class: 'pz-custom' }, picker, h('span', { text: 'Otro color' }))),
      h('div', { class: 'pz-group' }, h('h2', { text: 'Grosor' }),
        h('div', { class: 'pz-size' }, slider, h('div', { class: 'pz-preview', 'aria-hidden': 'true' }, sizeDot)),
        h('p', { class: 'muted pz-px' }, sizeText, ' px'),
        h('label', { class: 'pz-check' }, fillChk, 'Formas rellenas')),
      h('div', { class: 'pz-group' }, h('h2', { text: 'Tamaño de la pizarra' }),
        h('div', { class: 'pz-dims' }, h('label', { class: 'field', for: 'pz-w' }, 'Ancho', wIn), h('label', { class: 'field', for: 'pz-h' }, 'Alto', hIn)),
        h('button', { type: 'button', class: 'btn sm', text: 'Cambiar tamaño', onclick: resize })),
      h('div', { class: 'pz-group pz-actions' },
        h('div', { class: 'pz-row' }, undoBtn, redoBtn),
        h('button', { type: 'button', class: 'btn sm danger', html: icon('trash') + '<span>Borrar todo</span>', onclick: () => { fillWhite(); pushHistory(); toast('Pizarra borrada.', { label: 'Deshacer', run: undo }); } }),
        h('label', { class: 'field' }, 'Nombre del archivo', nameIn),
        h('button', { type: 'button', class: 'btn primary', html: icon('download') + '<span>Descargar imagen</span>', onclick: downloadPng })));
    root.append(h('div', { class: 'pz-layout' }, side, h('div', { class: 'pz-stage' }, canvas)));

    /* ---------- Historial ---------- */
    const snap = () => ({ w: canvas.width, h: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height) });
    function pushHistory() { undoStack.push(snap()); if (undoStack.length > MAX_HISTORY) undoStack.shift(); redoStack.length = 0; buttons(); }
    function restore(s) { canvas.width = s.w; canvas.height = s.h; ctx.putImageData(s.data, 0, 0); wIn.value = s.w; hIn.value = s.h; }
    function undo() { if (undoStack.length < 2) return; redoStack.push(undoStack.pop()); restore(undoStack[undoStack.length - 1]); buttons(); }
    function redo() { if (!redoStack.length) return; const s = redoStack.pop(); undoStack.push(s); restore(s); buttons(); }
    function buttons() { undoBtn.disabled = undoStack.length < 2; redoBtn.disabled = !redoStack.length; }

    /* ---------- Utilidades ---------- */
    function fillWhite() { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    function pos(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; }
    const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    function setup() { ctx.lineWidth = state.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = state.tool === 'eraser' ? '#fff' : state.color; ctx.fillStyle = state.color; }
    const freehand = () => state.tool === 'pencil' || state.tool === 'eraser';

    function shape(a, b) {
      ctx.beginPath();
      if (state.tool === 'line') { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); return; }
      if (state.tool === 'rect') ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
      else ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
      state.fillShapes ? ctx.fill() : ctx.stroke();
    }
    function floodFill(px, py) {
      const w = canvas.width, hh = canvas.height, x0 = Math.floor(px), y0 = Math.floor(py);
      if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= hh) return false;
      const img = ctx.getImageData(0, 0, w, hh), d = img.data, [r, g, b] = rgb(state.color), i0 = (y0 * w + x0) * 4;
      const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
      if (tr === r && tg === g && tb === b) return false;
      const match = (i) => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) <= 60;
      const seen = new Uint8Array(w * hh), stack = [x0, y0];
      while (stack.length) {
        const cy = stack.pop(); let lx = stack.pop(), idx = cy * w + lx;
        while (lx >= 0 && !seen[idx] && match(idx * 4)) { lx--; idx--; }
        lx++; idx++;
        let up = false, down = false;
        while (lx < w && !seen[idx] && match(idx * 4)) {
          seen[idx] = 1; const p = idx * 4; d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
          if (cy > 0) { const m = !seen[idx - w] && match((idx - w) * 4); if (m && !up) { stack.push(lx, cy - 1); up = true; } else if (!m) up = false; }
          if (cy < hh - 1) { const m = !seen[idx + w] && match((idx + w) * 4); if (m && !down) { stack.push(lx, cy + 1); down = true; } else if (!m) down = false; }
          lx++; idx++;
        }
      }
      ctx.putImageData(img, 0, 0); return true;
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const p = pos(e);
      if (state.tool === 'fill') { if (floodFill(p.x, p.y)) pushHistory(); return; }
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      drawing = true; start = last = mid = p; setup();
      if (freehand()) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.01, p.y); ctx.stroke(); }
      else baseImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const p = pos(ev);
        if (freehand()) {
          const m = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
          ctx.beginPath(); ctx.moveTo(mid.x, mid.y); ctx.quadraticCurveTo(last.x, last.y, m.x, m.y); ctx.stroke();
          last = p; mid = m;
        } else { ctx.putImageData(baseImage, 0, 0); shape(start, p); }
      }
    });
    function stop() {
      if (!drawing) return; drawing = false;
      if (freehand()) { ctx.beginPath(); ctx.moveTo(mid.x, mid.y); ctx.lineTo(last.x, last.y); ctx.stroke(); }
      baseImage = null; pushHistory();
    }
    canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop);

    /* ---------- Color, grosor y acciones ---------- */
    COLORS.forEach(([hex, name]) => swatchBox.append(h('button', { type: 'button', class: 'pz-sw', style: 'background:' + hex, title: name, 'aria-label': name, 'data-color': hex, 'aria-pressed': String(hex === state.color), onclick: () => setColor(hex) })));
    function setColor(hex) {
      state.color = hex; picker.value = hex; sizeDot.style.background = hex;
      $$('.pz-sw', swatchBox).forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.color === hex)));
    }
    function setSize(v) { state.size = Number(v); sizeText.textContent = state.size; const s = Math.min(state.size, 56); sizeDot.style.width = sizeDot.style.height = s + 'px'; }
    function resize() {
      const c = (v) => clamp(parseInt(v, 10) || 800, 100, 2000);
      const w = c(wIn.value), hh = c(hIn.value);
      wIn.value = w; hIn.value = hh;
      if (w === canvas.width && hh === canvas.height) return;
      const tmp = h('canvas', { width: canvas.width, height: canvas.height });
      tmp.getContext('2d').drawImage(canvas, 0, 0);
      canvas.width = w; canvas.height = hh; fillWhite(); ctx.drawImage(tmp, 0, 0); pushHistory();
      toast('Tamaño cambiado a ' + w + ' × ' + hh + '.');
    }
    function downloadPng() {
      const name = (nameIn.value.trim() || 'mi-dibujo').replace(/[\\/:*?"<>|]/g, '-');
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = h('a', { href: url, download: name + '.png' }); document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Imagen descargada: ' + name + '.png');
      }, 'image/png');
    }
    document.addEventListener('keydown', (e) => {
      if (!app.isActive('pizarra') || !(e.ctrlKey || e.metaKey)) return;
      const t = e.target; if (t.tagName === 'INPUT' && (t.type === 'text' || t.type === 'number')) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    });

    fillWhite(); pushHistory(); setSize(10); setColor(state.color);
  }
});
