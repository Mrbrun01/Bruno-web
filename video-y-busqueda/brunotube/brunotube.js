'use strict';

/* =========================================================
   BRUNOTUBE (reproductor de vídeos locales)
   La lista sigue viva al cambiar de herramienta; el vídeo se pausa.
   ========================================================= */
registerView({
  id: 'brunotube',
  mount(root) {
    const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|ogg|mov|mkv)$/i;
    let items = [], current = -1, nextId = 1, wasPlaying = false;
    const pref = (k, d) => store.get('brunotube:' + k, d);

    const input = h('input', { type: 'file', accept: 'video/*', multiple: true, hidden: true });
    const video = h('video', { class: 'bt-video', controls: true, playsinline: true }, 'Tu navegador no soporta el elemento de vídeo.');
    const title = h('h2', { class: 'bt-title', text: 'No hay vídeo seleccionado' });
    const info = h('p', { class: 'muted bt-info' });
    const status = h('p', { class: 'bt-status', role: 'status', 'aria-live': 'polite' });
    const speed = h('select', { class: 'select bt-speed', id: 'bt-speed', 'aria-label': 'Velocidad' }, [['0.5', '0,5×'], ['0.75', '0,75×'], ['1', 'Normal'], ['1.25', '1,25×'], ['1.5', '1,5×'], ['2', '2×']].map(([v, t]) => h('option', { value: v, text: t })));
    const prevBtn = h('button', { class: 'btn sm', type: 'button', html: icon('prev') + '<span>Anterior</span>', onclick: prev });
    const nextBtn = h('button', { class: 'btn sm', type: 'button', html: icon('next') + '<span>Siguiente</span>', onclick: next });
    const loopBtn = h('button', { class: 'btn sm', type: 'button', 'aria-pressed': 'false', html: icon('repeat') + '<span>Repetir vídeo</span>', onclick: () => { video.loop = !video.loop; loopBtn.setAttribute('aria-pressed', String(video.loop)); } });
    const pipBtn = h('button', { class: 'btn sm', type: 'button', text: 'PiP', title: 'Imagen en imagen', hidden: true });
    const playlist = h('ul', { class: 'bt-list' });
    const queueCount = h('span', { class: 'muted' });

    const drop = h('section', { class: 'card bt-drop', 'aria-label': 'Zona para añadir vídeos' },
      h('span', { class: 'bt-drop-ico', html: icon('film') }), h('h2', { text: 'Arrastra tus vídeos aquí' }),
      h('p', { class: 'muted', text: 'Se reproducen directamente en tu navegador. Formatos habituales: MP4, WebM y OGG.' }),
      h('button', { class: 'btn primary lg', type: 'button', text: 'Seleccionar vídeos', onclick: () => input.click() }));
    const stage = h('section', { class: 'bt-stage', hidden: true, 'aria-label': 'Reproductor' }, video,
      h('div', { class: 'bt-now' }, title, info),
      h('div', { class: 'bt-toolbar' }, prevBtn, nextBtn, loopBtn, pipBtn, h('label', { class: 'bt-lab', for: 'bt-speed' }, 'Velocidad'), speed,
        h('button', { class: 'btn sm primary bt-add', type: 'button', html: icon('plus') + '<span>Añadir vídeos</span>', onclick: () => input.click() })),
      status,
      h('details', { class: 'bt-keys' }, h('summary', { text: 'Atajos de teclado' }),
        h('ul', null,
          h('li', { html: '<span class="kbd">Espacio</span> o <span class="kbd">K</span> pausar / reproducir' }), h('li', { html: '<span class="kbd">←</span> <span class="kbd">→</span> ±5 s' }),
          h('li', { html: '<span class="kbd">J</span> <span class="kbd">L</span> ±10 s' }), h('li', { html: '<span class="kbd">P</span> <span class="kbd">N</span> anterior / siguiente' }),
          h('li', { html: '<span class="kbd">M</span> silenciar' }), h('li', { html: '<span class="kbd">F</span> pantalla completa' }))));
    const queue = h('aside', { class: 'card bt-queue', hidden: true, 'aria-label': 'Lista de reproducción' },
      h('div', { class: 'bt-qhead' }, h('h2', { text: 'Lista de reproducción' }), queueCount), playlist);
    const overlay = h('div', { class: 'bt-overlay', hidden: true, text: 'Suelta los vídeos para añadirlos' });
    root.append(h('div', { class: 'bt-layout' }, drop, stage, queue), input, overlay);

    video.volume = clamp(parseFloat(pref('volume', '1')) || 1, 0, 1);
    speed.value = pref('speed', '1') || '1'; if (!speed.value) speed.value = '1';

    const fmtTime = (s) => { if (!isFinite(s)) return ''; s = Math.round(s); const hh = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return hh > 0 ? hh + ':' + pad2(m) + ':' + pad2(s % 60) : m + ':' + pad2(s % 60); };
    const fmtSize = (b) => (b >= 1e9 ? (b / 1e9).toFixed(2).replace('.', ',') + ' GB' : Math.max(1, Math.round(b / 1e6)) + ' MB');
    const say = (m, err) => { status.textContent = m || ''; status.classList.toggle('err', !!err); };
    const isVideo = (f) => f.type.startsWith('video/') || VIDEO_EXT.test(f.name);

    function addFiles(fileList) {
      const files = Array.from(fileList), valid = files.filter(isVideo), skipped = files.length - valid.length;
      if (!valid.length) { say('Ninguno de los archivos es un vídeo. Prueba con MP4, WebM u OGG.', true); return; }
      const first = items.length;
      valid.forEach((file) => { const it = { id: nextId++, file, url: URL.createObjectURL(file), duration: NaN }; items.push(it); readDuration(it); });
      if (current === -1) play(first); else render();
      say(valid.length + (valid.length === 1 ? ' vídeo añadido' : ' vídeos añadidos') + (skipped ? ' (' + skipped + ' omitido' + (skipped > 1 ? 's' : '') + ' por no ser vídeo)' : '') + '.');
    }
    function readDuration(it) {
      const p = document.createElement('video'); p.preload = 'metadata';
      p.onloadedmetadata = () => { it.duration = p.duration; p.removeAttribute('src'); p.load(); render(); };
      p.onerror = () => p.removeAttribute('src'); p.src = it.url;
    }
    function play(i) {
      if (i < 0 || i >= items.length) return;
      current = i; video.src = items[i].url; video.playbackRate = parseFloat(speed.value);
      const p = video.play(); if (p && p.catch) p.catch(() => {});
      say(''); render();
    }
    function next() { if (current < items.length - 1) play(current + 1); }
    function prev() { if (video.currentTime > 3 || current === 0) { video.currentTime = 0; return; } play(current - 1); }
    function removeItem(i) {
      const [gone] = items.splice(i, 1);
      if (i === current) {
        if (!items.length) { current = -1; video.pause(); video.removeAttribute('src'); video.load(); }
        else { play(Math.min(i, items.length - 1)); }
      } else if (i < current) current--;
      render();
      const revokeLater = () => { if (!items.includes(gone)) URL.revokeObjectURL(gone.url); };
      toast('Quitado de la lista: «' + gone.file.name + '».', {
        label: 'Deshacer',
        run: () => { items.splice(Math.min(i, items.length), 0, gone); if (current === -1) play(0); else if (i <= current) current++; render(); }
      });
      setTimeout(revokeLater, 8000);
    }
    function render() {
      const has = items.length > 0;
      drop.hidden = has; stage.hidden = !has; queue.hidden = !has;
      queueCount.textContent = has ? (current + 1) + ' de ' + items.length : '';
      const cur = items[current];
      title.textContent = cur ? cur.file.name : 'No hay vídeo seleccionado';
      info.textContent = cur ? [fmtTime(cur.duration), fmtSize(cur.file.size)].filter(Boolean).join(' · ') : '';
      prevBtn.disabled = !has; nextBtn.disabled = current >= items.length - 1;
      if (app.isActive('brunotube')) document.title = (cur ? cur.file.name + ' — ' : '') + 'BrunoTube · ' + app.name();
      playlist.textContent = '';
      items.forEach((it, i) => playlist.append(h('li', { class: i === current ? 'active' : '' },
        h('button', { class: 'bt-item', type: 'button', 'aria-current': i === current ? 'true' : null, onclick: () => play(i) },
          h('span', { class: 'bt-iname', text: it.file.name, title: it.file.name }), h('span', { class: 'bt-imeta', text: (i === current ? 'Reproduciendo · ' : '') + (fmtTime(it.duration) || fmtSize(it.file.size)) })),
        h('button', { class: 'bt-rm', type: 'button', text: '×', 'aria-label': 'Quitar ' + it.file.name + ' de la lista', onclick: () => removeItem(i) }))));
    }
    input.addEventListener('change', (e) => { if (e.target.files.length) addFiles(e.target.files); input.value = ''; });
    speed.addEventListener('change', () => { video.playbackRate = parseFloat(speed.value); store.set('brunotube:speed', speed.value); });
    video.addEventListener('volumechange', () => store.set('brunotube:volume', String(video.volume)));
    video.addEventListener('ended', () => { if (current < items.length - 1) next(); else say('Has llegado al final de la lista.'); });
    video.addEventListener('error', () => {
      const cur = items[current]; if (!cur) return;
      say('No se puede reproducir «' + cur.file.name + '»: el navegador no admite su formato o códec. ' + (current < items.length - 1 ? 'Prueba con el siguiente de la lista.' : ''), true);
    });
    if (document.pictureInPictureEnabled) {
      pipBtn.hidden = false;
      pipBtn.addEventListener('click', async () => { try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await video.requestPictureInPicture(); } catch (e) { say('No se pudo activar imagen en imagen para este vídeo.', true); } });
    }

    /* Arrastrar y soltar (solo mientras esta herramienta está abierta) */
    let depth = 0;
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    window.addEventListener('dragenter', (e) => { if (!app.isActive('brunotube') || !hasFiles(e)) return; e.preventDefault(); depth++; overlay.hidden = false; });
    window.addEventListener('dragover', (e) => { if (app.isActive('brunotube') && hasFiles(e)) e.preventDefault(); });
    window.addEventListener('dragleave', (e) => { if (!app.isActive('brunotube') || !hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) overlay.hidden = true; });
    window.addEventListener('drop', (e) => { if (!app.isActive('brunotube') || !hasFiles(e)) return; e.preventDefault(); depth = 0; overlay.hidden = true; addFiles(e.dataTransfer.files); });

    document.addEventListener('keydown', (e) => {
      if (!app.isActive('brunotube') || e.ctrlKey || e.metaKey || e.altKey || current === -1) return;
      if (e.target.closest && e.target.closest('button, select, input, summary, label, a')) return;
      const seek = (s) => { video.currentTime = clamp(video.currentTime + s, 0, video.duration || 0); };
      switch (e.key.toLowerCase()) {
        case ' ': case 'k': video.paused ? video.play() : video.pause(); break;
        case 'arrowleft': seek(-5); break; case 'arrowright': seek(5); break;
        case 'j': seek(-10); break; case 'l': seek(10); break;
        case 'n': next(); break; case 'p': prev(); break; case 'm': video.muted = !video.muted; break;
        case 'f': if (document.fullscreenElement) document.exitFullscreen(); else if (video.requestFullscreen) video.requestFullscreen(); break;
        default: return;
      }
      e.preventDefault();
    });
    window.addEventListener('beforeunload', () => items.forEach((it) => URL.revokeObjectURL(it.url)));
    render();
    return {
      show() { render(); },
      hide() { wasPlaying = !video.paused; video.pause(); }
    };
  }
});
