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
    "Sydney and Melbourne both wanted to be Australia's capital so badly that the country built a brand new city instead But in nineteen oh one that city didn't exist yet Not one street Not one building So where did the brand new government actually go",
    "To Melbourne The constitution let Parliament meet there until a real capital was ready And to make room Victoria's own parliament had to pack up and move out into a giant exhibition hall down the road They thought it would be temporary It lasted twenty six years",
    "Meanwhile politicians went hunting for the perfect spot They toured a long list of country towns inspecting the weather the water and the views In nineteen oh four they finally chose a tiny town called Dalgety near the Snowy Mountains",
    "New South Wales hated it Too cold too remote and suspiciously close to Victoria So four years later Parliament scrapped Dalgety entirely and picked the Yass Canberra district instead A government surveyor then rode out across the sheep runs to pick the exact site a wide valley ringed by hills with a river running through it",
    "In nineteen eleven New South Wales handed over the land creating the Federal Capital Territory And because every capital deserves a coastline the government later added Jervis Bay too a tiny piece of ocean far away from the city itself",
    "Now the minister in charge of all this was a colourful character named King O'Malley One of his first big moves He banned the sale of alcohol in the new territory a ban that lasted until nineteen twenty eight",
    "Next the world was invited to design the city More than a hundred and thirty entries poured in even though Britain's top architects boycotted the contest in protest at how it was being judged The winners were an American architect couple Walter Burley Griffin and Marion Mahony Griffin Their plan was breathtaking a city of lakes hills and grand avenues all lined up with the mountains around it",
    "Then came the name The public sent in suggestions and some were creative One proposal mashed up the state capitals into a single word Sydmeladperbrisho In nineteen thirteen the name was officially announced Canberra believed to come from a local Aboriginal name for the area",
    "But building a city from scratch is slow Walter Burley Griffin moved to Australia to oversee the work and spent years fighting bureaucrats who kept changing his plans until his job ended in nineteen twenty The First World War drained the money Construction crawled",
    "Finally in nineteen twenty seven a royal visitor opened a new Parliament House in Canberra and the government said goodbye to Melbourne at last Then the Great Depression and another world war slowed everything down again The lake at the heart of the Griffins' design wasn't filled until nineteen sixty four And today's grand Parliament House built right into a hilltop only opened in nineteen eighty eight",
    "Today Canberra is home to nearly half a million people It has embassies museums and the national government And yet it all exists because of one simple fact two rival cities refused to let the other one win",
    "So the next time someone tells you Sydney is the capital of Australia you can tell them the whole story",
]
EXTRA = {"canberra": "K AE N B ER AH", "melbourne": "M EH L B ER N", "dalgety": "D AE L JH AH T IY", "yass": "Y AE S", "jervis": "JH AA R V IH S", "omalley": "OW M AE L IY", "sydmeladperbrisho": "S IH D M EH L AE D P ER B R IH SH OW", "mahony": "M AA HH OW N IY", "griffin": "G R IH F IH N", "griffins": "G R IH F IH N Z", "bureaucrats": "B Y UH R AH K R AE T S", "colourful": "K AH L ER F AH L", "aboriginal": "AE B ER IH JH AH N AH L", "australias": "AO S T R EY L Y AH Z", "victorias": "V IH K T AO R IY AH Z", "britains": "B R IH T AH N Z", "surveyor": "S ER V EY ER", "hilltop": "HH IH L T AA P", "breathtaking": "B R EH TH T EY K IH NG", "suspiciously": "S AH S P IH SH AH S L IY"}


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
