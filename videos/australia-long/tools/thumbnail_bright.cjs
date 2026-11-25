// Bright thumbnail variants (1280x720) for Test & Compare.  node thumbnail_bright.cjs out.jpg A|B
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'dist', 'australia_long.html') + '?render=1'); await pg.waitForFunction(() => window.READY === true);
  const data = await pg.evaluate((v) => {
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const c = { cx: 134, cy: -mercY(-27.3), z: 30, rot: 0, tilt: 1, sx: W * 0.64, sy: H * 0.5 };
    drawMap(ctx, c); outback(ctx, c, 1); fillGeo(ctx, c, 'interior', '#FF5A1F', 0.35);
    const [mx, my] = P(c, 134.2, -25.0);
    const g = ctx.createRadialGradient(mx, my, 20, mx, my, 320); g.addColorStop(0, 'rgba(255,90,20,0.55)'); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, 320, 0, 7); ctx.fill();
    cityLights(ctx, c, 10, 1.0, true); strokeGeo(ctx, c, 'aus', '#F4D03F', 6, { glow: 18 });
    styledText(ctx, 'AUSTRALIA', mx, P(c, 134, -12.5)[1] + 40, 56, { fill: '#FFFFFF', stroke: '#141416', shadow: 6 });
    if (v === 'A') {
      ctx.save(); ctx.strokeStyle = '#FF2D3D'; ctx.lineWidth = 14; ctx.shadowColor = '#FF2D3D'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(mx, my, 230, 0, 7); ctx.stroke(); ctx.restore();
      person(ctx, 'explorer_thirsty', mx + 40, my + 230, 300);
      const lg = ctx.createLinearGradient(0, 0, W * 0.48, 0); lg.addColorStop(0, 'rgba(10,20,26,0.92)'); lg.addColorStop(1, 'rgba(10,20,26,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      styledText(ctx, 'NOBODY', 370, 300, 190, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, maxW: 700, rot: -3 });
      styledText(ctx, 'LIVES HERE', 400, 500, 150, { fill: '#FFD43B', stroke: '#3A2A08', shadow: 12, maxW: 760, rot: -3 });
      ctx.save(); ctx.strokeStyle = '#FFD43B'; ctx.fillStyle = '#FFD43B'; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(760, 560); ctx.quadraticCurveTo(900, 700, mx - 250, my + 40); ctx.stroke();
      ctx.translate(mx - 250, my + 40); ctx.rotate(-0.4); ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(-24, -40); ctx.lineTo(-24, 40); ctx.closePath(); ctx.fill(); ctx.restore();
    } else {
      sprite(ctx, 'sun', mx, my - 30, 300, { rot: -6 });
      ['beach_surfer', 'beach_local', 'beach_surfer'].forEach((s, i) => { const [x, y] = P(c, ...[[151.5, -33.9], [145.3, -38.2], [153.4, -27.5]][i]); person(ctx, s, x + 30, y + 90, 170); });
      const lg = ctx.createLinearGradient(0, 0, W * 0.48, 0); lg.addColorStop(0, 'rgba(10,20,26,0.92)'); lg.addColorStop(1, 'rgba(10,20,26,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      styledText(ctx, 'EMPTY', 360, 290, 220, { fill: '#FF5A3D', stroke: '#141416', shadow: 12, maxW: 700, rot: -3 });
      styledText(ctx, 'MIDDLE?', 380, 490, 170, { fill: '#FFFFFF', stroke: '#141416', shadow: 12, maxW: 720, rot: -3 });
      ctx.save(); ctx.translate(380, 670); ctx.rotate(-0.05); ctx.font = '800 56px Montserrat'; const tw = ctx.measureText("IT'S NOT THE HEAT").width + 70;
      ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = '#141416'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-tw / 2, -52, tw, 104, 22); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#141416'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText("IT'S NOT THE HEAT", 0, 4); ctx.restore();
    }
    const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const gg = o.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(cv, 0, 0, 1280, 720); return o.toDataURL('image/jpeg', 0.92);
  }, process.argv[3] || 'A');
  fs.writeFileSync(process.argv[2], Buffer.from(data.split(',')[1], 'base64')); await b.close();
})();
