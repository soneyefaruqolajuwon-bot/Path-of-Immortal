"""Make the voice clips used by the renderer from vo/raw/, at a chosen speed.

  python prep_vo.py --tempo 1.2

Speeds each raw line up with ffmpeg's pitch-preserving atempo filter and
scales the per-word timings to match (vo/raw/timing.json -> vo/timing.json).
"""
import argparse
import glob
import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VO = os.path.join(HERE, "..", "vo")
RAW = os.path.join(VO, "raw")

ap = argparse.ArgumentParser()
ap.add_argument("--tempo", type=float, default=1.2)
a = ap.parse_args()

for f in sorted(glob.glob(os.path.join(RAW, "[0-9][0-9]*.mp3"))):
    out = os.path.join(VO, os.path.basename(f))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f, "-af", f"atempo={a.tempo}",
                    "-c:a", "libmp3lame", "-b:a", "192k", out], check=True)
with open(os.path.join(RAW, "timing.json")) as fh:
    t = json.load(fh)
t = {k: [[w, round(s / a.tempo, 3), round(e / a.tempo, 3)] for w, s, e in v] for k, v in t.items()}
with open(os.path.join(VO, "timing.json"), "w") as fh:
    json.dump(t, fh, indent=0)
print(f"wrote {len(t)} lines at {a.tempo}x")
