"""Generate every SVG sprite for the Point Roberts short into ../assets/.

All sprites share one style: flat colours, #141416 ink outlines, round joins.
Animatable parts carry ids (arm-left, arm-right, eyes, gate-arm, wheel-front …).
"""
import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")
INK = "#141416"

UK_BLUE, UK_RED = "#012169", "#C8102E"
US_RED, US_BLUE = "#B22234", "#3C3B6E"
CA_RED = "#D52B1E"
SKIN = "#F2C9A0"


def svg(w, h, body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'<defs>{defs}</defs>{body}</svg>\n')


def save(name, content):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        f.write(content)


def star_pts(cx, cy, r, n=5, inner=0.45, rot=-90):
    pts = []
    for i in range(n * 2):
        rr = r if i % 2 == 0 else r * inner
        a = math.radians(rot + i * 180 / n)
        pts.append(f"{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}")
    return " ".join(pts)


# ------------------------------------------------------------------ flags

def flag_uk(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{UK_BLUE}"/>'
            f'<path d="M{x},{y} L{x+w},{y+h} M{x+w},{y} L{x},{y+h}" stroke="#fff" stroke-width="{h*0.2:.1f}"/>'
            f'<path d="M{x},{y} L{x+w},{y+h} M{x+w},{y} L{x},{y+h}" stroke="{UK_RED}" stroke-width="{h*0.067:.1f}"/>'
            f'<path d="M{x+w/2},{y} V{y+h} M{x},{y+h/2} H{x+w}" stroke="#fff" stroke-width="{h*0.333:.1f}"/>'
            f'<path d="M{x+w/2},{y} V{y+h} M{x},{y+h/2} H{x+w}" stroke="{UK_RED}" stroke-width="{h*0.2:.1f}"/>')


def flag_us(x, y, w, h, stars=True):
    s = ""
    sh = h / 13
    for i in range(13):
        s += f'<rect x="{x}" y="{y + i*sh:.2f}" width="{w}" height="{sh + 0.5:.2f}" fill="{US_RED if i % 2 == 0 else "#fff"}"/>'
    cw, ch = w * 0.4, sh * 7
    s += f'<rect x="{x}" y="{y}" width="{cw:.1f}" height="{ch:.1f}" fill="{US_BLUE}"/>'
    if stars:
        for r in range(9):
            n = 6 if r % 2 == 0 else 5
            for i in range(n):
                cx = x + cw * ((i + (0.5 if n == 6 else 1.0)) / 6.0)
                cy = y + ch * (r + 0.75) / 9.5
                s += f'<polygon points="{star_pts(cx, cy, min(cw, ch) * 0.045)}" fill="#fff"/>'
    return s


MAPLE = [(0, -1), (0.1, -0.78), (0.26, -0.86), (0.2, -0.42), (0.46, -0.64), (0.43, -0.5), (0.74, -0.56),
         (0.64, -0.3), (0.82, -0.22), (0.46, 0.08), (0.53, 0.24), (0.07, 0.18), (0.07, 0.62)]


def maple(cx, cy, r, fill=CA_RED):
    right = [(cx + px * r, cy + py * r) for px, py in MAPLE]
    left = [(cx - px * r, cy + py * r) for px, py in reversed(MAPLE)]
    pts = " ".join(f"{a:.1f},{b:.1f}" for a, b in right + left)
    return f'<polygon points="{pts}" fill="{fill}"/>'


def flag_ca(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff"/>'
            f'<rect x="{x}" y="{y}" width="{w*0.25:.1f}" height="{h}" fill="{CA_RED}"/>'
            f'<rect x="{x + w*0.75:.1f}" y="{y}" width="{w*0.25:.1f}" height="{h}" fill="{CA_RED}"/>'
            + maple(x + w / 2, y + h * 0.48, h * 0.4))


FLAGS = {"uk": flag_uk, "us": flag_us, "ca": flag_ca}


# ------------------------------------------------------------------ flag character parts

def eye(uid, cx, cy, rx, ry, look=(0, 0), lid=0.0, slope=0.0, pupil=0.52, style="normal"):
    """slope: degrees; positive tilts the lid line down to the right."""
    if style == "happy":
        return (f'<path d="M{cx-rx},{cy+ry*0.15} Q{cx},{cy-ry*0.9} {cx+rx},{cy+ry*0.15}" fill="none" '
                f'stroke="{INK}" stroke-width="9" stroke-linecap="round"/>')
    yc = cy - ry * (1.15 - 1.25 * lid)
    t = math.tan(math.radians(slope))
    x0, x1 = cx - rx * 2, cx + rx * 2
    y0, y1 = yc + t * (x0 - cx), yc + t * (x1 - cx)
    clip = f'<clipPath id="lid{uid}"><polygon points="{x0},{y0} {x1},{y1} {x1},{cy+ry*2} {x0},{cy+ry*2}"/></clipPath>'
    px, py = cx + look[0] * rx * 0.38, cy + look[1] * ry * 0.38
    pr = rx * pupil
    g = (f'{clip}<g clip-path="url(#lid{uid})">'
         f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" stroke="{INK}" stroke-width="6"/>'
         f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{pr:.1f}" fill="{INK}"/>'
         f'<circle cx="{px - pr*0.32:.1f}" cy="{py - pr*0.35:.1f}" r="{pr*0.28:.1f}" fill="#fff"/></g>')
    if lid > 0.02 or abs(slope) > 0.5:
        g += (f'<clipPath id="lidline{uid}"><ellipse cx="{cx}" cy="{cy}" rx="{rx+5}" ry="{ry+5}"/></clipPath>'
              f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{INK}" stroke-width="8" '
              f'clip-path="url(#lidline{uid})"/>')
    return g


def arm(sx, sy, a1, a2, L1=78, L2=72, id_=None):
    ex, ey = sx + L1 * math.cos(math.radians(a1)), sy + L1 * math.sin(math.radians(a1))
    hx, hy = ex + L2 * math.cos(math.radians(a2)), ey + L2 * math.sin(math.radians(a2))
    idattr = f' id="{id_}"' if id_ else ""
    return (f'<g{idattr}><path d="M{sx},{sy} L{ex:.1f},{ey:.1f} L{hx:.1f},{hy:.1f}" fill="none" stroke="{INK}" '
            f'stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="12" fill="{INK}"/></g>'), (hx, hy)


FX, FY, FW, FH = 130, 120, 260, 172   # flag rect inside a 520x440 canvas
SL, SR = (FX + 4, FY + 95), (FX + FW - 4, FY + 95)


def flag_character(kind, uid, larm=(115, 100), rarm=(65, 80), eyes=None, front="", back="", top=""):
    eyes = eyes or {}
    la, lh = arm(*SL, *larm, id_="arm-left")
    ra, rh = arm(*SR, *rarm, id_="arm-right")
    clip = f'<clipPath id="flag{uid}"><rect x="{FX}" y="{FY}" width="{FW}" height="{FH}" rx="7"/></clipPath>'
    shade = (f'<linearGradient id="cloth{uid}" x1="0" x2="1" y1="0" y2="0">'
             f'<stop offset="0" stop-color="#fff" stop-opacity="0.12"/>'
             f'<stop offset="0.35" stop-color="#000" stop-opacity="0.0"/>'
             f'<stop offset="0.6" stop-color="#000" stop-opacity="0.10"/>'
             f'<stop offset="1" stop-color="#fff" stop-opacity="0.06"/></linearGradient>')
    ex_l, ex_r, ey = FX + FW * 0.33, FX + FW * 0.67, FY + FH * 0.44
    rx, ry = 27, 36
    e = eyes
    eyes_svg = (eye(f"{uid}l", ex_l, ey, rx, ry, e.get("look", (0, 0)), e.get("lid", 0), e.get("slope_l", 0),
                    e.get("pupil", 0.52), e.get("style", "normal")) +
                eye(f"{uid}r", ex_r, ey, rx, ry, e.get("look", (0, 0)), e.get("lid", 0), e.get("slope_r", 0),
                    e.get("pupil", 0.52), e.get("style", "normal")))
    body = (f'<ellipse cx="260" cy="{FY+FH+95}" rx="120" ry="13" fill="#000" opacity="0.22"/>'
            f'{back}{la}{ra}'
            f'<g id="body"><rect x="{FX+6}" y="{FY+9}" width="{FW}" height="{FH}" rx="7" fill="#000" opacity="0.25"/>'
            f'<g clip-path="url(#flag{uid})">{FLAGS[kind](FX, FY, FW, FH)}'
            f'<rect x="{FX}" y="{FY}" width="{FW}" height="{FH}" fill="url(#cloth{uid})"/></g>'
            f'<rect x="{FX}" y="{FY}" width="{FW}" height="{FH}" rx="7" fill="none" stroke="{INK}" stroke-width="7"/></g>'
            f'{top}<g id="eyes">{eyes_svg}</g>{front}')
    return svg(520, 440, body, clip + shade), lh, rh


def ruler_svg(x, y, length, thick, angle, ticks=12, label=True):
    """A wooden school ruler as an SVG group, rotated about (x, y)."""
    g = (f'<g transform="translate({x},{y}) rotate({angle})">'
         f'<rect x="0" y="{-thick/2}" width="{length}" height="{thick}" rx="{thick*0.12:.1f}" fill="#E9B949" '
         f'stroke="{INK}" stroke-width="{max(3, thick*0.08):.1f}"/>'
         f'<rect x="{length*0.01:.1f}" y="{-thick/2 + thick*0.1:.1f}" width="{length*0.98:.1f}" height="{thick*0.12:.1f}" '
         f'fill="#F6D57E" opacity="0.8"/>')
    n = ticks * 4
    for i in range(1, n):
        tx = length * i / n
        tl = thick * (0.42 if i % 4 == 0 else 0.22 if i % 2 == 0 else 0.14)
        g += (f'<line x1="{tx:.1f}" y1="{-thick/2}" x2="{tx:.1f}" y2="{-thick/2 + tl:.1f}" stroke="#5A3A12" '
              f'stroke-width="{max(1.5, thick*0.035):.1f}"/>')
        if label and i % 4 == 0:
            g += (f'<text x="{tx:.1f}" y="{-thick/2 + thick*0.72:.1f}" font-family="Montserrat, Inter, sans-serif" '
                  f'font-weight="800" font-size="{thick*0.28:.1f}" text-anchor="middle" fill="#5A3A12">{i//4}</text>')
    return g + "</g>"


def build_flag_characters():
    # USA — confident, holding the ruler
    s, lh, rh = flag_character(
        "us", "usc", larm=(150, 60), rarm=(-30, -90),
        eyes=dict(look=(0.6, -0.2), lid=0.38, slope_l=-6, slope_r=6))
    rul = ruler_svg(rh[0], rh[1], 175, 34, -152, ticks=5, label=False)
    s = s.replace('<g id="eyes">', rul + '<g id="eyes">')
    save("usa_confident.svg", s)
    # USA — confused + sweating, scratching head
    sweat = (f'<path id="sweat" d="M405,110 C395,130 392,142 405,148 C418,142 415,130 405,110 Z" fill="#7FD3FF" '
             f'stroke="{INK}" stroke-width="5"/>'
             f'<text x="260" y="92" font-family="Montserrat, sans-serif" font-weight="800" font-size="64" '
             f'text-anchor="middle" fill="#FFD43B" stroke="{INK}" stroke-width="5" paint-order="stroke">?</text>')
    s, _, _ = flag_character("us", "usq", larm=(-125, -60), rarm=(65, 85),
                             eyes=dict(look=(0, 0), pupil=0.32, slope_l=8, slope_r=-8), front=sweat)
    save("usa_confused.svg", s)
    # USA — trapped behind bars
    bars = "".join(f'<rect x="{x}" y="70" width="16" height="320" rx="6" fill="#8D949C" stroke="{INK}" stroke-width="5"/>'
                   for x in range(104, 420, 56))
    bars = (f'<g id="bars">{bars}<rect x="86" y="64" width="348" height="22" rx="8" fill="#6C737A" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="86" y="374" width="348" height="22" rx="8" fill="#6C737A" stroke="{INK}" stroke-width="5"/></g>')
    s, _, _ = flag_character("us", "ust", larm=(-80, -95), rarm=(-100, -85),
                             eyes=dict(look=(0, 0.5), lid=0.3, slope_l=-14, slope_r=14), front=bars)
    save("usa_trapped.svg", s)
    # Britain — surprised, top hat + monocle
    hat = (f'<g id="hat"><ellipse cx="260" cy="{FY+4}" rx="96" ry="16" fill="#1C1C20" stroke="{INK}" stroke-width="6"/>'
           f'<rect x="198" y="{FY-92}" width="124" height="96" rx="8" fill="#1C1C20" stroke="{INK}" stroke-width="6"/>'
           f'<rect x="198" y="{FY-26}" width="124" height="18" fill="{UK_RED}"/></g>')
    mono = (f'<g id="monocle"><circle cx="{FX+FW*0.67}" cy="{FY+FH*0.44}" r="40" fill="none" stroke="#C9A227" stroke-width="7"/>'
            f'<path d="M{FX+FW*0.67+28},{FY+FH*0.44+28} q30,40 10,90" fill="none" stroke="#C9A227" stroke-width="4"/></g>')
    s, _, _ = flag_character("uk", "ukm", larm=(-140, -110), rarm=(-40, -70),
                             eyes=dict(look=(0, -0.2), pupil=0.36), front=mono, top=hat)
    save("britain_surprised.svg", s)
    # Canada — cheerful, apologetic wave
    blush = "".join(f'<ellipse cx="{x}" cy="{FY+FH*0.66}" rx="20" ry="11" fill="#FF8A8A" opacity="0.6"/>'
                    for x in (FX + FW * 0.2, FX + FW * 0.8))
    s, _, _ = flag_character("ca", "cah", larm=(115, 100), rarm=(-50, -80),
                             eyes=dict(style="happy"), front=blush)
    save("canada_cheerful.svg", s)


# ------------------------------------------------------------------ chibi people

def chibi(o, w=300, h=440):
    """Return SVG for a chibi person standing with feet at (150, 420)."""
    cx, feet = 150, 420
    s = h * 0.95
    hy, hr = feet - s * 0.68, s * 0.23
    coat = o.get("coat", "#2B2B33")
    parts = [f'<ellipse cx="{cx}" cy="{feet}" rx="{s*0.22:.0f}" ry="{s*0.035:.0f}" fill="#000" opacity="0.22"/>']
    for lx in (-0.07, 0.07):
        parts.append(f'<rect x="{cx + s*lx - s*0.04:.1f}" y="{feet - s*0.16:.1f}" width="{s*0.08:.1f}" height="{s*0.16:.1f}" '
                     f'rx="5" fill="{o.get("pants", "#3A3A40")}" stroke="{INK}" stroke-width="5"/>')
        parts.append(f'<ellipse cx="{cx + s*lx + 3:.1f}" cy="{feet - 2}" rx="{s*0.06:.1f}" ry="{s*0.025:.1f}" fill="{INK}"/>')
    hands = {}
    for side, key, default in ((-1, "larm", 120), (1, "rarm", 60)):
        a = math.radians(o.get(key, default))
        sx, sy = cx + side * s * 0.13, feet - s * 0.36
        hx, hy2 = sx + s * 0.22 * math.cos(a), sy + s * 0.22 * math.sin(a)
        hands[key] = (hx, hy2)
        parts.append(f'<g id="{"arm-left" if side < 0 else "arm-right"}"><line x1="{sx:.1f}" y1="{sy:.1f}" x2="{hx:.1f}" y2="{hy2:.1f}" '
                     f'stroke="{INK}" stroke-width="{s*0.075+8:.1f}" stroke-linecap="round"/>'
                     f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{hx:.1f}" y2="{hy2:.1f}" stroke="{coat}" '
                     f'stroke-width="{s*0.075:.1f}" stroke-linecap="round"/>'
                     f'<circle cx="{hx:.1f}" cy="{hy2:.1f}" r="{s*0.04:.1f}" fill="{SKIN}" stroke="{INK}" stroke-width="4"/></g>')
    parts.append(f'<path d="M{cx - s*0.11:.1f},{feet - s*0.46:.1f} L{cx + s*0.11:.1f},{feet - s*0.46:.1f} '
                 f'L{cx + s*0.17:.1f},{feet - s*0.14:.1f} L{cx - s*0.17:.1f},{feet - s*0.14:.1f} Z" fill="{coat}" '
                 f'stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>')
    if o.get("tie"):
        parts.append(f'<path d="M{cx},{feet - s*0.45:.1f} l9,26 l-9,24 l-9,-24 Z" fill="{o["tie"]}" stroke="{INK}" stroke-width="3"/>')
    head_fill = o.get("head", SKIN)
    parts.append(f'<g id="head"><circle cx="{cx}" cy="{hy:.1f}" r="{hr:.1f}" fill="{head_fill}" stroke="{INK}" stroke-width="6"/>')
    beard = o.get("beard")
    if beard == "chops":
        for sd in (-1, 1):
            parts.append(f'<path d="M{cx + sd*hr*0.98:.1f},{hy - hr*0.2:.1f} C{cx + sd*hr*1.35:.1f},{hy + hr*0.5:.1f} '
                         f'{cx + sd*hr*1.1:.1f},{hy + hr*0.95:.1f} {cx + sd*hr*0.35:.1f},{hy + hr*0.62:.1f} '
                         f'L{cx + sd*hr*0.75:.1f},{hy + hr*0.1:.1f} Z" fill="{o.get("beard_c", "#9A9A9A")}" stroke="{INK}" stroke-width="4"/>')
    elif beard == "chin":
        parts.append(f'<path d="M{cx - hr*0.35:.1f},{hy + hr*0.75:.1f} C{cx - hr*0.3:.1f},{hy + hr*1.4:.1f} '
                     f'{cx + hr*0.3:.1f},{hy + hr*1.4:.1f} {cx + hr*0.35:.1f},{hy + hr*0.75:.1f} Z" '
                     f'fill="{o.get("beard_c", "#3A2614")}" stroke="{INK}" stroke-width="4"/>')
    face = o.get("face", "smile")
    if o.get("blindfold"):
        parts.append(f'<path d="M{cx - hr*1.02:.1f},{hy - hr*0.22:.1f} Q{cx},{hy - hr*0.34:.1f} {cx + hr*1.02:.1f},{hy - hr*0.22:.1f} '
                     f'L{cx + hr*1.0:.1f},{hy + hr*0.18:.1f} Q{cx},{hy + hr*0.06:.1f} {cx - hr*1.0:.1f},{hy + hr*0.18:.1f} Z" '
                     f'fill="#111" stroke="{INK}" stroke-width="4"/>'
                     f'<path d="M{cx + hr*0.95:.1f},{hy - hr*0.05:.1f} q{hr*0.5:.1f},{hr*0.1:.1f} {hr*0.6:.1f},{hr*0.55:.1f} '
                     f'M{cx + hr*0.95:.1f},{hy:.1f} q{hr*0.35:.1f},{hr*0.35:.1f} {hr*0.25:.1f},{hr*0.8:.1f}" stroke="#111" '
                     f'stroke-width="9" fill="none" stroke-linecap="round"/>')
    elif o.get("shades"):
        parts.append(f'<path d="M{cx - hr*0.85:.1f},{hy - hr*0.18:.1f} H{cx + hr*0.85:.1f}" stroke="{INK}" stroke-width="6"/>'
                     + "".join(f'<rect x="{cx + sd*hr*0.48 - hr*0.34:.1f}" y="{hy - hr*0.22:.1f}" width="{hr*0.68:.1f}" '
                               f'height="{hr*0.36:.1f}" rx="{hr*0.12:.1f}" fill="#111"/>' for sd in (-1, 1)))
    else:
        for sd in (-1, 1):
            ey = hy - hr * 0.02
            if o.get("stressed"):
                parts.append(f'<circle cx="{cx + sd*hr*0.36:.1f}" cy="{ey:.1f}" r="{hr*0.17:.1f}" fill="#fff" stroke="{INK}" stroke-width="4"/>'
                             f'<circle cx="{cx + sd*hr*0.36:.1f}" cy="{ey:.1f}" r="{hr*0.06:.1f}" fill="{INK}"/>'
                             f'<path d="M{cx + sd*hr*0.6:.1f},{hy - hr*0.42:.1f} L{cx + sd*hr*0.16:.1f},{hy - hr*0.3:.1f}" '
                             f'stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
            else:
                parts.append(f'<ellipse cx="{cx + sd*hr*0.36:.1f}" cy="{ey:.1f}" rx="{hr*0.1:.1f}" ry="{hr*0.15:.1f}" fill="{INK}"/>')
    if face == "smile":
        parts.append(f'<path d="M{cx - hr*0.18:.1f},{hy + hr*0.42:.1f} Q{cx},{hy + hr*0.62:.1f} {cx + hr*0.18:.1f},{hy + hr*0.42:.1f}" '
                     f'stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>')
    elif face == "panic":
        parts.append(f'<ellipse cx="{cx}" cy="{hy + hr*0.52:.1f}" rx="{hr*0.2:.1f}" ry="{hr*0.24:.1f}" fill="{INK}"/>'
                     f'<ellipse cx="{cx}" cy="{hy + hr*0.6:.1f}" rx="{hr*0.11:.1f}" ry="{hr*0.09:.1f}" fill="#E25C5C"/>')
    elif face == "flat":
        parts.append(f'<path d="M{cx - hr*0.2:.1f},{hy + hr*0.5:.1f} H{cx + hr*0.2:.1f}" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>')
    if o.get("sweat"):
        parts.append(f'<path d="M{cx + hr*1.05:.1f},{hy - hr*0.7:.1f} c-10,20 -12,32 0,38 c12,-6 10,-18 0,-38 Z" fill="#7FD3FF" stroke="{INK}" stroke-width="4"/>')
    hat = o.get("hat")
    if hat == "top":
        parts.append(f'<ellipse cx="{cx}" cy="{hy - hr*0.8:.1f}" rx="{hr*1.25:.1f}" ry="{hr*0.22:.1f}" fill="#1C1C20" stroke="{INK}" stroke-width="5"/>'
                     f'<rect x="{cx - hr*0.7:.1f}" y="{hy - hr*1.95:.1f}" width="{hr*1.4:.1f}" height="{hr*1.18:.1f}" rx="6" fill="#1C1C20" stroke="{INK}" stroke-width="5"/>'
                     f'<rect x="{cx - hr*0.7:.1f}" y="{hy - hr*1.05:.1f}" width="{hr*1.4:.1f}" height="{hr*0.2:.1f}" fill="{o.get("band", "#7A1F1F")}"/>')
    elif hat == "fedora":
        parts.append(f'<ellipse cx="{cx}" cy="{hy - hr*0.62:.1f}" rx="{hr*1.4:.1f}" ry="{hr*0.26:.1f}" fill="#2E2A26" stroke="{INK}" stroke-width="5"/>'
                     f'<path d="M{cx - hr*0.8:.1f},{hy - hr*0.66:.1f} L{cx - hr*0.68:.1f},{hy - hr*1.45:.1f} Q{cx},{hy - hr*1.2:.1f} '
                     f'{cx + hr*0.68:.1f},{hy - hr*1.45:.1f} L{cx + hr*0.8:.1f},{hy - hr*0.66:.1f} Z" fill="#2E2A26" stroke="{INK}" stroke-width="5"/>'
                     f'<rect x="{cx - hr*0.79:.1f}" y="{hy - hr*0.92:.1f}" width="{hr*1.58:.1f}" height="{hr*0.18:.1f}" fill="#8B1E1E"/>')
    parts.append("</g>")
    return parts, hands


def quill(x, y, ang, L=230):
    return (f'<g transform="translate({x:.1f},{y:.1f}) rotate({ang})">'
            f'<path d="M0,0 L{L},0" stroke="#6B5530" stroke-width="5"/>'
            f'<path d="M{L*0.25:.1f},0 C{L*0.45:.1f},-{L*0.22:.1f} {L*0.85:.1f},-{L*0.2:.1f} {L},0 '
            f'C{L*0.85:.1f},{L*0.12:.1f} {L*0.45:.1f},{L*0.12:.1f} {L*0.25:.1f},0 Z" fill="#F7F3E8" stroke="{INK}" stroke-width="4"/>'
            f'<path d="M-6,0 L8,-5 L8,5 Z" fill="{INK}"/></g>')


def build_people():
    uk = dict(coat="#2A2A30", hat="top", band=UK_RED, beard="chops", beard_c="#9A9A9A", tie=UK_RED,
              blindfold=True, rarm=-30, larm=130)
    p, hands = chibi(uk)
    hx, hy = hands["rarm"]
    save("diplomat_uk_blindfolded.svg", svg(300, 440, "".join(p) + quill(hx, hy, -60)))
    us = dict(coat="#2E3550", hat="top", band="#3C5BB0", beard="chin", tie="#3C5BB0", blindfold=True,
              rarm=50, larm=-150)
    p, hands = chibi(us)
    hx, hy = hands["larm"]
    save("diplomat_us_blindfolded.svg", svg(300, 440, "".join(p) + quill(hx, hy, -120)))
    res = dict(coat="#5C7FA8", pants="#2F3B4F", head="#FFFFFF", stressed=True, sweat=True, face="panic",
               rarm=-40, larm=120)
    p, hands = chibi(res)
    hx, hy = hands["rarm"]
    carton = milk_svg(hx - 30, hy - 75, 60)
    save("resident_stressed.svg", svg(300, 440, "".join(p) + carton))
    mob = dict(coat="#3B3B3B", pants="#222", hat="fedora", shades=True, face="flat", rarm=70, larm=110)
    p, _ = chibi(mob)
    collar = (f'<path d="M115,250 L150,290 L185,250" fill="none" stroke="#555" stroke-width="8"/>')
    save("mobster_witness.svg", svg(300, 440, "".join(p) + collar))


# ------------------------------------------------------------------ props

def milk_svg(x, y, s):
    return (f'<g id="milk" transform="translate({x:.1f},{y:.1f})">'
            f'<path d="M0,{s*0.45:.1f} L{s*0.5:.1f},{s*0.2:.1f} L{s},{s*0.45:.1f} L{s},{s*1.55:.1f} L0,{s*1.55:.1f} Z" '
            f'fill="#fff" stroke="{INK}" stroke-width="{s*0.07:.1f}" stroke-linejoin="round"/>'
            f'<path d="M{s*0.1:.1f},{s*0.2:.1f} L{s*0.9:.1f},{s*0.2:.1f} L{s},{s*0.45:.1f} L0,{s*0.45:.1f} Z" '
            f'fill="#5DA9E9" stroke="{INK}" stroke-width="{s*0.07:.1f}" stroke-linejoin="round"/>'
            f'<rect x="{s*0.12:.1f}" y="{s*0.75:.1f}" width="{s*0.76:.1f}" height="{s*0.4:.1f}" rx="{s*0.06:.1f}" fill="#5DA9E9"/>'
            f'<text x="{s*0.5:.1f}" y="{s*1.04:.1f}" font-family="Montserrat, sans-serif" font-weight="800" '
            f'font-size="{s*0.25:.1f}" text-anchor="middle" fill="#fff">MILK</text></g>')


def build_props():
    # giant ruler
    save("ruler.svg", svg(1200, 120, ruler_svg(10, 60, 1180, 96, 0, ticks=12)))
    # border gate: post + arm (arm pivots at its left end: transform-origin 40px 60px)
    stripes = "".join(f'<rect x="{40 + i*70}" y="40" width="35" height="40" fill="{CA_RED}"/>' for i in range(10))
    arm_body = (f'<g id="gate-arm"><rect x="20" y="40" width="700" height="40" rx="18" fill="#fff" stroke="{INK}" stroke-width="7"/>'
                f'<g clip-path="url(#armclip)">{stripes}</g>'
                f'<rect x="20" y="40" width="700" height="40" rx="18" fill="none" stroke="{INK}" stroke-width="7"/>'
                f'<circle cx="40" cy="60" r="16" fill="#555" stroke="{INK}" stroke-width="6"/></g>')
    armclip = '<clipPath id="armclip"><rect x="20" y="40" width="700" height="40" rx="18"/></clipPath>'
    save("gate_arm.svg", svg(740, 120, arm_body, armclip))
    post = (f'<rect x="10" y="20" width="110" height="260" rx="10" fill="#E8E2D2" stroke="{INK}" stroke-width="7"/>'
            f'<rect x="30" y="50" width="70" height="60" rx="6" fill="#9FD4E8" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="0" y="270" width="130" height="30" rx="6" fill="#6C737A" stroke="{INK}" stroke-width="6"/>'
            f'<text x="65" y="160" font-family="Montserrat, sans-serif" font-weight="800" font-size="22" '
            f'text-anchor="middle" fill="{INK}">BORDER</text>'
            f'<circle cx="65" cy="215" r="18" fill="#E63946" stroke="{INK}" stroke-width="5"/>')
    save("gate_post.svg", svg(130, 300, post))
    combined = (f'<g transform="translate(0,40)">{post}</g>'
                f'<g transform="translate(90,90) rotate(0)">{arm_body}</g>')
    save("border_gate.svg", svg(850, 360, combined, armclip))
    stamp = (f'<g transform="translate(210,110) rotate(-12)">'
             f'<rect x="-190" y="-80" width="380" height="160" rx="22" fill="none" stroke="#E0262B" stroke-width="14"/>'
             f'<rect x="-170" y="-62" width="340" height="124" rx="14" fill="none" stroke="#E0262B" stroke-width="5"/>'
             f'<text x="0" y="34" font-family="Montserrat, sans-serif" font-weight="800" font-size="96" '
             f'text-anchor="middle" fill="#E0262B">STAMP!</text></g>')
    save("stamp.svg", svg(420, 220, stamp))
    # school bus (body; wheels separate so they can spin)
    win = "".join(f'<rect x="{150 + i*78}" y="62" width="62" height="58" rx="8" fill="#BFE6F5" stroke="{INK}" stroke-width="5"/>'
                  for i in range(6))
    bus = (f'<g id="bus-body"><path d="M40,40 H640 Q690,40 700,90 L720,170 Q728,215 690,220 H40 Q20,220 20,200 V60 Q20,40 40,40 Z" '
           f'fill="#F7C200" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
           f'<rect x="20" y="140" width="700" height="14" fill="{INK}"/>'
           f'<rect x="40" y="62" width="80" height="120" rx="8" fill="#BFE6F5" stroke="{INK}" stroke-width="5"/>'
           f'{win}<path d="M640,62 H672 L690,120 H640 Z" fill="#BFE6F5" stroke="{INK}" stroke-width="5"/>'
           f'<text x="380" y="190" font-family="Montserrat, sans-serif" font-weight="800" font-size="30" text-anchor="middle" '
           f'fill="{INK}">SCHOOL BUS</text>'
           f'<rect x="706" y="160" width="24" height="18" rx="4" fill="#FFF3B0" stroke="{INK}" stroke-width="4"/>'
           f'<rect x="8" y="170" width="18" height="30" rx="4" fill="#E63946" stroke="{INK}" stroke-width="4"/></g>')
    save("bus_body.svg", svg(740, 240, bus))
    wheel = (f'<g id="wheel"><circle cx="50" cy="50" r="44" fill="#222" stroke="{INK}" stroke-width="6"/>'
             f'<circle cx="50" cy="50" r="22" fill="#BFC5CB" stroke="{INK}" stroke-width="5"/>'
             + "".join(f'<line x1="50" y1="50" x2="{50 + 20*math.cos(math.radians(a)):.1f}" y2="{50 + 20*math.sin(math.radians(a)):.1f}" '
                       f'stroke="{INK}" stroke-width="5"/>' for a in (0, 72, 144, 216, 288)) + "</g>")
    save("bus_wheel.svg", svg(100, 100, wheel))
    save("school_bus.svg", svg(740, 290, bus + f'<g transform="translate(110,180)">{wheel}</g>'
                                         f'<g transform="translate(540,180)">{wheel}</g>'))
    # transport icons in glowing neon-cyan circles
    glow = ('<radialGradient id="glow"><stop offset="0.62" stop-color="#25E3FF" stop-opacity="0.65"/>'
            '<stop offset="1" stop-color="#25E3FF" stop-opacity="0"/></radialGradient>')

    def icon(name, inner):
        body = (f'<circle cx="160" cy="160" r="158" fill="url(#glow)"/>'
                f'<circle cx="160" cy="160" r="100" fill="#0F2E38" stroke="#25E3FF" stroke-width="9"/>{inner}')
        save(name, svg(320, 320, body, glow))

    ferry = (f'<path d="M85,175 H235 L215,212 H105 Z" fill="#fff" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
             f'<rect x="110" y="140" width="95" height="36" rx="6" fill="#fff" stroke="{INK}" stroke-width="6"/>'
             f'<rect x="135" y="112" width="45" height="30" rx="5" fill="#fff" stroke="{INK}" stroke-width="6"/>'
             + "".join(f'<rect x="{120 + i*24}" y="150" width="14" height="14" rx="3" fill="#25E3FF"/>' for i in range(4))
             + f'<path d="M80,225 q20,-10 40,0 t40,0 t40,0 t40,0" stroke="#25E3FF" stroke-width="6" fill="none"/>')
    icon("icon_ferry.svg", ferry)
    plane = (f'<path d="M95,165 Q160,145 225,160 Q240,165 225,172 Q160,185 95,175 Z" fill="#fff" stroke="{INK}" stroke-width="6"/>'
             f'<path d="M150,160 L120,110 L140,108 L185,160 Z" fill="#fff" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
             f'<path d="M150,175 L125,220 L145,222 L185,175 Z" fill="#fff" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
             f'<path d="M100,168 L82,140 L96,138 L115,165 Z" fill="#fff" stroke="{INK}" stroke-width="5"/>'
             f'<ellipse cx="232" cy="166" rx="6" ry="30" fill="#BFC5CB" stroke="{INK}" stroke-width="4"/>')
    icon("icon_plane.svg", plane)
    car = (f'<path d="M80,190 V165 Q80,150 95,148 L120,145 L140,118 Q146,110 158,110 H200 Q212,110 220,120 L240,146 '
           f'Q255,150 255,165 V190 Z" fill="#E63946" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
           f'<path d="M146,125 H175 V146 H130 Z M185,125 H210 L224,146 H185 Z" fill="#BFE6F5" stroke="{INK}" stroke-width="4"/>'
           f'<circle cx="118" cy="192" r="18" fill="#222" stroke="{INK}" stroke-width="5"/>'
           f'<circle cx="218" cy="192" r="18" fill="#222" stroke="{INK}" stroke-width="5"/>')
    icon("icon_car.svg", car)
    xmark = (f'<g id="x"><path d="M95,95 L225,225 M225,95 L95,225" stroke="#E63946" stroke-width="22" stroke-linecap="round"/></g>')
    hosp = (f'<rect x="105" y="115" width="110" height="100" rx="8" fill="#fff" stroke="{INK}" stroke-width="6"/>'
            f'<path d="M160,130 V200 M125,165 H195" stroke="#E63946" stroke-width="20"/>')
    icon("icon_no_hospital.svg", hosp + xmark)
    school = (f'<path d="M100,150 L160,110 L220,150 Z" fill="#B5523B" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
              f'<rect x="110" y="150" width="100" height="70" fill="#E8C07D" stroke="{INK}" stroke-width="6"/>'
              f'<rect x="148" y="180" width="24" height="40" fill="#6B4423" stroke="{INK}" stroke-width="4"/>'
              f'<text x="160" y="146" font-family="Montserrat, sans-serif" font-weight="800" font-size="22" text-anchor="middle" fill="#fff">HS</text>')
    icon("icon_no_highschool.svg", school + xmark)
    # padlock (red, metallic)
    lock = ('<linearGradient id="metal" x1="0" x2="1"><stop offset="0" stop-color="#E9EDF0"/><stop offset="0.5" stop-color="#9AA3AB"/>'
            '<stop offset="1" stop-color="#D9DEE2"/></linearGradient>'
            '<linearGradient id="red" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FF4D4D"/>'
            '<stop offset="1" stop-color="#A3121B"/></linearGradient>')
    pad = (f'<path id="shackle" d="M80,150 V95 Q80,30 150,30 Q220,30 220,95 V150" fill="none" stroke="{INK}" stroke-width="44" stroke-linecap="round"/>'
           f'<path d="M80,150 V95 Q80,30 150,30 Q220,30 220,95 V150" fill="none" stroke="url(#metal)" stroke-width="30" stroke-linecap="round"/>'
           f'<g id="lock-body"><rect x="40" y="140" width="220" height="190" rx="28" fill="url(#red)" stroke="{INK}" stroke-width="9"/>'
           f'<rect x="58" y="156" width="184" height="18" rx="9" fill="#fff" opacity="0.35"/>'
           f'<circle cx="150" cy="220" r="24" fill="{INK}"/><path d="M140,230 L160,230 L166,285 L134,285 Z" fill="{INK}"/></g>')
    save("padlock.svg", svg(300, 350, pad, lock))
    # tumbleweed, bread, milk
    rngp = []
    import random
    r = random.Random(5)
    for i in range(34):
        a0 = r.uniform(0, 6.28)
        rr = r.uniform(55, 98)
        rngp.append(f'<path d="M{150 + rr*math.cos(a0):.0f},{150 + rr*math.sin(a0):.0f} '
                    f'Q{150 + r.uniform(-90, 90):.0f},{150 + r.uniform(-90, 90):.0f} '
                    f'{150 + rr*math.cos(a0 + 2.6):.0f},{150 + rr*math.sin(a0 + 2.6):.0f}" fill="none" stroke="#7A5530" stroke-width="9" stroke-linecap="round"/>')
    tumble = (f'<g id="tumbleweed"><circle cx="150" cy="150" r="102" fill="#D8B77A" stroke="{INK}" stroke-width="7"/>{"".join(rngp)}'
              f'<circle cx="150" cy="150" r="102" fill="none" stroke="{INK}" stroke-width="7"/></g>')
    save("tumbleweed.svg", svg(300, 300, tumble))
    bread = (f'<path d="M40,150 Q30,60 110,55 Q150,30 190,55 Q270,60 260,150 Z" fill="#D9934A" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
             f'<rect x="40" y="140" width="220" height="70" rx="12" fill="#F3D3A2" stroke="{INK}" stroke-width="8"/>'
             f'<path d="M95,90 L120,120 M140,80 L165,112 M185,90 L210,120" stroke="#A86A2C" stroke-width="7" stroke-linecap="round"/>')
    save("bread.svg", svg(300, 240, bread))
    save("milk.svg", svg(140, 240, milk_svg(20, 10, 100)))
    # passport
    pp = (f'<rect x="20" y="10" width="180" height="250" rx="14" fill="#1F3A68" stroke="{INK}" stroke-width="8"/>'
          f'<text x="110" y="70" font-family="Montserrat, sans-serif" font-weight="800" font-size="26" text-anchor="middle" fill="#E8C55A">PASSPORT</text>'
          f'<circle cx="110" cy="140" r="40" fill="none" stroke="#E8C55A" stroke-width="6"/>'
          f'<polygon points="{star_pts(110, 140, 26)}" fill="#E8C55A"/>')
    save("passport.svg", svg(220, 270, pp))
    # file folder for witness protection
    folder = (f'<path d="M20,60 H120 L140,40 H300 V260 H20 Z" fill="#E7C46B" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
              f'<rect x="20" y="80" width="280" height="180" fill="#F2D27E" stroke="{INK}" stroke-width="8"/>'
              f'<text x="160" y="150" font-family="Montserrat, sans-serif" font-weight="800" font-size="26" text-anchor="middle" fill="{INK}">WITNESS</text>'
              f'<text x="160" y="185" font-family="Montserrat, sans-serif" font-weight="800" font-size="26" text-anchor="middle" fill="{INK}">PROTECTION</text>'
              f'<g transform="translate(160,228) rotate(-8)"><rect x="-95" y="-24" width="190" height="48" rx="8" fill="none" stroke="#E0262B" stroke-width="6"/>'
              f'<text x="0" y="12" font-family="Montserrat, sans-serif" font-weight="800" font-size="30" text-anchor="middle" fill="#E0262B">CLASSIFIED</text></g>')
    save("witness_file.svg", svg(320, 280, folder))


# ------------------------------------------------------------------ map layout SVG

def build_map():
    src = open(os.path.join(HERE, "..", "src", "geo_data.js")).read()
    geo = json.loads(src[src.index("{"):src.rindex("}") + 1])
    W, H = 1080, 1920
    lon0, lat0, z = -122.93, 49.0, 2500.0   # center + px per degree (lon)

    def mercy(lat):
        return math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))

    def P(lon, lat):
        return W / 2 + (lon - lon0) * z, H * 0.45 - (mercy(lat) - mercy(lat0)) * z

    def path(flat):
        pts = [P(flat[i], flat[i + 1]) for i in range(0, len(flat), 2)]
        return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"

    land = " ".join(path(r) for r in geo["pnw"])
    pr = " ".join(path(r) for r in geo["pr"])
    by = P(0, geo["borderLat"])[1]
    defs = (f'<pattern id="noise" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#8A855C"/>'
            f'<circle cx="2" cy="2" r="1" fill="#000" opacity="0.06"/></pattern>'
            f'<filter id="shadow"><feDropShadow dx="6" dy="9" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/></filter>'
            f'<clipPath id="prclip"><path d="{pr}"/></clipPath>')
    xs = [P(geo["pr"][0][i], geo["pr"][0][i + 1]) for i in range(0, len(geo["pr"][0]), 2)]
    x0, x1 = min(p[0] for p in xs), max(p[0] for p in xs)
    y0, y1 = min(p[1] for p in xs), max(p[1] for p in xs)
    fl = flag_us(x0 - 5, y0 - 5, x1 - x0 + 10, y1 - y0 + 10)
    lab = lambda x, y, t, s=40: (f'<text x="{x}" y="{y}" font-family="Montserrat, Inter, sans-serif" font-weight="800" '
                                 f'font-size="{s}" text-anchor="middle" fill="#fff" stroke="#000" stroke-opacity="0.45" '
                                 f'stroke-width="6" paint-order="stroke">{t}</text>')
    body = (f'<rect width="{W}" height="{H}" fill="#1E4D5C"/>'
            f'<g filter="url(#shadow)"><path d="{land}" fill="url(#noise)" stroke="#5E5A3B" stroke-width="2.5"/></g>'
            f'<g id="point-roberts" filter="url(#shadow)"><g clip-path="url(#prclip)" opacity="0.92">{fl}</g>'
            f'<path d="{pr}" fill="none" stroke="#141416" stroke-width="4"/></g>'
            f'<line id="border-49" x1="0" y1="{by:.1f}" x2="{W}" y2="{by:.1f}" stroke="#F4D03F" stroke-width="6" stroke-dasharray="22 14"/>'
            + lab(W / 2, by - 30, "49th PARALLEL", 30)
            + lab(*P(-122.93, 49.16), "CANADA", 72) + lab(*P(-122.93, 49.14), "British Columbia", 36)
            + lab(*P(-122.78, 48.90), "USA", 72) + lab(*P(-122.78, 48.885), "Washington State", 36)
            + lab(*P(-122.93, 49.03), "Boundary Bay", 32)
            + lab(*P(-123.06, 48.962), "POINT ROBERTS", 40) + lab(*P(-123.06, 48.955), "5 sq mi of USA", 28))
    save("point_roberts_map.svg", svg(W, H, body, defs))


if __name__ == "__main__":
    build_flag_characters()
    build_people()
    build_props()
    build_map()
    print("\n".join(sorted(os.listdir(OUT))))
