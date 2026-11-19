"""SVG assets for the Kowloon Walled City short -> ../assets/*.svg

Isometric stages of the block (same footprint, so they can morph): walled_city_1898_fort, walled_city_1960s_growing,
walled_city_1980s_megastructure, walled_city_1995_park. Props: jet, alley interior with dripping pipes + umbrella,
dentist sign, gang silhouettes, family, four football fields, crane + wrecking ball, money bag, 1987 agreement,
'no tax / no building codes / no police' icons, map pin, Britain + China flag characters.
"""
import importlib.util
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("pr_assets", os.path.join(HERE, "..", "..", "point-roberts", "tools", "make_assets.py"))
PR = importlib.util.module_from_spec(spec)
spec.loader.exec_module(PR)
INK = PR.INK
svg = PR.svg


def save(name, content):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        f.write(content)


def hx(c):
    c = c.lstrip("#")
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def shade(c, f):
    r, g, b = hx(c)
    if f >= 1:
        return "#%02X%02X%02X" % tuple(min(255, int(v + (255 - v) * (f - 1))) for v in (r, g, b))
    return "#%02X%02X%02X" % tuple(int(v * f) for v in (r, g, b))


# ------------------------------------------------------------------ China flag + flag characters

def flag_cn(x, y, w, h):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#DE2910"/>'
    u = h / 20
    s += f'<polygon points="{PR.star_pts(x + 5 * u, y + 5 * u, 3 * u)}" fill="#FFDE00"/>'
    for cx, cy in ((10, 2), (12, 4), (12, 7), (10, 9)):
        ang = math.degrees(math.atan2(5 - cy, 5 - cx)) + 90
        s += f'<polygon points="{PR.star_pts(x + cx * u, y + cy * u, u, rot=ang)}" fill="#FFDE00"/>'
    return s


PR.FLAGS["cn"] = flag_cn


def build_flags():
    shrug = dict(larm=(-150, -100), rarm=(-30, -80))
    s, _, _ = PR.flag_character("uk", "ukshrug", eyes=dict(look=(-0.8, 0), lid=0.45, slope_l=-6, slope_r=6), **shrug)
    save("britain_shrug.svg", s)
    s, _, _ = PR.flag_character("cn", "cnshrug", eyes=dict(look=(0.8, 0), lid=0.45, slope_l=-6, slope_r=6), **shrug)
    save("china_shrug.svg", s)
    s, _, _ = PR.flag_character("uk", "ukpoint", larm=(115, 100), rarm=(5, 15), eyes=dict(look=(1, 0.2), slope_l=12, slope_r=-12))
    save("britain_point.svg", s)
    s, _, _ = PR.flag_character("cn", "cnpoint", larm=(175, 165), rarm=(65, 80), eyes=dict(look=(-1, 0.2), slope_l=12, slope_r=-12))
    save("china_point.svg", s)
    s, _, _ = PR.flag_character("uk", "ukdeal", larm=(115, 100), rarm=(20, 0), eyes=dict(look=(1, 0), lid=0.3))
    save("britain_deal.svg", s)
    s, _, _ = PR.flag_character("cn", "cndeal", larm=(160, 180), rarm=(65, 80), eyes=dict(look=(-1, 0), lid=0.3))
    save("china_deal.svg", s)


# ------------------------------------------------------------------ isometric engine

S = 26.0                  # px per iso unit (1 unit ~ 10 m)
FW, FD = 20, 12           # block footprint (~210 m x 120 m)
CX, CY = 410.0, 250.0     # screen position of iso origin (x=0, y=0, z=0)
IW, IH = 1000, 760


def P(x, y, z=0.0):
    return CX + (x - y) * 0.866 * S, CY + (x + y) * 0.5 * S - z * S


def poly(pts, fill, stroke=INK, sw=1.2, extra=""):
    return f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in pts)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"{extra}/>'


def win_defs():
    # window patterns aligned to the two visible iso faces (period = one storey)
    st = 0.3 * S
    pat = lambda pid, a, b: (f'<pattern id="{pid}" width="{0.5*S:.2f}" height="{st:.2f}" patternUnits="userSpaceOnUse" '
                              f'patternTransform="matrix({a} {b} 0 1 {CX} {CY})">'
                              f'<rect x="{0.12*S:.2f}" y="{st*0.25:.2f}" width="{0.24*S:.2f}" height="{st*0.45:.2f}" fill="#2E3440" opacity="0.75"/></pattern>')
    return pat("winL", 0.866, 0.5) + pat("winR", -0.866, 0.5)


def box(x0, y0, w, d, h, col, windows=True, sw=1.0):
    top = [P(x0, y0, h), P(x0 + w, y0, h), P(x0 + w, y0 + d, h), P(x0, y0 + d, h)]
    left = [P(x0, y0 + d, 0), P(x0 + w, y0 + d, 0), P(x0 + w, y0 + d, h), P(x0, y0 + d, h)]
    right = [P(x0 + w, y0, 0), P(x0 + w, y0 + d, 0), P(x0 + w, y0 + d, h), P(x0 + w, y0, h)]
    s = poly(left, shade(col, 0.86), sw=sw) + poly(right, shade(col, 0.7), sw=sw)
    if windows and h > 0.35:
        s += poly(left, "url(#winL)", stroke="none") + poly(right, "url(#winR)", stroke="none")
    s += poly(top, shade(col, 1.08), sw=sw)
    return s


def roof(x0, y0, w, d, h, rh, col="#4E5B52"):
    ym = y0 + d / 2
    back = [P(x0, y0, h), P(x0 + w, y0, h), P(x0 + w, ym, h + rh), P(x0, ym, h + rh)]
    front = [P(x0, y0 + d, h), P(x0 + w, y0 + d, h), P(x0 + w, ym, h + rh), P(x0, ym, h + rh)]
    gable = [P(x0 + w, y0, h), P(x0 + w, y0 + d, h), P(x0 + w, ym, h + rh)]
    ridge = f'<line x1="{P(x0 - 0.15, ym, h + rh)[0]:.1f}" y1="{P(x0 - 0.15, ym, h + rh)[1]:.1f}" x2="{P(x0 + w + 0.15, ym, h + rh)[0]:.1f}" y2="{P(x0 + w + 0.15, ym, h + rh)[1]:.1f}" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
    return poly(back, shade(col, 1.15)) + poly(front, col) + poly(gable, shade(col, 0.75)) + ridge


def tree(x, y, r=0.55, col="#5E8C4A"):
    tx, ty = P(x, y, 0)
    cx, cy = P(x, y, r * 1.5)
    return (f'<line x1="{tx:.1f}" y1="{ty:.1f}" x2="{cx:.1f}" y2="{cy:.1f}" stroke="#5A3D22" stroke-width="4"/>'
            f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{r*S*1.05:.1f}" ry="{r*S*0.85:.1f}" fill="{col}" stroke="{INK}" stroke-width="1.5"/>'
            f'<ellipse cx="{cx - r*S*0.3:.1f}" cy="{cy - r*S*0.3:.1f}" rx="{r*S*0.4:.1f}" ry="{r*S*0.3:.1f}" fill="{shade(col, 1.25)}"/>')


def plate(col, edge="#3B3F44", t=0.5, margin=0.8):
    m = margin
    top = [P(-m, -m), P(FW + m, -m), P(FW + m, FD + m), P(-m, FD + m)]
    left = [P(-m, FD + m, 0), P(FW + m, FD + m, 0), P(FW + m, FD + m, -t), P(-m, FD + m, -t)]
    right = [P(FW + m, -m, 0), P(FW + m, FD + m, 0), P(FW + m, FD + m, -t), P(FW + m, -m, -t)]
    shadow = [(a + 14, b + 20) for a, b in [P(-m, FD + m, -t), P(FW + m, FD + m, -t), P(FW + m, -m, -t)]]
    return (f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in [P(-m, FD + m, -t)] + shadow[:2] + [P(FW + m, -m, -t)])}" fill="#000" opacity="0.25"/>'
            + poly(left, shade(edge, 0.85), sw=2) + poly(right, shade(edge, 0.7), sw=2) + poly(top, col, sw=2))


def inside(x, y):
    """Irregular block outline: cut corners like the real footprint."""
    if x + y < 2.2 or (FW - x) + y < 1.6 or x + (FD - y) < 1.4 or (FW - x) + (FD - y) < 2.4:
        return False
    return 0 <= x <= FW and 0 <= y <= FD


def yamen(x0=9.0, y0=5.0):
    s = ""
    for k, yy in enumerate((y0, y0 + 1.4)):
        s += box(x0, yy, 2.4, 1.0, 0.45, "#C9B79A", windows=False) + roof(x0 - 0.1, yy - 0.1, 2.6, 1.2, 0.45, 0.45, "#556358")
    return s


def iso_svg(body, extra_defs=""):
    return svg(IW, IH, body, win_defs() + extra_defs)


def build_stages():
    rnd = random.Random(1898)
    # ---- stage 1: the 1898 fort
    items = [plate("#A5976B", edge="#6B5F45")]
    items.append(poly([P(0.4, 0.4), P(FW - 0.4, 0.4), P(FW - 0.4, FD - 0.4), P(0.4, FD - 0.4)], "#B9AA7C", stroke="none"))
    walls = []
    t = 0.55
    walls += [(0, 0, FW, t), (0, 0, t, FD)]                      # back walls
    houses = []
    for i in range(16):
        x, y = rnd.uniform(1.5, FW - 3), rnd.uniform(1.5, FD - 2.5)
        if 8 < x < 12.5 and 4 < y < 8:
            continue
        houses.append((x, y, rnd.uniform(1.0, 1.6), rnd.uniform(0.8, 1.1)))
    drawables = [(x + y, box(x, y, w, d, 0.35, "#CDB894", windows=False) + roof(x - 0.08, y - 0.08, w + 0.16, d + 0.16, 0.35, 0.35, "#6A5B4C"))
                 for x, y, w, d in houses]
    drawables += [(9 + 5, yamen())]
    drawables += [(x + y, tree(x, y)) for x, y in ((3, 9), (16, 2.5), (5, 3), (17.5, 9), (13.5, 9.5), (2.5, 5.5))]
    drawables.sort(key=lambda a: a[0])
    back_walls = box(0, 0, FW, t, 0.9, "#9E9686", windows=False) + box(0, t, t, FD - t, 0.9, "#9E9686", windows=False)
    front_walls = (box(FW - t, t, t, FD - t, 0.9, "#9E9686", windows=False) +
                   box(t, FD - t, 8.6, t, 0.9, "#9E9686", windows=False) + box(11.4, FD - t, FW - t - 11.4, t, 0.9, "#9E9686", windows=False) +
                   box(9.1, FD - t - 0.2, 2.3, t + 0.4, 1.35, "#8F8676", windows=False) + roof(9.0, FD - t - 0.3, 2.5, t + 0.6, 1.35, 0.4, "#556358"))
    items += [back_walls] + [d for _, d in drawables] + [front_walls]
    save("walled_city_1898_fort.svg", iso_svg("".join(items)))

    # ---- stage 2: growing (1950s-60s): walls gone, low-rise sprawl
    items = [plate("#8E8A80", edge="#4A4C50")]
    blocks = []
    y = 0.6
    while y < FD - 0.6:
        x = 0.6
        dd = rnd.uniform(1.2, 2.0)
        while x < FW - 0.6:
            ww = rnd.uniform(1.2, 2.4)
            if inside(x + ww / 2, y + dd / 2) and not (8.8 < x < 11.6 and 4.6 < y < 7.6) and rnd.random() > 0.12:
                h = rnd.choice([0.6, 0.9, 1.2, 1.5, 1.8])
                col = rnd.choice(["#D8CFBE", "#CFC3AE", "#BFC7C9", "#D9C4B0", "#C8C0A8"])
                blocks.append((x, y, ww - 0.15, dd - 0.15, h, col))
            x += ww
        y += dd
    dr = [(b[0] + b[1], box(*b)) for b in blocks]
    dr += [(14, yamen())]
    for x, y, w, d, h, col in rnd.sample(blocks, 12):     # tin-roof shacks on top
        dr.append((x + y + 0.01, roof(x + 0.1, y + 0.1, min(w, 1.2), min(d, 1.0), h, 0.25, "#7D8A93")))
    dr.sort(key=lambda a: a[0])
    items += [d for _, d in dr]
    save("walled_city_1960s_growing.svg", iso_svg("".join(items)))

    # ---- stage 3: the 1980s megastructure (~300 towers fused into one block)
    items = [plate("#5C5E62", edge="#36383C")]
    cells = []
    gy = 0.3
    while gy < FD - 0.3:
        dd = rnd.choice([1.0, 1.2, 1.4])
        gx = 0.3
        while gx < FW - 0.3:
            ww = rnd.choice([0.9, 1.1, 1.3, 1.5])
            if inside(gx + ww / 2, gy + dd / 2):
                h = rnd.choice([3.3, 3.6, 3.9, 3.9, 4.2, 4.2, 4.2, 3.0])   # 10-14 storeys, capped by the airport
                col = rnd.choice(["#D6CEBF", "#CEC5B3", "#C4BCAE", "#DCD3C1", "#BDB5A6", "#D1C7B0", "#C9D0CC", "#D9C6B8", "#C7C9B5"])
                cells.append((gx, gy, ww, dd, h, col))
            gx += ww
        gy += dd
    dr = []
    for c in cells:
        x, y, w, d, h, col = c
        s = box(x, y, w, d, h, col, sw=0.7)
        # lit windows + signs on the front faces
        for _ in range(rnd.randint(0, 3)):
            u, z = rnd.uniform(0.1, w - 0.2), rnd.uniform(0.3, h - 0.3)
            pts = [P(x + u, y + d, z), P(x + u + 0.14, y + d, z), P(x + u + 0.14, y + d, z + 0.12), P(x + u, y + d, z + 0.12)]
            s += poly(pts, rnd.choice(["#FFE08A", "#FFD25E", "#F6EFC8"]), stroke="none")
        if rnd.random() < 0.12:
            u, z = rnd.uniform(0, max(0.01, w - 0.6)), rnd.uniform(0.4, 1.4)
            pts = [P(x + u, y + d + 0.02, z), P(x + u + 0.55, y + d + 0.02, z), P(x + u + 0.55, y + d + 0.02, z + 0.35), P(x + u, y + d + 0.02, z + 0.35)]
            s += poly(pts, rnd.choice(["#D6453D", "#E8B33A", "#3D8C6E", "#3B6FB6"]), sw=0.8)
        # rooftop clutter: water tanks, antennas, laundry
        if rnd.random() < 0.5:
            tx, ty = x + rnd.uniform(0.1, w - 0.4), y + rnd.uniform(0.1, d - 0.4)
            s += poly([P(tx, ty, h + 0.25), P(tx + 0.3, ty, h + 0.25), P(tx + 0.3, ty + 0.3, h + 0.25), P(tx, ty + 0.3, h + 0.25)], "#9AA3AC", sw=0.6)
            s += poly([P(tx, ty + 0.3, h), P(tx + 0.3, ty + 0.3, h), P(tx + 0.3, ty + 0.3, h + 0.25), P(tx, ty + 0.3, h + 0.25)], "#7E8790", sw=0.6)
        for _ in range(rnd.choice([0, 1, 1, 2])):
            ax, ay = x + rnd.uniform(0.1, w - 0.1), y + rnd.uniform(0.1, d - 0.1)
            b0, b1 = P(ax, ay, h), P(ax, ay, h + rnd.uniform(0.5, 0.9))
            s += f'<line x1="{b0[0]:.1f}" y1="{b0[1]:.1f}" x2="{b1[0]:.1f}" y2="{b1[1]:.1f}" stroke="#2A2C30" stroke-width="1.6"/>'
            for k in range(rnd.randint(1, 3)):
                yy = b1[1] + 4 + k * 5
                hw = rnd.uniform(4, 9)
                s += f'<line x1="{b1[0] - hw:.1f}" y1="{yy:.1f}" x2="{b1[0] + hw:.1f}" y2="{yy:.1f}" stroke="#2A2C30" stroke-width="1.3"/>'
        dr.append((x + y + w * 0.5 + d * 0.5, s))
    dr.sort(key=lambda a: a[0])
    items += [d for _, d in dr]
    save("walled_city_1980s_megastructure.svg", iso_svg(f'<g id="towers">{"".join(items)}</g>'))
    print("megastructure towers:", len(cells))

    # ---- stage 4: 1995 park
    items = [plate("#7FAE5E", edge="#4E6B3A")]
    path = [P(FW / 2, FD + 0.8), P(FW / 2, 7.8), P(FW / 2 + 0.6, 7.8), P(FW / 2 + 0.6, FD + 0.8)]
    items.append(poly(path, "#E4D6B0", stroke="none"))
    items.append(poly([P(-0.8, 4.0), P(FW + 0.8, 4.0), P(FW + 0.8, 4.6), P(-0.8, 4.6)], "#E4D6B0", stroke="none"))
    pond = [P(3 + 2.2 * math.cos(a), 8.5 + 1.4 * math.sin(a)) for a in [i * math.pi / 12 for i in range(24)]]
    items.append(poly(pond, "#6DB4C8", stroke="#3E6E7A", sw=2))
    dr = [(14, yamen())]
    # pavilion by the pond
    dr.append((5.5 + 6.5, box(5.2, 6.2, 1.0, 1.0, 0.5, "#B23A2E", windows=False) + roof(5.0, 6.0, 1.4, 1.4, 0.5, 0.5, "#3F5A4E")))
    for x, y in ((1.5, 1.5), (3.5, 2.0), (6, 1.2), (14, 1.5), (17, 2.5), (18.5, 6), (16, 9.5), (13, 10.8), (7.5, 10.5), (1.2, 5.5),
                 (17.5, 11), (15, 6.5), (6.8, 3.2), (12.5, 2.4), (2, 11.3)):
        dr.append((x + y, tree(x, y, 0.6, random.Random(int(x * 10 + y)).choice(["#5E8C4A", "#6E9E52", "#4F7D3F"]))))
    # south gate remnant
    dr.append((9 + FD, box(9.1, FD - 0.6, 2.3, 0.5, 0.35, "#9E9686", windows=False)))
    dr.sort(key=lambda a: a[0])
    items += [d for _, d in dr]
    save("walled_city_1995_park.svg", iso_svg("".join(items)))


# ------------------------------------------------------------------ props

def build_props():
    # passenger jet, side view, gear down
    jet = (f'<path d="M60,170 Q60,130 120,125 L760,118 Q850,118 880,150 Q890,165 870,178 Q840,195 760,195 L120,200 Q60,200 60,170 Z" '
           f'fill="#F4F6F8" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
           f'<path d="M80,172 L860,166" stroke="#2D5DA8" stroke-width="12"/>'
           f'<path d="M150,128 L95,20 L165,20 L250,124 Z" fill="#F4F6F8" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
           f'<path d="M118,40 L170,40 L205,82 L140,82 Z" fill="#C8102E"/>'
           f'<path d="M380,175 L250,290 L320,292 L520,178 Z" fill="#E3E7EB" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
           f'<rect x="330" y="205" width="120" height="44" rx="20" fill="#C9CFD5" stroke="{INK}" stroke-width="6"/>'
           + "".join(f'<rect x="{300 + i*38}" y="140" width="20" height="18" rx="6" fill="#4A6E8C"/>' for i in range(12))
           + f'<path d="M820,140 Q850,140 862,156 L825,156 Z" fill="#4A6E8C"/>'
           f'<path d="M420,198 L420,240 M700,192 L700,236 M780,190 L780,226" stroke="{INK}" stroke-width="7"/>'
           f'<circle cx="420" cy="248" r="13" fill="#222"/><circle cx="700" cy="244" r="13" fill="#222"/><circle cx="780" cy="232" r="11" fill="#222"/>')
    save("jet.svg", svg(940, 300, jet))
    # alley interior: dripping pipes + umbrellas
    rnd = random.Random(7)
    alley = ['<rect width="900" height="1500" fill="url(#dark)"/>',
             '<polygon points="0,0 300,420 300,1180 0,1500" fill="#3A3B36"/><polygon points="900,0 600,420 600,1180 900,1500" fill="#2F302C"/>',
             '<polygon points="300,1180 600,1180 900,1500 0,1500" fill="#26241F"/>',
             '<rect x="300" y="420" width="300" height="760" fill="#1B1C1A"/>']
    for i in range(9):            # stacked signboards receding
        y = 120 + i * 110
        sx = 40 + i * 28
        alley.append(f'<rect x="{sx}" y="{y}" width="{130 - i*9}" height="{60 - i*3}" rx="6" fill="{rnd.choice(["#B8322A", "#C9A227", "#2F7D5B", "#2D5DA8"])}" stroke="{INK}" stroke-width="4" opacity="{1 - i*0.07:.2f}"/>')
        alley.append(f'<rect x="{900 - sx - (120 - i*9)}" y="{y + 40}" width="{120 - i*9}" height="{56 - i*3}" rx="6" fill="{rnd.choice(["#C9A227", "#B8322A", "#7A4FA0"])}" stroke="{INK}" stroke-width="4" opacity="{1 - i*0.07:.2f}"/>')
    for k, y in enumerate((210, 330, 470, 600)):  # pipes across the alley
        alley.append(f'<rect x="0" y="{y}" width="900" height="{26 - k*4}" rx="10" fill="#7C8389" stroke="{INK}" stroke-width="4"/>')
        alley.append(f'<rect x="0" y="{y + 4}" width="900" height="6" fill="#A9B0B6" opacity="0.7"/>')
    for i in range(14):          # tangled wires
        y0 = rnd.uniform(60, 700)
        alley.append(f'<path d="M0,{y0:.0f} Q450,{y0 + rnd.uniform(40, 160):.0f} 900,{y0 + rnd.uniform(-60, 60):.0f}" stroke="#0E0E0E" stroke-width="{rnd.uniform(2, 4):.1f}" fill="none"/>')
    for x, y in ((450, 360), (250, 640), (650, 520)):   # bare bulbs
        alley.append(f'<circle cx="{x}" cy="{y}" r="90" fill="url(#bulb)"/><circle cx="{x}" cy="{y}" r="12" fill="#FFF3B0"/>')
    for x, y in ((180, 240), (420, 240), (720, 240), (300, 360), (560, 360), (140, 500), (780, 500), (480, 625)):  # static drops
        alley.append(f'<path d="M{x},{y} c-7,14 -9,22 0,26 c9,-4 7,-12 0,-26 Z" fill="#8FD6FF" stroke="{INK}" stroke-width="2"/>')
    puddle = '<ellipse cx="450" cy="1330" rx="300" ry="40" fill="#3E5560" opacity="0.6"/>'
    defs = ('<linearGradient id="dark" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2A2B27"/><stop offset="1" stop-color="#12120F"/></linearGradient>'
            '<radialGradient id="bulb"><stop offset="0" stop-color="#FFE7A0" stop-opacity="0.55"/><stop offset="1" stop-color="#FFE7A0" stop-opacity="0"/></radialGradient>')
    save("alley_interior.svg", svg(900, 1500, "".join(alley) + puddle, defs))
    # umbrella person (indoors)
    p, hands = PR.chibi(dict(coat="#5D6B7A", pants="#2F3640", rarm=-70, larm=110, face="flat"))
    hxp, hyp = hands["rarm"]
    umb = (f'<line x1="{hxp:.0f}" y1="{hyp:.0f}" x2="{hxp:.0f}" y2="{hyp - 150:.0f}" stroke="{INK}" stroke-width="6"/>'
           f'<path d="M{hxp - 150:.0f},{hyp - 130:.0f} Q{hxp:.0f},{hyp - 290:.0f} {hxp + 150:.0f},{hyp - 130:.0f} '
           + "".join(f'Q{hxp + 150 - 75*k - 37:.0f},{hyp - 150:.0f} {hxp + 150 - 75*(k+1):.0f},{hyp - 130:.0f} ' for k in range(4))
           + f'Z" fill="#D6453D" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>')
    save("umbrella_person.svg", svg(460, 640, f'<g transform="translate(80,200)">{"".join(p)}{umb}</g>'))
    # dentist sign
    tooth = ('<path d="M-40,-50 Q-60,-50 -60,-20 Q-60,20 -45,60 Q-38,75 -30,55 Q-22,25 0,25 Q22,25 30,55 Q38,75 45,60 '
             'Q60,20 60,-20 Q60,-50 40,-50 Q20,-50 0,-38 Q-20,-50 -40,-50 Z" fill="#fff" stroke="#141416" stroke-width="7"/>')
    sign = (f'<line x1="60" y1="0" x2="60" y2="40" stroke="{INK}" stroke-width="6"/><line x1="200" y1="0" x2="200" y2="40" stroke="{INK}" stroke-width="6"/>'
            f'<rect x="10" y="40" width="240" height="300" rx="16" fill="#C8302A" stroke="{INK}" stroke-width="8"/>'
            f'<rect x="26" y="56" width="208" height="268" rx="10" fill="none" stroke="#F2D27E" stroke-width="5"/>'
            f'<g transform="translate(130,150)">{tooth}</g>'
            f'<text x="130" y="300" font-family="IPAGothic, Noto Sans CJK TC, sans-serif" font-weight="700" font-size="64" text-anchor="middle" fill="#F2D27E">牙科</text>')
    save("dentist_sign.svg", svg(260, 350, sign))
    # gang silhouettes
    g = ""
    for i, (x, s) in enumerate(((90, 1.0), (230, 1.15), (370, 0.95))):
        g += (f'<g transform="translate({x},420) scale({s})"><ellipse cx="0" cy="-250" rx="48" ry="54" fill="#0B0B0C"/>'
              f'<path d="M-70,-190 Q0,-215 70,-190 L95,0 L-95,0 Z" fill="#0B0B0C"/>'
              f'<path d="M-24,-258 l18,6 M24,-258 l-18,6" stroke="#E23B3B" stroke-width="7" stroke-linecap="round"/></g>')
    save("gang_silhouettes.svg", svg(460, 440, g))
    # family (two adults + child)
    a1, _ = PR.chibi(dict(coat="#B5523B", pants="#3A3A40", rarm=60, larm=120, cheeks=True))
    a2, _ = PR.chibi(dict(coat="#3D7A8C", pants="#3A3A40", rarm=60, larm=120, beard=None))
    kid, _ = PR.chibi(dict(coat="#E8B33A", pants="#3A3A40", rarm=-60, larm=120))
    fam = (f'<g transform="translate(0,40)">{"".join(a2)}</g><g transform="translate(330,40)">{"".join(a1)}</g>'
           f'<g transform="translate(205,210) scale(0.62)">{"".join(kid)}</g>')
    save("family.svg", svg(640, 500, fam))
    # four football fields (2x2) for scale
    f = ""
    for i in range(2):
        for j in range(2):
            x, y = 20 + i * 310, 20 + j * 200
            f += (f'<rect x="{x}" y="{y}" width="300" height="190" fill="#4E9A4A" stroke="#fff" stroke-width="6"/>'
                  f'<line x1="{x+150}" y1="{y}" x2="{x+150}" y2="{y+190}" stroke="#fff" stroke-width="4"/>'
                  f'<circle cx="{x+150}" cy="{y+95}" r="28" fill="none" stroke="#fff" stroke-width="4"/>'
                  f'<rect x="{x}" y="{y+55}" width="40" height="80" fill="none" stroke="#fff" stroke-width="4"/>'
                  f'<rect x="{x+260}" y="{y+55}" width="40" height="80" fill="none" stroke="#fff" stroke-width="4"/>')
    save("football_fields.svg", svg(660, 440, f'<rect x="10" y="10" width="640" height="420" rx="12" fill="#3B7F3A" stroke="{INK}" stroke-width="8"/>{f}'))
    # crane + wrecking ball (separate so the ball can swing)
    crane = (f'<rect x="60" y="560" width="200" height="70" rx="14" fill="#E8B33A" stroke="{INK}" stroke-width="8"/>'
             f'<circle cx="100" cy="640" r="26" fill="#333" stroke="{INK}" stroke-width="6"/><circle cx="220" cy="640" r="26" fill="#333" stroke="{INK}" stroke-width="6"/>'
             f'<rect x="90" y="480" width="110" height="90" rx="10" fill="#E8B33A" stroke="{INK}" stroke-width="8"/>'
             f'<rect x="110" y="498" width="50" height="40" rx="6" fill="#BFE6F5" stroke="{INK}" stroke-width="5"/>'
             f'<path d="M180,500 L560,60" stroke="{INK}" stroke-width="30" stroke-linecap="round"/>'
             f'<path d="M180,500 L560,60" stroke="#E8B33A" stroke-width="18" stroke-linecap="round"/>'
             + "".join(f'<line x1="{180 + k*38}" y1="{500 - k*44}" x2="{199 + k*38}" y2="{478 - k*44}" stroke="{INK}" stroke-width="4"/>' for k in range(10)))
    save("crane.svg", svg(620, 680, crane))
    ball = (f'<line x1="60" y1="0" x2="60" y2="300" stroke="{INK}" stroke-width="6" stroke-dasharray="14 6"/>'
            f'<circle cx="60" cy="350" r="56" fill="#3A3D42" stroke="{INK}" stroke-width="8"/>'
            f'<circle cx="42" cy="330" r="14" fill="#7A8088"/>')
    save("wrecking_ball.svg", svg(120, 420, ball))
    # money bag (compensation)
    bag = (f'<path d="M150,90 Q100,60 115,30 L185,30 Q200,60 150,90 Z" fill="#C9A66B" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
           f'<path d="M150,90 Q40,140 45,240 Q55,320 150,322 Q245,320 255,240 Q260,140 150,90 Z" fill="#D9B77A" stroke="{INK}" stroke-width="8"/>'
           f'<path d="M110,92 Q150,108 190,92" stroke="#7A5530" stroke-width="10" fill="none"/>'
           f'<text x="150" y="255" font-family="Montserrat, sans-serif" font-weight="800" font-size="78" text-anchor="middle" fill="#2E6B3A">HK$</text>')
    save("money_bag.svg", svg(300, 340, bag))
    # 1987 agreement document
    doc = (f'<rect x="30" y="20" width="300" height="400" rx="10" fill="#F4EBD3" stroke="{INK}" stroke-width="8"/>'
           f'<text x="180" y="90" font-family="Montserrat, sans-serif" font-weight="800" font-size="40" text-anchor="middle" fill="{INK}">AGREEMENT</text>'
           f'<text x="180" y="140" font-family="Montserrat, sans-serif" font-weight="800" font-size="34" text-anchor="middle" fill="#8B6B3E">1987</text>'
           + "".join(f'<line x1="70" y1="{180 + k*30}" x2="{290 - (60 if k == 4 else 0)}" y2="{180 + k*30}" stroke="#A89470" stroke-width="6"/>' for k in range(5))
           + f'<circle cx="110" cy="360" r="40" fill="#C8102E" opacity="0.85"/><circle cx="250" cy="360" r="40" fill="#DE2910" opacity="0.85"/>'
           f'<path d="M95,360 l12,12 l22,-26" stroke="#fff" stroke-width="8" fill="none"/><polygon points="{PR.star_pts(250, 360, 24)}" fill="#FFDE00"/>')
    save("agreement_1987.svg", svg(360, 440, doc))
    # 'no X' icons
    def no_icon(name, inner):
        body = (f'<circle cx="160" cy="160" r="150" fill="#0F2E38" opacity="0.92"/>{inner}'
                f'<circle cx="160" cy="160" r="125" fill="none" stroke="#E63946" stroke-width="22"/>'
                f'<line x1="72" y1="72" x2="248" y2="248" stroke="#E63946" stroke-width="22" stroke-linecap="round"/>')
        save(name, svg(320, 320, body))
    no_icon("icon_no_tax.svg", f'<rect x="100" y="80" width="120" height="160" rx="10" fill="#fff" stroke="{INK}" stroke-width="6"/>'
                               f'<text x="160" y="190" font-family="Montserrat, sans-serif" font-weight="800" font-size="90" text-anchor="middle" fill="#2E6B3A">$</text>')
    no_icon("icon_no_codes.svg", f'<rect x="85" y="95" width="150" height="130" fill="#2D5DA8" stroke="{INK}" stroke-width="6"/>'
                                 f'<path d="M105,200 V130 H160 V200 M175,200 V150 H215 V200" stroke="#fff" stroke-width="5" fill="none"/>'
                                 + PR.ruler_svg(90, 245, 140, 22, -10, ticks=4, label=False))
    no_icon("icon_no_police.svg", f'<path d="M100,150 Q160,95 220,150 L210,175 L110,175 Z" fill="#1F3A68" stroke="{INK}" stroke-width="6"/>'
                                  f'<rect x="100" y="172" width="120" height="20" fill="{INK}"/>'
                                  f'<polygon points="{PR.star_pts(160, 140, 18)}" fill="#E8C55A"/>')
    # map pin
    pin = (f'<path d="M80,230 C80,230 10,140 10,80 A70,70 0 1,1 150,80 C150,140 80,230 80,230 Z" fill="#E63946" stroke="{INK}" stroke-width="8"/>'
           f'<circle cx="80" cy="80" r="28" fill="#fff" stroke="{INK}" stroke-width="6"/>')
    save("pin.svg", svg(160, 240, pin))


if __name__ == "__main__":
    build_flags()
    build_stages()
    build_props()
    print("\n".join(sorted(f for f in os.listdir(OUT) if f.endswith(".svg"))))
