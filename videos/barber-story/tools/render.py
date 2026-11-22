"""Render the "Don't scroll" portfolio ad to MP4 (video via headless Chromium, audio procedural + voice).

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

BEATS = [(1, 0, 2.43), (2, 2.43, 8.98), (3, 8.98, 14.15), (4, 14.15, 16.86), (5, 16.86, 22.8), (6, 22.8, 26.5)]
ANCHORS = [(2, "two", 0, 4.15), (2, "three", 0, 6.19), (2, "cat", 0, 8.14), (3, "lion", 0, 12.76), (4, "blows", 0, 15.38),
           (5, "line", 0, 17.9), (5, "landlord", 0, 20.25), (6, "impossible", 0, 24.4)]
VO_DELAY, VO_TAIL = 0.04, 0.2
END_HOLD = 1.3
MIN_FRAC = 0.85

SFX_CUES = [
    (0.12, "thud", 0), (0.15, "slap", 0), (1.0, "ding", 0), (2.45, "whoosh", 0), (3.1, "boing", 0), (4.0, "whoosh", 0), (5.1, "whoosh", 0.3),
    (5.2, "pop", 0.4), (6.0, "whoosh", 0), (6.55, "pop", 0.3), (8.1, "boing", 0), (9.0, "whoosh", 0), (10.5, "scribble", 0), (12.7, "scribble", 0),
    (13.1, "pop", 0), (14.2, "harp", 0), (15.3, "chaching", 0), (15.8, "ding", 0), (16.95, "whoosh", 0), (17.9, "drums", 0), (18.6, "whoosh", 0),
    (20.25, "horn", 0), (20.25, "thud", 0), (20.7, "pop", 0.3), (22.85, "whoosh", 0), (23.1, "ding", 0), (25.4, "pop", 0),
]


def music_env(T):
    if 2.4 <= T < 9.0:
        return 0.6       # the sad days
    return 0.9


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

    def drop():          # slow-motion bass drop: a sub sweep with a soft tail
        d = 1.6
        t = AU.t_(d)
        f = 32 + 80 * np.exp(-t * 3.2)
        return AU.norm(AU.chirp_sine(f, d) * np.exp(-t * 2.2) * (1 - np.exp(-t * 60)), 0.9)

    def drip():
        d = 0.25
        t = AU.t_(d)
        f = 1400 + 900 * np.exp(-t * 40)
        return AU.norm(AU.chirp_sine(f, d) * AU.env_exp(d, 30), 0.35)

    AU.SFX.update(jet=jet, rumble=rumble, drip=drip, drop=drop)
    AU.GAIN.update(drop=0.9, jet=0.22, rumble=0.8, drip=0.5)


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
            dur = max(self.vo[bid][1] + VO_DELAY + VO_TAIL, (e - s) * MIN_FRAC) if bid in self.vo else e - s
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
    ap = argparse.ArgumentParser(); ap.add_argument("--no-vo", action="store_true"); ap.add_argument("--workers", type=int, default=4); ap.add_argument("--vertical", action="store_true"); ap.add_argument("--youtube", action="store_true", help="end on LINK ON MY CHANNEL (YouTube has no bio link)"); ap.add_argument("--bio", action="store_true"); ap.add_argument("--full", action="store_true", help="9:16 with the whole 16:9 scene visible")
    a = ap.parse_args()
    subprocess.run([sys.executable, os.path.join(HERE, "build_html.py")] + (["youtube"] if a.youtube else []), check=True)
    _register_sfx()
    tl = Timeline(not a.no_vo)
    print(f"duration {tl.duration:.2f}s, VO lines: {len(tl.vo)}/{len(BEATS)}")
    n = int(round(tl.duration * FPS))
    frames = [round(tl.nominal(i / FPS), 4) for i in range(n)]
    seg = os.path.join(OUT, "segments"); shutil.rmtree(seg, ignore_errors=True); os.makedirs(seg)
    fj = os.path.join(seg, "frames.json"); json.dump(frames, open(fj, "w"))
    t0 = time.time()
    env = dict(os.environ, YT="1" if a.youtube else "0", BIO="0", VERTICAL="full" if a.full else "1" if a.vertical else "0", NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    subprocess.run(["node", os.path.join(HERE, "render.cjs"), "video", fj, seg, str(a.workers)], check=True, env=env)
    segs = sorted(glob.glob(os.path.join(seg, "seg*.mp4")))
    with open(os.path.join(seg, "list.txt"), "w") as f:
        f.writelines(f"file '{os.path.basename(s)}'\n" for s in segs)
    silent = os.path.join(seg, "silent.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(seg, "list.txt"), "-c", "copy", silent], check=True)
    wav = os.path.join(seg, "mix.wav")
    AU.mix(tl.duration, [(tl.to_real(t), nm, pan) for t, nm, pan in SFX_CUES], tl.vo_events(),
           lambda tr: music_env(tl.nominal(tr)), wav, music_gain=0.14 if tl.vo else 0.18, sfx_duck=0.6)
    loud = os.path.join(seg, "mix_loud.wav")   # streaming loudness: -14 LUFS, peaks under -1.5 dBTP
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", loud], check=True)
    wav = loud
    dist = os.path.join(R, "dist")
    keys = [[round(float(r), 3), round(float(n), 3)] for r, n in zip(tl.kr, tl.kn)]
    json.dump({"dur": round(tl.duration, 3), "keys": keys}, open(os.path.join(dist, "sync.json"), "w"))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(dist, "mix.mp3")], check=True)
    subprocess.run([sys.executable, os.path.join(HERE, "build_html.py")] + (["youtube"] if a.youtube else []), check=True)
    name = "barber_story.mp4" if tl.vo else "barber_story_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
