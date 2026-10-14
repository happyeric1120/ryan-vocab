"""Generate narration audio for a vocab list and register it on the home page.

Usage:  python3 tools/build_list.py lists/2026-10-15
Needs:  pip install kokoro-onnx soundfile ; ffmpeg on PATH
Only missing clips are generated, so re-running is cheap.
"""
import json, os, re, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.expanduser("~/.cache/kokoro")
REL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
VOICE, SPEED = "af_heart", 0.92

def slug(w): return re.sub(r"[^a-z0-9]+", "-", w.lower()).strip("-")
def clean(t): return t.replace("{", "").replace("}", "").replace(" / ", " or ")

def engine():
    os.makedirs(CACHE, exist_ok=True)
    for f in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
        p = os.path.join(CACHE, f)
        if not os.path.exists(p):
            print("downloading", f); urllib.request.urlretrieve(REL + f, p)
    from kokoro_onnx import Kokoro
    return Kokoro(os.path.join(CACHE, "kokoro-v1.0.onnx"), os.path.join(CACHE, "voices-v1.0.bin"))

_k = None
def say(path, text):
    global _k
    if os.path.exists(path): return
    import soundfile as sf
    _k = _k or engine()
    s, sr = _k.create(text, voice=VOICE, speed=SPEED, lang="en-us")
    tmp = path + ".wav"; sf.write(tmp, s, sr)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-ac", "1", "-b:a", "56k", path], check=True)
    os.remove(tmp); print("  +", os.path.relpath(path, ROOT))

def main(d):
    d = os.path.abspath(d); data = json.load(open(os.path.join(d, "words.json")))
    a = os.path.join(d, "audio"); os.makedirs(a, exist_ok=True)
    main_n = sum(1 for w in data["words"] if not w.get("extra"))
    say(os.path.join(a, "intro.mp3"), f"Welcome to {data['title']}! Let's learn these {main_n} words. Listen carefully, and say each word out loud with me.")
    for w in data["words"]:
        s = slug(w["word"])
        say(os.path.join(a, f"{s}_0.mp3"), f"{w['word']}. ... {w['word']}. {clean(w['pos'])}.")
        say(os.path.join(a, f"{s}_1.mp3"), f"It means: {w['def']}.")
        say(os.path.join(a, f"{s}_2.mp3"), f"Memory trick: {w['tip']}")
        say(os.path.join(a, f"{s}_3.mp3"), f"Example: {clean(w['ex'])}")
    shared = os.path.join(ROOT, "audio"); os.makedirs(shared, exist_ok=True)
    say(os.path.join(shared, "outro.mp3"), "Great job! Now try the flashcards, and then take the practice quiz.")
    say(os.path.join(shared, "intro-all.mp3"), "Welcome to the big review! These words come from all of your vocabulary lists. Listen carefully, and say each word out loud with me.")
    # register on the home page
    ip = os.path.join(ROOT, "lists", "index.json"); idx = json.load(open(ip)) if os.path.exists(ip) else []
    entry = {k: data.get(k) for k in ("id", "title", "quiz", "class")}
    entry["count"] = main_n; entry["extra"] = len(data["words"]) - main_n
    idx = [e for e in idx if e["id"] != data["id"]] + [entry]
    idx.sort(key=lambda e: e["id"], reverse=True)
    json.dump(idx, open(ip, "w"), indent=1)
    print("registered", data["id"])

if __name__ == "__main__":
    main(sys.argv[1])
