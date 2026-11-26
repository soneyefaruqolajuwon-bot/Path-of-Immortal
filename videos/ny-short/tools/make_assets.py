"""SVG kit for the New York capital short -> ../assets/*.svg
People are chibis (PR.chibi); every held prop gets its hand redrawn on top (house rule)."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg = GM.PR, GM.INK, GM.svg
def save(n, c): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(c)
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
SKIN = "#F2C9A0"
def handdot(x, y, col=SKIN): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{S * 0.04:.1f}" fill="{col}" stroke="{INK}" stroke-width="4"/>'
def person(name, o, back="", front="", grip=(), top=""):
    p, hands = PR.chibi(o)
    tops = "".join(handdot(*hands[k], o.get("head", SKIN)) for k in grip)
    save(name, svg(300, 520, f'<g transform="translate(0,80)">{back}{"".join(p)}{top}{front(hands) if callable(front) else front}{tops}</g>'))
def crown(x, y, s=1.0):
    pts = [(-38, 0), (-46, -40), (-20, -18), (0, -50), (20, -18), (46, -40), (38, 0)]
    d = "M" + " L".join(f"{x + a * s:.0f},{y + b * s:.0f}" for a, b in pts) + " Z"
    return f'<path d="{d}" fill="#F4D03F" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>' + "".join(f'<circle cx="{x + a * s:.0f}" cy="{y + b * s:.0f}" r="{6 * s:.0f}" fill="#E63946" stroke="{INK}" stroke-width="3"/>' for a, b in ((-46, -40), (0, -50), (46, -40)))
def briefcase(x, y): return f'<rect x="{x - 34:.0f}" y="{y + 6:.0f}" width="68" height="48" rx="7" fill="#6B4423" stroke="{INK}" stroke-width="5"/><path d="M{x - 12:.0f},{y + 6:.0f} v-10 h24 v10" fill="none" stroke="{INK}" stroke-width="5"/>'
def scroll(x, y, ang=0):
    return (f'<g transform="rotate({ang} {x:.0f} {y:.0f})"><rect x="{x - 14:.0f}" y="{y - 46:.0f}" width="28" height="92" fill="#F3E3B5" stroke="{INK}" stroke-width="4"/>'
            f'<ellipse cx="{x:.0f}" cy="{y - 46:.0f}" rx="18" ry="8" fill="#E2CB8C" stroke="{INK}" stroke-width="4"/><ellipse cx="{x:.0f}" cy="{y + 46:.0f}" rx="18" ry="8" fill="#E2CB8C" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="{x - 15:.0f}" y="{y - 6:.0f}" width="30" height="12" fill="#B22234"/></g>')
WIG = "".join(f'<circle cx="{CX + a * HR:.0f}" cy="{HY + b * HR:.0f}" r="{HR * r:.0f}" fill="#F4F1EA" stroke="{INK}" stroke-width="4"/>' for a, b, r in ((-0.95, 0.05, 0.3), (0.95, 0.05, 0.3), (-0.9, -0.4, 0.32), (0.9, -0.4, 0.32), (-0.45, -0.85, 0.36), (0.45, -0.85, 0.36), (0, -0.98, 0.36)))
TRICORN = (f'<path d="M{CX - HR * 1.25:.0f},{HY - HR * 0.6:.0f} Q{CX:.0f},{HY - HR * 0.35:.0f} {CX + HR * 1.25:.0f},{HY - HR * 0.6:.0f} L{CX + HR * 0.7:.0f},{HY - HR * 1.35:.0f} Q{CX:.0f},{HY - HR * 1.0:.0f} {CX - HR * 0.7:.0f},{HY - HR * 1.35:.0f} Z" fill="#1A1A1E" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
           f'<path d="M{CX - HR * 1.15:.0f},{HY - HR * 0.62:.0f} Q{CX:.0f},{HY - HR * 0.4:.0f} {CX + HR * 1.15:.0f},{HY - HR * 0.62:.0f}" stroke="#F4D03F" stroke-width="5" fill="none"/>')
HAIR = f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX - HR * 0.7:.0f},{HY - HR * 1.15:.0f} {CX + HR * 0.1:.0f},{HY - HR * 1.0:.0f} Q{CX + HR * 0.85:.0f},{HY - HR * 1.05:.0f} {CX + HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX + HR * 0.4:.0f},{HY - HR * 0.62:.0f} {CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Z" fill="#3A2614" stroke="{INK}" stroke-width="4"/>'
STRAPS = f'<path d="M{CX - S * 0.1:.0f},{FEET - S * 0.45:.0f} L{CX + S * 0.14:.0f},{FEET - S * 0.17:.0f} M{CX + S * 0.1:.0f},{FEET - S * 0.45:.0f} L{CX - S * 0.14:.0f},{FEET - S * 0.17:.0f}" stroke="#FFFFFF" stroke-width="10"/>'


def union1606(x, y, w, h):   # the pre-1801 Union Flag (no St Patrick's saltire)
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#012169"/>'
            f'<path d="M{x},{y} L{x + w},{y + h} M{x + w},{y} L{x},{y + h}" stroke="#FFFFFF" stroke-width="{h * 0.2:.0f}"/>'
            f'<path d="M{x + w / 2},{y} V{y + h} M{x},{y + h / 2} H{x + w}" stroke="#FFFFFF" stroke-width="{h * 0.33:.0f}"/>'
            f'<path d="M{x + w / 2},{y} V{y + h} M{x},{y + h / 2} H{x + w}" stroke="#C8102E" stroke-width="{h * 0.2:.0f}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="{INK}" stroke-width="3"/>')


def main():
    # New York City: sunglasses, suit, crown held high, briefcase in the other hand
    person("nyc_smug.svg", dict(coat="#22252B", pants="#22252B", tie="#F4D03F", shades=True, rarm=-55, larm=100),
           front=lambda h: crown(h["rarm"][0], h["rarm"][1] - 22, 1.5) + briefcase(*h["larm"]), grip=("rarm", "larm"), top=HAIR)
    person("nyc_shock.svg", dict(coat="#22252B", pants="#22252B", tie="#F4D03F", face="panic", sweat=True, stressed=True, rarm=-70, larm=-110), top=HAIR)
    # colonial lawmaker: powdered wig, scrolls in both hands, running pose
    person("law_run.svg", dict(coat="#22306E", pants="#E8DFC8", face="panic", sweat=True, rarm=-10, larm=160), back=WIG,
           front=lambda h: scroll(*h["rarm"], 25) + scroll(*h["larm"], -30), grip=("rarm", "larm"))
    person("law_happy.svg", dict(coat="#22306E", pants="#E8DFC8", face="smile", rarm=-45, larm=110), back=WIG,
           front=lambda h: scroll(*h["rarm"], 15), grip=("rarm",))
    # redcoat with musket held upright
    person("redcoat.svg", dict(coat="#C8102E", pants="#F4F1EA", face="flat", rarm=70, larm=110), top=TRICORN + STRAPS,
           front=lambda h: f'<line x1="{h["rarm"][0]:.0f}" y1="{h["rarm"][1] + 70:.0f}" x2="{h["rarm"][0]:.0f}" y2="{h["rarm"][1] - 190:.0f}" stroke="#5A3A1E" stroke-width="12" stroke-linecap="round"/><line x1="{h["rarm"][0]:.0f}" y1="{h["rarm"][1] - 190:.0f}" x2="{h["rarm"][0]:.0f}" y2="{h["rarm"][1] - 225:.0f}" stroke="#9AA3AD" stroke-width="5"/>', grip=("rarm",))
    # British warship: hull, three sails, 1606 Union flag, redcoats peeking over the rail
    heads = "".join(f'<circle cx="{x}" cy="232" r="20" fill="{SKIN}" stroke="{INK}" stroke-width="4"/><path d="M{x - 26},224 Q{x},230 {x + 26},224 L{x + 14},204 Q{x},212 {x - 14},204 Z" fill="#1A1A1E" stroke="{INK}" stroke-width="3"/>' for x in (120, 175, 230, 285))
    sails = "".join(f'<line x1="{x}" y1="250" x2="{x}" y2="{40 + i * 14}" stroke="#5A3A1E" stroke-width="9"/><path d="M{x - 52},{70 + i * 14} Q{x},{60 + i * 14} {x + 52},{70 + i * 14} Q{x + 62},{130 + i * 10} {x + 50},{190} Q{x},{178} {x - 50},{190} Q{x - 62},{130 + i * 10} {x - 52},{70 + i * 14} Z" fill="#F4ECD8" stroke="{INK}" stroke-width="5"/>' for i, x in enumerate((130, 210, 290)))
    hull = f'<path d="M30,250 L390,250 L360,330 Q210,350 70,330 Z" fill="#7A4A26" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><path d="M48,275 H372" stroke="#F4D03F" stroke-width="7"/>' + "".join(f'<rect x="{x}" y="288" width="18" height="14" fill="{INK}"/>' for x in range(80, 350, 45))
    flag = f'<line x1="372" y1="250" x2="372" y2="150" stroke="#5A3A1E" stroke-width="6"/>' + union1606(372, 150, 70, 42)
    save("warship.svg", svg(460, 360, heads + sails + hull + flag))
    # NYC skyline (the crown city) and Albany's capitol (the real seat)
    tw = [(40, 170, 60), (100, 110, 70), (170, 40, 60), (230, 130, 55), (285, 90, 60), (345, 160, 45)]
    sky = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{260 - y}" fill="#5E7B93" stroke="{INK}" stroke-width="5"/>' + "".join(f'<rect x="{x + 10 + j * 18}" y="{y + 16 + i * 26}" width="9" height="12" fill="#FFE27A"/>' for i in range((240 - y) // 26) for j in range((w - 14) // 18)) for x, y, w in tw)
    sky += f'<path d="M200,40 L200,10 M188,40 L200,0 L212,40" stroke="{INK}" stroke-width="5" fill="#9DB4C8"/>'
    save("skyline.svg", svg(400, 270, sky))
    cap = (f'<rect x="50" y="120" width="300" height="130" fill="#E8DCC0" stroke="{INK}" stroke-width="6"/>'
           + "".join(f'<path d="M{x - 38},120 L{x},{50} L{x + 38},120 Z" fill="#4A5D6E" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>' for x in (88, 200, 312))
           + "".join(f'<rect x="{x}" y="150" width="22" height="34" rx="10" fill="#3A4A5A"/>' for x in range(70, 340, 40))
           + f'<rect x="178" y="200" width="44" height="50" rx="20" fill="#3A4A5A" stroke="{INK}" stroke-width="4"/>'
           + f'<line x1="200" y1="50" x2="200" y2="0" stroke="{INK}" stroke-width="5"/><path d="M200,2 L250,14 L200,28 Z" fill="#F4D03F" stroke="{INK}" stroke-width="4"/>')
    save("capitol.svg", svg(400, 260, cap))
    town = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{150 - y}" fill="#B9A58A" stroke="{INK}" stroke-width="5"/><path d="M{x - 8},{y} L{x + w / 2},{y - 40} L{x + w + 8},{y} Z" fill="#6E4B3A" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><rect x="{x + w / 2 - 9}" y="{122}" width="18" height="28" fill="#4A3426"/>' for x, y, w in ((20, 80, 80), (115, 60, 90), (220, 90, 70)))
    save("kingston.svg", svg(310, 160, town))
    wagon = (f'<path d="M30,120 Q30,20 120,20 Q210,20 210,120 Z" fill="#F4ECD8" stroke="{INK}" stroke-width="6"/>' + "".join(f'<path d="M{x},120 Q{x},30 {x + 1},24" stroke="#C9B98E" stroke-width="4" fill="none"/>' for x in (80, 120, 160))
             + f'<rect x="20" y="118" width="200" height="34" fill="#7A4A26" stroke="{INK}" stroke-width="5"/>' + "".join(f'<circle cx="{x}" cy="165" r="28" fill="none" stroke="{INK}" stroke-width="7"/><circle cx="{x}" cy="165" r="6" fill="{INK}"/>' for x in (60, 180)))
    save("wagon.svg", svg(240, 200, wagon))
    farm = f'<rect x="30" y="60" width="120" height="80" fill="#B23A2E" stroke="{INK}" stroke-width="5"/><path d="M20,62 L90,10 L160,62 Z" fill="#6E4B3A" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><rect x="72" y="92" width="36" height="48" fill="#F4ECD8" stroke="{INK}" stroke-width="4"/>'
    save("farm.svg", svg(180, 150, farm))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
