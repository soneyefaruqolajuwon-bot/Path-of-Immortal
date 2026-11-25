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
- **No generic pins for places with meaning:** when a map marker stands for something (an empire, a colonial capital,
  a fort, a spaceport, a port, an oil field…), draw what it represents instead of a pin: e.g. a castle flying the ruling
  country's flag (and flip the flag when control changes), a launch pad, a lighthouse, an oil rig. Round flag pins are only
  for simply naming a country.
- Style blueprint: Map Warden-like 9:16 map explainers (teal ocean #1E4D5C, olive land #8A855C, flag characters
  with stick arms and eyes, white 2–4 word captions, gold title cards, yellow kinetic numbers).
- **Hands stay visible:** when a character holds a prop (shovel, key, flag, scroll, tablet…), draw the hand on top of the prop, and never let an arm or hand hide behind the body or head.
- **Shorts structure:** end with a loop (the last spoken line flows straight back into the first line, and the last frame matches the first), with the comment question as on-screen text + a pinned comment instead of in the voice. Put one natural interactive question in the middle (about a third to halfway, just before the twist), answered a few seconds later. Exceptions: emotional stories keep a real ending; Shorts that tease a long-form end on the cliffhanger card.
