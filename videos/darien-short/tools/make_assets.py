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


HARDHAT = (f'<path d="M{CX - HR * 1.05:.0f},{HY - HR * 0.35:.0f} Q{CX - HR:.0f},{HY - HR * 1.35:.0f} {CX:.0f},{HY - HR * 1.35:.0f} Q{CX + HR:.0f},{HY - HR * 1.35:.0f} {CX + HR * 1.05:.0f},{HY - HR * 0.35:.0f} Z" fill="#F4C430" stroke="{INK}" stroke-width="5"/>'
           f'<rect x="{CX - HR * 1.3:.0f}" y="{HY - HR * 0.45:.0f}" width="{HR * 2.6:.0f}" height="{HR * 0.2:.0f}" rx="6" fill="#F4C430" stroke="{INK}" stroke-width="4"/>')
CAP = (f'<path d="M{CX - HR * 0.98:.0f},{HY - HR * 0.4:.0f} Q{CX - HR:.0f},{HY - HR * 1.25:.0f} {CX:.0f},{HY - HR * 1.25:.0f} Q{CX + HR:.0f},{HY - HR * 1.25:.0f} {CX + HR * 0.98:.0f},{HY - HR * 0.4:.0f} Z" fill="#2E7D32" stroke="{INK}" stroke-width="5"/>'
       f'<path d="M{CX + HR * 0.4:.0f},{HY - HR * 0.48:.0f} L{CX + HR * 1.55:.0f},{HY - HR * 0.42:.0f} L{CX + HR * 0.9:.0f},{HY - HR * 0.6:.0f} Z" fill="#2E7D32" stroke="{INK}" stroke-width="4"/>')


def main():
    # road-tripper in a yellow convertible: head + shades over the door, both hands on the wheel (drawn last)
    hy, hr = 120, 52
    car = (f'<ellipse cx="200" cy="268" rx="170" ry="12" fill="#000" opacity="0.22"/>'
           f'<path d="M30,200 Q34,160 90,156 L150,150 Q170,118 230,116 L300,120 Q350,150 372,170 Q385,200 372,232 L40,232 Q26,220 30,200 Z" fill="#FFD43B" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
           f'<path d="M232,118 L250,80" stroke="{INK}" stroke-width="7"/><path d="M250,80 L262,120" stroke="#9ED0E6" stroke-width="10" opacity="0.8"/>'
           f'<circle cx="{150}" cy="{hy}" r="{hr}" fill="{SKIN}" stroke="{INK}" stroke-width="6"/>'
           f'<path d="M{150 - hr * 0.95:.0f},{hy - hr * 0.3:.0f} Q{150 - hr * 0.7:.0f},{hy - hr * 1.15:.0f} {150 + hr * 0.1:.0f},{hy - hr:.0f} Q{150 + hr * 0.85:.0f},{hy - hr * 1.05:.0f} {150 + hr * 0.95:.0f},{hy - hr * 0.3:.0f} Q{150 + hr * 0.4:.0f},{hy - hr * 0.62:.0f} {150 - hr * 0.95:.0f},{hy - hr * 0.3:.0f} Z" fill="#3A2614" stroke="{INK}" stroke-width="4"/>'
           f'<path d="M{150 - hr * 0.85:.0f},{hy - 8} H{150 + hr * 0.85:.0f}" stroke="{INK}" stroke-width="5"/><rect x="{150 - hr * 0.8:.0f}" y="{hy - 12}" width="{hr * 0.68:.0f}" height="{hr * 0.36:.0f}" rx="6" fill="#111"/><rect x="{150 + hr * 0.12:.0f}" y="{hy - 12}" width="{hr * 0.68:.0f}" height="{hr * 0.36:.0f}" rx="6" fill="#111"/>'
           f'<path d="M{150 - 18},{hy + 22} Q150,{hy + 34} {150 + 18},{hy + 22}" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>'
           f'<rect x="60" y="176" width="300" height="12" fill="#F4A300" opacity="0.6"/>'
           + "".join(f'<circle cx="{x}" cy="232" r="34" fill="#2B2B33" stroke="{INK}" stroke-width="6"/><circle cx="{x}" cy="232" r="13" fill="#C0C0C0"/>' for x in (95, 300))
           + f'<line x1="244" y1="180" x2="250" y2="150" stroke="{INK}" stroke-width="8"/><ellipse cx="250" cy="146" rx="12" ry="26" fill="none" stroke="{INK}" stroke-width="7"/>'
           + f'<line x1="172" y1="170" x2="242" y2="150" stroke="#E07A5F" stroke-width="16" stroke-linecap="round"/>'
           + f'<circle cx="246" cy="128" r="13" fill="{SKIN}" stroke="{INK}" stroke-width="4"/><circle cx="252" cy="164" r="13" fill="{SKIN}" stroke="{INK}" stroke-width="4"/>')
    save("car.svg", svg(400, 280, car))
    person("engineer.svg", dict(coat="#F4A300", pants="#3D5A80", face="panic", sweat=True, stressed=True, rarm=-40, larm=-140), top=HARDHAT)
    person("inspector.svg", dict(coat="#F4F1EA", pants="#2B2B33", face="flat", stressed=True, rarm=-20, larm=110), top=CAP,
           front=lambda h: f'<rect x="{h["larm"][0] - 34:.0f}" y="{h["larm"][1] - 50:.0f}" width="68" height="90" rx="6" fill="#B8935A" stroke="{INK}" stroke-width="4"/><rect x="{h["larm"][0] - 26:.0f}" y="{h["larm"][1] - 40:.0f}" width="52" height="70" fill="#FFF" stroke="{INK}" stroke-width="2"/>'
                         + "".join(f'<line x1="{h["larm"][0] - 18:.0f}" y1="{h["larm"][1] - 28 + i * 14:.0f}" x2="{h["larm"][0] + 18:.0f}" y2="{h["larm"][1] - 28 + i * 14:.0f}" stroke="#999" stroke-width="3"/>' for i in range(4)), grip=("larm",))
    person("driller.svg", dict(coat="#3D5A80", pants="#2B2B33", face="smile", rarm=75, larm=105),
           front=lambda h: f'<rect x="{h["rarm"][0] - 34:.0f}" y="{h["rarm"][1] - 10:.0f}" width="40" height="64" rx="10" fill="#E63946" stroke="{INK}" stroke-width="4"/><rect x="{h["rarm"][0] - 20:.0f}" y="{h["rarm"][1] + 52:.0f}" width="12" height="34" fill="#9AA3AD" stroke="{INK}" stroke-width="3"/>', grip=("rarm", "larm"))
    person("panic.svg", dict(coat="#2A9D8F", pants="#2B2B33", face="panic", sweat=True, stressed=True, rarm=-30, larm=-150))
    doz = (f'<rect x="40" y="110" width="220" height="70" rx="10" fill="#F4C430" stroke="{INK}" stroke-width="6"/><rect x="150" y="50" width="90" height="70" rx="6" fill="#F4C430" stroke="{INK}" stroke-width="6"/><rect x="165" y="62" width="60" height="40" fill="#9ED0E6" stroke="{INK}" stroke-width="4"/>'
           f'<path d="M262,120 L300,110 L312,200 L262,190 Z" fill="#9AA3AD" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><rect x="30" y="175" width="240" height="50" rx="25" fill="#2B2B33" stroke="{INK}" stroke-width="6"/>'
           + "".join(f'<circle cx="{x}" cy="200" r="14" fill="#555"/>' for x in (60, 110, 160, 210, 250)))
    save("bulldozer.svg", svg(330, 240, doz))
    cargo = (f'<path d="M20,120 L380,120 L350,170 L50,170 Z" fill="#1F3B73" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><rect x="300" y="60" width="60" height="62" fill="#F4F1EA" stroke="{INK}" stroke-width="5"/><rect x="310" y="72" width="40" height="14" fill="#9ED0E6"/>'
             + "".join(f'<rect x="{50 + i * 48}" y="{80 + (i % 2) * 0}" width="46" height="40" fill="{c}" stroke="{INK}" stroke-width="4"/>' for i, c in enumerate(("#E63946", "#F4A300", "#2A9D8F", "#E63946", "#3A86FF"))))
    save("cargo.svg", svg(400, 190, cargo))
    virus = (f'<circle cx="80" cy="80" r="40" fill="#E63946" stroke="{INK}" stroke-width="5"/>'
             + "".join(f'<line x1="{80 + 40 * __import__("math").cos(a / 8 * 6.283):.0f}" y1="{80 + 40 * __import__("math").sin(a / 8 * 6.283):.0f}" x2="{80 + 66 * __import__("math").cos(a / 8 * 6.283):.0f}" y2="{80 + 66 * __import__("math").sin(a / 8 * 6.283):.0f}" stroke="{INK}" stroke-width="6"/><circle cx="{80 + 70 * __import__("math").cos(a / 8 * 6.283):.0f}" cy="{80 + 70 * __import__("math").sin(a / 8 * 6.283):.0f}" r="9" fill="#FF8A95" stroke="{INK}" stroke-width="4"/>' for a in range(8))
             + f'<circle cx="68" cy="72" r="8" fill="#FFF" opacity="0.7"/><circle cx="96" cy="94" r="6" fill="#7A0C08" opacity="0.6"/>')
    save("virus.svg", svg(160, 160, virus))
    cow = (f'<ellipse cx="110" cy="90" rx="80" ry="42" fill="#FFF" stroke="{INK}" stroke-width="5"/><path d="M70,70 q20,-14 30,10 q-10,20 -30,5 Z M130,95 q24,-10 30,10 q-14,18 -30,0 Z" fill="#2B2B33"/>'
           + "".join(f'<rect x="{x}" y="120" width="14" height="40" fill="#FFF" stroke="{INK}" stroke-width="4"/>' for x in (55, 80, 140, 165))
           + f'<ellipse cx="200" cy="72" rx="30" ry="26" fill="#FFF" stroke="{INK}" stroke-width="5"/><ellipse cx="216" cy="82" rx="16" ry="12" fill="#F4B6C2" stroke="{INK}" stroke-width="3"/><circle cx="196" cy="64" r="4" fill="{INK}"/><path d="M186,50 l-8,-14 M210,48 l8,-14" stroke="{INK}" stroke-width="5"/>')
    save("cow.svg", svg(240, 170, cow))
    sign = (f'<rect x="96" y="90" width="12" height="140" fill="#6B4423" stroke="{INK}" stroke-width="3"/><rect x="20" y="20" width="164" height="80" rx="10" fill="#1E8E3E" stroke="{INK}" stroke-width="5"/>'
            f'<text x="102" y="56" font-family="Montserrat, Arial" font-weight="800" font-size="30" fill="#FFF" text-anchor="middle">YAVIZA</text><text x="102" y="86" font-family="Montserrat, Arial" font-weight="800" font-size="18" fill="#FFF" text-anchor="middle">END OF ROAD</text>')
    save("yaviza.svg", svg(204, 240, sign))
    rr = (f'<ellipse cx="190" cy="232" rx="165" ry="10" fill="#000" opacity="0.22"/>'
          f'<path d="M30,200 L30,140 Q32,120 60,118 L110,116 L130,70 Q136,58 152,58 L300,58 Q318,58 322,74 L340,118 Q356,122 358,140 L360,200 Z" fill="#2F5D3A" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
          f'<path d="M140,76 L150,110 L222,110 L222,74 Z M236,74 L236,110 L318,110 L306,76 Z" fill="#9ED0E6" stroke="{INK}" stroke-width="5"/>'
          f'<rect x="30" y="150" width="330" height="16" fill="#E8D8B0"/><rect x="128" y="40" width="190" height="16" rx="4" fill="#5A3A1E" stroke="{INK}" stroke-width="4"/>'
          + "".join(f'<circle cx="{x}" cy="204" r="32" fill="#2B2B33" stroke="{INK}" stroke-width="6"/><circle cx="{x}" cy="204" r="12" fill="#9AA3AD"/>' for x in (95, 290)))
    save("rangerover.svg", svg(390, 250, rr))
    BUSH = (f'<ellipse cx="{CX}" cy="{HY - HR * 0.55:.0f}" rx="{HR * 1.45:.0f}" ry="{HR * 0.26:.0f}" fill="#5B6B3A" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M{CX - HR * 0.82:.0f},{HY - HR * 0.58:.0f} Q{CX - HR * 0.8:.0f},{HY - HR * 1.3:.0f} {CX:.0f},{HY - HR * 1.3:.0f} Q{CX + HR * 0.8:.0f},{HY - HR * 1.3:.0f} {CX + HR * 0.82:.0f},{HY - HR * 0.58:.0f} Z" fill="#5B6B3A" stroke="{INK}" stroke-width="5"/>')
    person("soldier.svg", dict(coat="#556B2F", pants="#4A5A2A", face="flat", stressed=True, sweat=True, rarm=-70, larm=110), top=BUSH,
           front=lambda h: f'<path d="M{h["rarm"][0]:.0f},{h["rarm"][1]:.0f} L{h["rarm"][0] + 26:.0f},{h["rarm"][1] - 120:.0f} L{h["rarm"][0] + 44:.0f},{h["rarm"][1] - 116:.0f} L{h["rarm"][0] + 14:.0f},{h["rarm"][1] + 6:.0f} Z" fill="#C0C8CC" stroke="{INK}" stroke-width="4"/><rect x="{h["rarm"][0] - 10:.0f}" y="{h["rarm"][1] - 4:.0f}" width="22" height="34" rx="5" fill="#5A3A1E" stroke="{INK}" stroke-width="3" transform="rotate(30 {h["rarm"][0]:.0f} {h["rarm"][1]:.0f})"/>', grip=("rarm",))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
