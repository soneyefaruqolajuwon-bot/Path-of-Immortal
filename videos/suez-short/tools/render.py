"""Render the Suez (one stuck ship) short to MP4 (video via headless Chromium, audio procedural + voice).

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

BEATS = [(1, 0, 4.57), (2, 4.57, 10.55), (3, 10.55, 15.43), (4, 15.43, 27.02), (5, 27.02, 32.95), (6, 32.95, 40.97), (7, 40.97, 48.9), (8, 48.9, 53.44), (9, 53.44, 64.94)]   # last beat includes END_HOLD (1.5 s card + glide back to frame 1)
ANCHORS = []            # storyboard built on the voiceover's own clock
VO_DELAY, VO_TAIL = 0.06, 0.25
END_HOLD = 2.2          # ~1.5 s card (question already on screen during the last line) + 0.7 s glide into frame 1

SFX_CUES = [
    (0.05, "whoosh", 0), (2.4, "pop", 0), (5.85, "thud", 0), (6.76, "slap", 0), (7.7, "zap", 0),
    (10.8, "pop", -0.3), (11.1, "zap", -0.3), (11.75, "pop", 0.3), (12.0, "zap", 0.3), (12.65, "whoosh", 0), (12.95, "ding", 0), (13.0, "jet", 0),
    (15.5, "whoosh", 0), (15.7, "pop", 0), (17.3, "thud", 0), (17.9, "pop", 0), (19.5, "whoosh", 0), (21.35, "jet", -0.3), (22.3, "rumble", 0), (24.12, "thud", 0.3), (25.55, "thud", -0.3), (26.1, "slap", 0),
    (27.1, "whoosh", 0), (28.0, "pop", -0.3), (28.5, "boing", 0.3), (29.2, "scratch", 0.3), (30.0, "scratch", 0.3),
    (33.0, "whoosh", 0), (34.0, "horn", 0), (36.3, "pop", 0), (38.6, "slap", 0), (38.9, "horn", -0.3), (39.2, "horn", 0.3), (40.0, "thud", 0),
    (41.0, "whoosh", 0), (41.3, "pop", 0), (45.1, "chaching", 0), (47.45, "ding", 0),
    (48.95, "whoosh", 0), (50.2, "rumble", 0), (51.3, "horn", 0.3), (52.75, "ding", 0), (52.8, "harp", 0),
    (53.5, "whoosh", 0), (55.4, "whoosh", 0), (59.05, "pop", 0), (60.45, "ding", 0), (62.3, "whoosh", 0), (63.9, "whoosh", 0),
    (0.75, "tick", 0), (0.84, "tick", 0), (0.93, "tick", 0), (1.02, "tick", 0), (1.11, "tick", 0), (1.2, "tick", 0), (1.29, "tick", 0), (1.38, "tick", 0), (1.47, "tick", 0),
    (7.6, "tick", 0), (7.69, "tick", 0), (7.78, "tick", 0), (7.87, "tick", 0), (7.96, "tick", 0), (8.05, "tick", 0), (8.14, "tick", 0), (8.23, "tick", 0), (8.32, "tick", 0),
    (30.8, "tick", 0), (30.92, "tick", 0), (31.04, "tick", 0), (31.16, "tick", 0), (31.28, "tick", 0), (31.4, "tick", 0), (31.52, "tick", 0), (31.64, "tick", 0), (31.76, "tick", 0), (31.88, "tick", 0),
    (42.2, "tick", 0), (42.28, "tick", 0), (42.36, "tick", 0), (42.44, "tick", 0), (42.52, "tick", 0), (42.6, "tick", 0), (42.68, "tick", 0), (42.76, "tick", 0), (42.84, "tick", 0), (42.92, "tick", 0),
    (45.1, "tick", 0), (45.22, "tick", 0), (45.34, "tick", 0), (45.46, "tick", 0), (45.58, "tick", 0), (45.7, "tick", 0), (45.82, "tick", 0), (45.94, "tick", 0), (46.06, "tick", 0), (46.18, "tick", 0),
    (57.85, "tick", 0), (57.93, "tick", 0), (58.01, "tick", 0), (58.09, "tick", 0), (58.17, "tick", 0), (58.25, "tick", 0), (58.33, "tick", 0), (58.41, "tick", 0), (58.49, "tick", 0),
    (60.85, "tick", 0), (60.95, "tick", 0), (61.05, "tick", 0), (61.15, "tick", 0), (61.25, "tick", 0), (61.35, "tick", 0), (61.45, "tick", 0), (61.55, "tick", 0), (61.65, "tick", 0), (61.75, "tick", 0),
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
    name = ("suez_short_tiktok.mp4" if os.environ.get("TIKTOK") == "1" else "suez_short.mp4") if tl.vo else "darien_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
