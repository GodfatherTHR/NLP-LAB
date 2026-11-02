/* =====================================================================
   NLP Lab — app.js
   Shell, hash router, persistent progress, and the three non-lab pages
   (overview, glossary, evaluation).
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const { $, $$, esc, fmt, on } = UI;

  NLP.views = NLP.views || {};

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  const KEY = 'nlp-lab:v1';
  const DEFAULT_STATE = { theme: 'dark', done: {}, quiz: {}, lastVisit: null, streak: 0 };

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, DEFAULT_STATE);
      return Object.assign({}, DEFAULT_STATE, JSON.parse(raw));
    } catch (e) {
      return Object.assign({}, DEFAULT_STATE);
    }
  }
  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify(NLP.state));
    } catch (e) { /* private mode */ }
  }

  NLP.state = loadState();

  NLP.app = {
    complete(id) {
      if (!NLP.state.done[id]) {
        NLP.state.done[id] = Date.now();
        saveState();
        renderSidebar();
        updateHomeProgress();
        const badge = document.querySelector('[data-role="lab-done-badge"]');
        if (badge) {
          badge.textContent = '✓ Completed';
          badge.className = 'badge badge-good';
        }
        const btn = document.querySelector('[data-role="mark-done"]');
        if (btn) {
          btn.textContent = '✓ Completed';
          btn.disabled = true;
        }
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    },
    setTheme(theme) {
      NLP.state.theme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      saveState();
      const btn = $('#themeBtn');
      if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    },
    go(hash) {
      location.hash = hash;
    },
    progress() {
      const labs = D.labs.map((l) => l.id);
      const done = labs.filter((id) => NLP.state.done[id]).length;
      return { done, total: labs.length, pct: labs.length ? done / labs.length : 0 };
    }
  };

  /* ------------------------------------------------------------------ */
  /* Sidebar / shell                                                     */
  /* ------------------------------------------------------------------ */
  function renderSidebar() {
    const nav = $('#navLabs');
    if (!nav) return;
    nav.innerHTML = D.labs
      .map((lab) => {
        const done = !!NLP.state.done[lab.id];
        return (
          '<a class="nav-item" href="#/' + lab.id + '" data-lab="' + lab.id + '">' +
          '<span class="nav-num">' + lab.num + '</span>' +
          '<span>' + esc(lab.short) + '</span>' +
          '<span class="nav-done ' + (done ? 'done' : '') + '">✓</span>' +
          '</a>'
        );
      })
      .join('');
    updateProgressBar();
  }

  function updateProgressBar() {
    const p = NLP.app.progress();
    const fill = $('#progressFill');
    const txt = $('#progressText');
    if (fill) fill.style.width = (p.pct * 100).toFixed(1) + '%';
    if (txt) txt.textContent = p.done + ' / ' + p.total;
  }

  function updateHomeProgress() {
    updateProgressBar();
    const hero = $('#heroProgress');
    if (hero) {
      const p = NLP.app.progress();
      hero.textContent = p.done ? p.done + '/' + p.total + ' labs done' : 'Start anywhere';
    }
    const ring = $('#heroRing');
    if (ring) ring.style.setProperty('--p', (NLP.app.progress().pct * 100).toFixed(0) + '%');
  }

  function applyRoute(hash) {
    const id = (hash || '').replace(/^#\/?/, '').split('?')[0] || 'overview';
    const known = id === 'overview' || id === 'start' || id === 'glossary' || id === 'evaluation' || NLP.views[id];
    const route = known ? id : 'overview';

    // nav highlight
    $$('.nav-item').forEach((a) => {
      const target = a.dataset.lab;
      a.classList.toggle('active', target === route);
    });
    $$('.nav-item[data-page]').forEach((a) => a.classList.toggle('active', a.dataset.page === route));

    const content = $('#content');
    if (!content) return;

    // per-view cleanup
    if (NLP.currentCleanup) {
      try { NLP.currentCleanup(); } catch (e) { /* noop */ }
      NLP.currentCleanup = null;
    }
    NLP.currentView = route;

    // set title
    const meta = UI.labMeta(route);
    $('#topbarTitle').innerHTML =
      route === 'overview'
        ? '<b>Overview</b>'
        : route === 'start'
        ? '<b>Start Here</b>'
        : route === 'glossary'
        ? '<b>Glossary</b>'
        : route === 'evaluation'
        ? '<b>Quiz &amp; Evaluation</b>'
        : '<span class="crumb-sep">Labs</span> / <b>' + esc(meta.title) + '</b>';
    $('#topbarNum').textContent = meta.num || '';

    content.innerHTML = '';
    try {
      if (route === 'overview') renderOverview(content);
      else if (route === 'start') NLP.views.start(content);
      else if (route === 'glossary') renderGlossary(content);
      else if (route === 'evaluation') renderEvaluation(content);
      else NLP.views[route](content);
    } catch (err) {
      console.error('View error', route, err);
      content.innerHTML =
        '<div class="card"><h2>Something went wrong in this lab</h2><p class="mono" style="color:var(--bad)">' +
        esc(err && err.message ? err.message : String(err)) +
        '</p><p>Open the browser console for the stack trace, or jump to another lab.</p></div>';
    }

    UI.wireCopy(content);
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (e) { /* some environments do not implement scrollTo */ }
    // Some browsers throw on history.replaceState() for file:// URLs — the
    // hash is cosmetic here, so failing quietly is fine.
    try {
      if (location.hash !== '#/' + route) history.replaceState(null, '', '#/' + route);
    } catch (e) { /* ignore */ }
    NLP.state.lastVisit = route;
    saveState();
    closeMobileNav();
  }

  /* ------------------------------------------------------------------ */
  /* Overview page                                                       */
  /* ------------------------------------------------------------------ */
  function renderOverview(rootEl) {
    const p = NLP.app.progress();
    const labCards = D.labs
      .map((lab) => {
        const done = !!NLP.state.done[lab.id];
        return (
          '<a class="lab-card" href="#/' + lab.id + '">' +
          '<div class="lab-card-top">' +
          '<span class="lab-card-ico">' + lab.icon + '</span>' +
          '<span class="lab-card-num">LAB ' + lab.num + '</span>' +
          '</div>' +
          '<h3>' + esc(lab.title) + '</h3>' +
          '<p>' + esc(lab.tagline) + '</p>' +
          '<div class="lab-card-meta">' +
          '<span class="badge">⏱ ' + lab.minutes + ' min</span>' +
          '<span class="badge ' + (lab.level === 'Beginner' ? 'badge-good' : lab.level === 'Intermediate' ? 'badge-warn' : 'badge-accent') + '">' + esc(lab.level) + '</span>' +
          (done ? '<span class="badge badge-good">✓ Done</span>' : '') +
          '</div>' +
          '</a>'
        );
      })
      .join('');

    rootEl.innerHTML =
      (p.done === 0 && !NLP.state.seenGuide
        ? '<div class="start-cta">' +
          '<span class="start-cta-ico">🚦</span>' +
          '<div class="start-cta-body">' +
          '<b>First time here? Read the beginner guide first.</b>' +
          '<span>Six minutes: what to do in what order, Python setup that actually works, and the ' +
          Object.keys(NLP.guide.pitfalls).reduce((n, k) => n + NLP.guide.pitfalls[k].length, 0) +
          ' specific mistakes that trip up beginners in each lab.</span>' +
          '</div>' +
          '<a class="btn btn-primary" href="#/start">Open Start Here</a>' +
          '<button class="btn btn-ghost btn-sm" id="dismissGuide" title="Hide this">✕</button>' +
          '</div>'
        : '') +
      '<section class="hero">' +
      '<span class="eyebrow">🐍 Python · NLTK · scikit-learn · Transformers</span>' +
      '<h1>See <span class="grad">Natural Language Processing</span> happen — one click at a time.</h1>' +
      '<p>Ten hands-on simulations built for a first NLP lab. Type a sentence, flip a switch, drag a slider and watch the algorithm respond. Every page ends with the equivalent Python you can paste into Jupyter.</p>' +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary btn-lg" href="#/preprocess">Start with Lab 01 →</a>' +
      '<a class="btn btn-lg" href="#/glossary">Glossary</a>' +
      '<a class="btn btn-lg" href="#/evaluation">Take the quiz</a>' +
      '</div>' +
      '<div class="hero-stats">' +
      '<div class="hero-stat"><b>' + p.done + '<span style="color:var(--faint);font-size:.9rem">/' + p.total + '</span></b><span>labs completed</span></div>' +
      '<div class="hero-stat"><b>' + D.quiz.length + '</b><span>quiz questions</span></div>' +
      '<div class="hero-stat"><b>' + D.glossary.length + '</b><span>key terms</span></div>' +
      '<div class="hero-stat"><b>0</b><span>installs needed</span></div>' +
      '</div>' +
      '<div class="live-demo">' +
      '<div class="live-demo-label"><span class="live-dot"></span> Live demo — type anything</div>' +
      '<input class="input" id="heroInput" value="The cats were running quickly, and they didn\'t stop!" spellcheck="false" aria-label="Type a sentence">' +
      '<div class="live-output" id="heroOut" style="margin-top:10px"></div>' +
      '<div class="row" style="margin-top:8px;gap:6px"><span class="tiny faint">Pipeline:</span>' +
      '<span class="badge badge-brand">tokenize</span><span class="badge">lowercase</span><span class="badge">no stop words</span><span class="badge">Porter stem</span>' +
      '</div></div>' +
      '</section>' +

      '<div class="section-title">The learning path</div>' +
      '<div class="lab-grid">' + labCards + '</div>' +

      '<div class="section-title">How to use this site in your lab</div>' +
      '<div class="grid grid-3">' +
      '<div class="card"><div class="card-head"><span class="card-title-ico">1</span><h3>Read &amp; predict</h3></div><p style="font-size:.85rem">Each lab opens with four short points. Guess what will happen <i>before</i> you touch the controls — that is where learning sticks.</p></div>' +
      '<div class="card"><div class="card-head"><span class="card-title-ico">2</span><h3>Play with the inputs</h3></div><p style="font-size:.85rem">Change the text, the toggles and the sliders. Watch which numbers move. Try to break each demo on purpose.</p></div>' +
      '<div class="card"><div class="card-head"><span class="card-title-ico">3</span><h3>Run the Python</h3></div><p style="font-size:.85rem">Every lab has a copy-paste snippet that does the same thing with NLTK / scikit-learn / spaCy / PyTorch.</p></div>' +
      '</div>' +

      '<div class="hint info" style="margin-top:16px"><span>💡</span><span><b>Everything here runs offline in your browser.</b> No accounts, no uploads, no pip install. Your progress is saved locally, so you can close the tab and come back.</span></div>';

    // live hero demo
    const input = $('#heroInput');
    const out = $('#heroOut');
    const render = () => {
      const text = input.value || '';
      const steps = E.preprocess(text, {
        lowercase: true, removePunct: true, removeNumbers: false,
        stopwords: D.stopwords, stem: true
      });
      const last = steps[steps.length - 1];
      out.innerHTML = last.tokens
        .map((t, i) => '<span class="chip">' + esc(t) + '</span>')
        .join('') + (last.tokens.length ? '' : '<span class="faint">Type something…</span>');
    };
    input.addEventListener('input', render);
    render();
    updateHomeProgress();

    const dismiss = $('#dismissGuide');
    if (dismiss) {
      dismiss.addEventListener('click', () => {
        NLP.state.seenGuide = true;
        saveState();
        const cta = dismiss.closest('.start-cta');
        if (cta) cta.remove();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Glossary page                                                       */
  /* ------------------------------------------------------------------ */
  function renderGlossary(rootEl) {
    const renderList = (q) => {
      const query = (q || '').toLowerCase().trim();
      const items = D.glossary.filter(
        (g) => !query || g.term.toLowerCase().includes(query) || g.def.toLowerCase().includes(query)
      );
      if (!items.length) return '<p class="faint">No terms match “' + esc(q) + '”.</p>';
      const byLetter = {};
      items.forEach((g) => {
        const L = g.term[0].toUpperCase();
        (byLetter[L] = byLetter[L] || []).push(g);
      });
      return Object.keys(byLetter).sort().map((L) =>
        '<div style="margin-bottom:14px">' +
        '<div class="section-title" style="margin:8px 0 6px">' + L + '</div>' +
        byLetter[L].map((g) =>
          '<div class="glossary-item">' +
          '<div class="glossary-term">' + esc(g.term) +
          (g.lab !== 'overview' ? ' <a class="badge badge-brand" href="#/' + g.lab + '" style="font-size:.62rem">open lab →</a>' : '') +
          '</div>' +
          '<div class="glossary-def">' + esc(g.def) + '</div>' +
          '</div>'
        ).join('') +
        '</div>'
      ).join('');
    };

    rootEl.innerHTML =
      '<div class="lab-head"><div class="lab-head-ico">📖</div><div class="lab-head-body">' +
      '<div class="eyebrow">Reference</div><h1>Glossary</h1>' +
      '<p>' + D.glossary.length + ' terms you will meet in an NLP course, written in plain language.</p></div></div>' +
      '<div class="row" style="margin-bottom:16px"><input class="input" id="glossSearch" placeholder="Search terms… (e.g. perplexity, IDF, attention)" style="max-width:420px"></div>' +
      '<div class="card" id="glossList" style="max-width:860px"></div>';

    const list = $('#glossList');
    list.innerHTML = renderList('');
    $('#glossSearch').addEventListener('input', (e) => {
      list.innerHTML = renderList(e.target.value);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Evaluation / quiz page                                              */
  /* ------------------------------------------------------------------ */
  function renderEvaluation(rootEl) {
    const all = D.quiz;
    const answered = NLP.state.quiz || {};
    let score = 0;
    all.forEach((q) => {
      if (answered[q.id] != null) {
        if (answered[q.id] === q.answer) score++;
      }
    });

    const topics = Array.from(new Set(all.map((q) => q.topic)));
    const topicBar = topics
      .map((t) => '<span class="badge">' + esc(t) + ' · ' + all.filter((q) => q.topic === t).length + '</span>')
      .join(' ');

    const cards = all.map((q, qi) => {
      const chosen = answered[q.id];
      const opts = q.options.map((o, oi) => {
        let cls = 'quiz-opt';
        if (chosen != null) {
          if (oi === q.answer) cls += ' correct';
          else if (oi === chosen) cls += ' wrong';
        }
        return '<button class="' + cls + '" data-q="' + esc(q.id) + '" data-o="' + oi + '"' + (chosen != null ? ' disabled' : '') + '>' +
          '<span class="letter">' + String.fromCharCode(65 + oi) + '</span>' + esc(o) + '</button>';
      }).join('');
      return '<div class="quiz-q" data-qi="' + qi + '">' +
        '<div class="quiz-prompt"><span class="badge badge-brand" style="margin-right:8px">' + esc(q.topic) + '</span>' + esc(q.q) + '</div>' +
        '<div class="quiz-opts">' + opts + '</div>' +
        (chosen != null ? '<div class="quiz-why"><b>' + (chosen === q.answer ? '✓ Correct.' : '✗ Not quite.') + '</b> ' + esc(q.why) + '</div>' : '') +
        '</div>';
    }).join('');

    rootEl.innerHTML =
      '<div class="lab-head"><div class="lab-head-ico">📝</div><div class="lab-head-body">' +
      '<div class="eyebrow">Check yourself</div><h1>Quiz &amp; Evaluation</h1>' +
      '<p>' + all.length + ' questions across every lab. Instant feedback, with the reasoning explained.</p></div></div>' +
      '<div class="card" style="margin-bottom:16px"><div class="row">' +
      '<div class="kpis" style="flex:1">' +
      UI.kpi('Score', '<span id="quizScore">' + score + '</span> / ' + all.length, 'brand') +
      UI.kpi('Answered', '<span id="quizAnswered">' + Object.keys(answered).length + '</span> / ' + all.length) +
      UI.kpi('Accuracy', '<span id="quizAcc">' + (Object.keys(answered).length ? Math.round((score / Object.keys(answered).length) * 100) : 0) + '</span>%', 'good') +
      '</div>' +
      '<button class="btn" id="quizReset">Reset answers</button>' +
      '</div><div class="row" style="margin-top:10px">' + topicBar + '</div></div>' +
      '<div class="card">' + cards + '</div>' +
      '<div class="hint info" style="margin-top:16px"><span>💡</span><span>Wrong answers are more useful than right ones — read the explanation, then go back to the matching lab and reproduce the result by hand.</span></div>';

    on(rootEl, 'click', '.quiz-opt', (ev, btn) => {
      if (btn.disabled) return;
      const qid = btn.dataset.q;
      const oi = Number(btn.dataset.o);
      if (NLP.state.quiz[qid] != null) return;
      NLP.state.quiz[qid] = oi;
      saveState();
      const q = all.find((x) => x.id === qid);
      const correct = q && oi === q.answer;
      UI.toast(correct ? 'Correct!' : 'Not quite — see the explanation.', correct ? 'good' : 'bad');
      renderEvaluation(rootEl);
    });

    $('#quizReset').addEventListener('click', () => {
      NLP.state.quiz = {};
      saveState();
      renderEvaluation(rootEl);
      UI.toast('Answers cleared');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mobile nav                                                          */
  /* ------------------------------------------------------------------ */
  function closeMobileNav() {
    const sb = $('#sidebar');
    const scrim = $('#scrim');
    if (sb) sb.classList.remove('open');
    if (scrim) scrim.remove();
  }
  function openMobileNav() {
    const sb = $('#sidebar');
    if (!sb) return;
    sb.classList.add('open');
    if (!$('#scrim')) {
      const scrim = document.createElement('div');
      scrim.id = 'scrim';
      scrim.addEventListener('click', closeMobileNav);
      document.body.appendChild(scrim);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  function boot() {
    document.documentElement.setAttribute('data-theme', NLP.state.theme || 'dark');

    $('#sidebar').innerHTML =
      '<div class="brand">' +
      '<div class="brand-mark">🧠</div>' +
      '<div><div class="brand-name">NLP Lab</div><div class="brand-sub">Interactive simulations</div></div>' +
      '</div>' +
      '<a class="nav-item" href="#/overview" data-page="overview"><span class="nav-ico">🏠</span>Overview</a>' +
      '<a class="nav-item nav-start" href="#/start" data-page="start"><span class="nav-ico">🚦</span>Start Here<span class="nav-new">NEW</span></a>' +
      '<div class="nav-label">Labs</div>' +
      '<nav id="navLabs" style="display:flex;flex-direction:column;gap:2px"></nav>' +
      '<div class="nav-label">More</div>' +
      '<a class="nav-item" href="#/glossary" data-page="glossary"><span class="nav-ico">📖</span>Glossary</a>' +
      '<a class="nav-item" href="#/evaluation" data-page="evaluation"><span class="nav-ico">📝</span>Quiz &amp; Evaluation</a>' +
      '<div class="sidebar-foot">' +
      '<div class="progress-box">' +
      '<div class="progress-head"><span>Your progress</span><span id="progressText">0 / 10</span></div>' +
      '<div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>' +
      '</div>' +
      '<div class="row-tight" style="padding:0 6px 4px">' +
      '<button class="btn btn-sm btn-ghost" id="themeBtn" title="Toggle theme (D)">☀️</button>' +
      '<button class="btn btn-sm btn-ghost" id="printBtn" title="Print this page as a handout">🖨</button>' +
      '<span class="tiny faint">offline · no install</span>' +
      '</div></div>';

    $('#topbar').innerHTML =
      '<div class="mobile-bar"><button class="btn btn-icon" id="menuBtn" aria-label="Menu">☰</button></div>' +
      '<span class="badge mono" id="topbarNum" style="min-width:34px;justify-content:center"></span>' +
      '<div class="topbar-title" id="topbarTitle"><b>Overview</b></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-sm" href="#/glossary">📖 <span class="nowrap">Glossary</span></a>' +
      '<a class="btn btn-sm btn-primary" href="#/evaluation">📝 Quiz</a>' +
      '</div>';

    renderSidebar();
    $('#themeBtn').addEventListener('click', () => {
      NLP.app.setTheme(NLP.state.theme === 'dark' ? 'light' : 'dark');
    });
    $('#printBtn').addEventListener('click', () => {
      window.print();
    });
    $('#menuBtn').addEventListener('click', openMobileNav);

    window.addEventListener('hashchange', () => applyRoute(location.hash));

    // Keyboard shortcuts: ← / → move between labs, "/" focuses search, ? shows help, Esc closes.
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
      if (e.key === 'Escape') { closeMobileNav(); return; }
      if (typing) return;
      const cur = NLP.currentView || 'overview';
      const idx = UI.FLOW.indexOf(cur);
      if (e.key === 'ArrowRight' && idx >= 0 && idx < UI.FLOW.length - 1) {
        location.hash = '#/' + UI.FLOW[idx + 1];
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        location.hash = '#/' + UI.FLOW[idx - 1];
      } else if (e.key === 'g') {
        location.hash = '#/glossary';
      } else if (e.key === 's') {
        location.hash = '#/start';
      } else if (e.key === '?') {
        UI.toast('← → labs · S start here · G glossary · Q quiz · D theme', 'good');
      } else if (e.key === 'd' || e.key === 'D') {
        NLP.app.setTheme(NLP.state.theme === 'dark' ? 'light' : 'dark');
      } else if (e.key === 'q') {
        location.hash = '#/evaluation';
      }
    });

    if (!location.hash) {
      try { history.replaceState(null, '', '#/overview'); } catch (e) { /* file:// */ }
    }
    applyRoute(location.hash);
  }

  NLP.boot = boot;
  window.addEventListener('DOMContentLoaded', boot);
})(typeof globalThis !== 'undefined' ? globalThis : this);
