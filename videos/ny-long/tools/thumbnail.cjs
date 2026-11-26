// Bright thumbnail (1280x720) for the New York capital long-form.  node thumbnail.cjs out.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'ny_capital_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: -74.3, cy: -mercY(41.75), z: 250, rot: 0, tilt: 1, sx: W * 0.68, sy: H * 0.5 };
    drawMap(ctx, c); fillKey(ctx, c, 'lakes', C.ocean, 1); for (const k of Object.keys(GEO)) if (k.startsWith('st_')) strokeKey(ctx, c, k, 'rgba(44,53,49,0.75)', 2.5);
    fillKey(ctx, c, 'ny', '#F4D03F', 0.22); strokeKey(ctx, c, 'ny', '#F4D03F', 6, 1);
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#FFF6D0'; ctx.fillRect(0, 0, W, H); ctx.restore();   // brighten
    river(ctx, c, HUD, 0.73, 12);
    const [ax, ay] = P(c, ALB[0], ALB[1]), [nx, ny] = P(c, NYC[0], NYC[1]);
    ring(ctx, ax, ay - 40, 120, 0.3); sprite(ctx, 'capitol', ax, ay, 260, { ay: 0.9 }); styledText(ctx, 'ALBANY', ax + 250, ay - 70, 80, { fill: '#F4D03F', stroke: '#3A2A08', shadow: 8 });
    styledText(ctx, '✓ CAPITAL', ax + 250, ay + 20, 50, { fill: '#7DFF9A', stroke: '#141416', shadow: 6 });
    sprite(ctx, 'skyline', nx - 30, ny + 20, 380, { ay: 0.9 });
    person(ctx, 'nyc_shock', nx + 330, ny + 300, 360);
    stamp(ctx, 'NOT THE CAPITAL', nx - 10, ny - 250, 10, 0, { size: 70, rot: -10 });
    const lg = ctx.createLinearGradient(0, 0, W * 0.5, 0); lg.addColorStop(0, 'rgba(10,20,26,0.88)'); lg.addColorStop(1, 'rgba(10,20,26,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    styledText(ctx, 'WHY NOT', 400, 300, 180, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, maxW: 760, rot: -3 });
    styledText(ctx, 'NEW YORK\nCITY?', 420, 540, 150, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 12, maxW: 780, rot: -3 });
    ctx.save(); ctx.translate(400, 820); ctx.rotate(-0.05); ctx.font = '800 54px Montserrat'; const tw = ctx.measureText('THE HIDDEN REASON').width + 70;
    ctx.fillStyle = '#FF4D5E'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-tw / 2, -50, tw, 100, 22); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('THE HIDDEN REASON', 0, 4); ctx.restore();
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
