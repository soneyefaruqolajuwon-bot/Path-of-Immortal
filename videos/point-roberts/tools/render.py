"""Render the Point Roberts short to MP4 (video via headless Chromium, audio procedural + voice).

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

BEATS = [(1, 0, 3), (2, 3, 6), (3, 6, 9), (4, 9, 14), (5, 14, 25), (6, 25, 36), (7, 36, 51),
         (8, 51, 61), (9, 61, 75), (10, 75, 86), (11, 86, 93)]
# (beat, spoken word, nth occurrence, storyboard time) — visual beats land on these words
ANCHORS = [
    (2, "two", 0, 3.6), (3, "straight", 0, 7.9),
    (4, "trapped", 0, 10.8),
    (5, "straight", 0, 16.2), (5, "nobody", 0, 21.6),
    (6, "five", 0, 29.8), (6, "drive", 0, 32.6),
    (7, "hospital", 0, 37.4), (7, "school", 0, 39.0), (7, "four", 0, 41.3), (7, "class", 0, 46.8),
    (8, "fact", 0, 51.2), (8, "witness", 0, 54.4),
    (9, "seventy", 0, 62.2), (9, "twenty", 0, 68.8), (9, "locked", 0, 70.3),
    (10, "ghost", 0, 75.6), (10, "shelves", 0, 76.6), (10, "ferries", 0, 80.6),
    (11, "reopened", 0, 86.6), (11, "wondering", 0, 89.6),
]
VO_DELAY, VO_TAIL = 0.06, 0.12

SFX_CUES = [
    (0.8, "pop", 0.3), (0.85, "boing", 0.3), (3.0, "pop", 0.3), (3.6, "pop", 0), (3.85, "pop", 0), (4.0, "ding", 0.2),
    (6.0, "pop", -0.3), (7.9, "whoosh", 0), (8.15, "thud", 0), (8.4, "boing", -0.3),
    (9.2, "whoosh", 0), (10.2, "pop", 0), (11.0, "ding", 0),
    (14.2, "whoosh", 0), (14.4, "ding", 0), (15.0, "pop", 0), (15.3, "pop", 0), (16.2, "whoosh", 0), (16.5, "thud", 0),
    (19.4, "pop", -0.3), (19.5, "pop", 0.3), (20.0, "scribble", 0), (22.4, "boing", -0.3), (22.6, "boing", 0.3),
    (25.2, "whoosh", 0), (28.6, "whoosh", 0), (28.7, "slap", 0), (29.0, "ding", 0), (29.8, "pop", 0),
    (32.6, "whoosh", 0.4), (33.8, "thud", 0.3), (33.85, "boing", 0.3),
    (36.8, "whoosh", 0), (37.4, "thud", -0.3), (39.0, "thud", 0), (40.2, "whoosh", 0), (41.3, "pop", 0),
    (42.0, "hammer", -0.3), (44.6, "hammer", 0.3), (46.6, "hammer", 0.3), (48.4, "hammer", -0.3),
    (42.1, "ding", 0), (44.7, "ding", 0), (46.7, "ding", 0), (48.5, "ding", 0),
    (51.2, "scratch", 0), (52.0, "whoosh", -0.4), (54.4, "pop", 0.3), (57.6, "pop", -0.3),
    (61.2, "whoosh", 0), (61.8, "pop", 0.3), (62.2, "ding", 0), (62.6, "pop", -0.4), (63.0, "pop", 0), (63.4, "pop", 0.4),
    (67.4, "whoosh", 0), (68.8, "ding", 0), (70.3, "thud", 0), (71.45, "thud", 0), (71.5, "cuffs", 0), (72.4, "pop", 0),
    (75.2, "whoosh", 0), (75.4, "crickets", 0), (76.6, "pop", 0), (78.0, "slap", 0), (78.2, "boing", 0),
    (80.6, "whoosh", 0), (81.2, "horn", 0.3),
    (86.4, "whoosh", 0), (86.5, "pop", 0), (87.0, "clink", 0), (87.0, "gunshot", 0), (87.6, "whoosh", 0.3), (89.6, "boing", 0),
]


def music_env(T):
    if 51.2 <= T < 52.4:                      # record scratch stops the beat
        return 0.0 if T < 52.0 else (T - 52.0) / 0.4
    if 75.2 <= T < 81.0:                      # ghost town: music drops out
        return 0.25
    return 1.0


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
           lambda tr: music_env(tl.nominal(tr)), wav, music_gain=0.16 if tl.vo else 0.2)
    name = "point_roberts.mp4" if tl.vo else "point_roberts_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
