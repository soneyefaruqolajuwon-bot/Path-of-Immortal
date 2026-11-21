"""SVG assets for the Singapore short -> ../assets/*.svg"""
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


def flag_mys(x, y, w, h):
    s = "".join(f'<rect x="{x}" y="{y + i*h/14:.2f}" width="{w}" height="{h/14 + 0.5:.2f}" fill="{"#CC0001" if i % 2 == 0 else "#FFFFFF"}"/>' for i in range(14))
    cw, ch = w * 0.5, h * 8 / 14
    cx, cy, r = x + cw * 0.36, y + ch / 2, ch * 0.36
    s += f'<rect x="{x}" y="{y}" width="{cw:.1f}" height="{ch:.1f}" fill="#010066"/>'
    s += f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="#FFCC00"/><circle cx="{cx + r*0.28:.1f}" cy="{cy:.1f}" r="{r*0.82:.1f}" fill="#010066"/>'
    s += f'<polygon points="{star_pts(x + cw*0.72, cy, ch*0.28, n=14, inner=0.5)}" fill="#FFCC00"/>'
    return s


def flag_sgp(x, y, w, h):
    cx, cy, r = x + w * 0.2, y + h * 0.25, h * 0.17
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h/2:.1f}" fill="#EF3340"/><rect x="{x}" y="{y + h/2:.1f}" width="{w}" height="{h/2:.1f}" fill="#FFFFFF"/>'
    s += f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="#FFFFFF"/><circle cx="{cx + r*0.3:.1f}" cy="{cy:.1f}" r="{r*0.85:.1f}" fill="#EF3340"/>'
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        s += f'<polygon points="{star_pts(cx + r*0.55 + r*0.38*math.cos(a), cy + r*0.38*math.sin(a), r*0.14)}" fill="#FFFFFF"/>'
    return s


def songkok():
    return (f'<path d="M{CX - HR*0.85:.0f},{HY - HR*0.55:.0f} L{CX - HR*0.8:.0f},{HY - HR*1.35:.0f} Q{CX:.0f},{HY - HR*1.45:.0f} {CX + HR*0.8:.0f},{HY - HR*1.35:.0f} '
            f'L{CX + HR*0.85:.0f},{HY - HR*0.55:.0f} Q{CX:.0f},{HY - HR*0.7:.0f} {CX - HR*0.85:.0f},{HY - HR*0.55:.0f} Z" fill="#1C1C20" stroke="{INK}" stroke-width="6"/>')


def hair():
    return (f'<path d="M{CX - HR*0.98:.0f},{HY - HR*0.05:.0f} Q{CX - HR*1.05:.0f},{HY - HR*1.15:.0f} {CX:.0f},{HY - HR*1.08:.0f} '
            f'Q{CX + HR*1.05:.0f},{HY - HR*1.15:.0f} {CX + HR*0.98:.0f},{HY - HR*0.05:.0f} Q{CX + HR*0.8:.0f},{HY - HR*0.6:.0f} {CX + HR*0.2:.0f},{HY - HR*0.62:.0f} '
            f'Q{CX - HR*0.5:.0f},{HY - HR*0.66:.0f} {CX - HR*0.98:.0f},{HY - HR*0.05:.0f} Z" fill="#1C1C20" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>')


def tears():
    return "".join(f'<path d="M{CX + sd*HR*0.36:.0f},{HY + HR*0.15:.0f} c-9,22 -11,34 0,40 c11,-6 9,-18 0,-40 Z" fill="#7FD3FF" stroke="{INK}" stroke-width="3"/>' for sd in (-1, 1))


def building_parliament():
    cols = "".join(f'<rect x="{70 + i*44}" y="150" width="20" height="130" fill="#F4F1E6" stroke="{INK}" stroke-width="4"/>' for i in range(7))
    return svg(420, 330, f'<ellipse cx="210" cy="310" rx="200" ry="14" fill="#000" opacity="0.25"/>'
                         f'<rect x="40" y="280" width="340" height="26" fill="#D9D2BE" stroke="{INK}" stroke-width="6"/>'
                         f'<rect x="50" y="120" width="320" height="34" fill="#EDE7D6" stroke="{INK}" stroke-width="6"/>{cols}'
                         f'<rect x="150" y="30" width="120" height="92" fill="#EDE7D6" stroke="{INK}" stroke-width="6"/>'
                         + "".join(f'<rect x="{164 + i*26}" y="44" width="14" height="64" fill="#9AA3AC" stroke="{INK}" stroke-width="3"/>' for i in range(4))
                         + f'<line x1="210" y1="30" x2="210" y2="-6" stroke="{INK}" stroke-width="5"/>'
                         f'<g transform="translate(212,-8)">{flag_mys(0, 0, 70, 40)}<rect x="0" y="0" width="70" height="40" fill="none" stroke="{INK}" stroke-width="3"/></g>'.replace("translate(212,-8)", "translate(212,-8)"),
               ).replace('viewBox="0 0 420 330"', 'viewBox="0 -20 420 350"')


def main():
    GM.caped_person("malaysia_leader", flag_mys, dict(coat="#F4F1E6", pants="#2B2B33", rarm=-30, larm=120, face="frown", brow=1, stache=True, beard_c="#2A1C14"),
                    arms_extra=songkok())
    GM.caped_person("singapore_leader", flag_sgp, dict(coat="#FFFFFF", pants="#2B2B33", rarm=-150, larm=200, face="frown", brow=1), arms_extra=hair())
    GM.caped_person("lee_tears", flag_sgp, dict(coat="#FFFFFF", pants="#2B2B33", rarm=60, larm=120, face="frown"),
                    arms_extra=hair() + tears())
    save("parliament.svg", building_parliament())
    # gavel
    save("gavel.svg", svg(320, 220, f'<g transform="rotate(-30 160 110)"><rect x="150" y="100" width="150" height="22" rx="10" fill="#8B5A2B" stroke="{INK}" stroke-width="6"/>'
                                    f'<rect x="60" y="50" width="100" height="120" rx="16" fill="#6B4423" stroke="{INK}" stroke-width="7"/>'
                                    f'<rect x="60" y="80" width="100" height="14" fill="{GOLD}"/><rect x="60" y="126" width="100" height="14" fill="{GOLD}"/></g>'))
    # resource icons: rubber, tin, timber (round badges)
    def badge(name, inner):
        save(name, svg(200, 200, f'<circle cx="100" cy="100" r="90" fill="#0F2E38" stroke="{GOLD}" stroke-width="7"/>{inner}'))
    badge("icon_rubber.svg", f'<rect x="88" y="70" width="24" height="90" rx="6" fill="#7A5530" stroke="{INK}" stroke-width="5"/>'
                         f'<ellipse cx="100" cy="62" rx="52" ry="34" fill="#3E8E4A" stroke="{INK}" stroke-width="5"/>'
                         f'<path d="M100,110 l22,8" stroke="{INK}" stroke-width="4"/><path d="M122,118 c-4,10 -4,16 2,18 c6,-2 6,-8 -2,-18 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="3"/>'
                         f'<rect x="116" y="134" width="20" height="16" rx="3" fill="#C9CFD5" stroke="{INK}" stroke-width="3"/>')
    badge("icon_tin.svg", f'<path d="M50,120 L80,90 H150 L120,120 Z" fill="#DDE2E6" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
                      f'<path d="M50,120 H120 V145 H50 Z" fill="#AEB6BD" stroke="{INK}" stroke-width="5"/><path d="M120,120 L150,90 V115 L120,145 Z" fill="#8D96A0" stroke="{INK}" stroke-width="5"/>'
                      f'<text x="100" y="80" font-family="Montserrat, sans-serif" font-weight="800" font-size="30" text-anchor="middle" fill="{GOLD}">Sn</text>')
    badge("icon_timber.svg", "".join(f'<rect x="{46 + (i%2)*14}" y="{70 + i*24}" width="108" height="22" rx="11" fill="#9C6A3A" stroke="{INK}" stroke-width="4"/>'
                                 f'<circle cx="{46 + (i%2)*14 + 108}" cy="{81 + i*24}" r="11" fill="#D9B07A" stroke="{INK}" stroke-width="4"/>' for i in range(3)))
    # cargo ship (top-down)
    cols = ["#D6453D", "#2D5DA8", "#E8B33A", "#2E9B4F", "#7A4FA0"]
    cont = "".join(f'<rect x="{80 + i*34}" y="{26 + j*15}" width="30" height="13" fill="{cols[(i + j*2) % 5]}" stroke="{INK}" stroke-width="2"/>' for i in range(7) for j in range(2))
    save("cargo_ship.svg", svg(380, 80, f'<path d="M20,22 H300 Q352,22 368,40 Q352,58 300,58 H20 Q10,58 10,48 V32 Q10,22 20,22 Z" fill="#2F363D" stroke="{INK}" stroke-width="4"/>'
                                        f'{cont}<rect x="22" y="27" width="48" height="26" rx="4" fill="#F1F3F5" stroke="{INK}" stroke-width="3"/>'))
    # container crane
    save("crane.svg", svg(260, 340, f'<path d="M60,330 L80,80 M150,330 L130,80" stroke="{INK}" stroke-width="16"/><path d="M60,330 L80,80 M150,330 L130,80" stroke="#E8B33A" stroke-width="9"/>'
                                    f'<path d="M70,200 H140 M75,140 H135" stroke="{INK}" stroke-width="8"/><rect x="10" y="64" width="240" height="22" fill="#E8B33A" stroke="{INK}" stroke-width="6"/>'
                                    f'<rect x="80" y="30" width="60" height="36" fill="#2F363D" stroke="{INK}" stroke-width="5"/><line x1="220" y1="86" x2="220" y2="170" stroke="{INK}" stroke-width="4"/>'
                                    f'<rect x="196" y="170" width="48" height="26" fill="#D6453D" stroke="{INK}" stroke-width="4"/>'))
    # glowing skyline (Marina Bay-inspired silhouettes, generic)
    bld = [(40, 150), (90, 230), (140, 190), (200, 300), (250, 260), (310, 330), (365, 280), (420, 220), (470, 260), (530, 170), (580, 210)]
    sky = "".join(f'<rect x="{x}" y="{400 - h}" width="44" height="{h}" fill="url(#g)" stroke="#1B3A4A" stroke-width="3"/>'
                  + "".join(f'<rect x="{x + 8 + (k%3)*11}" y="{400 - h + 14 + (k//3)*22}" width="6" height="10" fill="#FFF3B0" opacity="0.85"/>' for k in range(min(30, h // 22 * 3)))
                  for x, h in bld)
    mbs = (f'<rect x="250" y="120" width="26" height="280" fill="url(#g)" stroke="#1B3A4A" stroke-width="3"/><rect x="300" y="120" width="26" height="280" fill="url(#g)" stroke="#1B3A4A" stroke-width="3"/>'
           f'<rect x="350" y="120" width="26" height="280" fill="url(#g)" stroke="#1B3A4A" stroke-width="3"/>'
           f'<path d="M236,112 H392 Q404,112 404,122 L392,130 H236 Z" fill="#9FE3FF" stroke="#1B3A4A" stroke-width="3"/>')
    defs = ('<linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7FE7FF"/><stop offset="1" stop-color="#2C6A88"/></linearGradient>'
            '<filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>')
    save("skyline.svg", svg(640, 410, f'<g filter="url(#glow)">{sky}{mbs}</g><rect x="0" y="398" width="640" height="10" fill="#1B3A4A"/>', defs))
    # warning badges
    def warn(name, text, icon):
        save(name, svg(520, 120, f'<rect x="6" y="6" width="508" height="108" rx="54" fill="#2A0E12" stroke="#FF4D57" stroke-width="7"/>'
                                 f'<circle cx="62" cy="60" r="38" fill="#FF4D57"/>{icon}'
                                 f'<text x="300" y="76" font-family="Montserrat, sans-serif" font-weight="800" font-size="40" text-anchor="middle" fill="#FFFFFF">{text}</text>'))
    warn("warn_water.svg", "No Fresh Water", f'<path d="M62,34 C50,52 46,62 46,70 A16,16 0 0,0 78,70 C78,62 74,52 62,34 Z" fill="#FFFFFF"/>')
    warn("warn_resources.svg", "No Resources", f'<path d="M40,74 L54,48 H74 L86,74 Z" fill="#FFFFFF"/>')
    warn("warn_army.svg", "Barely an Army", f'<path d="M62,30 L88,40 V62 Q88,84 62,92 Q36,84 36,62 V40 Z" fill="#FFFFFF"/>')
    # flags as markers (for naming only)
    save("marker_mys.svg", GM.marker("mys", flag_mys)); save("marker_sgp.svg", GM.marker("sgp", flag_sgp))
    build_map()
    print("\n".join(sorted(f for f in os.listdir(OUT) if f.endswith(".svg"))))


def build_map():
    src = open(os.path.join(HERE, "..", "src", "geo_data.js")).read()
    geo = json.loads(src[src.index("{"):src.rindex("}") + 1])
    W, H = 1080, 1920
    my = lambda lat: math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))
    lon0, lat0, z = 107.5, 2.5, 52.0
    P = lambda lon, lat: (W / 2 + (lon - lon0) * z, H * 0.47 - (my(lat) - my(lat0)) * z)
    path = lambda r: "M" + " L".join(f"{P(r[i], r[i+1])[0]:.1f},{P(r[i], r[i+1])[1]:.1f}" for i in range(0, len(r), 2)) + " Z"
    land = " ".join(path(r) for r in geo["sea"])
    body = [f'<rect width="{W}" height="{H}" fill="#1E4D5C"/>', f'<g filter="url(#sh)"><path d="{land}" fill="#8A855C" stroke="#5E5A3B" stroke-width="2" fill-rule="evenodd"/></g>']
    for iso, col, op in (("MYS", "#4A7BD0", 0.45), ("SGP", "#EF3340", 0.9)):
        body.append(f'<path d="{" ".join(path(r) for r in geo["countries"][iso])}" fill="{col}" fill-opacity="{op}" stroke="#F4F1E6" stroke-width="2"/>')
    # shipping routes into Singapore
    sg = P(*geo["places"]["singapore"])
    for a in ((95, 6.5), (112, 9), (106, -6), (118, 4)):
        q = P(*a)
        body.append(f'<path d="M{q[0]:.0f},{q[1]:.0f} Q{(q[0]+sg[0])/2 + 40:.0f},{(q[1]+sg[1])/2 - 40:.0f} {sg[0]:.0f},{sg[1]:.0f}" fill="none" stroke="#7FE7FF" stroke-width="5" stroke-dasharray="14 10"/>')
    lab = lambda x, y, t, s, fill="#FFFFFF": (f'<text x="{x:.0f}" y="{y:.0f}" font-family="Montserrat, sans-serif" font-weight="800" font-size="{s}" text-anchor="middle" '
                                              f'fill="{fill}" stroke="#000" stroke-opacity="0.5" stroke-width="6" paint-order="stroke">{t}</text>')
    for t, lon, lat, s in (("MALAY PENINSULA", 101.6, 4.6, 30), ("BORNEO", 114.5, 1.0, 40), ("SINGAPORE", 104.4, 0.7, 30)):
        body.append(lab(*P(lon, lat), t, s))
    defs = '<filter id="sh"><feDropShadow dx="5" dy="7" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/></filter>'
    save("malaysia_singapore_map.svg", svg(W, H, "".join(body), defs))
    hubs = geo["hubs"]
    lon0, lat0, z = 108, 8, 9.0
    P2 = lambda lon, lat: (W / 2 + (lon - lon0) * z, H * 0.47 - (my(lat) - my(lat0)) * z)
    sgp = P2(*geo["places"]["singapore"])
    arcs = "".join(f'<path d="M{sgp[0]:.0f},{sgp[1]:.0f} Q{(sgp[0]+P2(*v)[0])/2:.0f},{min(sgp[1], P2(*v)[1]) - 120:.0f} {P2(*v)[0]:.0f},{P2(*v)[1]:.0f}" fill="none" stroke="{GOLD}" stroke-width="5" stroke-dasharray="14 10"/>'
                   for v in hubs.values())
    save("trade_routes.svg", svg(W, H, f'<rect width="{W}" height="{H}" fill="#1E4D5C"/>' +
                                 f'<path d="{" ".join("M" + " L".join(f"{P2(r[i], r[i+1])[0]:.1f},{P2(r[i], r[i+1])[1]:.1f}" for i in range(0, len(r), 2)) + " Z" for r in geo["asia"])}" fill="#8A855C" fill-rule="evenodd"/>' + arcs))


if __name__ == "__main__":
    main()
