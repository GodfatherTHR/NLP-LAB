/* =====================================================================
   Lab 05 — Text Classification with Multinomial Naive Bayes
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, fmt, on } = UI;

  function prep(docs) {
    return docs.map((d) => ({
      tokens: E.tokenize(d.text, { keepCase: false }).filter((t) => !D.stopwords.includes(t) && !/^\W+$/.test(t)),
      label: d.label,
      text: d.text
    }));
  }

  function stratifiedSplit(items, testRatio, seed) {
    const rand = E.mulberry32(seed);
    const classes = Array.from(new Set(items.map((i) => i.label)));
    const train = [];
    const test = [];
    classes.forEach((c) => {
      const group = E.shuffle(items.filter((i) => i.label === c), rand);
      const nTest = Math.max(1, Math.round(group.length * testRatio));
      test.push(...group.slice(0, nTest));
      train.push(...group.slice(nTest));
    });
    return { train: E.shuffle(train, rand), test: E.shuffle(test, rand) };
  }

  function metrics(yTrue, yPred, classes) {
    const cm = {};
    classes.forEach((a) => {
      cm[a] = {};
      classes.forEach((b) => (cm[a][b] = 0));
    });
    yTrue.forEach((t, i) => {
      cm[t][yPred[i]]++;
    });
    const per = {};
    classes.forEach((c) => {
      const tp = cm[c][c];
      const fp = classes.reduce((s, o) => s + (o === c ? 0 : cm[o][c]), 0);
      const fn = classes.reduce((s, o) => s + (o === c ? 0 : cm[c][o]), 0);
      const prec = tp + fp ? tp / (tp + fp) : 0;
      const rec = tp + fn ? tp / (tp + fn) : 0;
      per[c] = { tp, fp, fn, precision: prec, recall: rec, f1: prec + rec ? (2 * prec * rec) / (prec + rec) : 0 };
    });
    const acc = yTrue.length ? yTrue.filter((t, i) => t === yPred[i]).length / yTrue.length : 0;
    const macroF1 = classes.length ? classes.reduce((s, c) => s + per[c].f1, 0) / classes.length : 0;
    return { cm, per, acc, macroF1 };
  }

  NLP.views.classify = function (rootEl) {
    const body =
      '<div class="split">' +
      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🎛️</span><h3>Train / test setup</h3>' +
      '<div class="spacer"></div><span class="badge badge-brand" id="dataBadge">—</span></div>' +
      '<div class="grid grid-3" style="gap:10px">' +
      '<div class="field"><label>Test size</label><div class="slider-row"><input type="range" id="testSize" min="10" max="40" value="25" step="5"><span class="slider-val" id="testSizeVal">25%</span></div></div>' +
      '<div class="field"><label>Laplace α</label><div class="slider-row"><input type="range" id="alpha" min="0.1" max="3" value="1" step="0.1"><span class="slider-val" id="alphaVal">1.0</span></div></div>' +
      '<div class="field"><label>Random seed</label><input class="input" id="seed" type="number" value="42" min="0" max="9999"></div>' +
      '</div>' +
      '<div class="row" style="margin-top:12px">' +
      '<button class="btn btn-primary" id="trainBtn">▶ Train &amp; evaluate</button>' +
      '<button class="btn btn-sm" id="shuffleBtn">🔀 Reshuffle</button>' +
      '<div class="spacer"></div><span class="tiny faint">multinomial Naive Bayes on bag-of-words</span>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📊</span><h3>Results</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="trainNote"></span></div>' +
      '<div id="results"><p class="faint tiny">Press “Train &amp; evaluate”.</p></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📄</span><h3>Test-set predictions</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="predNote"></span></div>' +
      '<div class="tbl-wrap" style="max-height:300px"><table class="tbl" id="predTable"></table></div>' +
      '</div>' +
      '</div>' +

      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🔮</span><h3>Classify your own sentence</h3></div>' +
      '<div class="row">' +
      '<input class="input" id="predictIn" value="what a wonderful and delightful film" spellcheck="false" style="flex:1;min-width:150px">' +
      '<button class="btn btn-primary" id="predictBtn">Predict</button>' +
      '</div>' +
      '<div id="predictOut" style="margin-top:12px"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🧠</span><h3>Why did it decide that?</h3></div>' +
      '<div id="explain"><p class="tiny faint">Train the model, then predict a sentence.</p></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🏆</span><h3>Most informative words</h3></div>' +
      '<div id="features"><p class="tiny faint">Train the model first.</p></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🐍</span><h3>Python</h3></div>' +
      UI.codeBlock(D.python.classify, { title: 'classify.py' }) +
      '</div>' +
      '</div>' +
      '</div>';

    UI.mountLab(rootEl, 'classify', body);

    const $ = (s) => rootEl.querySelector(s);
    if (NLP.state.done.classify) {
      const b = $('[data-role="lab-done-badge"]');
      if (b) { b.textContent = '✓ Completed'; b.className = 'badge badge-good'; }
    }

    let model = null;
    let lastSplit = null;
    let lastMetrics = null;

    $('#dataBadge').textContent = D.sentiment.length + ' labelled sentences';

    /* ---------------- training ---------------- */
    function train() {
      const testRatio = Number($('#testSize').value) / 100;
      const alpha = Number($('#alpha').value);
      const seed = Number($('#seed').value) || 42;

      const items = prep(D.sentiment);
      const { train: tr, test: te } = stratifiedSplit(items, testRatio, seed);
      const nb = new E.NaiveBayes({ alpha }).train(tr);
      const yTrue = te.map((t) => t.label);
      const yPred = te.map((t) => nb.predict(t.tokens).label);
      const m = metrics(yTrue, yPred, nb.classes);
      const trainPred = tr.map((t) => nb.predict(t.tokens).label);
      const trainAcc = tr.length ? tr.filter((t, i) => trainPred[i] === t.label).length / tr.length : 0;

      model = nb;
      lastSplit = { train: tr, test: te };
      lastMetrics = m;

      $('#trainNote').textContent = tr.length + ' train / ' + te.length + ' test · α = ' + alpha;
      $('#predNote').textContent = te.length + ' held-out sentences';

      // KPIs
      let h = '<div class="kpis" style="margin-bottom:14px">' +
        UI.kpi('Test accuracy', fmt.pct(m.acc, 1), 'brand') +
        UI.kpi('Train accuracy', fmt.pct(trainAcc, 1)) +
        UI.kpi('Macro F1', m.macroF1.toFixed(3), 'good') +
        UI.kpi('Classes', nb.classes.length) +
        '</div>';

      // gap warning
      const gap = trainAcc - m.acc;
      if (gap > 0.12) {
        h += '<div class="hint" style="margin-bottom:14px"><span>⚠️</span><span><b>Overfitting signal:</b> train ' +
          fmt.pct(trainAcc, 0) + ' vs test ' + fmt.pct(m.acc, 0) + '. With only ' + D.sentiment.length +
          ' sentences this is mostly sample noise — a real project would use thousands of examples.</span></div>';
      }

      // confusion matrix
      const classes = nb.classes;
      h += '<div class="section-title" style="margin-top:0">Confusion matrix</div>';
      h += '<div class="cm" style="grid-template-columns:minmax(80px,120px) repeat(' + classes.length + ', 1fr)">';
      h += '<div></div>';
      classes.forEach((c) => (h += '<div class="tiny faint center" style="overflow:hidden;text-overflow:ellipsis">pred ' + esc(c) + '</div>'));
      classes.forEach((rowC) => {
        h += '<div class="tiny" style="display:flex;align-items:center;color:var(--muted)">true ' + esc(rowC) + '</div>';
        classes.forEach((colC) => {
          const v = m.cm[rowC][colC];
          const diag = rowC === colC;
          h += '<div class="cm-cell ' + (v === 0 ? 'zero' : diag ? 'diag' : 'off') + '">' + v + '</div>';
        });
      });
      h += '</div>';

      // per-class table
      h += '<div class="section-title">Per-class metrics</div>';
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead><tbody>';
      classes.forEach((c) => {
        const p = m.per[c];
        const support = p.tp + p.fn;
        h += '<tr><td>' + esc(c) + '</td><td class="num">' + p.precision.toFixed(2) + '</td><td class="num">' +
          p.recall.toFixed(2) + '</td><td class="num">' + p.f1.toFixed(2) + '</td><td class="num">' + support + '</td></tr>';
      });
      h += '</tbody></table></div>';
      $('#results').innerHTML = h;

      // predictions table
      let t = '<thead><tr><th>Sentence</th><th>True</th><th>Predicted</th><th>P(pred)</th><th></th></tr></thead><tbody>';
      te.forEach((item, i) => {
        const res = nb.predict(item.tokens);
        const ok = res.label === item.label;
        t += '<tr><td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(item.text) + '">' + esc(item.text) + '</td>' +
          '<td class="mono">' + esc(item.label) + '</td>' +
          '<td class="mono" style="color:' + (ok ? 'var(--good)' : 'var(--bad)') + '">' + esc(res.label) + '</td>' +
          '<td class="num">' + (res.posterior[res.label] * 100).toFixed(1) + '%</td>' +
          '<td>' + (ok ? '✓' : '✗') + '</td></tr>';
      });
      t += '</tbody>';
      $('#predTable').innerHTML = t;

      renderFeatures();
      predict();
    }

    /* ---------------- explanation ---------------- */
    function predict() {
      if (!model) { UI.toast('Train the model first'); return; }
      const text = $('#predictIn').value;
      const tokens = E.tokenize(text, { keepCase: false });
      const res = model.predict(tokens);
      const classes = model.classes;

      let h = '<div class="stack" style="gap:10px">';
      classes.forEach((c) => {
        const p = res.posterior[c];
        const isBest = c === res.label;
        h += '<div>' +
          '<div class="row-tight" style="justify-content:space-between;margin-bottom:3px">' +
          '<span class="mono tiny" style="color:' + (isBest ? 'var(--brand-2)' : 'var(--muted)') + '">' + esc(c) + (isBest ? ' ← predicted' : '') + '</span>' +
          '<span class="tiny mono faint">' + (p * 100).toFixed(1) + '%</span></div>' +
          '<div class="bartrack" style="height:13px"><div class="barfill ' + (isBest ? 'pos' : '') + '" style="width:' + (p * 100).toFixed(1) + '%"></div></div>' +
          '</div>';
      });
      h += '</div>';
      if (res.unseen.length) {
        h += '<div class="hint" style="margin-top:10px"><span>👻</span><span><b>Unseen words:</b> <span class="mono">' +
          esc(res.unseen.slice(0, 8).join(', ')) + '</span>' + (res.unseen.length > 8 ? ' +' + (res.unseen.length - 8) + ' more' : '') +
          ' — smoothing gives them a tiny probability instead of zero.</span></div>';
      }
      $('#predictOut').innerHTML = h;

      // contribution bars
      const contribs = res.contributions.slice(0, 10);
      const maxAbs = contribs.length ? Math.max.apply(null, contribs.map((c) => Math.abs(c.delta))) : 1;
      let e = '<p class="tiny muted" style="margin-bottom:8px">Log-odds contribution of each word toward <b>' +
        esc(res.label) + '</b> over the strongest competing class. Right = evidence <i>for</i>, left = evidence <i>against</i>.</p>';
      e += '<div class="vec-bars">';
      contribs.forEach((c) => {
        const frac = Math.min(1, Math.abs(c.delta) / maxAbs);
        const w = (frac * 50).toFixed(1);
        e += '<div class="vec-bar" style="grid-template-columns:88px 1fr 54px">' +
          '<span class="nm">' + esc(c.word) + (c.count > 1 ? ' ×' + c.count : '') + '</span>' +
          '<span class="vec-track"><span style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line)"></span>' +
          '<span class="vec-fill ' + (c.delta >= 0 ? 'pos' : 'neg') + '" style="' + (c.delta >= 0 ? 'left:50%;' : 'right:50%;') + 'width:' + w + '%"></span></span>' +
          '<span class="vv">' + c.delta.toFixed(2) + '</span>' +
          '</div>';
      });
      e += '</div>';
      $('#explain').innerHTML = e;
    }

    function renderFeatures() {
      if (!model) return;
      let h = '';
      model.classes.slice(0, 2).forEach((c) => {
        const feats = model.topFeatures(c, 8);
        h += '<div style="margin-bottom:12px"><div class="tiny faint" style="margin-bottom:5px">top words for <b style="color:var(--brand-2)">' +
          esc(c) + '</b></div><div class="chips">' +
          feats.map((f) => UI.chip(f.word, { count: f.count, title: 'log-odds ' + f.weight.toFixed(2) })).join('') +
          '</div></div>';
      });
      $('#features').innerHTML = h;
    }

    /* ---------------- events ---------------- */
    $('#testSize').addEventListener('input', (e) => {
      $('#testSizeVal').textContent = e.target.value + '%';
    });
    $('#alpha').addEventListener('input', (e) => {
      $('#alphaVal').textContent = Number(e.target.value).toFixed(1);
    });
    $('#trainBtn').addEventListener('click', train);
    $('#shuffleBtn').addEventListener('click', () => {
      $('#seed').value = Math.floor(Math.random() * 9999);
      train();
    });
    $('#predictBtn').addEventListener('click', predict);
    $('#predictIn').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') predict();
    });
    $('#predictIn').addEventListener('input', () => {
      if (model) predict();
    });

    train();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
