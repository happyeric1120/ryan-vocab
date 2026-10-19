# Ryan's Vocab site

Static GitHub Pages site (https://happyeric1120.github.io/ryan-vocab/) for Ryan's school vocabulary lists.
`index.html` is the whole app: home page lists every list by quiz date; `#<list-id>` opens one list; `#all` mixes every list.

## Adding a new list
1. Create `lists/<quiz-date YYYY-MM-DD>/words.json` (copy the shape of `lists/2026-10-15/words.json`):
   `id` (= folder name), `title` (e.g. "Vocabulary List #2"), `quiz` (YYYY-MM-DD), `class`, optional `extraNote`,
   and `words`: [{word, pos, def, tip, ex, extra?}]. `def` copies the teacher's definition exactly.
   `tip` is a short kid-friendly memory trick; `ex` is an example sentence with the word wrapped in {braces}.
   `extra: true` marks optional / removed / "just in case" words.
2. `pip install --break-system-packages kokoro-onnx soundfile` then `python3 tools/build_list.py lists/<id>`
   (generates natural-voice mp3 narration, only for missing clips, and registers the list in `lists/index.json`).
3. Commit and push to `main`. Pages redeploys in ~1 minute.

Do not edit audio by hand; delete a clip and rerun the build script to re-record it.

## Math (`math-core/` + one folder per course)
Built for future courses: one shared engine, one small config per course.
- `math-core/bank.js` — question generators keyed by **skill id** (e.g. `order-of-operations`). Answers are computed, never typed.
  Each generator returns `{q, ch[4], a, ex, fig?, qc?}`; use `mc()` for numeric/fraction choices and `mcs()` for string choices.
- `math-core/app.js` + `app.css` — the practice app (diagnostic, daily practice with spaced review, topic practice, QC drill,
  timed tests, narrated lessons, parent page `#parent`). It reads everything course-specific from `window.COURSE`.
- `math-core/lessons/<skill>.json` — narrated interactive lessons (step kinds: talk, choose, tryvals, steps, practice, check).
  Lines in `say` become audio; `[data-seg=k]` elements in `html` appear when line k starts.
  Record narration: `python3 tools/build_lesson.py math-core/lessons/<skill>.json` (Kokoro, same voice as vocab; re-records only changed lines).
- `hunter-math/` — Hunter entrance exam (ISEE Middle Level) course: `course.js` lists topics (knowledge-map ids 1.1–6.4 → skill ids),
  exam date, diagnostic parts, timed tests, lessons and videos. Progress key `isee-math-v1` — never change it.
- `math/` only redirects old links to `hunter-math/`.

New course: copy `hunter-math/`, edit `course.js` (new `id`, `title`, `storageKey`, topics/tests), add a card on the home page.
New lesson: write `math-core/lessons/<skill>.json`, run the build script, then add `'<topic id>': '<skill>'` to the course's `lessons`.
After changing `bank.js`, stress-test every generator (4 distinct choices, valid answer index, no NaN/undefined) before pushing.
