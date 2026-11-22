"""SVG kit for the Canberra short -> ../assets/*.svg  (cities/countries act as caped people; places are drawn objects, not pins)"""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg, star_pts = GM.PR, GM.INK, GM.svg, GM.star_pts
def save(n, c): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(c)
def star7(cx, cy, r):
    return " ".join(f"{cx + (r if i % 2 == 0 else r * 0.45) * math.sin(i * math.pi / 7):.1f},{cy - (r if i % 2 == 0 else r * 0.45) * math.cos(i * math.pi / 7):.1f}" for i in range(14))
def ensign(x, y, w, h, fly=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#012169"/>' + PR.flag_uk(x, y, w / 2, h / 2) + fly
def flag_aus(x, y, w, h):
    sc = [(0.75, 0.78, 0.07), (0.62, 0.42, 0.06), (0.75, 0.16, 0.06), (0.87, 0.36, 0.06), (0.81, 0.53, 0.035)]
    return ensign(x, y, w, h, f'<polygon points="{star7(x + w*0.25, y + h*0.75, h*0.14)}" fill="#fff"/>' + "".join(f'<polygon points="{star7(x + w*a, y + h*b, h*r)}" fill="#fff"/>' for a, b, r in sc))
def flag_nsw(x, y, w, h):
    cx, cy, r = x + w * 0.75, y + h * 0.5, h * 0.3
    return ensign(x, y, w, h, f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#fff"/><rect x="{cx - r*0.15}" y="{cy - r}" width="{r*0.3}" height="{2*r}" fill="#C8102E"/><rect x="{cx - r}" y="{cy - r*0.15}" width="{2*r}" height="{r*0.3}" fill="#C8102E"/><circle cx="{cx}" cy="{cy}" r="{r*0.18}" fill="#FFCD00"/>')
def flag_vic(x, y, w, h):
    sc = [(0.75, 0.82, 0.08), (0.62, 0.48, 0.07), (0.75, 0.28, 0.07), (0.87, 0.44, 0.07), (0.81, 0.6, 0.045)]
    return ensign(x, y, w, h, "".join(f'<polygon points="{star_pts(x + w*a, y + h*b, h*r)}" fill="#fff"/>' for a, b, r in sc) +
                  f'<path d="M{x + w*0.68:.0f},{y + h*0.18:.0f} l{w*0.03:.0f},-{h*0.1:.0f} l{w*0.04:.0f},{h*0.06:.0f} l{w*0.04:.0f},-{h*0.06:.0f} l{w*0.03:.0f},{h*0.1:.0f} Z" fill="#FFCD00"/>')
FL = {"aus": flag_aus, "nsw": flag_nsw, "vic": flag_vic}
CX, HY, HR = 150, 420 - 418 * 0.68, 418 * 0.23
SAILOR = f'<path d="M{CX - HR*0.9:.0f},{HY - HR*0.55:.0f} Q{CX},{HY - HR*1.35:.0f} {CX + HR*0.9:.0f},{HY - HR*0.55:.0f} Z" fill="#FFFFFF" stroke="{INK}" stroke-width="5"/><rect x="{CX - HR*0.92:.0f}" y="{HY - HR*0.7:.0f}" width="{HR*1.84:.0f}" height="{HR*0.18:.0f}" fill="#0B3D91" stroke="{INK}" stroke-width="3"/><path d="M{CX + HR*0.2:.0f},{HY - HR*0.6:.0f} h{HR*0.95:.0f} l-{HR*0.1:.0f},{HR*0.18:.0f} h-{HR*0.85:.0f} Z" fill="{INK}"/>'
WIG = "".join(f'<circle cx="{CX + dx*HR:.0f}" cy="{HY + dy*HR:.0f}" r="{HR*0.28:.0f}" fill="#F4F1E6" stroke="{INK}" stroke-width="3"/>' for dx, dy in [(-0.95, -0.35), (-1.0, 0.05), (-0.95, 0.45), (0.95, -0.35), (1.0, 0.05), (0.95, 0.45), (-0.6, -0.85), (-0.2, -1.0), (0.2, -1.0), (0.6, -0.85)])


def person(name, flag, o, extra=""):
    GM.caped_person(name, FL[flag], o)
    if extra:
        p = os.path.join(OUT, name + ".svg"); s = open(p).read(); s = s.replace("</svg>", '<g transform="translate(0,80)">' + extra + "</g></svg>"); open(p, "w").write(s)


def main():
    SK = "#F2C9A0"
    syd = dict(coat="#0B3D91", pants="#2B2B33", head=SK, shades=True)
    mel = dict(coat="#2A2A30", pants="#1C1C20", head=SK, hat="top", band="#0B3D91", tie="#C8102E")
    for nm, base, ex in (("sydney", syd, SAILOR), ("melbourne", mel, "")):
        person(f"{nm}", nm == "sydney" and "nsw" or "vic", dict(base, rarm=-40, larm=150, face="smile"), ex)
        tug = dict(rarm=0, larm=12) if nm == "sydney" else dict(rarm=168, larm=180)
        person(f"{nm}_tug", nm == "sydney" and "nsw" or "vic", dict(base, **tug, face="panic", stressed=not base.get("shades")), ex)
        person(f"{nm}_angry", nm == "sydney" and "nsw" or "vic", dict(base, rarm=60, larm=120, face="flat", stressed=not base.get("shades"), sweat=True), ex)
        person(f"{nm}_sulk", nm == "sydney" and "nsw" or "vic", dict(base, rarm=150, larm=30, face="flat", stressed=not base.get("shades")), ex)
    person("melbourne_grin", "vic", dict(mel, rarm=-60, larm=150, face="smile", stressed=True))
    person("lawmaker", "aus", dict(coat="#1C1C20", pants="#1C1C20", head=SK, tie="#FFFFFF", rarm=-30, larm=140, face="flat"), WIG)
    person("lawmaker_stamp", "aus", dict(coat="#1C1C20", pants="#1C1C20", head=SK, tie="#FFFFFF", rarm=-120, larm=140, face="flat", stressed=True), WIG)
    plain = lambda col: (lambda x, y, w, h: f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{col}"/>')
    FL["blueprint"] = plain("#2E6DA4"); FL["khaki"] = plain("#B59A63"); FL["grey"] = plain("#6B7280"); FL["uk"] = PR.flag_uk
    person("omalley", "aus", dict(coat="#2A2A30", pants="#1C1C20", head=SK, hat="fedora", beard="chops", beard_c="#3A2614", rarm=-60, larm=140, face="smile"))
    person("omalley_ban", "aus", dict(coat="#2A2A30", pants="#1C1C20", head=SK, hat="fedora", beard="chops", beard_c="#3A2614", rarm=-120, larm=140, face="flat", stressed=True))
    GM.caped_person("walter", FL["blueprint"], dict(coat="#6B4A2B", pants="#3A3A40", head=SK, tie="#2E6DA4", rarm=-40, larm=140, face="smile"))
    GM.caped_person("walter_angry", FL["blueprint"], dict(coat="#6B4A2B", pants="#3A3A40", head=SK, tie="#2E6DA4", rarm=60, larm=120, face="flat", stressed=True, sweat=True))
    GM.caped_person("marion", FL["blueprint"], dict(coat="#7D3C98", pants="#3A3A40", head=SK, rarm=-50, larm=150, face="smile", hair_long=True, hair_c="#3A2614", dress=True))
    GM.caped_person("surveyor", FL["khaki"], dict(coat="#8A7A55", pants="#5A4A38", head=SK, rarm=-10, larm=150, face="smile"), hat="pith")
    GM.caped_person("bureaucrat", FL["grey"], dict(coat="#4B5563", pants="#374151", head=SK, tie="#9CA3AF", rarm=20, larm=160, face="flat", stressed=True))
    GM.caped_person("brit_architect", FL["uk"], dict(coat="#2A2A30", hat="top", band="#C8102E", head=SK, rarm=-100, larm=140, face="flat", stressed=True, beard="chops", beard_c="#9A9A9A"))
    save("exhibition.svg", svg(320, 230, f'<rect x="20" y="130" width="280" height="80" fill="#E8DCC2" stroke="{INK}" stroke-width="6"/>' + "".join(f'<rect x="{36 + i*36}" y="146" width="18" height="64" fill="#C9B88F"/>' for i in range(8)) +
                                         f'<rect x="120" y="80" width="80" height="54" fill="#E8DCC2" stroke="{INK}" stroke-width="6"/><path d="M110,84 Q160,4 210,84 Z" fill="#B0703C" stroke="{INK}" stroke-width="6"/>'
                                         f'<line x1="160" y1="30" x2="160" y2="6" stroke="{INK}" stroke-width="4"/><rect x="10" y="206" width="300" height="16" fill="#A99A78" stroke="{INK}" stroke-width="4"/>'))
    save("vic_parliament.svg", svg(320, 230, f'<rect x="30" y="90" width="260" height="120" fill="#D8CBAE" stroke="{INK}" stroke-width="6"/>' + "".join(f'<rect x="{46 + i*30}" y="100" width="14" height="110" fill="#EFE6D2" stroke="{INK}" stroke-width="2"/>' for i in range(8)) +
                                             f'<path d="M20,92 L160,40 L300,92 Z" fill="#C9B88F" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><line x1="160" y1="40" x2="160" y2="4" stroke="{INK}" stroke-width="4"/>'
                                             f'<g transform="translate(162,4)">{flag_vic(0, 0, 48, 28)}<rect width="48" height="28" fill="none" stroke="{INK}" stroke-width="2"/></g><rect x="20" y="206" width="280" height="16" fill="#A99A78" stroke="{INK}" stroke-width="4"/>'))
    save("old_parliament.svg", svg(340, 180, f'<rect x="20" y="70" width="300" height="90" fill="#F7F4EC" stroke="{INK}" stroke-width="6"/><rect x="120" y="40" width="100" height="34" fill="#F7F4EC" stroke="{INK}" stroke-width="6"/>'
                                             + "".join(f'<rect x="{34 + i*34}" y="90" width="18" height="40" fill="#C9D6E3" stroke="{INK}" stroke-width="2"/>' for i in range(9)) +
                                             f'<line x1="170" y1="40" x2="170" y2="4" stroke="{INK}" stroke-width="4"/><g transform="translate(172,4)">{flag_aus(0, 0, 44, 24)}</g><rect x="10" y="156" width="320" height="16" fill="#A99A78" stroke="{INK}" stroke-width="4"/>'))
    save("lighthouse.svg", svg(120, 240, f'<path d="M40,220 L50,60 L70,60 L80,220 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="6"/><rect x="44" y="110" width="32" height="18" fill="#C0392B"/><rect x="42" y="170" width="36" height="18" fill="#C0392B"/>'
                                         f'<rect x="44" y="30" width="32" height="30" fill="#F4D03F" stroke="{INK}" stroke-width="5"/><path d="M38,32 L60,10 L82,32 Z" fill="#C0392B" stroke="{INK}" stroke-width="5"/><rect x="20" y="216" width="80" height="16" fill="#8A855C" stroke="{INK}" stroke-width="4"/>'))
    save("crown.svg", svg(220, 170, f'<path d="M20,140 L10,40 L65,90 L110,20 L155,90 L210,40 L200,140 Z" fill="#F4D03F" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
                                    f'<rect x="20" y="128" width="180" height="30" rx="6" fill="#E0B22C" stroke="{INK}" stroke-width="7"/>'
                                    + "".join(f'<circle cx="{x}" cy="{y}" r="11" fill="{c}" stroke="{INK}" stroke-width="4"/>' for x, y, c in ((10, 40, "#E63946"), (110, 20, "#2E86DE"), (210, 40, "#2ECC71")))))
    save("opera_house.svg", svg(260, 150, f'<rect x="10" y="118" width="240" height="22" fill="#C9B88F" stroke="{INK}" stroke-width="5"/>'
                                          + "".join(f'<path d="M{x},120 Q{x + 12},{120 - hgt} {x + w},{120 - hgt * 0.15} Z" fill="#FFFFFF" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>' for x, w, hgt in ((30, 60, 90), (80, 60, 110), (130, 55, 85), (175, 50, 65)))))
    save("tram.svg", svg(260, 140, f'<line x1="130" y1="6" x2="100" y2="34" stroke="{INK}" stroke-width="5"/><rect x="14" y="34" width="232" height="80" rx="14" fill="#2E8B57" stroke="{INK}" stroke-width="6"/>'
                                   f'<rect x="14" y="80" width="232" height="16" fill="#F4D03F"/>' + "".join(f'<rect x="{30 + i * 44}" y="44" width="32" height="28" rx="4" fill="#BFE9F5" stroke="{INK}" stroke-width="3"/>' for i in range(5))
                                   + f'<circle cx="60" cy="118" r="12" fill="{INK}"/><circle cx="200" cy="118" r="12" fill="{INK}"/>'))
    save("parliament.svg", svg(300, 200, f'<path d="M10,170 Q150,80 290,170 Z" fill="#9BB36A" stroke="{INK}" stroke-width="6"/><rect x="70" y="120" width="160" height="50" fill="#EFE6D2" stroke="{INK}" stroke-width="6"/>'
                                         + "".join(f'<rect x="{84 + i * 28}" y="132" width="14" height="38" fill="#C9B88F"/>' for i in range(5)) +
                                         f'<path d="M110,120 L150,30 L190,120" fill="none" stroke="#9AA3AE" stroke-width="7"/><line x1="150" y1="30" x2="150" y2="2" stroke="{INK}" stroke-width="4"/>'
                                         f'<g transform="translate(152,2)">{flag_aus(0, 0, 46, 26)}<rect width="46" height="26" fill="none" stroke="{INK}" stroke-width="2"/></g>'))
    save("sheep.svg", svg(140, 110, "".join(f'<circle cx="{x}" cy="{y}" r="22" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/>' for x, y in ((40, 50), (65, 38), (90, 50), (55, 64), (80, 64)))
                                    + f'<ellipse cx="112" cy="48" rx="16" ry="13" fill="#2B2B33" stroke="{INK}" stroke-width="4"/><rect x="42" y="78" width="8" height="24" fill="{INK}"/><rect x="82" y="78" width="8" height="24" fill="{INK}"/>'
                                    + '<circle cx="116" cy="45" r="3" fill="#fff"/>'))
    print(len([f for f in os.listdir(OUT) if f.endswith(".svg")]), "assets")


if __name__ == "__main__":
    main()
