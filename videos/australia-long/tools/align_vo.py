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
    "From space at night Australia looks like a ring of light around a dark hole Almost everyone lives on a thin ribbon of coast while the middle of the driest inhabited continent on Earth stays pitch black So today let's find out why It comes down to three things",
    "First location Much of Australia sits under a belt of high pressure that circles the Earth about a third of the way from the equator to the South Pole Under that belt dry air sinks warms and pushes rain clouds away It's the same kind of belt that creates the Sahara in the north",
    "Second geology Unlike continents with young towering mountain chains feeding massive river systems Australia sits on ancient worn down rock that has stayed remarkably flat for hundreds of millions of years With no snow capped peaks in the middle to catch moisture from passing clouds there are no giant rivers flowing through the heart of the continent",
    "Australia's biggest river system the Murray Darling carries only a tiny fraction of the water the Mississippi does And the country's biggest lake Kati Thanda Lake Eyre is usually just a crust of dry salt it has filled completely only a handful of times since Europeans arrived",
    "And third Australia's main mountain chain the Great Dividing Range runs along the eastern edge of the continent mostly within a few hundred kilometres of the Pacific",
    "When moist winds blow in off the Pacific they hit those mountains rise into cooler air and drop much of their rain on the coastal strip where Brisbane and Sydney sit today By the time that air spills over into the interior it's far far drier",
    "Melbourne Adelaide and Perth get their rain a different way from winter storms rolling in off the Southern Ocean But those storms mostly soak the coast too and fade long before they reach the middle",
    "It's like tipping a pitcher of water over the edge of an upside down dinner plate the rim gets soaked and the middle stays bone dry",
    "Now beneath parts of that dry interior sits a colossal underground reservoir the Great Artesian Basin one of the largest on Earth It keeps remote cattle stations and outback towns alive But much of its water comes up hot and loaded with minerals it's poorly suited to irrigating crops and it refills incredibly slowly Some of that water fell as rain more than a million years ago",
    "On top of that the soils across central Australia are among the oldest and most worn out on the planet stripped of nutrients by millions of years of weathering with no fresh volcanic ash to renew them",
    "For tens of thousands of years Indigenous Australians lived across these arid lands through deep knowledge of country seasonal travel and precious waterholes",
    "When European settlers arrived with crops and livestock built for wetter richer land they did push sheep and cattle stations deep inland but farming beyond the rain kept failing In South Australia a surveyor named George Goyder even drew a line on the map marking where reliable rain ended and when farmers planted wheat beyond it during a run of wet years the droughts that followed wiped them out",
    "So the big towns and cities stayed anchored to the rainy coast and its ports",
    "Inland towns do exist Kalgoorlie is a booming gold mining city and it drinks water pumped through a pipeline more than five hundred kilometres long from the hills near Perth Alice Springs right in the red centre runs on ancient groundwater with most of its food and fuel trucked in across huge distances Building a mega city out there would mean hauling in almost everything",
    "Even the tropical north which gets drenched every wet season stays sparsely populated because the rain comes all at once followed by months of dry heat",
    "So the next time you see Australia's population hugging the shoreline like people standing around the edge of a hot frying pan remember they aren't just chasing beach weather They're living in the part of the continent where the rain falls reliably",
]
EXTRA = {"australias": "AO S T R EY L Y AH Z", "kati": "K AA T IY", "thanda": "T AA N D AH", "eyre": "EH R", "murray": "M ER IY", "darling": "D AA R L IH NG", "artesian": "AA R T IY ZH AH N", "goyder": "G OY D ER", "kalgoorlie": "K AE L G UH R L IY", "centre": "S EH N T ER", "kilometres": "K IH L AA M AH T ER Z", "mississippi": "M IH S IH S IH P IY", "indigenous": "IH N D IH JH AH N AH S", "waterholes": "W AO T ER HH OW L Z", "megacity": "M EH G AH S IH T IY", "irrigating": "IH R AH G EY T IH NG"}


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
