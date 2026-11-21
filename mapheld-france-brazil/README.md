# Mapheld: France's longest border is Brazil

This is a 70-second vertical map explainer (9:16, 1080×1920, 30 fps) for the **Mapheld** channel, timed to the script below.

| Output | What it is |
|---|---|
| `out/mapheld-france-brazil.mp4` | The rendered video (H.264, silent, 70.0 s) |
| `out/thumbnail.jpg` | A frame from the bars comparison (22.9 s) |
| `out/mapheld-preview.html` | A single-file playable preview with play/pause, scrubber and arrow-key seek |
| `index.html` + `src/` | The same preview as editable source |
| `assets/*.svg` | Standalone vector assets: two map stills, the comparison bar, the icons (euro, French flag, passport, ballot, rocket, pin) and the logo |

## Style
- Ocean `#1E4D5C`, land `#8A855C`, France / French Guiana highlighted `#ABA46E`, borders in gold `#F5C542`
- Natural Earth 1:50m country shapes, Mercator projection, drop-shadowed landmasses
- White Inter captions of 2–4 words, with numbers in bold gold

## Timeline
| Time | Beat | Visual |
|---|---|---|
| 0–10 | Hook | France; Spain and Germany pulse with "?" tags; the Brazil card pops on "it's Brazil." |
| 10–24 | Reveal | The France–Spain border draws in gold with a counter to **387 Miles**; the camera crosses the Atlantic (Paris→Cayenne arc, "4,000+ miles"); the French Guiana–Brazil border glows gold to **453 Miles**; comparison bars |
| 24–40 | How | French Guiana and northern-coast callouts; "A colony" and "Semi-independent" are struck out; "Overseas department of France ✓"; Paris = Cayenne panel |
| 40–55 | Quirks | Ballot, € and French-flag/passport badges; a Kourou pin; the rocket launches with an exhaust trail |
| 55–70 | Close | Pull back to France plus Guiana; "France's biggest neighbor?"; "Not in Europe"; zoom into a jungle-green Brazil with an Amazon rainforest tag; Mapheld end card at 68.4 s |

Caption timing lives in `src/timeline.js`. Each script segment is split into chunks, and each chunk gets a share of the segment's time based on its word count. Tags such as `#m453` let the visuals start at the exact moment that phrase appears.

## Rebuild
```bash
npm install                 # d3-geo, topojson-client, world-atlas
node scripts/build-geo.mjs  # regenerates src/geo.js and assets/*.svg
node scripts/render.mjs     # renders out/mapheld-france-brazil.mp4 (needs Playwright + ffmpeg, ~6 min)
node scripts/bundle.mjs     # rebuilds out/mapheld-preview.html
```
To preview, open `index.html` in a browser.

## Adding the voiceover
The video is silent. Record the VO to the timestamps, then mux it in:
```bash
ffmpeg -i out/mapheld-france-brazil.mp4 -i voiceover.wav -c:v copy -c:a aac -b:a 192k -shortest out/mapheld-final.mp4
```
If your read runs faster or slower, change the segment `start`/`end` values in `src/timeline.js` and re-render. The visuals follow automatically.

## Facts used
- France–Spain border: 623 km ≈ **387 mi**. France–Brazil border (French Guiana): 730 km ≈ **453 mi**
- Paris to Cayenne: about 4,400 mi (great-circle distance)
- French Guiana is an overseas department and region of France and part of the EU. It uses the euro, and Kourou hosts the Guiana Space Centre that ESA launches from.

Map data: Natural Earth (public domain) via `world-atlas`. All icons are original artwork.
