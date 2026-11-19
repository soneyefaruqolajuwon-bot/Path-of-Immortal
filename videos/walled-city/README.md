# Kowloon Walled City — animated map short (1080×1920)

An explainer about the 6-acre fort Britain and China both ignored, which grew into a 300-tower megastructure.
It uses the same deterministic HTML5 Canvas engine as `../point-roberts`.

| Path | What |
|---|---|
| `assets/walled_city_1898_fort.svg`, `…_1960s_growing.svg`, `…_1980s_megastructure.svg`, `…_1995_park.svg` | The four isometric stages, on the same iso grid and footprint (1 unit ≈ 10 m) so they can morph. The megastructure groups its 164 tower blocks under `#towers`. |
| `assets/*.svg` (props) | `jet`, `alley_interior`, `umbrella_person`, `dentist_sign`, `gang_silhouettes`, `family`, `football_fields`, `crane` + `wrecking_ball`, `money_bag`, `agreement_1987`, `icon_no_tax/codes/police`, `pin`, flag characters `britain_/china_` + `shrug/point/deal`. |
| `src/app.js` | The animation: 7 beats at the script's timestamps, kinetic numbers (1898, 300 Towers, 35,000 People, 1994), 2–4 word captions. `renderAt(t)` draws storyboard time `t`. |
| `src/geo_data.js` | Natural Earth 10m coastlines: South China, Hong Kong detail, and the 1898 leased area. |
| `dist/walled_city.html` | Self-contained player (press ▶, drag to scrub). |
| `VOICEOVER.md` | ElevenLabs lines plus the fact check. |

```bash
python tools/build_geo.py && python tools/make_assets.py && python tools/build_html.py
python tools/align_vo.py take.mp3      # split a full voice take, word timings, 1.2x speed (house style)
python tools/render.py                 # out/walled_city*.mp4
```
