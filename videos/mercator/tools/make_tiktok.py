"""Build a ~1-minute 9:16 TikTok teaser from the 16:9 video, ending on a cliffhanger + YouTube end card."""
import os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "..")
OUT = os.path.join(R, "out", "tiktok")
SRC = os.path.join(R, "out", "mercator.mp4")
CUT = float(sys.argv[1]) if len(sys.argv) > 1 else 64.4
SHORTS = len(sys.argv) > 2 and sys.argv[2] == "shorts"
NATIVE = len(sys.argv) > 2 and sys.argv[2] == "tiktok"
END = 4.0
W, H = 1080, 1920
FB = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
FX = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
GOLD, TEAL, RED = (244, 208, 63), (30, 77, 92), (255, 0, 51)
os.makedirs(OUT, exist_ok=True)


def text(d, xy, s, font, fill, stroke=8, anchor="mm"):
    d.text(xy, s, font=font, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(20, 20, 22))


def play_button(d, cx, cy, w):
    h = w * 0.7
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=h * 0.28, fill=RED)
    t = h * 0.32
    d.polygon([(cx - t * 0.7, cy - t), (cx - t * 0.7, cy + t), (cx + t, cy)], fill=(255, 255, 255))


# overlay for the teaser (transparent; video sits at y=640..1248)
ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
text(d, (W / 2, 300), "GREENLAND", ImageFont.truetype(FB, 118), (255, 255, 255))
text(d, (W / 2, 440), "ISN'T THIS BIG", ImageFont.truetype(FB, 104), GOLD)
text(d, (W / 2, 560), "...so why does every map lie?", ImageFont.truetype(FX, 48), (255, 255, 255), stroke=5)
d.rounded_rectangle([140, 1300, W - 140, 1410], radius=55, fill=(10, 24, 32, 235), outline=RED, width=6)
if NATIVE:
    d.ellipse([180, 1310, 270, 1400], fill=GOLD); d.text((225, 1355), "+", font=ImageFont.truetype(FB, 70), fill=(20, 20, 22), anchor="mm")
else:
    play_button(d, 225, 1355, 92)
d.text((292, 1355), "FOLLOW FOR PART 2" if NATIVE else ("FULL VIDEO LINKED BELOW" if SHORTS else "FULL VIDEO ON YOUTUBE"), font=ImageFont.truetype(FB, 44), fill=(255, 255, 255), anchor="lm")
d.text((W / 2, 1460), "@Mapheld", font=ImageFont.truetype(FX, 40), fill=GOLD, anchor="mm", stroke_width=4, stroke_fill=(20, 20, 22))
ov.save(os.path.join(OUT, "overlay.png"))

# end card
ec = Image.new("RGB", (W, H), TEAL); d = ImageDraw.Draw(ec)
for i in range(0, W + H, 60):
    d.line([(i, 0), (i - H, H)], fill=(36, 86, 101), width=2)
text(d, (W / 2, 470), "So how did ONE", ImageFont.truetype(FB, 92), (255, 255, 255))
text(d, (W / 2, 590), "map fix this?", ImageFont.truetype(FB, 92), (255, 255, 255))
if NATIVE:
    d.rounded_rectangle([W / 2 - 200, 720, W / 2 + 200, 1000], radius=60, fill=(10, 24, 32), outline=GOLD, width=8)
    d.text((W / 2, 860), "PART 2", font=ImageFont.truetype(FB, 110), fill=GOLD, anchor="mm")
else:
    play_button(d, W / 2, 860, 300)
text(d, (W / 2, 1080), "FOLLOW FOR" if NATIVE else "WATCH THE FULL", ImageFont.truetype(FB, 84), GOLD)
text(d, (W / 2, 1190), "PART 2" if NATIVE else ("VIDEO BELOW" if SHORTS else "VIDEO ON YOUTUBE"), ImageFont.truetype(FB, 84), GOLD)
d.rounded_rectangle([W / 2 - 250, 1300, W / 2 + 250, 1400], radius=50, fill=(10, 24, 32), outline=GOLD, width=5)
d.text((W / 2, 1350), "Mapheld", font=ImageFont.truetype(FB, 58), fill=(255, 255, 255), anchor="mm")
d.text((W / 2, 1460), "how Mercator solved it" if NATIVE else ("tap the link under this Short ↓" if SHORTS else "link in bio"), font=ImageFont.truetype(FX, 40), fill=(220, 230, 235), anchor="mm")
ec.save(os.path.join(OUT, "endcard.png"))

# end-card audio: whoosh + ding over a soft music tail
sys.path.insert(0, os.path.join(R, "..", "pig-war", "src"))
import audio as AU  # noqa: E402
n = int(END * AU.SR)
buf = np.zeros((2, n))
m = AU.music_bed(END + 1)[:n] * 0.15 * np.linspace(1, 0, n)
buf += m
AU.place(buf, AU.sfx_whoosh(0.5), 0.0, 0.4)
AU.place(buf, AU.sfx_ding(), 0.25, 0.5)
pcm = (np.clip(buf, -1, 1).T * 32767).astype(np.int16)
with wave.open(os.path.join(OUT, "end.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(AU.SR); w.writeframes(pcm.tobytes())

teaser = os.path.join(OUT, "teaser_part.mp4")
fc = ("[0:v]split[a][b];[a]scale=-2:1920,crop=1080:1920,boxblur=30:5,eq=brightness=-0.18[bg];"
      "[b]scale=1080:-2[fg];[bg][fg]overlay=0:640[v1];[v1][1:v]overlay=0:0,format=yuv420p[v]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-t", f"{CUT}", "-i", SRC, "-loop", "1", "-t", f"{CUT}", "-i", os.path.join(OUT, "overlay.png"),
                "-filter_complex", fc, "-map", "[v]", "-map", "0:a", "-af", f"afade=t=out:st={CUT - 0.35}:d=0.35",
                "-r", "30", "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", teaser], check=True)
endv = os.path.join(OUT, "end_part.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-t", f"{END}", "-i", os.path.join(OUT, "endcard.png"), "-i", os.path.join(OUT, "end.wav"),
                "-vf", "zoompan=z='min(1+0.0015*on,1.06)':d=1:s=1080x1920:fps=30,format=yuv420p", "-r", "30",
                "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", endv], check=True)
final = os.path.join(R, "out", "mercator_tiktok_part1.mp4" if NATIVE else ("mercator_shorts.mp4" if SHORTS else "mercator_tiktok.mp4"))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", teaser, "-i", endv, "-filter_complex", "[0:v]setsar=1[v0];[1:v]setsar=1[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]",
                "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "21", "-preset", "slow", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final], check=True)
print("wrote", final)
