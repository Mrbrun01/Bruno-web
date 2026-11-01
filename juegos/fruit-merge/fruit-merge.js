'use strict';

/* =========================================================
   FRUIT MERGE
   Motor de física portado de Fruit_merge.html: solver de
   impulsos secuenciales con sub-pasos, fricción y rotación.
   ========================================================= */
registerView({
  id: 'fruit-merge',
  mount(root) {
    /* ---------- Motor de física (adaptado de Fruit_merge.html) ---------- */
    const W = 360, H = 480, DROP_Y = 44, LINE_Y = 92;
    /* ---------- Frutas en SVG (arte portado de Fruit_merge.html) ---------- */
    const HI = '<ellipse cx="34" cy="36" rx="11" ry="7" fill="#fff" opacity=".32" transform="rotate(-30 34 36)"/>';
    const LEAF = (x, y, rot, c = '#4f9d3a') => `<ellipse cx="${x}" cy="${y}" rx="13" ry="6" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>`;
    const svgUri = (body) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`);
    const FRUIT_BODY = [
      `<path d="M50 16 Q56 6 74 5" stroke="#4c7a1f" stroke-width="4" fill="none" stroke-linecap="round"/>${LEAF(72, 8, -20)}
       <circle cx="50" cy="56" r="42" fill="#a3122f"/>@HI@`,
      `<path d="M50 97 C20 82 6 56 9 38 C12 20 30 15 50 23 C70 15 88 20 91 38 C94 56 80 82 50 97Z" fill="#e63946"/>
       <g fill="#f8d66d"><ellipse cx="34" cy="42" rx="2.5" ry="4"/><ellipse cx="50" cy="40" rx="2.5" ry="4"/><ellipse cx="66" cy="42" rx="2.5" ry="4"/>
       <ellipse cx="28" cy="58" rx="2.5" ry="4"/><ellipse cx="42" cy="56" rx="2.5" ry="4"/><ellipse cx="58" cy="56" rx="2.5" ry="4"/><ellipse cx="72" cy="58" rx="2.5" ry="4"/>
       <ellipse cx="36" cy="72" rx="2.5" ry="4"/><ellipse cx="50" cy="70" rx="2.5" ry="4"/><ellipse cx="64" cy="72" rx="2.5" ry="4"/><ellipse cx="50" cy="85" rx="2.5" ry="4"/></g>
       <path d="M28 22 L50 3 L72 22 L60 26 L50 17 L40 26Z" fill="#3d9a3d"/>`,
      `<path d="M50 14 Q52 6 60 3" stroke="#6b4a2b" stroke-width="4" fill="none" stroke-linecap="round"/>${LEAF(68, 10, -15)}
       <circle cx="50" cy="56" r="42" fill="#7a3ea1"/>@HI@`,
      `<circle cx="50" cy="54" r="44" fill="#fbb034"/>@HI@<circle cx="50" cy="12" r="3" fill="#c96a10"/>${LEAF(62, 8, -20)}`,
      `<circle cx="50" cy="54" r="45" fill="#f26b1d"/>
       <g fill="#c9500f" opacity=".45"><circle cx="30" cy="50" r="1.6"/><circle cx="46" cy="62" r="1.6"/><circle cx="68" cy="48" r="1.6"/><circle cx="60" cy="72" r="1.6"/><circle cx="38" cy="76" r="1.6"/><circle cx="72" cy="66" r="1.6"/><circle cx="52" cy="40" r="1.6"/></g>
       @HI@${LEAF(60, 10, -20)}`,
      `<path d="M50 20 C40 6 12 14 8 52 C6 80 30 98 50 92 C70 98 94 80 92 52 C88 14 60 6 50 20Z" fill="#7bbf3a"/>
       <path d="M50 20 Q48 10 54 2" stroke="#6b4a2b" stroke-width="4" fill="none" stroke-linecap="round"/>${LEAF(66, 10, -25)}@HI@`,
      `<path d="M50 10 C60 10 62 26 66 36 C84 48 92 64 84 80 C76 96 24 96 16 80 C8 64 16 48 34 36 C38 26 40 10 50 10Z" fill="#e8d84c"/>
       <path d="M50 12 Q52 4 58 2" stroke="#6b4a2b" stroke-width="4" fill="none" stroke-linecap="round"/>${LEAF(66, 12, -20)}@HI@`,
      `<circle cx="50" cy="55" r="44" fill="#f9b08a"/><ellipse cx="66" cy="60" rx="24" ry="30" fill="#f26d6d" opacity=".45"/>
       <path d="M50 14 C40 34 40 70 52 96" stroke="#d98862" stroke-width="2.5" fill="none"/>@HI@${LEAF(62, 10, -20)}`,
      `<ellipse cx="50" cy="61" rx="38" ry="37" fill="#f4c430"/>
       <g stroke="#c98f10" stroke-width="2" opacity=".7" clip-path="url(#c)"><path d="M0 30 L100 130 M0 60 L70 130 M20 20 L100 100 M0 0 L100 100 M100 30 L0 130 M100 60 L30 130 M80 20 L0 100 M100 0 L0 100"/></g>
       <defs><clipPath id="c"><ellipse cx="50" cy="61" rx="38" ry="37"/></clipPath></defs>
       <path d="M50 28 L36 4 L46 20 L50 0 L54 20 L64 4Z" fill="#3d9a3d"/><path d="M42 28 L24 12 L40 22Z M58 28 L76 12 L60 22Z" fill="#4f9d3a"/>`,
      `<defs><clipPath id="c"><circle cx="50" cy="52" r="45"/></clipPath></defs>
       <circle cx="50" cy="52" r="45" fill="#cfe58c"/>
       <g stroke="#f4fadc" stroke-width="2" fill="none" clip-path="url(#c)"><path d="M0 30 L100 80 M0 55 L100 105 M0 5 L100 55 M0 80 L60 110 M100 30 L0 80 M100 55 L0 105 M100 5 L0 55 M100 80 L40 110"/></g>@HI@`,
      `<defs><clipPath id="c"><circle cx="50" cy="52" r="46"/></clipPath></defs>
       <circle cx="50" cy="52" r="46" fill="#3f9b45"/>
       <g stroke="#1e6a2c" stroke-width="7" fill="none" clip-path="url(#c)" stroke-linecap="round"><path d="M50 0 C28 30 28 74 50 104"/><path d="M50 0 C72 30 72 74 50 104"/><path d="M22 4 C0 30 0 74 22 100"/><path d="M78 4 C100 30 100 74 78 100"/></g>@HI@`
    ];
    const FRUIT_SVG = FRUIT_BODY.map((b) => svgUri(b.replace('@HI@', HI)));
    const FRUIT_IMG = FRUIT_BODY.map((b) => { const im = new Image(); im.src = svgUri(b.replace('@HI@', '')); return im; });

    const FRUITS = [
      { n: 'cereza', r: 12 }, { n: 'fresa', r: 17 }, { n: 'uva', r: 23 },
      { n: 'mandarina', r: 29 }, { n: 'naranja', r: 36 }, { n: 'manzana', r: 44 },
      { n: 'pera', r: 52 }, { n: 'melocotón', r: 61 }, { n: 'piña', r: 71 },
      { n: 'melón', r: 82 }, { n: 'sandía', r: 94 }
    ];
    const LAST = FRUITS.length - 1;
    const MERGE_POINTS = [0, 2, 4, 8, 12, 18, 26, 36, 48, 62, 80];
    const VANISH_POINTS = 150;
    const G = 1600, SUB = 4, VITER = 10, PITER = 2, MU = 0.5, REST = 0.12, REST_V = 80;
    const LIN_DAMP = 0.15, ANG_DAMP = 1.2, VMAX = 2000, SLOP = 0.02, PUSH_MAX = 1.5;

    function mk(id, level, x, y, vx = 0, vy = 0, w = 0) {
      const r = FRUITS[level].r, m = r * r;
      return { id, level, r, x, y, vx, vy, ang: Math.random() * 6.283, w, im: 1 / m, ii: 2 / (m * r * r), age: 0, touch: false };
    }
    function applyImpulse(c, dn, dt) {
      const a = c.a, b = c.b, nx = c.nx, ny = c.ny, tx = -ny, ty = nx;
      a.vx -= (nx * dn + tx * dt) * a.im; a.vy -= (ny * dn + ty * dt) * a.im; a.w -= a.ii * a.r * dt;
      if (b) { b.vx += (nx * dn + tx * dt) * b.im; b.vy += (ny * dn + ty * dt) * b.im; b.w -= b.ii * b.r * dt; }
    }
    function solveContact(c) {
      const a = c.a, b = c.b, nx = c.nx, ny = c.ny, tx = -ny, ty = nx;
      const imA = a.im, imB = b ? b.im : 0;
      const vax = a.vx - a.w * ny * a.r, vay = a.vy + a.w * nx * a.r;
      let vbx = 0, vby = 0;
      if (b) { vbx = b.vx + b.w * ny * b.r; vby = b.vy - b.w * nx * b.r; }
      const rx = vbx - vax, ry = vby - vay;
      const vn = rx * nx + ry * ny;
      if (c.first) { c.bounce = vn < -REST_V ? -REST * vn : 0; c.first = false; }
      let dj = (c.bounce - vn) / (imA + imB);
      let old = c.jn; c.jn = Math.max(0, old + dj); dj = c.jn - old;
      const vt = rx * tx + ry * ty;
      const kt = imA + imB + a.ii * a.r * a.r + (b ? b.ii * b.r * b.r : 0);
      let dtang = -vt / kt;
      const max = MU * c.jn;
      old = c.jt; c.jt = Math.max(-max, Math.min(max, old + dtang)); dtang = c.jt - old;
      applyImpulse(c, dj, dtang);
    }
    class World {
      constructor() { this.bodies = []; this.seq = 1; this.cache = new Map(); }
      add(level, x, y, vx = 0, vy = 0) { const b = mk(this.seq++, level, x, y, vx, vy); this.bodies.push(b); return b; }
      step(dt) {
        const bs = this.bodies, h = dt / SUB;
        const ld = Math.exp(-LIN_DAMP * h), ad = Math.exp(-ANG_DAMP * h);
        for (let s = 0; s < SUB; s++) {
          for (const b of bs) {
            b.vy += G * h; b.vx *= ld; b.vy *= ld; b.w *= ad; b.touch = false;
            const v = Math.hypot(b.vx, b.vy);
            if (v > VMAX) { b.vx *= VMAX / v; b.vy *= VMAX / v; }
          }
          const cs = [], cache = this.cache;
          for (let i = 0; i < bs.length; i++) {
            const a = bs[i];
            for (let j = i + 1; j < bs.length; j++) {
              const b = bs[j], rs = a.r + b.r + 0.5;
              const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
              if (d2 >= rs * rs || d2 === 0) continue;
              const d = Math.sqrt(d2);
              cs.push({ key: a.id + '-' + b.id, a, b, nx: dx / d, ny: dy / d, jn: 0, jt: 0, first: true, bounce: 0 });
            }
            if (a.x - a.r < 0.5) cs.push({ key: a.id + 'L', a, b: null, nx: -1, ny: 0, jn: 0, jt: 0, first: true, bounce: 0 });
            if (a.x + a.r > W - 0.5) cs.push({ key: a.id + 'R', a, b: null, nx: 1, ny: 0, jn: 0, jt: 0, first: true, bounce: 0 });
            if (a.y + a.r > H - 0.5) cs.push({ key: a.id + 'F', a, b: null, nx: 0, ny: 1, jn: 0, jt: 0, first: true, bounce: 0 });
          }
          for (const c of cs) { const prev = cache.get(c.key); if (prev) { c.jn = prev.jn; c.jt = prev.jt; c.first = false; applyImpulse(c, c.jn, c.jt); } }
          for (let it = 0; it < VITER; it++) for (const c of cs) solveContact(c);
          cache.clear();
          for (const c of cs) cache.set(c.key, { jn: c.jn, jt: c.jt });
          for (const c of cs) if (c.jn > 0) { c.a.touch = true; if (c.b) c.b.touch = true; }
          for (const b of bs) {
            b.x += b.vx * h; b.y += b.vy * h; b.ang += b.w * h;
            if (b.touch && b.vx * b.vx + b.vy * b.vy < 9 && Math.abs(b.w * b.r) < 3) { b.vx = b.vy = b.w = 0; }
          }
          for (let it = 0; it < PITER; it++) {
            for (const c of cs) {
              const a = c.a, b = c.b;
              if (b) {
                const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
                const ov = a.r + b.r - d - SLOP;
                if (ov <= 0) continue;
                const push = Math.min(ov, PUSH_MAX), wa = a.im, wb = b.im, ws = wa + wb;
                const nx = dx / d, ny = dy / d;
                a.x -= nx * push * wa / ws; a.y -= ny * push * wa / ws;
                b.x += nx * push * wb / ws; b.y += ny * push * wb / ws;
              }
            }
            for (const a of bs) { if (a.x - a.r < 0) a.x = a.r; if (a.x + a.r > W) a.x = W - a.r; if (a.y + a.r > H) a.y = H - a.r; }
          }
        }
        for (const b of bs) b.age += dt;
        return this.merge();
      }
      merge() {
        const bs = this.bodies, events = [], dead = new Set(), born = [];
        for (let i = 0; i < bs.length; i++) {
          const a = bs[i]; if (dead.has(a)) continue;
          for (let j = i + 1; j < bs.length; j++) {
            const b = bs[j]; if (dead.has(b) || a.level !== b.level) continue;
            const rs = a.r + b.r + 0.6, dx = b.x - a.x, dy = b.y - a.y;
            if (dx * dx + dy * dy > rs * rs) continue;
            dead.add(a); dead.add(b);
            if (a.level === LAST) events.push({ type: 'vanish', points: VANISH_POINTS });
            else {
              const ma = a.r * a.r, mb = b.r * b.r, m = ma + mb, lv = a.level + 1;
              const nb = mk(this.seq++, lv, (a.x * ma + b.x * mb) / m, (a.y * ma + b.y * mb) / m, (a.vx * ma + b.vx * mb) / m, (a.vy * ma + b.vy * mb) / m, (a.w + b.w) / 2);
              nb.age = Math.max(a.age, b.age); born.push(nb);
              events.push({ type: 'merge', level: lv, points: MERGE_POINTS[lv] });
            }
            break;
          }
        }
        if (dead.size) this.bodies = bs.filter((b) => !dead.has(b)).concat(born);
        return events;
      }
    }

    /* ---------- Interfaz ---------- */
    const world = new World();
    const rand = () => Math.floor(Math.random() * 5);
    const best0 = Number(store.get('fruit-merge-mejor', '0')) || 0;
    const S = { mode: 'play', score: 0, best: best0, held: rand(), next: rand(), x: W / 2, cool: 0.3, over: 0, warn: false, lastSnap: null };

    const canvas = h('canvas', { class: 'fm-canvas', width: String(W), height: String(H), 'aria-label': 'Tablero de Fruit Merge' });
    const ctx = canvas.getContext('2d');
    const scoreEl = h('b', { class: 'num', text: '0' }), bestEl = h('b', { class: 'num', text: String(best0) });
    const nextPreview = h('span', { class: 'fm-next-fruit' });
    const pauseBtn = h('button', { class: 'btn sm', type: 'button', text: 'Pausar' });
    const undoBtn = h('button', { class: 'btn sm', type: 'button', text: 'Deshacer', disabled: true, onclick: undo });
    const overlay = h('div', { class: 'fm-overlay show' },
      h('p', { class: 'fm-overlay-title', text: 'Fruit Merge' }),
      h('p', { class: 'fm-overlay-sub', text: 'Deja caer frutas y junta dos iguales para fusionarlas.' }),
      h('button', { class: 'btn primary lg', type: 'button', text: 'Jugar', onclick: startGame }));
    root.append(h('div', { class: 'fm' },
      h('ul', { class: 'stats' }, h('li', null, scoreEl, h('span', { text: 'puntos' })), h('li', null, bestEl, h('span', { text: 'récord' }))),
      h('div', { class: 'fm-top' }, h('span', { class: 'muted' }, 'Siguiente:'), nextPreview, h('span', { class: 'fm-spacer' }), pauseBtn, undoBtn),
      h('div', { class: 'fm-stage' }, canvas, overlay),
      h('p', { class: 'muted sn-help' }, 'Mueve el ratón, desliza el dedo o usa ', h('span', { class: 'kbd', text: '← →' }), '; suelta con clic, toque o ', h('span', { class: 'kbd', text: 'Espacio' }), '.')));

    function paintNext() { nextPreview.style.backgroundImage = 'url(' + FRUIT_SVG[S.next] + ')'; const s = Math.min(34, 14 + FRUITS[S.next].r * 0.3); nextPreview.style.width = nextPreview.style.height = s + 'px'; }
    function snap() { return { bodies: world.bodies.map((b) => ({ ...b })), score: S.score, held: S.held, next: S.next }; }
    function restore(s) { world.bodies = s.bodies.map((b) => ({ ...b })); S.score = s.score; S.held = s.held; S.next = s.next; scoreEl.textContent = S.score; paintNext(); draw(); }
    function undo() { if (!S.lastSnap) return; const s = S.lastSnap; S.lastSnap = null; undoBtn.disabled = true; restore(s); }

    function reset() { world.bodies = []; world.seq = 1; world.cache.clear(); Object.assign(S, { mode: 'play', score: 0, held: rand(), next: rand(), x: W / 2, cool: 0.3, over: 0, warn: false, lastSnap: null }); scoreEl.textContent = '0'; undoBtn.disabled = true; paintNext(); }
    function drop() {
      if (S.mode !== 'play' || S.cool > 0) return;
      S.lastSnap = snap(); undoBtn.disabled = false;
      const r = FRUITS[S.held].r;
      world.add(S.held, clamp(S.x, r, W - r), DROP_Y, 0, 40);
      S.held = S.next; S.next = rand(); S.cool = 0.45;
      paintNext();
    }
    function movePointerX(clientX) { const rect = canvas.getBoundingClientRect(); S.x = (clientX - rect.left) * (W / rect.width); }
    canvas.addEventListener('pointermove', (e) => { if (S.mode === 'play') movePointerX(e.clientX); });
    canvas.addEventListener('pointerdown', (e) => { if (S.mode === 'play') movePointerX(e.clientX); });
    canvas.addEventListener('pointerup', (e) => { if (S.mode === 'play') { movePointerX(e.clientX); drop(); } });
    document.addEventListener('keydown', (e) => {
      if (!app.isActive('fruit-merge')) return;
      if (e.key === 'ArrowLeft') { S.x = Math.max(0, S.x - 14); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { S.x = Math.min(W, S.x + 14); e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); drop(); }
      else if (e.key.toLowerCase() === 'p') setPaused(S.mode !== 'paused');
    });
    function setPaused(p) {
      if (S.mode === 'over') return;
      S.mode = p ? 'paused' : 'play'; pauseBtn.textContent = p ? 'Reanudar' : 'Pausar';
      overlay.classList.toggle('show', p);
      if (p) { $('.fm-overlay-title', overlay).textContent = 'Pausa'; $('.fm-overlay-sub', overlay).textContent = ''; const b = $('button', overlay); b.textContent = 'Reanudar'; b.onclick = () => setPaused(false); }
    }
    pauseBtn.addEventListener('click', () => setPaused(S.mode !== 'paused'));

    function gameOver() {
      S.mode = 'over';
      if (S.score > S.best) { S.best = S.score; store.set('fruit-merge-mejor', String(S.best)); bestEl.textContent = S.best; }
      overlay.classList.add('show');
      $('.fm-overlay-title', overlay).textContent = 'Se ha llenado el tarro';
      $('.fm-overlay-sub', overlay).textContent = S.score + ' puntos' + (S.score === S.best && S.score > 0 ? ' — ¡nuevo récord!' : '');
      const b = $('button', overlay); b.textContent = 'Jugar de nuevo'; b.onclick = startGame;
    }
    function update(dt) {
      if (S.mode !== 'play') return;
      const hr = FRUITS[S.held].r; S.x = clamp(S.x, hr, W - hr);
      if (S.cool > 0) S.cool -= dt;
      const events = world.step(dt);
      events.forEach((e) => { S.score += e.points; });
      if (events.length) scoreEl.textContent = S.score;
      const over = world.bodies.some((b) => b.age > 1 && b.y - b.r < LINE_Y);
      S.over = over ? S.over + dt : 0;
      S.warn = S.over > 0;
      if (S.over >= 2) gameOver();
    }
    function drawFruit(level, x, y, r, ang) {
      const im = FRUIT_IMG[level], d = r * 2 * (100 / 90);
      if (im.complete && im.naturalWidth) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.drawImage(im, -d / 2, -d / 2, d, d); ctx.restore();
        ctx.save(); ctx.translate(x - r * 0.32, y - r * 0.34); ctx.rotate(-0.5);
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.24, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        return;
      }
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ccc'; ctx.fill();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const paper = getComputedStyle(document.documentElement).getPropertyValue('--surface-2') || '#eef0f8';
      ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = S.warn ? '#c42f26' : 'rgba(150,150,150,.5)';
      ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(0, LINE_Y); ctx.lineTo(W, LINE_Y); ctx.stroke(); ctx.setLineDash([]);
      world.bodies.forEach((b) => drawFruit(b.level, b.x, b.y, b.r, b.ang));
      if (S.mode === 'play') {
        const r = FRUITS[S.held].r;
        ctx.globalAlpha = 0.65;
        drawFruit(S.held, clamp(S.x, r, W - r), DROP_Y, r, 0);
        ctx.globalAlpha = 1;
      }
    }
    let raf = null, lastTs = 0;
    function frame(now) {
      const dt = Math.min(1 / 30, (now - lastTs) / 1000); lastTs = now;
      update(dt); draw();
      raf = requestAnimationFrame(frame);
    }
    function startGame() { reset(); overlay.classList.remove('show'); pauseBtn.textContent = 'Pausar'; lastTs = performance.now(); if (!raf) raf = requestAnimationFrame(frame); }

    draw(); paintNext();
    lastTs = performance.now(); raf = requestAnimationFrame(frame);
    return {
      show() { if (!raf) { lastTs = performance.now(); raf = requestAnimationFrame(frame); } },
      hide() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    };
  }
});
