/* =====================================================================
   Lab 04 — Text Similarity & Evaluation (cosine, edit distance, BLEU)
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, fmt, on } = UI;

  NLP.views.similarity = function (rootEl) {
    const body =
      '<div class="tabs" id="simTabs">' +
      '<button class="tab on" data-tab="lev">✏️ Edit distance</button>' +
      '<button class="tab" data-tab="cos">📐 Cosine &amp; Jaccard</button>' +
      '<button class="tab" data-tab="bleu">🎯 BLEU (translation)</button>' +
      '</div>' +
      '<div id="tabBody"></div>';

    UI.mountLab(rootEl, 'similarity', body);

    const $ = (s) => rootEl.querySelector(s);
    if (NLP.state.done.similarity) {
      const b = $('[data-role="lab-done-badge"]');
      if (b) { b.textContent = '✓ Completed'; b.className = 'badge badge-good'; }
    }

    /* ============================================================ */
    /* Tab 1: Levenshtein                                           */
    /* ============================================================ */
    const TYPE_EXAMPLES = {
      substitution: ['kitten', 'sitting'],
      insertion: ['cat', 'cats'],
      deletion: ['colour', 'color'],
      transposition: ['teh', 'the'],
      misspelling: ['recieve', 'receive'],
      names: ['Shahriar', 'Shahrear']
    };

    function renderLev() {
      const bodyEl = $('#tabBody');
      bodyEl.innerHTML =
        '<div class="split">' +
        '<div class="stack">' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">✏️</span><h3>Two strings</h3>' +
        '<div class="spacer"></div><span class="tiny faint">Levenshtein = insert + delete + substitute</span></div>' +
        '<div class="grid grid-2" style="gap:10px">' +
        '<div class="field"><label for="strA">String A</label><input class="input mono" id="strA" value="kitten" spellcheck="false"></div>' +
        '<div class="field"><label for="strB">String B</label><input class="input mono" id="strB" value="sitting" spellcheck="false"></div>' +
        '</div>' +
        '<div class="row" style="margin-top:10px;gap:6px" id="levQuick">' +
        Object.keys(TYPE_EXAMPLES).map((k) => '<button class="chip" data-lev="' + k + '">' + k + '</button>').join('') +
        '</div>' +
        '</div>' +

        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🔢</span><h3>Alignment</h3>' +
        '<div class="spacer"></div><span class="badge badge-brand" id="levDist">—</span></div>' +
        '<div id="levAlign"></div>' +
        '<div class="row" style="margin-top:12px;gap:10px">' +
        '<span class="badge badge-good">■ match</span><span class="badge badge-warn">■ substitution</span>' +
        '<span class="badge badge-bad">■ insert / delete</span>' +
        '</div>' +
        '</div>' +

        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🧮</span><h3>Dynamic-programming table</h3>' +
        '<div class="spacer"></div><span class="tiny faint">the highlighted path is the cheapest edit script</span></div>' +
        '<div style="overflow:auto" id="levTable"></div>' +
        '</div>' +
        '</div>' +

        '<div class="stack">' +
        '<div id="levKpis" class="kpis"></div>' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">💡</span><h3>Where it is used</h3></div>' +
        '<div class="stack" style="gap:8px;font-size:.82rem">' +
        '<div class="panel"><b>Spell check</b><div class="tiny muted">Suggest the dictionary word with the smallest distance.</div></div>' +
        '<div class="panel"><b>Fuzzy search</b><div class="tiny muted">"Shahriar" should still match "Shahrear".</div></div>' +
        '<div class="panel"><b>Evaluation</b><div class="tiny muted">WER / CER in speech recognition are normalised edit distances.</div></div>' +
        '<div class="panel"><b>Bioinformatics</b><div class="tiny muted">The same DP aligns DNA sequences.</div></div>' +
        '</div>' +
        '</div>' +
        '<div class="card"><div class="card-head"><span class="card-title-ico">🐍</span><h3>Python</h3></div>' +
        UI.codeBlock(D.python.similarity, { title: 'similarity.py' }) + '</div>' +
        '</div>' +
        '</div>';

      const a = $('#strA');
      const b = $('#strB');
      const update = () => {
        const A = a.value;
        const B = b.value;
        const res = E.levenshtein(A, B, { align: true });
        const maxLen = Math.max(A.length, B.length) || 1;
        $('#levDist').textContent = 'distance = ' + res.distance;
        $('#levKpis').innerHTML =
          UI.kpi('Distance', res.distance, 'brand') +
          UI.kpi('Max length', maxLen) +
          UI.kpi('Similarity', fmt.pct(1 - res.distance / maxLen, 1), 'good') +
          UI.kpi('Ops', res.ops.filter((o) => o.op !== 'match').length);

        // alignment
        let al = '<div class="align-row">';
        res.ops.forEach((o) => {
          al += '<span class="align-cell ' + o.op + '" title="' + o.op + '">' + esc(o.a === '_' ? '·' : o.a) + '</span>';
        });
        al += '</div><div class="align-row" style="margin-top:2px">';
        res.ops.forEach(() => (al += '<span class="align-cell empty">│</span>'));
        al += '</div><div class="align-row" style="margin-top:2px">';
        res.ops.forEach((o) => {
          al += '<span class="align-cell ' + o.op + '" title="' + o.op + '">' + esc(o.b === '_' ? '·' : o.b) + '</span>';
        });
        al += '</div>';
        $('#levAlign').innerHTML = al;

        // table (cap at 16x16 for readability)
        const m = res.matrix;
        const nr = m.length;
        const nc = m[0].length;
        if (nr > 18 || nc > 18) {
          $('#levTable').innerHTML = '<p class="tiny faint">Strings too long to display (' + nr + '×' + nc + '). Distance is still ' + res.distance + '.</p>';
          return;
        }
        // backtrace path positions
        const path = new Set();
        let i = nr - 1;
        let j = nc - 1;
        path.add(i + ',' + j);
        const sA = Array.from(A);
        const sB = Array.from(B);
        while (i > 0 || j > 0) {
          if (i > 0 && j > 0 && m[i][j] === m[i - 1][j - 1] + (sA[i - 1] === sB[j - 1] ? 0 : 1)) {
            i--; j--;
          } else if (i > 0 && m[i][j] === m[i - 1][j] + 1) {
            i--;
          } else {
            j--;
          }
          path.add(i + ',' + j);
        }

        let t = '<table class="lev-table"><thead><tr><th></th><th class="origin">∅</th>';
        Array.from(B).forEach((ch) => (t += '<th>' + esc(ch) + '</th>'));
        t += '</tr></thead><tbody>';
        for (let r = 0; r < nr; r++) {
          t += '<tr><th>' + (r === 0 ? '∅' : esc(Array.from(A)[r - 1])) + '</th>';
          for (let c = 0; c < nc; c++) {
            const inPath = path.has(r + ',' + c);
            const isFinal = r === nr - 1 && c === nc - 1;
            t += '<td class="' + (isFinal ? 'final' : inPath ? 'path' : r === 0 || c === 0 ? 'origin' : '') + '">' + m[r][c] + '</td>';
          }
          t += '</tr>';
        }
        t += '</tbody></table>';
        $('#levTable').innerHTML = t;
      };

      a.addEventListener('input', update);
      b.addEventListener('input', update);
      on(rootEl, 'click', '[data-lev]', (ev, btn) => {
        const [x, y] = TYPE_EXAMPLES[btn.dataset.lev];
        a.value = x;
        b.value = y;
        update();
      });
      update();
    }

    /* ============================================================ */
    /* Tab 2: cosine & jaccard                                      */
    /* ============================================================ */
    function renderCos() {
      $('#tabBody').innerHTML =
        '<div class="split">' +
        '<div class="stack">' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">📐</span><h3>Two texts</h3></div>' +
        '<div class="field"><label>Text A</label><textarea class="textarea mono" id="cosA" rows="3" style="font-size:.82rem">the cat sat on the mat</textarea></div>' +
        '<div class="field" style="margin-top:10px"><label>Text B</label><textarea class="textarea mono" id="cosB" rows="3" style="font-size:.82rem">the dog sat on the log</textarea></div>' +
        '<div class="row" style="margin-top:10px;gap:6px">' +
        '<button class="chip" data-cos="near">near-duplicate</button>' +
        '<button class="chip" data-cos="paraphrase">paraphrase</button>' +
        '<button class="chip" data-cos="unrelated">unrelated</button>' +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🧮</span><h3>Shared vocabulary</h3>' +
        '<div class="spacer"></div><span class="tiny faint">set overlap</span></div>' +
        '<div id="cosVenn"></div>' +
        '</div>' +
        '</div>' +
        '<div class="stack">' +
        '<div id="cosKpis" class="kpis"></div>' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🎚️</span><h3>Similarity scores</h3></div>' +
        '<div id="cosBars"></div>' +
        '<div class="hint info" style="margin-top:12px"><span>💡</span><span><b>Jaccard</b> only sees <i>which</i> words occur; <b>cosine</b> on TF-IDF also sees <i>how much</i> and <i>how rare</i> they are. That is why cosine is the default for text.</span></div>' +
        '</div>' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">📊</span><h3>Vector sketch</h3><span class="spacer"></span><span class="tiny faint" id="cosVocabNote"></span></div>' +
        '<div id="cosVec" class="matrix-scroll"></div>' +
        '</div>' +
        '</div>' +
        '</div>';

      const A = $('#cosA');
      const B = $('#cosB');
      const update = () => {
        const docs = [A.value, B.value];
        const model = E.tfidfMatrix(docs, { stopwords: D.stopwords, removeStopwords: true });
        const [va, vb] = model.tfidf;
        const cos = E.cosine(va, vb);
        const toksA = E.tokenize(A.value, { keepPunct: false }).filter((t) => !D.stopwords.includes(t));
        const toksB = E.tokenize(B.value, { keepPunct: false }).filter((t) => !D.stopwords.includes(t));
        const jac = E.jaccard(toksA, toksB);

        $('#cosKpis').innerHTML =
          UI.kpi('Cosine', cos.toFixed(3), 'brand') +
          UI.kpi('Jaccard', jac.toFixed(3)) +
          UI.kpi('Shared terms', new Set(toksA.filter((t) => toksB.includes(t))).size, 'good') +
          UI.kpi('Vocabulary', model.vocab.length);

        const max = 1;
        $('#cosBars').innerHTML =
          UI.barRow('cosine', cos, max, { cls: 'pos', text: cos.toFixed(3) }) +
          UI.barRow('jaccard', jac, max, { cls: '', text: jac.toFixed(3) });

        // shared / unique chips
        const setA = new Set(toksA);
        const setB = new Set(toksB);
        const shared = Array.from(setA).filter((t) => setB.has(t));
        const onlyA = Array.from(setA).filter((t) => !setB.has(t));
        const onlyB = Array.from(setB).filter((t) => !setA.has(t));
        $('#cosVenn').innerHTML =
          '<div class="stack" style="gap:8px">' +
          '<div><div class="tiny faint" style="margin-bottom:4px">shared (' + shared.length + ')</div><div class="chips">' +
          (shared.map((t) => UI.chip(t, { cls: 'stem' })).join('') || '<span class="tiny faint">none</span>') + '</div></div>' +
          '<div class="grid grid-2" style="gap:8px">' +
          '<div><div class="tiny faint" style="margin-bottom:4px">only A</div><div class="chips">' + (onlyA.map((t) => UI.chip(t, { cls: 'stop' })).join('') || '<span class="tiny faint">—</span>') + '</div></div>' +
          '<div><div class="tiny faint" style="margin-bottom:4px">only B</div><div class="chips">' + (onlyB.map((t) => UI.chip(t, { cls: 'stop' })).join('') || '<span class="tiny faint">—</span>') + '</div></div>' +
          '</div></div>';

        // tiny vector bars for shared/any terms
        const terms = model.vocab.slice(0, 14);
        let vh = '<div class="grid" style="gap:4px;grid-template-columns:70px 1fr 1fr;font-size:.7rem;color:var(--faint);margin-bottom:6px">' +
          '<span></span><span>A</span><span>B</span></div>';
        terms.forEach((w, i) => {
          vh += '<div class="vec-bar" style="grid-template-columns:70px 1fr 1fr">' +
            '<span class="nm">' + esc(w) + '</span>' +
            '<span class="vec-track"><span class="vec-fill pos" style="left:0;width:' + Math.min(100, va[i] * 160).toFixed(1) + '%"></span></span>' +
            '<span class="vec-track"><span class="vec-fill neg" style="left:0;width:' + Math.min(100, vb[i] * 160).toFixed(1) + '%"></span></span>' +
            '</div>';
        });
        $('#cosVec').innerHTML = vh;
        $('#cosVocabNote').textContent = terms.length + ' of ' + model.vocab.length + ' terms';
      };

      A.addEventListener('input', update);
      B.addEventListener('input', update);
      on(rootEl, 'click', '[data-cos]', (ev, btn) => {
        const sets = {
          near: ['the cat sat on the mat', 'the cat sat on the mats'],
          paraphrase: ['the movie was absolutely wonderful', 'I really enjoyed the film'],
          unrelated: ['quantum entanglement in superconductors', 'my grandmother bakes excellent bread']
        };
        const [x, y] = sets[btn.dataset.cos];
        A.value = x;
        B.value = y;
        update();
      });
      update();
    }

    /* ============================================================ */
    /* Tab 3: BLEU                                                  */
    /* ============================================================ */
    function renderBleu() {
      $('#tabBody').innerHTML =
        '<div class="split">' +
        '<div class="stack">' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🎯</span><h3>Translation candidate</h3>' +
        '<div class="spacer"></div><span class="tiny faint">the machine output</span></div>' +
        '<textarea class="textarea" id="bleuCand" rows="2">the cat is sitting on the mat</textarea>' +
        '<div class="card-head" style="margin-top:14px"><span class="card-title-ico">📚</span><h3>Reference translation(s)</h3>' +
        '<div class="spacer"></div><span class="tiny faint">one per line</span></div>' +
        '<textarea class="textarea" id="bleuRefs" rows="3" style="font-size:.85rem">the cat is on the mat\nthe cat sits on the mat</textarea>' +
        '<div class="row" style="margin-top:10px;gap:6px">' +
        '<button class="chip" data-bleu="perfect">perfect match</button>' +
        '<button class="chip" data-bleu="short">too short</button>' +
        '<button class="chip" data-bleu="wordorder">wrong word order</button>' +
        '<button class="chip" data-bleu="wrong">wrong words</button>' +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🧮</span><h3>Precision by n-gram order</h3></div>' +
        '<div id="bleuBars"></div>' +
        '<div class="hint" style="margin-top:12px"><span>⚠️</span><span>If <b>any</b> order has zero matches, classic BLEU is 0 — a single missing 4-gram caps everything. That harshness is a known weakness.</span></div>' +
        '</div>' +
        '</div>' +
        '<div class="stack">' +
        '<div class="card center" style="padding:26px">' +
        '<div class="tiny faint" style="letter-spacing:.14em;text-transform:uppercase">BLEU score</div>' +
        '<div id="bleuScore" style="font-size:3rem;font-weight:800;letter-spacing:-.03em;line-height:1.1;background:linear-gradient(100deg,var(--brand-2),var(--accent));-webkit-background-clip:text;background-clip:text;color:transparent">—</div>' +
        '<div class="tiny faint" id="bleuVerdict"></div>' +
        '</div>' +
        '<div id="bleuKpis" class="kpis"></div>' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🐍</span><h3>Python</h3></div>' +
        UI.codeBlock(D.python.similarity, { title: 'similarity.py' }) +
        '</div>' +
        '</div>' +
        '</div>';

      const cand = $('#bleuCand');
      const refs = $('#bleuRefs');
      const update = () => {
        const refList = refs.value.split('\n').map((s) => s.trim()).filter(Boolean);
        const r = E.bleu(cand.value, refList);
        const score = r.score;
        $('#bleuScore').textContent = (score * 100).toFixed(1);
        $('#bleuVerdict').textContent =
          score > 0.9 ? 'essentially identical to the reference'
          : score > 0.6 ? 'good translation, minor differences'
          : score > 0.3 ? 'partially correct'
          : score > 0 ? 'mostly wrong but shares some phrases'
          : 'no matching n-grams (or an order has zero matches)';

        $('#bleuKpis').innerHTML =
          UI.kpi('Brevity penalty', r.bp.toFixed(3), r.bp > 0.95 ? 'good' : 'bad') +
          UI.kpi('Cand length', r.candLen) +
          UI.kpi('Ref length', r.refLen) +
          UI.kpi('Orders used', r.orders, 'brand');

        const maxP = 1;
        $('#bleuBars').innerHTML = r.ratios.map((x) =>
          UI.barRow(x.n + '-gram', x.p, maxP, {
            cls: x.p > 0.7 ? 'pos' : x.p > 0.3 ? 'warn' : 'neg',
            text: x.p.toFixed(2) + ' (' + x.match + '/' + x.total + ')'
          })
        ).join('') +
          '<div class="barrow" style="margin-top:8px"><span class="lbl">BP</span>' +
          '<span class="bartrack"><span class="barfill ' + (r.bp > 0.95 ? 'pos' : 'warn') + '" style="width:' + (r.bp * 100).toFixed(1) + '%"></span></span>' +
          '<span class="val">' + r.bp.toFixed(3) + '</span></div>';
      };

      cand.addEventListener('input', update);
      refs.addEventListener('input', update);
      on(rootEl, 'click', '[data-bleu]', (ev, btn) => {
        const c = {
          perfect: ['the cat is on the mat', 'the cat is on the mat'],
          short: ['the cat', 'the cat is on the mat'],
          wordorder: ['mat the on is cat the', 'the cat is on the mat'],
          wrong: ['a dog sleeps under a table', 'the cat is on the mat']
        }[btn.dataset.bleu];
        cand.value = c[0];
        refs.value = c[1];
        update();
      });
      update();
    }

    /* ============================================================ */
    /* Tabs                                                         */
    /* ============================================================ */
    const renderers = { lev: renderLev, cos: renderCos, bleu: renderBleu };
    on(rootEl, 'click', '#simTabs .tab', (ev, btn) => {
      UI.$$('#simTabs .tab', rootEl).forEach((t) => t.classList.remove('on'));
      btn.classList.add('on');
      renderers[btn.dataset.tab]();
    });
    renderLev();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
