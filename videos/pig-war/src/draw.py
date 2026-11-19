"""Cartoon drawing primitives: flag characters, props, people, text."""
import math
import random

import cairo

# ---------------------------------------------------------------- utilities

def hexc(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


INK = hexc("#141416")
WHITE = (1, 1, 1)
GOLD = hexc("#F5C842")
GOLD_D = hexc("#C8901A")
OCEAN = hexc("#1E4D5C")
LAND = hexc("#8A855C")
UK_BLUE = hexc("#012169")
UK_RED = hexc("#C8102E")
US_RED = hexc("#B22234")
US_BLUE = hexc("#3C3B6E")

SANS = "Inter Black"
SANS_B = "Inter"
SERIF = "Caladea"


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def lerp(a, b, t):
    return a + (b - a) * t


def ease_io(t):
    t = clamp(t)
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_out(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in(t):
    t = clamp(t)
    return t * t * t


def back(t, s=1.9):
    t = clamp(t)
    t -= 1
    return t * t * ((s + 1) * t + s) + 1


def pop(t, dur=0.32):
    """0→1 scale with overshoot; t = seconds since appear."""
    if t <= 0:
        return 0.0
    return back(t / dur)


def popout(t_left, dur=0.22):
    """scale multiplier going 1→0 as t_left (seconds until exit) → 0."""
    if t_left >= dur:
        return 1.0
    return ease_out(max(0.0, t_left) / dur)


def window(t, t0, t1, fin=0.32, fout=0.22):
    """Appear at t0 with pop, disappear at t1. Returns scale 0..~1.1."""
    if t < t0 or t > t1:
        return 0.0
    return pop(t - t0, fin) * popout(t1 - t, fout)


def src(ctx, c, a=1.0):
    ctx.set_source_rgba(c[0], c[1], c[2], a)


def ellipse(ctx, x, y, rx, ry):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(max(rx, 1e-3), max(ry, 1e-3))
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.restore()


def rrect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()


def fill_stroke(ctx, fill, lw, stroke=INK, alpha=1.0):
    src(ctx, fill, alpha)
    ctx.fill_preserve()
    src(ctx, stroke, alpha)
    ctx.set_line_width(lw)
    ctx.stroke()


def star(ctx, x, y, r, n=5, inner=0.45, rot=-math.pi / 2):
    for i in range(n * 2):
        rr = r if i % 2 == 0 else r * inner
        a = rot + i * math.pi / n
        px, py = x + rr * math.cos(a), y + rr * math.sin(a)
        if i == 0:
            ctx.move_to(px, py)
        else:
            ctx.line_to(px, py)
    ctx.close_path()


def shadow_blob(ctx, x, y, rx, ry, a=0.28):
    src(ctx, (0, 0, 0), a)
    ellipse(ctx, x, y, rx, ry)
    ctx.fill()


# ---------------------------------------------------------------- flags

def union_jack(ctx, x0, y0, w, h):
    ctx.save()
    ctx.rectangle(x0, y0, w, h)
    ctx.clip()
    src(ctx, UK_BLUE)
    ctx.paint()
    ctx.set_line_cap(cairo.LINE_CAP_BUTT)
    for col, lw in ((WHITE, h * 0.2), (UK_RED, h * 0.067)):
        src(ctx, col)
        ctx.set_line_width(lw)
        ctx.move_to(x0, y0)
        ctx.line_to(x0 + w, y0 + h)
        ctx.move_to(x0 + w, y0)
        ctx.line_to(x0, y0 + h)
        ctx.stroke()
    for col, lw in ((WHITE, h * 0.333), (UK_RED, h * 0.2)):
        src(ctx, col)
        ctx.set_line_width(lw)
        ctx.move_to(x0 + w / 2, y0)
        ctx.line_to(x0 + w / 2, y0 + h)
        ctx.move_to(x0, y0 + h / 2)
        ctx.line_to(x0 + w, y0 + h / 2)
        ctx.stroke()
    ctx.restore()


def us_flag(ctx, x0, y0, w, h, stars=True):
    ctx.save()
    ctx.rectangle(x0, y0, w, h)
    ctx.clip()
    sh = h / 13
    for i in range(13):
        src(ctx, US_RED if i % 2 == 0 else WHITE)
        ctx.rectangle(x0, y0 + i * sh, w, sh + 0.6)
        ctx.fill()
    cw, ch = w * 0.4, sh * 7
    src(ctx, US_BLUE)
    ctx.rectangle(x0, y0, cw, ch)
    ctx.fill()
    if stars:
        src(ctx, WHITE)
        rows = [6, 5, 6, 5, 6]
        for r, n in enumerate(rows):
            yy = y0 + ch * (r + 0.75) / (len(rows) + 0.5)
            for i in range(n):
                off = 0.5 if n == 5 else 0.0
                xx = x0 + cw * (i + 0.5 + off) / 6.0
                star(ctx, xx, yy, min(cw, ch) * 0.065)
                ctx.fill()
    ctx.restore()


def german_empire_flag(ctx, x0, y0, w, h):
    for i, c in enumerate(((0, 0, 0), WHITE, hexc("#DD0000"))):
        src(ctx, c)
        ctx.rectangle(x0, y0 + i * h / 3, w, h / 3 + 0.5)
        ctx.fill()


FLAGS = {"uk": union_jack, "us": us_flag, "de": german_empire_flag}


# ---------------------------------------------------------------- eyes

def eye(ctx, ex, ey, rx, ry, lw, look=(0, 0), lid=0.0, angry=0.0, side=1, x_eyes=False):
    """side=+1 for the eye on the right of the face (inner side is -x)."""
    if x_eyes:
        ctx.set_line_width(lw * 1.6)
        src(ctx, INK)
        d = rx * 0.7
        ctx.move_to(ex - d, ey - d)
        ctx.line_to(ex + d, ey + d)
        ctx.move_to(ex + d, ey - d)
        ctx.line_to(ex - d, ey + d)
        ctx.stroke()
        return
    lid = clamp(lid + 0.35 * angry)
    if lid >= 0.97:
        src(ctx, INK)
        ctx.set_line_width(lw)
        ctx.move_to(ex - rx, ey + ry * 0.1)
        ctx.line_to(ex + rx, ey + ry * 0.1)
        ctx.stroke()
        return
    yc = ey - ry * (1.15 - 1.25 * lid)
    slope = math.tan(math.radians(30 * angry)) * (-side)  # inner side lower

    def ly(x):
        return yc + slope * (x - ex)

    ctx.save()
    # region below lid line
    X0, X1 = ex - rx * 2, ex + rx * 2
    ctx.move_to(X0, ly(X0))
    ctx.line_to(X1, ly(X1))
    ctx.line_to(X1, ey + ry * 2)
    ctx.line_to(X0, ey + ry * 2)
    ctx.close_path()
    ctx.clip()
    ellipse(ctx, ex, ey, rx, ry)
    src(ctx, WHITE)
    ctx.fill_preserve()
    ctx.save()
    ctx.clip()
    px, py = ex + look[0] * rx * 0.38, ey + look[1] * ry * 0.38
    pr = rx * 0.52
    src(ctx, INK)
    ctx.arc(px, py, pr, 0, 2 * math.pi)
    ctx.fill()
    src(ctx, WHITE)
    ctx.arc(px - pr * 0.32, py - pr * 0.35, pr * 0.28, 0, 2 * math.pi)
    ctx.fill()
    ctx.restore()
    ellipse(ctx, ex, ey, rx, ry)
    src(ctx, INK)
    ctx.set_line_width(lw)
    ctx.stroke()
    ctx.restore()
    if lid > 0.02 or angry > 0.02:
        ctx.save()
        ellipse(ctx, ex, ey, rx + lw, ry + lw)
        ctx.clip()
        ctx.move_to(X0, ly(X0))
        ctx.line_to(X1, ly(X1))
        src(ctx, INK)
        ctx.set_line_width(lw * 1.3)
        ctx.stroke()
        ctx.restore()


# ---------------------------------------------------------------- flag character

def _arm(ctx, sx, sy, a1, a2, L1, L2, lw):
    ex = sx + L1 * math.cos(math.radians(a1))
    ey = sy + L1 * math.sin(math.radians(a1))
    hx = ex + L2 * math.cos(math.radians(a2))
    hy = ey + L2 * math.sin(math.radians(a2))
    src(ctx, INK)
    ctx.set_line_width(lw)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.move_to(sx, sy)
    ctx.line_to(ex, ey)
    ctx.line_to(hx, hy)
    ctx.stroke()
    ctx.arc(hx, hy, lw * 1.25, 0, 2 * math.pi)
    ctx.fill()
    return hx, hy


def flag_char(ctx, x, y, w, kind, look=(0, 0), lid=0.0, angry=0.0,
              larm=(115, 100), rarm=(65, 80), scale=1.0, rot=0.0, sq=0.0,
              alpha=1.0, t=0.0, wave=1.0, shadow=True):
    """Draw a flag-with-arms character centered at (x, y), width w.

    Arm angles are absolute degrees (0 = right, 90 = down).
    Returns device-space hand positions {'l': (x, y), 'r': (x, y)}.
    """
    out = {"l": (x, y), "r": (x, y)}
    if scale <= 0.001:
        return out
    h = w * 0.66
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.radians(rot))
    ctx.scale(scale * (1 + sq), scale * (1 - sq))
    if alpha < 1:
        ctx.push_group()
    lw = max(2.0, w * 0.028)
    if shadow:
        shadow_blob(ctx, 0, h * 0.62, w * 0.42, h * 0.08, 0.25)
    L1, L2 = w * 0.27, w * 0.25
    lh = _arm(ctx, -w / 2 + lw, h * 0.08, larm[0], larm[1], L1, L2, w * 0.034)
    rh = _arm(ctx, w / 2 - lw, h * 0.08, rarm[0], rarm[1], L1, L2, w * 0.034)
    out["l"] = ctx.user_to_device(*lh)
    out["r"] = ctx.user_to_device(*rh)
    # body (slightly waving)
    x0, y0 = -w / 2, -h / 2
    ctx.save()
    src(ctx, (0, 0, 0), 0.25)
    rrect(ctx, x0 + lw * 1.5, y0 + lw * 2, w, h, w * 0.03)
    ctx.fill()
    rrect(ctx, x0, y0, w, h, w * 0.03)
    ctx.clip()
    FLAGS[kind](ctx, x0, y0, w, h)
    # cloth shading
    g = cairo.LinearGradient(x0, 0, x0 + w, 0)
    ph = t * 2.2 * wave
    for i in range(7):
        v = 0.10 * math.sin(i * 1.6 + ph) * wave
        g.add_color_stop_rgba(i / 6, 0, 0, 0, max(0, v)) if v > 0 else \
            g.add_color_stop_rgba(i / 6, 1, 1, 1, max(0, -v) * 0.8)
    ctx.set_source(g)
    ctx.paint()
    ctx.restore()
    rrect(ctx, x0, y0, w, h, w * 0.03)
    src(ctx, INK)
    ctx.set_line_width(lw)
    ctx.stroke()
    # eyes
    rx, ry = w * 0.105, w * 0.14
    eye(ctx, -w * 0.17, -h * 0.06, rx, ry, lw * 0.9, look, lid, angry, side=-1)
    eye(ctx, w * 0.17, -h * 0.06, rx, ry, lw * 0.9, look, lid, angry, side=1)
    if alpha < 1:
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(alpha)
    ctx.restore()
    return {k: ctx.device_to_user(*p) for k, p in out.items()}


# ---------------------------------------------------------------- props

PIG = hexc("#F4A3B5")
PIG_D = hexc("#E07F96")
PIG_INK = hexc("#5A2633")


def pig(ctx, x, y, s, face=1, dead=0.0, munch=0.0, angel=0.0, t=0.0, scale=1.0):
    if scale <= 0.001:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale * face, scale)
    lw = s * 0.035
    if dead < 0.01 and angel < 0.01:
        shadow_blob(ctx, 0, s * 0.42, s * 0.5, s * 0.07)
    ctx.rotate(math.pi * ease_io(dead))
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    if angel > 0:
        # wings
        flap = math.sin(t * 14) * 0.35
        for side in (-1, 1):
            ctx.save()
            ctx.translate(-s * 0.05, -s * 0.25)
            ctx.rotate(-0.6 + flap * side * 0.5 + (0.0 if side > 0 else 0.25))
            for k in range(3):
                ellipse(ctx, -s * 0.15 - k * s * 0.08, -s * 0.18 + k * s * 0.07, s * 0.24, s * 0.09)
                fill_stroke(ctx, WHITE, lw * 0.8, PIG_INK)
            ctx.restore()
    # legs
    for lx in (-0.3, -0.12, 0.12, 0.3):
        rrect(ctx, s * lx - s * 0.05, s * 0.12, s * 0.1, s * 0.26, s * 0.04)
        fill_stroke(ctx, PIG_D, lw, PIG_INK)
    # tail
    src(ctx, PIG_INK)
    ctx.set_line_width(lw)
    ctx.move_to(-s * 0.48, -s * 0.05)
    for i in range(1, 16):
        a = i * 0.8
        r = s * 0.07 * (1 - i / 20)
        ctx.line_to(-s * 0.56 - s * 0.02 * i / 4 + r * math.cos(a), -s * 0.08 + r * math.sin(a))
    ctx.stroke()
    # body
    ellipse(ctx, 0, 0, s * 0.5, s * 0.32)
    fill_stroke(ctx, PIG, lw, PIG_INK)
    # head
    hy = -s * 0.1 + munch * s * 0.08
    hx = s * 0.42
    for ex in (-1, 1):
        ctx.move_to(hx + ex * s * 0.13 - s * 0.07, hy - s * 0.17)
        ctx.line_to(hx + ex * s * 0.17, hy - s * 0.38)
        ctx.line_to(hx + ex * s * 0.13 + s * 0.07, hy - s * 0.19)
        ctx.close_path()
        fill_stroke(ctx, PIG_D, lw, PIG_INK)
    ctx.arc(hx, hy, s * 0.24, 0, 2 * math.pi)
    fill_stroke(ctx, PIG, lw, PIG_INK)
    ellipse(ctx, hx + s * 0.22, hy + s * 0.04, s * 0.09, s * 0.075)
    fill_stroke(ctx, PIG_D, lw, PIG_INK)
    src(ctx, PIG_INK)
    for nx in (-0.03, 0.03):
        ellipse(ctx, hx + s * (0.22 + nx), hy + s * 0.04, s * 0.015, s * 0.025)
        ctx.fill()
    if dead > 0.5:
        ctx.set_line_width(lw * 1.1)
        for ex in (0.02, 0.14):
            d = s * 0.035
            cx, cy = hx + s * ex, hy - s * 0.06
            ctx.move_to(cx - d, cy - d)
            ctx.line_to(cx + d, cy + d)
            ctx.move_to(cx + d, cy - d)
            ctx.line_to(cx - d, cy + d)
            ctx.stroke()
    else:
        for ex in (0.04, 0.15):
            ctx.arc(hx + s * ex, hy - s * 0.07, s * 0.03, 0, 2 * math.pi)
            ctx.fill()
        if munch > 0:
            ctx.set_line_width(lw)
            ctx.arc(hx + s * 0.18, hy + s * 0.13, s * 0.04 + munch * s * 0.03, 0.2, math.pi - 0.2)
            ctx.stroke()
    ctx.restore()
    if angel > 0:
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(scale * face, scale)
        ellipse(ctx, s * 0.42, -s * 0.52, s * 0.18, s * 0.05)
        src(ctx, GOLD, 0.9)
        ctx.set_line_width(s * 0.04)
        ctx.stroke()
        ctx.restore()


def potato_patch(ctx, x, y, w, n_left=6, scale=1.0):
    if scale <= 0.001:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)
    ellipse(ctx, 0, 0, w / 2, w * 0.2)
    fill_stroke(ctx, hexc("#5B3A21"), w * 0.012, hexc("#2E1C10"))
    src(ctx, hexc("#3D2614"))
    ctx.set_line_width(w * 0.01)
    for i in (-1, 0, 1):
        ctx.move_to(-w * 0.38, i * w * 0.07)
        ctx.curve_to(-w * 0.1, i * w * 0.07 - w * 0.02, w * 0.1, i * w * 0.07 + w * 0.02, w * 0.38, i * w * 0.07)
        ctx.stroke()
    rnd = random.Random(7)
    spots = [(-0.3, -0.05), (-0.15, 0.06), (0.0, -0.07), (0.14, 0.05), (0.28, -0.04), (-0.05, 0.1)]
    for i, (px, py) in enumerate(spots[:n_left]):
        ellipse(ctx, px * w, py * w, w * 0.06, w * 0.04)
        fill_stroke(ctx, hexc("#C79A5B"), w * 0.008, hexc("#5B3A21"))
        src(ctx, hexc("#7A5630"))
        ctx.arc(px * w + w * 0.02 * rnd.uniform(-1, 1), py * w, w * 0.007, 0, 6.3)
        ctx.fill()
    ctx.restore()


def rifle(ctx, x, y, s, angle):
    """Grip at (x, y). Returns muzzle point (device coords)."""
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.radians(angle))
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.move_to(-s * 0.35, -s * 0.03)
    ctx.line_to(s * 0.15, -s * 0.03)
    ctx.line_to(s * 0.15, s * 0.04)
    ctx.line_to(-s * 0.2, s * 0.05)
    ctx.line_to(-s * 0.38, s * 0.12)
    ctx.close_path()
    fill_stroke(ctx, hexc("#8B5A2B"), s * 0.025)
    rrect(ctx, s * 0.1, -s * 0.045, s * 0.62, s * 0.045, s * 0.015)
    fill_stroke(ctx, hexc("#6E7378"), s * 0.022)
    m = ctx.user_to_device(s * 0.72, -s * 0.022)
    ctx.restore()
    return ctx.device_to_user(*m)


def muzzle_flash(ctx, x, y, r, k):
    if k <= 0 or k >= 1:
        return
    a = 1 - k
    src(ctx, hexc("#FFB703"), a)
    star(ctx, x, y, r * (0.6 + k), 8, 0.45)
    ctx.fill()
    src(ctx, hexc("#FFF3B0"), a)
    star(ctx, x, y, r * 0.5 * (0.6 + k), 8, 0.5)
    ctx.fill()


def puff(ctx, x, y, s, k, seed=1, color=(0.93, 0.93, 0.93)):
    """Smoke/dust cloud. k: 0..1 lifetime."""
    if k <= 0 or k >= 1:
        return
    rnd = random.Random(seed)
    a = 1 - ease_in(k)
    for i in range(7):
        ang = rnd.uniform(0, 2 * math.pi)
        d = s * (0.15 + 0.55 * ease_out(k)) * rnd.uniform(0.4, 1.0)
        r = s * (0.18 + 0.22 * ease_out(k)) * rnd.uniform(0.7, 1.2)
        cx, cy = x + d * math.cos(ang), y + d * math.sin(ang) - s * 0.3 * k
        ctx.arc(cx, cy, r, 0, 2 * math.pi)
        fill_stroke(ctx, color, s * 0.03, (0.35, 0.35, 0.38), a)


def dust_fight(ctx, x, y, s, t, seed=3):
    rnd = random.Random(seed + int(t * 12))
    for i in range(9):
        ang = i / 9 * 2 * math.pi + t
        r = s * (0.22 + 0.08 * rnd.random())
        ctx.arc(x + s * 0.4 * math.cos(ang), y + s * 0.28 * math.sin(ang), r, 0, 6.3)
        fill_stroke(ctx, hexc("#D9D4C7"), s * 0.03, hexc("#6B665C"))
    for i in range(4):
        src(ctx, GOLD)
        star(ctx, x + rnd.uniform(-s, s) * 0.5, y + rnd.uniform(-s, s) * 0.4, s * 0.09, 5)
        ctx.fill()


def warship(ctx, x, y, s, face=1, t=0.0, scale=1.0, seed=0):
    """1850s steam frigate. (x, y) = waterline center, s = hull length."""
    if scale <= 0.001:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.sin(t * 2.0 + seed) * 0.035)
    ctx.scale(scale * face, scale)
    lw = s * 0.022
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    # wake
    src(ctx, WHITE, 0.35)
    ellipse(ctx, 0, s * 0.02, s * 0.6, s * 0.05)
    ctx.fill()
    # masts + sails
    for mx, mh in ((-0.25, 0.62), (0.02, 0.72), (0.27, 0.58)):
        src(ctx, hexc("#5C3B1E"))
        ctx.set_line_width(lw * 1.2)
        ctx.move_to(s * mx, -s * 0.08)
        ctx.line_to(s * mx, -s * mh)
        ctx.stroke()
        for j, (sy0, sw) in enumerate(((0.16, 0.22), (0.34, 0.18), (0.5, 0.13))):
            if sy0 + 0.1 > mh:
                continue
            top, bot = -s * (sy0 + 0.13), -s * sy0
            ctx.move_to(s * (mx - sw / 2), top)
            ctx.line_to(s * (mx + sw / 2), top)
            ctx.curve_to(s * (mx + sw / 2 + 0.03), top * 0.6 + bot * 0.4,
                         s * (mx + sw / 2 + 0.03), bot, s * (mx + sw / 2), bot)
            ctx.line_to(s * (mx - sw / 2), bot)
            ctx.curve_to(s * (mx - sw / 2 + 0.03), bot, s * (mx - sw / 2 + 0.03), top * 0.6 + bot * 0.4,
                         s * (mx - sw / 2), top)
            ctx.close_path()
            fill_stroke(ctx, hexc("#F3EEDF"), lw * 0.8)
    # funnel + smoke
    rrect(ctx, -s * 0.1, -s * 0.3, s * 0.07, s * 0.22, s * 0.01)
    fill_stroke(ctx, hexc("#2A2A2A"), lw * 0.8)
    for i in range(3):
        k = ((t * 0.6 + i / 3 + seed * 0.13) % 1.0)
        src(ctx, (0.25, 0.25, 0.27), 0.5 * (1 - k))
        ctx.arc(-s * 0.065 - s * 0.25 * k, -s * 0.34 - s * 0.25 * k, s * (0.04 + 0.07 * k), 0, 6.3)
        ctx.fill()
    # flag at stern
    src(ctx, INK)
    ctx.set_line_width(lw * 0.7)
    ctx.move_to(-s * 0.44, -s * 0.1)
    ctx.line_to(-s * 0.44, -s * 0.36)
    ctx.stroke()
    ctx.save()
    if face < 0:
        ctx.scale(-1, 1)
        union_jack(ctx, s * 0.44 - s * 0.0 - s * 0.17, -s * 0.36, s * 0.17, s * 0.11)
    else:
        union_jack(ctx, -s * 0.44 - s * 0.17, -s * 0.36, s * 0.17, s * 0.11)
    ctx.restore()
    # hull
    ctx.move_to(-s * 0.5, -s * 0.11)
    ctx.line_to(s * 0.5, -s * 0.13)
    ctx.curve_to(s * 0.47, -s * 0.03, s * 0.42, s * 0.03, s * 0.36, s * 0.05)
    ctx.line_to(-s * 0.42, s * 0.05)
    ctx.curve_to(-s * 0.46, s * 0.03, -s * 0.49, -s * 0.03, -s * 0.5, -s * 0.11)
    ctx.close_path()
    fill_stroke(ctx, hexc("#1E1E22"), lw)
    src(ctx, hexc("#EDE6D0"))
    ctx.rectangle(-s * 0.46, -s * 0.085, s * 0.9, s * 0.035)
    ctx.fill()
    src(ctx, INK)
    for i in range(9):
        ctx.rectangle(-s * 0.4 + i * s * 0.095, -s * 0.08, s * 0.03, s * 0.025)
        ctx.fill()
    ctx.restore()


def glow_circle(ctx, x, y, r, color, k=1.0, t=0.0):
    if k <= 0.001:
        return
    rr = r * k
    g = cairo.RadialGradient(x, y, rr * 0.7, x, y, rr * 1.6)
    g.add_color_stop_rgba(0, color[0], color[1], color[2], 0.55)
    g.add_color_stop_rgba(1, color[0], color[1], color[2], 0.0)
    ctx.set_source(g)
    ctx.arc(x, y, rr * 1.6, 0, 6.3)
    ctx.fill()
    ctx.arc(x, y, rr, 0, 6.3)
    src(ctx, hexc("#0F2E38"), 0.85)
    ctx.fill_preserve()
    src(ctx, color)
    ctx.set_line_width(rr * 0.07)
    ctx.stroke()


def sheep(ctx, x, y, s, t=0.0):
    ctx.save()
    ctx.translate(x, y + math.sin(t * 6) * s * 0.02)
    lw = s * 0.035
    src(ctx, INK)
    for lx in (-0.22, -0.08, 0.1, 0.24):
        ctx.rectangle(s * lx - s * 0.03, s * 0.1, s * 0.06, s * 0.25)
        ctx.fill()
    pts = [(-0.28, 0), (-0.14, -0.13), (0.04, -0.15), (0.2, -0.1), (0.3, 0.02), (0.16, 0.13), (-0.04, 0.15), (-0.22, 0.12)]
    for px, py in pts:
        ctx.arc(s * px, s * py, s * 0.15, 0, 6.3)
        fill_stroke(ctx, hexc("#F4F1E8"), lw, hexc("#55524A"))
    for px, py in pts:
        ctx.arc(s * px, s * py, s * 0.13, 0, 6.3)
    src(ctx, hexc("#F4F1E8"))
    ctx.fill()
    ellipse(ctx, s * 0.4, -s * 0.06, s * 0.11, s * 0.14)
    fill_stroke(ctx, hexc("#2B2B2B"), lw)
    src(ctx, WHITE)
    ctx.arc(s * 0.43, -s * 0.09, s * 0.025, 0, 6.3)
    ctx.fill()
    ctx.restore()


def cabin(ctx, x, y, s):
    ctx.save()
    ctx.translate(x, y)
    lw = s * 0.035
    # chimney
    ctx.rectangle(s * 0.15, -s * 0.42, s * 0.1, s * 0.2)
    fill_stroke(ctx, hexc("#8C8C8C"), lw)
    ctx.rectangle(-s * 0.36, -s * 0.12, s * 0.72, s * 0.42)
    fill_stroke(ctx, hexc("#9C6A3A"), lw)
    src(ctx, hexc("#5E3D1F"))
    ctx.set_line_width(lw * 0.7)
    for i in range(1, 5):
        yy = -s * 0.12 + i * s * 0.084
        ctx.move_to(-s * 0.36, yy)
        ctx.line_to(s * 0.36, yy)
        ctx.stroke()
    ctx.move_to(-s * 0.46, -s * 0.1)
    ctx.line_to(0, -s * 0.42)
    ctx.line_to(s * 0.46, -s * 0.1)
    ctx.close_path()
    fill_stroke(ctx, hexc("#4A3524"), lw)
    rrect(ctx, -s * 0.08, s * 0.08, s * 0.16, s * 0.22, s * 0.02)
    fill_stroke(ctx, hexc("#3A2614"), lw * 0.8)
    ctx.rectangle(s * 0.14, s * 0.0, s * 0.13, s * 0.11)
    fill_stroke(ctx, hexc("#F9D976"), lw * 0.8)
    ctx.restore()


def zap(ctx, x0, y0, x1, y1, t, seed=0, width=8):
    rnd = random.Random(seed + int(t * 20))
    n = 7
    pts = [(x0, y0)]
    for i in range(1, n):
        f = i / n
        px, py = lerp(x0, x1, f), lerp(y0, y1, f)
        nx, ny = -(y1 - y0), (x1 - x0)
        L = math.hypot(nx, ny) or 1
        o = rnd.uniform(-1, 1) * 40
        pts.append((px + nx / L * o, py + ny / L * o))
    pts.append((x1, y1))
    for col, lw, a in ((hexc("#FFE066"), width * 3, 0.3), (hexc("#FFE066"), width, 1.0), (WHITE, width * 0.4, 1.0)):
        src(ctx, col, a)
        ctx.set_line_width(lw)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.move_to(*pts[0])
        for p in pts[1:]:
            ctx.line_to(*p)
        ctx.stroke()


def bill(ctx, x, y, w, rot=0.0, label="$10", scale=1.0):
    if scale <= 0.001:
        return
    h = w * 0.45
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.radians(rot))
    ctx.scale(scale, scale)
    rrect(ctx, -w / 2, -h / 2, w, h, w * 0.04)
    fill_stroke(ctx, hexc("#86B97A"), w * 0.025, hexc("#24452A"))
    rrect(ctx, -w / 2 + w * 0.06, -h / 2 + w * 0.06, w - w * 0.12, h - w * 0.12, w * 0.02)
    src(ctx, hexc("#3E6B45"))
    ctx.set_line_width(w * 0.012)
    ctx.stroke()
    ellipse(ctx, 0, 0, w * 0.17, h * 0.33)
    fill_stroke(ctx, hexc("#CFE5C3"), w * 0.012, hexc("#3E6B45"))
    text_center(ctx, label, 0, 0, w * 0.17, SANS, hexc("#1F3D25"))
    ctx.restore()


def sign(ctx, x, y, s, label, rot=0.0, scale=1.0, color=None):
    """Wooden sign on a stick; (x, y) = where the stick is held/planted."""
    if scale <= 0.001:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.radians(rot))
    ctx.scale(scale, scale)
    ctx.rectangle(-s * 0.03, -s * 0.75, s * 0.06, s * 0.85)
    fill_stroke(ctx, hexc("#7A4E26"), s * 0.02)
    rrect(ctx, -s * 0.5, -s * 1.15, s, s * 0.48, s * 0.04)
    fill_stroke(ctx, hexc("#C8925A"), s * 0.03)
    src(ctx, hexc("#9A6A3C"))
    ctx.set_line_width(s * 0.012)
    for i in (1, 2):
        ctx.move_to(-s * 0.46, -s * 1.15 + i * s * 0.16)
        ctx.line_to(s * 0.46, -s * 1.15 + i * s * 0.16)
        ctx.stroke()
    text_center(ctx, label, 0, -s * 0.91, s * 0.3, SANS, color or hexc("#2B1A0C"), max_w=s * 0.9)
    ctx.restore()


def handcuffs(ctx, x, y, s, rot=0.0, t=0.0, scale=1.0):
    if scale <= 0.001:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.radians(rot + math.sin(t * 8) * 8))
    ctx.scale(scale, scale)
    for cx in (-0.3, 0.3):
        ctx.new_path()
        ctx.arc(s * cx, s * 0.15, s * 0.2, 0, 6.3)
        src(ctx, INK)
        ctx.set_line_width(s * 0.11)
        ctx.stroke_preserve()
        src(ctx, hexc("#B8BEC4"))
        ctx.set_line_width(s * 0.06)
        ctx.stroke()
    for i in range(3):
        ctx.new_path()
        ellipse(ctx, -s * 0.12 + i * s * 0.12, -s * 0.05, s * 0.06, s * 0.035)
        src(ctx, hexc("#B8BEC4"))
        ctx.set_line_width(s * 0.03)
        ctx.stroke()
    ctx.restore()


def cannon(ctx, x, y, s, face=1, rot=-12, scale=1.0):
    if scale <= 0.001:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale * face, scale)
    lw = s * 0.04
    shadow_blob(ctx, 0, s * 0.22, s * 0.5, s * 0.06)
    ctx.save()
    ctx.translate(-s * 0.05, -s * 0.05)
    ctx.rotate(math.radians(rot))
    ctx.move_to(-s * 0.35, -s * 0.13)
    ctx.line_to(s * 0.5, -s * 0.08)
    ctx.line_to(s * 0.5, s * 0.08)
    ctx.line_to(-s * 0.35, s * 0.13)
    ctx.close_path()
    fill_stroke(ctx, hexc("#2D2F33"), lw)
    ctx.arc(-s * 0.38, 0, s * 0.1, 0, 6.3)
    fill_stroke(ctx, hexc("#2D2F33"), lw)
    ctx.restore()
    ctx.rectangle(-s * 0.3, s * 0.0, s * 0.45, s * 0.12)
    fill_stroke(ctx, hexc("#7A4E26"), lw)
    for wx in (-0.2, 0.08):
        ctx.arc(s * wx, s * 0.12, s * 0.12, 0, 6.3)
        fill_stroke(ctx, hexc("#8F6233"), lw)
        src(ctx, INK)
        ctx.arc(s * wx, s * 0.12, s * 0.025, 0, 6.3)
        ctx.fill()
    ctx.restore()


def campfire(ctx, x, y, s, t):
    g = cairo.RadialGradient(x, y - s * 0.2, 0, x, y - s * 0.2, s * 2.4)
    fl = 0.85 + 0.15 * math.sin(t * 17) * math.sin(t * 7.3)
    g.add_color_stop_rgba(0, 1.0, 0.65, 0.2, 0.45 * fl)
    g.add_color_stop_rgba(1, 1.0, 0.5, 0.1, 0.0)
    ctx.set_source(g)
    ctx.arc(x, y - s * 0.2, s * 2.4, 0, 6.3)
    ctx.fill()
    for a in (-25, 25):
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(math.radians(a))
        rrect(ctx, -s * 0.45, -s * 0.07, s * 0.9, s * 0.14, s * 0.06)
        fill_stroke(ctx, hexc("#6B4423"), s * 0.03)
        ctx.restore()
    for col, sc in ((hexc("#E85D04"), 1.0), (hexc("#FFBA08"), 0.65), (hexc("#FFF3B0"), 0.32)):
        ctx.move_to(x - s * 0.32 * sc, y)
        n = 5
        for i in range(n + 1):
            f = i / n
            px = x + (f - 0.5) * s * 0.64 * sc
            h = s * (0.5 + 0.35 * math.sin(f * 3.14)) * sc * (0.85 + 0.25 * math.sin(t * 13 + i * 2.1))
            if i % 2 == 0:
                ctx.line_to(px, y - h)
            else:
                ctx.line_to(px, y - h * 0.6)
        ctx.line_to(x + s * 0.32 * sc, y)
        ctx.close_path()
        src(ctx, col)
        ctx.fill()


def mug(ctx, x, y, s, rot=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.radians(rot))
    lw = s * 0.06
    ctx.arc(s * 0.3, 0, s * 0.16, -1.4, 1.4)
    src(ctx, INK)
    ctx.set_line_width(s * 0.1)
    ctx.stroke()
    rrect(ctx, -s * 0.25, -s * 0.3, s * 0.5, s * 0.62, s * 0.06)
    fill_stroke(ctx, hexc("#F2A900"), lw)
    for px in (-0.15, 0.0, 0.15):
        ellipse(ctx, s * px, -s * 0.32, s * 0.14, s * 0.1)
        src(ctx, WHITE)
        ctx.fill()
    ctx.restore()


def scroll(ctx, x, y, w, k=1.0):
    if k <= 0.001:
        return
    ww = w * k
    h = w * 0.62
    ctx.save()
    ctx.translate(x, y)
    ctx.rectangle(-ww / 2, -h / 2, ww, h)
    fill_stroke(ctx, hexc("#F1E2B8"), w * 0.015, hexc("#6B5530"))
    src(ctx, hexc("#9C8455"))
    ctx.set_line_width(w * 0.01)
    for i in range(5):
        yy = -h / 2 + h * (i + 1.2) / 6.5
        ctx.move_to(-ww / 2 + w * 0.08, yy)
        ctx.line_to(ww / 2 - w * 0.08 - (w * 0.15 if i == 4 else 0), yy)
        ctx.stroke()
    for sx in (-ww / 2, ww / 2):
        rrect(ctx, sx - w * 0.05, -h / 2 - w * 0.05, w * 0.1, h + w * 0.1, w * 0.05)
        fill_stroke(ctx, hexc("#E3CC92"), w * 0.015, hexc("#6B5530"))
    ctx.restore()


def stick_figure(ctx, x, y, s, wave=0.0):
    src(ctx, WHITE)
    ctx.set_line_width(s * 0.08)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.arc(x, y - s * 0.75, s * 0.16, 0, 6.3)
    ctx.stroke()
    ctx.move_to(x, y - s * 0.59)
    ctx.line_to(x, y - s * 0.15)
    ctx.move_to(x - s * 0.22, y + s * 0.2)
    ctx.line_to(x, y - s * 0.15)
    ctx.line_to(x + s * 0.22, y + s * 0.2)
    ctx.move_to(x - s * 0.28, y - s * 0.5 + wave * s * 0.2)
    ctx.line_to(x, y - s * 0.45)
    ctx.line_to(x + s * 0.28, y - s * 0.5 - wave * s * 0.2)
    ctx.stroke()


# ---------------------------------------------------------------- people (chibi)

class P:
    """Painter that supports a white 'sticker outline' pass and monochrome."""

    def __init__(self, ctx, lw, mono=False, outline=0.0):
        self.ctx, self.lw, self.mono, self.outline = ctx, lw, mono, outline

    def col(self, c):
        if self.mono:
            g = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
            return (min(1, g * 1.07 + 0.03), g, max(0, g * 0.88 - 0.02))
        return c

    def fs(self, c, lw_mul=1.0, stroke=True):
        ctx = self.ctx
        if self.outline > 0:
            src(ctx, WHITE)
            ctx.fill_preserve()
            ctx.set_line_width(self.outline)
            ctx.set_line_join(cairo.LINE_JOIN_ROUND)
            ctx.stroke()
            return
        src(ctx, self.col(c))
        if stroke:
            ctx.fill_preserve()
            src(ctx, self.col(INK))
            ctx.set_line_width(self.lw * lw_mul)
            ctx.set_line_join(cairo.LINE_JOIN_ROUND)
            ctx.stroke()
        else:
            ctx.fill()

    def line(self, c, w):
        ctx = self.ctx
        if self.outline > 0:
            src(ctx, WHITE)
            ctx.set_line_width(w + self.outline)
        else:
            src(ctx, self.col(c))
            ctx.set_line_width(w)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.stroke()


SKIN = hexc("#F2C9A0")


def person(ctx, x, y, s, o, t=0.0, scale=1.0, sticker=False):
    """Chibi person standing with feet at (x, y). s = total height.

    o: dict with coat, hat, hair, beard, mono, larm, rarm, mouth, brow, stripes
    Returns device-space hand positions.
    """
    hands = {"l": (x, y), "r": (x, y)}
    if scale <= 0.001:
        return hands
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale * o.get("face", 1), scale)
    lw = s * 0.018
    shadow_blob(ctx, 0, 0, s * 0.22, s * 0.035)
    passes = ([s * 0.05] if sticker else []) + [0.0]
    for ol in passes:
        pt = P(ctx, lw, o.get("mono", False), ol)
        hands = _person_body(ctx, pt, s, o, t)
    ctx.restore()
    return {k: ctx.device_to_user(*p) for k, p in hands.items()}


def _person_body(ctx, pt, s, o, t):
    hy = -s * 0.68        # head center
    hr = s * 0.23         # head radius
    coat = o.get("coat", hexc("#2B2B33"))
    # legs
    for lx in (-0.07, 0.07):
        rrect(ctx, s * lx - s * 0.04, -s * 0.16, s * 0.08, s * 0.16, s * 0.02)
        pt.fs(o.get("pants", hexc("#3A3A40")))
        ellipse(ctx, s * lx + s * 0.01, -s * 0.005, s * 0.06, s * 0.025)
        pt.fs(INK, stroke=False)
    # arms (behind body)
    hands = {}
    for side, key, default in ((-1, "larm", 120), (1, "rarm", 60)):
        a = math.radians(o.get(key, default))
        sx, sy = side * s * 0.13, -s * 0.36
        hx, hy2 = sx + s * 0.22 * math.cos(a), sy + s * 0.22 * math.sin(a)
        ctx.move_to(sx, sy)
        ctx.line_to(hx, hy2)
        pt.line(coat, s * 0.07)
        ctx.arc(hx, hy2, s * 0.04, 0, 6.3)
        pt.fs(SKIN, 0.8)
        hands["l" if side < 0 else "r"] = ctx.user_to_device(hx, hy2)
    # body
    ctx.move_to(-s * 0.11, -s * 0.46)
    ctx.line_to(s * 0.11, -s * 0.46)
    ctx.line_to(s * 0.17, -s * 0.14)
    ctx.line_to(-s * 0.17, -s * 0.14)
    ctx.close_path()
    if o.get("stripes") and pt.outline == 0:
        ctx.save()
        ctx.clip_preserve()
        src(ctx, WHITE)
        ctx.fill_preserve()
        src(ctx, INK)
        for i in range(-5, 6):
            ctx.rectangle(i * s * 0.06, -s * 0.5, s * 0.03, s * 0.4)
        ctx.fill()
        ctx.restore()
        src(ctx, INK)
        ctx.set_line_width(pt.lw)
        ctx.stroke()
    else:
        pt.fs(coat)
    if o.get("tie") and pt.outline == 0:
        ctx.move_to(0, -s * 0.45)
        ctx.line_to(s * 0.03, -s * 0.36)
        ctx.line_to(0, -s * 0.28)
        ctx.line_to(-s * 0.03, -s * 0.36)
        ctx.close_path()
        pt.fs(o["tie"], 0.6)
    # head
    hair = o.get("hair")
    if hair == "long" or o.get("long_hair"):
        ellipse(ctx, 0, hy + s * 0.05, hr * 1.18, hr * 1.05)
        pt.fs(o.get("hair_c", hexc("#4A3020")))
    ctx.arc(0, hy, hr, 0, 2 * math.pi)
    pt.fs(SKIN)
    beard = o.get("beard")
    bc = o.get("beard_c", hexc("#5A3A22"))
    if beard == "full":
        ctx.move_to(-hr * 0.95, hy + hr * 0.05)
        ctx.curve_to(-hr * 0.9, hy + hr * 1.3, hr * 0.9, hy + hr * 1.3, hr * 0.95, hy + hr * 0.05)
        ctx.curve_to(hr * 0.5, hy + hr * 0.55, -hr * 0.5, hy + hr * 0.55, -hr * 0.95, hy + hr * 0.05)
        ctx.close_path()
        pt.fs(bc)
    elif beard == "chops":
        for sd in (-1, 1):
            ctx.move_to(sd * hr * 0.98, hy - hr * 0.2)
            ctx.curve_to(sd * hr * 1.35, hy + hr * 0.5, sd * hr * 1.1, hy + hr * 0.95, sd * hr * 0.35, hy + hr * 0.62)
            ctx.line_to(sd * hr * 0.75, hy + hr * 0.1)
            ctx.close_path()
            pt.fs(bc)
    elif beard == "chin":
        ctx.move_to(-hr * 0.35, hy + hr * 0.75)
        ctx.curve_to(-hr * 0.3, hy + hr * 1.4, hr * 0.3, hy + hr * 1.4, hr * 0.35, hy + hr * 0.75)
        ctx.close_path()
        pt.fs(bc)
    if o.get("stache"):
        for sd in (-1, 1):
            ctx.move_to(0, hy + hr * 0.38)
            ctx.curve_to(sd * hr * 0.3, hy + hr * 0.25, sd * hr * 0.6, hy + hr * 0.35, sd * hr * 0.75, hy + hr * 0.2)
            ctx.curve_to(sd * hr * 0.6, hy + hr * 0.55, sd * hr * 0.3, hy + hr * 0.55, 0, hy + hr * 0.45)
            ctx.close_path()
            pt.fs(o.get("stache_c", bc), 0.7)
    if pt.outline == 0:
        # eyes
        for sd in (-1, 1):
            ellipse(ctx, sd * hr * 0.36, hy - hr * 0.02, hr * 0.1, hr * 0.15)
            src(ctx, pt.col(INK))
            ctx.fill()
            src(ctx, WHITE)
            ctx.arc(sd * hr * 0.36 - hr * 0.03, hy - hr * 0.07, hr * 0.035, 0, 6.3)
            ctx.fill()
        brow = o.get("brow", 0)
        if brow:
            src(ctx, pt.col(INK))
            ctx.set_line_width(pt.lw * 1.2)
            for sd in (-1, 1):
                ctx.move_to(sd * hr * 0.55, hy - hr * 0.3 - brow * hr * 0.05)
                ctx.line_to(sd * hr * 0.18, hy - hr * 0.3 + brow * hr * 0.12)
                ctx.stroke()
        m = o.get("mouth", "smile")
        src(ctx, pt.col(INK))
        ctx.set_line_width(pt.lw)
        my = hy + hr * 0.5
        if m == "smile" and not o.get("stache"):
            ctx.arc(0, my - hr * 0.12, hr * 0.18, 0.4, math.pi - 0.4)
            ctx.stroke()
        elif m == "o":
            ellipse(ctx, 0, my + hr * 0.05, hr * 0.09, hr * 0.12)
            ctx.fill()
        elif m == "frown":
            ctx.arc(0, my + hr * 0.12, hr * 0.15, math.pi + 0.5, -0.5)
            ctx.stroke()
        if o.get("cheeks"):
            src(ctx, hexc("#F08A8A"), 0.5)
            for sd in (-1, 1):
                ellipse(ctx, sd * hr * 0.6, hy + hr * 0.3, hr * 0.13, hr * 0.08)
                ctx.fill()
    # hair on top
    if hair in ("short", "long"):
        ctx.arc(0, hy, hr * 1.02, math.pi * 1.08, math.pi * 1.92)
        ctx.curve_to(hr * 0.5, hy - hr * 0.55, -hr * 0.5, hy - hr * 0.55, -hr * 0.98, hy - hr * 0.25)
        ctx.close_path()
        pt.fs(o.get("hair_c", hexc("#4A3020")))
    elif hair == "bald":
        for sd in (-1, 1):
            ellipse(ctx, sd * hr * 0.9, hy - hr * 0.15, hr * 0.18, hr * 0.3)
            pt.fs(o.get("hair_c", hexc("#DDDDDD")))
    hat = o.get("hat")
    if hat == "top":
        ellipse(ctx, 0, hy - hr * 0.8, hr * 1.25, hr * 0.22)
        pt.fs(hexc("#1C1C20"))
        rrect(ctx, -hr * 0.7, hy - hr * 1.95, hr * 1.4, hr * 1.18, hr * 0.08)
        pt.fs(hexc("#1C1C20"))
        if pt.outline == 0:
            ctx.rectangle(-hr * 0.7, hy - hr * 1.05, hr * 1.4, hr * 0.2)
            src(ctx, pt.col(o.get("band", hexc("#7A1F1F"))))
            ctx.fill()
    elif hat == "straw":
        ellipse(ctx, 0, hy - hr * 0.62, hr * 1.55, hr * 0.32)
        pt.fs(hexc("#E3C46F"))
        ctx.arc(0, hy - hr * 0.7, hr * 0.78, math.pi, 2 * math.pi)
        ctx.close_path()
        pt.fs(hexc("#E3C46F"))
        if pt.outline == 0:
            ctx.rectangle(-hr * 0.78, hy - hr * 0.86, hr * 1.56, hr * 0.16)
            src(ctx, pt.col(hexc("#8B3A2B")))
            ctx.fill()
    elif hat == "pickel":
        ctx.arc(0, hy - hr * 0.45, hr * 0.98, math.pi, 2 * math.pi)
        ctx.close_path()
        pt.fs(hexc("#1A1A1A"))
        ctx.move_to(-hr * 0.12, hy - hr * 1.38)
        ctx.line_to(0, hy - hr * 2.1)
        ctx.line_to(hr * 0.12, hy - hr * 1.38)
        ctx.close_path()
        pt.fs(GOLD)
        if pt.outline == 0:
            ellipse(ctx, 0, hy - hr * 0.9, hr * 0.22, hr * 0.26)
            src(ctx, GOLD)
            ctx.fill()
        ellipse(ctx, 0, hy - hr * 0.45, hr * 1.12, hr * 0.13)
        pt.fs(hexc("#1A1A1A"))
    elif hat == "kepi":
        ctx.move_to(-hr * 0.85, hy - hr * 0.5)
        ctx.line_to(-hr * 0.7, hy - hr * 1.35)
        ctx.line_to(hr * 0.75, hy - hr * 1.25)
        ctx.line_to(hr * 0.85, hy - hr * 0.5)
        ctx.close_path()
        pt.fs(hexc("#2C3E6B"))
        ellipse(ctx, hr * 0.55, hy - hr * 0.48, hr * 0.6, hr * 0.12)
        pt.fs(INK)
    return hands


def whistle(ctx, x, y, s):
    ctx.save()
    ctx.translate(x, y)
    rrect(ctx, -s * 0.5, -s * 0.2, s * 0.6, s * 0.4, s * 0.15)
    fill_stroke(ctx, hexc("#C0C6CC"), s * 0.08)
    ctx.arc(s * 0.15, s * 0.05, s * 0.28, 0, 6.3)
    fill_stroke(ctx, hexc("#C0C6CC"), s * 0.08)
    ctx.restore()


# ---------------------------------------------------------------- text

def _font(ctx, family, size):
    ctx.select_font_face(family, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(size)


def text_center(ctx, text, x, y, size, family=SANS, color=WHITE, max_w=None):
    _font(ctx, family, size)
    e = ctx.text_extents(text)
    if max_w and e.width > max_w:
        size *= max_w / e.width
        _font(ctx, family, size)
        e = ctx.text_extents(text)
    src(ctx, color)
    ctx.move_to(x - e.width / 2 - e.x_bearing, y - e.height / 2 - e.y_bearing)
    ctx.show_text(text)


def _text_path_centered(ctx, text, x, y, size, family, max_w):
    _font(ctx, family, size)
    e = ctx.text_extents(text)
    if max_w and e.width > max_w:
        size *= max_w / e.width
        _font(ctx, family, size)
        e = ctx.text_extents(text)
    ctx.move_to(x - e.width / 2 - e.x_bearing, y - e.height / 2 - e.y_bearing)
    ctx.text_path(text)
    return e


def styled_text(ctx, text, x, y, size, family=SANS, fill=WHITE, k=1.0, max_w=980,
                shadow=0.65, stroke=None, grad=None, rot=0.0):
    """Pop-scaled text with drop shadow. k is the scale factor (0..1.1)."""
    if k <= 0.001:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.radians(rot))
    ctx.scale(k, k)
    for line_i, line in enumerate(text.split("\n")):
        n = len(text.split("\n"))
        ly = (line_i - (n - 1) / 2) * size * 1.08
        off = size * 0.06
        ctx.new_path()
        _text_path_centered(ctx, line, off, ly + off * 1.2, size, family, max_w)
        src(ctx, (0, 0, 0), shadow)
        ctx.fill()
        ctx.new_path()
        e = _text_path_centered(ctx, line, 0, ly, size, family, max_w)
        if stroke:
            src(ctx, stroke)
            ctx.set_line_width(size * 0.09)
            ctx.set_line_join(cairo.LINE_JOIN_ROUND)
            ctx.stroke_preserve()
        if grad:
            g = cairo.LinearGradient(0, ly - e.height / 2, 0, ly + e.height / 2)
            g.add_color_stop_rgb(0, *grad[0])
            g.add_color_stop_rgb(1, *grad[1])
            ctx.set_source(g)
        else:
            src(ctx, fill)
        ctx.fill()
    ctx.restore()


def bubble(ctx, x, y, text, size=56, tail=(0, 80), k=1.0, max_w=520):
    """Comic speech bubble centered at (x, y); tail offset relative to center."""
    if k <= 0.001:
        return
    _font(ctx, SANS, size)
    e = ctx.text_extents(text)
    if e.width > max_w:
        size *= max_w / e.width
        _font(ctx, SANS, size)
        e = ctx.text_extents(text)
    w, h = e.width + size * 1.1, size * 1.7
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(k, k)
    src(ctx, (0, 0, 0), 0.3)
    rrect(ctx, -w / 2 + 6, -h / 2 + 8, w, h, h * 0.45)
    ctx.fill()
    tx, ty = tail
    rrect(ctx, -w / 2, -h / 2, w, h, h * 0.45)
    ctx.move_to(-w * 0.08, h * 0.35)
    ctx.line_to(tx, ty)
    ctx.line_to(w * 0.1, h * 0.35)
    ctx.close_path()
    src(ctx, WHITE)
    ctx.set_fill_rule(cairo.FILL_RULE_WINDING)
    ctx.fill_preserve()
    src(ctx, INK)
    ctx.set_line_width(5)
    ctx.stroke()
    rrect(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, h * 0.42)
    src(ctx, WHITE)
    ctx.fill()
    text_center(ctx, text, 0, 0, size, SANS, INK)
    ctx.restore()
