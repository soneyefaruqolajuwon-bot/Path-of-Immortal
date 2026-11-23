"""SVG kit for the Japan-islands short -> ../assets/*.svg
People acting for Japan wear the Japanese flag as a cape; the couch guy is just a person (no country), so no cape."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg = GM.PR, GM.INK, GM.svg
def save(n, c): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(c)
RED = "#BC002D"
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23


def flag_jpn(x, y, w, h):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFFFFF"/><circle cx="{x + w * 0.2}" cy="{y + h * 0.7}" r="{h * 0.17}" fill="{RED}"/>'


def hand(key, ang):
    side = -1 if key == "larm" else 1
    a = math.radians(ang)
    return CX + side * S * 0.13 + S * 0.22 * math.cos(a), FEET - S * 0.36 + S * 0.22 * math.sin(a)


def glasses(squint=False):
    g = "".join(f'<circle cx="{CX + sd * HR * 0.38:.0f}" cy="{HY:.0f}" r="{HR * 0.27:.0f}" fill="rgba(220,240,255,0.35)" stroke="{INK}" stroke-width="9"/>' for sd in (-1, 1))
    g += f'<path d="M{CX - HR * 0.12:.0f},{HY - 4:.0f} Q{CX},{HY - 14:.0f} {CX + HR * 0.12:.0f},{HY - 4:.0f}" stroke="{INK}" stroke-width="7" fill="none"/>'
    if squint:   # squinting eyes drawn over the dot eyes
        g += "".join(f'<rect x="{CX + sd * HR * 0.38 - HR * 0.2:.0f}" y="{HY - HR * 0.2:.0f}" width="{HR * 0.4:.0f}" height="{HR * 0.4:.0f}" fill="#F2C9A0"/>'
                     f'<path d="M{CX + sd * HR * 0.38 - HR * 0.15:.0f},{HY:.0f} H{CX + sd * HR * 0.38 + HR * 0.15:.0f}" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>' for sd in (-1, 1))
    return g


def magnifier(x, y, ang, r=46):
    return (f'<g transform="translate({x:.0f},{y:.0f}) rotate({ang})"><rect x="-9" y="0" width="18" height="70" rx="8" fill="#6B4423" stroke="{INK}" stroke-width="5"/>'
            f'<circle cx="0" cy="{-r - 4}" r="{r}" fill="rgba(190,235,255,0.45)" stroke="#2B2B33" stroke-width="10"/>'
            f'<path d="M-20,{-r - 22} q12,-12 26,-10" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/></g>')


def ruler(x, y, ang):
    ticks = "".join(f'<line x1="{-80 + i * 16}" y1="-11" x2="{-80 + i * 16}" y2="{-3 if i % 2 else 2}" stroke="{INK}" stroke-width="3"/>' for i in range(11))
    return f'<g transform="translate({x:.0f},{y:.0f}) rotate({ang})"><rect x="-90" y="-12" width="180" height="24" rx="3" fill="#E7C27A" stroke="{INK}" stroke-width="5"/>{ticks}</g>'


def rubber_stamp(x, y, ang):
    return (f'<g transform="translate({x:.0f},{y:.0f}) rotate({ang})"><rect x="-14" y="-70" width="28" height="56" rx="10" fill="#7A4A2A" stroke="{INK}" stroke-width="5"/>'
            f'<ellipse cx="0" cy="-74" rx="24" ry="16" fill="#7A4A2A" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="-40" y="-16" width="80" height="26" rx="4" fill="#D7263D" stroke="{INK}" stroke-width="5"/></g>')


def tablet(x, y, ang, glow=True):
    lines = "".join(f'<line x1="-46" y1="{-30 + i * 15}" x2="46" y2="{-30 + i * 15}" stroke="rgba(37,227,255,0.5)" stroke-width="2"/>' for i in range(5))
    return (f'<g transform="translate({x:.0f},{y:.0f}) rotate({ang})">' + (f'<rect x="-80" y="-64" width="160" height="118" rx="26" fill="#25E3FF" opacity="0.28"/>' if glow else "")
            + f'<rect x="-62" y="-46" width="124" height="84" rx="12" fill="#1A1A1A" stroke="{INK}" stroke-width="5"/><rect x="-52" y="-37" width="104" height="66" rx="5" fill="#0B3340"/>'
            f'{lines}<circle cx="-14" cy="-4" r="22" fill="none" stroke="#25E3FF" stroke-width="3"/><path d="M-14,-4 L6,-18" stroke="#2EFF8C" stroke-width="4"/>'
            f'<circle cx="18" cy="8" r="4" fill="#F4D03F"/><circle cx="-30" cy="14" r="3" fill="#F4D03F"/><circle cx="28" cy="-16" r="3" fill="#F4D03F"/></g>')


HEADSET = (f'<path d="M{CX - HR * 1.02:.0f},{HY:.0f} Q{CX - HR * 1.05:.0f},{HY - HR * 1.35:.0f} {CX},{HY - HR * 1.15:.0f} Q{CX + HR * 1.05:.0f},{HY - HR * 1.35:.0f} {CX + HR * 1.02:.0f},{HY:.0f}" stroke="{INK}" stroke-width="12" fill="none"/>'
           + "".join(f'<rect x="{CX + sd * HR * 1.02 - 17:.0f}" y="{HY - 28:.0f}" width="34" height="56" rx="14" fill="#2B2B33" stroke="{INK}" stroke-width="5"/>' for sd in (-1, 1))
           + f'<path d="M{CX - HR * 1.0:.0f},{HY + 18:.0f} Q{CX - HR * 0.8:.0f},{HY + HR * 0.75:.0f} {CX - HR * 0.25:.0f},{HY + HR * 0.62:.0f}" stroke="{INK}" stroke-width="6" fill="none"/>'
           f'<circle cx="{CX - HR * 0.25:.0f}" cy="{HY + HR * 0.62:.0f}" r="9" fill="#25E3FF" stroke="{INK}" stroke-width="4"/>')
HAIR = f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX - HR * 0.7:.0f},{HY - HR * 1.15:.0f} {CX + HR * 0.1:.0f},{HY - HR * 1.0:.0f} Q{CX + HR * 0.85:.0f},{HY - HR * 1.05:.0f} {CX + HR * 0.95:.0f},{HY - HR * 0.3:.0f} Q{CX + HR * 0.4:.0f},{HY - HR * 0.62:.0f} {CX - HR * 0.95:.0f},{HY - HR * 0.3:.0f} Z" fill="#1E1E24" stroke="{INK}" stroke-width="4"/>'
BOWL = f'<path d="M{CX - HR * 1.0:.0f},{HY - HR * 0.1:.0f} Q{CX - HR * 1.0:.0f},{HY - HR * 1.15:.0f} {CX},{HY - HR * 1.12:.0f} Q{CX + HR * 1.0:.0f},{HY - HR * 1.15:.0f} {CX + HR * 1.0:.0f},{HY - HR * 0.1:.0f} L{CX + HR * 0.8:.0f},{HY - HR * 0.45:.0f} L{CX - HR * 0.8:.0f},{HY - HR * 0.45:.0f} Z" fill="#3A3A3A" stroke="{INK}" stroke-width="4"/>'


BADGE = f'<circle cx="{CX + 30:.0f}" cy="{FEET - S * 0.38:.0f}" r="13" fill="#fff" stroke="{INK}" stroke-width="3"/><circle cx="{CX + 30:.0f}" cy="{FEET - S * 0.38:.0f}" r="6" fill="{RED}"/>'


def person(name, o, extra=""):
    GM.caped_person(name, flag_jpn, o, arms_extra=BADGE + extra)


def main():
    old = dict(coat="#8A7A55", pants="#4A4236", tie=RED)            # 1987 survey office: khaki jacket, round glasses, bowl cut
    pose = dict(squint=(dict(rarm=-75, larm=110, face="flat"), True), stamp=(dict(rarm=-62, larm=100, face="flat"), False),
                shrug=(dict(rarm=-30, larm=-150, face="flat"), False), shock=(dict(rarm=-60, larm=-120, face="panic", stressed=True, sweat=True), False),
                idle=(dict(rarm=40, larm=110, face="smile"), False))
    for nm, (o, sq) in pose.items():
        rx, ry = hand("rarm", o["rarm"]); lx, ly = hand("larm", o["larm"])
        props = ""
        if nm == "squint": props = magnifier(rx, ry, -20, 60) + ruler(lx, ly, 25)
        if nm == "stamp": props = rubber_stamp(rx, ry, 10) + ruler(lx, ly, 25)
        if nm == "shrug": props = ruler(lx, ly, 70)
        if nm == "idle": props = magnifier(rx, ry, 25, 40) + ruler(lx, ly, 25)
        person(f"surveyor_{nm}", dict(old, **o), BOWL + glasses(sq) + props)
    new = dict(coat="#1F3A5F", pants="#1C1C24", tie="#25E3FF")
    for nm, o in dict(tap=dict(rarm=150, larm=30, face="smile"), point=dict(rarm=-50, larm=100, face="smile"), proud=dict(rarm=-55, larm=110, face="smile")).items():
        rx, ry = hand("rarm", o["rarm"]); lx, ly = hand("larm", o["larm"])
        props = tablet((rx + lx) / 2, (ry + ly) / 2 - 30, -5) if nm == "tap" else tablet(lx, ly - 20, -15)
        person(f"carto_{nm}", dict(new, **o), HAIR + HEADSET + props)
    # couch guy (ordinary person, hoodie + flashlight)
    for nm, o in dict(lift=dict(rarm=10, larm=-110), look=dict(rarm=20, larm=-120, face="panic", stressed=True)).items():
        p, hands = PR.chibi(dict(coat="#C0504D", pants="#2B3A55", face=o.get("face", "smile"), stressed=o.get("stressed", False), **{k: o[k] for k in ("rarm", "larm")}))
        hx, hy = hands["rarm"]
        light = (f'<g transform="translate({hx:.0f},{hy:.0f}) rotate(20)"><rect x="-14" y="-10" width="64" height="24" rx="6" fill="#3A3A40" stroke="{INK}" stroke-width="5"/>'
                 f'<rect x="46" y="-16" width="20" height="36" rx="4" fill="#9AA3AE" stroke="{INK}" stroke-width="5"/></g>')
        save(f"couchguy_{nm}.svg", svg(300, 520, f'<g transform="translate(0,80)">{"".join(p)}{HAIR}{light}</g>'))
    save("couch.svg", svg(760, 360,
         f'<rect x="20" y="40" width="720" height="170" rx="40" fill="#6C4A8C" stroke="{INK}" stroke-width="8"/>'
         f'<rect x="10" y="150" width="120" height="170" rx="36" fill="#7D58A0" stroke="{INK}" stroke-width="8"/><rect x="630" y="150" width="120" height="170" rx="36" fill="#7D58A0" stroke="{INK}" stroke-width="8"/>'
         f'<rect x="110" y="210" width="540" height="110" rx="12" fill="#5A3C76" stroke="{INK}" stroke-width="8"/>'
         f'<rect x="60" y="316" width="24" height="34" fill="{INK}"/><rect x="676" y="316" width="24" height="34" fill="{INK}"/>'))
    save("cushion.svg", svg(300, 110, f'<rect x="8" y="8" width="284" height="94" rx="34" fill="#8E66B4" stroke="{INK}" stroke-width="8"/><path d="M60,55 H240" stroke="#6C4A8C" stroke-width="5" stroke-dasharray="14 10"/>'))
    save("tokyo_tower.svg", svg(120, 220,
         f'<path d="M60,6 L64,60 L84,130 L112,214 L86,214 L60,150 L34,214 L8,214 L36,130 L56,60 Z" fill="#E8532F" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
         f'<rect x="38" y="118" width="44" height="16" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/><rect x="48" y="70" width="24" height="12" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/>'))
    save("coin.svg", svg(80, 80, f'<circle cx="40" cy="40" r="34" fill="#F4D03F" stroke="#8A6A10" stroke-width="6"/><circle cx="40" cy="40" r="22" fill="none" stroke="#C9A227" stroke-width="4"/><path d="M26,24 q8,-8 18,-6" stroke="#FFF6C8" stroke-width="5" fill="none" stroke-linecap="round"/>'))
    save("magnifier.svg", svg(140, 200, magnifier(70, 110, 0, 52)))
    print(len([f for f in os.listdir(OUT) if f.endswith(".svg")]), "assets")


if __name__ == "__main__":
    main()
