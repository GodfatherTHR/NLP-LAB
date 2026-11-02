/* =====================================================================
   NLP Lab — start.js
   The beginner on-ramp: a guided "Start Here" page with setup, rules,
   troubleshooting, notation, checklists and study plans.
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const UI = NLP.ui;
  const E = NLP.engine;
  const D = NLP.data;
  const G = NLP.guide;
  const { $, $$, esc, on, toast } = UI;

  const CHECK_KEY = 'nlp-lab:checklist:v1';

  function loadChecks() {
    try {
      return JSON.parse(localStorage.getItem(CHECK_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }
  function saveChecks(obj) {
    try {
      localStorage.setItem(CHECK_KEY, JSON.stringify(obj));
    } catch (e) { /* private mode */ }
  }

  /* Small helper: a section wrapper with an id for the TOC. */
  function section(id, icon, title, sub, body) {
    return (
      '<section class="guide-section" id="g-' + id + '">' +
      '<div class="guide-section-head">' +
      '<span class="guide-section-ico">' + icon + '</span>' +
      '<div><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
      '</div>' + body + '</section>'
    );
  }

  /* Render a shell command with a copy button. */
  function cmdBlock(cmd) {
    if (!cmd) return '';
    const id = 'cmd_' + Math.random().toString(36).slice(2, 8);
    return (
      '<div class="cmd-block">' +
      '<pre id="' + id + '">' + esc(cmd) + '</pre>' +
      '<button class="btn btn-ghost btn-sm cmd-copy" data-copy="' + id + '" title="Copy">Copy</button>' +
      '</div>'
    );
  }

  NLP.views.start = function (rootEl) {
    const pitfalls = G.pitfalls;
    const totalPitfalls = Object.keys(pitfalls).reduce((n, k) => n + pitfalls[k].length, 0);

    /* ---------------- hero ---------------- */
    let h = '';
    h +=
      '<div class="guide-hero">' +
      '<span class="eyebrow">Start here · 6 minute read</span>' +
      '<h1>New to Python and NLP? <span class="grad">Read this first.</span></h1>' +
      '<p class="guide-lede">You do not need to know anything yet. This page tells you exactly what to do, '
      + 'in what order, and — more usefully — the specific mistakes that trip up almost every beginner in each lab.</p>' +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary btn-lg" href="#/preprocess">Skip ahead to Lab 01 →</a>' +
      '<a class="btn btn-lg" href="#g-setup">Set up Python</a>' +
      '<a class="btn btn-lg" href="#g-pitfalls">See the pitfalls</a>' +
      '</div>' +
      '<div class="hero-stats">' +
      '<div class="hero-stat"><b>' + totalPitfalls + '</b><span>beginner traps documented</span></div>' +
      '<div class="hero-stat"><b>' + G.setup.length + '</b><span>setup steps</span></div>' +
      '<div class="hero-stat"><b>' + G.troubleshooting.length + '</b><span>errors decoded</span></div>' +
      '<div class="hero-stat"><b>' + G.rules.length + '</b><span>rules to follow</span></div>' +
      '</div>' +
      '</div>';

    /* ---------------- reading paths ---------------- */
    h +=
      '<div class="hint info" style="margin-bottom:6px"><span>🧭</span><span>' +
      '<b>Three ways to read this page.</b> In a hurry? Jump to <a href="#g-rules">the 7 rules</a>. ' +
      'Stuck on an error? Go to <a href="#g-trouble">troubleshooting</a>. ' +
      'About to submit an assignment? Use the <a href="#g-check">checklist</a>.</span></div>';

    /* ---------------- 1. mental model ---------------- */
    h += section('model', '🗺️', 'How this site is built (the 60-second version)',
      'Knowing the shape of the whole thing stops the confusion before it starts.',
      '<div class="grid grid-3">' +
      '<div class="card"><div class="card-head"><span class="card-title-ico">1</span><h3>Every lab is the same shape</h3></div>' +
      '<p style="font-size:.85rem">Four short teaching points → a playground where you change things → '
      + 'a "common mistakes" box → the equivalent Python. Once you have done one lab, you know how to do all ten.</p></div>' +
      '<div class="card"><div class="card-head"><span class="card-title-ico">2</span><h3>Nothing here can break</h3></div>' +
      '<p style="font-size:.85rem">There is no server, no account and no data leaves your browser. '
      + 'Click anything, type anything, reload the page. The worst outcome is you learn what the reset button does.</p></div>' +
      '<div class="card"><div class="card-head"><span class="card-title-ico">3</span><h3>The Python is optional</h3></div>' +
      '<p style="font-size:.85rem">The site teaches the idea. The Python snippet at the bottom of each lab is for when '
      + 'your assignment says "implement it". You can learn all the concepts here without installing anything.</p></div>' +
      '</div>' +
      '<div class="hint warn" style="margin-top:14px"><span>⚠️</span><span><b>The site is not a replacement for the Python.</b> ' +
      'Exams and assignments ask you to write code. Use the site to understand <i>what</i> and <i>why</i>, then run the Python to prove you can.</span></div>'
    );

    /* ---------------- 2. setup ---------------- */
    h += section('setup', '🐍', 'Setting up Python (only when you need it)',
      'Do these in order. Each step assumes the previous one worked. If a step fails, stop and use the troubleshooting table below.',
      G.setup
        .map((s, i) =>
          '<div class="setup-step">' +
          '<div class="setup-num">' + (i + 1) + '</div>' +
          '<div class="setup-body">' +
          '<h3>' + esc(s.title) + '</h3>' +
          '<p>' + esc(s.body) + '</p>' +
          cmdBlock(s.cmd) +
          (s.note ? '<div class="setup-note"><b>Watch out:</b> ' + esc(s.note) + '</div>' : '') +
          '</div></div>'
        )
        .join('') +
      '<div class="hint good" style="margin-top:16px"><span>✅</span><span><b>You are done when</b> ' +
      '<code class="mono">python -c "import nltk, sklearn, spacy; print(\'ok\')"</code> prints <b>ok</b>.</span></div>'
    );

    /* ---------------- 3. rules ---------------- */
    h += section('rules', '📏', 'The 7 rules of a first NLP project',
      'Ignore these and you will spend a week chasing a bug that is actually a methodology error.',
      '<div class="rules-list">' +
      G.rules
        .map((r) =>
          '<div class="rule-item">' +
          '<div class="rule-num">' + r.n + '</div>' +
          '<div><h4>' + esc(r.title) + '</h4><p>' + esc(r.body) + '</p></div>' +
          '</div>'
        )
        .join('') +
      '</div>'
    );

    /* ---------------- 4. pitfalls ---------------- */
    h += section('pitfalls', '🕳️', 'The ' + totalPitfalls + ' traps beginners fall into',
      'Each one is real, specific, and appears in the lab it belongs to. Skim this before you start, then re-read the box at the bottom of each lab.',
      '<div class="pitfall-index">' +
      D.labs
        .map((lab) => {
          const list = pitfalls[lab.id] || [];
          if (!list.length) return '';
          return (
            '<a class="pitfall-index-item" href="#g-pit-' + lab.id + '">' +
            '<span class="pitfall-index-ico">' + lab.icon + '</span>' +
            '<span><b>' + esc(lab.short) + '</b><small>' + list.length + ' traps</small></span>' +
            '</a>'
          );
        })
        .join('') +
      '</div>' +
      D.labs
        .map((lab) => {
          const list = pitfalls[lab.id] || [];
          if (!list.length) return '';
          return (
            '<div class="pitfall-lab" id="g-pit-' + lab.id + '">' +
            '<div class="pitfall-lab-head">' +
            '<span class="pitfall-lab-ico">' + lab.icon + '</span>' +
            '<div><h3>' + esc(lab.title) + '</h3>' +
            '<small>' + esc(lab.tagline) + '</small></div>' +
            '<a class="btn btn-sm btn-ghost" href="#/' + lab.id + '">Open lab →</a>' +
            '</div>' +
            list
              .map((p, i) =>
                '<div class="pitfall">' +
                '<div class="pitfall-head"><span class="pitfall-badge">Trap ' + (i + 1) + '</span></div>' +
                '<div class="pitfall-wrong">❌ ' + esc(p.wrong) + '</div>' +
                '<div class="pitfall-why"><b>Why it happens:</b> ' + esc(p.why) + '</div>' +
                '<div class="pitfall-fix"><b>Do this instead:</b> ' + esc(p.fix) + '</div>' +
                '</div>'
              )
              .join('') +
            '</div>'
          );
        })
        .join('')
    );

    /* ---------------- 5. troubleshooting ---------------- */
    h += section('trouble', '🔧', 'Error messages, decoded',
      'Find your error. If it is not here, the fix is nearly always one of: wrong virtual environment, missing data download, or stale notebook kernel.',
      '<div class="trouble-list">' +
      G.troubleshooting
        .map((t, i) =>
          '<details class="trouble-item"' + (i === 0 ? ' open' : '') + '>' +
          '<summary><code class="mono">' + esc(t.error) + '</code></summary>' +
          '<div class="trouble-body">' +
          '<p><b>Why:</b> ' + esc(t.cause) + '</p>' +
          '<p><b>Fix:</b> ' + esc(t.fix) + '</p>' +
          '</div></details>'
        )
        .join('') +
      '</div>'
    );

    /* ---------------- 6. notation ---------------- */
    h += section('notation', '∑', 'The symbols you will keep seeing',
      'You do not need to derive these. You do need to recognise them.',
      '<div class="card"><table class="table notation-table"><tbody>' +
      G.notation
        .map(([sym, def]) => '<tr><td class="notation-sym mono">' + esc(sym) + '</td><td>' + esc(def) + '</td></tr>')
        .join('') +
      '</tbody></table></div>'
    );
    /* ---------------- 7. next steps ---------------- */
    h += section('next', '🎯', 'What should I do next?',
      'Pick the row that matches your goal or assignment.',
      '<div class="card table-scroll"><table class="table"><thead><tr><th>If your goal is…</th><th>Do these labs</th><th>Advice</th></tr></thead><tbody>' +
      G.nextSteps
        .map((n) => '<tr><td><b>' + esc(n.goal) + '</b></td><td class="mono" style="white-space:nowrap">' + esc(n.path) + '</td><td class="tiny">' + esc(n.tip) + '</td></tr>')
        .join('') +
      '</tbody></table></div>'
    );

    /* ---------------- 8. study plans ---------------- */
    h += section('plans', '⏱️', 'Pick a study plan that fits your time',
      'Commit to one. A finished 30-minute plan beats an abandoned one-week plan.',
      '<div class="grid grid-3">' +
      G.plans
        .map((p) =>
          '<div class="card plan-card"><h3>' + esc(p.name) + '</h3><ol class="plan-list">' +
          p.steps.map((s) => '<li>' + esc(s) + '</li>').join('') +
          '</ol></div>'
        )
        .join('') +
      '</div>'
    );

    /* ---------------- 9. checklist ---------------- */
    h += section('check', '✅', 'Before you submit anything',
      'Tick every box. These are saved in your browser so you can come back to them.',
      '<div class="card"><div class="checklist" id="checkList">' +
      G.checklist
        .map((item, i) =>
          '<label class="check-row">' +
          '<input type="checkbox" data-check="' + i + '">' +
          '<span class="check-box"></span>' +
          '<span class="check-text">' + esc(item) + '</span>' +
          '</label>'
        )
        .join('') +
      '</div>' +
      '<div class="row" style="margin-top:14px">' +
      '<span class="badge badge-brand" id="checkCount">0 / ' + G.checklist.length + ' done</span>' +
      '<button class="btn btn-sm btn-ghost" id="checkReset">Reset checklist</button>' +
      '</div></div>'
    );

    /* ---------------- 10. glossary bridge ---------------- */
    h +=
      '<div class="hint info" style="margin-top:22px"><span>📖</span><span>' +
      '<b>Still stuck on a word?</b> The <a href="#/glossary">glossary</a> has ' + D.glossary.length +
      ' terms written for people who have never studied linguistics.</span></div>' +
      '<div class="row" style="margin:22px 0 8px;justify-content:center">' +
      '<a class="btn btn-primary btn-lg" href="#/preprocess">I am ready — start Lab 01 →</a>' +
      '</div>';

    /* ---------------- mount ---------------- */
    rootEl.innerHTML =
      '<div class="lab-head"><div class="lab-head-ico">🚦</div><div class="lab-head-body">' +
      '<div class="eyebrow">Beginner guide · read once, refer back often</div>' +
      '<h1>Start Here</h1>' +
      '<p>Everything a first-time NLP student needs before touching Lab 01.</p>' +
      '</div></div>' + h;

    /* TOC — built after the sections exist */
    const toc = $$('.guide-section', rootEl).map((s) => ({
      id: s.id,
      title: s.querySelector('h2').textContent,
      ico: s.querySelector('.guide-section-ico').textContent
    }));
    const tocHtml =
      '<nav class="guide-toc" aria-label="Guide contents">' +
      '<div class="guide-toc-title">On this page</div>' +
      toc.map((t) => '<a href="#' + t.id + '" data-toc="' + t.id + '"><span>' + t.ico + '</span>' + esc(t.title) + '</a>').join('') +
      '</nav>';
    rootEl.insertAdjacentHTML('afterbegin', '');
    const heroEl = rootEl.querySelector('.lab-head');
    if (heroEl) heroEl.insertAdjacentHTML('afterend', tocHtml);

    /* ---------------- behaviour ---------------- */
    // Smooth anchor scroll for in-page links (hash router would otherwise hijack).
    on(rootEl, 'click', 'a[href^="#g-"]', (ev, a) => {
      const target = a.getAttribute('href');
      const id = target.slice(1);
      const node = document.getElementById(id);
      if (node) {
        ev.preventDefault();
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        $$('.guide-toc a', rootEl).forEach((x) => x.classList.toggle('active', x.dataset.toc === id));
      }
    });

    // Copy buttons for shell commands.
    on(rootEl, 'click', '.cmd-copy', async (ev, btn) => {
      const pre = document.getElementById(btn.dataset.copy);
      const ok = await UI.copyText(pre ? pre.textContent : '');
      toast(ok ? 'Command copied' : 'Copy failed — select it manually', ok ? 'good' : 'bad');
    });

    // Checklist persistence.
    const checks = loadChecks();
    const countEl = $('#checkCount');
    const updateCount = () => {
      const boxes = $$('[data-check]', rootEl);
      const done = boxes.filter((b) => b.checked).length;
      countEl.textContent = done + ' / ' + boxes.length + ' done';
      countEl.className = 'badge ' + (done === boxes.length ? 'badge-good' : 'badge-brand');
    };
    $$('[data-check]', rootEl).forEach((box) => {
      const i = box.dataset.check;
      box.checked = !!checks[i];
      box.addEventListener('change', () => {
        checks[i] = box.checked;
        saveChecks(checks);
        updateCount();
      });
    });
    updateCount();

    $('#checkReset').addEventListener('click', () => {
      $$('[data-check]', rootEl).forEach((b) => { b.checked = false; });
      $$('[data-check]', rootEl).forEach((b) => { checks[b.dataset.check] = false; });
      saveChecks(checks);
      updateCount();
      toast('Checklist reset');
    });

    // Highlight the TOC entry currently in view.
    if ('IntersectionObserver' in window) {
      const links = $$('.guide-toc a', rootEl);
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            links.forEach((l) => l.classList.toggle('active', l.dataset.toc === en.target.id));
          });
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );
      $$('.guide-section', rootEl).forEach((s) => io.observe(s));
      NLP.currentCleanup = () => io.disconnect();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
