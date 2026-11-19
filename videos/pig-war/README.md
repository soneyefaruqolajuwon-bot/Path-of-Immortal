# The Pig War (1859) — animated map short

A 9:16 (1080×1920, 30 fps) comedic map explainer, about 94 seconds long. It follows the Map Warden-style
blueprint (teal ocean, olive land, flag characters with stick arms, prop gags, white captions and gold
date cards) and the time-coded storyboard for this episode.

Everything is drawn in code: the map, characters, props, text, sound effects and music. Nothing is
downloaded at render time except Natural Earth land data (public domain).

## Layout

- `src/video.py`: storyboard timeline. Scenes, camera moves, captions and sound cues, all in
  storyboard seconds (0–94).
- `src/draw.py`: flag characters, chibi people, pig, warships, props and text styles.
- `src/geo.py`: Natural Earth coastlines, smoothing and the map camera.
- `src/audio.py`: procedural cartoon sound effects, lo-fi music bed and the final mix.
- `src/render.py`: renders stills or the video.
- `vo/`: put the ElevenLabs voice files here (`01.mp3` … `13.mp3`). See `ELEVENLABS_LINES.md`.
- `out/`: rendered videos.

## Render

```bash
pip install pycairo numpy scipy shapely pyshp
cd src
python render.py stills 4.3 24.5 93       # PNG stills at storyboard times (half size)
python render.py video --preview          # quick 540x960 15 fps check
python render.py video                    # final 1080x1920 30 fps MP4
```

When voice files are present in `vo/`, each beat stretches or squeezes to fit its line. The animation,
captions and sound effects stay in sync, the voice is mixed in, and the music ducks under it.
