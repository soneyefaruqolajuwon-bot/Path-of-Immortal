"""Render The Pig War short.

  python render.py stills 0.5 4.3 12 ...      # PNG stills at storyboard times
  python render.py video                       # full 1080x1920 30fps MP4
  python render.py video --preview             # half-res 15fps quick check
  python render.py video --no-vo               # ignore ../vo even if present
"""
import argparse
import multiprocessing as mp
import os
import subprocess
import sys
import time

import cairo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import video as V  # noqa: E402

OUT = os.path.join(HERE, "..", "out")
_A = None


def _init():
    global _A
    _A = V.Assets()


def _surface(scale):
    w, h = int(V.W * scale), int(V.H * scale)
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h)
    ctx = cairo.Context(s)
    ctx.scale(scale, scale)
    return s, ctx


def render_still(T, path, scale=1.0):
    s, ctx = _surface(scale)
    V.draw_frame(ctx, _A, T)
    s.write_to_png(path)


def _segment(args):
    idx, f0, f1, fps, scale, path, use_vo = args
    tl = V.Timeline(use_vo)
    w, h = int(V.W * scale), int(V.H * scale)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgra",
                          "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
                          "-c:v", "libx264", "-preset", "medium", "-crf", "18" if scale == 1 else "24",
                          "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    s, ctx = _surface(scale)
    for f in range(f0, f1):
        T = tl.nominal(f / fps)
        ctx.save()
        V.draw_frame(ctx, _A, T)
        ctx.restore()
        s.flush()
        p.stdin.write(bytes(s.get_data()))
    p.stdin.close()
    p.wait()
    return idx


def render_video(preview=False, use_vo=True, workers=4):
    os.makedirs(OUT, exist_ok=True)
    fps, scale = (15, 0.5) if preview else (30, 1.0)
    tl = V.Timeline(use_vo)
    print(f"duration {tl.duration:.2f}s, VO lines found: {len(tl.vo)}/{len(V.BEATS)}")
    n = int(round(tl.duration * fps))
    chunks = max(workers * 3, 1)
    per = (n + chunks - 1) // chunks
    tmp = os.path.join(OUT, "segments")
    os.makedirs(tmp, exist_ok=True)
    jobs = [(i, i * per, min(n, (i + 1) * per), fps, scale, os.path.join(tmp, f"seg{i:03d}.mp4"), use_vo)
            for i in range(chunks) if i * per < n]
    t0 = time.time()
    with mp.Pool(workers, initializer=_init) as pool:
        for k, _ in enumerate(pool.imap_unordered(_segment, jobs)):
            print(f"  segment {k + 1}/{len(jobs)}  ({time.time() - t0:.0f}s)", flush=True)
    lst = os.path.join(tmp, "list.txt")
    with open(lst, "w") as f:
        for j in jobs:
            f.write(f"file '{os.path.basename(j[5])}'\n")
    silent = os.path.join(OUT, "video_silent.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent], check=True)
    # audio
    import audio as AU
    sfx = [(tl.to_real(t), name, pan) for t, name, pan in V.SFX_CUES]
    wav = os.path.join(OUT, "mix.wav")
    AU.mix(tl.duration, sfx, tl.vo_events(), lambda tr: V.music_env(tl.nominal(tr)), wav,
           music_gain=0.16 if tl.vo else 0.2)
    name = "pig_war_preview.mp4" if preview else ("pig_war.mp4" if tl.vo else "pig_war_draft_no_voice.mp4")
    final = os.path.join(OUT, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac",
                    "-b:a", "192k", "-shortest", "-movflags", "+faststart", final], check=True)
    print("wrote", final, f"in {time.time() - t0:.0f}s")
    return final


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["stills", "video"])
    ap.add_argument("times", nargs="*", type=float)
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--no-vo", action="store_true")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--scale", type=float, default=0.5)
    a = ap.parse_args()
    if a.mode == "stills":
        _init()
        d = os.path.join(OUT, "stills")
        os.makedirs(d, exist_ok=True)
        for T in a.times:
            p = os.path.join(d, f"t{T:05.1f}.png")
            t0 = time.time()
            render_still(T, p, a.scale)
            print(p, f"{time.time() - t0:.2f}s")
    else:
        render_video(a.preview, not a.no_vo, a.workers)
