'use strict';

/* =========================================================
   ADIVINA EL NÚMERO
   ========================================================= */
registerView({
  id: 'adivina',
  mount(root) {
    let secret, tries, lo, hi, over, history;
    let best = Number(store.get('adivina-mejor', '0')) || 0;

    const rangeEl = h('p', { class: 'ad-range num', 'aria-live': 'polite' });
    const input = h('input', { class: 'input ad-input', type: 'number', min: '1', max: '100', inputmode: 'numeric', placeholder: '?', 'aria-label': 'Tu número' });
    const guessBtn = h('button', { class: 'btn primary lg', type: 'submit', text: 'Adivinar' });
    const msg = h('p', { class: 'ad-msg', role: 'status', 'aria-live': 'polite' });
    const hist = h('ul', { class: 'ad-history', 'aria-label': 'Tus intentos' });
    const bestEl = h('p', { class: 'muted ad-best' });
    const again = h('button', { class: 'btn', type: 'button', text: 'Nueva partida', onclick: newGame });
    const bar = h('div', { class: 'ad-bar' }, h('i'));
    const form = h('form', { class: 'ad-form' }, input, guessBtn);
    root.append(h('div', { class: 'card ad-card' }, rangeEl, bar, form, msg, hist, h('div', { class: 'ad-foot' }, bestEl, again)));

    function paint() {
      rangeEl.innerHTML = 'Está entre <b>' + lo + '</b> y <b>' + hi + '</b>';
      $('i', bar).style.cssText = 'left:' + ((lo - 1) / 100 * 100) + '%;width:' + ((hi - lo + 1) / 100 * 100) + '%';
      bestEl.textContent = best ? 'Tu récord: ' + best + (best === 1 ? ' intento' : ' intentos') : 'Aún no tienes récord.';
      input.disabled = guessBtn.disabled = over;
    }
    function newGame() {
      secret = Math.floor(Math.random() * 100) + 1; tries = 0; lo = 1; hi = 100; over = false; history = [];
      msg.textContent = 'Escribe un número y pulsa Intro.'; msg.className = 'ad-msg'; hist.textContent = '';
      input.value = ''; paint(); input.focus({ preventScroll: true });
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const g = parseInt(input.value, 10);
      if (isNaN(g) || g < 1 || g > 100) { msg.textContent = 'Escribe un número entero entre 1 y 100.'; msg.className = 'ad-msg warn'; input.select(); return; }
      tries++;
      let note;
      if (g === secret) {
        over = true; note = '✓';
        msg.className = 'ad-msg win';
        msg.textContent = '¡Lo has adivinado! Era el ' + secret + ' y lo has encontrado en ' + tries + (tries === 1 ? ' intento.' : ' intentos.');
        if (!best || tries < best) { best = tries; store.set('adivina-mejor', String(best)); msg.textContent += ' ¡Nuevo récord!'; }
      } else if (g < secret) { lo = Math.max(lo, g + 1); note = 'Es mayor'; msg.className = 'ad-msg'; msg.textContent = 'El número es mayor que ' + g + '.'; }
      else { hi = Math.min(hi, g - 1); note = 'Es menor'; msg.className = 'ad-msg'; msg.textContent = 'El número es menor que ' + g + '.'; }
      hist.prepend(h('li', { class: g === secret ? 'ok' : '' }, h('b', { class: 'num', text: String(g) }), h('span', { text: note })));
      input.value = ''; paint();
      if (over) again.focus(); else input.focus();
    });
    newGame();
  }
});
