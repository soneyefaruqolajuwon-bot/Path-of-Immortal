"""SVG kit for the Canada pair -> ../assets/*.svg
Sweden, Norway and Finland are shown as caped people (house style); the farmer, engineer and campers are ordinary people."""
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


def nordic(x, y, w, h, field, cross, inner=None):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{field}"/><rect x="{x + w * 0.3}" y="{y}" width="{w * 0.14}" height="{h}" fill="{cross}"/><rect x="{x}" y="{y + h * 0.43}" width="{w}" height="{h * 0.14}" fill="{cross}"/>'
    if inner: s += f'<rect x="{x + w * 0.33}" y="{y}" width="{w * 0.08}" height="{h}" fill="{inner}"/><rect x="{x}" y="{y + h * 0.46}" width="{w}" height="{h * 0.08}" fill="{inner}"/>'
    return s


BEANIE = (f'<path d="M{CX - HR * 0.98:.0f},{HY - HR * 0.25:.0f} Q{CX - HR * 0.95:.0f},{HY - HR * 1.25:.0f} {CX},{HY - HR * 1.22:.0f} Q{CX + HR * 0.95:.0f},{HY - HR * 1.25:.0f} {CX + HR * 0.98:.0f},{HY - HR * 0.25:.0f} Z" fill="#C0392B" stroke="{INK}" stroke-width="5"/>'
          f'<rect x="{CX - HR * 1.0:.0f}" y="{HY - HR * 0.45:.0f}" width="{HR * 2:.0f}" height="{HR * 0.26:.0f}" rx="6" fill="#8E2A20" stroke="{INK}" stroke-width="4"/><circle cx="{CX}" cy="{HY - HR * 1.3:.0f}" r="14" fill="#F4F1E6" stroke="{INK}" stroke-width="4"/>')
HARDHAT = (f'<path d="M{CX - HR * 1.0:.0f},{HY - HR * 0.35:.0f} Q{CX},{HY - HR * 1.45:.0f} {CX + HR * 1.0:.0f},{HY - HR * 0.35:.0f} Z" fill="#F4D03F" stroke="{INK}" stroke-width="5"/>'
           f'<rect x="{CX - HR * 1.25:.0f}" y="{HY - HR * 0.45:.0f}" width="{HR * 2.5:.0f}" height="{HR * 0.2:.0f}" rx="6" fill="#E0B22C" stroke="{INK}" stroke-width="4"/>')
PLAID = "".join(f'<line x1="{CX - S * 0.15:.0f}" y1="{FEET - S * 0.44 + i * 20:.0f}" x2="{CX + S * 0.15:.0f}" y2="{FEET - S * 0.44 + i * 20:.0f}" stroke="#1C1C20" stroke-width="5" opacity="0.6"/>' for i in range(5)) + "".join(f'<line x1="{CX + d:.0f}" y1="{FEET - S * 0.46:.0f}" x2="{CX + d * 1.3:.0f}" y2="{FEET - S * 0.15:.0f}" stroke="#1C1C20" stroke-width="5" opacity="0.6"/>' for d in (-25, 0, 25))


def handdot(x, y, col=SK): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{S * 0.04:.1f}" fill="{col}" stroke="{INK}" stroke-width="4"/>'


def chibi(name, o, front="", back="", grip=()):
    """grip: arm keys holding a prop; their hands are redrawn on top so the prop never hides them."""
    p, hands = PR.chibi(o); tops = "".join(handdot(*hands[k], o.get("head", SK)) for k in grip)
    save(name, svg(300, 520, f'<g transform="translate(0,80)">{back}{"".join(p)}{front}{tops}</g>')); return hands


def shovel(x, y, ang, bent=False):
    blade = '<path d="M-26,0 L26,0 L18,46 Q0,60 -18,46 Z" fill="#9AA3AE" stroke="#141416" stroke-width="5"/>' if not bent else '<path d="M-26,0 L26,0 L30,30 Q8,40 -20,20 Z" fill="#9AA3AE" stroke="#141416" stroke-width="5"/>'
    return f'<g transform="translate({x:.0f},{y:.0f}) rotate({ang})"><rect x="-6" y="-140" width="12" height="140" fill="#8B5E3C" stroke="{INK}" stroke-width="4"/>{blade}</g>'


def main():
    fl = dict(coat="#C0392B", pants="#2B3A55", head=SK)
    rx, ry = hand("rarm", 60); chibi("farmer_dig.svg", dict(fl, rarm=60, larm=120, face="smile"), PLAID + BEANIE + shovel(rx, ry, 10), grip=("rarm",))
    rx, ry = hand("rarm", -60); chibi("farmer_clang.svg", dict(fl, rarm=-60, larm=-120, face="panic", stressed=True, sweat=True), PLAID + BEANIE + shovel(rx, ry - 20, -30, True), grip=("rarm",))
    eng = dict(coat="#E67E22", pants="#2B2B33", head="#E3B48A")
    rx, ry = hand("rarm", -30); chibi("engineer_plan.svg", dict(eng, rarm=-30, larm=110, face="smile"), BEANIE.replace("#C0392B", "#00000000") * 0 + HARDHAT + f'<g transform="translate({rx:.0f},{ry:.0f}) rotate(-20)"><rect x="-60" y="-14" width="120" height="28" rx="14" fill="#5DADE2" stroke="{INK}" stroke-width="4"/></g>', grip=("rarm",))
    chibi("engineer_scratch.svg", dict(eng, rarm=-115, larm=110, face="flat", stressed=True, sweat=True), HARDHAT, grip=("rarm",))
    for code, flag in (("swe", lambda x, y, w, h: nordic(x, y, w, h, "#006AA7", "#FECC02")), ("nor", lambda x, y, w, h: nordic(x, y, w, h, "#BA0C2F", "#FFFFFF", "#00205B")), ("fin", lambda x, y, w, h: nordic(x, y, w, h, "#FFFFFF", "#002F6C"))):
        GM.caped_person(f"scandi_{code}", flag, dict(coat="#5B7DB1" if code == "swe" else "#8E2A20" if code == "nor" else "#3E6B4F", pants="#2B2B33", head=SK, rarm=-60, larm=110, face="smile"),
                        arms_extra=f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.35:.0f} Q{CX},{HY - HR * 1.4:.0f} {CX + HR * 0.95:.0f},{HY - HR * 0.35:.0f} Z" fill="#F4F1E6" stroke="{INK}" stroke-width="5"/>')
    for i, col in enumerate(("#2E86DE", "#27AE60")):
        hood = f'<path d="M{CX - HR * 1.15:.0f},{HY + HR * 0.4:.0f} Q{CX - HR * 1.3:.0f},{HY - HR * 1.35:.0f} {CX},{HY - HR * 1.3:.0f} Q{CX + HR * 1.3:.0f},{HY - HR * 1.35:.0f} {CX + HR * 1.15:.0f},{HY + HR * 0.4:.0f}" fill="none" stroke="{col}" stroke-width="22"/><path d="M{CX - HR * 1.2:.0f},{HY + HR * 0.35:.0f} Q{CX - HR * 1.35:.0f},{HY - HR * 1.4:.0f} {CX},{HY - HR * 1.36:.0f} Q{CX + HR * 1.35:.0f},{HY - HR * 1.4:.0f} {CX + HR * 1.2:.0f},{HY + HR * 0.35:.0f}" fill="none" stroke="#F4F1E6" stroke-width="8" stroke-dasharray="6 6"/>'
        chibi(f"camper_{i}.svg", dict(coat=col, pants="#2B2B33", head=SK, rarm=-10 if i else 30, larm=170 if i else 150, face="smile"), hood)
    save("house.svg", svg(120, 110, f'<rect x="14" y="44" width="92" height="60" fill="#EFE6D2" stroke="{INK}" stroke-width="5"/><path d="M6,48 L60,8 L114,48 Z" fill="#C0504D" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><rect x="50" y="66" width="20" height="38" fill="#6B4423"/><rect x="24" y="58" width="18" height="16" fill="#F7C46C" stroke="{INK}" stroke-width="3"/>'))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
