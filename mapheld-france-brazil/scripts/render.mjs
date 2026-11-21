// Renders the animation to out/mapheld-france-brazil.mp4 (1080×1920, 30 fps, 70 s) + a thumbnail.
// Usage: node scripts/render.mjs [--fps 30] [--workers 4]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
// Use the project's playwright if installed, else the globally installed one.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const FPS = arg('fps', 30), WORKERS = arg('workers', Math.min(4, os.cpus().length)), DUR = 70;
const N = Math.round(DUR * FPS);
const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'mapheld-frames-'));
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });

const browser = await chromium.launch();
let done = 0;
async function worker(w) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + path.join(ROOT, 'index.html') + '?render');
  await page.waitForFunction(() => window.MAPHELD_READY, null, { timeout: 30000 });
  for (let i = w; i < N; i += WORKERS) {
    await page.evaluate(t => window.renderAt(t), i / FPS);
    await page.screenshot({ path: path.join(frames, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 });
    if (++done % 150 === 0) console.log(`${done}/${N} frames`);
  }
  await page.close();
}
await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)));
await browser.close();

const out = path.join(ROOT, 'out/mapheld-france-brazil.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.jpg'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
fs.copyFileSync(path.join(frames, `f${String(Math.round(22.9 * FPS)).padStart(5, '0')}.jpg`), path.join(ROOT, 'out/thumbnail.jpg'));
fs.rmSync(frames, { recursive: true, force: true });
console.log('wrote', out);
