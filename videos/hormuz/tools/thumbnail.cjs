// Render the YouTube thumbnail (1280x720) from the video's own engine + assets.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const HTML = 'file://' + path.resolve(__dirname, '..', 'dist', 'hormuz_preview.html') + '?render=1';
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto(HTML); await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: 56.25, cy: -mercY(26.78), z: 1150, rot: 0, tilt: 1, sx: W / 2, sy: H * 0.5 };
    drawMap(ctx, c);
    vignette(ctx);
    // darken the left side so the headline pops
    const g = ctx.createLinearGradient(0, 0, W * 0.7, 0);
    g.addColorStop(0, 'rgba(4,16,26,0.8)'); g.addColorStop(1, 'rgba(4,16,26,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    performanceT = 7.3;
    drawLanes(ctx, c, 1, 190);
    // red arrow from the headline down onto the lanes
    const lane = laneScreen(c);
    const [tx, ty] = pointAlong(lane, 0.52);
    const ax = 900, ay = 300;
    ctx.save(); ctx.lineCap = 'round';
    const cx1 = ax + 150, cy1 = ay + 30;
    ctx.strokeStyle = '#141416'; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx1, cy1, tx, ty - 70); ctx.stroke();
    ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = 22; ctx.stroke();
    const ang = Math.atan2(ty - 70 - cy1, tx - cx1);
    ctx.translate(tx, ty - 70); ctx.rotate(ang); ctx.fillStyle = '#FF2D3D'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(-30, -44); ctx.lineTo(-30, 44); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    // flag characters glaring across the gap
    sprite(ctx, 'iran_war', 1560, 250, 560, { rot: -4 });
    sprite(ctx, 'oman_calm', 1610, 840, 500, { rot: 4 });
    // headline
    styledText(ctx, '2 MILES', 470, 230, 300, { fill: '#FFD43B', stroke: '#141416', shadow: 14, rot: -4, maxW: 900 });
    styledText(ctx, "20% OF THE WORLD'S OIL", 460, 440, 78, { fill: '#FFFFFF', stroke: '#141416', shadow: 8, rot: -4, maxW: 860 });
    styledText(ctx, 'STRAIT OF HORMUZ', 450, 545, 54, { font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: '#3A2A08', shadow: 6, rot: -4 });
    const out = document.createElement('canvas'); out.width = 1280; out.height = 720;
    const o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(cv, 0, 0, 1280, 720);
    return out.toDataURL('image/png');
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64'));
  await b.close();
})();
