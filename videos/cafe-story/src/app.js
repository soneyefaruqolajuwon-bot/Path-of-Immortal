/* "The One-Star Regular" — standalone story-first Slumx short (native 9:16, twilight rim-lit stickman style).
 * renderAt(t) draws storyboard time t (= voiceover time). */
'use strict';
const W = 1080, H = 1920, DURATION = 46.6, GROUND = 1440;
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

// ================================================================== episode 2 (storyboard 0–38.5 s)
const SW = 240, FEETY = 409.2;
const at = (x, y, w, sx, sy) => [x + (sx - 120) * w / SW, y + (sy - FEETY) * w / SW];   // sprite point -> screen
const HANDS = { stand: [140, 270], point: [232, 160], hold: [193, 129], phone: [202, 93], cheer: [184, 68], shock: [208, 86] };
function puffBall(ctx, x, y, r, col = '#FFFFFF', line = C.ink) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = Math.max(3, r * 0.12); ctx.strokeStyle = line; ctx.stroke(); }
function fluff(ctx, x, y, R, n, seed, col = '#FFFFFF') {   // a cloud of overlapping pom-poms
  const r = rnd(seed), pts = []; for (let i = 0; i < n; i++) { const a = r() * 6.283, d = R * Math.sqrt(r()) * 0.7; pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, R * (0.32 + r() * 0.22)]); }
  ctx.save(); for (const [px, py, pr] of pts) { ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, 7); ctx.fillStyle = C.ink; ctx.fill(); } for (const [px, py, pr] of pts) { ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fillStyle = col; ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.0)'; ctx.restore();
}
function poodle(ctx, x, y, s, o = {}) {        // Biscuit: big, fluffy, white
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s); const col = o.col || '#FFFFFF';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.lineCap = 'round';
  for (const lx of [-70, -35, 45, 80]) { ctx.beginPath(); ctx.moveTo(lx, 40); ctx.lineTo(lx, 150); ctx.stroke(); ctx.strokeStyle = '#E8E8E8'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 8; }
  for (const lx of [-70, -35, 45, 80]) puffBall(ctx, lx, 150, 20, col);
  ctx.beginPath(); ctx.moveTo(-110, 0); ctx.quadraticCurveTo(-150, -60, -140, -100); ctx.stroke(); puffBall(ctx, -140, -108, 24, col);
  fluff(ctx, -60, 10, 95, 9, 3, col); fluff(ctx, 50, 0, 80, 7, 5, col);
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(55, -110, 46, 110, 20); ctx.fill(); ctx.stroke();
  fluff(ctx, 95, -150, 70, 8, 7, col);                                 // head pompom
  for (const ex of [60, 135]) { ctx.save(); ctx.translate(ex, -120); ctx.rotate(ex < 100 ? 0.25 : -0.25); fluff(ctx, 0, 30, 40, 4, ex, col); ctx.restore(); }
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(125, -110, 52, 34, 0.1, 0, 7); ctx.fill(); ctx.stroke();   // snout/face
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(165, -115, 11, 0, 7); ctx.fill();
  if (o.proud) { ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(108, -126, 9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(140, -98, 14, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(110, -126, 8, 0, 7); ctx.fill(); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(142, -96, 12, 0.3, Math.PI - 0.3); ctx.stroke(); }
  if (o.bow) { ctx.fillStyle = '#E63946'; ctx.beginPath(); ctx.moveTo(95, -205); ctx.lineTo(70, -225); ctx.lineTo(70, -185); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(95, -205); ctx.lineTo(120, -225); ctx.lineTo(120, -185); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function goldfish(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(t * 3) * 0.08); ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.fillStyle = '#FF8C1A';
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-120, -50); ctx.lineTo(-110, 0); ctx.lineTo(-120, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 75, 52, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -48); ctx.quadraticCurveTo(10, -90, 35, -44); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(38, -10, 16, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(42, -10, 7, 0, 7); ctx.fill();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(60, 12, 8, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 3; i++) { const u = (t * 0.8 + i / 3) % 1; ctx.beginPath(); ctx.arc(80 + u * 30, -40 - u * 140, 8 + u * 6, 0, 7); ctx.stroke(); }
  ctx.restore();
}
function parrot(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.fillStyle = '#2ECC71'; ctx.beginPath(); ctx.ellipse(0, 20, 50, 75, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E63946'; ctx.beginPath(); ctx.arc(0, -60, 42, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#F4D03F'; ctx.beginPath(); ctx.moveTo(30, -70); ctx.quadraticCurveTo(80, -60, 40, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(12, -70, 7, 0, 7); ctx.fill(); ctx.restore(); }
function lizard(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.fillStyle = '#7BC950'; ctx.beginPath(); ctx.moveTo(-120, 20); ctx.quadraticCurveTo(-40, 50, 0, 10); ctx.quadraticCurveTo(60, -30, 110, 0); ctx.quadraticCurveTo(60, 30, 0, 40); ctx.quadraticCurveTo(-60, 60, -120, 20); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(80, -2, 7, 0, 7); ctx.fill(); for (const lx of [-30, 40]) { ctx.beginPath(); ctx.moveTo(lx, 35); ctx.lineTo(lx - 10, 70); ctx.stroke(); } ctx.restore(); }
function hamster(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.fillStyle = '#E3A857'; ctx.beginPath(); ctx.ellipse(0, 0, 80, 64, 0, 0, 7); ctx.fill(); ctx.stroke();
  for (const ex of [-40, 40]) { ctx.beginPath(); ctx.arc(ex, -56, 18, 0, 7); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 20, 46, 34, 0, 0, 7); ctx.fill();
  ctx.fillStyle = C.ink; for (const ex of [-24, 24]) { ctx.beginPath(); ctx.arc(ex, -10, 7, 0, 7); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 8, 6, 0, 7); ctx.fill(); ctx.restore(); }
const PETS = { cat: (ctx, s, t) => cat(ctx, 0, 60 * s, s * 0.8, t), dog: (ctx, s) => poodle(ctx, -20 * s, 50 * s, s * 0.5), parrot: (ctx, s) => parrot(ctx, 0, 20 * s, s), lizard: (ctx, s) => lizard(ctx, 0, 0, s * 0.9), hamster: (ctx, s) => hamster(ctx, 0, 0, s), goldfish: (ctx, s, t) => goldfish(ctx, 10 * s, 0, s, t) };
function photo(ctx, x, y, w, pet, t, o = {}) {   // a polaroid / phone photo of a pet
  const h = w * (o.phone ? 1.7 : 1.15); ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.k !== undefined) ctx.scale(o.k, o.k);
  if (o.phone) { ctx.fillStyle = C.rim; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h / 2 - 5, w, h, w * 0.12); ctx.fill(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.12); ctx.fill(); }
  else { ctx.fillStyle = '#F6F2EC'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke(); }
  const ix = -w / 2 + w * 0.07, iy = -h / 2 + w * 0.07, iw = w * 0.86, ih = o.phone ? h - w * 0.14 : w * 0.86;
  const g = ctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, o.bg?.[0] || '#9ED8F0'); g.addColorStop(1, o.bg?.[1] || '#6FB98F'); ctx.fillStyle = g;
  ctx.save(); ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih, o.phone ? w * 0.08 : 2); ctx.fill(); ctx.clip(); ctx.translate(0, iy + ih / 2); PETS[pet](ctx, iw / 320, t); ctx.restore();
  ctx.restore();
}
// the client in the barber chair, under a cape, facing camera (hair = 0 normal … 1 full poodle afro)
function seated(ctx, x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  chair(ctx, 0, 330, 1.1);
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.moveTo(-40 + 5, -40 - 3); ctx.lineTo(45 + 5, -43); ctx.lineTo(170 + 5, 200 - 3); ctx.lineTo(-170 + 5, 197); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#F2F2F2'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(40, -40); ctx.lineTo(170, 200); ctx.lineTo(-170, 200); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#C9CED6'; ctx.lineWidth = 4; for (const sx of [-90, 0, 90]) { ctx.beginPath(); ctx.moveTo(sx * 0.3, -20); ctx.lineTo(sx, 190); ctx.stroke(); }
  const hk = o.hair || 0, hy = -110;
  if (hk > 0) { ctx.save(); const R = 70 + 95 * hk; fluff(ctx, 0, hy - 30 - 40 * hk, R, 11, 21, '#FFFFFF'); ctx.restore(); }
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.arc(5, hy - 3, 66, 0, 7); ctx.fill(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, hy, 66, 0, 7); ctx.fill();
  if (hk > 0.6) { for (const ex of [-80, 80]) { ctx.save(); ctx.translate(ex, hy + 10); fluff(ctx, 0, 0, 46 * hk, 4, ex + 50, '#FFFFFF'); ctx.restore(); } }
  const f = o.face || 'smile'; ctx.fillStyle = C.white; ctx.strokeStyle = C.white; ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (f === 'cry') { for (const ex of [-22, 22]) { ctx.beginPath(); ctx.arc(ex, hy - 6, 9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, hy + 30, 16, Math.PI + 0.3, -0.3); ctx.stroke();
    ctx.fillStyle = '#7FD3FF'; for (const sd of [-1, 1]) { const u = (t * 1.6) % 1; ctx.beginPath(); ctx.ellipse(sd * 26, hy + 12 + u * 120, 8, 14, 0, 0, 7); ctx.fill(); ctx.fillRect(sd * 26 - 5, hy + 4, 10, 110 * Math.min(1, (t - 21.3) * 2)); } }
  else if (f === 'silent') { for (const ex of [-22, 22]) { ctx.beginPath(); ctx.arc(ex, hy - 6, 10, 0, 7); ctx.fill(); } ctx.beginPath(); ctx.moveTo(-14, hy + 30); ctx.lineTo(14, hy + 30); ctx.stroke(); }
  else if (f === 'happy') { for (const ex of [-22, 22]) { ctx.beginPath(); ctx.arc(ex, hy - 2, 10, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, hy + 18, 20, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else { for (const ex of [-22, 22]) { ctx.beginPath(); ctx.arc(ex, hy - 6, 8, 0, 7); ctx.fill(); } ctx.beginPath(); ctx.arc(0, hy + 20, 14, 0.3, Math.PI - 0.3); ctx.stroke(); }
  ctx.restore();
}
function bubble(ctx, x, y, s, k, tail = [-60, 110]) {
  if (k <= 0.001) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 54);
  const lines = s.split('\n'), w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 80, h = lines.length * 66 + 50;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 40); ctx.moveTo(-30, h / 2 - 2); ctx.lineTo(tail[0], h / 2 + tail[1] - 60); ctx.lineTo(20, h / 2 - 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 36); ctx.fill();
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * 66 + 3)); ctx.restore();
}
function clippers(ctx, x, y, s, t) { ctx.save(); ctx.translate(x + Math.sin(t * 70) * 3, y); ctx.scale(s, s); ctx.rotate(-0.5); ctx.fillStyle = '#2B2B33'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-26, -10, 52, 120, 20); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#C9CED6'; ctx.fillRect(-30, -24, 60, 18); ctx.strokeRect(-30, -24, 60, 18); ctx.fillStyle = C.rim; ctx.fillRect(-8, 30, 16, 26); ctx.restore(); }
function comb(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(0.4); ctx.fillStyle = '#E63946'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-70, -16, 140, 28, 8); ctx.fill(); ctx.stroke(); for (let i = 0; i < 12; i++) { ctx.fillRect(-64 + i * 11, 10, 6, 30); } ctx.restore(); }
function sprayCan(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#7B2CBF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-30, -40, 60, 130, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#C9CED6'; ctx.fillRect(-16, -62, 32, 22); ctx.strokeRect(-16, -62, 32, 22); ctx.fillStyle = '#fff'; ctx.fillRect(-20, 0, 40, 30); ctx.restore(); }
function sprayCloud(ctx, x, y, R, k, seed) { if (k <= 0) return; const r = rnd(seed); ctx.save(); ctx.globalAlpha = 0.8 * (1 - clamp(k - 0.6) / 0.4); for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = R * easeOut(k) * r(); ctx.fillStyle = 'rgba(235,235,245,0.6)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 40 + r() * 70 * k, 0, 7); ctx.fill(); } ctx.restore(); }
function cash(ctx, x, y, s, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = '#4CAF50'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillRect(-60, -30, 120, 60); ctx.strokeRect(-60, -30, 120, 60); ctx.fillStyle = '#A5D6A7'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill(); ctx.restore(); }
function heart(ctx, x, y, s, a) { ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#FF3B5C'; ctx.beginPath(); ctx.moveTo(0, 18); ctx.bezierCurveTo(-40, -10, -20, -40, 0, -20); ctx.bezierCurveTo(20, -40, 40, -10, 0, 18); ctx.fill(); ctx.restore(); }

// ================================================================== the café (storyboard 0–46.6 s)
const STAR = '#FFC83D';
function stars(ctx, x, y, size, n, lit = 1) {   // row of 5 stars, n filled (fractional pop on the last)
  for (let i = 0; i < 5; i++) { const f = clamp(n - i); ctx.save(); ctx.translate(x + (i - 2) * size * 1.15, y); const s = f > 0 ? 1 + 0.25 * Math.max(0, 1 - f) : 1; ctx.scale(s, s);
    star(ctx, 0, 0, size / 2); ctx.fillStyle = f > 0 ? STAR : '#D9D4CC'; ctx.globalAlpha = lit; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore(); }
}
function reviewCard(ctx, x, y, w, nStars, quote, k = 1, o = {}) {
  if (k <= 0.001) return; const h = o.h || 300; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (o.rot) ctx.rotate(o.rot);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 8, -h / 2 + 12, w, h, 30); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 30); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5B5F66'; ctx.beginPath(); ctx.arc(-w / 2 + 64, -h / 2 + 64, 34, 0, 7); ctx.fill(); ctx.fillStyle = '#F2F2F2'; ctx.fillRect(-w / 2 + 44, -h / 2 + 70, 40, 8);
  setFont(ctx, 30); ctx.fillStyle = '#6B6F78'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(o.who || 'Your regular', -w / 2 + 116, -h / 2 + 50);
  ctx.save(); ctx.translate(-w / 2 + 116 + 2.5 * 40 * 1.15 - 20, -h / 2 + 92); stars(ctx, 0, 0, 40, nStars); ctx.restore();
  setFont(ctx, o.qs || 50); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; const lines = quote.split('\n'); lines.forEach((l, i) => ctx.fillText(l, 0, 50 + (i - (lines.length - 1) / 2) * 60));
  ctx.restore();
}
function notif(ctx, t, t0, txt) {   // phone notification banner sliding in from the top
  const k = easeOut((t - t0) / 0.3); if (k <= 0) return; ctx.save(); ctx.translate(W / 2, lerp(-120, 170, k) + Math.sin(t * 60) * (t - t0 < 0.4 ? 4 : 0));
  ctx.fillStyle = 'rgba(250,250,252,0.97)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-440, -70, 880, 140, 36); ctx.fill(); ctx.stroke();
  ctx.fillStyle = STAR; star(ctx, -360, 0, 34); ctx.fill(); ctx.stroke(); setFont(ctx, 40); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, -300, 0); ctx.restore();
}
// ---- the café interior
function cafe(ctx, t, o = {}) {
  const dim = o.dim || 0, season = o.season || 0;
  const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, '#3A2C3F'); g.addColorStop(1, '#6B4A3A'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  // window with morning sky (and the seasons going by)
  ctx.save(); ctx.translate(620, 330); const wg = ctx.createLinearGradient(0, 0, 0, 480); const sky = [['#F9C784', '#FCE1B0'], ['#F2994A', '#F7C873'], ['#B8C6DB', '#E8EEF5']][Math.floor(season) % 3];
  wg.addColorStop(0, sky[0]); wg.addColorStop(1, sky[1]); ctx.fillStyle = wg; ctx.fillRect(0, 0, 380, 480);
  ctx.fillStyle = 'rgba(90,60,70,0.45)'; for (let i = 0; i < 5; i++) ctx.fillRect(20 + i * 74, 300 - (i % 3) * 60, 56, 200);
  if (season % 3 >= 1 && season % 3 < 2) { const r = rnd(7); ctx.fillStyle = '#E07A2E'; for (let i = 0; i < 14; i++) { const y = (r() * 480 + t * 90) % 480; ctx.beginPath(); ctx.ellipse(r() * 380, y, 9, 5, r() * 3, 0, 7); ctx.fill(); } }
  if (season % 3 >= 2) { const r = rnd(9); ctx.fillStyle = '#FFFFFF'; for (let i = 0; i < 30; i++) { const y = (r() * 480 + t * 60) % 480; ctx.beginPath(); ctx.arc(r() * 380, y, 4, 0, 7); ctx.fill(); } }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 14; ctx.strokeRect(0, 0, 380, 480); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(190, 0); ctx.lineTo(190, 480); ctx.moveTo(0, 240); ctx.lineTo(380, 240); ctx.stroke(); ctx.restore();
  // menu board + clock + shelf
  ctx.fillStyle = '#1F2622'; ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(70, 300, 420, 260, 10); ctx.fill(); ctx.stroke();
  setFont(ctx, 40); ctx.fillStyle = '#F4F1E6'; ctx.textAlign = 'center'; ctx.fillText("LINA'S", 280, 360); ctx.font = 'italic 700 36px Georgia, serif'; ctx.fillText('café', 280, 405);
  ctx.fillStyle = 'rgba(244,241,230,0.5)'; for (let i = 0; i < 3; i++) ctx.fillRect(120, 440 + i * 34, 220 - i * 30, 8);
  clock(ctx, 280, 190, 70, o.clock ?? 7);
  // counter + espresso machine
  ctx.fillStyle = '#8B5E3C'; ctx.fillRect(0, GROUND - 260, 520, 260); ctx.fillStyle = '#A9714B'; ctx.fillRect(0, GROUND - 280, 540, 30); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.strokeRect(0, GROUND - 280, 540, 280);
  ctx.fillStyle = '#C9CED6'; ctx.beginPath(); ctx.roundRect(300, GROUND - 440, 170, 160, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; ctx.fillRect(350, GROUND - 330, 70, 30);
  for (let i = 0; i < 3; i++) { const u = (t * 0.7 + i / 3) % 1; ctx.save(); ctx.globalAlpha = 0.5 * (1 - u); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(385 + Math.sin(u * 8 + i) * 10, GROUND - 450 - u * 90); ctx.lineTo(385 + Math.sin(u * 8 + i + 1) * 10, GROUND - 470 - u * 90); ctx.stroke(); ctx.restore(); }
  // floor
  ctx.fillStyle = '#3A2E26'; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = '#4A3B30'; for (let i = 0; i < 12; i++) ctx.fillRect(i * 100 + (i % 2) * 50, GROUND, 4, H - GROUND);
  // warm light
  const lg = ctx.createRadialGradient(W / 2, 600, 40, W / 2, 600, 1100); lg.addColorStop(0, 'rgba(255,214,140,0.22)'); lg.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  if (dim > 0) { ctx.fillStyle = `rgba(16,18,30,${dim})`; ctx.fillRect(0, 0, W, H); }
}
function clock(ctx, x, y, r, hrs) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#F4F1E6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round'; const m = (hrs % 1) * 2 * Math.PI, h = (hrs / 12) * 2 * Math.PI;
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(h) * r * 0.5, -Math.cos(h) * r * 0.5); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(m) * r * 0.78, -Math.cos(m) * r * 0.78); ctx.stroke(); ctx.restore();
}
function table(ctx, x, y, s = 1) {   // the corner table (front of the seated old man)
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 7;
  ctx.fillStyle = '#5A3B28'; ctx.fillRect(-14, -150, 28, 150); ctx.strokeRect(-14, -150, 28, 150); ctx.beginPath(); ctx.ellipse(0, 0, 90, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#A9714B'; ctx.beginPath(); ctx.ellipse(0, -150, 190, 34, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
}
function cornerChair(ctx, x, y, s = 1, wob = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(wob); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.fillStyle = '#7A4A2A';
  ctx.fillRect(-70, -330, 18, 330); ctx.strokeRect(-70, -330, 18, 330); ctx.fillRect(52, -150, 18, 150); ctx.strokeRect(52, -150, 18, 150); ctx.fillRect(-70, -170, 140, 22); ctx.strokeRect(-70, -170, 140, 22);
  ctx.fillRect(-70, -330, 30, 160); ctx.strokeRect(-70, -330, 30, 160); ctx.restore();
}
function cup(ctx, x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.fillStyle = '#F4F1E6'; ctx.beginPath(); ctx.moveTo(-38, -70); ctx.lineTo(38, -70); ctx.lineTo(28, 0); ctx.lineTo(-28, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2E6B4F'; ctx.fillRect(-34, -48, 68, 22);
  if (o.lid) { ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.roundRect(-44, -88, 88, 20, 8); ctx.fill(); ctx.stroke(); ctx.fillRect(-14, -98, 28, 12); }
  if (o.steam) for (let i = 0; i < 3; i++) { const u = ((o.t || 0) * 0.8 + i / 3) % 1; ctx.save(); ctx.globalAlpha = 0.7 * (1 - u) * o.steam; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-14 + i * 14, -80 - u * 80); ctx.quadraticCurveTo(-4 + i * 14, -100 - u * 80, -14 + i * 14, -120 - u * 80); ctx.stroke(); ctx.restore(); }
  if (o.cold) { ctx.fillStyle = '#9ED8F0'; for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(-20 + i * 14, -78); ctx.rotate(i); star(ctx, 0, 0, 9); ctx.fill(); ctx.restore(); } }
  ctx.restore();
}
function speaker(ctx, x, y, s, vol, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#2B2B33'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-50, -70, 100, 140, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(0, 18, 30 + vol * 6 * Math.abs(Math.sin(t * 20)), 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, -36, 14, 0, 7); ctx.fill();
  setFont(ctx, 46); ctx.fillStyle = C.yellow; for (let i = 0; i < Math.round(1 + vol * 4); i++) { const u = (t * 0.9 + i / 5) % 1; ctx.save(); ctx.globalAlpha = 1 - u; ctx.fillText('♪', 70 + u * 120 * (1 + vol), -40 - u * 120 + Math.sin(u * 9) * 20); ctx.restore(); }
  ctx.restore();
}
// the old man at his corner table (screen-space helpers)
function waltSeated(ctx, t, pose = 'stand', o = {}) {
  const x = 790, y = GROUND;
  cornerChair(ctx, x + 60, y, 1.1, o.wob || 0);
  actor(ctx, 'walt', pose, x + (o.wob ? Math.sin(t * 22) * 8 : 0), y - 30, { w: 310, rot: (o.wob || 0) * 40 });
  table(ctx, x - 70, y + 20, 1.05);
}

// ---- B1 (0–8.26): every morning at seven… one black coffee… a ONE-star review
function sceneOne(ctx, t) {
  if (t > 8.3) return;
  cafe(ctx, t, { clock: 7 + clamp((t - 1.2) / 0.5) * 0 });
  if (t < 1.2) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H); reviewCard(ctx, W / 2, 860, 860, 1, '"Too loud."', pop(t - 0.02, 0.25), { rot: -0.04 }); notif(ctx, t, 0.0, '1-star review'); return; }
  if (t > 1.3 && t < 2.3) { ctx.save(); ctx.translate(280, 190); ctx.scale(1 + 0.5 * win(t, 1.35, 2.3, 0.2, 0.15), 1 + 0.5 * win(t, 1.35, 2.3, 0.2, 0.15)); ctx.restore(); text(ctx, '7:00 AM', W / 2, 330, 110, { k: win(t, 1.4, 2.4, 0.2, 0.12), fill: C.yellow, stroke: C.ink, strokeW: 8, rot: -3 }); }
  if (t < 4.8) { const u = easeOut((t - 2.4) / 1.6); actor(ctx, 'walt', Math.floor(t * 4) % 2 ? 'stand' : 'run_a', lerp(1250, 700, u), GROUND, { w: 300, flip: true });
    actor(ctx, 'lina', t > 3.4 ? 'wave' : 'stand', 220, GROUND - 40, { w: 300 }); }
  else if (t < 6.3) { actor(ctx, 'lina', 'hold', 220, GROUND - 40, { w: 300 }); cup(ctx, 330, GROUND - 330, 0.9, { steam: 1, t }); actor(ctx, 'walt', 'point', 680, GROUND, { w: 300, flip: true });
    bubble(ctx, 700, 560, 'ONE BLACK\nCOFFEE.', win(t, 4.9, 6.3, 0.2, 0.1), [40, 130]); }
  else { actor(ctx, 'lina', 'stand', 220, GROUND - 40, { w: 300 }); waltSeated(ctx, t, 'phone'); cup(ctx, 640, GROUND - 145, 0.75, { steam: 1, t });
    if (t > 6.6) reviewCard(ctx, W / 2, 520, 800, 1, '★ ONE STAR.', pop(t - 6.65, 0.25), { rot: 0.03, qs: 56 }); }
  text(ctx, "LINA'S TINY CAFÉ", W / 2, 260, 76, { k: win(t, 3.4, 4.8, 0.2, 0.12), fill: '#fff', stroke: C.ink, strokeW: 7, rot: -3 });
}
// ---- B2 (8.26–12.71): the complaints
function sceneComplaints(ctx, t) {
  if (t < 8.26 || t > 12.75) return;
  cafe(ctx, t);
  const loud = t < 9.3, wob = t > 9.3 && t < 10.3;
  if (loud) speaker(ctx, 140, 660, 1.2, 1, t);
  waltSeated(ctx, t, t > 10.3 ? 'hold' : 'stand', { wob: wob ? 0.05 * Math.sin(t * 22) : 0 });
  cup(ctx, 640, GROUND - 145, 0.75, { steam: t < 10.3 ? 1 : 0, cold: t > 10.6, t });
  const q = loud ? '"Too loud."' : wob ? '"Chair wobbles."' : '"Coffee\'s cold by the\ntime I find my glasses."';
  const t0 = loud ? 8.3 : wob ? 9.3 : 10.3;
  reviewCard(ctx, W / 2, 480, 900, 1, q, pop(t - t0, 0.22), { rot: (loud ? -0.03 : wob ? 0.03 : -0.02), qs: loud || wob ? 58 : 44, h: loud || wob ? 300 : 340 });
  if (t > 10.3) { ctx.save(); const k = clamp((t - 10.6) / 0.4); ctx.globalAlpha = k; text(ctx, '🔍?', 880, 860, 70, { shadow: false }); ctx.restore(); }
}
// ---- B3 (12.71–18.33): Lina fixed it
function sceneFix(ctx, t) {
  if (t < 12.71 || t > 18.36) return;
  cafe(ctx, t);
  if (t < 14.0) { actor(ctx, 'lina', 'cheer', W / 2, GROUND, { w: 320 }); text(ctx, 'CHALLENGE ACCEPTED.', W / 2, 330, 80, { k: win(t, 12.8, 14.0, 0.2, 0.1), fill: C.yellow, stroke: C.ink, strokeW: 8, rot: -3 }); return; }
  if (t < 15.15) { speaker(ctx, 300, 760, 1.6, lerp(1, 0.05, easeOut((t - 14.2) / 0.6)), t); actor(ctx, 'lina', 'point', 640, GROUND, { w: 300, flip: true });
    text(ctx, 'MUSIC: DOWN ✔', W / 2, 330, 80, { k: win(t, 14.3, 15.15, 0.15, 0.1), fill: '#7CFC9A', stroke: C.ink, strokeW: 8 }); return; }
  if (t < 16.25) { cornerChair(ctx, 640, GROUND, 1.3, 0); actor(ctx, 'lina', 'hold', 330, GROUND, { w: 300 });
    const hk = Math.abs(Math.sin(t * 16)); ctx.save(); ctx.translate(560, GROUND - 40 - hk * 40); ctx.rotate(-0.6 + hk * 0.5); ctx.fillStyle = '#6B4423'; ctx.fillRect(-8, 0, 16, 90); ctx.fillStyle = '#9AA3AE'; ctx.fillRect(-36, -18, 72, 28); ctx.restore();
    text(ctx, 'CHAIR: FIXED ✔', W / 2, 330, 80, { k: win(t, 15.25, 16.25, 0.15, 0.1), fill: '#7CFC9A', stroke: C.ink, strokeW: 8 }); return; }
  const snap = clamp((t - 16.9) / 0.25); actor(ctx, 'lina', 'hold', 330, GROUND, { w: 300 });
  ctx.save(); ctx.translate(680, 1050); cup(ctx, 0, 0, 2.2, { steam: 1 - snap, t }); if (snap > 0) { ctx.save(); ctx.translate(0, lerp(-200, 0, easeOut(snap))); cup(ctx, 0, 0, 2.2, { lid: true }); ctx.restore(); } ctx.restore();
  text(ctx, 'LID: ON ✔', W / 2, 330, 80, { k: win(t, 16.4, 18.33, 0.15, 0.1), fill: '#7CFC9A', stroke: C.ink, strokeW: 8 });
}
// ---- B4 (18.33–23.27): every day, for a whole year
const GRUMBLES = ['"Too bright."', '"Spoon\'s too small."', '"Door squeaks."', '"Too many cushions."', '"Clock ticks too loud."', '"Napkins: too soft."'];
function sceneYear(ctx, t) {
  if (t < 18.33 || t > 23.3) return;
  const season = clamp((t - 18.4) / 4.2) * 2.99;
  cafe(ctx, t, { season });
  waltSeated(ctx, t, 'stand'); cup(ctx, 640, GROUND - 145, 0.75, { lid: true });
  actor(ctx, 'lina', Math.floor(t * 3) % 2 ? 'hold' : 'point', 230, GROUND - 40, { w: 250 });
  const i = Math.floor((t - 18.4) / 0.62), u = ((t - 18.4) / 0.62) % 1;
  if (t < 22.0 && i >= 0) { reviewCard(ctx, W / 2, 470, 820, 1, GRUMBLES[i % GRUMBLES.length], pop(u * 0.62, 0.15), { rot: (i % 2 ? 0.04 : -0.04), qs: 50, h: 270 });
    if (u > 0.55) text(ctx, '✔ FIXED', 820, 640, 64, { k: pop((u - 0.55) * 0.62, 0.12), fill: '#7CFC9A', stroke: C.ink, strokeW: 7, rot: 8 }); }
  // calendar flipping
  const day = Math.min(365, Math.round(lerp(1, 365, easeIn(clamp((t - 18.4) / 4.0)))));
  ctx.save(); ctx.translate(180, 260); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-110, -90, 220, 190, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E63946'; ctx.fillRect(-110, -90, 220, 50); setFont(ctx, 26); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DAY', 0, -64);
  setFont(ctx, 70); ctx.fillStyle = C.ink; ctx.fillText(String(day), 0, 30); ctx.restore();
  text(ctx, 'FOR A WHOLE YEAR.', W / 2, 470, 84, { k: win(t, 21.9, 23.27, 0.2, 0.1), fill: C.yellow, stroke: C.ink, strokeW: 8, rot: -3 });
}
// ---- B5 (23.27–25.47): then one morning… he didn't come
function sceneEmpty(ctx, t) {
  if (t < 23.27 || t > 25.5) return;
  const hrs = 7 + clamp((t - 23.6) / 1.7) * 0.75;
  cafe(ctx, t, { dim: 0.35, clock: hrs });
  cornerChair(ctx, 830, GROUND, 1); table(ctx, 640, GROUND + 10, 1);
  cup(ctx, 640, GROUND - 150, 0.7, { lid: true, steam: 0 });
  actor(ctx, 'lina', 'slump', 230, GROUND - 40, { w: 300 });
  text(ctx, hrs < 7.2 ? '7:00' : hrs < 7.45 ? '7:15' : '7:30', W / 2, 330, 110, { k: win(t, 23.4, 25.45, 0.2, 0.1), fill: '#fff', stroke: C.ink, strokeW: 8 });
}
// ---- B6 (25.47–33.86): the letter
function sceneLetter(ctx, t) {
  if (t < 25.47 || t > 33.9) return;
  cafe(ctx, t, { dim: 0.45 });
  if (t < 26.9) { const u = easeOut((t - 25.6) / 0.7); ctx.save(); ctx.translate(lerp(1200, 620, u), GROUND - 20); ctx.rotate(lerp(0.4, -0.05, u)); envelope(ctx, 0, 0, 1.1); ctx.restore(); actor(ctx, 'lina', 'shock', 230, GROUND - 40, { w: 300 });
    text(ctx, 'A LETTER.', W / 2, 330, 100, { k: win(t, 26.2, 26.9, 0.15, 0.1), fill: '#fff', stroke: C.ink, strokeW: 8 }); return; }
  // the letter, line by line, in handwriting
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, H);
  const k = pop(t - 26.9, 0.3); ctx.save(); ctx.translate(W / 2, 860); ctx.scale(k, k); ctx.rotate(-0.02);
  ctx.fillStyle = '#FBF6EA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.rect(-420, -520, 840, 1040); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(80,110,160,0.25)'; ctx.lineWidth = 2; for (let y = -440; y < 500; y += 70) { ctx.beginPath(); ctx.moveTo(-380, y); ctx.lineTo(380, y); ctx.stroke(); }
  const L = [[27.4, 'Moving in with my daughter.'], [28.6, 'Sorry about the reviews.'], [29.9, 'My wife used to fix'], [30.4, 'everything I complained about…'], [32.0, "you're the only one who"], [32.6, 'ever did it again.']];
  ctx.font = 'italic 700 46px Georgia, serif'; ctx.fillStyle = '#2B3A67'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  L.forEach(([t0, s], i) => { const n = Math.floor(clamp((t - t0) / 0.6) * s.length); ctx.fillText(s.slice(0, n), -370, -400 + i * 140 + (i >= 2 ? 30 : 0) + (i >= 4 ? 30 : 0)); });
  // a tiny photo of him and his wife
  if (t > 29.9) { const pk = pop(t - 29.9, 0.3); ctx.save(); ctx.translate(250, 400); ctx.rotate(0.12); ctx.scale(pk, pk); ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillRect(-120, -110, 240, 230); ctx.strokeRect(-120, -110, 240, 230);
    ctx.fillStyle = '#F7C873'; ctx.fillRect(-104, -94, 208, 170); sprite(ctx, 'walt_stand', -40, 60, 110, { ay: 0.93 }); sprite(ctx, 'grandma_stand', 40, 60, 105, { ay: 0.93 });
    heart(ctx, 0, -60, 1.0, 1); ctx.restore(); }
  ctx.font = 'italic 700 40px Georgia, serif'; ctx.fillStyle = '#2B3A67'; ctx.globalAlpha = clamp((t - 33.2) / 0.3); ctx.fillText('— W.', -370, 470); ctx.restore();
}
function envelope(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#FBF6EA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.fillRect(-120, -80, 240, 160); ctx.strokeRect(-120, -80, 240, 160);
  ctx.beginPath(); ctx.moveTo(-120, -80); ctx.lineTo(0, 10); ctx.lineTo(120, -80); ctx.stroke(); ctx.fillStyle = '#E63946'; ctx.beginPath(); ctx.arc(0, 10, 16, 0, 7); ctx.fill(); ctx.restore(); }
// ---- B7 (33.86–39.84): one final review — FIVE stars
function sceneFive(ctx, t) {
  if (t < 33.86 || t > 39.9) return;
  cafe(ctx, t, { dim: 0.2 });
  actor(ctx, 'lina', t > 36.3 ? 'cheer' : 'hold', 230, GROUND - 40, { w: 300 });
  if (t < 35.0) { const u = easeOut((t - 33.9) / 0.8); ctx.save(); ctx.translate(560, lerp(700, 1200, u)); ctx.rotate(u * 2.2); ctx.fillStyle = '#FBF6EA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillRect(-90, -60, 180, 120); ctx.strokeRect(-90, -60, 180, 120); ctx.restore(); }
  const n = clamp((t - 36.2) / 0.7) * 5;
  const card = pop(t - 34.9, 0.3);
  if (card > 0) { reviewCard(ctx, W / 2, 620, 900, Math.max(1, n), t > 37.2 ? '"Best café in the world.\nSave my seat."' : '"One final review…"', card, { qs: 46, h: 360, who: 'Your regular' }); }
  if (t > 36.2) { const r = rnd(3); for (let i = 0; i < 18; i++) { const u = ((t - 36.2) * 0.5 + r()) % 1; ctx.save(); ctx.globalAlpha = 1 - u; star(ctx, r() * W, 900 - u * 700, 10 + r() * 14); ctx.fillStyle = STAR; ctx.fill(); ctx.restore(); } }
  text(ctx, 'FIVE STARS.', W / 2, 300, 110, { k: win(t, 36.3, 39.8, 0.2, 0.12), fill: STAR, stroke: C.ink, strokeW: 9, rot: -3 });
}
// ---- B8 (39.84–46.6): the corner table still says "Reserved"
function sceneReserved(ctx, t) {
  if (t < 39.84) return;
  const z = 1 + 0.75 * easeIO((t - 40.4) / 4.0);
  ctx.save(); ctx.translate(lerp(640, 540, easeIO((t - 40.4) / 4)), lerp(GROUND - 200, 900, easeIO((t - 40.4) / 4))); ctx.scale(z, z); ctx.translate(-680, -(GROUND - 230));
  cafe(ctx, t, { clock: 7 });
  cornerChair(ctx, 830, GROUND, 1); table(ctx, 640, GROUND + 10, 1);
  cup(ctx, 560, GROUND - 150, 0.7, { lid: true, steam: 1, t });
  ctx.save(); ctx.translate(720, GROUND - 200); const sk = pop(t - 40.7, 0.3) * 1.6; ctx.scale(sk, sk);
  ctx.fillStyle = '#F4F1E6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(-60, -90); ctx.lineTo(60, -90); ctx.lineTo(80, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.font = 'italic 700 28px Georgia, serif'; ctx.fillStyle = '#2B3A67'; ctx.textAlign = 'center'; ctx.fillText('Reserved', 0, -40); ctx.restore();
  // morning light through the window across the table
  ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#FFE3A3'; ctx.beginPath(); ctx.moveTo(620, 330); ctx.lineTo(1000, 330); ctx.lineTo(900, GROUND); ctx.lineTo(380, GROUND); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.restore();
  const ks = pop(t - 43.8, 0.4); if (ks > 0) { ctx.save(); ctx.globalAlpha = clamp(ks); setFont(ctx, 30); ctx.fillStyle = '#E8E1D4'; ctx.textAlign = 'center'; ctx.letterSpacing = '4px'; ctx.fillText('STORIES ANIMATED BY', W / 2, 1790);
    ctx.font = 'italic 700 60px Georgia, serif'; ctx.fillStyle = C.gold; ctx.letterSpacing = '0px'; ctx.fillText('Slumx', W / 2, 1860); ctx.restore(); }
}

const SUBS = [
  [0.0, 4.8, "Every morning at 7, the same old man walked into Lina's tiny café…"], [4.85, 6.35, '…ordered one black coffee…'], [6.4, 8.2, '…and left a ONE-star review.'],
  [8.3, 9.25, '"Too loud."'], [9.3, 10.25, '"Chair wobbles."'], [10.3, 12.65, '"Coffee\'s cold by the time I find my glasses."'],
  [12.75, 14.0, 'So Lina fixed it.'], [14.05, 16.3, 'Music down. Chair fixed.'], [16.35, 18.3, 'His coffee? Now with a lid.'],
  [18.4, 21.6, 'Every day, a new complaint. Every day, fixed.'], [21.65, 23.2, 'For a whole year.'], [23.35, 25.4, "Then one morning… he didn't come."],
  [25.55, 27.3, 'Instead, a letter arrived.'], [27.35, 33.8, ''], [33.9, 36.2, 'Folded inside: one final review.'], [36.25, 39.8, 'FIVE stars.'],
  [39.9, 43.6, 'The corner table still says "Reserved."'],
];
function caption(ctx, str, t, t0, t1) {
  if (!str) return; const a = t0 === 0 ? clamp((t1 - t) / 0.12) * (t >= 1.2 ? 1 : 0) : fade(t, t0, t1, 0.1); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; setFont(ctx, 52);
  const lines = []; let cur = ''; for (const wd of str.split(' ')) { const tr = cur ? cur + ' ' + wd : wd; if (ctx.measureText(tr).width > 920 && cur) { lines.push(cur); cur = wd; } else cur = tr; } lines.push(cur);
  const lh = 66, y0 = 1640 - (lines.length - 1) * lh / 2, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 56;
  ctx.fillStyle = 'rgba(11,13,18,0.75)'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y0 - lh / 2 - 12, w, lines.length * lh + 24, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh + 2)); ctx.restore();
}
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#07090F'; ctx.fillRect(0, 0, W, H);
  sceneOne(ctx, t); sceneComplaints(ctx, t); sceneFix(ctx, t); sceneYear(ctx, t); sceneEmpty(ctx, t); sceneLetter(ctx, t); sceneFive(ctx, t); sceneReserved(ctx, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W, H);
  if (!new URLSearchParams(location.search).has('nosubs')) for (const [t0, t1, s] of SUBS) caption(ctx, s, t, t0, t1);
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
