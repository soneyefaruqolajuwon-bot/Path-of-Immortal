/* "Seven Days Left" — a fast, story-first Slumx short (the work is shown, not sold).
 * Native 9:16 (1080×1920), twilight rim-lit stickman style. renderAt(t) draws storyboard time t.
 */
'use strict';
const W = 1080, H = 1920, DURATION = 27.8, GROUND = 1440;
const VERT = false, OVER = { badges: [] };
const C = {
  ink: '#0B0D12', rim: '#F5B041', rim2: '#E59866', coral: '#D9534F', orange: '#D98850', violet: '#4A3B5C', navy: '#181C2E',
  gold: '#F4D03F', white: '#FFFFFF', window: '#F7C46C', teal: '#1E4D5C', olive: '#8A855C', yellow: '#FFD43B',
};

// ------------------------------------------------------------------ math / easing
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = t => Math.pow(clamp(t), 3);
const back = (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
const pop = (dt, d = 0.32) => dt <= 0 ? 0 : back(dt / d);
const popOut = (left, d = 0.22) => left >= d ? 1 : easeOut(Math.max(0, left) / d);
const win = (t, t0, t1, fin = .32, fout = .22) => (t < t0 || t > t1) ? 0 : pop(t - t0, fin) * popOut(t1 - t, fout);
const fade = (t, t0, t1, d = 0.3) => clamp((t - t0) / d) * clamp((t1 - t) / d);
function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const quad = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]];

// ------------------------------------------------------------------ assets
const IMG = {}; let SKYLINE, CROWD, GRAIN;
function loadAssets() {
  const jobs = Object.entries(window.ASSETS).map(([k, src]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => { console.warn('asset', k); res(); }; im.src = src;
  }));
  const fonts = ['800 64px "Montserrat"'].map(f => document.fonts.load(f));
  return Promise.all([...jobs, ...fonts]).then(() => document.fonts.ready).then(() => { SKYLINE = makeSkyline(); CROWD = makeCrowd(); GRAIN = makeGrain(); });
}
function offscreen(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function makeSkyline() {          // far city: violet silhouettes with dim warm windows
  const cv = offscreen(2600, 520), g = cv.getContext('2d'), r = rnd(11);
  let x = 0;
  while (x < 2600) {
    const w = 70 + r() * 120, h = 140 + r() * 330;
    g.fillStyle = '#2E2740'; g.fillRect(x, 520 - h, w, h);
    if (r() < 0.3) { g.fillRect(x + w / 2 - 3, 520 - h - 40, 6, 40); }
    for (let wy = 520 - h + 18; wy < 500; wy += 26) for (let wx = x + 10; wx < x + w - 14; wx += 22)
      if (r() < 0.22) { g.fillStyle = r() < 0.5 ? 'rgba(247,196,108,0.55)' : 'rgba(247,196,108,0.25)'; g.fillRect(wx, wy, 9, 13); }
    x += w + 6 + r() * 20;
  }
  return cv;
}
function makeCrowd() {            // stadium crowd rows: heads + shoulders with a warm rim on the upper right
  const cv = offscreen(2000, 260), g = cv.getContext('2d'), r = rnd(5);
  for (let row = 0; row < 4; row++) {
    const y = 60 + row * 52, s = 0.8 + row * 0.15;
    for (let x = -20; x < 2020; x += 34 * s + r() * 10) {
      const hy = y - r() * 8;
      g.fillStyle = C.rim; g.beginPath(); g.arc(x + 2.5, hy - 2, 13 * s, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x + 2.5, hy + 30 * s - 2, 24 * s, 20 * s, 0, Math.PI, 0); g.fill();
      g.fillStyle = row % 2 ? '#0F1118' : C.ink; g.beginPath(); g.arc(x, hy, 13 * s, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x, hy + 30 * s, 24 * s, 20 * s, 0, Math.PI, 0); g.fill(); g.fillRect(x - 24 * s, hy + 30 * s, 48 * s, 60);
    }
  }
  return cv;
}
function makeGrain() {
  const n = 256, cv = offscreen(n, n), g = cv.getContext('2d'), r = rnd(3), d = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = r() * 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 10; }
  g.putImageData(d, 0, 0); return cv;
}

// ------------------------------------------------------------------ drawing helpers
function sprite(ctx, name, x, y, w, o = {}) {
  const im = IMG[name]; if (!im) return;
  const k = o.k === undefined ? 1 : o.k; if (k <= 0.001) return;
  const h = w * im.height / im.width;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot * Math.PI / 180);
  ctx.scale(k * (o.flip ? -1 : 1), k);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.filter) ctx.filter = o.filter;
  ctx.drawImage(im, -w * (o.ax ?? 0.5), -h * (o.ay ?? 0.5), w, h); ctx.restore();
}
// characters: 240×440 sprites, feet at y≈409 → ay 0.93
const CH_W = 290;
function actor(ctx, who, pose, x, y, o = {}) { sprite(ctx, `${who}_${pose}`, x, y, o.w || CH_W, { ay: 0.93, ...o }); }
function handOf(pose, w = CH_W) {   // front-hand offset from the feet anchor (matches make_assets.py geometry)
  const H = { catch: [165, 58], cheer: [165, 66], point: [227, 166], stand: [131, 260] }[pose] || [165, 58];
  return [(H[0] - 120) * w / 240, (H[1] - 409) * w / 240];
}
function setFont(ctx, size) { ctx.font = `800 ${size}px "Montserrat", "Inter", sans-serif`; }
function text(ctx, s, x, y, size, o = {}) {
  const k = o.k === undefined ? 1 : o.k; if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (o.rot) ctx.rotate(o.rot * Math.PI / 180);
  setFont(ctx, size); ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (o.spacing) ctx.letterSpacing = o.spacing + 'px';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(s, 0, size * 0.06); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || size * 0.1; ctx.strokeText(s, 0, 0); }
  if (o.grad) { const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, o.grad[0]); g.addColorStop(1, o.grad[1]); ctx.fillStyle = g; }
  else ctx.fillStyle = o.fill || C.white;
  ctx.fillText(s, 0, 0); ctx.restore();
}
function badge(ctx, label, x, y, k, native) {
  if (k <= 0.001) return;
  if (VERT && !native) { OVER.badges.push([label, k]); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 34); ctx.letterSpacing = '3px';
  const w = ctx.measureText(label).width + 110, h = 78;
  ctx.fillStyle = 'rgba(11,13,18,0.86)'; ctx.strokeStyle = C.rim; ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(245,176,65,0.45)'; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.arc(-w / 2 + 42, 0, 10, 0, 7); ctx.fill();
  ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 22, 2); ctx.restore();
}
function ripple(ctx, x, y, t, t0, o = {}) {        // thin expanding white/gold target rings
  const n = o.n || 3, R = o.r || 280, d = o.d || 0.9;
  for (let i = 0; i < n; i++) {
    const u = (t - t0 - i * 0.12) / d; if (u <= 0 || u >= 1) continue;
    ctx.save(); ctx.globalAlpha = (1 - u) * 0.9; ctx.strokeStyle = i % 2 ? C.rim : C.white; ctx.lineWidth = (o.w || 4) * (1 - u * 0.6);
    ctx.beginPath(); ctx.ellipse(x, y, R * easeOut(u), R * easeOut(u) * (o.squash || 1), 0, 0, 7); ctx.stroke(); ctx.restore();
  }
}
function dotted(ctx, pts, k, o = {}) {              // clean white dotted trajectory
  if (k <= 0) return;
  const n = Math.floor((pts.length - 1) * clamp(k));
  ctx.save(); ctx.fillStyle = o.color || C.white;
  for (let i = 0; i <= n; i += (o.step || 2)) { ctx.globalAlpha = (o.alpha ?? 0.9) * (o.tailFade ? 0.25 + 0.75 * i / Math.max(1, n) : 1); ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], o.r || 4, 0, 7); ctx.fill(); }
  ctx.restore();
}
function callout(ctx, x0, y0, x1, y1, label, k, o = {}) {   // leader line + crisp label
  if (k <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= clamp(k); ctx.strokeStyle = C.white; ctx.lineWidth = 2.5;
  const e = easeOut(k);
  ctx.beginPath(); ctx.arc(x0, y0, 7, 0, 7); ctx.fillStyle = C.white; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, e), lerp(y0, y1, e)); ctx.stroke();
  if (e > 0.6) { const dir = x1 >= x0 ? 1 : -1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + dir * 26, y1); ctx.stroke();
    setFont(ctx, o.size || 34); ctx.textAlign = dir > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle';
    ctx.globalAlpha *= clamp((e - 0.6) / 0.4); ctx.fillStyle = o.color || C.white; ctx.fillText(label, x1 + dir * 38, y1); }
  ctx.restore();
}
function orb(ctx, x, y, r, label, k = 1) {
  if (k <= 0) return;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.2); g.addColorStop(0, 'rgba(255,230,150,0.9)'); g.addColorStop(0.35, 'rgba(245,176,65,0.35)'); g.addColorStop(1, 'rgba(245,176,65,0)');
  ctx.globalAlpha = k; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.fill();
  const b = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); b.addColorStop(0, '#FFF6D6'); b.addColorStop(0.5, '#F7C948'); b.addColorStop(1, '#E08E2B');
  ctx.fillStyle = b; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  if (label) { setFont(ctx, Math.max(12, r * 0.36)); ctx.fillStyle = '#5A3608'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '1px';
    const parts = label.split(' '); parts.forEach((p, i) => ctx.fillText(p, x, y + (i - (parts.length - 1) / 2) * r * 0.42)); }
  ctx.restore();
}
function rays(ctx, x, y, t, a = 1, n = 9, len = 1500) {     // soft volumetric light shafts from the sun
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = Math.PI + (i + 0.5) / n * Math.PI + Math.sin(t * 0.3 + i) * 0.03, w = 0.05 + (i % 3) * 0.025;
    const g = ctx.createRadialGradient(x, y, 40, x, y, len); g.addColorStop(0, `rgba(255,214,140,${0.11 * a})`); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, len, ang - w, ang + w); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function sky(ctx, sunX = 1300, sunY = 760, dark = 0) {
  if (IMG.bg_sky) ctx.drawImage(IMG.bg_sky, 0, 0, W, H);
  sprite(ctx, 'sun', sunX, sunY, 920);
  if (dark > 0) { ctx.fillStyle = `rgba(10,12,24,${dark})`; ctx.fillRect(0, 0, W, H); }
}
function ground(ctx, y = GROUND, col = '#12141C') {
  ctx.fillStyle = col; ctx.fillRect(0, y, W, H - y);
  const g = ctx.createLinearGradient(0, y, 0, y + 60); g.addColorStop(0, 'rgba(245,176,65,0.35)'); g.addColorStop(1, 'rgba(245,176,65,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y, W, 60);
  ctx.fillStyle = C.rim; ctx.fillRect(0, y - 2, W, 3);
}
function ghostTrail(ctx, draws, n, gap, alpha = 0.35) {   // afterimages: draws(back) for back = n..1
  for (let i = n; i >= 1; i--) { ctx.save(); ctx.globalAlpha = alpha * (1 - i / (n + 1)); draws(i * gap); ctx.restore(); }
}
function speedLines(ctx, x, y, k, seed = 1) {          // manga-style radial action lines
  if (k <= 0) return; const r = rnd(seed);
  ctx.save(); ctx.globalAlpha = k * 0.7; ctx.strokeStyle = C.white;
  for (let i = 0; i < 46; i++) { const a = r() * 6.283, r0 = 220 + r() * 160, r1 = r0 + 260 + r() * 500; ctx.lineWidth = 1 + r() * 3;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
  ctx.restore();
}
function blurLayer(ctx, px, fn) { ctx.save(); ctx.filter = `blur(${px}px)`; fn(); ctx.restore(); }


function phoneUI(ctx, x, y, w, h, t, t0) {
  ctx.save(); ctx.translate(x - w / 2, y - h / 2);
  // body + rim
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.roundRect(6, -5, w, h, 46); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 46); ctx.fill();
  ctx.fillStyle = '#F6F2EC'; ctx.beginPath(); ctx.roundRect(14, 14, w - 28, h - 28, 34); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(14, 14, w - 28, h - 28, 34); ctx.clip();
  const iw = w - 28, k = i => clamp((t - t0 - i * 0.18) / 0.4);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(iw / 2 - 30, 24, 88, 22, 11); ctx.fill();
  setFont(ctx, 30); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText('your brand', 40, 98);
  // hero card
  ctx.globalAlpha = k(0); const hg = ctx.createLinearGradient(30, 120, 30 + iw, 300); hg.addColorStop(0, C.orange); hg.addColorStop(1, C.violet);
  ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(34, 122 + 20 * (1 - k(0)), iw - 40, 190, 22); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(90, 220 + 20 * (1 - k(0)), 34, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(140, 196 + 20 * (1 - k(0)), 120, 14); ctx.fillRect(140, 222 + 20 * (1 - k(0)), 80, 14);
  // list rows
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = k(i + 1); const ry = 336 + i * 64 + 16 * (1 - k(i + 1));
    ctx.fillStyle = '#E7E1D8'; ctx.beginPath(); ctx.roundRect(34, ry, iw - 40, 52, 14); ctx.fill();
    ctx.fillStyle = [C.coral, C.rim, C.teal][i]; ctx.beginPath(); ctx.roundRect(44, ry + 8, 36, 36, 9); ctx.fill();
    ctx.fillStyle = '#B9B1A6'; ctx.fillRect(94, ry + 14, 110 - i * 14, 10); ctx.fillRect(94, ry + 30, 70, 8); }
  // buy button (pressed at 10.8)
  ctx.globalAlpha = k(4); const press = 1 - 0.08 * Math.max(0, 1 - Math.abs(t - 10.85) * 8);
  ctx.save(); ctx.translate(iw / 2 + 14, h - 90); ctx.scale(press, press);
  ctx.fillStyle = C.coral; ctx.beginPath(); ctx.roundRect(-iw / 2 + 30, -32, iw - 60, 64, 32); ctx.fill();
  setFont(ctx, 28); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BUY NOW', 0, 2); ctx.restore();
  ctx.restore(); ctx.restore();
}
function productBox(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.2) * 0.04); ctx.scale(s, s);
  const f = [[-90, -60], [60, -60], [60, 110], [-90, 110]], top = [[-90, -60], [-40, -110], [110, -110], [60, -60]], side = [[60, -60], [110, -110], [110, 60], [60, 110]];
  const P = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.fill(); };
  P(side, C.rim); P(f, C.coral); P(top, '#E8706B');
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-15, 25, 34, 0, 7); ctx.fill(); ctx.fillStyle = C.coral; star(ctx, -15, 25, 20); ctx.fill();
  ctx.restore();
}
function star(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); }
const LAND = [[[-0.5, 0.2], [-0.1, 0.05], [0.25, 0.18], [0.3, 0.42], [0.05, 0.5], [-0.3, 0.45], [-0.5, 0.35]], [[0.15, 0.62], [0.45, 0.58], [0.5, 0.75], [0.2, 0.8]], [[-0.45, 0.68], [-0.25, 0.66], [-0.2, 0.78], [-0.42, 0.8]]];

// ================================================================== scenes (storyboard time 0–27.8 s) — a cut every 1–2 s
function world(ctx, t, dark = 0) { sky(ctx, 540, 1250, dark); rays(ctx, 540, 1250, t, 1 - dark, 11, 1700); ctx.drawImage(SKYLINE, -700 - t * 8, GROUND - 510); ground(ctx, GROUND); }
function shop(ctx, t, dark = 0, x = W / 2) { world(ctx, t, dark); sprite(ctx, 'bg_barber', x, GROUND + 4, 840, { ax: 0.5, ay: 1 }); }
function interior(ctx, t) {
  ctx.fillStyle = '#1E2230'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 500, 20, W / 2, 500, 900); g.addColorStop(0, 'rgba(255,214,140,0.35)'); g.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#B9C6D3'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(110, 360, W - 220, 420, 16); ctx.fill(); ctx.stroke();   // mirror
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(180, 380); ctx.lineTo(330, 380); ctx.lineTo(200, 760); ctx.lineTo(140, 760); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3A2E26'; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = '#4A3B30'; for (let i = 0; i < 12; i++) ctx.fillRect(i * 100 + (i % 2) * 50, GROUND, 4, H - GROUND);
}
function chair(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.fillStyle = '#9AA3AE'; ctx.fillRect(-10, -120, 20, 120); ctx.strokeRect(-10, -120, 20, 120); ctx.beginPath(); ctx.ellipse(0, 0, 70, 14, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#B03A2E'; ctx.beginPath(); ctx.roundRect(-80, -190, 160, 70, 18); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-60, -330, 120, 150, 20); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function cat(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#E08A2C'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(0, 0, 60, 70, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -90, 48, 0, 7); ctx.fill(); ctx.stroke();
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 40, -116); ctx.lineTo(sd * 30, -156); ctx.lineTo(sd * 10, -130); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = C.ink; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 18, -96, 5, 8, 0, 0, 7); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; for (const sd of [-1, 1]) for (const dy of [-6, 4]) { ctx.beginPath(); ctx.moveTo(sd * 22, -78 + dy * 0.3); ctx.lineTo(sd * 64, -82 + dy); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(60, 20); ctx.quadraticCurveTo(120 + Math.sin(t * 4) * 20, -20, 100, -70); ctx.lineWidth = 12; ctx.strokeStyle = '#E08A2C'; ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(-58, -40); ctx.lineTo(58, -40); ctx.lineTo(90, 60); ctx.lineTo(-90, 60); ctx.closePath(); ctx.globalAlpha = 0.9; ctx.fill(); ctx.restore();   // barber cape
}
function lion(ctx, x, y, s, t, faded = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 7;
  ctx.fillStyle = '#B5651D'; ctx.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, r = i % 2 ? 150 : 175; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 1.05); } ctx.closePath(); ctx.fill(); ctx.stroke();
  if (faded > 0) { ctx.save(); ctx.globalAlpha = faded; ctx.fillStyle = '#D9A066'; ctx.beginPath(); ctx.ellipse(0, -60, 120, 70, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#8A5A2B'; ctx.lineWidth = 4;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 30, -120); ctx.lineTo(i * 30, -70); ctx.stroke(); } ctx.restore(); }
  ctx.fillStyle = '#E9B45E'; ctx.beginPath(); ctx.arc(0, 0, 105, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 36, -14, 9, 12, 0, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-16, 22); ctx.lineTo(16, 22); ctx.lineTo(0, 40); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(0, 54); ctx.moveTo(0, 54); ctx.quadraticCurveTo(-20, 70, -36, 56); ctx.moveTo(0, 54); ctx.quadraticCurveTo(20, 70, 36, 56); ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(60, -20); ctx.lineTo(70, -40); ctx.lineTo(80, -20); ctx.closePath(); ctx.fill();   // sparkle
  ctx.restore();
}
function dayTag(ctx, n, t, t0, t1) { const k = win(t, t0, t1, 0.18, 0.12); if (k <= 0) return; ctx.save(); ctx.translate(W / 2, 260); ctx.scale(k, k); ctx.rotate(-0.04);
  setFont(ctx, 64); const w = ctx.measureText(`DAY ${n}`).width + 80; ctx.fillStyle = n === 7 ? '#2ECC71' : '#E63946'; ctx.beginPath(); ctx.roundRect(-w / 2, -50, w, 100, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`DAY ${n}`, 0, 4); ctx.restore(); }
function stampSlam(ctx, s, x, y, t, t0, o = {}) {
  const e = t - t0; if (e < 0) return; const sl = e < 0.16 ? lerp(2.4, 1, easeIn(e / 0.16)) : 1 + 0.05 * Math.max(0, 1 - (e - 0.16) * 6);
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot ?? -10) * Math.PI / 180); ctx.scale(sl, sl); setFont(ctx, o.size || 60);
  const lines = s.split('\n'), w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 60, h = (o.size || 60) * 1.25 * lines.length + 30;
  if (o.paper) { ctx.fillStyle = '#F4ECD6'; ctx.fillRect(-w / 2 - 30, -h / 2 - 60, w + 60, h + 160); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(-w / 2 - 30, -h / 2 - 60, w + 60, h + 160);
    ctx.fillStyle = '#B9AE96'; for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2, h / 2 + 4 + i * 18, w * (i === 3 ? 0.6 : 1), 6); }
  ctx.strokeStyle = o.color || '#D7263D'; ctx.lineWidth = 9; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
  ctx.fillStyle = o.color || '#D7263D'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * (o.size || 60) * 1.15 + 3));
  ctx.restore();
}
function shake(ctx, t, t0, amp = 14) { const e = t - t0; if (e > 0 && e < 0.3) ctx.translate(Math.sin(e * 90) * amp * (1 - e / 0.3), Math.cos(e * 70) * amp * (1 - e / 0.3)); }
function bigText(ctx, s, y, size, k, o = {}) { text(ctx, s, W / 2, y, size, { k, fill: o.fill || '#fff', stroke: o.stroke || C.ink, strokeW: o.sw || 8, rot: o.rot || 0, grad: o.grad }); }

// ---- B1 (0–2.4): the eviction notice, 7 DAYS
function sceneHook(ctx, t) {
  if (t > 2.5) return;
  ctx.save(); shake(ctx, t, 0.15, 18);
  shop(ctx, t, 0.2);
  actor(ctx, 'tunde', t > 0.4 ? 'shock' : 'stand', 280, GROUND);
  stampSlam(ctx, 'EVICTION\nNOTICE', 720, 1060, t, 0.12, { size: 52, paper: true, rot: -6 });
  ctx.restore();
  bigText(ctx, '7 DAYS LEFT', 420, 120, t < 1.0 ? 1 : 1 + 0.12 * Math.max(0, 1 - (t - 1.0) * 5), { fill: '#FF3B3B', rot: -3 });
  if (t > 0.12 && t < 0.4) { ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - (t - 0.12) / 0.28)})`; ctx.fillRect(0, 0, W, H); }
}
// ---- B2 (2.4–9): day 1, 2, 3
function sceneDays(ctx, t) {
  if (t < 2.4 || t > 9.1) return;
  if (t < 4.0) {                                     // day 1: empty chairs + a fly
    interior(ctx, t); chair(ctx, 300, GROUND, 1); chair(ctx, 780, GROUND, 1);
    actor(ctx, 'tunde', 'slump', 540, GROUND, { w: 270 });
    const fx = 540 + Math.sin(t * 7) * 220, fy = 700 + Math.sin(t * 11) * 120; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(fx, fy, 9, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(fx - 6, fy - 10, 8, 5, -0.5, 0, 7); ctx.ellipse(fx + 6, fy - 10, 8, 5, 0.5, 0, 7); ctx.fill();
    dayTag(ctx, 1, t, 2.45, 3.95); bigText(ctx, '0 CUSTOMERS', 430, 100, pop(t - 3.1, 0.25), { fill: '#FF6B6B' });
  } else if (t < 6.0) {                              // day 2: flyers, gone with the wind
    shop(ctx, t, 0.1);
    actor(ctx, 'tunde', 'point', 260, GROUND);
    const wind = clamp((t - 5.1) / 0.8);
    for (let i = 0; i < 10; i++) { const r = rnd(40 + i), u = clamp(wind * 1.3 - r() * 0.3), x = lerp(400 + r() * 100, W + 200, easeIn(u)), y = lerp(950 + r() * 80, 300 + r() * 500, u) + Math.sin(t * 9 + i) * 20 * u;
      ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 2 + u * 9); ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(-26, -34, 52, 68); ctx.strokeRect(-26, -34, 52, 68); ctx.fillStyle = '#2E5BBA'; ctx.fillRect(-18, -24, 36, 10); ctx.restore(); }
    if (wind > 0) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { const y = 600 + i * 90, x0 = -200 + wind * 1400 - i * 60; ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(x0 + 120, y - 40, x0 + 260, y); ctx.stroke(); } ctx.restore(); }
    dayTag(ctx, 2, t, 4.0, 5.95); bigText(ctx, 'FLYERS?', 430, 100, win(t, 4.5, 5.2, 0.2, 0.15), { fill: '#FFD43B' }); bigText(ctx, 'GONE.', 430, 120, pop(t - 5.2, 0.2), { fill: '#FFD43B', rot: 4 });
  } else {                                           // day 3: half price, only client: a cat
    interior(ctx, t); chair(ctx, 560, GROUND, 1.05);
    if (t > 7.5) cat(ctx, 560, GROUND - 230, 1.0, t);
    actor(ctx, 'tunde', 'hold', 280, GROUND);
    ctx.save(); ctx.translate(820, 700); ctx.rotate(0.08); ctx.scale(pop(t - 6.55, 0.25), pop(t - 6.55, 0.25)); ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-150, -80, 300, 160, 14); ctx.fill(); ctx.stroke();
    setFont(ctx, 70); ctx.fillStyle = '#B03A2E'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('50% OFF', 0, 4); ctx.restore();
    dayTag(ctx, 3, t, 6.0, 8.95); bigText(ctx, 'ONLY CLIENT: A CAT.', 430, 72, pop(t - 8.1, 0.25), { fill: '#FFD43B', rot: -4 });
  }
}
// ---- B3 (9–14.1): day 4, the sister draws the legends
function panel(ctx, x, y, w, h, k, draw, title) {
  if (k <= 0.001) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(-0.03);
  ctx.fillStyle = '#FFF8E7'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); draw(); ctx.restore();
  if (title) { setFont(ctx, 34); ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.textAlign = 'center'; ctx.strokeText(title, 0, h / 2 - 34); ctx.fillText(title, 0, h / 2 - 34); }
  ctx.restore();
}
function sceneDraw(ctx, t) {
  if (t < 8.9 || t > 14.3) return;
  interior(ctx, t);
  ctx.fillStyle = '#5A3A22'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(60, 1260, W - 120, 60, 10); ctx.fill(); ctx.stroke();
  actor(ctx, 'sister', t > 12.8 ? 'cheer' : 'point', 200, 1270, { w: 220, k: pop(t - 9.7, 0.3) });
  panel(ctx, 600, 620, 420, 380, pop(t - 10.5, 0.3), () => { actor(ctx, 'tunde', 'cheer', 0, 160, { w: 220 }); }, 'THE LEGEND');
  panel(ctx, 640, 1080, 520, 420, pop(t - 12.7, 0.3), () => { lion(ctx, 0, -20, 0.95, t, clamp((t - 13.1) / 0.4)); }, 'THE LION FADE');
  dayTag(ctx, 4, t, 9.0, 14.1); text(ctx, 'HIS WILDEST STORIES', W / 2, 380, 50, { k: win(t, 10.6, 12.6), fill: '#fff' });
}
// ---- B4 (14.1–16.9): someone animates it → blows up overnight
function sceneBlow(ctx, t) {
  if (t < 14.1 || t > 17.0) return;
  ctx.fillStyle = '#12141C'; ctx.fillRect(0, 0, W, H);
  const k = easeOut((t - 14.15) / 0.6), cx = W / 2, cy = 820;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(lerp(0.6, 1.25, k), lerp(0.6, 1.25, k));
  const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 600); g.addColorStop(0, 'rgba(255,212,59,0.35)'); g.addColorStop(1, 'rgba(255,212,59,0)'); ctx.fillStyle = g; ctx.fillRect(-600, -600, 1200, 1200);
  ctx.rotate(Math.sin(t * 3) * 0.05); lion(ctx, 0, 0, 1.2 + 0.05 * Math.sin(t * 8), t, 1); ctx.restore();
  for (let i = 0; i < 12; i++) { const r = rnd(70 + i), u = ((t - 14.2) * 0.9 + r()) % 1; ctx.save(); ctx.globalAlpha = Math.sin(u * Math.PI); ctx.fillStyle = C.gold; star(ctx, cx + (r() - 0.5) * 800, cy + (r() - 0.5) * 800, 10 + r() * 10); ctx.fill(); ctx.restore(); }
  ripple(ctx, cx, cy, t, 14.2, { r: 600, n: 3 });
  const v = Math.floor(2400000 * easeIn(clamp((t - 15.3) / 1.2)));
  if (t > 15.2) { bigText(ctx, '👁 ' + (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.floor(v / 1e3) + 'K' : v), 330, 110, pop(t - 15.25, 0.2), { fill: '#fff' });
    for (let i = 0; i < 8; i++) { const u = ((t - 15.3) * 1.2 + i / 8) % 1; text(ctx, '♥', 120 + i * 120, 1500 - u * 500, 60, { fill: '#FF6B6B', alpha: 1 - u, shadow: false }); } }
  text(ctx, 'ANIMATED', W / 2, 1300, 80, { k: win(t, 14.4, 15.4, 0.2, 0.15), fill: C.gold, stroke: '#3A2A08', strokeW: 6 });
  bigText(ctx, 'OVERNIGHT', 1300, 110, pop(t - 15.8, 0.2), { fill: '#FFD43B', rot: -4 });
}
// ---- B5 (16.9–22.8): day 7 — a line around the block… and the landlord
function sceneLine(ctx, t) {
  if (t < 16.8 || t > 22.9) return;
  const pan = easeIO((t - 18.6) / 1.4);
  world(ctx, t, 0);
  ctx.save(); ctx.translate(lerp(-900, 0, pan), 0);
  sprite(ctx, 'bg_barber', W / 2, GROUND + 4, 840, { ax: 0.5, ay: 1 });
  const crowd = ['capper', 'scientist', 'coach', 'host', 'capper', 'scientist', 'coach', 'host', 'capper', 'scientist', 'coach', 'host', 'capper', 'scientist'];
  crowd.forEach((who, i) => { const x = 1890 - i * 95 + 0, bob = Math.abs(Math.sin(t * 6 + i)) * 6; actor(ctx, who, i % 3 ? 'stand' : 'cheer', x, GROUND - bob, { w: 170 }); });
  ctx.restore();
  // the front of the line (after the pan): the landlord, first in line
  if (t > 19.0) { const kx = clamp((t - 19.6) / 0.3);
    actor(ctx, 'tunde', t > 20.3 ? 'shock' : 'stand', 220, GROUND, { k: 1 });
    actor(ctx, 'landlord', t > 20.6 ? 'point' : 'hold', 560, GROUND, { w: 300, k: pop(t - 19.2, 0.3) });
    if (t > 20.25) { bigText(ctx, 'THE LANDLORD', 380, 104, pop(t - 20.25, 0.22), { fill: '#FF3B3B', rot: -4 }); shake(ctx, t, 20.25, 10); }
    if (t > 20.7) { const kb = pop(t - 20.7, 0.3); ctx.save(); ctx.translate(700, 640); ctx.scale(kb * 0.9, kb * 0.9); ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-225, -60, 450, 120, 50); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-60, 56); ctx.lineTo(-110, 120); ctx.lineTo(-10, 58); ctx.fill(); setFont(ctx, 44); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A FADE, PLEASE', 0, 4); ctx.restore(); }
  }
  dayTag(ctx, 7, t, 16.95, 19.0);
  text(ctx, 'A LINE AROUND THE BLOCK', W / 2, 420, 62, { k: win(t, 17.9, 19.4), fill: '#FFD43B', stroke: '#3A2A08', strokeW: 5 });
}
// ---- B6 (22.8–27.8): every shop has a story
function sceneEnd(ctx, t) {
  if (t < 22.7) return;
  ctx.fillStyle = '#07090F'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 900, 40, W / 2, 900, 900); g.addColorStop(0, 'rgba(245,176,65,0.35)'); g.addColorStop(1, 'rgba(245,176,65,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  sprite(ctx, 'bg_barber', W / 2, 1380, 520, { ax: 0.5, ay: 1, k: pop(t - 22.8, 0.35) });
  actor(ctx, 'tunde', 'cheer', W / 2 - 300, 1380, { w: 200, k: pop(t - 23.0, 0.3) });
  bigText(ctx, 'EVERY SHOP', 380, 120, pop(t - 22.85, 0.3), { fill: '#fff', stroke: C.rim, sw: 7 });
  bigText(ctx, 'HAS A STORY.', 520, 120, pop(t - 23.1, 0.3), { grad: ['#FBE29A', C.rim], stroke: '#3A2408', sw: 7 });
  text(ctx, 'MAKE YOURS IMPOSSIBLE TO SCROLL PAST', W / 2, 680, 44, { k: pop(t - 24.4, 0.3), fill: '#fff' });
  const ks = pop(t - 25.4, 0.4); if (ks > 0) { ctx.save(); ctx.globalAlpha = clamp(ks); setFont(ctx, 34); ctx.fillStyle = '#C9C2B4'; ctx.textAlign = 'center'; ctx.letterSpacing = '4px'; ctx.fillText('STORIES ANIMATED BY', W / 2, 1560);
    ctx.font = 'italic 700 64px Georgia, serif'; ctx.fillStyle = C.gold; ctx.letterSpacing = '0px'; ctx.fillText('Slumx', W / 2, 1640); ctx.restore(); }
}

const SUBS = [
  [0.0, 2.35, "Tunde's barbershop had 7 days left."], [2.45, 3.95, 'Day 1: zero customers.'], [4.0, 5.95, 'Day 2: flyers… gone with the wind.'],
  [6.0, 8.9, 'Day 3: half price… his only client was a CAT.'], [9.0, 11.2, 'Day 4: his little sister draws his wildest stories…'],
  [11.25, 14.0, '…like the time he gave a LION a fade.'], [14.15, 16.8, 'Someone animates it… it blows up overnight.'],
  [16.9, 19.4, 'Day 7? A line around the block…'], [19.45, 22.7, '…and the first guy in line is his LANDLORD.'],
];
function caption(ctx, str, t, t0, t1) {
  const a = t0 === 0 ? clamp((t1 - t) / 0.12) * (t >= 0 ? 1 : 0) : fade(t, t0, t1, 0.1); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; setFont(ctx, 56);
  const lines = []; let cur = ''; for (const wd of str.split(' ')) { const tr = cur ? cur + ' ' + wd : wd; if (ctx.measureText(tr).width > 920 && cur) { lines.push(cur); cur = wd; } else cur = tr; } lines.push(cur);
  const lh = 70, y0 = 1640 - (lines.length - 1) * lh / 2, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 56;
  ctx.fillStyle = 'rgba(11,13,18,0.75)'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y0 - lh / 2 - 12, w, lines.length * lh + 24, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh + 2)); ctx.restore();
}
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#07090F'; ctx.fillRect(0, 0, W, H);
  sceneHook(ctx, t); sceneDays(ctx, t); sceneDraw(ctx, t); sceneBlow(ctx, t); sceneLine(ctx, t); sceneEnd(ctx, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W, H);
  for (const [t0, t1, s] of SUBS) caption(ctx, s, t, t0, t1);
  const fo = clamp((t - 27.5) / 0.3); if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); }
}
window.renderAt = renderAt; window.READY = false;
loadAssets().then(() => {
  window.READY = true; if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  ctl.style.display = 'flex'; let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; draw(); };
  const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; last = now; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
