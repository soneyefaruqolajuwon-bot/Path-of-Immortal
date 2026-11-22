"""TikTok Part 2: the rest of the video (from Mercator's solution) in the same 9:16 layout."""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "..")
OUT = os.path.join(R, "out", "tiktok"); os.makedirs(OUT, exist_ok=True)
SRC = os.path.join(R, "out", "mercator.mp4")
START = float(sys.argv[1]) if len(sys.argv) > 1 else 64.4
W, H = 1080, 1920
FB = "/usr/share/fonts/opentype/inter/Inter-Black.otf"; FX = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
GOLD = (244, 208, 63)
ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
def text(xy, s, f, fill, st=8): d.text(xy, s, font=f, fill=fill, anchor="mm", stroke_width=st, stroke_fill=(20, 20, 22))
d.rounded_rectangle([W / 2 - 150, 180, W / 2 + 150, 270], radius=45, fill=(10, 24, 32, 235), outline=GOLD, width=6)
d.text((W / 2, 225), "PART 2", font=ImageFont.truetype(FB, 54), fill=GOLD, anchor="mm")
text((W / 2, 380), "HOW ONE MAP", ImageFont.truetype(FB, 100), (255, 255, 255))
text((W / 2, 510), "FIXED SAILING", ImageFont.truetype(FB, 100), GOLD)
d.text((W / 2, 1340), "@Mapheld", font=ImageFont.truetype(FX, 44), fill=GOLD, anchor="mm", stroke_width=4, stroke_fill=(20, 20, 22))
p = os.path.join(OUT, "overlay_p2.png"); ov.save(p)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", SRC], capture_output=True, text=True).stdout) - START
fc = ("[0:v]split[a][b];[a]scale=-2:1920,crop=1080:1920,boxblur=30:5,eq=brightness=-0.18[bg];"
      "[b]scale=1080:-2[fg];[bg][fg]overlay=0:640[v1];[v1][1:v]overlay=0:0,format=yuv420p,setsar=1[v]")
final = os.path.join(R, "out", "mercator_tiktok_part2.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{START}", "-i", SRC, "-loop", "1", "-t", f"{dur}", "-i", p, "-filter_complex", fc,
                "-map", "[v]", "-map", "0:a", "-af", "afade=t=in:d=0.25", "-r", "30", "-c:v", "libx264", "-crf", "21", "-preset", "slow",
                "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
print("wrote", final, round(dur, 1), "s")
