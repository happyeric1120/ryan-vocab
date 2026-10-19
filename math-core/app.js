'use strict';
/* Shared practice app. Everything course-specific comes from window.COURSE (see ../<course>/course.js). */
const C = window.COURSE;
const CORE = C.core || '../math-core/';
const TOPICS = C.topics.map(([id, name, skill]) => ({ id, name, skill, dom: id.split('.')[0] }));
const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));
const DOMAINS = C.domains, DOM_IDS = Object.keys(DOMAINS);
const VIDEOS = C.videos || {};
const LESSONS = C.lessons || {}, LESSON_IDS = Object.keys(LESSONS);
const EXAM = C.exam ? new Date(C.exam + 'T00:00:00') : null;
const KEY = C.storageKey;
function gen(topicId) { const q = BANK.gen(TOPIC[topicId].skill); q.t = topicId; return q; }
function genQC() { for (let i = 0; i < 30; i++) { const q = gen(pick(C.qcTopics)); if (q.qc) return q; } return gen(C.qcTopics[0]); }
document.title = C.title;
const $app = document.getElementById('app');
const LET = ['A', 'B', 'C', 'D'];

// ---------- storage (local to this browser; export/import on the parent page moves it between devices)
function blank() { return { v: 1, att: [], rev: [], diag: { parts: {}, res: {} }, err: [], ses: [], les: {} }; }
let S = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.v ? Object.assign(blank(), s) : blank(); } catch (e) { return blank(); } })();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

const pad = n => String(n).padStart(2, '0');
const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return dayStr(d); };
const daysLeft = () => EXAM ? Math.max(0, Math.ceil((EXAM - new Date(new Date().toDateString())) / 864e5)) : null;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtSec = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- mastery
function recent(t, n = 8) { const a = []; for (let i = S.att.length - 1; i >= 0 && a.length < n; i--) if (S.att[i][0] === t) a.push(S.att[i]); return a; }
function mastery(t) {
  const r = recent(t);
  if (r.length >= 3) { const acc = r.filter(x => x[1] && !x[5]).length / r.length; return { acc, n: r.length, st: acc >= .85 ? 'good' : acc >= .6 ? 'warn' : 'bad' }; }
  const d = S.diag.res[t];
  if (d) { const sc = d.c - d.g; return { acc: sc / d.n, n: 0, st: sc >= d.n ? 'good' : sc > 0 ? 'warn' : 'bad', diag: true }; }
  return { acc: null, n: r.length, st: 'none' };
}
const ST_LABEL = { good: 'Got it', warn: 'Shaky', bad: 'Learn', none: 'New' };
function weight(t) { const m = mastery(t); return m.st === 'none' ? 2 : 1 + 4 * (1 - m.acc); }
function weightedTopics(n, pool) {
  pool = pool || TOPICS.map(t => t.id); const out = [], cnt = {};
  while (out.length < n) {
    const ws = pool.map(t => (cnt[t] || 0) >= 3 ? 0 : weight(t) ** 2), tot = ws.reduce((a, b) => a + b, 0);
    if (!tot) { out.push(pool[Math.floor(Math.random() * pool.length)]); continue; }
    let r = Math.random() * tot, i = 0; while (r > ws[i]) { r -= ws[i]; i++; }
    out.push(pool[i]); cnt[pool[i]] = (cnt[pool[i]] || 0) + 1;
  }
  return out;
}

// ---------- spaced review
const IVL = [1, 3, 7, 14];
function addReview(q) { if (q.rid) return; S.rev.push({ id: q.id, q, box: 0, due: addDays(1) }); if (S.rev.length > 80) S.rev.shift(); }
function dueReviews() { const today = dayStr(); return S.rev.filter(r => r.due <= today); }
function reviewQuestion(r) { const q = r.box === 0 ? Object.assign({}, r.q) : gen(r.q.t); q.rid = r.id; return q; }
function updateReview(q, ok) {
  const r = S.rev.find(x => x.id === q.rid); if (!r) return;
  if (ok) { r.box++; if (r.box >= IVL.length) S.rev = S.rev.filter(x => x !== r); else r.due = addDays(IVL[r.box]); }
  else { r.box = 0; r.due = addDays(1); }
}

// ---------- session builders
const MODES = {
  daily: { title: "Today's practice", feedback: true },
  topic: { title: 'Topic practice', feedback: true },
  qc: { title: 'Quantitative Comparison drill', feedback: true },
  diag: { title: 'Diagnostic', feedback: false },
  lesson: { title: 'Lesson', feedback: true },
};
for (const t of C.tests || []) MODES[t.id] = { title: t.title, feedback: false, secs: t.mins * 60, test: t };
const DIAG = C.diag || [];
const diagTopics = p => TOPICS.filter(t => DIAG[p - 1].domains.includes(t.dom)).map(t => t.id);
function build(mode, arg) {
  let qs = [];
  if (mode === 'daily') { const due = shuffle(dueReviews()).slice(0, 7).map(reviewQuestion); qs = due.concat(weightedTopics(15 - due.length).map(gen)); qs = shuffle(qs); }
  if (mode === 'topic') qs = Array.from({ length: 10 }, () => gen(arg));
  if (mode === 'qc') qs = Array.from({ length: 12 }, genQC);
  if (mode === 'diag') { const ts = diagTopics(arg); qs = shuffle(ts.concat(ts).map(gen)); }
  const T = MODES[mode].test;
  if (T) {
    const pool = TOPICS.filter(t => (!T.domains || T.domains.includes(t.dom)) && !(T.exclude || []).includes(t.id)).map(t => t.id), nQC = T.qc || 0;
    const rest = T.weighted ? weightedTopics(T.n - nQC, pool) : Array.from({ length: Math.ceil((T.n - nQC) / pool.length) }, () => shuffle(pool)).flat().slice(0, T.n - nQC);
    qs = shuffle(Array.from({ length: nQC }, genQC).concat(rest.map(gen)));
  }
  return { mode, arg, qs, i: 0, ans: [], start: Date.now(), qStart: Date.now(), secs: MODES[mode].secs };
}

// ---------- views
let SES = null, tick = null;
function stopTimer() { if (tick) { clearInterval(tick); tick = null; } if (window.NARR) NARR.stop(); }
function route() {
  stopTimer(); SES = null;
  const h = location.hash.slice(1);
  if (h === 'topics') return viewTopics();
  if (h === 'parent') return viewParent();
  if (h === 'learn') return viewLearn();
  if (h.startsWith('learn/')) return viewLesson(h.slice(6));
  return viewHome();
}
window.addEventListener('hashchange', route);
function go(h) { if (location.hash.slice(1) === h) route(); else location.hash = h; }

function viewHome() {
  const due = dueReviews().length, week = S.att.filter(a => a[3] >= addDays(-6)), wk = week.length, wkOk = week.filter(a => a[1]).length;
  const PARTS = DIAG.map((_, i) => i + 1), partsDone = PARTS.filter(p => S.diag.parts[p]).length;
  const diagCard = DIAG.length && partsDone < DIAG.length ? `
    <div class="card ruled diagc" style="padding:56px 16px 16px 54px;display:grid;gap:12px">
      <div class="top" style="position:absolute;top:12px;left:54px;right:14px;font:700 .78rem var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Start here</div>
      <h2>Diagnostic test</h2>
      <p class="muted">Two questions from every topic, no timer, no hints. It shows what you already know so practice can skip it. Do one part at a time.</p>
      <div class="parts">${PARTS.map(p => `<button class="part ${S.diag.parts[p] ? 'done' : ''}" data-diag="${p}"><b>Part ${p}</b><span>${esc(DIAG[p - 1].label)} · ${diagTopics(p).length * 2} Q</span><span>${S.diag.parts[p] ? '✓ Done' : 'Not started'}</span></button>`).join('')}</div>
    </div>` : '';
  $app.innerHTML = `
    <header class="row" style="justify-content:space-between;align-items:flex-end">
      <div><h1>${esc(C.title)}</h1><p class="muted">${esc(C.subtitle || '')}</p></div>
      ${EXAM ? `<p><span class="count">${daysLeft()} days</span> <span class="muted small">to ${esc(C.examLabel)}</span></p>` : ''}
    </header>
    ${diagCard}
    <div class="menu">
      <button class="card mcard hero" data-mode="daily"><span class="ic">★</span><h2>Today's practice</h2><span class="go">→</span><p>15 questions with hints${due ? ` · <b>${due} review${due > 1 ? 's' : ''} due</b>` : ''}. Focuses on your weak topics.</p></button>
      ${LESSON_IDS.length ? `<a class="card mcard" href="#learn"><span class="ic">▶</span><h2>Learn a new topic</h2><span class="go">→</span><p>Short lessons with a narrator for topics you haven't learned yet.</p></a>` : ''}
      ${C.qcTopics ? `<button class="card mcard" data-mode="qc"><span class="ic">A?B</span><h2>QC drill</h2><span class="go">→</span><p>12 Quantity A vs. B questions — a question type schools don't teach.</p></button>` : ''}
      <a class="card mcard" href="#topics"><span class="ic">≡</span><h2>Topics</h2><span class="go">→</span><p>Pick one of the 33 topics and practice just that.</p></a>
    </div>
    ${(C.tests || []).length ? `<div class="section-label">Test practice (timed, answers at the end)</div>
    <div class="menu">${C.tests.map(t => `<button class="card mcard" data-mode="${t.id}"><span class="ic">${esc(t.icon || '⏱')}</span><h2>${esc(t.title)}</h2><span class="go">→</span><p>${t.n} questions · ${t.mins} minutes${t.desc ? ' · ' + esc(t.desc) : ''}.</p></button>`).join('')}</div>` : ''}
    <p class="muted small">This week: ${wk} questions${wk ? `, ${Math.round(wkOk / wk * 100)}% correct` : ''}. &nbsp;<a href="#parent">Parent page</a></p>`;
  $app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => start(b.dataset.mode));
  $app.querySelectorAll('[data-diag]').forEach(b => b.onclick = () => start('diag', +b.dataset.diag));
}

function viewTopics() {
  let html = `<button class="back" onclick="go('')">← Home</button><header><h1>Topics</h1><p class="muted">Tap a topic for 10 questions with hints.</p></header>`;
  for (const d of DOM_IDS) {
    html += `<div class="section-label">${d} · ${DOMAINS[d]}</div><div class="dom">`;
    for (const t of TOPICS.filter(t => t.dom === d)) {
      const m = mastery(t.id), col = { good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)', none: 'var(--chip)' }[m.st];
      html += `<button class="trow" data-t="${t.id}"><span class="id">${t.id}</span><span><span class="nm">${esc(t.name)}</span>${LESSON_IDS.includes(t.id) ? '<span class="lbadge">lesson</span>' : ''}<div class="meter"><i style="width:${m.acc == null ? 0 : Math.max(6, m.acc * 100)}%;background:${col}"></i></div></span><span class="chip ${m.st}">${ST_LABEL[m.st]}</span></button>`;
    }
    html += `</div>`;
  }
  $app.innerHTML = html;
  $app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => start('topic', b.dataset.t));
}

function start(mode, arg) { SES = build(mode, arg); renderQ(); if (SES.secs) { tick = setInterval(updTimer, 500); } }
function elapsed() { return (Date.now() - SES.start) / 1000; }
function updTimer() {
  const el = document.getElementById('timer'); if (!SES || !el) return;
  if (SES.secs) { const left = SES.secs - elapsed(); el.textContent = fmtSec(left); el.classList.toggle('low', left < 120); if (left <= 0) { stopTimer(); finish(true); } }
  else el.textContent = fmtSec(elapsed());
}

function renderQ() {
  const s = SES, q = s.qs[s.i], M = MODES[s.mode], t = TOPIC[q.t];
  s.qStart = Date.now(); s.sel = null; s.answered = false;
  $app.innerHTML = `
    <div class="shead"><button class="back" id="quit">✕ Quit</button><span class="muted small">${esc(M.title)}${s.mode === 'diag' ? ` · Part ${s.arg}` : ''}</span><span class="timer" id="timer">${s.secs ? fmtSec(s.secs - elapsed()) : ''}</span></div>
    <div class="pbar"><i style="width:${s.i / s.qs.length * 100}%"></i></div>
    <div class="card ruled qcard ${q.qc ? 'qc' : ''}">
      <div class="top"><span>Question ${s.i + 1} of ${s.qs.length}</span><span>${q.rid ? 'Review · ' : ''}${M.feedback ? esc(t.name) : ''}</span></div>
      <div class="qtext">${q.q}</div>
      ${q.fig ? `<div>${q.fig}</div>` : ''}
      <div class="choices">${q.ch.map((c, i) => `<button class="choice" data-i="${i}"><span class="L">${LET[i]}</span><span>${c}</span></button>`).join('')}</div>
      <label class="guess"><input type="checkbox" id="guess"> I guessed</label>
      <div id="fb"></div>
      <div class="actions"><span></span><div class="row">${M.feedback ? '' : `<button class="btn" id="skip">Skip</button>`}<button class="btn primary" id="next" ${M.feedback ? 'hidden' : 'disabled'}>${s.i === s.qs.length - 1 ? 'Finish' : 'Next →'}</button></div></div>
    </div>`;
  document.getElementById('quit').onclick = () => { if (s.ans.length && !M.feedback && s.mode !== 'diag') finish(false); else go(''); };
  $app.querySelectorAll('.choice').forEach(b => b.onclick = () => choose(+b.dataset.i));
  document.getElementById('next').onclick = next;
  const sk = document.getElementById('skip'); if (sk) sk.onclick = () => { s.sel = null; record(null); advance(); };
  window.scrollTo(0, 0); updTimer(); if (!s.secs && !tick) tick = setInterval(updTimer, 1000);
}

function choose(i) {
  const s = SES, q = s.qs[s.i], M = MODES[s.mode]; if (s.answered) return;
  s.sel = i;
  $app.querySelectorAll('.choice').forEach(b => b.classList.toggle('sel', +b.dataset.i === i));
  if (!M.feedback) { document.getElementById('next').disabled = false; return; }
  s.answered = true; const ok = i === q.a;
  $app.querySelectorAll('.choice').forEach(b => { const j = +b.dataset.i; b.disabled = true; b.classList.remove('sel'); if (j === q.a) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
  record(i);
  const vid = VIDEOS[q.t];
  document.getElementById('fb').innerHTML = `<div class="fb ${ok ? 'ok' : 'no'}"><h3>${ok ? pick(['Correct!', 'Nice!', 'Yes!', 'Right on.']) : `Not quite — the answer is ${LET[q.a]}.`}</h3><div class="ex">${q.ex}</div>${!ok && vid ? `<a class="btn" href="${esc(vid)}" target="_blank" rel="noopener">▶ Watch the ${esc(TOPIC[q.t].name)} video</a>` : ''}${!ok && LESSON_IDS.includes(q.t) && s.mode !== 'lesson' ? `<a class="btn" href="#learn/${q.t}">▶ Lesson: ${esc(TOPIC[q.t].name)}</a>` : ''}${!ok ? `<p class="small muted">This one will come back for review.</p>` : ''}</div>`;
  const nx = document.getElementById('next'); nx.hidden = false; nx.focus({ preventScroll: true });
  document.getElementById('fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
const pick = a => a[Math.floor(Math.random() * a.length)];

function record(i) {
  const s = SES, q = s.qs[s.i], ok = i === q.a, guessed = document.getElementById('guess')?.checked ? 1 : 0, ms = Date.now() - s.qStart;
  s.ans[s.i] = { pick: i, ok, guessed, ms };
  S.att.push([q.t, ok ? 1 : 0, ms, dayStr(), s.mode, guessed]);
  if (S.att.length > 6000) S.att.splice(0, S.att.length - 6000);
  if (q.rid) updateReview(q, ok && !guessed);
  else if (!ok || guessed) addReview(q);
  if (!ok) { S.err.push({ q, pick: i, day: dayStr(), mode: s.mode }); if (S.err.length > 60) S.err.shift(); }
  save();
}
function next() { const s = SES, M = MODES[s.mode]; if (!M.feedback) { if (s.sel == null) return; record(s.sel); } advance(); }
function advance() { const s = SES; if (s.i < s.qs.length - 1) { s.i++; renderQ(); } else finish(false); }

function finish(timeUp) {
  const s = SES; stopTimer();
  // unanswered questions count as wrong in timed tests
  if (timeUp) for (let i = s.ans.length; i < s.qs.length; i++) { s.i = i; s.ans[i] = { pick: null, ok: false, guessed: 0, ms: 0, timeout: true }; S.att.push([s.qs[i].t, 0, 0, dayStr(), s.mode, 0]); }
  const done = s.ans.filter(Boolean), nOk = done.filter(a => a.ok).length, secs = elapsed();
  S.ses.push({ day: dayStr(), mode: s.mode, arg: s.arg, n: s.qs.length, done: done.length, ok: nOk, secs: Math.round(secs) });
  if (s.mode === 'diag') {
    S.diag.parts[s.arg] = dayStr();
    const fresh = {};
    s.qs.forEach((q, i) => { const a = s.ans[i]; if (!a) return; const r = fresh[q.t] || (fresh[q.t] = { c: 0, n: 0, g: 0 }); r.n++; if (a.ok) r.c++; if (a.ok && a.guessed) r.g++; });
    Object.assign(S.diag.res, fresh);
  }
  save();
  const byT = {}; s.qs.forEach((q, i) => { const a = s.ans[i]; if (!a) return; (byT[q.t] = byT[q.t] || { n: 0, ok: 0 }); byT[q.t].n++; if (a.ok) byT[q.t].ok++; });
  const missed = s.qs.map((q, i) => ({ q, a: s.ans[i] })).filter(x => x.a && !x.a.ok);
  let html = `<button class="back" onclick="go('')">← Home</button>
    <header><h1>${timeUp ? "Time's up!" : s.mode === 'diag' ? `Part ${s.arg} done!` : 'Nice work!'}</h1><p class="muted">${esc(MODES[s.mode].title)}</p></header>
    <div class="stats"><div class="stat"><b>${nOk} / ${s.qs.length}</b><span>correct</span></div><div class="stat"><b>${fmtSec(secs)}</b><span>time</span></div><div class="stat"><b>${done.length ? Math.round(secs / done.length) : 0}s</b><span>per question</span></div></div>`;
  if (s.mode === 'diag' || !MODES[s.mode].feedback) {
    html += `<div class="section-label">By topic</div><div class="tscroll"><table class="ptable"><tr><th>Topic</th><th class="n">Score</th></tr>${Object.keys(byT).sort().map(t => `<tr><td>${t} ${esc(TOPIC[t].name)}</td><td class="n"><span class="chip ${byT[t].ok === byT[t].n ? 'good' : byT[t].ok ? 'warn' : 'bad'}">${byT[t].ok}/${byT[t].n}</span></td></tr>`).join('')}</table></div>`;
  }
  if (!MODES[s.mode].feedback && missed.length) {
    html += `<div class="section-label">Go over these (${missed.length})</div>` + missed.map(({ q, a }) => missCard(q, a.pick)).join('');
  }
  if (s.mode === 'diag') { const left = DIAG.map((_, i) => i + 1).filter(p => !S.diag.parts[p]); html += left.length ? `<p class="note">Take a break, then do Part ${left[0]} when you're ready.</p>` : `<p class="note">Diagnostic finished! "Today's practice" will now focus on the topics marked <b>Learn</b> and <b>Shaky</b>.</p>`; }
  html += `<div class="row"><button class="btn primary" onclick="go('')">Done</button></div>`;
  $app.innerHTML = html; window.scrollTo(0, 0);
}
function missCard(q, p) {
  return `<div class="card miss"><span class="muted small">${q.t} · ${esc(TOPIC[q.t].name)}</span><div class="qtext">${q.q}</div>${q.fig || ''}
    <div class="ans"><span>Picked: <span class="chip bad">${p == null ? '—' : LET[p]}</span> ${p == null ? '' : q.ch[p]}</span><span>Answer: <span class="chip good">${LET[q.a]}</span> ${q.ch[q.a]}</span></div>
    <details><summary>How to solve it</summary><div class="ex">${q.ex}</div></details></div>`;
}

// ---------- parent page (in Chinese for Eric)
function viewParent() {
  const today = dayStr(), wkStart = addDays(-6), week = S.att.filter(a => a[3] >= wkStart), wkOk = week.filter(a => a[1]).length;
  const wkMin = Math.round(week.reduce((a, b) => a + b[2], 0) / 60000);
  let streak = 0; for (let i = 0; ; i++) { const d = addDays(-i); if (S.att.some(a => a[3] === d)) streak++; else if (i > 0) break; else continue; if (i > 400) break; }
  const days = Array.from({ length: 14 }, (_, i) => addDays(i - 13)), perDay = days.map(d => S.att.filter(a => a[3] === d).length), mx = Math.max(5, ...perDay);
  const tests = S.ses.filter(x => MODES[x.mode] && MODES[x.mode].test).slice(-8).reverse();
  let html = `<button class="back" onclick="go('')">← Home</button>
    <header><h1>家長頁</h1><p class="muted">${esc(C.title)} · 練習紀錄（存在這個瀏覽器裡）</p></header>
    <div class="stats">
      <div class="stat"><b>${daysLeft()}</b><span>天後考試（${esc(C.examLabel || '')}）</span></div>
      <div class="stat"><b>${week.length}</b><span>本週題數</span></div>
      <div class="stat"><b>${week.length ? Math.round(wkOk / week.length * 100) + '%' : '—'}</b><span>本週正確率</span></div>
      <div class="stat"><b>${wkMin}</b><span>本週分鐘</span></div>
      <div class="stat"><b>${streak}</b><span>連續練習天數</span></div>
      <div class="stat"><b>${dueReviews().length}</b><span>今天該複習的錯題</span></div>
    </div>
    <div class="section-label">最近 14 天每天題數</div>
    <div class="bars" style="margin-bottom:18px">${perDay.map((n, i) => `<div style="height:${n / mx * 100}%" title="${days[i]}: ${n}"><span>${days[i].slice(8)}</span></div>`).join('')}</div>`;
  html += `<div class="section-label">各主題掌握度（最近 8 題；沒練過的看診斷）</div><div class="tscroll"><table class="ptable"><tr><th>主題</th><th>診斷</th><th class="n">練習</th><th class="n">近期正確</th><th class="n">平均秒數</th><th>狀態</th></tr>`;
  for (const d of DOM_IDS) {
    html += `<tr class="dh"><td colspan="6">${d} · ${DOMAINS[d]}</td></tr>`;
    for (const t of TOPICS.filter(x => x.dom === d)) {
      const all = S.att.filter(a => a[0] === t.id), r = recent(t.id), m = mastery(t.id), dg = S.diag.res[t.id];
      const avg = r.length ? Math.round(r.reduce((a, b) => a + b[2], 0) / r.length / 1000) : null;
      html += `<tr><td>${t.id} ${esc(t.name)}</td><td>${dg ? `${dg.c}/${dg.n}${dg.g ? `<span class="muted small">（猜對${dg.g}）</span>` : ''}` : '—'}</td><td class="n">${all.length}</td><td class="n">${r.length ? Math.round(r.filter(x => x[1]).length / r.length * 100) + '%' : '—'}</td><td class="n">${avg ?? '—'}</td><td><span class="chip ${m.st}">${{ good: '已會', warn: '待加強', bad: '要教', none: '未練' }[m.st]}</span></td></tr>`;
    }
  }
  html += `</table></div>`;
  if (tests.length) html += `<div class="section-label">限時測驗紀錄</div><div class="tscroll"><table class="ptable"><tr><th>日期</th><th>類型</th><th class="n">分數</th><th class="n">時間</th></tr>${tests.map(x => `<tr><td>${x.day}</td><td>${esc(MODES[x.mode].title)}</td><td class="n">${x.ok}/${x.n}</td><td class="n">${fmtSec(x.secs)}</td></tr>`).join('')}</table></div>`;
  html += `<div class="section-label">互動課進度</div><div class="tscroll"><table class="ptable"><tr><th>課程</th><th>狀態</th><th class="n">檢查點</th></tr>${LESSON_IDS.map(id => { const l = (S.les || {})[id] || {}; return `<tr><td>${id} ${esc(TOPIC[id].name)}</td><td>${l.done ? `<span class="chip good">完成 ${l.done}</span>` : l.step ? `<span class="chip warn">上到第 ${l.step + 1} 步</span>` : '<span class="chip none">未開始</span>'}</td><td class="n">${l.best != null ? l.best + '/3' : '—'}</td></tr>`; }).join('')}</table></div>`;
  const errs = S.err.slice(-12).reverse();
  html += `<div class="section-label">最近錯題（挑一題請 Ryan 講給你聽）</div>` + (errs.length ? errs.map(e => missCard(e.q, e.pick).replace('<span class="muted small">', `<span class="muted small">${e.day} · `)).join('') : `<p class="muted">還沒有錯題。</p>`);
  html += `<div class="section-label">備份 / 換裝置</div>
    <div class="card" style="padding:14px;display:grid;gap:10px">
      <p class="small">紀錄只存在這台裝置的瀏覽器。要搬到另一台（例如你的手機想看進度），在這裡複製代碼，到另一台的家長頁貼上匯入。</p>
      <div class="row"><button class="btn" id="exp">複製進度代碼</button><span id="expmsg" class="muted small"></span></div>
      <textarea id="imp" placeholder="把另一台裝置複製的代碼貼在這裡"></textarea>
      <div class="row"><button class="btn" id="impb">匯入（會覆蓋這台的紀錄）</button><span id="impmsg" class="muted small"></span></div>
      <div class="row"><button class="btn" id="reset">清除所有紀錄</button><span id="resetmsg" class="muted small"></span></div>
    </div>`;
  $app.innerHTML = html;
  document.getElementById('exp').onclick = async () => { const code = btoa(unescape(encodeURIComponent(JSON.stringify(S)))); try { await navigator.clipboard.writeText(code); document.getElementById('expmsg').textContent = '已複製'; } catch (e) { document.getElementById('imp').value = code; document.getElementById('expmsg').textContent = '無法自動複製，代碼已放在下方框中，請手動複製'; } };
  document.getElementById('impb').onclick = () => { try { const o = JSON.parse(decodeURIComponent(escape(atob(document.getElementById('imp').value.trim())))); if (!o.v) throw 0; S = Object.assign(blank(), o); save(); document.getElementById('impmsg').textContent = '匯入成功'; setTimeout(viewParent, 600); } catch (e) { document.getElementById('impmsg').textContent = '代碼格式不對'; } };
  let armed = false; document.getElementById('reset').onclick = () => { if (!armed) { armed = true; document.getElementById('resetmsg').textContent = '確定的話再按一次'; return; } S = blank(); save(); viewParent(); };
}

document.addEventListener('keydown', e => {
  if (!SES || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toUpperCase(), i = ['1', '2', '3', '4'].indexOf(k) >= 0 ? +k - 1 : LET.indexOf(k);
  if (i >= 0 && i < 4) { choose(i); e.preventDefault(); }
  else if (e.key === 'Enter') { const nx = document.getElementById('next'); if (nx && !nx.hidden && !nx.disabled) { nx.click(); e.preventDefault(); } }
});

// ---------- narration: plays one clip per line; falls back to a reading-speed timer if audio is missing or blocked
const NARR = window.NARR = (() => {
  const au = new Audio(); let token = 0, timer = null, muted = false;
  try { muted = localStorage.getItem('math-muted') === '1'; } catch (e) {}
  function stop() { token++; au.pause(); clearTimeout(timer); }
  function play(lines, map, onLine, onDone) {
    stop(); const my = token; let i = 0;
    const nextLine = () => {
      if (my !== token) return;
      if (i >= lines.length) { if (onDone) onDone(); return; }
      const k = i++, text = lines[k]; let moved = false;
      const go = (ms) => { if (moved || my !== token) return; moved = true; timer = setTimeout(nextLine, ms); };
      if (onLine) onLine(k, text);
      const f = map && map[text], fallback = () => go(500 + text.split(/\s+/).length * 330);
      if (!f || muted) return fallback();
      au.src = CORE + 'lessons/' + f; au.onended = () => go(250); au.onerror = fallback;
      au.play().catch(fallback);
    };
    nextLine();
  }
  return { play, stop, get muted() { return muted; }, set muted(v) { muted = v; try { localStorage.setItem('math-muted', v ? '1' : '0'); } catch (e) {} if (v) au.pause(); } };
})();

// ---------- lessons
const LCACHE = {};
async function loadLesson(slug) {
  if (!LCACHE[slug]) {
    const d = await fetch(CORE + 'lessons/' + slug + '.json').then(r => r.json());
    const m = await fetch(CORE + 'lessons/' + slug + '.audio.json').then(r => r.json()).catch(() => ({}));
    LCACHE[slug] = { d, m };
  }
  return LCACHE[slug];
}
function lesState(tid) { S.les = S.les || {}; return (S.les[tid] = S.les[tid] || {}); }

function viewLearn() {
  let html = `<button class="back" onclick="go('')">← Home</button><header><h1>Lessons</h1><p class="muted">Each lesson takes about 10 minutes. Turn your sound on!</p></header><div class="menu">`;
  for (const id of LESSON_IDS) {
    const l = lesState(id), t = TOPIC[id];
    html += `<a class="card mcard" href="#learn/${id}"><span class="ic">${l.done ? '✓' : '▶'}</span><h2>${esc(t.name)}</h2><span class="go">→</span><p>Topic ${id} · ${l.done ? `finished ${l.done}` : l.step ? `continue at step ${l.step + 1}` : 'not started'}</p></a>`;
  }
  html += `</div><p class="muted small">More lessons are added for the topics you need most.</p>`;
  $app.innerHTML = html;
}

let L = null;
async function viewLesson(tid) {
  const slug = LESSONS[tid]; if (!slug) return go('learn');
  $app.innerHTML = '<p class="muted">Loading…</p>';
  let data; try { data = await loadLesson(slug); } catch (e) { $app.innerHTML = `<button class="back" onclick="go('learn')">← Lessons</button><p>Couldn't load this lesson. Check the internet connection and try again.</p>`; return; }
  const st = lesState(tid), resume = st.step && !st.done ? st.step : 0;
  L = { tid, d: data.d, m: data.m, i: 0 };
  $app.innerHTML = `<button class="back" onclick="go('learn')">← Lessons</button>
    <div class="card ruled lcard2"><div class="top"><span>Lesson · topic ${tid}</span><span>about ${L.d.minutes} min</span></div>
      <h2 class="lt">${esc(L.d.title)}</h2><p class="lnote">${esc(L.d.sub || '')}</p>
      <p class="tip">🔊 Turn your sound on. Tap <b>Next</b> when you're ready to move on — you can always go back.</p>
      <div class="row">${resume ? `<button class="btn primary" id="lcont">▶ Continue (step ${resume + 1})</button><button class="btn" id="lstart">Start over</button>` : `<button class="btn primary" id="lstart">▶ Start lesson</button>`}</div>
    </div>`;
  document.getElementById('lstart').onclick = () => { L.i = 0; renderStep(); };
  const c = document.getElementById('lcont'); if (c) c.onclick = () => { L.i = resume; renderStep(); };
}

function renderStep() {
  const d = L.d, s = d.steps[L.i], n = d.steps.length, st = lesState(L.tid);
  NARR.stop(); if (!st.done) { st.step = L.i; save(); }
  $app.innerHTML = `
    <div class="shead"><button class="back" id="lexit">✕ Exit</button><span class="muted small">${esc(d.title)}</span><button class="back" id="lmute" aria-label="Sound on or off">${NARR.muted ? '🔇' : '🔊'}</button></div>
    <div class="pbar"><i style="width:${L.i / n * 100}%"></i></div>
    <div class="card ruled lcard2"><div class="top"><span>Step ${L.i + 1} of ${n}</span><span>${esc(TOPIC[L.tid].name)}</span></div>
      <div id="lbody" style="display:grid;gap:16px"></div>
      <div class="cap" id="cap"></div>
      <div class="lctrl"><button class="btn" id="lreplay">↻ Replay</button><div class="row"><button class="btn" id="lprev" ${L.i ? '' : 'disabled'}>←</button><button class="btn primary" id="lnext" disabled>${L.i === n - 1 ? 'Finish ✓' : 'Next →'}</button></div></div>
    </div>`;
  document.getElementById('lexit').onclick = () => go('learn');
  document.getElementById('lmute').onclick = e => { NARR.muted = !NARR.muted; e.target.textContent = NARR.muted ? '🔇' : '🔊'; };
  document.getElementById('lprev').onclick = () => { L.i--; renderStep(); };
  document.getElementById('lnext').onclick = () => { if (L.i < n - 1) { L.i++; renderStep(); } else finishLesson(); };
  const body = document.getElementById('lbody');
  (STEP[s.kind] || STEP.talk)(s, body);
  window.scrollTo(0, 0);
}
const enableNext = () => { const b = document.getElementById('lnext'); if (b) { b.disabled = false; } };
// narrate lines; [data-seg=k] elements inside root appear when line k starts
function narrate(lines, root, done) {
  const segs = root ? [...root.querySelectorAll('[data-seg]')] : [];
  segs.forEach(e => e.classList.add('pre'));
  const cap = document.getElementById('cap');
  const rp = document.getElementById('lreplay'); if (rp) rp.onclick = () => narrate(lines, root, done);
  NARR.play(lines || [], L.m, (k, text) => { if (cap) cap.textContent = text; segs.forEach(e => { if (+e.dataset.seg <= k) e.classList.remove('pre'); }); },
    () => { segs.forEach(e => e.classList.remove('pre')); if (done) done(); });
}
const choiceBtns = (choices) => `<div class="choices">${choices.map((c, i) => `<button class="choice" data-i="${i}"><span class="L">${LET[i]}</span><span>${c}</span></button>`).join('')}</div>`;
function markChoices(box, pick, ans) {
  box.querySelectorAll('.choice').forEach(b => { const j = +b.dataset.i; b.disabled = true; if (ans == null) { if (j === pick) b.classList.add('sel'); } else if (j === ans) b.classList.add('right'); else if (j === pick) b.classList.add('wrong'); });
}
const fmtV = x => BANK._internal.N(Math.round(x * 10000) / 10000);

const STEP = {
  talk(s, body) { body.innerHTML = s.html || ''; narrate(s.say, body, enableNext); },
  choose(s, body) {
    body.innerHTML = (s.html || '') + choiceBtns(s.choices) + `<div id="lfb"></div>`;
    narrate(s.say, body);
    body.querySelectorAll('.choice').forEach(b => b.onclick = () => {
      const p = +b.dataset.i, ok = s.anyOk || p === s.answer;
      markChoices(body, p, s.anyOk ? null : s.answer);
      document.getElementById('lfb').innerHTML = `<div class="fb ${ok ? 'ok' : 'no'}"><div>${ok ? s.ok : s.no}</div></div>`;
      narrate([ok ? s.okSay : s.noSay].filter(Boolean), null, enableNext); enableNext();
    });
  },
  tryvals(s, body) {
    const fA = new Function('x', 'return ' + s.fA), fB = new Function('x', 'return ' + s.fB);
    body.innerHTML = `<div class="qcinfo big">${s.info}</div><div class="qcgrid big"><div><span>Quantity A</span><div>${s.A}</div></div><div><span>Quantity B</span><div>${s.B}</div></div></div>
      <p class="lq">Plug in a number:</p><div class="vals">${s.vals.map(([lab], i) => `<button data-v="${i}">${lab}</button>`).join('')}</div>
      <table class="ttab"><thead><tr><th>number</th><th>A = ${s.A}</th><th>B = ${s.B}</th><th>winner</th></tr></thead><tbody id="tb"></tbody></table><div id="tfound"></div>`;
    narrate(s.say, body);
    const wins = new Set(); let tried = 0, found = false;
    body.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      b.disabled = true; const [lab, x] = s.vals[+b.dataset.v], a = fA(x), bb = fB(x), w = Math.abs(a - bb) < 1e-9 ? 'Equal' : a > bb ? 'A' : 'B';
      wins.add(w); tried++;
      document.getElementById('tb').insertAdjacentHTML('beforeend', `<tr class="new"><td>${lab}</td><td>${fmtV(a)}</td><td>${fmtV(bb)}</td><td><b>${w}</b></td></tr>`);
      const box = document.getElementById('tfound');
      if (!found && (wins.size >= 2 || tried >= s.need)) { found = true; box.innerHTML = `<div class="found">${s.found}</div>`; narrate([s.foundSay], null, enableNext); }
      else if (!found) box.innerHTML = `<p class="muted small">${tried} tried · ${s.hint || 'Try another number.'}</p>`;
    });
  },
  steps(s, body) {
    body.innerHTML = (s.html || '') + `<div id="subs" style="display:grid;gap:12px"></div>`;
    const subs = body.querySelector('#subs');
    const show = j => {
      const st = s.steps[j], div = document.createElement('div'); div.className = 'sub';
      div.innerHTML = `<p class="lq">${j + 1}. ${st.ask}</p>` + choiceBtns(st.choices) + `<p class="show" hidden></p>`;
      subs.appendChild(div); div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      narrate([st.say].filter(Boolean), null);
      div.querySelectorAll('.choice').forEach(b => b.onclick = () => {
        const p = +b.dataset.i; markChoices(div, p, st.answer);
        const sh = div.querySelector('.show'); sh.hidden = false; sh.innerHTML = (p === st.answer ? '✓ ' : `Not quite. `) + st.show;
        narrate([p === st.answer ? 'Correct!' : 'Not quite. Read the explanation, then keep going.'], null);
        setTimeout(() => { if (j + 1 < s.steps.length) show(j + 1); else enableNext(); }, 1400);
      });
    };
    narrate(s.say, body, () => show(0));
  },
  practice(s, body) { quizStep(s, body, L.d.practice, false); },
  check(s, body) { quizStep(s, body, L.d.check, true); },
};
const skillTopic = sk => (TOPICS.find(t => t.skill === sk) || TOPIC[L.tid]).id;
function quizStep(s, body, skills, isCheck) {
  const qs = skills.map(sk => { const q = BANK.gen(sk); q.t = skillTopic(sk); return q; }); let i = 0, score = 0;
  const one = () => {
    const q = qs[i], t0 = Date.now();
    body.innerHTML = `<p class="muted small">${isCheck ? 'Checkpoint' : 'Practice'} ${i + 1} of ${qs.length}${isCheck ? ` · need ${Math.ceil(qs.length * 2 / 3)} right` : ''}</p>
      <div class="qtext ${q.qc ? 'qc' : ''}">${q.q}</div>${q.fig ? `<div>${q.fig}</div>` : ''}<div class="${q.qc ? 'qc' : ''}">${choiceBtns(q.ch)}</div><div id="lfb"></div><div id="lqn"></div>`;
    body.querySelectorAll('.choice').forEach(b => b.onclick = () => {
      const p = +b.dataset.i, ok = p === q.a; markChoices(body, p, q.a); if (ok) score++;
      S.att.push([q.t, ok ? 1 : 0, Date.now() - t0, dayStr(), 'lesson', 0]); if (!ok) { addReview(q); S.err.push({ q, pick: p, day: dayStr(), mode: 'lesson' }); if (S.err.length > 60) S.err.shift(); } save();
      document.getElementById('lfb').innerHTML = `<div class="fb ${ok ? 'ok' : 'no'}"><h3>${ok ? 'Correct!' : `Not quite — the answer is ${LET[q.a]}.`}</h3><div class="ex">${q.ex}</div></div>`;
      narrate([ok ? pick(['Correct!', 'Nice job!']) : 'Not quite. Read the explanation, then keep going.'], null);
      const last = i === qs.length - 1;
      document.getElementById('lqn').innerHTML = `<button class="btn primary">${last ? 'See result' : 'Next question →'}</button>`;
      document.querySelector('#lqn button').onclick = () => { if (!last) { i++; one(); } else end(); };
    });
  };
  const end = () => {
    if (!isCheck) { body.innerHTML = `<div class="found">Practice done: <b>${score} of ${qs.length}</b> right. Tap <b>Next</b> for the checkpoint.</div>`; enableNext(); return; }
    const st = lesState(L.tid), pass = score >= Math.ceil(qs.length * 2 / 3); st.best = Math.max(st.best || 0, score);
    if (pass) { st.done = st.done || dayStr(); save(); body.innerHTML = `<div class="found"><h3>Checkpoint passed: ${score} of ${qs.length} ✓</h3><p>Tap <b>Next</b> for the review.</p></div>`; narrate(['You passed the checkpoint! Great work.'], null); enableNext(); }
    else { save(); body.innerHTML = `<div class="fb no"><h3>${score} of ${qs.length} — almost!</h3><p>Use ← to look back at the lesson, or try new checkpoint questions.</p><div class="row"><button class="btn primary" id="again">Try the checkpoint again</button></div></div>`; narrate(["Almost! Let's look at what went wrong, then try the checkpoint again."], null); document.getElementById('again').onclick = () => quizStep(s, body, skills, true); }
  };
  narrate(s.say, null, null); one();
}
function finishLesson() {
  NARR.stop(); const tid = L.tid, st = lesState(tid); st.done = st.done || dayStr(); delete st.step; save();
  $app.innerHTML = `<button class="back" onclick="go('learn')">← Lessons</button>
    <header><h1>Lesson complete! 🎉</h1><p class="muted">${esc(L.d.title)}</p></header>
    <p>Now practice it so it sticks. It will also show up in Today's practice.</p>
    <div class="row"><button class="btn primary" id="pt">Practice ${esc(TOPIC[tid].name)}</button>${C.qcTopics && C.qcTopics.includes(tid) ? `<button class="btn" id="pq">QC drill</button>` : ''}<button class="btn" onclick="go('')">Home</button></div>`;
  document.getElementById('pt').onclick = () => start('topic', tid);
  const pq = document.getElementById('pq'); if (pq) pq.onclick = () => start('qc');
}

route();
