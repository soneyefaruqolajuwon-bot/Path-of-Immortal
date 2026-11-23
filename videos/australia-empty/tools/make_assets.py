"""SVG kit for the 'empty middle of Australia' short -> ../assets/*.svg
The British settler acts for Britain, so he wears the UK flag as a cape; the explorer and beach locals are ordinary people (no cape)."""
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


def brim_hat(col="#8B6A3E", band="#3A2A18"):
    return (f'<ellipse cx="{CX}" cy="{HY - HR * 0.6:.0f}" rx="{HR * 1.55:.0f}" ry="{HR * 0.3:.0f}" fill="{col}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M{CX - HR * 0.8:.0f},{HY - HR * 0.65:.0f} Q{CX - HR * 0.75:.0f},{HY - HR * 1.55:.0f} {CX},{HY - HR * 1.4:.0f} Q{CX + HR * 0.75:.0f},{HY - HR * 1.55:.0f} {CX + HR * 0.8:.0f},{HY - HR * 0.65:.0f} Z" fill="{col}" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="{CX - HR * 0.8:.0f}" y="{HY - HR * 0.88:.0f}" width="{HR * 1.6:.0f}" height="{HR * 0.18:.0f}" fill="{band}"/>')


def cork_hat():
    corks = "".join(f'<line x1="{CX + dx * HR:.0f}" y1="{HY - HR * 0.55:.0f}" x2="{CX + dx * HR:.0f}" y2="{HY - HR * 0.1:.0f}" stroke="{INK}" stroke-width="3"/>'
                    f'<rect x="{CX + dx * HR - 7:.0f}" y="{HY - HR * 0.1:.0f}" width="14" height="20" rx="4" fill="#C8A26B" stroke="{INK}" stroke-width="3"/>' for dx in (-1.3, -0.85, 0.85, 1.3))
    return brim_hat("#C9A86A", "#7A5A30") + corks


def canteen(x, y, ang):
    return (f'<g transform="translate({x:.0f},{y:.0f}) rotate({ang})"><ellipse cx="0" cy="20" rx="30" ry="36" fill="#7A8A6A" stroke="{INK}" stroke-width="6"/>'
            f'<rect x="-9" y="-24" width="18" height="16" fill="#555" stroke="{INK}" stroke-width="4"/></g>')


def chibi_extra(name, o, extra_back="", extra_front=""):
    p, hands = PR.chibi(o)
    save(name, svg(300, 520, f'<g transform="translate(0,80)">{extra_back}{"".join(p)}{extra_front}</g>'))


def main():
    # explorer: sweating, cork hat, upturned empty canteen
    for nm, o in dict(thirsty=dict(rarm=-70, larm=110, face="panic"), squint=dict(rarm=-120, larm=100, face="flat")).items():
        rx, ry = hand("rarm", o["rarm"]); lx, ly = hand("larm", o["larm"])
        ex = (canteen(rx + 34, ry - 70, 160) if nm == "thirsty" else canteen(lx, ly + 10, 10)) + '<g fill="#7FD3FF" stroke="#141416" stroke-width="3">' + (f'<circle cx="{rx + 30:.0f}" cy="{ry - 20:.0f}" r="6"/>' if nm == "thirsty" else "") + "</g>"
        chibi_extra(f"explorer_{nm}.svg", dict(coat="#C9B07A", pants="#6B5A3A", head="#F0B98E", stressed=True, sweat=True, **o), "", cork_hat() + ex)
    # beach locals: sun hat + surfboard
    for nm, (coat, hat) in dict(surfer=("#2EC4B6", "#F4D03F"), local=("#FF8C42", "#FFFFFF")).items():
        board = f'<g transform="rotate(-12 60 300)"><ellipse cx="60" cy="300" rx="26" ry="150" fill="#FFD166" stroke="{INK}" stroke-width="6"/><line x1="60" y1="160" x2="60" y2="440" stroke="#EF476F" stroke-width="6"/></g>'
        chibi_extra(f"beach_{nm}.svg", dict(coat=coat, pants="#1D3557", head=SK, rarm=-50, larm=160, face="smile"), board, brim_hat(hat, "#E63946"))
    # British settler (UK cape), herding
    for nm, o in dict(walk=dict(rarm=-20, larm=120, face="smile"), sad=dict(rarm=100, larm=80, face="flat", stressed=True, sweat=True)).items():
        rx, ry = hand("rarm", o["rarm"])
        crook = f'<path d="M{rx:.0f},{ry + 60:.0f} L{rx + 6:.0f},{ry - 150:.0f} q2,-34 -26,-34 q-24,0 -22,24" fill="none" stroke="#6B4423" stroke-width="10" stroke-linecap="round"/>' if nm == "walk" else ""
        GM.caped_person(f"settler_{nm}", PR.flag_uk, dict(coat="#6E4B2A", pants="#3A3A40", head=SK, beard="chops", beard_c="#8A5A3A", **o), arms_extra=brim_hat() + crook)
    save("cow.svg", svg(170, 120, f'<ellipse cx="80" cy="60" rx="62" ry="34" fill="#FFFFFF" stroke="{INK}" stroke-width="5"/><ellipse cx="60" cy="52" rx="18" ry="12" fill="{INK}"/><ellipse cx="105" cy="70" rx="14" ry="9" fill="{INK}"/>'
                                  f'<ellipse cx="146" cy="48" rx="20" ry="16" fill="#C9906A" stroke="{INK}" stroke-width="5"/><circle cx="150" cy="44" r="3" fill="{INK}"/>'
                                  + "".join(f'<rect x="{x}" y="86" width="9" height="28" fill="{INK}"/>' for x in (36, 56, 96, 116))))
    stalk = lambda c, droop: "".join(f'<path d="M{20 + i * 22},110 Q{20 + i * 22 + droop * 0.4},{70} {20 + i * 22 + droop},{38 + abs(droop) * 0.6}" stroke="{c}" stroke-width="6" fill="none"/>'
                                     f'<ellipse cx="{20 + i * 22 + droop}" cy="{30 + abs(droop) * 0.6}" rx="8" ry="16" fill="{c}" stroke="{INK}" stroke-width="3" transform="rotate({droop} {20 + i * 22 + droop} {30 + abs(droop) * 0.6})"/>' for i in range(5))
    save("wheat_ok.svg", svg(130, 120, stalk("#E9C46A", 0)))
    save("wheat_dead.svg", svg(130, 120, stalk("#8D6E4A", 26)))
    save("sun.svg", svg(240, 240, "".join(f'<line x1="120" y1="120" x2="{120 + 110 * math.cos(i * math.pi / 6):.0f}" y2="{120 + 110 * math.sin(i * math.pi / 6):.0f}" stroke="#F4A61D" stroke-width="12" stroke-linecap="round"/>' for i in range(12))
                                  + f'<circle cx="120" cy="120" r="70" fill="#FFC93C" stroke="{INK}" stroke-width="7"/><circle cx="96" cy="112" r="7" fill="{INK}"/><circle cx="144" cy="112" r="7" fill="{INK}"/>'
                                  f'<path d="M84,94 L108,102 M156,94 L132,102" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M100,148 Q120,136 140,148" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/>'))
    print(len(os.listdir(OUT)), "files")


if __name__ == "__main__":
    main()
