"""SVG kit for the Nvidia / Singapore loophole short -> ../assets/*.svg
Countries that act are people in flag capes (house rule); every held prop gets its hand redrawn on top.
The CEO is a generic chibi in a leather jacket; the former Megaspeed executive is never depicted."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg = GM.PR, GM.INK, GM.svg
star_pts = PR.star_pts
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
SKIN = "#F2C9A0"
def save(n, c): open(os.path.join(OUT, n), "w").write(c)


def hand(key, a):
    side = -1 if key == "larm" else 1
    return CX + side * S * 0.13 + S * 0.22 * math.cos(math.radians(a)), FEET - S * 0.36 + S * 0.22 * math.sin(math.radians(a))


def handdot(x, y): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{S * 0.04:.1f}" fill="{SKIN}" stroke="{INK}" stroke-width="4"/>'


def flag_us(x, y, w, h): return "".join(f'<rect x="{x}" y="{y + i * h / 13:.1f}" width="{w}" height="{h / 13 + 0.5:.1f}" fill="{"#B22234" if i % 2 == 0 else "#FFFFFF"}"/>' for i in range(13)) + f'<rect x="{x}" y="{y}" width="{w * 0.42:.0f}" height="{h * 7 / 13:.0f}" fill="#3C3B6E"/>'


def flag_chn(x, y, w, h):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#DE2910"/>'; u = h / 20; ox, oy = x + w * 0.04, y + h * 0.35
    s += f'<polygon points="{star_pts(ox + 5 * u, oy + 5 * u, 3 * u)}" fill="#FFDE00"/>'
    for cx, cy in ((10, 2), (12, 4), (12, 7), (10, 9)): s += f'<polygon points="{star_pts(ox + cx * u, oy + cy * u, u)}" fill="#FFDE00"/>'
    return s


HAIR = f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX - HR * 0.7:.0f},{HY - HR * 1.15:.0f} {CX + HR * 0.1:.0f},{HY - HR * 1.0:.0f} Q{CX + HR * 0.85:.0f},{HY - HR * 1.05:.0f} {CX + HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX + HR * 0.4:.0f},{HY - HR * 0.62:.0f} {CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Z" fill="#2B2B33" stroke="{INK}" stroke-width="4"/>'
GREY = HAIR.replace("#2B2B33", "#B9BCC2")


def stamp_prop(x, y, text, col="#D7263D", w=120):   # handle in the hand at (x, y), rubber block below it
    return (f'<rect x="{x - 12:.0f}" y="{y - 14:.0f}" width="24" height="40" rx="8" fill="#6B4423" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="{x - w / 2:.0f}" y="{y + 22:.0f}" width="{w}" height="46" rx="8" fill="{col}" stroke="{INK}" stroke-width="5"/>'
            f'<text x="{x:.0f}" y="{y + 54:.0f}" font-family="Montserrat, Arial" font-weight="800" font-size="30" fill="#FFF" text-anchor="middle">{text}</text>')


def main():
    os.makedirs(OUT, exist_ok=True)
    # America: officer in a dark suit + US-flag cape, raising a giant EXPORT BAN stamp
    ra, la = 35, 120; rx, ry = hand("rarm", ra); lx, ly = hand("larm", la)
    GM.caped_person("us_officer", flag_us, dict(coat="#1F2A44", pants="#1A1A1E", rarm=ra, larm=la, face="flat", tie="#B22234"),
                    arms_extra=HAIR + stamp_prop(min(rx, 236), ry, "BAN") + handdot(rx, ry))
    # America as investigator with a magnifying glass
    ra, la = -50, 120; rx, ry = hand("rarm", ra)
    mag = f'<line x1="{rx:.0f}" y1="{ry:.0f}" x2="{rx + 4:.0f}" y2="{ry - 40:.0f}" stroke="{INK}" stroke-width="12" stroke-linecap="round"/><circle cx="{rx + 8:.0f}" cy="{ry - 66:.0f}" r="28" fill="#BFE6F2" fill-opacity="0.6" stroke="{INK}" stroke-width="9"/>'
    GM.caped_person("us_investigator", flag_us, dict(coat="#1F2A44", pants="#1A1A1E", rarm=ra, larm=la, face="flat", stressed=True, tie="#B22234"),
                    arms_extra=HAIR + mag + handdot(rx, ry))
    # America as the door guard holding a BANNED sign in front (both hands on the sign)
    ra, la = 30, 150; rx, ry = hand("rarm", ra); lx, ly = hand("larm", la)
    sign = (f'<rect x="{lx - 10:.0f}" y="{ly - 50:.0f}" width="{rx - lx + 20:.0f}" height="80" rx="8" fill="#FFFFFF" stroke="#D7263D" stroke-width="8"/>'
            f'<text x="{(lx + rx) / 2:.0f}" y="{ly + 4:.0f}" font-family="Montserrat, Arial" font-weight="800" font-size="40" fill="#D7263D" text-anchor="middle">BANNED</text>')
    GM.caped_person("us_guard", flag_us, dict(coat="#1F2A44", pants="#1A1A1E", rarm=ra, larm=la, face="flat"), arms_extra=HAIR + sign + handdot(lx, ly) + handdot(rx, ry))
    # China reaching for the box (arms forward, hands visible)
    GM.caped_person("china_reach", flag_chn, dict(coat="#8B1E1E", pants="#2B2B33", rarm=-15, larm=-165, face="smile"), arms_extra=HAIR)
    # the neighbour passing a box of chips out of the window (box held up, hands on top)
    ra, la = 60, 120; rx, ry = hand("rarm", ra); lx, ly = hand("larm", la)
    box = (f'<rect x="{lx - 20:.0f}" y="{ry - 90:.0f}" width="{rx - lx + 40:.0f}" height="90" rx="8" fill="#C68B4E" stroke="{INK}" stroke-width="5"/>'
           f'<rect x="{(lx + rx) / 2 - 30:.0f}" y="{ry - 72:.0f}" width="60" height="50" rx="6" fill="#2B2B33" stroke="#F4D03F" stroke-width="4"/>'
           + "".join(f'<line x1="{(lx + rx) / 2 - 30 + i * 15:.0f}" y1="{ry - 78:.0f}" x2="{(lx + rx) / 2 - 30 + i * 15:.0f}" y2="{ry - 16:.0f}" stroke="#F4D03F" stroke-width="3"/>' for i in range(1, 4)))
    p, _ = PR.chibi(dict(coat="#2A9D8F", pants="#2B2B33", rarm=ra, larm=la, face="smile", shades=True))
    save("neighbour.svg", svg(300, 520, f'<g transform="translate(0,80)">{"".join(p)}{HAIR}{box}{handdot(lx, ly)}{handdot(rx, ry)}</g>'))
    # tech CEO: black leather jacket, grey hair, holding a glowing chip
    for name, face, ra, la in (("ceo", "smile", -50, 120), ("ceo_sad", "flat", 80, 100)):
        rx, ry = hand("rarm", ra)
        chipsvg = (f'<rect x="{rx - 26:.0f}" y="{ry - 60:.0f}" width="52" height="52" rx="6" fill="#2B2B33" stroke="#F4D03F" stroke-width="5"/>'
                   + "".join(f'<line x1="{rx - 34:.0f}" y1="{ry - 50 + i * 14:.0f}" x2="{rx + 34:.0f}" y2="{ry - 50 + i * 14:.0f}" stroke="#F4D03F" stroke-width="3"/>' for i in range(3))) if name == "ceo" else ""
        p, _ = PR.chibi(dict(coat="#1A1A1A", pants="#2B2B33", rarm=ra, larm=la, face=face, stressed=face == "flat"))
        collar = f'<path d="M{CX - 20},{FEET - S * 0.46:.0f} L{CX},{FEET - S * 0.38:.0f} L{CX + 20},{FEET - S * 0.46:.0f}" fill="#3A3A40" stroke="#555" stroke-width="3"/>'
        save(f"{name}.svg", svg(300, 520, f'<g transform="translate(0,80)">{"".join(p)}{GREY}{collar}{chipsvg}{handdot(rx, ry) if chipsvg else ""}</g>'))
    print(sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
