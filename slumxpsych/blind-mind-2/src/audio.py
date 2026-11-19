"""Sound design for Blind Mind 2.0 — every sound is synthesized (no copyright).
Timings mirror the timeline in blindmind.html. Writes a 48 kHz stereo WAV."""
import sys, wave
import numpy as np

SR = 48000
DUR = 28.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(12)


def bandpass(x, lo, hi, soft=0.15):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + np.exp(-(np.log(f + 1e-9) - np.log(lo)) / soft))
    if hi < SR / 2:
        m *= 1 / (1 + np.exp((np.log(f + 1e-9) - np.log(hi)) / soft))
    return np.fft.irfft(X * m, len(x))


def envelope(points):
    """Piecewise-linear envelope from [(time, value), ...]."""
    ts, vs = zip(*points)
    return np.interp(t, ts, vs)


def place(bus, sig, at, gain=1.0):
    i = int(at * SR)
    j = min(N, i + len(sig))
    if i < N:
        bus[i:j] += sig[: j - i] * gain


def seg_t(d):
    return np.arange(int(d * SR)) / SR


def mixs(*sigs):
    """Sum signals of different lengths (zero-padded)."""
    n = max(len(x) for x in sigs)
    out = np.zeros(n)
    for x in sigs:
        out[: len(x)] += x
    return out


def tick(freq=2200, d=0.05):
    tt = seg_t(d)
    n = bandpass(rng.standard_normal(len(tt)), 2500, 12000) * np.exp(-tt / 0.004)
    tone = np.sin(2 * np.pi * freq * tt) * np.exp(-tt / 0.012)
    return 0.6 * n + 0.5 * tone


def thump(f0=95, f1=42, d=0.45, tau=0.12):
    tt = seg_t(d)
    f = f1 + (f0 - f1) * np.exp(-tt / 0.05)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt / tau)


def blip(f0, f1=None, d=0.12):
    tt = seg_t(d)
    f1 = f1 or f0
    f = np.linspace(f0, f1, len(tt))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt / (d / 3)) * np.minimum(1, tt / 0.003)


def whoosh(d=0.5, lo=300, hi=6000, rise=True):
    tt = seg_t(d)
    n = rng.standard_normal(len(tt))
    n = bandpass(n, lo, hi, 0.4)
    shape = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    if rise:
        shape *= (tt / d) ** 0.6
    return n * shape


def riser(d=1.0, f0=180, f1=900):
    tt = seg_t(d)
    f = f0 * (f1 / f0) ** (tt / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * (tt / d) ** 2 * np.exp(-np.maximum(0, tt - d * 0.9) / 0.02)


def buzz(d=0.28, f=110):
    tt = seg_t(d)
    sq = np.sign(np.sin(2 * np.pi * f * tt)) * 0.5 + np.sign(np.sin(2 * np.pi * f * 1.5 * tt)) * 0.3
    sq = bandpass(sq, 80, 2500)
    return sq * np.exp(-tt / 0.12) * np.minimum(1, tt / 0.004)


def reverb(x, decay=1.4, mix=0.25):
    L = int(decay * SR)
    tt = np.arange(L) / SR
    ir = rng.standard_normal(L) * np.exp(-tt / (decay / 5))
    ir = bandpass(ir, 200, 7000)
    ir /= np.sqrt(np.sum(ir ** 2))
    n = len(x) + L
    nfft = 1 << (n - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[: len(x)]
    return x + mix * wet


# ---------------- layers ----------------
# 1) room hum
hum = 0.5 * np.sin(2 * np.pi * 50 * t) + 0.25 * np.sin(2 * np.pi * 100 * t + 1) + 0.1 * np.sin(2 * np.pi * 150 * t)
air = bandpass(rng.standard_normal(N), 150, 1200, 0.3)
air /= np.abs(air).max()
hum = 0.012 * hum + 0.006 * air

# 2) dark drone bed (A minor, detuned saws, low-passed)
def saw(f):
    return 2 * ((t * f) % 1) - 1

bed = np.zeros(N)
for f, a in [(55, 1), (55.3, 0.8), (82.41, 0.6), (110, 0.5), (130.81, 0.35), (164.81, 0.18)]:
    bed += a * saw(f)
bed = bandpass(bed, 30, 520, 0.3)
bed /= np.abs(bed).max()
bed *= 1 + 0.15 * np.sin(2 * np.pi * 0.25 * t)
bed_env = envelope([
    (0, 0.30), (1.5, 0.32), (4.9, 0.55), (5.0, 0.0), (6.0, 0.0), (6.05, 0.6),
    (13.8, 0.95), (14.2, 0.45), (16.0, 0.5), (22.8, 0.6), (23.2, 0.45),
    (26.7, 0.32), (28, 0.30)])
bed *= bed_env * 0.07

# shimmer that tightens as the apple degrades
shim = bandpass(rng.standard_normal(N), 3000, 9000, 0.3)
shim /= np.abs(shim).max()
shim *= envelope([(0, 0), (6.1, 0), (6.3, 0.2), (12.6, 0.6), (13.0, 0), (28, 0)]) * 0.025

# 3) SFX bus
sfx = np.zeros(N)
for at in (1.5, 2.5, 3.5):
    place(sfx, tick(1800), at, 0.35)
place(sfx, mixs(tick(2600), 0.5 * blip(1760, d=0.2)), 4.5, 0.4)          # "locked"
place(sfx, thump(110, 50, 0.5, 0.14), 6.0, 0.55)                     # slider wakes
place(sfx, blip(1200, 1600, 0.15), 6.0, 0.18)
for (at, lv), f in zip([(6.2, 1), (7.8, 2), (9.4, 3), (11.0, 4)], [1000, 820, 660, 520]):
    place(sfx, mixs(tick(f * 2), 0.4 * blip(f, f * 0.9, 0.18)), at, 0.42)
place(sfx, thump(70, 32, 1.0, 0.3), 12.6, 0.8)                       # level 5 — the dark
place(sfx, bandpass(rng.standard_normal(int(0.25 * SR)), 60, 900) * np.exp(-seg_t(0.25) / 0.06), 12.6, 0.25)
place(sfx, thump(85, 28, 1.6, 0.5), 13.9, 0.9)                       # "1 in 25"
place(sfx, whoosh(0.45, 400, 8000), 15.95, 0.22)                     # title wipe
place(sfx, tick(3000), 16.2, 0.3)
place(sfx, blip(660, d=0.1), 17.0, 0.12)
place(sfx, blip(520, d=0.1), 17.3, 0.12)
place(sfx, blip(880, d=0.09), 18.0, 0.2)                             # memory OK
place(sfx, blip(1320, d=0.14), 18.08, 0.2)
place(sfx, riser(1.0, 200, 900), 19.5, 0.12)                         # projection beam
place(sfx, buzz(0.3), 21.0, 0.32)                                    # no image
place(sfx, thump(60, 35, 0.6, 0.15), 21.0, 0.4)
place(sfx, whoosh(0.35, 300, 5000, rise=False), 22.85, 0.2)          # slider reset
place(sfx, thump(120, 60, 0.3, 0.08), 23.0, 0.35)
place(sfx, tick(2400), 23.8, 0.35)                                   # CTA
place(sfx, tick(1800), 26.8, 0.25)                                  # loop seam

sfx = reverb(sfx, 1.4, 0.3)

mix = hum + bed + shim + sfx

# hard silence 5.0–6.0 (the "what did you see?" beat), with 15 ms fades
fade = int(0.015 * SR)
gate = np.ones(N)
a, b = int(5.0 * SR), int(6.0 * SR)
gate[a:b] = 0
gate[a - fade:a] = np.linspace(1, 0, fade)
gate[b:b + fade] = np.linspace(0, 1, fade)
mix *= gate
# allow the reverb tail of the "locked" tick but nothing new; done by gating above

# gentle soft-clip + normalize to -1 dBFS (final loudness set by ffmpeg loudnorm)
mix = np.tanh(mix * 1.5) / 1.5
mix *= 10 ** (-1 / 20) / np.abs(mix).max()

# slight stereo width: decorrelate air/shimmer
side = 0.5 * (shim + 0.004 * bandpass(rng.standard_normal(N), 2000, 8000)) * gate
L = mix + side
R = mix - side
st = np.stack([L, R], 1)
st *= 10 ** (-1 / 20) / np.abs(st).max()
pcm = (st * 32767).astype(np.int16)

out = sys.argv[1] if len(sys.argv) > 1 else "audio.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out)
