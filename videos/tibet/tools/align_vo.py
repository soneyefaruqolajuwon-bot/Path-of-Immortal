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
LINES = [
    "Open any live flight tracking map on your phone right now and look at the skies over Europe and Asia You'll see thousands of passenger jets criss crossing the planet in dense glowing highways Yet right in the middle of Asia sits a massive eerie blank spot where almost no commercial airliners ever go",
    "That empty hole in the sky is the Tibetan Plateau a towering region ringed by the Himalayas often called the Roof of the World Flying straight across it would be shorter for many routes between Europe India and East Asia yet international airlines deliberately detour around it every single day",
    "And the main reason isn't mainly politics or secret military bases It comes down to simple unforgiving physics and human survival",
    "Airliners normally cruise high above the weather where the outside air is far too thin to breathe Inside the cabin pressurized air keeps everyone comfortable But if a window cracks or a pressurization system fails the pilots must start an emergency descent immediately",
    "Safety rules require the crew to get the plane down to breathable air before the oxygen masks above your seat run out On almost any normal flight that's plenty of time to drop to safe air",
    "Over Tibet that safety math falls apart While most land sits near sea level the Tibetan Plateau averages higher than the tallest mountain in the lower forty eight United States And the Himalayas along its edge tower far higher still",
    "If a plane loses cabin pressure up there the pilots can't dive down to safe air without flying straight into solid rock Passengers could run out of oxygen long before the jet clears the mountains and reaches lower ground",
    "And even if the cabin holds perfectly the mountains create a second invisible danger extreme turbulence When fast jet streams slam into that wall of peaks they set off violent waves of air that can toss even a heavy wide body jet up and down by hundreds of feet in seconds",
    "The air above the plateau can also get brutally cold Jet fuel thickens as it chills so crews on these routes have to watch fuel temperature closely and sometimes change altitude or route just to keep it flowing",
    "Then comes the final problem if anything goes wrong an engine fire a medical emergency a warning light in the cockpit there's almost nowhere to land Big airliners need long runways and thick air to land and stop safely Across Tibet the few airports sit at extreme altitude and suitable diversion airports can be very far away",
    "Now you might spot a handful of domestic flights heading into cities like Lhasa But those aren't ordinary flights They use specially equipped aircraft extra oxygen special engine and performance settings flown by pilots trained for high altitude mountain approaches",
    "For every other long haul flight connecting Asia with the rest of the world burning a little extra fuel to fly around the plateau is a small price to pay",
    "So the next time you check a flight map and see planes curving around an invisible wall in central Asia remember they aren't avoiding a border on the ground They're respecting the tallest ceiling on Earth",
]
EXTRA = {"tibetan": "T IH B EH T AH N", "tibet": "T IH B EH T", "himalayas": "HH IH M AH L EY AH Z", "lhasa": "L AA S AH", "airliners": "EH R L AY N ER Z", "pressurization": "P R EH SH ER AH Z EY SH AH N", "pressurized": "P R EH SH ER AY Z D", "breathable": "B R IY DH AH B AH L"}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("take"); ap.add_argument("--tempo", type=float, default=1.2)
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.take, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    total = len(pcm) / 32000
    d = Decoder(samprate=16000, loglevel="ERROR")
    words = [(i, w.strip("'").lower()) for i, l in enumerate(LINES) for w in re.findall(r"[A-Za-z']+", l)]
    words = [(i, w if d.lookup_word(w) is not None else w.replace("'", "")) for i, w in words]
    words = [(i, w) for i, w in words]
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
