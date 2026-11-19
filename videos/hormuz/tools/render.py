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
}
BEATS = BEATS_BY_PART[1]
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
]
VO_DELAY, VO_TAIL = 0.06, 0.3

SFX_CUES = [
    (0.3, "whoosh", 0), (4.4, "ding", 0), (7.5, "whoosh", 0), (12.0, "ding", 0), (13.0, "pop", 0.4),
    (18.6, "thud", 0), (22.2, "zap", 0), (28.0, "boing", 0.4), (34.6, "horn", 0.3),
    (42.4, "whoosh", 0), (42.7, "ding", 0), (46.6, "whoosh", 0),
    (53.4, "pop", -0.4), (54.6, "pop", -0.4), (55.6, "pop", -0.3), (56.6, "pop", 0), (57.6, "pop", 0.2), (58.8, "pop", 0.2), (60.4, "chaching", 0),
    (65.6, "whoosh", 0), (68.4, "thud", 0.3), (77.2, "whoosh", 0), (78.4, "ding", 0.3), (90.2, "ding", 0),
    (101.4, "thud", -0.3), (102.4, "thud", 0.2), (104.2, "whoosh", 0.3), (106.0, "pop", 0),
]


def music_env(T):
    if 42.4 <= T < 45.5:          # chapter card: let it breathe
        return 1.0
    if T >= 100.8:                # threat build-up
        return 0.7
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
        knots, t = [(0.0, BEATS[0][1])], 0.0
        self.real = []
        prev_e = BEATS[0][1]
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
    global BEATS
    BEATS = BEATS_BY_PART[a.part]
    lo_t, hi_t = BEATS[0][1], BEATS[-1][2]
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
    name = f"hormuz_part{a.part}.mp4" if tl.vo else f"hormuz_part{a.part}_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
