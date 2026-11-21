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
    'Pull up any standard map of the world and look closely at Greenland On almost every screen and classroom wall it looks roughly the same size as the entire continent of Africa',
    'In reality Africa is fourteen times larger than Greenland You could fit Greenland inside Algeria alone and still have room to spare',
    "And it isn't just Greenland Alaska looks bigger than Mexico Russia appears to swallow half the northern hemisphere Meanwhile massive regions near the equator like India Brazil and Indonesia look tiny by comparison even though they're drawn close to their true size",
    'So why does almost every map we use every single day get the size of the planet so dramatically wrong',
    'To answer that you have to go back to the sixteenth century when European ships were crossing vast open oceans on long voyages Back then sailors faced a brutal math problem the Earth is a three dimensional sphere but a paper navigation chart has to be flat',
    'Whenever mapmakers tried peeling a round globe onto a flat rectangle something had to break either the shapes of the coastlines warped beyond recognition or compass directions stopped lining up And out at sea a compass error meant missing an entire island and running out of food and fresh water',
    'In fifteen sixty nine a Flemish cartographer named Gerardus Mercator solved that exact problem He designed a map projection that kept every line of latitude and longitude meeting at crisp ninety degree angles',
    'That meant a sailor could take a ruler draw a straight line between two ports across an ocean and follow one steady compass bearing the entire way there',
    "There was just one catch To keep those compass lines straight on a flat sheet of paper Mercator had to stretch the map horizontally as you moved away from the equator and then stretch it vertically by the exact same amount so coastlines wouldn't look squished",
    'Near the equator almost nothing changes Countries like Kenya Colombia and Indonesia appear close to their true scale But the closer you get to the North and South Poles the more extreme that stretching becomes ballooning Canada Scandinavia and Antarctica into giants while turning Greenland into an optical illusion',
    'Mercator never intended for his chart to be used to compare the size of countries it was strictly a navigation tool for sailors Yet because it looked clean rectangular and fit neatly onto walls and textbook pages the world slowly adopted it as the default picture of Earth',
    "Which raises an obvious question now that hardly anyone navigates across oceans with paper charts and brass compasses why do Google Maps Apple Maps and almost every app on your phone still use a version of Mercator's grid when you zoom in",
    "Zoom all the way into your own neighborhood on a digital map and the reason becomes instantly clear Because Mercator preserves right angles city blocks stay square street intersections look true to life and roundabouts don't warp into stretched out ovals",
    'When you are driving down a street knowing whether a turn is ninety degrees matters far more than whether Greenland looks bigger than Africa from space',
    'Still the side effect is that billions of people grow up carrying a distorted mental picture of the planet subconsciously assuming countries near the poles are vast superpowers while nations along the equator are small',
    'The next time you open a map on your phone try dragging a northern country down toward the equator in your head and watch how quickly the real world snaps back into proportion',
]
EXTRA = {"mercator": "M ER K EY T ER", "mercators": "M ER K EY T ER Z", "gerardus": "JH EH R AA R D AH S", "flemish": "F L EH M IH SH", "theyre": "DH EH R", "cartographer": "K AA R T AA G R AH F ER", "compasses": "K AH M P AH S AH Z", "mapmakers": "M AE P M EY K ER Z", "ovals": "OW V AH L Z", "roundabouts": "R AW N D AH B AW T S", "squished": "S K W IH SH T"}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("take"); ap.add_argument("--tempo", type=float, default=1.2)
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.take, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    total = len(pcm) / 32000
    d = Decoder(samprate=16000, loglevel="ERROR")
    words = [(i, w.strip("'").lower().replace("'", "")) for i, l in enumerate(LINES) for w in re.findall(r"[A-Za-z']+", l)]
    words = [(i, {"its": "it's", "theres": "there's", "cant": "can't", "couldnt": "couldn't", "youll": "you'll", "rivers": "river's"}.get(w, w)) for i, w in words]
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
