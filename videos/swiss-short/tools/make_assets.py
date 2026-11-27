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


def flag_che(x, y, w, h):
    cx, cy, a, b = x + w / 2, y + h / 2, min(w, h) * 0.12, min(w, h) * 0.38
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#DA291C"/><rect x="{cx - a:.0f}" y="{cy - b:.0f}" width="{2 * a:.0f}" height="{2 * b:.0f}" fill="#FFF"/><rect x="{cx - b:.0f}" y="{cy - a:.0f}" width="{2 * b:.0f}" height="{2 * a:.0f}" fill="#FFF"/>'
def flag_lie(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h / 2}" fill="#002B7F"/><rect x="{x}" y="{y + h / 2}" width="{w}" height="{h / 2}" fill="#CE1126"/>'
            f'<path d="M{x + w * 0.16:.0f},{y + h * 0.3:.0f} l6,-14 l8,10 l8,-14 l8,14 l8,-10 l6,14 Z" fill="#FFD83D" stroke="#141416" stroke-width="2"/>')
HELMET = (f'<path d="M{CX - HR * 1.08:.0f},{HY - HR * 0.28:.0f} Q{CX - HR * 1.05:.0f},{HY - HR * 1.32:.0f} {CX:.0f},{HY - HR * 1.32:.0f} Q{CX + HR * 1.05:.0f},{HY - HR * 1.32:.0f} {CX + HR * 1.08:.0f},{HY - HR * 0.28:.0f} Z" fill="#5B6B3A" stroke="{INK}" stroke-width="5"/>'
          f'<rect x="{CX - HR * 1.12:.0f}" y="{HY - HR * 0.36:.0f}" width="{HR * 2.24:.0f}" height="{HR * 0.16:.0f}" rx="6" fill="#4A5A2A" stroke="{INK}" stroke-width="4"/>')
def map_prop(h):   # a paper map held UPSIDE DOWN (the compass rose's N points down), hand drawn on top
    x, y = h["rarm"]
    return (f'<g transform="rotate(8 {x:.0f} {y:.0f})"><rect x="{x - 112:.0f}" y="{y - 30:.0f}" width="120" height="86" fill="#F3E3B5" stroke="{INK}" stroke-width="4"/>'
            f'<path d="M{x - 102:.0f},{y + 10:.0f} q20,-20 40,0 t40,0" stroke="#3A86C8" stroke-width="4" fill="none"/><path d="M{x - 92:.0f},{y + 40:.0f} l30,-14 l26,10" stroke="#8B5A2B" stroke-width="3" fill="none"/>'
            f'<text x="{x - 20:.0f}" y="{y - 10:.0f}" font-family="Montserrat, Arial" font-weight="800" font-size="22" fill="#D7263D" text-anchor="middle" transform="rotate(180 {x - 20:.0f} {y - 16:.0f})">N</text></g>')
def orders_prop(h):
    x, y = h["rarm"]
    return (f'<rect x="{x - 96:.0f}" y="{y - 40:.0f}" width="90" height="110" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/>'
            f'<text x="{x - 51:.0f}" y="{y - 16:.0f}" font-family="Montserrat, Arial" font-weight="800" font-size="16" fill="#141416" text-anchor="middle">ORDERS</text>'
            + "".join(f'<line x1="{x - 86:.0f}" y1="{y + i * 14:.0f}" x2="{x - 16:.0f}" y2="{y + i * 14:.0f}" stroke="#999" stroke-width="3"/>' for i in range(5)))


def main():
    GM.caped_person("swiss_march", flag_che, dict(coat="#556B2F", pants="#4A5A2A", head=SKIN, rarm=50, larm=130, face="smile"), arms_extra=HELMET)
    # Swiss soldier reading his map upside down: build cape + chibi manually so the hand sits on top of the map
    parts, hands = PR.chibi(dict(coat="#556B2F", pants="#4A5A2A", head=SKIN, rarm=-20, larm=110, face="flat", stressed=True, sweat=True))
    cape_pts = [(CX - 50, FEET - S * 0.47), (CX + 50, FEET - S * 0.47), (CX + 92, FEET - S * 0.36), (CX + 142, FEET - S * 0.02), (CX - 142, FEET - S * 0.02), (CX - 92, FEET - S * 0.36)]
    pts = " ".join(f"{a:.0f},{b:.0f}" for a, b in cape_pts)
    cape = f'<clipPath id="capeMap"><polygon points="{pts}"/></clipPath><g clip-path="url(#capeMap)">{flag_che(CX - 145, FEET - S * 0.5, 290, S * 0.5)}</g><polygon points="{pts}" fill="none" stroke="{INK}" stroke-width="6"/>'
    save("swiss_map.svg", svg(300, 520, f'<g transform="translate(0,80)">{cape}{"".join(parts)}{HELMET}{map_prop(hands)}{handdot(*hands["rarm"])}</g>'))
    parts, hands = PR.chibi(dict(coat="#556B2F", pants="#4A5A2A", head=SKIN, rarm=-20, larm=110, face="smile"))
    save("swiss_orders.svg", svg(300, 520, f'<g transform="translate(0,80)">{cape.replace("capeMap", "capeOrd")}{"".join(parts)}{HELMET}{orders_prop(hands)}{handdot(*hands["rarm"])}</g>'))
    GM.caped_person("lie_shrug", flag_lie, dict(coat="#2B2B33", pants="#2B2B33", head=SKIN, rarm=-20, larm=200, face="smile"))
    horse = ("".join(f'<rect x="{x}" y="110" width="14" height="70" rx="5" fill="#7A4A26" stroke="{INK}" stroke-width="4"/>' for x in (58, 80, 150, 172))
             + f'<ellipse cx="120" cy="104" rx="78" ry="36" fill="#8B5A2B" stroke="{INK}" stroke-width="5"/>'
             + f'<rect x="70" y="80" width="40" height="44" rx="6" fill="#556B2F" stroke="{INK}" stroke-width="4"/><rect x="128" y="80" width="40" height="44" rx="6" fill="#556B2F" stroke="{INK}" stroke-width="4"/>'
             + f'<path d="M168,94 L188,34 L214,28 L232,50 L222,62 L204,54 L196,100 Z" fill="#8B5A2B" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><circle cx="212" cy="42" r="4" fill="{INK}"/>'
             + f'<path d="M188,30 Q200,8 222,22 L224,30 Z" fill="#5B6B3A" stroke="{INK}" stroke-width="4"/>'
             + f'<path d="M44,96 Q20,104 26,144" stroke="#3A2614" stroke-width="12" fill="none" stroke-linecap="round"/>')
    save("packhorse.svg", svg(250, 190, horse))
    missile = (f'<path d="M20,60 L200,60 Q240,60 250,70 Q240,80 200,80 L20,80 Z" fill="#C0C8CC" stroke="{INK}" stroke-width="5"/><path d="M20,60 L0,44 L0,96 L20,80 Z" fill="#DA291C" stroke="{INK}" stroke-width="4"/>'
               f'<rect x="120" y="60" width="14" height="20" fill="#DA291C"/>')
    save("missile.svg", svg(260, 140, missile))
    chalet = (f'<rect x="30" y="90" width="180" height="100" fill="#8B5A2B" stroke="{INK}" stroke-width="5"/><path d="M10,96 L120,20 L230,96 Z" fill="#F4F1EA" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
              f'<rect x="56" y="112" width="34" height="30" fill="#9ED0E6" stroke="{INK}" stroke-width="4"/><rect x="150" y="112" width="34" height="30" fill="#9ED0E6" stroke="{INK}" stroke-width="4"/><rect x="102" y="140" width="36" height="50" fill="#5A3A1E"/>')
    save("chalet.svg", svg(240, 200, chalet))
    heli = (f'<ellipse cx="150" cy="110" rx="90" ry="48" fill="#4A5A2A" stroke="{INK}" stroke-width="6"/><rect x="220" y="100" width="130" height="18" fill="#4A5A2A" stroke="{INK}" stroke-width="5"/><rect x="340" y="76" width="16" height="50" fill="#4A5A2A" stroke="{INK}" stroke-width="4"/>'
            f'<path d="M80,104 Q100,74 150,74 L150,108 Z" fill="#9ED0E6" stroke="{INK}" stroke-width="4"/><line x1="20" y1="54" x2="290" y2="54" stroke="{INK}" stroke-width="10" stroke-linecap="round"/><line x1="150" y1="54" x2="150" y2="64" stroke="{INK}" stroke-width="8"/>'
            f'<path d="M90,158 L210,158 M110,150 L104,158 M190,150 L196,158" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>')
    save("heli.svg", svg(370, 175, heli))
    for code, fl in (("che", flag_che), ("lie", flag_lie)): save(f"flag_{code}.svg", svg(150, 100, fl(4, 4, 142, 92) + f'<rect x="4" y="4" width="142" height="92" fill="none" stroke="{INK}" stroke-width="4"/>'))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
