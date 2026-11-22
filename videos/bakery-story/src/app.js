/* "The Best Bread Nobody Knew About" — a story-first Slumx short (the work is shown, not sold).
 * Native 9:16 (1080×1920), twilight rim-lit stickman style. renderAt(t) draws storyboard time t.
 */
'use strict';
const W = 1080, H = 1920, DURATION = 33, GROUND = 1440;
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

// ================================================================== scenes (storyboard time 0–33 s)
const AMA_X = 330, DOOR_X = W / 2 - 420 + 660 * 840 / 760;
function loaf(ctx, x, y, s, glow = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) { const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 140); g.addColorStop(0, `rgba(255,214,140,${0.7 * glow})`); g.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 140, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#C9822F'; ctx.strokeStyle = '#5A3608'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, 70, 38, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E9A957'; ctx.beginPath(); ctx.ellipse(-6, -10, 56, 22, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#7A4A16'; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (const dx of [-30, 0, 30]) { ctx.beginPath(); ctx.moveTo(dx - 10, -22); ctx.lineTo(dx + 10, 4); ctx.stroke(); }
  ctx.restore();
}
function steam(ctx, x, y, t, k = 1, n = 3) {
  if (k <= 0) return; ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) { const u = ((t * 0.6 + i / n) % 1); ctx.globalAlpha = k * (1 - u) * 0.9; ctx.beginPath();
    for (let j = 0; j <= 20; j++) { const yy = y - u * 160 - j * 5, xx = x + (i - 1) * 30 + Math.sin(j * 0.5 + t * 3 + i) * 10; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
  ctx.restore();
}
function street(ctx, t, dark = 0) {
  world(ctx, t, dark);
  sprite(ctx, 'bg_bakery', W / 2, GROUND + 4, 840, { ax: 0.5, ay: 1 });
}
function caption(ctx, str, t, t0, t1) {
  const a = fade(t, t0, t1, 0.15); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; setFont(ctx, 54);
  const lines = []; let cur = ''; for (const wd of str.split(' ')) { const tr = cur ? cur + ' ' + wd : wd; if (ctx.measureText(tr).width > 900 && cur) { lines.push(cur); cur = wd; } else cur = tr; } lines.push(cur);
  const lh = 68, y0 = 1640 - (lines.length - 1) * lh / 2, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 56;
  ctx.fillStyle = 'rgba(11,13,18,0.7)'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y0 - lh / 2 - 12, w, lines.length * lh + 24, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh + 2)); ctx.restore();
}
function world(ctx, t, dark = 0) {
  sky(ctx, 540, 1250, dark);
  rays(ctx, 540, 1250, t, 1 - dark, 11, 1700);
  ctx.drawImage(SKYLINE, -700 - t * 5, GROUND - 510);
  ground(ctx, GROUND);
}

// ---------------------------------------------------------------- B1 (0–5): the best bread… nobody knows
function sceneIntro(ctx, t) {
  if (t > 5.3) return;
  street(ctx, t, 0.15);
  const holding = t > 1.4;
  actor(ctx, 'ama', holding ? 'hold' : 'wave', AMA_X, GROUND, { k: pop(t - 0.1, 0.35) });
  if (holding) { const h = handOf('hold'); const [lx, ly] = [AMA_X + h[0] + 40, GROUND + h[1] - 10]; loaf(ctx, lx, ly, pop(t - 1.5, 0.35), 1); steam(ctx, lx, ly - 40, t, clamp((t - 1.8) / 0.5)); }
  text(ctx, 'AMA', AMA_X, 820, 64, { k: win(t, 0.6, 3.6), fill: C.gold, stroke: '#3A2A08', strokeW: 5 });
  badge(ctx, 'THE BEST BREAD ON THE STREET', W / 2, 330, win(t, 1.9, 3.7));
  // nobody knows: the empty street (and a tumbleweed rolls by)
  if (t > 3.6) { const u = clamp((t - 3.7) / 1.5), x = lerp(W + 80, -80, u); ctx.save(); ctx.translate(x, GROUND - 40); ctx.rotate(-u * 12); ctx.strokeStyle = '#8A7A55'; ctx.lineWidth = 5;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(0, 0, 18 + i * 3, i, i + 4); ctx.stroke(); } ctx.restore();
    text(ctx, '…nobody knows', W / 2, 470, 60, { k: win(t, 3.8, 5.2), fill: '#DDE6EA' }); }
}

// ---------------------------------------------------------------- B2 (5–9.3): films, posts, zero views
function postCard(ctx, cx, cy, w, t, t0, views, sad) {
  const k = pop(t - t0, 0.3); if (k <= 0) return;
  const h = w * 1.5;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.rotate(sad ? 0.03 : -0.02);
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h / 2 - 4, w, h, 30); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 30); ctx.fill();
  ctx.fillStyle = '#2A1E14'; ctx.beginPath(); ctx.roundRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 120, 20); ctx.fill();
  loaf(ctx, 0, -40, w / 300);
  setFont(ctx, 30); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('my bread 🍞', -w / 2 + 24, h / 2 - 72);
  ctx.textAlign = 'right'; ctx.fillStyle = '#FF6B6B'; setFont(ctx, 34); ctx.fillText(`👁 ${views}`, w / 2 - 24, h / 2 - 72);
  ctx.restore();
}
function sceneFilm(ctx, t) {
  if (t < 4.9 || t > 9.6) return;
  street(ctx, t, 0.25);
  const slump = t > 8.6;
  actor(ctx, 'ama', slump ? 'slump' : 'phone', AMA_X, GROUND);
  if (!slump) { const h = handOf('catch'); ctx.save(); ctx.fillStyle = C.ink; ctx.strokeStyle = C.rim; ctx.lineWidth = 3; ctx.translate(AMA_X + 70, GROUND - 470); ctx.rotate(-0.2); ctx.beginPath(); ctx.roundRect(-22, -38, 44, 76, 8); ctx.fill(); ctx.stroke(); ctx.restore(); }
  loaf(ctx, AMA_X + 200, GROUND - 110, 0.9, 0.5);
  if (t > 5.9 && t < 7.2) { ctx.save(); ctx.globalAlpha = 0.8 * Math.max(0, 1 - ((t - 5.9) % 0.5) * 6); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }   // camera flash
  postCard(ctx, 720, 760, 360, t, 7.15, 0, false);
  postCard(ctx, 690, 820, 360, t, 8.4, 0, true);
  if (t > 7.9) text(ctx, '0 VIEWS', 720, 330, 110, { k: pop(t - 8.0), fill: '#FF6B6B', stroke: C.ink, rot: -4 });
}

// ---------------------------------------------------------------- B3 (9.3–17.1): at night, she writes her story
const NOTES = [['Grandma\'s recipe', 12.3], ['4 a.m. ovens', 13.6], ['The smell that wakes the street', 14.85]];
function notebook(ctx, t, x, y, k, lift = 0) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(-0.04);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-372, -232, 760, 500);
  ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-380, -240, 760, 500, 14); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#C9BFA4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -236); ctx.lineTo(0, 256); ctx.stroke();
  ctx.strokeStyle = '#D9D0B8'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-350, -160 + i * 52); ctx.lineTo(-30, -160 + i * 52); ctx.stroke(); ctx.beginPath(); ctx.moveTo(30, -160 + i * 52); ctx.lineTo(350, -160 + i * 52); ctx.stroke(); }
  ctx.font = 'italic 700 40px Georgia, serif'; ctx.fillStyle = '#3A2A1A'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('My story', -340, -180);
  NOTES.forEach(([s, t0], i) => { const n = Math.floor(s.length * clamp((t - t0) / 0.7)); if (n <= 0) return;
    const lines = s.length > 18 ? [s.slice(0, s.lastIndexOf(' ', 18)), s.slice(s.lastIndexOf(' ', 18) + 1)] : [s];
    let shown = n; ctx.save(); ctx.globalAlpha = 1 - lift;
    lines.forEach((l, j) => { const part = l.slice(0, Math.max(0, shown)); shown -= l.length + 1; ctx.font = 'italic 700 34px Georgia, serif'; ctx.fillText(part, i < 2 ? -340 : 40, -112 + (i < 2 ? i * 104 : 0) + j * 52); });
    ctx.restore(); });
  // little doodles
  if (t > 12.6) { ctx.save(); ctx.globalAlpha = 1 - lift; ctx.strokeStyle = '#7A4A16'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(-120, 150, 70, 34, 0, 0, 7); ctx.stroke(); ctx.restore(); }
  if (t > 13.9) { ctx.save(); ctx.globalAlpha = 1 - lift; ctx.strokeStyle = '#B03A2E'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(200, 120, 50, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(200, 120); ctx.lineTo(200, 84); ctx.moveTo(200, 120); ctx.lineTo(226, 120); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
function sceneWrite(ctx, t) {
  if (t < 9.2 || t > 19.3) return;
  world(ctx, t, 0.82);
  ctx.save(); ctx.fillStyle = '#F7F1C8'; ctx.beginPath(); ctx.arc(860, 300, 70, 0, 7); ctx.fill(); ctx.fillStyle = '#0B1220'; ctx.beginPath(); ctx.arc(888, 282, 62, 0, 7); ctx.fill(); ctx.restore();
  const r = rnd(5); ctx.fillStyle = '#fff'; for (let i = 0; i < 30; i++) { ctx.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(t * 2 + i)); star(ctx, r() * W, 140 + r() * 600, 4 + r() * 4); ctx.fill(); } ctx.globalAlpha = 1;
  // lamp glow over the table
  const g = ctx.createRadialGradient(W / 2, 980, 20, W / 2, 980, 700); g.addColorStop(0, 'rgba(255,214,140,0.55)'); g.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3A2718'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(60, 1240, W - 120, 60, 10); ctx.fill(); ctx.stroke();
  actor(ctx, 'ama', 'point', 190, 1250, { w: 250 });
  const lift = clamp((t - 17.7) / 1.2);
  notebook(ctx, t, W / 2 + 70, 960, pop(t - 10.4, 0.4), lift);
  // words lift off the page
  if (lift > 0) { const rr = rnd(9); ctx.save(); ctx.font = 'italic 700 40px Georgia, serif'; ctx.fillStyle = '#FFE3A3'; ctx.textAlign = 'center';
    const letters = NOTES.map(n => n[0]).join(' ').replace(/ /g, '');
    for (let i = 0; i < letters.length; i++) { const sx = W / 2 - 300 + rr() * 640, sy = 860 + rr() * 260, u = easeIn(clamp(lift * 1.3 - rr() * 0.3));
      ctx.globalAlpha = 1 - clamp((u - 0.7) / 0.3); ctx.fillText(letters[i], lerp(sx, W / 2 + (rr() - 0.5) * 200, u), lerp(sy, 300, u)); } ctx.restore(); }
  text(ctx, 'SO ONE NIGHT…', W / 2, 330, 80, { k: win(t, 9.4, 11.8), fill: '#DDE6EA' });
}

// ---------------------------------------------------------------- B4 (17.1–23): someone turns those words into THIS
function kitchen(ctx, t, k) {
  ctx.fillStyle = '#2B1C14'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 700, 40, W / 2, 700, 900); g.addColorStop(0, 'rgba(255,190,110,0.75)'); g.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#F7C46C'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(120, 300, 300, 360, 10); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(270, 300); ctx.lineTo(270, 660); ctx.moveTo(120, 480); ctx.lineTo(420, 480); ctx.stroke();
  ctx.fillStyle = '#5A3A22'; ctx.beginPath(); ctx.roundRect(80, 1220, W - 160, 70, 10); ctx.fill(); ctx.stroke();
  const sq = 1 + 0.06 * Math.sin(t * 6); ctx.save(); ctx.translate(W / 2 + 60, 1205); ctx.scale(sq, 2 - sq); ctx.fillStyle = '#F1E3C2'; ctx.strokeStyle = '#8A7A55'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 110, 40, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.restore();
  actor(ctx, 'grandma', 'knead', W / 2 - 170, 1230, { w: 330, k });
  actor(ctx, 'ama', 'cheer', W / 2 + 330, 1230, { w: 210, k: pop(t - 19.6, 0.3) });
  text(ctx, "GRANDMA'S RECIPE", W / 2, 230, 70, { k: pop(t - 19.2, 0.3), fill: C.gold, stroke: '#3A2A08', strokeW: 5 });
  for (let i = 0; i < 18; i++) { const r = rnd(20 + i), u = ((t * 0.25 + r()) % 1); ctx.save(); ctx.globalAlpha = 0.6 * Math.sin(u * Math.PI); ctx.fillStyle = '#FFF3D6'; ctx.beginPath(); ctx.arc(W / 2 + (r() - 0.5) * 500, 1180 - u * 500, 4 + r() * 4, 0, 7); ctx.fill(); ctx.restore(); }
}
function oven(ctx, t) {
  ctx.fillStyle = '#1C1410'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#7A3E2A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(140, 1300); ctx.lineTo(140, 760); ctx.arc(W / 2, 760, W / 2 - 140, Math.PI, 0); ctx.lineTo(W - 140, 1300); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let row = 0; row < 8; row++) for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3; ctx.strokeRect(160 + i * 130 + (row % 2) * 65, 780 + row * 64, 130, 64); }
  const fl = 0.8 + 0.2 * Math.sin(t * 17) * Math.sin(t * 7), g = ctx.createRadialGradient(W / 2, 1120, 20, W / 2, 1120, 330 * fl); g.addColorStop(0, 'rgba(255,230,140,1)'); g.addColorStop(0.5, 'rgba(255,140,40,0.9)'); g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = '#120A06'; ctx.beginPath(); ctx.moveTo(320, 1300); ctx.lineTo(320, 1060); ctx.arc(W / 2, 1060, W / 2 - 320, Math.PI, 0); ctx.lineTo(W - 320, 1300); ctx.closePath(); ctx.fill();
  ctx.fillStyle = g; ctx.fill(); [-90, 0, 90].forEach((dx, i) => loaf(ctx, W / 2 + dx, 1230 - (i === 1 ? 20 : 0), 0.8));
  ctx.save(); ctx.translate(W / 2, 430); ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 120, 0, 7); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80); ctx.moveTo(0, 0); ctx.lineTo(70 * Math.cos(-Math.PI / 2 + 2 * Math.PI * 4 / 12), 70 * Math.sin(-Math.PI / 2 + 2 * Math.PI * 4 / 12)); ctx.stroke(); ctx.restore();
  text(ctx, '4:00 A.M.', W / 2, 620, 70, { fill: C.gold, stroke: '#3A2A08', strokeW: 5 });
}
function sunriseStreet(ctx, t) {
  sky(ctx, 540, 1150, 0);
  rays(ctx, 540, 1150, t, 1.4, 13, 1800);
  ctx.drawImage(SKYLINE, -700, GROUND - 510);
  ground(ctx, GROUND);
  // the smell drifts down the street and windows light up
  for (let j = 0; j < 4; j++) { ctx.save(); ctx.strokeStyle = `rgba(255,214,140,${0.65 - j * 0.1})`; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath();
    for (let x = 0; x <= W; x += 12) { const y = 900 + j * 90 + Math.sin(x / 90 + t * 2 + j) * 26; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore(); }
  text(ctx, 'THE SMELL THAT WAKES THE STREET', W / 2, 300, 52, { fill: '#FFE3A3', stroke: '#3A2A08', strokeW: 4 });
}
function sceneThis(ctx, t) {
  if (t < 17.0 || t > 23.2) return;
  if (t < 19.1) return;                         // the night scene keeps playing until the reveal
  const seg = t < 20.4 ? 0 : t < 21.7 ? 1 : 2;
  if (seg === 0) kitchen(ctx, t, pop(t - 19.15, 0.35)); else if (seg === 1) oven(ctx, t); else sunriseStreet(ctx, t);
  ripple(ctx, W / 2, H / 2, t, 19.1, { r: 700, n: 4 });
  if (t < 19.4) { ctx.fillStyle = `rgba(255,246,220,${0.8 * (1 - (t - 19.1) / 0.3)})`; ctx.fillRect(0, 0, W, H); }
  text(ctx, 'THIS.', W / 2, 520, 180, { k: win(t, 19.1, 20.3, 0.2, 0.2), fill: C.yellow, stroke: '#3A2A08', strokeW: 8, rot: -4 });
  for (const tc of [20.4, 21.7]) if (t > tc && t < tc + 0.18) { ctx.fillStyle = `rgba(255,246,220,${0.5 * (1 - (t - tc) / 0.18)})`; ctx.fillRect(0, 0, W, H); }
  // a subtle "this is an animation" frame: soft rounded corners + playhead
  ctx.save(); ctx.strokeStyle = 'rgba(244,208,63,0.8)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(24, 24, W - 48, H - 48, 40); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(60, H - 70, W - 120, 8); ctx.fillStyle = C.gold; ctx.fillRect(60, H - 70, (W - 120) * clamp((t - 19.1) / 3.9), 8); ctx.restore();
}

// ---------------------------------------------------------------- B5 (23–25.5): a line out the door
function sceneLine(ctx, t) {
  if (t < 22.9 || t > 25.8) return;
  street(ctx, t, 0);
  // phones across town showing the video
  [[260, 380], [540, 300], [820, 380]].forEach(([x, y], i) => { const k = win(t, 23.0 + i * 0.12, 24.3); if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = C.ink; ctx.strokeStyle = C.rim; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-70, -120, 140, 240, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3A2718'; ctx.fillRect(-58, -106, 116, 190); loaf(ctx, 0, -10, 0.6); setFont(ctx, 24); ctx.fillStyle = '#FF6B6B'; ctx.textAlign = 'center'; ctx.fillText('♥ ' + ['2.1K', '640', '1.3K'][i], 0, 104); ctx.restore(); });
  const queue = [['capper', 'cheer'], ['scientist', 'stand'], ['coach', 'cheer'], ['host', 'stand'], ['capper', 'stand'], ['scientist', 'cheer']];
  queue.forEach(([who, pose], i) => { const x = DOOR_X - 10 - i * 112, u = clamp((t - 23.7 - i * 0.07) / 0.6); if (u <= 0) return; actor(ctx, who, pose, lerp(W + 200, x, easeOut(u)), GROUND, { w: 210, flip: true }); });
  actor(ctx, 'ama', 'cheer', 120, GROUND, { w: 240 });
  text(ctx, 'A LINE OUT THE DOOR', W / 2, 560, 76, { k: pop(t - 24.1), fill: C.yellow, stroke: '#3A2A08', strokeW: 6, rot: -3 });
}

// ---------------------------------------------------------------- B6 (25.5–28.7): she needed her story told
function sceneMoral(ctx, t) {
  if (t < 25.4 || t > 29.0) return;
  street(ctx, t, 0);
  actor(ctx, 'ama', 'hold', W / 2 - 60, GROUND, { w: 380 });
  const h = handOf('hold', 380); loaf(ctx, W / 2 - 60 + h[0] + 50, GROUND + h[1] - 12, 1.2, 1); steam(ctx, W / 2 - 60 + h[0] + 50, GROUND + h[1] - 70, t);
  text(ctx, 'NOT A BIGGER OVEN…', W / 2, 340, 70, { k: win(t, 25.6, 28.8), fill: '#DDE6EA', stroke: C.ink, strokeW: 4 });
  text(ctx, 'HER STORY, TOLD.', W / 2, 470, 96, { k: pop(t - 27.5, 0.35), grad: ['#FBE29A', C.rim], stroke: '#3A2408', strokeW: 6 });
}

// ---------------------------------------------------------------- B7 (28.7–33): what's yours?
function sceneOutro(ctx, t) {
  if (t < 28.6) return;
  ctx.fillStyle = '#07090F'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 900, 40, W / 2, 900, 900); g.addColorStop(0, 'rgba(245,176,65,0.35)'); g.addColorStop(1, 'rgba(245,176,65,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  notebook(ctx, t + 100, W / 2, 1180, pop(t - 28.8, 0.4) * 0.8, 1);
  text(ctx, "WHAT'S", W / 2, 520, 150, { k: pop(t - 29.2, 0.35), fill: '#fff', stroke: C.rim, strokeW: 7 });
  text(ctx, 'YOURS?', W / 2, 690, 170, { k: pop(t - 29.45, 0.35), grad: ['#FBE29A', C.rim], stroke: '#3A2408', strokeW: 8 });
  const ks = pop(t - 30.4, 0.4);
  if (ks > 0) { ctx.save(); ctx.globalAlpha = clamp(ks); setFont(ctx, 34); ctx.fillStyle = '#C9C2B4'; ctx.textAlign = 'center'; ctx.letterSpacing = '4px'; ctx.fillText('STORIES ANIMATED BY', W / 2, 1560);
    ctx.font = 'italic 700 64px Georgia, serif'; ctx.fillStyle = C.gold; ctx.letterSpacing = '0px'; ctx.fillText('Slumx', W / 2, 1640); ctx.restore(); }
}

const SUBS = [
  [0.05, 3.6, 'This is Ama. She bakes the best bread on her street…'], [3.65, 5.0, '…but nobody knows.'],
  [5.1, 7.1, 'Every morning, she films her bread.'], [7.15, 9.3, 'Posts it. Zero views.'],
  [9.4, 12.2, 'So one night, she writes her story down instead.'], [12.25, 14.8, "Her grandmother's recipe. The 4 a.m. ovens."], [14.85, 17.1, 'The smell that wakes up the whole street.'],
  [17.2, 19.0, 'And someone turns those words…'], [19.05, 22.9, 'into THIS.'],
  [23.0, 25.4, "By the weekend, there's a line out the door."], [25.5, 28.6, "Ama didn't need a bigger oven. She needed her story told."],
];
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  sceneIntro(ctx, t); sceneFilm(ctx, t); sceneWrite(ctx, t); sceneThis(ctx, t); sceneLine(ctx, t); sceneMoral(ctx, t); sceneOutro(ctx, t);
  const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W, H);
  if (!(t > 19.05 && t < 22.9)) for (const [t0, t1, s] of SUBS) caption(ctx, s, t, t0, t1);
  const fi = 1 - clamp(t / 0.25), fo = clamp((t - 32.7) / 0.3);
  if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
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
