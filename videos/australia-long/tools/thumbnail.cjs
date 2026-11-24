// YouTube thumbnail (1280x720) drawn with the video's own engine.  node thumbnail.cjs out.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'australia_long.html') + '?render=1');
  await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: 134, cy: -mercY(-27.5), z: 27, rot: 0, tilt: 1, sx: W * 0.66, sy: H * 0.5 };
    drawMap(ctx, c); ctx.fillStyle = 'rgba(3,7,18,0.8)'; ctx.fillRect(0, 0, W, H);
    cityLights(ctx, c, 10, 1.15);
    strokeGeo(ctx, c, 'aus', 'rgba(244,208,63,0.35)', 30, { glow: 26 }); strokeGeo(ctx, c, 'aus', '#F4D03F', 4);
    const [mx, my] = P(c, 134.2, -25.2), R = 250;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill(); ctx.strokeStyle = '#FF3B47'; ctx.lineWidth = 12; ctx.shadowColor = '#FF3B47'; ctx.shadowBlur = 30; ctx.stroke(); ctx.restore();
    styledText(ctx, '?', mx, my, 260, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 12 });
    person(ctx, 'explorer_thirsty', mx + 160, my + 230, 230);
    const lg = ctx.createLinearGradient(0, 0, W * 0.5, 0); lg.addColorStop(0, 'rgba(6,14,20,0.92)'); lg.addColorStop(1, 'rgba(6,14,20,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    styledText(ctx, 'WHY IS', 360, 330, 170, { fill: '#FFFFFF', stroke: '#141416', shadow: 10, maxW: 700, rot: -3 });
    styledText(ctx, 'THIS EMPTY?', 400, 520, 150, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 10, maxW: 760, rot: -3 });
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
