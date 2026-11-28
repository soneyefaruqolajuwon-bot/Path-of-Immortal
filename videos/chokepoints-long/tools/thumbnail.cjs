// Bright thumbnail (1280x720) for the Darién Gap long-form.  node thumbnail.cjs out.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'darien_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: -78.0, cy: -mercY(8.45), z: 330, rot: 0, tilt: 1, sx: W * 0.66, sy: H * 0.52 };
    drawMap(ctx, c); ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = '#FFF6D0'; ctx.fillRect(0, 0, W, H); ctx.restore();
    road(ctx, c, HN); road(ctx, c, HS); gapFill(ctx, c, 0.75, '#2E7D32', '#7DDC9A'); trees(ctx, c, 1.3);
    const [yx, yy] = P(c, ...CARSTOP); sprite(ctx, 'car', yx - 30, yy + 10, 330, { ay: 0.82 }); barrier(ctx, c, 1.4, 0);
    ctx.save(); ctx.translate(W * 0.74, 260); ctx.rotate(-0.12); ctx.font = '800 72px Montserrat'; const sw = ctx.measureText('ROAD ENDS HERE').width + 60; ctx.strokeStyle = '#D7263D'; ctx.lineWidth = 10; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.roundRect(-sw / 2, -60, sw, 120, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#D7263D'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ROAD ENDS HERE', 0, 4); ctx.restore();
    const lg = ctx.createLinearGradient(0, 0, W * 0.5, 0); lg.addColorStop(0, 'rgba(10,20,26,0.9)'); lg.addColorStop(1, 'rgba(10,20,26,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    styledText(ctx, 'NO ROAD', 450, 300, 150, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, rot: -3 });
    styledText(ctx, 'FOR 60\nMILES', 450, 540, 140, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 12, rot: -3, maxW: 760 });
    ctx.save(); ctx.translate(450, 820); ctx.rotate(-0.05); ctx.font = '800 46px Montserrat'; const tw = ctx.measureText('300 YEARS. STILL NOTHING.').width + 70;
    ctx.fillStyle = '#FF4D5E'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-tw / 2, -48, tw, 96, 22); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('300 YEARS. STILL NOTHING.', 0, 4); ctx.restore();
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
