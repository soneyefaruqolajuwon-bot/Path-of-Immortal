# Blind Mind 2.0 — Voiceover Script & Upload Notes

**Runtime:** 28.0 s · **Format:** 1080×1920, 30 fps, H.264 + AAC · **File:** `out/blind-mind-2.mp4`

The video works muted (all key lines are on screen). Recording your own voice on top
will make it feel even more human and premium. Read calm, low, unhurried — a clinician, not a hype host.

## Timed VO script

| Time | Line | Delivery |
|---|---|---|
| 0.0 – 1.5 | "Picture a red apple… inside this box." | Start talking on frame 1. No "hey guys". |
| 1.5 – 3.2 | "The shine. The stem." | Slow. Let each detail land. |
| 3.2 – 5.0 | "Hold it." | Almost a whisper. |
| 5.0 – 6.0 | *(silence)* | Say NOTHING. The silence is the hook. |
| 6.0 – 6.2 | "What did you see?" *(optional — it's on screen)* | |
| 6.2 – 7.8 | "One — crystal clear." | Hit "one" on the click. |
| 7.8 – 9.4 | "Two — clear, but soft." | |
| 9.4 – 11.0 | "Three — a blurry smudge." | |
| 11.0 – 12.6 | "Four — a faint outline." | |
| 12.6 – 13.9 | "Five… nothing at all." | Drop your voice. Pause after "five". |
| 13.9 – 16.2 | "For about one in twenty-five people… it's always a five." | Land "always" on the bass hit. |
| 16.4 – 19.4 | "It's called aphantasia. Their memory works fine." | |
| 19.5 – 23.0 | "Their brain just never projects the picture." | "never" on the red X (21.0 s). |
| 23.2 – 26.8 | "Be honest. What number did you get?" | Slight smile in the voice. |

Record at ~-12 dB peaks, close mic, in a closet with clothes (kills echo).
Duck the music bed ~4 dB under the voice.

## Upload checklist
- **Title:** `Do You Have a Blind Mind? (Rate Yourself 1–5)`
- **First comment (pin it):** `I got a ___. Be honest — what number did you see? 👇`
- Reply to early comments with your own number: it seeds the 1-vs-5 debate.
- **A/B test:** compare 3-second hold and average % viewed against the original Blind Mind Short after 48 h and 7 days.

## Science notes (for replies/pinned comment)
- Vividness scale based on the VVIQ (Marks, 1973).
- "Aphantasia" named by Zeman, Dewar & Della Sala (2015), *Cortex*.
- Prevalence estimates range roughly 1–4%; "about 1 in 25" uses the upper estimate.

## Re-rendering / making the next episode
```
cd src
node render.js stills 0,6.5,14,21,25 ../out/stills   # preview frames
node render.js video ../out/video_silent.mp4          # 840 frames
python3 audio.py ../out/audio_raw.wav
ffmpeg -i ../out/audio_raw.wav -af loudnorm=I=-14:TP=-1 ../out/audio.wav
ffmpeg -i ../out/video_silent.mp4 -i ../out/audio.wav -c:v copy -c:a aac -b:a 192k -shortest ../out/blind-mind-2.mp4
```
All captions and timings live in the `CAPS` / `LEVEL_KEYS` arrays at the top of `src/blindmind.html`;
sound timings mirror them in `src/audio.py`.
