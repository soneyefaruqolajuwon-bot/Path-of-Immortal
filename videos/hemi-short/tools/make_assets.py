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


def wheat(x, y, s=1.0):
    st = "".join(f'<line x1="{x:.0f}" y1="{y + 40 * s:.0f}" x2="{x + d * s:.0f}" y2="{y - 70 * s:.0f}" stroke="#C99A2E" stroke-width="{5 * s:.0f}"/>' for d in (-22, -8, 6, 20))
    heads = "".join(f'<ellipse cx="{x + d * s:.0f}" cy="{y - 80 * s:.0f}" rx="{9 * s:.0f}" ry="{22 * s:.0f}" fill="#E9C46A" stroke="{INK}" stroke-width="3" transform="rotate({d} {x + d * s:.0f} {y - 80 * s:.0f})"/>' for d in (-22, -8, 6, 20))
    return st + heads + f'<rect x="{x - 26 * s:.0f}" y="{y - 6 * s:.0f}" width="{52 * s:.0f}" height="{12 * s:.0f}" fill="#B23A2E" stroke="{INK}" stroke-width="3"/>'


def main():
    BEANIE = (f'<path d="M{CX - HR * 0.98:.0f},{HY - HR * 0.35:.0f} Q{CX - HR:.0f},{HY - HR * 1.3:.0f} {CX:.0f},{HY - HR * 1.3:.0f} Q{CX + HR:.0f},{HY - HR * 1.3:.0f} {CX + HR * 0.98:.0f},{HY - HR * 0.35:.0f} Z" fill="#C8102E" stroke="{INK}" stroke-width="5"/>'
              f'<rect x="{CX - HR * 1.02:.0f}" y="{HY - HR * 0.5:.0f}" width="{HR * 2.04:.0f}" height="{HR * 0.26:.0f}" rx="8" fill="#F4F1EA" stroke="{INK}" stroke-width="4"/><circle cx="{CX:.0f}" cy="{HY - HR * 1.35:.0f}" r="{HR * 0.2:.0f}" fill="#F4F1EA" stroke="{INK}" stroke-width="4"/>')
    SCARF = f'<path d="M{CX - S * 0.12:.0f},{FEET - S * 0.47:.0f} H{CX + S * 0.12:.0f} V{FEET - S * 0.41:.0f} H{CX - S * 0.12:.0f} Z M{CX + S * 0.04:.0f},{FEET - S * 0.42:.0f} l14,70 l-26,4 Z" fill="#2E86AB" stroke="{INK}" stroke-width="4"/>'
    person("north_cold.svg", dict(coat="#5C4033", pants="#2B2B33", face="panic", stressed=True, sweat=False, rarm=25, larm=155), top=BEANIE + SCARF)
    SUNHAT = (f'<ellipse cx="{CX}" cy="{HY - HR * 0.6:.0f}" rx="{HR * 1.7:.0f}" ry="{HR * 0.3:.0f}" fill="#F2D27A" stroke="{INK}" stroke-width="5"/>'
              f'<path d="M{CX - HR * 0.8:.0f},{HY - HR * 0.62:.0f} Q{CX - HR * 0.75:.0f},{HY - HR * 1.4:.0f} {CX:.0f},{HY - HR * 1.4:.0f} Q{CX + HR * 0.75:.0f},{HY - HR * 1.4:.0f} {CX + HR * 0.8:.0f},{HY - HR * 0.62:.0f} Z" fill="#F2D27A" stroke="{INK}" stroke-width="5"/>'
              f'<rect x="{CX - HR * 0.8:.0f}" y="{HY - HR * 0.85:.0f}" width="{HR * 1.6:.0f}" height="{HR * 0.18:.0f}" fill="#2A9D8F"/>')
    person("south_chill.svg", dict(coat="#2A9D8F", pants="#E9C46A", shades=True, rarm=-40, larm=150), top=SUNHAT)
    person("south_poke.svg", dict(coat="#2A9D8F", pants="#E9C46A", face="flat", rarm=10, larm=110), top=SUNHAT)
    person("farmer_wheat.svg", dict(coat="#8B5A2B", pants="#3D5A80", face="smile", beard="chin", beard_c="#6B4423", rarm=-75, larm=110),
           front=lambda h: wheat(h["rarm"][0], h["rarm"][1] + 10, 1.4), grip=("rarm",))
    sheep = ("".join(f'<circle cx="{x}" cy="{y}" r="26" fill="#F4F1EA" stroke="{INK}" stroke-width="4"/>' for x, y in ((70, 70), (100, 58), (130, 70), (100, 86), (70, 92), (130, 92)))
             + f'<ellipse cx="160" cy="70" rx="20" ry="24" fill="#2B2B33" stroke="{INK}" stroke-width="4"/><circle cx="166" cy="64" r="4" fill="#fff"/>'
             + "".join(f'<rect x="{x}" y="105" width="10" height="28" fill="#2B2B33"/>' for x in (70, 90, 115, 135)))
    save("sheep.svg", svg(200, 140, sheep))
    save("wheat.svg", svg(120, 170, wheat(60, 120, 1.2)))
    corn = (f'<path d="M60,20 Q88,40 86,110 Q80,150 60,158 Q40,150 34,110 Q32,40 60,20 Z" fill="#F4C430" stroke="{INK}" stroke-width="5"/>'
            + "".join(f'<circle cx="{x}" cy="{y}" r="5" fill="#E0A800"/>' for y in range(40, 150, 14) for x in (48, 60, 72))
            + f'<path d="M60,160 Q20,120 18,60 Q40,110 60,150 Z M60,160 Q100,120 102,60 Q80,110 60,150 Z" fill="#6AB04C" stroke="{INK}" stroke-width="4"/>')
    save("corn.svg", svg(120, 170, corn))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
