"""SVG assets for the France–Brazil short -> ../assets/*.svg (reuses the Gambia/Point Roberts generators)."""
import importlib.util, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM)
GM.OUT = OUT
PR, INK, svg, star_pts = GM.PR, GM.INK, GM.svg, GM.star_pts


def save(name, content):
    os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, name), "w").write(content)


def flag_esp(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#AA151B"/>'
            f'<rect x="{x}" y="{y + h/4:.1f}" width="{w}" height="{h/2:.1f}" fill="#F1BF00"/>')


def flag_deu(x, y, w, h):
    return "".join(f'<rect x="{x}" y="{y + i*h/3:.1f}" width="{w}" height="{h/3 + 0.5:.1f}" fill="{c}"/>' for i, c in enumerate(("#000000", "#DD0000", "#FFCE00")))


def flag_bra(x, y, w, h):
    cx, cy = x + w / 2, y + h / 2
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#009C3B"/>'
            f'<polygon points="{cx},{y + h*0.1:.1f} {x + w*0.92:.1f},{cy} {cx},{y + h*0.9:.1f} {x + w*0.08:.1f},{cy}" fill="#FFDF00"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{h*0.24:.1f}" fill="#002776"/>'
            f'<path d="M{cx - h*0.24:.1f},{cy - h*0.03:.1f} Q{cx},{cy - h*0.12:.1f} {cx + h*0.23:.1f},{cy + h*0.06:.1f}" stroke="#FFFFFF" stroke-width="{h*0.05:.1f}" fill="none"/>')


def main():
    flags = {"fra": GM.flag_fra, "esp": flag_esp, "deu": flag_deu, "bra": flag_bra}
    for iso, fn in flags.items():
        save(f"marker_{iso}.svg", GM.marker(iso, fn))
    # people (flag capes): a resident of French Guiana (French cape, passport) and a Brazilian neighbour
    GM.caped_person("guiana_resident", GM.flag_fra, dict(coat="#2E9B4F", pants="#2B2B33", rarm=-40, larm=120, face="smile", cheeks=True,
                                                         hair_long=True, hair_c="#2B1A10", dress=True))
    GM.caped_person("brazilian", flag_bra, dict(coat="#FFDF00", pants="#1F3A68", rarm=-60, larm=120, face="smile", cheeks=True, beard="chin", beard_c="#3A2614"))
    GM.caped_person("french_man", GM.flag_fra, dict(coat="#2B3A8C", pants="#2B2B33", rarm=20, larm=120, face="smile"), hat="beret")
    # icons
    def badge(name, inner, label=None):
        save(name, svg(220, 220, f'<circle cx="110" cy="110" r="100" fill="#0F2E38" stroke="#F4D03F" stroke-width="8"/>{inner}'))
    badge("icon_vote.svg", f'<rect x="60" y="100" width="100" height="70" rx="8" fill="#FFFFFF" stroke="{INK}" stroke-width="6"/>'
                       f'<rect x="88" y="94" width="44" height="10" rx="3" fill="{INK}"/>'
                       f'<path d="M80,60 L140,60 L140,110 L80,110 Z" fill="#F4F1E6" stroke="{INK}" stroke-width="5"/>'
                       f'<path d="M92,84 l12,12 l22,-24" stroke="#2E9B4F" stroke-width="8" fill="none" stroke-linecap="round"/>'
                       f'<rect x="72" y="140" width="76" height="10" fill="#002395"/>')
    badge("icon_euro.svg", f'<circle cx="110" cy="110" r="62" fill="#F4D03F" stroke="{INK}" stroke-width="6"/>'
                       f'<text x="114" y="138" font-family="Montserrat, sans-serif" font-weight="800" font-size="84" text-anchor="middle" fill="{INK}">€</text>')
    badge("icon_passport.svg", f'<rect x="68" y="50" width="84" height="120" rx="10" fill="#7A1F2B" stroke="{INK}" stroke-width="6"/>'
                           f'<circle cx="110" cy="100" r="22" fill="none" stroke="#E8C55A" stroke-width="5"/>'
                           f'<text x="110" y="150" font-family="Montserrat, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#E8C55A">PASSEPORT</text>'
                           + f'<g transform="translate(120,128)">{GM.flag_fra(0, 0, 44, 30)}<rect x="0" y="0" width="44" height="30" fill="none" stroke="{INK}" stroke-width="3"/></g>')
    # rocket (Ariane-style), drawn upright
    rocket = (f'<path d="M60,20 Q80,40 80,90 L80,250 L40,250 L40,90 Q40,40 60,20 Z" fill="#F4F6F8" stroke="{INK}" stroke-width="6"/>'
              f'<rect x="40" y="120" width="40" height="14" fill="#002395"/><rect x="40" y="134" width="40" height="8" fill="#ED2939"/>'
              f'<path d="M40,190 L10,250 L40,250 Z M80,190 L110,250 L80,250 Z" fill="#B8322A" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
              f'<rect x="12" y="150" width="22" height="100" rx="10" fill="#E9EDF0" stroke="{INK}" stroke-width="5"/>'
              f'<rect x="86" y="150" width="22" height="100" rx="10" fill="#E9EDF0" stroke="{INK}" stroke-width="5"/>')
    save("rocket.svg", svg(120, 270, rocket))
    print("\n".join(sorted(f for f in os.listdir(OUT) if f.endswith(".svg"))))


if __name__ == "__main__":
    main()
