# 🧠 NLP Lab — Interactive NLP Simulations

A complete, offline, zero-install website for learning Natural Language Processing as a
beginner. Ten hands-on labs where every algorithm runs **live in the browser**, each paired
with the equivalent Python code you can paste into Jupyter.

Built for a first NLP lab class: open `index.html`, no build step, no `pip install`, no server.

---

## 🚀 Open it

Just double-click **`index.html`** — that is the whole install.

If your browser blocks local files for any reason, serve the folder:

```bash
# Python 3
python -m http.server 8000
#   → http://localhost:8000

# or Node
npx serve .
```

Works in Chrome, Edge, Firefox and Safari (desktop and mobile).

> **New to this? Open [Start Here](#/start) first — not Lab 01.**
> It is a 6-minute read covering what to do in what order, Python setup that actually
> works, the 40 specific traps beginners hit in each lab, 10 decoded error messages,
> and a submission checklist.

---

## 🚦 Beginner guidance (the Start Here page)

The site is designed so you **cannot get lost**, even with zero Python background:

| Section | What it gives you |
|---------|-------------------|
| **How this site works** | The 60-second mental model — every lab has the same shape, nothing can break, Python is optional |
| **Python setup** | 6 ordered steps with copy buttons: version check → virtualenv → pip install → NLTK data download |
| **The 7 rules** | Split before you fit, baseline first, look at your data, one change at a time… |
| **40 documented traps** | Per-lab: what beginners do wrong, *why* it fails, and exactly what to do instead |
| **Error decoder** | 10 real error messages → plain-English cause → the fix |
| **Notation table** | TF(t,d), IDF, ‖v‖, cos(a,b), P(w\|c), α, PPL, Q/K/V, softmax, √d_k, PPMI |
| **Next-step router** | "I want to build X" → which labs, in which order |
| **3 study plans** | 30 minutes / 2 hours / one week, with a commitment you can actually keep |
| **Submission checklist** | 12 tick-boxes that persist in your browser |

**Every lab also ends with its own collapsible "common beginner mistakes" box**, so the
guidance arrives exactly where you need it — not in a document you forgot to open.

---

## 📚 The ten labs

| # | Lab | What you can do | Concepts |
|---|-----|-----------------|----------|
| 01 | **Text Preprocessing** | Type any text, toggle six pipeline steps, watch tokens change stage by stage | tokenization, normalization, stop words, vocab shrinkage |
| 02 | **Stemming & Lemmatization** | See the exact Porter rule that fired for each word, compare with a lemmatizer | Porter stemmer, m>0 / m>1 conditions, lemma vs stem |
| 03 | **TF-IDF & Vector Space** | Edit a corpus, see the TF-IDF heatmap, term weights and document similarity | BoW, TF, IDF, L2 normalization, cosine similarity |
| 04 | **Similarity & Evaluation** | Three tabs: edit-distance DP table, cosine/Jaccard, BLEU | Levenshtein, Jaccard, cosine, BLEU, brevity penalty |
| 05 | **Text Classification** | Train Naive Bayes, tune α and test split, inspect the confusion matrix | Bayes' rule, Laplace smoothing, precision/recall/F1, overfitting |
| 06 | **Language Modeling** | Predict next words, auto-generate text, slide *k* and watch perplexity | n-grams, add-k smoothing, perplexity, sparsity |
| 07 | **Sub-word Tokenization** | Step through BPE merges one at a time, encode your own word | BPE, merge frequency, vocabulary budget, sub-words |
| 08 | **Word Embeddings** | Explore a concept map, do vector arithmetic, learn vectors from a corpus | distributional hypothesis, cosine neighbours, king−man+woman, PPMI+SVD |
| 09 | **POS & NER** | Tag every token, hover for the reason, highlight named entities | POS tags, ambiguity, gazetteer NER, entity types |
| 10 | **Attention** | See the full Q·Kᵀ attention matrix, per-token focus, causal mask | Q/K/V, scaled dot-product, softmax, multi-head, causal masking |

Plus:

- **Overview** — learning path, progress tracking, live tokenizer demo
- **Glossary** — 42 terms in plain language, searchable
- **Quiz & Evaluation** — 28 questions with instant explanations and scoring

---

## ✨ Features

- **Everything runs in your browser.** The NLP algorithms are a small dependency-free JS
  library (`assets/js/engine.js`) — a real Porter stemmer, real TF-IDF, real Naive Bayes,
  real BPE, real scaled dot-product attention.
- **Python for every lab.** Each lab ends with a copy-paste snippet (NLTK, scikit-learn,
  spaCy, gensim, HuggingFace tokenizers, PyTorch). All snippets are syntax-checked by the
  test suite.
- **Progress is saved** in `localStorage` — close the tab, come back later.
- **Dark & light themes**, keyboard shortcuts, print-ready handouts.
- **Responsive** — verified at 1440px, 768px and 390px.
- **No tracking, no accounts, no network calls.**

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | previous / next lab |
| `S` | Start Here guide |
| `G` | glossary |
| `Q` | quiz |
| `D` | toggle dark / light |
| `?` | show shortcuts |
| `Esc` | close mobile menu |

---

## 📁 Project layout

```
nlp-lab/
├── index.html                  # single entry point
├── assets/
│   ├── css/styles.css          # design tokens, layout, components, print styles
│   └── js/
│       ├── engine.js           # the NLP toolkit (pure functions + classes)
│       ├── data.js             # corpora, lexicons, embeddings, glossary, quiz, Python
│       ├── guide.js            # ✨ beginner guidance content (pitfalls, setup, errors)
│       ├── ui.js               # DOM helpers, formatting, syntax highlighting, lab chrome
│       ├── app.js              # shell, router, progress, overview/glossary/quiz pages
│       ├── start.js            # ✨ the "Start Here" page renderer
│       └── labs/               # one file per lab
│           ├── preprocess.js
│           ├── stem.js
│           ├── tfidf.js
│           ├── similarity.js
│           ├── classify.js
│           ├── lm.js
│           ├── bpe.js
│           ├── embeddings.js
│           ├── pos.js
│           └── attention.js
└── tests/                      # see below
```

### Editing the guidance

All beginner guidance lives in **`assets/js/guide.js`** as plain data — no markup, no
layout code. To add a trap a student hit in class, append an object:

```js
G.pitfalls.tfidf.push({
  wrong: 'What the student did',
  why:   'Why it fails',
  fix:   'What to do instead'
});
```

It appears automatically in the Start Here guide *and* in the Lab 03 pitfall box.
`node tests/guide.test.js` will check your wording is substantial enough to help.

Adding a lab: create `assets/js/labs/mylab.js` that sets `NLP.views.mylab = function (root) {…}`,
add an entry to `NLP.data.labs` in `data.js`, add a `G.pitfalls.mylab` array, and add a
`<script>` tag in `index.html`. `UI.mountLab(root, 'mylab', html)` gives you the header,
learning points, pitfall box, prev/next and "mark complete" button for free.

---

## 🧪 Tests

```bash
# everything at once (≈ 95 s)
node tests/run-all.js

# or individually
node tests/engine.test.js    # 672 assertions — algorithms + data integrity
node tests/guide.test.js     # 349 assertions — beginner guidance quality
node tests/ui.test.js        # 117 assertions — every route in jsdomnode tests/browser.test.js   # 198 assertions — real Chrome via CDP + screenshots
node tests/layout.test.js    # 210 assertions — 3 breakpoints, overflow/contrast/typography
node tests/python.test.js    #  all 10 Python snippets parse with ast
```

**1547 assertions, all passing.**

`engine.test.js` checks the Porter stemmer against the canonical Porter (1980) test pairs,
verifies TF-IDF against hand-computed values, checks that attention rows sum to 1 and that
the causal mask hides the future, and asserts the sentiment corpus is actually learnable
(mean accuracy > 72 % across 120 random splits, leave-one-out > 80 %). It also validates
every quiz answer index, every embedding concept/axis reference, and that all 8 analogies
resolve to the expected word.

`guide.test.js` guards the teaching content itself: every lab must have 3+ pitfalls, each
pitfall must state the mistake, the reason and the fix in enough words to be useful, every
recommended lab path must reference a lab that exists, and no placeholder text may leak in.

`browser.test.js` and `layout.test.js` drive headless Chrome through the DevTools Protocol,
exercise the real interactions (train the classifier, step through BPE, run an analogy,
click an attention cell, take the quiz, tick the checklist, toggle the theme, use keyboard
shortcuts, emulate printing) and write screenshots to `tests/shots/_regression/`.

> `jsdom` is only needed by `ui.test.js`: `npm install` inside this folder if you want to
> run that one. Every other suite uses Node built-ins only.

---

## 🖥️ Serving locally (optional)

```bash
npm run serve      # → http://localhost:5173
```

A 60-line dependency-free static server (`tests/serve.js`). You do **not** need it to use
the site — opening `index.html` directly works.

---

## 🎓 Suggested 50-minute lab session

**Before class:** read Start Here (6 min). It is the difference between a smooth session
and twenty people stuck on `ModuleNotFoundError` at minute 40.

1. **5 min** — Overview: type a sentence in the live demo, predict what happens.
2. **8 min** — Lab 01: preprocess a tweet. Turn stop-word removal off and find "not".
3. **7 min** — Lab 02: compare `studies`, `was`, `better` under stem vs lemma.
4. **8 min** — Lab 03: add a sentence to the corpus, watch similarity change.
5. **7 min** — Lab 05: train the classifier, then break it with α = 0.1.
6. **8 min** — Lab 06 + 07: generate text, then step through BPE merges.
7. **7 min** — Lab 10: click "it" in the animal sentence and explain the attention row.
8. **Homework** — Quiz & Evaluation, then re-run each lab's Python snippet in Jupyter.

---

## 📝 Notes & honest limitations

- The POS tagger is a **lexicon + context rules**, not a trained model. It is designed so
  every decision is inspectable — real taggers (spaCy, Stanza) are far more accurate.
- NER is a **gazetteer + regex** system. It will miss entities it has never seen; that is
  the point of the "why real NER needs training data" note in the lab.
- Attention uses **deterministic pseudo-embeddings** derived from character n-grams, so the
  patterns are illustrative rather than linguistically perfect. The maths (softmax, scaling,
  masking) is exact.
- Embeddings lab 1 is a **hand-built concept space** so analogies resolve perfectly and the
  axes are human-readable; lab 3 learns vectors genuinely from a mini corpus with PPMI + SVD.
- The sentiment corpus is deliberately tiny (64 sentences) so it trains instantly. Accuracy
  around 80–88 % is realistic for that size; a real project would use thousands of examples.

---

## 📄 License

MIT — use it in class, remix it, ship it.
