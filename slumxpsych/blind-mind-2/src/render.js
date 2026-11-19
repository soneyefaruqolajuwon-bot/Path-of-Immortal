// Usage:
//   node render.js stills 0,3,7,10,12,15,18,21,25 <outdir>   -> PNG stills
//   node render.js video <out.mp4>                            -> silent H.264 video
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30, DUR = 28;
(async () => {
  const [mode, a, b] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'blindmind.html'));
  await page.evaluate(() => window.ready);
  const shot = () => page.locator('#c').screenshot({ type: 'png' });

  if (mode === 'stills') {
    fs.mkdirSync(b, { recursive: true });
    for (const s of a.split(',').map(Number)) {
      await page.evaluate(t => draw(t), s);
      fs.writeFileSync(path.join(b, `still_${String(s).replace('.', '_')}.png`), await shot());
    }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-maxrate', '8M', '-bufsize', '16M', '-preset', 'medium', '-r', String(FPS), a],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const N = FPS * DUR;
    for (let f = 0; f < N; f++) {
      await page.evaluate(t => draw(t), f / FPS);
      const buf = await shot();
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) process.stdout.write(`frame ${f}/${N}\n`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
