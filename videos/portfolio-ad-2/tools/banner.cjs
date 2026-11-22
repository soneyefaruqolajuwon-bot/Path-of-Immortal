// YouTube channel banner (2560x1440) in the ad's style. Everything important sits in the 1546x423 centre band that every device shows.
//   node banner.cjs out.png
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'dont_scroll_ad.html') + '?render=1');
  await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate(() => {
    const BW = 2560, BH = 1440, cv = document.createElement('canvas'); cv.width = BW; cv.height = BH; const ctx = cv.getContext('2d');
    const SAFE = { x0: 507, x1: 2053, y0: 508, y1: 931 }, GY = 905, t = 1.2;
    ctx.drawImage(IMG.bg_sky, 0, 0, BW, BH);
    sprite(ctx, 'sun', 1280, 860, 1100);
    rays(ctx, 1280, 860, t, 1.3, 15, 2200);
    ctx.drawImage(SKYLINE, -40, GY - 500); ctx.drawImage(SKYLINE, 2560 - 40, GY - 500, -2600, 520);
    ctx.fillStyle = '#12141C'; ctx.fillRect(0, GY, BW, BH - GY);
    const g = ctx.createLinearGradient(0, GY, 0, GY + 70); g.addColorStop(0, 'rgba(245,176,65,0.35)'); g.addColorStop(1, 'rgba(245,176,65,0)'); ctx.fillStyle = g; ctx.fillRect(0, GY, BW, 70);
    ctx.fillStyle = C.rim; ctx.fillRect(0, GY - 2, BW, 3);
    // characters (inside the safe band): left pair holds the idea orb, right pair cheers
    const cw = 175;
    actor(ctx, 'scientist', 'point', 575, GY, { w: cw });
    actor(ctx, 'host', 'catch', 735, GY, { w: cw });
    const h = handOf('catch', cw); orb(ctx, 735 + h[0] + 4, GY + h[1] - 22, 30, '');
    ripple(ctx, 735 + h[0] + 4, GY + h[1] - 22, 0.3, 0, { r: 95, n: 2, d: 0.9 });
    actor(ctx, 'capper', 'cheer', 1830, GY, { w: cw });
    actor(ctx, 'coach', 'cheer', 1985, GY, { w: cw });
    // title
    text(ctx, 'SLUMX', 1280, 640, 210, { stroke: C.rim, strokeW: 10, spacing: 18 });
    text(ctx, 'SCRIPTS IN. ANIMATION OUT.', 1280, 800, 52, { grad: ['#FBE29A', C.rim], stroke: '#3A2408', strokeW: 5, spacing: 6 });
    // dotted arc from the orb to the title: the idea becomes the name
    const A = [735 + h[0] + 36, GY + h[1] - 46], B = [880, 560], Cc = [820, 470], pts = [];
    for (let i = 0; i <= 40; i++) pts.push(quad(A, Cc, B, i / 40)); dotted(ctx, pts, 1, { step: 2, r: 5, alpha: 0.85 });
    const vg = ctx.createRadialGradient(BW / 2, BH * 0.5, BH * 0.3, BW / 2, BH * 0.5, BH); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, BW, BH);
    ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, BW, BH);
    return cv.toDataURL('image/jpeg', 0.93);
  });
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64'));
  await b.close();
})();
