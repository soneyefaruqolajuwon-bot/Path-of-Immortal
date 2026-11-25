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

BEATS = [(1, 0, 14.32), (2, 14.32, 33.26), (3, 33.26, 41.3), (4, 41.3, 52.48), (5, 52.48, 63.74), (6, 63.74, 71.55), (7, 71.55, 83.1), (8, 83.1, 93.05), (9, 93.05, 106.53), (10, 106.53, 116.12), (11, 116.12, 128.32), (12, 128.32, 138.69), (13, 138.69, 148.65), (14, 148.65, 160.04), (15, 160.04, 178.1)]
ANCHORS = []            # storyboard built on the voiceover's own clock (incl. 1.3 s breathers)
VO_DELAY, VO_TAIL = 0.06, 1.9
END_HOLD = 5.99         # subscribe card

SFX_CUES = [
    (0.2, "whoosh", 0), (1.4, "harp", 0), (4.0, "thud", 0), (5.8, "pop", 0), (10.9, "pop", -0.2), (11.8, "pop", 0.2),
    (14.4, "whoosh", 0), (17.8, "whoosh", 0), (19.3, "harp", 0), (22.4, "thud", 0), (24.5, "whistle", 0), (27.6, "pop", 0.3), (28.3, "pop", -0.3), (29.6, "ding", 0),
    (33.4, "whoosh", 0), (35.0, "rumble", 0), (38.2, "harp", 0), (42.0, "pop", 0), (44.2, "ding", 0), (48.6, "pop", 0),
    (52.6, "whoosh", 0), (54.2, "rumble", 0), (59.6, "pop", 0), (63.9, "whoosh", 0), (67.5, "drip", 0), (71.6, "pop", 0), (73.15, "clink", 0), (74.8, "slap", 0), (76.3, "pop", 0), (77.7, "pop", 0), (79.2, "pop", 0),
    (83.2, "whoosh", 0), (85.7, "clink", 0), (87.2, "pop", 0), (90.0, "boing", 0),
    (93.2, "whoosh", 0), (96.7, "bang", 0), (97.8, "bang", 0.3), (99.4, "drip", 0), (101.8, "whistle", 0), (107.0, "whoosh", 0), (109.3, "harp", 0), (112.0, "thud", 0), (113.4, "thud", 0.3),
    (116.3, "whoosh", 0), (117.4, "harp", 0), (120.6, "pop", 0), (124.0, "chaching", 0), (128.4, "whoosh", 0), (133.4, "harp", 0),
    (138.8, "whoosh", 0), (141.6, "hammer", 0), (142.5, "hammer", 0.3), (148.8, "whoosh", 0), (154.3, "pop", 0), (156.4, "harp", 0),
    (160.2, "whoosh", 0), (163.8, "pop", 0), (167.0, "drums", 0), (172.1, "whoosh", 0), (173.0, "ding", 0),
]


def music_env(T):
    if 128.3 <= T < 138.7:
        return 0.55      # the Indigenous history beat: quieter, respectful
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
    name = "canada_part2.mp4" if tl.vo else "canada_part2_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
