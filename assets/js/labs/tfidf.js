/* =====================================================================
   Lab 03 — TF-IDF & the Vector Space Model
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, fmt, on } = UI;

  const PRESETS = {
    'Cats & dogs': [
      'the cat sat on the mat',
      'the dog sat on the log',
      'the cat chased the dog around the mat',
      'a dog barked at the cat'
    ],
    'News topics': [
      'the government announced a new budget for education and health',
      'the cricket team won the match in the final over',
      'the budget includes more money for schools and hospitals',
      'the team trained hard before the cricket tournament'
    ],
    'Reviews': [
      'the food was delicious and the staff were friendly',
      'the service was slow and the food was cold',
      'amazing coffee and cozy atmosphere',
      'the room was dirty and the price was too high'
    ]
  };

  NLP.views.tfidf = function (rootEl) {
    const body =
      '<div class="split">' +
      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📄</span><h3>Corpus</h3>' +
      '<div class="spacer"></div>' +
      '<div class="seg" id="presetSeg">' +
      Object.keys(PRESETS).map((k, i) => '<button data-preset="' + esc(k) + '" class="' + (i === 0 ? 'on' : '') + '">' + esc(k) + '</button>').join('') +
      '</div></div>' +
      '<textarea class="textarea mono" id="docsIn" rows="7" spellcheck="false" style="font-size:.8rem">' +
      esc(PRESETS['Cats & dogs'].join('\n')) +
      '</textarea>' +
      '<div class="row" style="margin-top:10px">' +
      '<label class="switch"><input type="checkbox" id="optStop" checked><span class="switch-track"></span>' +
      '<span class="switch-text"><span>Remove stop words</span></span></label>' +
      '<label class="switch"><input type="checkbox" id="optStem"><span class="switch-track"></span>' +
      '<span class="switch-text"><span>Stem</span><small>studies → studi</small></span></label>' +
      '<div class="spacer"></div>' +
      '<span class="tiny faint">one document per line</span>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🔥</span><h3>TF-IDF matrix</h3>' +
      '<div class="spacer"></div>' +
      '<div class="seg" id="matSeg"><button data-mat="tfidf" class="on">TF-IDF</button><button data-mat="tf">Raw counts</button><button data-mat="idf">IDF</button></div>' +
      '</div>' +
      '<div class="matrix-scroll"><div id="heat"></div></div>' +
      '<div class="heat-legend"><span>low</span><span class="ramp"></span><span>high</span>' +
      '<span class="spacer"></span><span id="matNote" class="tiny faint"></span></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📐</span><h3>Document similarity</h3>' +
      '<div class="spacer"></div><span class="tiny faint">cosine of TF-IDF vectors</span></div>' +
      '<div id="simHeat"></div>' +
      '<p class="tiny faint" style="margin-top:8px">Diagonal = 1 (a document is identical to itself). Bright off-diagonal cells are near-duplicate documents.</p>' +
      '</div>' +
      '</div>' +

      '<div class="stack">' +
      '<div class="kpis" id="kpis"></div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🔑</span><h3>Top weighted terms</h3></div>' +
      '<div class="seg" id="docSeg" style="margin-bottom:10px;flex-wrap:wrap"></div>' +
      '<div id="topTerms"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🧮</span><h3>The maths</h3></div>' +
      '<div class="formula">tf-idf(t, d) = tf(t, d) × [ log((1 + N) / (1 + df(t))) + 1 ]</div>' +
      '<div class="row" style="margin-top:10px;gap:14px">' +
      '<div class="tiny"><span class="faint">N (docs)</span> <b id="mathN">—</b></div>' +
      '<div class="tiny"><span class="faint">V (vocab)</span> <b id="mathV">—</b></div>' +
      '<div class="tiny"><span class="faint">sparsity</span> <b id="mathS">—</b></div>' +
      '</div>' +
      '<p class="tiny faint" style="margin-top:10px">The +1 smoothing (scikit-learn\'s default) keeps IDF at least 1 so a word in every document still counts a little.</p>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🐍</span><h3>Python</h3></div>' +
      UI.codeBlock(D.python.tfidf, { title: 'tfidf.py' }) +
      '</div>' +
      '</div>' +
      '</div>';

    UI.mountLab(rootEl, 'tfidf', body);

    const $ = (s) => rootEl.querySelector(s);
    let matrixMode = 'tfidf';
    let selectedDoc = 0;

    const input = $('#docsIn');

    /* ---------------- render ---------------- */
    function run() {
      const docs = input.value.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!docs.length) {
        $('#heat').innerHTML = '<p class="faint tiny">Add at least one line of text.</p>';
        return;
      }
      const removeStop = $('#optStop').checked;
      const stem = $('#optStem').checked;
      const model = E.tfidfMatrix(docs, {
        stopwords: D.stopwords,
        removeStopwords: removeStop,
        stem
      });

      // vocab shown: up to 45 most document-frequent terms
      const limit = 45;
      const order = model.vocab
        .map((w, i) => ({ w, i, df: model.df[i] }))
        .sort((a, b) => b.df - a.df || model.idf[a.i] - model.idf[b.i])
        .slice(0, limit);

      const values = matrixMode === 'idf'
        ? order.map((o) => model.idf[o.i])
        : null;

      const maxVal = matrixMode === 'idf'
        ? Math.max.apply(null, values.concat([0.0001]))
        : Math.max.apply(null, model.tfidf.flat().concat(model.tf.flat()).concat([0.0001]));

      // ---- heatmap ----
      let h = '<div class="heat" style="grid-template-columns:minmax(84px,120px) repeat(' + order.length + ', minmax(20px,1fr))">';
      // header row
      h += '<div></div>';
      order.forEach((o) => {
        h += '<div class="axis-labels" style="writing-mode:vertical-rl;transform:rotate(180deg);height:78px;display:grid;place-items:center;overflow:hidden" title="' + esc(o.w) + '">' + esc(o.w) + '</div>';
      });
      model.tfidf.forEach((row, di) => {
        h += '<div class="axis-labels" style="display:flex;align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(model.docs[di]) + '">D' + (di + 1) + ' ' + esc(truncate(model.docs[di], 14)) + '</div>';
        order.forEach((o) => {
          let v;
          let label;
          if (matrixMode === 'idf') {
            v = model.idf[o.i];
            label = v.toFixed(2);
          } else if (matrixMode === 'tf') {
            v = model.tf[di][o.i];
            label = v ? v : '';
          } else {
            v = model.tfidf[di][o.i];
            label = v ? v.toFixed(2) : '';
          }
          const t = matrixMode === 'idf' ? v / maxVal : v / maxVal;
          const bg = v ? UI.heatColor(Math.pow(t, 0.6)) : 'var(--surface-2)';
          h += '<div class="heat-cell" style="background:' + bg + ';color:' + UI.textOn(bg) + '" title="' + esc(o.w) + ' in D' + (di + 1) + ': ' + esc(label || '0') + '">' + esc(label) + '</div>';
        });
      });
      h += '</div>';
      $('#heat').innerHTML = h;

      // ---- notes + kpis ----
      const nonZero = model.tfidf.reduce((acc, row) => acc + row.filter((v) => v > 0).length, 0);
      const cells = model.tfidf.length * (model.vocab.length || 1);
      $('#matNote').textContent = order.length + ' of ' + model.vocab.length + ' terms shown';
      $('#mathN').textContent = docs.length;
      $('#mathV').textContent = model.vocab.length;
      $('#mathS').textContent = ((1 - nonZero / cells) * 100).toFixed(1) + '% zeros';

      $('#kpis').innerHTML =
        UI.kpi('Documents', docs.length) +
        UI.kpi('Vocabulary', model.vocab.length, 'brand') +
        UI.kpi('Total terms', fmt.num(model.tf.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0))) +
        UI.kpi('Matrix cells', fmt.num(cells)) +
        UI.kpi('Non-zero', fmt.pct(nonZero / cells, 1), 'good');

      // ---- similarity heatmap ----
      const sims = model.tfidf.map((a) => model.tfidf.map((b) => E.cosine(a, b)));
      let s = '<div class="heat" style="grid-template-columns:60px repeat(' + docs.length + ', 1fr)">';
      s += '<div></div>';
      docs.forEach((d, j) => {
        s += '<div class="axis-labels center" style="padding-bottom:4px">D' + (j + 1) + '</div>';
      });
      sims.forEach((row, i) => {
        s += '<div class="axis-labels" style="display:flex;align-items:center">D' + (i + 1) + '</div>';
        row.forEach((v, j) => {
          const bg = UI.heatColor(Math.pow(Math.max(0, v), 1.5));
          s += '<div class="heat-cell" style="background:' + bg + ';color:' + UI.textOn(bg) + ';aspect-ratio:auto;padding:12px 0" title="cos(D' + (i + 1) + ', D' + (j + 1) + ') = ' + v.toFixed(3) + '">' + v.toFixed(2) + '</div>';
        });
      });
      s += '</div>';
      $('#simHeat').innerHTML = s;

      // ---- per-document top terms ----
      if (selectedDoc >= docs.length) selectedDoc = 0;
      $('#docSeg').innerHTML = docs
        .map((d, i) => '<button data-doc="' + i + '" class="' + (i === selectedDoc ? 'on' : '') + '">D' + (i + 1) + '</button>')
        .join('');
      const row = model.tfidf[selectedDoc] || [];
      const idxs = row.map((v, i) => ({ v, i })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 12);
      const maxW = idxs.length ? idxs[0].v : 1;
      $('#topTerms').innerHTML = idxs.length
        ? idxs.map(({ v, i }) => {
            const tfv = model.tf[selectedDoc][i];
            return UI.barRow(model.vocab[i], v, maxW, {
              cls: 'pos',
              text: v.toFixed(3) + ' (tf ' + tfv + ')'
            });
          }).join('')
        : '<p class="faint tiny">No overlapping terms — add text or change the corpus.</p>';
    }

    function truncate(s, n) {
      s = String(s);
      return s.length > n ? s.slice(0, n) + '…' : s;
    }

    /* ---------------- events ---------------- */
    input.addEventListener('input', run);

    on(rootEl, 'change', '#optStop, #optStem', run);

    on(rootEl, 'click', '#presetSeg button', (ev, btn) => {
      UI.$$('#presetSeg button', rootEl).forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      input.value = PRESETS[btn.dataset.preset].join('\n');
      selectedDoc = 0;
      run();
    });

    on(rootEl, 'click', '#matSeg button', (ev, btn) => {
      UI.$$('#matSeg button', rootEl).forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      matrixMode = btn.dataset.mat;
      run();
    });

    on(rootEl, 'click', '#docSeg button', (ev, btn) => {
      selectedDoc = Number(btn.dataset.doc);
      run();
    });

    run();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
