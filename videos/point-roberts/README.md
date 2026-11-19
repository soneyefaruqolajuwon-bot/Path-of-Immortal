# Point Roberts — Map Warden-style short (1080×1920)

An animated map explainer about the US town you can only drive to through Canada. It's built as one
deterministic HTML5 Canvas animation, which plays in any browser (including on a phone) and exports to MP4.

## What's here

| Path | What |
|---|---|
| `assets/*.svg` | Clean SVG sprites: flag characters (`usa_confident`, `usa_confused`, `usa_trapped`, `britain_surprised`, `canada_cheerful`), chibi people (`resident_stressed`, `diplomat_uk/us_blindfolded`, `mobster_witness`), props (`ruler`, `gate_post` + `gate_arm`, `border_gate`, `stamp`, `bus_body` + `bus_wheel`, `school_bus`, `padlock`, `tumbleweed`, `milk`, `bread`, `passport`, `witness_file`), neon icons (`icon_ferry/plane/car/no_hospital/no_highschool`) and the layout map `point_roberts_map.svg`. Animatable parts have ids (`arm-left`, `arm-right`, `eyes`, `gate-arm`, `wheel`, `shackle`, `lock-body`, `bars`). |
| `src/app.js` | The animation: camera keyframes, the 11 script beats, captions, title cards and kinetic stats. `renderAt(t)` draws storyboard time `t`. |
| `src/geo_data.js` | Coastlines from Natural Earth 10m (public domain): North America plus Salish Sea detail, and the Point Roberts silhouette. |
| `dist/point_roberts.html` | Self-contained player (open it in a browser, press ▶). |
| `VOICEOVER.md` | ElevenLabs lines with tone tags, plus the fact check. |
| `tools/` | `make_assets.py` (SVGs), `build_geo.py` (map data), `build_html.py` (bundle), `render.py` + `render.cjs` (MP4 export), `contact_sheet.cjs` (asset preview). |

## Build

```bash
python tools/build_geo.py        # map data (downloads Natural Earth once)
python tools/make_assets.py      # SVG sprites
python tools/build_html.py       # dist/point_roberts.html
python tools/render.py           # out/point_roberts*.mp4 (needs Chromium + Playwright for Node, ffmpeg)
```

Voice speed: always 1.2x (house style). `tools/align_vo.py take.mp3` splits a full-script take, writes word timings and applies the 1.2x speed-up automatically (`--tempo` to override).

Voice: drop `vo/01.mp3` … `vo/11.mp3` (plus `vo/timing.json` word timings, which I generate from the
recording) and re-run `render.py`. Each beat re-times to the voice, key visuals snap to their spoken
words, and the music ducks under the voice. Sound effects and music come from the Pig War project's
procedural audio engine (`../pig-war/src/audio.py`).

Captions are 64px (the spec said 48px). Change `CAPTION.size` in `src/app.js` if you want 48.
