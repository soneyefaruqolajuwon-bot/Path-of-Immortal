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

BEATS = [(1, 0, 8.26), (2, 8.26, 12.71), (3, 12.71, 18.33), (4, 18.33, 23.27), (5, 23.27, 25.47), (6, 25.47, 33.86), (7, 33.86, 39.84), (8, 39.84, 46.6)]
ANCHORS = []            # storyboard built on the voiceover's own clock
VO_DELAY, VO_TAIL = 0.04, 0.2
END_HOLD = 3.03
MIN_FRAC = 0.3          # beats follow the voice; the end card is END_HOLD

SFX_CUES = [
    (0.02, "ding", 0), (1.4, "clink", 0), (2.4, "whoosh", 0.3), (3.4, "ding", -0.2), (4.9, "pop", 0), (6.65, "slap", 0),
    (8.3, "slap", 0), (9.3, "boing", 0), (10.3, "slap", 0), (12.8, "whoosh", 0), (14.3, "pop", 0), (15.25, "hammer", 0), (16.9, "clink", 0),
    (18.4, "scribble", 0), (19.6, "pop", 0), (20.8, "pop", 0), (21.9, "thud", 0), (25.6, "whoosh", 0.3), (26.9, "pop", 0),
    (33.9, "whoosh", 0), (36.2, "harp", 0), (37.0, "ding", 0), (40.7, "pop", 0), (43.8, "ding", 0),
]


def music_env(T):
    if 23.3 <= T < 36.2:
        return 0.4       # the empty chair and the letter: let the words land
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
    m = subprocess.run(["ffmpeg", "-i", loud, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    li = float(m.rsplit("I:", 1)[1].split("LUFS")[0])
    if abs(li + 14) > 0.3:          # loudnorm can undershoot on short mixes: top up to -14 LUFS
        top = loud.replace(".wav", "_top.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", loud, "-af", f"volume={-14 - li:.2f}dB,alimiter=limit=0.89", top], check=True); loud = top
    wav = loud
    dist = os.path.join(R, "dist")
    keys = [[round(float(r), 3), round(float(n), 3)] for r, n in zip(tl.kr, tl.kn)]
    json.dump({"dur": round(tl.duration, 3), "keys": keys}, open(os.path.join(dist, "sync.json"), "w"))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(dist, "mix.mp3")], check=True)
    subprocess.run([sys.executable, os.path.join(HERE, "build_html.py")] + (["youtube"] if a.youtube else []), check=True)
    name = "cafe_story.mp4" if tl.vo else "cafe_story_draft_no_voice.mp4"
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"{os.path.getsize(final) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
