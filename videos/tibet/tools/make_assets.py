"""Vector assets for the Tibet explainer -> ../assets/*.svg"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
INK = "#141416"


def save(name, w, h, body):
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, name), "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>')


def main():
    # top-down airliner (nose pointing right)
    save("plane_top.svg", 200, 200,
         f'<g stroke="{INK}" stroke-width="5" stroke-linejoin="round" fill="#FFFFFF">'
         '<path d="M30,100 Q30,90 44,89 L150,88 Q182,90 190,100 Q182,110 150,112 L44,111 Q30,110 30,100 Z"/>'
         '<path d="M96,90 L70,22 L88,22 L132,90 Z"/><path d="M96,110 L70,178 L88,178 L132,110 Z"/>'
         '<path d="M40,92 L26,64 L38,64 L56,92 Z"/><path d="M40,108 L26,136 L38,136 L56,108 Z"/></g>'
         '<path d="M172,94 Q182,97 184,100 L172,100 Z" fill="#4A6E8C"/>')
    # side-view airliner (nose right)
    save("plane_side.svg", 320, 140,
         f'<path d="M20,70 Q20,52 46,50 L250,46 Q300,46 312,70 Q300,94 250,94 L46,90 Q20,88 20,70 Z" fill="#FFFFFF" stroke="{INK}" stroke-width="7"/>'
         f'<path d="M150,80 L118,120 L146,120 L200,84 Z" fill="#E8EAEE" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
         f'<path d="M40,56 L24,18 L44,18 L70,54 Z" fill="#F4D03F" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
         + "".join(f'<circle cx="{110 + i * 22}" cy="64" r="5.5" fill="#4A6E8C"/>' for i in range(7)) +
         '<path d="M288,60 Q302,62 304,70 L288,70 Z" fill="#4A6E8C"/>'
         f'<ellipse cx="170" cy="96" rx="26" ry="10" fill="#9AA3AE" stroke="{INK}" stroke-width="5"/>')
    # airport: a runway (not a pin)
    save("runway.svg", 140, 140,
         f'<circle cx="70" cy="70" r="62" fill="#2E8B57" stroke="{INK}" stroke-width="6"/>'
         f'<g transform="rotate(-35 70 70)"><rect x="56" y="16" width="28" height="108" rx="4" fill="#2B2D33" stroke="{INK}" stroke-width="4"/>'
         + "".join(f'<rect x="68" y="{26 + i * 18}" width="4" height="10" fill="#FFFFFF"/>' for i in range(5)) + '</g>')
    save("runway_bad.svg", 140, 140,
         f'<circle cx="70" cy="70" r="62" fill="#B03A2E" stroke="{INK}" stroke-width="6"/>'
         f'<g transform="rotate(-35 70 70)"><rect x="58" y="34" width="24" height="72" rx="4" fill="#2B2D33" stroke="{INK}" stroke-width="4"/>'
         + "".join(f'<rect x="68" y="{42 + i * 18}" width="4" height="9" fill="#FFFFFF"/>' for i in range(3)) + '</g>')
    # oxygen mask
    save("oxygen_mask.svg", 160, 200,
         f'<path d="M80,4 L80,60" stroke="#E8EAEE" stroke-width="6"/><path d="M80,60 Q60,70 64,96" stroke="#E8EAEE" stroke-width="6" fill="none"/>'
         f'<path d="M40,110 Q80,84 120,110 L112,160 Q80,182 48,160 Z" fill="#F4D03F" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'
         f'<ellipse cx="80" cy="190" rx="34" ry="8" fill="#FFFFFF" opacity="0.5"/><path d="M20,128 Q40,120 46,134 M140,128 Q120,120 114,134" stroke="#E8EAEE" stroke-width="5" fill="none"/>')
    # oxygen tank badge
    save("oxygen_tank.svg", 160, 160,
         f'<circle cx="80" cy="80" r="74" fill="#1E4D5C" stroke="#F4D03F" stroke-width="7"/>'
         f'<rect x="56" y="40" width="48" height="90" rx="22" fill="#4CB050" stroke="{INK}" stroke-width="5"/>'
         f'<rect x="70" y="26" width="20" height="18" rx="4" fill="#9AA3AE" stroke="{INK}" stroke-width="4"/>'
         f'<text x="80" y="96" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="30" text-anchor="middle" fill="#FFFFFF">O₂</text>')
    # warning triangle
    save("warning.svg", 160, 140,
         f'<path d="M80,10 L152,130 L8,130 Z" fill="#E63946" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
         '<rect x="73" y="50" width="14" height="46" rx="5" fill="#FFFFFF"/><circle cx="80" cy="112" r="8" fill="#FFFFFF"/>')
    # thermometer
    save("thermometer.svg", 80, 220,
         f'<rect x="26" y="10" width="28" height="160" rx="14" fill="#FFFFFF" stroke="{INK}" stroke-width="6"/>'
         f'<circle cx="40" cy="180" r="30" fill="#5DADE2" stroke="{INK}" stroke-width="6"/><rect x="34" y="120" width="12" height="60" fill="#5DADE2"/>'
         + "".join(f'<rect x="54" y="{30 + i * 22}" width="12" height="4" fill="{INK}"/>' for i in range(6)))
    print("\n".join(sorted(os.listdir(OUT))))


if __name__ == "__main__":
    main()
