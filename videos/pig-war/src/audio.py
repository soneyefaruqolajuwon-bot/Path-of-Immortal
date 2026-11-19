"""Procedural cartoon SFX + lo-fi music bed + mixdown (48 kHz stereo)."""
import math
import os
import subprocess
import wave

import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(42)


def t_(d):
    return np.arange(int(d * SR)) / SR


def env_exp(d, k):
    return np.exp(-k * t_(d))


def adsr(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    na, nr = min(na, n), min(nr, n)
    e[:na] = np.linspace(0, 1, na)
    e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def noise(d):
    return RNG.uniform(-1, 1, int(d * SR))


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def chirp_sine(f, d):
    """f: array of instantaneous frequencies (len = d*SR)."""
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph)


def saw_from_f(f):
    ph = np.cumsum(f) / SR
    return 2 * (ph % 1.0) - 1


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def reverb(x, d=0.6, mix=0.25):
    ir = noise(d) * env_exp(d, 7)
    ir = lp(ir, 5000)
    wet = signal.fftconvolve(x, ir)[: len(x) + int(d * SR)]
    out = np.zeros(len(wet))
    out[: len(x)] += x
    return out + norm(wet, np.max(np.abs(x)) * mix)


# ---------------------------------------------------------------- SFX

def sfx_pop():
    d = 0.09
    t = t_(d)
    f = 1100 * np.exp(-t * 30) + 180
    return norm(chirp_sine(f, d) * env_exp(d, 40), 0.8)


def sfx_boing():
    d = 0.6
    t = t_(d)
    f = 160 + 260 * (1 - np.exp(-t * 6)) + 60 * np.sin(2 * np.pi * 13 * t) * np.exp(-t * 3)
    x = chirp_sine(f, d) + 0.3 * chirp_sine(2 * f, d)
    return norm(x * env_exp(d, 5) * adsr(len(t), 0.005, 0.05), 0.75)


def sfx_oink():
    out = []
    for d, f0 in ((0.16, 150), (0.22, 130)):
        t = t_(d)
        f = f0 * (1 + 0.3 * np.sin(np.pi * t / d)) + RNG.normal(0, 8, len(t))
        x = saw_from_f(f)
        x = bp(x, 500, 1600) + 0.4 * bp(noise(d), 800, 2500) * np.sin(np.pi * t / d)
        out.append(x * np.sin(np.pi * t / d) ** 0.6)
        out.append(np.zeros(int(0.05 * SR)))
    return norm(np.concatenate(out), 0.8)


def sfx_gunshot(big=False):
    d = 0.9 if big else 0.45
    t = t_(d)
    crack = hp(noise(d), 900) * env_exp(d, 38 if big else 45)
    thump = np.sin(2 * np.pi * (55 + 90 * np.exp(-t * 25)) * t) * env_exp(d, 12)
    x = crack + 0.9 * thump
    if big:
        x = reverb(x, 0.9, 0.35)
    return norm(x, 0.95)


def sfx_thud():
    d = 0.5
    t = t_(d)
    x = np.sin(2 * np.pi * (45 + 60 * np.exp(-t * 20)) * t) * env_exp(d, 7)
    x += 0.4 * lp(noise(d), 300) * env_exp(d, 18)
    return norm(x, 0.95)


def sfx_horn():
    d = 1.6
    t = t_(d)
    x = sum(saw_from_f(np.full(len(t), f) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t))) for f in (98, 147, 196))
    x = lp(x, 700, 4)
    return norm(reverb(x * adsr(len(t), 0.12, 0.45), 0.7, 0.2), 0.7)


def sfx_scratch():
    d = 0.5
    t = t_(d)
    x = noise(d)
    centers = 600 + 2600 * np.abs(np.sin(2 * np.pi * 2.2 * t))
    out = np.zeros_like(x)
    seg = 480
    for i in range(0, len(x), seg):
        c = centers[i]
        out[i:i + seg] = bp(x[i:i + seg + 2000], c * 0.7, c * 1.3)[:len(out[i:i + seg])]
    wub = saw_from_f(140 + 220 * np.abs(np.sin(2 * np.pi * 2.2 * t)))
    return norm((out + 0.25 * lp(wub, 1500)) * adsr(len(t), 0.005, 0.08), 0.8)


def sfx_whoosh(d=0.6):
    t = t_(d)
    x = noise(d)
    out = np.zeros_like(x)
    seg = 512
    for i in range(0, len(x), seg):
        u = i / len(x)
        c = 300 + 2400 * math.sin(math.pi * u)
        out[i:i + seg] = bp(x[i:i + seg + 2000], c * 0.6, min(c * 1.6, 20000))[:len(out[i:i + seg])]
    return norm(out * np.sin(np.pi * t / d) ** 2, 0.7)


def sfx_scribble():
    d = 0.9
    t = t_(d)
    x = bp(noise(d), 2500, 7000)
    am = (np.sin(2 * np.pi * 11 * t + 3 * np.sin(2 * np.pi * 3 * t)) > 0.1).astype(float)
    am = lp(am, 60)
    return norm(x * am * adsr(len(t), 0.02, 0.1), 0.45)


def sfx_baa():
    d = 0.75
    t = t_(d)
    f = 280 * (1 + 0.07 * np.sin(2 * np.pi * 7 * t)) * (1 - 0.15 * t)
    x = saw_from_f(f)
    x = bp(x, 700, 1100) + 0.6 * bp(x, 1800, 2600)
    return norm(x * adsr(len(t), 0.04, 0.2), 0.75)


def sfx_zap():
    d = 0.35
    t = t_(d)
    f = 90 + 40 * RNG.standard_normal(len(t)).cumsum() / 200
    x = np.sign(np.sin(2 * np.pi * np.cumsum(np.abs(f) + 60) / SR))
    x = 0.6 * x + 0.6 * hp(noise(d), 2000)
    am = (RNG.uniform(0, 1, len(t) // 400 + 1) > 0.35).repeat(400)[: len(t)]
    return norm(lp(x * am, 6000) * env_exp(d, 6), 0.6)


def sfx_munch():
    parts = []
    for i in range(4):
        d = 0.09
        parts.append(bp(noise(d), 700, 3500) * env_exp(d, 40))
        parts.append(np.zeros(int(0.07 * SR)))
    return norm(np.concatenate(parts), 0.6)


def sfx_chaching():
    d1 = 0.08
    cha = hp(noise(d1), 1500) * env_exp(d1, 50)
    d = 1.1
    t = t_(d)
    ch = sum(a * np.sin(2 * np.pi * f * t) * env_exp(d, k) for f, a, k in
             ((2093, 1.0, 4), (2637, 0.7, 5), (3136, 0.5, 6), (4186, 0.3, 8)))
    x = np.concatenate([cha, np.zeros(int(0.06 * SR)), ch * adsr(len(t), 0.003, 0.05)])
    return norm(x, 0.7)


def sfx_slap():
    d = 0.2
    t = t_(d)
    x = hp(noise(d), 1200) * env_exp(d, 60) + 0.6 * np.sin(2 * np.pi * 220 * t) * env_exp(d, 40)
    return norm(x, 0.9)


def _snare(d=0.18, amp=1.0):
    t = t_(d)
    return amp * (bp(noise(d), 1500, 6000) * env_exp(d, 22) + 0.5 * np.sin(2 * np.pi * 190 * t) * env_exp(d, 30))


def sfx_drums(d=2.6):
    out = np.zeros(int(d * SR))
    beat = 60 / 116
    pattern = [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 2.75, 3, 3.25, 3.5]
    for rep in range(3):
        for p in pattern:
            st = int((rep * 4 + p) * beat / 2 * SR)
            s = _snare(amp=1.0 if p % 1 == 0 else 0.6)
            if st + len(s) < len(out):
                out[st:st + len(s)] += s
    for b in range(int(d / beat) + 1):
        st = int(b * beat * SR)
        tt = t_(0.3)
        k = np.sin(2 * np.pi * (50 + 80 * np.exp(-tt * 30)) * tt) * env_exp(0.3, 10)
        if st + len(k) < len(out):
            out[st:st + len(k)] += 1.2 * k
    return norm(out, 0.8)


def sfx_cannon_load():
    out = []
    for f in (1300, 950):
        d = 0.18
        t = t_(d)
        c = hp(noise(d), 2000) * env_exp(d, 80) + 0.5 * np.sin(2 * np.pi * f * t) * env_exp(d, 25)
        out += [c, np.zeros(int(0.1 * SR))]
    d = 0.35
    out.append(lp(noise(d), 400) * env_exp(d, 12) * 0.8)
    return norm(np.concatenate(out), 0.8)


def sfx_crickets(d=2.5):
    t = t_(d)
    carrier = np.sin(2 * np.pi * 4600 * t)
    pulses = (np.sin(2 * np.pi * 28 * t) > 0.3).astype(float)
    trains = (np.sin(2 * np.pi * 1.6 * t) > 0.2).astype(float)
    x = carrier * lp(pulses, 300) * trains
    x2 = np.sin(2 * np.pi * 5200 * t) * lp((np.sin(2 * np.pi * 31 * t + 1) > 0.3).astype(float), 300) * \
        (np.sin(2 * np.pi * 1.1 * t + 2) > 0.4)
    return norm((x + 0.6 * x2) * adsr(len(t), 0.3, 0.5), 0.35)


def sfx_clink():
    d = 0.7
    t = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * t) * env_exp(d, k) for f, a, k in
            ((3150, 1.0, 9), (4720, 0.6, 11), (6230, 0.4, 14), (7900, 0.2, 18)))
    x += 0.3 * hp(noise(d), 4000) * env_exp(d, 90)
    return norm(x, 0.6)


def sfx_whistle():
    d = 1.0
    t = t_(d)
    f = 2900 + 120 * np.sin(2 * np.pi * 38 * t)
    x = chirp_sine(f, d) * (0.75 + 0.25 * np.sin(2 * np.pi * 38 * t))
    x += 0.15 * bp(noise(d), 2500, 3500)
    return norm(x * adsr(len(t), 0.01, 0.12), 0.6)


def _pluck(f, d=1.2):
    n = int(SR / f)
    buf = RNG.uniform(-1, 1, n)
    out = np.zeros(int(d * SR))
    for i in range(len(out)):
        out[i] = buf[i % n]
        buf[i % n] = 0.996 * 0.5 * (buf[i % n] + buf[(i + 1) % n])
    return out


def sfx_harp():
    notes = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 880.0, 1046.5, 1174.7, 1318.5]
    d = 2.2
    out = np.zeros(int(d * SR))
    for i, f in enumerate(notes):
        st = int(i * 0.055 * SR)
        p = _pluck(f, 1.3)
        out[st:st + len(p)] += p[: len(out) - st] * (0.8 + 0.2 * i / len(notes))
    return norm(reverb(lp(out, 7000), 0.8, 0.25), 0.6)


def sfx_ding():
    d = 1.4
    t = t_(d)
    x = np.sin(2 * np.pi * 1760 * t) * env_exp(d, 3.5) + 0.5 * np.sin(2 * np.pi * 2640 * t) * env_exp(d, 5)
    return norm(x * adsr(len(t), 0.002, 0.05), 0.6)


def sfx_hammer():
    out = []
    for i in range(2):
        d = 0.16
        t = t_(d)
        k = np.sin(2 * np.pi * (320 + 200 * np.exp(-t * 60)) * t) * env_exp(d, 30) + 0.5 * bp(noise(d), 600, 2500) * env_exp(d, 60)
        out += [k, np.zeros(int(0.12 * SR))]
    return norm(np.concatenate(out), 0.85)


def sfx_cuffs():
    out = []
    for f in (2400, 2900):
        d = 0.12
        t = t_(d)
        out += [hp(noise(d), 3000) * env_exp(d, 70) + 0.4 * np.sin(2 * np.pi * f * t) * env_exp(d, 30),
                np.zeros(int(0.05 * SR))]
    return norm(np.concatenate(out), 0.6)


SFX = {
    "pop": sfx_pop, "boing": sfx_boing, "oink": sfx_oink, "gunshot": sfx_gunshot,
    "bang": lambda: sfx_gunshot(True), "thud": sfx_thud, "horn": sfx_horn,
    "scratch": sfx_scratch, "whoosh": sfx_whoosh, "scribble": sfx_scribble, "baa": sfx_baa,
    "zap": sfx_zap, "munch": sfx_munch, "chaching": sfx_chaching, "slap": sfx_slap,
    "drums": sfx_drums, "cannon": sfx_cannon_load, "crickets": sfx_crickets, "clink": sfx_clink,
    "whistle": sfx_whistle, "harp": sfx_harp, "ding": sfx_ding, "hammer": sfx_hammer,
    "cuffs": sfx_cuffs,
}

GAIN = {"crickets": 0.7, "drums": 0.6, "horn": 0.7, "scribble": 0.8, "whoosh": 0.55,
        "pop": 0.55, "bang": 0.9, "gunshot": 0.85, "zap": 0.5}


# ---------------------------------------------------------------- music

def music_bed(d, bpm=88):
    n = int(d * SR)
    out = np.zeros(n)
    beat = 60 / bpm
    bar = beat * 4
    chords = [  # Fmaj7, Em7, Dm7, Cmaj7 (+ bass roots)
        ([174.6, 220.0, 261.6, 329.6], 87.3),
        ([164.8, 196.0, 246.9, 293.7], 82.4),
        ([146.8, 174.6, 220.0, 261.6], 73.4),
        ([130.8, 164.8, 196.0, 246.9], 65.4),
    ]
    nbars = int(d / bar) + 1
    for b in range(nbars):
        notes, root = chords[b % 4]
        st = int(b * bar * SR)
        L = int(bar * SR)
        t = np.arange(L) / SR
        e = (1 - np.exp(-t * 30)) * np.exp(-t * 0.9)
        trem = 1 + 0.15 * np.sin(2 * np.pi * 4.5 * t)
        ch = sum(np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) for f in notes) * e * trem * 0.18
        for half in (0, 2):  # bass on 1 and 3
            bst = int(half * beat * SR)
            bl = int(beat * 1.6 * SR)
            tb = np.arange(bl) / SR
            bass = np.sin(2 * np.pi * root * tb) * np.exp(-tb * 2.5) * 0.5
            seg = ch[bst:bst + bl]
            ch[bst:bst + len(bass[:len(seg)])] += bass[:len(seg)]
        end = min(n, st + L)
        out[st:end] += ch[: end - st]
        # drums
        for k_beat in (0, 2.5):
            ks = st + int(k_beat * beat * SR)
            tt = t_(0.35)
            kick = np.sin(2 * np.pi * (48 + 70 * np.exp(-tt * 28)) * tt) * env_exp(0.35, 9) * 0.9
            if ks + len(kick) < n:
                out[ks:ks + len(kick)] += kick
        for s_beat in (1, 3):
            ss = st + int(s_beat * beat * SR)
            sn = _snare(0.22, 0.45)
            sn = lp(sn, 4500)
            if ss + len(sn) < n:
                out[ss:ss + len(sn)] += sn
        for h in range(8):
            swing = 0.06 if h % 2 else 0.0
            hs = st + int((h * 0.5 + swing) * beat * SR)
            hh = hp(noise(0.05), 7000) * env_exp(0.05, 70) * (0.18 if h % 2 else 0.25)
            if hs + len(hh) < n:
                out[hs:hs + len(hh)] += hh
    crackle = np.zeros(n)
    idx = RNG.integers(0, n, int(d * 6))
    crackle[idx] = RNG.uniform(-0.3, 0.3, len(idx))
    out += lp(crackle, 3000) + 0.004 * lp(noise(d)[:n], 2000)
    out = lp(out, 9000)
    return norm(out, 0.8)


# ---------------------------------------------------------------- mix

def load_audio(path):
    """Decode any audio file to mono float at SR via ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1",
                          "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def place(buf, x, t, gain=1.0, pan=0.0):
    st = int(t * SR)
    if st >= buf.shape[1] or st < 0:
        return
    x = x[: buf.shape[1] - st]
    lg, rg = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    buf[0, st:st + len(x)] += x * gain * lg * 1.414
    buf[1, st:st + len(x)] += x * gain * rg * 1.414


def mix(duration, sfx_events, vo_events, music_env, out_path, music_gain=0.2):
    n = int(duration * SR)
    buf = np.zeros((2, n))
    cache = {}
    for t, name, pan in sfx_events:
        if name not in cache:
            cache[name] = SFX[name]()
        place(buf, cache[name], t, 0.55 * GAIN.get(name, 1.0), pan)
    m = music_bed(duration + 1)[:n]
    tt = np.arange(n) / SR
    m = m * np.array([music_env(x) for x in tt[::480]]).repeat(480)[:n]
    vo_mask = np.zeros(n)
    for t, path in vo_events:
        x = load_audio(path)
        place(buf, x, t, 1.0, 0.0)
        st = int(t * SR)
        vo_mask[st:st + len(x)] = 1
    # duck music under VO
    duck = 1 - 0.45 * lp(vo_mask, 3, 1)
    buf[0] += m * music_gain * duck
    buf[1] += m * music_gain * duck
    buf = np.tanh(buf * 1.1) * 0.95
    pcm = (buf.T * 32767).astype(np.int16)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return out_path


if __name__ == "__main__":
    os.makedirs("sfx_test", exist_ok=True)
    for k, f in SFX.items():
        x = f()
        pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
        with wave.open(f"sfx_test/{k}.wav", "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
    print("ok")
