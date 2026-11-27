"""Lower-third captions synced to vo/timing.json -> src/captions.js (one chunk per phrase)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "..")
import sys; sys.path.insert(0, HERE)
from render import BEATS
CH = {1: ["On November 12…", "the boss of one of the most valuable companies on Earth", "suddenly quit.", "Jensen Huang,", "the man in the leather jacket", "who built Nvidia into the engine of the AI boom…", "gone, effective immediately."],
      2: ["Eleven days later, he was back.", "And in between, the world found out", "about a loophole that had been quietly feeding China's AI…", "through a tiny country", "more than a thousand miles to the south."],
      3: ["To understand how,", "let's follow ONE imaginary server…", "from the moment it's built", "to the moment someone in China switches it on."],
      4: ["Its chips are designed in California, by Nvidia.", "They're made in Taiwan.", "Then they're packed into a server", "worth about as much as a house…", "and shipped out."],
      5: ["But there's one place", "this server is NOT allowed to go.", "Since 2022,", "America has banned Nvidia's most powerful chips", "from being sold to China.", "The front door is shut."],
      6: ["So our server goes somewhere else.", "Johor, in southern Malaysia,", "just across a causeway from Singapore.", "In a few short years, this corner of the map", "became one of the fastest-growing", "data-centre markets in Asia…", "cheap land, cheap power,", "and fibre cables in every direction."],
      7: ["Our server gets plugged in,", "switched on…", "and rented out.", "And here's the trick.", "The ban covered the CHIPS…", "not the login screen.", "A company in Shanghai", "can connect from over 2,000 miles away", "and use every bit of that power…", "while the server never moves an inch.", "No ship.", "No customs form.", "No smuggler."],
      8: ["It's like locking your front door…", "while the neighbour passes everything", "through the side window.", "Technically,", "nobody ever walked through the door."],
      9: ["And this wasn't a few servers.", "By one estimate from a Washington think tank,", "renting overseas data centres like this", "now supplies about a QUARTER", "of China's AI computing power…", "and roughly three-quarters of that", "sits in Southeast Asia."],
      10: ["One of the biggest buyers", "was a Singapore company called Megaspeed.", "Customs records reviewed by Bloomberg", "show it imported at least $4.6 BILLION", "worth of Nvidia hardware.", "Some of it was reportedly running in Johor", "for Alibaba…", "which, under the current rules, is legal."],
      11: ["But since 2024,", "American investigators had been asking a harder question:", "were some of those chips", "physically ending up inside China?", "Megaspeed denies any wrongdoing…", "and Nvidia says no chips were diverted."],
      12: ["And that's where our story", "loops back to that resignation.", "Jensen Huang had admitted a relationship", "with a former Megaspeed executive…", "a woman some American officials", "had suspected of links to Chinese intelligence."],
      13: ["Intelligence officials later told Congress", "they'd found no evidence", "she was sent to target him.", "Nvidia's board brought him back after eleven days…", "but by then, it didn't matter.", "The map had already changed."],
      14: ["Washington blacklisted Megaspeed", "and six other firms", "across Singapore, Malaysia and Thailand.", "New rules now force data centres to prove", "that restricted Chinese companies", "can't reach American chips.", "Malaysia told its data centres", "to stop hosting the blacklisted firms.", "And Nvidia reportedly told server makers", "to pause shipments to FOUR countries:", "Singapore, Malaysia,", "Thailand and Indonesia."],
      15: ["Our imaginary server?", "It might just get switched off."],
      16: ["But here's the part almost nobody saw coming.", "While America spent years", "trying to keep chips OUT of China…", "around 600,000 Nvidia H200s,", "chips Washington actually agreed to let Nvidia sell,", "are sitting in Hong Kong right now, waiting.", "And this time,", "the one reportedly blocking them…", "is Beijing."],
      17: ["China wants its tech giants", "to switch to Chinese-made chips.", "So while America", "was nailing the side window shut…", "China was quietly locking its own front door."],
      18: ["Because in this new race,", "the most valuable resource on Earth", "isn't oil under the desert.", "It's computing power…", "moving through ports, data centres", "and undersea cables."],
      19: ["So the next time a country", "builds a wall around AI…", "where on the map", "does the side window open up next?"]}
SPECIAL = {"12": 1, "2022,": 3, "2024,": 3, "2,000": 2, "$4.6": 4, "600,000": 3, "H200s,": 3}   # spoken word counts ($4.6 + 'dollars')
def nw(chunk):
    n = 0
    for tk in chunk.split():
        k = tk.strip("…,.:?!")
        if tk.strip("…") in SPECIAL: n += SPECIAL[tk.strip("…")]
        elif k in ("data-centre", "fastest-growing", "three-quarters", "Chinese-made"): n += 2
        elif k: n += 1
    return n
tj = json.load(open(os.path.join(R, "vo", "timing.json")))
caps = []
for b, s, e in BEATS:
    ws = tj[f"{b:02d}"]; i = 0; starts = []
    for ch in CH[b]:
        assert i < len(ws), (b, ch)
        starts.append(s + 0.06 + ws[i][1]); i += nw(ch)
    assert i == len(ws), (b, i, len(ws), [w[0] for w in ws])
    lend = s + 0.06 + ws[-1][2] + 0.35
    for j, ch in enumerate(CH[b]):
        t1 = starts[j + 1] - 0.06 if j + 1 < len(starts) else min(lend, e - 0.1)
        caps.append([round(starts[j] - 0.05, 2), round(t1, 2), ch])
open(os.path.join(R, "src", "captions.js"), "w").write("// generated by tools/make_captions.py\nconst CAPTIONS = " + json.dumps(caps, ensure_ascii=False) + ";\n")
print(len(caps), "captions")
