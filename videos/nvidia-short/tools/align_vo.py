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
    "For years America has banned China from buying Nvidia's most powerful AI chips",
    "But Chinese companies could still use them without a single chip ever crossing China's border",
    "Not by smuggling them in by renting them Data centres in Singapore Malaysia and Thailand could legally buy the chips and sell time on them to anyone with an internet connection",
    "One of those buyers was a Singapore company called Megaspeed American investigators started looking at it in twenty twenty four on suspicion that some of its chips were ending up in China Megaspeed denies any wrongdoing",
    "It's like locking your front door while the neighbour quietly passes everything through the side window",
    "Then this month it blew up Nvidia's CEO Jensen Huang resigned after admitting a relationship with a former Megaspeed executive one American officials had suspected of links to Chinese intelligence though they say there's no evidence she was sent to target him Eleven days later the board brought him back",
    "And the map changed overnight Megaspeed was blacklisted and Nvidia reportedly paused server shipments to four countries Singapore Malaysia Thailand and Indonesia",
    "Turns out you can build a wall around a country but not around the cloud",
]
EXTRA = {"its": "IH T S", "nvidias": "EH N V IH D IY AH Z", "nvidia": "EH N V IH D IY AH", "ai": "EY AY", "chinas": "CH AY N AH Z", "centres": "S EH N T ER Z", "megaspeed": "M EH G AH S P IY D", "neighbour": "N EY B ER", "ceo": "S IY IY OW", "jensen": "JH EH N S AH N", "huang": "HH W AA NG", "theres": "DH EH R Z"}


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
