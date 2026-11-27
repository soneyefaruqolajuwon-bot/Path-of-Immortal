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
    "Armies are supposed to know exactly where they're going These ones did not Here are six times a country invaded the wrong place the wrong country or nobody at all And number one sent thirty four thousand soldiers to attack an island where nobody was waiting",
    "Number six Switzerland versus Liechtenstein",
    "Switzerland is the most neutral country on Earth And yet it has invaded its tiny neighbour Liechtenstein five times by accident Artillery shells on a ski resort Soldiers and pack horses taking a wrong turn Missiles that set a forest on fire And in two thousand seven a hundred and seventy one soldiers who got lost at night and marched more than a mile across the border Liechtenstein didn't even complain It doesn't have an army",
    "Number five Britain versus Spain",
    "Next to the southern tip of Spain sits Gibraltar a tiny rock that has been British for more than three hundred years Spain wants it back so the border there is touchy In February two thousand two the Royal Marines practised storming a beach in Gibraltar Landing craft roared in and about twenty marines charged up the sand with their rifles on a beach in Spain",
    "A local had to walk over and politely explain that Gibraltar was a little further down the coast The marines packed up and left within minutes And back at headquarters an officer picked up the phone Sir we've just invaded Spain",
    "Number four The army that came home bigger",
    "Liechtenstein wasn't always army free In eighteen sixty six it sent about eighty soldiers off to war to guard the mountains for its allies They never fired a shot And legend says that eighty men marched out and eighty one came back Somewhere along the way they'd picked up a friend Two years later Liechtenstein decided an army was too expensive and got rid of it for good",
    "Number three Nicaragua versus Costa Rica",
    "In twenty ten Nicaragua was dredging the San Juan River right on its border with Costa Rica Its soldiers crossed onto a marshy island called Isla Calero and raised the Nicaraguan flag Costa Rica said that's our island Nicaragua's answer Check Google Maps And on Google Maps the island really was on Nicaragua's side Google later admitted its border was wrong",
    "But the crisis was real And Costa Rica hasn't had an army since nineteen forty eight so it sent police and took Nicaragua to the International Court of Justice In twenty fifteen the court ruled the island had been Costa Rica's all along",
    "Number two Greece versus Bulgaria",
    "In nineteen twenty five on the border between Greece and Bulgaria a Greek soldier's dog ran off across the line The soldier chased after it and a Bulgarian guard shot him Within days Greek troops had marched into Bulgaria The League of Nations stepped in ordered a ceasefire and made Greece pull out and pay compensation People still call it the War of the Stray Dog",
    "And number one The United States and Canada versus nobody",
    "In nineteen forty three during World War Two Japan was occupying Kiska a remote island off Alaska So more than thirty four thousand American and Canadian troops stormed it through thick freezing fog They searched for days They found nothing The Japanese had already slipped away in the fog weeks earlier But in the confusion soldiers fired at each other and a destroyer hit a mine Around three hundred men were killed or wounded invading an empty island",
    "So out of all six the ones that ended best were the ones where nobody had an army to fight back Maybe that's the secret No army no war just a very awkward apology",
]
EXTRA = {"theyre": "DH EH R", "its": "IH T S", "thats": "DH AE T S", "didnt": "D IH D AH N T", "doesnt": "D AH Z AH N T", "wasnt": "W AA Z AH N T", "hasnt": "HH AE Z AH N T", "weve": "W IY V", "theyd": "DH EY D", "liechtenstein": "L IH K T AH N S T AY N", "neighbour": "N EY B ER", "practised": "P R AE K T IH S T", "calero": "K AH L EH R OW", "nicaraguan": "N IH K ER AA G W AH N", "nicaraguas": "N IH K ER AA G W AH Z", "ricas": "R IY K AH Z", "soldiers": "S OW L JH ER Z", "kiska": "K IH S K AH", "gibraltar": "JH IH B R AO L T ER"}


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
