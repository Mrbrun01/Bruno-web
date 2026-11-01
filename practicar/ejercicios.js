'use strict';

/* =========================================================
   MOTOR DE EJERCICIOS
   Una sola plantilla para Verbos irregulares, Porque/Porqué,
   Modalidades y el Creador de ejercicios.
   Cada «paquete» aporta datos y opciones (ver 71-ejercicios-paquetes.js).
   ========================================================= */
const DEFAULT_HEADERS = ['Columna 1', 'Columna 2', 'Columna 3', 'Nota'];
const BATCH_SIZE = 3;

/* Compara ignorando mayúsculas, espacios y puntuación, conservando tildes y ñ */
const exLoose = (s) => String(s).normalize('NFC').trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
/* Versión estricta: conserva los espacios («por que» ≠ «porque») */
const exStrict = (s) => String(s).normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) { const up = row[j]; row[j] = a[i - 1] === b[j - 1] ? diag : 1 + Math.min(diag, up, row[j - 1]); diag = up; }
  }
  return row[b.length];
}
const similarity = (a, b) => { const L = Math.max(a.length, b.length); return L === 0 ? 1 : (L - editDistance(a, b)) / L; };

function exMatches(input, accepted, norm, allowFuzzy) {
  const a = norm(input);
  if (!a) return false;
  return accepted.some((c) => { const b = norm(c); if (!b) return false; return a === b || (allowFuzzy && b.length >= 5 && similarity(a, b) >= 0.8); });
}
const exFill = (sentence, blankHtml) => { const safe = esc(sentence); return safe.includes('___') ? safe.replace('___', () => blankHtml) : safe + ' ' + blankHtml; };
const splitList = (s, sep) => String(s || '').split(sep).map((x) => x.trim()).filter(Boolean);
function uniqueBy(list, norm) { const seen = new Set(); return list.filter((x) => { const k = norm(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); }

/* ---------- Borrador del editor → datos compilados ---------- */
let exIdSeq = 1;
const isBlankQ = (q) => !['sentence', 'correct', 'accepted', 'distractors', 'term', 'form', 'explanation'].some((k) => q[k].trim());
const isBlankRow = (r) => !['c1', 'c2', 'c3', 'note'].some((k) => r[k].trim());

function cleanDraft(raw, keepIds) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const str = (v) => (v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v));
  const used = new Set();
  const questions = (Array.isArray(r.questions) ? r.questions : []).filter((q) => q && typeof q === 'object').map((q) => {
    let id = keepIds && Number.isInteger(q.id) && q.id > 0 && !used.has(q.id) ? q.id : 0;
    if (!id) { while (used.has(exIdSeq)) exIdSeq++; id = exIdSeq; }
    used.add(id); if (id >= exIdSeq) exIdSeq = id + 1;
    return { id, sentence: str(q.sentence), correct: str(q.correct), accepted: str(q.accepted), distractors: str(q.distractors), term: str(q.term), form: str(q.form), explanation: str(q.explanation) };
  });
  const t = r.table && typeof r.table === 'object' ? r.table : {};
  const headers = [0, 1, 2, 3].map((i) => str(Array.isArray(t.headers) ? t.headers[i] : '') || DEFAULT_HEADERS[i]);
  const rows = (Array.isArray(t.rows) ? t.rows : []).filter((x) => x && typeof x === 'object').map((x) => ({ c1: str(x.c1), c2: str(x.c2), c3: str(x.c3), note: str(x.note) }));
  return { title: str(r.title), description: str(r.description), fuzzy: !!r.fuzzy, questions, table: { headers, rows } };
}

function compileDraft(d) {
  const errors = [], items = [];
  d.questions.forEach((q, i) => {
    if (isBlankQ(q)) return;
    const label = 'Pregunta ' + (i + 1), sentence = q.sentence.trim(), correct = q.correct.trim();
    const fail = (short) => errors.push({ id: q.id, short, msg: label + ': ' + short.charAt(0).toLowerCase() + short.slice(1) });
    const many = sentence.split('___').length > 2;
    if (!sentence) fail('Escribe la frase o la pregunta.'); else if (many) fail('Solo puede tener un hueco ___.');
    if (!correct) fail('Falta la respuesta correcta.'); else if (!exLoose(correct)) fail('La respuesta correcta debe incluir letras o números.');
    if (!sentence || many || !exLoose(correct)) return;
    const accepted = uniqueBy([correct, ...splitList(q.accepted, ',')], exLoose);
    const keys = new Set(accepted.map(exLoose));
    const wrong = uniqueBy(splitList(q.distractors, ','), exLoose).filter((w) => !keys.has(exLoose(w)));
    items.push({ id: q.id, sentence, term: q.term.trim(), form: q.form.trim(), correct, accepted, options: shuffle([correct, ...wrong]), explanation: q.explanation.trim() });
  });
  if (!items.length && !errors.length) errors.push({ id: null, short: 'Añade al menos una pregunta.', msg: 'Añade al menos una pregunta.' });

  const catMap = new Map();
  items.forEach((it) => { if (!it.form) return; const k = it.form.toLowerCase(); if (!catMap.has(k)) catMap.set(k, it.form); it.form = catMap.get(k); });
  const labels = [...catMap.values()], keys = labels.map((_, i) => 'cat' + i), batchOn = labels.length >= 2;
  const batch = batchOn ? items.filter((it) => it.form).map((it) => ({ id: it.id, t: it.sentence, m: keys[labels.indexOf(it.form)], e: it.explanation })) : [];

  const rows = [];
  d.table.rows.forEach((r, i) => {
    if (isBlankRow(r)) return;
    const c1 = r.c1.trim(), c2 = r.c2.trim(), c3 = r.c3.trim(), note = r.note.trim();
    if (!c1) { errors.push({ id: null, row: i, msg: 'Fila ' + (i + 1) + ' de la tabla: falta el valor de la columna 1.' }); return; }
    rows.push({ c1, c2, c3, note, c2List: splitList(c2, '/'), c3List: splitList(c3, '/') });
  });
  return { errors, data: { items, batch, labels: batchOn ? labels : [], keys: batchOn ? keys : [], rows, headers: d.table.headers.map((x, i) => x.trim() || DEFAULT_HEADERS[i]), title: d.title.trim() || 'Ejercicio sin título', description: d.description.trim(), fuzzy: d.fuzzy } };
}

/* =========================================================
   FÁBRICA
   cfg = { id, editable, hideTag, strict, defaultPane, tabs:{...}, batchHelp,
           legend, keys:{progress,bookmarks,exercise}, build(), sample }
   ========================================================= */
function createExercise(root, cfg) {
  const norm = cfg.strict ? exStrict : exLoose;
  const TABS = Object.assign({ quiz: 'Paso a paso', batch: 'Clasificar en lote', table: 'Tabla completa', practice: 'Practicar tabla', editor: 'Crear ejercicio' }, cfg.tabs || {});
  (cfg.extraTabs || []).forEach((x) => { TABS[x.id] = x.label; });
  const K = cfg.keys || {};

  let D = { items: [], batch: [], labels: [], keys: [], rows: [], headers: DEFAULT_HEADERS, title: '', description: '', fuzzy: false };
  let draft = null, dirty = false;

  /* --- estado del paso a paso --- */
  let current = 0, score = 0, answered = [], stepMarks = {}, mode = 'choice';
  /* --- estado del lote --- */
  let bMarks = new Set(), bIdx = [], bCorrected = false, bRight = 0, bWrong = 0, bInited = false;
  /* --- estado de la tabla --- */
  let pRows = [], pBuilt = false, pChecked = false;
  let pane = cfg.defaultPane || 'quiz';

  root.innerHTML = `
    <div class="ex">
      <header class="ex-head" data-r="head" hidden><h2 class="ex-title" data-r="title"></h2><p class="muted ex-desc" data-r="desc"></p></header>
      <div class="seg ex-tabs" data-r="tabs" role="tablist" aria-label="Vistas del ejercicio"></div>

      <section class="ex-pane" data-pane="quiz" role="tabpanel">
        <ul class="stats">
          <li><b data-r="cur" class="num">1</b><span>de <span data-r="total">0</span></span></li>
          <li><b data-r="score" class="num">0</b><span>aciertos</span></li>
          <li><b data-r="marks" class="num">0</b><span>marcadas</span></li>
        </ul>
        <div class="ex-modebar">
          <div class="seg" role="group" aria-label="Modo de respuesta"><button type="button" data-mode="choice" aria-pressed="true">Elegir opción</button><button type="button" data-mode="write" aria-pressed="false">Escribir respuesta</button></div>
        </div>
        <div class="progress" aria-hidden="true"><i data-r="bar"></i></div>
        <div class="card ex-card" data-r="card"></div>
        <div class="ex-foot">
          <button type="button" class="btn ghost sm" data-r="openMarksStep">${icon('bookmark')}<span>Ver marcadas</span></button>
          <button type="button" class="btn ghost sm danger" data-r="restart">${icon('reset')}<span>Empezar de nuevo</span></button>
          <span class="muted ex-saved" data-r="saved" role="status"></span>
        </div>
      </section>

      <section class="ex-pane" data-pane="batch" role="tabpanel" hidden>
        <ul class="stats">
          <li><b data-r="bTotal" class="num">0</b><span>frases</span></li>
          <li><b data-r="bMarked" class="num">0</b><span>marcadas</span></li>
          <li><b data-r="bRight" class="num ok">0</b><span>aciertos</span></li>
          <li><b data-r="bWrong" class="num bad">0</b><span>fallos</span></li>
          <li><b data-r="bPct" class="num">—</b><span>precisión</span></li>
        </ul>
        <p class="muted ex-help" data-r="bHelp"></p>
        <ul class="ex-legend" data-r="legend"></ul>
        <label class="ex-toggle"><input type="checkbox" data-r="skip"><span class="ex-switch" aria-hidden="true"></span><span>Saltar las frases marcadas</span></label>
        <div class="ex-sentences" data-r="sentences"></div>
        <div class="ex-actions">
          <button type="button" class="btn primary" data-r="bCheck">${icon('check')}<span>Corregir</span></button>
          <button type="button" class="btn" data-r="bNew">${icon('reset')}<span>Nuevas frases</span></button>
          <button type="button" class="btn ghost" data-r="bMarks">${icon('bookmark')}<span>Ver marcadas</span></button>
        </div>
      </section>

      <section class="ex-pane" data-pane="table" role="tabpanel" hidden>
        <div class="ex-tsearch"><input type="search" class="input" data-r="tSearch" placeholder="Buscar en la tabla…" aria-label="Buscar en la tabla" autocomplete="off"></div>
        <div class="ex-tablewrap"><table class="ex-table"><thead data-r="tHead"></thead><tbody data-r="tBody"></tbody></table></div>
      </section>

      <section class="ex-pane" data-pane="practice" role="tabpanel" hidden>
        <div class="ex-ptool"><span class="muted">Completa los huecos con la respuesta correcta.</span><button type="button" class="btn sm" data-r="pRegen">${icon('reset')}<span>Generar de nuevo</span></button></div>
        <div class="ex-tablewrap"><table class="ex-table"><thead data-r="pHead"></thead><tbody data-r="pBody"></tbody></table></div>
        <div class="ex-pcheck"><button type="button" class="btn primary" data-r="pCheck">Comprobar tabla</button></div>
        <p class="ex-presult" data-r="pResult" role="status" hidden></p>
      </section>

      ${cfg.editable ? `
      <section class="ex-pane" data-pane="editor" role="tabpanel" hidden>
        <p class="ex-lead">Escribe tus preguntas y pulsa «Aplicar y practicar». El ejercicio se genera en las demás pestañas y queda guardado en este navegador.</p>
        <div class="card ex-sec">
          <h2>Datos del ejercicio</h2>
          <div class="ex-grid">
            <label class="field wide">Título<input type="text" class="input" data-r="edTitle" autocomplete="off" placeholder="Ej.: Capitales de Europa"></label>
            <label class="field wide">Descripción (opcional)<textarea class="textarea" data-r="edDesc" rows="2" placeholder="Una o dos frases que expliquen qué se practica."></textarea></label>
          </div>
          <label class="ex-toggle" style="margin:16px 0 0"><input type="checkbox" data-r="edFuzzy"><span class="ex-switch" aria-hidden="true"></span><span>Perdonar erratas leves al escribir (en respuestas de 5 letras o más)</span></label>
        </div>
        <div class="card ex-sec">
          <h2>Preguntas</h2>
          <p class="muted ex-hint">Usa <code>___</code> (tres guiones bajos) para marcar el hueco, o escribe una pregunta directa sin hueco. Si añades opciones incorrectas, se podrá elegir entre ellas; si no, la respuesta se escribe. Separa las listas con comas.</p>
          <p class="ex-note" data-r="edBatchNote"></p>
          <div data-r="edQuestions"></div>
          <datalist data-r="edCats" id="${cfg.id}-cats"></datalist>
          <button type="button" class="btn ex-add" data-r="edAddQ">${icon('plus')}<span>Añadir pregunta</span></button>
        </div>
        <div class="card ex-sec">
          <h2>Tabla de referencia (opcional)</h2>
          <p class="muted ex-hint">Con al menos una fila se activan «Tabla completa» y «Practicar tabla». En la práctica se ocultan al azar las columnas 2 y 3. Para aceptar varias respuestas en una celda, sepáralas con <code>/</code>, por ejemplo <code>was / were</code>.</p>
          <div class="ex-trow head" data-r="edTHead"></div>
          <div data-r="edTRows"></div>
          <button type="button" class="btn ex-add" data-r="edAddRow">${icon('plus')}<span>Añadir fila</span></button>
        </div>
        <div data-r="edExtra"></div>
        <div class="ex-tools">
          <button type="button" class="btn ghost" data-r="edReset">Volver al ejemplo</button>
          <button type="button" class="btn" data-r="edIO">Importar o exportar</button>
        </div>
        <div class="ex-msg" data-r="edErrors" role="alert"></div>
        <div class="ex-apply"><span class="ex-status" data-r="edStatus" role="status" aria-live="polite"></span><button type="button" class="btn primary lg" data-r="edApply">Aplicar y practicar</button></div>
      </section>` : ''}

      ${(cfg.extraTabs || []).map((x) => `<section class="ex-pane" data-pane="${x.id}" data-r="x_${x.id}" role="tabpanel" hidden></section>`).join('')}
      <dialog class="dlg" data-r="dlgStep" aria-labelledby="${cfg.id}-dh1"><div class="dlg-head"><h2 id="${cfg.id}-dh1">Preguntas marcadas</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div><div class="dlg-body" data-r="listStep"></div></dialog>
      <dialog class="dlg" data-r="dlgBatch" aria-labelledby="${cfg.id}-dh2"><div class="dlg-head"><h2 id="${cfg.id}-dh2">Frases marcadas</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div><div class="dlg-body" data-r="listBatch"></div></dialog>
      ${cfg.editable ? `<dialog class="dlg" data-r="dlgIO" aria-labelledby="${cfg.id}-dh3"><div class="dlg-head"><h2 id="${cfg.id}-dh3">Importar o exportar</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
        <div class="dlg-body"><p class="muted" style="margin-top:0">Este es el ejercicio del editor en formato JSON. Cópialo o descárgalo para guardarlo o compartirlo. Para cargar otro, pega su JSON aquí o abre un archivo.</p>
        <textarea class="textarea ex-json" data-r="ioText" spellcheck="false" aria-label="JSON del ejercicio"></textarea>
        <div class="ex-io"><button type="button" class="btn" data-r="ioCopy">Copiar</button><button type="button" class="btn" data-r="ioDownload">Descargar .json</button><button type="button" class="btn" data-r="ioOpen">Abrir archivo</button><button type="button" class="btn primary" data-r="ioLoad">Cargar en el editor</button><input type="file" data-r="ioFile" accept=".json,application/json" hidden></div>
        <div class="ex-msg" data-r="ioMsg" role="status"></div></div></dialog>` : ''}
    </div>`;

  const r = (n) => $('[data-r="' + n + '"]', root);
  const card = r('card');
  const active = () => app.isActive(cfg.id);

  /* ---------- Compilación y arranque ---------- */
  function loadProgress() {
    if (!K.progress) return;
    const d = store.json(K.progress, null);
    if (!d || d.total !== D.items.length) return;
    current = clamp(Number(d.current) || 0, 0, D.items.length);
    score = Number(d.score) || 0;
    answered = Array.isArray(d.answered) ? d.answered : [];
    stepMarks = d.bookmarks && typeof d.bookmarks === 'object' ? d.bookmarks : {};
    mode = d.mode === 'write' ? 'write' : 'choice';
  }
  function saveProgress() {
    if (!K.progress) return;
    const ok = store.setJson(K.progress, { total: D.items.length, current, score, answered, bookmarks: stepMarks, mode, savedAt: Date.now() });
    r('saved').textContent = ok ? 'Progreso guardado' : 'No se puede guardar aquí';
  }
  function resetStep() { current = 0; score = 0; answered = []; }

  function apply(data, fresh) {
    D = data;
    const ids = new Set(D.items.map((i) => i.id));
    resetStep();
    if (fresh) { stepMarks = {}; if (K.progress) store.del(K.progress); } else loadProgress();
    Object.keys(stepMarks).forEach((k) => { if (!ids.has(Number(k))) delete stepMarks[k]; });
    r('head').hidden = !cfg.editable;
    r('title').textContent = D.title; r('desc').textContent = D.description; r('desc').hidden = !D.description;
    r('total').textContent = D.items.length;
    const allIds = new Set(D.batch.map((b) => b.id));
    bMarks = new Set(loadBatchMarks().filter((id) => allIds.has(id)));
    bInited = false; bRight = bWrong = 0; bCorrected = false; bIdx = [];
    r('sentences').textContent = '';
    r('bHelp').textContent = cfg.batchHelp || 'Elige la categoría de cada frase.';
    r('legend').innerHTML = (cfg.legend || D.labels.map((l) => [l, ''])).map(([t, def]) => `<li><b>${esc(t)}</b>${def ? ' <span>' + esc(def) + '</span>' : ''}</li>`).join('');
    r('legend').hidden = !r('legend').children.length;
    pBuilt = false; pChecked = false;
    r('tSearch').value = ''; renderTableHeads(); renderFullTable('');
    r('pBody').textContent = ''; r('pResult').hidden = true;
    $$('[data-mode]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    updateTabs(); renderQuestion();
    if (D.batch.length) updateBatchStats();
  }

  /* ---------- Pestañas ---------- */
  const tabsEl = r('tabs');
  function available() {
    const a = [];
    if (D.items.length) a.push('quiz');
    if (D.batch.length >= 2 && D.labels.length >= 2) a.push('batch');
    if (D.rows.length) a.push('table', 'practice');
    if (cfg.editable) a.push('editor');
    (cfg.extraTabs || []).forEach((x) => a.push(x.id));
    return a;
  }
  function updateTabs() {
    const av = available();
    tabsEl.textContent = '';
    av.forEach((id) => tabsEl.append(h('button', { type: 'button', role: 'tab', 'data-tab': id, 'aria-selected': String(id === pane), class: id === 'editor' ? 'ex-tab-edit' : '', text: TABS[id], onclick: () => showPane(id) })));
    tabsEl.hidden = av.length < 2;
    if (!av.includes(pane)) showPane(av[0] || 'quiz'); else showPane(pane);
  }
  function showPane(id) {
    pane = id;
    $$('[data-tab]', tabsEl).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    $$('.ex-pane', root).forEach((p) => { p.hidden = p.dataset.pane !== id; });
    const xt = (cfg.extraTabs || []).find((x) => x.id === id);
    if (xt && xt.show) xt.show(r('x_' + id));
    if (id === 'batch' && !bInited) { bInited = true; newBatch(); }
    if (id === 'practice' && !pBuilt) buildPractice();
  }

  /* ---------- Paso a paso ---------- */
  $$('[data-mode]', root).forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; $$('[data-mode]', root).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.mode === mode))); renderQuestion(); saveProgress(); }));

  function renderQuestion() {
    if (!D.items.length) { card.innerHTML = ''; return; }
    if (current >= D.items.length) { renderEnd(); return; }
    const item = D.items[current];
    r('cur').textContent = current + 1;
    r('bar').style.width = (current / D.items.length * 100) + '%';
    r('marks').textContent = Object.keys(stepMarks).length;
    r('score').textContent = score;
    const marked = !!stepMarks[item.id], a = answered[current], was = a != null;
    const useChoice = mode === 'choice' && item.options.length >= 2;
    const blankHtml = `<span class="blank${was ? (a.correct ? ' correct' : ' incorrect') : ''}">${was ? esc(a.picked) : '___'}</span>`;
    let body;
    if (useChoice) {
      body = '<div class="options" role="group" aria-label="Opciones">' + item.options.map((opt, i) => {
        let cls = 'option-btn';
        if (was) cls += opt === item.correct ? ' correct' : opt === a.picked ? ' incorrect' : ' dimmed';
        return `<button type="button" class="${cls}" data-idx="${i}" ${was ? 'disabled' : ''}><span class="okey">${i + 1}</span><span>${esc(opt)}</span></button>`;
      }).join('') + '</div>';
    } else {
      body = `<div class="write-row"><input type="text" class="input write-input${was ? (a.correct ? ' correct' : ' incorrect') : ''}" data-r="wi" placeholder="Escribe la respuesta correcta…" aria-label="Tu respuesta" value="${was ? esc(a.picked) : ''}" ${was ? 'disabled' : ''} autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="btn primary" data-r="ws" ${was ? 'disabled' : ''}>Comprobar</button></div>`;
    }
    const verdict = was ? `<b>${a.correct ? 'Correcto. ' : 'No es correcto. La respuesta correcta es «' + esc(item.correct) + '». '}</b>${esc(item.explanation)}` : '';
    card.innerHTML = `
      <div class="ex-cardtop">${item.form && !cfg.hideTag ? `<span class="chip">${esc(item.form)}</span>` : '<span></span>'}
        <button type="button" class="icon-btn" data-r="mark" aria-label="${marked ? 'Quitar marca' : 'Marcar pregunta'}" aria-pressed="${marked}">${icon('star')}</button></div>
      <p class="ex-sentence read">${exFill(item.sentence, blankHtml)}</p>
      ${item.term ? `<p class="ex-hintline">Pista: <b>${esc(item.term)}</b></p>` : ''}
      ${body}
      <div class="ex-verdict${was ? ' show ' + (a.correct ? 'ok' : 'ko') : ''}" aria-live="polite">${verdict}</div>
      <div class="ex-nav"><button type="button" class="btn primary" data-r="next" ${was ? '' : 'disabled'}>${current === D.items.length - 1 ? 'Ver resultados' : 'Siguiente'} ${icon('chevR')}</button></div>`;
    const cq = (n) => $('[data-r="' + n + '"]', card);
    cq('mark').addEventListener('click', () => { if (stepMarks[item.id]) delete stepMarks[item.id]; else stepMarks[item.id] = true; renderQuestion(); saveProgress(); });
    if (!was) {
      if (useChoice) $$('.option-btn', card).forEach((b) => b.addEventListener('click', () => answer(item.options[Number(b.dataset.idx)], item, false)));
      else {
        const inp = cq('wi'), go = () => { if (inp.value.trim()) answer(inp.value.trim(), item, true); };
        cq('ws').addEventListener('click', go);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
        if (active()) inp.focus({ preventScroll: true });
      }
    }
    cq('next').addEventListener('click', () => { current++; renderQuestion(); saveProgress(); });
  }
  function answer(picked, item, typed) {
    const ok = exMatches(picked, item.accepted, norm, typed && D.fuzzy);
    if (ok) score++;
    answered[current] = { picked, correct: ok };
    renderQuestion(); saveProgress();
    const nb = $('[data-r="next"]', card); if (nb) nb.focus({ preventScroll: true });
  }
  function renderEnd() {
    r('bar').style.width = '100%'; r('cur').textContent = D.items.length;
    const pct = Math.round(score / D.items.length * 100);
    const review = D.items.map((it, i) => {
      const a = answered[i]; if (a == null) return '';
      return `<div class="review-item ${a.correct ? 'ok' : 'ko'}">${exFill(it.sentence, '<strong>' + esc(a.picked) + '</strong>')}${a.correct ? '' : '<small>Respuesta correcta: <b>' + esc(it.correct) + '</b></small>'}</div>`;
    }).join('');
    card.innerHTML = `<div class="ex-end"><p class="ex-big num">${score}/${D.items.length}</p>
      <p>${pct}% de aciertos. ${Object.keys(stepMarks).length ? 'Repasa tus preguntas marcadas antes de volver a intentarlo.' : ''}</p>
      <div class="ex-nav" style="justify-content:center"><button type="button" class="btn primary" data-r="again">Repetir ejercicio</button><button type="button" class="btn" data-r="seeMarks">Ver marcadas</button></div>
      <details class="ex-review"><summary>Repasar mis respuestas</summary><div>${review}</div></details></div>`;
    $('[data-r="again"]', card).addEventListener('click', () => { resetStep(); D.items.forEach((it) => { it.options = shuffle(it.options); }); renderQuestion(); saveProgress(); });
    $('[data-r="seeMarks"]', card).addEventListener('click', openMarksStep);
  }
  r('restart').addEventListener('click', async () => {
    if (!(await confirmDialog({ title: '¿Empezar de nuevo?', text: 'Se borrarán tus aciertos y tus preguntas marcadas de este ejercicio.', ok: 'Empezar de nuevo', danger: true }))) return;
    resetStep(); stepMarks = {}; if (K.progress) store.del(K.progress);
    D.items.forEach((it) => { it.options = shuffle(it.options); });
    renderQuestion(); r('saved').textContent = 'Progreso borrado';
  });
  function openMarksStep() {
    const list = r('listStep'), items = D.items.filter((it) => stepMarks[it.id]);
    list.innerHTML = items.length ? items.map((it) => `<div class="mark-item"><div>${exFill(it.sentence, '<strong>' + esc(it.correct) + '</strong>')}</div>${it.explanation ? '<div class="muted mark-meta">' + esc(it.explanation) + '</div>' : ''}</div>`).join('')
      : '<p class="muted">Todavía no has marcado ninguna pregunta. Pulsa la estrella en cualquier pregunta para guardarla aquí.</p>';
    r('dlgStep').showModal();
  }
  r('openMarksStep').addEventListener('click', openMarksStep);

  /* ---------- Clasificar en lote ---------- */
  function loadBatchMarks() { const a = store.json(K.bookmarks, []); return Array.isArray(a) ? a.filter(Number.isInteger) : []; }
  function saveBatchMarks() { if (K.bookmarks) store.setJson(K.bookmarks, [...bMarks]); updateBatchStats(); }
  function updateBatchStats() {
    r('bTotal').textContent = D.batch.length;
    r('bMarked').textContent = D.batch.filter((x) => bMarks.has(x.id)).length;
    r('bRight').textContent = bRight; r('bWrong').textContent = bWrong;
    const t = bRight + bWrong; r('bPct').textContent = t ? Math.round(bRight / t * 100) + '%' : '—';
  }
  function newBatch() {
    bCorrected = false;
    let pool = D.batch.map((_, i) => i);
    if (r('skip').checked) pool = pool.filter((i) => !bMarks.has(D.batch[i].id));
    if (pool.length < Math.min(BATCH_SIZE, D.batch.length)) pool = D.batch.map((_, i) => i);
    bIdx = shuffle(pool).slice(0, Math.min(BATCH_SIZE, D.batch.length));
    renderBatch(); updateBatchStats();
  }
  function renderBatch() {
    const box = r('sentences'); box.textContent = '';
    bIdx.forEach((di, pos) => {
      const it = D.batch[di], marked = bMarks.has(it.id), safe = esc(it.t);
      const text = safe.includes('___') ? safe.replace('___', () => '<span class="blank">___</span>') : safe;
      const el = h('div', { class: 'sentence-card', 'data-pos': pos });
      el.innerHTML = `<div class="sc-num">${pos + 1}</div>
        <div class="sc-body"><p class="sc-text read">${text}</p>${it.h ? '<p class="ex-hintline" style="margin:0 0 10px">' + esc(it.h) + '</p>' : ''}
          <div class="sc-controls"><select class="select" aria-label="Categoría de la frase ${pos + 1}"><option value="">— ${esc(cfg.batchPlaceholder || 'Elige una categoría')} —</option>${D.keys.map((k, i) => `<option value="${k}">${esc(D.labels[i])}</option>`).join('')}</select><span class="badge" hidden></span></div>
          <p class="sc-answer" hidden></p><p class="sc-exp muted" hidden></p></div>
        <button type="button" class="icon-btn" data-bm aria-pressed="${marked}" aria-label="${marked ? 'Quitar marca' : 'Marcar frase'}">${icon('bookmark')}</button>`;
      $('[data-bm]', el).addEventListener('click', (e) => {
        const b = e.currentTarget;
        if (bMarks.has(it.id)) bMarks.delete(it.id); else bMarks.add(it.id);
        b.setAttribute('aria-pressed', String(bMarks.has(it.id))); b.setAttribute('aria-label', bMarks.has(it.id) ? 'Quitar marca' : 'Marcar frase');
        saveBatchMarks();
      });
      box.append(el);
    });
  }
  function checkBatch() {
    if (bCorrected) return; bCorrected = true;
    $$('.sentence-card', r('sentences')).forEach((el, pos) => {
      const it = D.batch[bIdx[pos]], val = $('select', el).value, badge = $('.badge', el), ans = $('.sc-answer', el), exp = $('.sc-exp', el);
      const label = D.labels[D.keys.indexOf(it.m)];
      if (it.e) { exp.textContent = it.e; exp.hidden = false; }
      const show = (ok, text) => { badge.hidden = false; badge.className = 'badge ' + (ok ? 'ok' : 'ko'); badge.textContent = text; el.classList.add(ok ? 'correct' : 'incorrect'); };
      if (val === it.m) { show(true, '✓ ¡Correcto!'); bRight++; }
      else { show(false, val ? '✗ Incorrecto' : '⚠ Sin respuesta'); ans.hidden = false; ans.innerHTML = 'La respuesta correcta es: <strong>' + esc(label) + '</strong>'; bWrong++; }
      $('select', el).disabled = true;
    });
    updateBatchStats();
  }
  function openMarksBatch() {
    const list = r('listBatch'), marked = D.batch.filter((x) => bMarks.has(x.id));
    list.innerHTML = '';
    if (!marked.length) { list.innerHTML = '<p class="muted">No hay frases marcadas todavía. Pulsa el marcador en cualquier frase para guardarla.</p>'; }
    marked.forEach((it) => {
      const label = D.labels[D.keys.indexOf(it.m)];
      const row = h('div', { class: 'mark-item' }, h('div', null, h('div', { text: it.t }), h('div', { class: 'muted mark-meta', html: 'Categoría: <strong>' + esc(label) + '</strong>' + (it.e ? ' — ' + esc(it.e) : '') })),
        h('button', { type: 'button', class: 'btn sm', text: 'Desmarcar', onclick: () => { bMarks.delete(it.id); saveBatchMarks(); row.remove(); renderBatchMarks(); if (!D.batch.some((x) => bMarks.has(x.id))) list.innerHTML = '<p class="muted">No hay frases marcadas todavía.</p>'; } }));
      list.append(row);
    });
    r('dlgBatch').showModal();
  }
  function renderBatchMarks() { $$('.sentence-card', r('sentences')).forEach((el, pos) => { const b = $('[data-bm]', el); const on = bMarks.has(D.batch[bIdx[pos]].id); b.setAttribute('aria-pressed', String(on)); }); }
  r('bCheck').addEventListener('click', checkBatch);
  r('bNew').addEventListener('click', newBatch);
  r('bMarks').addEventListener('click', openMarksBatch);
  $$('dialog [data-close]', root).forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog', root).forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  /* ---------- Tabla de referencia ---------- */
  function renderTableHeads() { const html = '<tr>' + D.headers.map((x) => '<th scope="col">' + esc(x) + '</th>').join('') + '</tr>'; r('tHead').innerHTML = html; r('pHead').innerHTML = html; }
  function renderFullTable(filter) {
    const f = (filter || '').trim().toLowerCase();
    const rows = D.rows.filter((x) => !f || [x.c1, x.c2, x.c3, x.note].some((v) => v.toLowerCase().includes(f)));
    r('tBody').innerHTML = rows.length ? rows.map((x) => `<tr><th scope="row">${esc(x.c1)}</th><td>${esc(x.c2)}</td><td>${esc(x.c3)}</td><td class="muted">${esc(x.note)}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">Sin resultados.</td></tr>';
  }
  r('tSearch').addEventListener('input', (e) => renderFullTable(e.target.value));
  function buildPractice() {
    pBuilt = true; pChecked = false;
    pRows = D.rows.map((x) => {
      const can = [];
      if (x.c2List.some((v) => exLoose(v))) can.push('c2');
      if (x.c3List.some((v) => exLoose(v))) can.push('c3');
      let hide = [];
      if (can.length === 1) hide = can;
      else if (can.length === 2) { const ro = Math.random(); hide = ro < 0.45 ? ['c2'] : ro < 0.9 ? ['c3'] : ['c2', 'c3']; }
      return { ...x, hide };
    });
    r('pBody').innerHTML = pRows.map((x, i) => {
      const cell = (col, label) => x.hide.includes(col) ? `<input type="text" class="input pt-input" data-row="${i}" data-col="${col}" aria-label="${esc(label)}, fila ${i + 1}" autocomplete="off" autocapitalize="off" spellcheck="false">` : esc(x[col]);
      return `<tr><th scope="row">${esc(x.c1)}</th><td>${cell('c2', D.headers[1])}</td><td>${cell('c3', D.headers[2])}</td><td class="muted">${esc(x.note)}</td></tr>`;
    }).join('');
    r('pResult').hidden = true;
  }
  r('pRegen').addEventListener('click', buildPractice);
  r('pCheck').addEventListener('click', () => {
    if (pChecked) return; pChecked = true;
    let total = 0, ok = 0;
    $$('.pt-input', r('pBody')).forEach((inp) => {
      total++;
      const row = pRows[inp.dataset.row], list = inp.dataset.col === 'c2' ? row.c2List : row.c3List;
      const good = exMatches(inp.value, list, norm, D.fuzzy);
      inp.classList.add(good ? 'correct' : 'incorrect'); inp.disabled = true;
      if (good) ok++; else inp.parentElement.append(h('div', { class: 'pt-hint', text: list.join(' / ') }));
    });
    r('pResult').hidden = false;
    r('pResult').textContent = total ? ok + ' / ' + total + ' correctas' : 'No había huecos que completar. Pulsa «Generar de nuevo».';
  });

  /* ---------- Teclado: 1-9 eligen opción ---------- */
  document.addEventListener('keydown', (e) => {
    if (!active() || pane !== 'quiz' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!/^[1-9]$/.test(e.key) || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    const b = $$('.option-btn', card)[Number(e.key) - 1];
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  });

  /* =========================================================
     EDITOR (solo el Creador de ejercicios)
     ========================================================= */
  let editorApi = null;
  if (cfg.editable) {
    const setStatus = (t, kind) => { r('edStatus').textContent = t; r('edStatus').className = 'ex-status ' + (kind || ''); };
    const markDirty = () => { dirty = true; setStatus('Cambios sin aplicar', 'dirty'); };
    const showMsg = (el, html, kind) => { el.innerHTML = html; el.className = 'ex-msg show ' + kind; };
    const hideMsg = (el) => { el.innerHTML = ''; el.className = 'ex-msg'; };

    const qCard = (q, i) => `
      <div class="ed-item" data-qid="${q.id}">
        <div class="ed-item-head"><span class="ed-num">Pregunta ${i + 1}</span>
          <div><button type="button" class="btn sm ghost" data-act="dup">Duplicar</button><button type="button" class="btn sm ghost danger" data-act="del">Eliminar</button></div></div>
        <div class="ex-grid">
          <label class="field wide">Frase o pregunta<textarea class="textarea" rows="2" data-f="sentence" placeholder="La capital de Francia es ___.">${esc(q.sentence)}</textarea></label>
          <label class="field">Respuesta correcta<input type="text" class="input" data-f="correct" value="${esc(q.correct)}" placeholder="París" autocomplete="off"></label>
          <label class="field">Otras respuestas válidas (opcional)<input type="text" class="input" data-f="accepted" value="${esc(q.accepted)}" placeholder="Paris" autocomplete="off"></label>
          <label class="field wide">Opciones incorrectas (opcional)<input type="text" class="input" data-f="distractors" value="${esc(q.distractors)}" placeholder="Lyon, Marsella, Burdeos" autocomplete="off"></label>
          <label class="field">Pista (opcional)<input type="text" class="input" data-f="term" value="${esc(q.term)}" placeholder="ciudad" autocomplete="off"></label>
          <label class="field">Categoría (opcional)<input type="text" class="input" data-f="form" value="${esc(q.form)}" list="${cfg.id}-cats" placeholder="Capitales" autocomplete="off"></label>
          <label class="field wide">Explicación (opcional)<input type="text" class="input" data-f="explanation" value="${esc(q.explanation)}" placeholder="Se muestra después de responder." autocomplete="off"></label>
        </div>
      </div>`;
    function categories() { const seen = new Map(); draft.questions.forEach((q) => { const f = q.form.trim(); if (f && !seen.has(f.toLowerCase())) seen.set(f.toLowerCase(), f); }); return [...seen.values()]; }
    function refreshCats() {
      const cats = categories();
      r('edCats').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');
      r('edBatchNote').innerHTML = cats.length >= 2 ? '«Clasificar en lote» se activará con estas categorías: <b>' + cats.map(esc).join(', ') + '</b>.' : 'Con dos o más categorías distintas se activa la pestaña «Clasificar en lote».';
    }
    function renderEdQuestions() { r('edQuestions').innerHTML = draft.questions.length ? draft.questions.map(qCard).join('') : '<p class="muted">Todavía no hay preguntas. Añade la primera.</p>'; refreshCats(); }
    function renderEdTable() {
      const names = draft.table.headers;
      r('edTHead').innerHTML = names.map((x, i) => `<input type="text" class="input" data-th="${i}" value="${esc(x)}" aria-label="Nombre de la columna ${i + 1}" autocomplete="off">`).join('') + '<span></span>';
      r('edTRows').innerHTML = draft.table.rows.map((row, i) => `<div class="ex-trow" data-ri="${i}">` + ['c1', 'c2', 'c3', 'note'].map((f, k) => `<input type="text" class="input" data-tf="${f}" value="${esc(row[f])}" aria-label="${esc(names[k])}, fila ${i + 1}" autocomplete="off">`).join('') + `<button type="button" class="icon-btn" data-tact="del" aria-label="Eliminar fila ${i + 1}">${icon('close')}</button></div>`).join('');
    }
    function renderEditor() { r('edTitle').value = draft.title; r('edDesc').value = draft.description; r('edFuzzy').checked = draft.fuzzy; renderEdQuestions(); renderEdTable(); }

    r('edTitle').addEventListener('input', (e) => { draft.title = e.target.value; markDirty(); });
    r('edDesc').addEventListener('input', (e) => { draft.description = e.target.value; markDirty(); });
    r('edFuzzy').addEventListener('change', (e) => { draft.fuzzy = e.target.checked; markDirty(); });
    const findQ = (el) => draft.questions.find((q) => q.id === Number(el.closest('.ed-item').dataset.qid));
    r('edQuestions').addEventListener('input', (e) => {
      const f = e.target.dataset.f; if (!f) return;
      findQ(e.target)[f] = e.target.value;
      const c = e.target.closest('.ed-item'); c.classList.remove('invalid'); const n = $('.ed-err', c); if (n) n.remove();
      if (f === 'form') refreshCats(); markDirty();
    });
    r('edQuestions').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const q = findQ(b), idx = draft.questions.indexOf(q);
      if (b.dataset.act === 'dup') { draft.questions.splice(idx + 1, 0, { ...q, id: exIdSeq++ }); renderEdQuestions(); markDirty(); }
      else armedClick(b, '¿Eliminar?', () => { draft.questions.splice(idx, 1); renderEdQuestions(); markDirty(); });
    });
    r('edAddQ').addEventListener('click', () => {
      draft.questions.push({ id: exIdSeq++, sentence: '', correct: '', accepted: '', distractors: '', term: '', form: '', explanation: '' });
      renderEdQuestions(); markDirty();
      const cs = $$('.ed-item', r('edQuestions')), last = cs[cs.length - 1];
      last.scrollIntoView({ block: 'center' }); $('textarea', last).focus({ preventScroll: true });
    });
    r('edTHead').addEventListener('input', (e) => { if (e.target.dataset.th === undefined) return; draft.table.headers[Number(e.target.dataset.th)] = e.target.value; markDirty(); });
    r('edTRows').addEventListener('input', (e) => { const f = e.target.dataset.tf; if (!f) return; draft.table.rows[Number(e.target.closest('.ex-trow').dataset.ri)][f] = e.target.value; e.target.classList.remove('invalid'); markDirty(); });
    r('edTRows').addEventListener('click', (e) => { const b = e.target.closest('[data-tact="del"]'); if (!b) return; draft.table.rows.splice(Number(b.closest('.ex-trow').dataset.ri), 1); renderEdTable(); markDirty(); });
    r('edAddRow').addEventListener('click', () => { draft.table.rows.push({ c1: '', c2: '', c3: '', note: '' }); renderEdTable(); markDirty(); const rs = $$('.ex-trow', r('edTRows')); $('input', rs[rs.length - 1]).focus(); });

    function applyDraft(go) {
      $$('.ed-item.invalid, .invalid', root).forEach((el) => el.classList.remove('invalid')); $$('.ed-err', root).forEach((el) => el.remove());
      const res = compileDraft(draft);
      if (res.errors.length) {
        showMsg(r('edErrors'), '<strong>Revisa esto antes de aplicar</strong><ul>' + res.errors.map((er) => '<li>' + esc(er.msg) + '</li>').join('') + '</ul>', 'err');
        res.errors.forEach((er) => {
          if (er.id != null) {
            const el = $(`.ed-item[data-qid="${er.id}"]`, root); if (!el) return;
            el.classList.add('invalid');
            let ul = $('.ed-err', el); if (!ul) { ul = h('ul', { class: 'ed-err' }); $('.ed-item-head', el).after(ul); }
            ul.append(h('li', { text: er.short }));
          } else if (er.row != null) { const c = $(`.ex-trow[data-ri="${er.row}"] input[data-tf="c1"]`, r('edTRows')); if (c) c.classList.add('invalid'); }
        });
        setStatus('Revisa los campos marcados', 'err');
        const first = $('.ed-item.invalid, input.invalid', root); if (first) first.scrollIntoView({ block: 'center' });
        return false;
      }
      hideMsg(r('edErrors'));
      draft.questions = draft.questions.filter((q) => !isBlankQ(q)); draft.table.rows = draft.table.rows.filter((x) => !isBlankRow(x));
      renderEditor();
      apply(res.data, true);
      const saved = store.setJson(K.exercise, exportShape(draft, true));
      dirty = false;
      setStatus(saved ? 'Aplicado y guardado' : 'Aplicado, pero este navegador no permite guardar', 'ok');
      if (go) { showPane('quiz'); window.scrollTo(0, 0); }
      if (cfg.onApply) cfg.onApply(exportShape(draft, false), editorApi);
      return true;
    }
    r('edApply').addEventListener('click', () => applyDraft(true));
    r('edReset').addEventListener('click', () => armedClick(r('edReset'), '¿Descartar lo escrito?', () => {
      draft = cleanDraft(cfg.sample, false); renderEditor(); hideMsg(r('edErrors')); markDirty(); setStatus('Ejemplo cargado. Falta aplicarlo.', 'dirty');
      const b = r('edReset'); b.textContent = 'Volver al ejemplo'; b.classList.remove('armed'); delete b.dataset.armed;
    }));

    function exportShape(d, keepIds) {
      return { title: d.title, description: d.description, fuzzy: d.fuzzy, questions: d.questions.filter((q) => !isBlankQ(q)).map((q) => { const c = { ...q }; if (!keepIds) delete c.id; return c; }), table: { headers: d.table.headers, rows: d.table.rows.filter((x) => !isBlankRow(x)) } };
    }
    r('edIO').addEventListener('click', () => { r('ioText').value = JSON.stringify(exportShape(draft, false), null, 2); hideMsg(r('ioMsg')); r('dlgIO').showModal(); });
    r('ioCopy').addEventListener('click', async () => {
      const ta = r('ioText'); ta.select(); let ok = false;
      try { await navigator.clipboard.writeText(ta.value); ok = true; } catch (e) { try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } }
      showMsg(r('ioMsg'), ok ? 'JSON copiado al portapapeles.' : 'No se pudo copiar automáticamente. El texto está seleccionado: usa Ctrl+C.', ok ? 'ok' : 'err');
    });
    r('ioDownload').addEventListener('click', () => { download('ejercicio.json', 'application/json', r('ioText').value); showMsg(r('ioMsg'), 'Descarga iniciada: ejercicio.json.', 'ok'); });
    function loadText(text) {
      try {
        const p = JSON.parse(text);
        if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('debe ser un objeto con título y preguntas');
        if (!Array.isArray(p.questions)) throw new Error('falta la lista «questions»');
        draft = cleanDraft(p, false); renderEditor(); hideMsg(r('edErrors')); markDirty(); setStatus('JSON cargado. Falta aplicarlo.', 'dirty'); r('dlgIO').close();
      } catch (err) { showMsg(r('ioMsg'), 'No se pudo leer el JSON: ' + esc(err.message) + '.', 'err'); }
    }
    r('ioLoad').addEventListener('click', () => loadText(r('ioText').value));
    r('ioOpen').addEventListener('click', () => r('ioFile').click());
    r('ioFile').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader(); rd.onload = () => { r('ioText').value = rd.result; loadText(rd.result); }; rd.onerror = () => showMsg(r('ioMsg'), 'No se pudo leer el archivo.', 'err'); rd.readAsText(f); e.target.value = '';
    });

    /* API que usan los módulos que amplían el editor (p. ej. publicar como herramienta) */
    editorApi = {
      draft: () => draft,
      compile: () => compileDraft(draft),
      shape: (keepIds) => exportShape(draft, keepIds),
      apply: (go) => applyDraft(go),
      isDirty: () => dirty,
      setStatus, showPane,
      load(data, status) {
        draft = cleanDraft(data, false); renderEditor(); hideMsg(r('edErrors'));
        apply(compileDraft(draft).data, true);
        store.setJson(K.exercise, exportShape(draft, true));
        dirty = false; setStatus(status || '', status ? 'ok' : '');
      },
      blank() { editorApi.load({ title: '', description: '', fuzzy: false, questions: [{}], table: {} }, ''); }
    };

    /* arranque del editor: ejercicio guardado o ejemplo */
    let start = null;
    const raw = store.get(K.exercise);
    if (raw) { try { const saved = cleanDraft(JSON.parse(raw), true); if (!compileDraft(saved).errors.length) start = saved; } catch (e) { /* datos dañados */ } }
    draft = start || cleanDraft(cfg.sample, false);
    renderEditor();
    apply(compileDraft(draft).data, false);
    if (cfg.editorExtra) cfg.editorExtra(r('edExtra'), editorApi);
  } else {
    apply(cfg.build(), false);
  }

  return { show() { if (pane === 'quiz') renderQuestion(); }, hide() {}, editor: editorApi };
}
