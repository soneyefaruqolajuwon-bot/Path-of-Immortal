# House rules for this repo's video projects (videos/)

- **Fix script mistakes immediately.** When the user's script contains a factual error, correct it directly in the
  script you hand back (voiceover lines, captions, aligner text) and briefly say what changed and why. Don't just flag it.
- **Voice speed is always 1.2x.** Every ElevenLabs recording is sped up 1.2x (pitch-preserving) before syncing.
  `tools/align_vo.py` does this by default.
- Write ElevenLabs lines with tone tags (`[deadpan]`, `[dramatic]`…), `…` pauses, CAPS for emphasis and spelled-out numbers.
- The user often works from a phone: always paste the voiceover lines directly in chat, not only in a file.
- When pasting a script for ElevenLabs, do NOT number the lines: plain paragraphs only, so it copies and pastes cleanly.
- **Characters:** when a country speaks or acts, show a person who represents it (an officer, diplomat, leader type…)
  wearing that country's flag as a cape, instead of a plain flag-with-eyes. Flag markers are still fine on maps.
- Style blueprint: Map Warden-like 9:16 map explainers (teal ocean #1E4D5C, olive land #8A855C, flag characters
  with stick arms and eyes, white 2–4 word captions, gold title cards, yellow kinetic numbers).
