// YouTube thumbnail (1280x720) drawn with the video's own engine.  node thumbnail.cjs out.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'canberra_long.html') + '?render=1');
  await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: 147.2, cy: -mercY(-35.6), z: 98, rot: 0, tilt: 1, sx: W * 0.64, sy: H * 0.5 };
    drawMap(ctx, c);
    ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 2.5; ctx.setLineDash([9, 8]); for (const iso of Object.keys(GEO.countries)) ctx.stroke(countryPath(c, iso)); ctx.restore();
    tint(ctx, c, 'ACT', C.gold, 0.7, C.gold);
    const [cx, cy] = P(c, ...GEO.places.canberra), [sx, sy] = P(c, ...GEO.places.sydney), [mx, my] = P(c, ...GEO.places.melbourne);
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 260); g.addColorStop(0, 'rgba(255,214,90,0.75)'); g.addColorStop(1, 'rgba(255,214,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 260, 0, 7); ctx.fill();
    sprite(ctx, 'parliament', cx, cy, 230, { ay: 0.9 }); styledText(ctx, 'CANBERRA', cx, cy + 70, 64, { fill: C.gold, stroke: C.goldDark, shadow: 6 });
    sprite(ctx, 'opera_house', sx, sy, 180, { ay: 0.9 }); styledText(ctx, 'SYDNEY', sx, sy + 60, 50, { fill: '#fff', stroke: C.ink, shadow: 5 });
    sprite(ctx, 'tram', mx, my, 170, { ay: 0.9 }); styledText(ctx, 'MELBOURNE', mx + 60, my + 60, 50, { fill: '#fff', stroke: C.ink, shadow: 5 });
    const lg = ctx.createLinearGradient(0, 0, W * 0.55, 0); lg.addColorStop(0, 'rgba(6,14,20,0.9)'); lg.addColorStop(1, 'rgba(6,14,20,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    styledText(ctx, 'WHY NOT', 420, 300, 190, { fill: '#FFFFFF', stroke: '#141416', shadow: 10, maxW: 800 });
    styledText(ctx, 'SYDNEY?', 420, 500, 200, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 10, maxW: 800 });
    sprite(ctx, 'melbourne_tug', 230, 1060, 300, { ay: 0.96 }); sprite(ctx, 'sydney_tug', 640, 1060, 300, { ay: 0.96 });
    sprite(ctx, 'crown', 435, 780, 170, { rot: -8 });
    const c2 = document.createElement('canvas'); c2.width = 1280; c2.height = 720; c2.getContext('2d').drawImage(cv, 0, 0, 1280, 720);
    return c2.toDataURL('image/jpeg', 0.92);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
