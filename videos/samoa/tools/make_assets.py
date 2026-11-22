"""SVG assets for the Samoa short -> ../assets/*.svg"""
import importlib.util, json, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK, svg, star_pts = GM.PR, GM.INK, GM.svg, GM.star_pts
GOLD = "#F4D03F"


def save(n, c): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(c)


def flag_wsm(x, y, w, h):
    cw, ch = w * 0.5, h * 0.5
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#CE1126"/><rect x="{x}" y="{y}" width="{cw:.1f}" height="{ch:.1f}" fill="#002B7F"/>'
    for (fx, fy, r) in ((0.5, 0.2, 0.09), (0.25, 0.48, 0.09), (0.72, 0.42, 0.08), (0.48, 0.8, 0.1), (0.6, 0.58, 0.045)):
        s += f'<polygon points="{star_pts(x + cw*fx, y + ch*fy, ch*r*1.6)}" fill="#FFFFFF"/>'
    return s


def flag_asm(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#002B7F"/>'
            f'<polygon points="{x + w},{y} {x + w},{y + h} {x},{y + h/2}" fill="#FFFFFF"/>'
            f'<polygon points="{x + w},{y + h*0.08:.1f} {x + w},{y + h*0.92:.1f} {x + w*0.12:.1f},{y + h/2}" fill="#BF0A30"/>'
            f'<path d="M{x + w*0.55:.1f},{y + h*0.5:.1f} q{w*0.12:.1f},-{h*0.14:.1f} {w*0.3:.1f},-{h*0.06:.1f} l-{w*0.08:.1f},{h*0.12:.1f} Z" fill="#E8B04A" stroke="#7B4B2A" stroke-width="{max(1,w*0.015):.1f}"/>')


def calendar(day, date, struck=False):
    s = (f'<rect x="20" y="30" width="360" height="400" rx="26" fill="#FFFFFF" stroke="{INK}" stroke-width="10"/>'
         f'<path d="M20,56 Q20,30 46,30 H354 Q380,30 380,56 V130 H20 Z" fill="#E63946" stroke="{INK}" stroke-width="10"/>'
         f'<circle cx="110" cy="30" r="16" fill="{INK}"/><circle cx="290" cy="30" r="16" fill="{INK}"/>'
         f'<text x="200" y="104" font-family="Montserrat, sans-serif" font-weight="800" font-size="56" text-anchor="middle" fill="#FFFFFF">{day}</text>'
         f'<text x="200" y="300" font-family="Montserrat, sans-serif" font-weight="800" font-size="150" text-anchor="middle" fill="{INK}">{date}</text>'
         f'<text x="200" y="385" font-family="Montserrat, sans-serif" font-weight="800" font-size="44" text-anchor="middle" fill="#6C737A">DEC 2011</text>')
    if struck:
        s += f'<path d="M60,180 L340,400 M340,180 L60,400" stroke="#E63946" stroke-width="20" stroke-linecap="round"/>'
    return svg(400, 460, s)


def main():
    save("marker_wsm.svg", GM.marker("wsm", flag_wsm)); save("marker_asm.svg", GM.marker("asm", flag_asm))
    PR.FLAGS["wsm"] = flag_wsm
    # Samoan in a Samoa flag cape (sleepy + surprised versions)
    GM.caped_person("samoan", flag_wsm, dict(coat="#FFFFFF", pants="#2B3A8C", rarm=-60, larm=120, face="o", brow=1, hair="short", hair_c="#1C1C20"))
    GM.caped_person("samoan_sleepy", flag_wsm, dict(coat="#FFFFFF", pants="#2B3A8C", rarm=60, larm=120, face="smile", hair="short", hair_c="#1C1C20"))
    GM.caped_person("american_samoan", flag_asm, dict(coat="#F4D03F", pants="#2B2B33", rarm=-50, larm=120, face="smile", cheeks=True, hair_long=True, hair_c="#1C1C20", dress=True))
    save("calendar_thu29.svg", calendar("THU", "29")); save("calendar_fri30.svg", calendar("FRI", "30")); save("calendar_sat31.svg", calendar("SAT", "31"))
    save("airplane.svg", svg(320, 140, f'<path d="M20,70 Q20,52 46,50 L250,46 Q300,46 312,70 Q300,94 250,94 L46,90 Q20,88 20,70 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="7"/>'
                                      f'<path d="M150,52 L110,4 L140,4 L200,50 Z M150,88 L110,136 L140,136 L200,90 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
                                      f'<path d="M40,56 L24,22 L42,22 L66,54 Z" fill="#E63946" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
                                      + "".join(f'<circle cx="{120 + i*24}" cy="64" r="6" fill="#4A6E8C"/>' for i in range(6)) +
                                      f'<path d="M290,60 Q304,62 306,70 L290,70 Z" fill="#4A6E8C"/>'))
    save("closed_sign.svg", svg(300, 220, f'<path d="M150,10 L80,80 M150,10 L220,80" stroke="{INK}" stroke-width="7"/><circle cx="150" cy="10" r="9" fill="{INK}"/>'
                                         f'<rect x="20" y="80" width="260" height="120" rx="16" fill="#E63946" stroke="{INK}" stroke-width="8"/>'
                                         f'<text x="150" y="160" font-family="Montserrat, sans-serif" font-weight="800" font-size="64" text-anchor="middle" fill="#FFFFFF">CLOSED</text>'))
    print("\n".join(sorted(f for f in os.listdir(OUT) if f.endswith(".svg"))))


if __name__ == "__main__":
    main()
