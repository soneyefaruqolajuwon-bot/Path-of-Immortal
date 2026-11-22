"""Twilight rim-lit stickman kit -> ../assets/*.svg

Characters are matte black stick figures with one flat-coloured garment. The rim light is a warm amber copy of the
whole figure, offset toward the light (up-right), drawn underneath: only the lit edges show.
Poses are joint angles (degrees, 0 = straight down, positive = toward the figure's front/right).
"""
import math, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "assets")
INK, RIM, RIM2, WHITE = "#0B0D12", "#F5B041", "#E59866", "#FFFFFF"
CORAL, YELLOW, LAB, GREEN = "#D9534F", "#F2C230", "#EDEFF2", "#3E8E5E"
W, H = 240, 440
HIP = (120, 270); SHO = (120, 160); HEAD = (120, 104); HR = 38
UA, LA, UL, LL, LIMB = 58, 54, 66, 64, 15


def P(o, ang, ln):
    a = math.radians(ang); return (o[0] + ln * math.sin(a), o[1] + ln * math.cos(a))


def save(n, body): os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, n), "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{body}</svg>')


def line(a, b, w, c): return f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'


def poly(pts, c, extra=""): return f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in pts)}" fill="{c}" stroke="{c}" stroke-width="6" stroke-linejoin="round" {extra}/>'


POSES = {   # (arm_back up, arm_back low, arm_front up, arm_front low, leg_back up, leg_back low, leg_front up, leg_front low, lean, bob)
    "stand": (-14, -6, 14, 6, -6, -4, 6, 4, 0, 0),
    "run_a": (-60, 30, 55, 120, -40, -100, 45, 10, 12, -6),
    "run_b": (50, 110, -55, 20, 40, 5, -35, -95, 12, 4),
    "catch": (-40, 20, 128, 168, -20, -70, 30, 0, 6, -14),
    "point": (-12, -4, 85, 95, -6, -4, 8, 4, 0, 0),
    "cheer": (-128, -160, 128, 160, -8, -4, 8, 4, 0, -6),
    "wave": (-14, -6, 125, 195, -6, -4, 6, 4, 0, 0),
    "kick": (-70, -20, 50, 90, -10, -30, 80, 95, -6, -4),
}


def figure(pose, garment, face="smile"):
    ab, abl, af, afl, lb, lbl, lf, lfl, lean, bob = POSES[pose]
    hip = (HIP[0], HIP[1] + bob); sho = P(hip, 180 + lean, 110); head = P(sho, 180 + lean, 56)
    eb = P(sho, ab, UA); hb = P(eb, abl, LA); ef = P(sho, af, UA); hf = P(ef, afl, LA)
    kb = P(hip, lb, UL); fb = P(kb, lbl, LL); kf = P(hip, lf, UL); ff = P(kf, lfl, LL)
    body, cloth_back, cloth_front, hat = [], [], [], []
    body += [line(hip, kb, LIMB, INK), line(kb, fb, LIMB, INK), line(hip, kf, LIMB, INK), line(kf, ff, LIMB, INK)]
    body += [line(fb, (fb[0] + 14, fb[1]), LIMB, INK), line(ff, (ff[0] + 14, ff[1]), LIMB, INK)]
    body += [line(sho, eb, LIMB, INK), line(eb, hb, LIMB, INK)]
    body += [line(hip, sho, LIMB + 4, INK)]
    tx, ty = sho[0] - hip[0], sho[1] - hip[1]
    nx, ny = -ty / 110, tx / 110          # normal to torso
    torso = lambda wt, wb, top=0, bot=0: [(sho[0] + nx * wt + tx * top, sho[1] + ny * wt + ty * top), (sho[0] - nx * wt + tx * top, sho[1] - ny * wt + ty * top),
                                          (hip[0] - nx * wb - tx * bot, hip[1] - ny * wb - ty * bot), (hip[0] + nx * wb - tx * bot, hip[1] + ny * wb - ty * bot)]
    g = garment
    if g == "hoodie":
        cloth_back.append(f'<ellipse cx="{head[0] - 22:.1f}" cy="{head[1] + 26:.1f}" rx="30" ry="22" fill="{CORAL}"/>')   # hood
        cloth_front += [poly(torso(30, 27, -0.02, -0.1), CORAL), line(sho, eb, 24, CORAL), line(sho, ef, 24, CORAL)]
        cloth_front.append(line(P(sho, 0, 34), P(sho, 0, 62), 3, "#A83A37"))
        cloth_front.append(f'<rect x="{hip[0] - 18:.1f}" y="{hip[1] - 34:.1f}" width="36" height="14" rx="5" fill="#B9443F"/>')
    elif g == "cap":
        cloth_front += [poly(torso(24, 22, -0.02, -0.06), "#2F5D8C"), line(sho, eb, 21, "#2F5D8C"), line(sho, ef, 21, "#2F5D8C")]
        hat.append(f'<path d="M{head[0] - HR + 2:.1f},{head[1] - 8:.1f} A{HR - 2},{HR - 4} 0 0 1 {head[0] + HR - 2:.1f},{head[1] - 8:.1f} Z" fill="{YELLOW}"/>'
                   f'<path d="M{head[0] + 18:.1f},{head[1] - 12:.1f} L{head[0] + 62:.1f},{head[1] - 6:.1f} L{head[0] + 60:.1f},{head[1]:.1f} L{head[0] + 14:.1f},{head[1] - 2:.1f} Z" fill="{YELLOW}"/>')
    elif g == "lab":
        cloth_front += [poly(torso(28, 36, -0.02, -0.55), LAB), line(sho, eb, 22, LAB), line(sho, ef, 22, LAB)]
        cloth_front.append(line(P(sho, 0, 20), P(hip, 0, 50), 3, "#B8BCC4"))
        cloth_front.append(f'<rect x="{sho[0] + 6:.1f}" y="{sho[1] + 26:.1f}" width="14" height="18" rx="2" fill="#5A9BD5"/>')
        hat.append(f'<path d="M{head[0] - 30:.1f},{head[1] - 20:.1f} q20,-30 56,-14 q-26,-4 -56,14 Z" fill="#2A2D3A"/>')
    elif g == "coach":
        cloth_front += [poly(torso(26, 23, -0.02, -0.06), "#23262F"), line(sho, eb, 21, "#23262F"), line(sho, ef, 21, "#23262F")]
        hat.append(f'<path d="M{head[0] - HR + 2:.1f},{head[1] - 8:.1f} A{HR - 2},{HR - 4} 0 0 1 {head[0] + HR - 2:.1f},{head[1] - 8:.1f} Z" fill="{GREEN}"/>'
                   f'<path d="M{head[0] + 18:.1f},{head[1] - 12:.1f} L{head[0] + 62:.1f},{head[1] - 6:.1f} L{head[0] + 60:.1f},{head[1]:.1f} L{head[0] + 14:.1f},{head[1] - 2:.1f} Z" fill="{GREEN}"/>')
        cloth_front.append(line(P(sho, 160, -2), P(sho, 0, 48), 3, "#C9CED6") + f'<circle cx="{P(sho, 0, 52)[0]:.1f}" cy="{P(sho, 0, 52)[1]:.1f}" r="7" fill="#C9CED6"/>')
    front_arm = [line(sho, ef, LIMB, INK), line(ef, hf, LIMB, INK)]
    front_arm = [line(ef, hf, LIMB, INK)]
    headc = f'<circle cx="{head[0]:.1f}" cy="{head[1]:.1f}" r="{HR}" fill="{INK}"/>'
    hands = f'<circle cx="{hb[0]:.1f}" cy="{hb[1]:.1f}" r="10" fill="{INK}"/><circle cx="{hf[0]:.1f}" cy="{hf[1]:.1f}" r="10" fill="{INK}"/>'
    shape = "".join(cloth_back + body + [headc] + cloth_front + front_arm + [hands] + hat)
    # face (looks right)
    ex, ey = head[0] + 12, head[1] - 4
    if face == "wow":
        eyes = f'<circle cx="{ex - 9}" cy="{ey}" r="7" fill="{WHITE}"/><circle cx="{ex + 13}" cy="{ey}" r="7" fill="{WHITE}"/>'
        mouth = f'<ellipse cx="{ex + 3}" cy="{ey + 20}" rx="6" ry="8" fill="{WHITE}"/>'
    elif face == "happy":
        eyes = (f'<path d="M{ex - 16},{ey + 2} q7,-10 14,0" stroke="{WHITE}" stroke-width="4" fill="none" stroke-linecap="round"/>'
                f'<path d="M{ex + 6},{ey + 2} q7,-10 14,0" stroke="{WHITE}" stroke-width="4" fill="none" stroke-linecap="round"/>')
        mouth = f'<path d="M{ex - 6},{ey + 16} q9,10 18,0" stroke="{WHITE}" stroke-width="4" fill="none" stroke-linecap="round"/>'
    elif face == "focus":
        eyes = f'<ellipse cx="{ex - 9}" cy="{ey}" rx="6" ry="4" fill="{WHITE}"/><ellipse cx="{ex + 13}" cy="{ey}" rx="6" ry="4" fill="{WHITE}"/>'
        mouth = line((ex - 3, ey + 18), (ex + 11, ey + 17), 4, WHITE)
    else:
        eyes = f'<circle cx="{ex - 9}" cy="{ey}" r="6" fill="{WHITE}"/><circle cx="{ex + 13}" cy="{ey}" r="6" fill="{WHITE}"/>'
        mouth = f'<path d="M{ex - 4},{ey + 17} q8,6 16,0" stroke="{WHITE}" stroke-width="4" fill="none" stroke-linecap="round"/>'
    # rim light: amber copies offset toward the light, under the figure
    rim = (f'<g transform="translate(5,-3)" style="filter:none">{recolor(shape, RIM)}</g>'
           f'<g transform="translate(2.5,-1.5)">{recolor(shape, RIM2)}</g>')
    return rim + shape + eyes + mouth


def recolor(s, c):
    import re
    return re.sub(r'(fill|stroke)="#[0-9A-Fa-f]{6}"', lambda m: f'{m.group(1)}="{c}"', s).replace('fill="none"', 'fill="none"')


def bg_assets():
    # badge pills (text uses system sans; the animation draws its own crisp text)
    for name, text, w in (("badge_brand", "BRAND &amp; PRODUCT ADS", 560), ("badge_shorts", "VIRAL SHORTS &amp; REELS", 540), ("badge_youtube", "YOUTUBE EXPLAINERS &amp; STORIES", 720)):
        open(os.path.join(OUT, name + ".svg"), "w").write(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} 84" width="{w}" height="84">'
            f'<rect x="3" y="3" width="{w - 6}" height="78" rx="39" fill="#0B0D12" fill-opacity="0.85" stroke="{RIM}" stroke-width="4"/>'
            f'<circle cx="44" cy="42" r="10" fill="{RIM}"/>'
            f'<text x="{w / 2 + 16}" y="54" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="32" letter-spacing="2" text-anchor="middle" fill="#FFFFFF">{text}</text></svg>')
    # sky + sun backdrop
    open(os.path.join(OUT, "bg_sky.svg"), "w").write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs>'
        '<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#181C2E"/><stop offset="0.45" stop-color="#4A3B5C"/><stop offset="0.78" stop-color="#D98850"/><stop offset="1" stop-color="#F0B070"/></linearGradient>'
        '<radialGradient id="g"><stop offset="0" stop-color="#FFE3A3"/><stop offset="0.25" stop-color="#F5B041" stop-opacity="0.8"/><stop offset="1" stop-color="#D98850" stop-opacity="0"/></radialGradient></defs>'
        '<rect width="1920" height="1080" fill="url(#s)"/></svg>')
    open(os.path.join(OUT, "sun.svg"), "w").write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 920" width="920" height="920"><defs><radialGradient id="g"><stop offset="0" stop-color="#FFE3A3"/>'
        '<stop offset="0.25" stop-color="#F5B041" stop-opacity="0.8"/><stop offset="1" stop-color="#D98850" stop-opacity="0"/></radialGradient></defs>'
        '<circle cx="460" cy="460" r="460" fill="url(#g)"/><circle cx="460" cy="460" r="92" fill="#FFE7B0"/></svg>')
    # café facade (midground)
    win = "".join(f'<rect x="{90 + i * 150}" y="330" width="110" height="170" rx="6" fill="#F7C46C"/><rect x="{90 + i * 150}" y="330" width="110" height="170" rx="6" fill="none" stroke="#0B0D12" stroke-width="10"/>' for i in range(4))
    open(os.path.join(OUT, "bg_cafe.svg"), "w").write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 760" width="760" height="760">'
        f'<rect x="20" y="0" width="720" height="760" fill="{RIM}"/><rect x="14" y="4" width="720" height="760" fill="#13151C"/>'
        + "".join(f'<rect x="{80 + i * 160}" y="60" width="90" height="120" rx="4" fill="{"#F7C46C" if i % 2 == 0 else "#2A2D3A"}"/>' for i in range(4)) +
        f'<path d="M40,250 H740 L700,310 H80 Z" fill="{CORAL}"/>' + "".join(f'<path d="M{80 + i * 77},310 q38,26 77,0" fill="{CORAL if i % 2 else "#B9443F"}"/>' for i in range(8)) +
        f'<rect x="250" y="200" width="260" height="46" rx="8" fill="#0B0D12" stroke="{RIM}" stroke-width="3"/><text x="380" y="235" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="30" text-anchor="middle" fill="#F7C46C" letter-spacing="6">CAFÉ</text>'
        + win + '<rect x="610" y="520" width="100" height="240" fill="#0B0D12"/><rect x="622" y="540" width="76" height="150" fill="#F7C46C" opacity="0.8"/></svg>')
    # stadium bowl silhouette
    open(os.path.join(OUT, "bg_stadium.svg"), "w").write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 520" width="1920" height="520">'
        f'<path d="M0,520 V180 Q960,40 1920,180 V520 Z" fill="{RIM}"/><path d="M0,524 V186 Q960,48 1920,186 V524 Z" fill="#11131B"/>'
        + "".join(f'<rect x="{x}" y="{v}" width="14" height="{520 - v}" fill="#0B0D12"/><rect x="{x - 40}" y="{v - 50}" width="94" height="50" rx="6" fill="#FFF3D0"/>' for x, v in ((200, 30), (1700, 30))) +
        "".join(f'<path d="M0,{300 + r * 50} Q960,{180 + r * 50} 1920,{300 + r * 50}" stroke="#1C1F2B" stroke-width="6" fill="none"/>' for r in range(4)) + '</svg>')


def main():
    os.makedirs(OUT, exist_ok=True)
    cast = {"host": ("hoodie", ["stand", "run_a", "run_b", "catch", "point", "cheer", "kick", "wave"]),
            "capper": ("cap", ["stand", "cheer", "point"]), "scientist": ("lab", ["stand", "cheer", "point"]), "coach": ("coach", ["stand", "cheer", "point"])}
    faces = {"run_a": "focus", "run_b": "focus", "catch": "wow", "cheer": "happy", "kick": "focus"}
    for who, (g, poses) in cast.items():
        for p in poses:
            save(f"{who}_{p}.svg", figure(p, g, faces.get(p, "smile")))
    bg_assets()
    print(len(os.listdir(OUT)) - 1, "assets")


if __name__ == "__main__":
    main()
