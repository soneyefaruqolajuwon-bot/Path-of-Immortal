# France's longest border is with Brazil — 9:16 map short

Built from the user's reference clip (`mapheld-france-brazil.mp4`) and their ElevenLabs take, on the same canvas
engine as `../gambia`. The script in the take matches the reference; facts checked (France–Spain ≈ 387 mi,
France–Brazil ≈ 453 mi via French Guiana, an overseas department; Kourou is Europe's spaceport).

```bash
python tools/build_geo.py && python tools/make_assets.py && python tools/build_html.py
python tools/align_vo.py take.mp3      # split, word timings, 1.2x (house style)
python tools/render.py                 # out/france_brazil.mp4
```
