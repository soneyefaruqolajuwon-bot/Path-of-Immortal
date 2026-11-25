// Bright thumbnail (1280x720) for Test & Compare.  node thumbnail_bright.cjs out.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'canada_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: -95, cy: -mercY(57), z: 16, rot: 0, tilt: 1, sx: W * 0.63, sy: H * 0.5 };
    drawMap(ctx, c); fillGeo(ctx, c, 'usa', 'rgba(20,30,28,0.25)', 1); shieldFill(ctx, c, 1); cityLights(ctx, c, 10, 0.9, true);
    geoLine(ctx, c, BORDER, 1, '#F4D03F', 10, null, true);
    for (const [nm, dx, dy] of [['Toronto', 30, 46], ['Montreal', 40, -40], ['Vancouver', 60, 40]]) cityLabel(ctx, c, nm, 1, dx, dy, 40);
    const [mx, my] = P(c, -97, 62.5); ctx.save(); ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = 14; ctx.shadowColor = '#FF2D3D'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.ellipse(mx, my, 300, 200, 0, 0, 7); ctx.stroke(); ctx.restore();
    person(ctx, 'farmer_clang', mx + 30, my + 190, 290);
    styledText(ctx, 'CANADA', mx + 420, my - 150, 60, { fill: '#FFFFFF', stroke: '#141416', shadow: 6 });
    const lg = ctx.createLinearGradient(0, 0, W * 0.46, 0); lg.addColorStop(0, 'rgba(10,20,26,0.92)'); lg.addColorStop(1, 'rgba(10,20,26,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    styledText(ctx, 'NOBODY', 360, 300, 190, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, maxW: 700, rot: -3 });
    styledText(ctx, 'LIVES HERE', 390, 500, 150, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 12, maxW: 760, rot: -3 });
    ctx.save(); ctx.translate(380, 670); ctx.rotate(-0.05); ctx.font = '800 54px Montserrat'; const tw = ctx.measureText("IT'S NOT JUST THE COLD").width + 70;
    ctx.fillStyle = '#BFE6FF'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-tw / 2, -50, tw, 100, 22); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#141416'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText("IT'S NOT JUST THE COLD", 0, 4); ctx.restore();
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
