"""9:16 teaser (~68 s): the long-form's opening up to "that safety math falls apart", frozen into a
"What happens over Tibet? Full video on YouTube" end card.  Needs out/tibet.mp4 (for the voiced audio).
  python tools/render_short.py
"""
import json, os, shutil, subprocess, sys, glob
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(R, "..", "pig-war", "src")); import audio as AU  # noqa: E402
CUT, TAIL, FPS = 65.2, 3.4, 30
OUT = os.path.join(R, "out"); seg = os.path.join(OUT, "segments_short")


def main():
    subprocess.run([sys.executable, os.path.join(HERE, "build_html.py"), "short"], check=True)
    shutil.rmtree(seg, ignore_errors=True); os.makedirs(seg)
    frames = [round(i / FPS, 4) for i in range(int((CUT + TAIL) * FPS))]
    fj = os.path.join(seg, "frames.json"); json.dump(frames, open(fj, "w"))
    env = dict(os.environ, SHORT="1", NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    subprocess.run(["node", os.path.join(HERE, "render.cjs"), "video", fj, seg, "4"], check=True, env=env)
    segs = sorted(glob.glob(os.path.join(seg, "seg*.mp4")))
    open(os.path.join(seg, "list.txt"), "w").writelines(f"file '{os.path.basename(s)}'\n" for s in segs)
    silent = os.path.join(seg, "silent.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(seg, "list.txt"), "-c", "copy", silent], check=True)
    # audio: the long-form mix up to the cut (soft fade), then an end-card hit
    head = os.path.join(seg, "head.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(OUT, "tibet.mp4"), "-t", str(CUT), "-af", f"afade=t=out:st={CUT - 0.5}:d=0.5",
                    "-ac", "2", "-ar", str(AU.SR), head], check=True)
    tail = np.zeros((2, int(TAIL * AU.SR)))
    for t, name, g in ((0.0, "whoosh", 0.9), (0.15, "thud", 0.8), (0.85, "ding", 0.7)):
        AU.place(tail, AU.SFX[name](), t, g * 0.55 * AU.GAIN.get(name, 1.0))
    tw = os.path.join(seg, "tail.wav"); import wave
    with wave.open(tw, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(AU.SR); w.writeframes((np.clip(tail.T, -1, 1) * 32767).astype(np.int16).tobytes())
    mix = os.path.join(seg, "mix.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", head, "-i", tw, "-filter_complex", "[0][1]concat=n=2:v=0:a=1,loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", mix], check=True)
    final = os.path.join(OUT, "tibet_short_teaser.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", mix, "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final)


if __name__ == "__main__":
    main()
