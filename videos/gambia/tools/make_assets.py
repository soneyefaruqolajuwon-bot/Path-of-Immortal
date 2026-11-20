"""SVG assets for The Gambia short -> ../assets/*.svg"""
import importlib.util, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("pr_assets", os.path.join(HERE, "..", "..", "point-roberts", "tools", "make_assets.py"))
PR = importlib.util.module_from_spec(spec); spec.loader.exec_module(PR)
INK, svg, star_pts = PR.INK, PR.svg, PR.star_pts


def save(name, content):
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, name), "w").write(content)


def flag_fra(x, y, w, h):
    return "".join(f'<rect x="{x + i*w/3:.1f}" y="{y}" width="{w/3 + 0.5:.1f}" height="{h}" fill="{c}"/>' for i, c in enumerate(("#002395", "#FFFFFF", "#ED2939")))


def flag_gmb(x, y, w, h):
    u = h / 18
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{6*u:.1f}" fill="#CE1126"/>'
            f'<rect x="{x}" y="{y + 6*u:.1f}" width="{w}" height="{6*u:.1f}" fill="#FFFFFF"/>'
            f'<rect x="{x}" y="{y + 7*u:.1f}" width="{w}" height="{4*u:.1f}" fill="#0C1C8C"/>'
            f'<rect x="{x}" y="{y + 12*u:.1f}" width="{w}" height="{6*u:.1f}" fill="#3A7728"/>')


def flag_sen(x, y, w, h):
    s = "".join(f'<rect x="{x + i*w/3:.1f}" y="{y}" width="{w/3 + 0.5:.1f}" height="{h}" fill="{c}"/>' for i, c in enumerate(("#00853F", "#FDEF42", "#E31B23")))
    return s + f'<polygon points="{star_pts(x + w/2, y + h/2, h*0.18)}" fill="#00853F"/>'


PR.FLAGS.update(fra=flag_fra, gmb=flag_gmb, sen=flag_sen)


def marker(iso, fn):
    clip = f'<clipPath id="c{iso}"><circle cx="80" cy="80" r="62"/></clipPath>'
    body = (f'<path d="M80,190 L58,132 L102,132 Z" fill="{INK}"/><circle cx="84" cy="86" r="70" fill="#000" opacity="0.28"/>'
            f'<circle cx="80" cy="80" r="70" fill="#FFFFFF" stroke="{INK}" stroke-width="6"/>'
            f'<g clip-path="url(#c{iso})">{fn(-5, 18, 170, 124)}</g><circle cx="80" cy="80" r="62" fill="none" stroke="{INK}" stroke-width="4"/>')
    return svg(160, 200, body, clip)


def main():
    s, _, _ = PR.flag_character("uk", "ukclaim", larm=(115, 100), rarm=(-40, -70), eyes=dict(look=(0.6, 0), lid=0.4, slope_l=-8, slope_r=8))
    save("britain_claim.svg", s)
    s, _, _ = PR.flag_character("fra", "fracheer", larm=(-140, -110), rarm=(65, 80), eyes=dict(style="happy"))
    save("france_cheerful.svg", s)
    s, _, _ = PR.flag_character("uk", "ukdeal", larm=(115, 100), rarm=(20, 0), eyes=dict(look=(1, 0), lid=0.3))
    save("britain_deal.svg", s)
    s, _, _ = PR.flag_character("fra", "fradeal", larm=(160, 180), rarm=(65, 80), eyes=dict(look=(-1, 0), lid=0.3))
    save("france_deal.svg", s)
    save("marker_gmb.svg", marker("gmb", flag_gmb))
    save("marker_sen.svg", marker("sen", flag_sen))
    # 1800s steam gunboat (side view) with a bow cannon
    boat = (f'<path d="M30,150 H560 Q600,150 620,118 L630,104 H40 L20,140 Q20,150 30,150 Z" fill="#2B2B30" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
            f'<rect x="44" y="110" width="575" height="10" fill="#B8322A"/>'
            + "".join(f'<rect x="{90 + i*70}" y="124" width="22" height="14" rx="3" fill="#E8C55A"/>' for i in range(7))
            + f'<rect x="250" y="40" width="44" height="66" rx="4" fill="#3A3A40" stroke="{INK}" stroke-width="6"/><rect x="250" y="54" width="44" height="10" fill="#B8322A"/>'
            f'<path d="M140,104 V-10 M420,104 V0" stroke="#5C3B1E" stroke-width="9"/>'
            f'<path d="M150,4 Q200,40 150,84 Z M430,14 Q470,46 430,84 Z" fill="#F3EEDF" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M140,-10 L100,-4 L140,4 Z" fill="#C8102E"/>'
            f'<g transform="translate(540,92) rotate(-10)"><rect x="-10" y="-14" width="96" height="26" rx="10" fill="#1A1A1E" stroke="{INK}" stroke-width="5"/>'
            f'<circle cx="0" cy="0" r="20" fill="#5C3B1E" stroke="{INK}" stroke-width="5"/></g>'
            f'<path d="M10,160 q50,-14 100,0 t100,0 t100,0 t100,0 t100,0 t100,0" stroke="#7FD3FF" stroke-width="6" fill="none" opacity="0.7"/>')
    save("gunboat.svg", svg(680, 240, f'<g transform="translate(0,70)">{boat}</g>'))
    # 1889 treaty
    doc = (f'<rect x="30" y="20" width="300" height="400" rx="10" fill="#F4EBD3" stroke="{INK}" stroke-width="8"/>'
           f'<text x="180" y="88" font-family="Playfair Display, serif" font-weight="800" font-size="40" text-anchor="middle" fill="{INK}">TREATY</text>'
           f'<text x="180" y="136" font-family="Montserrat, sans-serif" font-weight="800" font-size="34" text-anchor="middle" fill="#8B6B3E">1889</text>'
           + "".join(f'<line x1="70" y1="{178 + k*30}" x2="{290 - (60 if k == 4 else 0)}" y2="{178 + k*30}" stroke="#A89470" stroke-width="6"/>' for k in range(5))
           + f'<circle cx="110" cy="360" r="40" fill="#C8102E" opacity="0.9"/><circle cx="250" cy="360" r="40" fill="#002395" opacity="0.9"/>'
           f'<path d="M95,360 l12,12 l22,-26" stroke="#fff" stroke-width="8" fill="none"/><path d="M235,360 l12,12 l22,-26" stroke="#fff" stroke-width="8" fill="none"/>')
    save("treaty_1889.svg", svg(360, 440, doc))
    # surveyor with a theodolite on a tripod
    p, hands = PR.chibi(dict(coat="#B79A63", pants="#5A4A38", hat="straw", rarm=-20, larm=150, face="smile"))
    hx, hy = hands["rarm"]
    tri = (f'<g transform="translate({hx + 70:.0f},{hy - 10:.0f})"><path d="M0,0 L-50,190 M0,0 L50,190 M0,0 L0,190" stroke="#6B4423" stroke-width="9" stroke-linecap="round"/>'
           f'<rect x="-34" y="-46" width="68" height="40" rx="8" fill="#C9A227" stroke="{INK}" stroke-width="5"/>'
           f'<rect x="20" y="-38" width="44" height="18" rx="6" fill="#3A3A40" stroke="{INK}" stroke-width="4"/></g>')
    save("surveyor.svg", svg(460, 470, f'<g transform="translate(20,30)">{"".join(p)}{tri}</g>'))
    print("\n".join(sorted(os.listdir(OUT))))


# ------------------------------------------------------------------ people who represent each country, wrapped in its flag

def caped_person(name, flag_fn, o, hat=None, arms_extra=""):
    """Chibi person (PR.chibi) wearing a flag as a cape, so viewers can tell which country is speaking."""
    cx, feet, s = 150, 420, 440 * 0.95
    hy, hr = feet - s * 0.68, s * 0.23
    cape = [(cx - 50, feet - s * 0.47), (cx + 50, feet - s * 0.47), (cx + 92, feet - s * 0.36), (cx + 142, feet - s * 0.02), (cx - 142, feet - s * 0.02), (cx - 92, feet - s * 0.36)]
    pts = " ".join(f"{a:.0f},{b:.0f}" for a, b in cape)
    x0, y0, x1, y1 = cx - 145, feet - s * 0.5, cx + 145, feet - s * 0.0
    clip = f'<clipPath id="cape{name}"><polygon points="{pts}"/></clipPath>'
    back = (f'<polygon points="{pts}" fill="#000" opacity="0.25" transform="translate(6,8)"/>'
            f'<g clip-path="url(#cape{name})">{flag_fn(x0, y0, x1 - x0, y1 - y0)}</g>'
            f'<polygon points="{pts}" fill="none" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>')
    parts, hands = PR.chibi(o)
    body = "".join(parts)
    hat_svg = ""
    if hat == "pith":
        hat_svg = (f'<ellipse cx="{cx}" cy="{hy - hr*0.55:.0f}" rx="{hr*1.35:.0f}" ry="{hr*0.22:.0f}" fill="#F1EAD6" stroke="{INK}" stroke-width="5"/>'
                   f'<path d="M{cx - hr*0.95:.0f},{hy - hr*0.55:.0f} Q{cx - hr*0.95:.0f},{hy - hr*1.75:.0f} {cx},{hy - hr*1.75:.0f} Q{cx + hr*0.95:.0f},{hy - hr*1.75:.0f} {cx + hr*0.95:.0f},{hy - hr*0.55:.0f} Z" fill="#F7F1DE" stroke="{INK}" stroke-width="5"/>'
                   f'<rect x="{cx - hr*0.95:.0f}" y="{hy - hr*0.78:.0f}" width="{hr*1.9:.0f}" height="{hr*0.16:.0f}" fill="#C9B98E"/>'
                   f'<circle cx="{cx}" cy="{hy - hr*1.78:.0f}" r="{hr*0.1:.0f}" fill="#C9A227" stroke="{INK}" stroke-width="3"/>')
    elif hat == "beret":
        hat_svg = (f'<ellipse cx="{cx + hr*0.15:.0f}" cy="{hy - hr*0.78:.0f}" rx="{hr*1.05:.0f}" ry="{hr*0.36:.0f}" fill="#C8102E" stroke="{INK}" stroke-width="5" transform="rotate(-10 {cx} {hy})"/>'
                   f'<line x1="{cx + hr*0.2:.0f}" y1="{hy - hr*1.1:.0f}" x2="{cx + hr*0.3:.0f}" y2="{hy - hr*1.3:.0f}" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>')
    elif hat == "kepi":
        hat_svg = (f'<path d="M{cx - hr*0.75:.0f},{hy - hr*0.55:.0f} L{cx - hr*0.62:.0f},{hy - hr*1.45:.0f} L{cx + hr*0.7:.0f},{hy - hr*1.35:.0f} L{cx + hr*0.8:.0f},{hy - hr*0.55:.0f} Z" fill="#C8102E" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
                   f'<rect x="{cx - hr*0.78:.0f}" y="{hy - hr*0.85:.0f}" width="{hr*1.6:.0f}" height="{hr*0.3:.0f}" fill="#22306E"/>'
                   f'<ellipse cx="{cx + hr*0.45:.0f}" cy="{hy - hr*0.5:.0f}" rx="{hr*0.6:.0f}" ry="{hr*0.12:.0f}" fill="{INK}"/>')
    belt = ""
    if o.get("dress"):
        # knee-length skirt over the legs + eyelashes
        belt += (f'<path d="M{cx - s*0.16:.0f},{feet - s*0.2:.0f} L{cx + s*0.16:.0f},{feet - s*0.2:.0f} L{cx + s*0.25:.0f},{feet - s*0.06:.0f} '
                 f'Q{cx:.0f},{feet - s*0.02:.0f} {cx - s*0.25:.0f},{feet - s*0.06:.0f} Z" fill="{o["coat"]}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
                 f'<path d="M{cx - s*0.24:.0f},{feet - s*0.075:.0f} Q{cx:.0f},{feet - s*0.035:.0f} {cx + s*0.24:.0f},{feet - s*0.075:.0f}" stroke="#FFFFFF" stroke-width="6" fill="none"/>')
    if o.get("crossbelt"):
        belt = f'<path d="M{cx - s*0.1:.0f},{feet - s*0.45:.0f} L{cx + s*0.15:.0f},{feet - s*0.16:.0f}" stroke="#F4F1E6" stroke-width="10"/>'
    hair_back = hair_front = ""
    if o.get("hair_long"):
        hc = o.get("hair_c", "#6B3E1E")
        hair_back = (f'<path d="M{cx - hr*1.08:.0f},{hy - hr*0.2:.0f} Q{cx - hr*1.3:.0f},{hy + hr*1.3:.0f} {cx - hr*1.0:.0f},{hy + hr*1.6:.0f} '
                     f'L{cx + hr*1.0:.0f},{hy + hr*1.6:.0f} Q{cx + hr*1.3:.0f},{hy + hr*1.3:.0f} {cx + hr*1.08:.0f},{hy - hr*0.2:.0f} '
                     f'Q{cx:.0f},{hy - hr*1.4:.0f} {cx - hr*1.08:.0f},{hy - hr*0.2:.0f} Z" fill="{hc}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>')
        hair_front = (f'<path d="M{cx - hr*0.98:.0f},{hy - hr*0.1:.0f} Q{cx - hr*0.6:.0f},{hy - hr*0.95:.0f} {cx + hr*0.05:.0f},{hy - hr*0.95:.0f} '
                      f'Q{cx + hr*0.7:.0f},{hy - hr*0.95:.0f} {cx + hr*0.98:.0f},{hy - hr*0.1:.0f} Q{cx + hr*0.6:.0f},{hy - hr*0.45:.0f} {cx + hr*0.1:.0f},{hy - hr*0.42:.0f} '
                      f'Q{cx - hr*0.5:.0f},{hy - hr*0.4:.0f} {cx - hr*0.98:.0f},{hy - hr*0.1:.0f} Z" fill="{hc}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')
    # crossbelt/skirt + long hair go behind the head group; bangs go on top of it
    i = body.find('<g id="head">')
    body = hair_back + body[:i] + belt + body[i:]
    j = body.find('</g>', body.find('<g id="head">'))
    body = body[:j] + hair_front + body[j:]
    knot = f'<circle cx="{cx}" cy="{feet - s*0.46:.0f}" r="13" fill="#C9A227" stroke="{INK}" stroke-width="5"/>'
    save(f"{name}.svg", svg(300, 520, f'<g transform="translate(0,80)">{back + body + knot + hat_svg + arms_extra}</g>', clip))


def build_people():
    caped_person("british_officer", PR.flag_uk, dict(coat="#B22234", pants="#2B2B33", rarm=-50, larm=120, face="smile", brow=0, crossbelt=True, beard="chops", beard_c="#8A5A3A"), hat="pith")
    caped_person("french_officer", flag_fra, dict(coat="#2B3A8C", pants="#C8102E", rarm=60, larm=-140, face="smile", cheeks=True), hat="kepi")
    caped_person("french_woman", flag_fra, dict(coat="#2B3A8C", pants="#2B3A8C", hair_long=True, hair_c="#6B3E1E", rarm=-60, larm=120,
                                                face="smile", cheeks=True, dress=True), hat="beret")
    caped_person("british_diplomat", PR.flag_uk, dict(coat="#2A2A30", hat="top", band="#C8102E", tie="#C8102E", rarm=10, larm=120, beard="chops", beard_c="#9A9A9A", face="smile"))
    caped_person("french_diplomat", flag_fra, dict(coat="#22306E", hat="top", band="#002395", tie="#ED2939", rarm=60, larm=170, face="smile", beard="chin", beard_c="#3A2614"))


if __name__ == "__main__":
    main()
    build_people()
