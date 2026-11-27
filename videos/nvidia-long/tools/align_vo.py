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
    "On November twelfth the boss of one of the most valuable companies on Earth suddenly quit Jensen Huang the man in the leather jacket who built Nvidia into the engine of the AI boom gone effective immediately",
    "Eleven days later he was back And in between the world found out about a loophole that had been quietly feeding China's AI through a tiny country more than a thousand miles to the south",
    "To understand how let's follow one imaginary server from the moment it's built to the moment someone in China switches it on",
    "Its chips are designed in California by Nvidia They're made in Taiwan Then they're packed into a server worth about as much as a house and shipped out",
    "But there's one place this server is not allowed to go Since twenty twenty two America has banned Nvidia's most powerful chips from being sold to China The front door is shut",
    "So our server goes somewhere else Johor in southern Malaysia just across a causeway from Singapore In a few short years this corner of the map became one of the fastest growing data centre markets in Asia cheap land cheap power and fibre cables in every direction",
    "Our server gets plugged in switched on and rented out And here's the trick The ban covered the chips not the login screen A company in Shanghai can connect from over two thousand miles away and use every bit of that power while the server never moves an inch No ship No customs form No smuggler",
    "It's like locking your front door while the neighbour passes everything through the side window Technically nobody ever walked through the door",
    "And this wasn't a few servers By one estimate from a Washington think tank renting overseas data centres like this now supplies about a quarter of China's AI computing power and roughly three quarters of that sits in Southeast Asia",
    "One of the biggest buyers was a Singapore company called Megaspeed Customs records reviewed by Bloomberg show it imported at least four point six billion dollars worth of Nvidia hardware Some of it was reportedly running in Johor for Alibaba which under the current rules is legal",
    "But since twenty twenty four American investigators had been asking a harder question were some of those chips physically ending up inside China Megaspeed denies any wrongdoing and Nvidia says no chips were diverted",
    "And that's where our story loops back to that resignation Jensen Huang had admitted a relationship with a former Megaspeed executive a woman some American officials had suspected of links to Chinese intelligence",
    "Intelligence officials later told Congress they'd found no evidence she was sent to target him Nvidia's board brought him back after eleven days but by then it didn't matter The map had already changed",
    "Washington blacklisted Megaspeed and six other firms across Singapore Malaysia and Thailand New rules now force data centres to prove that restricted Chinese companies can't reach American chips Malaysia told its data centres to stop hosting the blacklisted firms And Nvidia reportedly told server makers to pause shipments to four countries Singapore Malaysia Thailand and Indonesia",
    "Our imaginary server It might just get switched off",
    "But here's the part almost nobody saw coming While America spent years trying to keep chips out of China around six hundred thousand Nvidia H two hundreds chips Washington actually agreed to let Nvidia sell are sitting in Hong Kong right now waiting And this time the one reportedly blocking them is Beijing",
    "China wants its tech giants to switch to Chinese made chips So while America was nailing the side window shut China was quietly locking its own front door",
    "Because in this new race the most valuable resource on Earth isn't oil under the desert It's computing power moving through ports data centres and undersea cables",
    "So the next time a country builds a wall around AI where on the map does the side window open up next",
]
EXTRA = {"its": "IH T S", "nvidias": "EH N V IH D IY AH Z", "nvidia": "EH N V IH D IY AH", "ai": "EY AY", "chinas": "CH AY N AH Z", "centres": "S EH N T ER Z", "centre": "S EH N T ER", "megaspeed": "M EH G AH S P IY D", "neighbour": "N EY B ER", "jensen": "JH EH N S AH N", "huang": "HH W AA NG", "theres": "DH EH R Z", "lets": "L EH T S", "theyre": "DH EH R", "johor": "JH OW HH AO R", "fibre": "F AY B ER", "heres": "HH IY R Z", "wasnt": "W AA Z AH N T", "alibaba": "AE L IY B AA B AH", "thats": "DH AE T S", "theyd": "DH EY D", "didnt": "D IH D AH N T", "cant": "K AE N T", "isnt": "IH Z AH N T", "h": "EY CH", "hundreds": "HH AH N D R AH D Z"}


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
