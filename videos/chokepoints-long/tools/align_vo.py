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
    "In twenty twenty one one ship got stuck in Egypt's Suez Canal and froze about twelve percent of all global trade for six days",
    "But Suez is just one of the world's chokepoints Over eighty percent of all goods traded worldwide travel by sea and a huge share of it is forced to squeeze through just six tiny stretches of water Your phone your coffee your sneakers the fuel in your car whether you live in Kansas Toronto Sydney or the English Midlands",
    "Today we are counting down those six chokepoints from number six to number one",
    "Why does a planet that is more than seventy percent water even have traffic jams Simple geometry Continents get in the way Sailing around the bottom of Africa or South America adds thousands of miles and weeks of extra travel so global shipping packed itself into the shortest shortcuts between land Think of the world's oceans like a ten lane highway where every single driver still has to merge into six narrow tollbooths to get home",
    "Number six the narrowest strait used by world shipping Have you ever seen a massive oil tanker sail straight through the middle of a crowded city",
    "Tucked between Europe and Asia sits the Bosporus in Turkey Cutting right through the heart of Istanbul the water narrows to barely half a mile wide at its tightest point",
    "Yet that tiny ribbon of water is the only exit out of the Black Sea Millions of tons of wheat corn and oil from Ukraine Russia and Kazakhstan have to squeeze through it to reach global markets Under a nineteen thirty six treaty Turkey controls warship access here and when conflict hits the Black Sea food prices jump around the world",
    "Number five a fifty mile shortcut that does not run on ocean water at all What happens when a global shipping lane runs out of rain",
    "Cross the Atlantic to Central America and you hit the Panama Canal It saves ships an eight thousand mile trip around the stormy tip of South America carrying roughly five percent of global sea trade including about forty percent of all United States container traffic",
    "Unlike sea level canals Panama lifts ships up and over mountains using locks powered entirely by fresh water from man made Gatun Lake Every single ship that crosses uses roughly fifty million gallons of fresh water",
    "When a severe drought hit Panama in twenty twenty three and twenty twenty four the lake dropped so low that officials had to slash daily crossings from nearly forty down to twenty two Ships waited up to three weeks in line and some companies paid millions of dollars at auction just to skip the queue",
    "Number four an eighteen mile gap that sent thousands of ships on a four thousand mile detour",
    "Sail into the bottom of the Red Sea and you reach the Bab el Mandeb Strait pinched between Yemen and the Horn of Africa Normally it is the southern gateway to Europe's fastest trade route with Asia",
    "Starting in late twenty twenty three Houthi militants in Yemen began firing missiles and drones at commercial ships passing through that narrow throat Major shipping lines refused to risk their crews and abandoned the Red Sea altogether",
    "Instead ships heading from Asia to Europe or the American East Coast had to sail all the way around the southern tip of Africa That detour adds roughly four thousand miles and up to two weeks to every voyage burning extra fuel spiking insurance bills and cutting Red Sea ship traffic roughly in half",
    "Number three the desert ditch from that famous jam",
    "Just north of the Red Sea sits Egypt's Suez Canal In March twenty twenty one a massive container ship called the Ever Given was hit by powerful winds wedged its bow into one bank and its stern into the other and sealed off the entire canal for six days",
    "Roughly twelve percent of all global trade normally passes through that single waterway While diggers scrambled to free the ship over four hundred vessels backed up in a floating traffic jam holding up an estimated nine point six billion dollars worth of goods every single day",
    "Number two the busiest maritime bottleneck on the planet How do you fit a quarter of world trade through a gap barely wider than a few city blocks",
    "Squeezed between Malaysia Indonesia and Singapore sits the Strait of Malacca the main highway linking the Indian Ocean to the Pacific Roughly a quarter of all seaborne trade and nearly thirty percent of the world's seaborne oil passes through it",
    "At its tightest point near Singapore the shipping channel narrows to just one point seven miles wide That is about the length of eight aircraft carriers parked end to end If Malacca ever closed ships feeding China Japan and South Korea would have to detour hundreds of miles south through Indonesia overwhelming ports across Asia",
    "And number one the twenty one mile doorway that can spike gas prices on every continent overnight",
    "Sitting between Iran and Oman is the Strait of Hormuz At its narrowest the strait is about twenty one miles wide with actual shipping lanes barely two miles across in each direction",
    "Before twenty twenty six roughly one fifth of all the petroleum liquids consumed on Earth and about a fifth of the world's liquefied natural gas squeezed through that single gate every day There is almost no pipeline big enough to replace it",
    "When regional war erupted in early twenty twenty six and Iran effectively closed the Strait of Hormuz to commercial traffic global energy markets felt the shockwave immediately The International Energy Agency called it the largest energy supply shock the world has ever faced and it still is not over",
    "And here is the twist most people miss You might think these six chokepoints only matter if you live next to a port like New York London or Sydney",
    "In truth a traffic jam in a two mile wide strait on the other side of the planet hits landlocked towns just as hard Modern factories and grocery stores run on just in time schedules with almost zero spare inventory When a ship is delayed by two weeks freight rates jump diesel costs climb and container shortages ripple inland by rail and truck pushing up the price of groceries electronics and gas in Alberta Kansas or Birmingham within weeks",
    "We built the fastest most interconnected economy in human history and then balanced the entire thing on six tiny strips of water that nature never designed to hold it",
    "Out of all six of these chokepoints which one do you think poses the biggest threat to the world next",
]
EXTRA = {"egypts": "IY JH AH P T S", "worlds": "W ER L D Z", "europes": "Y UH R AH P S", "chokepoints": "CH OW K P OY N T S", "tollbooths": "T OW L B UW TH S", "bosporus": "B AA S P ER AH S", "kazakhstan": "K AE Z AH K S T AE N", "gatun": "G AH T UW N", "mandeb": "M AE N D EH B", "houthi": "HH UW TH IY", "malacca": "M AH L AE K AH", "hormuz": "HH AO R M UW Z", "liquefied": "L IH K W AH F AY D", "shockwave": "SH AA K W EY V", "landlocked": "L AE N D L AA K T", "interconnected": "IH N T ER K AH N EH K T AH D", "bab": "B AE B", "el": "EH L"}


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
