"""SVG kit for the Canada lakes short -> ../assets/*.svg
Canada is a person in a Canadian-flag cape (house rule); every held prop gets its hand redrawn on top."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg = GM.PR, GM.INK, GM.svg
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
SKIN = "#F2C9A0"; WATER = "#3FA9E0"


def hand(key, a):
    side = -1 if key == "larm" else 1
    sx, sy = CX + side * S * 0.13, FEET - S * 0.36
    return sx + S * 0.22 * math.cos(math.radians(a)), sy + S * 0.22 * math.sin(math.radians(a))


def handdot(x, y): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{S * 0.04:.1f}" fill="{SKIN}" stroke="{INK}" stroke-width="4"/>'


TOQUE = (f'<path d="M{CX - HR * 1.0:.0f},{HY - HR * 0.35:.0f} Q{CX - HR * 1.0:.0f},{HY - HR * 1.45:.0f} {CX:.0f},{HY - HR * 1.45:.0f} Q{CX + HR * 1.0:.0f},{HY - HR * 1.45:.0f} {CX + HR * 1.0:.0f},{HY - HR * 0.35:.0f} Z" fill="#D52B1E" stroke="{INK}" stroke-width="5"/>'
         f'<path d="M{CX - HR * 0.92:.0f},{HY - HR * 0.95:.0f} H{CX + HR * 0.92:.0f}" stroke="#FFFFFF" stroke-width="12"/>'
         f'<rect x="{CX - HR * 1.08:.0f}" y="{HY - HR * 0.62:.0f}" width="{HR * 2.16:.0f}" height="{HR * 0.34:.0f}" rx="10" fill="#A61B12" stroke="{INK}" stroke-width="5"/>'
         f'<circle cx="{CX}" cy="{HY - HR * 1.5:.0f}" r="{HR * 0.24:.0f}" fill="#D52B1E" stroke="{INK}" stroke-width="5"/>')


def bucket(x, y, w=150, h=120):
    wave = " ".join(f"Q{x - w / 2 + (i + .5) * w / 6:.0f},{y - 22 - (i % 2) * 14:.0f} {x - w / 2 + (i + 1) * w / 6:.0f},{y - 10:.0f}" for i in range(6))
    spill = (f'<path d="M{x + w / 2 - 6:.0f},{y - 8:.0f} q30,10 26,60 q-2,20 10,40" stroke="{WATER}" stroke-width="16" fill="none" stroke-linecap="round"/>'
             f'<path d="M{x - w / 2 + 6:.0f},{y - 8:.0f} q-26,16 -22,56" stroke="{WATER}" stroke-width="13" fill="none" stroke-linecap="round"/>')
    return (spill + f'<path d="M{x - w / 2:.0f},{y:.0f} L{x + w / 2:.0f},{y:.0f} L{x + w * 0.38:.0f},{y + h:.0f} L{x - w * 0.38:.0f},{y + h:.0f} Z" fill="#9AA3AD" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
            f'<path d="M{x - w / 2:.0f},{y - 10:.0f} {wave} L{x + w / 2:.0f},{y + 6:.0f} L{x - w / 2:.0f},{y + 6:.0f} Z" fill="{WATER}" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="{x - w * 0.42:.0f}" y="{y + h * 0.38:.0f}" width="{w * 0.84:.0f}" height="{h * 0.16:.0f}" fill="#7A838C"/>')


def main():
    os.makedirs(OUT, exist_ok=True)
    # Canada holding an overflowing bucket of lakes (both hands on the rim, drawn on top)
    ra, la = 12, 168
    (lx, ly), (rx, ry) = hand("larm", la), hand("rarm", ra)
    GM.caped_person("canadian_bucket", PR.flag_ca, dict(coat="#D52B1E", pants="#2B2B33", rarm=ra, larm=la, face="smile"),
                    arms_extra=TOQUE + bucket(CX, (ly + ry) / 2 - 4, 270, 110) + handdot(lx, ly) + handdot(rx, ry))
    # Canada shocked (arms up, hands clear of the head)
    GM.caped_person("canadian_shock", PR.flag_ca, dict(coat="#D52B1E", pants="#2B2B33", rarm=-35, larm=-145, face="panic"), arms_extra=TOQUE)
    # Canada paddling a canoe: paddle diagonal, both hands on the shaft, canoe hides the legs
    ra, la = 40, 200
    (lx, ly), (rx, ry) = hand("larm", la), hand("rarm", ra)
    dx, dy = rx - lx, ry - ly; n = math.hypot(dx, dy); ux, uy = dx / n, dy / n
    p0, p1 = (lx - ux * 10, ly - uy * 10 - 6), (rx + ux * 10 - 4, ry + uy * 10 + 70)
    paddle = (f'<line x1="{p0[0]:.0f}" y1="{p0[1]:.0f}" x2="{p1[0]:.0f}" y2="{p1[1]:.0f}" stroke="{INK}" stroke-width="16" stroke-linecap="round"/>'
              f'<line x1="{p0[0]:.0f}" y1="{p0[1]:.0f}" x2="{p1[0]:.0f}" y2="{p1[1]:.0f}" stroke="#C68B4E" stroke-width="9" stroke-linecap="round"/>'
              f'<ellipse cx="{p1[0]:.0f}" cy="{p1[1]:.0f}" rx="20" ry="46" fill="#C68B4E" stroke="{INK}" stroke-width="5" transform="rotate(-40 {p1[0]:.0f} {p1[1]:.0f})"/>')
    canoe = (f'<path d="M6,{FEET - 120} Q150,{FEET - 90} 294,{FEET - 120} Q286,{FEET - 30} 150,{FEET - 20} Q14,{FEET - 30} 6,{FEET - 120} Z" fill="#B5542B" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
             f'<path d="M16,{FEET - 108} Q150,{FEET - 80} 284,{FEET - 108}" stroke="#E8B04A" stroke-width="8" fill="none"/>')
    GM.caped_person("canadian_canoe", PR.flag_ca, dict(coat="#D52B1E", pants="#2B2B33", rarm=ra, larm=la, face="smile"),
                    arms_extra=TOQUE + canoe + paddle + handdot(lx, ly) + handdot(rx, ry))
    print(sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
