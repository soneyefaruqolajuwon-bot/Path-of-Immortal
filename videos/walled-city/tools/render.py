"""Render the Kowloon Walled City short to MP4 (video via headless Chromium, audio procedural + voice).

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

BEATS = [(1, 0, 8), (2, 8, 21), (3, 21, 36), (4, 36, 51), (5, 51, 65), (6, 65, 77), (7, 77, 85)]
# (beat, spoken word, nth occurrence, storyboard time) — visual beats land on these words
ANCHORS = [
    (1, "neither", 0, 3.1), (1, "wildest", 0, 5.7),
    (2, "eighteen", 0, 8.6), (2, "leased", 0, 10.0), (2, "left", 0, 12.6), (2, "loophole", 0, 15.7),
    (2, "taxes", 0, 18.3), (2, "building", 0, 19.3), (2, "police", 0, 20.3),
    (3, "never", 0, 24.1), (3, "hundred", 0, 26.0), (3, "sunlight", 0, 31.0), (3, "umbrellas", 0, 33.5),
    (4, "thirty", 0, 36.4), (4, "football", 0, 39.6), (4, "planes", 0, 42.2), (4, "dentists", 0, 46.2), (4, "gangs", 0, 48.5),
    (5, "movie", 0, 51.8), (5, "families", 0, 54.3), (5, "nineteen", 0, 59.4), (5, "far", 0, 62.4),
    (6, "compensated", 0, 65.4), (6, "cleared", 0, 68.6), (6, "tore", 0, 70.0), (6, "nineteen", 0, 72.4),
    (7, "park", 0, 77.8), (7, "nothing", 0, 81.2),
]
VO_DELAY, VO_TAIL = 0.06, 0.25

# sparse on purpose: let the dramatic moments breathe
SFX_CUES = [
    (0.9, "pop", 0), (1.0, "ding", 0), (3.4, "pop", -0.3), (3.7, "pop", 0.3),
    (8.3, "whoosh", 0), (8.6, "ding", 0), (10.3, "pop", -0.3), (13.4, "whoosh", 0),
    (15.4, "thud", 0), (16.0, "pop", -0.3), (16.6, "pop", 0.3),
    (18.3, "thud", -0.3), (19.3, "thud", 0), (20.2, "thud", 0.3),
    (21.4, "rumble", 0), (24.2, "rumble", 0), (26.0, "ding", 0),
    (30.4, "whoosh", 0), (31.6, "drip", -0.3), (32.9, "drip", 0.3), (34.3, "drip", 0),
    (36.4, "ding", 0), (39.6, "pop", 0), (42.0, "jet", 0.2),
    (46.0, "whoosh", 0), (46.3, "pop", -0.3), (46.9, "pop", 0.3), (47.5, "pop", 0),
    (51.2, "whoosh", 0), (59.3, "whoosh", 0), (60.4, "hammer", 0),
    (65.4, "chaching", 0), (68.4, "whoosh", 0.4), (70.0, "bang", 0), (70.05, "rumble", 0), (71.3, "thud", 0),
    (72.4, "ding", 0), (77.2, "harp", 0), (81.0, "whoosh", 0), (83.4, "pop", 0),
]


def music_env(T):
    if 30.4 <= T < 36.0 or 46.0 <= T < 51.0:   # inside the alleys: music drops back
        return 0.45
    if 51.2 <= T < 54.2:                         # 'dystopian movie' beat
        return 0.6
    if 69.8 <= T < 73.6:                         # demolition: let the rumble carry it
        return 0.3
    if T >= 77.0:                                # quiet park ending
        return 0.55
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
    name = "walled_city.mp4" if tl.vo else "walled_city_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
