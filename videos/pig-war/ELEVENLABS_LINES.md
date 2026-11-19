# The Pig War — ElevenLabs voice lines

Make **one audio file per line** and name each one with its number, for example `01.mp3` or `01_britain.mp3`.
Upload the files to `videos/pig-war/vo/` in this repo. On a phone: open the repo on github.com → go into
`videos/pig-war/vo` → **Add file → Upload files**. The renderer finds each file by its number and re-times
that part of the animation to the length of your recording.

## Voices (pick from the ElevenLabs Voice Library)

| Role | What to look for | Suggested settings |
|---|---|---|
| **Britain** | Posh, clipped British male, very offended | Stability ~35%, Style ~40% |
| **USA** | Laid-back American with a slight Southern drawl | Stability ~35%, Style ~45% |
| **Narrator** | Fast, upbeat YouTube explainer, dry humour | Stability ~45%, Style ~25%, speed 1.05–1.1× |

If you use the **Eleven v3** model, you can keep the `[tags]` below. They steer delivery. On other models,
delete the tags before generating.

## Lines

| File | Voice | Text to paste | Target length |
|---|---|---|---|
| `01` | Britain | [annoyed] Hey, your pig is eating my potatoes. | ~2.5 s |
| `02` | USA | [smug] Yeah? Well, I just shot it. | ~2.5 s |
| `03` | Britain | [cold, deadpan] Right. Send in the warships. | ~2.5 s |
| `04` | Narrator | In 1859, the United States and the British Empire nearly went to war... [pause] over one dead pig. | ~4 s |
| `05` | Narrator | To see how things got this stupid, we need to go back to 1846. | ~3.5 s |
| `06` | Narrator | The US and Britain signed a treaty splitting the border — except they wrote it so vaguely that both countries claimed San Juan Island. | ~8.5 s |
| `07` | Narrator | So British sheep farmers and American settlers moved in side by side. Tensions were already high. | ~8 s |
| `08` | Narrator | Then on June 15th, 1859, an American farmer named Lyman Cutlar found a British-owned pig rooting through his garden — and pulled the trigger. | ~10.5 s |
| `09` | Narrator | Cutlar offered to pay ten dollars for the pig. The British demanded one hundred — and threatened to arrest him. | ~9.5 s |
| `10` | Narrator | So the US Army sent in troops — led by future Civil War general George Pickett. Britain responded with five warships and over two thousand men. | ~11.5 s |
| `11` | Narrator | Both sides had orders not to shoot first. Instead, they spent months insulting each other — [amused] and drinking together at night. | ~9.5 s |
| `12` | Narrator | Eventually, leaders in London and Washington realized how ridiculous this was, and asked the German Kaiser to pick a winner. | ~9.5 s |
| `13` | Narrator | In 1872, the US got the island. Total casualties of the Pig War? Zero humans... [beat] and one very unlucky pig. | ~6 s |

Tips:
- Trim silence at the start and end of each clip. ElevenLabs usually keeps it short already.
- If a line comes out much longer than its target, re-generate it a little faster. The video stretches to
  fit, but the pacing stays snappiest when lines land near their targets.
- Spell out numbers (as written above) so they're read naturally.

## Fact notes (checked)

- Lyman Cutlar shot the Hudson's Bay Company pig on **15 June 1859**. He offered $10; the owner, Charles Griffin, demanded $100.
- Pickett was a **captain** in 1859 (he became a Confederate general later), so on screen he's labelled "Capt. George Pickett".
  The narration's "future Civil War general" is accurate.
- Britain's force peaked at about **2,140 men and 5 warships**, against roughly 460 Americans.
- Kaiser Wilhelm I's arbitration ruled for the US on **21 October 1872**.
