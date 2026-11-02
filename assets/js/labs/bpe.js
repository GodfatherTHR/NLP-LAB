/* =====================================================================
   Lab 07 — Byte-Pair Encoding (sub-word tokenization)
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, fmt, on } = UI;

  NLP.views.bpe = function (rootEl) {
    const body =
      '<div class="split">' +
      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🧩</span><h3>Learn merges</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="vocabBadge"></span></div>' +
      '<div class="row" style="margin-bottom:12px">' +
      '<div class="field" style="flex:1"><label>Number of merges <span class="faint" id="mergeVal">12</span></label>' +
      '<input type="range" id="mergeSlider" min="1" max="40" value="12"></div>' +
      '</div>' +
      '<div class="row" style="gap:10px">' +
      '<button class="btn btn-primary btn-sm" id="stepBtn">▶ Next merge</button>' +
      '<button class="btn btn-sm" id="playBtn">⏩ Play all</button>' +
      '<button class="btn btn-sm" id="resetBpe">↺ Reset</button>' +
      '<div class="spacer"></div><span class="badge" id="stepBadge">step 0</span>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📊</span><h3>Pair frequency</h3>' +
      '<div class="spacer"></div><span class="tiny faint">most frequent pair gets merged</span></div>' +
      '<div id="pairBars"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📚</span><h3>Corpus after merges</h3>' +
      '<div class="spacer"></div><span class="tiny faint">word · frequency</span></div>' +
      '<div id="corpusView" style="max-height:320px;overflow:auto"></div>' +
      '</div>' +
      '</div>' +

      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🔤</span><h3>Encode a word</h3>' +
      '<div class="spacer"></div><span class="tiny faint">using the merges learned so far</span></div>' +
      '<div class="row"><input class="input mono" id="bpeWord" value="lowest" spellcheck="false" style="flex:1">' +
      '<button class="btn btn-primary" id="encodeBtn">Encode</button></div>' +
      '<div id="encodeOut" style="margin-top:14px"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🗂️</span><h3>Vocabulary</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="vocabCount"></span></div>' +
      '<div class="chips" id="vocabChips" style="max-height:180px;overflow:auto"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📖</span><h3>Why sub-words?</h3></div>' +
      '<div class="grid" style="gap:8px">' +
      '<div class="panel"><b class="tiny">Word vocabulary</b><div class="tiny muted">Small corpus → many unknown words. "tokenization" = ❓</div></div>' +
      '<div class="panel"><b class="tiny">Character vocabulary</b><div class="tiny muted">Never unknown, but a 4-letter word costs 4 tokens — sequences explode.</div></div>' +
      '<div class="panel" style="border-left:3px solid var(--good)"><b class="tiny">Sub-word vocabulary</b><div class="tiny muted">"token" + "ization" — familiar pieces, bounded vocabulary, no unknowns.</div></div>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🐍</span><h3>Python</h3></div>' +
      UI.codeBlock(D.python.bpe, { title: 'bpe.py' }) +
      '</div>' +
      '</div>' +
      '</div>';

    UI.mountLab(rootEl, 'bpe', body);

    const $ = (s) => rootEl.querySelector(s);
    if (NLP.state.done.bpe) {
      const b = $('[data-role="lab-done-badge"]');
      if (b) { b.textContent = '✓ Completed'; b.className = 'badge badge-good'; }
    }

    let totalMerges = 12;
    let currentStep = 0;
    let trained = null;
    let playTimer = null;

    function train(num) {
      trained = E.bpeTrain(Object.entries(D.bpeCorpus), { merges: num });
      return trained;
    }

    function visibleMerges() {
      return trained ? trained.merges.slice(0, currentStep) : [];
    }

    /* ---------------- render ---------------- */
    function render() {
      if (!trained) return;
      const steps = trained.steps;
      const step = currentStep > 0 ? steps[currentStep - 1] : null;

      $('#stepBadge').textContent = 'step ' + currentStep + ' / ' + totalMerges;
      $('#mergeVal').textContent = totalMerges;

      // vocabulary = chars + merges so far
      const vocab = new Set();
      Object.keys(D.bpeCorpus).forEach((w) => Array.from(w).forEach((ch) => vocab.add(ch)));
      vocab.add('</w>');
      trained.merges.slice(0, currentStep).forEach(([a, b]) => vocab.add(a + b));
      $('#vocabBadge').textContent = vocab.size + ' tokens in vocabulary';
      $('#vocabCount').textContent = vocab.size + ' pieces';
      $('#vocabChips').innerHTML = Array.from(vocab)
        .sort((a, b) => a.length - b.length || a.localeCompare(b))
        .map((v) => UI.chip(v.replace('</w>', '·'), { cls: v.endsWith('</w>') ? 'stem' : '' }))
        .join('');

      // pair frequencies for the *current* state
      const corpusNow = step ? step.corpus : Object.entries(D.bpeCorpus).map(([w, f]) => ({
        word: Array.from(w).concat(['</w>']).join(' '),
        symbols: Array.from(w).concat(['</w>']),
        freq: f
      }));
      const pairs = new Map();
      corpusNow.forEach((item) => {
        for (let i = 0; i < item.symbols.length - 1; i++) {
          const k = item.symbols[i] + ' + ' + item.symbols[i + 1];
          pairs.set(k, (pairs.get(k) || 0) + item.freq);
        }
      });
      const ranked = Array.from(pairs.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const maxC = ranked.length ? ranked[0][1] : 1;
      $('#pairBars').innerHTML = ranked.length
        ? ranked.map(([k, c], i) =>
            '<div class="barrow" style="' + (i === 0 ? 'padding:4px 6px;border-radius:6px;background:color-mix(in srgb,var(--brand) 10%,transparent)' : '') + '">' +
            '<span class="lbl">' + esc(k) + '</span>' +
            '<span class="bartrack"><span class="barfill ' + (i === 0 ? 'pos' : '') + '" style="width:' + (c / maxC) * 100 + '%"></span></span>' +
            '<span class="val">' + c + '</span></div>'
          ).join('')
        : '<p class="tiny faint">Everything merged into single symbols.</p>';

      // corpus view
      const corpusFinal = currentStep === 0
        ? Object.entries(D.bpeCorpus).map(([w, f]) => ({ symbols: Array.from(w).concat(['</w>']), freq: f }))
        : trained.steps[currentStep - 1].corpus;
      $('#corpusView').innerHTML = corpusFinal
        .map((item) => {
          const isMerged = item.symbols.length > Array.from(String(item.word || '').replace(/ /g, '')).length - 1;
          return '<div class="bpe-word" style="margin-bottom:5px;align-items:center">' +
            '<span class="tiny" style="width:66px;color:var(--faint);font-family:var(--mono)">n=' + item.freq + '</span>' +
            item.symbols.map((s) => '<span class="bpe-sym' + (s.endsWith('</w>') ? ' merged' : '') + '">' + esc(s.replace('</w>', '·')) + '</span>').join('') +
            '</div>';
        })
        .join('');

      encode();
    }

    /* ---------------- encoding ---------------- */
    function encode() {
      const word = $('#bpeWord').value.trim().toLowerCase();
      if (!word) {
        $('#encodeOut').innerHTML = '<p class="tiny faint">Type a word.</p>';
        return;
      }
      const merges = visibleMerges();
      const res = E.bpeEncode(word, merges);
      const inVocab = merges.length === trained.merges.length && Object.prototype.hasOwnProperty.call(D.bpeCorpus, word);
      let h = '<div class="bpe-word" style="margin-bottom:10px">' +
        res.tokens.map((s) => '<span class="bpe-sym merged">' + esc(s.replace('</w>', '·')) + '</span>').join('') +
        '</div>';
      h += '<div class="row" style="gap:10px;margin-bottom:10px">' +
        UI.kpi('Tokens', res.tokens.length, res.tokens.length <= 2 ? 'good' : res.tokens.length >= 6 ? 'bad' : '') +
        UI.kpi('Characters', word.length) +
        UI.kpi('Merges applied', res.trace.length, 'brand') +
        '</div>';

      if (res.trace.length) {
        h += '<div class="tiny faint" style="margin-bottom:5px">merge steps</div><div class="stack" style="gap:4px">';
        res.trace.slice(0, 12).forEach((t, i) => {
          h += '<div class="bpe-merge-row"><span class="idx">' + (i + 1) + '</span>' +
            '<span style="color:var(--brand-2)">' + esc(t.merge) + '</span>' +
            '<span style="color:var(--faint)">→</span>' +
            '<span class="mono">' + t.symbols.map((s) => esc(s.replace('</w>', '·'))).join(' ') + '</span>' +
            '</div>';
        });
        h += '</div>';
      } else {
        h += '<p class="tiny faint">No learned merge applies — every character is its own token.</p>';
      }

      if (!inVocab) {
        h += '<div class="hint info" style="margin-top:10px"><span>✨</span><span>' +
          '<b>“' + esc(word) + '” is not in the training corpus</b> — that is the point. A word-level vocabulary would emit [UNK]; BPE builds it from pieces it already knows (' +
          res.tokens.length + ' token' + (res.tokens.length === 1 ? '' : 's') + ').</span></div>';
      }
      $('#encodeOut').innerHTML = h;
    }

    /* ---------------- controls ---------------- */
    function setStep(s) {
      currentStep = Math.max(0, Math.min(totalMerges, s));
      render();
    }

    $('#mergeSlider').addEventListener('input', (e) => {
      totalMerges = Number(e.target.value);
      train(totalMerges);
      currentStep = Math.min(currentStep, totalMerges);
      render();
    });
    $('#stepBtn').addEventListener('click', () => {
      if (currentStep >= totalMerges) {
        currentStep = 0;
      } else {
        currentStep++;
      }
      render();
    });
    $('#playBtn').addEventListener('click', () => {
      if (playTimer) { clearInterval(playTimer); playTimer = null; return; }
      currentStep = 0;
      render();
      playTimer = setInterval(() => {
        if (currentStep >= totalMerges) {
          clearInterval(playTimer);
          playTimer = null;
          return;
        }
        currentStep++;
        render();
      }, 420);
    });
    $('#resetBpe').addEventListener('click', () => {
      if (playTimer) { clearInterval(playTimer); playTimer = null; }
      setStep(0);
    });
    $('#encodeBtn').addEventListener('click', encode);
    $('#bpeWord').addEventListener('input', encode);
    on(rootEl, 'click', '[data-enc]', (ev, btn) => {
      $('#bpeWord').value = btn.dataset.enc;
      encode();
    });

    /* ---------------- boot ---------------- */
    train(totalMerges);
    // start with a few merges so the demo looks alive immediately
    currentStep = 6;
    render();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
