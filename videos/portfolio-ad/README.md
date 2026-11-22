# Portfolio ad — twilight rim-lit stickman style (1920×1080, 30 s)

A 30-second showcase for a freelance profile. Four scenes: the slow-motion catch, brand & product ads, viral Shorts
(9:16 frame), YouTube storytelling (stadium), then the hero line-up and call to action.

| Path | What |
|---|---|
| `assets/*.svg` | Rim-lit characters in poses: `host_*` (coral hoodie: stand, run_a, run_b, catch, point, cheer, kick, wave), `capper_*` (yellow cap), `scientist_*` (lab coat), `coach_*` (green cap + whistle). Backgrounds: `bg_sky`, `sun`, `bg_cafe`, `bg_stadium`. UI: `badge_brand`, `badge_shorts`, `badge_youtube`. |
| `src/app.js` | The animation (`renderAt(t)`), effects (ripples, ghost trails, dotted arcs, callouts, speed lines, light rays), subtitles and the player. |
| `dist/portfolio_ad.html` | Self-contained player with sound: ▶/❚❚ (or Space), scrub bar, CC toggle. Add `?nosubs` to the URL for a clean screen recording. |
| `out/` | Rendered MP4s. |
| `VOICEOVER.md` | ElevenLabs script. |

```bash
python tools/make_assets.py && python tools/build_html.py
python tools/align_vo.py take.mp3      # split + 1.2x + word timings
python tools/render.py                 # out/portfolio_ad.mp4 (NOSUBS=1 for a version without subtitles)
```

How the characters are built: matte black stick figures with one flat garment. The rim light is an amber copy of
the figure offset toward the light (up and right) and drawn underneath, so only the edges facing the light glow.
New poses are one line in `POSES` in `tools/make_assets.py`.
