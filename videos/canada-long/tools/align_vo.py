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
    "At night Canada looks like a ribbon of light pressed against the US border with a vast darkness to the north Scandinavia sits just as far north and thrives So what's really going on It comes down to climate and rock",
    "First the climate Scandinavia gets a gift from the ocean a warm current from the tropics the Gulf Stream that keeps its coasts surprisingly mild Northern Canada gets no such help Arctic air pours straight down across it and in the middle of winter places at the same latitude as Oslo can be more than twenty degrees colder",
    "But even where it's warm enough to live there's a second problem hiding under the ground It's called the Canadian Shield",
    "It wraps around Hudson Bay like a giant horseshoe and covers about half of the entire country It's made of ancient granite and gneiss including some of the oldest rocks ever found on Earth",
    "During the last Ice Age enormous glaciers scraped across this region like giant bulldozers stripping away much of the soil and pushing it south toward the Great Lakes and the American Midwest",
    "What they left behind is bare rock jagged ridges and endless soggy swamps and peat bogs called muskeg",
    "The soil that's left is thin and acidic Large scale farming is nearly impossible And without farms there were no big farming towns and without towns no reason to build highways or railways",
    "It's like buying a huge property where almost all of it is solid concrete driveway so everyone squeezes their houses onto the one thin strip of grass along the front fence",
    "Building across the Shield is still an expensive nightmare Roads have to be blasted through solid granite bridges have to be anchored over shifting muskeg and for much of the year rivers lakes and even Hudson Bay freeze solid",
    "Further north and west the ground itself is frozen Permafrost covers a huge part of Canada and when it thaws roads buckle and buildings sink",
    "Meanwhile along the southern edge around the St Lawrence River southern Ontario and the Great Lakes the soil is deep and rich the lakes soften the winters and right next door sits the biggest economy on Earth",
    "For thousands of years Indigenous peoples have lived across the northern forests and Arctic coasts through deep knowledge of the land the wildlife and the waterways",
    "And modern Canada pulls enormous wealth out of the Shield gold nickel uranium and diamonds dug from that ancient rock in remote mining towns",
    "But without farmland or cheap transport those northern towns stay small islands in a vast wilderness While Toronto Montreal Vancouver and Calgary all stay close to the southern rim",
    "So the next time you see Canadians huddled along the American border like people crowding around a campfire remember they're not just escaping the cold They're living on the strip of land where a city can actually take root",
]
EXTRA = {"canadas": "K AE N AH D AH Z", "oslo": "AA Z L OW", "helsinki": "HH EH L S IH NG K IY", "stockholm": "S T AA K HH OW L M", "gneiss": "N AY S", "muskeg": "M AH S K EH G", "permafrost": "P ER M AH F R AO S T", "scandinavia": "S K AE N D IH N EY V IY AH", "railways": "R EY L W EY Z", "lawrence": "L AO R AH N S", "indigenous": "IH N D IH JH AH N AH S", "toronto": "T ER AA N T OW", "montreal": "M AH N T R IY AO L", "vancouver": "V AE N K UW V ER", "calgary": "K AE L G ER IY", "waterways": "W AO T ER W EY Z", "theyre": "DH EH R", "its": "IH T S", "nickel": "N IH K AH L", "uranium": "Y ER EY N IY AH M", "theyre": "DH EH R"}


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
