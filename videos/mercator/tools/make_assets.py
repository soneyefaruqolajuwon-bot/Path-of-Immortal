"""SVG assets for the Mercator long-form -> ../assets/*.svg"""
import importlib.util, json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM)
GM.OUT = OUT
PR, INK, svg, star_pts = GM.PR, GM.INK, GM.svg, GM.star_pts
GOLD = "#F4D03F"
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23


def save(name, content):
    os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, name), "w").write(content)


def flag_flanders(x, y, w, h):
    # yellow field with a simplified black rampant lion (red tongue & claws)
    sx, sy = w / 100, h / 100
    P = lambda pts: " ".join(f"{x + a*sx:.1f},{y + b*sy:.1f}" for a, b in pts)
    lion = [(38, 20), (46, 14), (54, 16), (58, 24), (54, 30), (60, 38), (66, 34), (70, 40), (64, 48), (66, 60), (74, 66), (70, 74), (62, 68),
            (56, 78), (60, 88), (52, 90), (48, 80), (40, 86), (34, 82), (40, 72), (36, 60), (30, 50), (36, 40), (32, 30)]
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FDE602"/>'
            f'<polygon points="{P(lion)}" fill="#141416"/><polygon points="{P([(56, 22), (64, 20), (58, 26)])}" fill="#E1251B"/>')


def main():
    hat = (f'<path d="M{CX - HR*0.9:.0f},{HY - HR*0.55:.0f} Q{CX - HR*0.95:.0f},{HY - HR*1.25:.0f} {CX:.0f},{HY - HR*1.3:.0f} Q{CX + HR*1.1:.0f},{HY - HR*1.25:.0f} {CX + HR*1.15:.0f},{HY - HR*0.6:.0f} Z" '
           f'fill="#1C1C20" stroke="{INK}" stroke-width="6"/>')
    hx = CX + S * 0.13 + S * 0.22 * math.cos(math.radians(-50)); hy = FEET - S * 0.36 + S * 0.22 * math.sin(math.radians(-50))
    dividers = (f'<g transform="translate({hx:.0f},{hy:.0f})"><path d="M0,0 L-30,120 M0,0 L30,120" stroke="#C9A227" stroke-width="8" stroke-linecap="round"/>'
                f'<circle cx="0" cy="0" r="10" fill="#C9A227" stroke="{INK}" stroke-width="4"/></g>')
    GM.caped_person("mercator", flag_flanders, dict(coat="#3B2F2A", pants="#2B2B33", rarm=-50, larm=120, face="smile", beard="chin", beard_c="#9A9A9A", stache=True, cheeks=True),
                    arms_extra=hat + dividers)
    # caravel (side view)
    sails = "".join(f'<path d="M{mx},{top} Q{mx + 40},{(top + bot)/2} {mx},{bot} L{mx - 34},{bot} Q{mx - 4},{(top + bot)/2} {mx - 34},{top} Z" fill="#F3EEDF" stroke="{INK}" stroke-width="5"/>'
                    for mx, top, bot in ((150, 40, 120), (250, 20, 120), (330, 50, 120)))
    crosses = "".join(f'<path d="M{mx - 20},{(top + bot)/2} h22 M{mx - 9},{(top + bot)/2 - 11} v22" stroke="#C8102E" stroke-width="6"/>' for mx, top, bot in ((150, 40, 120), (250, 20, 120)))
    car = (f'<path d="M40,140 H420 L380,200 H90 Z" fill="#8B5A2B" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
           f'<path d="M30,120 L60,140 H130 V120 Z M360,140 H420 L440,110 L400,118 Z" fill="#6B4423" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
           f'<path d="M150,140 V30 M250,140 V10 M330,140 V40" stroke="#5C3B1E" stroke-width="9"/>{sails}{crosses}'
           f'<path d="M20,210 q50,-14 100,0 t100,0 t100,0 t100,0" stroke="#7FD3FF" stroke-width="6" fill="none" opacity="0.7"/>')
    save("caravel.svg", svg(460, 230, car))
    # compass rose
    pts = []
    for i in range(16):
        r = 120 if i % 4 == 0 else (70 if i % 2 == 0 else 45)
        a = math.radians(i * 22.5 - 90); pts.append(f"{150 + r*math.cos(a):.0f},{150 + r*math.sin(a):.0f}")
    save("compass_rose.svg", svg(300, 300, f'<circle cx="150" cy="150" r="130" fill="#F1E2B8" stroke="{INK}" stroke-width="7"/>'
                                         f'<polygon points="{" ".join(pts)}" fill="{GOLD}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
                                         f'<polygon points="150,30 162,150 138,150" fill="#C8102E"/><circle cx="150" cy="150" r="14" fill="{INK}"/>'
                                         f'<text x="150" y="26" font-family="Playfair Display, serif" font-weight="800" font-size="30" text-anchor="middle" fill="{INK}">N</text>'))
    # phone frame (transparent screen)
    save("phone_frame.svg", svg(560, 1080, f'<rect x="10" y="10" width="540" height="1060" rx="70" fill="none" stroke="#141416" stroke-width="20"/>'
                                         f'<rect x="10" y="10" width="540" height="1060" rx="70" fill="none" stroke="#3A3F46" stroke-width="8"/>'
                                         f'<rect x="210" y="34" width="140" height="30" rx="15" fill="#141416"/>'
                                         f'<rect x="60" y="100" width="440" height="66" rx="33" fill="#FFFFFF" stroke="#C9CFD5" stroke-width="3"/>'
                                         f'<circle cx="104" cy="133" r="13" fill="none" stroke="#6C737A" stroke-width="5"/><line x1="113" y1="142" x2="124" y2="153" stroke="#6C737A" stroke-width="5"/>'
                                         f'<text x="140" y="143" font-family="Montserrat, sans-serif" font-weight="800" font-size="26" fill="#9AA3AC">Search here</text>'))
    # car (top-down) + hand cursor
    save("car_top.svg", svg(120, 200, f'<rect x="14" y="10" width="92" height="180" rx="30" fill="#E63946" stroke="{INK}" stroke-width="6"/>'
                                     f'<rect x="26" y="46" width="68" height="40" rx="10" fill="#BFE6F5" stroke="{INK}" stroke-width="4"/>'
                                     f'<rect x="26" y="120" width="68" height="34" rx="10" fill="#BFE6F5" stroke="{INK}" stroke-width="4"/>'
                                     f'<rect x="20" y="10" width="20" height="10" rx="4" fill="#FFF3B0"/><rect x="80" y="10" width="20" height="10" rx="4" fill="#FFF3B0"/>'))
    save("hand_cursor.svg", svg(160, 200, f'<path d="M60,20 Q60,6 72,6 Q84,6 84,20 V84 Q84,72 96,72 Q108,72 108,86 V92 Q108,80 120,80 Q132,80 132,94 V100 Q132,90 142,90 Q154,90 154,104 '
                                         f'V150 Q154,190 110,194 H86 Q60,194 44,170 L14,124 Q6,110 18,104 Q30,98 40,110 L60,134 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'))
    save("warn_badge.svg", svg(560, 120, f'<rect x="6" y="6" width="548" height="108" rx="54" fill="#2A0E12" stroke="#FF4D57" stroke-width="7"/>'
                                        f'<circle cx="62" cy="60" r="38" fill="#FF4D57"/><text x="62" y="78" font-family="Montserrat, sans-serif" font-weight="800" font-size="52" text-anchor="middle" fill="#fff">!</text>'
                                        f'<text x="315" y="76" font-family="Montserrat, sans-serif" font-weight="800" font-size="40" text-anchor="middle" fill="#FFFFFF">Missed the island</text>'))
    build_maps()
    print("\n".join(sorted(f for f in os.listdir(OUT) if f.endswith(".svg"))))


def build_maps():
    src = open(os.path.join(HERE, "..", "src", "geo_data.js")).read()
    geo = json.loads(src[src.index("{"):src.rindex("}") + 1])
    W, H = 1920, 1080
    my = lambda lat: math.degrees(math.log(math.tan(math.pi / 4 + math.radians(max(-84, min(84, lat))) / 2)))
    PM = lambda lon, lat: (W / 2 + (lon - 10) * 5.2, H / 2 - (my(lat) - my(22)) * 5.2)
    def rings_path(rs, P):
        return " ".join("M" + " L".join(f"{P(r[i], r[i+1])[0]:.1f},{P(r[i], r[i+1])[1]:.1f}" for i in range(0, len(r), 2)) + " Z" for r in rs)
    def grat(P, step=30):
        d = ""
        for lon in range(-180, 181, step):
            d += "M" + " L".join(f"{P(lon, la)[0]:.1f},{P(lon, la)[1]:.1f}" for la in range(-80, 81, 4)) + " "
        for la in range(-60, 81, step // 2):
            d += "M" + " L".join(f"{P(lo, la)[0]:.1f},{P(lo, la)[1]:.1f}" for lo in range(-180, 181, 4)) + " "
        return f'<path d="{d}" fill="none" stroke="#F4F1E6" stroke-opacity="0.25" stroke-width="1.5"/>'
    base = f'<rect width="{W}" height="{H}" fill="#1E4D5C"/>'
    landP = lambda P: f'<path d="{rings_path(geo["world"], P)}" fill="#8A855C" stroke="#5E5A3B" stroke-width="1.5" fill-rule="evenodd"/>'
    gold = lambda key, P: f'<path d="{rings_path(geo[key], P)}" fill="#F4D03F" fill-opacity="0.55" stroke="#F4D03F" stroke-width="2"/>'
    save("world_mercator.svg", svg(W, H, base + grat(PM) + landP(PM) + gold("GRL", PM) + gold("AFRICA", PM)))
    # Tissot circles (equal true size everywhere) on Mercator
    circ = ""
    for la in range(-60, 81, 20):
        for lo in range(-180, 181, 30):
            r = 4.0 / math.cos(math.radians(la))
            x, y = PM(lo, la); circ += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * 5.2:.1f}" fill="#F4D03F" fill-opacity="0.35" stroke="#F4D03F" stroke-width="2"/>'
    save("tissot_mercator.svg", svg(W, H, base + grat(PM) + landP(PM) + circ))
    # wireframe globe (orthographic)
    lam0, phi0, R = math.radians(-30), math.radians(25), 440
    def PO(lon, lat):
        l, p = math.radians(lon), math.radians(lat)
        cosc = math.sin(phi0) * math.sin(p) + math.cos(phi0) * math.cos(p) * math.cos(l - lam0)
        x = R * math.cos(p) * math.sin(l - lam0); y = R * (math.cos(phi0) * math.sin(p) - math.sin(phi0) * math.cos(p) * math.cos(l - lam0))
        if cosc < 0:
            n = math.hypot(x, y) or 1; x, y = x / n * R, y / n * R
        return W / 2 + x, H / 2 - y
    globe = (f'<circle cx="{W/2}" cy="{H/2}" r="{R}" fill="#1E4D5C" stroke="#F4D03F" stroke-width="4"/>' + landP(PO) + grat(PO, 15)
             + f'<circle cx="{W/2}" cy="{H/2}" r="{R}" fill="none" stroke="#F4D03F" stroke-width="4"/>')
    save("globe_wireframe.svg", svg(W, H, f'<rect width="{W}" height="{H}" fill="#0E2E38"/>' + globe))


if __name__ == "__main__":
    main()
