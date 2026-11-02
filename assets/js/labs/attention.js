/* =====================================================================
   Lab 10 — Attention (the Transformer core)
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, fmt, on } = UI;

  NLP.views.attention = function (rootEl) {
    const body =
      '<div class="split">' +
      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🧠</span><h3>Input sentence</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="tokCount"></span></div>' +
      '<textarea class="textarea" id="attnIn" rows="2" spellcheck="false">' + esc(D.attentionSentences[0]) + '</textarea>' +
      '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">' +
      '<select class="select" id="attnPreset" style="max-width:280px">' +
      D.attentionSentences.map((s, i) => '<option value="' + i + '">' + esc(s.length > 52 ? s.slice(0, 52) + '…' : s) + '</option>').join('') +
      '</select>' +
      '<select class="select" id="headSel" style="max-width:130px"><option value="0">head 1</option><option value="1">head 2</option></select>' +
      '<label class="switch" style="padding:6px 10px"><input type="checkbox" id="causalOpt" checked><span class="switch-track"></span>' +
      '<span class="switch-text"><span class="tiny">causal mask</span></span></label>' +
      '<div class="spacer"></div><button class="btn btn-primary btn-sm" id="attnRun">Run attention</button>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🔥</span><h3>Attention weights</h3>' +
      '<div class="spacer"></div><span class="tiny faint">row = the token that is <i>looking</i> · column = what it looks at</span></div>' +
      '<div class="matrix-scroll"><div id="attnMatrix"></div></div>' +
      '<div class="heat-legend"><span>0</span><span class="ramp"></span><span>1</span>' +
      '<span class="spacer"></span><span class="tiny faint" id="rowNote"></span></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🎯</span><h3>Focus on one token</h3>' +
      '<div class="spacer"></div><span class="tiny faint">click a word</span></div>' +
      '<div class="attn-strip" id="focusStrip"></div>' +
      '<div id="focusBars" style="margin-top:14px"></div>' +
      '</div>' +
      '</div>' +

      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🧮</span><h3>The formula</h3></div>' +
      '<div class="formula">Attention(Q, K, V) = softmax( Q·Kᵀ / √dₖ ) · V</div>' +
      '<div class="stack" style="gap:6px;margin-top:12px">' +
      '<div class="tiny"><b style="color:var(--brand-2)">Q (query)</b> <span class="faint">— what this token is looking for</span></div>' +
      '<div class="tiny"><b style="color:var(--brand-2)">K (key)</b> <span class="faint">— what each token advertises</span></div>' +
      '<div class="tiny"><b style="color:var(--brand-2)">V (value)</b> <span class="faint">— the information passed along</span></div>' +
      '<div class="tiny"><b style="color:var(--brand-2)">√dₖ</b> <span class="faint">— scaling so scores do not explode (' + (rootEl.__dk || 8) + ' here)</span></div>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📐</span><h3>Scores before softmax</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="scoreNote"></span></div>' +
      '<div id="rawScores" class="tiny mono" style="line-height:1.9;color:var(--muted)"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">💡</span><h3>What to notice</h3></div>' +
      '<div class="stack" style="gap:8px">' +
      '<div class="panel tiny"><b>“it” resolves itself.</b> In the animal sentences, the attention from <span class="mono">it</span> points at <span class="mono">animal</span> (not <span class="mono">street</span>) — that is coreference, learned from data.</div>' +
      '<div class="panel tiny"><b>Causal masking.</b> With the mask on, the first token can only see itself; each row sums to 1 across the <i>visible</i> columns.</div>' +
      '<div class="panel tiny"><b>Heads differ.</b> Switch between head 1 and head 2 — real transformers use 8–128 heads for exactly this reason.</div>' +
      '<div class="panel tiny"><b>Parallelism.</b> Every row is computed independently, so a whole sentence is processed at once — the reason transformers replaced RNNs.</div>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🐍</span><h3>Python (PyTorch)</h3></div>' +
      UI.codeBlock(D.python.attention, { title: 'attention.py' }) +
      '</div>' +
      '</div>' +
      '</div>';

    UI.mountLab(rootEl, 'attention', body);

    const $ = (s) => rootEl.querySelector(s);
    if (NLP.state.done.attention) {
      const b = $('[data-role="lab-done-badge"]');
      if (b) { b.textContent = '✓ Completed'; b.className = 'badge badge-good'; }
    }

    let data = null;
    let focus = 0;

    function run() {
      const text = $('#attnIn').value;
      let tokens = E.tokenize(text, { keepPunct: false });
      if (!tokens.length) {
        $('#attnMatrix').innerHTML = '<p class="tiny faint">Type a sentence.</p>';
        return;
      }
      if (tokens.length > 14) tokens = tokens.slice(0, 14);
      const causal = $('#causalOpt').checked;

      data = E.attentionDemo(tokens, { dim: 16, heads: 2, causal, seed: 42, sharp: 2.2, posWeight: 0.55 });
      rootEl.__dk = data.dk;
      if (focus >= tokens.length) focus = 0;

      $('#tokCount').textContent = tokens.length + ' tokens · dₖ = ' + data.dk + ' · 2 heads';
      renderMatrix();
      renderFocus();
      renderRaw();

      const headSelect = $('#headSel');
      if (!headSelect.dataset.wired) {
        headSelect.dataset.wired = '1';
      }
    }

    function currentHead() {
      return data.headsData[Number($('#headSel').value) || 0];
    }

    function renderMatrix() {
      const head = currentHead();
      const tokens = data.tokens;
      const N = tokens.length;
      let h = '<div class="heat" style="grid-template-columns:minmax(60px,90px) repeat(' + N + ', minmax(26px,1fr))">';
      h += '<div></div>';
      tokens.forEach((t) => {
        h += '<div class="attn-col-label" title="' + esc(t) + '">' + esc(t) + '</div>';
      });
      head.A.forEach((row, i) => {
        h += '<div class="attn-row-label" style="' + (i === focus ? 'color:var(--brand-2);font-weight:700' : '') + '">' + esc(tokens[i]) + '</div>';
        row.forEach((v, j) => {
          const bg = v > 0 ? UI.heatColor(Math.pow(v, 0.55)) : 'var(--surface-2)';
          h += '<div class="attn-cell" data-i="' + i + '" data-j="' + j + '" style="background:' + bg + ';color:' + UI.textOn(bg) + '" title="' + esc(tokens[i]) + ' → ' + esc(tokens[j]) + ' = ' + v.toFixed(3) + '">' +
            (v >= 0.02 ? (v * 100).toFixed(0) : '') + '</div>';
        });
      });
      h += '</div>';
      $('#attnMatrix').innerHTML = h;
      $('#rowNote').textContent = 'row ' + (focus + 1) + ' sums to ' + E.sum(head.A[focus]).toFixed(3);
    }

    function renderFocus() {
      const head = currentHead();
      const tokens = data.tokens;
      $('#focusStrip').innerHTML = tokens
        .map((t, i) => '<button class="attn-tok ' + (i === focus ? 'sel' : '') + '" data-focus="' + i + '">' + esc(t) + '</button>')
        .join('');

      const row = head.A[focus];
      const max = Math.max.apply(null, row.concat([0.001]));
      const ranked = row
        .map((v, j) => ({ v, j, t: tokens[j] }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 8);

      $('#focusBars').innerHTML =
        '<div class="tiny faint" style="margin-bottom:8px">Where “<b style="color:var(--brand-2)">' + esc(tokens[focus]) +
        '</b>” sends its attention (head ' + (Number($('#headSel').value) + 1) + '):</div>' +
        '<div class="barlist">' + ranked.map((r) =>
          UI.barRow(r.t, r.v, max, { cls: 'pos', text: (r.v * 100).toFixed(1) + '%' })
        ).join('') + '</div>';
    }

    function renderRaw() {
      const head = currentHead();
      const i = focus;
      const tokens = data.tokens;
      const q = head.Q[i];
      const parts = tokens.map((t, j) => {
        const masked = data.causal && j > i;
        const raw = (E.dot(q, head.K[j]) / Math.sqrt(head.dk)) * data.sharp;
        return { t, raw, masked, w: head.A[i][j] };
      });
      $('#scoreNote').textContent = 'raw = (Q·Kᵀ) / √dₖ, masked cells set to −∞';
      $('#rawScores').innerHTML = parts.map((p) =>
        '<div class="row-tight" style="justify-content:space-between;padding:2px 0;' + (p.masked ? 'opacity:.4' : '') + '">' +
        '<span>' + esc(p.t) + '</span>' +
        '<span style="color:var(--faint)">' + (p.masked ? '−∞ (masked)' : p.raw.toFixed(2)) + '</span>' +
        '<span style="color:var(--brand-2);width:56px;text-align:right">' + (p.masked ? '0' : (p.w * 100).toFixed(1) + '%') + '</span>' +
        '</div>'
      ).join('');
    }

    /* ---------------- events ---------------- */
    $('#attnRun').addEventListener('click', run);
    $('#attnIn').addEventListener('input', () => {
      clearTimeout(NLP.__attnT);
      NLP.__attnT = setTimeout(run, 300);
    });
    on(rootEl, 'change', '#headSel, #causalOpt', () => {
      const causal = $('#causalOpt').checked;
      data = E.attentionDemo(data.tokens, { dim: 16, heads: 2, causal, seed: 42, sharp: 2.2, posWeight: 0.55 });
      renderMatrix();
      renderFocus();
      renderRaw();
    });
    on(rootEl, 'click', '[data-focus]', (ev, btn) => {
      focus = Number(btn.dataset.focus);
      renderMatrix();
      renderFocus();
      renderRaw();
    });
    on(rootEl, 'click', '.attn-cell', (ev, cell) => {
      const i = Number(cell.dataset.i);
      if (i !== focus) {
        focus = i;
        renderMatrix();
        renderFocus();
        renderRaw();
      }
    });
    on(rootEl, 'change', '#attnPreset', (ev, sel) => {
      $('#attnIn').value = D.attentionSentences[Number(sel.value)];
      focus = 0;
      run();
    });

    run();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
