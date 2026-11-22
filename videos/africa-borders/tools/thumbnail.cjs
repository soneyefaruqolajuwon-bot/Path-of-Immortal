// YouTube thumbnail (1280x720) drawn with the video's own engine.  node thumbnail.cjs out.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'africa_borders.html') + '?render=1');
  await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: 16, cy: -mercY(8), z: 14.5, rot: 0, tilt: 1, sx: W * 0.66, sy: H * 0.5 };
    drawMap(ctx, c);
    ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#2C3531'; ctx.lineWidth = 2.5; for (const iso of Object.keys(GEO.africa)) ctx.stroke(countryPath(c, iso)); ctx.restore();
    GEO.straight.forEach(k => border(ctx, c, k, 1, C.gold, 9, { glow: true }));
    const [x0, y0] = P(c, 25, 22), [x1] = P(c, 37, 22);
    sprite(ctx, 'ruler', (x0 + x1) / 2 - 20, y0 - 40, (x1 - x0) * 2.2, { rot: -6 });
    const g = ctx.createLinearGradient(0, 0, W * 0.6, 0); g.addColorStop(0, 'rgba(6,14,20,0.88)'); g.addColorStop(1, 'rgba(6,14,20,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    styledText(ctx, 'DRAWN', 430, 330, 210, { fill: '#FFFFFF', stroke: '#141416', shadow: 10, maxW: 820 });
    styledText(ctx, 'WITH', 430, 530, 170, { fill: '#FFFFFF', stroke: '#141416', shadow: 10, maxW: 820 });
    styledText(ctx, 'RULERS', 430, 740, 210, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 10, maxW: 820 });
    sprite(ctx, 'bismarck', 1720, 1080, 300, { ay: 0.96 });
    const c2 = document.createElement('canvas'); c2.width = 1280; c2.height = 720; c2.getContext('2d').drawImage(cv, 0, 0, 1280, 720);
    return c2.toDataURL('image/jpeg', 0.92);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
