"""SVG assets for "The Impossible Strait" (Strait of Hormuz, 16:9) -> ../assets/*.svg"""
import importlib.util
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("pr_assets", os.path.join(HERE, "..", "..", "point-roberts", "tools", "make_assets.py"))
PR = importlib.util.module_from_spec(spec)
spec.loader.exec_module(PR)
INK, svg, star_pts = PR.INK, PR.svg, PR.star_pts


def save(name, content):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        f.write(content)


# ------------------------------------------------------------------ flags (simplified, flat)

def stripes(x, y, w, h, cols):
    n = len(cols)
    return "".join(f'<rect x="{x}" y="{y + i*h/n:.2f}" width="{w}" height="{h/n + 0.5:.2f}" fill="{c}"/>' for i, c in enumerate(cols))


def script_squiggle(cx, cy, w, col):   # stand-in for calligraphy
    return (f'<path d="M{cx - w/2:.1f},{cy:.1f} q{w*0.08:.1f},-{w*0.12:.1f} {w*0.16:.1f},0 t{w*0.16:.1f},0 t{w*0.16:.1f},0 '
            f't{w*0.16:.1f},0 t{w*0.16:.1f},0 t{w*0.16:.1f},0" fill="none" stroke="{col}" stroke-width="{w*0.035:.1f}" stroke-linecap="round"/>'
            f'<path d="M{cx - w*0.3:.1f},{cy - w*0.12:.1f} v-{w*0.08:.1f} M{cx:.1f},{cy - w*0.12:.1f} v-{w*0.1:.1f} M{cx + w*0.3:.1f},{cy - w*0.12:.1f} v-{w*0.08:.1f}" '
            f'stroke="{col}" stroke-width="{w*0.03:.1f}" stroke-linecap="round"/>')


def flag_irn(x, y, w, h):
    s = stripes(x, y, w, h, ["#239F40", "#FFFFFF", "#DA0000"])
    for row in (y + h / 3 - 2, y + 2 * h / 3 + 2):
        s += "".join(f'<rect x="{x + w*0.03 + i*w*0.06:.1f}" y="{row - h*0.02:.1f}" width="{w*0.035:.1f}" height="{h*0.04:.1f}" fill="#FFFFFF" opacity="0.85"/>' for i in range(16))
    cx, cy, r = x + w / 2, y + h / 2, h * 0.13
    s += (f'<path d="M{cx - r:.1f},{cy - r*0.2:.1f} A{r:.1f},{r:.1f} 0 0 0 {cx:.1f},{cy + r:.1f} A{r:.1f},{r:.1f} 0 0 0 {cx + r:.1f},{cy - r*0.2:.1f}" '
          f'fill="none" stroke="#DA0000" stroke-width="{h*0.035:.1f}"/><line x1="{cx:.1f}" y1="{cy - r*1.1:.1f}" x2="{cx:.1f}" y2="{cy + r:.1f}" stroke="#DA0000" stroke-width="{h*0.04:.1f}"/>')
    return s


def flag_omn(x, y, w, h):
    s = stripes(x, y, w, h, ["#FFFFFF", "#DB161B", "#008000"])
    s += f'<rect x="{x}" y="{y}" width="{w*0.26:.1f}" height="{h}" fill="#DB161B"/>'
    cx, cy, r = x + w * 0.13, y + h * 0.18, h * 0.11
    s += (f'<path d="M{cx - r:.1f},{cy - r:.1f} L{cx + r:.1f},{cy + r:.1f} M{cx + r:.1f},{cy - r:.1f} L{cx - r:.1f},{cy + r:.1f} M{cx:.1f},{cy - r*1.1:.1f} V{cy + r*1.1:.1f}" '
          f'stroke="#FFFFFF" stroke-width="{h*0.035:.1f}" stroke-linecap="round"/>')
    return s


def flag_sau(x, y, w, h):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#006C35"/>' + script_squiggle(x + w / 2, y + h * 0.42, w * 0.62, "#FFFFFF")
    s += (f'<path d="M{x + w*0.22:.1f},{y + h*0.72:.1f} H{x + w*0.74:.1f}" stroke="#FFFFFF" stroke-width="{h*0.045:.1f}" stroke-linecap="round"/>'
          f'<path d="M{x + w*0.74:.1f},{y + h*0.68:.1f} v{h*0.08:.1f}" stroke="#FFFFFF" stroke-width="{h*0.04:.1f}"/>')
    return s


def flag_irq(x, y, w, h):
    return stripes(x, y, w, h, ["#CE1126", "#FFFFFF", "#000000"]) + script_squiggle(x + w / 2, y + h * 0.53, w * 0.45, "#007A3D")


def flag_kwt(x, y, w, h):
    s = stripes(x, y, w, h, ["#007A3D", "#FFFFFF", "#CE1126"])
    return s + f'<polygon points="{x},{y} {x + w*0.25:.1f},{y + h/3:.1f} {x + w*0.25:.1f},{y + 2*h/3:.1f} {x},{y + h}" fill="#000000"/>'


def serrated(x, y, w, h, band, n, field):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{field}"/>'
    pts = [(x, y), (x + band, y)]
    for i in range(n):
        y0 = y + i * h / n
        pts += [(x + band + w * 0.08, y0 + h / n / 2), (x + band, y0 + h / n)]
    pts += [(x, y + h)]
    return s + f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in pts)}" fill="#FFFFFF"/>'


def flag_qat(x, y, w, h):
    return serrated(x, y, w, h, w * 0.26, 9, "#8A1538")


def flag_bhr(x, y, w, h):
    return serrated(x, y, w, h, w * 0.22, 5, "#CE1126")


def flag_are(x, y, w, h):
    return stripes(x, y, w, h, ["#00732F", "#FFFFFF", "#000000"]) + f'<rect x="{x}" y="{y}" width="{w*0.25:.1f}" height="{h}" fill="#FF0000"/>'


FLAGS = {"irn": flag_irn, "omn": flag_omn, "sau": flag_sau, "irq": flag_irq, "kwt": flag_kwt, "qat": flag_qat,
         "bhr": flag_bhr, "are": flag_are, "usa": PR.flag_us}
PR.FLAGS.update(FLAGS)


def flag_marker(iso):
    """Round 'countryflag' map marker with a pin tail."""
    clip = f'<clipPath id="c{iso}"><circle cx="80" cy="80" r="62"/></clipPath>'
    body = (f'<path d="M80,190 L58,132 L102,132 Z" fill="{INK}"/>'
            f'<circle cx="84" cy="86" r="70" fill="#000" opacity="0.28"/>'
            f'<circle cx="80" cy="80" r="70" fill="#FFFFFF" stroke="{INK}" stroke-width="6"/>'
            f'<g clip-path="url(#c{iso})">{FLAGS[iso](-5, 18, 170, 124)}</g>'
            f'<circle cx="80" cy="80" r="62" fill="none" stroke="{INK}" stroke-width="4"/>')
    return svg(160, 200, body, clip)


def build_flags():
    for iso in FLAGS:
        save(f"marker_{iso}.svg", flag_marker(iso))
        save(f"flag_{iso}.svg", svg(300, 200, f'<rect x="0" y="0" width="300" height="200" rx="8" fill="#fff"/>'
                                              f'<g clip-path="url(#r)">{FLAGS[iso](0, 0, 300, 200)}</g>'
                                              f'<rect x="0" y="0" width="300" height="200" rx="8" fill="none" stroke="{INK}" stroke-width="6"/>',
                                    '<clipPath id="r"><rect x="0" y="0" width="300" height="200" rx="8"/></clipPath>'))
    # flag characters, used only where two nations are compared directly (Iran vs Oman here)
    s, _, _ = PR.flag_character("irn", "irnstern", larm=(150, 120), rarm=(30, 60), eyes=dict(look=(0.4, 0.3), lid=0.35, slope_l=14, slope_r=-14))
    save("iran_stern.svg", s)
    s, _, _ = PR.flag_character("omn", "omncalm", larm=(115, 100), rarm=(-40, -75), eyes=dict(style="happy"))
    save("oman_calm.svg", s)


# ------------------------------------------------------------------ props & icons

def build_props():
    # oil tanker, top-down (bow to the right) - used along the shipping lanes
    deck = "".join(f'<rect x="{90 + i*36}" y="34" width="22" height="12" rx="3" fill="#9AA3AC" stroke="{INK}" stroke-width="2"/>' for i in range(6))
    top = (f'<path d="M20,22 H300 Q352,22 368,40 Q352,58 300,58 H20 Q10,58 10,48 V32 Q10,22 20,22 Z" fill="#B8322A" stroke="{INK}" stroke-width="4"/>'
           f'<path d="M26,28 H298 Q340,28 352,40 Q340,52 298,52 H26 Z" fill="#3E474F"/>'
           f'<line x1="60" y1="40" x2="330" y2="40" stroke="#C9CFD5" stroke-width="3"/>{deck}'
           f'<rect x="22" y="27" width="48" height="26" rx="4" fill="#F1F3F5" stroke="{INK}" stroke-width="3"/>'
           f'<rect x="30" y="33" width="10" height="14" fill="#E8B33A"/>')
    save("tanker_top.svg", svg(380, 80, top))
    # oil tanker, side view (hero)
    side = (f'<path d="M30,150 H820 Q860,150 880,120 L890,100 H40 L20,140 Q20,150 30,150 Z" fill="#B8322A" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
            f'<path d="M40,100 H890 L880,60 H70 Z" fill="#2F363D" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
            f'<rect x="60" y="72" width="830" height="8" fill="#E9EDF0"/>'
            + "".join(f'<rect x="{230 + i*95}" y="46" width="60" height="16" rx="4" fill="#8D96A0" stroke="{INK}" stroke-width="4"/>' for i in range(6))
            + f'<path d="M200,54 H860" stroke="#C9CFD5" stroke-width="5"/>'
            f'<rect x="80" y="-30" width="110" height="92" rx="6" fill="#F1F3F5" stroke="{INK}" stroke-width="6"/>'
            + "".join(f'<rect x="{92 + i*24}" y="-16" width="16" height="12" rx="2" fill="#4A6E8C"/>' for i in range(4))
            + f'<rect x="120" y="-62" width="26" height="34" fill="#2F363D" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="120" y="-60" width="26" height="8" fill="#E8B33A"/>'
            f'<path d="M10,160 q60,-14 120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0" stroke="#7FD3FF" stroke-width="6" fill="none" opacity="0.7"/>')
    save("tanker_side.svg", svg(900, 240, f'<g transform="translate(0,70)">{side}</g>'))
    # warship, top-down and side
    ship_top = (f'<path d="M14,40 L60,24 H300 Q360,28 392,40 Q360,52 300,56 H60 Z" fill="#8C979F" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
                f'<rect x="150" y="30" width="80" height="20" rx="4" fill="#B5BDC3" stroke="{INK}" stroke-width="3"/>'
                f'<circle cx="300" cy="40" r="7" fill="#5E676E" stroke="{INK}" stroke-width="3"/><line x1="300" y1="40" x2="335" y2="40" stroke="{INK}" stroke-width="4"/>'
                f'<rect x="70" y="32" width="40" height="16" rx="3" fill="#6C7780"/>')
    save("warship_top.svg", svg(400, 80, ship_top))
    ship_side = (f'<path d="M20,120 H760 L800,80 H40 Z" fill="#7D8890" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
                 f'<path d="M200,80 V40 H420 V80 M300,40 V0 H340 V40" fill="#9AA5AD" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
                 f'<line x1="320" y1="0" x2="320" y2="-60" stroke="{INK}" stroke-width="6"/><line x1="296" y1="-40" x2="344" y2="-40" stroke="{INK}" stroke-width="5"/>'
                 f'<rect x="600" y="62" width="60" height="18" rx="6" fill="#9AA5AD" stroke="{INK}" stroke-width="5"/><line x1="660" y1="68" x2="720" y2="60" stroke="{INK}" stroke-width="7"/>'
                 f'<text x="120" y="108" font-family="Montserrat, sans-serif" font-weight="800" font-size="26" fill="#E9EDF0">58</text>')
    save("warship_side.svg", svg(820, 200, f'<g transform="translate(0,70)">{ship_side}</g>'))
    # fast attack boat (top-down) + sea mine
    save("fast_boat.svg", svg(240, 70, f'<path d="M52,35 L4,18 L14,35 L4,52 Z" fill="#E9F6FF" opacity="0.6"/>'
                                       f'<path d="M50,35 Q50,16 120,16 Q190,18 230,35 Q190,52 120,54 Q50,54 50,35 Z" fill="#5C6B4E" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
                                       f'<rect x="96" y="27" width="34" height="16" rx="4" fill="#3D4734" stroke="{INK}" stroke-width="3"/>'))
    spikes = "".join(f'<line x1="{100 + 52*math.cos(a):.1f}" y1="{100 + 52*math.sin(a):.1f}" x2="{100 + 74*math.cos(a):.1f}" y2="{100 + 74*math.sin(a):.1f}" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
                     for a in [i * math.pi / 4 for i in range(8)])
    save("sea_mine.svg", svg(200, 200, f'{spikes}<circle cx="100" cy="100" r="55" fill="#2A2D31" stroke="{INK}" stroke-width="6"/>'
                                      f'<circle cx="82" cy="82" r="14" fill="#5E646B"/>'))
    # oil barrel
    save("oil_barrel.svg", svg(160, 200, f'<rect x="20" y="20" width="120" height="160" rx="16" fill="#F4D03F" stroke="{INK}" stroke-width="7"/>'
                                         f'<ellipse cx="80" cy="24" rx="58" ry="12" fill="#F9E27D" stroke="{INK}" stroke-width="6"/>'
                                         f'<rect x="20" y="62" width="120" height="10" fill="{INK}"/><rect x="20" y="128" width="120" height="10" fill="{INK}"/>'
                                         f'<path d="M80,84 C70,98 66,106 66,112 A14,14 0 0,0 94,112 C94,106 90,98 80,84 Z" fill="{INK}"/>'))
    # coastal missile site (radar + launcher)
    save("missile_site.svg", svg(200, 160, f'<rect x="20" y="110" width="160" height="26" rx="8" fill="#5C6B4E" stroke="{INK}" stroke-width="5"/>'
                                           f'<circle cx="55" cy="140" r="12" fill="#333"/><circle cx="145" cy="140" r="12" fill="#333"/>'
                                           f'<path d="M70,110 L160,40 L172,52 L84,116 Z" fill="#8C979F" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
                                           f'<path d="M160,40 L178,28 L172,52 Z" fill="#E63946" stroke="{INK}" stroke-width="4"/>'
                                           f'<path d="M20,70 A30,30 0 0,1 60,40" fill="none" stroke="{INK}" stroke-width="6"/><line x1="30" y1="60" x2="40" y2="110" stroke="{INK}" stroke-width="6"/>'))
    # missile range arc sample (code draws live arcs with the same style)
    save("missile_range_arc.svg", svg(600, 340, '<defs><radialGradient id="g" cx="0.5" cy="1" r="1"><stop offset="0.6" stop-color="#E63946" stop-opacity="0.35"/>'
                                                '<stop offset="1" stop-color="#E63946" stop-opacity="0"/></radialGradient></defs>'
                                                '<path d="M300,330 L20,330 A280,280 0 0,1 580,330 Z" fill="url(#g)"/>'
                                                '<path d="M20,330 A280,280 0 0,1 580,330" fill="none" stroke="#FF4D57" stroke-width="6" stroke-dasharray="18 10"/>'))
    # key, exit door, crash chart
    save("key.svg", svg(260, 120, f'<circle cx="60" cy="60" r="42" fill="#F4D03F" stroke="{INK}" stroke-width="8"/><circle cx="60" cy="60" r="16" fill="#0A3652"/>'
                                  f'<path d="M100,52 H240 V68 H220 V92 H198 V68 H178 V86 H158 V68 H100 Z" fill="#F4D03F" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'))
    save("exit_door.svg", svg(240, 300, f'<rect x="20" y="20" width="160" height="260" rx="8" fill="#3B2A1E" stroke="{INK}" stroke-width="8"/>'
                                        f'<path d="M30,30 L150,50 V270 L30,272 Z" fill="#8B5A2B" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
                                        f'<circle cx="130" cy="160" r="9" fill="#F4D03F"/>'
                                        f'<rect x="40" y="-20" width="150" height="40" rx="6" fill="#2E9B4F" stroke="{INK}" stroke-width="5"/>'
                                        f'<text x="115" y="9" font-family="Montserrat, sans-serif" font-weight="800" font-size="26" text-anchor="middle" fill="#fff">EXIT</text>'))
    save("chart_crash.svg", svg(420, 260, f'<rect x="10" y="10" width="400" height="240" rx="14" fill="#0F2E38" stroke="{INK}" stroke-width="6"/>'
                                          + "".join(f'<line x1="40" y1="{50 + i*45}" x2="390" y2="{50 + i*45}" stroke="#2C5563" stroke-width="2"/>' for i in range(5))
                                          + f'<path d="M40,150 L100,120 L150,135 L210,90 L250,100 L280,80 L310,215 L340,195 L390,230" fill="none" stroke="#FF4D57" stroke-width="9" stroke-linejoin="round"/>'
                                          f'<path d="M370,212 L392,232 L362,238 Z" fill="#FF4D57"/>'))


# ------------------------------------------------------------------ layout map (persian-gulf-map.svg)

def build_map():
    src = open(os.path.join(HERE, "..", "src", "geo_data.js")).read()
    geo = json.loads(src[src.index("{"):src.rindex("}") + 1])
    W, H = 1920, 1080
    my = lambda lat: math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))

    def proj(lon0, lat0, z, ox, oy):
        return lambda lon, lat: (ox + (lon - lon0) * z, oy - (my(lat) - my(lat0)) * z)

    def path(flat, P):
        return "M" + " L".join(f"{P(flat[i], flat[i+1])[0]:.1f},{P(flat[i], flat[i+1])[1]:.1f}" for i in range(0, len(flat), 2)) + " Z"

    def line(flat, P):
        return "M" + " L".join(f"{P(flat[i], flat[i+1])[0]:.1f},{P(flat[i], flat[i+1])[1]:.1f}" for i in range(0, len(flat), 2))

    lab = lambda x, y, t, s=34, fill="#fff": (f'<text x="{x:.0f}" y="{y:.0f}" font-family="Montserrat, Inter, sans-serif" font-weight="800" font-size="{s}" '
                                              f'text-anchor="middle" fill="{fill}" stroke="#000" stroke-opacity="0.45" stroke-width="5" paint-order="stroke">{t}</text>')
    Pm = proj(51.6, 26.6, 118, W * 0.46, H * 0.5)
    land = " ".join(path(r, Pm) for r in geo["land"])
    musandam = " ".join(path(r, Pm) for r in geo["countries"]["OMN"] if min(r[1::2]) > 25.5)
    borders = " ".join(line(b, Pm) for b in geo["borders"])
    body = [f'<rect width="{W}" height="{H}" fill="#0A3652"/>',
            f'<g filter="url(#sh)"><path d="{land}" fill="#8A855C" stroke="#5E5A3B" stroke-width="2" fill-rule="evenodd"/></g>',
            f'<path d="{musandam}" fill="#DB161B" opacity="0.55"/>',
            f'<path d="{borders}" fill="none" stroke="#F4F1E6" stroke-width="2" stroke-dasharray="7 6" opacity="0.8"/>']
    for name, lon, lat, s in (("IRAN", 54.5, 29.6, 56), ("IRAQ", 44.8, 31.6, 40), ("KUWAIT", 47.3, 29.25, 26), ("SAUDI ARABIA", 47.0, 24.6, 44),
                              ("QATAR", 51.2, 25.25, 24), ("BAHRAIN", 50.55, 26.35, 20), ("UAE", 54.3, 23.7, 34), ("OMAN", 57.6, 21.8, 40),
                              ("Persian Gulf", 51.6, 27.3, 30), ("Gulf of Oman", 58.6, 24.8, 28), ("Musandam (Oman)", 56.3, 25.75, 22)):
        x, y = Pm(lon, lat)
        body.append(lab(x, y, name, s, "#FFFFFF" if s > 28 else "#F1EAD0"))
    # pipelines (Hormuz bypass routes)
    abq, yanbu_dir = Pm(49.67, 25.93), Pm(44.0, 24.3)
    habshan, fuj = Pm(53.73, 23.80), Pm(56.33, 25.12)
    body.append(f'<path d="M{abq[0]:.0f},{abq[1]:.0f} Q{Pm(46.8, 24.9)[0]:.0f},{Pm(46.8, 24.9)[1]:.0f} {yanbu_dir[0]:.0f},{yanbu_dir[1]:.0f}" fill="none" stroke="#F4D03F" stroke-width="6" stroke-dasharray="16 10"/>')
    body.append(lab(yanbu_dir[0] + 260, yanbu_dir[1] + 44, "→ Red Sea (East–West Pipeline)", 20, "#F4D03F"))
    body.append(f'<path d="M{habshan[0]:.0f},{habshan[1]:.0f} Q{Pm(55.3, 24.0)[0]:.0f},{Pm(55.3, 24.0)[1]:.0f} {fuj[0]:.0f},{fuj[1]:.0f}" fill="none" stroke="#F4D03F" stroke-width="6" stroke-dasharray="16 10"/>')
    body.append(lab(habshan[0], habshan[1] + 36, "Habshan–Fujairah Pipeline", 20, "#F4D03F"))
    # inset: Strait of Hormuz close-up with lanes and 21-mile marker
    cx, cy, R = 1590, 330, 250
    Pi = proj(56.35, 26.62, 560, cx, cy)
    inset_land = " ".join(path(r, Pi) for r in geo["land"])
    lanes = line([v for p in geo["laneCentre"] for v in p], Pi)
    a, b = Pi(56.40, 26.41), Pi(56.36, 26.85)
    inset = (f'<circle cx="{cx}" cy="{cy}" r="{R + 10}" fill="#000" opacity="0.3"/>'
             f'<g clip-path="url(#ins)"><rect x="{cx - R}" y="{cy - R}" width="{2*R}" height="{2*R}" fill="#1E4D5C"/>'
             f'<path d="{inset_land}" fill="#8A855C" stroke="#5E5A3B" stroke-width="2" fill-rule="evenodd"/>'
             f'<path d="{lanes}" fill="none" stroke="#7FE7FF" stroke-width="30" stroke-opacity="0.18"/>'
             f'<path d="{lanes}" fill="none" stroke="#7FE7FF" stroke-width="3" stroke-dasharray="12 8" transform="translate(0,-9)"/>'
             f'<path d="{lanes}" fill="none" stroke="#7FE7FF" stroke-width="3" stroke-dasharray="12 8" transform="translate(0,9)"/>'
             f'<line x1="{a[0]:.0f}" y1="{a[1]:.0f}" x2="{b[0]:.0f}" y2="{b[1]:.0f}" stroke="#F4D03F" stroke-width="5"/>'
             f'<circle cx="{a[0]:.0f}" cy="{a[1]:.0f}" r="8" fill="#F4D03F"/><circle cx="{b[0]:.0f}" cy="{b[1]:.0f}" r="8" fill="#F4D03F"/></g>'
             f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#F4D03F" stroke-width="8"/>'
             + lab((a[0] + b[0]) / 2 + 90, (a[1] + b[1]) / 2, "21 nautical miles", 26, "#F4D03F")
             + lab(cx, cy + R - 40, "2 shipping lanes · 2 miles wide each", 20, "#7FE7FF")
             + lab(cx, cy - R + 50, "STRAIT OF HORMUZ", 28))
    hx, hy = Pm(56.4, 26.5)
    body.append(f'<line x1="{hx:.0f}" y1="{hy:.0f}" x2="{cx - R*0.75:.0f}" y2="{cy + R*0.65:.0f}" stroke="#F4D03F" stroke-width="4" stroke-dasharray="10 8"/>'
                f'<circle cx="{hx:.0f}" cy="{hy:.0f}" r="14" fill="none" stroke="#F4D03F" stroke-width="5"/>')
    body.append(inset)
    defs = (f'<filter id="sh"><feDropShadow dx="5" dy="7" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/></filter>'
            f'<clipPath id="ins"><circle cx="{cx}" cy="{cy}" r="{R}"/></clipPath>')
    save("persian-gulf-map.svg", svg(W, H, "".join(body), defs))


# ------------------------------------------------------------------ Part 2 props (Tanker War)

def build_part2():
    # Iran vs Iraq flag characters (direct comparison during the war)
    s, _, _ = PR.flag_character("irn", "irnwar", larm=(-150, -100), rarm=(10, -20), eyes=dict(look=(1, 0), lid=0.3, slope_l=16, slope_r=-16))
    save("iran_war.svg", s)
    s, _, _ = PR.flag_character("irq", "irqwar", larm=(190, 200), rarm=(-30, -80), eyes=dict(look=(-1, 0), lid=0.3, slope_l=16, slope_r=-16))
    save("iraq_war.svg", s)
    # offshore oil platform
    plat = (f'<path d="M60,330 L90,150 M240,330 L210,150 M100,330 L120,150 M200,330 L180,150" stroke="{INK}" stroke-width="10"/>'
            f'<path d="M70,260 L230,260 M80,200 L220,200" stroke="{INK}" stroke-width="7"/>'
            f'<rect x="40" y="110" width="220" height="44" rx="6" fill="#8C979F" stroke="{INK}" stroke-width="7"/>'
            f'<rect x="60" y="60" width="90" height="52" rx="4" fill="#E8B33A" stroke="{INK}" stroke-width="6"/>'
            f'<path d="M190,110 L210,20 L230,110" fill="none" stroke="{INK}" stroke-width="7"/><path d="M196,80 H224 M202,52 H218" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M230,40 Q260,30 262,10" stroke="#E63946" stroke-width="6" fill="none"/>'
            f'<path d="M20,335 q40,-12 80,0 t80,0 t80,0" stroke="#7FD3FF" stroke-width="6" fill="none" opacity="0.7"/>')
    save("oil_platform.svg", svg(300, 350, plat))
    # explosion burst
    pts = []
    for i in range(22):
        r = 150 if i % 2 == 0 else 80
        a = math.radians(i * 360 / 22 - 90)
        pts.append(f"{160 + r*math.cos(a):.0f},{160 + r*math.sin(a):.0f}")
    pts2 = []
    for i in range(18):
        r = 92 if i % 2 == 0 else 48
        a = math.radians(i * 20 - 80)
        pts2.append(f"{160 + r*math.cos(a):.0f},{160 + r*math.sin(a):.0f}")
    save("explosion.svg", svg(320, 320, f'<polygon points="{" ".join(pts)}" fill="#FF7A00" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
                                       f'<polygon points="{" ".join(pts2)}" fill="#FFD43B"/><circle cx="160" cy="160" r="30" fill="#FFF6C8"/>'))


if __name__ == "__main__":
    build_flags()
    build_props()
    build_map()
    build_part2()
    print("\n".join(sorted(f for f in os.listdir(OUT) if f.endswith(".svg"))))
