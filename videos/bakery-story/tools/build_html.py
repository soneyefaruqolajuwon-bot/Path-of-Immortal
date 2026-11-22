"""Bundle app.js + SVG assets + fonts (+ voiced timeline and audio when present) into dist/portfolio_ad.html."""
import base64, glob, json, os, sys
VERT = True
FULLV = "full" in sys.argv[1:]
YTV = "youtube" in sys.argv[1:]
HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "..")


def b64(path):
    return base64.b64encode(open(path, "rb").read()).decode()


assets = {os.path.splitext(os.path.basename(f))[0]: "data:image/svg+xml;base64," + b64(f)
          for f in sorted(glob.glob(os.path.join(R, "assets", "*.svg")))}
fonts = f'@font-face{{font-family:"Montserrat";font-weight:800;src:url(data:font/woff2;base64,{b64(os.path.join(R, "assets", "fonts", "montserrat-latin-800-normal.woff2"))}) format("woff2")}}'
sync_js = ""
sync_f, audio_f = os.path.join(R, "dist", "sync.json"), os.path.join(R, "dist", "mix.mp3")
if os.path.exists(sync_f) and os.path.exists(audio_f):
    sync_js = f"window.SYNC={open(sync_f).read()};window.AUDIO='data:audio/mpeg;base64,{b64(audio_f)}';"
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bakery Story</title>
<style>{fonts}
:root{{--bg:#0b0d12;--fg:#e8e2d6}}
html,body{{margin:0;height:100%;background:var(--bg);color:var(--fg);font-family:Montserrat,system-ui,sans-serif;overflow:hidden}}
#wrap{{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:8px 16px;box-sizing:border-box}}
canvas{{{"height:calc(100% - 64px);max-width:100%;aspect-ratio:9/16;" if VERT else "width:min(100%,calc((100vh - 80px) * 16 / 9));aspect-ratio:16/9;"}border-radius:10px;box-shadow:0 6px 30px #0008;background:#000}}
#ctl{{display:none;gap:10px;align-items:center;width:min(100%,720px)}}
#ctl button{{font:inherit;font-size:16px;min-width:46px;height:40px;padding:0 10px;border-radius:10px;border:0;background:#F5B041;color:#0b0d12;cursor:pointer}}
#ctl #subs{{background:#2a2d3a;color:#e8e2d6}}
#ctl input{{flex:1;accent-color:#F5B041}}
#time{{font-size:13px;min-width:92px;text-align:right;font-variant-numeric:tabular-nums}}
body.render #wrap{{padding:0}} body.render canvas{{width:{1080 if VERT else 1920}px;height:auto;border-radius:0;box-shadow:none}}
</style></head><body>
<div id="wrap"><canvas id="cv" width="{1080 if VERT else 1920}" height="{1920 if VERT else 1080}"></canvas>
<div id="ctl"><button id="play" aria-label="Play or pause">▶</button><input id="bar" type="range" min="0" max="33" step="0.01" value="0" aria-label="Timeline"><span id="time"></span><button id="subs">CC on</button></div></div>
<audio id="aud" preload="auto"></audio>
<script>if(location.search.includes('render'))document.body.classList.add('render');
window.ASSETS={json.dumps(assets)};{sync_js}{"window.CTA='channel';" if YTV else ''}</script>
<script>{open(os.path.join(R, "src", "app.js")).read()}</script>
</body></html>"""
out = os.path.join(R, "dist", "bakery_story.html")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w").write(html)
print(out, os.path.getsize(out) // 1024, "KB", "(with audio)" if sync_js else "")
