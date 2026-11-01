'use strict';

/* =========================================================
   PARCHÍS
   Tablero clásico de 68 casillas en anillo + 4 pasillos de meta.
   Portado del módulo de Ajedrez.html.
   ========================================================= */
(function () {
  const NAMES = ['amarillo', 'azul', 'rojo', 'verde'];
  const SEAT_VAR = ['--p0', '--p1', '--p2', '--p3'];
  const EXIT = [13, 30, 47, 64];
  const RING = [];
  for (let r = 7; r >= 0; r--) RING.push([r, 8]);
  RING.push([0, 9]);
  for (let r = 0; r <= 7; r++) RING.push([r, 10]);
  for (let c = 11; c <= 18; c++) RING.push([8, c]);
  RING.push([9, 18]);
  for (let c = 18; c >= 11; c--) RING.push([10, c]);
  for (let r = 11; r <= 18; r++) RING.push([r, 10]);
  RING.push([18, 9]);
  for (let r = 18; r >= 11; r--) RING.push([r, 8]);
  for (let c = 7; c >= 0; c--) RING.push([10, c]);
  RING.push([9, 0]);
  for (let c = 0; c <= 7; c++) RING.push([8, c]);
  const seven = (f) => Array.from({ length: 7 }, (_, i) => f(i));
  const COR = [seven((i) => [1 + i, 9]), seven((i) => [9, 17 - i]), seven((i) => [17 - i, 9]), seven((i) => [9, 1 + i])];
  const META = [[8, 9], [9, 10], [10, 9], [9, 8]];
  const HOUSE = [[1, 12], [12, 12], [12, 1], [1, 1]];
  const SAFE = new Set();
  EXIT.forEach((e) => [e, e + 7, e + 12].forEach((x) => SAFE.add(x % 68)));
  const tIdx = (s, p) => (EXIT[s] + p) % 68;
  const pcell = (s, p) => (p < 64 ? RING[tIdx(s, p)] : p < 71 ? COR[s][p - 64] : META[s]);

  registerView({
    id: 'parchis',
    mount(root) {
      let PR = null;

      function occ(x) { const o = []; PR.seats.forEach((s, j) => PR.pos[j].forEach((p, i) => { if (p >= 0 && p < 64 && tIdx(s, p) === x) o.push([j, i]); })); return o; }
      function barrier(x) { const o = occ(x); return o.length === 2 && o[0][0] === o[1][0]; }
      function target(j, i, n) {
        const s = PR.seats[j], p = PR.pos[j][i];
        let t;
        if (p < 0) { if (n !== 5) return null; t = 0; } else { t = p + n; if (t > 71) return null; }
        for (let k = Math.max(p + 1, 0); k <= Math.min(t, 63); k++) if (barrier(tIdx(s, k))) return null;
        if (t <= 63) { const o = occ(tIdx(s, t)).filter((a) => !(a[0] === j && a[1] === i)); if (o.length >= 2 && !(p < 0 && o.some((a) => a[0] !== j))) return null; }
        return t;
      }
      function legalMoves(n) {
        const j = PR.t, pos = PR.pos[j];
        let out = [0, 1, 2, 3].filter((i) => target(j, i, n) !== null);
        if (n === 5 && out.some((i) => pos[i] < 0)) out = out.filter((i) => pos[i] < 0);
        return out;
      }
      function parReset() {
        const np = Number(npSel.value);
        const seats = np === 2 ? [0, 2] : np === 3 ? [0, 1, 2] : [0, 1, 2, 3];
        PR = { seats, t: 0, pos: seats.map(() => [-1, -1, -1, -1]), phase: 'roll', roll: 0, sixes: 0, bonus: 0, win: -1, last: '' };
        render();
      }
      function parEnd() {
        if (PR.roll === 6 && ++PR.sixes < 3) { PR.phase = 'roll'; return; }
        PR.t = (PR.t + 1) % PR.seats.length; PR.sixes = 0; PR.phase = 'roll';
      }
      function parRoll() {
        if (PR.phase !== 'roll') return;
        const n = (PR.roll = 1 + (Math.random() * 6 | 0)), can = legalMoves(n).length > 0;
        PR.last = `Jugador ${PR.t + 1} ha sacado ${n}${can ? '.' : ' y no puede mover.'}`;
        if (can) PR.phase = 'move'; else parEnd();
        render();
      }
      function parMove(i) {
        const j = PR.t, n = PR.phase === 'bonus' ? PR.bonus : PR.roll;
        if ((PR.phase !== 'move' && PR.phase !== 'bonus') || !legalMoves(n).includes(i)) return;
        const s = PR.seats[j], p = PR.pos[j][i], t = target(j, i, n);
        let b = 0;
        PR.pos[j][i] = t;
        if (t <= 63) { const x = tIdx(s, t), hitArr = occ(x).filter((a) => a[0] !== j); if (hitArr.length && (!SAFE.has(x) || p < 0)) { PR.pos[hitArr[0][0]][hitArr[0][1]] = -1; b = 20; } }
        else if (t === 71) b = 10;
        if (PR.pos[j].every((v) => v === 71)) { PR.win = j; PR.phase = 'over'; return render(); }
        PR.bonus = b;
        if (b && legalMoves(b).length) PR.phase = 'bonus'; else parEnd();
        render();
      }

      const npSel = h('select', { class: 'select', 'aria-label': 'Número de jugadores' }, [2, 3, 4].map((n) => h('option', { value: n, text: n, selected: n === 4 })));
      const boardSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      boardSvg.setAttribute('viewBox', '0 0 19 19'); boardSvg.setAttribute('class', 'par-board'); boardSvg.setAttribute('role', 'group'); boardSvg.setAttribute('aria-label', 'Tablero de parchís');
      const rollBtn = h('button', { class: 'btn primary', type: 'button', text: 'Tirar dado', onclick: parRoll });
      const diceText = h('span', { class: 'par-dice' });
      const status = h('p', { class: 'par-status', role: 'status', 'aria-live': 'polite' });
      npSel.addEventListener('change', parReset);
      root.append(
        h('div', { class: 'par' },
          h('div', { class: 'par-main' },
            h('label', { class: 'par-np' }, 'Jugadores ', npSel),
            status,
            h('div', { class: 'par-stage' }, boardSvg),
            h('div', { class: 'par-row' }, rollBtn, diceText)),
          h('aside', { class: 'card par-legend' }, h('h2', { text: 'Fichas' }),
            NAMES.map((n, i) => h('p', null, h('span', { class: 'par-dot', style: 'background:var(' + SEAT_VAR[i] + ')' }), n)),
            h('button', { class: 'btn sm', type: 'button', text: 'Nueva partida', onclick: parReset }))));

      function render() {
        const P = PR, j = P.t, ph = P.phase;
        const mvs = ph === 'move' ? legalMoves(P.roll) : ph === 'bonus' ? legalMoves(P.bonus) : [];
        const cell = (r, c, cls, sty = '') => `<rect x="${c}" y="${r}" width="1" height="1" class="${cls}" style="${sty}"/>`;
        let svg = '';
        RING.forEach(([r, c], x) => { svg += cell(r, c, SAFE.has(x) ? 'cl sf' : 'cl'); });
        for (let q = 0; q < 4; q++) {
          COR[q].forEach(([r, c]) => { svg += cell(r, c, 'cl', 'fill:color-mix(in srgb,var(' + SEAT_VAR[q] + ') 45%, var(--surface))'); });
          svg += cell(META[q][0], META[q][1], 'cl', 'fill:var(' + SEAT_VAR[q] + ')');
          svg += `<rect x="${HOUSE[q][1]}" y="${HOUSE[q][0]}" width="6" height="6" rx=".6" class="hs" style="stroke:var(${SEAT_VAR[q]})"/>`;
          const [er, ec] = RING[EXIT[q]];
          svg += `<rect x="${ec + 0.08}" y="${er + 0.08}" width=".84" height=".84" class="ex" style="stroke:var(${SEAT_VAR[q]})"/>`;
        }
        const list = [], cnt = {}, seen = {};
        P.seats.forEach((sq, jj) => P.pos[jj].forEach((p, i) => {
          let r, c;
          if (p < 0) { r = HOUSE[sq][0] + 1 + (i >> 1) * 3; c = HOUSE[sq][1] + 1 + (i & 1) * 3; }
          else { [r, c] = pcell(sq, p); const k = r + ',' + c; cnt[k] = (cnt[k] || 0) + 1; }
          list.push({ jj, sq, i, r, c, p });
        }));
        list.forEach((o) => {
          let cx = o.c + 0.5, rad = 0.4;
          const cy = o.r + 0.5, k = o.r + ',' + o.c;
          if (o.p >= 0 && cnt[k] > 1) { rad = 0.27; cx += (seen[k] = (seen[k] || 0) + 1) === 1 ? -0.22 : 0.22; }
          const mv = o.jj === j && mvs.includes(o.i);
          svg += `<g class="pc${mv ? ' mv' : ''}"${mv ? ` tabindex="0" role="button" data-i="${o.i}" aria-label="Ficha ${o.i + 1} de ${NAMES[o.sq]}"` : ''}>` +
            (mv ? `<circle class="ring" cx="${cx}" cy="${cy}" r="${rad + 0.09}"/>` : '') +
            `<circle class="pcc" cx="${cx}" cy="${cy}" r="${rad}" style="fill:var(${SEAT_VAR[o.sq]})"/><text class="pt" x="${cx}" y="${cy + 0.16}">${o.jj + 1}</text></g>`;
        });
        boardSvg.innerHTML = svg;
        rollBtn.disabled = ph !== 'roll';
        diceText.textContent = P.last || 'Pulsa tirar dado para empezar.';
        const who = `Jugador ${j + 1} (${NAMES[P.seats[j]]})`;
        status.textContent = ph === 'over' ? `Gana el jugador ${P.win + 1} (${NAMES[P.seats[P.win]]}).`
          : ph === 'roll' ? `Turno de ${who}. Tira el dado.`
          : ph === 'move' ? `${who}: elige una ficha para avanzar ${P.roll}.`
          : `${who}: premio de ${P.bonus}. Elige una ficha para avanzarlo.`;
        status.classList.toggle('win', ph === 'over');
      }
      boardSvg.addEventListener('click', (e) => { const g = e.target.closest('.mv'); if (g) parMove(Number(g.dataset.i)); });
      boardSvg.addEventListener('keydown', (e) => { const g = e.target.closest('.mv'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); parMove(Number(g.dataset.i)); } });
      document.addEventListener('keydown', (e) => { if (app.isActive('parchis') && e.key === ' ' && e.target === document.body) { e.preventDefault(); parRoll(); } });
      parReset();
    }
  });
})();
