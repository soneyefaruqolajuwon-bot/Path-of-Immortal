"""SVG kit for the Bir Tawil short -> ../assets/*.svg
Egypt and Sudan act through caped officials (house style); the would-be king is just a person (no cape). Hands drawn over props."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg = GM.PR, GM.INK, GM.svg
def save(n, c): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(c)
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
SK = "#C68B59"


def hand(key, ang):
    side = -1 if key == "larm" else 1; a = math.radians(ang)
    return CX + side * S * 0.13 + S * 0.22 * math.cos(a), FEET - S * 0.36 + S * 0.22 * math.sin(a)
def handdot(x, y, col=SK): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{S * 0.04:.1f}" fill="{col}" stroke="{INK}" stroke-width="4"/>'
def tri(x, y, w, h, cols): return "".join(f'<rect x="{x}" y="{y + i * h / 3}" width="{w}" height="{h / 3}" fill="{c}"/>' for i, c in enumerate(cols))
def flag_egy(x, y, w, h): return tri(x, y, w, h, ("#CE1126", "#FFFFFF", "#000000")) + f'<circle cx="{x + w * 0.2}" cy="{y + h * 0.5}" r="{h * 0.12}" fill="#C09300"/>'
def flag_sdn(x, y, w, h): return tri(x, y, w, h, ("#D21034", "#FFFFFF", "#000000")) + f'<path d="M{x},{y} L{x + w * 0.35},{y + h / 2} L{x},{y + h} Z" fill="#007229"/>'
HAIR = f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX - HR * 0.7:.0f},{HY - HR * 1.15:.0f} {CX + HR * 0.1:.0f},{HY - HR * 1.0:.0f} Q{CX + HR * 0.85:.0f},{HY - HR * 1.05:.0f} {CX + HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX + HR * 0.4:.0f},{HY - HR * 0.62:.0f} {CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Z" fill="#1E1E24" stroke="{INK}" stroke-width="4"/>'
CROWN = f'<path d="M{CX - HR * 0.7:.0f},{HY - HR * 0.8:.0f} L{CX - HR * 0.8:.0f},{HY - HR * 1.45:.0f} L{CX - HR * 0.35:.0f},{HY - HR * 1.1:.0f} L{CX:.0f},{HY - HR * 1.6:.0f} L{CX + HR * 0.35:.0f},{HY - HR * 1.1:.0f} L{CX + HR * 0.8:.0f},{HY - HR * 1.45:.0f} L{CX + HR * 0.7:.0f},{HY - HR * 0.8:.0f} Z" fill="#F4D03F" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'


def main():
    for code, flag, coat in (("egy", flag_egy, "#2B2B33"), ("sdn", flag_sdn, "#3B3F2E")):
        for nm, o in dict(stand=dict(rarm=40, larm=110, face="smile"), push=dict(rarm=0, larm=180, face="flat", stressed=True), reach=dict(rarm=-35, larm=110, face="smile"), point=dict(rarm=-10, larm=110, face="flat")).items():
            GM.caped_person(f"{code}_{nm}", flag, dict(coat=coat, pants="#2B2B33", head=SK, **o), arms_extra=HAIR)
    # the would-be king: plants a home-made flag, paper crown (not a country)
    o = dict(coat="#2E86AB", pants="#C9A86A", head="#F2C9A0", rarm=-40, larm=110, face="smile")
    p, hands = PR.chibi(o); hx, hy = hands["rarm"]
    flag = f'<line x1="{hx:.0f}" y1="{hy + 80:.0f}" x2="{hx:.0f}" y2="{hy - 170:.0f}" stroke="#6B4423" stroke-width="9"/><g transform="translate({hx - 110:.0f},{hy - 170:.0f})"><rect width="110" height="70" fill="#7B2CBF" stroke="{INK}" stroke-width="4"/><circle cx="55" cy="35" r="16" fill="#F4D03F"/></g>'
    save("king.svg", svg(300, 520, f'<g transform="translate(0,80)">{flag}{"".join(p)}{CROWN}{handdot(hx, hy, "#F2C9A0")}</g>'))
    for code, fl in (("egy", flag_egy), ("sdn", flag_sdn)): save(f"flag_{code}.svg", svg(120, 80, fl(4, 4, 112, 72) + f'<rect x="4" y="4" width="112" height="72" fill="none" stroke="{INK}" stroke-width="4"/>'))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
