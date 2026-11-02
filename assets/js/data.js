/* =====================================================================
   NLP Lab — data.js
   All teaching content: word lists, corpora, hand-built embeddings,
   glossary, quizzes and the lab registry.
   ===================================================================== */
(function (root) {
  'use strict';
  const NLP = (root.NLP = root.NLP || {});
  const D = (NLP.data = {});

  /* ------------------------------------------------------------------ */
  /* Stop words                                                          */
  /* ------------------------------------------------------------------ */
  D.stopwords = `a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves`.split(/\s+/);

  /* ------------------------------------------------------------------ */
  /* POS lexicon (toy, but ordered by frequency of use)                  */
  /* ------------------------------------------------------------------ */
  D.posLexicon = {
    nlp: 'NN', language: 'NN', text: 'NN', token: 'NN', model: 'NN', data: 'NN',
    computer: 'NN', python: 'NN', code: 'NN', machine: 'NN', learning: 'NN',
    cat: 'NN', cats: 'NNS', dog: 'NN', dogs: 'NNS', book: 'NN', books: 'NNS',
    student: 'NN', students: 'NNS', teacher: 'NN', university: 'NN', class: 'NN',
    food: 'NN', rice: 'NN', tea: 'NN', coffee: 'NN', water: 'NN', city: 'NN',
    dhaka: 'NNP', bangladesh: 'NNP', london: 'NNP', paris: 'NNP', america: 'NNP',
    sadia: 'NNP', rahim: 'NNP', karim: 'NNP', google: 'NNP', microsoft: 'NNP',
    sat: 'VBD', run: 'VB', runs: 'VBZ', ran: 'VBD', running: 'VBG',
    eat: 'VB', eats: 'VBZ', ate: 'VBD', eaten: 'VBN', eating: 'VBG',
    learn: 'VB', learns: 'VBZ', learned: 'VBD', learning: 'VBG',
    build: 'VB', builds: 'VBZ', built: 'VBD', building: 'VBG',
    write: 'VB', writes: 'VBZ', wrote: 'VBD', written: 'VBN', writing: 'VBG',
    read: 'VB', reads: 'VBZ', love: 'VB', loves: 'VBZ', loved: 'VBD',
    like: 'VB', likes: 'VBZ', liked: 'VBD', want: 'VB', wants: 'VBZ',
    make: 'VB', makes: 'VBZ', made: 'VBD', use: 'VB', uses: 'VBZ', used: 'VBD',
    help: 'VB', helps: 'VBZ', helped: 'VBD', work: 'VB', works: 'VBZ',
    think: 'VB', thinks: 'VBZ', thought: 'VBD', say: 'VB', says: 'VBZ', said: 'VBD',
    quick: 'JJ', brown: 'JJ', lazy: 'JJ', happy: 'JJ', sad: 'JJ', big: 'JJ',
    small: 'JJ', smart: 'JJ', beautiful: 'JJ', interesting: 'JJ', easy: 'JJ',
    hard: 'JJ', deep: 'JJ', neural: 'JJ', natural: 'JJ', large: 'JJ',
    quickly: 'RB', slowly: 'RB', very: 'RB', really: 'RB', always: 'RB', never: 'RB'
  };

  /* ------------------------------------------------------------------ */
  /* NER gazetteer                                                       */
  /* ------------------------------------------------------------------ */
  D.gazetteer = {
    people: ['Sadia', 'Rahim', 'Karim', 'Nusrat', 'Tanvir', 'Ayesha', 'Imran', 'Fahim', 'Mim', 'Arif',
      'Ada Lovelace', 'Alan Turing', 'Noam Chomsky', 'Geoffrey Hinton', 'Yann LeCun', 'Elon Musk',
      'Bill Gates', 'Sundar Pichai', 'Satya Nadella', 'Shah Rukh Khan'],
    places: ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal', 'Rangpur', 'Mymensingh',
      'Bangladesh', 'India', 'Pakistan', 'Nepal', 'London', 'Paris', 'New York', 'Tokyo', 'Berlin',
      'America', 'Europe', 'Asia', 'Africa', 'Mount Everest', 'Padma', 'Buriganga'],
    orgs: ['Google', 'Microsoft', 'OpenAI', 'DeepMind', 'Facebook', 'Amazon', 'Apple', 'Netflix',
      'BUET', 'DU', 'NSU', 'Brac University', 'Acme Corp', 'UN', 'WHO', 'NASA', 'BBC', 'CNN']
  };

  /* ------------------------------------------------------------------ */
  /* Sentiment corpus (small, balanced, with recurring sentiment words   */
  /* so Naive Bayes has something to learn from)                         */
  /* ------------------------------------------------------------------ */
  D.sentiment = [
    { text: 'I love this movie', label: 'positive' },
    { text: 'I love the story and the acting', label: 'positive' },
    { text: 'this movie is wonderful', label: 'positive' },
    { text: 'the film was wonderful and fun', label: 'positive' },
    { text: 'a great film with great acting', label: 'positive' },
    { text: 'the acting was great and the story was good', label: 'positive' },
    { text: 'brilliant performance, really brilliant', label: 'positive' },
    { text: 'the acting was brilliant', label: 'positive' },
    { text: 'excellent movie, highly recommend it', label: 'positive' },
    { text: 'excellent story and excellent acting', label: 'positive' },
    { text: 'amazing film, I loved every minute', label: 'positive' },
    { text: 'the visuals were amazing and the music was good', label: 'positive' },
    { text: 'beautiful film, beautiful ending', label: 'positive' },
    { text: 'the ending was beautiful and touching', label: 'positive' },
    { text: 'a delightful watch, really enjoyable', label: 'positive' },
    { text: 'the characters were delightful and funny', label: 'positive' },
    { text: 'fun and funny, a fun movie', label: 'positive' },
    { text: 'we had fun watching this film', label: 'positive' },
    { text: 'the best movie of the year', label: 'positive' },
    { text: 'best acting I have seen, best story too', label: 'positive' },
    { text: 'I enjoyed this film a lot', label: 'positive' },
    { text: 'really enjoyable and charming', label: 'positive' },
    { text: 'the food was delicious and the staff were friendly', label: 'positive' },
    { text: 'delicious food, friendly staff, good service', label: 'positive' },
    { text: 'the service was friendly and the room was clean', label: 'positive' },
    { text: 'clean room, friendly staff, great service', label: 'positive' },
    { text: 'the coffee was amazing and the place was cozy', label: 'positive' },
    { text: 'a good film, I recommend it', label: 'positive' },
    { text: 'the story was good and the acting was impressive', label: 'positive' },
    { text: 'impressive visuals and a perfect soundtrack', label: 'positive' },
    { text: 'the plot was exciting and the characters were lovable', label: 'positive' },
    { text: 'exciting, funny and touching, I loved it', label: 'positive' },

    { text: 'I hate this movie', label: 'negative' },
    { text: 'I hate the story and the acting', label: 'negative' },
    { text: 'this movie is terrible', label: 'negative' },
    { text: 'the film was terrible and boring', label: 'negative' },
    { text: 'a bad film with bad acting', label: 'negative' },
    { text: 'the acting was bad and the story was weak', label: 'negative' },
    { text: 'awful performance, really awful', label: 'negative' },
    { text: 'the acting was awful', label: 'negative' },
    { text: 'worst movie, I do not recommend it', label: 'negative' },
    { text: 'worst story and worst acting', label: 'negative' },
    { text: 'a boring film, I hated every minute', label: 'negative' },
    { text: 'the visuals were dull and the music was bad', label: 'negative' },
    { text: 'ugly film, ugly ending', label: 'negative' },
    { text: 'the ending was confusing and dull', label: 'negative' },
    { text: 'a painful watch, really disappointing', label: 'negative' },
    { text: 'the characters were annoying and stupid', label: 'negative' },
    { text: 'slow and stupid, a stupid movie', label: 'negative' },
    { text: 'we had a bad time watching this film', label: 'negative' },
    { text: 'the worst movie of the year', label: 'negative' },
    { text: 'bad acting I have seen, bad story too', label: 'negative' },
    { text: 'I regret watching this film', label: 'negative' },
    { text: 'really disappointing and dull', label: 'negative' },
    { text: 'the food was cold and the staff were rude', label: 'negative' },
    { text: 'cold food, rude staff, bad service', label: 'negative' },
    { text: 'the service was rude and the room was dirty', label: 'negative' },
    { text: 'dirty room, rude staff, terrible service', label: 'negative' },
    { text: 'the coffee was awful and the place was noisy', label: 'negative' },
    { text: 'a bad film, I do not recommend it', label: 'negative' },
    { text: 'the story was weak and the acting was poor', label: 'negative' },
    { text: 'poor visuals and a terrible soundtrack', label: 'negative' },
    { text: 'the plot was confusing and the characters were annoying', label: 'negative' },
    { text: 'slow, stupid and shallow, I hated it', label: 'negative' }
  ];

  /* ------------------------------------------------------------------ */
  /* Language-model corpus (~45 short sentences, repetitive on purpose    */
  /* so n-gram statistics are visible)                                   */
  /* ------------------------------------------------------------------ */
  D.corpus = [
    'the cat sat on the mat',
    'the cat sat on the warm mat',
    'the dog sat on the mat',
    'the dog ran in the park',
    'the cat ran in the park',
    'a cat sat on a mat',
    'a dog ran in a park',
    'the bird flew over the tree',
    'the bird sang in the tree',
    'the sun rose over the hill',
    'the sun set over the sea',
    'the sea was calm and blue',
    'the sky was clear and blue',
    'she read a book in the park',
    'he read a book on the train',
    'she wrote a letter to her friend',
    'he wrote a letter to his friend',
    'they went to the market in the morning',
    'they went to the market in the evening',
    'we walked to the park in the evening',
    'we walked to the river in the morning',
    'the market was busy in the morning',
    'the park was quiet in the evening',
    'the train arrived at the station',
    'the train left the station on time',
    'the bus arrived at the station late',
    'the rain fell on the roof',
    'the rain fell all night',
    'the wind blew through the trees',
    'the leaves fell from the trees',
    'the children played in the park',
    'the children laughed at the joke',
    'the teacher read a story to the children',
    'the student read a book for the class',
    'the class started in the morning',
    'the class ended in the evening',
    'nature is beautiful in the morning',
    'the river is calm in the evening',
    'the city is busy in the morning',
    'the city is quiet at night',
    'the moon rose over the city',
    'the stars shone over the sea',
    'the stars shone all night',
    'a gentle breeze blew over the river',
    'the boat moved slowly over the river',
    'the fish swam in the clear water',
    'the water was cold and clear',
    'the mountain was high and cold'
  ];

  /* ------------------------------------------------------------------ */
  /* Mini corpus for "learned embeddings" (PPMI + power iteration)       */
  /* ------------------------------------------------------------------ */
  D.embedCorpus = [
    'king queen prince princess royal throne crown palace kingdom',
    'king rules the kingdom from the throne',
    'queen rules the kingdom with the crown',
    'the prince and princess live in the palace',
    'man woman boy girl person people human',
    'the man walks to the city',
    'the woman walks to the city',
    'the boy plays in the park',
    'the girl plays in the park',
    'paris is the capital of france',
    'rome is the capital of italy',
    'tokyo is the capital of japan',
    'dhaka is the capital of bangladesh',
    'london is the capital of england',
    'france italy japan bangladesh england are countries',
    'paris rome tokyo dhaka london are cities',
    'the city is busy and the country is quiet',
    'france and italy are in europe',
    'japan is a country in asia',
    'bangladesh is a country in asia',
    'cat dog bird fish animal',
    'the cat sleeps on the mat',
    'the dog runs in the park',
    'the bird flies over the tree',
    'the fish swims in the water',
    'the cat and the dog are animals',
    'apple rice bread tea coffee food',
    'we eat rice and fish for dinner',
    'she drinks tea in the morning',
    'he drinks coffee in the morning',
    'the apple is sweet and the rice is warm',
    'pizza pasta sushi burger are food',
    'computer phone tablet laptop machine',
    'the computer runs the program',
    'the phone rings in the morning',
    'the laptop is on the table',
    'software hardware code data program',
    'happy sad angry calm joyful emotion',
    'she is happy today',
    'he is sad today',
    'the children are happy and joyful',
    'the man is angry and sad',
    'joy love hope peace are emotions',
    'red blue green yellow colour',
    'the sky is blue and the grass is green',
    'the sun is yellow and the rose is red',
    'big small large tiny size',
    'the mountain is big and the stone is small',
    'the city is large and the village is small',
    'fast slow quick rapid speed',
    'the train is fast and the boat is slow',
    'the car is quick and the bus is slow'
  ];

  /* ------------------------------------------------------------------ */
  /* Hand-built concept embeddings                                       */
  /* Each word is a sum of interpretable concept vectors, so analogies    */
  /* like king - man + woman = queen work exactly.                        */
  /* ------------------------------------------------------------------ */
  D.embeddingAxes = [
    'royal', 'male', 'female', 'human', 'animal', 'food', 'tech',
    'positive', 'negative', 'big', 'speed', 'capital', 'countryFR',
    'countryIT', 'countryJP', 'countryBD', 'countryUK', 'place', 'music', 'sport'
  ];

  D.concepts = {
    royal: { royal: 1.0, positive: 0.2 },
    male: { male: 1.0, human: 1.0 },
    female: { female: 1.0, human: 1.0 },
    person: { human: 0.7 },
    animal: { animal: 1.0 },
    food: { food: 1.0, positive: 0.3 },
    tech: { tech: 1.0, human: -0.2 },
    good: { positive: 1.0 },
    bad: { negative: 1.0 },
    large: { big: 1.0 },
    speed: { speed: 1.0 },
    fast: { speed: 1.0 },
    slow: { speed: -1.0 },
    place: { place: 1.0 },
    france: { countryFR: 1.0, place: 0.4 },
    italy: { countryIT: 1.0, place: 0.4 },
    japan: { countryJP: 1.0, place: 0.4 },
    bangladesh: { countryBD: 1.0, place: 0.4 },
    uk: { countryUK: 1.0, place: 0.4 },
    capital: { capital: 1.0, place: 0.6 },
    music: { music: 1.0 },
    sport: { sport: 1.0 }
  };

  // word -> [concept, weight, concept, weight, ...]
  D.embeddingWords = {
    king: ['royal', 1, 'male', 1, 'person', 0.9],
    queen: ['royal', 1, 'female', 1, 'person', 0.9],
    prince: ['royal', 1, 'male', 1, 'person', 0.85],
    princess: ['royal', 1, 'female', 1, 'person', 0.85],
    man: ['male', 1, 'person', 1],
    woman: ['female', 1, 'person', 1],
    boy: ['male', 1, 'person', 1],
    girl: ['female', 1, 'person', 1],
    father: ['male', 1, 'person', 1, 'large', 0.3],
    mother: ['female', 1, 'person', 1, 'large', 0.3],
    paris: ['capital', 1, 'france', 1],
    rome: ['capital', 1, 'italy', 1],
    tokyo: ['capital', 1, 'japan', 1],
    dhaka: ['capital', 1, 'bangladesh', 1],
    london: ['capital', 1, 'uk', 1],
    france: ['france', 1, 'place', 1],
    italy: ['italy', 1, 'place', 1],
    japan: ['japan', 1, 'place', 1],
    bangladesh: ['bangladesh', 1, 'place', 1],
    england: ['uk', 1, 'place', 1],
    cat: ['animal', 1, 'large', 0.4, 'speed', 0.3],
    dog: ['animal', 1, 'large', 0.9, 'speed', 0.5],
    kitten: ['animal', 1, 'large', -0.6, 'speed', 0.2, 'person', 0.1],
    puppy: ['animal', 1, 'large', -0.1, 'speed', 0.4, 'person', 0.1],
    horse: ['animal', 1, 'large', 1.4, 'speed', 0.9],
    bird: ['animal', 1, 'large', -0.5, 'speed', 0.6],
    fish: ['animal', 1, 'large', 0.1, 'speed', 0.2],
    apple: ['food', 1, 'large', -0.5, 'good', 0.3],
    rice: ['food', 1, 'large', -0.3],
    coffee: ['food', 1, 'good', 0.2],
    pizza: ['food', 1, 'good', 0.4, 'large', 0.2],
    computer: ['tech', 1, 'large', 0.9],
    laptop: ['tech', 1, 'large', 0.4],
    phone: ['tech', 1, 'large', -0.6, 'speed', 0.2],
    software: ['tech', 1, 'large', 0.6],
    happy: ['good', 1, 'person', 0.3],
    joyful: ['good', 1, 'person', 0.3],
    sad: ['bad', 1, 'person', 0.3],
    angry: ['bad', 1, 'person', 0.3, 'large', 0.2],
    big: ['large', 1],
    small: ['large', -1],
    huge: ['large', 1.4],
    tiny: ['large', -1.3],
    fast: ['fast', 1],
    slow: ['slow', 1],
    quick: ['fast', 0.9, 'large', -0.2],
    rapid: ['fast', 1.1],
    guitar: ['music', 1, 'tech', 0.2],
    piano: ['music', 1, 'large', 0.4],
    song: ['music', 1],
    football: ['sport', 1, 'fast', 0.3],
    cricket: ['sport', 1, 'slow', 0.3],
    tennis: ['sport', 1, 'fast', 0.2]
  };

  D.analogyTriples = [
    ['king', 'man', 'woman', 'queen'],
    ['prince', 'boy', 'girl', 'princess'],
    ['king', 'prince', 'princess', 'queen'],
    ['paris', 'france', 'italy', 'rome'],
    ['tokyo', 'japan', 'bangladesh', 'dhaka'],
    ['father', 'man', 'woman', 'mother'],
    ['cat', 'kitten', 'puppy', 'dog'],
    ['dog', 'puppy', 'kitten', 'cat']
  ];

  /* ------------------------------------------------------------------ */
  /* BPE corpus                                                          */
  /* ------------------------------------------------------------------ */
  D.bpeCorpus = {
    low: 5, lower: 2, newest: 6, widest: 3, new: 4, wide: 2, lowly: 2, lowest: 1,
    newer: 2, wider: 1, slow: 3, slower: 2, slowest: 1, fast: 4, faster: 3, fastest: 2,
    cat: 5, cats: 3, dog: 4, dogs: 2, run: 4, runs: 3, running: 2, ran: 2,
    play: 3, plays: 2, playing: 2, played: 1, text: 4, texts: 2, token: 4, tokens: 3,
    tokenize: 2, tokenizer: 1, model: 4, models: 3, learn: 3, learns: 2, learning: 2
  };

  /* ------------------------------------------------------------------ */
  /* Attention demo sentences                                            */
  /* ------------------------------------------------------------------ */
  D.attentionSentences = [
    'The animal did not cross the street because it was too tired',
    'The animal did not cross the street because it was too wide',
    'The bank by the river was steep and muddy',
    'The chef cooked the fish and then served the fish to the guest',
    'Sadia gave Rahim the book because she trusted him',
    'The old man the boat',
    'NLP models learn patterns from text data'
  ];

  /* ------------------------------------------------------------------ */
  /* Preprocessing sample texts                                          */
  /* ------------------------------------------------------------------ */
  D.sampleTexts = {
    'Classic': "The cats were running quickly through the garden, and they didn't stop until sunset. It's amazing! 3 cats, 2 dogs, and 1 very happy student were watching them.",
    'Tweet': "@nlp_lab OMG this is sooo cool!!! 😍 I can't wait 2 try the new tokenizer... #NLP #Python 10/10",
    'Review': "I absolutely loved this film. The acting was brilliant, the story was touching, and the ending made me cry. I'd watch it again tomorrow.",
    'Mixed': "Dhaka University (DU) students built a Bangla NLP model in 2024. It handles 1.2M sentences/day. Contact: lab@du.ac.bd or visit https://du.ac.bd/nlp",
    'Shakespeare': "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune.",
    'Bangla-ish': "Amar sonar Bangla, ami tomay bhalobashi. The river Padma is beautiful in the morning; people love tea and rice."
  };

  /* ------------------------------------------------------------------ */
  /* Glossary                                                            */
  /* ------------------------------------------------------------------ */
  D.glossary = [
    { term: 'NLP', def: 'Natural Language Processing — the field that teaches computers to read, understand and generate human language.', lab: 'overview' },
    { term: 'Token', def: 'The smallest unit a model works with: usually a word, a sub-word or even a character. "don\'t" can be 1 token (word) or 3 (sub-word).', lab: 'preprocess' },
    { term: 'Tokenization', def: 'Splitting raw text into tokens.', lab: 'preprocess' },
    { term: 'Normalization', def: 'Making text comparable: lowercasing, removing accents/punctuation, fixing unicode (e.g. "ＨＥＬＬＯ" → "hello").', lab: 'preprocess' },
    { term: 'Stop words', def: 'Very frequent words with little topic content ("the", "is", "and"). Removing them shrinks data, but can hurt models like translation.', lab: 'preprocess' },
    { term: 'Stemming', def: 'Crude chopping of word endings to a common stem: "studies" → "studi". Fast, but the stem may not be a real word.', lab: 'stem' },
    { term: 'Lemmatization', def: 'Mapping a word to its dictionary form using grammar: "was" → "be", "better" → "good". Slower but linguistically correct.', lab: 'stem' },
    { term: 'Corpus', def: 'A body of text used for training or analysis. Plural: corpora.', lab: 'tfidf' },
    { term: 'Bag of Words', def: 'Represent a document as counts of words, throwing away order. Simple and surprisingly strong for topic classification.', lab: 'tfidf' },
    { term: 'TF-IDF', def: 'A word\'s weight = how often it appears in a document (TF) × how rare it is across documents (IDF). Common words get pushed down.', lab: 'tfidf' },
    { term: 'IDF', def: 'Inverse Document Frequency: log((1+N)/(1+df)) + 1 in scikit-learn. Rare words get higher IDF.', lab: 'tfidf' },
    { term: 'Cosine similarity', def: 'Similarity of two vectors measured by the angle between them: 1 = same direction, 0 = unrelated. Ignores document length.', lab: 'similarity' },
    { term: 'Vector space model', def: 'Representing text as numeric vectors so that geometry (distance, angle) becomes meaning.', lab: 'tfidf' },
    { term: 'Naive Bayes', def: 'A classifier that assumes all features (words) are independent given the class, then applies Bayes\' rule. Fast baseline for text.', lab: 'classify' },
    { term: 'Smoothing (Laplace)', def: 'Adding a small count α to every word so unseen words never get probability 0.', lab: 'classify' },
    { term: 'Prior / Posterior', def: 'Prior = belief before seeing evidence. Posterior = updated belief after seeing the evidence.', lab: 'classify' },
    { term: 'Precision / Recall / F1', def: 'Precision: of the items I flagged, how many were right. Recall: of the real items, how many I caught. F1 balances both.', lab: 'classify' },
    { term: 'Confusion matrix', def: 'A table of predicted vs. true labels. Off-diagonal cells are the mistakes.', lab: 'classify' },
    { term: 'Overfitting', def: 'Memorising the training data instead of learning patterns; train score high, test score low.', lab: 'classify' },
    { term: 'N-gram', def: 'A run of N consecutive tokens: "the cat" (bigram), "the cat sat" (trigram).', lab: 'lm' },
    { term: 'Language model', def: 'A model that assigns probabilities to sequences and can predict the next token.', lab: 'lm' },
    { term: 'Perplexity', def: 'exp(-average log-probability). Lower = the model is less surprised by the text. A perplexity of 20 ≈ as unsure as choosing among 20 equally likely words.', lab: 'lm' },
    { term: 'Smoothing (n-gram)', def: 'Reserving a little probability mass for unseen n-grams, e.g. add-k or Kneser-Ney, so perplexity stays finite.', lab: 'lm' },
    { term: 'BPE', def: 'Byte-Pair Encoding: iteratively merge the most frequent adjacent symbol pair. Used by GPT, RoBERTa and many LLM tokenizers.', lab: 'bpe' },
    { term: 'Sub-word tokenization', def: 'Splitting words into reusable pieces ("token" + "ization"), which handles rare words and typos.', lab: 'bpe' },
    { term: 'Embedding', def: 'A dense vector for a word/token, learned so that similar meanings end up close together.', lab: 'embeddings' },
    { term: 'Word2Vec', def: 'Shallow neural embedding trained to predict a word from its neighbours (CBOW) or neighbours from a word (skip-gram).', lab: 'embeddings' },
    { term: 'Cosine neighbourhood', def: 'The words with the highest cosine similarity to a target vector — the classic way to inspect embeddings.', lab: 'embeddings' },
    { term: 'Analogy task', def: 'king − man + woman ≈ queen: vector arithmetic exposes relational structure in embeddings.', lab: 'embeddings' },
    { term: 'POS tagging', def: 'Assigning a part of speech (noun, verb, adjective…) to each token. Many words are ambiguous ("book" noun or verb).', lab: 'pos' },
    { term: 'Named Entity Recognition', def: 'Finding spans that are names: people, organisations, places, dates, money…', lab: 'pos' },
    { term: 'Edit distance', def: 'The minimum number of insertions, deletions and substitutions to turn one string into another. Used for spelling correction and evaluation.', lab: 'similarity' },
    { term: 'BLEU', def: 'A translation metric based on n-gram precision against references, with a brevity penalty. 0–100 (0–1 internally).', lab: 'similarity' },
    { term: 'Attention', def: 'A mechanism that lets each token look at other tokens and decide how much information to take from each one.', lab: 'attention' },
    { term: 'Query / Key / Value', def: 'Attention compares a Query with all Keys to get weights, then averages the Values using those weights.', lab: 'attention' },
    { term: 'Softmax', def: 'Turns raw scores into a probability distribution that sums to 1: softmax(z)ᵢ = e^zᵢ / Σe^zⱼ.', lab: 'attention' },
    { term: 'Scaled dot-product', def: 'score = Q·Kᵀ / √dₖ. The √dₖ scaling keeps scores from exploding as vectors get longer.', lab: 'attention' },
    { term: 'Causal mask', def: 'Hiding future tokens during training so a language model cannot peek at the answer.', lab: 'attention' },
    { term: 'Multi-head', def: 'Running several attention layers in parallel so different heads can learn different relations (syntax, coreference…).', lab: 'attention' },
    { term: 'Transformer', def: 'The architecture built from attention + feed-forward layers; the basis of BERT and GPT.', lab: 'attention' },
    { term: 'F1 / BLEU / perplexity', def: 'Three different evaluation families: classification, generation and language modelling.', lab: 'evaluation' },
    { term: 'Annotation', def: 'Human labelling of data (e.g. marking entities). Quality of annotation caps the quality of any supervised model.', lab: 'overview' }
  ];

  /* ------------------------------------------------------------------ */
  /* Quiz bank                                                           */
  /* ------------------------------------------------------------------ */
  D.quiz = [
    { topic: 'preprocess', q: 'Why do we usually lowercase text before building a bag-of-words model?', options: ['To make the text shorter', 'So "Cat" and "cat" count as the same word', 'Because Python requires it', 'To remove stop words'], answer: 1, why: 'Without lowercasing, "Cat" and "cat" become two different vocabulary entries and split the evidence.' },
    { topic: 'preprocess', q: 'Which is a risk of removing stop words?', options: ['The text becomes unreadable', 'Negation like "not good" may lose its meaning', 'The vocabulary grows', 'Tokenization stops working'], answer: 1, why: 'Stop-word lists often include "not", "no", "never" — removing them can flip sentiment. Modern models usually keep them.' },
    { topic: 'stem', q: 'What is the stem of "relational" using the Porter stemmer?', options: ['relation', 'relat', 'relate', 'rel'], answer: 1, why: 'Porter removes "-ational" → "relate", then step 5 drops the final e (m>1) giving "relat".' },
    { topic: 'stem', q: 'Main difference between stemming and lemmatization?', options: ['Lemmatization uses a dictionary and grammar, stemming chops suffixes', 'Stemming always gives real words', 'Lemmatization only works on verbs', 'They are identical'], answer: 0, why: 'Stemming is a fast mechanical rule; lemmatization returns a valid dictionary form ("was" → "be").' },
    { topic: 'tfidf', q: 'A word appears in every document of the corpus. Its IDF is…', options: ['Very high', 'Zero-ish (lowest)', 'Infinite', 'Undefined'], answer: 1, why: 'df = N so IDF = log((1+N)/(1+N)) + 1 = 1, the minimum. It cannot separate documents.' },
    { topic: 'tfidf', q: 'Why do we L2-normalise TF-IDF vectors?', options: ['To remove stop words', 'So long and short documents are comparable by angle', 'To make values integers', 'To increase vocabulary'], answer: 1, why: 'Cosine similarity already ignores length, but normalising makes dot products directly comparable and keeps values stable.' },
    { topic: 'similarity', q: 'Cosine similarity of two perpendicular vectors is…', options: ['1', '0', '-1', 'undefined'], answer: 1, why: 'cos(90°) = 0: the vectors share no direction, i.e. no shared weighted terms.' },
    { topic: 'similarity', q: 'Edit distance between "cat" and "cats" is…', options: ['0', '1', '2', '4'], answer: 1, why: 'One insertion of "s" — distance 1.' },
    { topic: 'similarity', q: 'BLEU includes a brevity penalty because…', options: ['Long outputs are always better', 'n-gram precision alone rewards very short outputs', 'References are shorter', 'It normalises case'], answer: 1, why: 'A 1-word output that happens to match gets precision 1.0, so BLEU multiplies by BP = exp(1 − r/c) when the candidate is too short.' },
    { topic: 'classify', q: 'Naive Bayes is "naive" because it assumes…', options: ['Words are independent given the class', 'The data is small', 'There are only two classes', 'Features are numbers'], answer: 0, why: 'Real words are correlated, but the independence assumption makes the maths simple and works well in practice.' },
    { topic: 'classify', q: 'Laplace smoothing prevents…', options: ['Overfitting the vocabulary', 'Zero probabilities for unseen words', 'Slow training', 'Class imbalance'], answer: 1, why: 'Adding α to every count means an unseen word gets a small non-zero probability instead of killing the whole product.' },
    { topic: 'classify', q: 'Your model scores 99% on train and 62% on test. This is…', options: ['Underfitting', 'Overfitting', 'Perfect generalisation', 'A data leak'], answer: 1, why: 'A large train/test gap means memorisation. Fix: more data, regularisation, simpler features, cross-validation.' },
    { topic: 'classify', q: 'Precision answers which question?', options: ['Of all true positives, how many did I find?', 'Of all items I predicted positive, how many are truly positive?', 'How fast is the model?', 'How many classes exist?'], answer: 1, why: 'Precision = TP / (TP + FP); recall = TP / (TP + FN).' },
    { topic: 'lm', q: 'A bigram model predicts the next word using…', options: ['The whole sentence', 'Only the previous word', 'The next two words', 'The document topic'], answer: 1, why: 'Bigram: P(wₜ | wₜ₋₁). Trigram uses two previous words, etc.' },
    { topic: 'lm', q: 'Lower perplexity means…', options: ['The model is more surprised', 'The model assigns higher probability to the real text', 'The corpus is smaller', 'The vocabulary is larger'], answer: 1, why: 'Perplexity = exp(−mean log p). Better predictions → higher p → lower perplexity.' },
    { topic: 'lm', q: 'Why does an unsmoothed n-gram model give infinite perplexity on new text?', options: ['Because of floating point', 'An unseen n-gram has probability 0 and log 0 = −∞', 'Because the corpus is too large', 'Because of tokenization'], answer: 1, why: 'One zero probability in the product makes the whole likelihood zero → infinite perplexity.' },
    { topic: 'bpe', q: 'BPE builds its vocabulary by…', options: ['Counting whole words', 'Repeatedly merging the most frequent adjacent symbol pair', 'Sorting characters alphabetically', 'Using a dictionary'], answer: 1, why: 'Start from characters, merge the most frequent pair, repeat. Common words become single tokens, rare words split into pieces.' },
    { topic: 'bpe', q: 'Why do LLMs use sub-word tokenization instead of words?', options: ['It is faster to type', 'It handles unseen and misspelled words with a bounded vocabulary', 'It removes stop words', 'It makes sentences shorter'], answer: 1, why: 'A fixed sub-word vocabulary can encode any string, including typos and new words, without an "unknown token".' },
    { topic: 'embeddings', q: 'In an embedding space, cosine similarity measures…', options: ['How often two words co-occur', 'How similar their directions (meanings) are', 'Their spelling overlap', 'Their frequency'], answer: 1, why: 'Embeddings place semantically similar words in similar directions; the angle captures that.' },
    { topic: 'embeddings', q: 'king − man + woman ≈ ?', options: ['prince', 'queen', 'royal', 'woman'], answer: 1, why: 'The "royalty" direction is preserved and the gender direction flips, landing nearest to "queen".' },
    { topic: 'pos', q: 'In "I book a hotel", the word "book" is…', options: ['A noun', 'A verb', 'An adjective', 'A preposition'], answer: 1, why: 'POS depends on context: after "I" and before a noun phrase, "book" acts as a verb.' },
    { topic: 'pos', q: 'NER on "Sadia joined Google in 2019" should label…', options: ['Sadia=PERSON, Google=ORG, 2019=DATE', 'Sadia=ORG, Google=GPE', 'All three as PERSON', 'Nothing'], answer: 0, why: 'Person, organisation and date are the classic three entity types in that sentence.' },
    { topic: 'attention', q: 'In scaled dot-product attention, Q·Kᵀ is divided by √dₖ to…', options: ['Speed up the GPU', 'Keep dot products from growing with dimension, stabilising softmax', 'Normalise the input', 'Remove the mask'], answer: 1, why: 'Dot products of random dₖ-dim vectors have variance ≈ dₖ; dividing by √dₖ keeps the softmax in a useful range.' },
    { topic: 'attention', q: 'A causal mask in a decoder…', options: ['Hides padding', 'Prevents attending to future tokens', 'Doubles the heads', 'Adds position information'], answer: 1, why: 'During next-token prediction the model must not see tokens it is supposed to predict.' },
    { topic: 'attention', q: 'Multi-head attention is useful because…', options: ['It is cheaper than one head', 'Different heads can specialise in different relations', 'It removes the need for positions', 'It guarantees accuracy'], answer: 1, why: 'Heads learn different patterns — e.g. one tracks syntax, another coreference — and their outputs are concatenated.' },
    { topic: 'overview', q: 'Which pipeline order is most sensible for a classic text classifier?', options: ['Classify → tokenize → clean', 'Clean → tokenize → vectorize → classify → evaluate', 'Vectorize → clean → tokenize', 'Tokenize → classify → clean'], answer: 1, why: 'Clean/normalise, split into tokens, convert to vectors, train/predict, then measure on held-out data.' },
    { topic: 'overview', q: 'Why must the test set never be used for tuning?', options: ['It is too small', 'It would leak information and inflate your reported score', 'It contains stop words', 'It is unlabelled'], answer: 1, why: 'Tuning on test data is leakage: the score stops estimating performance on unseen data.' },
    { topic: 'evaluation', q: 'For a spam filter where missing spam is very costly, you care most about…', options: ['Precision', 'Recall', 'Accuracy', 'Perplexity'], answer: 1, why: 'Recall = TP/(TP+FN): you want to catch as much spam as possible, even at the cost of some false alarms.' }
  ];

  /* ------------------------------------------------------------------ */
  /* Python snippets (for the class practicals)                          */
  /* ------------------------------------------------------------------ */
  D.python = {
    preprocess: `# pip install nltk
import nltk, re
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

nltk.download('punkt'); nltk.download('stopwords')

text = "The cats were running quickly, and they didn't stop!"
text = text.lower()
text = re.sub(r"[^a-z0-9\\s']", " ", text)        # drop punctuation

tokens   = word_tokenize(text)
stops    = set(stopwords.words('english'))
filtered = [t for t in tokens if t not in stops]

stemmer = PorterStemmer()
stems   = [stemmer.stem(t) for t in filtered]
print(tokens, filtered, stems, sep="\\n")`,
    stem: `from nltk.stem import PorterStemmer, WordNetLemmatizer
nltk.download('wordnet'); nltk.download('omw-1.4')

words = ["studies", "studied", "running", "better", "was"]
ps, wl = PorterStemmer(), WordNetLemmatizer()

for w in words:
    print(f"{w:10} stem={ps.stem(w):10} lemma={wl.lemmatize(w, pos='v')}")`,
    tfidf: `# pip install scikit-learn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

docs = ["the cat sat on the mat",
        "the dog sat on the log",
        "cats and dogs are friends"]

vec   = TfidfVectorizer(stop_words='english')
X     = vec.fit_transform(docs)
print(X.shape)                       # (3 documents, V words)
print(vec.get_feature_names_out()[:10])
print(X[0].toarray().round(2))
print(cosine_similarity(X).round(2))`,
    similarity: `from difflib import SequenceMatcher   # stdlib, no install

a, b = "kitten", "sitting"
print(SequenceMatcher(None, a, b).ratio())

# Levenshtein distance (install: pip install python-Levenshtein)
try:
    from Levenshtein import distance
    print("distance =", distance("kitten", "sitting"))
except ImportError:
    print("pip install python-Levenshtein")

# BLEU (pip install nltk)
from nltk.translate.bleu_score import sentence_bleu
ref  = [["the", "cat", "is", "on", "the", "mat"]]
cand = ["the", "cat", "is", "on", "a", "mat"]
print("BLEU =", sentence_bleu(ref, cand))`,
    classify: `# pip install scikit-learn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

texts = ["I love this movie", "terrible and boring", ...]   # your data
labels = ["positive", "negative", ...]

X_train, X_test, y_train, y_test = train_test_split(
    texts, labels, test_size=0.25, random_state=42, stratify=labels)

vec = TfidfVectorizer(lowercase=True, stop_words='english')
Xtr = vec.fit_transform(X_train)
Xte = vec.transform(X_test)          # fit on TRAIN only!

clf = MultinomialNB(alpha=1.0).fit(Xtr, y_train)
pred = clf.predict(Xte)
print(classification_report(y_test, pred))
print(confusion_matrix(y_test, pred))`,
    lm: `# pip install nltk
import nltk
from nltk.lm import Laplace
from nltk.lm.preprocessing import padded_everygram_pipeline
from nltk.util import ngrams

tokens = "the cat sat on the mat".split()
train_data, vocab = padded_everygram_pipeline(2, [tokens])

model = Laplace(2)
model.fit(train_data, vocab)

print(model.score("mat", ["the"]))          # P(mat | the)
print(model.generate(8, text_seed=["the"])) # sample 8 words`,
    bpe: `# pip install tokenizers
from tokenizers import Tokenizer, models, trainers, pre_tokenizers

tok = Tokenizer(models.BPE())
tok.pre_tokenizer = pre_tokenizers.Whitespace()

trainer = trainers.BpeTrainer(vocab_size=300, special_tokens=["[UNK]"])
tok.train_from_iterator(corpus_lines, trainer=trainer)

print(tok.encode("lowest").tokens)
print(tok.get_vocab_size())`,
    embeddings: `# pip install gensim
from gensim.models import Word2Vec

sentences = [line.split() for line in open("corpus.txt")]
model = Word2Vec(sentences, vector_size=100, window=5, min_count=1, sg=1)

print(model.wv.most_similar("king", topn=5))
print(model.wv.most_similar(positive=["king", "woman"], negative=["man"], topn=1))
# -> [('queen', 0.71), ...]

# Or use pretrained vectors
import gensim.downloader as api
wv = api.load("glove-wiki-gigaword-50")   # ~66 MB
print(wv.most_similar("cat"))`,
    pos: `# pip install spacy && python -m spacy download en_core_web_sm
import spacy
nlp = spacy.load("en_core_web_sm")

doc = nlp("Sadia joined Google in 2019 and moved to Dhaka.")
for tok in doc:
    print(f"{tok.text:12} {tok.pos_:6} {tok.tag_:5} {tok.lemma_:10} {tok.dep_}")

for ent in doc.ents:
    print(ent.text, "->", ent.label_)`,
    attention: `# pip install torch
import torch, torch.nn.functional as F

def attention(Q, K, V, mask=None):
    d_k = Q.size(-1)
    scores = Q @ K.transpose(-2, -1) / d_k**0.5      # (B, T, T)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float("-inf"))
    weights = F.softmax(scores, dim=-1)
    return weights @ V, weights

T, d = 6, 16
Q = K = V = torch.randn(T, d)
out, weights = attention(Q, K, V)
print(weights.shape)      # torch.Size([6, 6])
print(weights.sum(-1))    # rows sum to 1`
  };

  /* ------------------------------------------------------------------ */
  /* Lab registry metadata (content lives in labs/*.js)                  */
  /* ------------------------------------------------------------------ */
  D.labs = [
    {
      id: 'preprocess', num: '01', title: 'Text Preprocessing', short: 'Preprocess',
      icon: '✂️', tagline: 'Turn messy human text into clean tokens.',
      minutes: 8, level: 'Beginner',
      learn: [
        ['<b>Why it matters.</b> Models only see numbers. Before anything else we must cut text into tokens, and decide which pieces carry meaning. Good preprocessing is often worth more than a fancier model.'],
        ['<b>The classic pipeline.</b> raw text → lowercase → strip punctuation/HTML → tokenize → remove stop words → stem or lemmatize. Each step is a choice: a translation model should <i>not</i> remove "not", a topic model probably should.'],
        ['<b>Tokenization is hard.</b> "don\'t" → 1 or 2 tokens? "New York" → 1 or 2? Emoji, URLs, hashtags, Bangla conjuncts — every language has its own traps.'],
        ['<b>Try it.</b> Toggle the switches and watch each stage. The little bar under every token is its live count.']
      ]
    },
    {
      id: 'stem', num: '02', title: 'Stemming & Lemmatization', short: 'Stem / Lemma',
      icon: '🌱', tagline: 'studies → studi vs. studies → study.',
      minutes: 7, level: 'Beginner',
      learn: [
        ['<b>Problem.</b> "study", "studies", "studied", "studying" look different to a computer but mean the same thing. Merging them reduces vocabulary and strengthens counts.'],
        ['<b>Stemming</b> is fast and dumb: chop suffixes with rules (Porter, Snowball). The output need not be a real word — that is fine, it only needs to be <i>consistent</i>.'],
        ['<b>Lemmatization</b> uses a dictionary + part of speech: "was → be", "better → good", "mice → mouse". Slower, but human-readable.'],
        ['<b>Watch the step-by-step Porter trace</b> below: each rule has a condition like m &gt; 0 (how many vowel-consonant sequences remain).']
      ]
    },
    {
      id: 'tfidf', num: '03', title: 'TF-IDF & Vector Space', short: 'TF-IDF',
      icon: '📊', tagline: 'Turning documents into weighted vectors.',
      minutes: 9, level: 'Beginner',
      learn: [
        ['<b>Bag of words</b> counts words and ignores order: "dog bites man" = "man bites dog". Crude, but for topic detection order rarely matters.'],
        ['<b>The problem with raw counts:</b> "the" appears everywhere and dominates. <b>IDF</b> fixes this: weight = tf × log((1+N)/(1+df)) + 1.'],
        ['<b>Geometry.</b> Each document becomes a point in V-dimensional space. Similar documents point the same way → cosine similarity ≈ 1.'],
        ['<b>Edit the corpus</b> below and watch the matrix, the heatmap and the nearest neighbours update instantly.']
      ]
    },
    {
      id: 'similarity', num: '04', title: 'Text Similarity & Evaluation', short: 'Similarity',
      icon: '📐', tagline: 'Cosine, edit distance and BLEU.',
      minutes: 8, level: 'Beginner',
      learn: [
        ['<b>Three ways to ask "how similar?"</b> — set overlap (Jaccard), angle between vectors (cosine), and character edits (Levenshtein).'],
        ['<b>Edit distance</b> is dynamic programming: the table shows the cheapest path from "" to the full string. It powers spell-check and fuzzy search.'],
        ['<b>Evaluating generated text</b> needs different tools. BLEU compares n-gram overlap with reference translations and punishes short outputs.'],
        ['<b>No single metric is truth.</b> BLEU correlates weakly with human judgement; that is why modern evaluation uses learned metrics and human raters.']
      ]
    },
    {
      id: 'classify', num: '05', title: 'Text Classification', short: 'Classifier',
      icon: '🏷️', tagline: 'Naive Bayes from counts to confidence.',
      minutes: 10, level: 'Beginner',
      learn: [
        ['<b>Task.</b> Give a document a label: spam/ham, positive/negative, topic, language, intent.'],
        ['<b>Bayes\' rule:</b> P(class | words) ∝ P(class) × Π P(word | class). We work in log-space so tiny probabilities do not underflow.'],
        ['<b>Why "naive"?</b> We pretend words are independent. They are not — but the classifier is fast, needs little data and is a strong baseline.'],
        ['<b>Evaluate honestly.</b> Train on 75%, test on 25%. Watch the confusion matrix and per-class precision/recall.']
      ]
    },
    {
      id: 'lm', num: '06', title: 'Language Modeling', short: 'N-grams',
      icon: '🔮', tagline: 'Predict the next word, measure surprise.',
      minutes: 9, level: 'Intermediate',
      learn: [
        ['<b>A language model</b> gives a probability to every sequence: P("the cat sat") = P(the)·P(cat|the)·P(sat|the cat)…'],
        ['<b>N-grams</b> approximate this with a fixed window. A bigram only looks one word back, a trigram two. Cheap, interpretable, and the historical foundation of GPT-style models.'],
        ['<b>Smoothing</b> stops unseen combinations from getting probability 0. Add-k smoothing borrows a little mass for everything.'],
        ['<b>Perplexity</b> = how many equally likely words the model feels it is choosing between. Lower is better. Try the slider: small k overfits, huge k flattens everything.']
      ]
    },
    {
      id: 'bpe', num: '07', title: 'Sub-word Tokenization (BPE)', short: 'BPE',
      icon: '🧩', tagline: 'How GPT turns words into pieces.',
      minutes: 8, level: 'Intermediate',
      learn: [
        ['<b>Word vocabularies break</b> on typos, names, and morphologically rich languages. Character vocabularies make sequences very long. Sub-words are the compromise.'],
        ['<b>BPE algorithm.</b> Start with characters. Count adjacent pairs. Merge the most frequent pair. Repeat until you hit the vocabulary budget.'],
        ['<b>The result</b> is a vocabulary of reusable pieces: "token" + "ization", "un" + "believ" + "able". Frequent words collapse to one token, rare words split into familiar chunks.'],
        ['<b>Step through the merges</b> below and then encode your own word with the learned vocabulary.']
      ]
    },
    {
      id: 'embeddings', num: '08', title: 'Word Embeddings', short: 'Embeddings',
      icon: '🧭', tagline: 'Meaning becomes geometry.',
      minutes: 10, level: 'Intermediate',
      learn: [
        ['<b>One-hot vectors</b> are huge and all equally distant — "cat" is as far from "dog" as from "democracy". Embeddings fix that: dense vectors where distance ≈ meaning.'],
        ['<b>They are learned</b> from co-occurrence: words in similar contexts get similar vectors (the distributional hypothesis).'],
        ['<b>Famous property:</b> king − man + woman ≈ queen. Relations become directions you can add and subtract.'],
        ['<b>Two modes below:</b> an interpretable hand-built space (so the axes are human concepts), and vectors actually learned from a mini corpus with PPMI + SVD.']
      ]
    },
    {
      id: 'pos', num: '09', title: 'POS Tagging & NER', short: 'POS & NER',
      icon: '🔎', tagline: 'Grammar and named entities, token by token.',
      minutes: 8, level: 'Beginner',
      learn: [
        ['<b>POS tagging</b> labels each token: noun, verb, adjective, determiner… Ambiguity is the whole problem — "book" is a noun in "the book" and a verb in "I book a room".'],
        ['<b>NER</b> finds spans that name things: PERSON, ORG, GPE (place), DATE, MONEY, EMAIL, URL.'],
        ['<b>Real systems</b> use statistical models (spaCy, Stanza) trained on annotated corpora. This page uses a lexicon + context rules so you can see every decision.'],
        ['<b>Hover a tag</b> to see why it was chosen, and switch on "show alternatives" to see the ambiguity.']
      ]
    },
    {
      id: 'attention', num: '10', title: 'Attention (Transformer Core)', short: 'Attention',
      icon: '🧠', tagline: 'Which words should look at which?',
      minutes: 11, level: 'Advanced',
      learn: [
        ['<b>Before attention</b>, RNNs squeezed a sentence into one vector and forgot long-range context. Attention lets every token read every other token directly.'],
        ['<b>Q, K, V.</b> Each token emits a Query ("what am I looking for?"), a Key ("what do I contain?") and a Value ("what do I pass on?"). Query·Key gives the weight; weights average the Values.'],
        ['<b>Scaling.</b> Dot products grow with dimension, so we divide by √dₖ before softmax to keep gradients healthy.'],
        ['<b>Causal masks</b> hide the future so a decoder can be trained on next-token prediction. <b>Multi-head</b> attention runs several of these in parallel.']
      ]
    }
  ];

  /* Which quiz questions belong to which lab */
  D.quizByTopic = {};
  D.quiz.forEach((q, i) => {
    q.id = 'q' + i;
    (D.quizByTopic[q.topic] = D.quizByTopic[q.topic] || []).push(q);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
