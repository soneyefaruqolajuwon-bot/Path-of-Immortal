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
    "The whole southern half of the planet has fewer people than India Mostly that's because the land is in the north About sixty eight percent of it But early farmers ran into something stranger Wheat from the Middle East spread all the way to China while corn took thousands of years just to get from Mexico to what's now the United States So what was slowing the Americas down",
    "Go back about eleven thousand years to the Fertile Crescent the arc of land around today's Iraq Syria and Turkey People there were among the first on Earth to farm They tamed wheat barley lentils peas and flax and soon after sheep goats pigs and cattle",
    "And those crops didn't stay put Farming spread west reaching Greece about nine thousand years ago and Britain about six thousand years ago It spread east too across Persia and into India By around four and a half thousand years ago wheat was growing in China",
    "And it worked in both directions Horses tamed on the grasslands of Central Asia galloped west into Europe and east into China Chickens came from Southeast Asia Peaches started in China and travelled so far west that Europeans thought they came from Persia which is how they got their scientific name",
    "So why did everything travel so easily The secret is the shape of Eurasia It's a giant landmass that stretches sideways from Portugal all the way to Japan roughly along the same latitudes And places on the same latitude share similar seasons similar day lengths and similar weather A crop that grows well in one spot will usually grow well thousands of miles east or west",
    "It's like moving to a new house on the same street Same weather same sunlight your plants don't even notice",
    "Now look at the Americas They stretch up and down from the Arctic almost to Antarctica Every few hundred miles the seasons change the day length changes and the climate changes Deserts rainforests mountains",
    "Corn was first grown in southern Mexico about nine thousand years ago It took more than four thousand years to reach the American Southwest just across the desert And it had to slowly change generation after generation to cope with the shorter summers",
    "Meanwhile in the Andes people tamed llamas and grew potatoes Neither ever reached Mexico before Europeans arrived Two great farming worlds on the same continent that never shared their best ideas",
    "Africa had the same problem Wheat and barley from the Mediterranean grew well in the cool highlands of Ethiopia but they struggled in the hot wet tropics And when farmers from West Africa spread south over thousands of years carrying crops like sorghum and millet they stopped near the southern tip Not because of mountains or armies but because their summer rain crops couldn't grow in the Cape's winter rain climate",
    "Meanwhile the north got one more gift wide fertile river valleys in mild climates The Tigris and Euphrates The Nile The Indus The Yellow River The world's first cities its first writing and its first empires all grew up along those rivers every one of them north of the equator",
    "More land crops that could travel and rivers to feed them For thousands of years Asia and Europe kept growing By around eighteen hundred the world reached its first billion people and most of them lived in Asia and Europe",
    "That head start never went away Today the north is home to almost nine out of every ten people on Earth",
    "So the next time you spin a globe and see almost everyone crowded near the top remember Humanity didn't pick the north The continents dealt the cards long before anyone sat down to play",
]
EXTRA = {"its": "IH T S", "thats": "DH AE T S", "whats": "W AH T S", "todays": "T AH D EY Z", "didnt": "D IH D AH N T", "dont": "D OW N T", "couldnt": "K UH D AH N T", "capes": "K EY P S", "worlds": "W ER L D Z", "eurasia": "Y UH R EY ZH AH", "persia": "P ER ZH AH", "sorghum": "S AO R G AH M", "euphrates": "Y UW F R EY T IY Z", "tigris": "T AY G R IH S", "indus": "IH N D AH S", "andes": "AE N D IY Z", "llamas": "L AA M AH Z", "ethiopia": "IY TH IY OW P IY AH", "travelled": "T R AE V AH L D", "lentils": "L EH N T AH L Z", "rainforests": "R EY N F AO R AH S T S"}


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
