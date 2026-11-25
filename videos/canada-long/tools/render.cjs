// Frame renderer driven by headless Chromium.
//   node render.cjs stills out_dir t1 t2 ...        -> PNG stills (960x540)
//   node render.cjs video frames.json out_dir N     -> N mp4 segments (1920x1080), one per worker
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const VERT = false;
const HTML = 'file://' + path.resolve(__dirname, '..', 'dist', 'canada_long.html') + '?render=1' + (process.env.NOSUBS === '1' ? '&nosubs=1' : '');

async function openPage(browser) {
  const pg = await browser.newPage({ viewport: process.env.SHORT === '1' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  pg.on('pageerror', e => console.log('[pageerror]', e.message));
  await pg.goto(HTML); await pg.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return pg;
}
async function grab(pg, t, type = 'jpeg', scale = 1) {
  const data = await pg.evaluate(([t, type, scale]) => {
    renderAt(t);
    const src = document.getElementById('cv');
    if (scale === 1) return src.toDataURL('image/' + type, 0.93);
    const c = document.createElement('canvas'); c.width = src.width * scale; c.height = src.height * scale;
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/' + type, 0.93);
  }, [t, type, scale]);
  return Buffer.from(data.split(',')[1], 'base64');
}
(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const browser = await chromium.launch();
  if (mode === 'stills') {
    const [dir, ...ts] = args; fs.mkdirSync(dir, { recursive: true });
    const pg = await openPage(browser);
    for (const t of ts) { fs.writeFileSync(path.join(dir, `t${(+t).toFixed(1).padStart(5, '0')}.png`), await grab(pg, +t, 'png', 0.5)); }
  } else {
    const [framesFile, dir, nStr] = args; const frames = JSON.parse(fs.readFileSync(framesFile)); const N = +nStr || 4;
    fs.mkdirSync(dir, { recursive: true });
    const per = Math.ceil(frames.length / N); let done = 0; const t0 = Date.now();
    await Promise.all([...Array(N).keys()].map(async w => {
      const slice = frames.slice(w * per, (w + 1) * per); if (!slice.length) return;
      const pg = await openPage(browser);
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', path.join(dir, `seg${String(w).padStart(2, '0')}.mp4`)],
        { stdio: ['pipe', 'inherit', 'inherit'] });
      for (const t of slice) {
        const buf = await grab(pg, t);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (++done % 150 === 0) console.log(`  ${done}/${frames.length} frames (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
    }));
  }
  await browser.close();
})();
