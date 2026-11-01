'use strict';

/* =========================================================
   RELOJ, TEMPORIZADOR Y CRONÓMETRO
   ========================================================= */
registerView({
  id: 'reloj',
  mount(root) {
    let hour12 = store.get('hour12', '0') === '1';
    root.innerHTML = `
      <div class="rl" id="rl-stage">
        <div class="rl-clock">
          <p class="rl-date" id="rl-date"></p>
          <div class="rl-time"><span id="rl-time" role="timer" aria-live="off"></span><span id="rl-ampm"></span></div>
          <div class="rl-bar">
            <button type="button" class="btn sm" id="rl-fmt" aria-pressed="false"></button>
            <button type="button" class="btn sm" id="rl-full">${icon('fullscreen')}<span>Pantalla completa</span></button>
          </div>
        </div>
        <div class="seg rl-tabs" role="tablist" aria-label="Herramientas">
          <button type="button" role="tab" id="tab-reloj" aria-selected="true" aria-controls="p-reloj">Reloj</button>
          <button type="button" role="tab" id="tab-timer" aria-selected="false" aria-controls="p-timer">Temporizador</button>
          <button type="button" role="tab" id="tab-sw" aria-selected="false" aria-controls="p-sw">Cronómetro</button>
          <button type="button" role="tab" id="tab-tz" aria-selected="false" aria-controls="p-tz">Zonas horarias</button>
        </div>
        <section class="card rl-panel" id="p-reloj" role="tabpanel" aria-labelledby="tab-reloj">
          <p class="muted rl-help">Atajos: <span class="kbd">Espacio</span> inicia o pausa, <span class="kbd">F</span> pantalla completa.</p>
        </section>
        <section class="card rl-panel" id="p-timer" role="tabpanel" aria-labelledby="tab-timer" hidden>
          <p class="rl-read num" id="t-disp">00:00</p>
          <div class="rl-fields">
            <label class="field">Minutos<input class="input" type="number" id="t-min" min="0" max="999" inputmode="numeric" placeholder="0"></label>
            <label class="field">Segundos<input class="input" type="number" id="t-sec" min="0" max="59" inputmode="numeric" placeholder="0"></label>
          </div>
          <div class="rl-presets" id="t-presets" aria-label="Tiempos rápidos">
            <button type="button" class="btn sm" data-s="60">1 min</button><button type="button" class="btn sm" data-s="300">5 min</button>
            <button type="button" class="btn sm" data-s="600">10 min</button><button type="button" class="btn sm" data-s="1500">25 min</button>
          </div>
          <div class="progress" aria-hidden="true"><i id="t-bar" style="width:100%"></i></div>
          <div class="rl-actions"><button type="button" class="btn primary" id="t-toggle">Iniciar</button><button type="button" class="btn" id="t-reset">Reiniciar</button></div>
          <p class="rl-status" id="t-status" role="status" aria-live="polite"></p>
        </section>
        <section class="card rl-panel" id="p-sw" role="tabpanel" aria-labelledby="tab-sw" hidden>
          <p class="rl-read num" id="s-disp">00:00.00</p>
          <div class="rl-actions"><button type="button" class="btn primary" id="s-toggle">Iniciar</button><button type="button" class="btn" id="s-lap" disabled>Vuelta</button><button type="button" class="btn" id="s-reset">Reiniciar</button></div>
          <ol class="rl-laps" id="s-laps" aria-label="Vueltas"></ol>
        </section>
        <section class="card rl-panel" id="p-tz" role="tabpanel" aria-labelledby="tab-tz" hidden>
          <div class="rl-tzadd">
            <select class="select" id="tz-pick" aria-label="Elegir ciudad"></select>
            <button type="button" class="btn primary" id="tz-add">${icon('plus')}<span>Añadir</span></button>
          </div>
          <ul class="rl-tzlist" id="tz-list" aria-label="Zonas horarias añadidas"></ul>
          <p class="muted" id="tz-empty">Añade una ciudad para ver su hora actual.</p>
        </section>
      </div>`;
    const q = (s) => $(s, root);
    const stage = q('#rl-stage');

    /* ---------- Reloj ---------- */
    const elTime = q('#rl-time'), elAmpm = q('#rl-ampm'), elDate = q('#rl-date'), btnFmt = q('#rl-fmt');
    let lastDay = '', tickId = null;
    function renderClock() {
      const now = new Date(); let hh = now.getHours(), suf = '';
      if (hour12) { suf = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12; }
      elTime.innerHTML = digitSpans((hour12 ? String(hh) : pad2(hh)) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds()));
      elAmpm.textContent = suf;
      const day = now.toDateString();
      if (day !== lastDay) { lastDay = day; elDate.textContent = cap(now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })); }
    }
    function paintFmt() { btnFmt.textContent = hour12 ? 'Formato 24 h' : 'Formato 12 h'; btnFmt.setAttribute('aria-pressed', String(hour12)); renderClock(); }
    btnFmt.addEventListener('click', () => { hour12 = !hour12; store.set('hour12', hour12 ? '1' : '0'); paintFmt(); });
    function schedule() { renderClock(); if (typeof renderZones === 'function') renderZones(); tickId = setTimeout(schedule, 1000 - (Date.now() % 1000) + 5); }
    function fullscreen() {
      if (!document.fullscreenEnabled) return;
      if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(() => {});
    }
    q('#rl-full').addEventListener('click', fullscreen);
    if (!document.fullscreenEnabled) q('#rl-full').hidden = true;
    paintFmt();

    /* ---------- Pestañas ---------- */
    const tabs = ['reloj', 'timer', 'sw', 'tz'].map((id) => ({ id, tab: q('#tab-' + id), panel: q('#p-' + id) }));
    let active = 'reloj';
    function activate(id) { active = id; tabs.forEach((t) => { const s = t.id === id; t.tab.setAttribute('aria-selected', String(s)); t.tab.tabIndex = s ? 0 : -1; t.panel.hidden = !s; }); }
    tabs.forEach((t, i) => {
      t.tab.addEventListener('click', () => activate(t.id));
      t.tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; activate(n.id); n.tab.focus();
      });
    });
    activate('reloj');

    /* ---------- Alarma (sin archivos externos) ---------- */
    let audioCtx = null, alarmId = null;
    function unlockAudio() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { audioCtx = null; } }
    function beep(t0, dur = 0.15, f = 880) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(audioCtx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function stopAlarm() { if (alarmId) { clearInterval(alarmId); alarmId = null; } }
    function ringAlarm() {
      stopAlarm(); let n = 0;
      const round = () => { if (audioCtx) { const t = audioCtx.currentTime; beep(t); beep(t + 0.25); beep(t + 0.5); } if (navigator.vibrate) navigator.vibrate([150, 100, 150, 100, 150]); if (++n >= 6) stopAlarm(); };
      round(); alarmId = setInterval(round, 1500);
    }

    /* ---------- Temporizador ---------- */
    const tMin = q('#t-min'), tSec = q('#t-sec'), tDisp = q('#t-disp'), tBar = q('#t-bar'), tStatus = q('#t-status'), tToggle = q('#t-toggle');
    const BASE_TITLE = 'Reloj';
    const T = { total: 0, left: 0, end: 0, running: false, paused: false, id: null };
    const fmt = (s) => { const hh = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (hh > 0 ? hh + ':' + pad2(m) : pad2(m)) + ':' + pad2(s % 60); };
    const readFields = () => clamp(parseInt(tMin.value, 10) || 0, 0, 999) * 60 + clamp(parseInt(tSec.value, 10) || 0, 0, 59);
    function say(txt, alert = false) { tStatus.textContent = txt; tStatus.classList.toggle('alert', alert); }
    function paintTimer() {
      const s = T.running || T.paused ? Math.ceil(T.left / 1000) : readFields();
      tDisp.textContent = fmt(s);
      tBar.style.width = (clamp(T.total > 0 && (T.running || T.paused) ? T.left / T.total : 1, 0, 1) * 100) + '%';
      if (app.isActive('reloj')) document.title = (T.running ? fmt(s) + ' · ' : '') + BASE_TITLE + ' · ' + app.name();
    }
    function lock(b) { tMin.disabled = tSec.disabled = b; $$('#t-presets .btn', root).forEach((x) => { x.disabled = b; }); }
    function finish() {
      clearInterval(T.id); T.id = null; Object.assign(T, { running: false, paused: false, left: 0 });
      tDisp.textContent = '00:00'; tBar.style.width = '0%'; tToggle.textContent = 'Iniciar'; lock(false);
      say('Se acabó el tiempo. Pulsa Reiniciar para silenciar la alarma.', true); ringAlarm();
      if (app.isActive('reloj')) document.title = '¡Tiempo! · ' + app.name();
    }
    function toggleTimer() {
      unlockAudio();
      if (T.running) { T.left = Math.max(0, T.end - Date.now()); clearInterval(T.id); T.id = null; T.running = false; T.paused = true; tToggle.textContent = 'Reanudar'; say('En pausa'); return paintTimer(); }
      if (!T.paused) { const total = readFields() * 1000; if (total <= 0) return say('Escribe un tiempo mayor que cero.'); T.total = T.left = total; }
      stopAlarm(); T.end = Date.now() + T.left; T.running = true; T.paused = false;
      T.id = setInterval(() => { T.left = Math.max(0, T.end - Date.now()); if (T.left <= 0) finish(); else paintTimer(); }, 200);
      tToggle.textContent = 'Pausar'; lock(true); say(''); paintTimer();
    }
    function resetTimer() { clearInterval(T.id); T.id = null; stopAlarm(); Object.assign(T, { running: false, paused: false, total: 0, left: 0 }); tToggle.textContent = 'Iniciar'; lock(false); say(''); paintTimer(); }
    tToggle.addEventListener('click', toggleTimer); q('#t-reset').addEventListener('click', resetTimer);
    [tMin, tSec].forEach((i) => i.addEventListener('input', paintTimer));
    q('#t-presets').addEventListener('click', (e) => { const b = e.target.closest('button[data-s]'); if (!b) return; const s = Number(b.dataset.s); tMin.value = Math.floor(s / 60); tSec.value = s % 60; say(''); paintTimer(); });

    /* ---------- Cronómetro ---------- */
    const sDisp = q('#s-disp'), sToggle = q('#s-toggle'), sLap = q('#s-lap'), sLaps = q('#s-laps');
    const S = { acc: 0, t0: 0, running: false, id: null, lastLap: 0, laps: 0 };
    function fmtSw(ms) { const t = Math.floor(ms / 10), cs = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000) % 60, hh = Math.floor(t / 360000); return (hh > 0 ? hh + ':' : '') + pad2(m) + ':' + pad2(s) + '.' + pad2(cs); }
    const elapsed = () => S.acc + (S.running ? performance.now() - S.t0 : 0);
    const paintSw = () => { sDisp.textContent = fmtSw(elapsed()); };
    function toggleSw() {
      if (S.running) { S.acc = elapsed(); S.running = false; clearInterval(S.id); S.id = null; sToggle.textContent = 'Reanudar'; sLap.disabled = true; paintSw(); }
      else { S.t0 = performance.now(); S.running = true; S.id = setInterval(paintSw, 31); sToggle.textContent = 'Pausar'; sLap.disabled = false; }
    }
    sToggle.addEventListener('click', toggleSw);
    sLap.addEventListener('click', () => {
      if (!S.running) return;
      const total = elapsed(); S.laps++;
      sLaps.prepend(h('li', null, h('span', { text: 'Vuelta ' + S.laps }), h('span', { class: 'num', text: fmtSw(total - S.lastLap) + '  (' + fmtSw(total) + ')' })));
      S.lastLap = total;
    });
    q('#s-reset').addEventListener('click', () => { clearInterval(S.id); Object.assign(S, { acc: 0, t0: 0, running: false, id: null, lastLap: 0, laps: 0 }); sToggle.textContent = 'Iniciar'; sLap.disabled = true; sLaps.textContent = ''; paintSw(); });

    document.addEventListener('keydown', (e) => {
      if (!app.isActive('reloj') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target !== document.body && !(e.target.closest && e.target.closest('.rl-tabs'))) return;
      if (e.key === ' ') { if (active === 'timer') { e.preventDefault(); toggleTimer(); } else if (active === 'sw') { e.preventDefault(); toggleSw(); } }
      else if (e.key.toLowerCase() === 'f') fullscreen();
    });
    /* ---------- Zonas horarias ---------- */
    const TZ_CITIES = [
      ['Europe/Madrid', 'Madrid'], ['Atlantic/Canary', 'Canarias'], ['Europe/London', 'Londres'], ['Europe/Lisbon', 'Lisboa'],
      ['Europe/Paris', 'París'], ['Europe/Berlin', 'Berlín'], ['Europe/Rome', 'Roma'], ['Europe/Moscow', 'Moscú'],
      ['America/New_York', 'Nueva York'], ['America/Chicago', 'Chicago'], ['America/Denver', 'Denver'], ['America/Los_Angeles', 'Los Ángeles'],
      ['America/Mexico_City', 'Ciudad de México'], ['America/Bogota', 'Bogotá'], ['America/Lima', 'Lima'], ['America/Santiago', 'Santiago de Chile'],
      ['America/Argentina/Buenos_Aires', 'Buenos Aires'], ['America/Sao_Paulo', 'São Paulo'],
      ['Africa/Cairo', 'El Cairo'], ['Asia/Dubai', 'Dubái'], ['Asia/Kolkata', 'Bombay / Nueva Delhi'], ['Asia/Bangkok', 'Bangkok'],
      ['Asia/Shanghai', 'Shanghái'], ['Asia/Tokyo', 'Tokio'], ['Asia/Seoul', 'Seúl'], ['Australia/Sydney', 'Sídney'], ['Pacific/Auckland', 'Auckland']
    ];
    const tzPick = q('#tz-pick'), tzAdd = q('#tz-add'), tzList = q('#tz-list'), tzEmpty = q('#tz-empty');
    let zones = store.json('reloj-zonas', null);
    if (!Array.isArray(zones)) zones = ['Europe/London', 'America/New_York', 'Asia/Tokyo'];
    zones = zones.filter((z) => TZ_CITIES.some((c) => c[0] === z));
    const saveZones = () => store.setJson('reloj-zonas', zones);
    tzPick.append(...TZ_CITIES.map(([id, name]) => h('option', { value: id, text: name })));
    function tzOffsetLabel(id, now) {
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'shortOffset' }).formatToParts(now);
        const off = (parts.find((p) => p.type === 'timeZoneName') || {}).value || '';
        return off.replace('GMT', 'UTC');
      } catch (e) { return ''; }
    }
    function renderZones() {
      const now = new Date();
      tzEmpty.hidden = zones.length > 0;
      tzList.textContent = '';
      zones.forEach((id) => {
        const name = (TZ_CITIES.find((c) => c[0] === id) || [id, id])[1];
        let time = '--:--', day = '';
        try {
          time = new Intl.DateTimeFormat('es-ES', { timeZone: id, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
          const hereDay = now.toLocaleDateString('es-ES', { timeZone: 'UTC' });
          const thereDay = now.toLocaleDateString('es-ES', { timeZone: id });
          const localDay = now.toLocaleDateString('es-ES');
          if (thereDay !== localDay) day = new Date(thereDay.split('/').reverse().join('-')) > new Date(localDay.split('/').reverse().join('-')) ? 'mañana' : 'ayer';
        } catch (e) { /* zona no soportada */ }
        tzList.append(h('li', { class: 'rl-tz' },
          h('div', null, h('p', { class: 'rl-tzname', text: name }), h('p', { class: 'muted rl-tzoff', text: tzOffsetLabel(id, now) + (day ? ' · ' + day : '') })),
          h('span', { class: 'rl-tztime num', text: time }),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Quitar ' + name, html: icon('close'), onclick: () => removeZone(id) })));
      });
    }
    function removeZone(id) {
      const i = zones.indexOf(id); if (i < 0) return;
      const name = (TZ_CITIES.find((c) => c[0] === id) || [id, id])[1];
      zones.splice(i, 1); saveZones(); renderZones();
      toast(name + ' quitada.', { label: 'Deshacer', run: () => { zones.splice(i, 0, id); saveZones(); renderZones(); } });
    }
    tzAdd.addEventListener('click', () => {
      const id = tzPick.value; if (!id) return;
      if (zones.includes(id)) { toast('Esa ciudad ya está en la lista.'); return; }
      zones.push(id); saveZones(); renderZones();
    });
    renderZones();

    paintTimer();
    return { show() { schedule(); paintTimer(); }, hide() { clearTimeout(tickId); } };
  }
});
