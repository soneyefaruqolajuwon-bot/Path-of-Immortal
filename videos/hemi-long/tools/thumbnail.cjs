// Bright thumbnail (1280x720) for the hemisphere long-form.  node thumbnail.cjs out.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'hemi_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: 25, cy: -mercY(18), z: 7.4, rot: 0, tilt: 1, sx: W * 0.6, sy: H * 0.5 };
    drawMap(ctx, c); ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#FFF6D0'; ctx.fillRect(0, 0, W, H); ctx.restore();
    fillKey(ctx, c, 'north', '#F4D03F', 0.45, '#F4D03F'); popGlow(ctx, c, POP, 1, 1.3);
    const [, ey] = P(c, 0, 0); ctx.save(); ctx.strokeStyle = '#F4D03F'; ctx.lineWidth = 12; ctx.shadowColor = '#F4D03F'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.moveTo(0, ey); ctx.lineTo(W, ey); ctx.stroke(); ctx.restore();
    person(ctx, 'north_cold', 1500, ey - 60, 250); person(ctx, 'south_chill', 1320, ey + 420, 240);
    styledText(ctx, '90%', 1080, ey - 260, 190, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 12, rot: -4 }); styledText(ctx, '10%', 1060, ey + 250, 130, { fill: '#BFE6F2', stroke: '#141416', shadow: 10, rot: -4 });
    const lg = ctx.createLinearGradient(0, 0, W * 0.48, 0); lg.addColorStop(0, 'rgba(10,20,26,0.9)'); lg.addColorStop(1, 'rgba(10,20,26,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    styledText(ctx, 'WHY IS', 380, 250, 150, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, rot: -3 });
    styledText(ctx, 'EVERYONE\nUP HERE?', 400, 500, 140, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 12, rot: -3, maxW: 760 });
    ctx.save(); ctx.translate(390, 790); ctx.rotate(-0.05); ctx.font = '800 50px Montserrat'; const tw = ctx.measureText("IT'S NOT THE WEATHER").width + 70;
    ctx.fillStyle = '#FF4D5E'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-tw / 2, -48, tw, 96, 22); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText("IT'S NOT THE WEATHER", 0, 4); ctx.restore();
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
