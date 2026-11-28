// Two A/B thumbnails (1280x720) for "Why Do 6 Tiny Waterways Control the World?".  node thumbnail_ab.cjs outA.jpg outB.jpg
// A: "6 TINY GAPS": world map with the six chokepoints glowing, numbered #6..#1 (no names: the answer stays hidden).
// B: "CONTROL THE WORLD?": a close-up strait jammed with ships, a red CLOSED barrier, and a long queue behind it.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'chokepoints_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const shot = v => pg.evaluate(v => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const glow = (x, y, r) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,212,59,0.95)'); g.addColorStop(0.35, 'rgba(255,212,59,0.45)'); g.addColorStop(1, 'rgba(255,212,59,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
    const badge = (x, y, n, s) => { ctx.save(); ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = '#141416'; ctx.lineWidth = s * 0.09; ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(x, y, s / 2, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke(); ctx.restore(); styledText(ctx, '#' + n, x, y + s * 0.02, s * 0.5, { fill: '#141416', stroke: '#FFD43B', shadow: 0 }); };
    if (v === 'A') {
      const c = { cx: 11, cy: -mercY(16), z: 8.6, rot: 0, tilt: 1, sx: W * 0.5, sy: H * 0.56 };
      drawMap(ctx, c);
      ctx.save(); ctx.fillStyle = 'rgba(8,20,28,0.30)'; ctx.fillRect(0, 0, W, H); ctx.restore();   // darken so the gaps pop
      const off = { 6: [-100, -55], 5: [0, -110], 4: [-40, 115], 3: [-120, -50], 2: [10, 115], 1: [110, -60] };
      for (const [n, , lo, la] of CP) { const [x, y] = P(c, lo, la); glow(x, y, 120); ctx.save(); ctx.strokeStyle = '#FFD43B'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill(); ctx.restore(); }
      for (const [n, , lo, la] of CP) { const [x, y] = P(c, lo, la); badge(x + off[n][0], y + off[n][1], n, 96); }
      styledText(ctx, '6 TINY GAPS', 960, 140, 190, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 14, rot: -2, maxW: 1700 });
      styledText(ctx, 'CONTROL THE WORLD?', 960, 980, 110, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, rot: -1, maxW: 1700 });
    } else {
      // Hormuz close-up: a queue of ships and a CLOSED barrier across the gap
      const c = { cx: 56.6, cy: -mercY(26.2), z: 150, rot: 0, tilt: 1, sx: W * 0.5, sy: H * 0.55 };
      drawMap(ctx, c);
      ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#FFF6D0'; ctx.fillRect(0, 0, W, H); ctx.restore();
      const lane = [[51.5, 26.9], [53.5, 26.4], [55.2, 26.25], [55.8, 26.4], [56.05, 26.45]];
      const pts = lane.map(p => P(c, ...p));
      for (let i = 0; i < 9; i++) { const u = i / 8, k = Math.min(3, Math.floor(u * 4)), f = u * 4 - k; const a = pts[k], bb = pts[k + 1];
        const x = a[0] + (bb[0] - a[0]) * f, y = a[1] + (bb[1] - a[1]) * f + (i % 2 ? 26 : -26), ang = Math.atan2(bb[1] - a[1], bb[0] - a[0]);
        if (i % 3 === 1) tanker(ctx, x, y, 170, ang); else topShip(ctx, x, y, 170, ang, { seed: i }); }
      // red/white barrier across the strait
      const [g1x, g1y] = P(c, 56.25, 27.05), [g2x, g2y] = P(c, 56.45, 26.05);
      ctx.save(); ctx.translate(g1x, g1y); ctx.rotate(Math.atan2(g2y - g1y, g2x - g1x)); const L = Math.hypot(g2x - g1x, g2y - g1y);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 6; ctx.fillRect(0, -18, L, 36); ctx.strokeRect(0, -18, L, 36);
      ctx.fillStyle = '#E63946'; for (let x = 0; x < L; x += 70) ctx.fillRect(x, -18, 35, 36); ctx.restore();
      person(ctx, 'iran_gate', 1660, 1060, 420, { flip: true });
      // CLOSED stamp
      ctx.save(); ctx.translate(1180, 300); ctx.rotate(-0.12); ctx.strokeStyle = '#E63946'; ctx.lineWidth = 12; ctx.strokeRect(-230, -75, 460, 150); ctx.restore();
      styledText(ctx, 'CLOSED', 1180, 300, 120, { fill: '#E63946', stroke: '#FFFFFF', shadow: 6, rot: -7 });
      styledText(ctx, 'CONTROL THE WORLD?', 960, 130, 130, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 14, rot: -2, maxW: 1750 });
      badge(250, 910, 1, 170);
    }
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  }, v);
  for (const [v, out] of [['A', process.argv[2]], ['B', process.argv[3]]]) fs.writeFileSync(out, Buffer.from((await shot(v)).split(',')[1], 'base64'));
  await b.close();
})();
