// YouTube thumbnail (1280x720) drawn with the video's own engine.  node thumbnail.cjs out.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'canada_long.html') + '?render=1');
  await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: -96, cy: -mercY(58), z: 15, rot: 0, tilt: 1, sx: W * 0.62, sy: H * 0.52 };
    drawMap(ctx, c); ctx.fillStyle = 'rgba(3,7,18,0.72)'; ctx.fillRect(0, 0, W, H);
    shieldFill(ctx, c, 0.9); cityLights(ctx, c, 10, 1.2); usLights(ctx, c, 0.25);
    geoLine(ctx, c, BORDER, 1, '#F4D03F', 9, null, true);
    const [mx, my] = P(c, -95, 62); ctx.save(); ctx.strokeStyle = '#FF3B47'; ctx.lineWidth = 12; ctx.shadowColor = '#FF3B47'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.ellipse(mx, my, 330, 210, 0, 0, 7); ctx.stroke(); ctx.restore();
    styledText(ctx, '?', mx, my, 240, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 12 });
    person(ctx, 'farmer_clang', mx + 250, my + 250, 240);
    const lg = ctx.createLinearGradient(0, 0, W * 0.5, 0); lg.addColorStop(0, 'rgba(6,14,20,0.92)'); lg.addColorStop(1, 'rgba(6,14,20,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    styledText(ctx, 'WHY IS', 360, 330, 170, { fill: '#FFFFFF', stroke: '#141416', shadow: 10, maxW: 700, rot: -3 });
    styledText(ctx, 'THIS EMPTY?', 400, 520, 150, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 10, maxW: 760, rot: -3 });
    styledText(ctx, "IT'S NOT JUST THE COLD", 380, 680, 58, { fill: '#BFE6FF', stroke: '#141416', shadow: 6, rot: -3 });
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
