// Two bright A/B thumbnails (1280x720) for the AI-loophole long-form.  node thumbnail_ab.cjs outA.jpg outB.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'chokepoints_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const shot = variant => pg.evaluate(v => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bright = () => { ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#FFF6D0'; ctx.fillRect(0, 0, W, H); ctx.restore(); };
    const c = { cx: 108, cy: -mercY(14), z: 32, rot: 0, tilt: 1, sx: W * 0.33, sy: H * 0.45 };
    drawMap(ctx, c); bright(); fillKey(ctx, c, 'chn', 'rgba(255,60,60,0.35)', 1); chinaWall(ctx, c, 1, 0.3, 1.5);
    // glowing path sneaking around the wall: Singapore -> up the coast -> into China
    const route = [[103.8, 1.3], [108, 8], [113, 16], [117.5, 21], [116, 25.5]]; const sp = route.map(p => P(c, p[0], p[1]));
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); sp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = 'rgba(244,208,63,0.35)'; ctx.lineWidth = 40; ctx.stroke(); ctx.strokeStyle = '#3A2A08'; ctx.lineWidth = 20; ctx.stroke(); ctx.strokeStyle = '#FFD43B'; ctx.lineWidth = 13; ctx.setLineDash([4, 26]); ctx.stroke(); ctx.restore();
    const [ex, ey] = sp[sp.length - 1]; chipIcon(ctx, ex, ey, 1.6, 1); const [sx, sy] = sp[0]; ctx.save(); ctx.strokeStyle = '#FFD43B'; ctx.lineWidth = 10; ctx.shadowColor = '#FFD43B'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(sx, sy, 46, 0, 7); ctx.stroke(); ctx.restore();
    styledText(ctx, 'SINGAPORE', sx + 10, sy + 90, 54, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 8 });
    if (v === 'C') {
      // the CEO, big and stressed, with the RESIGNED stamp and a curiosity line (no accusation)
      ctx.save(); const sg = ctx.createLinearGradient(980, 0, 1300, 0); sg.addColorStop(0, 'rgba(10,20,26,0)'); sg.addColorStop(1, 'rgba(10,20,26,0.4)'); ctx.fillStyle = sg; ctx.fillRect(980, 0, 940, H); ctx.restore();
      styledText(ctx, 'WHY DID\nHE QUIT?', 1490, 170, 128, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 14, rot: -4, maxW: 760 });
      person(ctx, 'ceo_sad', 1500, 1240, 560, {});
      chip(ctx, 'JENSEN HUANG · NVIDIA CEO', 1490, 440, 1, { size: 50, stroke: '#F4D03F' }); sarrow(ctx, 1490, 490, 1490, 560, 1, '#F4D03F', 10);
      stamp(ctx, 'RESIGNED', 1490, 900, 10, 0, { size: 84, rot: -10 });
    } else if (v === 'A') {
      styledText(ctx, 'THE AI\nLOOPHOLE', 1480, 290, 170, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 14, rot: -4, maxW: 760 });
      serverChar(ctx, 1500, 1040, 1.55, 0.4, { shock: true, look: -1 });
    } else {
      styledText(ctx, "24% OF\nCHINA'S AI?", 1470, 270, 150, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 14, rot: -4, maxW: 780 });
      donut(ctx, 1220, 790, 150, 0.24, 1, '24%');
      serverChar(ctx, 1660, 1040, 1.25, 0.4, { shock: true, look: -1 });
    }
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  }, variant);
  for (const [v, out] of [['A', process.argv[2]], ['B', process.argv[3]], ['C', process.argv[4]]].filter(x => x[1])) { const d = await shot(v); fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); }
  await b.close();
})();
