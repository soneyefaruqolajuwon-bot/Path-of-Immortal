"""SVG kit for the East-side Short -> ../assets/*.svg
Victorian chibis (PR.chibi); every held prop gets its hand redrawn on top (house rule)."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg = GM.PR, GM.INK, GM.svg
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
SKIN = "#F2C9A0"
def save(n, c): open(os.path.join(OUT, n), "w").write(c)
def hand(key, a):
    side = -1 if key == "larm" else 1
    return CX + side * S * 0.13 + S * 0.22 * math.cos(math.radians(a)), FEET - S * 0.36 + S * 0.22 * math.sin(math.radians(a))
def handdot(x, y): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{S * 0.04:.1f}" fill="{SKIN}" stroke="{INK}" stroke-width="4"/>'
FLATCAP = (f'<path d="M{CX - HR * 0.98:.0f},{HY - HR * 0.35:.0f} Q{CX - HR:.0f},{HY - HR * 1.15:.0f} {CX:.0f},{HY - HR * 1.15:.0f} Q{CX + HR:.0f},{HY - HR * 1.15:.0f} {CX + HR * 0.98:.0f},{HY - HR * 0.35:.0f} Z" fill="#6B5B4B" stroke="{INK}" stroke-width="5"/>'
           f'<path d="M{CX + HR * 0.3:.0f},{HY - HR * 0.45:.0f} L{CX + HR * 1.4:.0f},{HY - HR * 0.4:.0f} L{CX + HR * 0.85:.0f},{HY - HR * 0.62:.0f} Z" fill="#5A4B3C" stroke="{INK}" stroke-width="4"/>')
SOOT = "".join(f'<circle cx="{CX + dx:.0f}" cy="{HY + dy:.0f}" r="{r}" fill="#5A5A5A" opacity="0.55"/>' for dx, dy, r in ((-40, 30, 10), (35, 40, 8), (-10, 60, 6)))


def main():
    os.makedirs(OUT, exist_ok=True)
    # rich Victorian: top hat, frock coat, carrying a suitcase west (hand on the handle)
    ra, la = 55, 105; rx, ry = hand("rarm", ra)
    case = (f'<rect x="{rx - 45:.0f}" y="{ry + 10:.0f}" width="90" height="52" rx="8" fill="#7A4A2A" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M{rx - 16:.0f},{ry + 10:.0f} v-12 h32 v12" fill="none" stroke="{INK}" stroke-width="5"/><rect x="{rx - 45:.0f}" y="{ry + 30:.0f}" width="90" height="7" fill="#C9A227"/>')
    p, _ = PR.chibi(dict(coat="#22306E", pants="#1A1A1E", rarm=ra, larm=la, face="smile", hat="top", band="#7A1F1F", tie="#B22234", beard="chops", beard_c="#8A5A3A"))
    save("toff.svg", svg(300, 520, f'<g transform="translate(0,80)">{"".join(p)}{case}{handdot(rx, ry)}</g>'))
    p, _ = PR.chibi(dict(coat="#22306E", pants="#1A1A1E", rarm=-35, larm=-145, face="smile", hat="top", band="#7A1F1F", tie="#B22234", beard="chops", beard_c="#8A5A3A"))
    save("toff_cheer.svg", svg(300, 520, f'<g transform="translate(0,80)">{"".join(p)}</g>'))
    # factory worker: flat cap, sooty face, coughing (hand to mouth)
    for name, face, ra, la in (("worker", "flat", 60, 120), ("worker_cough", "panic", -70, 120)):
        p, hands = PR.chibi(dict(coat="#5B6E7A", pants="#3A3A40", rarm=ra, larm=la, face=face, stressed=True, sweat=face == "panic"))
        top = handdot(*hand("rarm", ra)) if name == "worker_cough" else ""
        save(f"{name}.svg", svg(300, 520, f'<g transform="translate(0,80)">{"".join(p)}{FLATCAP}{SOOT}{top}</g>'))
    # campfire sitter (generic camper in a beanie)
    p, _ = PR.chibi(dict(coat="#2E7D32", pants="#3A3A40", rarm=-30, larm=-150, face="panic", stressed=True))
    save("camper_panic.svg", svg(300, 520, f'<g transform="translate(0,80)">{"".join(p)}</g>'))
    print(sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
