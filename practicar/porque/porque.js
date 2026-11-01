'use strict';

const PORQUE_FORMS = ['porque', 'porqué', 'por que', 'por qué'];
function packPorque() {
  const items = PORQUE_DATA.map(([t, m, e], i) => ({ id: i, sentence: t, term: '', form: m, correct: m, accepted: [m], options: shuffle(PORQUE_FORMS), explanation: e }));
  return {
    items, labels: PORQUE_FORMS, keys: PORQUE_FORMS.map((_, i) => 'cat' + i), fuzzy: false, title: '', description: '',
    batch: items.map((it) => ({ id: it.id, t: it.sentence, m: 'cat' + PORQUE_FORMS.indexOf(it.form), e: it.explanation })),
    headers: DEFAULT_HEADERS, rows: []
  };
}

registerView({
  id: 'porque',
  mount(root) {
    return createExercise(root, {
      id: 'porque', build: packPorque, defaultPane: 'batch', strict: true, hideTag: true,
      keys: { progress: 'ex_progreso_porque', bookmarks: 'bm_pq' },
      tabs: { quiz: 'Paso a paso', batch: 'Tres a la vez' },
      batchHelp: 'Elige la forma correcta para completar cada oración.', batchPlaceholder: 'Elige la forma',
      legend: [['porque', 'conjunción causal'], ['porqué', 'sustantivo (= motivo)'], ['por que', 'preposición + relativo, o verbo con «por» + que'], ['por qué', 'interrogativo o exclamativo']]
    });
  }
});
