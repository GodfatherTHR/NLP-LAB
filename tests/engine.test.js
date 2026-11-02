/* Engine + data tests — run with:  node tests/engine.test.js */
const path = require('path');
require(path.join(__dirname, '..', 'assets', 'js', 'engine.js'));
require(path.join(__dirname, '..', 'assets', 'js', 'data.js'));
const E = globalThis.NLP.engine;
let pass = 0;
let fail = 0;
const failures = [];

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) pass++;
  else {
    fail++;
    failures.push(`${label}\n   expected: ${b}\n   actual:   ${a}`);
  }
}
function ok(cond, label) {
  if (cond) pass++;
  else {
    fail++;
    failures.push(label);
  }
}

/* ---------- 1. Porter stemmer: canonical test pairs (Porter 1980) ---------- */
const porter = [
  ['caresses', 'caress'], ['ponies', 'poni'], ['ties', 'ti'], ['caress', 'caress'],
  ['cats', 'cat'], ['feed', 'feed'], ['agreed', 'agre'], ['plastered', 'plaster'],
  ['bled', 'bled'], ['motoring', 'motor'], ['sing', 'sing'], ['conflated', 'conflat'],
  ['troubled', 'troubl'], ['sized', 'size'], ['hopping', 'hop'], ['tanned', 'tan'],
  ['falling', 'fall'], ['hissing', 'hiss'], ['fizzed', 'fizz'], ['failing', 'fail'],
  ['filing', 'file'], ['happy', 'happi'], ['sky', 'sky'], ['relational', 'relat'],
  ['conditional', 'condit'], ['rational', 'ration'], ['valenci', 'valenc'],
  ['hesitanci', 'hesit'], ['digitizer', 'digit'], ['conformabli', 'conform'],
  ['radicalli', 'radic'], ['differentli', 'differ'], ['vileli', 'vile'],
  ['analogousli', 'analog'], ['vietnamization', 'vietnam'], ['predication', 'predic'],
  ['operator', 'oper'], ['feudalism', 'feudal'], ['decisiveness', 'decis'],
  ['hopefulness', 'hope'], ['callousness', 'callous'], ['formaliti', 'formal'],
  ['sensitiviti', 'sensit'], ['sensibiliti', 'sensibl'], ['triplicate', 'triplic'],
  ['formative', 'form'], ['formalize', 'formal'], ['electriciti', 'electr'],
  ['electrical', 'electr'], ['hopeful', 'hope'], ['goodness', 'good'],
  ['revival', 'reviv'], ['allowance', 'allow'], ['inference', 'infer'],
  ['airliner', 'airlin'], ['gyroscopic', 'gyroscop'], ['adjustable', 'adjust'],
  ['defensible', 'defens'], ['irritant', 'irrit'], ['replacement', 'replac'],
  ['adjustment', 'adjust'], ['dependent', 'depend'], ['adoption', 'adopt'],
  ['homologou', 'homolog'], ['communism', 'commun'], ['activate', 'activ'],
  ['angulariti', 'angular'], ['homologous', 'homolog'], ['effective', 'effect'],
  ['bowdlerize', 'bowdler'], ['probate', 'probat'], ['rate', 'rate'],
  ['cease', 'ceas'], ['controll', 'control'], ['roll', 'roll'],
  ['generalization', 'gener'], ['oscillators', 'oscil'], ['running', 'run'],
  ['studies', 'studi'], ['studied', 'studi'], ['national', 'nation'],
  ['processing', 'process'], ['retrieval', 'retriev'], ['libraries', 'librari']
];
porter.forEach(([input, expected]) => eq(E.porterStem(input), expected, `porter("${input}")`));

/* ---------- 2. Tokenizer ---------- */
eq(E.tokenize("I don't like NLP-lab, it's 3.5x faster!"),
  ['i', "don't", 'like', 'nlp-lab', ',', 'it\'s', '3', '.', '5x', 'faster', '!'],
  'tokenize contractions/hyphens');
eq(E.tokenize('Hello, world!', { keepPunct: false }), ['hello', 'world'], 'tokenize without punct');
ok(E.tokenize('Café naïve').length === 2, 'unicode words kept');

/* ---------- 3. Sentence splitter ---------- */
const sents = E.sentences('Dr. Smith went to Washington. He arrived at 3 p.m. It was cold!');
eq(sents.length, 3, 'sentence splitter avoids "Dr." and keeps "p.m."');

/* ---------- 4. TF-IDF ---------- */
const model = E.tfidfMatrix([
  'the cat sat on the mat',
  'the dog sat on the log',
  'cats and dogs are friends'
]);
ok(model.vocab.includes('cat'), 'tfidf vocab contains cat');
ok(model.vocab.length >= 8, 'tfidf vocab size sane');
const v1 = model.tfidf[0];
const v2 = model.tfidf[1];
ok(E.cosine(v1, v2) > E.cosine(v1, model.tfidf[2]), 'similar docs score higher');
ok(Math.abs(E.cosine(v1, v1) - 1) < 1e-9, 'self cosine == 1');
ok(model.idf.every((x) => x > 0), 'idf positive');

/* ---------- 5. Levenshtein ---------- */
eq(E.levenshtein('kitten', 'sitting'), 3, 'levenshtein kitten/sitting');
eq(E.levenshtein('', 'abc'), 3, 'levenshtein empty');
eq(E.levenshtein('same', 'same'), 0, 'levenshtein identical');
const al = E.levenshtein('kitten', 'sitting', { align: true });
eq(al.distance, 3, 'alignment distance');
eq(al.ops.length, 7, 'alignment ops length');
ok(al.ops.filter((o) => o.op === 'match').length === 4, 'alignment matches');

/* ---------- 6. Naive Bayes ---------- */
const nbData = [
  ['I love this movie', 'pos'], ['great film, loved it', 'pos'], ['wonderful and fun', 'pos'],
  ['best acting ever', 'pos'], ['so happy with it', 'pos'], ['a delightful watch', 'pos'],
  ['I hate this movie', 'neg'], ['terrible film, awful', 'neg'], ['boring and dull', 'neg'],
  ['worst acting ever', 'neg'], ['so sad about it', 'neg'], ['a painful watch', 'neg']
].map(([t, l]) => ({ tokens: E.tokenize(t, { keepPunct: false }), label: l }));
const nb = new E.NaiveBayes({ alpha: 1 }).train(nbData);
eq(nb.predict(E.tokenize('what a wonderful film', { keepPunct: false })).label, 'pos', 'NB positive');
eq(nb.predict(E.tokenize('this was boring and terrible', { keepPunct: false })).label, 'neg', 'NB negative');
const post = nb.predict(E.tokenize('great fun', { keepPunct: false })).posterior;
ok(Math.abs(post.pos + post.neg - 1) < 1e-9, 'NB posteriors sum to 1');

/* ---------- 7. N-gram LM ---------- */
const lm = E.ngramLM('the cat sat on the mat . the cat ate the fish'.split(' '), 2, { k: 0.5 });
const nw = lm.nextWords(['the'], 5);
ok(nw.items.length > 0, 'LM has next-word candidates');
ok(nw.items[0].word === 'cat', 'LM top continuation after "the" is "cat"');
const pp = lm.perplexity('the cat sat'.split(' '));
ok(pp.ppl > 1, 'perplexity > 1');

/* ---------- 8. BPE ---------- */
const bpe = E.bpeTrain([['low', 5], ['lower', 2], ['newest', 6], ['widest', 3]], { merges: 10 });
ok(bpe.steps.length > 0, 'BPE produced merges');
ok(bpe.merges.some(([a, b]) => a + b === 'es'), 'BPE learns a merge');
const enc = E.bpeEncode('lowest', bpe.merges);
ok(enc.tokens.length > 0, 'BPE encode works');
ok(enc.tokens.join('').replace('</w>', '') === 'lowest', 'BPE encode is lossless');

/* ---------- 9. Attention ---------- */
const att = E.attentionDemo(['the', 'cat', 'sat', 'on', 'the', 'mat'], { dim: 16, heads: 2, causal: true });
eq(att.headsData.length, 2, 'attention heads');
eq(att.headsData[0].A.length, 6, 'attention rows');
ok(att.headsData[0].A.every((row) => Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-9), 'attention rows sum to 1');
ok(att.headsData[0].A[0].slice(1).every((v) => v === 0), 'causal mask hides future');
const att2 = E.attentionDemo(['the', 'cat'], { causal: false });
ok(att2.headsData[0].A[0][1] > 0, 'non-causal attends to future');

/* ---------- 10. BLEU ---------- */
const b1 = E.bleu('the cat is on the mat', ['the cat is on the mat']);
ok(b1.score > 0.99, 'BLEU perfect match ~1');
const b2 = E.bleu('the cat is on a mat', ['the cat is on the mat']);
ok(b2.score > 0.2 && b2.score < 0.95, 'BLEU partial match in range: ' + b2.score.toFixed(3));
const b3 = E.bleu('totally different words here', ['the cat is on the mat']);
eq(b3.score, 0, 'BLEU no overlap == 0');
const b4 = E.bleu('the cat is', ['the cat is on the mat']);
ok(b4.bp < 1 && b4.score > 0 && b4.score <= b4.bp + 1e-9, 'BLEU brevity penalty applied: ' + b4.score.toFixed(3));

/* ---------- 11. POS ---------- */
const tagged = E.posTag(E.tokenize('The quick brown fox jumps over the lazy dog', { keepCase: true }));
eq(tagged.find((t) => t.token === 'The').tag, 'DT', 'POS The=DT');
eq(tagged.find((t) => t.token === 'over').tag, 'IN', 'POS over=IN');
ok(tagged.every((t) => t.tag && t.tag.length >= 1), 'POS every token tagged');

/* ---------- 12. NER ---------- */
const n = E.ner('Sadia moved to Dhaka in 2019 and joined Acme Corp for $5000.', {
  people: ['Sadia'], places: ['Dhaka', 'Bangladesh'], orgs: ['Acme Corp']
});
ok(n.spans.some((s) => s.label === 'DATE' && s.text === '2019'), 'NER date');
ok(n.spans.some((s) => s.label === 'MONEY'), 'NER money');
ok(n.spans.some((s) => s.label === 'GPE'), 'NER place');

/* ---------- 13. Readability / ngrams / misc ---------- */
const r = E.readability('The cat sat on the mat. The dog ran fast.');
ok(r.flesch > 0 && r.flesch < 120, 'readability range');
eq(E.ngrams(['a', 'b', 'c'], 2), [['a', 'b'], ['b', 'c']], 'bigrams');
eq(E.lemmatize('running'), 'run', 'lemma running->run');
eq(E.lemmatize('children'), 'child', 'lemma irregular');
eq(E.softmax([0, 0]).map((x) => +x.toFixed(4)), [0.5, 0.5], 'softmax uniform');

/* ---------- 13. Data integrity ---------- */
const D = globalThis.NLP.data;
ok(D.labs.length === 10, 'exactly 10 labs');
ok(D.quiz.length >= 25, 'quiz bank has 25+ questions');
ok(D.glossary.length >= 35, 'glossary has 35+ terms');
D.quiz.forEach((q) => {
  ok(q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length, 'quiz answer index valid: ' + q.q.slice(0, 40));
  ok(!!q.why && q.why.length > 10, 'quiz explanation present: ' + q.q.slice(0, 40));
});
D.labs.forEach((l) => {
  ok(!!l.learn && l.learn.length >= 3, 'lab has learn points: ' + l.id);
  ok(!!l.tagline && !!l.icon && !!l.num, 'lab has metadata: ' + l.id);
});
ok(Object.keys(D.sampleTexts).length >= 4, 'several sample texts');
ok(D.corpus.length >= 40, 'lm corpus has 40+ sentences');
ok(D.embedCorpus.length >= 40, 'embedding corpus has 40+ sentences');
ok(D.sentiment.length >= 50, 'sentiment corpus has 50+ examples');

// balanced classes
const pos = D.sentiment.filter((s) => s.label === 'positive').length;
const neg = D.sentiment.filter((s) => s.label === 'negative').length;
ok(pos === neg, 'sentiment classes balanced (' + pos + '/' + neg + ')');

// every expression snippet is non-trivial
Object.keys(D.python).forEach((k) => {
  ok(D.python[k].length > 200, 'python snippet present: ' + k);
});

/* ---------- 14. Sentiment corpus is actually learnable ---------- */
const prepSent = (docs) => docs.map((d) => ({
  tokens: E.tokenize(d.text, { keepCase: false }).filter((t) => !D.stopwords.includes(t) && !/^\W+$/.test(t)),
  label: d.label
}));
const sent = prepSent(D.sentiment);
function stratSplit(items, ratio, seed) {
  const rand = E.mulberry32(seed);
  const classes = Array.from(new Set(items.map((i) => i.label)));
  const train = [];
  const test = [];
  classes.forEach((c) => {
    const g = E.shuffle(items.filter((i) => i.label === c), rand);
    const n = Math.max(1, Math.round(g.length * ratio));
    test.push(...g.slice(0, n));
    train.push(...g.slice(n));
  });
  return { train: E.shuffle(train, rand), test: E.shuffle(test, rand) };
}
let accSum = 0;
let accN = 0;
for (let seed = 0; seed < 120; seed++) {
  const { train, test } = stratSplit(sent, 0.25, seed);
  const nb = new E.NaiveBayes({ alpha: 1 }).train(train);
  accSum += test.filter((t) => nb.predict(t.tokens).label === t.label).length / test.length;
  accN++;
}
const meanAcc = accSum / accN;
ok(meanAcc > 0.72, 'mean NB accuracy on sentiment corpus > 72% (got ' + (meanAcc * 100).toFixed(1) + '%)');

let loo = 0;
sent.forEach((it, i) => {
  const nb = new E.NaiveBayes({ alpha: 1 }).train(sent.filter((_, j) => j !== i));
  if (nb.predict(it.tokens).label === it.label) loo++;
});
ok(loo / sent.length > 0.8, 'leave-one-out accuracy > 80% (got ' + ((loo / sent.length) * 100).toFixed(1) + '%)');

/* ---------- 15. Concept embeddings satisfy every analogy ---------- */
const RAW = {};
Object.keys(D.embeddingWords).forEach((w) => {
  RAW[w] = E.conceptVector(w, D.embeddingAxes, D.concepts, D.embeddingWords, false);
});
D.analogyTriples.forEach(([a, b, c, expected]) => {
  const res = E.analogy(a, b, c, RAW);
  ok(res.ranked.length > 0 && res.ranked[0].word === expected,
    `analogy ${a} - ${b} + ${c} = ${expected} (got ${res.ranked[0] && res.ranked[0].word})`);
});
// every embedding word must reference real concepts and axes
Object.keys(D.embeddingWords).forEach((w) => {
  const spec = D.embeddingWords[w];
  ok(spec.length % 2 === 0, 'embedding spec is concept/weight pairs: ' + w);
  for (let i = 0; i < spec.length; i += 2) {
    ok(!!D.concepts[spec[i]], 'unknown concept "' + spec[i] + '" in ' + w);
    Object.keys(D.concepts[spec[i]]).forEach((axis) => {
      ok(D.embeddingAxes.includes(axis), 'concept "' + spec[i] + '" uses unknown axis "' + axis + '"');
    });
  }
});

/* ---------- 16. BPE corpus & merges ---------- */
const bpe2 = E.bpeTrain(Object.entries(D.bpeCorpus), { merges: 20 });
ok(bpe2.vocabulary.length > 30, 'bpe vocabulary grows');
ok(bpe2.merges.length === 20, 'bpe performs requested merges');

/* ---------- 17. POS / NER gazetteers ---------- */
Object.keys(D.gazetteer).forEach((k) => ok(D.gazetteer[k].length > 5, 'gazetteer list populated: ' + k));
Object.keys(D.posLexicon).forEach((k) => ok(typeof D.posLexicon[k] === 'string', 'pos lexicon entry: ' + k));

/* ---------- report ---------- */
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:\n' + failures.map((f, i) => `${i + 1}. ${f}`).join('\n'));
  process.exit(1);
}
