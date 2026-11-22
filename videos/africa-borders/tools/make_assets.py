"""SVG kit for "Why Africa's borders are straight lines" -> ../assets/*.svg
Characters are chibi people wearing their country's flag as a cape (house rule); props and buildings are drawn objects, not pins."""
import importlib.util, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg = GM.PR, GM.INK, GM.svg


def save(n, c): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(c)
def tri_h(cols):   # horizontal tricolour
    return lambda x, y, w, h: "".join(f'<rect x="{x}" y="{y + i*h/3:.1f}" width="{w}" height="{h/3 + 0.5:.1f}" fill="{c}"/>' for i, c in enumerate(cols))
def tri_v(cols):
    return lambda x, y, w, h: "".join(f'<rect x="{x + i*w/3:.1f}" y="{y}" width="{w/3 + 0.5:.1f}" height="{h}" fill="{c}"/>' for i, c in enumerate(cols))
flag_deu = tri_h(["#111111", "#FFFFFF", "#D52B1E"])                 # German Empire
flag_bel = tri_v(["#111111", "#FDDA24", "#EF3340"])
flag_ita = tri_v(["#009246", "#FFFFFF", "#CE2B37"])
flag_nga = tri_v(["#008751", "#FFFFFF", "#008751"])
flag_eth = tri_h(["#078930", "#FCDD09", "#DA121A"])
def flag_esp(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#AA151B"/><rect x="{x}" y="{y + h/4:.1f}" width="{w}" height="{h/2:.1f}" fill="#F1BF00"/>'
def flag_prt(x, y, w, h): return (f'<rect x="{x}" y="{y}" width="{w*0.4:.1f}" height="{h}" fill="#046A38"/><rect x="{x + w*0.4:.1f}" y="{y}" width="{w*0.6:.1f}" height="{h}" fill="#DA291C"/>'
                                  f'<circle cx="{x + w*0.4:.1f}" cy="{y + h/2:.1f}" r="{h*0.2:.1f}" fill="#FFE900" stroke="#111" stroke-width="2"/>')
def flag_gha(x, y, w, h): return tri_h(["#CE1126", "#FCD116", "#006B3F"])(x, y, w, h) + f'<polygon points="{GM.star_pts(x + w/2, y + h/2, h*0.15)}" fill="#111"/>'
FLAGS = {"gbr": PR.flag_uk, "fra": GM.flag_fra, "deu": flag_deu, "bel": flag_bel, "prt": flag_prt, "esp": flag_esp, "ita": flag_ita,
         "gha": flag_gha, "eth": flag_eth, "nga": flag_nga, "sen": GM.flag_sen}

# head geometry used by caped_person (cx=150, feet=420, s=418)
CX, HY, HR = 150, 420 - 418 * 0.68, 418 * 0.23
PICKEL = (f'<path d="M{CX - HR*0.95:.0f},{HY - HR*0.5:.0f} Q{CX - HR*0.95:.0f},{HY - HR*1.5:.0f} {CX},{HY - HR*1.5:.0f} Q{CX + HR*0.95:.0f},{HY - HR*1.5:.0f} {CX + HR*0.95:.0f},{HY - HR*0.5:.0f} Z" fill="#1C1C20" stroke="{INK}" stroke-width="5"/>'
          f'<path d="M{CX - HR*1.15:.0f},{HY - HR*0.5:.0f} H{CX + HR*1.25:.0f}" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
          f'<path d="M{CX - 9},{HY - HR*1.45:.0f} L{CX},{HY - HR*2.2:.0f} L{CX + 9},{HY - HR*1.45:.0f} Z" fill="#C9A227" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
          f'<ellipse cx="{CX}" cy="{HY - HR*1.0:.0f}" rx="{HR*0.28:.0f}" ry="{HR*0.24:.0f}" fill="#C9A227" stroke="{INK}" stroke-width="3"/>')
MOUSTACHE = (f'<path d="M{CX - HR*0.55:.0f},{HY + HR*0.42:.0f} Q{CX - HR*0.25:.0f},{HY + HR*0.18:.0f} {CX},{HY + HR*0.34:.0f} Q{CX + HR*0.25:.0f},{HY + HR*0.18:.0f} {CX + HR*0.55:.0f},{HY + HR*0.42:.0f} '
             f'Q{CX + HR*0.25:.0f},{HY + HR*0.46:.0f} {CX},{HY + HR*0.4:.0f} Q{CX - HR*0.25:.0f},{HY + HR*0.46:.0f} {CX - HR*0.55:.0f},{HY + HR*0.42:.0f} Z" fill="#E8E8E8" stroke="{INK}" stroke-width="3"/>')
KUFI = f'<path d="M{CX - HR*0.85:.0f},{HY - HR*0.55:.0f} Q{CX},{HY - HR*1.55:.0f} {CX + HR*0.85:.0f},{HY - HR*0.55:.0f} Z" fill="#6B3FA0" stroke="{INK}" stroke-width="5"/><path d="M{CX - HR*0.7:.0f},{HY - HR*0.75:.0f} H{CX + HR*0.7:.0f}" stroke="#F4D03F" stroke-width="5"/>'


def person(name, flag, o, hat=None, extra=""):
    GM.caped_person(name, FLAGS[flag], o, hat=hat if hat in ("pith", "beret", "kepi") else None)
    if extra:
        p = os.path.join(OUT, name + ".svg"); s = open(p).read(); s = s.replace("</svg>", '<g transform="translate(0,80)">' + extra + "</g></svg>"); open(p, "w").write(s)


def main():
    os.makedirs(OUT, exist_ok=True)
    SK, SK2, SK3 = "#F2C9A0", "#8D5524", "#6B4423"
    # Bismarck (host of the conference) and the European diplomats
    person("bismarck", "deu", dict(coat="#2E3440", pants="#1C1C20", rarm=-40, larm=120, face="flat", head=SK), extra=PICKEL + MOUSTACHE)
    person("bismarck_worried", "deu", dict(coat="#2E3440", pants="#1C1C20", rarm=40, larm=150, face="flat", stressed=True, sweat=True, head=SK), extra=PICKEL + MOUSTACHE)
    person("british_diplomat", "gbr", dict(coat="#2A2A30", hat="top", band="#C8102E", tie="#C8102E", rarm=10, larm=120, beard="chops", beard_c="#9A9A9A", face="smile", head=SK))
    person("french_diplomat", "fra", dict(coat="#22306E", hat="top", band="#002395", tie="#ED2939", rarm=60, larm=170, face="smile", beard="chin", beard_c="#3A2614", head=SK))
    person("diplomat_squint", "gbr", dict(coat="#2A2A30", hat="top", band="#C8102E", tie="#C8102E", rarm=-70, larm=120, beard="chops", beard_c="#9A9A9A", face="flat", stressed=True, head=SK))
    person("diplomat_shrug", "fra", dict(coat="#22306E", hat="top", band="#002395", tie="#ED2939", rarm=-120, larm=120, face="flat", beard="chin", beard_c="#3A2614", head=SK))
    person("portuguese_diplomat", "prt", dict(coat="#3B3B2E", hat="top", band="#046A38", rarm=20, larm=150, face="smile", beard="chin", beard_c="#2A1A10", head=SK))
    # 1960s African leaders (their own flags as capes)
    person("leader_gha", "gha", dict(coat="#C9A227", pants="#2B2B33", rarm=-30, larm=150, face="smile", head=SK3), extra=KUFI)
    person("leader_eth", "eth", dict(coat="#2A2A30", pants="#2A2A30", tie="#DA121A", rarm=30, larm=150, face="smile", head=SK2, beard="chin", beard_c="#1C1C20"))
    person("leader_nga", "nga", dict(coat="#FFFFFF", pants="#E8E8E8", rarm=-20, larm=120, face="smile", head=SK3))
    person("leader_sen", "sen", dict(coat="#1F3B73", pants="#2B2B33", tie="#00853F", rarm=20, larm=160, face="smile", head=SK2))
    for iso, base in (("gha", dict(coat="#C9A227", pants="#2B2B33", head=SK3)), ("eth", dict(coat="#2A2A30", pants="#2A2A30", head=SK2, beard="chin", beard_c="#1C1C20")),
                      ("nga", dict(coat="#FFFFFF", pants="#E8E8E8", head=SK3)), ("sen", dict(coat="#1F3B73", pants="#2B2B33", head=SK2))):
        person(f"leader_{iso}_worried", iso, dict(base, rarm=50, larm=130, face="flat", stressed=True, sweat=True), extra=KUFI if iso == "gha" else "")
        person(f"leader_{iso}_cheer", iso, dict(base, rarm=-150, larm=150, face="smile"), extra=KUFI if iso == "gha" else "")
    # villagers (one community, about to be split)
    for i, (coat, head) in enumerate((("#C0392B", SK3), ("#E67E22", SK2), ("#16A085", SK3), ("#8E44AD", SK2))):
        p, _ = PR.chibi(dict(coat=coat, pants="#5A4A38", rarm=-40 if i % 2 else 40, larm=140, face="smile", head=head), w=300, h=440)
        save(f"villager{i}.svg", svg(300, 440, "".join(p)))
        p, _ = PR.chibi(dict(coat=coat, pants="#5A4A38", rarm=20, larm=160, face="flat", stressed=True, head=head), w=300, h=440)
        save(f"villager{i}_sad.svg", svg(300, 440, "".join(p)))
    # flag markers (round pins are fine for simply naming a country)
    for iso, fn in FLAGS.items(): save(f"marker_{iso}.svg", GM.marker(iso, fn))
    # props
    save("ruler.svg", svg(900, 90, f'<rect x="6" y="10" width="888" height="70" rx="8" fill="#D9A55B" stroke="{INK}" stroke-width="6"/>'
                                   + "".join(f'<rect x="{20 + i*22}" y="12" width="3" height="{28 if i % 5 == 0 else 16}" fill="{INK}"/>' for i in range(40))
                                   + '<path d="M10,62 H890" stroke="#B9843E" stroke-width="5"/>'))
    save("magnifier.svg", svg(220, 220, f'<line x1="140" y1="140" x2="205" y2="205" stroke="#6B4423" stroke-width="22" stroke-linecap="round"/><line x1="140" y1="140" x2="205" y2="205" stroke="{INK}" stroke-width="6" stroke-linecap="round" opacity="0.4"/>'
                                         f'<circle cx="90" cy="90" r="70" fill="#BFE9F5" fill-opacity="0.45" stroke="#C9A227" stroke-width="14"/><circle cx="90" cy="90" r="70" fill="none" stroke="{INK}" stroke-width="5"/>'
                                         '<path d="M50,70 Q60,45 90,40" stroke="#FFFFFF" stroke-width="8" fill="none" stroke-linecap="round"/>'))
    save("steamship.svg", svg(260, 150, f'<path d="M10,90 H250 L222,138 H40 Z" fill="#2B2D33" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><rect x="60" y="62" width="130" height="30" fill="#F1EAD6" stroke="{INK}" stroke-width="5"/>'
                                         f'<rect x="100" y="20" width="26" height="44" fill="#C0392B" stroke="{INK}" stroke-width="5"/><rect x="146" y="28" width="22" height="36" fill="#C0392B" stroke="{INK}" stroke-width="5"/>'
                                         '<circle cx="110" cy="8" r="9" fill="#BBBBBB" opacity="0.8"/><circle cx="96" cy="2" r="7" fill="#BBBBBB" opacity="0.6"/>'))
    # Berlin: the conference venue (Reich Chancellery), with the German Empire flag
    cols = "".join(f'<rect x="{64 + i*40}" y="120" width="16" height="96" fill="#EFE6D2" stroke="{INK}" stroke-width="3"/>' for i in range(7))
    save("berlin_building.svg", svg(380, 250, f'<rect x="40" y="110" width="300" height="110" fill="#D8CBAE" stroke="{INK}" stroke-width="6"/>{cols}'
                                              f'<path d="M30,112 L190,52 L350,112 Z" fill="#C9B88F" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><rect x="24" y="218" width="332" height="18" fill="#A99A78" stroke="{INK}" stroke-width="5"/>'
                                              f'<line x1="190" y1="52" x2="190" y2="6" stroke="{INK}" stroke-width="5"/><g transform="translate(192,6)">{flag_deu(0, 0, 60, 36)}<rect width="60" height="36" fill="none" stroke="{INK}" stroke-width="3"/></g>'))
    # Africa Hall, Addis Ababa (OAU founding, 1963)
    win = "".join(f'<rect x="{60 + i*36}" y="{110 + j*30}" width="24" height="18" fill="#7FB3D5" stroke="{INK}" stroke-width="2"/>' for i in range(8) for j in range(3))
    save("africa_hall.svg", svg(400, 240, f'<rect x="40" y="96" width="320" height="120" fill="#ECE3CF" stroke="{INK}" stroke-width="6"/>{win}<rect x="24" y="214" width="352" height="18" fill="#A99A78" stroke="{INK}" stroke-width="5"/>'
                                         f'<rect x="170" y="40" width="60" height="58" fill="#ECE3CF" stroke="{INK}" stroke-width="5"/>'
                                         f'<line x1="200" y1="40" x2="200" y2="4" stroke="{INK}" stroke-width="5"/><g transform="translate(202,4)">{flag_eth(0, 0, 54, 32)}<rect width="54" height="32" fill="none" stroke="{INK}" stroke-width="3"/></g>'))
    print(len([f for f in os.listdir(OUT) if f.endswith(".svg")]), "assets")


if __name__ == "__main__":
    main()
