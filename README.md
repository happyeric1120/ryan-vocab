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
