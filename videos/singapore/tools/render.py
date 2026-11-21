"""Render the Singapore short to MP4 (video via headless Chromium, audio procedural + voice).

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

BEATS = [(1, 0, 12.0), (2, 12.0, 28.4), (3, 28.4, 40.6), (4, 40.6, 56.0), (5, 56.0, 70.0), (6, 70.0, 85.0)]
ANCHORS = [
    (1, "war", 0, 1.6), (1, "revolution", 0, 2.4), (1, "treaty", 0, 3.2), (1, "singapore", 0, 5.4), (1, "kicked", 0, 8.2),
    (2, "british", 0, 12.4), (2, "federation", 0, 15.0), (2, "busiest", 0, 20.4), (2, "resources", 0, 25.2),
    (3, "tensions", 0, 31.0), (3, "economic", 0, 34.6), (3, "representation", 0, 35.8), (3, "power", 0, 37.2),
    (4, "riots", 0, 41.0), (4, "trust", 0, 45.0), (4, "parliament", 0, 48.6), (4, "unanimous", 0, 50.4), (4, "expelling", 0, 52.3),
    (5, "hours", 0, 56.0), (5, "tears", 0, 60.1), (5, "water", 0, 64.4), (5, "resources", 0, 65.8), (5, "army", 0, 67.2),
    (6, "doubted", 0, 70.4), (6, "strategy", 0, 74.0), (6, "transformed", 0, 79.4), (6, "richest", 0, 81.2),
]
VO_DELAY, VO_TAIL = 0.06, 0.25
END_HOLD = 2.0

SFX_CUES = [
    (0.3, "whoosh", 0), (1.6, "pop", -0.3), (2.4, "pop", 0), (3.2, "pop", 0.3), (5.4, "ding", 0), (8.2, "thud", 0), (8.25, "slap", 0),
    (12.4, "whoosh", 0), (14.6, "ding", 0), (15.0, "chaching", 0), (19.6, "horn", 0.2), (24.6, "pop", -0.3), (25.2, "pop", 0), (25.8, "pop", 0.3),
    (29.0, "whoosh", 0), (31.0, "zap", 0), (34.6, "pop", 0), (35.8, "pop", 0), (37.2, "pop", 0),
    (41.0, "crickets", 0), (41.2, "thud", 0), (45.0, "zap", 0), (48.6, "whoosh", 0), (50.4, "slap", 0), (52.3, "thud", 0), (52.35, "bang", 0),
    (53.0, "ding", 0), (56.0, "whoosh", 0), (63.0, "whoosh", 0), (64.4, "pop", 0), (65.8, "pop", 0), (67.2, "pop", 0),
    (70.2, "scratch", 0), (73.4, "whoosh", 0), (74.4, "cannon", 0.3), (79.2, "whoosh", 0), (79.6, "chaching", 0), (81.2, "harp", 0),
]


def music_env(T):
    if 56.0 <= T < 70.0:      # Lee's tears + alone: quiet, somber
        return 0.4
    if 70.2 <= T < 71.0:
        return 0.0
    return 0.85


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
        knots, t = [(0.0, 0.0)], 0.0
        self.real = []
        for bid, s, e in BEATS:
            dur = max(self.vo[bid][1] + VO_DELAY + VO_TAIL, (e - s) * 0.45) if bid in self.vo else e - s
            if bid in self.vo and bid == BEATS[-1][0]:
                dur += END_HOLD          # let the final scene breathe after the last word
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
    a = ap.parse_args()
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
    AU.mix(tl.duration, [(tl.to_real(t), nm, pan) for t, nm, pan in SFX_CUES], tl.vo_events(),
           lambda tr: music_env(tl.nominal(tr)), wav, music_gain=0.14 if tl.vo else 0.18)
    name = "singapore.mp4" if tl.vo else "singapore_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
