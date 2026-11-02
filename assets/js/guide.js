/* =====================================================================
   NLP Lab — guide.js
   Beginner guidance content: per-lab pitfalls, setup instructions,
   troubleshooting, and a printable checklist.

   Everything here is plain data so it can be edited without touching
   any rendering logic.
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = root.NLP;
  const G = {};

  /* ------------------------------------------------------------------ */
  /* 1. Pitfalls — the specific way each lab usually confuses beginners  */
  /*    shown automatically at the bottom of every lab                   */
  /* ------------------------------------------------------------------ */
  G.pitfalls = {
    preprocess: [
      {
        wrong: 'Removing stop words everywhere, then wondering why "I do not like it" and "I like it" classify the same.',
        why: 'Stop words include negations (not, no, never) and intensifiers (very, really). Removing them destroys sentiment and meaning.',
        fix: 'Keep the negation list. Only drop stop words for tasks like topic detection or search indexing. Toggle it off in the demo and watch "not" come back.'
      },
      {
        wrong: 'Stemming before tokenizing, or lowercasing the original string and losing the original text.',
        why: 'Order matters: you cannot stem a sentence, you can only stem tokens. And once you lowercase in place, you lose casing that NER needs.',
        fix: 'Always follow: normalize → tokenize → filter → stem. Keep the original string in a separate variable.'
      },
      {
        wrong: 'Assuming a "word" is whatever is between spaces.',
        why: '"don\'t" is two meaning units (do + n\'t), "New York" is one entity, and many languages do not use spaces at all.',
        fix: 'Decide your tokenizer based on the task. Compare the whitespace and punctuation tokenizers in the demo — same sentence, different tokens.'
      },
      {
        wrong: 'Thinking the vocabulary shrinking is a bug.',
        why: 'Preprocessing is meant to shrink the vocabulary. You are trading information for generalization.',
        fix: 'Watch the KPI counters. If the vocabulary does not shrink, your filters are not doing anything.'
      }
    ],

    stem: [
      {
        wrong: 'Expecting stems to be real words.',
        why: '"relational" → "relat", "studies" → "studi". A stem is a string, not a dictionary word. That is by design — the Porter stemmer is pure suffix surgery.',
        fix: 'If you need real words, use a lemmatizer ("studies" → "study"). Compare both panels in the lab.'
      },
      {
        wrong: 'Using stemming for a task where meaning matters.',
        why: 'Stemming can merge "university" and "universe" both to "univers", which are unrelated concepts.',
        fix: 'Use stemming for search/IR (high recall is fine), lemmatization for anything semantic.'
      },
      {
        wrong: 'Spending hours trying to make the stemmer handle irregular verbs.',
        why: 'Porter is rule-based and has no dictionary. "was" → "wa", "went" → "went". It cannot know irregular forms.',
        fix: 'That is exactly what lemmatization is for. Stop tuning the stemmer and switch tools.'
      },
      {
        wrong: 'Assuming two different stemmers will agree.',
        why: 'Porter, Porter2 (Snowball) and Lancaster all produce different output for the same word.',
        fix: 'Pick one for the whole project, write it down, and never mix them between training and inference.'
      }
    ],

    tfidf: [
      {
        wrong: 'Reading raw TF-IDF values as if 0.42 vs 0.45 is a meaningful difference.',
        why: 'TF-IDF scores are only comparable within the same fitted corpus. Add one document and every number shifts.',
        fix: 'Compare ranks, not absolute values. And always fit the vectorizer on the training set only.'
      },
      {
        wrong: 'Fitting TF-IDF on the whole dataset before splitting train/test (data leakage).',
        why: 'The IDF values then "know" about the test set, so your accuracy looks better than it really is.',
        fix: 'Split first, then fit on train only, then transform test. This is the single most common beginner mistake in NLP.'
      },
      {
        wrong: 'Forgetting to L2-normalize before using cosine similarity.',
        why: 'Without normalization, long documents dominate purely because they contain more words, not because they are more similar.',
        fix: 'Our matrix is already L2-normalized. In scikit-learn set norm="l2" (the default) and never compare raw counts.'
      },
      {
        wrong: 'Expecting TF-IDF to understand meaning.',
        why: '"car" and "automobile" have completely different vectors with zero similarity. TF-IDF only sees shared exact words.',
        fix: 'For meaning, move to embeddings (Lab 08). TF-IDF is a strong, fast baseline — not a semantic model.'
      }
    ],

    similarity: [
      {
        wrong: 'Using Levenshtein distance on sentences and expecting semantic similarity.',
        why: '"The movie was great" and "The film was excellent" have a huge edit distance but mean the same thing.',
        fix: 'Edit distance is for spelling/typos (short strings). Use cosine or embeddings for meaning.'
      },
      {
        wrong: 'Comparing a Levenshtein distance without normalizing by length.',
        why: 'A distance of 3 is huge for "cat" vs "cot" but tiny for two 200-character strings.',
        fix: 'Use normalized similarity: 1 − distance / max(len(a), len(b)).'
      },
      {
        wrong: 'Reading a BLEU score as a percentage of "correct".',
        why: 'BLEU counts n-gram overlap with reference translations. 30 BLEU is a decent translation system, not "30% right".',
        fix: 'Only compare BLEU scores computed on the same test set with the same settings. Never across datasets.'
      },
      {
        wrong: 'Panicking that BLEU is 0 for a good short sentence.',
        why: 'BLEU needs matching 4-grams. A short candidate may contain none, so the 4-gram precision is 0 and the whole score collapses.',
        fix: 'That is a known BLEU weakness. Look at the per-order breakdown in this lab — we surface it so you can see why.'
      }
    ],

    classify: [
      {
        wrong: 'Reporting 100% accuracy on the training data and thinking the model is excellent.',
        why: 'Any model can memorize. Naive Bayes with tiny data often memorizes perfectly and still fails on new text.',
        fix: 'Always report accuracy on held-out test data. Compare train vs test in this lab — the gap is the lesson.'
      },
      {
        wrong: 'Setting alpha = 0 to "avoid bias".',
        why: 'With zero smoothing, any word never seen in a class gets probability 0, and multiplying by 0 wipes out the whole prediction.',
        fix: 'Keep alpha = 1 (Laplace). Try alpha = 0.1 for sharper, alpha = 10 for smoother, and watch what happens on unseen words.'
      },
      {
        wrong: 'Trusting the confidence score from a tiny corpus.',
        why: 'Trained on 48 short sentences, a 99% posterior means "this looks like the training data", not "this is correct".',
        fix: 'Treat confidence as relative, not absolute. More data is the only real fix.'
      },
      {
        wrong: 'Judging a classifier by accuracy alone when classes are imbalanced.',
        why: 'If 95% of examples are class A, a model that always says A scores 95% and is useless.',
        fix: 'Read the confusion matrix and per-class precision/recall — both shown in this lab.'
      }
    ],

    lm: [
      {
        wrong: 'Being surprised that generated text is incoherent.',
        why: 'An n-gram model only looks at the last n−1 words. It has no idea what the sentence is about.',
        fix: 'That is the expected behaviour, not a bug. It is exactly why transformers exist. Try n=3 and see it get more locally fluent but still drift.'
      },
      {
        wrong: 'Using k = 0 in add-k smoothing.',
        why: 'Any unseen n-gram gets probability 0, and perplexity becomes infinite.',
        fix: 'Always use k > 0. Slide k in this lab and watch perplexity respond.'
      },
      {
        wrong: 'Thinking lower perplexity always means a better model for your task.',
        why: 'Perplexity only measures how well the model predicts this particular corpus. It says nothing about usefulness.',
        fix: 'Use perplexity to compare models on the same data, then evaluate the actual task separately.'
      },
      {
        wrong: 'Comparing perplexity between two models with different vocabularies.',
        why: 'Perplexity is defined over a vocabulary. A bigger vocabulary makes the number look worse even if the model is better.',
        fix: 'Only compare perplexity when the tokenization and vocabulary are identical.'
      }
    ],

    bpe: [
      {
        wrong: 'Thinking BPE produces linguistically meaningful morphemes.',
        why: 'BPE merges the most frequent character pairs. "low" + "est" is convenient, but "ing" often gets split as "in" + "g" depending on the corpus.',
        fix: 'BPE optimizes compression, not linguistics. Judge it by vocabulary size and sequence length, not by whether the pieces look like grammar.'
      },
      {
        wrong: 'Assuming the same word always tokenizes the same way.',
        why: 'In real tokenizers, a leading space changes the token (" the" vs "the"), and context can shift boundaries.',
        fix: 'Always tokenize exactly the way the model was trained. Text with different whitespace is a different input.'
      },
      {
        wrong: 'Thinking a bigger vocabulary is always better.',
        why: 'A bigger vocabulary means shorter sequences but a much larger embedding matrix, and rare tokens get poorly trained.',
        fix: 'Real models use 30k–50k tokens as a trade-off. Try different merge counts in this lab and watch sequence length fall.'
      },
      {
        wrong: 'Applying BPE to text the tokenizer has never seen (e.g. another language) and expecting good results.',
        why: 'BPE merges are learned from one corpus. A tokenizer trained on English will shatter Bengali or Arabic into single characters.',
        fix: 'Use a tokenizer trained on your language, or train your own on your own corpus.'
      }
    ],

    embeddings: [
      {
        wrong: 'Expecting king − man + woman = queen to work perfectly in every model.',
        why: 'It works cleanly in a hand-built concept space (this lab), but in real word2vec/GloVe it depends on the corpus and often lands near, not on, the answer.',
        fix: 'Use nearest-neighbour lists, not exact equality. Analogies are a demonstration of geometry, not a reliable operation.'
      },
      {
        wrong: 'Reading the 2D scatter plot as if distances are real distances.',
        why: 'Real embeddings are 100–300 dimensions. PCA squeezes them into 2, keeping the biggest variance — a lot of structure is lost.',
        fix: 'Trust the neighbour lists and cosine numbers; treat the map as a rough sketch.'
      },
      {
        wrong: 'Believing embeddings are neutral because they are "just numbers".',
        why: 'Vectors inherit whatever bias is in the training text. Real embeddings show occupational gender bias and racial stereotypes.',
        fix: 'Always check a model for bias before deploying. This is an active research and ethics area — the lab mentions it deliberately.'
      },
      {
        wrong: 'Comparing vectors from two different models.',
        why: 'Each model learns its own coordinate system. Dimension 5 in model A has nothing to do with dimension 5 in model B.',
        fix: 'Never mix vector sets. If you must, learn a mapping between the spaces first.'
      }
    ],

    pos: [
      {
        wrong: 'Expecting one correct tag per word.',
        why: '"Book" is a noun in "read a book" and a verb in "book a flight". Tagging depends on context, and taggers disagree on ambiguous cases.',
        fix: 'Look at the context, and read the "why" tooltip in this lab to see the rule that fired.'
      },
      {
        wrong: 'Confusing POS tagging with parsing.',
        why: 'Tagging labels each token in isolation-ish. Parsing builds the tree structure (subject, object, dependencies).',
        fix: 'Tagging is step one. For structure you need a parser (spaCy dependency parse, Stanza).'
      },
      {
        wrong: 'Assuming NER will find entities it has never seen.',
        why: 'This lab uses a gazetteer — a fixed name list. A new company name simply is not in it.',
        fix: 'Real NER uses trained models (spaCy, BERT) that generalize from context. That is the whole point of the lab comparison.'
      },
      {
        wrong: 'Forgetting that capitalization is a huge POS/NER signal — then lowercasing everything.',
        why: '"Apple" (company) vs "apple" (fruit) is decided almost entirely by case and context.',
        fix: 'Do not lowercase before NER. Keep the original string and only lowercase a copy for other steps.'
      }
    ],

    attention: [
      {
        wrong: 'Reading one attention row and concluding "this is what the model thinks".',
        why: 'Attention weights are one signal among many. Heads specialize differently, and a high weight does not prove causality.',
        fix: 'Switch heads in this lab and watch the patterns change completely. Attention is a lens, not an explanation.'
      },
      {
        wrong: 'Forgetting that attention needs the causal mask for generation.',
        why: 'Without masking, position 3 can see position 4 — the model would be reading the answer it is supposed to predict.',
        fix: 'Toggle the causal mask in this lab and look at the upper-right triangle go dark.'
      },
      {
        wrong: 'Thinking the softmax denominator is optional.',
        why: 'Softmax makes each row sum to 1 so the output is a weighted average. Without it, values grow with sequence length and training destabilizes.',
        fix: 'Check the row-sum note in this lab — it should always read 1.000.'
      },
      {
        wrong: 'Confusing "attention weights" with "model parameters".',
        why: 'Attention weights are computed fresh for every input. The learned parameters are the Q/K/V projection matrices.',
        fix: 'Same word, two meanings. In this lab you are looking at the computed weights, not the training weights.'
      }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. Setup — getting Python working, in order, with no surprises      */
  /* ------------------------------------------------------------------ */
  G.setup = [
    {
      title: 'Do you need Python at all?',
      body: 'No — not to use this site. Every simulation runs in your browser. Python only matters when you want to redo a lab in your own notebook for an assignment. If you are just exploring, skip to lab 01 right now and come back later.',
      cmd: null
    },
    {
      title: 'Check what you already have',
      body: 'Open a terminal (Windows: PowerShell; macOS/Linux: Terminal) and run this. If you see "Python 3.10" or higher, you are set.',
      cmd: 'python --version',
      note: 'On macOS/Linux you may need python3 instead of python. On Windows, if this opens the Microsoft Store, Python is not really installed — use the official installer from python.org and tick "Add Python to PATH".'
    },
    {
      title: 'Create a project folder and a virtual environment',
      body: 'A virtual environment keeps this project\'s packages separate from everything else on your machine. Always do this — it prevents 90% of "it worked yesterday" problems.',
      cmd: 'mkdir nlp-course\ncd nlp-course\npython -m venv .venv',
      note: 'Windows: activate with .venv\\Scripts\\activate — macOS/Linux: source .venv/bin/activate. Your prompt should now start with (.venv).'
    },
    {
      title: 'Install the libraries used in the labs',
      body: 'These cover all ten labs. It is a large download (~1 GB with PyTorch); if you are short on time, install only what you need for the lab you are doing.',
      cmd: 'pip install nltk scikit-learn numpy pandas matplotlib\npip install spacy\npython -m spacy download en_core_web_sm\npip install tokenizers gensim',
      note: 'The attention lab additionally uses PyTorch: pip install torch. If that is too heavy, skip it — the maths is identical to what the site shows.'
    },
    {
      title: 'Download the NLTK data (one time only)',
      body: 'NLTK ships code but not corpora. Without this step every NLTK example fails with LookupError.',
      cmd: 'python -c "import nltk; nltk.download(\'punkt\'); nltk.download(\'punkt_tab\'); nltk.download(\'stopwords\'); nltk.download(\'wordnet\'); nltk.download(\'omw-1.4\')"',
      note: 'If punkt_tab errors, your NLTK is older — punkt alone is enough there.'
    },
    {
      title: 'Use Jupyter if you have it',
      body: 'Notebooks are ideal for this course because you can see one output at a time.',
      cmd: 'pip install jupyter\njupyter notebook',
      note: 'VS Code users: install the Jupyter extension and just open a .ipynb file — no separate server needed.'
    }
  ];

  /* ------------------------------------------------------------------ */
  /* 3. Troubleshooting — error message → what it actually means         */
  /* ------------------------------------------------------------------ */
  G.troubleshooting = [
    {
      error: 'ModuleNotFoundError: No module named \'nltk\'',
      cause: 'The package is not installed in the Python you are running, or your virtual environment is not active.',
      fix: 'Check that your prompt shows (.venv). Then run python -m pip install nltk. Using python -m pip instead of plain pip guarantees it installs into the interpreter you are actually running.'
    },
    {
      error: 'LookupError: Resource punkt not found',
      cause: 'NLTK code is installed but the data package is missing.',
      fix: 'Run the nltk.download(...) line from the setup section. If you are offline, download the data on another machine and copy the nltk_data folder.'
    },
    {
      error: 'ValueError: empty vocabulary; perhaps the documents only contain stop words',
      cause: 'Your TfidfVectorizer removed every single token — usually you passed stop_words=\'english\' to a corpus of short or stop-word-only texts.',
      fix: 'Remove the stop_words argument, or check your texts are not empty. Print the documents right before vectorizing.'
    },
    {
      error: 'TypeError: \'list\' object is not callable',
      cause: 'You named a variable the same as a function — classic case: tokenizer = nltk.word_tokenize(text) then calling tokenizer(...).',
      fix: 'Rename the variable (tokens = ...). Never shadow a function name with its own result.'
    },
    {
      error: 'IndexError: list index out of range',
      cause: 'You assumed a token list has more elements than it does — very common after stop-word removal empties a sentence.',
      fix: 'Guard with if tokens: before indexing, and print len(tokens) when debugging.'
    },
    {
      error: 'ConvergenceWarning: The max_df and min_df are set too high/low',
      cause: 'Your min_df/min_df thresholds filtered out so many terms that little is left.',
      fix: 'Start with min_df=1, max_df=1.0 (no filtering), get it working, then tighten the thresholds one at a time.'
    },
    {
      error: 'Accuracy is 100% but predictions on my own sentence are nonsense',
      cause: 'Overfitting on a tiny dataset — the model memorized the training sentences. Extremely common with 50-ish examples.',
      fix: 'This is expected and is a lesson, not a bug. Add more data or lower model complexity. Always test on text the model has never seen.'
    },
    {
      error: '"It works in the notebook but not in my script" (or vice versa)',
      cause: 'Either a different virtual environment, a different working directory (relative paths break), or cells run out of order in the notebook.',
      fix: 'Notebook: Kernel → Restart & Run All. Script: run from the project folder, and print os.getcwd() to confirm where you are.'
    },
    {
      error: 'Windows: \'python\' is not recognized / opens the Microsoft Store',
      cause: 'The Windows Store alias is intercepting the command, or Python is not on PATH.',
      fix: 'Settings → Apps → Advanced app settings → App execution aliases → turn OFF python.exe and python3.exe. Then reinstall Python from python.org with "Add to PATH" checked.'
    },
    {
      error: 'Jupyter: the kernel keeps dying / nothing runs',
      cause: 'Usually a memory problem, or a package built for a different Python version.',
      fix: 'Restart the kernel, then reinstall the failing package. Check python --version matches what Jupyter reports with import sys; print(sys.version).'
    }
  ];

  /* ------------------------------------------------------------------ */
  /* 4. The 7 rules — general guidance for a first NLP project           */
  /* ------------------------------------------------------------------ */
  G.rules = [
    {
      n: 1,
      title: 'Always split before you fit',
      body: 'Split into train and test first. Fit every transformer (TF-IDF, scaler, tokenizer) on the training data only. If test data influences training that is data leakage, and your score becomes fiction. This single mistake invalidates more student projects than any other.'
    },
    {
      n: 2,
      title: 'Baseline first, fancy later',
      body: 'Get a stupid-simple model working end to end — majority class, or TF-IDF + logistic regression. Then improve. A working baseline beats a broken transformer, and it gives you a number to beat.'
    },
    {
      n: 3,
      title: 'Look at your data before your model',
      body: 'Print 20 random examples. Count the classes. Check for empty strings, HTML tags, emoji, duplicate rows. Most "model bugs" are data bugs you would have seen in 30 seconds.'
    },
    {
      n: 4,
      title: 'One change at a time',
      body: 'Change one thing, re-measure, write down the result. If you change the tokenizer, the model and the learning rate together, you learn nothing from the new number.'
    },
    {
      n: 5,
      title: 'Preprocessing must match between train and inference',
      body: 'If you lowercased and stemmed during training, you must do exactly the same at prediction time. Save your preprocessing as code or a pipeline object, never as a habit.'
    },
    {
      n: 6,
      title: 'Never trust a single number',
      body: 'Report at least accuracy plus per-class precision/recall, and run more than one random seed. A result that appears with one seed and vanishes with another is not a result.'
    },
    {
      n: 7,
      title: 'Write down what you did as you do it',
      body: 'A lab notebook or a markdown file with the date, the change, and the score. You will not remember why a number improved in three weeks, and your report needs these details.'
    }
  ];

  /* ------------------------------------------------------------------ */
  /* 5. Reading notation — the symbols that confuse everyone             */
  /* ------------------------------------------------------------------ */
  G.notation = [
    ['TF(t, d)', 'How often term t appears in document d. Raw count, or count / total terms.'],
    ['IDF(t)', 'log((1 + N) / (1 + df(t))) + 1 — how rare t is. N = number of documents, df = in how many docs t appears.'],
    ['TF-IDF', 'TF multiplied by IDF. Frequent here, rare everywhere → high score.'],
    ['||v||', 'The length (L2 norm) of vector v: the square root of the sum of squared components.'],
    ['cos(a, b)', 'Dot product divided by the product of the lengths. 1 = identical direction, 0 = unrelated, −1 = opposite.'],
    ['P(w | c)', 'Probability of word w given class c. "If the class is positive, how likely is this word?"'],
    ['α (alpha)', 'Smoothing constant. Adds α to every count so no probability is exactly 0. α = 1 is Laplace smoothing.'],
    ['PPL', 'Perplexity = exp(−average log probability). Lower is better. "How surprised is the model by this text?"'],
    ['n-gram', 'A run of n consecutive tokens. "the cat sat" contains the 3-grams (the, cat, sat).'],
    ['k (in add-k)', 'Smoothing added to every n-gram count. Small k = sharp, large k = smooth.'],
    ['Q, K, V', 'Query (what I am looking for), Key (what I offer), Value (what I pass on) — all learned projections of the same tokens.'],
    ['softmax', 'Turns a vector of scores into probabilities that are positive and sum to 1.'],
    ['√d_k', 'The scaling factor in attention: dividing by the square root of the key dimension keeps the dot products from growing too large.'],
    ['BLEU', 'A score comparing machine output to reference text using n-gram overlap plus a penalty for being too short. Range 0–100.'],
    ['F1', 'Harmonic mean of precision and recall. Useful when you care about both false positives and false negatives.'],
    ['PPMI', 'Positive Pointwise Mutual Information — how much more often two words co-occur than chance would predict, floored at 0.']
  ];

  /* ------------------------------------------------------------------ */
  /* 6. Before-you-submit checklist                                      */
  /* ------------------------------------------------------------------ */
  G.checklist = [
    'I split the data into train and test before fitting anything.',
    'I fitted my vectorizer/tokenizer on the training data only.',
    'I use the exact same preprocessing at training and prediction time.',
    'I report a baseline number, not just my final model.',
    'I looked at the confusion matrix, not only accuracy.',
    'I checked my classes are balanced (or I used appropriate metrics).',
    'I tried more than one random seed and the result held.',
    'I tested on text the model has genuinely never seen.',
    'I know what the single biggest error case in my model is.',
    'My code runs top to bottom in a fresh kernel without errors.',
    'I can explain every line of my code out loud.',
    'I saved my figures and the exact command that produced them.'
  ];

  /* ------------------------------------------------------------------ */
  /* 7. "What should I do next?" — a decision table                      */
  /* ------------------------------------------------------------------ */
  G.nextSteps = [
    {
      goal: 'I want to classify text (spam, sentiment, topics)',
      path: 'Lab 03 → Lab 05',
      tip: 'Start with TF-IDF + Naive Bayes. Only reach for transformers if that plateaus.'
    },
    {
      goal: 'I want to compare how similar two texts are',
      path: 'Lab 04 → Lab 08',
      tip: 'Exact word overlap first (cosine on TF-IDF), meaning second (embeddings).'
    },
    {
      goal: 'I want to generate text or build a chatbot',
      path: 'Lab 06 → Lab 07 → Lab 10',
      tip: 'Understand n-grams and sub-words before touching a large language model.'
    },
    {
      goal: 'I want to find names, places, dates in documents',
      path: 'Lab 09',
      tip: 'spaCy NER gets you far in one line. Fine-tuning is only for unusual domains.'
    },
    {
      goal: 'I want to search a document collection',
      path: 'Lab 01 → Lab 03 → Lab 08',
      tip: 'Build a TF-IDF index first; it is fast, explainable and shockingly hard to beat.'
    },
    {
      goal: 'I have to write a report about an NLP system',
      path: 'Lab 05 → Evaluation',
      tip: 'Report accuracy, per-class metrics, a confusion matrix and one concrete failure case.'
    }
  ];

  /* ------------------------------------------------------------------ */
  /* 8. Time-boxed study plans                                           */
  /* ------------------------------------------------------------------ */
  G.plans = [
    {
      name: '30 minutes — survive your first lab',
      steps: ['Overview + live demo (3 min)', 'Lab 01 preprocessing (10 min)', 'Lab 02 stemming (8 min)', 'Quiz: first 5 questions (9 min)']
    },
    {
      name: '2 hours — one solid session',
      steps: ['Labs 01–03 (35 min)', 'Lab 04 similarity (15 min)', 'Lab 05 classification (25 min)', 'Run the Python for Lab 01–05 in Jupyter (25 min)', 'Quiz, all questions (20 min)']
    },
    {
      name: 'One week — genuinely comfortable with NLP basics',
      steps: ['Day 1: Labs 01–02 + all Python snippets', 'Day 2: Labs 03–04 + build a small TF-IDF search over your own documents', 'Day 3: Lab 05 + train a classifier on your own labelled data', 'Day 4: Labs 06–07 + train BPE on a text file you choose', 'Day 5: Lab 08 + do 5 analogies of your own', 'Day 6: Labs 09–10 + read the "Attention is All You Need" abstract', 'Day 7: Full quiz, then write one page on what still confuses you']
    }
  ];

  NLP.guide = G;
})(typeof globalThis !== 'undefined' ? globalThis : this);
