/* =====================================================================
   NLP Lab — engine.js
   A dependency-free "toy NLP toolkit" that powers every interactive demo.
   Everything is intentionally small enough to read, but faithful to the
   real algorithms: Porter stemmer, TF-IDF, Naive Bayes, n-gram LMs,
   BPE, scaled dot-product attention and BLEU.
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = (root.NLP = root.NLP || {});

  /* ------------------------------------------------------------------ */
  /* Small utilities                                                     */
  /* ------------------------------------------------------------------ */

  const round = (n, d = 3) => {
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function softmax(logits) {
    const max = Math.max.apply(null, logits);
    const ex = logits.map((v) => Math.exp(v - max));
    const sum = ex.reduce((a, b) => a + b, 0) || 1;
    return ex.map((v) => v / sum);
  }

  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const dot = (a, b) => a.reduce((s, v, i) => s + v * (b[i] || 0), 0);
  const norm = (v) => Math.sqrt(dot(v, v)) || 1;
  const normalizeVec = (v) => {
    const n = norm(v);
    return v.map((x) => x / n);
  };

  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function tally(items) {
    const m = new Map();
    for (const it of items) m.set(it, (m.get(it) || 0) + 1);
    return m;
  }

  function sortedEntries(map, limit) {
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
    return limit ? arr.slice(0, limit) : arr;
  }

  /* ------------------------------------------------------------------ */
  /* Tokenisation & normalisation                                        */
  /* ------------------------------------------------------------------ */

  // Words (incl. contractions and hyphenated compounds) OR single symbols.
  const TOKEN_RE = /[A-Za-z0-9\u00C0-\u024F]+(?:['\u2019][A-Za-z0-9\u00C0-\u024F]+)*(?:-[A-Za-z0-9\u00C0-\u024F]+)*|[^\s]/g;

  function tokenize(text, opts = {}) {
    if (!text) return [];
    const keepCase = !!opts.keepCase;
    const keepPunct = opts.keepPunct !== false;
    let t = String(text).replace(/\s+/g, ' ').trim();
    const found = t.match(TOKEN_RE) || [];
    if (!keepCase) t = t.toLowerCase();
    const out = [];
    for (let tok of t.match(TOKEN_RE) || found) {
      const isPunct = /^[^\w\u00C0-\u024F]$/.test(tok) && !/['\u2019-]/.test(tok);
      if (!keepPunct && isPunct) continue;
      out.push(keepCase ? tok : tok.toLowerCase());
    }
    return out;
  }

  // Split into sentences without a lookbehind regex (works everywhere).
  function sentences(text) {
    const src = String(text).replace(/\s+/g, ' ').trim();
    if (!src) return [];
    const out = [];
    let buf = '';
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      buf += ch;
      const end = /[.!?\u2026]/.test(ch);
      const next = src[i + 1];
      if (end && (next === undefined || next === ' ' || next === '"' || next === "'")) {
        // Avoid splitting on common abbreviations / decimals.
        const trimmed = buf.trim();
        if (/\b(?:Mr|Mrs|Ms|Dr|Prof|vs|etc|e\.g|i\.e|U\.S|St)\.$/.test(trimmed)) continue;
        if (/\b[A-Z]\.$/.test(trimmed)) continue;
        out.push(trimmed);
        buf = '';
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function stripAccents(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const PUNCT_RE = /^[^\w\u00C0-\u024F]+$/;
  const isPunctToken = (t) => PUNCT_RE.test(t);
  const stopwordFilter = (tokens, stops) => tokens.filter((t) => !stops.has(t) && !isPunctToken(t));

  function normalizeWhitespace(s) {
    return String(s).replace(/\s+/g, ' ').trim();
  }

  /* ------------------------------------------------------------------ */
  /* Porter stemmer (M.F. Porter, 1980) — canonical implementation       */
  /* ------------------------------------------------------------------ */

  const step2list = {
    ational: 'ate', tional: 'tion', enci: 'ence', anci: 'ance', izer: 'ize',
    bli: 'ble', alli: 'al', entli: 'ent', eli: 'e', ousli: 'ous',
    ization: 'ize', ation: 'ate', ator: 'ate', alism: 'al', iveness: 'ive',
    fulness: 'ful', ousness: 'ous', aliti: 'al', iviti: 'ive', biliti: 'ble',
    logi: 'log'
  };
  const step3list = {
    icate: 'ic', ative: '', alize: 'al', iciti: 'ic', ical: 'ic', ful: '', ness: ''
  };

  const c = '[^aeiou]';
  const v = '[aeiouy]';
  const C = c + '[^aeiouy]*';
  const V = v + '[aeiou]*';
  const mgr0 = '^(' + C + ')?' + V + C; // m > 0
  const meq1 = '^(' + C + ')?' + V + C + '(' + V + ')?$'; // m = 1
  const mgr1 = '^(' + C + ')?' + V + C + V + C; // m > 1
  const s_v = '^(' + C + ')?' + v; // stem contains a vowel

  /**
   * @param {string} w0 word to stem
   * @param {Array} [trace] optional array; receives {step,label,from,to} entries
   */
  function porterStem(w0, trace) {
    if (!w0 || w0.length < 3) return w0 || '';
    let w = w0;
    let stem, suffix, fp, re, re2, re3, re4;
    const tr = trace || null;
    // Record a change so the UI can explain what each rule did.
    const put = (label, next) => {
      if (tr && next !== w) tr.push({ label, from: w, to: next });
      w = next;
    };
    const firstch = w[0];
    if (firstch === 'y') w = 'Y' + w.substr(1);

    re = /^(.+?)(ss|i)es$/;
    re2 = /^(.+?)([^s])s$/;
    if (re.test(w)) put('Step 1a — plural (ss|i)es → \\1\\2', w.replace(re, '$1$2'));
    else if (re2.test(w)) put('Step 1a — plural ([^s])s → \\1\\2', w.replace(re2, '$1$2'));

    re = /^(.+?)eed$/;
    re2 = /^(.+?)(ed|ing)$/;
    if (re.test(w)) {
      fp = re.exec(w);
      re = new RegExp(mgr0);
      if (re.test(fp[1])) put('Step 1b — eed → ee (m > 0)', w.replace(/.$/, ''));
    } else if (re2.test(w)) {
      fp = re2.exec(w);
      stem = fp[1];
      re2 = new RegExp(s_v);
      if (re2.test(stem)) {
        put('Step 1b — drop ed/ing (stem has a vowel)', stem);
        re2 = /(at|bl|iz)$/;
        re3 = new RegExp('([^aeiouylsz])\\1$');
        re4 = new RegExp('^' + C + v + '[^aeiouwxy]$');
        if (re2.test(w)) put('Step 1b — add e back (at|bl|iz)', w + 'e');
        else if (re3.test(w)) put('Step 1b — undo double consonant', w.replace(/.$/, ''));
        else if (re4.test(w)) put('Step 1b — CVC → add e', w + 'e');
      }
    }

    re = /^(.+?)y$/;
    if (re.test(w)) {
      fp = re.exec(w);
      stem = fp[1];
      re = new RegExp(s_v);
      if (re.test(stem)) put('Step 1c — y → i (stem has a vowel)', stem + 'i');
    }

    re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
    if (re.test(w)) {
      fp = re.exec(w);
      stem = fp[1];
      suffix = fp[2];
      re = new RegExp(mgr0);
      if (re.test(stem)) put('Step 2 — ' + suffix + ' → ' + step2list[suffix] + ' (m > 0)', stem + step2list[suffix]);
    }

    re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
    if (re.test(w)) {
      fp = re.exec(w);
      stem = fp[1];
      suffix = fp[2];
      re = new RegExp(mgr0);
      if (re.test(stem)) put('Step 3 — ' + suffix + ' → ' + (step3list[suffix] || '∅') + ' (m > 0)', stem + step3list[suffix]);
    }

    re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
    re2 = /^(.+?)(s|t)(ion)$/;
    if (re.test(w)) {
      fp = re.exec(w);
      stem = fp[1];
      re = new RegExp(mgr1);
      if (re.test(stem)) put('Step 4 — drop ' + fp[2] + ' (m > 1)', stem);
    } else if (re2.test(w)) {
      fp = re2.exec(w);
      stem = fp[1] + fp[2];
      re2 = new RegExp(mgr1);
      if (re2.test(stem)) put('Step 4 — drop (s|t)ion (m > 1)', stem);
    }

    re = /^(.+?)e$/;
    if (re.test(w)) {
      fp = re.exec(w);
      stem = fp[1];
      re = new RegExp(mgr1);
      re2 = new RegExp(meq1);
      re3 = new RegExp('^' + C + v + '[^aeiouwxy]$');
      if (re.test(stem) || (re2.test(stem) && !re3.test(stem))) put('Step 5a — drop final e (m > 1)', stem);
    }

    re = /ll$/;
    re2 = new RegExp(mgr1);
    if (re.test(w) && re2.test(w)) put('Step 5b — ll → l (m > 1)', w.replace(/.$/, ''));

    if (firstch === 'y') w = 'y' + w.substr(1);
    return w;
  }

  /** Returns the ordered list of changes the Porter rules made to `word`. */
  function porterTrace(word) {
    const trace = [];
    const out = porterStem(String(word).toLowerCase(), trace);
    return { input: String(word).toLowerCase(), output: out, steps: trace };
  }

  /* ------------------------------------------------------------------ */
  /* A tiny rule-based lemmatiser (to contrast with stemming)            */
  /* ------------------------------------------------------------------ */

  const IRREGULAR = {
    be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
    have: ['has', 'had', 'having'],
    do: ['does', 'did', 'done', 'doing'],
    go: ['went', 'gone', 'goes'],
    say: ['said', 'says'],
    make: ['made', 'makes'],
    take: ['took', 'taken'],
    come: ['came'],
    see: ['saw', 'seen'],
    know: ['knew', 'known'],
    get: ['got', 'gotten'],
    give: ['gave', 'given'],
    find: ['found'],
    think: ['thought'],
    tell: ['told'],
    become: ['became'],
    leave: ['left'],
    feel: ['felt'],
    put: ['put'],
    bring: ['brought'],
    begin: ['began', 'begun'],
    keep: ['kept'],
    hold: ['held'],
    write: ['wrote', 'written'],
    stand: ['stood'],
    hear: ['heard'],
    let: ['let'],
    mean: ['meant'],
    set: ['set'],
    meet: ['met'],
    run: ['ran'],
    pay: ['paid'],
    sit: ['sat'],
    speak: ['spoke', 'spoken'],
    lie: ['lay', 'lain'],
    lead: ['led'],
    read: ['read'],
    grow: ['grew', 'grown'],
    lose: ['lost'],
    fall: ['fell', 'fallen'],
    send: ['sent'],
    build: ['built'],
    understand: ['understood'],
    draw: ['drew', 'drawn'],
    break: ['broke', 'broken'],
    spend: ['spent'],
    cut: ['cut'],
    rise: ['rose', 'risen'],
    drive: ['drove', 'driven'],
    buy: ['bought'],
    wear: ['wore', 'worn'],
    choose: ['chose', 'chosen'],
    eat: ['ate', 'eaten'],
    drink: ['drank', 'drunk'],
    teach: ['taught'],
    catch: ['caught'],
    throw: ['threw', 'thrown'],
    sleep: ['slept'],
    win: ['won'],
    sing: ['sang', 'sung'],
    swim: ['swam', 'swum'],
    child: ['children'],
    person: ['people'],
    man: ['men'],
    woman: ['women'],
    mouse: ['mice'],
    foot: ['feet'],
    tooth: ['teeth'],
    goose: ['geese'],
    good: ['better', 'best'],
    bad: ['worse', 'worst'],
    much: ['more', 'most'],
    far: ['further', 'farthest']
  };
  const LEMMA_LOOKUP = (() => {
    const m = {};
    for (const lemma in IRREGULAR) IRREGULAR[lemma].forEach((form) => (m[form] = lemma));
    return m;
  })();

  function lemmatize(word) {
    const w = String(word).toLowerCase();
    if (!w) return w;
    if (LEMMA_LOOKUP[w]) return LEMMA_LOOKUP[w];
    if (w.length <= 3) return w;
    if (/(ss|us|is)$/.test(w)) return w;
    if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
    if (/(ches|shes|xes|zes|ses)$/.test(w)) return w.slice(0, -2);
    if (/ves$/.test(w)) return w.slice(0, -3) + 'f';
    if (/(ing|ed)$/.test(w) && w.length > 4) {
      let base = w.replace(/(ing|ed)$/, '');
      if (/([b-df-hj-np-tv-z])\1$/.test(base)) base = base.slice(0, -1);
      if (/(at|bl|iz)$/.test(base)) base += 'e';
      return base;
    }
    if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }

  /* ------------------------------------------------------------------ */
  /* Pre-processing pipeline                                             */
  /* ------------------------------------------------------------------ */

  function preprocess(text, opts = {}) {
    const stops = new Set((opts.stopwords || []).map((s) => s.toLowerCase()));
    const steps = [];
    let current = tokenize(text, { keepCase: true, keepPunct: true });
    steps.push({ key: 'tokenize', label: 'Tokenize', tokens: current.slice(), note: current.length + ' raw tokens' });

    if (opts.lowercase) {
      current = current.map((t) => t.toLowerCase());
      steps.push({ key: 'lowercase', label: 'Lowercase', tokens: current.slice(), note: 'case folded' });
    }
    if (opts.removePunct) {
      current = current.filter((t) => !isPunctToken(t));
      steps.push({ key: 'punct', label: 'Remove punctuation', tokens: current.slice(), note: 'symbols dropped' });
    }
    if (opts.removeNumbers) {
      current = current.filter((t) => !/^\d+$/.test(t));
      steps.push({ key: 'numbers', label: 'Remove numbers', tokens: current.slice(), note: 'digits dropped' });
    }
    if (opts.stopwords && opts.stopwords.length) {
      const before = current.length;
      current = current.filter((t) => !stops.has(t.toLowerCase()));
      steps.push({ key: 'stop', label: 'Remove stop words', tokens: current.slice(), note: before - current.length + ' removed' });
    }
    if (opts.stem) {
      current = current.map((t) => (isPunctToken(t) ? t : porterStem(t.toLowerCase())));
      steps.push({ key: 'stem', label: 'Stem (Porter)', tokens: current.slice(), note: 'suffix stripping' });
    } else if (opts.lemma) {
      current = current.map((t) => (isPunctToken(t) ? t : lemmatize(t)));
      steps.push({ key: 'lemma', label: 'Lemmatize', tokens: current.slice(), note: 'dictionary + rules' });
    }
    return steps;
  }

  /* ------------------------------------------------------------------ */
  /* Vector-space models: BoW, TF-IDF, similarity                        */
  /* ------------------------------------------------------------------ */

  function ngrams(tokens, n) {
    const out = [];
    for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n));
    return out;
  }

  function ngramKey(g) {
    return g.join(' ');
  }

  function termCounts(tokens) {
    return tally(tokens);
  }

  /**
   * Build a document-term matrix.
   * @returns {{docs:string[], vocab:string[], df:number[], idf:number[],
   *            tf:number[][], tfidf:number[][], raw:number[][]}}
   */
  function tfidfMatrix(docs, opts = {}) {
    const stops = new Set((opts.stopwords || []).map((s) => s.toLowerCase()));
    const prepped = docs.map((d) => {
      let toks = tokenize(d, { keepCase: false });
      if (opts.removeStopwords !== false) toks = stopwordFilter(toks, stops);
      if (opts.stem) toks = toks.map(porterStem);
      return toks;
    });
    const dfMap = new Map();
    const tfMaps = prepped.map((toks) => {
      const m = tally(toks);
      for (const w of m.keys()) dfMap.set(w, (dfMap.get(w) || 0) + 1);
      return m;
    });
    const vocab = Array.from(dfMap.keys()).sort((a, b) => dfMap.get(b) - dfMap.get(a) || a.localeCompare(b));
    const index = new Map(vocab.map((w, i) => [w, i]));
    const N = docs.length;
    const df = vocab.map((w) => dfMap.get(w) || 0);
    // Smooth IDF (as in scikit-learn's TfidfTransformer).
    const idf = df.map((d) => Math.log((1 + N) / (1 + d)) + 1);
    const tf = tfMaps.map((m) => vocab.map((w) => m.get(w) || 0));
    let tfidf = tf.map((row) => row.map((v, j) => v * idf[j]));
    if (opts.l2 !== false) {
      tfidf = tfidf.map((row) => {
        const n = norm(row);
        return row.map((v) => (n ? v / n : 0));
      });
    }
    return { docs, stems: prepped, vocab, df, idf, tf, tfidf, raw: tf };
  }

  function vectorFromTokens(tokens, model) {
    const idx = new Map(model.vocab.map((w, i) => [w, i]));
    const v = new Array(model.vocab.length).fill(0);
    tokens.forEach((t) => {
      const i = idx.get(t);
      if (i !== undefined) v[i] += model.idf[i];
    });
    const n = norm(v);
    return n ? v.map((x) => x / n) : v;
  }

  function cosine(a, b) {
    const d = dot(a, b);
    const na = norm(a);
    const nb = norm(b);
    return !na || !nb ? 0 : d / (na * nb);
  }

  function jaccard(a, b) {
    const A = new Set(a);
    const B = new Set(b);
    let inter = 0;
    A.forEach((x) => { if (B.has(x)) inter++; });
    const union = A.size + B.size - inter;
    return union ? inter / union : 0;
  }

  /* ------------------------------------------------------------------ */
  /* Edit distance with an alignment trace                               */
  /* ------------------------------------------------------------------ */

  function levenshtein(a, b, opts = {}) {
    const s = Array.from(a);
    const t = Array.from(b);
    const m = s.length;
    const n = t.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    if (!opts.align) return dp[m][n];
    // Backtrace
    const ops = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1)) {
        ops.push({ op: s[i - 1] === t[j - 1] ? 'match' : 'sub', a: s[i - 1], b: t[j - 1] });
        i--; j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        ops.push({ op: 'del', a: s[i - 1], b: '_' });
        i--;
      } else {
        ops.push({ op: 'ins', a: '_', b: t[j - 1] });
        j--;
      }
    }
    return { distance: dp[m][n], ops: ops.reverse(), matrix: dp };
  }

  /* ------------------------------------------------------------------ */
  /* Multinomial Naive Bayes                                             */
  /* ------------------------------------------------------------------ */

  class NaiveBayes {
    constructor(opts = {}) {
      this.alpha = opts.alpha == null ? 1 : opts.alpha;
      this.classes = [];
      this.priors = {};
      this.wordCounts = {};
      this.totals = {};
      this.vocab = new Set();
      this.docCounts = {};
      this.trainSize = 0;
    }

    train(docs) {
      // docs: [{tokens, label}]
      this.classes = Array.from(new Set(docs.map((d) => d.label)));
      this.trainSize = docs.length;
      for (const c of this.classes) {
        this.wordCounts[c] = new Map();
        this.totals[c] = 0;
        this.docCounts[c] = 0;
      }
      for (const d of docs) {
        this.docCounts[d.label]++;
        for (const w of d.tokens) {
          this.vocab.add(w);
          this.wordCounts[d.label].set(w, (this.wordCounts[d.label].get(w) || 0) + 1);
          this.totals[d.label]++;
        }
      }
      for (const c of this.classes) this.priors[c] = Math.log(this.docCounts[c] / docs.length);
      this.V = this.vocab.size;
      return this;
    }

    logLikelihood(word, c) {
      const count = this.wordCounts[c].get(word) || 0;
      return Math.log((count + this.alpha) / (this.totals[c] + this.alpha * (this.V || 1)));
    }

    predict(tokens) {
      const scores = {};
      const seen = tokens.filter((t) => !/^\W+$/.test(t));
      for (const c of this.classes) {
        let s = this.priors[c];
        for (const w of seen) s += this.logLikelihood(w, c);
        scores[c] = s;
      }
      const labels = this.classes;
      const logits = labels.map((c) => scores[c]);
      const post = softmax(logits);
      const posterior = {};
      labels.forEach((c, i) => (posterior[c] = post[i]));
      // Per-token evidence toward the winning class.
      const best = labels.reduce((a, b) => (scores[a] >= scores[b] ? a : b));
      const others = labels.filter((c) => c !== best);
      const contributions = [];
      const seenSet = new Set();
      for (const w of seen) {
        if (seenSet.has(w)) continue;
        seenSet.add(w);
        const lb = this.logLikelihood(w, best);
        const lo = Math.max.apply(null, others.map((c) => this.logLikelihood(w, c)));
        contributions.push({ word: w, delta: lb - lo, count: seen.filter((x) => x === w).length });
      }
      contributions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      return {
        label: best,
        posterior,
        scores,
        contributions,
        unseen: Array.from(new Set(seen.filter((w) => !this.vocab.has(w))))
      };
    }

    topFeatures(className, n = 12) {
      const others = this.classes.filter((c) => c !== className);
      const arr = [];
      for (const w of this.vocab) {
        const a = this.logLikelihood(w, className);
        const b = Math.max.apply(null, others.map((c) => this.logLikelihood(w, c)));
        arr.push({ word: w, weight: a - b, count: this.wordCounts[className].get(w) || 0 });
      }
      arr.sort((x, y) => y.weight - x.weight);
      return arr.slice(0, n);
    }
  }

  /* ------------------------------------------------------------------ */
  /* N-gram language model                                               */
  /* ------------------------------------------------------------------ */

  function ngramLM(tokens, n, opts = {}) {
    const k = opts.k == null ? 0.1 : opts.k;
    const BOS = '<s>';
    const EOS = '</s>';
    const padded = [];
    for (let i = 0; i < n - 1; i++) padded.push(BOS);
    tokens.forEach((t) => padded.push(t));
    padded.push(EOS);

    const counts = new Map(); // context -> Map(word -> count)
    const contextTotals = new Map();
    const wordSet = new Set(tokens);
    wordSet.add(EOS);
    const V = wordSet.size;
    for (let i = n - 1; i < padded.length; i++) {
      const ctx = padded.slice(i - n + 1, i);
      const key = ctx.join(' ');
      const w = padded[i];
      if (!counts.has(key)) counts.set(key, new Map());
      const m = counts.get(key);
      m.set(w, (m.get(w) || 0) + 1);
      contextTotals.set(key, (contextTotals.get(key) || 0) + 1);
    }

    function prob(ctxArr, w) {
      const key = ctxArr.slice(-(n - 1)).join(' ');
      if (n === 1) {
        const total = padded.length;
        const cnt = counts.get('') ? counts.get('').get(w) || 0 : 0;
        return (cnt + k) / (total + k * V);
      }
      const m = counts.get(key) || new Map();
      const total = contextTotals.get(key) || 0;
      return ((m.get(w) || 0) + k) / (total + k * V);
    }

    function nextWords(ctxArr, limit = 8) {
      const key = n === 1 ? '' : ctxArr.slice(-(n - 1)).join(' ');
      const m = counts.get(key) || new Map();
      const total = contextTotals.get(key) || 0;
      const arr = [];
      // Show observed continuations plus the top vocabulary words as smoothed candidates.
      const candidates = new Set(Array.from(m.keys()));
      if (arr.length < limit) {
        sortedEntries(new Map([[EOS, 0]])).forEach(() => {});
      }
      for (const w of candidates) arr.push({ word: w, p: ((m.get(w) || 0) + k) / (total + k * V), count: m.get(w) || 0 });
      arr.sort((a, b) => b.p - a.p);
      return { context: key, total, items: arr.slice(0, limit), V };
    }

    function perplexity(evalTokens) {
      const seq = [];
      for (let i = 0; i < n - 1; i++) seq.push(BOS);
      evalTokens.forEach((t) => seq.push(t));
      seq.push(EOS);
      let logp = 0;
      let count = 0;
      for (let i = n - 1; i < seq.length; i++) {
        const ctxArr = seq.slice(i - n + 1, i);
        logp += Math.log(prob(ctxArr, seq[i]));
        count++;
      }
      return { ppl: Math.exp(-logp / count), tokens: count, logp };
    }

    return { n, k, counts, contextTotals, prob, nextWords, perplexity, V, padded };
  }

  function sampleFrom(items, rand) {
    const total = sum(items.map((i) => i.p));
    let r = rand() * total;
    for (const it of items) {
      r -= it.p;
      if (r <= 0) return it.word;
    }
    return items[items.length - 1].word;
  }

  /* ------------------------------------------------------------------ */
  /* Byte-Pair Encoding                                                  */
  /* ------------------------------------------------------------------ */

  function bpeTrain(wordFreqs, opts = {}) {
    const numMerges = opts.merges == null ? 10 : opts.merges;
    // words: Map<string, number> or array of [word, freq]
    const entries = wordFreqs instanceof Map ? Array.from(wordFreqs.entries()) : wordFreqs;
    let corpus = entries.map(([w, f]) => ({ symbols: Array.from(w).concat(['</w>']), freq: f }));
    const merges = [];
    const steps = [];
    for (let step = 0; step < numMerges; step++) {
      const pairCounts = new Map();
      for (const item of corpus) {
        for (let i = 0; i < item.symbols.length - 1; i++) {
          const key = item.symbols[i] + '\u0000' + item.symbols[i + 1];
          pairCounts.set(key, (pairCounts.get(key) || 0) + item.freq);
        }
      }
      if (!pairCounts.size) break;
      const ranked = Array.from(pairCounts.entries()).sort((a, b) => b[1] - a[1]);
      const [bestPair, bestCount] = ranked[0];
      const [a, b] = bestPair.split('\u0000');
      const merged = a + b;
      corpus = corpus.map((item) => {
        const out = [];
        let i = 0;
        while (i < item.symbols.length) {
          if (i < item.symbols.length - 1 && item.symbols[i] === a && item.symbols[i + 1] === b) {
            out.push(merged);
            i += 2;
          } else {
            out.push(item.symbols[i]);
            i++;
          }
        }
        return { symbols: out, freq: item.freq };
      });
      merges.push([a, b]);
      steps.push({
        step: step + 1,
        pair: [a, b],
        merged,
        count: bestCount,
        candidates: ranked.slice(0, 6).map(([k, v]) => {
          const parts = k.split('\u0000');
          return { pair: parts, count: v };
        }),
        vocabulary: vocabularyOf(corpus, merges),
        corpus: corpus.map((c) => ({ word: c.symbols.join(' '), symbols: c.symbols.slice(), freq: c.freq }))
      });
    }
    return { merges, steps, corpus, vocabulary: vocabularyOf(corpus, merges) };
  }

  function vocabularyOf(corpus, merges) {
    const set = new Set();
    corpus.forEach((c) => c.symbols.forEach((s) => set.add(s)));
    merges.forEach(([a, b]) => set.add(a + b));
    return Array.from(set);
  }

  function bpeEncode(word, merges) {
    let symbols = Array.from(word).concat(['</w>']);
    const trace = [];
    for (const [a, b] of merges) {
      const out = [];
      let i = 0;
      let applied = false;
      while (i < symbols.length) {
        if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) {
          out.push(a + b);
          i += 2;
          applied = true;
        } else {
          out.push(symbols[i]);
          i++;
        }
      }
      if (applied) {
        symbols = out;
        trace.push({ merge: a + ' + ' + b, symbols: out.slice() });
      }
    }
    return { tokens: symbols, trace };
  }

  /* ------------------------------------------------------------------ */
  /* Attention (scaled dot-product, multi-head)                          */
  /* ------------------------------------------------------------------ */

  function charEmbedding(token, dim) {
    // Deterministic "toy" embedding from character trigrams + whole word.
    const vec = new Array(dim).fill(0);
    const w = '#' + token.toLowerCase() + '#';
    const grams = [w];
    for (let i = 0; i < w.length - 2; i++) grams.push(w.slice(i, i + 3));
    for (const g of grams) {
      let h = 2166136261;
      for (let i = 0; i < g.length; i++) {
        h ^= g.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      for (let j = 0; j < dim; j++) {
        const bit = (h >>> (j % 31)) & 1;
        vec[j] += bit ? 1 : -1;
      }
    }
    return normalizeVec(vec);
  }

  function positionalEncoding(pos, dim) {
    const v = new Array(dim).fill(0);
    for (let i = 0; i < dim; i += 2) {
      const div = Math.pow(10000, i / dim);
      v[i] = Math.sin(pos / div);
      if (i + 1 < dim) v[i + 1] = Math.cos(pos / div);
    }
    return v;
  }

  function attentionDemo(tokens, opts = {}) {
    const dim = opts.dim || 16;
    const heads = opts.heads || 2;
    const causal = !!opts.causal;
    const sharp = opts.sharp == null ? 1 : opts.sharp;
    const posWeight = opts.posWeight == null ? 0.6 : opts.posWeight;
    const seed = opts.seed || 42;
    const rand = mulberry32(seed);
    const n = tokens.length;
    const dk = dim / heads;

    const X = tokens.map((t, i) => {
      const e = charEmbedding(t, dim);
      const p = positionalEncoding(i, dim);
      return normalizeVec(e.map((v, j) => v + posWeight * p[j]));
    });

    const W = [];
    for (let h = 0; h < heads; h++) {
      const mk = () => {
        const mat = [];
        for (let i = 0; i < dim; i++) mat.push(Array.from({ length: dk }, () => (rand() * 2 - 1) / Math.sqrt(dim)));
        return mat;
      };
      W.push({ q: mk(), k: mk(), v: mk() });
    }
    const proj = (vec, mat) => {
      const out = new Array(mat[0].length).fill(0);
      for (let i = 0; i < vec.length; i++) {
        const vi = vec[i];
        for (let j = 0; j < out.length; j++) out[j] += vi * mat[i][j];
      }
      return out;
    };

    const headData = W.map((w, h) => {
      const Q = X.map((x) => proj(x, w.q));
      const K = X.map((x) => proj(x, w.k));
      const V = X.map((x) => proj(x, w.v));
      const A = [];
      for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
          let s = dot(Q[i], K[j]) / Math.sqrt(dk);
          if (causal && j > i) s = -Infinity;
          row.push(s * sharp);
        }
        A.push(softmax(row));
      }
      const out = A.map((row) => {
        const o = new Array(dk).fill(0);
        row.forEach((a, j) => {
          if (!a) return;
          for (let d = 0; d < dk; d++) o[d] += a * V[j][d];
        });
        return o;
      });
      return { head: h, Q, K, V, A, out, dk };
    });

    return { tokens, dim, heads, dk, causal, X, headsData: headData, sharp, posWeight };
  }

  /* ------------------------------------------------------------------ */
  /* BLEU                                                                */
  /* ------------------------------------------------------------------ */

  function bleu(candidate, references, opts = {}) {
    const requestedN = opts.maxN || 4;
    const cand = tokenize(candidate, { keepCase: false }).filter((t) => !PUNCT_RE.test(t));
    const refs = references.map((r) => tokenize(r, { keepCase: false }).filter((t) => !PUNCT_RE.test(t)));
    if (!cand.length) return { score: 0, precisions: [], bp: 0, ratios: [], orders: 0 };
    // Short sentences simply have no high-order n-grams; scoring them 0 is
    // technically correct but useless in a classroom. We use orders that exist
    // and report how many were used (shown in the UI).
    const maxN = Math.max(1, Math.min(requestedN, cand.length));
    const cLen = cand.length;
    let bestLen = Infinity;
    for (const r of refs) {
      const rl = r.length;
      if (Math.abs(rl - cLen) < Math.abs(bestLen - cLen) || (Math.abs(rl - cLen) === Math.abs(bestLen - cLen) && rl < bestLen)) bestLen = rl;
    }
    const bp = cLen > bestLen ? 1 : Math.exp(1 - bestLen / cLen);
    const precisions = [];
    const ratios = [];
    for (let n = 1; n <= maxN; n++) {
      const candGrams = ngrams(cand, n).map(ngramKey);
      if (!candGrams.length) {
        precisions.push(0);
        ratios.push({ n, match: 0, total: 0 });
        continue;
      }
      let match = 0;
      const refCounts = refs.map((r) => {
        const m = new Map();
        ngrams(r, n).map(ngramKey).forEach((g) => m.set(g, (m.get(g) || 0) + 1));
        return m;
      });
      const candCounts = new Map();
      candGrams.forEach((g) => candCounts.set(g, (candCounts.get(g) || 0) + 1));
      for (const [g, cnt] of candCounts) {
        let maxRef = 0;
        for (const m of refCounts) maxRef = Math.max(maxRef, m.get(g) || 0);
        match += Math.min(cnt, maxRef);
      }
      precisions.push(match / candGrams.length);
      ratios.push({ n, match, total: candGrams.length, p: match / candGrams.length });
    }
    let score = 0;
    if (precisions.every((p) => p > 0)) {
      score = bp * Math.exp(sum(precisions.map((p) => Math.log(p))) / precisions.length);
    }
    return { score, precisions, bp, ratios, candLen: cLen, refLen: bestLen, orders: maxN };
  }

  /* ------------------------------------------------------------------ */
  /* Rule-based POS tagger                                               */
  /* ------------------------------------------------------------------ */

  const PUNCT_TAG = '.';
  const CLOSED = {
    the: 'DT', a: 'DT', an: 'DT', this: 'DT', that: 'DT', these: 'DT', those: 'DT', every: 'DT', each: 'DT',
    'i': 'PRP', you: 'PRP', he: 'PRP', she: 'PRP', it: 'PRP', we: 'PRP', they: 'PRP', me: 'PRP', him: 'PRP',
    her: 'PRP', us: 'PRP', them: 'PRP', my: 'PRP$', your: 'PRP$', his: 'PRP$', our: 'PRP$', their: 'PRP$', its: 'PRP$',
    is: 'VBZ', are: 'VBP', am: 'VBP', was: 'VBD', were: 'VBD', be: 'VB', been: 'VBN', being: 'VBG',
    have: 'VBP', has: 'VBZ', had: 'VBD', do: 'VBP', does: 'VBZ', did: 'VBD',
    will: 'MD', would: 'MD', can: 'MD', could: 'MD', shall: 'MD', should: 'MD', may: 'MD', might: 'MD', must: 'MD',
    and: 'CC', or: 'CC', but: 'CC', nor: 'CC', so: 'CC', yet: 'CC',
    in: 'IN', on: 'IN', at: 'IN', by: 'IN', for: 'IN', with: 'IN', about: 'IN', against: 'IN', between: 'IN',
    into: 'IN', through: 'IN', during: 'IN', before: 'IN', after: 'IN', above: 'IN', below: 'IN', to: 'TO', of: 'IN',
    from: 'IN', up: 'IN', down: 'IN', over: 'IN', under: 'IN', again: 'RB', as: 'IN', than: 'IN',
    not: 'RB', "n't": 'RB', very: 'RB', too: 'RB', also: 'RB', just: 'RB', only: 'RB', well: 'RB', quite: 'RB',
    there: 'EX', here: 'RB', when: 'WRB', where: 'WRB', why: 'WRB', how: 'WRB', who: 'WP', whom: 'WP', what: 'WP', which: 'WDT',
    if: 'IN', because: 'IN', while: 'IN', although: 'IN', though: 'IN', since: 'IN', unless: 'IN', whether: 'IN',
    no: 'DT', all: 'DT', some: 'DT', any: 'DT', both: 'DT', more: 'JJR', most: 'JJS', other: 'JJ', such: 'JJ',
    one: 'CD', two: 'CD', three: 'CD', four: 'CD', five: 'CD', first: 'JJ', second: 'JJ', last: 'JJ', new: 'JJ',
    good: 'JJ', great: 'JJ', bad: 'JJ', big: 'JJ', small: 'JJ', long: 'JJ', short: 'JJ', high: 'JJ', low: 'JJ',
    many: 'JJ', much: 'JJ', few: 'JJ', several: 'JJ', own: 'JJ', same: 'JJ', different: 'JJ', important: 'JJ'
  };

  const NOUN_SUFFIX = /(tion|sion|ment|ness|ity|ship|hood|ism|ist|ance|ence|er|or|ee|age|ery|ary|ing)$/;
  const ADJ_SUFFIX = /(able|ible|al|ful|less|ous|ive|ic|ish|ary|y)$/;
  const VERB_SUFFIX = /(ate|ify|ise|ize|en)$/;

  function guessTag(word) {
    const w = word.toLowerCase();
    if (/^\d+([.,]\d+)?$/.test(w)) return 'CD';
    if (/^[^\w]+$/.test(w)) return PUNCT_TAG;
    if (/^(ly)$/.test(w.slice(-2)) && w.length > 4) return 'RB';
    if (/(ed)$/.test(w)) return 'VBD';
    if (/(ing)$/.test(w)) return 'VBG';
    if (/(est)$/.test(w)) return 'JJS';
    if (/(er)$/.test(w) && w.length > 4) return 'JJR';
    if (/(s)$/.test(w) && !/(ss|us|is)$/.test(w)) return 'NNS';
    if (VERB_SUFFIX.test(w)) return 'VB';
    if (NOUN_SUFFIX.test(w)) return 'NN';
    if (ADJ_SUFFIX.test(w)) return 'JJ';
    return 'NN';
  }

  /**
   * Small lexicon + context rules. Good enough to *learn* the idea,
   * not a replacement for a trained tagger.
   */
  function posTag(tokens, lexicon) {
    const lex = lexicon || {};
    const raw = tokens.map((t) => {
      const lower = t.toLowerCase();
      const entry = lex[lower] || CLOSED[lower];
      if (entry) return Array.isArray(entry) ? entry : [entry];
      return null;
    });
    const tags = tokens.map((t, i) => {
      if (raw[i]) return raw[i][0];
      return guessTag(t);
    });
    // Context fixes
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i].toLowerCase();
      const prev = tokens[i - 1] ? tokens[i - 1].toLowerCase() : '';
      if (w === 'to' && i + 1 < tokens.length) {
        const nxt = tokens[i + 1].toLowerCase();
        if (!/^(the|a|an|his|her|their|our|my|your)$/.test(nxt)) tags[i + 1] = 'VB';
      }
      if (prev === 'very' || prev === 'really' || prev === 'so' || prev === 'too') {
        if (!raw[i] || /^(NN|VB)/.test(tags[i])) tags[i] = 'JJ';
      }
      if (/^(DT|PRP\$|JJ)$/.test(tags[i - 1] || '') && tags[i] === 'NN' && /ing$/.test(w)) tags[i] = 'VBG';
      if (/^(DT|PRP\$|JJ|CD)$/.test(tags[i - 1] || '') && tags[i] === 'NN' && /ed$/.test(w)) tags[i] = 'VBN';
      if (i === 0 && /^[A-Z]/.test(tokens[i]) && !raw[i] && !/^(The|A|An|This|That|It|We|I|They)$/.test(tokens[i])) tags[i] = 'NNP';
      if (/^[A-Z][a-z]+$/.test(tokens[i]) && i > 0 && !/^(The|A|An)$/.test(tokens[i - 1]) && tags[i] === 'NN') tags[i] = 'NNP';
      if (/^[^\w]+$/.test(tokens[i])) tags[i] = PUNCT_TAG;
    }
    return tokens.map((t, i) => ({ token: t, tag: tags[i], known: !!raw[i], options: raw[i] || null }));
  }

  /* ------------------------------------------------------------------ */
  /* Rule/gazetteer NER                                                  */
  /* ------------------------------------------------------------------ */

  function ner(text, gaz) {
    const g = gaz || {};
    const spans = [];
    const push = (start, end, label, textValue) => spans.push({ start, end, label, text: textValue });
    const addMatches = (re, label) => {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(text))) {
        if (!m[0]) continue;
        push(m.index, m.index + m[0].length, label, m[0]);
      }
    };
    addMatches(/[\w.+-]+@[\w-]+\.[\w.-]+/g, 'EMAIL');
    addMatches(/https?:\/\/[^\s)]+/g, 'URL');
    addMatches(/(?:\$|৳|€|£)\s?\d+(?:[.,]\d+)*(?:\s?(?:million|billion|k|M|B))?/g, 'MONEY');
    addMatches(/\b\d+(?:\.\d+)?\s?(?:%|percent|taka|dollars?|USD|EUR)\b/gi, 'MONEY');
    addMatches(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?/g, 'DATE');
    addMatches(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{4})?/g, 'DATE');
    addMatches(/\b(?:19|20)\d{2}\b/g, 'DATE');
    addMatches(/\b\d{1,2}:\d{2}\s?(?:am|pm)?\b/gi, 'TIME');
    addMatches(/\b(?:today|tomorrow|yesterday|next\s+week|last\s+year|this\s+morning)\b/gi, 'DATE');

    const lookup = (list, label) => {
      for (const phrase of list || []) {
        const re = new RegExp('(^|[^\\w])(' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\w])', 'gi');
        let mm;
        while ((mm = re.exec(text))) {
          const start = mm.index + mm[1].length;
          push(start, start + mm[2].length, label, mm[2]);
        }
      }
    };
    lookup(g.people, 'PERSON');
    lookup(g.orgs, 'ORG');
    lookup(g.places, 'GPE');

    // Unknown capitalised sequences -> PERSON guess (skip sentence starts & known words)
    const capRe = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g;
    let m;
    while ((m = capRe.exec(text))) {
      const val = m[0];
      const start = m.index;
      if (spans.some((s) => start < s.end && start + val.length > s.start)) continue;
      if (/^(The|A|An|This|That|It|We|I|They|In|On|At|For|With|By|To|Of|And|But|So|If|When|Where|Why|How|Our|Your|My|His|Her|Their|Some|Many|Most|New|Last|Next|First|Second)$/i.test(val.split(' ')[0])) continue;
      push(start, start + val.length, 'PERSON', val);
    }

    // Merge overlapping spans (longest wins), then sort
    spans.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
    const merged = [];
    for (const s of spans) {
      const last = merged[merged.length - 1];
      if (last && s.start < last.end) {
        if (s.end - s.start > last.end - last.start) merged[merged.length - 1] = s;
        continue;
      }
      merged.push(s);
    }
    // Segments for rendering
    const segments = [];
    let cursor = 0;
    for (const s of merged) {
      if (s.start > cursor) segments.push({ text: text.slice(cursor, s.start), label: null });
      segments.push({ text: text.slice(s.start, s.end), label: s.label });
      cursor = s.end;
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor), label: null });
    return { spans: merged, segments };
  }

  /* ------------------------------------------------------------------ */
  /* PCA (power iteration) for the embedding map                         */
  /* ------------------------------------------------------------------ */

  function pca2(vectors) {
    const n = vectors.length;
    const d = vectors[0].length;
    const mean = new Array(d).fill(0);
    vectors.forEach((v) => v.forEach((x, i) => (mean[i] += x / n)));
    const X = vectors.map((v) => v.map((x, i) => x - mean[i]));
    const cov = Array.from({ length: d }, () => new Array(d).fill(0));
    for (const row of X) {
      for (let i = 0; i < d; i++) for (let j = i; j < d; j++) cov[i][j] += row[i] * row[j];
    }
    for (let i = 0; i < d; i++) for (let j = 0; j < i; j++) cov[i][j] = cov[j][i];

    const powerIter = (M, deflateWith) => {
      let v = Array.from({ length: d }, (_, i) => (i === 0 ? 1 : 0.5));
      v = normalizeVec(v);
      for (let it = 0; it < 120; it++) {
        let nv = new Array(d).fill(0);
        for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) nv[i] += M[i][j] * v[j];
        if (deflateWith) {
          const lam = dot(deflateWith.v, deflateWith.v) * deflateWith.lambda;
          for (let i = 0; i < d; i++) nv[i] -= deflateWith.lambda * deflateWith.v[i] * dot(deflateWith.v, v) * 1;
        }
        v = normalizeVec(nv);
      }
      let lambda = 0;
      for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) lambda += v[i] * cov[i][j] * v[j];
      return { v, lambda };
    };
    const pc1 = powerIter(cov, null);
    // Deflate covariance: C' = C - lambda * v v^T
    const C2 = cov.map((row, i) => row.map((x, j) => x - pc1.lambda * pc1.v[i] * pc1.v[j]));
    const pc2 = powerIter(C2, null);
    const coords = X.map((row) => [dot(row, pc1.v), dot(row, pc2.v)]);
    return { coords, pc1: pc1.v, pc2: pc2.v, var1: pc1.lambda, var2: pc2.lambda };
  }

  /* ------------------------------------------------------------------ */
  /* Readability (bonus)                                                 */
  /* ------------------------------------------------------------------ */

  function readability(text) {
    const sents = sentences(text);
    const words = tokenize(text, { keepCase: false }).filter((t) => !PUNCT_RE.test(t));
    const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
    const nW = words.length || 1;
    const nS = sents.length || 1;
    const fre = 206.835 - 1.015 * (nW / nS) - 84.6 * (syllables / nW);
    const fkgl = 0.39 * (nW / nS) + 11.8 * (syllables / nW) - 15.59;
    return {
      words: words.length,
      sentences: sents.length,
      syllables,
      avgSentence: round(nW / nS, 1),
      flesch: round(fre, 1),
      grade: round(fkgl, 1)
    };
  }
  function countSyllables(w) {
    const s = w.toLowerCase().replace(/[^a-z]/g, '');
    if (!s) return 0;
    if (s.length <= 3) return 1;
    const groups = s.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g);
    return Math.max(1, groups ? groups.length : 1);
  }

  /* ------------------------------------------------------------------ */
  /* Hand-built concept embeddings (interpretable "meaning axes")        */
  /* ------------------------------------------------------------------ */

  /**
   * Build a dense vector for `word` by summing the concept vectors it is
   * composed of, e.g. king = royal + male + person.
   * @param {string} word
   * @param {string[]} axes   axis names, defines vector dimension & order
   * @param {object} concepts concept -> { axisName: weight }
   * @param {object} words    word -> [concept, weight, concept, weight, ...]
   * @param {boolean} normalize L2-normalise the result (default true)
   */
  function conceptVector(word, axes, concepts, words, normalize) {
    const v = new Array(axes.length).fill(0);
    const spec = words[word];
    if (!spec) return v;
    const idx = {};
    axes.forEach((a, i) => (idx[a] = i));
    for (let i = 0; i < spec.length; i += 2) {
      const concept = concepts[spec[i]];
      const weight = spec[i + 1];
      if (!concept) continue;
      for (const axis in concept) {
        const ai = idx[axis];
        if (ai !== undefined) v[ai] += weight * concept[axis];
      }
    }
    return normalize === false ? v : normalizeVec(v);
  }

  function analogy(a, b, c, vectors, opts = {}) {
    const va = vectors[a];
    const vb = vectors[b];
    const vc = vectors[c];
    if (!va || !vb || !vc) return { target: null, ranked: [] };
    const target = va.map((x, i) => x - (vb[i] || 0) + (vc[i] || 0));
    const skip = new Set([a, b, c]);
    const ranked = Object.keys(vectors)
      .filter((w) => !skip.has(w))
      .map((w) => ({ word: w, score: cosine(target, vectors[w]) }))
      .sort((x, y) => y.score - x.score);
    return { target: normalizeVec(target), ranked };
  }

  /* ------------------------------------------------------------------ */
  /* PPMI co-occurrence embeddings + truncated SVD (for the "learned" tab) */
  /* ------------------------------------------------------------------ */

  function ppmiEmbeddings(sentencesArr, opts = {}) {
    const window = opts.window || 2;
    const dim = opts.dim || 2;
    const minCount = opts.minCount || 1;
    const stop = new Set((opts.stopwords || []).map((s) => s.toLowerCase()));
    const sents = sentencesArr.map((s) => tokenize(s, { keepCase: false }).filter((t) => !stop.has(t) && !PUNCT_RE.test(t)));
    const counts = new Map();
    sents.forEach((toks) => toks.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    const vocab = Array.from(counts.entries()).filter(([, c]) => c >= minCount).map(([w]) => w).sort();
    const V = new Map(vocab.map((w, i) => [w, i]));
    const C = vocab.length;
    const co = Array.from({ length: C }, () => new Array(C).fill(0));
    let total = 0;
    sents.forEach((toks) => {
      for (let i = 0; i < toks.length; i++) {
        const wi = V.get(toks[i]);
        if (wi === undefined) continue;
        for (let j = Math.max(0, i - window); j <= Math.min(toks.length - 1, i + window); j++) {
          if (i === j) continue;
          const wj = V.get(toks[j]);
          if (wj === undefined) continue;
          const weight = 1 / Math.abs(i - j);
          co[wi][wj] += weight;
          total += weight;
        }
      }
    });
    // PPMI
    const rowSum = co.map((r) => sum(r));
    const colSum = vocab.map((_, j) => sum(co.map((r) => r[j])));
    const totalAll = sum(rowSum) || 1;
    const P = co.map((row, i) =>
      row.map((x, j) => {
        if (!x) return 0;
        const pmi = Math.log((x * totalAll) / (rowSum[i] * colSum[j] || 1));
        return Math.max(0, pmi);
      })
    );
    // Truncated SVD via power iteration on P^T P
    const d = Math.min(dim, C);
    const M = P.map((r) => r.slice());
    const components = [];
    for (let k = 0; k < d; k++) {
      let v = Array.from({ length: C }, (_, i) => Math.sin(i * (k + 1) * 12.9898) * 0.5 + 0.5);
      v = normalizeVec(v);
      for (let it = 0; it < 80; it++) {
        const w = new Array(C).fill(0);
        for (let i = 0; i < C; i++) for (let j = 0; j < C; j++) w[i] += M[j][i] * dot(M[j], v);
        v = normalizeVec(w);
      }
      const sigma = Math.sqrt(sum(M.map((row) => Math.pow(dot(row, v), 2))));
      components.push({ v, sigma });
      for (let i = 0; i < C; i++) for (let j = 0; j < C; j++) M[i][j] -= sigma * v[i] * v[j];
    }
    const vectors = {};
    vocab.forEach((w, i) => {
      const vec = components.map((c) => c.v[i] * c.sigma);
      vectors[w] = normalizeVec(vec);
    });
    return { vocab, cooc: co, ppmi: P, vectors, components: components.map((c) => c.sigma) };
  }

  /* ------------------------------------------------------------------ */
  /* Export                                                              */
  /* ------------------------------------------------------------------ */

  NLP.engine = {
    version: '1.0',
    round, mulberry32, softmax, sum, dot, norm, normalizeVec, shuffle, tally, sortedEntries,
    tokenize, sentences, stripAccents, isPunctToken, stopwordFilter, normalizeWhitespace,
    porterStem, porterTrace, lemmatize, preprocess,
    ngrams, ngramKey, termCounts, tfidfMatrix, vectorFromTokens, cosine, jaccard,
    levenshtein, NaiveBayes, ngramLM, sampleFrom,
    bpeTrain, bpeEncode, attentionDemo, charEmbedding, positionalEncoding,
    bleu, posTag, guessTag, ner, pca2, readability, countSyllables,
    conceptVector, analogy, ppmiEmbeddings
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
