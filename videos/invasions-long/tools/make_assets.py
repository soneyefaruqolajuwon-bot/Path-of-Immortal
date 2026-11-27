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


def flag_uk(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#012169"/><path d="M{x},{y} L{x + w},{y + h} M{x + w},{y} L{x},{y + h}" stroke="#FFF" stroke-width="{h * 0.2:.0f}"/>'
            f'<path d="M{x},{y} L{x + w},{y + h} M{x + w},{y} L{x},{y + h}" stroke="#C8102E" stroke-width="{h * 0.07:.0f}"/>'
            f'<path d="M{x + w / 2},{y} V{y + h} M{x},{y + h / 2} H{x + w}" stroke="#FFF" stroke-width="{h * 0.33:.0f}"/><path d="M{x + w / 2},{y} V{y + h} M{x},{y + h / 2} H{x + w}" stroke="#C8102E" stroke-width="{h * 0.2:.0f}"/>')
def flag_esp(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#AA151B"/><rect x="{x}" y="{y + h / 4}" width="{w}" height="{h / 2}" fill="#F1BF00"/>'
def flag_nic(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#0067C6"/><rect x="{x}" y="{y + h / 3}" width="{w}" height="{h / 3}" fill="#FFF"/><circle cx="{x + w / 2}" cy="{y + h / 2}" r="{h * 0.1}" fill="#C9A227"/>'
def flag_cri(x, y, w, h): return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#002B7F"/><rect x="{x}" y="{y + h / 6}" width="{w}" height="{h * 2 / 3}" fill="#FFF"/><rect x="{x}" y="{y + h / 3}" width="{w}" height="{h / 3}" fill="#CE1126"/>')
def flag_grc(x, y, w, h):
    st = "".join(f'<rect x="{x}" y="{y + i * h / 9:.1f}" width="{w}" height="{h / 9 + 0.5:.1f}" fill="{"#0D5EAF" if i % 2 == 0 else "#FFF"}"/>' for i in range(9))
    return st + f'<rect x="{x}" y="{y}" width="{h * 5 / 9:.0f}" height="{h * 5 / 9:.0f}" fill="#0D5EAF"/><rect x="{x + h * 2 / 9:.0f}" y="{y}" width="{h / 9:.0f}" height="{h * 5 / 9:.0f}" fill="#FFF"/><rect x="{x}" y="{y + h * 2 / 9:.0f}" width="{h * 5 / 9:.0f}" height="{h / 9:.0f}" fill="#FFF"/>'
def flag_bgr(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h / 3}" fill="#FFF"/><rect x="{x}" y="{y + h / 3}" width="{w}" height="{h / 3}" fill="#00966E"/><rect x="{x}" y="{y + 2 * h / 3}" width="{w}" height="{h / 3}" fill="#D62612"/>'
def flag_us(x, y, w, h): return "".join(f'<rect x="{x}" y="{y + i * h / 13:.1f}" width="{w}" height="{h / 13 + 0.5:.1f}" fill="{"#B22234" if i % 2 == 0 else "#FFFFFF"}"/>' for i in range(13)) + f'<rect x="{x}" y="{y}" width="{w * 0.42:.0f}" height="{h * 7 / 13:.0f}" fill="#3C3B6E"/>'
def flag_can(x, y, w, h): return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFF"/><rect x="{x}" y="{y}" width="{w / 4}" height="{h}" fill="#D52B1E"/><rect x="{x + 3 * w / 4}" y="{y}" width="{w / 4}" height="{h}" fill="#D52B1E"/>'
                                 f'<path d="M{x + w / 2},{y + h * 0.18} l{w * 0.05},{h * 0.16} l{w * 0.08},-{h * 0.04} l-{w * 0.03},{h * 0.2} l{w * 0.06},{h * 0.06} l-{w * 0.12},{h * 0.08} l0,{h * 0.12} l-{w * 0.04},0 l0,-{h * 0.12} l-{w * 0.12},-{h * 0.08} l{w * 0.06},-{h * 0.06} l-{w * 0.03},-{h * 0.2} l{w * 0.08},{h * 0.04} Z" fill="#D52B1E"/>')
def flag_jpn(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFF"/><circle cx="{x + w / 2}" cy="{y + h / 2}" r="{h * 0.3}" fill="#BC002D"/>'
BERET = f'<ellipse cx="{CX + HR * 0.1:.0f}" cy="{HY - HR * 0.78:.0f}" rx="{HR * 1.05:.0f}" ry="{HR * 0.36:.0f}" fill="#2B2B33" stroke="{INK}" stroke-width="5" transform="rotate(-8 {CX} {HY})"/>'
POLICE = (f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.5:.0f} L{CX - HR * 0.8:.0f},{HY - HR * 1.2:.0f} L{CX + HR * 0.8:.0f},{HY - HR * 1.2:.0f} L{CX + HR * 0.95:.0f},{HY - HR * 0.5:.0f} Z" fill="#1F3B73" stroke="{INK}" stroke-width="5"/>'
          f'<rect x="{CX - HR * 1.05:.0f}" y="{HY - HR * 0.6:.0f}" width="{HR * 2.1:.0f}" height="{HR * 0.18:.0f}" fill="#141416"/><circle cx="{CX:.0f}" cy="{HY - HR * 0.9:.0f}" r="{HR * 0.14:.0f}" fill="#F4D03F" stroke="{INK}" stroke-width="3"/>')
CAP1925 = (f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.45:.0f} Q{CX:.0f},{HY - HR * 1.35:.0f} {CX + HR * 0.95:.0f},{HY - HR * 0.45:.0f} Z" fill="#6B6B4A" stroke="{INK}" stroke-width="5"/>'
           f'<path d="M{CX + HR * 0.2:.0f},{HY - HR * 0.5:.0f} L{CX + HR * 1.4:.0f},{HY - HR * 0.42:.0f} L{CX + HR * 0.9:.0f},{HY - HR * 0.6:.0f} Z" fill="#3A3A2A" stroke="{INK}" stroke-width="3"/>')
SHAKO = (f'<rect x="{CX - HR * 0.7:.0f}" y="{HY - HR * 1.7:.0f}" width="{HR * 1.4:.0f}" height="{HR * 1.15:.0f}" fill="#1F3B73" stroke="{INK}" stroke-width="5"/>'
         f'<rect x="{CX - HR * 0.75:.0f}" y="{HY - HR * 0.65:.0f}" width="{HR * 1.5:.0f}" height="{HR * 0.16:.0f}" fill="#141416"/><circle cx="{CX:.0f}" cy="{HY - HR * 1.25:.0f}" r="{HR * 0.16:.0f}" fill="#F4D03F" stroke="{INK}" stroke-width="3"/>')


def main():
    GM.caped_person("swiss_march", flag_che, dict(coat="#556B2F", pants="#4A5A2A", head=SKIN, rarm=50, larm=130, face="smile"), arms_extra=HELMET)
    GM.caped_person("lie_shrug", flag_lie, dict(coat="#2B2B33", pants="#2B2B33", head=SKIN, rarm=-20, larm=200, face="smile"))
    GM.caped_person("lie_1866", flag_lie, dict(coat="#1F3B73", pants="#E8DFC8", head=SKIN, rarm=50, larm=130, face="smile"), arms_extra=SHAKO)
    GM.caped_person("lie_friend", flag_lie, dict(coat="#8B5A2B", pants="#3D5A80", head="#E8B98A", rarm=-50, larm=130, face="smile"))
    # Royal Marine with rifle (hand drawn on top), Spanish local pointing, Nicaraguan commander pointing, Costa Rican police
    parts, hands = PR.chibi(dict(coat="#4A5A2A", pants="#3A4A22", head=SKIN, rarm=60, larm=120, face="flat"))
    rifle = f'<line x1="{hands["rarm"][0] - 70:.0f}" y1="{hands["rarm"][1] - 40:.0f}" x2="{hands["rarm"][0] + 50:.0f}" y2="{hands["rarm"][1] + 30:.0f}" stroke="#3A2A1A" stroke-width="12" stroke-linecap="round"/>'
    cape_pts = [(CX - 50, FEET - S * 0.47), (CX + 50, FEET - S * 0.47), (CX + 92, FEET - S * 0.36), (CX + 142, FEET - S * 0.02), (CX - 142, FEET - S * 0.02), (CX - 92, FEET - S * 0.36)]
    pts = " ".join(f"{a:.0f},{b:.0f}" for a, b in cape_pts)
    def cape(fl, nm): return f'<clipPath id="c{nm}"><polygon points="{pts}"/></clipPath><g clip-path="url(#c{nm})">{fl(CX - 145, FEET - S * 0.5, 290, S * 0.5)}</g><polygon points="{pts}" fill="none" stroke="{INK}" stroke-width="6"/>'
    save("uk_marine.svg", svg(300, 520, f'<g transform="translate(0,80)">{cape(flag_uk, "uk")}{"".join(parts)}{HELMET}{rifle}{handdot(*hands["rarm"])}</g>'))
    GM.caped_person("esp_local", flag_esp, dict(coat="#F4F1EA", pants="#3D5A80", head="#E0B088", rarm=-5, larm=110, face="smile"))
    GM.caped_person("nic_commander", flag_nic, dict(coat="#556B2F", pants="#4A5A2A", head="#C68B59", rarm=-35, larm=110, face="flat", beard="chin", beard_c="#9A9A9A"), arms_extra=BERET)
    GM.caped_person("cri_police", flag_cri, dict(coat="#1F3B73", pants="#1F3B73", head="#C68B59", rarm=-10, larm=200, face="flat", stressed=True), arms_extra=POLICE)
    GM.caped_person("grc_soldier", flag_grc, dict(coat="#6B6B4A", pants="#5A5A3A", head=SKIN, rarm=10, larm=170, face="panic"), arms_extra=CAP1925)
    GM.caped_person("us_soldier", flag_us, dict(coat="#556B2F", pants="#4A5A2A", head=SKIN, rarm=50, larm=130, face="flat"), arms_extra=HELMET)
    GM.caped_person("can_soldier", flag_can, dict(coat="#556B2F", pants="#4A5A2A", head=SKIN, rarm=50, larm=130, face="flat"), arms_extra=HELMET)
    dog = (f'<ellipse cx="100" cy="90" rx="62" ry="28" fill="#C68B59" stroke="{INK}" stroke-width="5"/><circle cx="168" cy="66" r="26" fill="#C68B59" stroke="{INK}" stroke-width="5"/><path d="M152,48 q-4,-26 14,-20 q4,14 -2,24 Z" fill="#8B5A2B" stroke="{INK}" stroke-width="3"/>'
           f'<circle cx="174" cy="60" r="4" fill="{INK}"/><circle cx="192" cy="70" r="5" fill="{INK}"/>' + "".join(f'<rect x="{x}" y="108" width="12" height="34" rx="4" fill="#C68B59" stroke="{INK}" stroke-width="4"/>' for x in (56, 76, 120, 140))
           + f'<path d="M40,84 Q14,60 22,40" stroke="#C68B59" stroke-width="12" fill="none" stroke-linecap="round"/>')
    save("dog.svg", svg(220, 150, dog))
    rock = (f'<path d="M20,190 L90,40 Q110,10 130,40 L240,190 Z" fill="#B0A898" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><path d="M90,40 L130,190 M130,40 L180,190" stroke="#8E8676" stroke-width="4"/>'
            f'<line x1="110" y1="30" x2="110" y2="-30" stroke="{INK}" stroke-width="5"/>' + flag_uk(112, -30, 70, 42) + f'<rect x="112" y="-30" width="70" height="42" fill="none" stroke="{INK}" stroke-width="3"/>')
    save("gib_rock.svg", svg(260, 240, f'<g transform="translate(0,40)">{rock}</g>'))
    craft = f'<path d="M10,60 L230,60 L210,100 L30,100 Z" fill="#5B6B3A" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><rect x="40" y="40" width="160" height="24" fill="#4A5A2A" stroke="{INK}" stroke-width="4"/>' + "".join(f'<circle cx="{x}" cy="34" r="12" fill="{SKIN}" stroke="{INK}" stroke-width="3"/><path d="M{x - 14},30 Q{x},14 {x + 14},30 Z" fill="#5B6B3A" stroke="{INK}" stroke-width="3"/>' for x in (70, 110, 150, 190))
    save("craft.svg", svg(240, 110, craft))
    destroyer = (f'<path d="M10,80 L390,80 L360,120 L40,120 Z" fill="#6E7B85" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><rect x="150" y="40" width="90" height="42" fill="#8A97A0" stroke="{INK}" stroke-width="5"/><rect x="250" y="56" width="40" height="26" fill="#8A97A0" stroke="{INK}" stroke-width="4"/>'
                 f'<rect x="190" y="14" width="18" height="28" fill="#555" stroke="{INK}" stroke-width="4"/><line x1="60" y1="80" x2="120" y2="60" stroke="{INK}" stroke-width="6"/>')
    save("destroyer.svg", svg(400, 130, destroyer))
    base = (f'<rect x="20" y="80" width="200" height="70" fill="#8B7355" stroke="{INK}" stroke-width="5"/><path d="M10,84 L120,40 L230,84 Z" fill="#6B5A44" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
            f'<line x1="120" y1="40" x2="120" y2="-20" stroke="{INK}" stroke-width="5"/>' + flag_jpn(122, -20, 66, 44) + f'<rect x="122" y="-20" width="66" height="44" fill="none" stroke="{INK}" stroke-width="3"/>')
    save("jp_base.svg", svg(240, 200, f'<g transform="translate(0,40)">{base}</g>'))
    base_empty = f'<rect x="20" y="80" width="200" height="70" fill="#8B7355" stroke="{INK}" stroke-width="5"/><path d="M10,84 L120,40 L230,84 Z" fill="#6B5A44" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><line x1="120" y1="40" x2="120" y2="-20" stroke="{INK}" stroke-width="5"/>'
    save("empty_base.svg", svg(240, 200, f'<g transform="translate(0,40)">{base_empty}</g>'))
    for code, fl in (("che", flag_che), ("lie", flag_lie), ("uk", flag_uk), ("esp", flag_esp), ("nic", flag_nic), ("cri", flag_cri), ("grc", flag_grc), ("bgr", flag_bgr), ("us", flag_us), ("can", flag_can)):
        save(f"flag_{code}.svg", svg(150, 100, fl(4, 4, 142, 92) + f'<rect x="4" y="4" width="142" height="92" fill="none" stroke="{INK}" stroke-width="4"/>'))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
