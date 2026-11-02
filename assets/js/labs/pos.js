/* =====================================================================
   Lab 09 — POS tagging & Named Entity Recognition
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { esc, on } = UI;

  const TAG_NAMES = {
    NN: 'noun, singular', NNS: 'noun, plural', NNP: 'proper noun', NNPS: 'proper noun, plural',
    VB: 'verb, base form', VBD: 'verb, past tense', VBG: 'verb, gerund', VBN: 'verb, past participle',
    VBP: 'verb, non-3rd person', VBZ: 'verb, 3rd person singular',
    JJ: 'adjective', JJR: 'adjective, comparative', JJS: 'adjective, superlative',
    RB: 'adverb', RBR: 'adverb, comparative', RBS: 'adverb, superlative',
    DT: 'determiner', PRP: 'pronoun', 'PRP$': 'possessive pronoun', WDT: 'wh-determiner', WP: 'wh-pronoun',
    IN: 'preposition', TO: 'to', CC: 'coordinating conjunction',
    MD: 'modal verb', EX: 'existential there', CD: 'cardinal number', WRB: 'wh-adverb',
    '.': 'punctuation'
  };

  const SAMPLES = {
    News: 'Sadia joined Google in 2019 and moved to Dhaka, where she built an NLP model for Acme Corp.',
    Story: 'The quick brown fox jumps over the lazy dog. Rahim read a book in the park and drank tea.',
    Cafe: 'The food was delicious and the staff were friendly. I paid $12 and left a tip for the waiter.',
    Ambiguous: 'I book a hotel near the bank, then the bank closes and I read a book by the river.',
    Bangla: 'Amar sonar Bangla. Dhaka University students love tea and rice in the morning.'
  };

  NLP.views.pos = function (rootEl) {
    const body =
      '<div class="split">' +
      '<div class="stack">' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🔎</span><h3>Annotate a sentence</h3>' +
      '<div class="spacer"></div>' +
      '<div class="seg" id="posSamples">' +
      Object.keys(SAMPLES).map((k, i) => '<button data-sample="' + esc(k) + '" class="' + (i === 0 ? 'on' : '') + '">' + esc(k) + '</button>').join('') +
      '</div></div>' +
      '<textarea class="textarea" id="posIn" rows="3" spellcheck="false">' + esc(SAMPLES.News) + '</textarea>' +
      '<div class="row" style="margin-top:10px;gap:16px">' +
      '<label class="switch"><input type="checkbox" id="optEnt" checked><span class="switch-track"></span>' +
      '<span class="switch-text"><span>Named entities</span><small>highlight spans</small></span></label>' +
      '<label class="switch"><input type="checkbox" id="optAmb"><span class="switch-track"></span>' +
      '<span class="switch-text"><span>Show ambiguity</span><small>alternatives</small></span></label>' +
      '<div class="spacer"></div><span class="tiny faint" id="tokNote"></span>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🏷️</span><h3>Part of speech</h3>' +
      '<div class="spacer"></div><span class="tiny faint">hover a tag for its meaning</span></div>' +
      '<div id="posTokens" style="display:flex;flex-wrap:wrap;gap:5px;line-height:2.6"></div>' +
      '<div class="row" style="margin-top:14px;gap:12px;flex-wrap:wrap" id="posLegend"></div>' +
      '</div>' +

      '<div class="card" id="entCard">' +
      '<div class="card-head"><span class="card-title-ico">🎯</span><h3>Named entities</h3>' +
      '<div class="spacer"></div><span class="tiny faint" id="entNote"></span></div>' +
      '<div class="ner-seg" id="nerOut"></div>' +
      '</div>' +
      '</div>' +

      '<div class="stack">' +
      '<div id="posKpis" class="kpis"></div>' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">📋</span><h3>Token table</h3></div>' +
      '<div class="tbl-wrap" style="max-height:340px"><table class="tbl" id="tokTable"></table></div>' +
      '</div>' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🧠</span><h3>Why POS is hard</h3></div>' +
      '<p class="tiny muted">The same word changes category with context:</p>' +
      '<div class="stack" style="gap:7px;margin-top:8px">' +
      '<div class="panel tiny"><span class="mono">I <b style="color:var(--brand-2)">book</b> a room</span> — verb (after a pronoun, before a noun phrase)</div>' +
      '<div class="panel tiny"><span class="mono">I read a <b style="color:var(--brand-2)">book</b></span> — noun (after a determiner)</div>' +
      '<div class="panel tiny"><span class="mono">the <b style="color:var(--brand-2)">bank</b> was steep</span> — noun, river sense</div>' +
      '</div>' +
      '<p class="tiny faint" style="margin-top:10px">This page uses a lexicon plus context rules so you can inspect every decision. Real taggers learn these patterns from annotated data (spaCy, Stanza, TnT).</p>' +
      '</div>' +
      '<div class="card">' +
      '<div class="card-head"><span class="card-title-ico">🐍</span><h3>Python</h3></div>' +
      UI.codeBlock(D.python.pos, { title: 'pos_ner.py' }) +
      '</div>' +
      '</div>' +
      '</div>';

    UI.mountLab(rootEl, 'pos', body);

    const $ = (s) => rootEl.querySelector(s);
    if (NLP.state.done.pos) {
      const b = $('[data-role="lab-done-badge"]');
      if (b) { b.textContent = '✓ Completed'; b.className = 'badge badge-good'; }
    }

    function render() {
      const text = $('#posIn').value;
      const showAmb = $('#optAmb').checked;
      const showEnt = $('#optEnt').checked;

      const tokens = E.tokenize(text, { keepCase: true });
      const tagged = E.posTag(tokens, D.posLexicon);
      const ent = E.ner(text, D.gazetteer);

      $('#tokNote').textContent = tokens.length + ' tokens · ' + ent.spans.length + ' entities';

      // tokens
      $('#posTokens').innerHTML = tagged
        .map((t, i) => {
          const tagCls = t.tag === '.' ? 'PUNCT' : t.tag.replace('$', '\\$');
          const title = t.tag + ' — ' + (TAG_NAMES[t.tag] || 'tag') + (t.known ? ' (from lexicon)' : ' (guessed from suffix/context)');
          const alt = showAmb && t.options && t.options.length > 1
            ? '<span class="tiny" style="color:var(--warn);font-size:.55rem">+' + (t.options.length - 1) + '</span>'
            : '';
          return '<span class="pos-token" title="' + esc(title) + '">' +
            '<span class="w">' + esc(t.token) + '</span>' +
            '<span class="t tag-' + tagCls + '">' + esc(t.tag) + '</span>' +
            alt + '</span>';
        })
        .join('');

      // legend of tags used
      const used = Array.from(new Set(tagged.map((t) => t.tag)));
      $('#posLegend').innerHTML = used
        .map((tag) => {
          const cls = tag === '.' ? 'PUNCT' : tag.replace('$', '\\$');
          return '<span class="tiny"><span class="t tag-' + cls + '" style="padding:1px 5px;border-radius:4px;font-family:var(--mono);font-weight:800">' +
            esc(tag) + '</span> <span class="faint">' + esc(TAG_NAMES[tag] || '') + '</span></span>';
        })
        .join('');

      // tokens table
      let tt = '<thead><tr><th>#</th><th>Token</th><th>Tag</th><th>Meaning</th><th>Source</th></tr></thead><tbody>';
      tagged.forEach((t, i) => {
        tt += '<tr><td class="num">' + (i + 1) + '</td><td class="mono">' + esc(t.token) + '</td>' +
          '<td class="mono" style="color:var(--brand-2)">' + esc(t.tag) + '</td>' +
          '<td class="tiny">' + esc(TAG_NAMES[t.tag] || '—') + '</td>' +
          '<td class="tiny faint">' + (t.known ? 'lexicon' : 'rules') + '</td></tr>';
      });
      tt += '</tbody>';
      $('#tokTable').innerHTML = tt;

      // KPIs
      const nouns = tagged.filter((t) => /^NN/.test(t.tag)).length;
      const verbs = tagged.filter((t) => /^VB/.test(t.tag)).length;
      const adjs = tagged.filter((t) => /^JJ/.test(t.tag)).length;
      $('#posKpis').innerHTML =
        UI.kpi('Tokens', tagged.length) +
        UI.kpi('Nouns', nouns, 'brand') +
        UI.kpi('Verbs', verbs, 'good') +
        UI.kpi('Adjectives', adjs) +
        UI.kpi('Entities', ent.spans.length, 'bad');

      // entities
      $('#entCard').style.display = showEnt ? '' : 'none';
      if (showEnt) {
        const byType = {};
        ent.spans.forEach((s) => {
          byType[s.label] = (byType[s.label] || 0) + 1;
        });
        $('#entNote').innerHTML = Object.keys(byType).length
          ? Object.keys(byType).map((k) => '<span class="badge ent-' + k + '" style="margin-left:4px">' + k + ' ×' + byType[k] + '</span>').join('')
          : '<span class="faint">none found</span>';
        $('#nerOut').innerHTML = ent.segments
          .map((seg) => {
            if (!seg.label) return esc(seg.text);
            return '<span class="ent ent-' + seg.label + '" title="' + seg.label + '">' + esc(seg.text) + '</span>';
          })
          .join('');
        if (!ent.spans.length) {
          $('#nerOut').innerHTML += '<div class="hint" style="margin-top:10px"><span>💡</span><span>No entities matched this rule-based gazetteer. Real NER models (spaCy, BERT) generalise far beyond a word list.</span></div>';
        }
      }
    }

    on(rootEl, 'input', '#posIn', render);
    on(rootEl, 'change', '#optAmb, #optEnt', render);
    on(rootEl, 'click', '[data-sample]', (ev, btn) => {
      UI.$$('#posSamples button', rootEl).forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      $('#posIn').value = SAMPLES[btn.dataset.sample];
      render();
    });

    render();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
