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
    "Pull up a political map of Africa and trace the borders with your finger Unlike the jagged coastlines and river shaped frontiers you see across much of Europe or Asia dozens of African borders look like they were drawn with a wooden ruler and a sharp pencil",
    "Razor straight lines slice through the Sahara cut diagonally across grasslands and split ancient communities straight down the middle Nature never draws straight lines so why does the map of Africa look like a geometry textbook",
    "To understand those lines you have to travel back to the late nineteenth century when European empires plunged into a frantic race known as the Scramble for Africa",
    "For centuries European powers had mostly stayed along the African coast trading at port cities Then steamships quinine medicine and rapid fire weapons opened up the interior and Britain France Germany Belgium Portugal Spain and Italy all rushed in at once each trying to grab territory before its rivals could",
    "To stop that rivalry from spiralling into a war between the European powers themselves Germany's chancellor Otto von Bismarck hosted a conference in Berlin with representatives from fourteen countries",
    "Not a single African leader king or representative was invited into the room And contrary to popular myth the diplomats in Berlin didn't sit around a giant table carving up the whole continent with a ruler in one afternoon",
    "Instead they wrote the rulebook for how Europe could claim land No power could simply plant a flag on the coast and call a whole region its own anymore To keep a territory it had to prove effective occupation treaties with local rulers a working administration and formal notice to its rivals",
    "Over the next twenty years European diplomats signed hundreds of border treaties in offices across London Paris and Berlin using incomplete maps of rivers mountains and kingdoms they had never seen in person",
    "Whenever negotiators hit a blank spot on the map where nobody knew what lay beyond the horizon they took the easiest shortcut possible They simply connected two points using lines of latitude and longitude",
    "That's why Egypt and Sudan are split by a ruler straight line across the desert and why countries like Mali Mauritania and Namibia ended up with sharp geometric corners and skinny corridors reaching toward distant rivers",
    "When those lines hit the ground they paid zero attention to the people living there splitting shared languages trade networks and families between rival empires overnight",
    "Decades later when African nations won their independence their new leaders faced an agonizing choice Most knew those colonial borders were arbitrary and flawed yet redrawing even one of them threatened to set off conflicts over every neighbouring line on the continent",
    "So a year after founding the Organization of African Unity nearly every member made a historic pragmatic pledge respect the borders inherited at independence no matter how artificial they looked on paper",
    "That choice helped prevent many border wars though not all of them and it froze those nineteenth century lines onto the modern map",
    "So the next time you see a razor straight frontier cutting across the Sahara remember you're not looking at a natural boundary You're looking at the fingerprint of diplomats who mapped a continent they had never walked",
]
EXTRA = {"quinine": "K W AY N AY N", "bismarck": "B IH Z M AA R K", "otto": "AA T OW", "mauritania": "M AO R IH T EY N IY AH", "namibia": "N AH M IH B IY AH", "spiralling": "S P AY R AH L IH NG", "neighbouring": "N EY B ER IH NG", "geometry": "JH IY AA M AH T R IY", "agonizing": "AE G AH N AY Z IH NG", "steamships": "S T IY M SH IH P S"}


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
