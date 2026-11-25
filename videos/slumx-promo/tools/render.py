"""Render the Slumx promo (music-only motion ad) to MP4: frames via headless Chromium, 120 BPM procedural music + beat-synced SFX."""
import json, os, subprocess, sys, glob, shutil, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(R, "..", "pig-war", "src"))
import audio as AU  # noqa: E402
FPS, DUR = 30, 26.5
_bed = AU.music_bed
AU.music_bed = lambda d, bpm=120: _bed(d, 120)       # the promo runs at 120 BPM: every cut lands on a beat


def kick():
    d = 0.35; t = AU.t_(d); f = 110 * np.exp(-t * 18) + 42
    return AU.norm(np.sin(2 * np.pi * np.cumsum(f) / AU.SR) * np.exp(-t * 9), 0.95)


AU.SFX["kick"] = kick; AU.GAIN["kick"] = 0.9
CUES = [(t, "kick", 0) for t in np.arange(0, 22.5, 0.5)] + [
    (0.0, "pop", 0), (0.5, "pop", 0), (1.0, "slap", 0), (2.0, "pop", 0), (2.5, "slap", 0), (2.75, "whoosh", 0), (3.3, "ding", 0), (3.6, "pop", 0), (4.0, "harp", 0), (7.0, "whoosh", 0),
    (7.6, "pop", 0), (8.0, "pop", -0.2), (8.5, "pop", 0), (9.0, "pop", 0.2), (11.0, "whoosh", 0), (11.6, "pop", 0), (11.9, "slap", 0), (12.2, "harp", 0), (15.0, "whoosh", 0),
    (15.6, "whoosh", -0.3), (16.3, "slap", 0), (19.0, "whoosh", 0), (19.5, "slap", 0), (20.0, "slap", 0), (20.5, "pop", 0), (21.0, "slap", 0), (21.5, "chaching", 0), (22.0, "whoosh", 0),
    (22.6, "ding", 0), (23.4, "pop", 0), (23.7, "slap", 0), (24.3, "chaching", 0)]


def main():
    subprocess.run([sys.executable, os.path.join(HERE, "build_html.py")], check=True)
    seg = os.path.join(R, "out", "segments"); shutil.rmtree(seg, ignore_errors=True); os.makedirs(seg)
    frames = [round(i / FPS, 4) for i in range(int(DUR * FPS))]; fj = os.path.join(seg, "frames.json"); json.dump(frames, open(fj, "w"))
    env = dict(os.environ, NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()); t0 = time.time()
    subprocess.run(["node", os.path.join(HERE, "render.cjs"), "video", fj, seg, "4"], check=True, env=env)
    segs = sorted(glob.glob(os.path.join(seg, "seg*.mp4"))); open(os.path.join(seg, "list.txt"), "w").writelines(f"file '{os.path.basename(s)}'\n" for s in segs)
    silent = os.path.join(seg, "silent.mp4"); subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(seg, "list.txt"), "-c", "copy", silent], check=True)
    wav = os.path.join(seg, "mix.wav"); AU.mix(DUR, CUES, [], lambda tr: 1.0 if tr < 22.5 else 0.7, wav, music_gain=0.55)
    loud = os.path.join(seg, "mix_loud.wav"); subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", loud], check=True)
    out = os.path.join(R, "out", "slumx_promo.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", loud, "-c:v", "libx264", "-crf", "21", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], check=True)
    print("wrote", out, f"{os.path.getsize(out) / 1e6:.1f} MB in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
