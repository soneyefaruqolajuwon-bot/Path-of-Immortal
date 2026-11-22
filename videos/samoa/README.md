# Samoa — the country that skipped a Friday (Mapheld 9:16 short, 1080×1920)

| Path | What |
|---|---|
| `assets/*.svg` | Calendar pages (`calendar_thu29`, `calendar_fri30`, `calendar_sat31`), `airplane`, `closed_sign`, flag markers (`marker_wsm`, `marker_asm`), caped characters (`samoan`, `samoan_sleepy`, `american_samoan`). |
| `src/geo_data.js` | Natural Earth 10m coastlines (South Pacific, 0..360 longitudes) and today's International Date Line. The pre-2011 line is derived in `src/app.js` and morphs into today's. |
| `src/app.js` | The animation (`renderAt(t)`): camera, 6 beats, captions. |
| `dist/samoa.html` | Self-contained player (open on a phone, press ▶). |
| `VOICEOVER.md` | ElevenLabs script with tone tags and the fact check. |

```bash
python tools/build_geo.py && python tools/make_assets.py && python tools/build_html.py
python tools/align_vo.py take.mp3   # split + 1.2x + word timings
python tools/render.py              # out/samoa.mp4 (or samoa_draft_no_voice.mp4 without vo/)
```
