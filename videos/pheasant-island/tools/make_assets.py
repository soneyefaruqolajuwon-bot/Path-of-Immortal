"""SVG kit for the Pheasant Island short -> ../assets/*.svg
Countries act through caped people. Modern scenes use today's flags; the 1659–60 scenes use the flags of the time
(French royal banner with fleurs-de-lis; Spain's Cross of Burgundy) because the modern flags didn't exist yet."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg = GM.PR, GM.INK, GM.svg
def save(n, c): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(c)
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
SK = "#F2C9A0"


def hand(key, ang):
    side = -1 if key == "larm" else 1; a = math.radians(ang)
    return CX + side * S * 0.13 + S * 0.22 * math.cos(a), FEET - S * 0.36 + S * 0.22 * math.sin(a)


def flag_esp(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#AA151B"/><rect x="{x}" y="{y + h / 4}" width="{w}" height="{h / 2}" fill="#F1BF00"/>'
def flag_fra(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w / 3}" height="{h}" fill="#002395"/><rect x="{x + w / 3}" y="{y}" width="{w / 3}" height="{h}" fill="#FFFFFF"/><rect x="{x + 2 * w / 3}" y="{y}" width="{w / 3}" height="{h}" fill="#ED2939"/>'
def lis(x, y, s, col="#F4D03F"): return f'<path d="M{x},{y - s} q{s * 0.35},{s * 0.5} 0,{s * 1.2} q{-s * 0.35},{-s * 0.7} 0,{-s * 1.2} M{x - s * 0.7},{y} q{s * 0.4},{-s * 0.6} {s * 0.7},{0} q{-s * 0.4},{s * 0.5} {-s * 0.7},0 M{x + s * 0.7},{y} q{-s * 0.4},{-s * 0.6} {-s * 0.7},0 q{s * 0.4},{s * 0.5} {s * 0.7},0" fill="{col}"/><rect x="{x - s * 0.5}" y="{y + s * 0.15}" width="{s}" height="{s * 0.18}" fill="{col}"/>'
def flag_fra_royal(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#1F3A93"/>' + "".join(lis(x + w * fx, y + h * fy, h * 0.12) for fx, fy in ((0.2, 0.75), (0.5, 0.68), (0.8, 0.75)))
def flag_burgundy(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFFFFF"/><path d="M{x + w * 0.05},{y + h * 0.05} L{x + w * 0.95},{y + h * 0.95} M{x + w * 0.95},{y + h * 0.05} L{x + w * 0.05},{y + h * 0.95}" stroke="#C8102E" stroke-width="{h * 0.09}" stroke-linecap="round"/>'


NAVAL = (f'<ellipse cx="{CX}" cy="{HY - HR * 0.62:.0f}" rx="{HR * 1.15:.0f}" ry="{HR * 0.3:.0f}" fill="#FFFFFF" stroke="{INK}" stroke-width="5"/>'
         f'<rect x="{CX - HR * 0.9:.0f}" y="{HY - HR * 0.75:.0f}" width="{HR * 1.8:.0f}" height="{HR * 0.22:.0f}" fill="#1C2340" stroke="{INK}" stroke-width="4"/><path d="M{CX + HR * 0.1:.0f},{HY - HR * 0.55:.0f} h{HR * 0.95:.0f} l-{HR * 0.1:.0f},{HR * 0.16:.0f} h-{HR * 0.85:.0f} Z" fill="{INK}"/><circle cx="{CX}" cy="{HY - HR * 0.66:.0f}" r="9" fill="#F4D03F" stroke="{INK}" stroke-width="3"/>')
CROWN = f'<path d="M{CX - HR * 0.7:.0f},{HY - HR * 0.8:.0f} L{CX - HR * 0.8:.0f},{HY - HR * 1.45:.0f} L{CX - HR * 0.35:.0f},{HY - HR * 1.1:.0f} L{CX:.0f},{HY - HR * 1.6:.0f} L{CX + HR * 0.35:.0f},{HY - HR * 1.1:.0f} L{CX + HR * 0.8:.0f},{HY - HR * 1.45:.0f} L{CX + HR * 0.7:.0f},{HY - HR * 0.8:.0f} Z" fill="#F4D03F" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
WIG = "".join(f'<circle cx="{CX + dx * HR:.0f}" cy="{HY + dy * HR:.0f}" r="{HR * 0.3:.0f}" fill="#4A2E1C" stroke="{INK}" stroke-width="3"/>' for dx, dy in [(-0.95, -0.25), (-1.0, 0.2), (-0.95, 0.65), (0.95, -0.25), (1.0, 0.2), (0.95, 0.65)])
def key(x, y): return f'<g transform="translate({x:.0f},{y:.0f}) rotate(-30)"><circle cx="0" cy="-40" r="24" fill="#F4D03F" stroke="{INK}" stroke-width="6"/><circle cx="0" cy="-40" r="9" fill="#7A5A10"/><rect x="-7" y="-18" width="14" height="70" fill="#F4D03F" stroke="{INK}" stroke-width="5"/><rect x="7" y="34" width="18" height="10" fill="#F4D03F" stroke="{INK}" stroke-width="4"/></g>'
def scroll(x, y): return f'<g transform="translate({x:.0f},{y:.0f}) rotate(10)"><rect x="-40" y="-56" width="80" height="104" fill="#F4ECD6" stroke="{INK}" stroke-width="5"/>' + "".join(f'<rect x="-28" y="{-40 + i * 16}" width="56" height="5" fill="#B9AE96"/>' for i in range(5)) + '<circle cx="18" cy="38" r="9" fill="#C8102E"/></g>'


def main():
    for code, flag, coat in (("esp", flag_esp, "#1C2340"), ("fra", flag_fra, "#1C2340")):
        for nm, o in dict(stand=dict(rarm=40, larm=110, face="smile"), give=dict(rarm=-10, larm=110, face="smile"), wave=dict(rarm=-60, larm=110, face="smile")).items():
            rx, ry = hand("rarm", o["rarm"]); GM.caped_person(f"officer_{code}_{nm}", flag, dict(coat=coat, pants="#F4F1E6", head=SK, **o), arms_extra=NAVAL + (key(rx + 4, ry) if nm == "give" else ""))
    # 1659–60: diplomats, the king and the infanta, in the flags of the time
    rx, ry = hand("rarm", -20)
    GM.caped_person("dipl_fra", flag_fra_royal, dict(coat="#3B2A5A", pants="#2B2B33", head=SK, rarm=-20, larm=110, face="smile"), arms_extra=WIG + scroll(rx + 10, ry))
    GM.caped_person("dipl_esp", flag_burgundy, dict(coat="#1C1C20", pants="#2B2B33", head=SK, rarm=-20, larm=110, face="smile", beard="chin", beard_c="#3A2614"), arms_extra=WIG.replace("#4A2E1C", "#2A1E14") + scroll(rx + 10, ry))
    GM.caped_person("king_fra", flag_fra_royal, dict(coat="#1F3A93", pants="#F4F1E6", head=SK, rarm=-40, larm=110, face="smile"), arms_extra=WIG + CROWN)
    GM.caped_person("infanta_esp", flag_burgundy, dict(coat="#C8102E", pants="#2B2B33", head=SK, rarm=-140, larm=110, face="smile", hair_long=True, hair_c="#C9A06A", dress=True), arms_extra=CROWN)
    for code, fl in (("esp", flag_esp), ("fra", flag_fra), ("fra_royal", flag_fra_royal), ("burgundy", flag_burgundy)):
        save(f"flag_{code}.svg", svg(120, 80, fl(4, 4, 112, 72) + f'<rect x="4" y="4" width="112" height="72" fill="none" stroke="{INK}" stroke-width="4"/>'))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
