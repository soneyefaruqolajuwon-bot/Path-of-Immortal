"""Split one full-script voice take into per-line clips using forced alignment, then speed them up.

  python tools/align_vo.py take.mp3 [--tempo 1.2]

Writes vo/raw/NN.mp3 + vo/raw/timing.json (original speed) and vo/NN.mp3 + vo/timing.json (sped up).
Default tempo is 1.2x (house style: always speed the voice by 1.2x).
"""
import argparse, json, os, re, subprocess, sys
from pocketsphinx import Decoder

HERE = os.path.dirname(os.path.abspath(__file__))
VO = os.path.join(HERE, "..", "vo")
RAW = os.path.join(VO, "raw")
LINES = [   # Part 1 (paragraphs 01-09 of VOICEOVER.md)
    "Look closely at this tiny curve of water between Iran and Oman At its narrowest point it's only twenty one nautical miles wide and the shipping lanes inside it are just two miles across each",
    "Yet roughly one fifth of all the oil the world uses has to squeeze through this exact gap every single day",
    "It's called the Strait of Hormuz And for the past fifty years it has quietly been one of the most dangerous flashpoints on Earth a place where one miscalculation could crash the global economy overnight",
    "To understand why the world's biggest navies keep warships parked right outside this narrow bottleneck you just have to look at the map",
    "Zoom out for a second and look at the Persian Gulf It isn't an open sea it's a giant dead end cul de sac",
    "Surrounding that water are some of the biggest oil and gas producers on Earth Saudi Arabia Iraq Kuwait Qatar the United Arab Emirates and Iran Millions of barrels of crude oil are pumped out of the ground here every day",
    "The problem Most of it can't reach Europe Asia or America unless it sails out through one single exit door the Strait of Hormuz",
    "And here's where the map gets even more complicated Look at the southern tip of the strait That jagged peninsula jutting straight into the shipping lane isn't part of the UAE it's Musandam a separated exclave belonging to Oman",
    "That means two countries Iran on the north shore and Oman on the south literally hold the keys to the world's energy supply While Oman has historically played the neutral peacekeeper Iran controls the entire northern shore and a chain of islands overlooking the shipping lanes armed with coastal missiles fast attack boats and sea mines that could target passing tankers",
]
EXTRA = {"hormuz": "HH AO R M UW Z", "musandam": "M UW S AH N D AA M", "exclave": "EH K S K L EY V", "cul": "K AH L", "uae": "Y UW EY IY"}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("take"); ap.add_argument("--tempo", type=float, default=1.2)
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.take, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    total = len(pcm) / 32000
    d = Decoder(samprate=16000, loglevel="ERROR")
    words = [(i, w.strip("'").lower().replace("'", "")) for i, l in enumerate(LINES) for w in re.findall(r"[A-Za-z']+", l)]
    words = [(i, {"its": "it's", "theres": "there's", "cant": "can't", "couldnt": "couldn't", "isnt": "isn't", "heres": "here's", "worlds": "world's"}.get(w, w)) for i, w in words]
    for w, p in EXTRA.items():
        if d.lookup_word(w) is None:
            d.add_word(w, p, True)
    missing = {w for _, w in words if d.lookup_word(w) is None}
    if missing:
        sys.exit(f"not in dictionary: {missing}")
    d.set_align_text(" ".join(w for _, w in words))
    d.start_utt(); d.process_raw(pcm, full_utt=True); d.end_utt()
    segs = [(re.sub(r"\(\d+\)$", "", s.word), s.start_frame / 100, s.end_frame / 100)
            for s in d.seg() if s.word not in ("<s>", "</s>", "<sil>", "(NULL)")]
    assert len(segs) == len(words), (len(segs), len(words))
    rng = {}
    for (i, _), (_, s, e) in zip(words, segs):
        rng.setdefault(i, [s, e]); rng[i][1] = e
    timing_raw, timing_fast = {}, {}
    for i in sorted(rng):
        s, e = rng[i]
        lo = 0.0 if i == 0 else (rng[i - 1][1] + s) / 2
        hi = total if i == len(LINES) - 1 else (e + rng[i + 1][0]) / 2
        cs, ce = max(lo, s - 0.06), min(hi, e + 0.15)
        key = f"{i + 1:02d}"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{cs:.3f}", "-to", f"{ce:.3f}", "-i", a.take, "-af",
                        "afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse", "-c:a", "libmp3lame", "-b:a", "192k",
                        os.path.join(RAW, key + ".mp3")], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(RAW, key + ".mp3"), "-af", f"atempo={a.tempo}",
                        "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(VO, key + ".mp3")], check=True)
        ws = [[w, round(st - cs, 3), round(en - cs, 3)] for (j, _), (w, st, en) in zip(words, segs) if j == i]
        timing_raw[key] = ws
        timing_fast[key] = [[w, round(st / a.tempo, 3), round(en / a.tempo, 3)] for w, st, en in ws]
        print(key, f"{cs:6.2f}-{ce:6.2f}  raw {ce - cs:5.2f}s -> {(ce - cs) / a.tempo:5.2f}s  |", " ".join(w for w, *_ in ws[:6]), "…")
    json.dump(timing_raw, open(os.path.join(RAW, "timing.json"), "w"), indent=0)
    json.dump(timing_fast, open(os.path.join(VO, "timing.json"), "w"), indent=0)


if __name__ == "__main__":
    main()
