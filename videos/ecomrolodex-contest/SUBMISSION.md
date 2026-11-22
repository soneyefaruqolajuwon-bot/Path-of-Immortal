# Contest submission notes — "AI Short Videos for a Shopify Agency" (EcomRolodex)

**Entry:** `out/ecomrolodex_blaqcards.mp4` — 9:16, 1080×1920, 30 fps, about 15 seconds, H.264/AAC, −14 LUFS.
**Client store shown:** blaqcards.com (homepage → Minimalist Luxury Metal Card → add to cart → cart drawer).

## Structure (Problem-to-Fix angle)

| Time | Visual | Caption / VO |
|---|---|---|
| 0–2 s | Hook: a grid of identical template stores stamped SAME | "Most Shopify stores look exactly the same." |
| 2–5.5 s | Cut on the beat to a phone: the real blaqcards.com homepage scrolling | "Yours shouldn't." / "A custom homepage, built for mobile." |
| 5.5–8 s | Real product page | "Product pages that sell." |
| 8–11 s | Tap on the real sticky Add to cart → the real cart drawer slides in | "A cart that feels smooth from the first tap." |
| 11 s–end | White end card: EcomRolodex logo, "Want yours redesigned?", Comment REDESIGN, ecomrolodex.com | "Want yours redesigned? Comment REDESIGN." |

Brand: EcomRolodex teal → blue gradient (#11CBAC → #2EA3F2), indigo #5963C1, white, Poppins 600/700/800 (all taken
from ecomrolodex.com's own stylesheet), official logo file from ecomrolodex.com. Captions burned in, so it works muted.

## How the store footage was made (no AI on the website)

The phone screen is **the live blaqcards.com mobile site**, captured in a real Chromium browser at iPhone resolution
(390×844 points, 3x pixels), frame by frame while scrolling, tapping and opening the cart (`tools/capture_store.cjs`).
Nothing on the site was redrawn, generated or edited. Only the store's third-party chat bubble was hidden for a clean
screen. The phone body, background, captions and motion graphics are vector graphics drawn in code.

## AI tools and prompts used

| Tool | Used for | Prompt / settings |
|---|---|---|
| ElevenLabs (v4) | Voiceover | Script and tone tags in `VOICEOVER.md`, voice "Douglas — Smooth, Refined, Trusted", sped up 1.2x |
| Claude (Anthropic) | Storyboard, capture script, animation code | Built from the contest brief |

No AI images or AI video are used, so there are no generated hands, phones or text that could warp. The music is a
120 BPM groove synthesised in code (`tools/render.py`), and every cut is snapped to a kick.

**Optional lifestyle B-roll** (for later videos in the retainer). Generate it, then composite the real screen recording
onto the phone screen. Never let the AI draw the screen.
- *Hand + phone:* "Close-up of a hand holding a modern black smartphone in portrait, screen facing camera and fully
  green (#00FF00) for compositing, soft warm window light, shallow depth of field, dark minimal desk, slow push-in, 4K,
  photorealistic, natural five-finger hand, no text, no logos."
- *Desk reveal:* "Dark premium desk setup at night, matte black laptop and smartphone with green screens (#00FF00),
  subtle teal and indigo rim lighting, slow cinematic dolly-in, photorealistic, no text, no logos."

## Project files

- `src/app.js` — the edit (timeline, captions, phone, effects). `dist/ecomrolodex_entry.html` previews it.
- `tools/capture_store.cjs` — re-records any client store (change the URL and the product).
- `tools/render.py` — music, voice sync, loudness, MP4 export.
- `dist/frames/` — the captured store frames (also usable in CapCut/Premiere as image sequences).

## Entry text for the contest

> Built around your brief: a scroll-stopping Problem-to-Fix hook in the first two seconds, clean Poppins captions in
> your brand gradient, and the real, live blaqcards.com mobile site, captured at full iPhone resolution with nothing
> redrawn by AI.
>
> What's in this entry:
> - 9:16 vertical (1080×1920), about 15 seconds, cuts locked to the beat, works with sound on or muted
> - Real client-store footage: homepage scroll, product page, tap to add to cart, live cart drawer
> - Calm, confident English voiceover with high-contrast captions, no emojis, no invented numbers
> - Ends on "Comment REDESIGN" and ecomrolodex.com with your official logo and colours
>
> If selected, I'll send the final MP4, the full list of tools and prompts, and the editable project files. My capture
> setup can record any of your client stores the same way, so I can deliver 20+ consistent videos a month.
