'use strict';

/* =========================================================
   SNAKE
   ========================================================= */
registerView({
  id: 'snake',
  mount(root) {
    const COLS = 20, ROWS = 20;
    let cell = 20, snake, dir, nextDir, food, score, best = Number(store.get('snake-mejor', '0')) || 0, running = false, over = false, speedMs = 140, acc = 0, lastTs = 0, raf = null;

    const canvas = h('canvas', { class: 'sn-canvas', 'aria-label': 'Tablero de Snake' });
    const ctx = canvas.getContext('2d');
    const scoreEl = h('b', { class: 'num', text: '0' }), bestEl = h('b', { class: 'num', text: String(best) });
    const overlay = h('div', { class: 'sn-overlay' },
      h('p', { class: 'sn-overlay-title' }), h('p', { class: 'sn-overlay-sub' }),
      h('button', { class: 'btn primary lg', type: 'button', text: 'Jugar', onclick: startGame }));
    const pauseBtn = h('button', { class: 'btn sm', type: 'button', text: 'Pausar', disabled: true, onclick: togglePause });
    const pad = (label, dx, dy) => h('button', { type: 'button', class: 'sn-pad-btn', 'aria-label': label, onclick: () => setDir(dx, dy) }, icon('chevR'));
    const dpad = h('div', { class: 'sn-dpad', 'aria-label': 'Controles direccionales' },
      h('span'), h('button', { type: 'button', class: 'sn-pad-btn up', 'aria-label': 'Arriba', onclick: () => setDir(0, -1) }), h('span'),
      h('button', { type: 'button', class: 'sn-pad-btn left', 'aria-label': 'Izquierda', onclick: () => setDir(-1, 0) }), h('span', { class: 'sn-pad-mid' }), h('button', { type: 'button', class: 'sn-pad-btn right', 'aria-label': 'Derecha', onclick: () => setDir(1, 0) }),
      h('span'), h('button', { type: 'button', class: 'sn-pad-btn down', 'aria-label': 'Abajo', onclick: () => setDir(0, 1) }), h('span'));

    root.append(h('div', { class: 'sn' },
      h('ul', { class: 'stats' }, h('li', null, scoreEl, h('span', { text: 'puntos' })), h('li', null, bestEl, h('span', { text: 'récord' }))),
      h('div', { class: 'sn-stage' }, canvas, overlay),
      h('div', { class: 'sn-controls' }, pauseBtn, dpad),
      h('p', { class: 'muted sn-help' }, 'Flechas o ', h('span', { class: 'kbd', text: 'WASD' }), ' para moverte. En táctil, desliza sobre el tablero.')));

    function fit() {
      const w = canvas.parentElement.clientWidth;
      cell = Math.max(12, Math.floor(Math.min(w, 480) / COLS));
      canvas.width = cell * COLS; canvas.height = cell * ROWS;
      draw();
    }
    function reset() {
      snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
      dir = { x: 1, y: 0 }; nextDir = dir; score = 0; speedMs = 140; acc = 0; over = false;
      scoreEl.textContent = '0'; placeFood();
    }
    function placeFood() {
      let p;
      do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
      while (snake.some((s) => s.x === p.x && s.y === p.y));
      food = p;
    }
    function setDir(x, y) {
      if (!running) return;
      if (x === -dir.x && y === -dir.y) return;
      nextDir = { x, y };
    }
    function draw() {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--hi') || '#ffd426';
      ctx.beginPath(); ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.38, 0, Math.PI * 2); ctx.fill();
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#1f8f5f' : '#2fae76';
        ctx.beginPath(); ctx.roundRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2, 5); ctx.fill();
      });
    }
    function step() {
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || snake.some((s) => s.x === head.x && s.y === head.y)) { gameOver(); return; }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++; scoreEl.textContent = score; speedMs = Math.max(70, 140 - Math.floor(score / 5) * 8); placeFood();
      } else snake.pop();
      draw();
    }
    function loop(ts) {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      acc += ts - lastTs; lastTs = ts;
      if (acc >= speedMs) { acc = 0; step(); }
      raf = requestAnimationFrame(loop);
    }
    function startGame() {
      reset(); running = true; over = false; lastTs = 0; acc = 0;
      overlay.classList.remove('show'); pauseBtn.disabled = false; pauseBtn.textContent = 'Pausar';
      draw(); raf = requestAnimationFrame(loop);
    }
    function togglePause() {
      if (over) return;
      running = !running; pauseBtn.textContent = running ? 'Pausar' : 'Reanudar';
      if (running) { lastTs = 0; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
      overlay.classList.toggle('show', !running);
      $('.sn-overlay-title', overlay).textContent = 'Pausa'; $('.sn-overlay-sub', overlay).textContent = '';
      $('button', overlay).textContent = 'Reanudar';
    }
    function gameOver() {
      running = false; over = true; cancelAnimationFrame(raf); pauseBtn.disabled = true;
      if (score > best) { best = score; store.set('snake-mejor', String(best)); bestEl.textContent = best; }
      overlay.classList.add('show');
      $('.sn-overlay-title', overlay).textContent = 'Has chocado';
      $('.sn-overlay-sub', overlay).textContent = score + ' puntos' + (score === best && score > 0 ? ' — ¡nuevo récord!' : '');
      $('button', overlay).textContent = 'Jugar de nuevo';
    }
    document.addEventListener('keydown', (e) => {
      if (!app.isActive('snake')) return;
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
      if (map[e.key]) { e.preventDefault(); setDir(...map[e.key]); }
      else if (e.key === ' ') { e.preventDefault(); if (over) startGame(); else togglePause(); }
    });
    let touchStart = null;
    canvas.addEventListener('pointerdown', (e) => { touchStart = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', (e) => {
      if (!touchStart) return;
      const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y; touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      Math.abs(dx) > Math.abs(dy) ? setDir(dx > 0 ? 1 : -1, 0) : setDir(0, dy > 0 ? 1 : -1);
    });
    window.addEventListener('resize', fit);
    reset(); fit();
    overlay.classList.add('show');
    $('.sn-overlay-title', overlay).textContent = 'Snake';
    $('.sn-overlay-sub', overlay).textContent = 'Come los puntos y evita chocar.';
    return { show() { fit(); }, hide() { running = false; cancelAnimationFrame(raf); } };
  }
});
