'use strict';

/* =========================================================
   AJEDREZ
   Tablero de 64 casillas, índice = fila*8 + columna (0 = a1).
   Motor de reglas propio: movimientos legales, enroque, captura
   al paso, coronación, jaque, jaque mate y ahogado.
   ========================================================= */
(function () {
  const FILES = 'abcdefgh';
  const sq = (f, r) => r * 8 + f;
  const fileOf = (i) => i % 8, rankOf = (i) => Math.floor(i / 8);
  const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const algebra = (i) => FILES[fileOf(i)] + (rankOf(i) + 1);
  const KNIGHT_D = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const KING_D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const BISHOP_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ROOK_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const PIECE_SVG = {
    k: '<path d="M12 3v5M9.8 5.5h4.4"/><path d="M6.5 20.5h11l-.5-2.5c1.5-3 .5-8-5-8s-6.5 5-5 8z"/>',
    q: '<path d="M4.5 8l2.5 12.5h10L19.5 8l-4.3 4.5L12 5 8.8 12.5z"/>',
    r: '<path d="M6.5 20.5h11v-2l-1.5-1v-7l1.5-1.5V5.5h-2.4v1.8h-2.2V5.5h-2.8v1.8H9V5.5H6.5V9L8 10.5v7l-1.5 1z"/>',
    b: '<circle cx="12" cy="4.8" r="1.4"/><path d="M12 7c3 2.2 4 5 2.5 7.5H16l1 6H7l1-6h1.5C8 12 9 9.2 12 7z"/>',
    n: '<path d="M7 20.5h11c0-5.5-.5-9.5-4-12.5l.5-2.5-3 1.8L6 12l1.5 2 3-2c-1.5 3.5-3.5 4-3.5 8.5z"/>',
    p: '<circle cx="12" cy="7.5" r="3"/><path d="M7 20.5h10l-1.2-1c-.3-3-1-5.2-3.8-6.2-2.8 1-3.5 3.2-3.8 6.2z"/>'
  };
  const pieceHtml = (p) => p ? '<span class="p ' + p.c + '"><svg viewBox="0 0 24 24">' + PIECE_SVG[p.t] + '</svg></span>' : '';
  const NM = { k: 'rey', q: 'dama', r: 'torre', b: 'alfil', n: 'caballo', p: 'peón' };
  const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const START = 'RNBQKBNR/PPPPPPPP/8/8/8/8/pppppppp/rnbqkbnr';

  function newState() {
    const board = Array(64).fill(null);
    START.split('/').forEach((row, ri) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) { f += Number(ch); continue; }
        board[sq(f, 7 - ri)] = { c: ch === ch.toUpperCase() ? 'b' : 'w', t: ch.toLowerCase() };
        f++;
      }
    });
    return { board, turn: 'w', castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: null, history: [], captured: { w: [], b: [] } };
  }

  function slide(board, from, dirs, color, out) {
    const f0 = fileOf(from), r0 = rankOf(from);
    dirs.forEach(([df, dr]) => {
      let f = f0 + df, r = r0 + dr;
      while (onBoard(f, r)) {
        const t = sq(f, r), occ = board[t];
        if (!occ) out.push({ from, to: t });
        else { if (occ.c !== color) out.push({ from, to: t, capture: true }); break; }
        f += df; r += dr;
      }
    });
  }
  function jump(board, from, deltas, color, out) {
    const f0 = fileOf(from), r0 = rankOf(from);
    deltas.forEach(([df, dr]) => {
      const f = f0 + df, r = r0 + dr;
      if (!onBoard(f, r)) return;
      const t = sq(f, r), occ = board[t];
      if (!occ || occ.c !== color) out.push({ from, to: t, capture: !!occ });
    });
  }
  function pawnMoves(state, from, color, out) {
    const { board, ep } = state, f = fileOf(from), r = rankOf(from), dir = color === 'w' ? 1 : -1, startRank = color === 'w' ? 1 : 6, lastRank = color === 'w' ? 7 : 0;
    const addPromo = (to, extra) => { if (rankOf(to) === lastRank) ['q', 'r', 'b', 'n'].forEach((pr) => out.push({ from, to, promotion: pr, ...extra })); else out.push({ from, to, ...extra }); };
    if (onBoard(f, r + dir) && !board[sq(f, r + dir)]) {
      addPromo(sq(f, r + dir));
      if (r === startRank && !board[sq(f, r + 2 * dir)]) out.push({ from, to: sq(f, r + 2 * dir), doubleStep: true });
    }
    [-1, 1].forEach((df) => {
      const nf = f + df, nr = r + dir; if (!onBoard(nf, nr)) return;
      const t = sq(nf, nr), occ = board[t];
      if (occ && occ.c !== color) addPromo(t, { capture: true });
      else if (t === ep) out.push({ from, to: t, capture: true, enPassant: true });
    });
  }
  function pseudoMoves(state, from) {
    const piece = state.board[from]; if (!piece) return [];
    const out = [], color = piece.c;
    if (piece.t === 'p') pawnMoves(state, from, color, out);
    else if (piece.t === 'n') jump(state.board, from, KNIGHT_D, color, out);
    else if (piece.t === 'k') {
      jump(state.board, from, KING_D, color, out);
      const rank = color === 'w' ? 0 : 7, home = sq(4, rank);
      if (from === home && !isAttacked(state, home, color === 'w' ? 'b' : 'w')) {
        const rights = state.castle, K = color + 'K', Q = color + 'Q';
        if (rights[K] && !state.board[sq(5, rank)] && !state.board[sq(6, rank)] && state.board[sq(7, rank)]?.t === 'r'
          && !isAttacked(state, sq(5, rank), color === 'w' ? 'b' : 'w') && !isAttacked(state, sq(6, rank), color === 'w' ? 'b' : 'w'))
          out.push({ from, to: sq(6, rank), castle: 'K' });
        if (rights[Q] && !state.board[sq(3, rank)] && !state.board[sq(2, rank)] && !state.board[sq(1, rank)] && state.board[sq(0, rank)]?.t === 'r'
          && !isAttacked(state, sq(3, rank), color === 'w' ? 'b' : 'w') && !isAttacked(state, sq(2, rank), color === 'w' ? 'b' : 'w'))
          out.push({ from, to: sq(2, rank), castle: 'Q' });
      }
    } else if (piece.t === 'b') slide(state.board, from, BISHOP_D, color, out);
    else if (piece.t === 'r') slide(state.board, from, ROOK_D, color, out);
    else if (piece.t === 'q') slide(state.board, from, [...BISHOP_D, ...ROOK_D], color, out);
    return out;
  }
  function isAttacked(state, target, byColor) {
    const board = state.board, f0 = fileOf(target), r0 = rankOf(target);
    for (const [df, dr] of KNIGHT_D) { const f = f0 + df, r = r0 + dr; if (onBoard(f, r)) { const p = board[sq(f, r)]; if (p && p.c === byColor && p.t === 'n') return true; } }
    for (const [df, dr] of KING_D) { const f = f0 + df, r = r0 + dr; if (onBoard(f, r)) { const p = board[sq(f, r)]; if (p && p.c === byColor && p.t === 'k') return true; } }
    for (const [dirs, types] of [[BISHOP_D, 'bq'], [ROOK_D, 'rq']]) {
      for (const [df, dr] of dirs) {
        let f = f0 + df, r = r0 + dr;
        while (onBoard(f, r)) { const p = board[sq(f, r)]; if (p) { if (p.c === byColor && types.includes(p.t)) return true; break; } f += df; r += dr; }
      }
    }
    const pawnDir = byColor === 'w' ? -1 : 1;
    for (const df of [-1, 1]) { const f = f0 + df, r = r0 + pawnDir; if (onBoard(f, r)) { const p = board[sq(f, r)]; if (p && p.c === byColor && p.t === 'p') return true; } }
    return false;
  }
  function kingSquare(state, color) { return state.board.findIndex((p) => p && p.c === color && p.t === 'k'); }
  function inCheck(state, color) { return isAttacked(state, kingSquare(state, color), color === 'w' ? 'b' : 'w'); }

  function applyMove(state, move) {
    const board = state.board, piece = board[move.from], color = piece.c;
    const undo = { move, captured: null, capturedAt: null, prevCastle: { ...state.castle }, prevEp: state.ep, movedFromEmpty: false };
    if (move.enPassant) { const capAt = sq(fileOf(move.to), rankOf(move.from)); undo.captured = board[capAt]; undo.capturedAt = capAt; board[capAt] = null; }
    else if (move.capture) { undo.captured = board[move.to]; undo.capturedAt = move.to; }
    board[move.to] = move.promotion ? { c: color, t: move.promotion } : piece;
    board[move.from] = null;
    if (move.castle) {
      const rank = rankOf(move.from);
      if (move.castle === 'K') { board[sq(5, rank)] = board[sq(7, rank)]; board[sq(7, rank)] = null; }
      else { board[sq(3, rank)] = board[sq(0, rank)]; board[sq(0, rank)] = null; }
    }
    if (piece.t === 'k') { state.castle[color + 'K'] = false; state.castle[color + 'Q'] = false; }
    if (piece.t === 'r') {
      const rank = color === 'w' ? 0 : 7;
      if (move.from === sq(0, rank)) state.castle[color + 'Q'] = false;
      if (move.from === sq(7, rank)) state.castle[color + 'K'] = false;
    }
    if (undo.captured && undo.captured.t === 'r') {
      const oc = undo.captured.c, rank = oc === 'w' ? 0 : 7;
      if (undo.capturedAt === sq(0, rank)) state.castle[oc + 'Q'] = false;
      if (undo.capturedAt === sq(7, rank)) state.castle[oc + 'K'] = false;
    }
    state.ep = move.doubleStep ? sq(fileOf(move.from), (rankOf(move.from) + rankOf(move.to)) / 2) : null;
    if (undo.captured) state.captured[undo.captured.c].push(undo.captured.t);
    state.turn = color === 'w' ? 'b' : 'w';
    return undo;
  }
  function undoMove(state, undo) {
    const move = undo.move, board = state.board, piece = board[move.to];
    board[move.from] = move.promotion ? { c: piece.c, t: 'p' } : piece;
    board[move.to] = null;
    if (undo.captured) { board[undo.capturedAt] = undo.captured; state.captured[undo.captured.c].pop(); }
    if (move.castle) {
      const rank = rankOf(move.from);
      if (move.castle === 'K') { board[sq(7, rank)] = board[sq(5, rank)]; board[sq(5, rank)] = null; }
      else { board[sq(0, rank)] = board[sq(3, rank)]; board[sq(3, rank)] = null; }
    }
    state.castle = undo.prevCastle; state.ep = undo.prevEp;
    state.turn = piece.c;
  }
  function legalMoves(state, from) {
    const piece = state.board[from]; if (!piece || piece.c !== state.turn) return [];
    return pseudoMoves(state, from).filter((m) => {
      const undo = applyMove(state, m);
      const bad = inCheck(state, piece.c);
      undoMove(state, undo);
      return !bad;
    });
  }
  function allLegalMoves(state, color) {
    const out = [];
    state.board.forEach((p, i) => { if (p && p.c === color) legalMoves(state, i).forEach((m) => out.push(m)); });
    return out;
  }
  function gameStatus(state) {
    const moves = allLegalMoves(state, state.turn), check = inCheck(state, state.turn);
    if (!moves.length) return check ? 'checkmate' : 'stalemate';
    const pieces = state.board.filter(Boolean);
    if (pieces.length <= 3 && pieces.every((p) => p.t === 'k' || p.t === 'b' || p.t === 'n')) return 'draw-material';
    return check ? 'check' : 'playing';
  }

  registerView({
    id: 'ajedrez',
    mount(root) {
      let state = newState(), selected = null, legalTo = [], lastMove = null, over = false, cpu = store.get('ajedrez-cpu') === '1', promoMove = null, cpuTimer = null;
      const boardEl = h('div', { class: 'chess-board', role: 'grid', 'aria-label': 'Tablero de ajedrez' });
      const cells = Array.from({ length: 64 }, (_, i) => {
        const visualIndex = i, row = 7 - Math.floor(i / 8), col = i % 8, realSq = sq(col, row);
        const btn = h('button', { type: 'button', class: 'chess-sq ' + ((row + col) % 2 === 0 ? 'dark' : 'light'), 'data-sq': realSq, onclick: () => onCellClick(realSq) });
        return btn;
      });
      cells.forEach((c) => boardEl.append(c));
      const status = h('p', { class: 'chess-status', role: 'status', 'aria-live': 'polite' });
      const capW = h('div', { class: 'chess-tray' }), capB = h('div', { class: 'chess-tray' });
      const moveList = h('ol', { class: 'chess-moves', 'aria-label': 'Jugadas' });
      const modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Modo de juego' },
        h('button', { type: 'button', 'aria-pressed': String(!cpu), text: '2 jugadores', onclick: () => setMode(false) }),
        h('button', { type: 'button', 'aria-pressed': String(cpu), text: 'Contra la máquina', onclick: () => setMode(true) }));
      const promoDlg = h('dialog', { class: 'dlg chess-promo-dlg', 'aria-label': 'Elegir pieza de coronación' },
        h('div', { class: 'dlg-body chess-promo' }, ['q', 'r', 'b', 'n'].map((t) => h('button', { type: 'button', 'data-t': t, 'aria-label': NM[t], html: pieceHtml({ c: 'w', t }), onclick: () => choosePromotion(t) }))));
      root.append(
        h('div', { class: 'chess' },
          h('div', { class: 'chess-main' },
            modeSeg, status,
            h('div', { class: 'chess-board-wrap' }, capB, boardEl, capW),
            h('div', { class: 'chess-actions' },
              h('button', { class: 'btn', type: 'button', html: icon('undo') + '<span>Deshacer</span>', onclick: undoLast }),
              h('button', { class: 'btn', type: 'button', text: 'Nueva partida', onclick: reset }))),
          h('aside', { class: 'card chess-side' }, h('h2', { text: 'Jugadas' }), moveList)),
        promoDlg);

      function setMode(v) { cpu = v; store.set('ajedrez-cpu', v ? '1' : '0'); $$('button', modeSeg).forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === v))); reset(); }
      function pieceTray(list, color) {
        const el = color === 'w' ? capW : capB; el.textContent = '';
        list.slice().sort((a, b) => VALUE[b] - VALUE[a]).forEach((t) => el.append(h('span', { class: 'chess-cap', html: pieceHtml({ c: color, t }) })));
      }
      function render() {
        cells.forEach((btn) => {
          const s = Number(btn.dataset.sq), piece = state.board[s];
          btn.innerHTML = pieceHtml(piece);
          btn.classList.toggle('sel', selected === s);
          btn.classList.toggle('legal', legalTo.some((m) => m.to === s));
          btn.classList.toggle('capturable', legalTo.some((m) => m.to === s && (m.capture)));
          btn.classList.toggle('last', !!lastMove && (s === lastMove.from || s === lastMove.to));
          btn.classList.toggle('in-check', piece && piece.t === 'k' && inCheck(state, piece.c));
          btn.disabled = over;
          btn.setAttribute('aria-label', algebra(s) + (piece ? ', ' + (piece.c === 'w' ? 'blanca' : 'negra') + ' ' + NM[piece.t] : ', vacía'));
        });
        pieceTray(state.captured.w, 'b'); pieceTray(state.captured.b, 'w');
        const st = over ? null : gameStatus(state);
        if (over) { /* mensaje ya fijado por finish() */ }
        else if (st === 'checkmate') { finish((state.turn === 'w' ? 'Negras' : 'Blancas') + ' ganan por jaque mate.'); }
        else if (st === 'stalemate') { finish('Tablas por ahogado.'); }
        else if (st === 'draw-material') { finish('Tablas: no hay material suficiente para dar jaque mate.'); }
        else status.textContent = (state.turn === 'w' ? 'Turno de las blancas' : 'Turno de las negras') + (st === 'check' ? '. ¡Jaque!' : '') + (cpu && state.turn === 'b' ? ' (piensa la máquina…)' : '');
      }
      function finish(msg) { over = true; status.textContent = msg; render0(); }
      function render0() { cells.forEach((btn) => { btn.disabled = true; }); }
      function pushMoveToList(move, san) {
        if (state.turn === 'b') moveList.append(h('li', { class: 'chess-move-pair' }, h('b', { text: Math.ceil(moveList.children.length + 1) + '.' }), h('span', { text: san })));
        else { const last = moveList.lastElementChild; if (last) last.append(h('span', { text: san })); else moveList.append(h('li', { class: 'chess-move-pair' }, h('b', { text: '1.' }), h('span', { text: san }))); }
      }
      function sanFor(move) {
        const piece = state.board[move.from];
        if (move.castle === 'K') return 'O-O'; if (move.castle === 'Q') return 'O-O-O';
        const letter = piece.t === 'p' ? '' : piece.t.toUpperCase();
        const capture = move.capture ? (piece.t === 'p' ? FILES[fileOf(move.from)] + 'x' : 'x') : '';
        const promo = move.promotion ? '=' + move.promotion.toUpperCase() : '';
        return letter + capture + algebra(move.to) + promo;
      }
      function onCellClick(s) {
        if (over || (cpu && state.turn === 'b')) return;
        const piece = state.board[s];
        if (selected !== null) {
          const mv = legalTo.find((m) => m.to === s);
          if (mv) { doMove(mv); return; }
        }
        if (piece && piece.c === state.turn) { selected = s; legalTo = legalMoves(state, s); }
        else { selected = null; legalTo = []; }
        render();
      }
      function doMove(mv) {
        const promos = legalTo.filter((m) => m.to === mv.to && m.promotion);
        if (promos.length > 1 && !mv._chosen) { promoMove = promos; selected = null; legalTo = []; promoDlg.showModal(); return; }
        const san = sanFor(mv);
        const undo = applyMove(state, mv); undo.san = san;
        state.history.push(undo);
        lastMove = mv; selected = null; legalTo = [];
        pushMoveToList(mv, san);
        render();
        if (!over && cpu && state.turn === 'b') { clearTimeout(cpuTimer); cpuTimer = setTimeout(cpuMove, 400); }
      }
      function choosePromotion(t) {
        const mv = { ...promoMove.find((m) => m.promotion === t), _chosen: true };
        promoDlg.close(); promoMove = null;
        doMove(mv);
      }
      function undoLast() {
        if (!state.history.length || over) return;
        clearTimeout(cpuTimer); cpuTimer = null;
        undoMove(state, state.history.pop());
        if (cpu && state.history.length) undoMove(state, state.history.pop());
        rebuildMoveList();
        lastMove = state.history.length ? state.history[state.history.length - 1].move : null;
        selected = null; legalTo = []; over = false;
        render();
      }
      function rebuildMoveList() {
        moveList.textContent = '';
        state.history.forEach((u, i) => {
          if (i % 2 === 0) moveList.append(h('li', { class: 'chess-move-pair' }, h('b', { text: (i / 2 + 1) + '.' }), h('span', { text: u.san })));
          else moveList.lastElementChild.append(h('span', { text: u.san }));
        });
      }
      function cpuMove() {
        cpuTimer = null;
        if (over || !cpu || state.turn !== 'b') return;
        const moves = allLegalMoves(state, 'b');
        if (!moves.length) { render(); return; }
        const scored = moves.map((m) => {
          let score = m.capture ? VALUE[(state.board[m.enPassant ? sq(fileOf(m.to), rankOf(m.from)) : m.to] || { t: 'p' }).t] * 10 : 0;
          if (m.promotion === 'q') score += 8;
          return { m, score: score + Math.random() };
        }).sort((a, b) => b.score - a.score);
        const mv = scored[0].m;
        const promos = moves.filter((x) => x.to === mv.to && x.promotion);
        const chosen = promos.length ? { ...promos.find((x) => x.promotion === 'q') || promos[0], _chosen: true } : mv;
        const san = sanFor(chosen);
        const undo = applyMove(state, chosen); undo.san = san;
        state.history.push(undo);
        lastMove = chosen; pushMoveToList(chosen, san);
        render();
      }
      function reset() { clearTimeout(cpuTimer); cpuTimer = null; state = newState(); selected = null; legalTo = []; lastMove = null; over = false; moveList.textContent = ''; render(); }
      reset();
    }
  });
})();
