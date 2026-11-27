// Two bright A/B thumbnails (1280x720).  node thumbnail_ab.cjs outA.jpg outB.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'darien_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const shot = variant => pg.evaluate(v => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bright = () => { ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#FFF6D0'; ctx.fillRect(0, 0, W, H); ctx.restore(); };
    const face = (x, y, s) => { const im = IMG.car_shock || IMG.car; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.drawImage(im, -200, -140, 400, 280); ctx.restore(); };
    if (v === 'A') {
      const c = { cx: -85, cy: -mercY(8), z: 6.6, rot: 0, tilt: 1, sx: W * 0.42, sy: H * 0.52 };
      drawMap(ctx, c); bright(); const thick = pts => { const sp = pts.map(p => P(c, p[0], p[1])); ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); sp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.strokeStyle = 'rgba(255,212,59,0.35)'; ctx.lineWidth = 34; ctx.stroke(); ctx.strokeStyle = '#3A2A08'; ctx.lineWidth = 18; ctx.stroke(); ctx.strokeStyle = '#FFD43B'; ctx.lineWidth = 12; ctx.stroke(); ctx.restore(); }; thick(HN); thick(HS);
      const [gx, gy] = P(c, -77.4, 8.1); ctx.save(); ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = 16; ctx.shadowColor = '#FF2D3D'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(gx, gy, 70, 0, 7); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx + 330, gy - 230); ctx.quadraticCurveTo(gx + 200, gy - 200, gx + 95, gy - 60); ctx.stroke(); ctx.fillStyle = '#FF2D3D'; ctx.beginPath(); ctx.moveTo(gx + 72, gy - 30); ctx.lineTo(gx + 75, gy - 105); ctx.lineTo(gx + 135, gy - 70); ctx.fill(); ctx.restore();
      styledText(ctx, 'EXCEPT\nHERE?!', 1430, 300, 170, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 14, rot: -4, maxW: 820 });
      face(1440, 820, 1.7);
    } else {
      const c = { cx: -78.0, cy: -mercY(8.4), z: 300, rot: 0, tilt: 1, sx: W * 0.5, sy: H * 0.62 };
      drawMap(ctx, c); bright(); road(ctx, c, HN, '#FFD43B'); road(ctx, c, HS, '#FFD43B'); gapFill(ctx, c, 0.8, '#2E7D32', '#7DDC9A'); trees(ctx, c, 1.4);
      barrier(ctx, c, 1.6, 0); const [yx, yy] = P(c, ...CARSTOP); face(yx - 170, yy - 20, 1.25);
      ctx.save(); ctx.fillStyle = 'rgba(10,20,26,0.82)'; ctx.fillRect(0, 0, W, 300); ctx.restore();
      styledText(ctx, '19,000 MILES ✓', 500, 150, 110, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 10, rot: -2 });
      styledText(ctx, '60 MILES ✗', 1440, 150, 120, { fill: '#FF4D5E', stroke: '#141416', shadow: 10, rot: 2 });
    }
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  }, variant);
  for (const [v, out] of [['A', process.argv[2]], ['B', process.argv[3]]]) { const d = await shot(v); fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); }
  await b.close();
})();
