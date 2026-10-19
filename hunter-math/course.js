/* Hunter Math — course config. The shared engine in ../math-core/ reads everything course-specific from here.
   To make another course (e.g. school math, SHSAT), copy this folder, edit this file, and give it a new storageKey. */
window.COURSE = {
  id: 'hunter',
  title: 'Hunter Math',
  subtitle: 'Hunter entrance exam · ISEE Middle Level math',
  exam: '2027-01-27',
  examLabel: 'Jan 27',
  storageKey: 'isee-math-v1',          // keep this: Ryan's saved progress lives under this key
  core: '../math-core/',

  // Domains (topic ids start with the domain number)
  domains: { 1: 'Numbers & Operations', 2: 'Algebra', 3: 'Geometry', 4: 'Measurement', 5: 'Data & Probability', 6: 'QR Strategies' },

  // [topic id from the knowledge map, name shown to Ryan, skill id in ../math-core/bank.js]
  topics: [
    ['1.1', 'Order of Operations', 'order-of-operations'],
    ['1.2', 'Factors, Multiples, GCF & LCM', 'factors-multiples'],
    ['1.3', 'Fractions', 'fractions'],
    ['1.4', 'Fractions ↔ Decimals ↔ Percents', 'fdp-conversions'],
    ['1.5', 'Percents', 'percents'],
    ['1.6', 'Ratios & Rates', 'ratios-rates'],
    ['1.7', 'Negative Numbers & Absolute Value', 'integers'],
    ['1.8', 'Exponents, Roots & Sci. Notation', 'exponents-roots'],
    ['1.9', 'Estimation & Rounding', 'estimation-rounding'],
    ['2.1', 'Patterns & Sequences', 'sequences'],
    ['2.2', 'Evaluating Expressions', 'evaluate-expressions'],
    ['2.3', 'Simplifying Expressions', 'simplify-expressions'],
    ['2.4', 'Solving Equations', 'linear-equations'],
    ['2.5', 'Inequalities', 'inequalities'],
    ['2.6', 'Word Problems → Equations', 'word-problems'],
    ['2.7', 'Coordinates, Functions & Slope', 'coordinates-slope'],
    ['3.1', 'Angles', 'angles'],
    ['3.2', 'Triangles & Pythagorean Theorem', 'triangles'],
    ['3.3', 'Perimeter & Area', 'area-perimeter'],
    ['3.4', 'Circles', 'circles'],
    ['3.5', 'Volume & Surface Area', 'volume-surface'],
    ['3.6', 'Transformations & Symmetry', 'transformations'],
    ['4.1', 'Unit Conversions', 'unit-conversions'],
    ['4.2', 'Time & Money', 'time-money'],
    ['4.3', 'Scale Drawings & Maps', 'scale'],
    ['5.1', 'Mean, Median, Mode & Range', 'mean-median-mode'],
    ['5.2', 'Graphs & Tables', 'graphs-tables'],
    ['5.3', 'Probability', 'probability'],
    ['5.4', 'Compound Probability & Counting', 'compound-probability'],
    ['6.1', 'Quantitative Comparison', 'quant-comparison'],
    ['6.2', 'Plug In Numbers', 'plug-in-numbers'],
    ['6.3', 'Comparing Without Full Calculation', 'compare-shortcuts'],
    ['6.4', 'Estimate & Eliminate', 'estimate-eliminate'],
  ],

  // Topics whose questions can be Quantity A vs. B (used by the QC drill and the QR test)
  qcTopics: ['6.1', '6.1', '6.2', '6.3'],

  // Diagnostic: 2 questions from every topic in these domains
  diag: [
    { label: 'Numbers', domains: ['1'] },
    { label: 'Algebra + Geometry', domains: ['2', '3'] },
    { label: 'Measurement, Data, QR', domains: ['4', '5', '6'] },
  ],

  // Timed tests (answers shown at the end)
  tests: [
    { id: 'mixed', title: 'Mixed set', icon: '⏱', n: 20, mins: 20, weighted: true, desc: 'all topics, weak ones more often' },
    { id: 'qr', title: 'Quantitative Reasoning', icon: 'QR', n: 37, mins: 35, qc: 15, exclude: ['6.1', '6.2'], desc: 'full ISEE section' },
    { id: 'ma', title: 'Math Achievement', icon: 'MA', n: 47, mins: 40, domains: ['1', '2', '3', '4', '5'], desc: 'full ISEE section' },
  ],

  // Narrated lessons: topic id -> lesson file in ../math-core/lessons/
  lessons: { '6.1': 'quant-comparison' },

  // Teaching videos: topic id -> link (shown when Ryan misses a question on that topic)
  videos: {},
};
