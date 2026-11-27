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
    "The Pan American Highway runs from the frozen top of Alaska to the icy tip of Argentina Nineteen thousand miles the longest drivable road on Earth Except for one gap Sixty miles of jungle between Panama and Colombia where the road just stops It's called the Darien Gap And for more than three hundred years this jungle has been beating everyone who tried to tame it",
    "In sixteen ninety eight five ships sailed from Scotland to this exact coast Thousands of Scots had poured their savings into a bold plan build a trading colony here between two oceans It was a disaster Fever hunger and the jungle itself wiped out most of the colonists And the money lost was so huge it's often called one of the reasons Scotland gave up its independence and joined England in seventeen oh seven The deal even promised to pay the investors back So in a way this jungle helped create the United Kingdom",
    "Two centuries later people finally won a round In nineteen fourteen engineers opened the Panama Canal slicing through solid rock and jungle about a hundred and fifty miles away So by the nineteen seventies sixty miles of road should have been easy",
    "Until you see what's actually in there The Darien is rainforest swamps and steep mountains soaked by some of the heaviest rain in the Americas In the wet season the ground turns to bottomless mud and the rivers shift their banks every single year",
    "In nineteen seventy two a British Army expedition tried to drive two Range Rovers straight through it Soldiers hacked a path ahead of the cars with machetes They built bridges floated the cars across rivers on rafts and the Range Rovers kept breaking It took them about a hundred days to cross",
    "But at the same time a real road was finally on its way In nineteen seventy one the United States and Panama made a deal to close the gap The US agreed to pay about two thirds of the cost and the bulldozers rolled in",
    "Three years later an American court stopped everything",
    "Environmental groups had sued And one of the biggest worries wasn't about trees at all It was about cows South America was fighting foot and mouth disease a virus so contagious it can wipe out entire herds North and Central America were completely free of it And the only thing standing between them was that jungle",
    "Building a road through it would've been like drilling a hole through a submarine hull just to save yourself a short walk to the next room",
    "With American farmers facing a possible disaster the project stalled The bulldozers went quiet And they never came back",
    "But the cows weren't the only ones who didn't want that road The Embera Wounaan and Guna peoples have lived in these forests for centuries and they'd seen what roads do In the Amazon a new highway brings illegal logging land grabs and deforestation almost overnight So they fought to keep it out Today much of the Panamanian side is Darien National Park a UNESCO World Heritage Site and one of the most biodiverse places on Earth",
    "And then the gap found a new purpose that nobody planned With no roads and no police the jungle became one of the most dangerous migration routes in the world In twenty twenty three alone more than half a million people crossed it on foot through rivers mud and armed gangs Which made governments even less eager to open it",
    "So if you try to drive from Alaska to Argentina today your road trip ends in a quiet little town called Yaviza in Panama In twenty fourteen someone finally launched a car ferry around the jungle It lasted a few months So today you put your car on a cargo ship and the jungle wins again",
    "Which leaves a real question After three hundred years should Panama and Colombia finally build those last sixty miles or should the Darien Gap stay closed forever",
]
EXTRA = {"its": "IH T S", "whats": "W AH T S", "wasnt": "W AA Z AH N T", "werent": "W ER N T", "didnt": "D IH D AH N T", "theyd": "DH EY D", "wouldve": "W UH D AH V", "darien": "D EH R IY EH N", "yaviza": "Y AH V IY Z AH", "machetes": "M AH SH EH T IY Z", "rovers": "R OW V ER Z", "embera": "EH M B ER AH", "wounaan": "W UW N AA N", "guna": "G UW N AH", "panamanian": "P AE N AH M EY N IY AH N", "unesco": "Y UW N EH S K OW", "biodiverse": "B AY OW D AY V ER S", "scots": "S K AA T S"}


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
