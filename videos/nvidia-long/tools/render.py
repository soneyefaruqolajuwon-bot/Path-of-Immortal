"""Render the Canada long-form to MP4 (video via headless Chromium, audio procedural + voice).

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

BEATS = [(1, 0, 12.58), (2, 12.58, 23.51), (3, 23.51, 31.12), (4, 31.12, 39.59), (5, 39.59, 49.87), (6, 49.87, 64.48), (7, 64.48, 82.18), (8, 82.18, 89.14), (9, 89.14, 101.27), (10, 101.27, 115.54), (11, 115.54, 127.46), (12, 127.46, 139.02), (13, 139.02, 150.39), (14, 150.39, 171.46), (15, 171.46, 175.44), (16, 175.44, 192.85), (17, 192.85, 201.95), (18, 201.95, 211.34), (19, 211.34, 223.49)]   # last beat includes END_HOLD
ANCHORS = []            # storyboard built on the voiceover's own clock (incl. 1.3 s breathers)
VO_DELAY, VO_TAIL = 0.06, 1.1
END_HOLD = 6.0          # end card: question + subscribe + Mapheld seal

SFX_CUES = [
    (0.1, "whoosh", 0), (4.3, "slap", 0), (4.5, "whoosh", -0.4), (9.6, "thud", 0), (12.7, "scribble", 0), (14.1, "ding", 0),
    (15.9, "whoosh", 0), (16.5, "zap", 0), (19.5, "pop", 0), (20.6, "scribble", 0),
    (23.5, "whoosh", 0), (25.2, "boing", -0.4), (32.0, "pop", 0), (33.4, "whoosh", 0), (34.3, "pop", 0), (36.4, "chaching", 0), (37.8, "horn", 0),
    (39.6, "whoosh", 0), (42.2, "thud", 0), (42.3, "boing", 0), (43.5, "pop", 0.4), (44.3, "slap", 0), (47.4, "slap", 0),
    (50.0, "whoosh", 0), (52.0, "pop", 0), (54.5, "pop", 0), (55.5, "pop", -0.2), (56.3, "pop", 0.2), (57.1, "pop", 0), (57.7, "ding", 0), (60.0, "pop", 0), (60.7, "pop", 0), (61.5, "pop", 0), (61.9, "zap", 0),
    (64.6, "pop", 0.4), (65.2, "clink", 0.4), (65.9, "zap", 0.4), (66.9, "slap", 0.4), (67.8, "ding", 0), (70.6, "pop", 0), (72.3, "whoosh", 0), (72.8, "zap", 0),
    (78.7, "slap", 0.2), (79.3, "slap", 0.3), (80.3, "slap", 0.4),
    (82.3, "whoosh", 0), (82.5, "pop", -0.3), (83.3, "slap", -0.2), (83.6, "pop", 0.4), (84.4, "whoosh", 0.3), (85.5, "pop", 0.2),
    (89.2, "whoosh", 0), (89.7, "pop", 0), (90.2, "pop", 0.2), (90.7, "pop", -0.2), (95.3, "ding", 0.4), (97.9, "ding", 0.4),
    (101.4, "whoosh", 0), (102.8, "pop", 0), (106.8, "chaching", 0), (110.0, "pop", 0), (113.7, "ding", 0),
    (115.7, "whoosh", 0), (116.8, "pop", -0.4), (119.6, "scribble", 0), (122.7, "pop", 0), (124.5, "pop", 0),
    (127.6, "whoosh", 0), (129.4, "slap", 0), (134.3, "zap", 0), (139.1, "ding", 0), (143.6, "scribble", 0), (144.5, "slap", 0), (146.6, "drums", 0),
    (150.5, "whoosh", 0), (151.0, "slap", 0), (152.2, "pop", 0), (155.6, "pop", 0.4), (156.6, "clink", 0.4), (157.2, "clink", 0.4), (157.8, "clink", 0.4), (158.4, "clink", 0.4), (160.3, "zap", 0),
    (164.4, "slap", 0), (164.6, "slap", 0.2), (166.5, "drums", 0), (167.7, "slap", 0.3), (168.3, "slap", 0.3), (169.0, "slap", 0.3), (169.6, "slap", 0.3),
    (171.5, "whoosh", 0), (173.7, "zap", 0),
    (175.6, "drums", 0), (177.2, "whoosh", 0), (181.0, "pop", 0), (181.6, "pop", 0), (182.2, "pop", 0), (184.6, "slap", -0.4), (186.6, "ding", 0), (189.8, "pop", 0.4), (190.0, "horn", 0),
    (192.9, "whoosh", 0), (194.6, "pop", 0), (196.9, "hammer", 0.2), (197.3, "hammer", 0.2), (197.7, "hammer", 0.2), (198.2, "pop", -0.3), (199.4, "clink", -0.3),
    (202.0, "whoosh", 0), (205.0, "zap", -0.4), (206.4, "whoosh", 0), (207.0, "pop", 0),
    (211.4, "whoosh", 0), (212.6, "rumble", 0), (214.2, "boing", 0), (214.5, "boing", 0.2),
    (217.1, "whoosh", 0), (217.8, "ding", 0), (218.2, "pop", 0),
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

    AU.SFX.update(jet=jet, rumble=rumble, drip=drip)
    AU.GAIN.update(jet=0.22, rumble=0.6, drip=0.5)   # the plane is a background swish, never louder than the voice


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
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "96k", os.path.join(R, "dist", "mix.mp3")], check=True)
    subprocess.run([sys.executable, os.path.join(HERE, "build_html.py")], check=True)
    name = "nvidia_long.mp4" if tl.vo else "nvidia_long_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
