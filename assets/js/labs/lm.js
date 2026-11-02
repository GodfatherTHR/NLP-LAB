/* =====================================================================
   Lab 06 — N-gram Language Models
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, fmt, on } = UI;

  NLP.views.lm = function (rootEl) {
    const body =
      '<div class="split">' +
      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🔮</span><h3>Next-word prediction</h3>' +
      '<div class="spacer"></div>' +
      '<div class="seg" id="nSeg"><button data-n="1" class="on">unigram</button><button data-n="2">bigram</button><button data-n="3">trigram</button></div>' +
      '</div>' +
      '<p class="tiny muted" style="margin-bottom:8px">Type a start phrase, then click any predicted word to append it. Visit the corpus section to change the training text.</p>' +
      '<div class="row">' +
      '<input class="input mono" id="ctxIn" value="the cat" spellcheck="false" style="flex:1;min-width:150px">' +
      '<button class="btn" id="genBtn">✨ Auto-generate</button>' +
      '<button class="btn btn-sm" id="clearBtn" title="Clear">↺</button>' +
      '</div>' +
      '<div class="tiny faint" id="ctxNote" style="margin-top:6px"></div>' +
      '<div class="nextword-grid" id="nextwords" style="margin-top:12px"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📝</span><h3>Generated text</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="genNote"></span></div>' +
      '<div class="generated" id="generated"><span class="faint">Click “Auto-generate” or pick words above.</span></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📉</span><h3>Perplexity experiment</h3>' +
      '<div class="spacer"></div><span class="tiny faint">lower = less surprised</span></div>' +
      '<div class="field"><label>Evaluation sentence</label>' +
      '<input class="input mono" id="evalIn" value="the cat sat on the mat" spellcheck="false"></div>' +
      '<div class="row" style="margin-top:12px;gap:14px;align-items:flex-end">' +
      '<div class="field" style="flex:1"><label>Smoothing k <span class="faint" id="kVal">0.1</span></label>' +
      '<input type="range" id="kSlider" min="0.01" max="2" step="0.01" value="0.1"></div>' +
      '</div>' +
      '<div id="pplKpis" class="kpis" style="margin-top:12px"></div>' +
      '<div class="hint" id="pplHint" style="margin-top:12px"></div>' +
      '</div>' +
      '</div>' +

      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📚</span><h3>Training corpus</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="corpusNote"></span></div>' +
      '<textarea class="textarea mono" id="corpusIn" rows="8" style="font-size:.76rem">' + esc(D.corpus.join('\n')) + '</textarea>' +
      '<div class="row" style="margin-top:8px">' +
      '<button class="btn btn-sm" id="resetCorpus">Reset corpus</button>' +
      '<div class="spacer"></div><span class="tiny faint">one sentence per line</span>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🧮</span><h3>How the model sees it</h3></div>' +
      '<div class="formula" id="formula">P(wₜ | wₜ₋₁, wₜ₋₂) = count(wₜ₋₂, wₜ₋₁, wₜ) / count(wₜ₋₂, wₜ₋₁)</div>' +
      '<div class="tiny faint" style="margin-top:8px;line-height:1.9" id="countTable"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🐍</span><h3>Python</h3></div>' +
      UI.codeBlock(D.python.lm, { title: 'ngram_lm.py' }) +
      '</div>' +
      '</div>' +
      '</div>';

    UI.mountLab(rootEl, 'lm', body);

    const $ = (s) => rootEl.querySelector(s);
    if (NLP.state.done.lm) {
      const b = $('[data-role="lab-done-badge"]');
      if (b) { b.textContent = '✓ Completed'; b.className = 'badge badge-good'; }
    }

    let n = 2;
    let tokens = [];
    let history = [];
    let lm = null;

    function rebuild() {
      const lines = $('#corpusIn').value.split('\n').map((l) => l.trim()).filter(Boolean);
      tokens = [];
      lines.forEach((l) => {
        const t = E.tokenize(l, { keepPunct: false });
        tokens.push(...t, '.');
      });
      $('#corpusNote').textContent = lines.length + ' sentences · ' + tokens.length + ' tokens';
      buildLM();
      renderPPL();
    }

    function buildLM() {
      const k = Number($('#kSlider').value);
      lm = E.ngramLM(tokens, n, { k });
      $('#formula').textContent = n === 1
        ? 'P(wₜ) = count(wₜ) / total'
        : n === 2
        ? 'P(wₜ | wₜ₋₁) = count(wₜ₋₁, wₜ) / count(wₜ₋₁)'
        : 'P(wₜ | wₜ₋₂, wₜ₋₁) = count(wₜ₋₂, wₜ₋₁, wₜ) / count(wₜ₋₂, wₜ₋₁)';
      renderNext();
      renderCounts();
    }

    function currentCtx() {
      const raw = $('#ctxIn').value.trim();
      const toks = raw ? E.tokenize(raw, { keepPunct: false }) : [];
      return toks;
    }

    function renderNext() {
      const ctx = currentCtx();
      const res = lm.nextWords(ctx, 9);
      $('#ctxNote').textContent = n === 1
        ? 'unigram ignores context — every word has a fixed probability'
        : 'conditioning on: "' + (ctx.slice(-(n - 1)).join(' ') || '(start)') + '" · ' + res.total + ' occurrence' + (res.total === 1 ? '' : 's') + ' in corpus';

      if (!res.items.length) {
        $('#nextwords').innerHTML =
          '<div class="hint" style="grid-column:1/-1"><span>🤷</span><span><b>Unseen context.</b> "' +
          esc(ctx.slice(-(n - 1)).join(' ') || '(start)') + '" never appears in the corpus, so every word gets the same smoothed probability. ' +
          'This is the sparsity problem that BPE, embeddings and neural models exist to solve.</span></div>';
        return;
      }
      const maxP = res.items[0].p || 1;
      $('#nextwords').innerHTML = res.items
        .map((it) =>
          '<button class="nextword" data-word="' + esc(it.word) + '">' +
          '<span class="w">' + esc(it.word) + '</span>' +
          '<span class="p">p = ' + it.p.toFixed(3) + ' · n=' + it.count + '</span>' +
          '<span class="mini"><i style="width:' + (it.p / maxP) * 100 + '%"></i></span>' +
          '</button>'
        )
        .join('');
    }

    function renderCounts() {
      const ctx = currentCtx();
      const key = n === 1 ? '' : ctx.slice(-(n - 1)).join(' ');
      const m = lm.counts.get(key) || new Map();
      const rows = Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
      if (!rows.length) {
        $('#countTable').innerHTML = 'context <span class="mono" style="color:var(--bad)">"' + esc(key || '(none)') + '"</span> → <b>never seen</b>, count = 0';
        return;
      }
      $('#countTable').innerHTML =
        'context <span class="mono" style="color:var(--brand-2)">"' + esc(key || '(start)') + '"</span> · total = ' + lm.contextTotals.get(key) + '<br>' +
        rows.map(([w, c]) => '<span class="mono">' + esc(w) + '</span>:' + c).join(' &nbsp; ');
    }

    function renderPPL() {
      const evalText = $('#evalIn').value;
      const evalTokens = E.tokenize(evalText, { keepPunct: false });
      const k = Number($('#kSlider').value);
      $('#kVal').textContent = k.toFixed(2);
      const model = E.ngramLM(tokens, n, { k });
      const r = evalTokens.length ? model.perplexity(evalTokens) : { ppl: NaN, tokens: 0 };
      const zeroK = E.ngramLM(tokens, n, { k: 0 }).perplexity(evalTokens.length ? evalTokens : ['x']);

      $('#pplKpis').innerHTML =
        UI.kpi('Perplexity', isFinite(r.ppl) ? r.ppl.toFixed(2) : '∞', isFinite(r.ppl) && r.ppl < 30 ? 'good' : 'bad') +
        UI.kpi('Tokens scored', r.tokens) +
        UI.kpi('Model order', n + '-gram', 'brand') +
        UI.kpi('Vocab', model.V);

      const bits = [];
      if (!isFinite(zeroK.ppl) || zeroK.ppl === Infinity) {
        bits.push('<b>Without smoothing</b> this sentence would get perplexity ∞ (an unseen n-gram → probability 0 → log 0).');
      }
      if (k > 1) {
        bits.push('<b>k is large</b>, so probability mass is spread almost uniformly — perplexity rises toward the vocabulary size (' + model.V + ').');
      } else if (k < 0.1) {
        bits.push('<b>k is tiny</b>: the model trusts only what it has literally seen. Add a new sentence to the corpus and watch the perplexity of unseen words spike.');
      } else {
        bits.push('Try the extremes: k → 0 makes unseen n-grams impossible, k → 2 flattens everything.');
      }
      $('#pplHint').innerHTML = '<span>💡</span><span>' + bits.join(' ') + '</span>';
    }

    /* ---------------- generation ---------------- */
    function appendWord(w) {
      const ctx = currentCtx();
      const next = ctx.concat([w]);
      $('#ctxIn').value = next.slice(-6).join(' ');
      history.push(w);
      renderNext();
      renderCounts();
      renderGenerated();
    }

    function renderGenerated() {
      const gen = $('#generated');
      if (!history.length) {
        gen.innerHTML = '<span class="faint">Click “Auto-generate” or pick words above.</span>';
        $('#genNote').textContent = '';
        return;
      }
      gen.innerHTML = history
        .map((w, i) => '<span class="' + (i === history.length - 1 ? 'gen-new' : '') + '" style="' +
          (w === '.' ? 'color:var(--brand-2)' : '') + '">' + esc(w) + '</span>')
        .join(' ');
      $('#genNote').textContent = history.length + ' tokens generated';
    }

    function autoGenerate() {
      const rand = E.mulberry32(Date.now() % 100000);
      let ctx = currentCtx();
      history = [];
      for (let i = 0; i < 22; i++) {
        const res = lm.nextWords(ctx, 6);
        if (!res.items.length) break;
        const w = E.sampleFrom(res.items, rand);
        history.push(w);
        ctx = ctx.concat([w]);
        if (w === '</s>' || w === '.') {
          ctx = [];
          if (i > 8) break;
        }
      }
      renderGenerated();
    }

    /* ---------------- events ---------------- */
    on(rootEl, 'click', '#nSeg button', (ev, btn) => {
      UI.$$('#nSeg button', rootEl).forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      n = Number(btn.dataset.n);
      buildLM();
      renderPPL();
    });

    on(rootEl, 'click', '.nextword', (ev, btn) => {
      appendWord(btn.dataset.word);
    });

    $('#ctxIn').addEventListener('input', () => {
      renderNext();
      renderCounts();
    });
    $('#genBtn').addEventListener('click', autoGenerate);
    $('#clearBtn').addEventListener('click', () => {
      history = [];
      $('#ctxIn').value = '';
      renderGenerated();
      renderNext();
      renderCounts();
    });
    $('#kSlider').addEventListener('input', () => {
      buildLM();
      renderPPL();
    });
    $('#evalIn').addEventListener('input', renderPPL);
    $('#corpusIn').addEventListener('input', () => {
      clearTimeout(NLP.__lmT);
      NLP.__lmT = setTimeout(rebuild, 350);
    });
    $('#resetCorpus').addEventListener('click', () => {
      $('#corpusIn').value = D.corpus.join('\n');
      rebuild();
    });

    rebuild();
    renderGenerated();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
