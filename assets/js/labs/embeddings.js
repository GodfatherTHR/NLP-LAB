/* =====================================================================
   Lab 08 — Word Embeddings
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, fmt, on } = UI;

  const CLUSTER_COLORS = {
    royal: '#a855f7', male: '#3b82f6', female: '#ec4899', person: '#60a5fa',
    animal: '#34d399', food: '#fbbf24', tech: '#22d3ee', good: '#4ade80',
    bad: '#f87171', big: '#f472b6', speed: '#facc15', place: '#38bdf8',
    capital: '#818cf8', music: '#c084fc', sport: '#fb923c', countryFR: '#38bdf8',
    countryIT: '#38bdf8', countryJP: '#38bdf8', countryBD: '#38bdf8', countryUK: '#38bdf8'
  };

  function wordColor(word) {
    const spec = D.embeddingWords[word];
    if (!spec) return '#94a3b8';
    // dominant concept = largest weight
    let best = spec[0];
    let bestW = spec[1];
    for (let i = 2; i < spec.length; i += 2) {
      if (spec[i + 1] > bestW) { best = spec[i]; bestW = spec[i + 1]; }
    }
    return CLUSTER_COLORS[best] || '#94a3b8';
  }

  NLP.views.embeddings = function (rootEl) {
    const body =
      '<div class="tabs" id="embTabs">' +
      '<button class="tab on" data-tab="map">🗺️ Concept map</button>' +
      '<button class="tab" data-tab="analogy">➕ Word arithmetic</button>' +
      '<button class="tab" data-tab="learned">🧪 Learned from corpus</button>' +
      '</div>' +
      '<div id="tabBody"></div>';

    UI.mountLab(rootEl, 'embeddings', body);

    const $ = (s) => rootEl.querySelector(s);
    if (NLP.state.done.embeddings) {
      const b = $('[data-role="lab-done-badge"]');
      if (b) { b.textContent = '✓ Completed'; b.className = 'badge badge-good'; }
    }

    /* ---------------- shared: raw concept vectors ---------------- */
    const RAW = {};
    Object.keys(D.embeddingWords).forEach((w) => {
      RAW[w] = E.conceptVector(w, D.embeddingAxes, D.concepts, D.embeddingWords, false);
    });
    const NORM = {};
    Object.keys(RAW).forEach((w) => (NORM[w] = E.normalizeVec(RAW[w])));

    /* ============================================================ */
    /* Tab 1 — concept map                                          */
    /* ============================================================ */
    function renderMap() {
      const pca = E.pca2(D.embeddingAxes.map((a) => D.embeddingAxes.map((b) => (a === b ? 1 : 0))));
      // Project the raw concept vectors onto 2 principal components of the *word* matrix
      const words = Object.keys(RAW);
      const proj = E.pca2(words.map((w) => RAW[w]));
      // find cluster emphasis per word for colour

      const W = 720;
      const H = 460;
      const PAD = 44;
      const xs = proj.coords.map((c) => c[0]);
      const ys = proj.coords.map((c) => c[1]);
      const minX = Math.min.apply(null, xs);
      const maxX = Math.max.apply(null, xs);
      const minY = Math.min.apply(null, ys);
      const maxY = Math.max.apply(null, ys);
      const sx = (x) => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2);
      const sy = (y) => H - PAD - ((y - minY) / (maxY - minY || 1)) * (H - PAD * 2);

      let pts = '';
      words.forEach((w, i) => {
        const x = sx(proj.coords[i][0]);
        const y = sy(proj.coords[i][1]);
        const col = wordColor(w);
        pts += '<g class="scatter-pt" data-word="' + esc(w) + '" tabindex="0">' +
          '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5.5" fill="' + col + '" fill-opacity="0.85" stroke="' + col + '" stroke-width="1.5"/>' +
          '<text class="scatter-label" x="' + (x + 8).toFixed(1) + '" y="' + (y + 3.5).toFixed(1) + '">' + esc(w) + '</text>' +
          '</g>';
      });

      $('#tabBody').innerHTML =
        '<div class="split">' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🗺️</span><h3>Meaning as geometry</h3>' +
        '<div class="spacer"></div><span class="tiny faint">PCA of 51 hand-built vectors</span></div>' +
        '<div class="scatter-wrap"><svg class="scatter-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Word embedding concept map">' +
        '<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">' +
        '<path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--line-soft)" stroke-width="1"/></pattern></defs>' +
        '<rect width="' + W + '" height="' + H + '" fill="url(#grid)" opacity="0.6"/>' +
        pts + '</svg></div>' +
        '<p class="tiny faint" style="margin-top:8px">Each word is a sum of interpretable concept axes (royalty, male/female, animal, food, …), projected onto 2 dimensions with PCA. Click a word to see its nearest neighbours.</p>' +
        '</div>' +
        '<div class="stack">' +
        '<div class="card"><div class="card-head"><span class="card-title-ico">📍</span><h3 id="nnTitle">Nearest neighbours</h3></div>' +
        '<div id="nnOut"><p class="tiny faint">Click a point on the map.</p></div></div>' +
        '<div class="card"><div class="card-head"><span class="card-title-ico">🧮</span><h3>Vector for “<span id="vecWord">king</span>”</h3></div>' +
        '<div id="vecBars" class="vec-bars"></div></div>' +
        '</div>' +
        '</div>' +
        '<div class="card" style="margin-top:16px">' +
        '<div class="card-head"><span class="card-title-ico">💡</span><h3>What you are looking at</h3></div>' +
        '<div class="grid grid-3" style="gap:10px">' +
        '<div class="panel"><b class="tiny">The distributional hypothesis</b><div class="tiny muted" style="margin-top:3px">“You shall know a word by the company it keeps” — Firth, 1957. Words in similar contexts get similar vectors.</div></div>' +
        '<div class="panel"><b class="tiny">One-hot vs. dense</b><div class="tiny muted" style="margin-top:3px">One-hot: 50,000 dimensions, all equally far. Dense: 100–300 dimensions where distance means meaning.</div></div>' +
        '<div class="panel"><b class="tiny">Real models</b><div class="tiny muted" style="margin-top:3px">Word2Vec (2013), GloVe (2014) and contextual models (BERT, 2018) all produce such vectors — the last one per-token, not per-word.</div></div>' +
        '</div></div>';

      let selected = 'king';
      const showVec = (w) => {
        selected = w;
        $('#vecWord').textContent = w;
        const v = RAW[w];
        const maxAbs = Math.max.apply(null, v.map((x) => Math.abs(x)).concat([0.001]));
        $('#vecBars').innerHTML = v
          .map((val, i) => ({ val, axis: D.embeddingAxes[i] }))
          .filter((x) => Math.abs(x.val) > 0.001)
          .sort((a, b) => Math.abs(b.val) - Math.abs(a.val))
          .map(({ val, axis }) => {
            const w2 = (Math.abs(val) / maxAbs) * 100;
            return '<div class="vec-bar"><span class="nm">' + esc(axis) + '</span>' +
              '<span class="vec-track"><span class="vec-fill ' + (val >= 0 ? 'pos' : 'neg') + '" style="' + (val >= 0 ? 'left:50%;' : 'right:50%;') + 'width:' + (w2 / 2).toFixed(1) + '%"></span></span>' +
              '<span class="vv">' + val.toFixed(2) + '</span></div>';
          })
          .join('') || '<p class="tiny faint">All values near zero.</p>';
      };

      const showNN = (w) => {
        showVec(w);
        $('#nnTitle').textContent = 'Nearest to “' + w + '”';
        const sims = Object.keys(NORM)
          .filter((x) => x !== w)
          .map((x) => ({ word: x, sim: E.cosine(NORM[w], NORM[x]) }))
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 8);
        const max = sims.length ? sims[0].sim : 1;
        $('#nnOut').innerHTML =
          '<div class="barlist">' + sims.map((s) =>
            UI.barRow(s.word, Math.max(0, s.sim), max, { cls: 'pos', text: s.sim.toFixed(3) })
          ).join('') + '</div>' +
          '<p class="tiny faint" style="margin-top:8px">cosine similarity in the full 20-dimensional concept space (not the 2-D projection).</p>';
      };

      on(rootEl, 'click', '.scatter-pt', (ev, g) => {
        rootEl.querySelectorAll('.scatter-pt circle').forEach((c) => c.setAttribute('r', '5.5'));
        g.querySelector('circle').setAttribute('r', '8');
        showNN(g.dataset.word);
      });

      showNN('king');
    }

    /* ============================================================ */
    /* Tab 2 — analogies                                            */
    /* ============================================================ */
    function renderAnalogy() {
      const words = Object.keys(RAW).sort();
      const opts = (sel) => words.map((w) => '<option value="' + esc(w) + '"' + (w === sel ? ' selected' : '') + '>' + esc(w) + '</option>').join('');

      $('#tabBody').innerHTML =
        '<div class="split">' +
        '<div class="stack">' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">➕</span><h3>Vector arithmetic</h3>' +
        '<div class="spacer"></div><span class="tiny faint">a − b + c = ?</span></div>' +
        '<div class="row" style="gap:8px;align-items:flex-end">' +
        '<div class="field" style="flex:1;min-width:90px"><label>a</label><select class="select" id="anaA">' + opts('king') + '</select></div>' +
        '<span class="mono faint" style="padding-bottom:9px">−</span>' +
        '<div class="field" style="flex:1;min-width:90px"><label>b</label><select class="select" id="anaB">' + opts('man') + '</select></div>' +
        '<span class="mono faint" style="padding-bottom:9px">+</span>' +
        '<div class="field" style="flex:1;min-width:90px"><label>c</label><select class="select" id="anaC">' + opts('woman') + '</select></div>' +
        '</div>' +
        '<div class="row" style="margin-top:12px">' +
        '<button class="btn btn-primary" id="analogyBtn">Compute</button>' +
        '<div class="spacer"></div><span class="tiny faint">try the presets →</span>' +
        '</div>' +
        '<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap">' +
        D.analogyTriples.map(([a, b, c, exp], i) => '<button class="chip" data-triple="' + i + '">' + a + ' − ' + b + ' + ' + c + '</button>').join('') +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🎯</span><h3>Result</h3></div>' +
        '<div id="analogyOut"><p class="tiny faint">Pick three words and press Compute.</p></div>' +
        '</div>' +
        '</div>' +
        '<div class="stack">' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🧭</span><h3>Directions carry meaning</h3></div>' +
        '<p class="tiny muted" style="margin-bottom:10px">The vector from <span class="mono">man</span> to <span class="mono">woman</span> is the “gender” direction. Adding it to <span class="mono">king</span> lands on <span class="mono">queen</span>.</p>' +
        '<div class="formula">king − man + woman ≈ queen</div>' +
        '<div class="stack" style="gap:8px;margin-top:12px">' +
        '<div class="panel"><div class="tiny"><b>royal</b> <span class="faint">— the concept shared by king &amp; queen</span></div>' +
        '<div class="tiny mono" style="color:var(--brand-2)">king (royal+male+person) − man (male+person) + woman (female+person) = royal+female+person</div></div>' +
        '<div class="panel"><div class="tiny"><b>Capital cities</b> <span class="faint">follow the same pattern</span></div>' +
        '<div class="tiny mono" style="color:var(--brand-2)">paris − france + italy = rome</div></div>' +
        '</div>' +
        '<div class="hint" style="margin-top:12px"><span>⚠️</span><span>Real embeddings are noisier: analogies work maybe 60–75% of the time, and they inherit human biases from the training text (e.g. gender stereotypes around professions).</span></div>' +
        '</div>' +
        '</div>' +
        '</div>';

      const compute = () => {
        const a = $('#anaA').value;
        const b = $('#anaB').value;
        const c = $('#anaC').value;
        const res = E.analogy(a, b, c, RAW);
        if (!res.ranked.length) {
          $('#analogyOut').innerHTML = '<p class="tiny faint">Pick three different words.</p>';
          return;
        }
        const top = res.ranked.slice(0, 6);
        const max = top[0].score || 1;
        const winner = top[0].word;

        $('#analogyOut').innerHTML =
          '<div class="row" style="gap:8px;margin-bottom:12px;flex-wrap:wrap">' +
          '<span class="chip">' + esc(a) + '</span><span class="faint">−</span>' +
          '<span class="chip">' + esc(b) + '</span><span class="faint">+</span>' +
          '<span class="chip">' + esc(c) + '</span><span class="mono faint">≈</span>' +
          '<span class="chip stem" style="font-size:1rem;padding:6px 12px">' + esc(winner) + '</span>' +
          '</div>' +
          '<div class="barlist">' + top.map((t, i) =>
            UI.barRow((i === 0 ? '★ ' : '') + t.word, Math.max(0, t.score), max, {
              cls: i === 0 ? 'pos' : '',
              text: t.score.toFixed(3)
            })
          ).join('') + '</div>' +
          '<div class="hint info" style="margin-top:12px"><span>💡</span><span>' +
          (Math.abs(top[0].score - (top[1] ? top[1].score : 0)) < 0.02
            ? 'Very close call — both candidates are almost equally aligned with the target direction.'
            : '“' + esc(winner) + '” is the strongest match by cosine similarity (' + top[0].score.toFixed(3) + ').') +
          '</span></div>';
      };

      $('#analogyBtn').addEventListener('click', compute);
      on(rootEl, 'change', '#anaA, #anaB, #anaC', compute);
      on(rootEl, 'click', '[data-triple]', (ev, btn) => {
        const [a, b, c] = D.analogyTriples[Number(btn.dataset.triple)];
        $('#anaA').value = a;
        $('#anaB').value = b;
        $('#anaC').value = c;
        compute();
      });
      compute();
    }

    /* ============================================================ */
    /* Tab 3 — learned embeddings                                   */
    /* ============================================================ */
    function renderLearned() {
      $('#tabBody').innerHTML =
        '<div class="split">' +
        '<div class="stack">' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🧪</span><h3>Learn vectors from a corpus</h3>' +
        '<div class="spacer"></div><span class="tiny faint">PPMI + SVD</span></div>' +
        '<p class="tiny muted" style="margin-bottom:10px">No hand-built concepts here: the vectors come only from which words co-occur in the sentences below. This is the Word2Vec idea in miniature.</p>' +
        '<div class="row" style="gap:12px;align-items:flex-end">' +
        '<div class="field" style="flex:1"><label>Window size <span class="tiny faint" id="winVal">3</span></label><input type="range" id="winSlider" min="1" max="6" value="3"></div>' +
        '<div class="field" style="flex:1"><label>Dimensions <span class="tiny faint" id="dimVal">2</span></label><input type="range" id="dimSlider" min="2" max="20" value="2"></div>' +
        '</div>' +
        '<div class="row" style="margin-top:10px">' +
        '<button class="btn btn-primary btn-sm" id="learnBtn">↻ Re-learn</button>' +
        '<span class="tiny faint" id="learnNote"></span>' +
        '</div>' +
        '</div>' +
        '<div class="card">' +
        '<div class="card-head"><span class="card-title-ico">🗺️</span><h3>Learned 2-D map</h3>' +
        '<div class="spacer"></div><span class="tiny faint">hover a point</span></div>' +
        '<div class="scatter-wrap"><svg class="scatter-svg" id="learnedMap" viewBox="0 0 720 460" role="img" aria-label="Learned embedding map"></svg></div>' +
        '</div>' +
        '</div>' +
        '<div class="stack">' +
        '<div class="card"><div class="card-head"><span class="card-title-ico">📍</span><h3>Neighbours</h3></div>' +
        '<div class="row" style="margin-bottom:10px"><select class="select" id="learnWord"></select></div>' +
        '<div id="learnNN"></div></div>' +
        '<div class="card"><div class="card-head"><span class="card-title-ico">📚</span><h3>Corpus</h3></div>' +
        '<div class="tiny muted" id="learnCorpus" style="max-height:220px;overflow:auto;line-height:1.7"></div></div>' +
        '</div>' +
        '</div>';

      let learned = null;

      function learn() {
        const win = Number($('#winSlider').value);
        const dim = Number($('#dimSlider').value);
        $('#winVal').textContent = win;
        $('#dimVal').textContent = dim;
        learned = E.ppmiEmbeddings(D.embedCorpus, { window: win, dim: Math.max(2, dim), minCount: 1 });

        // draw using first 2 components of the SVD vectors (they're already 2-D if dim=2)
        const words = learned.vocab;
        const coords = words.map((w) => {
          const v = learned.vectors[w];
          return [v[0] || 0, v[1] || 0];
        });
        const W = 720;
        const H = 460;
        const PAD = 36;
        const xs = coords.map((c) => c[0]);
        const ys = coords.map((c) => c[1]);
        const minX = Math.min.apply(null, xs);
        const maxX = Math.max.apply(null, xs);
        const minY = Math.min.apply(null, ys);
        const maxY = Math.max.apply(null, ys);
        const sx = (x) => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2);
        const sy = (y) => H - PAD - ((y - minY) / (maxY - minY || 1)) * (H - PAD * 2);

        let pts = '';
        words.forEach((w, i) => {
          const x = sx(coords[i][0]);
          const y = sy(coords[i][1]);
          pts += '<g class="scatter-pt" data-lw="' + esc(w) + '">' +
            '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="var(--brand-2)" fill-opacity="0.8"/>' +
            '<text class="scatter-label" x="' + (x + 6).toFixed(1) + '" y="' + (y + 3).toFixed(1) + '" style="font-size:8px">' + esc(w) + '</text>' +
            '</g>';
        });
        $('#learnedMap').innerHTML =
          '<rect width="' + W + '" height="' + H + '" fill="none"/>' +
          '<line x1="' + W / 2 + '" y1="0" x2="' + W / 2 + '" y2="' + H + '" stroke="var(--line-soft)" stroke-dasharray="4 4"/>' +
          '<line x1="0" y1="' + H / 2 + '" x2="' + W + '" y2="' + H / 2 + '" stroke="var(--line-soft)" stroke-dasharray="4 4"/>' +
          pts;

        $('#learnNote').textContent = words.length + ' words · window ' + win + ' · ' + learned.components.length + ' components';
        $('#learnCorpus').textContent = D.embedCorpus.join(' · ');

        // fill word selector
        const sel = $('#learnWord');
        const keep = sel.value;
        sel.innerHTML = words.map((w) => '<option value="' + esc(w) + '">' + esc(w) + '</option>').join('');
        if (words.includes(keep)) sel.value = keep;
        showNN(sel.value || 'king');

        on(rootEl, 'click', '[data-lw]', (ev, g) => {
          sel.value = g.dataset.lw;
          showNN(g.dataset.lw);
        });
      }

      function showNN(word) {
        if (!learned || !word) return;
        $('#learnNN').innerHTML = '<p class="tiny faint">computing…</p>';
        const sims = learned.vocab
          .filter((w) => w !== word)
          .map((w) => ({ word: w, sim: E.cosine(learned.vectors[word], learned.vectors[w]) }))
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 10);
        const max = sims.length ? Math.max(0.0001, sims[0].sim) : 1;
        $('#learnNN').innerHTML =
          '<div class="bold mono" style="font-size:.95rem;margin-bottom:8px;color:var(--brand-2)">' + esc(word) + '</div>' +
          '<div class="barlist">' + sims.map((s) =>
            UI.barRow(s.word, Math.max(0, s.sim), max, { cls: 'pos', text: s.sim.toFixed(2) })
          ).join('') + '</div>';
      }

      $('#learnBtn').addEventListener('click', learn);
      $('#winSlider').addEventListener('input', () => {
        clearTimeout(NLP.__learnT);
        NLP.__learnT = setTimeout(learn, 250);
      });
      $('#dimSlider').addEventListener('input', () => {
        clearTimeout(NLP.__learnT);
        NLP.__learnT = setTimeout(learn, 250);
      });
      on(rootEl, 'change', '#learnWord', (ev, sel) => showNN(sel.value));

      learn();
    }

    /* ---------------- tabs ---------------- */
    const renderers = { map: renderMap, analogy: renderAnalogy, learned: renderLearned };
    on(rootEl, 'click', '#embTabs .tab', (ev, btn) => {
      UI.$$('#embTabs .tab', rootEl).forEach((t) => t.classList.remove('on'));
      btn.classList.add('on');
      renderers[btn.dataset.tab]();
    });
    renderMap();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
