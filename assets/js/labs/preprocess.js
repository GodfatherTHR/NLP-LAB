/* =====================================================================
   Lab 01 — Text Preprocessing
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, fmt, on } = UI;

  NLP.views.preprocess = function (rootEl) {
    const body =
      '<div class="split">' +
      /* ---------------- left: controls + pipeline ---------------- */
      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">✂️</span><h3>Your text</h3>' +
      '<div class="spacer"></div>' +
      '<div class="seg" id="sampleSeg">' +
      Object.keys(D.sampleTexts).map((k, i) => '<button data-sample="' + esc(k) + '" class="' + (i === 0 ? 'on' : '') + '">' + esc(k) + '</button>').join('') +
      '</div></div>' +
      '<textarea class="textarea mono" id="textIn" rows="5" spellcheck="false" style="font-size:.85rem">' + esc(D.sampleTexts.Classic) + '</textarea>' +
      '<div class="row" style="margin-top:10px">' +
      '<span class="tiny faint" id="charCount"></span>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn-sm" id="resetOpts">Reset options</button>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">⚙️</span><h3>Pipeline steps</h3>' +
      '<div class="spacer"></div><span class="tiny faint">toggle &amp; watch</span></div>' +
      '<div class="grid grid-2" style="gap:8px">' +
      UI.switchRow('Lowercase', 'Cat → cat', true, 'data-opt="lowercase"') +
      UI.switchRow('Remove punctuation', 'drop , ! ?', true, 'data-opt="removePunct"') +
      UI.switchRow('Remove numbers', 'drop 42', false, 'data-opt="removeNumbers"') +
      UI.switchRow('Remove stop words', 'the, is, and…', true, 'data-opt="stopwords"') +
      UI.switchRow('Stem (Porter)', 'studies → studi', true, 'data-opt="stem"') +
      UI.switchRow('Fix accents', 'café → cafe', false, 'data-opt="accents"') +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🔗</span><h3>Stage by stage</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="stageSummary"></span></div>' +
      '<div class="token-flow" id="flow"></div>' +
      '</div>' +
      '</div>' +

      /* ---------------- right: stats ---------------- */
      '<div class="stack">' +
      '<div class="kpis" id="kpis"></div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📉</span><h3>Vocabulary shrinkage</h3></div>' +
      '<div id="vocabBars"></div>' +
      '<p class="tiny faint" style="margin-top:8px">Each step removes noise. Too much removal loses signal — that is the trade-off.</p>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🏆</span><h3>Most frequent (after cleaning)</h3></div>' +
      '<div id="topWords" class="chips"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🐍</span><h3>Same thing in Python</h3></div>' +
      UI.codeBlock(D.python.preprocess, { title: 'preprocess.py' }) +
      '</div>' +

      '<div class="hint"><span>💡</span><span><b>Try this:</b> type <code class="mono">I do not like it</code> with stop words on, then off. The word <i>not</i> disappears — which is exactly why sentiment models often skip stop-word removal.</span></div>' +
      '</div>' +
      '</div>';

    UI.mountLab(rootEl, 'preprocess', body);

    /* ---------------- state ---------------- */
    const opts = { lowercase: true, removePunct: true, removeNumbers: false, stopwords: true, stem: true, accents: false };
    const $ = (s) => rootEl.querySelector(s);
    const input = $('#textIn');

    if (NLP.state.done.preprocess) {
      const b = $('[data-role="lab-done-badge"]');
      if (b) { b.textContent = '✓ Completed'; b.className = 'badge badge-good'; }
      const btn = $('[data-role="mark-done"]');
      if (btn) { btn.textContent = '✓ Completed'; btn.disabled = true; }
    }

    /* ---------------- pipeline ---------------- */
    function run() {
      let text = input.value;
      if (opts.accents) text = E.stripAccents(text);

      const steps = E.preprocess(text, {
        lowercase: opts.lowercase,
        removePunct: opts.removePunct,
        removeNumbers: opts.removeNumbers,
        stopwords: opts.stopwords ? D.stopwords : [],
        stem: opts.stem
      });

      // stats
      const rawTokens = E.tokenize(text, { keepCase: true });
      const finalTokens = steps[steps.length - 1].tokens;
      const vocabRaw = new Set(rawTokens.map((t) => t.toLowerCase())).size;
      const vocabFinal = new Set(finalTokens).size;
      const chars = text.length;
      const types = finalTokens.length ? E.tally(finalTokens).size : 0;

      $('#charCount').textContent = text.length + ' chars · ' + rawTokens.length + ' raw tokens';

      $('#kpis').innerHTML =
        UI.kpi('Characters', fmt.num(chars)) +
        UI.kpi('Raw tokens', fmt.num(rawTokens.length)) +
        UI.kpi('Clean tokens', fmt.num(finalTokens.length), 'brand') +
        UI.kpi('Vocabulary', fmt.num(vocabFinal), 'good') +
        UI.kpi('Reduction', chars ? fmt.pct(1 - finalTokens.length / Math.max(1, rawTokens.length)) : '—');

      // flow
      $('#flow').innerHTML = steps
        .map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            '<div class="token-stage">' +
            '<div class="token-stage-head">' +
            '<span class="n">' + (i + 1) + '</span>' +
            '<span>' + esc(s.label) + '</span>' +
            '<span class="note">' + esc(s.note) + ' · ' + s.tokens.length + ' tok</span>' +
            '</div>' +
            '<div class="chips">' +
            (s.tokens.length
              ? s.tokens.slice(0, 220).map((t, ti) =>
                  UI.chip(t, {
                    cls: s.key === 'stem' ? 'stem' : isLast ? '' : '',
                    title: s.key === 'stem' ? 'stem' : null
                  })
                ).join('') + (s.tokens.length > 220 ? '<span class="chip">+' + (s.tokens.length - 220) + ' more</span>' : '')
              : '<span class="tiny faint">∅ nothing left</span>') +
            '</div>' +
            '</div>'
          );
        })
        .join('');

      $('#stageSummary').textContent = steps.length + ' stages';

      // vocab bars
      const bars = [];
      bars.push(['Raw tokens', rawTokens.length, vocabRaw]);
      steps.forEach((s) => {
        const uniq = new Set(s.tokens).size;
        bars.push([s.label, s.tokens.length, uniq]);
      });
      const maxTok = Math.max.apply(null, bars.map((b) => b[1]));
      $('#vocabBars').innerHTML = bars
        .map(([label, tok, uniq]) =>
          '<div style="margin-bottom:9px">' +
          '<div class="row-tight" style="justify-content:space-between;margin-bottom:3px">' +
          '<span class="tiny" style="color:var(--muted)">' + esc(label) + '</span>' +
          '<span class="tiny mono faint">' + uniq + ' unique</span></div>' +
          '<div class="bartrack" style="height:9px"><div class="barfill" style="width:' + (maxTok ? (tok / maxTok) * 100 : 0).toFixed(1) + '%"></div></div>' +
          '</div>'
        )
        .join('');

      // top words
      const counts = E.tally(finalTokens);
      const top = E.sortedEntries(counts, 16);
      $('#topWords').innerHTML = top.length
        ? top.map(([w, c]) => UI.chip(w, { count: c })).join('')
        : '<span class="faint tiny">No tokens left — try disabling some steps.</span>';
    }

    /* ---------------- events ---------------- */
    input.addEventListener('input', run);

    on(rootEl, 'change', '[data-opt]', (ev, el) => {
      opts[el.dataset.opt] = el.checked;
      run();
    });

    on(rootEl, 'click', '[data-sample]', (ev, btn) => {
      UI.$$('.seg button', rootEl).forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      input.value = D.sampleTexts[btn.dataset.sample];
      run();
    });

    $('#resetOpts').addEventListener('click', () => {
      Object.assign(opts, { lowercase: true, removePunct: true, removeNumbers: false, stopwords: true, stem: true, accents: false });
      rootEl.querySelectorAll('[data-opt]').forEach((el) => {
        el.checked = !!opts[el.dataset.opt];
      });
      run();
    });

    run();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
