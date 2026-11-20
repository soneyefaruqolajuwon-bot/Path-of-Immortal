"""Render The Impossible Strait, Part 1 to MP4 (video via headless Chromium, audio procedural + voice).

  python tools/render.py            # uses vo/NN.mp3 + vo/timing.json if present
  python tools/render.py --no-vo
"""
import argparse, glob, json, os, shutil, subprocess, sys, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(R, "..", "pig-war", "src"))
import audio as AU  # noqa: E402  (shared SFX + music engine)

VO_DIR = os.path.join(R, "vo")
OUT = os.path.join(R, "out")
FPS = 30

BEATS_BY_PART = {
    1: [(1, 0, 11), (2, 11, 17.5), (3, 17.5, 32), (4, 32, 42.4), (5, 45, 52), (6, 52, 65), (7, 65, 75), (8, 75, 88), (9, 88, 115)],
    2: [(10, 115, 119), (11, 123, 137), (12, 137, 155), (13, 155, 166), (14, 166, 198), (15, 198, 205)],
    3: [(16, 209, 216), (17, 216, 219.4), (18, 219.4, 230.4), (19, 230.4, 242), (20, 242, 254), (21, 254, 266), (22, 266, 279)],
}
BEATS_BY_PART[0] = BEATS_BY_PART[1] + BEATS_BY_PART[2] + BEATS_BY_PART[3]   # the full video in one pass
PART_START = {0: 0.0, 1: 0.0, 2: 115.0, 3: 205.0}
BEATS = BEATS_BY_PART[1]
PART = 1
# gaps between beats (e.g. 42.4–45, 119–123) are silent chapter cards and keep their storyboard length
ANCHORS = [
    (1, "twenty", 0, 4.4), (1, "shipping", 0, 7.5),
    (2, "fifth", 0, 12.0),
    (3, "called", 0, 17.6), (3, "dangerous", 0, 22.1), (3, "crash", 0, 28.0),
    (4, "warships", 0, 34.6), (4, "map", 0, 41.0),
    (5, "cul", 0, 47.8),
    (6, "saudi", 0, 53.4), (6, "iraq", 0, 54.6), (6, "kuwait", 0, 55.6), (6, "qatar", 0, 56.6), (6, "emirates", 0, 57.6), (6, "iran", 0, 58.8), (6, "millions", 0, 60.4),
    (7, "exit", 0, 68.4), (7, "europe", 0, 70.2),
    (8, "musandam", 0, 78.4), (8, "exclave", 0, 81.6),
    (9, "keys", 0, 90.2), (9, "neutral", 0, 95.4), (9, "missiles", 0, 101.4), (9, "mines", 0, 106.0),
    # Part 2
    (11, "eighties", 0, 125.4), (11, "water", 0, 132.2), (11, "tanker", 0, 133.0),
    (12, "four", 0, 141.0), (12, "insurance", 0, 149.4), (12, "superpowers", 0, 152.6),
    (13, "reflagged", 0, 156.4), (13, "american", 0, 158.2), (13, "escort", 0, 161.2),
    (14, "april", 0, 168.6), (14, "mine", 0, 172.6), (14, "four", 0, 177.4), (14, "praying", 0, 181.6),
    (14, "platforms", 0, 186.4), (14, "largest", 0, 192.2),
    (15, "tripwire", 0, 200.6),
    # Part 3
    (16, "why", 0, 213.2), (17, "sword", 0, 216.6),
    (18, "first", 0, 219.7), (18, "european", 0, 222.4), (18, "asian", 0, 225.2),
    (19, "second", 0, 230.7), (19, "food", 0, 233.4), (19, "fire", 0, 237.4),
    (20, "pipelines", 0, 243.4), (20, "fraction", 0, 247.6),
    (21, "narrow", 0, 255.4), (21, "important", 0, 258.6), (21, "vital", 0, 261.8),
    (22, "story", 0, 267.4), (22, "hostage", 0, 273.0),
]
VO_DELAY, VO_TAIL = 0.06, 0.3

SFX_CUES = [
    (0.3, "whoosh", 0), (4.4, "ding", 0), (7.5, "whoosh", 0), (12.0, "ding", 0), (13.0, "pop", 0.4),
    (18.6, "thud", 0), (22.2, "zap", 0), (28.0, "boing", 0.4), (34.6, "horn", 0.3),
    (42.4, "whoosh", 0), (42.7, "ding", 0), (46.6, "whoosh", 0),
    (53.4, "pop", -0.4), (54.6, "pop", -0.4), (55.6, "pop", -0.3), (56.6, "pop", 0), (57.6, "pop", 0.2), (58.8, "pop", 0.2), (60.4, "chaching", 0),
    (65.6, "whoosh", 0), (68.4, "thud", 0.3), (77.2, "whoosh", 0), (78.4, "ding", 0.3), (90.2, "ding", 0),
    (101.4, "thud", -0.3), (102.4, "thud", 0.2), (104.2, "whoosh", 0.3), (106.0, "pop", 0),
    # Part 2
    (115.4, "zap", 0), (119.2, "whoosh", 0), (119.5, "ding", 0), (124.6, "pop", -0.4), (124.9, "pop", 0.4), (126.6, "drums", 0),
    (132.2, "whoosh", 0), (133.0, "thud", 0),
    (141.0, "bang", -0.3), (142.2, "gunshot", 0), (143.2, "bang", 0.2), (144.8, "gunshot", 0.3), (146.1, "bang", -0.2), (147.5, "gunshot", 0.1), (148.4, "ding", 0),
    (149.4, "chaching", 0.4), (152.8, "horn", 0.3),
    (156.4, "whoosh", 0), (158.2, "whoosh", -0.3), (158.5, "ding", 0), (161.2, "horn", 0),
    (168.4, "whoosh", 0), (170.4, "pop", 0.2), (172.6, "bang", 0), (172.7, "thud", 0),
    (177.4, "whoosh", 0), (181.6, "ding", 0), (186.4, "bang", -0.4), (187.0, "bang", -0.1), (188.0, "gunshot", 0.3), (188.6, "bang", 0.1),
    (189.2, "gunshot", 0.3), (189.5, "gunshot", 0.4), (192.2, "ding", 0),
    (200.6, "zap", 0),
    # Part 3
    (205.2, "whoosh", 0), (205.5, "ding", 0), (210.4, "thud", 0), (213.2, "boing", 0), (216.0, "whoosh", 0), (216.4, "clink", 0),
    (219.7, "ding", 0), (220.6, "pop", 0.4), (222.4, "pop", -0.4), (222.9, "pop", -0.4), (223.4, "pop", -0.4), (225.2, "pop", 0.4),
    (225.7, "pop", 0.4), (226.2, "pop", 0.3), (226.7, "pop", 0.4), (222.0, "horn", 0),
    (230.7, "ding", 0), (231.2, "whoosh", 0), (237.4, "thud", 0),
    (243.4, "whoosh", -0.3), (244.4, "whoosh", 0.3), (247.6, "pop", 0),
    (255.4, "thud", 0), (258.6, "thud", 0), (261.8, "thud", 0),
    (271.0, "harp", 0),
]


def music_env(T):
    if 42.4 <= T < 45.5:          # chapter card: let it breathe
        return 1.0
    if 100.8 <= T < 115:          # threat build-up
        return 0.7
    if 119.2 <= T < 123.4:        # chapter 2 card
        return 1.0
    if 168.4 <= T < 181.4:        # the mine strike: let it breathe
        return 0.45
    if 205.2 <= T < 209.4:        # chapter 3 card
        return 1.0
    if T >= 266:                  # quiet ending
        return 0.6
    return 0.8


def _register_sfx():
    def jet():
        d = 3.6
        t = AU.t_(d)
        x = AU.lp(AU.noise(d), 700) * 1.0 + 0.5 * AU.bp(AU.noise(d), 900, 2600)
        return AU.norm(x * np.sin(np.pi * t / d) ** 1.5, 0.9)

    def rumble():
        d = 2.2
        t = AU.t_(d)
        return AU.norm(AU.lp(AU.noise(d), 160, 3) * np.sin(np.pi * t / d), 0.9)

    def drip():
        d = 0.25
        t = AU.t_(d)
        f = 1400 + 900 * np.exp(-t * 40)
        return AU.norm(AU.chirp_sine(f, d) * AU.env_exp(d, 30), 0.35)

    AU.SFX.update(jet=jet, rumble=rumble, drip=drip)
    AU.GAIN.update(jet=0.8, rumble=0.8, drip=0.5)


def probe(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                 "default=nw=1:nk=1", path], capture_output=True, text=True).stdout)


class Timeline:
    def __init__(self, use_vo=True):
        self.vo, self.words = {}, {}
        if use_vo:
            for bid, *_ in BEATS:
                hits = [h for h in sorted(glob.glob(os.path.join(VO_DIR, f"{bid:02d}*")))
                        if h.lower().endswith((".mp3", ".wav", ".m4a", ".ogg"))]
                if hits:
                    self.vo[bid] = (hits[0], probe(hits[0]))
            tj = os.path.join(VO_DIR, "timing.json")
            if self.vo and os.path.exists(tj):
                self.words = {int(k): v for k, v in json.load(open(tj)).items()}
        start = PART_START.get(PART, BEATS[0][1])
        knots, t = [(0.0, start)], 0.0
        self.real = []
        prev_e = start
        for bid, s, e in BEATS:
            if s > prev_e + 1e-6:          # silent chapter card between beats
                t += s - prev_e
                knots.append((t, s))
            prev_e = e
            if bid in self.vo:
                dur = max(self.vo[bid][1] + VO_DELAY + VO_TAIL, (e - s) * 0.45)
            else:
                dur = (e - s) * (0.4 if self.vo else 1.0)   # line missing from the take: keep the visual short
            self.real.append((bid, t, t + dur))
            ks = []
            for ab, w, nth, tn in ANCHORS:
                if ab == bid and bid in self.words:
                    hits = [x for x in self.words[bid] if x[0] == w]
                    if len(hits) > nth:
                        ks.append((t + VO_DELAY + hits[nth][1], tn))
            lr, ln = knots[-1]
            for r, n in sorted(ks):
                if r > lr + 0.05 and n > ln + 0.05 and r < t + dur - 0.05 and n < e - 0.05:
                    knots.append((r, n)); lr, ln = r, n
            knots.append((t + dur, e)); t += dur
        self.duration = t
        self.kr, self.kn = np.array([k[0] for k in knots]), np.array([k[1] for k in knots])

    def nominal(self, tr): return float(np.interp(tr, self.kr, self.kn))
    def to_real(self, tn): return float(np.interp(tn, self.kn, self.kr))
    def vo_events(self): return [(rs + VO_DELAY, self.vo[b][0]) for b, rs, re in self.real if b in self.vo]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--no-vo", action="store_true"); ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--part", type=int, default=1)
    a = ap.parse_args()
    global BEATS, PART
    PART = a.part
    BEATS = BEATS_BY_PART[a.part]
    lo_t, hi_t = PART_START[a.part], BEATS[-1][2]
    subprocess.run([sys.executable, os.path.join(HERE, "build_html.py")], check=True)
    _register_sfx()
    tl = Timeline(not a.no_vo)
    print(f"duration {tl.duration:.2f}s, VO lines: {len(tl.vo)}/{len(BEATS)}")
    n = int(round(tl.duration * FPS))
    frames = [round(tl.nominal(i / FPS), 4) for i in range(n)]
    seg = os.path.join(OUT, "segments"); shutil.rmtree(seg, ignore_errors=True); os.makedirs(seg)
    fj = os.path.join(seg, "frames.json"); json.dump(frames, open(fj, "w"))
    t0 = time.time()
    env = dict(os.environ, NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    subprocess.run(["node", os.path.join(HERE, "render.cjs"), "video", fj, seg, str(a.workers)], check=True, env=env)
    segs = sorted(glob.glob(os.path.join(seg, "seg*.mp4")))
    with open(os.path.join(seg, "list.txt"), "w") as f:
        f.writelines(f"file '{os.path.basename(s)}'\n" for s in segs)
    silent = os.path.join(seg, "silent.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(seg, "list.txt"), "-c", "copy", silent], check=True)
    wav = os.path.join(seg, "mix.wav")
    AU.mix(tl.duration, [(tl.to_real(t), nm, pan) for t, nm, pan in SFX_CUES if lo_t <= t < hi_t], tl.vo_events(),
           lambda tr: music_env(tl.nominal(tr)), wav, music_gain=0.14 if tl.vo else 0.18)
    stem = "hormuz_full" if a.part == 0 else f"hormuz_part{a.part}"
    name = f"{stem}.mp4" if tl.vo else f"{stem}_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
