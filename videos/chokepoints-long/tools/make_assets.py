"""SVG kit for the chokepoints long-form: countries that act are people in flag capes (house rule); hands on top of props."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK = GM.PR, GM.INK
star_pts = PR.star_pts
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
SKIN = "#F2C9A0"
def hand(key, a):
    side = -1 if key == "larm" else 1
    return CX + side * S * 0.13 + S * 0.22 * math.cos(math.radians(a)), FEET - S * 0.36 + S * 0.22 * math.sin(math.radians(a))
def handdot(x, y): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{S * 0.04:.1f}" fill="{SKIN}" stroke="{INK}" stroke-width="4"/>'
def flag_tur(x, y, w, h):
    cx, cy, r = x + w * 0.4, y + h * 0.5, h * 0.25
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#E30A17"/><circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="#FFF"/><circle cx="{cx + r * 0.25:.0f}" cy="{cy:.0f}" r="{r * 0.8:.0f}" fill="#E30A17"/>'
            f'<polygon points="{star_pts(cx + r * 1.15, cy, r * 0.35)}" fill="#FFF"/>')
def flag_pan(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFF"/><rect x="{x + w / 2}" y="{y}" width="{w / 2}" height="{h / 2}" fill="#DA121A"/><rect x="{x}" y="{y + h / 2}" width="{w / 2}" height="{h / 2}" fill="#072357"/>'
            f'<polygon points="{star_pts(x + w * 0.25, y + h * 0.25, h * 0.1)}" fill="#072357"/><polygon points="{star_pts(x + w * 0.75, y + h * 0.75, h * 0.1)}" fill="#DA121A"/>')
def flag_irn(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h / 3:.1f}" fill="#239F40"/><rect x="{x}" y="{y + h / 3:.1f}" width="{w}" height="{h / 3 + 0.5:.1f}" fill="#FFF"/>'
            f'<rect x="{x}" y="{y + 2 * h / 3:.1f}" width="{w}" height="{h / 3 + 0.5:.1f}" fill="#DA0000"/><circle cx="{x + w / 2:.0f}" cy="{y + h / 2:.0f}" r="{h * 0.08:.0f}" fill="#DA0000"/>')
def flag_egy(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h / 3:.1f}" fill="#CE1126"/><rect x="{x}" y="{y + h / 3:.1f}" width="{w}" height="{h / 3 + 0.5:.1f}" fill="#FFF"/>'
            f'<rect x="{x}" y="{y + 2 * h / 3:.1f}" width="{w}" height="{h / 3 + 0.5:.1f}" fill="#000"/><circle cx="{x + w / 2:.0f}" cy="{y + h / 2:.0f}" r="{h * 0.09:.0f}" fill="#C09300"/>')
CAP = (f'<path d="M{CX - HR * 0.98:.0f},{HY - HR * 0.4:.0f} Q{CX - HR:.0f},{HY - HR * 1.25:.0f} {CX:.0f},{HY - HR * 1.25:.0f} Q{CX + HR:.0f},{HY - HR * 1.25:.0f} {CX + HR * 0.98:.0f},{HY - HR * 0.4:.0f} Z" fill="#F4F1EA" stroke="{INK}" stroke-width="5"/>'
       f'<path d="M{CX + HR * 0.4:.0f},{HY - HR * 0.48:.0f} L{CX + HR * 1.55:.0f},{HY - HR * 0.42:.0f} L{CX + HR * 0.9:.0f},{HY - HR * 0.6:.0f} Z" fill="#1F3B73" stroke="{INK}" stroke-width="4"/>')


def main():
    os.makedirs(OUT, exist_ok=True)
    # Turkey holding the key to the Black Sea (hand on the key)
    ra = -70; rx, ry = hand("rarm", ra)
    keysvg = (f'<circle cx="{rx + 20:.0f}" cy="{ry - 46:.0f}" r="22" fill="#F4D03F" stroke="{INK}" stroke-width="5"/><circle cx="{rx + 20:.0f}" cy="{ry - 46:.0f}" r="8" fill="{INK}"/>'
              f'<rect x="{rx + 14:.0f}" y="{ry - 26:.0f}" width="12" height="44" fill="#F4D03F" stroke="{INK}" stroke-width="4"/>')
    GM.caped_person("turkey_key", flag_tur, dict(coat="#8B1E1E", pants="#2B2B33", rarm=ra, larm=120, face="smile"), arms_extra=CAP + keysvg + handdot(rx, ry))
    # Panama holding a LOW WATER sign (both hands on the sign)
    ra, la = 30, 150; rx, ry = hand("rarm", ra); lx, ly = hand("larm", la)
    sign = (f'<rect x="{lx - 10:.0f}" y="{ly - 50:.0f}" width="{rx - lx + 20:.0f}" height="80" rx="8" fill="#FFF" stroke="#1E6FA8" stroke-width="8"/>'
            f'<text x="{(lx + rx) / 2:.0f}" y="{ly + 4:.0f}" font-family="Montserrat, Arial" font-weight="800" font-size="34" fill="#1E6FA8" text-anchor="middle">LOW WATER</text>')
    GM.caped_person("panama_sign", flag_pan, dict(coat="#072357", pants="#2B2B33", rarm=ra, larm=la, face="panic", sweat=True), arms_extra=CAP + sign + handdot(lx, ly) + handdot(rx, ry))
    # Iran lowering a barrier gate (hand on the pole)
    ra = -20; rx, ry = hand("rarm", ra)
    gate = f'<rect x="{rx - 10:.0f}" y="{ry - 16:.0f}" width="150" height="26" rx="6" fill="#FFF" stroke="{INK}" stroke-width="5"/>' + "".join(f'<rect x="{rx + 6 + i * 36:.0f}" y="{ry - 16:.0f}" width="18" height="26" fill="#D7263D"/>' for i in range(4))
    GM.caped_person("iran_gate", flag_irn, dict(coat="#1B4D2E", pants="#2B2B33", rarm=ra, larm=120, face="flat"), arms_extra=CAP)
    GM.caped_person("egypt_panic", flag_egy, dict(coat="#1F3B73", pants="#2B2B33", rarm=-35, larm=-145, face="panic"), arms_extra=CAP)
    print(sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
