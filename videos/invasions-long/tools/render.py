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

BEATS = [(1, 0, 15.06), (2, 15.06, 19.14), (3, 19.14, 42.64), (4, 42.64, 46.23), (5, 46.23, 65.28), (6, 65.28, 77.67), (7, 77.67, 81.42), (8, 81.42, 101.18), (9, 101.18, 105.19), (10, 105.19, 124.95), (11, 124.95, 138.64), (12, 138.64, 142.68), (13, 142.68, 163.12), (14, 163.12, 168.19), (15, 168.19, 194.22), (16, 194.22, 210.66)]   # last beat includes END_HOLD
ANCHORS = []            # storyboard built on the voiceover's own clock (incl. 1.3 s breathers)
VO_DELAY, VO_TAIL = 0.06, 1.1
END_HOLD = 6.0          # end card: question + subscribe + Mapheld seal

SFX_CUES = [
    (0.2, "whoosh", 0), (4.7, "pop", -0.3), (4.95, "pop", 0), (5.2, "pop", 0.3), (5.45, "pop", -0.2), (5.7, "pop", 0.2), (9.4, "thud", 0), (12.2, "ding", 0),
    (15.06, "whoosh", 0), (15.21, "drums", 0), (15.46, "thud", 0), (19.3, "ding", 0), (22.5, "thud", 0), (26.6, "bang", 0), (27.5, "bang", 0.2), (28.7, "boing", 0), (31.0, "whoosh", 0), (31.6, "bang", 0), (33.1, "drums", 0), (38.9, "pop", 0), (40.5, "ding", 0),
    (42.64, "whoosh", 0), (42.79, "drums", 0), (43.04, "thud", 0), (47.8, "pop", 0), (49.6, "ding", 0), (51.8, "pop", 0), (53.9, "slap", 0), (54.6, "thud", 0), (58.6, "whoosh", 0), (60.3, "drums", 0), (63.0, "slap", 0), (65.3, "pop", 0), (66.8, "boing", 0), (69.7, "whoosh", 0), (72.0, "pop", 0), (74.4, "ding", 0),
    (77.67, "whoosh", 0), (77.82, "drums", 0), (78.07, "thud", 0), (83.6, "thud", 0), (85.0, "drums", 0), (88.4, "pop", 0), (92.1, "ding", 0), (92.2, "boing", 0.2), (96.4, "slap", 0),
    (101.18, "whoosh", 0), (101.33, "drums", 0), (101.58, "thud", 0), (105.3, "thud", 0), (109.9, "drums", 0), (113.0, "pop", 0), (114.6, "slap", 0), (116.5, "pop", 0), (118.6, "whoosh", 0), (121.8, "ding", 0), (125.0, "whoosh", 0), (127.4, "thud", 0), (132.6, "bang", 0), (134.0, "slap", 0),
    (138.64, "whoosh", 0), (138.79, "drums", 0), (139.04, "thud", 0), (142.8, "thud", 0), (146.1, "whoosh", 0), (151.9, "rumble", 0), (156.4, "bang", 0), (159.7, "harp", 0),
    (163.12, "whoosh", 0), (163.27, "drums", 0), (163.52, "thud", 0), (168.3, "thud", 0), (170.6, "pop", 0), (174.0, "rumble", 0), (177.2, "whoosh", 0), (188.1, "bang", 0), (189.0, "thud", 0),
    (194.3, "whoosh", 0), (197.0, "ding", 0), (199.0, "thud", 0), (201.7, "boing", 0), (204.7, "whoosh", 0), (205.6, "pop", 0), (206.9, "slap", 0),
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
    name = "invasions_long.mp4" if tl.vo else "invasions_long_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
