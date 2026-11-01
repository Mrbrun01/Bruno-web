'use strict';
/* =========================================================
   EDITOR DE ICONOS
   openIconEditor({ spec, name, onSave }) abre una ventana donde se dibuja el icono
   de una herramienta. Al soltar el puntero, vectorizeIcon (vectorizar.js) corrige el
   dibujo: enderezas, redondeas y se genera el SVG. También se puede elegir uno de la
   lista (alternativa para quien no dibuja con puntero).
   spec  icono actual: null | { builtin } | { paths }
   onSave({ paths } | { builtin })  se llama al pulsar «Usar este icono»
   ========================================================= */
const ICON_V = 400;   // lado del «lienzo virtual» que ve el vectorizador

const iconSvgMarkup = (paths) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">\n' + paths.map((d) => '  <path d="' + d + '"/>').join('\n') + '\n</svg>';

function openIconEditor({ spec, name, onSave }) {
  const label = (name || '').trim() || 'Mi herramienta';
  const cur = custom.cleanIcon(spec);
  let mode = cur && cur.builtin ? 'pick' : 'draw';
  let picked = cur && cur.builtin ? cur.builtin : null;
  const strokes = [];                 // trazos en coordenadas unitarias (0..1)
  let live = null;                    // trazo en curso
  let result = null;                  // última vectorización
  const opt = { strength: 0.625, shapes: true, join: true, snap: true, raw: true };

  const dlg = h('dialog', { class: 'dlg ico-dlg', 'aria-labelledby': 'ico-h' });
  dlg.innerHTML = `
    <div class="dlg-head"><h2 id="ico-h">Icono de la herramienta</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
    <div class="dlg-body">
      <div class="seg ico-tabs" role="tablist" aria-label="Cómo elegir el icono">
        <button type="button" role="tab" data-mode="draw">Dibujar</button>
        <button type="button" role="tab" data-mode="pick">Elegir de la lista</button>
      </div>

      <section data-pane="draw">
        <p class="muted ico-lead">Dibuja con el ratón, el dedo o un lápiz. Al soltar, el trazo se corrige solo: las rectas quedan rectas, los círculos redondos y las curvas suaves.</p>
        <div class="ico-grid">
          <div class="ico-stage">
            <div class="ico-board"><canvas data-r="cv" aria-label="Lienzo para dibujar el icono"></canvas><svg class="ico-over" data-r="over" viewBox="0 0 ${ICON_V} ${ICON_V}" aria-hidden="true"></svg><p class="ico-hint" data-r="hint">Empieza a dibujar aquí</p></div>
            <div class="actions">
              <button type="button" class="btn sm" data-r="undo">${icon('undo')}<span>Deshacer trazo</span></button>
              <button type="button" class="btn sm ghost danger" data-r="clear">Borrar todo</button>
              <span class="muted ico-count" data-r="count" role="status" aria-live="polite"></span>
            </div>
          </div>
          <div class="ico-side">
            <div class="ico-previews" data-r="previews"></div>
            <label class="ico-range"><span>Corrección</span><input type="range" min="0" max="100" value="50" data-r="strength" aria-label="Fuerza de la corrección"><span class="ico-range-ends"><small>Suave</small><small>Fuerte</small></span></label>
            <label class="ex-toggle"><input type="checkbox" data-opt="shapes" checked><span class="ex-switch" aria-hidden="true"></span><span>Reconocer círculos y rectángulos</span></label>
            <label class="ex-toggle"><input type="checkbox" data-opt="snap" checked><span class="ex-switch" aria-hidden="true"></span><span>Alinear rectas a 0°, 45° y 90°</span></label>
            <label class="ex-toggle"><input type="checkbox" data-opt="join" checked><span class="ex-switch" aria-hidden="true"></span><span>Unir extremos que casi se tocan</span></label>
            <label class="ex-toggle"><input type="checkbox" data-opt="raw" checked><span class="ex-switch" aria-hidden="true"></span><span>Mostrar mi trazo original</span></label>
            <details class="ico-code"><summary>Ver y copiar el SVG</summary>
              <textarea class="textarea" data-r="code" rows="6" readonly spellcheck="false" aria-label="Código SVG del icono"></textarea>
              <div class="actions"><button type="button" class="btn sm" data-r="copy">Copiar</button><button type="button" class="btn sm" data-r="dl">Descargar .svg</button></div>
            </details>
          </div>
        </div>
      </section>

      <section data-pane="pick" hidden>
        <p class="muted ico-lead">Elige uno de los iconos de la web.</p>
        <div class="ico-picks" data-r="picks" role="group" aria-label="Iconos disponibles"></div>
      </section>
    </div>
    <div class="dlg-foot"><button type="button" class="btn" data-close>Cancelar</button><button type="button" class="btn primary" data-r="save">Usar este icono</button></div>`;
  document.body.append(dlg);
  const r = (k) => $('[data-r="' + k + '"]', dlg);
  const cv = r('cv'), ctx = cv.getContext('2d');

  /* ---------- Vista previa y SVG ---------- */
  function previewIcon() {
    if (mode === 'pick') return picked ? { builtin: picked } : null;
    if (result && result.paths.length) return { paths: result.paths };
    return cur && cur.paths ? cur : null;                         // sin trazos nuevos: el icono actual
  }
  function renderPreviews() {
    const spc = previewIcon();
    const svg = (cls) => (spc ? custom.svg(spc, cls) : '<svg class="i ' + cls + '" viewBox="0 0 24 24" aria-hidden="true"></svg>');
    r('previews').innerHTML = `
      <div class="ico-big" aria-hidden="true">${svg('')}</div>
      <div class="ico-mocks" aria-label="Así se verá en el menú">
        <div class="nav ico-nav"><div class="nav-link" aria-hidden="true">${svg('')}<span>${esc(label)}</span></div><div class="nav-link" aria-current="page" aria-hidden="true">${svg('')}<span>${esc(label)}</span></div></div>
      </div>`;
    const ok = mode === 'pick' ? !!picked : strokes.length > 0;
    r('save').disabled = !ok;
    const code = r('code'); code.value = result && result.paths.length ? iconSvgMarkup(result.paths) : (spc && spc.paths ? iconSvgMarkup(spc.paths) : '');
    r('copy').disabled = r('dl').disabled = !code.value;
  }
  function revectorize() {
    const pts = strokes.map((s) => s.map((p) => ({ x: p.x * ICON_V, y: p.y * ICON_V })));
    result = pts.length ? vectorizeIcon(pts, { strength: opt.strength, size: ICON_V, shapes: opt.shapes, join: opt.join, snap: opt.snap }) : null;
    const over = r('over');
    over.innerHTML = '';
    if (result) {
      const w = Math.max(4, Math.min(26, result.strokeWidth / result.scale));
      over.innerHTML = '<g fill="none" stroke="currentColor" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round" stroke-linejoin="round">' + result.canvasPaths.map((d) => '<path d="' + d + '"/>').join('') + '</g>';
    }
    r('hint').hidden = strokes.length > 0 || !!live;
    r('count').textContent = strokes.length ? strokes.length + (strokes.length === 1 ? ' trazo' : ' trazos') : '';
    r('undo').disabled = !strokes.length;
    r('clear').disabled = !strokes.length;
    renderPreviews(); redraw();
  }

  /* ---------- Lienzo ---------- */
  function fit() {
    const rect = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.max(1, Math.round(rect.width * dpr));
    if (cv.width !== px) { cv.width = px; cv.height = px; }
    redraw();
  }
  function redraw() {
    const S = cv.width, cs = getComputedStyle(cv);
    ctx.clearRect(0, 0, S, S);
    ctx.lineWidth = Math.max(1, S / 400);
    ctx.strokeStyle = cs.getPropertyValue('--line').trim() || '#ccd';
    ctx.beginPath();
    for (let i = 1; i < 8; i++) { const v = (S * i) / 8; ctx.moveTo(v, 0); ctx.lineTo(v, S); ctx.moveTo(0, v); ctx.lineTo(S, v); }
    ctx.stroke();
    ctx.strokeStyle = cs.getPropertyValue('--line-2').trim() || '#aab';
    ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.stroke();
    const draw = (s, color, w) => {
      if (!s.length) return;
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(s[0].x * S, s[0].y * S);
      for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x * S, s[i].y * S);
      if (s.length === 1) ctx.lineTo(s[0].x * S + 0.1, s[0].y * S);
      ctx.stroke();
    };
    if (opt.raw) strokes.forEach((s) => draw(s, cs.getPropertyValue('--ink-3').trim() || '#889', Math.max(1.5, S / 190)));
    if (live) draw(live, cs.getPropertyValue('--ink').trim() || '#123', Math.max(2.5, S / 110));
  }
  const at = (e) => { const b = cv.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) }; };
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    live = [at(e)]; r('hint').hidden = true; redraw();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!live) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (evs.length ? evs : [e]).forEach((ev) => live.push(at(ev)));
    redraw();
  });
  const finish = (e, cancel) => {
    if (!live) return;
    const s = live; live = null;
    try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* ya liberado */ }
    if (!cancel) { if (s.length === 1) s.push({ x: s[0].x + 0.001, y: s[0].y }); strokes.push(s); }
    revectorize();
  };
  cv.addEventListener('pointerup', (e) => finish(e, false));
  cv.addEventListener('pointercancel', (e) => finish(e, true));
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  r('undo').addEventListener('click', () => { strokes.pop(); revectorize(); });
  r('clear').addEventListener('click', () => { strokes.length = 0; revectorize(); });
  dlg.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && mode === 'draw') { e.preventDefault(); strokes.pop(); revectorize(); } });
  r('strength').addEventListener('input', (e) => { opt.strength = 0.25 + 0.75 * Number(e.target.value) / 100; revectorize(); });
  $$('[data-opt]', dlg).forEach((c) => c.addEventListener('change', () => { opt[c.dataset.opt] = c.checked; revectorize(); }));
  r('copy').addEventListener('click', async () => {
    const ta = r('code'); ta.select(); let ok = false;
    try { await navigator.clipboard.writeText(ta.value); ok = true; } catch (e) { try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } }
    toast(ok ? 'SVG copiado.' : 'No se pudo copiar: el texto está seleccionado, usa Ctrl+C.');
  });
  r('dl').addEventListener('click', () => { download('icono.svg', 'image/svg+xml', r('code').value); toast('Descarga iniciada: icono.svg'); });

  /* ---------- Elegir de la lista ---------- */
  const picks = r('picks');
  ICON_PICKS.forEach((n) => picks.append(h('button', { type: 'button', class: 'ico-pick', 'data-n': n, 'aria-pressed': String(n === picked), title: n, html: custom.svg({ builtin: n }), onclick: () => { picked = n; $$('.ico-pick', picks).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.n === n))); renderPreviews(); } })));

  /* ---------- Modos y cierre ---------- */
  function setMode(m) {
    mode = m;
    $$('[data-mode]', dlg).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    $$('[data-pane]', dlg).forEach((p) => { p.hidden = p.dataset.pane !== m; });
    renderPreviews();
    if (m === 'draw') fit();
  }
  $$('[data-mode]', dlg).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  const close = () => { if (dlg.open) dlg.close(); };
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', close));
  dlg.addEventListener('close', () => { ro.disconnect(); dlg.remove(); });
  r('save').addEventListener('click', () => {
    const out = mode === 'pick' ? (picked ? { builtin: picked } : null) : (result && result.paths.length ? { paths: result.paths } : null);
    if (!out) return;
    close(); onSave(out);
  });
  const ro = new ResizeObserver(() => { if (mode === 'draw') fit(); });
  ro.observe(cv);
  dlg.showModal();
  setMode(mode); revectorize();
  return dlg;
}
