// Two bright A/B thumbnails (1280x720).  node thumbnail_ab.cjs outA.jpg outB.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'invasions_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const shot = v => pg.evaluate(v => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bright = () => { ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#FFF6D0'; ctx.fillRect(0, 0, W, H); ctx.restore(); };
    if (v === 'A') {
      const c = { cx: 9.53, cy: -mercY(47.14), z: 900, rot: 0, tilt: 1, sx: W * 0.6, sy: H * 0.5 }; drawMap(ctx, c); fillKey(ctx, c, 'che', '#DA291C', 0.45, null); fillKey(ctx, c, 'lie', '#F4D03F', 0.7, '#002B7F'); fillKey(ctx, c, 'aut', '#9A9568', 1, null); for (const k of ['che', 'lie', 'aut', 'deu', 'ita']) strokeKey(ctx, c, k, '#2C3531', 3); bright();
      const [lx, ly] = P(c, 9.53, 47.14); ctx.save(); ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.shadowColor = '#FF2D3D'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(lx - 360, ly + 200); ctx.quadraticCurveTo(lx - 200, ly - 40, lx - 50, ly); ctx.stroke(); ctx.fillStyle = '#FF2D3D'; ctx.beginPath(); ctx.moveTo(lx + 10, ly + 10); ctx.lineTo(lx - 70, ly - 40); ctx.lineTo(lx - 50, ly + 40); ctx.fill(); ctx.restore();
      ring(ctx, lx, ly, 70, 0.3, '#FFD43B'); person(ctx, 'swiss_map', 1660, 1090, 440);
      const lg = ctx.createLinearGradient(0, 0, W * 0.45, 0); lg.addColorStop(0, 'rgba(10,20,26,0.85)'); lg.addColorStop(1, 'rgba(10,20,26,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      styledText(ctx, 'INVADED', 440, 330, 170, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, rot: -3 }); styledText(ctx, 'BY ACCIDENT?!', 470, 540, 170, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 12, rot: -3, maxW: 820 });
    } else {
      const c = { cx: -182.45, cy: -mercY(51.98), z: 1300, rot: 0, tilt: 1, sx: W * 0.6, sy: H * 0.55 }; drawMap(ctx, c); bright(); const [kx, ky] = P(c, -182.45, 51.98);
      sprite(ctx, 'empty_base', kx, ky + 30, 220, { ay: 0.9 }); fog(ctx, 3, 0.25);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; person(ctx, i % 2 ? 'can_soldier' : 'us_soldier', kx + Math.cos(a) * 330, ky + Math.sin(a) * 140 + 60, 150); }
      ctx.save(); ctx.fillStyle = 'rgba(10,20,26,0.82)'; ctx.fillRect(0, 0, W, 300); ctx.restore();
      styledText(ctx, '34,000 SOLDIERS', 620, 150, 120, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 10, rot: -2 }); styledText(ctx, 'vs 0', 1500, 150, 150, { fill: '#FF4D5E', stroke: '#141416', shadow: 10, rot: 2 });
    }
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  }, v);
  for (const [v, out] of [['A', process.argv[2]], ['B', process.argv[3]]]) { const d = await shot(v); fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); }
  await b.close();
})();
