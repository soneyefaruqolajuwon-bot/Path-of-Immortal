// YouTube thumbnail (1280x720) rendered with the video's own engine.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const HTML = 'file://' + path.resolve(__dirname, '..', 'dist', 'mercator.html') + '?render=1';
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto(HTML); await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = makeCam(Mv(-5, 38, 5.6), null, 0);
    drawBase(ctx, c, 0); drawGraticule(ctx, c, 0.18); drawLand(ctx, c); vignette(ctx);
    hl(ctx, c, 'GRL', 1); hl(ctx, c, 'AFRICA', 1);
    const tg = ringsPath(c, moveRings(RINGS.GRL, GEO.centroids.GRL, [20, 2], 1));
    ctx.save(); ctx.fillStyle = '#FF5A1F'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.fill(tg, 'evenodd'); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke(tg); ctx.restore();
    const [gx, gy] = c.proj(-41, 74), [tx, ty] = c.proj(20, 2);
    ctx.save(); ctx.strokeStyle = '#141416'; ctx.lineWidth = 30; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gx + 60, gy + 60); ctx.quadraticCurveTo(gx + 420, gy + 120, tx - 40, ty - 70); ctx.stroke();
    ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = 18; ctx.stroke(); ctx.restore();
    const ang = Math.atan2(ty - 70 - (gy + 120), tx - 40 - (gx + 420));
    ctx.save(); ctx.translate(tx - 40, ty - 70); ctx.rotate(ang); ctx.fillStyle = '#FF2D3D'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(-28, -40); ctx.lineTo(-28, 40); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    styledText(ctx, 'SAME SIZE?', 1500, 230, 150, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, rot: -4, maxW: 760 });
    styledText(ctx, 'NOT EVEN CLOSE', 1500, 400, 104, { fill: '#FFD43B', stroke: '#141416', shadow: 10, rot: -4, maxW: 760 });
    chip(ctx, 'REAL SIZE', tx, ty + 120, 1, { size: 46, fill: '#FFB36B', stroke: '#FF9F43' });
    const out = document.createElement('canvas'); out.width = 1280; out.height = 720;
    const o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(cv, 0, 0, 1280, 720);
    return out.toDataURL('image/png');
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64'));
  await b.close();
})();
