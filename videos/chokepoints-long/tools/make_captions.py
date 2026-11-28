"""Lower-third captions synced to vo/timing.json -> src/captions.js.
Display text per paragraph (digits, punctuation) is split into short chunks at punctuation; each chunk's spoken-word count
(numbers expanded via SPOKEN) maps it onto the aligner's word timings."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "..")
sys.path.insert(0, HERE)
from render import BEATS
P = [
 "In 2021, ONE ship got stuck in Egypt's Suez Canal… and froze about 12% of all global trade for six days.",
 "But Suez is just ONE of the world's chokepoints. Over 80% of all goods traded worldwide travel by sea… and a HUGE share of it is forced to squeeze through just six tiny stretches of water. Your phone, your coffee, your sneakers, the fuel in your car… whether you live in Kansas, Toronto, Sydney, or the English Midlands.",
 "Today, we are counting down those six chokepoints, from number six to number one.",
 "Why does a planet that is more than 70% water even have traffic jams? Simple geometry. Continents get in the way. Sailing around the bottom of Africa or South America adds thousands of miles and weeks of extra travel… so global shipping packed itself into the shortest shortcuts between land. Think of the world's oceans like a ten-lane highway where every single driver still has to merge into six narrow tollbooths to get home.",
 "Number six… the narrowest strait used by world shipping. Have you ever seen a massive oil tanker sail straight through the middle of a crowded city?",
 "Tucked between Europe and Asia sits the Bosporus in Turkey. Cutting right through the heart of Istanbul, the water narrows to barely HALF A MILE wide at its tightest point.",
 "Yet that tiny ribbon of water is the ONLY exit out of the Black Sea. Millions of tons of wheat, corn, and oil from Ukraine, Russia, and Kazakhstan have to squeeze through it to reach global markets. Under a 1936 treaty, Turkey controls warship access here… and when conflict hits the Black Sea, food prices jump around the world.",
 "Number five… a fifty-mile shortcut that does not run on ocean water at all. What happens when a global shipping lane runs out of RAIN?",
 "Cross the Atlantic to Central America and you hit the Panama Canal. It saves ships an 8,000-mile trip around the stormy tip of South America, carrying roughly 5% of global sea trade… including about 40% of all United States container traffic.",
 "Unlike sea-level canals, Panama lifts ships up and over mountains using locks powered entirely by fresh water from man-made Gatun Lake. Every single ship that crosses uses roughly 50 million gallons of fresh water.",
 "When a severe drought hit Panama in 2023 and 2024, the lake dropped so low that officials had to slash daily crossings from nearly 40 down to 22. Ships waited up to three weeks in line… and some companies paid millions of dollars at auction just to skip the queue.",
 "Number four… an 18-mile gap that sent thousands of ships on a 4,000-mile detour.",
 "Sail into the bottom of the Red Sea and you reach the Bab el-Mandeb Strait, pinched between Yemen and the Horn of Africa. Normally, it is the southern gateway to Europe's fastest trade route with Asia.",
 "Starting in late 2023, Houthi militants in Yemen began firing missiles and drones at commercial ships passing through that narrow throat. Major shipping lines refused to risk their crews and abandoned the Red Sea altogether.",
 "Instead, ships heading from Asia to Europe or the American East Coast had to sail all the way around the southern tip of Africa. That detour adds roughly 4,000 miles and up to TWO WEEKS to every voyage… burning extra fuel, spiking insurance bills, and cutting Red Sea ship traffic roughly in half.",
 "Number three… the desert ditch from that famous jam.",
 "Just north of the Red Sea sits Egypt's Suez Canal. In March 2021, a massive container ship called the Ever Given was hit by powerful winds, wedged its bow into one bank and its stern into the other, and sealed off the entire canal for six days.",
 "Roughly 12% of all global trade normally passes through that single waterway. While diggers scrambled to free the ship, over 400 vessels backed up in a floating traffic jam… holding up an estimated $9.6 BILLION worth of goods every single day.",
 "Number two… the busiest maritime bottleneck on the planet. How do you fit a quarter of world trade through a gap barely wider than a few city blocks?",
 "Squeezed between Malaysia, Indonesia, and Singapore sits the Strait of Malacca, the main highway linking the Indian Ocean to the Pacific. Roughly a quarter of all seaborne trade… and nearly 30% of the world's seaborne oil… passes through it.",
 "At its tightest point near Singapore, the shipping channel narrows to just 1.7 MILES wide. That is about the length of EIGHT aircraft carriers parked end to end. If Malacca ever closed, ships feeding China, Japan, and South Korea would have to detour hundreds of miles south through Indonesia, overwhelming ports across Asia.",
 "And number one… the 21-mile doorway that can spike gas prices on every continent overnight.",
 "Sitting between Iran and Oman is the Strait of Hormuz. At its narrowest, the strait is about 21 miles wide, with actual shipping lanes barely two miles across in each direction.",
 "Before 2026, roughly ONE FIFTH of all the petroleum liquids consumed on Earth, and about a fifth of the world's liquefied natural gas, squeezed through that single gate every day. There is almost no pipeline big enough to replace it.",
 "When regional war erupted in early 2026 and Iran effectively closed the Strait of Hormuz to commercial traffic, global energy markets felt the shockwave immediately. The International Energy Agency called it the largest energy supply shock the world has ever faced… and it still is not over.",
 "And here is the twist most people miss. You might think these six chokepoints only matter if you live next to a port like New York, London, or Sydney.",
 "In truth, a traffic jam in a two-mile-wide strait on the other side of the planet hits landlocked towns just as hard. Modern factories and grocery stores run on just-in-time schedules with almost zero spare inventory. When a ship is delayed by two weeks, freight rates jump, diesel costs climb, and container shortages ripple inland by rail and truck… pushing up the price of groceries, electronics, and gas in Alberta, Kansas, or Birmingham within weeks.",
 "We built the fastest, most interconnected economy in human history… and then balanced the entire thing on six tiny strips of water that nature never designed to hold it.",
 "Out of all six of these chokepoints, which one do you think poses the biggest threat to the world next?",
]
SPOKEN = {"2021": 3, "2023": 3, "2024": 3, "2026": 3, "1936": 3, "12%": 2, "80%": 2, "70%": 2, "5%": 2, "40%": 2, "30%": 2, "8,000-mile": 3, "4,000-mile": 3, "4,000": 2,
          "50": 1, "40": 1, "22": 2, "18-mile": 2, "21-mile": 3, "21": 2, "400": 2, "$9.6": 4, "1.7": 3, "el-Mandeb": 2, "ten-lane": 2, "fifty-mile": 2, "sea-level": 2,
          "man-made": 2, "two-mile-wide": 3, "just-in-time": 3}
def count(chunk):
    n = 0
    for tk in chunk.split():
        k = tk.strip("…,.:?!")
        if k in SPOKEN: n += SPOKEN[k]
        elif k: n += 1
    return n
def chunks(par, maxc=44):
    parts = re.split(r'(?<=[.?…,])\s+', par)
    out = []
    for p in parts:
        words = p.split(); cur = []
        for w in words:
            if cur and len(" ".join(cur + [w])) > maxc: out.append(" ".join(cur)); cur = [w]
            else: cur.append(w)
        if cur: out.append(" ".join(cur))
    # merge very short fragments into the previous chunk when it still fits
    merged = []
    for c in out:
        if merged and len(c) < 14 and len(merged[-1]) + len(c) + 1 <= maxc + 10: merged[-1] += " " + c
        else: merged.append(c)
    return merged
tj = json.load(open(os.path.join(R, "vo", "timing.json")))
caps = []
for (b, s, e), par in zip(BEATS, P):
    ws = tj[f"{b:02d}"]; i = 0; cs = chunks(par); starts = []
    for c in cs:
        assert i < len(ws), (b, c); starts.append(s + 0.06 + ws[i][1]); i += count(c)
    assert i == len(ws), (b, i, len(ws), cs, [w[0] for w in ws])
    lend = s + 0.06 + ws[-1][2] + 0.35
    for j, c in enumerate(cs):
        t1 = starts[j + 1] - 0.06 if j + 1 < len(starts) else min(lend, e - 0.1)
        caps.append([round(starts[j] - 0.05, 2), round(t1, 2), c])
open(os.path.join(R, "src", "captions.js"), "w").write("// generated by tools/make_captions.py\nconst CAPTIONS = " + json.dumps(caps, ensure_ascii=False) + ";\n")
print(len(caps), "captions")
