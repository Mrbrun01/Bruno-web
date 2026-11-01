'use strict';

function packVerbos() {
  const D = VERBOS_DATA;
  const items = D.items.map((it) => ({ id: it.id, sentence: it.sentence, term: it.verb, form: it.form, correct: it.correct, accepted: it.accepted, options: shuffle(it.options), explanation: it.explanation }));
  const keyOf = (f) => (f === 'pasado simple' ? 'cat0' : 'cat1');
  return {
    items, labels: ['Pasado simple', 'Participio'], keys: ['cat0', 'cat1'], fuzzy: false, title: '', description: '',
    batch: items.map((it) => ({ id: it.id, t: it.sentence, m: keyOf(it.form), e: it.explanation, h: 'Verbo: ' + it.term })),
    headers: ['Infinitivo', 'Pasado', 'Participio', 'Castellano'],
    rows: D.table.map((v) => ({ c1: v.i, c2: v.p, c3: v.pp, note: v.es, c2List: v.pl, c3List: v.ppl }))
  };
}

registerView({
  id: 'verbos',
  mount(root) {
    return createExercise(root, {
      id: 'verbos', build: packVerbos, defaultPane: 'quiz',
      keys: { progress: 'verbos_irregulares_progreso_v1', bookmarks: 'bm_verbos' },
      tabs: { quiz: 'Practicar frases', batch: 'Clasificar frases', table: 'Tabla completa', practice: 'Practicar tabla' },
      batchHelp: 'Cada frase tiene un hueco: elige si pide la forma de pasado simple o el participio.',
      batchPlaceholder: 'Elige la forma',
      legend: [['Pasado simple', 'acción terminada en el pasado (I saw)'], ['Participio', 'con have/has/had o en pasiva (I have seen)']]
    });
  }
});
