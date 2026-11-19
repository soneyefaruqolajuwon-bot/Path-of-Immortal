"""The Pig War (1859) — scene timeline.

Every time value in this file is in *storyboard seconds* (0–94, exactly as
in the script table). If ElevenLabs voice files exist in ../vo, each beat
is stretched/squeezed to fit its line and storyboard time is warped to real
time automatically (see Timeline).
"""
import glob
import math
import os
import random
import subprocess

import cairo
import numpy as np

import draw as D
from draw import clamp, ease_io, ease_out, lerp, pop, window, hexc
from geo import Camera, LandPaths, merc, load_rings, island_ring

W, H = 1080, 1920
HERE = os.path.dirname(os.path.abspath(__file__))
VO_DIR = os.path.join(HERE, "..", "vo")

# ---------------------------------------------------------------- beats

BEATS = [  # (id, start, end, speaker, line)
    (1, 0.0, 3.0, "Britain", "Hey, your pig is eating my potatoes."),
    (2, 3.0, 6.0, "USA", "Yeah? Well, I just shot it."),
    (3, 6.0, 9.0, "Britain", "Right. Send in the warships."),
    (4, 9.0, 13.0, "Narrator", "In 1859, the United States and the British Empire nearly went to war... over one dead pig."),
    (5, 13.0, 17.0, "Narrator", "To see how things got this stupid, we need to go back to 1846."),
    (6, 17.0, 26.0, "Narrator", "The US and Britain signed a treaty splitting the border, except they wrote it so vaguely that both countries claimed San Juan Island."),
    (7, 26.0, 35.0, "Narrator", "So British sheep farmers and American settlers moved in side by side. Tensions were already high."),
    (8, 35.0, 46.0, "Narrator", "Then on June 15th, 1859, an American farmer named Lyman Cutlar found a British-owned pig rooting through his garden... and pulled the trigger."),
    (9, 46.0, 56.0, "Narrator", "Cutlar offered to pay 10 dollars for the pig. The British demanded 100, and threatened to arrest him."),
    (10, 56.0, 68.0, "Narrator", "So the US Army sent in troops, led by future Civil War general George Pickett. Britain responded with five warships and over 2,000 men."),
    (11, 68.0, 78.0, "Narrator", "Both sides had orders not to shoot first. Instead, they spent months insulting each other, and drinking together at night."),
    (12, 78.0, 88.0, "Narrator", "Eventually, leaders in London and Washington realized how ridiculous this was, and asked the German Kaiser to pick a winner."),
    (13, 88.0, 94.0, "Narrator", "In 1872, the US got the island. Total casualties of the Pig War? Zero humans... and one very unlucky pig."),
]


def probe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    return float(out.stdout.strip())


class Timeline:
    """Maps real time <-> storyboard time, beat by beat."""

    def __init__(self, use_vo=True):
        self.vo = {}
        if use_vo:
            for b in BEATS:
                hits = sorted(glob.glob(os.path.join(VO_DIR, f"{b[0]:02d}*")))
                hits = [h for h in hits if h.lower().endswith((".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac"))]
                if hits:
                    self.vo[b[0]] = (hits[0], probe_duration(hits[0]))
        self.real = []  # (bid, real_start, real_end, nom_start, nom_end)
        t = 0.0
        for bid, s, e, *_ in BEATS:
            nom = e - s
            if bid in self.vo:
                d = self.vo[bid][1]
                dur = max(d + 0.35, nom * 0.8)
            else:
                dur = nom
            self.real.append((bid, t, t + dur, s, e))
            t += dur
        self.duration = t

    def nominal(self, tr):
        for bid, rs, re, ns, ne in self.real:
            if tr < re or bid == self.real[-1][0]:
                return ns + (tr - rs) / (re - rs) * (ne - ns)
        return BEATS[-1][2]

    def to_real(self, tn):
        for bid, rs, re, ns, ne in self.real:
            if tn < ne or bid == self.real[-1][0]:
                return rs + (tn - ns) / (ne - ns) * (re - rs)

    def vo_events(self):
        out = []
        for bid, rs, re, ns, ne in self.real:
            if bid in self.vo:
                out.append((rs + 0.08, self.vo[bid][0]))
        return out


# ---------------------------------------------------------------- camera keys

SJI = (-123.07, 48.535)
CLAIM = (-123.02, 48.585)
SOUTH = (-123.035, 48.49)
PNW = (-122.3, 48.9)
WORLD = (-42.0, 47.0)
WORLD2 = (-60.0, 47.0)
GER = (11.0, 51.4)
LANDING = (-123.09, 48.5)

KEYS = [  # (t, (lon, lat), zoom, rot, tilt)
    (0.0, SJI, 380, 0, 1),
    (1.3, SJI, 2450, 0, 1),
    (6.0, SJI, 2650, 0, 1),
    (7.0, SJI, 2000, 0, 1),
    (9.0, SJI, 2080, 0, 1),
    (10.3, SJI, 2300, -6, 0.8),
    (13.0, SJI, 2420, -7, 0.78),
    (14.4, PNW, 62, 0, 1),
    (17.0, PNW, 70, 0, 1),
    (18.6, CLAIM, 1250, 0, 1),
    (26.0, CLAIM, 1340, 0, 1),
    (27.1, SJI, 2250, 2, 1),
    (35.0, SJI, 2420, -2, 1),
    (36.4, SOUTH, 3500, 0, 1),
    (56.0, SOUTH, 3900, 0, 1),
    (57.6, LANDING, 1750, 0, 1),
    (68.0, LANDING, 1900, 0, 1),
    (69.1, SOUTH, 2650, 0, 1),
    (78.0, SOUTH, 2900, 0, 1),
    (80.4, WORLD, 6.0, 0, 1),
    (82.5, GER, 46, 0, 1),
    (88.0, GER, 54, 0, 1),
    (89.2, WORLD2, 6.0, 0, 1),
    (90.5, SJI, 2300, 0, 1),
    (94.5, SJI, 2560, 0, 1),
]


def camera_at(t):
    k = KEYS
    if t <= k[0][0]:
        i = 0
        u = 0.0
    elif t >= k[-1][0]:
        i = len(k) - 2
        u = 1.0
    else:
        i = max(j for j in range(len(k) - 1) if k[j][0] <= t)
        u = (t - k[i][0]) / (k[i + 1][0] - k[i][0])
    a, b = k[i], k[i + 1]
    big = abs(math.log(b[2] / a[2])) > 0.4
    ue = ease_io(u) if big else u * 0.15 + ease_io(u) * 0.85
    z0, z1 = a[2], b[2]
    z = math.exp(lerp(math.log(z0), math.log(z1), ue))
    x0, y0 = merc(*a[1])
    x1, y1 = merc(*b[1])
    if big:
        w = (1 / z0 - 1 / z) / (1 / z0 - 1 / z1)
    else:
        w = ue
    cx, cy = lerp(x0, x1, w), lerp(y0, y1, w)
    return Camera(cx, cy, z, lerp(a[3], b[3], ue), lerp(a[4], b[4], ue), W, H)


# ---------------------------------------------------------------- assets

class Assets:
    def __init__(self):
        self.land = LandPaths()
        levels = load_rings()
        self.sji = island_ring(levels, -123.07, 48.53)
        self.ocean_tex = self._noise_tile(512, 3.0, 0.10, seed=1)
        self.land_tex = self._noise_tile(512, 9.0, 0.16, seed=2)
        self.grain = self._noise_tile(256, 60.0, 0.05, seed=3)
        self.stars = [(random.Random(i).uniform(0, W), random.Random(i + 99).uniform(0, H * 0.75),
                       random.Random(i + 7).uniform(1.0, 3.2)) for i in range(120)]

    @staticmethod
    def _noise_tile(n, freq, amp, seed):
        rng = np.random.default_rng(seed)
        z = rng.standard_normal((n, n))
        f = np.fft.fftfreq(n)
        fx, fy = np.meshgrid(f, f)
        r = np.sqrt(fx ** 2 + fy ** 2) * n
        spec = np.fft.fft2(z) * np.exp(-(r / freq) ** 2) + np.fft.fft2(z) * 0.08 * (r > 0)
        v = np.real(np.fft.ifft2(spec))
        v = (v - v.mean()) / (v.std() * 2.5)
        v = np.clip(v, -1, 1)
        a = (np.abs(v) * amp * 255).astype(np.uint8)
        white = (v > 0)
        arr = np.zeros((n, n, 4), dtype=np.uint8)
        arr[..., 3] = a
        for c in range(3):
            arr[..., c] = np.where(white, a, 0)
        surf = cairo.ImageSurface.create_for_data(bytearray(arr.tobytes()), cairo.FORMAT_ARGB32, n, n, n * 4)
        pat = cairo.SurfacePattern(surf)
        pat.set_extend(cairo.EXTEND_REPEAT)
        pat.set_filter(cairo.FILTER_BILINEAR)
        return pat


# ---------------------------------------------------------------- map layer

def draw_map(ctx, cam, A, T):
    D.src(ctx, D.OCEAN)
    ctx.paint()
    # ocean texture drifts with the camera a bit
    m = cairo.Matrix()
    m.translate(cam.cx * 40 % 512, cam.cy * 40 % 512)
    m.scale(1.4, 1.4)
    A.ocean_tex.set_matrix(m)
    ctx.set_source(A.ocean_tex)
    ctx.paint()
    # deeper water darkening away from coast is approximated by a vignette
    ctx.new_path()
    A.land.append(ctx, cam)
    land = ctx.copy_path()
    # drop shadow
    ctx.save()
    ctx.translate(7, 10)
    ctx.new_path()
    ctx.append_path(land)
    D.src(ctx, (0, 0, 0), 0.32)
    ctx.set_fill_rule(cairo.FILL_RULE_EVEN_ODD)
    ctx.fill()
    ctx.restore()
    # shallow-water halo
    ctx.new_path()
    ctx.append_path(land)
    D.src(ctx, hexc("#2C6A78"), 0.55)
    ctx.set_line_width(14)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.stroke()
    ctx.new_path()
    ctx.append_path(land)
    ctx.set_fill_rule(cairo.FILL_RULE_EVEN_ODD)
    D.src(ctx, D.LAND)
    ctx.fill_preserve()
    ctx.save()
    ctx.clip_preserve()
    A.land_tex.set_matrix(cairo.Matrix(x0=-cam.cx * 30 % 512, y0=-cam.cy * 30 % 512))
    ctx.set_source(A.land_tex)
    ctx.paint()
    ctx.restore()
    D.src(ctx, hexc("#5E5A3B"))
    ctx.set_line_width(2.2)
    ctx.stroke()
    ctx.set_fill_rule(cairo.FILL_RULE_WINDING)


def sji_path(ctx, cam, A):
    ctx.save()
    ctx.transform(cam.matrix())
    xy = A.sji
    ctx.move_to(*xy[0])
    for p in xy[1:]:
        ctx.line_to(*p)
    ctx.close_path()
    ctx.restore()


def vignette(ctx):
    g = cairo.RadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, H * 0.75)
    g.add_color_stop_rgba(0, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, 0.45)
    ctx.set_source(g)
    ctx.paint()


def polyline_partial(ctx, pts, k):
    """Path through pts up to fraction k of total length."""
    if k <= 0 or len(pts) < 2:
        return
    segs = [math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1)]
    total = sum(segs) or 1
    target = total * clamp(k)
    ctx.move_to(*pts[0])
    acc = 0
    for i, sl in enumerate(segs):
        if acc + sl >= target:
            f = (target - acc) / (sl or 1)
            ctx.line_to(lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f))
            return
        ctx.line_to(*pts[i + 1])
        acc += sl


def smooth_pts(pts, n=12):
    """Catmull-Rom through pts."""
    out = []
    P = [pts[0]] + list(pts) + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for j in range(n):
            t = j / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2
                                    + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3) for c in range(2)))
    out.append(P[-2])
    return out


HARO = [(-123.3, 48.22), (-123.27, 48.40), (-123.24, 48.52), (-123.25, 48.64), (-123.13, 48.73),
        (-123.1, 48.83), (-123.32, 49.0)]
ROSARIO = [(-122.85, 48.22), (-122.76, 48.40), (-122.73, 48.55), (-122.76, 48.68), (-122.9, 48.79),
           (-123.15, 48.9), (-123.32, 49.0)]
BORDER49 = [(-123.32, 49.0), (-95.15, 49.0)]
CHANNEL = [(-123.32, 49.0), (-123.15, 48.85), (-123.13, 48.6), (-123.4, 48.3), (-124.2, 48.35), (-124.9, 48.5)]


def geo_line(ctx, cam, pts, k, color, width, dash=None, glow=False):
    sp = [cam.to_screen(*p) for p in pts]
    sp = smooth_pts(sp, 10)
    ctx.save()
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    if glow:
        for wmul, a in ((5, 0.12), (2.6, 0.25)):
            ctx.new_path()
            polyline_partial(ctx, sp, k)
            D.src(ctx, color, a)
            ctx.set_line_width(width * wmul)
            ctx.stroke()
    ctx.new_path()
    polyline_partial(ctx, sp, k)
    if dash:
        ctx.set_dash(dash)
    D.src(ctx, (0, 0, 0), 0.35)
    ctx.set_line_width(width + 4)
    ctx.stroke_preserve()
    D.src(ctx, color)
    ctx.set_line_width(width)
    ctx.stroke()
    ctx.restore()


def map_label(ctx, cam, lon, lat, text, size, k=1.0, alpha=0.9):
    if k <= 0.001:
        return
    x, y = cam.to_screen(lon, lat)
    D.styled_text(ctx, text, x, y, size, D.SANS_B, (1, 1, 1), k=k, shadow=0.5, max_w=1000)


# ---------------------------------------------------------------- overlays on map

def map_overlays(ctx, cam, A, T):
    # 49th parallel border (drawn in at 14s, persistent afterwards)
    if T >= 14.0:
        k = ease_io((T - 14.0) / 1.6)
        glow = T < 26
        geo_line(ctx, cam, BORDER49, k, D.GOLD if glow else (1, 1, 1), 7 if glow else 4,
                 None if glow else [14, 10], glow=glow)
        if 15.3 <= T < 17.8:
            k2 = ease_io((T - 15.3) / 1.3)
            geo_line(ctx, cam, CHANNEL, k2, D.GOLD, 6, [18, 12], glow=True)
    # claim lines (Haro = US claim, Rosario = British claim)
    if 21.4 <= T < 27.0:
        fade = 1 - clamp((T - 26.2) / 0.7)
        k1 = ease_io((T - 21.4) / 1.4)
        k2 = ease_io((T - 21.9) / 1.4)
        ctx.push_group()
        geo_line(ctx, cam, HARO, k1, hexc("#4A7BD0"), 7, [20, 14], glow=True)
        geo_line(ctx, cam, ROSARIO, k2, hexc("#E04848"), 7, [20, 14], glow=True)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(fade)
    # island flicker: both claim it
    if 23.0 <= T < 26.4:
        a = 0.55 * (1 - clamp((T - 25.9) / 0.5))
        phase = int((T - 23.0) * 3) % 2
        ctx.save()
        sji_path(ctx, cam, A)
        ctx.clip()
        x0, y0 = cam.to_screen(-123.2, 48.64)
        x1, y1 = cam.to_screen(-122.94, 48.44)
        ctx.push_group()
        if phase == 0:
            D.union_jack(ctx, x0, y0, (x1 - x0) / 2, y1 - y0)
            D.us_flag(ctx, (x0 + x1) / 2, y0, (x1 - x0) / 2, y1 - y0, stars=False)
        else:
            D.us_flag(ctx, x0, y0, (x1 - x0) / 2, y1 - y0, stars=False)
            D.union_jack(ctx, (x0 + x1) / 2, y0, (x1 - x0) / 2, y1 - y0)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(a)
        ctx.restore()
    # final: US flag masks the island (circle wipe)
    if T >= 90.4:
        k = ease_out((T - 90.4) / 0.9)
        ctx.save()
        sji_path(ctx, cam, A)
        ctx.clip()
        cx, cy = cam.to_screen(-123.07, 48.53)
        ctx.arc(cx, cy, 900 * k, 0, 2 * math.pi)
        ctx.clip()
        x0, y0 = cam.to_screen(-123.2, 48.64)
        x1, y1 = cam.to_screen(-122.94, 48.44)
        D.us_flag(ctx, x0, y0, x1 - x0, y1 - y0)
        ctx.restore()
        ctx.save()
        sji_path(ctx, cam, A)
        D.src(ctx, D.INK, k)
        ctx.set_line_width(4)
        ctx.stroke()
        ctx.restore()


# ---------------------------------------------------------------- text layers

CAPTIONS = [  # (t0, t1, text)
    (0.45, 3.0, "Eating my potatoes"),
    (3.05, 6.0, "I just shot it"),
    (6.05, 9.0, "Send the warships"),
    (11.25, 13.0, "Over ONE dead pig"),
    (22.9, 26.0, "Both claimed it"),
    (27.6, 31.0, "Side by side"),
    (31.1, 35.0, "Tensions: HIGH"),
    (44.3, 46.0, "Pulled the trigger"),
    (68.8, 72.7, "Insults by day"),
    (72.9, 78.0, "Drinks by night"),
    (82.6, 88.0, "Germany picked\nthe winner"),
]

TITLES = [  # gold serif date cards
    (9.2, 11.1, "1859"),
    (13.3, 17.0, "1846: The Blurry Border"),
    (35.2, 39.0, "June 15, 1859"),
    (89.9, 92.0, "1872"),
]

CAP_Y = 1440
TITLE_Y = 300


def draw_text_layers(ctx, T):
    for t0, t1, txt in CAPTIONS:
        k = window(T, t0, t1, 0.28, 0.18)
        if k > 0:
            D.styled_text(ctx, txt, W / 2, CAP_Y, 86, D.SANS, D.WHITE, k=k, max_w=960)
    for t0, t1, txt in TITLES:
        k = window(T, t0, t1, 0.35, 0.2)
        if k > 0:
            ctx.save()
            # dark ribbon behind
            ctx.push_group()
            D.src(ctx, (0.05, 0.08, 0.1), 0.55)
            D.rrect(ctx, 60, TITLE_Y - 75, W - 120, 150, 30)
            ctx.fill()
            ctx.pop_group_to_source()
            ctx.paint_with_alpha(clamp(k))
            ctx.restore()
            D.styled_text(ctx, txt, W / 2, TITLE_Y, 92, D.SERIF, k=k, max_w=900,
                          grad=(hexc("#FFE58A"), hexc("#E0A526")), stroke=hexc("#3A2A08"))


def kinetic(ctx, txt, x, y, size, k, rot=0.0, color=None):
    D.styled_text(ctx, txt, x, y, size, D.SANS, color or hexc("#FFD43B"), k=k, max_w=1000,
                  stroke=hexc("#3A2A08"), rot=rot, shadow=0.7)


# ---------------------------------------------------------------- scenes

def wob(T, f=2.0, a=1.0, ph=0.0):
    return math.sin(T * f * 2 * math.pi + ph) * a


def scene_cold_open(ctx, cam, A, T):
    exit_k = D.popout(13.0 - T, 0.25)
    # map label
    k = window(T, 0.3, 2.8)
    if k:
        x, y = cam.to_screen(-123.07, 48.64)
        D.styled_text(ctx, "SAN JUAN ISLAND", x, y - 40, 44, D.SANS_B, k=k, shadow=0.55)
    px, py = 545, 1000
    # potato patch + pig
    kp = pop(T - 0.25) * exit_k
    n_left = 6 - int(clamp((T - 0.8) / 2.4) * 3)
    D.potato_patch(ctx, px - 10, py + 60, 330, n_left, kp)
    dead = clamp((T - 4.22) / 0.35)
    munch = abs(math.sin(T * 9)) if T < 4.2 else 0.0
    ps = 190
    pig_y = py + (0 if dead == 0 else -30 * math.sin(math.pi * dead))
    D.pig(ctx, px, pig_y, ps, face=1, dead=dead, munch=munch, t=T, scale=pop(T - 0.6) * exit_k)
    # Britain (left)
    kb = pop(T - 0.4) * exit_k
    if T < 3.0:
        b = dict(look=(0.6, 0.5), angry=0.6, rarm=(25 + wob(T, 3, 6), 15), larm=(115, 105))
    elif T < 6.0:
        sh = T > 4.25
        b = dict(look=(1, 0.1 if not sh else 0.5), lid=0.0, angry=0.0 if sh else 0.3,
                 rarm=(60, 80) if not sh else (-60, -100), larm=(120, 100) if not sh else (-120, -80))
    elif T < 9.0:
        b = dict(look=(0.4, 0), lid=0.55, angry=1.0, rarm=(-20, 10), larm=(115, 100))
    else:
        b = dict(look=(1, 0.2), lid=0.45, angry=1.0, rarm=(70, 85), larm=(110, 95))
    bob = wob(T, 1.3, 6)
    D.flag_char(ctx, 245, 700 + bob, 250, "uk", scale=kb, t=T, **b)
    # USA (right) with rifle
    ku = pop(T - 3.0) * exit_k
    if ku > 0:
        if T < 6.0:
            u = dict(look=(-0.8, 0.6), angry=0.4, larm=(150, 160), rarm=(70, 85))
        elif T < 9.0:
            sx = clamp((T - 6.8) / 0.4)
            u = dict(look=(lerp(-0.8, 0.5, sx), lerp(0.4, -0.5, sx)), lid=0.0, angry=0.1, larm=(150, 165), rarm=(70, 85))
        else:
            u = dict(look=(-1, 0.2), lid=0.45, angry=1.0, larm=(110, 95), rarm=(70, 85))
        recoil = -8 * math.exp(-max(0, T - 4.2) * 10) if T > 4.2 else 0
        hands = D.flag_char(ctx, 830 + recoil, 700 - bob, 250, "us", scale=ku, t=T + 1, **u)
        if T < 9.0:
            hx, hy = hands["l"]
            mz = D.rifle(ctx, hx, hy, 170 * ku, 142 + recoil * 0.6)
            if 4.2 <= T < 4.5:
                D.muzzle_flash(ctx, mz[0], mz[1], 60, (T - 4.2) / 0.3)
            if 4.2 <= T < 5.6:
                D.puff(ctx, mz[0] - 20, mz[1] - 10, 90, (T - 4.2) / 1.4, seed=5)
    # warships around the island
    ships = [((-123.24, 48.47), 1, 6.8), ((-123.05, 48.405), 1, 7.1), ((-122.91, 48.49), -1, 7.4)]
    for i, ((lon, lat), face, t0) in enumerate(ships):
        if T < t0:
            continue
        sx, sy = cam.to_screen(lon, lat)
        slide = 1 - ease_out((T - t0) / 0.7)
        sx -= face * 700 * slide
        D.warship(ctx, sx, sy, 210, face=face, t=T, scale=exit_k, seed=i)
    # dust lines (glare) in tilt section
    if 10.0 <= T < 13.0:
        k = window(T, 10.0, 13.0)
        for i in range(3):
            D.src(ctx, D.WHITE, 0.7 * clamp(k))
            ctx.set_line_width(5)
            yy = 640 + i * 22
            ctx.move_to(400 + wob(T, 6, 6, i), yy)
            ctx.line_to(680 + wob(T, 6, 6, i + 1), yy + wob(T, 5, 8, i))
            ctx.stroke()


def scene_1846(ctx, cam, A, T):
    if T < 13.6 or T > 26.6:
        return
    # region labels
    for lon, lat, txt, t0 in ((-121.5, 51.5, "BRITISH\nNORTH AMERICA", 13.8), (-120.2, 47.2, "UNITED STATES", 14.0)):
        k = window(T, t0, 17.3)
        map_label(ctx, cam, lon, lat, txt, 50, k)
    # flag characters on each side of the line
    k1 = window(T, 14.2, 17.2)
    k2 = window(T, 14.4, 17.2)
    D.flag_char(ctx, 300, 560, 170, "uk", look=(0.6, 0.8), scale=k1, t=T, rarm=(40, 60))
    D.flag_char(ctx, 260, 1250, 170, "us", look=(0.6, -0.8), scale=k2, t=T, larm=(140, 120))
    k = window(T, 16.0, 17.3)
    if k:
        x, y = cam.to_screen(-123.1, 48.55)
        D.styled_text(ctx, "???", x + 80, y, 64, D.SANS, D.GOLD, k=k, stroke=D.INK)
    # diplomats signing
    kd = window(T, 17.4, 22.9)
    if kd > 0:
        sign_phase = 18.2 <= T < 20.0
        D.scroll(ctx, 540, 1180, 300, ease_out((T - 17.6) / 0.6) * clamp(kd))
        uk_o = dict(coat=hexc("#2A2A30"), hat="top", hair="short", hair_c=hexc("#888888"), beard="chops",
                    beard_c=hexc("#9A9A9A"), tie=D.UK_RED, band=D.UK_RED,
                    rarm=10 + (wob(T, 5, 12) if sign_phase else 0), larm=120,
                    mouth="o" if T > 21.2 else "smile", cheeks=True)
        us_o = dict(coat=hexc("#2E3550"), hat="top", hair="short", hair_c=hexc("#3A2614"), beard="chin",
                    beard_c=hexc("#3A2614"), tie=hexc("#3C5BB0"), band=hexc("#3C3B6E"),
                    larm=170 + (wob(T, 5, 12, 1) if sign_phase else 0), rarm=60,
                    mouth="o" if T > 21.2 else "smile", cheeks=True)
        h1 = D.person(ctx, 285, 1330, 300, uk_o, t=T, scale=kd)
        h2 = D.person(ctx, 795, 1330, 300, us_o, t=T, scale=kd)
        for hx, hy in (h1["r"], h2["l"]):
            D.src(ctx, D.WHITE)
            ctx.set_line_width(5)
            ctx.move_to(hx, hy)
            ctx.line_to(hx + 10, hy - 50)
            ctx.stroke()
        for x, t0 in ((285, 21.2), (795, 21.4)):
            kq = window(T, t0, 22.9)
            D.styled_text(ctx, "?", x + 70, 1000 - wob(T, 2, 8), 110, D.SANS, D.GOLD, k=kq, stroke=D.INK)
    # both claim it: flags + signs hammered into the island
    ku = window(T, 23.0, 26.4)
    if ku > 0:
        D.flag_char(ctx, 860, 560, 190, "uk", look=(-0.7, 0.6), angry=0.5, scale=ku, t=T, larm=(170, 160))
        D.flag_char(ctx, 220, 560, 190, "us", look=(0.7, 0.6), angry=0.5, scale=ku, t=T + 2, rarm=(10, 20))
        for lon, lat, txt, t0 in ((-122.99, 48.55, "OURS", 23.6), (-123.13, 48.57, "NO, OURS", 24.3)):
            ks = window(T, t0, 26.4)
            if ks:
                x, y = cam.to_screen(lon, lat)
                drop = (1 - ease_out((T - t0) / 0.25)) * 120
                D.sign(ctx, x, y - drop, 190, txt, rot=wob(T, 1, 3), scale=ks)


def scene_settlers(ctx, cam, A, T):
    if T < 26.3 or T > 35.3:
        return
    ex = D.popout(35.2 - T)
    k1 = pop(T - 26.5) * ex
    k2 = pop(T - 27.3) * ex
    D.glow_circle(ctx, 300, 820, 175, hexc("#E04848"), k1, T)
    D.glow_circle(ctx, 780, 820, 175, hexc("#4A7BD0"), k2, T)
    if k1 > 0.05:
        ctx.save()
        ctx.translate(300, 830)
        ctx.scale(k1, k1)
        D.sheep(ctx, -30, 20, 160, T)
        D.sheep(ctx, 50, -40, 110, T + 0.5)
        ctx.restore()
        D.styled_text(ctx, "British sheep farm", 300, 1050, 42, D.SANS_B, k=k1)
    if k2 > 0.05:
        ctx.save()
        ctx.translate(780, 830)
        ctx.scale(k2, k2)
        D.cabin(ctx, -20, 30, 190)
        D.cabin(ctx, 65, -40, 100)
        ctx.restore()
        D.styled_text(ctx, "American settlers", 780, 1050, 42, D.SANS_B, k=k2)
    if 31.0 <= T < 35.0:
        D.zap(ctx, 480, 800, 600, 840, T, seed=1, width=9)
        if T > 32.4:
            D.zap(ctx, 470, 860, 610, 780, T, seed=9, width=6)
    # little flags planted near each icon
    D.flag_char(ctx, 170, 640, 120, "uk", look=(1, 0), angry=clamp((T - 31) * 2) * 0.8, scale=k1, t=T)
    D.flag_char(ctx, 910, 640, 120, "us", look=(-1, 0), angry=clamp((T - 31) * 2) * 0.8, scale=k2, t=T)


CUTLAR = dict(coat=hexc("#6B6B6B"), pants=hexc("#4A4A4A"), hat="straw", hair="short",
              hair_c=hexc("#5A4030"), beard="full", beard_c=hexc("#5A4030"), mono=True, brow=1)


def scene_cutlar(ctx, cam, A, T):
    if T < 35.4 or T > 56.3:
        return
    ex = D.popout(56.2 - T)
    gx, gy = 600, 900
    D.potato_patch(ctx, gx, gy + 70, 360, 4, pop(T - 35.6) * ex)
    dead = clamp((T - 44.32) / 0.35)
    munch = abs(math.sin(T * 9)) if T < 44.3 else 0.0
    D.pig(ctx, gx, gy - (30 * math.sin(math.pi * dead) if dead > 0 else 0), 200, face=1 if T < 44.3 else -1,
          dead=dead, munch=munch, t=T, scale=pop(T - 35.9) * ex)
    # Cutlar: monochrome sticker cutout
    kc = pop(T - 37.5) * ex
    aim = T < 46.0
    o = dict(CUTLAR)
    if aim:
        o.update(rarm=-5, larm=10, mouth="frown")
    else:
        o.update(rarm=-40 if T < 49.5 else 70, larm=120, mouth="o" if T > 49.5 else "smile", brow=0)
    hands = D.person(ctx, 250, 1260, 430, o, t=T, scale=kc, sticker=True)
    k_tag = window(T, 38.1, 43.5)
    if k_tag:
        D.styled_text(ctx, "Lyman Cutlar\nAmerican farmer", 250, 1350, 38, D.SANS_B, k=k_tag)
    if aim and kc > 0:
        hx, hy = hands["r"]
        recoil = -10 * math.exp(-max(0, T - 44.3) * 10) if T > 44.3 else 0
        mz = D.rifle(ctx, hx + recoil, hy, 230 * kc, -8)
        if 44.3 <= T < 44.6:
            D.muzzle_flash(ctx, mz[0], mz[1], 80, (T - 44.3) / 0.3)
        if 44.3 <= T < 45.8:
            D.puff(ctx, mz[0], mz[1] - 10, 110, (T - 44.3) / 1.5, seed=8)
    # $10 offer
    if 46.4 <= T < 56.2 and kc > 0:
        hx, hy = hands["r"]
        if T < 49.5:
            D.bill(ctx, hx + 40, hy - 40, 190, rot=-10 + wob(T, 1.5, 4), scale=pop(T - 46.4))
        else:
            u = (T - 49.5) / 1.2
            if u < 1:
                D.bill(ctx, lerp(hx + 40, -200, ease_out(u)), lerp(hy - 40, 300, u) - 300 * math.sin(math.pi * u * 0.5),
                       190, rot=-10 + u * 720)
    # Britain: slaps it away, demands $100, handcuffs
    kb = pop(T - 47.4) * ex
    if kb > 0:
        if T < 49.3:
            arms = dict(larm=(150, 140), rarm=(60, 80))
        elif T < 50.0:
            u = clamp((T - 49.3) / 0.2)
            arms = dict(larm=(lerp(150, 200, u), lerp(140, 230, u)), rarm=(60, 80))
        else:
            arms = dict(larm=(200, 250), rarm=(-30, -60))
        hb = D.flag_char(ctx, 830, 700, 250, "uk", look=(-1, 0.3), lid=0.3, angry=1.0, scale=kb, t=T, **arms)
        if T >= 51.0:
            hx, hy = hb["l"]
            D.sign(ctx, hx, hy + 40, 200, "$100", rot=-8 + wob(T, 1.2, 4), scale=pop(T - 51.0),
                   color=hexc("#1F5C2A"))
        if T >= 53.4:
            hx, hy = hb["r"]
            D.handcuffs(ctx, hx - 50, hy - 20, 110, rot=-20, t=T, scale=pop(T - 53.4))
    # "$10 vs $100" kinetic caption
    k10 = window(T, 47.0, 56.0)
    kv = window(T, 48.0, 56.0)
    k100 = window(T, 51.0, 56.0)
    kinetic(ctx, "$10", 270, CAP_Y + 20, 130, k10, rot=-4, color=hexc("#8CE99A"))
    D.styled_text(ctx, "vs", 500, CAP_Y + 20, 70, D.SANS, k=kv)
    kinetic(ctx, "$100", 790, CAP_Y + 20, 150, k100, rot=4)


PICKETT = dict(coat=hexc("#2C3E6B"), pants=hexc("#26304D"), hat="kepi", long_hair=True, hair="long",
               hair_c=hexc("#6B4423"), stache=True, beard_c=hexc("#6B4423"), mouth="smile", brow=1)


def scene_troops(ctx, cam, A, T):
    if T < 56.0 or T > 68.3:
        return
    ex = D.popout(68.2 - T)
    tx, ty = cam.to_screen(-123.025, 48.47)
    u = ease_out((T - 56.3) / 2.2)
    hop = abs(math.sin(T * 7)) * 30 if T < 58.6 else 0
    ux, uy = lerp(tx, tx, u), lerp(H + 200, ty - 120, u) - hop
    D.flag_char(ctx, ux, uy, 200, "us", look=(0.3, -0.6) if T < 62 else (0.8, -0.2), angry=0.6, scale=ex, t=T,
                larm=(200, 220) if T < 58.6 else (115, 100), rarm=(-20, -40) if T < 58.6 else (65, 80))
    for i, (dx, t0) in enumerate(((-190, 59.0), (180, 59.6))):
        D.cannon(ctx, ux + dx, uy + 120, 150, face=1 if dx > 0 else -1, scale=pop(T - t0) * ex)
    kp = pop(T - 58.2) * ex
    D.person(ctx, ux - 330, uy + 40, 230, PICKETT, t=T, scale=kp)
    k_tag = window(T, 58.5, 61.8)
    if k_tag:
        D.styled_text(ctx, "Capt. George Pickett", ux - 330, uy + 100, 38, D.SANS_B, k=k_tag)
    # five British warships
    ships = [((-123.25, 48.57), 1), ((-123.23, 48.47), 1), ((-123.15, 48.405), 1),
             ((-123.0, 48.4), -1), ((-122.95, 48.36), -1)]
    for i, ((lon, lat), face) in enumerate(ships):
        t0 = 62.0 + i * 0.55
        if T < t0:
            continue
        sx, sy = cam.to_screen(lon, lat)
        slide = 1 - ease_out((T - t0) / 0.6)
        sx += face * -650 * slide
        D.warship(ctx, sx, sy, 170, face=face, t=T, scale=ex, seed=i + 3)
    # kinetic stats
    k5 = window(T, 62.9, 68.0)
    kinetic(ctx, "5 WARSHIPS", W / 2, 330, 120, k5, rot=-3)
    kn = window(T, 64.3, 68.0)
    n = int(round(2000 * ease_out((T - 64.3) / 1.6) / 10) * 10) if T > 64.3 else 0
    kinetic(ctx, f"{n:,} MEN", W / 2, 490, 120, kn, rot=2)


def scene_insults(ctx, cam, A, T):
    if T < 68.4 or T > 78.3:
        return
    ex = D.popout(78.2 - T)
    night = clamp((T - 72.6) / 0.6)
    close = ease_io((T - 73.0) / 1.0)
    bx = lerp(270, 400, close)
    ux = lerp(810, 680, close)
    raise_k = ease_out((T - 75.2) / 0.4) if T > 75.2 else 0
    if night < 0.5:
        bargs = dict(look=(1, 0), lid=0.3, angry=1.0, rarm=(-30 + wob(T, 4, 15), -60), larm=(115, 100))
        uargs = dict(look=(-1, 0), lid=0.3, angry=1.0, larm=(210 + wob(T, 4, 15, 1), 240), rarm=(65, 80))
    else:
        bargs = dict(look=(0.8, 0.2), lid=0.35, angry=0.0, rarm=(lerp(20, -40, raise_k), lerp(10, -50, raise_k)), larm=(115, 100))
        uargs = dict(look=(-0.8, 0.2), lid=0.35, angry=0.0, larm=(lerp(160, 220, raise_k), lerp(170, 230, raise_k)), rarm=(65, 80))
    hb = D.flag_char(ctx, bx, 820 + wob(T, 1.2, 5), 240, "uk", scale=pop(T - 68.5) * ex, t=T, **bargs)
    hu = D.flag_char(ctx, ux, 820 - wob(T, 1.2, 5), 240, "us", scale=pop(T - 68.6) * ex, t=T, **uargs)
    D.bubble(ctx, 760, 560, "Cowards!", 60, tail=(10, 90), k=window(T, 68.9, 72.5))
    D.bubble(ctx, 320, 520, "Pig murderer!", 56, tail=(-20, 100), k=window(T, 70.0, 72.5))
    D.bubble(ctx, 760, 420, "Tea addicts!", 52, tail=(20, 70), k=window(T, 71.2, 72.5))
    # night
    if night > 0:
        D.src(ctx, hexc("#07122B"), 0.62 * night * ex + 0.0)
        ctx.paint()
        for i, (sx, sy, r) in enumerate(A.stars):
            tw = 0.5 + 0.5 * math.sin(T * 3 + i)
            D.src(ctx, D.WHITE, 0.8 * night * tw * ex)
            ctx.arc(sx, sy * 0.6, r, 0, 6.3)
            ctx.fill()
        ctx.arc(860, 230, 70, 0, 6.3)
        D.src(ctx, hexc("#FFF6D5"), night * ex)
        ctx.fill()
        D.campfire(ctx, 540, 1080, 120 * pop(T - 73.0) * ex, T)
        # re-draw characters lit by the fire (semi-transparent so they read)
        hb = D.flag_char(ctx, bx, 820 + wob(T, 1.2, 5), 240, "uk", scale=ex, t=T, alpha=0.75 * night, shadow=False, **bargs)
        hu = D.flag_char(ctx, ux, 820 - wob(T, 1.2, 5), 240, "us", scale=ex, t=T, alpha=0.75 * night, shadow=False, **uargs)
        if T > 73.3:
            D.mug(ctx, hb["r"][0] + 10, hb["r"][1] - 20, 90 * ex, rot=lerp(0, 20, raise_k))
            D.mug(ctx, hu["l"][0] - 10, hu["l"][1] - 20, 90 * ex, rot=lerp(0, -20, raise_k))
        if 75.55 <= T < 76.4:
            k = (T - 75.55) / 0.85
            D.src(ctx, D.GOLD, 1 - k)
            D.star(ctx, 540, hb["r"][1] - 70, 40 + 60 * k, 8, 0.4)
            ctx.fill()


KAISER = dict(coat=D.WHITE, stripes=True, pants=hexc("#1A1A1A"), hat="pickel", hair="bald", hair_c=D.WHITE,
              beard="chops", beard_c=hexc("#EEEEEE"), stache=True, stache_c=hexc("#EEEEEE"), mouth="o", brow=1)


def scene_kaiser(ctx, cam, A, T):
    if T < 78.4 or T > 88.3:
        return
    ex = D.popout(88.2 - T)
    # London & Washington facepalm
    for lon, lat, kind, t0, txt in ((-77.0, 38.9, "us", 79.0, "This is dumb"), (-0.1, 51.5, "uk", 79.5, "Agreed")):
        k = window(T, t0, 82.0)
        if k:
            x, y = cam.to_screen(lon, lat)
            D.flag_char(ctx, x, y - 50, 120, kind, lid=0.6, look=(0, 0.8), scale=k, t=T,
                        larm=(-70, -110), rarm=(-110, -70))
            D.bubble(ctx, x, y - 190, txt, 40, tail=(0, 60), k=k)
    # Berlin marker + Kaiser referee
    kb = window(T, 81.8, 88.3)
    if kb > 0:
        bx, by = cam.to_screen(13.4, 52.5)
        D.glow_circle(ctx, bx, by, 26, D.GOLD, kb, T)
        D.flag_char(ctx, bx + 120, by - 40, 110, "de", look=(-0.6, 0.6), scale=window(T, 82.0, 88.3), t=T)
    kk = pop(T - 82.0) * ex
    point = T > 84.8
    o = dict(KAISER, face=1, larm=180 if point else 120, rarm=-60 if not point else 70)
    hands = D.person(ctx, 640, 1330, 560, o, t=T, scale=kk, sticker=True)
    if kk > 0:
        if not point:
            hx, hy = hands["r"]
            D.whistle(ctx, hx - 10, hy - 10, 40 * kk)
        k_tag = window(T, 82.4, 84.6)
        if k_tag:
            D.styled_text(ctx, "Kaiser Wilhelm I", 640, 700, 44, D.SANS_B, k=k_tag)
        if point:
            hx, hy = hands["l"]
            k = ease_out((T - 84.8) / 0.5)
            ctx.save()
            ctx.set_dash([20, 14])
            D.src(ctx, D.WHITE)
            ctx.set_line_width(7)
            ctx.move_to(hx - 20, hy)
            ctx.curve_to(hx - 150, hy - 200 * k, 200, hy - 260 * k, lerp(hx, 60, k), hy - 120 * k)
            ctx.stroke()
            ctx.restore()
            if k > 0.6:
                D.flag_char(ctx, 120, hy - 200, 140, "us", look=(1, 0), scale=pop(T - 85.2), t=T,
                            larm=(-130, -150), rarm=(-50, -30))
        if 84.8 <= T < 85.5:
            hx, hy = hands["r"]
            for i in range(3):
                D.src(ctx, D.WHITE, 1 - (T - 84.8) / 0.7)
                ctx.set_line_width(6)
                a = -0.6 + i * 0.4
                ctx.move_to(hx + 40 * math.cos(a), hy + 40 * math.sin(a) - 40)
                ctx.line_to(hx + 90 * math.cos(a), hy + 90 * math.sin(a) - 40)
                ctx.stroke()


def scene_end(ctx, cam, A, T):
    if T < 90.4:
        return
    kf = pop(T - 90.6)
    x, y = cam.to_screen(-122.95, 48.62)
    D.flag_char(ctx, x + 70, y - 60, 170, "us", look=(-0.5, 0.5), scale=kf, t=T,
                larm=(-120 + wob(T, 3, 10), -140), rarm=(-60 - wob(T, 3, 10), -40))
    # casualties stat
    k0 = pop(T - 91.9)
    k1 = pop(T - 92.4)
    D.stick_figure(ctx, 260, CAP_Y + 40, 160 * k0)
    kinetic(ctx, "0", 400, CAP_Y - 10, 210, k0, rot=-4)
    D.styled_text(ctx, "HUMANS", 330, CAP_Y + 140, 48, D.SANS, k=k0)
    rise = ease_out((T - 92.4) / 1.6) * 160
    D.pig(ctx, 700, CAP_Y + 20 - rise, 130, face=-1, angel=1.0, t=T, scale=k1)
    kinetic(ctx, "1", 860, CAP_Y - 10, 210, k1, rot=4)
    D.styled_text(ctx, "PIG", 780, CAP_Y + 140, 48, D.SANS, k=k1)


SCENES = [scene_cold_open, scene_1846, scene_settlers, scene_cutlar, scene_troops,
          scene_insults, scene_kaiser, scene_end]

SHAKES = [4.2, 44.3, 6.3]


# ---------------------------------------------------------------- frame

def draw_frame(ctx, A, T):
    cam = camera_at(T)
    for s in SHAKES:
        if s <= T < s + 0.3:
            a = 14 * (1 - (T - s) / 0.3)
            cam.sx += random.Random(int(T * 60)).uniform(-a, a)
            cam.sy += random.Random(int(T * 60) + 1).uniform(-a, a)
    draw_map(ctx, cam, A, T)
    # tilt haze (fake 3D horizon)
    if cam.tilt < 0.99:
        g = cairo.LinearGradient(0, 0, 0, H * 0.45)
        a = (1 - cam.tilt) * 2.5
        g.add_color_stop_rgba(0, 0.6, 0.75, 0.8, 0.55 * a)
        g.add_color_stop_rgba(1, 0.6, 0.75, 0.8, 0)
        ctx.set_source(g)
        ctx.paint()
    map_overlays(ctx, cam, A, T)
    vignette(ctx)
    for sc in SCENES:
        sc(ctx, cam, A, T)
    draw_text_layers(ctx, T)
    ctx.set_source(A.grain)
    ctx.paint_with_alpha(0.6)


# ---------------------------------------------------------------- sound cues (storyboard time)

SFX_CUES = [  # (t, name, pan)
    (0.0, "whoosh", 0), (0.4, "boing", -0.3), (0.6, "pop", 0), (0.9, "oink", 0.1), (1.6, "munch", 0),
    (2.3, "oink", 0.1), (3.0, "pop", 0.4), (4.2, "gunshot", 0.3), (4.4, "oink", 0),
    (6.05, "thud", 0), (6.8, "whoosh", -0.4), (7.0, "horn", 0), (7.4, "whoosh", 0.4),
    (9.2, "pop", 0), (10.2, "whoosh", 0), (11.25, "scratch", 0),
    (13.05, "whoosh", 0), (13.3, "ding", 0), (13.8, "pop", 0), (14.0, "pop", 0), (14.0, "whoosh", 0.3),
    (14.2, "pop", -0.3), (14.4, "pop", 0.3), (16.0, "boing", 0),
    (17.4, "whoosh", 0), (17.6, "pop", 0), (18.2, "scribble", 0), (21.2, "pop", -0.3), (21.4, "pop", 0.3),
    (21.5, "whoosh", 0), (23.0, "pop", 0), (23.6, "hammer", 0.3), (24.3, "hammer", -0.3),
    (26.4, "whoosh", 0), (26.6, "baa", -0.4), (27.3, "pop", 0.4), (27.6, "hammer", 0.4), (29.5, "baa", -0.4),
    (31.1, "zap", 0), (32.4, "zap", 0), (33.6, "zap", 0),
    (35.1, "whoosh", 0), (35.2, "ding", 0), (35.9, "munch", 0), (37.0, "oink", 0), (37.5, "pop", -0.4),
    (39.5, "munch", 0), (41.2, "oink", 0), (42.5, "cannon", -0.4), (44.3, "bang", 0),
    (46.4, "chaching", -0.3), (47.4, "pop", 0.4), (48.0, "pop", 0), (49.5, "slap", 0.2), (49.7, "whoosh", -0.4),
    (51.0, "chaching", 0.3), (53.4, "cuffs", 0.4),
    (56.2, "drums", 0), (56.4, "whoosh", 0), (58.2, "pop", 0), (59.0, "cannon", -0.3), (59.6, "cannon", 0.3),
    (62.0, "horn", 0), (62.0, "whoosh", 0.3), (62.55, "thud", 0), (63.1, "thud", 0), (63.65, "thud", 0),
    (64.2, "thud", 0), (62.9, "pop", 0), (64.3, "pop", 0), (66.0, "ding", 0),
    (68.5, "pop", -0.3), (68.9, "pop", 0.3), (70.0, "pop", -0.3), (71.2, "pop", 0.3),
    (72.6, "whoosh", 0), (72.7, "crickets", 0), (73.0, "pop", 0), (75.55, "clink", 0),
    (78.1, "whoosh", 0), (79.0, "pop", -0.3), (79.5, "pop", 0.3), (80.6, "whoosh", 0),
    (81.8, "pop", 0), (82.0, "boing", 0), (84.8, "whistle", 0), (85.2, "pop", -0.4),
    (88.05, "whoosh", 0), (89.3, "whoosh", 0), (89.9, "ding", 0), (90.4, "pop", 0), (90.6, "chaching", 0),
    (91.9, "pop", -0.3), (92.4, "harp", 0.3), (93.2, "ding", 0.3),
]


def music_env(T):
    """Music gain in storyboard time (record scratch stops it briefly)."""
    if 11.25 <= T < 12.6:
        return 0.0 if T < 12.3 else (T - 12.3) / 0.3
    return 1.0
