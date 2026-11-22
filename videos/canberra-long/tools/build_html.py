"""Bundle app.js + geometry + SVG assets + fonts into one self-contained dist/tibet.html."""
import base64, glob, json, os, sys
SHORT = "short" in sys.argv[1:]
HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "..")

def b64(path):
    return base64.b64encode(open(path, "rb").read()).decode()

assets = {os.path.splitext(os.path.basename(f))[0]: "data:image/svg+xml;base64," + b64(f)
          for f in sorted(glob.glob(os.path.join(R, "assets", "*.svg")))}
fonts = "".join(
    f'@font-face{{font-family:"{fam}";font-weight:800;src:url(data:font/woff2;base64,{b64(os.path.join(R, "assets", "fonts", fn))}) format("woff2")}}'
    for fam, fn in (("Montserrat", "montserrat-latin-800-normal.woff2"), ("Playfair Display", "playfair-display-latin-800-normal.woff2")))
audio_f = os.path.join(R, "dist", "mix.mp3")
audio_js = f"window.AUDIO='data:audio/mpeg;base64,{b64(audio_f)}';" if os.path.exists(audio_f) else ""
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Canberra Part 2</title>
<style>{fonts}
:root{{--bg:#0b1a20;--fg:#e8eef0}}
html,body{{margin:0;height:100%;background:var(--bg);color:var(--fg);font-family:Montserrat,system-ui,sans-serif;overflow:hidden}}
#wrap{{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:8px 16px;box-sizing:border-box}}
canvas{{{"height:calc(100% - 64px);max-width:100%;aspect-ratio:9/16;" if SHORT else "width:min(100%,calc((100vh - 70px) * 16 / 9));aspect-ratio:16/9;"}object-fit:contain;border-radius:10px;box-shadow:0 6px 30px #0008}}
#ctl{{display:none;gap:10px;align-items:center;width:min(100%,420px)}}
#ctl button{{font:inherit;font-size:18px;width:44px;height:40px;border-radius:10px;border:0;background:#F4D03F;color:#141416}}
#ctl input{{flex:1}}
body.render #wrap{{padding:0}} body.render canvas{{height:auto;width:{1080 if SHORT else 1920}px;border-radius:0;box-shadow:none}}
</style></head><body>
<div id="wrap"><canvas id="cv" width="{1080 if SHORT else 1920}" height="{1920 if SHORT else 1080}"></canvas>
<div id="ctl"><button id="play" aria-label="Play">▶</button><input id="bar" type="range" min="0" max="183.4" step="0.01" value="0"></div></div>
<audio id="aud" preload="auto"></audio>
<script>if(location.search.includes('render'))document.body.classList.add('render');
window.ASSETS={json.dumps(assets)};{'window.VERTICAL=true;window.SHORT_END=74.6;' if SHORT else audio_js}</script>
<script>{open(os.path.join(R, "src", "geo_data.js")).read()}</script>
<script>{open(os.path.join(R, "src", "app.js")).read()}</script>
</body></html>"""
out = os.path.join(R, "dist", "canberra_long.html")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w").write(html)
print(out, os.path.getsize(out) // 1024, "KB")
