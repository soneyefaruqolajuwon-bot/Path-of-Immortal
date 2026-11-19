"""Cartoon sound design for the 5 s Psy animation test (all synthesized)."""
import sys, wave
import numpy as np

SR = 48000
DUR = 5.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(3)


def tt(d):
    return np.arange(int(d * SR)) / SR


def bandpass(x, lo, hi, soft=0.25):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-9
    m = 1 / (1 + np.exp(-(np.log(f) - np.log(lo)) / soft)) * 1 / (1 + np.exp((np.log(f) - np.log(hi)) / soft))
    return np.fft.irfft(X * m, len(x))


def sweep(f0, f1, d, tau=None, shape='sine'):
    x = tt(d)
    f = f0 * (f1 / f0) ** (x / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = np.sin(ph) if shape == 'sine' else np.sign(np.sin(ph)) * 0.6
    env = np.exp(-x / tau) if tau else np.sin(np.pi * x / d)
    return w * env * np.minimum(1, x / 0.003)


def place(bus, sig, at, g=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    bus[i:j] += sig[: j - i] * g


bus = np.zeros(N)
# room tone + warm pad (Fmaj7-ish, soft)
pad = sum(a * np.sin(2 * np.pi * f * t + p) for f, a, p in [(174.6, .5, 0), (220, .35, 1), (261.6, .3, 2), (329.6, .2, .5)])
pad *= (0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t)) * 0.02
hum = bandpass(rng.standard_normal(N), 80, 600) ; hum = hum / np.abs(hum).max() * 0.006

# anticipation creak
place(bus, bandpass(rng.standard_normal(int(.14 * SR)), 300, 1400) * np.hanning(int(.14 * SR)), .45, .25)
# spin whoosh (rising) + chair squeak
w = bandpass(rng.standard_normal(int(.38 * SR)), 400, 5000, .5) * np.sin(np.linspace(0, np.pi, int(.38 * SR))) ** 2
place(bus, w, .58, .55)
place(bus, sweep(900, 1400, .18) * .5, .62, .25)
# panic sting: bright stab chord
stab = sum(sweep(f, f * 0.98, .45, tau=.12, shape='sq') for f in (523, 659, 784, 1046))
place(bus, bandpass(stab, 200, 6000), .9, .22)
# boing on the hop (spring: rising vibrato)
x = tt(.34); f = 220 * (2.2 ** (x / .34)) * (1 + .06 * np.sin(2 * np.pi * 28 * x))
place(bus, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / .2), 1.0, .45)
# caption pop
place(bus, sweep(700, 1300, .06, tau=.02), 1.0, .3)
# landing thud
x = tt(.3); place(bus, np.sin(2 * np.pi * np.cumsum(110 * np.exp(-x / .06) + 45) / SR) * np.exp(-x / .08), 1.32, .8)
# blinks
for at in (1.86, 4.06):
    place(bus, sweep(2400, 1800, .03, tau=.008), at, .25)
# eye darts (zip up / zip down)
place(bus, sweep(600, 2200, .1, tau=.05), 2.25, .35)
place(bus, sweep(2000, 700, .1, tau=.05), 3.35, .3)
# sweat plip
place(bus, sweep(1500, 600, .12, tau=.04), 3.62, .35)
# nervous tremble whine under the end
place(bus, sweep(700, 760, 1.2) * .5 * (1 + .3 * np.sin(2 * np.pi * 9 * tt(1.2))), 3.6, .07)

# simple room reverb on sfx
L = int(.6 * SR); ir = rng.standard_normal(L) * np.exp(-np.arange(L) / SR / .12); ir = bandpass(ir, 300, 6000); ir /= np.sqrt((ir ** 2).sum())
n = 1 << (N + L).bit_length()
wet = np.fft.irfft(np.fft.rfft(bus, n) * np.fft.rfft(ir, n), n)[:N]
mix = pad + hum + bus + .18 * wet
mix = np.tanh(mix * 1.4) / 1.4
fade = int(.08 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
mix *= 10 ** (-1 / 20) / np.abs(mix).max()
st = (np.stack([mix, mix], 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok')
