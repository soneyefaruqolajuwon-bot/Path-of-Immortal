"""Extra SVGs for the Australia long-form (Part 2) -> ../assets/*.svg (Part 1's kit is copied in alongside).
Goyder worked for the colonial government (British crown) -> UK flag cape; farmers and travellers are ordinary people."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("ae", os.path.join(HERE, "..", "..", "australia-empty", "tools", "make_assets.py"))
AE = importlib.util.module_from_spec(spec); spec.loader.exec_module(AE); AE.OUT = OUT; AE.GM.OUT = OUT
GM, PR, INK, svg = AE.GM, AE.PR, AE.INK, AE.svg
save, hand, brim_hat, SK = AE.save, AE.hand, AE.brim_hat, AE.SK


def cloud(name, face, squash=1.0, col="#F4F6F8", rain=False):
    puffs = [(70, 110, 52), (120, 80, 64), (180, 92, 58), (230, 118, 46), (150, 130, 60)]
    body = "".join(f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r * squash:.0f}" fill="{INK}"/>' for x, y, r in puffs) + "".join(f'<ellipse cx="{x}" cy="{y}" rx="{r - 7}" ry="{(r - 7) * squash:.0f}" fill="{col}"/>' for x, y, r in puffs)
    eyes = {"happy": '<circle cx="128" cy="112" r="8" fill="#141416"/><circle cx="178" cy="112" r="8" fill="#141416"/><path d="M135,135 q18,14 36,0" stroke="#141416" stroke-width="6" fill="none" stroke-linecap="round"/>',
            "strain": '<path d="M116,108 l20,8 M190,108 l-20,8" stroke="#141416" stroke-width="7" stroke-linecap="round"/><path d="M134,140 h40" stroke="#141416" stroke-width="7" stroke-linecap="round"/>',
            "sad": '<circle cx="128" cy="116" r="7" fill="#141416"/><circle cx="178" cy="116" r="7" fill="#141416"/><path d="M135,146 q18,-12 36,0" stroke="#141416" stroke-width="6" fill="none" stroke-linecap="round"/>'}[face]
    drops = "".join(f'<path d="M{x},{y} q-8,14 0,20 q8,-6 0,-20 Z" fill="#5FB3FF" stroke="{INK}" stroke-width="3"/>' for x, y in ((90, 190), (140, 210), (190, 195), (230, 215))) if rain else ""
    save(name, svg(300, 240, body + eyes + drops))


def main():
    cloud("cloud_happy.svg", "happy", rain=True); cloud("cloud_strain.svg", "strain", 0.8, rain=True); cloud("cloud_dry.svg", "sad", 1.0, col="#E9DFC9")
    # farmer at a bore pump; then the spit-take
    for nm, o in dict(pump=dict(rarm=-20, larm=110, face="smile"), spit=dict(rarm=-60, larm=-120, face="panic", stressed=True, sweat=True)).items():
        p, hands = PR.chibi(dict(coat="#B5562E", pants="#3A3A40", head=SK, **o))
        ex = brim_hat("#C9A86A", "#7A5A30")
        if nm == "spit": ex += "".join(f'<circle cx="{CX + 60 + i * 26:.0f}" cy="{HY + 40 + (i % 2) * 10:.0f}" r="{9 - i}" fill="#7FD3FF" stroke="{INK}" stroke-width="2"/>' for i in range(5))
        else:
            hx, hy = hands["rarm"]; ex += f'<g transform="translate({hx:.0f},{hy:.0f}) rotate(10)"><rect x="-12" y="-6" width="24" height="70" rx="8" fill="#F4F1E6" stroke="{INK}" stroke-width="4"/><rect x="-12" y="16" width="24" height="44" fill="#9ED8F0"/></g>'
        save(f"farmer_{nm}.svg", svg(300, 520, f'<g transform="translate(0,80)">{"".join(p)}{ex}</g>'))
    # George Goyder, surveyor (UK cape), with a map and pen
    for nm, o in dict(draw=dict(rarm=-10, larm=60, face="flat"), point=dict(rarm=-45, larm=110, face="smile")).items():
        rx, ry = hand("rarm", o["rarm"])
        ex = brim_hat("#3A3A40", "#1C1C20") + f'<g transform="translate({rx + 10:.0f},{ry:.0f}) rotate(10)"><rect x="-40" y="-50" width="80" height="100" fill="#F4ECD6" stroke="{INK}" stroke-width="5"/><path d="M-30,10 q20,-30 60,-10" stroke="#2E86DE" stroke-width="5" fill="none" stroke-dasharray="8 6"/></g>'
        GM.caped_person(f"goyder_{nm}", PR.flag_uk, dict(coat="#2B2B33", pants="#3A3A40", head=SK, beard="chin", beard_c="#6B4A2A", **o), arms_extra=ex)
    save("headframe.svg", svg(220, 260, f'<path d="M40,250 L90,40 L130,40 L180,250" fill="none" stroke="#5A3B28" stroke-width="12"/><path d="M60,170 L160,170 M75,110 L145,110" stroke="#5A3B28" stroke-width="9"/>'
                                         f'<circle cx="110" cy="40" r="26" fill="#9AA3AE" stroke="{INK}" stroke-width="7"/><circle cx="110" cy="40" r="7" fill="{INK}"/><rect x="20" y="236" width="180" height="20" fill="#B5562E" stroke="{INK}" stroke-width="5"/>'
                                         f'<path d="M110,40 L110,236" stroke="{INK}" stroke-width="3"/><circle cx="60" cy="226" r="14" fill="#F4D03F" stroke="{INK}" stroke-width="4"/><circle cx="160" cy="228" r="11" fill="#F4D03F" stroke="{INK}" stroke-width="4"/>'))
    save("town.svg", svg(240, 170, "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{170 - y - 10}" fill="{c}" stroke="{INK}" stroke-width="5"/><path d="M{x - 6},{y + 4} L{x + w / 2},{y - 26} L{x + w + 6},{y + 4} Z" fill="#C0504D" stroke="{INK}" stroke-width="5"/>' for x, y, w, c in ((20, 80, 60, "#EFE6D2"), (95, 60, 60, "#F4D9A8"), (170, 90, 50, "#E9D8A6")))
                                 + f'<rect x="0" y="156" width="240" height="14" fill="#B5562E"/>'))
    save("truck.svg", svg(420, 130, f'<rect x="10" y="30" width="80" height="70" rx="10" fill="#E63946" stroke="{INK}" stroke-width="6"/><rect x="24" y="40" width="40" height="28" fill="#BFE9F5" stroke="{INK}" stroke-width="4"/>'
                                    + "".join(f'<rect x="{100 + i * 104}" y="20" width="96" height="80" fill="#C9CED6" stroke="{INK}" stroke-width="6"/>' for i in range(3))
                                    + "".join(f'<circle cx="{x}" cy="108" r="16" fill="{INK}"/>' for x in (40, 75, 130, 170, 234, 274, 338, 378))))
    save("plane.svg", svg(240, 120, f'<path d="M20,60 Q120,40 220,58 Q230,62 220,66 Q120,80 20,66 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="6"/><path d="M110,58 L80,14 L104,14 L140,58 Z M110,66 L80,108 L104,108 L140,66 Z" fill="#E9EEF2" stroke="{INK}" stroke-width="5"/>'
                                    f'<path d="M24,60 L10,30 L30,30 L48,58 Z" fill="#2E86DE" stroke="{INK}" stroke-width="5"/>' + "".join(f'<circle cx="{150 + i * 16}" cy="58" r="4" fill="#9BC1D9"/>' for i in range(4))))
    save("waterhole.svg", svg(160, 90, f'<ellipse cx="80" cy="50" rx="74" ry="34" fill="#B5562E" stroke="{INK}" stroke-width="5"/><ellipse cx="80" cy="50" rx="52" ry="22" fill="#5FB3FF" stroke="{INK}" stroke-width="4"/><path d="M60,44 q10,-6 20,0" stroke="#fff" stroke-width="4" fill="none"/>'))
    save("pump.svg", svg(160, 200, f'<rect x="60" y="40" width="40" height="150" fill="#9AA3AE" stroke="{INK}" stroke-width="6"/><path d="M80,60 L150,30" stroke="{INK}" stroke-width="10" stroke-linecap="round"/><path d="M100,110 L140,110 L140,130" fill="none" stroke="#9AA3AE" stroke-width="16"/>'
                                    f'<rect x="20" y="186" width="120" height="12" fill="#5A3B28"/>'))
    print(len(os.listdir(OUT)), "files")


CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
if __name__ == "__main__":
    main()
