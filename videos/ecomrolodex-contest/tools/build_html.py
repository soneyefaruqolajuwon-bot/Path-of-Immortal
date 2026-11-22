"""Bundle app.js + logo + Poppins into dist/ecomrolodex_entry.html (screen frames are read from dist/frames/)."""
import base64, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "..")
b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
assets = {"ecomrolodex_logo": "data:image/png;base64," + b64(os.path.join(R, "assets", "ecomrolodex_logo.png"))}
fonts = "".join(f'@font-face{{font-family:"Poppins";font-weight:{w};src:url(data:font/woff2;base64,{b64(os.path.join(R, "assets", "fonts", f"poppins-latin-{w}-normal.woff2"))}) format("woff2")}}' for w in (600, 700, 800))
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EcomRolodex Entry</title><style>{fonts}
html,body{{margin:0;height:100%;background:#07090F;overflow:hidden;font-family:Poppins,sans-serif}}
#wrap{{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:8px 16px;box-sizing:border-box}}
canvas{{height:calc(100% - 56px);max-width:100%;aspect-ratio:9/16;border-radius:10px}}
#ctl{{display:none;gap:10px;align-items:center;width:min(100%,420px)}} #ctl button{{width:44px;height:40px;border:0;border-radius:10px;background:#11CBAC;color:#fff;font-size:18px}} #ctl input{{flex:1;accent-color:#11CBAC}}
body.render #wrap{{padding:0}} body.render canvas{{height:auto;width:1080px;border-radius:0}}
</style></head><body><div id="wrap"><canvas id="cv" width="1080" height="1920"></canvas>
<div id="ctl"><button id="play" aria-label="Play">▶</button><input id="bar" type="range" min="0" max="15" step="0.01" value="0" aria-label="Timeline"></div></div>
<script>if(location.search.includes('render'))document.body.classList.add('render');window.ASSETS={json.dumps(assets)};</script>
<script>{open(os.path.join(R, "src", "app.js")).read()}</script></body></html>"""
out = os.path.join(R, "dist", "ecomrolodex_entry.html"); open(out, "w").write(html); print(out, os.path.getsize(out) // 1024, "KB")
