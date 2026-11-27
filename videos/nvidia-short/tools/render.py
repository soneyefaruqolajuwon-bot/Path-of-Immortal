"""Render the Pheasant Island short to MP4 (video via headless Chromium, audio procedural + voice).

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

BEATS = [(1, 0, 4.83), (2, 4.83, 9.79), (3, 9.79, 18.85), (4, 18.85, 29.77), (5, 29.77, 34.65), (6, 34.65, 50.13), (7, 50.13, 59.64), (8, 59.64, 65.47)]   # last beat includes END_HOLD (1.5 s card + glide back to frame 1)
ANCHORS = []            # storyboard built on the voiceover's own clock
VO_DELAY, VO_TAIL = 0.06, 0.25
END_HOLD = 2.2          # ~1.5 s card (question already on screen during the last line) + 0.7 s glide into frame 1

SFX_CUES = [
    (0.05, "slap", 0), (0.6, "whoosh", 0.3), (1.25, "boing", 0), (2.25, "boing", -0.2), (3.25, "boing", 0.2), (4.0, "boing", 0), (4.7, "whoosh", 0),
    (5.3, "pop", 0), (6.2, "zap", 0), (7.6, "ding", 0),
    (9.9, "pop", 0), (10.4, "zap", 0), (11.45, "slap", 0), (12.4, "whoosh", 0), (13.08, "pop", 0), (13.64, "pop", 0), (14.3, "pop", 0), (15.2, "chaching", 0), (16.3, "zap", 0),
    (18.9, "whoosh", 0), (20.0, "pop", 0), (20.9, "ding", 0), (22.0, "pop", 0), (24.9, "scribble", 0), (27.6, "pop", 0),
    (29.8, "whoosh", 0), (30.0, "pop", 0), (30.9, "slap", 0), (31.4, "pop", 0), (32.4, "whoosh", 0.3), (33.6, "pop", 0.3),
    (34.7, "whoosh", 0), (35.75, "bang", 0), (36.6, "pop", 0), (38.3, "slap", 0), (41.8, "zap", 0), (44.9, "ding", 0), (47.6, "scribble", 0), (49.1, "slap", 0), (49.2, "chaching", 0),
    (50.2, "whoosh", 0), (52.6, "slap", 0), (54.3, "zap", 0), (55.65, "drums", 0), (56.8, "slap", 0), (57.4, "slap", 0), (58.0, "slap", 0), (58.65, "slap", 0),
    (59.7, "whoosh", 0), (60.5, "rumble", 0), (61.8, "boing", 0), (63.3, "whoosh", 0), (63.6, "ding", 0), (64.8, "whoosh", 0),
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
    AU.GAIN.update(jet=0.22, rumble=0.8, drip=0.5)   # the plane is a background swish, never louder than the voice


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
    name = ("nvidia_short_tiktok.mp4" if os.environ.get("TIKTOK") == "1" else "nvidia_short.mp4") if tl.vo else "nvidia_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
