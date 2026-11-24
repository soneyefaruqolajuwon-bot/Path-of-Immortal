"""SVG kit for the Saint-Pierre short -> ../assets/*.svg
France and Britain act through caped people (house style); the islands are a fishing harbour flying the ruling flag, not a pin."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg = GM.PR, GM.INK, GM.svg
def save(n, c): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(c)
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
SK = "#F2C9A0"
BLUE, RED = "#002395", "#ED2939"


def flag_fra(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w / 3}" height="{h}" fill="{BLUE}"/><rect x="{x + w / 3}" y="{y}" width="{w / 3}" height="{h}" fill="#FFFFFF"/><rect x="{x + 2 * w / 3}" y="{y}" width="{w / 3}" height="{h}" fill="{RED}"/>'
def flag_esp(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#AA151B"/><rect x="{x}" y="{y + h / 4}" width="{w}" height="{h / 2}" fill="#F1BF00"/>'


def hand(key, ang):
    side = -1 if key == "larm" else 1; a = math.radians(ang)
    return CX + side * S * 0.13 + S * 0.22 * math.cos(a), FEET - S * 0.36 + S * 0.22 * math.sin(a)


BERET = (f'<ellipse cx="{CX + HR * 0.12:.0f}" cy="{HY - HR * 0.72:.0f}" rx="{HR * 1.08:.0f}" ry="{HR * 0.36:.0f}" fill="#1C2340" stroke="{INK}" stroke-width="5" transform="rotate(-8 {CX} {HY})"/>'
         f'<line x1="{CX + HR * 0.15:.0f}" y1="{HY - HR * 1.05:.0f}" x2="{CX + HR * 0.25:.0f}" y2="{HY - HR * 1.25:.0f}" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>')
STRIPES = "".join(f'<rect x="{CX - S * 0.13:.0f}" y="{FEET - S * 0.44 + i * 22:.0f}" width="{S * 0.26:.0f}" height="9" fill="#1C2340" opacity="0.85"/>' for i in range(4))
TRICORNE = (f'<path d="M{CX - HR * 1.35:.0f},{HY - HR * 0.55:.0f} Q{CX},{HY - HR * 1.0:.0f} {CX + HR * 1.35:.0f},{HY - HR * 0.55:.0f} L{CX + HR * 0.6:.0f},{HY - HR * 1.45:.0f} Q{CX},{HY - HR * 1.15:.0f} {CX - HR * 0.6:.0f},{HY - HR * 1.45:.0f} Z" fill="#1C1C20" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
            f'<path d="M{CX - HR * 1.3:.0f},{HY - HR * 0.58:.0f} Q{CX},{HY - HR * 0.95:.0f} {CX + HR * 1.3:.0f},{HY - HR * 0.58:.0f}" stroke="#C9A227" stroke-width="5" fill="none"/>')


def baguette(x, y, ang): return (f'<g transform="translate({x:.0f},{y:.0f}) rotate({ang})"><rect x="-14" y="-90" width="28" height="160" rx="14" fill="#D9A15B" stroke="{INK}" stroke-width="5"/>'
                                  + "".join(f'<path d="M-8,{-70 + i * 30} l16,-10" stroke="#B5793A" stroke-width="4"/>' for i in range(5)) + "</g>")
def keys(x, y): return f'<g transform="translate({x:.0f},{y:.0f})"><circle cx="0" cy="0" r="16" fill="none" stroke="#C9A227" stroke-width="6"/><rect x="10" y="10" width="10" height="44" fill="#F4D03F" stroke="{INK}" stroke-width="3" transform="rotate(-30)"/><rect x="-18" y="12" width="10" height="40" fill="#C9CED6" stroke="{INK}" stroke-width="3" transform="rotate(20)"/></g>'
def contract(x, y): return (f'<g transform="translate({x:.0f},{y:.0f}) rotate(8)"><rect x="-40" y="-56" width="80" height="104" fill="#F4ECD6" stroke="{INK}" stroke-width="5"/>'
                             + "".join(f'<rect x="-28" y="{-40 + i * 16}" width="{56 - (i == 4) * 24}" height="5" fill="#B9AE96"/>' for i in range(5)) + '<circle cx="18" cy="36" r="9" fill="#D7263D"/></g>')
def stamp_tool(x, y, ang): return (f'<g transform="translate({x:.0f},{y:.0f}) rotate({ang})"><rect x="-14" y="-70" width="28" height="56" rx="10" fill="#7A4A2A" stroke="{INK}" stroke-width="5"/>'
                                    f'<rect x="-40" y="-16" width="80" height="26" rx="4" fill="{BLUE}" stroke="{INK}" stroke-width="5"/></g>')


def person(name, flag, o, extra=""): GM.caped_person(name, flag, o, arms_extra=extra)


def main():
    fr = dict(coat="#FFFFFF", pants="#1C2340", head=SK)
    for nm, o in dict(wave=dict(rarm=-60, larm=110, face="smile"), proud=dict(rarm=-35, larm=60, face="smile"), keys=dict(rarm=-10, larm=110, face="smile"),
                      hug=dict(rarm=170, larm=10, face="smile"), stamp=dict(rarm=-25, larm=110, face="flat")).items():
        rx, ry = hand("rarm", o["rarm"]); lx, ly = hand("larm", o["larm"])
        ex = STRIPES + BERET
        if nm == "wave": ex += baguette(lx - 6, ly - 30, -20)
        if nm == "proud": ex += f'<line x1="{rx:.0f}" y1="{ry + 70:.0f}" x2="{rx:.0f}" y2="{ry - 150:.0f}" stroke="#6B4423" stroke-width="8"/><g transform="translate({rx:.0f},{ry - 150:.0f})">{flag_fra(0, 0, 90, 60)}<rect width="90" height="60" fill="none" stroke="{INK}" stroke-width="3"/></g>'
        if nm == "keys": ex += keys(rx + 6, ry)
        if nm == "stamp": ex += stamp_tool(rx, ry, 10)
        person(f"french_{nm}", flag_fra, dict(fr, **o), ex)
    uk = dict(coat="#C8102E", pants="#F4F1E6", head=SK, crossbelt=True)
    for nm, o in dict(contract=dict(rarm=-30, larm=110, face="smile"), puzzled=dict(rarm=-120, larm=110, face="flat", stressed=True), keys=dict(rarm=-20, larm=110, face="smile"), grab=dict(rarm=-10, larm=-170, face="smile")).items():
        rx, ry = hand("rarm", o["rarm"])
        ex = TRICORNE + (contract(rx + 10, ry - 10) if nm == "contract" else keys(rx + 6, ry) if nm == "keys" else "")
        person(f"british_{nm}", PR.flag_uk, dict(uk, **o), ex)
    # French border officer (kepi, stamp)
    for nm, o in dict(desk=dict(rarm=30, larm=110, face="smile"), stamp=dict(rarm=-35, larm=110, face="flat")).items():
        rx, ry = hand("rarm", o["rarm"])
        GM.caped_person(f"douane_{nm}", flag_fra, dict(coat="#1C2340", pants="#1C2340", head="#E8B88A", **o), hat="kepi", arms_extra=stamp_tool(rx, ry, 10))
    # an ordinary traveller (no country: no cape)
    p, hands = PR.chibi(dict(coat="#2EC4B6", pants="#3A3A40", rarm=-40, larm=110, face="smile"))
    hx, hy = hands["rarm"]
    pp = f'<g transform="translate({hx:.0f},{hy - 20:.0f}) rotate(-10)"><rect x="-24" y="-34" width="48" height="66" rx="5" fill="#7A1F3D" stroke="{INK}" stroke-width="4"/><circle cx="0" cy="-6" r="10" fill="none" stroke="#F4D03F" stroke-width="3"/></g>'
    pack = f'<rect x="{CX - 70}" y="{FEET - S * 0.45:.0f}" width="40" height="90" rx="12" fill="#E07A2E" stroke="{INK}" stroke-width="5"/>'
    save("traveller.svg", svg(300, 520, f'<g transform="translate(0,80)">{pack}{"".join(p)}{pp}</g>'))
    # the islands: a fishing harbour flying the ruling flag
    def harbour(flag):
        return svg(260, 230, f'<path d="M10,200 Q130,160 250,200 L250,230 L10,230 Z" fill="#8A855C" stroke="{INK}" stroke-width="5"/>'
                   f'<rect x="40" y="130" width="70" height="60" fill="#E9D8A6" stroke="{INK}" stroke-width="5"/><path d="M34,132 L75,98 L116,132 Z" fill="#C0504D" stroke="{INK}" stroke-width="5"/>'
                   f'<rect x="120" y="150" width="56" height="44" fill="#9BC1D9" stroke="{INK}" stroke-width="5"/><path d="M114,152 L148,124 L182,152 Z" fill="#2E5BBA" stroke="{INK}" stroke-width="5"/>'
                   f'<path d="M150,200 L230,200 L222,214 L158,214 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/><line x1="190" y1="200" x2="190" y2="160" stroke="{INK}" stroke-width="4"/>'
                   f'<line x1="200" y1="190" x2="200" y2="30" stroke="#6B4423" stroke-width="8"/><g transform="translate(204,32)">{flag(0, 0, 54, 36)}<rect width="54" height="36" fill="none" stroke="{INK}" stroke-width="3"/></g>')
    save("harbour_fr.svg", harbour(flag_fra)); save("harbour_uk.svg", harbour(PR.flag_uk))
    save("flag_esp.svg", svg(120, 80, flag_esp(4, 4, 112, 72) + f'<rect x="4" y="4" width="112" height="72" fill="none" stroke="{INK}" stroke-width="4"/>'))
    save("flag_gbr.svg", svg(120, 80, PR.flag_uk(4, 4, 112, 72) + f'<rect x="4" y="4" width="112" height="72" fill="none" stroke="{INK}" stroke-width="4"/>'))
    save("flag_fra.svg", svg(120, 80, flag_fra(4, 4, 112, 72) + f'<rect x="4" y="4" width="112" height="72" fill="none" stroke="{INK}" stroke-width="4"/>'))
    save("cod.svg", svg(260, 130, f'<path d="M40,65 L4,25 L12,65 L4,105 Z" fill="#9BA88A" stroke="{INK}" stroke-width="5"/><ellipse cx="135" cy="65" rx="100" ry="46" fill="#B9C4A0" stroke="{INK}" stroke-width="6"/>'
                                  f'<path d="M90,22 q30,-24 60,0" fill="#9BA88A" stroke="{INK}" stroke-width="5"/><circle cx="195" cy="55" r="12" fill="#fff" stroke="{INK}" stroke-width="4"/><circle cx="198" cy="55" r="5" fill="{INK}"/>'
                                  f'<path d="M205,80 q12,10 24,-2" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M228,88 q4,14 -4,22" stroke="{INK}" stroke-width="4" fill="none"/>'))
    save("ferry.svg", svg(300, 150, f'<path d="M10,90 L290,90 L262,140 L36,140 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="6"/><rect x="60" y="50" width="170" height="42" fill="#E9EEF2" stroke="{INK}" stroke-width="5"/>'
                                    + "".join(f'<rect x="{74 + i * 34}" y="60" width="20" height="18" fill="#9BC1D9" stroke="{INK}" stroke-width="3"/>' for i in range(5)) +
                                    f'<rect x="130" y="16" width="30" height="36" fill="#ED2939" stroke="{INK}" stroke-width="5"/><rect x="10" y="104" width="280" height="10" fill="#2E5BBA"/>'))
    save("euro.svg", svg(120, 120, f'<circle cx="60" cy="60" r="52" fill="#F4D03F" stroke="#8A6A10" stroke-width="8"/><circle cx="60" cy="60" r="36" fill="none" stroke="#C9A227" stroke-width="4"/>'
                                   f'<text x="60" y="80" font-family="Montserrat,Arial,sans-serif" font-weight="800" font-size="56" text-anchor="middle" fill="#8A6A10">€</text>'))
    save("baguette.svg", svg(120, 220, baguette(60, 110, 20)))
    save("car.svg", svg(240, 140, f'<path d="M20,100 L20,70 Q30,50 60,48 L90,20 L170,20 L200,48 Q226,52 226,74 L226,100 Z" fill="#3E8E5E" stroke="{INK}" stroke-width="6"/>'
                                  f'<path d="M98,28 L130,28 L130,48 L80,48 Z M138,28 L166,28 L186,48 L138,48 Z" fill="#BFE9F5" stroke="{INK}" stroke-width="4"/>'
                                  f'<circle cx="62" cy="104" r="22" fill="{INK}"/><circle cx="184" cy="104" r="22" fill="{INK}"/>'
                                  f'<rect x="92" y="78" width="66" height="22" fill="#FFFFFF" stroke="{INK}" stroke-width="3"/><rect x="92" y="78" width="12" height="22" fill="{BLUE}"/>'))
    # the mansion + the fishing shed on the dock (cutaway card)
    win = "".join(f'<rect x="{x}" y="{y}" width="56" height="70" fill="#F7C46C" stroke="{INK}" stroke-width="5"/>' for x in (90, 190, 410, 510) for y in (150, 270))
    save("mansion.svg", svg(660, 420, f'<path d="M30,120 L330,20 L630,120 Z" fill="#7A4A3A" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
                                      f'<rect x="60" y="120" width="540" height="290" fill="#EFE6D2" stroke="{INK}" stroke-width="8"/>{win}'
                                      f'<rect x="290" y="270" width="80" height="140" fill="#6B4423" stroke="{INK}" stroke-width="6"/><circle cx="356" cy="342" r="6" fill="#F4D03F"/>'
                                      f'<rect x="300" y="150" width="60" height="70" fill="#F7C46C" stroke="{INK}" stroke-width="5"/>'))
    save("shed.svg", svg(320, 240, f'<rect x="0" y="180" width="320" height="22" fill="#8B5E3C" stroke="{INK}" stroke-width="5"/>' + "".join(f'<rect x="{20 + i * 70}" y="200" width="14" height="40" fill="#6B4423"/>' for i in range(5))
                                   + f'<rect x="60" y="90" width="130" height="92" fill="#3E7CB1" stroke="{INK}" stroke-width="6"/><path d="M48,94 L125,40 L202,94 Z" fill="#C0504D" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
                                   f'<rect x="108" y="120" width="34" height="62" fill="#2B4A6B" stroke="{INK}" stroke-width="4"/>'
                                   f'<path d="M210,100 L250,40" stroke="#6B4423" stroke-width="6"/><path d="M250,40 Q270,90 262,150" stroke="#888" stroke-width="2" fill="none"/><circle cx="262" cy="152" r="5" fill="#ED2939"/>'))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
