/* Tema y estilo guardados: se aplican antes de pintar para evitar parpadeos al cambiar de página */
(function () {
  try {
    var r = document.documentElement;
    var t = localStorage.getItem('ui-tema');
    if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t);
    var s = localStorage.getItem('ui-estilo');
    if (['index', 'board', 'fiz', 'pastel', 'bosque', 'oceano'].indexOf(s) !== -1) r.setAttribute('data-style', s);
    if (localStorage.getItem('modo') === 'republica') r.classList.add('republica');
  } catch (e) { /* sin almacenamiento: se usan los valores por defecto */ }
})();
