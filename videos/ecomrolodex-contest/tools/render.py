"""Render the EcomRolodex contest entry to MP4 (1080x1920, 30 fps).

  python tools/render.py            # uses vo/NN.mp3 + vo/timing.json if present
  python tools/render.py --no-vo

Every beat is rounded up to whole beats of a 120 BPM groove, so each cut lands on a kick.
"""
import argparse, glob, json, math, os, shutil, subprocess, sys, time, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.abspath(os.path.join(HERE, ".."))
VO_DIR, OUT, FPS, SR = os.path.join(R, "vo"), os.path.join(R, "out"), 30, 48000
BPM = 120; BEAT = 60 / BPM

BEATS = [(1, 0, 1.7), (2, 1.7, 2.95), (3, 2.95, 4.55), (4, 4.55, 6.85), (5, 6.85, 9.6), (6, 9.6, 15.0)]
CUTS = [1.7, 4.55, 6.85, 9.6]                       # visual cuts (storyboard time) that get an impact
ANCHORS = [(1, "look", 0, 0.5), (3, "built", 0, 3.25), (6, "comment", 0, 10.95)]
VO_DELAY, VO_TAIL, END_HOLD, MIN_FRAC = 0.04, 0.12, 1.6, 0.75


def probe(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path], capture_output=True, text=True).stdout)


class Timeline:
    def __init__(self, use_vo=True):
        self.vo, self.words = {}, {}
        if use_vo:
            for bid, *_ in BEATS:
                hits = sorted(glob.glob(os.path.join(VO_DIR, f"{bid:02d}.mp3")))
                if hits: self.vo[bid] = (hits[0], probe(hits[0]))
            tj = os.path.join(VO_DIR, "timing.json")
            if self.vo and os.path.exists(tj): self.words = {int(k): v for k, v in json.load(open(tj)).items()}
        knots, t, self.real = [(0.0, 0.0)], 0.0, []
        for bid, s, e in BEATS:
            dur = max(self.vo[bid][1] + VO_DELAY + VO_TAIL, (e - s) * MIN_FRAC) if bid in self.vo else e - s
            if bid == BEATS[-1][0]: dur += END_HOLD if bid in self.vo else 0
            dur = math.ceil(dur / BEAT - 0.08) * BEAT          # snap the beat to the groove: cuts land on kicks
            self.real.append((bid, t, t + dur))
            ks = []
            for ab, w, nth, tn in ANCHORS:
                if ab == bid and bid in self.words:
                    hits = [x for x in self.words[bid] if x[0] == w]
                    if len(hits) > nth: ks.append((t + VO_DELAY + hits[nth][1], tn))
            lr, ln = knots[-1]
            for r, n in sorted(ks):
                if r > lr + 0.05 and n > ln + 0.05 and r < t + dur - 0.05 and n < e - 0.05: knots.append((r, n)); lr, ln = r, n
            knots.append((t + dur, e)); t += dur
        self.duration = t
        self.kr, self.kn = np.array([k[0] for k in knots]), np.array([k[1] for k in knots])

    def nominal(self, tr): return float(np.interp(tr, self.kr, self.kn))
    def to_real(self, tn): return float(np.interp(tn, self.kn, self.kr))


# ------------------------------------------------------------------ music: a clean, premium 120 BPM groove (synthesised here)
def tt(d): return np.arange(int(d * SR)) / SR
def lp(x, a):                                       # one-pole low-pass (a = smoothing 0..1)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def kick():
    t = tt(0.45); f = 48 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5) * 0.95
def hat():
    r = np.random.default_rng(1); n = r.standard_normal(int(0.06 * SR)); n = n - lp(n, 0.35)
    return n * np.exp(-tt(0.06) * 70) * 0.22
def clap():
    r = np.random.default_rng(2); n = r.standard_normal(int(0.22 * SR)); n = lp(n - lp(n, 0.08), 0.6)
    e = np.exp(-tt(0.22) * 18) * (1 + 0.6 * (np.sin(np.arange(len(n)) / SR * 2 * np.pi * 90) > 0))
    return n * e * 0.35
def impact():
    t = tt(1.2); sub = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.6)
    r = np.random.default_rng(3); n = lp(r.standard_normal(len(t)), 0.15) * np.exp(-t * 9)
    return sub * 0.9 + n * 0.5
def riser(d=0.5):
    t = tt(d); r = np.random.default_rng(4); n = r.standard_normal(len(t)); n = n - lp(n, 0.05 + 0.4 * 0)
    return n * (t / d) ** 2.5 * 0.25
def pad(d):                                         # soft minor chords: Am F C G, one per bar
    chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 196, 261.6], [196, 246.9, 293.7]]
    out = np.zeros(int(d * SR)); bar = 4 * BEAT
    for i in range(int(d / bar) + 1):
        seg = tt(bar); c = chords[i % 4]; s = sum(np.sin(2 * np.pi * f * seg) + 0.4 * np.sin(2 * np.pi * f * 2.003 * seg) for f in c)
        s *= np.minimum(1, seg / 0.3) * np.minimum(1, (bar - seg) / 0.3) * 0.06
        bass = np.sin(2 * np.pi * c[0] / 2 * seg) * 0.16 * np.minimum(1, seg / 0.02) * np.exp(-((seg % BEAT) * 3))
        a = int(i * bar * SR); out[a:a + len(seg)] += (s + bass)[:max(0, len(out) - a)]
    return out
def put(buf, x, t, g=1.0):
    a = int(t * SR)
    if 0 <= a < len(buf): buf[a:a + len(x)] += (x * g)[:len(buf) - a]
def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def mix(tl, out_wav):
    D = tl.duration; n = int(D * SR); music = np.zeros(n); fx = np.zeros(n)
    music += pad(D)
    for b in range(int(D / BEAT) + 1):
        t = b * BEAT
        if t < tl.to_real(1.7) - 0.01: continue        # the hook stays sparse: only the riser
        put(music, kick(), t, 0.9)
        put(music, hat(), t + BEAT / 2, 1.0)
        if b % 2 == 1: put(music, clap(), t, 0.8)
    for c in CUTS:                                      # impacts + risers on the cuts
        rc = tl.to_real(c); put(fx, impact(), rc, 0.8); put(fx, riser(0.5), rc - 0.5, 1.0)
    end = tl.to_real(14.6)
    music[int(end * SR):] *= np.linspace(1, 0, n - int(end * SR))
    vo = np.zeros(n); mask = np.zeros(n)
    for bid, rs, re in tl.real:
        if bid in tl.vo:
            x = load(tl.vo[bid][0]); a = int((rs + VO_DELAY) * SR); vo[a:a + len(x)] += x[:n - a]; mask[a:a + len(x)] = 1
    duck = 1 - 0.55 * lp(mask, 0.0008)                  # music + effects step back under the voice
    y = (music * 0.5 + fx * 0.6) * duck + vo
    y = np.tanh(y * 1.05) * 0.95
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--no-vo", action="store_true"); ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    subprocess.run([sys.executable, os.path.join(HERE, "build_html.py")], check=True)
    tl = Timeline(not a.no_vo)
    print(f"duration {tl.duration:.2f}s, VO lines: {len(tl.vo)}/{len(BEATS)}, cuts at", [round(tl.to_real(c), 2) for c in CUTS])
    frames = [round(tl.nominal(i / FPS), 4) for i in range(int(round(tl.duration * FPS)))]
    seg = os.path.join(OUT, "segments"); shutil.rmtree(seg, ignore_errors=True); os.makedirs(seg)
    fj = os.path.join(seg, "frames.json"); json.dump(frames, open(fj, "w")); t0 = time.time()
    env = dict(os.environ, NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    subprocess.run(["node", os.path.join(HERE, "render.cjs"), "video", fj, seg, str(a.workers)], check=True, env=env)
    segs = sorted(glob.glob(os.path.join(seg, "seg*.mp4")))
    with open(os.path.join(seg, "list.txt"), "w") as f: f.writelines(f"file '{os.path.basename(s)}'\n" for s in segs)
    silent = os.path.join(seg, "silent.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(seg, "list.txt"), "-c", "copy", silent], check=True)
    wav = os.path.join(seg, "mix.wav"); mix(tl, wav)
    name = "ecomrolodex_blaqcards.mp4" if tl.vo else "ecomrolodex_blaqcards_draft_no_voice.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:v", "libx264", "-crf", "19", "-preset", "slow",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", os.path.join(OUT, name)], check=True)
    print("wrote", os.path.join(OUT, name), f"in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
