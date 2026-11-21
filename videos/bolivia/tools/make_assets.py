"""SVG assets for the Bolivia short -> ../assets/*.svg"""
import importlib.util, json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM)
GM.OUT = OUT
PR, INK, svg, star_pts = GM.PR, GM.INK, GM.svg, GM.star_pts
GOLD = "#F4D03F"


def save(name, content):
    os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, name), "w").write(content)


def bolivar_badge():
    """Minimal circular portrait of Simón Bolívar: dark wavy hair, sideburns, high collar, gold epaulettes."""
    cx, cy = 160, 160
    b = [f'<circle cx="{cx + 6}" cy="{cy + 8}" r="150" fill="#000" opacity="0.3"/>',
         f'<circle cx="{cx}" cy="{cy}" r="150" fill="{GOLD}" stroke="{INK}" stroke-width="8"/>',
         f'<circle cx="{cx}" cy="{cy}" r="134" fill="#123C4A"/>',
         '<clipPath id="bc"><circle cx="160" cy="160" r="134"/></clipPath><g clip-path="url(#bc)">',
         # coat + epaulettes + collar
         f'<path d="M40,330 Q50,230 160,215 Q270,230 280,330 Z" fill="#1F3A68" stroke="{INK}" stroke-width="6"/>',
         f'<ellipse cx="72" cy="262" rx="44" ry="22" fill="{GOLD}" stroke="{INK}" stroke-width="5"/>',
         f'<ellipse cx="248" cy="262" rx="44" ry="22" fill="{GOLD}" stroke="{INK}" stroke-width="5"/>',
         f'<path d="M118,218 L160,262 L202,218 L196,198 L124,198 Z" fill="#B8322A" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>',
         f'<path d="M140,206 L160,240 L180,206" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/>',
         # neck + face
         f'<rect x="138" y="168" width="44" height="40" fill="#E9B98F" stroke="{INK}" stroke-width="5"/>',
         f'<ellipse cx="160" cy="132" rx="58" ry="68" fill="#F0C79E" stroke="{INK}" stroke-width="6"/>',
         # hair: swept, wavy, with long sideburns
         f'<path d="M100,128 Q92,64 150,58 Q214,52 222,112 Q206,92 184,96 Q170,80 150,92 Q128,84 116,104 Q106,112 104,140 Z" fill="#2A1C14" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>',
         f'<path d="M104,130 Q100,172 116,178 L122,140 Z M216,130 Q220,172 204,178 L198,140 Z" fill="#2A1C14" stroke="{INK}" stroke-width="4"/>',
         # face
         f'<path d="M130,120 l18,-4 M172,116 l18,4" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>',
         f'<ellipse cx="140" cy="134" rx="6" ry="8" fill="{INK}"/><ellipse cx="180" cy="134" rx="6" ry="8" fill="{INK}"/>',
         f'<path d="M160,140 Q154,158 164,160" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>',
         f'<path d="M146,176 Q160,182 174,176" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>',
         '</g>',
         f'<circle cx="{cx}" cy="{cy}" r="134" fill="none" stroke="{INK}" stroke-width="5"/>']
    return svg(320, 320, "".join(b))


def scroll(text):
    w, h = 900, 230
    s = (f'<path d="M70,40 H830 Q860,40 860,70 V180 Q860,210 830,210 H70 Q40,210 40,180 V70 Q40,40 70,40 Z" fill="#F1E2B8" stroke="#6B5530" stroke-width="8"/>'
         f'<rect x="20" y="20" width="56" height="210" rx="28" fill="#E3CC92" stroke="#6B5530" stroke-width="8"/>'
         f'<rect x="824" y="20" width="56" height="210" rx="28" fill="#E3CC92" stroke="#6B5530" stroke-width="8"/>'
         f'<path d="M110,64 H790 M110,186 H790" stroke="#C7A96A" stroke-width="4"/>'
         f'<text x="450" y="146" font-family="Playfair Display, serif" font-weight="800" font-size="74" text-anchor="middle" fill="#3A2A08">{text}</text>')
    return svg(w, 250, s)


def arrows_svg(geo, P, W, H):
    route = [geo["cities"][k] for k in ("caracas", "bogota", "quito", "lima", "lapaz", "sucre")]
    pts = [P(*p) for p in route]
    d = "M" + " ".join(f"{x:.0f},{y:.0f}" for x, y in pts)
    s = (f'<path d="{d}" fill="none" stroke="{GOLD}" stroke-width="30" stroke-opacity="0.25" stroke-linejoin="round" stroke-linecap="round"/>'
         f'<path d="{d}" fill="none" stroke="{GOLD}" stroke-width="10" stroke-dasharray="26 14" stroke-linejoin="round" stroke-linecap="round"/>')
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        a = math.atan2(y1 - y0, x1 - x0)
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        s += (f'<g transform="translate({mx:.0f},{my:.0f}) rotate({math.degrees(a):.1f})">'
              f'<path d="M24,0 L-18,-22 L-8,0 L-18,22 Z" fill="{GOLD}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/></g>')
    return s


def build_map():
    src = open(os.path.join(HERE, "..", "src", "geo_data.js")).read()
    geo = json.loads(src[src.index("{"):src.rindex("}") + 1])
    W, H = 1080, 1920
    my = lambda lat: math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))
    lon0, lat0, z = -62.0, -20.0, 25.0
    P = lambda lon, lat: (W / 2 + (lon - lon0) * z, H * 0.47 - (my(lat) - my(lat0)) * z)
    path = lambda r: "M" + " L".join(f"{P(r[i], r[i+1])[0]:.1f},{P(r[i], r[i+1])[1]:.1f}" for i in range(0, len(r), 2)) + " Z"
    land = " ".join(path(r) for r in geo["land"])
    six = {"VEN": "#F4D03F", "COL": "#F4D03F", "PAN": "#F4D03F", "ECU": "#F4D03F", "PER": "#F4D03F", "BOL": "#F4D03F"}
    body = [f'<rect width="{W}" height="{H}" fill="#1E4D5C"/>',
            f'<g filter="url(#sh)"><path d="{land}" fill="#8A855C" stroke="#5E5A3B" stroke-width="2" fill-rule="evenodd"/></g>']
    for iso, rs in geo["countries"].items():
        p = " ".join(path(r) for r in rs)
        if iso in six:
            body.append(f'<path d="{p}" fill="{six[iso]}" fill-opacity="{0.55 if iso == "BOL" else 0.25}" stroke="#F4F1E6" stroke-width="2" stroke-dasharray="7 5"/>')
        else:
            body.append(f'<path d="{p}" fill="none" stroke="#F4F1E6" stroke-width="2" stroke-dasharray="7 5" opacity="0.7"/>')
    body.append(arrows_svg(geo, P, W, H))
    lab = lambda x, y, t, s, fill="#FFFFFF": (f'<text x="{x:.0f}" y="{y:.0f}" font-family="Montserrat, sans-serif" font-weight="800" font-size="{s}" text-anchor="middle" '
                                              f'fill="{fill}" stroke="#000" stroke-opacity="0.5" stroke-width="6" paint-order="stroke">{t}</text>')
    for t, lon, lat, sz in (("VENEZUELA", -66, 7.5, 30), ("COLOMBIA", -73, 3, 30), ("ECUADOR", -79.5, -1.5, 24), ("PERU", -75, -9, 34),
                            ("PANAMA", -80.5, 9.6, 22), ("BRAZIL", -52, -10, 48)):
        body.append(lab(*P(lon, lat), t, sz))
    body.append(lab(*P(-64.8, -17.2), "BOLIVIA", 52, GOLD))
    defs = '<filter id="sh"><feDropShadow dx="5" dy="7" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/></filter>'
    save("south_america_map.svg", svg(W, H, "".join(body), defs))
    save("liberation_arrows.svg", svg(W, H, arrows_svg(geo, P, W, H)))


def main():
    save("bolivar_badge.svg", bolivar_badge())
    save("scroll_republic_of_bolivar.svg", scroll("República Bolívar"))
    save("scroll_bolivia.svg", scroll("Bolivia"))
    flags = {"esp": lambda x, y, w, h: f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#AA151B"/><rect x="{x}" y="{y + h/4:.1f}" width="{w}" height="{h/2:.1f}" fill="#F1BF00"/>',
             "bol": lambda x, y, w, h: "".join(f'<rect x="{x}" y="{y + i*h/3:.1f}" width="{w}" height="{h/3 + 0.5:.1f}" fill="{c}"/>' for i, c in enumerate(("#D52B1E", "#F9E300", "#007934")))}
    for iso, fn in flags.items():
        save(f"marker_{iso}.svg", GM.marker(iso, fn))
    # quill for the spelling change
    save("quill.svg", svg(300, 120, f'<g transform="translate(20,90) rotate(-20)"><path d="M0,0 L260,0" stroke="#6B5530" stroke-width="5"/>'
                                    f'<path d="M60,0 C110,-56 210,-50 260,0 C210,30 110,30 60,0 Z" fill="#F7F3E8" stroke="{INK}" stroke-width="4"/>'
                                    f'<path d="M-8,0 L10,-6 L10,6 Z" fill="{INK}"/></g>'))
    build_map()
    build_army()
    build_castles()
    print("\n".join(sorted(f for f in os.listdir(OUT) if f.endswith(".svg"))))


# ------------------------------------------------------------------ the liberation army (people, not arrows)

def flag_patriot(x, y, w, h):   # yellow-blue-red tricolour of the independence armies (Gran Colombia)
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h/2:.1f}" fill="#FCD116"/>'
            f'<rect x="{x}" y="{y + h/2:.1f}" width="{w}" height="{h/4 + 0.5:.1f}" fill="#003893"/>'
            f'<rect x="{x}" y="{y + 3*h/4:.1f}" width="{w}" height="{h/4:.1f}" fill="#CE1126"/>')


CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23


def hand(angle, side):
    a = math.radians(angle)
    sx, sy = CX + side * S * 0.13, FEET - S * 0.36
    return sx + S * 0.22 * math.cos(a), sy + S * 0.22 * math.sin(a)


def bicorne():
    return (f'<path d="M{CX - HR*1.45:.0f},{HY - HR*0.62:.0f} Q{CX:.0f},{HY - HR*1.9:.0f} {CX + HR*1.45:.0f},{HY - HR*0.62:.0f} '
            f'Q{CX:.0f},{HY - HR*0.95:.0f} {CX - HR*1.45:.0f},{HY - HR*0.62:.0f} Z" fill="#1C1C20" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
            f'<path d="M{CX - HR*1.2:.0f},{HY - HR*0.78:.0f} Q{CX:.0f},{HY - HR*1.6:.0f} {CX + HR*1.2:.0f},{HY - HR*0.78:.0f}" stroke="{GOLD}" stroke-width="7" fill="none"/>'
            f'<circle cx="{CX + HR*0.15:.0f}" cy="{HY - HR*1.25:.0f}" r="{HR*0.18:.0f}" fill="#CE1126" stroke="{INK}" stroke-width="4"/>')


def shako():
    return (f'<path d="M{CX - HR*0.7:.0f},{HY - HR*0.6:.0f} L{CX - HR*0.8:.0f},{HY - HR*1.75:.0f} L{CX + HR*0.8:.0f},{HY - HR*1.75:.0f} L{CX + HR*0.7:.0f},{HY - HR*0.6:.0f} Z" '
            f'fill="#1C1C20" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
            f'<rect x="{CX - HR*0.82:.0f}" y="{HY - HR*1.85:.0f}" width="{HR*1.64:.0f}" height="{HR*0.18:.0f}" fill="{GOLD}" stroke="{INK}" stroke-width="3"/>'
            f'<ellipse cx="{CX + HR*0.2:.0f}" cy="{HY - HR*0.72:.0f}" rx="{HR*0.65:.0f}" ry="{HR*0.12:.0f}" fill="{INK}"/>'
            f'<circle cx="{CX:.0f}" cy="{HY - HR*1.2:.0f}" r="{HR*0.17:.0f}" fill="#FCD116" stroke="{INK}" stroke-width="3"/>')


def musket(hx, hy):
    return (f'<g transform="translate({hx:.0f},{hy:.0f}) rotate(-70)"><rect x="-70" y="-7" width="290" height="14" rx="5" fill="#6B4423" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="120" y="-5" width="120" height="10" fill="#8D96A0" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M240,0 L275,-3 L275,3 Z" fill="#C9CFD5" stroke="{INK}" stroke-width="2"/></g>')


def sabre(hx, hy):
    return (f'<g transform="translate({hx:.0f},{hy:.0f}) rotate(-80)"><path d="M0,0 Q120,-18 210,-6" stroke="{INK}" stroke-width="14" fill="none" stroke-linecap="round"/>'
            f'<path d="M0,0 Q120,-18 210,-6" stroke="#E1E6EA" stroke-width="8" fill="none" stroke-linecap="round"/>'
            f'<rect x="-14" y="-12" width="14" height="24" rx="4" fill="{GOLD}" stroke="{INK}" stroke-width="3"/></g>')


def banner(hx, hy):
    top = hy - 330
    return (f'<line x1="{hx:.0f}" y1="{hy + 60:.0f}" x2="{hx:.0f}" y2="{top:.0f}" stroke="#5C3B1E" stroke-width="10" stroke-linecap="round"/>'
            f'<path d="M{hx:.0f},{top + 10:.0f} Q{hx + 90:.0f},{top - 10:.0f} {hx + 180:.0f},{top + 14:.0f} L{hx + 180:.0f},{top + 124:.0f} '
            f'Q{hx + 90:.0f},{top + 100:.0f} {hx:.0f},{top + 120:.0f} Z" fill="url(#pat)" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
            f'<circle cx="{hx:.0f}" cy="{top:.0f}" r="9" fill="{GOLD}" stroke="{INK}" stroke-width="3"/>')


def build_army():
    pat = ('<linearGradient id="pat" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FCD116"/><stop offset="0.5" stop-color="#FCD116"/>'
           '<stop offset="0.5" stop-color="#003893"/><stop offset="0.75" stop-color="#003893"/><stop offset="0.75" stop-color="#CE1126"/><stop offset="1" stop-color="#CE1126"/></linearGradient>')
    # Bolívar as the general leading the march: patriot-tricolour cape, bicorne, raised sabre
    GM.caped_person("bolivar_general", flag_patriot,
                    dict(coat="#1F3A68", pants="#F1EAD6", rarm=-75, larm=120, face="smile", brow=1, hair="short", hair_c="#2A1C14", crossbelt=True,
                         beard="chops", beard_c="#2A1C14"),
                    arms_extra=bicorne() + sabre(*hand(-75, 1)))
    # patriot infantryman: blue coat, white crossbelt, shako, musket on the shoulder
    p, _ = PR.chibi(dict(coat="#22306E", pants="#F1EAD6", rarm=-70, larm=120, face="smile"))
    belt = f'<path d="M{CX - S*0.1:.0f},{FEET - S*0.45:.0f} L{CX + S*0.15:.0f},{FEET - S*0.16:.0f}" stroke="#F4F1E6" stroke-width="10"/>'
    body = "".join(p); i = body.find('<g id="head">'); body = body[:i] + belt + body[i:]
    save("patriot_soldier.svg", svg(400, 520, f'<g transform="translate(0,80)">{musket(*hand(-70, 1))}{body}{shako()}</g>'))
    # flag bearer
    p, _ = PR.chibi(dict(coat="#22306E", pants="#F1EAD6", rarm=-80, larm=120, face="smile"))
    body = "".join(p); i = body.find('<g id="head">'); body = body[:i] + belt + body[i:]
    save("patriot_flagbearer.svg", svg(500, 600, f'<g transform="translate(0,160)">{body}{shako()}{banner(*hand(-80, 1))}</g>', pat))


# ------------------------------------------------------------------ castles (Spanish rule -> liberated)

def castle(flag_svg):
    stone, dark = "#B9AE96", "#8C826C"
    def tower(x, y, w, h):
        merl = "".join(f'<rect x="{x + i*w/5:.0f}" y="{y - 22}" width="{w/5*0.62:.0f}" height="24" fill="{stone}" stroke="{INK}" stroke-width="5"/>' for i in range(5))
        return (merl + f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{stone}" stroke="{INK}" stroke-width="6"/>'
                f'<rect x="{x + w*0.36:.0f}" y="{y + 30}" width="{w*0.28:.0f}" height="44" rx="14" fill="#2B2B30" stroke="{INK}" stroke-width="4"/>')
    bricks = "".join(f'<path d="M{60 + (j % 2)*22 + i*44},{230 + j*26} h30" stroke="{dark}" stroke-width="4"/>' for i in range(7) for j in range(5))
    body = (f'<ellipse cx="210" cy="372" rx="200" ry="16" fill="#000" opacity="0.25"/>'
            f'<line x1="210" y1="30" x2="210" y2="122" stroke="#5C3B1E" stroke-width="8" stroke-linecap="round"/>'
            f'<g transform="translate(214,32)"><path d="M0,0 Q50,-12 100,4 L100,66 Q50,52 0,64 Z" fill="url(#fl)" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/></g>'
            f'<circle cx="210" cy="28" r="8" fill="{GOLD}" stroke="{INK}" stroke-width="3"/>'
            f'<rect x="50" y="210" width="320" height="150" fill="{stone}" stroke="{INK}" stroke-width="6"/>{bricks}'
            + "".join(f'<rect x="{50 + i*40}" y="190" width="24" height="22" fill="{stone}" stroke="{INK}" stroke-width="5"/>' for i in range(8))
            + tower(20, 160, 90, 200) + tower(310, 160, 90, 200) + tower(160, 120, 100, 240)
            + f'<path d="M180,360 V300 Q210,268 240,300 V360 Z" fill="#4A3524" stroke="{INK}" stroke-width="6"/>'
            + "".join(f'<line x1="{x}" y1="296" x2="{x}" y2="360" stroke="{INK}" stroke-width="3"/>' for x in (195, 210, 225)))
    return svg(420, 390, body, flag_svg)


def build_castles():
    spain = ('<linearGradient id="fl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#AA151B"/><stop offset="0.25" stop-color="#AA151B"/>'
             '<stop offset="0.25" stop-color="#F1BF00"/><stop offset="0.75" stop-color="#F1BF00"/><stop offset="0.75" stop-color="#AA151B"/><stop offset="1" stop-color="#AA151B"/></linearGradient>')
    patriot = ('<linearGradient id="fl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FCD116"/><stop offset="0.5" stop-color="#FCD116"/>'
               '<stop offset="0.5" stop-color="#003893"/><stop offset="0.75" stop-color="#003893"/><stop offset="0.75" stop-color="#CE1126"/><stop offset="1" stop-color="#CE1126"/></linearGradient>')
    save("castle_spain.svg", castle(spain))
    save("castle_liberated.svg", castle(patriot))


if __name__ == "__main__":
    main()
