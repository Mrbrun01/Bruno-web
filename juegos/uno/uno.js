'use strict';

/* =========================================================
   UNO
   Pásalo y juega: cada jugador oculta su mano hasta su turno.
   Portado del módulo de Ajedrez.html.
   ========================================================= */
(function () {
  const UC = ['r', 'y', 'g', 'b'];
  const UV = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 's', 'x', '+2'];
  const CN = { r: 'rojo', y: 'amarillo', g: 'verde', b: 'azul', w: 'comodín' };
  const PI = { y: 0, b: 1, r: 2, g: 3 };
  const UL = { s: 'Salta', x: 'Cambio', w: 'Color' };
  const lab = (c) => `<span class="${UL[c.v] ? 'ucard-tx' : ''}">${UL[c.v] || c.v}</span>`;
  const kc = (c) => (c.c === 'w' ? 'ucard-x ucard-w' : 'ucard-' + c.c);
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const k = (Math.random() * (i + 1)) | 0;[a[i], a[k]] = [a[k], a[i]]; } return a; }

  registerView({
    id: 'uno',
    mount(root) {
      let UN = null;
      const uok = (c) => c.c === 'w' || c.c === UN.color || c.v === UN.disc[UN.disc.length - 1].v;
      const nxt = (s) => ((UN.t + UN.dir * s) % UN.np + UN.np) % UN.np;
      function drawCards(hand, n) {
        while (n-- > 0) {
          if (!UN.d.length) { const top = UN.disc.pop(); UN.d = shuffle(UN.disc); UN.disc = [top]; if (!UN.d.length) return; }
          hand.push(UN.d.shift());
        }
      }
      function unoReset() {
        const np = Number(npSel.value), d = [];
        for (const c of UC) for (const v of UV) for (let n = 0; n < (v === '0' ? 1 : 2); n++) d.push({ c, v });
        for (let n = 0; n < 4; n++) d.push({ c: 'w', v: 'w' }, { c: 'w', v: '+4' });
        shuffle(d);
        const hands = Array.from({ length: np }, () => d.splice(0, 7));
        let top; while ((top = d.shift()).c === 'w') d.push(top);
        UN = { np, hands, d, disc: [top], t: 0, next: 0, dir: 1, color: top.c, phase: 'hidden', drew: false, win: -1, card: null };
        render();
      }
      function unoAfter(c) {
        if (!UN.hands[UN.t].length) { UN.phase = 'over'; UN.win = UN.t; return render(); }
        let step = 1;
        if (c.v === 'x') { UN.dir = -UN.dir; if (UN.np === 2) step = 2; }
        else if (c.v === 's') step = 2;
        else if (c.v === '+2' || c.v === '+4') { drawCards(UN.hands[nxt(1)], c.v === '+2' ? 2 : 4); step = 2; }
        UN.next = nxt(step); UN.phase = 'done';
        render();
      }
      function unoPlay(i) {
        const hand = UN.hands[UN.t], c = hand[i];
        if (UN.phase !== 'play' || !c || !uok(c) || (UN.drew && i !== hand.length - 1)) return;
        hand.splice(i, 1); UN.disc.push(c); UN.color = c.c;
        if (c.c === 'w') { UN.phase = 'pick'; UN.card = c; return render(); }
        unoAfter(c);
      }
      function unoDraw() {
        const hand = UN.hands[UN.t];
        if (UN.phase !== 'play' || UN.drew) return;
        drawCards(hand, 1); UN.drew = true;
        if (!hand.length || !uok(hand[hand.length - 1])) { UN.next = nxt(1); UN.phase = 'done'; }
        render();
      }
      function unoNext() {
        if (UN.phase === 'play' && UN.drew) UN.next = nxt(1); else if (UN.phase !== 'done') return;
        UN.t = UN.next; UN.phase = 'hidden'; UN.drew = false;
        render();
      }

      const npSel = h('select', { class: 'select', 'aria-label': 'Número de jugadores' }, [2, 3, 4].map((n) => h('option', { value: n, text: n, selected: n === 4 })));
      const status = h('p', { class: 'uno-status', role: 'status', 'aria-live': 'polite' });
      const body = h('div', { class: 'card uno-card' });
      npSel.addEventListener('change', unoReset);
      root.append(h('div', { class: 'uno' },
        h('p', { class: 'muted uno-rules' }, 'Cada jugador ve sus cartas solo en su turno. Juega una carta del mismo color, número o símbolo que la de la mesa; si no puedes (o no quieres), roba una. Gana quien se quede sin cartas.'),
        h('label', { class: 'par-np' }, 'Jugadores ', npSel),
        status, body,
        h('button', { class: 'btn', type: 'button', text: 'Nueva partida', onclick: unoReset })));

      function render() {
        const U = UN, top = U.disc[U.disc.length - 1], hand = U.hands[U.t], me = U.t + 1, ph = U.phase;
        let extra;
        if (ph === 'hidden') extra = `<p>Turno del jugador ${me}. Pasa el dispositivo y pulsa el botón cuando estés listo.</p><div class="uno-row"><button class="btn primary" id="ushow">Mostrar mis cartas</button></div>`;
        else if (ph === 'pick') extra = `<p>Elige el color para seguir.</p><div class="uno-row">${UC.map((c) => `<button class="btn" data-col="${c}"><span class="uno-dot" style="background:var(--p${PI[c]})"></span>${CN[c][0].toUpperCase() + CN[c].slice(1)}</button>`).join('')}</div>`;
        else if (ph === 'over') extra = `<p>Gana el jugador ${U.win + 1}. Pulsa «Nueva partida» para jugar otra.</p>`;
        else {
          extra = `<div class="hand">${hand.map((c, i) => `<button class="ucard ${kc(c)}" data-i="${i}" ${ph === 'play' && uok(c) && (!U.drew || i === hand.length - 1) ? '' : 'disabled'} aria-label="${CN[c.c]} ${UL[c.v] || c.v}">${lab(c)}</button>`).join('')}</div>` +
            `<div class="uno-row"><button class="btn" id="udraw" ${ph === 'play' && !U.drew ? '' : 'disabled'}>Robar carta</button><button class="btn primary" id="unext" ${ph === 'done' || (ph === 'play' && U.drew) ? '' : 'disabled'}>Siguiente</button></div>`;
        }
        body.innerHTML = `<div class="uno-row uno-top"><div class="ucard ucard-big ${kc(top)}" aria-label="Carta en la mesa: ${CN[U.color]} ${UL[top.v] || top.v}">${lab(top)}</div>` +
          `<p class="uno-info">Color: ${CN[U.color]}.<br>Mazo: ${U.d.length} cartas.<br>${U.hands.map((x, k) => `Jugador ${k + 1}: ${x.length}`).join(', ')}.</p></div>` + extra;
        status.textContent = ph === 'over' ? `Gana el jugador ${U.win + 1}.`
          : ph === 'hidden' ? `Turno del jugador ${me}. Cartas ocultas.`
          : ph === 'pick' ? 'Elige el color.'
          : ph === 'done' ? 'Jugada hecha. Pulsa «Siguiente» para ocultar las cartas.'
          : `Jugador ${me}: juega una carta o roba.` + (hand.length === 1 ? ' Te queda una carta.' : '');
      }
      body.addEventListener('click', (e) => {
        const t = e.target.closest('button'); if (!t) return;
        if (t.dataset.i !== undefined) unoPlay(Number(t.dataset.i));
        else if (t.dataset.col && UN.phase === 'pick') { UN.color = t.dataset.col; unoAfter(UN.card); }
        else if (t.id === 'udraw') unoDraw();
        else if (t.id === 'unext') unoNext();
        else if (t.id === 'ushow' && UN.phase === 'hidden') { UN.phase = 'play'; render(); }
      });
      unoReset();
    }
  });
})();
