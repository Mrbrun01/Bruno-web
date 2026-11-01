'use strict';

/* =========================================================
   TRES EN RAYA
   ========================================================= */
registerView({
  id: 'tres-en-raya',
  mount(root) {
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    let board, turn, over, cpu = store.get('ttt-cpu') === '1', winLine = null;
    const score = { X: 0, O: 0, tie: 0 };

    const cells = Array.from({ length: 9 }, (_, i) => h('button', { type: 'button', class: 'ttt-cell', 'data-i': i, 'aria-label': 'Casilla ' + (i + 1) + ', vacía', onclick: () => play(i) }));
    const grid = h('div', { class: 'ttt-grid', role: 'group', 'aria-label': 'Tablero' }, cells);
    const status = h('p', { class: 'ttt-status', role: 'status', 'aria-live': 'polite' });
    const sX = h('b', { class: 'num' }), sO = h('b', { class: 'num' }), sT = h('b', { class: 'num' });
    const modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Modo de juego' },
      h('button', { type: 'button', 'aria-pressed': String(!cpu), text: '2 jugadores', onclick: () => setMode(false) }),
      h('button', { type: 'button', 'aria-pressed': String(cpu), text: 'Contra la máquina', onclick: () => setMode(true) }));
    root.append(h('div', { class: 'ttt' },
      h('div', { class: 'ttt-main' }, modeSeg, status, grid, h('button', { class: 'btn', type: 'button', text: 'Nueva partida', onclick: reset })),
      h('aside', { class: 'card ttt-score' }, h('h2', { text: 'Marcador' }),
        h('p', null, h('span', { class: 'p-x', text: 'X' }), sX), h('p', null, h('span', { class: 'p-o', text: 'O' }), sO), h('p', null, h('span', { text: 'Empates' }), sT))));

    function setMode(v) { cpu = v; store.set('ttt-cpu', v ? '1' : '0'); $$('button', modeSeg).forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === v))); score.X = score.O = score.tie = 0; reset(); }
    const winner = (b) => { for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { p: b[l[0]], line: l }; return null; };
    function paint() {
      cells.forEach((c, i) => {
        c.textContent = board[i]; c.className = 'ttt-cell' + (board[i] ? ' p-' + board[i].toLowerCase() : '') + (winLine && winLine.includes(i) ? ' win' : '');
        c.disabled = over || !!board[i];
        c.setAttribute('aria-label', 'Casilla ' + (i + 1) + ', ' + (board[i] ? board[i] : 'vacía'));
      });
      sX.textContent = score.X; sO.textContent = score.O; sT.textContent = score.tie;
    }
    function say() { if (!over) status.textContent = cpu && turn === 'O' ? 'Piensa la máquina…' : 'Turno de ' + turn; }
    function reset() { board = Array(9).fill(''); turn = 'X'; over = false; winLine = null; paint(); say(); }
    function finish() {
      const w = winner(board);
      if (w) { over = true; winLine = w.line; score[w.p]++; status.textContent = (cpu && w.p === 'O' ? 'Gana la máquina (O)' : 'Gana ' + w.p) + '.'; }
      else if (board.every(Boolean)) { over = true; score.tie++; status.textContent = 'Empate.'; }
      paint(); return over;
    }
    function play(i) {
      if (over || board[i] || (cpu && turn === 'O')) return;
      board[i] = turn; paint();
      if (finish()) return;
      turn = turn === 'X' ? 'O' : 'X'; say();
      if (cpu && turn === 'O') setTimeout(cpuMove, 350);
    }
    // Minimax: la máquina no pierde nunca
    function minimax(b, p) {
      const w = winner(b); if (w) return { s: w.p === 'O' ? 1 : -1 };
      const free = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0); if (!free.length) return { s: 0 };
      let bestM = null;
      for (const i of free) { b[i] = p; const r = minimax(b, p === 'O' ? 'X' : 'O'); b[i] = ''; if (bestM === null || (p === 'O' ? r.s > bestM.s : r.s < bestM.s)) bestM = { s: r.s, i }; }
      return bestM;
    }
    function cpuMove() {
      if (over) return;
      const free = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      const i = free.length === 9 ? free[Math.floor(Math.random() * 9)] : minimax([...board], 'O').i;
      board[i] = 'O'; paint();
      if (finish()) return;
      turn = 'X'; say();
    }
    reset();
  }
});
