"""Derive the native 9:16 version of the animation (src/app_v.js) from the 16:9 one (src/app.js)."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "..")
s = open(os.path.join(R, "src", "app.js")).read()

def rep(a, b, count=1):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b) if count == 0 else s.replace(a, b, count)

rep("const W = 1920, H = 1080, DURATION = 195;", "const W = 1080, H = 1920, DURATION = 195;")
rep("const CAPTION = { size: 50, y: 968,", "const CAPTION = { size: 60, y: 1440,")
k0, k1 = s.index("const KEYS = ["), s.index("];", s.index("const KEYS = [")) + 2
s = s[:k0] + """const KEYS = [
  [0, Mv(-15, 32, 7.2)], [10.8, Mv(-12, 30, 7.4)], [18.3, Mv(10, 32, 3.0)], [31.3, Mv(10, 32, 3.05)], [37.8, Mv(-15, 30, 4.5)],
  [42.0, Ov(-30, 0, 480)], [47.0, Ov(-38, 18, 490)], [52.5, Ov(-45, 0, 500)], [56.5, Ev(-30, 25, 3.0)], [60.0, Ev(-35, 26, 13)], [72.4, Ev(-35, 26, 13.5)],
  [75.6, Mv(-35, 26, 13.5)], [88, Mv(-35, 26, 13.5)], [91, Mv(20, 30, 5.0)], [103, Mv(20, 30, 5.0)], [105.6, Av(10, 0, 3.0)],
  [109, Av(10, 0, 3.0)], [114.2, Mv(10, 32, 3.0)], [137, Mv(10, 32, 3.0)], [147.3, Mv(BCN[0], BCN[1], 6)], [153.5, Mv(BCN[0], BCN[1], 140000)],
  [166, Mv(BCN[0], BCN[1], 160000)], [172, Mv(-10, 30, 4.0)], [175.5, Ov(20, 0, 480)], [177.8, Ov(30, 12, 480)], [180.2, Ov(10, 0, 480)], [183.0, Mv(-10, 30, 4.0)], [188.8, Mv(-10, 30, 4.0)],
  [191.2, Ov(0, 0, 480)], [195, Ov(-25, 10, 480)],
];""" + s[k1:]
# top-anchored titles move down below TikTok/Shorts top UI
s = re.sub(r"((?:chip|gold)\(ctx, '[^']*', W / 2)( [+-] \d+)?, 1[0-9]{2},", lambda m: m.group(1) + {" - 330": " - 230", " + 330": " + 230", " - 300": " - 230", " + 300": " + 230", " + 120": ""}.get(m.group(2) or "", m.group(2) or "") + ", 330,", s)
rep("gold(ctx, '1569 · GERARDUS MERCATOR', W / 2, 330, 56,", "gold(ctx, '1569 · GERARDUS MERCATOR', W / 2, 330, 50,")
rep("ctx.moveTo(560, y); ctx.lineTo(1360, y);", "ctx.moveTo(140, y); ctx.lineTo(940, y);")
rep("for (const [x, s] of [[560, -1], [1360, 1]])", "for (const [x, s] of [[140, -1], [940, 1]])")
rep("for (const y of [260, 820]) {", "for (const y of [520, 1340]) {")
rep("sprite(ctx, 'warn_badge', W / 2, 140, 560,", "sprite(ctx, 'warn_badge', W / 2, 330, 560,")
rep("sprite(ctx, 'compass_rose', 240, 760, 200,", "sprite(ctx, 'compass_rose', 880, 1180, 200,")
rep("sprite(ctx, 'mercator', 230, 760, 300,", "sprite(ctx, 'mercator', 220, 1180, 300,")
rep("chip(ctx, '90° EVERYWHERE', W / 2 + 120, 230,", "chip(ctx, '90° EVERYWHERE', W / 2, 440,")
rep("for (const y of [180, 880]) {", "for (const y of [560, 1360]) {")
s = s.replace("ctx.moveTo(1700, 540); ctx.lineTo(1700, y)", "ctx.moveTo(990, 960); ctx.lineTo(990, y)")
s = s.replace("const s = y < 540 ? -1 : 1; ctx.beginPath(); ctx.moveTo(1700, y + s * 26); ctx.lineTo(1682, y - s * 6); ctx.lineTo(1718, y - s * 6);",
              "const s = y < 960 ? -1 : 1; ctx.beginPath(); ctx.moveTo(990, y + s * 26); ctx.lineTo(972, y - s * 6); ctx.lineTo(1008, y - s * 6);")
rep("sprite(ctx, 'compass_rose', 1680, 760, 200,", "sprite(ctx, 'compass_rose', 880, 1180, 200,")
rep("sprite(ctx, 'compass_rose', 1700, 280, 200,", "sprite(ctx, 'compass_rose', W / 2, 560, 200,")
rep("const im = IMG.phone_frame; if (im) { const h = 1000,", "const im = IMG.phone_frame; if (im) { const h = 1560,")
rep("chip(ctx, 'WEB MERCATOR', W / 2 + 520, 220,", "chip(ctx, 'WEB MERCATOR', W / 2, 1800,")
# Mercator runs to infinity at the poles: extend Antarctica's ice below the data's -85 deg cut instead of a flat edge
rep("  ctx.strokeStyle = C.coast; ctx.lineWidth = 1.6; ctx.stroke(p);\n}", """  if (c.type === 'M' || c.type === 'E' || c.type === 'A') {
    const yc = c.proj(c.a.lon, -84.9)[1];
    const yb = c.type === 'M' ? H : Math.min(H, c.proj(c.a.lon, -90)[1]);
    if (yc < yb) { ctx.fillStyle = C.land; ctx.fillRect(0, yc - 2, W, yb - yc + 2); ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, yc - 2, W, yb - yc + 2); ctx.restore(); }
  }
  ctx.strokeStyle = C.coast; ctx.lineWidth = 1.6; ctx.stroke(p);
}""")
open(os.path.join(R, "src", "app_v.js"), "w").write(s)
print("app_v.js written")
