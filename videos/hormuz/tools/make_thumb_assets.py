"""Extra character for the 'IF THIS CLOSES' thumbnail: an Iranian officer in a flag cape holding a big key (house style: caped people, not flag-faces)."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
def load(name, path):
    s = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
HZ = load("hz", os.path.join(HERE, "make_assets.py"))
GM = load("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py")); GM.OUT = os.path.join(HERE, "..", "assets")
INK = GM.INK
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23
rarm = -55
hx, hy = CX + S * 0.13 + S * 0.22 * math.cos(math.radians(rarm)), FEET - S * 0.36 + S * 0.22 * math.sin(math.radians(rarm))
key = (f'<g transform="translate({hx:.0f},{hy:.0f}) rotate(-35)"><circle cx="0" cy="-58" r="34" fill="#F4D03F" stroke="{INK}" stroke-width="7"/><circle cx="0" cy="-58" r="13" fill="#7A5A10" stroke="{INK}" stroke-width="5"/>'
       f'<rect x="-9" y="-26" width="18" height="96" fill="#F4D03F" stroke="{INK}" stroke-width="6"/><rect x="9" y="40" width="24" height="12" fill="#F4D03F" stroke="{INK}" stroke-width="5"/><rect x="9" y="58" width="16" height="12" fill="#F4D03F" stroke="{INK}" stroke-width="5"/></g>')
cap = (f'<path d="M{CX - HR * 0.85:.0f},{HY - HR * 0.55:.0f} Q{CX - HR * 0.8:.0f},{HY - HR * 1.3:.0f} {CX + HR * 0.1:.0f},{HY - HR * 1.32:.0f} Q{CX + HR * 0.95:.0f},{HY - HR * 1.25:.0f} {CX + HR * 0.85:.0f},{HY - HR * 0.55:.0f} Z" fill="#3E4A2E" stroke="{INK}" stroke-width="5"/>'
       f'<path d="M{CX - HR * 0.95:.0f},{HY - HR * 0.5:.0f} Q{CX + HR * 0.4:.0f},{HY - HR * 0.75:.0f} {CX + HR * 1.25:.0f},{HY - HR * 0.38:.0f} L{CX + HR * 0.9:.0f},{HY - HR * 0.6:.0f} Z" fill="#232A1A" stroke="{INK}" stroke-width="4"/>'
       f'<circle cx="{CX:.0f}" cy="{HY - HR * 0.95:.0f}" r="12" fill="#F4D03F" stroke="{INK}" stroke-width="3"/>')
smirk = (f'<rect x="{CX - HR * 0.4:.0f}" y="{HY + HR * 0.3:.0f}" width="{HR * 0.8:.0f}" height="{HR * 0.4:.0f}" fill="#E8B88A"/>'
         f'<path d="M{CX - HR * 0.28:.0f},{HY + HR * 0.48:.0f} Q{CX + HR * 0.05:.0f},{HY + HR * 0.56:.0f} {CX + HR * 0.32:.0f},{HY + HR * 0.36:.0f}" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round"/>'
         + "".join(f'<path d="M{CX + sd * HR * 0.62:.0f},{HY - HR * 0.32:.0f} L{CX + sd * HR * 0.14:.0f},{HY - HR * 0.22:.0f}" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>' for sd in (-1, 1)))
GM.caped_person("iran_officer_key", HZ.flag_irn, dict(coat="#55603F", pants="#2E3424", head="#E8B88A", beard="chin", beard_c="#2A1E14", rarm=rarm, larm=110, face="flat"), arms_extra=smirk + cap + key)
print("ok")
