"""Generate narration for a math lesson (math/lessons/<id>.json).

Usage:  python3 tools/build_lesson.py math/lessons/6.1.json
Needs:  pip install kokoro-onnx soundfile ; ffmpeg on PATH
Every narration line becomes one mp3 named by a hash of its text, and math/lessons/<id>.audio.json maps
text -> file. Edit a line and rerun: only changed lines are re-recorded; unused clips are deleted.
"""
import hashlib, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_list import say  # same voice (Kokoro af_heart) as the vocab site

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# shared feedback lines used by the lesson player
COMMON = ["Correct!", "Nice job!", "Not quite. Read the explanation, then keep going.",
          "You passed the checkpoint! Great work.", "Almost! Let's look at what went wrong, then try the checkpoint again."]
# spellings that help the voice say things right (screen text is untouched)
SPOKEN = [(r"\bISEE\b", "I S E E"), (r"\bQuantity A is\b", "Quantity A, is")]

def spoken(t):
    for a, b in SPOKEN: t = re.sub(a, b, t)
    return t

def lines(lesson):
    out = list(COMMON)
    for s in lesson["steps"]:
        out += s.get("say", [])
        for k in ("okSay", "noSay", "foundSay"):
            if s.get(k): out.append(s[k])
        for st in s.get("steps", []):
            if st.get("say"): out.append(st["say"])
    return list(dict.fromkeys(out))

def main(path):
    path = os.path.abspath(path); lesson = json.load(open(path))
    adir = os.path.join(os.path.dirname(path), lesson["id"]); os.makedirs(adir, exist_ok=True)
    m = {}
    for t in lines(lesson):
        h = hashlib.sha1(spoken(t).encode()).hexdigest()[:12]
        say(os.path.join(adir, h + ".mp3"), spoken(t))
        m[t] = f"{lesson['id']}/{h}.mp3"
    keep = {os.path.basename(f) for f in m.values()}
    for f in os.listdir(adir):
        if f.endswith(".mp3") and f not in keep: os.remove(os.path.join(adir, f)); print("  -", f)
    json.dump(m, open(path.replace(".json", ".audio.json"), "w"), indent=0, ensure_ascii=False)
    print(len(m), "clips for lesson", lesson["id"])

if __name__ == "__main__":
    main(sys.argv[1])
