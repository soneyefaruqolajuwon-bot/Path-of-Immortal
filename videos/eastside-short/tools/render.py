"""Render the east-side short to MP4 (video via headless Chromium, audio procedural + voice).

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

BEATS = [(1, 0, 7.02), (2, 7.02, 12.87), (3, 12.87, 19.24), (4, 19.24, 27.81), (5, 27.81, 33.65), (6, 33.65, 38.12), (7, 38.12, 44.8), (8, 44.8, 50.42)]   # last beat includes END_HOLD (1.5 s card + glide back to frame 1)
ANCHORS = []            # storyboard built on the voiceover's own clock
VO_DELAY, VO_TAIL = 0.06, 0.25
END_HOLD = 2.2          # ~1.5 s card (question already on screen during the last line) + 0.7 s glide into frame 1

SFX_CUES = [
    (0.05, "pop", 0), (1.73, "pop", -0.3), (2.29, "pop", -0.3), (3.02, "chaching", -0.3), (4.8, "clink", 0.3), (5.27, "thud", 0.3), (5.98, "pop", 0.3),
    (7.4, "whoosh", 0), (8.5, "pop", 0), (8.8, "pop", 0), (9.1, "pop", 0), (9.4, "pop", 0), (9.7, "pop", 0), (10.5, "ding", 0), (11.85, "pop", 0),
    (12.95, "boing", 0), (13.3, "zap", 0), (17.25, "whoosh", 0), (18.34, "ding", 0), (18.4, "jet", 0),
    (19.2, "whoosh", 0), (19.3, "pop", 0), (21.4, "rumble", 0), (23.2, "jet", 0), (26.5, "pop", 0),
    (28.0, "pop", -0.3), (29.5, "whoosh", -0.3), (30.4, "harp", -0.3), (31.3, "pop", 0.3), (31.8, "slap", 0.3), (32.6, "thud", 0.3),
    (33.65, "whoosh", 0), (33.8, "pop", 0), (35.4, "boing", 0.3), (35.8, "whoosh", 0.2), (36.4, "slap", -0.3),
    (38.1, "whoosh", 0), (38.6, "zap", 0), (39.9, "pop", 0), (42.25, "ding", 0),
    (43.9, "whoosh", 0), (45.0, "pop", 0), (47.1, "jet", -0.3), (47.15, "ding", 0), (48.2, "whoosh", 0), (49.75, "whoosh", 0),
    (14.75, "tick", 0), (14.87, "tick", 0), (14.99, "tick", 0), (15.11, "tick", 0), (15.23, "tick", 0), (15.35, "tick", 0), (15.47, "tick", 0), (15.59, "tick", 0), (15.71, "tick", 0), (15.83, "tick", 0), (15.95, "tick", 0),
    (41.45, "tick", 0), (41.54, "tick", 0), (41.63, "tick", 0), (41.72, "tick", 0), (41.81, "tick", 0), (41.9, "tick", 0), (41.99, "tick", 0), (42.08, "tick", 0), (42.17, "tick", 0),
]


def music_env(T):
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

    def tick():
        d = 0.03
        t = AU.t_(d)
        return AU.norm(AU.bp(AU.noise(d), 2500, 6000) * AU.env_exp(d, 120), 0.5)

    AU.SFX.update(jet=jet, rumble=rumble, drip=drip, tick=tick)
    AU.GAIN.update(jet=0.22, rumble=0.8, drip=0.5, tick=0.35)   # the plane is a background swish, never louder than the voice


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
           lambda tr: music_env(tl.nominal(tr)), wav, music_gain=0.14 if tl.vo else 0.18, sfx_duck=0.6)
    loud = os.path.join(seg, "mix_loud.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", loud], check=True)
    wav = loud
    name = ("eastside_short_tiktok.mp4" if os.environ.get("TIKTOK") == "1" else "eastside_short.mp4") if tl.vo else "darien_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
