"""Cut TikTok Part 1 / Part 2 and a YouTube Short from the native 9:16 render (out/mercator_vertical.mp4)."""
import os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "..")
OUT = os.path.join(R, "out", "tiktok"); os.makedirs(OUT, exist_ok=True)
SRC = os.path.join(R, "out", "mercator_vertical.mp4")
CUT, END = 64.4, 4.0
W, H = 1080, 1920
FB = "/usr/share/fonts/opentype/inter/Inter-Black.otf"; FX = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
GOLD, TEAL, RED, INK = (244, 208, 63), (30, 77, 92), (255, 0, 51), (20, 20, 22)
sys.path.insert(0, os.path.join(R, "..", "pig-war", "src"))
import audio as AU  # noqa: E402
ENC = ["-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]


def ff(*a): subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)


def chip_png(label, path):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([W / 2 - 140, 170, W / 2 + 140, 250], radius=40, fill=(10, 24, 32, 235), outline=GOLD, width=5)
    d.text((W / 2, 210), label, font=ImageFont.truetype(FB, 46), fill=GOLD, anchor="mm")
    im.save(path)


def end_card(kind, path):
    ec = Image.new("RGB", (W, H), TEAL); d = ImageDraw.Draw(ec)
    for i in range(0, W + H, 60): d.line([(i, 0), (i - H, H)], fill=(36, 86, 101), width=2)
    T = lambda xy, s, f, fill: d.text(xy, s, font=f, fill=fill, anchor="mm", stroke_width=8, stroke_fill=INK)
    T((W / 2, 470), "So how did ONE", ImageFont.truetype(FB, 92), (255, 255, 255)); T((W / 2, 590), "map fix this?", ImageFont.truetype(FB, 92), (255, 255, 255))
    if kind == "shorts":
        cx, cy, w = W / 2, 860, 300; h = w * 0.7
        d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=h * 0.28, fill=RED); t = h * 0.32
        d.polygon([(cx - t * 0.7, cy - t), (cx - t * 0.7, cy + t), (cx + t, cy)], fill=(255, 255, 255))
        l1, l2, sub = "WATCH THE FULL", "VIDEO BELOW", "tap the link under this Short ↓"
    else:
        d.rounded_rectangle([W / 2 - 200, 720, W / 2 + 200, 1000], radius=60, fill=(10, 24, 32), outline=GOLD, width=8)
        d.text((W / 2, 860), "PART 2", font=ImageFont.truetype(FB, 110), fill=GOLD, anchor="mm")
        l1, l2, sub = "FOLLOW FOR", "PART 2", "how Mercator solved it"
    T((W / 2, 1080), l1, ImageFont.truetype(FB, 84), GOLD); T((W / 2, 1190), l2, ImageFont.truetype(FB, 84), GOLD)
    d.rounded_rectangle([W / 2 - 250, 1300, W / 2 + 250, 1400], radius=50, fill=(10, 24, 32), outline=GOLD, width=5)
    d.text((W / 2, 1350), "Mapheld", font=ImageFont.truetype(FB, 58), fill=(255, 255, 255), anchor="mm")
    d.text((W / 2, 1460), sub, font=ImageFont.truetype(FX, 40), fill=(220, 230, 235), anchor="mm")
    ec.save(path)


# end-card audio
n = int(END * AU.SR); buf = np.zeros((2, n)); buf += AU.music_bed(END + 1)[:n] * 0.15 * np.linspace(1, 0, n)
AU.place(buf, AU.sfx_whoosh(0.5), 0.0, 0.4); AU.place(buf, AU.sfx_ding(), 0.25, 0.5)
with wave.open(os.path.join(OUT, "end.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(AU.SR); w.writeframes((np.clip(buf, -1, 1).T * 32767).astype(np.int16).tobytes())

# Part 1 body (with a small PART 1 chip)
chip_png("PART 1", os.path.join(OUT, "chip1.png")); chip_png("PART 2", os.path.join(OUT, "chip2.png"))
body1 = os.path.join(OUT, "v_body1.mp4")
ff("-t", f"{CUT}", "-i", SRC, "-i", os.path.join(OUT, "chip1.png"), "-filter_complex", "[0:v][1:v]overlay=0:0,setsar=1[v]", "-map", "[v]", "-map", "0:a",
   "-af", f"afade=t=out:st={CUT - 0.35}:d=0.35", "-r", "30", *ENC, body1)
short_body = os.path.join(OUT, "v_body_short.mp4")
ff("-t", f"{CUT}", "-i", SRC, "-vf", "setsar=1", "-af", f"afade=t=out:st={CUT - 0.35}:d=0.35", "-r", "30", *ENC, short_body)
for kind, body, name in (("tiktok", body1, "mercator_tiktok_part1.mp4"), ("shorts", short_body, "mercator_shorts.mp4")):
    png = os.path.join(OUT, f"end_{kind}.png"); end_card(kind, png)
    endv = os.path.join(OUT, f"end_{kind}.mp4")
    ff("-loop", "1", "-t", f"{END}", "-i", png, "-i", os.path.join(OUT, "end.wav"), "-vf", "zoompan=z='min(1+0.0015*on,1.06)':d=1:s=1080x1920:fps=30,setsar=1",
       "-r", "30", *ENC, "-shortest", endv)
    ff("-i", body, "-i", endv, "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]", *ENC, "-movflags", "+faststart",
       os.path.join(R, "out", name))
# Part 2: the rest
ff("-ss", f"{CUT}", "-i", SRC, "-i", os.path.join(OUT, "chip2.png"), "-filter_complex", "[0:v][1:v]overlay=0:0,setsar=1[v]", "-map", "[v]", "-map", "0:a",
   "-af", "afade=t=in:d=0.25", "-r", "30", *ENC, "-movflags", "+faststart", os.path.join(R, "out", "mercator_tiktok_part2.mp4"))
print("done")
