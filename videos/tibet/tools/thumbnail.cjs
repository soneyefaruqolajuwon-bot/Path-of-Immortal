// YouTube thumbnail (1280x720) for the Tibet long-form, drawn with the video's own map engine.
//   node thumbnail.cjs out.jpg
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'tibet.html') + '?render=1');
  await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'), t = 40;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: 82, cy: -mercY(31), z: 21, rot: 0, tilt: 1, sx: W * 0.56, sy: H * 0.52 };
    drawMap(ctx, c);
    ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); for (const iso of Object.keys(GEO.countries)) ctx.stroke(countryPath(c, iso)); ctx.restore();
    drawRoutes(ctx, c, t, 1, 1, 1);
    plateau(ctx, c, t, { dark: 0.92, edge: 1 });
    himalaya(ctx, c, 1);
    // glow ring around the blank spot
    const [px, py] = P(c, 88.5, 33);
    ctx.save(); ctx.strokeStyle = '#FF4D4D'; ctx.lineWidth = 10; ctx.shadowColor = '#FF4D4D'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.ellipse(px, py, 360, 190, -0.08, 0, 7); ctx.stroke(); ctx.restore();
    // darken the left for the headline
    const g = ctx.createLinearGradient(0, 0, W * 0.55, 0); g.addColorStop(0, 'rgba(6,14,20,0.85)'); g.addColorStop(1, 'rgba(6,14,20,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    styledText(ctx, 'PLANES', 400, 300, 190, { fill: '#FFFFFF', stroke: '#141416', shadow: 10, maxW: 760 });
    styledText(ctx, 'AVOID', 400, 500, 190, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 10, maxW: 760 });
    styledText(ctx, 'THIS', 400, 700, 190, { fill: '#FFFFFF', stroke: '#141416', shadow: 10, maxW: 760 });
    // arrow to the plateau
    ctx.save(); ctx.strokeStyle = '#FFD43B'; ctx.fillStyle = '#FFD43B'; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(700, 640); ctx.quadraticCurveTo(820, 560, px - 380, py + 40); ctx.stroke();
    const ang = Math.atan2(py + 40 - 560, px - 380 - 820); ctx.translate(px - 380, py + 40); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-30, -34); ctx.lineTo(-30, 34); ctx.closePath(); ctx.fill(); ctx.restore();
    sprite(ctx, 'plane_top', 1580, 210, 230, { rot: 18 });
    styledText(ctx, '?', px + 10, py + 6, 220, { fill: '#FFFFFF', stroke: '#141416', shadow: 10 });
    const c2 = document.createElement('canvas'); c2.width = 1280; c2.height = 720; c2.getContext('2d').drawImage(cv, 0, 0, 1280, 720);
    return c2.toDataURL('image/jpeg', 0.92);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
