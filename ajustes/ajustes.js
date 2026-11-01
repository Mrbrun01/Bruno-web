'use strict';

/* =========================================================
   PERSONALIZACIÓN
   Accesible pulsando el nombre en la barra lateral.
   No aparece en el menú de navegación.
   ========================================================= */
const STYLES = [
  { id: 'index', name: 'Index', desc: 'El cuaderno cuadriculado de siempre, con el amarillo subrayador.', paper: '#F6F7FC', hi: '#FFD426', surface: '#FFFFFF', dpaper: '#11152A', dhi: '#FFD426', dsurface: '#1A1F38' },
  { id: 'board', name: 'Board', desc: 'Un escritorio de hojas limpio, sin cuadrícula, con acento verde azulado.', paper: '#d5dde6', hi: '#0f766e', surface: '#ffffff', dpaper: '#12171d', dhi: '#4fd1c5', dsurface: '#1b222a' },
  { id: 'fiz', name: 'Caramelo', desc: 'La variante roja y dorada, cálida y llamativa.', paper: '#FFE271', hi: '#C60B1E', surface: '#FFFDF0', dpaper: '#2B0A12', dhi: '#FFCE00', dsurface: '#3A1019' },
  { id: 'pastel', name: 'Pastel', desc: 'Rosa suave con acentos en azul turquesa claro.', paper: '#fdeef3', hi: '#7fd8d3', surface: '#fffbfd', dpaper: '#2a1f27', dhi: '#7fd8d3', dsurface: '#362a34' },
  { id: 'bosque', name: 'Bosque', desc: 'Verdes y marrones tierra, tranquilo y natural.', paper: '#eef1e4', hi: '#7bab5a', surface: '#fbfbf5', dpaper: '#171c13', dhi: '#9ac97a', dsurface: '#212a1b' },
  { id: 'oceano', name: 'Océano', desc: 'Azules profundos con un toque de naranja.', paper: '#e7f1f6', hi: '#f2a541', surface: '#fbfeff', dpaper: '#071923', dhi: '#f2a541', dsurface: '#0d2733' }
];

registerView({
  id: 'ajustes',
  mount(root) {
    const nameIn = h('input', { class: 'input', type: 'text', maxlength: '30', placeholder: 'Bruno', autocomplete: 'off' });
    const seg = (options, get, set) => {
      const el = h('div', { class: 'seg', role: 'radiogroup' });
      const paint = () => $$('button', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === get())));
      options.forEach(([v, label]) => el.append(h('button', { type: 'button', 'data-v': v, role: 'radio', 'aria-checked': 'false', text: label, onclick: () => { set(v); paint(); } })));
      paint();
      return el;
    };

    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const isDark = () => shell.theme === 'dark' || (shell.theme === 'auto' && !!(mq && mq.matches));
    const themeSeg = seg(
      [['light', 'Claro'], ['dark', 'Oscuro'], ['auto', 'Del sistema']],
      () => shell.theme, (v) => { shell.applyTheme(v); paintSwatches(); });
    const navSeg = seg(
      [['full', 'Fija'], ['compact', 'Contraída'], ['hover', 'Contraída (se abre al pasar el cursor)']],
      () => shell.navMode, (v) => shell.applyNav(v));
    const soundChk = h('input', { type: 'checkbox', checked: shell.soundOn });
    soundChk.addEventListener('change', () => { shell.applySound(soundChk.checked); if (soundChk.checked) shell.playClick(); });
    const soundToggle = h('label', { class: 'ex-toggle' }, soundChk, h('span', { class: 'ex-switch', 'aria-hidden': 'true' }), h('span', { text: 'Sonido al pulsar botones' }));

    const styleGrid = h('div', { class: 'style-grid', role: 'radiogroup', 'aria-label': 'Estilo visual' });
    function paintStyles() { $$('.style-card', styleGrid).forEach((c) => c.setAttribute('aria-checked', String(c.dataset.id === shell.styleName))); }
    function paintSwatches() {
      const dark = isDark();
      STYLES.forEach((st) => {
        const card = $(`.style-card[data-id="${st.id}"]`, styleGrid); if (!card) return;
        const sw = $('.style-swatch', card), spans = sw.querySelectorAll('span');
        sw.style.background = dark ? st.dpaper : st.paper;
        spans[0].style.background = dark ? st.dsurface : st.surface;
        spans[1].style.background = dark ? st.dhi : st.hi;
      });
    }
    if (mq && mq.addEventListener) mq.addEventListener('change', paintSwatches);
    STYLES.forEach((s) => {
      styleGrid.append(h('button', {
        type: 'button', class: 'style-card', role: 'radio', 'data-id': s.id, 'aria-checked': 'false',
        onclick: () => { shell.applyStyle(s.id); paintStyles(); }
      },
        h('span', { class: 'style-swatch', style: `background:${s.paper}` },
          h('span', { style: `background:${s.surface}` }), h('span', { style: `background:${s.hi}` })),
        h('span', { class: 'style-name', text: s.name }),
        h('span', { class: 'style-desc', text: s.desc })));
    });
    paintStyles(); paintSwatches();

    root.append(
      h('section', { class: 'card ajustes-card' },
        h('h2', { text: 'Nombre' }),
        h('p', { class: 'muted', text: 'Sustituye el «Bruno» que aparece en el saludo de Inicio y en la barra lateral.' }),
        h('label', { class: 'field ajustes-name' }, h('span', { class: 'sr', text: 'Nombre' }), nameIn)),
      h('section', { class: 'card ajustes-card' },
        h('h2', { text: 'Tema' }),
        h('p', { class: 'muted', text: 'Claro, oscuro, o el que tenga configurado tu dispositivo.' }),
        themeSeg),
      h('section', { class: 'card ajustes-card' },
        h('h2', { text: 'Estilo' }),
        h('p', { class: 'muted', text: 'Cada estilo cambia los colores y el aspecto de toda la web.' }),
        styleGrid),
      h('section', { class: 'card ajustes-card' },
        h('h2', { text: 'Barra lateral' }),
        h('p', { class: 'muted', text: 'Fija ocupa siempre su sitio; contraída deja más espacio y muestra solo los iconos.' }),
        navSeg),
      h('section', { class: 'card ajustes-card' },
        h('h2', { text: 'Sonido' }),
        h('p', { class: 'muted', text: 'Un pequeño clic al pulsar los botones de toda la web.' }),
        soundToggle));

    nameIn.value = shell.userName;
    nameIn.addEventListener('input', () => shell.applyName(nameIn.value));
    nameIn.addEventListener('blur', () => { nameIn.value = shell.userName; });

    return {};
  }
});
