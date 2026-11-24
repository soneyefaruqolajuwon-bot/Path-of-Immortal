"""SVG kit for the one-clock short -> ../assets/*.svg
The government decision is shown by an official in the Chinese flag cape (house style); family and office workers are ordinary people (no cape)."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg, star_pts = GM.PR, GM.INK, GM.svg, GM.star_pts
def save(n, c): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(c)
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
SK, SK2 = "#F2C9A0", "#E3B48A"


def flag_chn(x, y, w, h):   # on the cape the star group sits on the visible left wing
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#DE2910"/>'; u = h / 20; ox, oy = x + w * 0.04, y + h * 0.35
    s += f'<polygon points="{star_pts(ox + 5 * u, oy + 5 * u, 3 * u)}" fill="#FFDE00"/>'
    for cx, cy in ((10, 2), (12, 4), (12, 7), (10, 9)): s += f'<polygon points="{star_pts(ox + cx * u, oy + cy * u, u)}" fill="#FFDE00"/>'
    return s


def hand(key, ang):
    side = -1 if key == "larm" else 1; a = math.radians(ang)
    return CX + side * S * 0.13 + S * 0.22 * math.cos(a), FEET - S * 0.36 + S * 0.22 * math.sin(a)


HAIR = f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX - HR * 0.7:.0f},{HY - HR * 1.15:.0f} {CX + HR * 0.1:.0f},{HY - HR * 1.0:.0f} Q{CX + HR * 0.85:.0f},{HY - HR * 1.05:.0f} {CX + HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX + HR * 0.4:.0f},{HY - HR * 0.62:.0f} {CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Z" fill="#1E1E24" stroke="{INK}" stroke-width="4"/>'
CLOSED = "".join(f'<rect x="{CX + sd * HR * 0.36 - HR * 0.18:.0f}" y="{HY - HR * 0.2:.0f}" width="{HR * 0.36:.0f}" height="{HR * 0.36:.0f}" fill="{SK}"/><path d="M{CX + sd * HR * 0.36 - HR * 0.14:.0f},{HY:.0f} q{HR * 0.14:.0f},{HR * 0.1:.0f} {HR * 0.28:.0f},0" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/>' for sd in (-1, 1))
NIGHTCAP = f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.4:.0f} Q{CX},{HY - HR * 1.4:.0f} {CX + HR * 0.95:.0f},{HY - HR * 0.4:.0f} L{CX + HR * 1.5:.0f},{HY + HR * 0.3:.0f} Z" fill="#5B6EE1" stroke="{INK}" stroke-width="5"/><circle cx="{CX + HR * 1.5:.0f}" cy="{HY + HR * 0.3:.0f}" r="14" fill="#fff" stroke="{INK}" stroke-width="4"/>'


def chibi(name, o, extra_front="", extra_back=""):
    p, hands = PR.chibi(o); save(name + ".svg", svg(300, 520, f'<g transform="translate(0,80)">{extra_back}{"".join(p)}{extra_front}</g>'))


def main():
    off = dict(coat="#2F3A2F", pants="#2F3A2F", head=SK2)
    for nm, o in dict(set=dict(rarm=-80, larm=-100, face="flat"), point=dict(rarm=-40, larm=110, face="smile"), proud=dict(rarm=-120, larm=110, face="smile")).items():
        GM.caped_person(f"official_{nm}", flag_chn, dict(off, **o), arms_extra=HAIR)
    # the family that shares one alarm clock, and the far-away cousin
    chibi("dad", dict(coat="#3E7CB1", pants="#2B2B33", head=SK2, rarm=-40, larm=110, face="smile"), HAIR)
    chibi("kid", dict(coat="#F4A261", pants="#264653", head=SK2, rarm=-60, larm=-120, face="smile"), HAIR)
    chibi("cousin_sleep", dict(coat="#8E7DBE", pants="#4A4E69", head=SK, rarm=30, larm=150, face="flat"), CLOSED + NIGHTCAP)
    chibi("cousin_shock", dict(coat="#8E7DBE", pants="#4A4E69", head=SK, rarm=-60, larm=-120, face="panic", stressed=True, sweat=True), NIGHTCAP)
    # office workers (no national costume: it's a story about clocks, not people)
    chibi("worker_a", dict(coat="#2A9D8F", pants="#264653", head=SK2, rarm=-40, larm=110, face="smile"), HAIR)
    chibi("worker_b", dict(coat="#E76F51", pants="#3D405B", head=SK, rarm=-120, larm=110, face="flat", stressed=True), HAIR)
    save("alarm.svg", svg(220, 230, f'<circle cx="60" cy="40" r="30" fill="#F4D03F" stroke="{INK}" stroke-width="6"/><circle cx="160" cy="40" r="30" fill="#F4D03F" stroke="{INK}" stroke-width="6"/>'
                                    f'<circle cx="110" cy="125" r="88" fill="#E63946" stroke="{INK}" stroke-width="8"/><circle cx="110" cy="125" r="66" fill="#FFFFFF" stroke="{INK}" stroke-width="5"/>'
                                    f'<line x1="110" y1="125" x2="110" y2="78" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><line x1="110" y1="125" x2="140" y2="140" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
                                    f'<line x1="50" y1="200" x2="30" y2="226" stroke="{INK}" stroke-width="8"/><line x1="170" y1="200" x2="190" y2="226" stroke="{INK}" stroke-width="8"/>'))
    save("school.svg", svg(320, 260, f'<rect x="30" y="90" width="260" height="160" fill="#EFE6D2" stroke="{INK}" stroke-width="7"/><path d="M14,96 L160,20 L306,96 Z" fill="#C0504D" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
                                     + "".join(f'<rect x="{50 + i * 62}" y="120" width="40" height="44" fill="#F7C46C" stroke="{INK}" stroke-width="4"/>' for i in range(4)) +
                                     f'<rect x="135" y="180" width="50" height="70" fill="#6B4423" stroke="{INK}" stroke-width="5"/><circle cx="160" cy="62" r="20" fill="#fff" stroke="{INK}" stroke-width="4"/>'
                                     f'<line x1="160" y1="62" x2="160" y2="48" stroke="{INK}" stroke-width="4"/><line x1="160" y1="62" x2="170" y2="66" stroke="{INK}" stroke-width="4"/>'))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
