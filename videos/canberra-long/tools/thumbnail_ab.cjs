// Two bright A/B thumbnails (1280x720) that don't reveal the answer.  node thumbnail_ab.cjs outA.jpg outB.jpg
// A: "NEITHER?!": Sydney and Melbourne fight over the crown while a sheep wears it.
// B: SYDNEY ✗ MELBOURNE ✗: both cities crossed out, a big "?" where the capital should be.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'canberra_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const shot = v => pg.evaluate(v => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: 147.6, cy: -mercY(-35.2), z: 92, rot: 0, tilt: 1, sx: W * 0.5, sy: H * 0.5 };
    drawMap(ctx, c);
    ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#FFF6D0'; ctx.fillRect(0, 0, W, H); ctx.restore();   // brighten
    const [sx, sy] = P(c, ...GEO.places.sydney), [mx, my] = P(c, ...GEO.places.melbourne);
    if (v === 'B') { sprite(ctx, 'opera_house', sx, sy, 200, { ay: 0.9 }); styledText(ctx, 'SYDNEY', sx, sy + 66, 56, { fill: '#fff', stroke: '#141416', shadow: 6 });
      sprite(ctx, 'tram', mx, my, 190, { ay: 0.9 }); styledText(ctx, 'MELBOURNE', mx + 40, my + 66, 56, { fill: '#fff', stroke: '#141416', shadow: 6 }); }
    const X = (x, y, s) => { ctx.save(); ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x + s / 2, y + s / 2); ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x - s / 2, y + s / 2); ctx.stroke(); ctx.restore(); };
    if (v === 'A') {
      // the two rivals, big, tugging; a sheep in the middle wears the crown
      person(ctx, 'melbourne_tug', 330, 1150, 520, {}); person(ctx, 'sydney_tug', 1590, 1150, 520, { flip: true });
      ctx.save(); ctx.strokeStyle = '#8B5A2B'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(600, 790); ctx.quadraticCurveTo(960, 860, 1320, 790); ctx.stroke(); ctx.restore();
      sprite(ctx, 'sheep', 960, 1010, 480, { ay: 0.9 }); sprite(ctx, 'crown', 1000, 690, 240, { rot: 10 });
      styledText(ctx, 'NEITHER?!', 960, 230, 230, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 14, rot: -3, maxW: 1500 });
    } else {
      X(sx, sy - 30, 190); X(mx, my - 30, 190);
      person(ctx, 'melbourne_sulk', 300, 1150, 470, {}); person(ctx, 'sydney_sulk', 1620, 1150, 470, { flip: true });
      styledText(ctx, '?', 960, 650, 420, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 16, rot: 6 });
      styledText(ctx, "AUSTRALIA'S CAPITAL?", 960, 170, 130, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, rot: -2, maxW: 1700 });
    }
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  }, v);
  for (const [v, out] of [['A', process.argv[2]], ['B', process.argv[3]]]) fs.writeFileSync(out, Buffer.from((await shot(v)).split(',')[1], 'base64'));
  await b.close();
})();
