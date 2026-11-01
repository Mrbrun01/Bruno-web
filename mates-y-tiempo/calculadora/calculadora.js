'use strict';

/* =========================================================
   CALCULADORA CIENTÍFICA (evaluador propio, sin eval)
   + memoria, historial y conversor de unidades
   ========================================================= */
const UNIT_GROUPS = [
  { id: 'long', name: 'Longitud', base: 'm', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, pulg: 0.0254, pie: 0.3048, yarda: 0.9144, milla: 1609.344 } },
  { id: 'masa', name: 'Peso', base: 'kg', units: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.0283495, lb: 0.453592 } },
  { id: 'vol', name: 'Volumen', base: 'l', units: { ml: 0.001, l: 1, 'm³': 1000, 'cucharadita': 0.00492892, 'cucharada': 0.0147868, taza: 0.24, galón: 3.78541 } },
  { id: 'vel', name: 'Velocidad', base: 'kmh', units: { 'm/s': 3.6, 'km/h': 1, 'mph': 1.609344, nudo: 1.852 } },
  { id: 'tiempo', name: 'Tiempo', base: 's', units: { s: 1, min: 60, h: 3600, día: 86400, semana: 604800 } },
  { id: 'area', name: 'Área', base: 'm2', units: { 'cm²': 0.0001, 'm²': 1, hectárea: 10000, 'km²': 1e6, 'pie²': 0.092903 } },
  { id: 'datos', name: 'Datos digitales', base: 'MB', units: { bit: 1 / 8e6, byte: 1e-6, KB: 0.001, MB: 1, GB: 1000, TB: 1e6 } },
  { id: 'temp', name: 'Temperatura', temp: true, units: ['°C', '°F', 'K'] }
];
function convertTemp(v, from, to) {
  const c = from === '°C' ? v : from === '°F' ? (v - 32) * 5 / 9 : v - 273.15;
  return to === '°C' ? c : to === '°F' ? c * 9 / 5 + 32 : c + 273.15;
}

registerView({
  id: 'calculadora',
  mount(root) {
    const OPERATORS = '+-*/^';
    const OPERAND_END = /[\d)%!πℯs]$/;
    const IMPLICIT = /[)%!πℯs]$/;
    let expr = '', justEvaluated = false, historyText = '', errorMsg = '', ansValue = 0, mem = 0;
    let deg = store.get('calc-deg') !== '0';
    let hist = store.json('calc-historial', []);
    if (!Array.isArray(hist)) hist = [];
    const savePrefs = () => { store.set('calc-deg', deg ? '1' : '0'); };
    const saveHist = () => store.setJson('calc-historial', hist);

    const key = (k, label, cls = '', aria) => `<button type="button" data-key="${k}" class="${cls}"${aria ? ` aria-label="${aria}"` : ''}>${label}</button>`;
    const sciKeys = [
      ['sin(', 'sin', 'Seno'], ['cos(', 'cos', 'Coseno'], ['tan(', 'tan', 'Tangente'], ['π', 'π', 'Pi'],
      ['asin(', 'sin<sup>−1</sup>', 'Arcoseno'], ['acos(', 'cos<sup>−1</sup>', 'Arcocoseno'], ['atan(', 'tan<sup>−1</sup>', 'Arcotangente'], ['ℯ', 'e', 'Número e'],
      ['ln(', 'ln', 'Logaritmo natural'], ['log(', 'log', 'Logaritmo en base 10'], ['sqrt(', '√', 'Raíz cuadrada'], ['cbrt(', '∛', 'Raíz cúbica'],
      ['^2', 'x<sup>2</sup>', 'Al cuadrado'], ['^3', 'x<sup>3</sup>', 'Al cubo'], ['^', 'x<sup>y</sup>', 'Potencia'], ['!', 'n!', 'Factorial'],
      ['inv', '1/x', 'Inverso'], ['ℯ^(', 'e<sup>x</sup>', 'e elevado a x'], ['10^(', '10<sup>x</sup>', '10 elevado a x'], ['abs(', '|x|', 'Valor absoluto'],
      ['mod', 'mod', 'Resto de la división'], ['MS', 'MS', 'Guardar en memoria'], ['MODE', 'DEG', 'Cambiar entre grados y radianes'], ['ans', 'Ans', 'Último resultado']
    ].map(([k, l, a]) => key(k, l, 'fn', a)).join('');

    root.innerHTML = `
      <div class="seg calc-top-tabs" role="tablist" aria-label="Herramienta">
        <button type="button" role="tab" id="ct-calc" aria-selected="true">Calculadora</button>
        <button type="button" role="tab" id="ct-conv" aria-selected="false">Conversor de unidades</button>
      </div>
      <section id="pane-calc">
      <div class="calc" id="calc">
        <div class="calc-top">
          <span class="calc-mem-badge" id="mem-badge" hidden title="Hay un valor en memoria">M</span>
          <button type="button" class="icon-btn" id="calc-hist-btn" aria-label="Historial" aria-expanded="false" title="Historial">${icon('clock')}</button>
        </div>
        <div class="calc-display">
          <div class="calc-line"><span class="calc-angle"></span><div class="calc-expr" aria-hidden="true"><span></span></div></div>
          <div class="calc-result num" role="status" aria-live="polite">0</div>
        </div>
        <div class="calc-panels">
          <div class="calc-col">
            <div class="calc-keys calc-mem-keys">${key('MC', 'MC', 'fn', 'Borrar memoria')}${key('MR', 'MR', 'fn', 'Recuperar memoria')}${key('M+', 'M+', 'fn', 'Sumar a memoria')}${key('M-', 'M−', 'fn', 'Restar de memoria')}</div>
            <div class="calc-keys calc-sci-keys">${sciKeys}</div>
          </div>
          <div class="calc-keys calc-main-keys">
            ${key('C', 'C', 'clear', 'Borrar todo')}${key('(', '(', 'op', 'Abrir paréntesis')}${key(')', ')', 'op', 'Cerrar paréntesis')}${key('Backspace', '⌫', 'op', 'Borrar último carácter')}
            ${key('7', '7')}${key('8', '8')}${key('9', '9')}${key('/', '÷', 'op', 'Dividir')}
            ${key('4', '4')}${key('5', '5')}${key('6', '6')}${key('*', '×', 'op', 'Multiplicar')}
            ${key('1', '1')}${key('2', '2')}${key('3', '3')}${key('-', '−', 'op', 'Restar')}
            ${key('0', '0')}${key('.', ',', '', 'Coma decimal')}${key('%', '%', 'op', 'Porcentaje')}${key('+', '+', 'op', 'Sumar')}
            ${key('=', '=', 'equals', 'Calcular')}
          </div>
        </div>
        <div class="calc-hist" id="calc-hist" hidden>
          <div class="calc-hist-head"><h2>Historial</h2><button type="button" class="icon-btn" id="calc-hist-close" aria-label="Cerrar historial">${icon('close')}</button></div>
          <ol id="calc-hist-list"></ol>
          <p class="muted" id="calc-hist-empty">Aquí aparecerán tus últimos cálculos.</p>
          <div class="calc-hist-foot"><button type="button" class="btn sm ghost danger" id="calc-hist-clear">Borrar historial</button></div>
        </div>
      </div>
      </section>
      <section id="pane-conv" hidden>
        <div class="card conv-card">
          <label class="field">Categoría
            <select class="select" id="conv-cat">${UNIT_GROUPS.map((g) => `<option value="${g.id}">${g.name}</option>`).join('')}</select>
          </label>
          <div class="conv-row">
            <label class="field"><input class="input conv-input" id="conv-from-val" type="text" inputmode="decimal" value="1"><select class="select" id="conv-from-unit"></select></label>
            <button type="button" class="icon-btn conv-swap" id="conv-swap" aria-label="Invertir">${icon('repeat')}</button>
            <label class="field"><input class="input conv-input" id="conv-to-val" type="text" readonly tabindex="-1"><select class="select" id="conv-to-unit"></select></label>
          </div>
          <p class="muted conv-note" id="conv-note"></p>
        </div>
      </section>`;
    const calcEl = $('#calc', root), exprEl = $('.calc-expr span', root), exprBox = $('.calc-expr', root), resultEl = $('.calc-result', root);
    const angleTag = $('.calc-angle', root), angleKey = $('[data-key="MODE"]', root);
    const memBadge = $('#mem-badge', root), histBtn = $('#calc-hist-btn', root), histPanel = $('#calc-hist', root), histList = $('#calc-hist-list', root), histEmpty = $('#calc-hist-empty', root);

    /* ---------- Pestañas Calculadora / Conversor ---------- */
    const ctCalc = $('#ct-calc', root), ctConv = $('#ct-conv', root), paneCalc = $('#pane-calc', root), paneConv = $('#pane-conv', root);
    function showTop(which) {
      ctCalc.setAttribute('aria-selected', String(which === 'calc')); ctConv.setAttribute('aria-selected', String(which === 'conv'));
      paneCalc.hidden = which !== 'calc'; paneConv.hidden = which !== 'conv';
    }
    ctCalc.addEventListener('click', () => showTop('calc'));
    ctConv.addEventListener('click', () => showTop('conv'));

    /* ---------- Evaluador ---------- */
    const toRad = (x) => (deg ? x * Math.PI / 180 : x), fromRad = (x) => (deg ? x * 180 / Math.PI : x);
    const clean = (r) => (Math.abs(r) < 1e-14 ? 0 : r);
    const domain = () => { throw new Error('domain'); };
    function factorial(n) { if (!Number.isInteger(n) || n < 0 || n > 170) domain(); let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
    const FUNCS = {
      sin: (x) => clean(Math.sin(toRad(x))), cos: (x) => clean(Math.cos(toRad(x))),
      tan: (x) => { if (deg && Math.abs((((x % 180) + 180) % 180) - 90) < 1e-9) domain(); return clean(Math.tan(toRad(x))); },
      asin: (x) => (x < -1 || x > 1 ? domain() : fromRad(Math.asin(x))), acos: (x) => (x < -1 || x > 1 ? domain() : fromRad(Math.acos(x))), atan: (x) => fromRad(Math.atan(x)),
      sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
      ln: (x) => (x <= 0 ? domain() : Math.log(x)), log: (x) => (x <= 0 ? domain() : Math.log10(x)), log2: (x) => (x <= 0 ? domain() : Math.log2(x)),
      sqrt: (x) => (x < 0 ? domain() : Math.sqrt(x)), cbrt: (x) => Math.cbrt(x), abs: (x) => Math.abs(x),
      floor: Math.floor, ceil: Math.ceil, round: Math.round
    };
    function tokenize(src) {
      const tokens = [], numberRe = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i; let i = 0;
      while (i < src.length) {
        const ch = src[i];
        if ('+-*/^()%!πℯ,'.includes(ch)) { tokens.push(ch); i++; }
        else if (/[a-z]/.test(ch)) { const m = /^[a-z]+/.exec(src.slice(i)); tokens.push({ fn: m[0] }); i += m[0].length; }
        else { const m = numberRe.exec(src.slice(i)); if (!m) throw new Error('syntax'); tokens.push(parseFloat(m[0])); i += m[0].length; }
      }
      return tokens;
    }
    function evaluate(src) {
      const tokens = tokenize(src); let pos = 0;
      const peek = () => tokens[pos], next = () => tokens[pos++];
      function expr_() { let v = term(); while (peek() === '+' || peek() === '-') { const op = next(), r = term(); v = op === '+' ? v + r : v - r; } return v; }
      function term() { let v = unary(); while (peek() === '*' || peek() === '/' || (peek() && peek().fn === 'mod')) { const op = next(), r = unary(); if (op === '/') { if (r === 0) throw new Error('div0'); v /= r; } else if (op && op.fn === 'mod') { if (r === 0) throw new Error('div0'); v %= r; } else v *= r; } return v; }
      function unary() { if (peek() === '-') { next(); return -unary(); } if (peek() === '+') { next(); return unary(); } return power(); }
      function power() { const b = postfix(); if (peek() === '^') { next(); return Math.pow(b, unary()); } return b; }
      function postfix() { let v = primary(); while (peek() === '%' || peek() === '!') v = next() === '%' ? v / 100 : factorial(v); return v; }
      function primary() {
        const t = next();
        if (typeof t === 'number') return t;
        if (t === 'π') return Math.PI; if (t === 'ℯ') return Math.E;
        if (t === '(') { const v = expr_(); if (next() !== ')') throw new Error('syntax'); return v; }
        if (t && typeof t === 'object') {
          if (t.fn === 'ans') return ansValue;
          if (t.fn === 'rand') return Math.random();
          if (t.fn === 'mod') throw new Error('syntax');
          if (t.fn === 'npr' || t.fn === 'ncr') {
            if (next() !== '(') throw new Error('syntax');
            const n = expr_(); if (next() !== ',') throw new Error('syntax'); const r = expr_(); if (next() !== ')') throw new Error('syntax');
            if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || r > n) domain();
            const p = factorial(n) / factorial(n - r); return t.fn === 'npr' ? p : p / factorial(r);
          }
          const f = FUNCS[t.fn]; if (!f || next() !== '(') throw new Error('syntax');
          const a = expr_(); if (next() !== ')') throw new Error('syntax'); return f(a);
        }
        throw new Error('syntax');
      }
      const value = expr_();
      if (pos < tokens.length) throw new Error('syntax');
      if (!Number.isFinite(value)) throw new Error('overflow');
      return parseFloat(value.toPrecision(12));
    }
    const closeParens = (s) => s + ')'.repeat(Math.max(0, (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length));
    const pretty = (s) => s.replace(/asin/g, 'sin⁻¹').replace(/acos/g, 'cos⁻¹').replace(/atan/g, 'tan⁻¹').replace(/sqrt/g, '√').replace(/cbrt/g, '∛').replace(/log2/g, 'log₂').replace(/npr/g, 'nPr').replace(/ncr/g, 'nCr').replace(/floor/g, '⌊⌋').replace(/ceil/g, '⌈⌉').replace(/mod/g, ' mod ').replace(/rand/g, 'Rand').replace(/ans/g, 'Ans').replace(/ℯ/g, 'e').replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−').replace(/\./g, ',').replace(/,/g, ', ');
    function formatNumber(n) {
      const s = String(n); if (s.includes('e')) return pretty(s);
      const [int, dec] = s.split('.'), sign = int.startsWith('-') ? '−' : '';
      return sign + int.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F') + (dec ? ',' + dec : '');
    }
    const lastNumber = () => { const m = /(\d+\.?\d*|\.\d+)$/.exec(expr); return m ? m[0] : ''; };

    function paintMem() { memBadge.hidden = mem === 0; }
    function paintHistory() {
      histList.textContent = '';
      histEmpty.hidden = hist.length > 0;
      hist.slice().reverse().forEach((entry, ri) => {
        const i = hist.length - 1 - ri;
        histList.append(h('li', null,
          h('button', { type: 'button', class: 'calc-hist-item', onclick: () => { expr = entry.result; justEvaluated = false; historyText = ''; ansValue = parseFloat(entry.result); errorMsg = ''; render(); toggleHist(false); } },
            h('span', { class: 'calc-hist-expr', text: entry.expr + ' =' }), h('span', { class: 'calc-hist-res num', text: entry.result })),
          h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Eliminar del historial', html: icon('close'), onclick: () => { hist.splice(i, 1); saveHist(); paintHistory(); } })));
      });
    }
    function toggleHist(open) {
      const v = open === undefined ? histPanel.hidden : open;
      histPanel.hidden = !v; histBtn.setAttribute('aria-expanded', String(v));
      if (v) paintHistory();
    }
    histBtn.addEventListener('click', () => toggleHist());
    $('#calc-hist-close', root).addEventListener('click', () => toggleHist(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && app.isActive('calculadora') && !histPanel.hidden) toggleHist(false); });
    $('#calc-hist-clear', root).addEventListener('click', async () => {
      if (!hist.length) { toast('El historial ya está vacío.'); return; }
      const prev = hist;
      hist = []; saveHist(); paintHistory();
      toast('Historial borrado.', { label: 'Deshacer', run: () => { hist = prev; saveHist(); paintHistory(); } });
    });

    function render() {
      angleKey.textContent = deg ? 'DEG' : 'RAD'; angleTag.textContent = deg ? 'DEG' : 'RAD';
      exprEl.textContent = justEvaluated ? historyText + ' =' : pretty(expr);
      exprBox.scrollLeft = exprBox.scrollWidth;
      let main = '0'; resultEl.classList.remove('error');
      if (errorMsg) { main = errorMsg; resultEl.classList.add('error'); }
      else if (justEvaluated) main = formatNumber(expr);
      else if (expr) {
        let preview = null;
        if (!/^-?\d+\.?\d*$/.test(expr)) { try { preview = evaluate(closeParens(expr)); } catch (e) { preview = null; } }
        main = preview !== null ? formatNumber(preview) : (lastNumber() ? pretty(lastNumber()) : (resultEl.dataset.last || '0'));
      }
      resultEl.textContent = main;
      if (!errorMsg) resultEl.dataset.last = main;
      resultEl.classList.remove('small', 'tiny');
      if (!errorMsg) { if (main.length > 14) resultEl.classList.add('tiny'); else if (main.length > 9) resultEl.classList.add('small'); }
      paintMem();
    }
    const fresh = () => { expr = ''; historyText = ''; justEvaluated = false; };
    const cont = () => { justEvaluated = false; historyText = ''; };
    function currentValue() { try { return justEvaluated ? parseFloat(expr) : evaluate(closeParens(expr)); } catch (e) { return null; } }

    function press(k) {
      errorMsg = '';
      if (/^\d$/.test(k)) { if (justEvaluated) fresh(); if (IMPLICIT.test(expr)) expr += '*'; if (lastNumber() === '0') expr = expr.slice(0, -1); expr += k; }
      else if (k === '.') { if (justEvaluated) fresh(); if (IMPLICIT.test(expr)) expr += '*'; const n = lastNumber(); if (!n) expr += '0.'; else if (!n.includes('.')) expr += '.'; }
      else if (k.length === 1 && OPERATORS.includes(k)) {
        if (justEvaluated) cont();
        if (expr === '' || expr.slice(-1) === '(') { if (k === '-') expr += '-'; }
        else if (OPERATORS.includes(expr.slice(-1))) { if (k === '-' && '*/^'.includes(expr.slice(-1))) expr += '-'; else expr = expr.replace(/[-+*/^]+$/, '') + k; }
        else expr += k;
      }
      else if (k === 'mod') { if (justEvaluated) cont(); if (OPERAND_END.test(expr)) expr += 'mod'; }
      else if (k === '(') { if (justEvaluated) fresh(); if (/[\d.)%!πℯs]$/.test(expr)) expr += '*'; expr += '('; }
      else if (k === ')') { const o = (expr.match(/\(/g) || []).length, c = (expr.match(/\)/g) || []).length; if (o > c && /[\d.)%!πℯs]$/.test(expr)) expr += ')'; }
      else if (k === '%' || k === '!') { if (justEvaluated) cont(); if (OPERAND_END.test(expr)) expr += k; }
      else if (k === '^2' || k === '^3') { if (justEvaluated) cont(); if (OPERAND_END.test(expr)) expr += k; }
      else if (k === 'π' || k === 'ℯ' || k === 'ans') { if (justEvaluated) fresh(); if (/[\d.)%!πℯs]$/.test(expr)) expr += '*'; expr += k; }
      else if (k === 'rand') { if (justEvaluated) fresh(); if (/[\d.)%!πℯs]$/.test(expr)) expr += '*'; expr += k; }
      else if (/^([a-z]+|ℯ\^|10\^)\($/.test(k)) {
        if (justEvaluated) { expr = k + expr + ')'; cont(); } else { if (/[\d.)%!πℯs]$/.test(expr)) expr += '*'; expr += k; }
      }
      else if (k === 'inv') { expr = expr ? '1/(' + expr + ')' : '1/('; cont(); }
      else if (k === 'Backspace') { if (justEvaluated) fresh(); else expr = /([a-z]+\(|ans)$/.test(expr) ? expr.replace(/([a-z]+\(|ans)$/, '') : expr.slice(0, -1); }
      else if (k === 'C') { fresh(); resultEl.dataset.last = '0'; }
      else if (k === 'MODE') { deg = !deg; savePrefs(); }
      else if (k === 'MC') { mem = 0; }
      else if (k === 'MR') { if (justEvaluated) fresh(); if (/[\d.)%!πℯs]$/.test(expr)) expr += '*'; expr += String(mem); }
      else if (k === 'MS' || k === 'M+' || k === 'M-') {
        const v = currentValue();
        if (v === null) errorMsg = 'Nada que guardar en memoria';
        else mem = k === 'MS' ? v : k === 'M+' ? mem + v : mem - v;
      }
      else if (k === '=') {
        if (!expr || justEvaluated) { render(); return; }
        try {
          const closed = closeParens(expr), v = evaluate(closed);
          historyText = pretty(closed); expr = String(v); ansValue = v; justEvaluated = true;
          hist.push({ expr: historyText, result: formatNumber(v) }); if (hist.length > 20) hist.shift(); saveHist();
        } catch (e) {
          errorMsg = e.message === 'div0' ? 'No se puede dividir entre 0' : e.message === 'domain' ? 'Fuera del dominio de la función' : e.message === 'overflow' ? 'Resultado no válido o demasiado grande' : 'Operación incompleta';
        }
      }
      render();
    }
    $('.calc-panels', root).addEventListener('click', (e) => { const b = e.target.closest('button[data-key]'); if (b) press(b.dataset.key); });
    document.addEventListener('keydown', (e) => {
      if (!app.isActive('calculadora') || paneCalc.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      const k = e.key; let ok = true;
      if (/^\d$/.test(k) || (k.length === 1 && '+-*/()%^!'.includes(k))) press(k);
      else if (k === '.' || k === ',') press('.');
      else if (k === 'Enter' || k === '=') { if (e.target.closest && e.target.closest('button')) return; press('='); }
      else if (k === 'Backspace') press('Backspace');
      else if (k === 'Escape' || k === 'Delete') press('C');
      else if (k === 'p') press('π'); else if (k === 'e') press('ℯ'); else ok = false;
      if (ok) e.preventDefault();
    });
    render();

    /* ---------- Conversor de unidades ---------- */
    const convCat = $('#conv-cat', root), fromVal = $('#conv-from-val', root), toVal = $('#conv-to-val', root);
    const fromUnit = $('#conv-from-unit', root), toUnit = $('#conv-to-unit', root), convSwap = $('#conv-swap', root), convNote = $('#conv-note', root);
    function unitList(g) { return g.temp ? g.units : Object.keys(g.units); }
    function fillUnits(g) {
      const list = unitList(g);
      fromUnit.innerHTML = toUnit.innerHTML = list.map((u) => `<option value="${esc(u)}">${esc(u)}</option>`).join('');
      fromUnit.value = list[0]; toUnit.value = list[Math.min(1, list.length - 1)];
    }
    function currentGroup() { return UNIT_GROUPS.find((g) => g.id === convCat.value) || UNIT_GROUPS[0]; }
    function doConvert() {
      const g = currentGroup();
      const raw = fromVal.value.replace(',', '.').trim();
      const v = parseFloat(raw);
      if (raw === '' || isNaN(v)) { toVal.value = ''; convNote.textContent = 'Escribe un número.'; return; }
      let result;
      if (g.temp) result = convertTemp(v, fromUnit.value, toUnit.value);
      else result = v * g.units[fromUnit.value] / g.units[toUnit.value];
      const rounded = Math.abs(result) >= 1000 ? Math.round(result * 100) / 100 : Math.round(result * 1e6) / 1e6;
      toVal.value = String(rounded).replace('.', ',');
      convNote.textContent = '1 ' + fromUnit.value + ' = ' + (g.temp ? convertTemp(1, fromUnit.value, toUnit.value) : g.units[fromUnit.value] / g.units[toUnit.value]).toLocaleString('es-ES', { maximumFractionDigits: 6 }) + ' ' + toUnit.value;
    }
    convCat.addEventListener('change', () => { fillUnits(currentGroup()); doConvert(); });
    [fromVal, fromUnit, toUnit].forEach((el) => el.addEventListener('input', doConvert));
    convSwap.addEventListener('click', () => { const a = fromUnit.value; fromUnit.value = toUnit.value; toUnit.value = a; fromVal.value = toVal.value || fromVal.value; doConvert(); });
    fillUnits(currentGroup()); doConvert();

    return { evaluate: (s) => evaluate(s) };
  }
});
