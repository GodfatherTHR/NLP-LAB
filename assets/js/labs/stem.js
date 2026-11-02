/* =====================================================================
   Lab 02 — Stemming & Lemmatization
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, on } = UI;

  const DEMO = [
    'studies', 'studied', 'studying', 'running', 'ran', 'better', 'good',
    'was', 'is', 'children', 'mice', 'relational', 'happiness', 'generously',
    'controlling', 'skies', 'agreed', 'formalize', 'actresses', 'universities',
    'argued', 'happily', 'traditional', 'hopefulness', 'bodies', 'dying'
  ];

  NLP.views.stem = function (rootEl) {
    const body =
      '<div class="split">' +
      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🔍</span><h3>Inspect one word</h3>' +
      '<div class="spacer"></div><span class="tiny faint">press Enter</span></div>' +
      '<div class="row">' +
      '<input class="input mono" id="wordIn" value="relational" spellcheck="false" style="flex:1;min-width:180px">' +
      '<button class="btn btn-primary" id="stemBtn">Analyse</button>' +
      '</div>' +
      '<div class="row" style="margin-top:10px;gap:6px" id="quickWords"></div>' +
      '</div>' +

      '<div class="card" id="wordResult"></div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📋</span><h3>Batch comparison</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="batchNote"></span></div>' +
      '<div class="tbl-wrap" style="max-height:420px"><table class="tbl" id="batchTable"></table></div>' +
      '</div>' +
      '</div>' +

      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📖</span><h3>Stem vs. lemma</h3></div>' +
      '<p style="font-size:.85rem;margin-bottom:10px">Both shrink the vocabulary — but in very different ways.</p>' +
      '<div class="grid" style="gap:9px">' +
      '<div class="panel" style="border-left:3px solid var(--brand-2)">' +
      '<div class="bold" style="font-size:.85rem;margin-bottom:3px">🌱 Stemming</div>' +
      '<div class="tiny muted">Mechanical suffix rules. Output may not be a word. Cheap, language-agnostic, great for search/topic models.</div>' +
      '<div class="mono tiny" style="margin-top:6px;color:var(--brand-2)">happiness → happi</div>' +
      '</div>' +
      '<div class="panel" style="border-left:3px solid var(--accent)">' +
      '<div class="bold" style="font-size:.85rem;margin-bottom:3px">📚 Lemmatization</div>' +
      '<div class="tiny muted">Dictionary + grammar. Output is a real dictionary form, but needs a lexicon and POS.</div>' +
      '<div class="mono tiny" style="margin-top:6px;color:var(--accent)">was → be, children → child</div>' +
      '</div>' +
      '</div>' +
      '<div class="hint" style="margin-top:10px"><span>⚠️</span><span><b>Stemming can collide:</b> "university" and "universe" both reduce to <span class="mono">univers</span> in aggressive stemmers, merging unrelated ideas.</span></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🐍</span><h3>Python</h3></div>' +
      UI.codeBlock(D.python.stem, { title: 'stem_vs_lemma.py' }) +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🎯</span><h3>Quick check</h3></div>' +
      '<div id="stemQuiz"></div>' +
      '</div>' +
      '</div>' +
      '</div>';

    UI.mountLab(rootEl, 'stem', body);

    const $ = (s) => rootEl.querySelector(s);
    if (NLP.state.done.stem) {
      const b = $('[data-role="lab-done-badge"]');
      if (b) { b.textContent = '✓ Completed'; b.className = 'badge badge-good'; }
    }

    /* ---------------- quick word chips ---------------- */
    $('#quickWords').innerHTML = ['relational', 'happiness', 'running', 'better', 'children', 'generously', 'studies']
      .map((w) => '<button class="chip" data-quick="' + w + '">' + w + '</button>')
      .join('');

    /* ---------------- single word analysis ---------------- */
    function analyse(word) {
      const w = String(word || '').trim().split(/\s+/)[0] || '';
      const box = $('#wordResult');
      if (!w) {
        box.innerHTML = '<p class="faint">Type a word first.</p>';
        return;
      }
      const trace = E.porterTrace(w);
      const lemma = E.lemmatize(w);
      const lower = w.toLowerCase();
      const steps = trace.steps;

      const chain = '<div class="row" style="gap:8px;flex-wrap:wrap;margin:10px 0">' +
        '<span class="chip" style="background:var(--surface-3)">' + esc(lower) + '</span>' +
        (steps.length
          ? steps.map((s) => '<span class="faint">→</span><span class="chip stem" title="' + esc(s.label) + '">' + esc(s.to) + '</span>').join('')
          : '<span class="faint">→</span><span class="chip">no rule fired</span>') +
        '</div>';

      const timeline = steps.length
        ? '<div class="stack" style="gap:6px;margin-top:6px">' + steps.map((s, i) =>
            '<div class="bpe-merge-row"><span class="idx">' + (i + 1) + '</span>' +
            '<span class="mono" style="color:var(--faint)">' + esc(s.from) + '</span>' +
            '<span style="color:var(--brand-2)">→</span>' +
            '<span class="mono bold">' + esc(s.to) + '</span>' +
            '<span class="cnt" style="text-align:right">' + esc(s.label) + '</span></div>'
          ).join('') + '</div>'
        : '<p class="tiny faint">None of the Porter rules matched — the word is already in a minimal form (or shorter than 3 characters).</p>';

      box.innerHTML =
        '<div class="card-head"><span class="card-title-ico">🔬</span><h3>Porter trace</h3>' +
        '<div class="spacer"></div><span class="badge badge-brand">' + steps.length + ' rule' + (steps.length === 1 ? '' : 's') + '</span></div>' +
        chain +
        '<div class="grid grid-2" style="gap:10px;margin:12px 0">' +
        '<div class="panel center"><div class="tiny faint">Porter stem</div><div class="mono bold" style="font-size:1.25rem;color:var(--brand-2)">' + esc(trace.output) + '</div></div>' +
        '<div class="panel center"><div class="tiny faint">Lemma (dictionary)</div><div class="mono bold" style="font-size:1.25rem;color:var(--accent)">' + esc(lemma) + '</div></div>' +
        '</div>' +
        timeline +
        '<div class="hint info" style="margin-top:12px"><span>💡</span><span>' +
        (trace.output === lemma
          ? 'Here both agree: <span class="mono">' + esc(lemma) + '</span>. That happens for regular, unambiguous words.'
          : lemma === lower
          ? 'The lemmatizer leaves this unchanged (it is not a known inflected form), while Porter still chops suffixes mechanically.'
          : 'They disagree — Porter gives <span class="mono">' + esc(trace.output) + '</span>, the dictionary says <span class="mono">' + esc(lemma) + '</span>. ' +
            (isRealWord(trace.output) ? 'Both are usable here.' : 'Note that <span class="mono">' + esc(trace.output) + '</span> is not a real English word.')) +
        '</span></div>';
    }
    function isRealWord(w) {
      const dict = new Set(['study', 'run', 'good', 'be', 'child', 'mouse', 'relate', 'happy', 'generous', 'control',
        'sky', 'agree', 'formal', 'actress', 'univers', 'argue', 'happi', 'tradit', 'hope', 'bodi', 'die', 'dy',
        'relat', 'studi', 'happili', 'gener', 'control', 'formal', 'argu', 'dy']);
      return dict.has(w);
    }

    /* ---------------- batch table ---------------- */
    function renderBatch() {
      const rows = DEMO.map((w) => {
        const t = E.porterTrace(w);
        return { w, stem: t.output, lemma: E.lemmatize(w), rules: t.steps.map((s) => s.label.split('—')[1] || s.label).join(', ') };
      });
      const stems = new Set(rows.map((r) => r.stem));
      const lemmas = new Set(rows.map((r) => r.lemma));
      $('#batchNote').textContent = DEMO.length + ' words → ' + stems.size + ' stems / ' + lemmas.size + ' lemmas';
      $('#batchTable').innerHTML =
        '<thead><tr><th>Word</th><th>Porter stem</th><th>Lemma</th><th>Same?</th><th style="width:40%">Rules applied</th></tr></thead><tbody>' +
        rows.map((r) =>
          '<tr><td class="mono">' + esc(r.w) + '</td>' +
          '<td class="mono" style="color:var(--brand-2)">' + esc(r.stem) + '</td>' +
          '<td class="mono" style="color:var(--accent)">' + esc(r.lemma) + '</td>' +
          '<td>' + (r.stem === r.lemma ? '<span style="color:var(--good)">✓</span>' : '<span style="color:var(--faint)">—</span>') + '</td>' +
          '<td class="tiny" style="color:var(--faint)">' + esc(r.rules || 'no change') + '</td></tr>'
        ).join('') + '</tbody>';
    }

    /* ---------------- mini quiz ---------------- */
    const mini = [
      { q: 'What is the Porter stem of “studies”?', a: ['study', 'studi', 'studies', 'stud'], c: 1, why: 'Step 1a: (ss|i)es → i, so "studies" → "studi".' },
      { q: 'Which word does lemmatization fix that stemming mangles?', a: ['running → run', 'was → be', 'cats → cat', 'quickly → quick'], c: 1, why: 'Stemming would give "wa" (or nothing useful); a lemmatizer knows "was" is a form of "be".' }
    ];
    $('#stemQuiz').innerHTML = mini.map((q, qi) =>
      '<div class="quiz-q" style="padding-top:' + (qi ? '12px' : '0') + '">' +
      '<div class="quiz-prompt">' + esc(q.q) + '</div><div class="quiz-opts">' +
      q.a.map((o, oi) => '<button class="quiz-opt" data-mini="' + qi + '" data-o="' + oi + '"><span class="letter">' + String.fromCharCode(65 + oi) + '</span>' + esc(o) + '</button>').join('') +
      '</div><div data-why="' + qi + '"></div></div>'
    ).join('');

    on(rootEl, 'click', '[data-mini]', (ev, btn) => {
      const qi = Number(btn.dataset.mini);
      const oi = Number(btn.dataset.o);
      const q = mini[qi];
      const wrap = btn.closest('.quiz-q');
      UI.$$('.quiz-opt', wrap).forEach((b) => {
        b.disabled = true;
        const bi = Number(b.dataset.o);
        if (bi === q.c) b.classList.add('correct');
        else if (bi === oi) b.classList.add('wrong');
      });
      wrap.querySelector('[data-why]').innerHTML = '<div class="quiz-why"><b>' + (oi === q.c ? '✓ Correct.' : '✗ Not quite.') + '</b> ' + esc(q.why) + '</div>';
    });

    /* ---------------- events ---------------- */
    on(rootEl, 'click', '[data-quick]', (ev, btn) => {
      $('#wordIn').value = btn.dataset.quick;
      analyse(btn.dataset.quick);
    });
    $('#stemBtn').addEventListener('click', () => analyse($('#wordIn').value));
    $('#wordIn').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') analyse($('#wordIn').value);
    });
    $('#wordIn').addEventListener('input', (e) => {
      const v = e.target.value.trim();
      if (v) analyse(v);
    });

    analyse('relational');
    renderBatch();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
