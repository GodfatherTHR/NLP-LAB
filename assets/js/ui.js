/* =====================================================================
   NLP Lab — ui.js
   Tiny DOM helpers, formatting, syntax highlighting, toasts and the
   shared "lab page" chrome (header + learn box + prev/next).
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = (root.NLP = root.NLP || {});
  const UI = (NLP.ui = {});

  /* ------------------------------------------------------------------ */
  /* DOM                                                                 */
  /* ------------------------------------------------------------------ */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /** Escape text for safe innerHTML interpolation. */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Tagged template that escapes interpolations by default. */
  function html(strings, ...vals) {
    return strings.reduce((out, s, i) => {
      if (i === 0) return s;
      const v = vals[i - 1];
      let piece;
      if (v == null || v === false) piece = '';
      else if (Array.isArray(v)) piece = v.join('');
      else piece = String(v);
      return out + piece + s;
    });
  }

  /** Raw (already-safe markup) template. */
  const raw = (strings, ...vals) => strings.reduce((out, s, i) => out + (i ? (vals[i - 1] == null ? '' : String(vals[i - 1])) : '') + s, '');

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
        else if (k === 'dataset') Object.assign(node.dataset, attrs[k]);
        else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => c && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  }

  function clear(node, next) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    if (next && node) node.appendChild(next);
    return node;
  }

  /** Delegated listener: on(root, 'click', '.chip', handler) */
  function on(rootEl, type, selector, handler) {
    rootEl.addEventListener(type, (ev) => {
      const target = ev.target.closest(selector);
      if (target && rootEl.contains(target)) handler(ev, target);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Formatting                                                          */
  /* ------------------------------------------------------------------ */
  const fmt = {
    num: (n, d = 0) => {
      if (n == null || !isFinite(n)) return '—';
      return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    },
    pct: (n, d = 1) => (n == null || !isFinite(n) ? '—' : (n * 100).toFixed(d) + '%'),
    /** Compact decimal without trailing zeros, e.g. 0.317 */
    dec: (n, d = 3) => (n == null || !isFinite(n) ? '—' : Number(n.toFixed(d)).toString()),
    /** Scientific-ish for very small numbers */
    prob: (n) => {
      if (n == null || !isFinite(n)) return '—';
      if (n === 0) return '0';
      if (n < 0.001) return n.toExponential(1);
      if (n > 0.999) return n.toFixed(4);
      return n.toFixed(4);
    },
    logp: (n) => (n == null || !isFinite(n) ? '−∞' : n.toFixed(2)),
    tokens: (n) => fmt.num(n) + (n === 1 ? ' token' : ' tokens'),
    bytes: (n) => {
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
      return (n / 1048576).toFixed(2) + ' MB';
    },
    escape: esc
  };

  const pad = (n) => String(n).padStart(2, '0');

  /* ------------------------------------------------------------------ */
  /* Colour helpers (used by heatmaps)                                   */
  /* ------------------------------------------------------------------ */
  function mixColor(t, from, to) {
    const c1 = from.map((x) => parseInt(x, 16));
    const c2 = to.map((x) => parseInt(x, 16));
    const c = c1.map((v, i) => Math.round(v + (c2[i] - v) * Math.max(0, Math.min(1, t))));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  /** t in [0,1] -> colour on a dark "brand" ramp */
  function heatColor(t, alpha) {
    const v = Math.max(0, Math.min(1, t));
    // deep navy -> blue -> cyan
    const stops = [
      [12, 18, 28],
      [24, 58, 120],
      [37, 99, 235],
      [34, 211, 238]
    ];
    const seg = v * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(seg));
    const f = seg - i;
    const rgb = stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
    return alpha ? `rgba(${rgb.join(',')},${alpha})` : `rgb(${rgb.join(',')})`;
  }

  /** Diverging colour for signed weights (-1..1) */
  function divColor(v) {
    const t = Math.max(-1, Math.min(1, v));
    if (t >= 0) return mixColor(t, ['20', '30', '44'], ['f4', '72', 'b6']);
    return mixColor(-t, ['20', '30', '44'], ['60', 'a5', 'fa']);
  }

  /** Pick a readable text colour for a given CSS background colour. */
  function textOn(color) {
    const m = String(color).match(/rgba?\(([^)]+)\)/);
    let r = 8;
    let g = 11;
    let b = 16;
    if (m) {
      const p = m[1].split(',').map(Number);
      r = p[0]; g = p[1]; b = p[2];
    } else if (/^#[0-9a-f]{6}$/i.test(color)) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    const lin = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.34 ? '#0a1220' : '#f2f7ff';
  }

  /* ------------------------------------------------------------------ */
  /* Python syntax highlighting (small, dependency-free)                 */
  /* ------------------------------------------------------------------ */
  const PY_KW = new Set(['def', 'return', 'import', 'from', 'as', 'if', 'else', 'elif', 'for', 'while', 'in', 'not', 'and', 'or', 'class', 'with', 'try', 'except', 'finally', 'lambda', 'None', 'True', 'False', 'print', 'is', 'pass', 'break', 'continue', 'raise', 'yield', 'global', 'nonlocal', 'assert', 'del', 'async', 'await']);

  function highlightPython(code) {
    // Tokenise conservatively so we never break the markup.
    const out = [];
    const src = String(code);
    let i = 0;
    const push = (cls, text) => out.push('<span class="tok-' + cls + '">' + esc(text) + '</span>');
    while (i < src.length) {
      const ch = src[i];
      // comment
      if (ch === '#') {
        let j = src.indexOf('\n', i);
        if (j < 0) j = src.length;
        push('com', src.slice(i, j));
        i = j;
        continue;
      }
      // string (triple first)
      if (ch === '"' || ch === "'") {
        const triple = src.slice(i, i + 3);
        if (triple === '"""' || triple === "'''") {
          let j = src.indexOf(triple, i + 3);
          j = j < 0 ? src.length : j + 3;
          push('str', src.slice(i, j));
          i = j;
          continue;
        }
        let j = i + 1;
        while (j < src.length && src[j] !== ch) {
          if (src[j] === '\\') j++;
          j++;
        }
        j = Math.min(j + 1, src.length);
        push('str', src.slice(i, j));
        i = j;
        continue;
      }
      // number
      if (/[0-9]/.test(ch) && !/[\w]/.test(src[i - 1] || '')) {
        let j = i;
        while (j < src.length && /[0-9._eExXa-fA-F]/.test(src[j])) j++;
        push('num', src.slice(i, j));
        i = j;
        continue;
      }
      // identifier
      if (/[A-Za-z_]/.test(ch)) {
        let j = i;
        while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
        const word = src.slice(i, j);
        if (PY_KW.has(word)) push('kw', word);
        else if (src[j] === '(') push('fn', word);
        else out.push(esc(word));
        i = j;
        continue;
      }
      // operators / punctuation
      if (/[+\-*/%=<>!&|^~@]/.test(ch)) {
        push('op', ch);
        i++;
        continue;
      }
      out.push(esc(ch));
      i++;
    }
    return out.join('');
  }

  /* ------------------------------------------------------------------ */
  /* Copy to clipboard                                                   */
  /* ------------------------------------------------------------------ */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */
  let toastHost = null;
  function toast(msg, kind) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.id = 'toasts';
      document.body.appendChild(toastHost);
    }
    const t = el('div', { class: 'toast ' + (kind || '') });
    const ico = kind === 'good' ? '✓' : kind === 'bad' ? '⚠' : 'ℹ';
    t.innerHTML = '<span>' + ico + '</span><span>' + esc(msg) + '</span>';
    toastHost.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 260);
    }, 2200);
  }

  /* ------------------------------------------------------------------ */
  /* Lab page chrome                                                     */
  /* ------------------------------------------------------------------ */
  const FLOW = ['overview', 'preprocess', 'stem', 'tfidf', 'similarity', 'classify', 'lm', 'bpe', 'embeddings', 'pos', 'attention', 'evaluation'];

  function labMeta(id) {
    const D = NLP.data;
    if (id === 'overview') return { id: 'overview', num: '00', title: 'Overview', icon: '🏠', tagline: 'Your learning path' };
    if (id === 'start') return { id: 'start', num: '—', title: 'Start Here', icon: '🚦', tagline: 'Beginner guide, setup and pitfalls' };
    if (id === 'glossary') return { id: 'glossary', num: 'REF', title: 'Glossary', icon: '📖', tagline: 'Key terms in plain language' };
    if (id === 'evaluation') return { id: 'evaluation', num: '11', title: 'Evaluation & Quiz', icon: '📝', tagline: 'Check what you learned' };
    return D.labs.find((l) => l.id === id) || { id, num: '??', title: id, icon: '•', tagline: '' };
  }

  function labHeader(id) {
    const m = labMeta(id);
    const D = NLP.data;
    const idx = FLOW.indexOf(id);
    const prev = idx > 0 ? FLOW[idx - 1] : null;
    const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
    const meta = D.labs.find((l) => l.id === id);

    const bits = [];
    bits.push('<div class="lab-head">');
    bits.push('<div class="lab-head-ico">' + (m.icon || '•') + '</div>');
    bits.push('<div class="lab-head-body">');
    bits.push('<div class="eyebrow">Lab ' + esc(m.num) + ' · ' + esc(meta ? meta.level : 'Guide') + '</div>');
    bits.push('<h1>' + esc(m.title) + '</h1>');
    bits.push('<p>' + esc(m.tagline || '') + '</p>');
    bits.push('<div class="lab-head-meta">');
    if (meta) {
      bits.push('<span class="badge badge-brand">⏱ ' + meta.minutes + ' min</span>');
      const qn = (NLP.data.quizByTopic[id] || []).length;
      if (qn) bits.push('<span class="badge">🧠 ' + qn + ' quiz question' + (qn > 1 ? 's' : '') + '</span>');
    }
    bits.push('<span class="badge" data-role="lab-done-badge">—</span>');
    bits.push('</div></div>');

    bits.push('<div class="row" style="margin-left:auto">');
    if (prev) bits.push('<a class="btn btn-ghost btn-sm" href="#/' + prev + '">← Prev</a>');
    if (next) bits.push('<a class="btn btn-primary btn-sm" href="#/' + next + '">Next →</a>');
    bits.push('</div>');
    bits.push('</div>');

    if (meta && meta.learn) {
      bits.push('<div class="learn-box"><ol>');
      meta.learn.forEach(([t]) => bits.push('<li>' + t + '</li>'));
      bits.push('</ol></div>');
    }
    return bits.join('');
  }

  function labFooter(id) {
    const idx = FLOW.indexOf(id);
    const prev = idx > 0 ? FLOW[idx - 1] : null;
    const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
    const pm = prev ? labMeta(prev) : null;
    const nm = next ? labMeta(next) : null;
    let s = '<div class="lab-footer">';
    s += pm
      ? '<a class="btn" href="#/' + prev + '"><span style="color:var(--faint)">←</span> ' + esc(pm.num) + ' · ' + esc(pm.short || pm.title) + '</a>'
      : '<span></span>';
    s += '<button class="btn btn-ghost" data-role="mark-done">Mark this lab complete ✓</button>';
    s += nm
      ? '<a class="btn btn-primary" href="#/' + next + '">' + esc(nm.num) + ' · ' + esc(nm.short || nm.title) + ' →</a>'
      : '<a class="btn btn-primary" href="#/evaluation">Finish → Quiz</a>';
    s += '</div>';
    return s;
  }

  /**
   * The "common mistakes" panel shown at the bottom of every lab.
   * Content lives in guide.js so it can be edited without touching layout.
   */
  function pitfallBox(id) {
    const G = NLP.guide;
    const list = (G && G.pitfalls && G.pitfalls[id]) || [];
    if (!list.length) return '';
    const meta = labMeta(id);
    let s = '<details class="pitfalls" ' + (list.length <= 4 ? '' : '') + '>';
    s += '<summary><span class="pitfalls-ico">🕳️</span>' +
      '<span class="pitfalls-title">Common beginner mistakes in this lab</span>' +
      '<span class="pitfalls-count">' + list.length + '</span></summary>';
    s += '<div class="pitfalls-body">';
    list.forEach((p, i) => {
      s += '<div class="pitfall">';
      s += '<div class="pitfall-wrong"><span class="pitfall-badge">' + (i + 1) + '</span>' + esc(p.wrong) + '</div>';
      s += '<div class="pitfall-why"><b>Why:</b> ' + esc(p.why) + '</div>';
      s += '<div class="pitfall-fix"><b>Instead:</b> ' + esc(p.fix) + '</div>';
      s += '</div>';
    });
    s += '<div class="pitfalls-foot">Full list for every lab lives in the ' +
      '<a href="#/start">Start Here guide</a>.</div>';
    s += '</div></details>';
    return s;
  }

  /** Renders header + footer around a body element. */
  function mountLab(rootEl, id, bodyHtml) {
    rootEl.innerHTML = labHeader(id) + bodyHtml + pitfallBox(id) + labFooter(id);
    const doneBtn = rootEl.querySelector('[data-role="mark-done"]');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        NLP.app.complete(id);
        toast('Lab marked complete', 'good');
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reusable component builders                                         */
  /* ------------------------------------------------------------------ */
  function kpi(label, value, cls) {
    return '<div class="kpi ' + (cls || '') + '"><b>' + value + '</b><span>' + esc(label) + '</span></div>';
  }

  function barRow(label, value, max, opts = {}) {
    const w = max ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
    return (
      '<div class="barrow">' +
      '<span class="lbl" title="' + esc(label) + '">' + esc(label) + '</span>' +
      '<span class="bartrack"><span class="barfill ' + (opts.cls || '') + '" style="width:' + w.toFixed(1) + '%"></span></span>' +
      '<span class="val">' + esc(opts.text != null ? opts.text : fmt.dec(value, 3)) + '</span>' +
      '</div>'
    );
  }

  function chip(text, opts = {}) {
    const cls = ['chip', opts.cls || ''].filter(Boolean).join(' ');
    let inner = '<span class="w">' + esc(text) + '</span>';
    if (opts.count != null) inner += '<span class="cnt">' + opts.count + '</span>';
    if (opts.orig) inner = '<span class="orig">' + esc(opts.orig) + '</span>' + inner;
    return '<span class="' + cls + '"' + (opts.title ? ' title="' + esc(opts.title) + '"' : '') + '>' + inner + '</span>';
  }

  function codeBlock(code, opts = {}) {
    const id = 'code_' + Math.random().toString(36).slice(2, 8);
    return (
      '<div class="code-block">' +
      '<div class="code-head"><span class="code-dots"><i></i><i></i><i></i></span>' +
      '<span>' + esc(opts.title || 'python') + '</span>' +
      '<button class="btn btn-ghost btn-sm code-copy" data-copy="' + id + '">Copy</button></div>' +
      '<pre id="' + id + '">' + highlightPython(code) + '</pre>' +
      '</div>'
    );
  }

  /** Wire up every [data-copy] button under root. */
  function wireCopy(rootEl) {
    const store = rootEl.__codeStore || (rootEl.__codeStore = {});
    rootEl.querySelectorAll('pre[id^="code_"]').forEach((pre) => {
      store[pre.id] = pre.textContent;
    });
    on(rootEl, 'click', '[data-copy]', async (ev, btn) => {
      const text = store[btn.dataset.copy] || '';
      const ok = await copyText(text);
      toast(ok ? 'Copied to clipboard' : 'Copy failed — select manually', ok ? 'good' : 'bad');
    });
  }

  function switchRow(label, sub, checked, dataAttr) {
    return (
      '<label class="switch">' +
      '<input type="checkbox" ' + dataAttr + (checked ? ' checked' : '') + '>' +
      '<span class="switch-track"></span>' +
      '<span class="switch-text"><span>' + esc(label) + '</span>' +
      (sub ? '<small>' + esc(sub) + '</small>' : '') +
      '</span></label>'
    );
  }

  /* ------------------------------------------------------------------ */
  /* Export                                                              */
  /* ------------------------------------------------------------------ */
  Object.assign(UI, {
    $, $$, esc, html, raw, el, clear, on,
    fmt, pad, mixColor, heatColor, divColor, textOn,
    highlightPython, copyText, toast,
    labMeta, labHeader, labFooter, mountLab, pitfallBox, FLOW,
    kpi, barRow, chip, codeBlock, wireCopy, switchRow
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
