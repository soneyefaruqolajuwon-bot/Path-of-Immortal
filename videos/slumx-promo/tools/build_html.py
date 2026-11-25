"""Bundle app.js + portfolio stills/clip + fonts into one self-contained dist/slumx_promo.html."""
import base64, glob, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "..")
b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
shots = {os.path.splitext(os.path.basename(f))[0]: "data:image/jpeg;base64," + b64(f) for f in sorted(glob.glob(os.path.join(R, "assets", "shots", "*.jpg")))}
clip = ["data:image/jpeg;base64," + b64(f) for f in sorted(glob.glob(os.path.join(R, "assets", "clip", "*.jpg")))]
font = b64(os.path.join(R, "assets", "fonts", "montserrat-latin-800-normal.woff2"))
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Slumx Promo</title>
<style>@font-face{{font-family:"Montserrat";font-weight:800;src:url(data:font/woff2;base64,{font}) format("woff2")}}
html,body{{margin:0;height:100%;background:#0B0D12;overflow:hidden}}#wrap{{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}}
canvas{{height:calc(100% - 56px);aspect-ratio:9/16;border-radius:10px}}#ctl{{display:none;gap:10px;width:min(100%,420px)}}#ctl input{{flex:1}}#ctl button{{width:44px;height:40px;border:0;border-radius:10px;background:#F5B041}}
body.render #wrap{{padding:0}} body.render canvas{{height:auto;width:1080px;border-radius:0}}</style></head><body>
<div id="wrap"><canvas id="cv" width="1080" height="1920"></canvas><div id="ctl"><button id="play">▶</button><input id="bar" type="range" min="0" max="26.5" step="0.01" value="0"></div></div>
<script>if(location.search.includes('render'))document.body.classList.add('render');window.SHOTS={json.dumps(shots)};window.CLIP={json.dumps(clip)};</script>
<script>{open(os.path.join(R, "src", "app.js")).read()}</script></body></html>"""
out = os.path.join(R, "dist", "slumx_promo.html"); os.makedirs(os.path.dirname(out), exist_ok=True); open(out, "w").write(html); print(out, os.path.getsize(out) // 1024, "KB")
