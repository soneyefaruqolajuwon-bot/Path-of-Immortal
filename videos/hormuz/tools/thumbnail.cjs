// Render the YouTube thumbnail (1280x720) from the video's own engine + assets.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const HTML = 'file://' + path.resolve(__dirname, '..', 'dist', 'hormuz_preview.html') + '?render=1';
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto(HTML); await pg.waitForFunction(() => window.READY === true);
  const variant = process.argv[3] || 'miles';
  const data = await pg.evaluate((variant) => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (variant === 'closes') {
      const c = { cx: 54.9, cy: -mercY(26.45), z: 235, rot: 0, tilt: 1, sx: W / 2, sy: H * 0.52 };
      drawMap(ctx, c); vignette(ctx);
      const g = ctx.createLinearGradient(0, 0, W * 0.62, 0);
      g.addColorStop(0, 'rgba(4,12,18,0.78)'); g.addColorStop(1, 'rgba(4,12,18,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // queue of tankers stuck inside the Gulf, nose to tail toward the exit
      const route = [[51.9, 26.05], [53.2, 25.95], [54.4, 26.05], [55.4, 26.25], [56.05, 26.42]].map(p => P(c, p[0], p[1]));
      for (let i = 0; i < 7; i++) { const [x, y, dx] = pointAlong(route, 0.12 + i / 7.6), [x2, y2] = pointAlong(route, Math.min(1, 0.12 + i / 7.6 + 0.01));
        sprite(ctx, 'tanker_top', x, y + (i % 2 ? 22 : -22), 250, { rot: Math.atan2(y2 - y, x2 - x) * 180 / Math.PI }); }
      // red glow around the strait
      const [sx, sy] = P(c, 56.45, 26.6);
      ctx.save(); const rg = ctx.createRadialGradient(sx, sy, 60, sx, sy, 260); rg.addColorStop(0, 'rgba(255,40,50,0.35)'); rg.addColorStop(1, 'rgba(255,40,50,0)'); ctx.fillStyle = rg; ctx.fillRect(sx - 300, sy - 300, 600, 600);
      ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = 12; ctx.shadowColor = '#FF2D3D'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(sx, sy, 190, 0, 7); ctx.stroke(); ctx.restore();
      // chain across the strait, Iran to Musandam, with a padlock
      const [ax, ay] = P(c, 56.25, 27.12), [bx, by] = P(c, 56.36, 26.05), L = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax), n = Math.floor(L / 40);
      for (let i = 0; i <= n; i++) { const u = i / n, x = lerp(ax, bx, u), y = lerp(ay, by, u) + Math.sin(u * Math.PI) * 30;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang + (i % 2 ? Math.PI / 2 : 0)); ctx.lineWidth = 20; ctx.strokeStyle = '#141416'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 16, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 11; ctx.strokeStyle = i % 2 ? '#B7BEC6' : '#D9DEE3'; ctx.stroke(); ctx.restore(); }
      const px = lerp(ax, bx, 0.5), py = lerp(ay, by, 0.5) + 30;
      ctx.save(); ctx.translate(px + 10, py + 30); ctx.rotate(0.08); ctx.scale(0.72, 0.72);
      ctx.lineWidth = 30; ctx.strokeStyle = '#141416'; ctx.beginPath(); ctx.arc(0, -70, 62, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 18; ctx.strokeStyle = '#C9CED4'; ctx.stroke();
      ctx.fillStyle = '#E8B730'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(-100, -80, 200, 170, 28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.roundRect(-82, -64, 40, 120, 14); ctx.fill();
      ctx.fillStyle = '#141416'; ctx.beginPath(); ctx.arc(0, -5, 22, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(12, 5); ctx.lineTo(8, 50); ctx.lineTo(-8, 50); ctx.closePath(); ctx.fill(); ctx.restore();
      // the officer with the key, standing on the Iranian shore
      sprite(ctx, 'iran_officer_key', 1700, 700, 400, { ay: 0.96 });
      // headline
      styledText(ctx, 'IF THIS', 420, 150, 150, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, rot: -4, maxW: 760 });
      styledText(ctx, 'CLOSES…', 440, 320, 210, { fill: '#FF3B47', stroke: '#141416', shadow: 14, rot: -4, maxW: 820 });
      ctx.save(); ctx.translate(470, 490); ctx.rotate(-0.07); ctx.font = '800 54px Montserrat'; const tw = ctx.measureText("20% OF THE WORLD'S OIL").width + 70;
      ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-tw / 2, -52, tw, 104, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#141416'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText("20% OF THE WORLD'S OIL", 0, 4); ctx.restore();
    } else if (variant === 'danger') {
      const c = { cx: 56.2, cy: -mercY(26.72), z: 1050, rot: 0, tilt: 1, sx: W / 2, sy: H * 0.5 };
      drawMap(ctx, c); vignette(ctx);
      const g = ctx.createLinearGradient(0, 0, W * 0.72, 0);
      g.addColorStop(0, 'rgba(10,4,6,0.82)'); g.addColorStop(1, 'rgba(10,4,6,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // red danger tint + missile range arcs from the Iranian coast
      ctx.save(); ctx.fillStyle = 'rgba(200,20,30,0.10)'; ctx.fillRect(0, 0, W, H); ctx.restore();
      [[56.27, 27.18], [55.95, 26.92], [56.37, 26.86], [56.85, 27.08]].forEach(([lon, lat]) => {
        const [x, y] = P(c, lon, lat); drawRangeArc(ctx, x, y, 300, 1, 0.6); sprite(ctx, 'missile_site', x, y, 110, {});
      });
      performanceT = 9.1; drawLanes(ctx, c, 1, 200);
      [[56.42, 26.55], [56.62, 26.45], [56.15, 26.52], [56.78, 26.3]].forEach(([lon, lat]) => { const [x, y] = P(c, lon, lat); sprite(ctx, 'sea_mine', x, y, 74, {}); });
      const [ex, ey] = P(c, 56.05, 26.6); sprite(ctx, 'explosion', ex, ey - 10, 230, { rot: 10 }); puff(ctx, ex + 20, ey - 70, 150, 0.35, 7);
      sprite(ctx, 'warship_top', 1560, 700, 320, { rot: -32 });
      sprite(ctx, 'iran_war', 1610, 210, 520, { rot: -4 });
      // warning badge + headline
      ctx.save(); ctx.translate(150, 150); ctx.rotate(-0.07); ctx.scale(0.78, 0.78);
      ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 14; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(118, 95); ctx.lineTo(-118, 95); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#141416'; ctx.font = '800 150px Montserrat'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 18); ctx.restore();
      styledText(ctx, 'MOST', 560, 150, 170, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, rot: -4, maxW: 520 });
      styledText(ctx, 'DANGEROUS', 560, 340, 200, { fill: '#FF3B47', stroke: '#141416', shadow: 14, rot: -4, maxW: 1000 });
      styledText(ctx, 'WATERWAY ON EARTH', 540, 500, 92, { fill: '#FFD43B', stroke: '#141416', shadow: 9, rot: -4, maxW: 960 });
    } else {
      const c = { cx: 56.25, cy: -mercY(26.78), z: 1150, rot: 0, tilt: 1, sx: W / 2, sy: H * 0.5 };
      drawMap(ctx, c); vignette(ctx);
      const g = ctx.createLinearGradient(0, 0, W * 0.7, 0);
      g.addColorStop(0, 'rgba(4,16,26,0.8)'); g.addColorStop(1, 'rgba(4,16,26,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      performanceT = 7.3; drawLanes(ctx, c, 1, 190);
      const lane = laneScreen(c); const [tx, ty] = pointAlong(lane, 0.52); const ax = 900, ay = 300;
      ctx.save(); ctx.lineCap = 'round'; const cx1 = ax + 150, cy1 = ay + 30;
      ctx.strokeStyle = '#141416'; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx1, cy1, tx, ty - 70); ctx.stroke();
      ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = 22; ctx.stroke();
      const ang = Math.atan2(ty - 70 - cy1, tx - cx1);
      ctx.translate(tx, ty - 70); ctx.rotate(ang); ctx.fillStyle = '#FF2D3D'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(-30, -44); ctx.lineTo(-30, 44); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      sprite(ctx, 'iran_war', 1560, 250, 560, { rot: -4 }); sprite(ctx, 'oman_calm', 1610, 840, 500, { rot: 4 });
      styledText(ctx, '2 MILES', 470, 230, 300, { fill: '#FFD43B', stroke: '#141416', shadow: 14, rot: -4, maxW: 900 });
      styledText(ctx, "20% OF THE WORLD'S OIL", 460, 440, 78, { fill: '#FFFFFF', stroke: '#141416', shadow: 8, rot: -4, maxW: 860 });
      styledText(ctx, 'STRAIT OF HORMUZ', 450, 545, 54, { font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: '#3A2A08', shadow: 6, rot: -4 });
    }
    const out = document.createElement('canvas'); out.width = 1280; out.height = 720;
    const o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(cv, 0, 0, 1280, 720);
    return out.toDataURL('image/png');
  }, variant);
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64'));
  await b.close();
})();
