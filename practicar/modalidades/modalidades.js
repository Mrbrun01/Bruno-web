'use strict';

const MODALIDADES = ['enunciativa', 'interrogativa', 'exclamativa', 'exhortativa', 'dubitativa', 'desiderativa'];
function packModalidades() {
  return {
    items: [], labels: MODALIDADES.map(cap), keys: MODALIDADES.map((_, i) => 'cat' + i), fuzzy: false, title: '', description: '',
    batch: MODALIDADES_DATA.map(([t, m], i) => ({ id: i, t, m: 'cat' + MODALIDADES.indexOf(m) })),
    headers: DEFAULT_HEADERS, rows: []
  };
}

registerView({
  id: 'modalidades',
  mount(root) {
    return createExercise(root, {
      id: 'modalidades', build: packModalidades, defaultPane: 'batch',
      keys: { bookmarks: 'bm' },
      batchHelp: 'Identifica el tipo de modalidad de cada oración.', batchPlaceholder: 'Elige la modalidad',
      legend: [['Enunciativa', 'informa o describe'], ['Interrogativa', 'pregunta'], ['Exclamativa', 'expresa emoción'], ['Exhortativa', 'ordena, ruega o aconseja'], ['Dubitativa', 'expresa duda o posibilidad'], ['Desiderativa', 'expresa un deseo']]
    });
  }
});
