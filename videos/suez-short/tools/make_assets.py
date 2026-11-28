"""SVG kit for the Suez Short: Egypt's canal officer in an Egyptian-flag cape (house rule)."""
import importlib.util, math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
spec = importlib.util.spec_from_file_location("gm", os.path.join(HERE, "..", "..", "gambia", "tools", "make_assets.py"))
GM = importlib.util.module_from_spec(spec); spec.loader.exec_module(GM); GM.OUT = OUT
PR, INK = GM.PR, GM.INK
CX, FEET, S = 150, 420, 440 * 0.95
HY, HR = FEET - S * 0.68, S * 0.23


def flag_egy(x, y, w, h):
    eagle = f'<circle cx="{x + w * 0.5:.0f}" cy="{y + h * 0.5:.0f}" r="{h * 0.09:.0f}" fill="#C09300"/>'
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h / 3:.1f}" fill="#CE1126"/><rect x="{x}" y="{y + h / 3:.1f}" width="{w}" height="{h / 3 + 0.5:.1f}" fill="#FFFFFF"/>'
            f'<rect x="{x}" y="{y + 2 * h / 3:.1f}" width="{w}" height="{h / 3 + 0.5:.1f}" fill="#000000"/>' + eagle)


CAP = (f'<path d="M{CX - HR * 0.98:.0f},{HY - HR * 0.4:.0f} Q{CX - HR:.0f},{HY - HR * 1.25:.0f} {CX:.0f},{HY - HR * 1.25:.0f} Q{CX + HR:.0f},{HY - HR * 1.25:.0f} {CX + HR * 0.98:.0f},{HY - HR * 0.4:.0f} Z" fill="#F4F1EA" stroke="{INK}" stroke-width="5"/>'
       f'<path d="M{CX + HR * 0.4:.0f},{HY - HR * 0.48:.0f} L{CX + HR * 1.55:.0f},{HY - HR * 0.42:.0f} L{CX + HR * 0.9:.0f},{HY - HR * 0.6:.0f} Z" fill="#1F3B73" stroke="{INK}" stroke-width="4"/>')


def main():
    os.makedirs(OUT, exist_ok=True)
    GM.caped_person("egypt_panic", flag_egy, dict(coat="#1F3B73", pants="#2B2B33", rarm=-35, larm=-145, face="panic"), arms_extra=CAP)
    GM.caped_person("egypt_cheer", flag_egy, dict(coat="#1F3B73", pants="#2B2B33", rarm=-35, larm=-145, face="smile"), arms_extra=CAP)
    print(sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
