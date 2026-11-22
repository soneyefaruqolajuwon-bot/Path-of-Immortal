/* Portfolio ad 2 — "Don't scroll": knock-on-the-glass hook, script → scene transformations, link-in-bio ending.
 * Native 9:16 (1080×1920), twilight rim-lit stickman style. renderAt(t) draws storyboard time t.
 */
'use strict';
const W = 1080, H = 1920, DURATION = 19, GROUND = 1440;
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

// ================================================================== scenes (storyboard time 0–19 s)
const SUN = [540, 1260];
function world(ctx, t, dark = 0) {          // dusk sky, city, ground
  sky(ctx, SUN[0], SUN[1], dark);
  rays(ctx, SUN[0], SUN[1], t, 1 - dark, 11, 1700);
  ctx.drawImage(SKYLINE, -700 - t * 6, GROUND - 510);
  ground(ctx, GROUND);
}
function whip(ctx, t, t0) {                 // whip transition streaks + flash
  const k = win(t, t0 - 0.12, t0 + 0.18, 0.08, 0.15); if (k <= 0) return;
  const r = rnd(Math.round(t0 * 10)); ctx.save(); ctx.globalAlpha = clamp(k) * 0.55; ctx.fillStyle = '#fff';
  for (let i = 0; i < 46; i++) ctx.fillRect(r() * W, r() * H, 160 + r() * 520, 2 + r() * 3);
  ctx.restore();
  if (t > t0 && t < t0 + 0.2) { ctx.fillStyle = `rgba(255,246,220,${0.45 * (1 - (t - t0) / 0.2)})`; ctx.fillRect(0, 0, W, H); }
}
function chipPill(ctx, label, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, o.size || 34); ctx.letterSpacing = (o.spacing ?? 2) + 'px';
  const w = ctx.measureText(label).width + 70, h = (o.size || 34) * 1.9;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 28; }
  ctx.fillStyle = o.bg || C.coral; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = o.fg || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 3); ctx.restore();
}

// ---------------------------------------------------------------- B1 (0–2.9): the host knocks on the glass from inside
const KNOCKS = [0.22, 0.48, 0.74];
const HOST_B1 = { x: 420, y: 1760, w: 820 };
function knockSpot() { const h = handOf('point', HOST_B1.w); return [HOST_B1.x + h[0], HOST_B1.y + h[1]]; }
function cracks(ctx, x, y, n, k, seed) {
  if (k <= 0) return; const r = rnd(seed);
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    let a = r() * 6.283, px = x, py = y, len = (90 + r() * 260) * easeOut(k);
    ctx.lineWidth = 1.5 + r() * 2.5; ctx.beginPath(); ctx.moveTo(px, py);
    for (let j = 0; j < 4; j++) { a += (r() - 0.5) * 0.7; px += Math.cos(a) * len / 4; py += Math.sin(a) * len / 4; ctx.lineTo(px, py); }
    ctx.stroke();
  }
  ctx.restore();
}
function sceneKnock(ctx, t) {
  if (t > 3.1) return;
  world(ctx, t, 0.55);
  const shatter = clamp((t - 2.62) / 0.35);
  let bump = 0; for (const kt of KNOCKS) bump += 0.05 * Math.max(0, 1 - Math.abs(t - kt) * 9);
  const [kx, ky] = knockSpot();
  if (shatter < 1) {
    ctx.save(); ctx.globalAlpha = 1 - shatter;
    ctx.translate(HOST_B1.x, HOST_B1.y); ctx.scale(1 + bump, 1 + bump); ctx.translate(-HOST_B1.x, -HOST_B1.y);
    actor(ctx, 'host', t > 1.6 ? 'wave' : 'point', HOST_B1.x, HOST_B1.y, { w: HOST_B1.w, k: pop(t - 0.02, 0.25) });
    ctx.restore();
  }
  // the glass: knocks ripple and crack it
  KNOCKS.forEach((kt, i) => { ripple(ctx, kx, ky, t, kt, { r: 260, n: 2, d: 0.55 }); if (shatter < 1) { ctx.save(); ctx.globalAlpha = 1 - shatter; cracks(ctx, kx + (i - 1) * 14, ky + (i - 1) * 10, 5 + i * 2, clamp((t - kt) / 0.25), 7 + i); ctx.restore(); } });
  if (shatter < 1) { ctx.save(); ctx.globalAlpha = 0.12 * (1 - shatter); const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#fff'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // shards fly out on the shatter
  if (shatter > 0 && shatter < 1) { const r = rnd(5); ctx.save(); ctx.fillStyle = 'rgba(230,240,255,0.7)'; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 40; i++) { const a = r() * 6.283, d = easeOut(shatter) * (300 + r() * 900), sx = kx + Math.cos(a) * d, sy = ky + Math.sin(a) * d + shatter * shatter * 400, s = 20 + r() * 50;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(r() * 6 + shatter * 8); ctx.globalAlpha = 1 - shatter; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.5); ctx.lineTo(-s * 0.6, s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.restore(); }
  const ko = 1 - shatter;
  text(ctx, 'WAIT…', W / 2, 300, 150, { k: pop(t - 0.05, 0.25) * ko, fill: C.white, stroke: C.rim, strokeW: 6 });
  text(ctx, "DON'T SCROLL.", W / 2, 450, 104, { k: pop(t - 0.62, 0.25) * ko, fill: C.yellow, stroke: '#3A2A08', strokeW: 6, rot: -3 });
  speedLines(ctx, kx, ky, win(t, 0.7, 1.0, 0.05, 0.2), 3);
}

// ---------------------------------------------------------------- the countdown ("give me ten seconds")
const T_TIMER0 = 2.45, T_TIMER1 = 14.3;
function timer(ctx, t) {
  if (t < 1.65 || t > 14.9) return;
  const big = 1 - easeIO((t - 2.25) / 0.5), x = lerp(965, W / 2, big), y = lerp(330, 720, big), r = lerp(54, 150, big);
  const k = pop(t - 1.65, 0.3) * popOut(14.85 - t, 0.25);
  const u = clamp((t - T_TIMER0) / (T_TIMER1 - T_TIMER0)), n = Math.ceil(10 * (1 - u));
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = 'rgba(11,13,18,0.82)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = r * 0.14; ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, 7); ctx.stroke();
  ctx.strokeStyle = n <= 3 ? C.coral : C.rim; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, r * 0.86, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - u)); ctx.stroke();
  const tick = (t > T_TIMER0) ? 1 + 0.15 * Math.max(0, 1 - ((t - T_TIMER0) % ((T_TIMER1 - T_TIMER0) / 10)) * 6) : 1;
  ctx.scale(tick, tick); setFont(ctx, r * 0.95); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 0, r * 0.06);
  ctx.restore();
  if (big > 0.02) text(ctx, 'GIVE ME 10 SECONDS', W / 2, 920, 64, { k: k * big, fill: C.white, spacing: 2 });
}

// ---------------------------------------------------------------- B2 (2.9–5.9): the script types itself
const SCRIPT_TXT = 'A coffee shop that needs more customers.';
const DOC = { x: W / 2, y: 760, w: 900, h: 520 };
function docCard(ctx, t, x, y, w, h, str, typed, o = {}) {
  ctx.save(); ctx.translate(x, y);
  if (o.shake) ctx.translate(Math.sin(t * 90) * o.shake, Math.cos(t * 77) * o.shake);
  ctx.scale(o.k ?? 1, o.k ?? 1);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h / 2 - 5, w, h, 30); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#FBF8F2'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 30); ctx.fill();
  ctx.fillStyle = '#ECE6DC'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, 78, [30, 30, 0, 0]); ctx.fill();
  [C.coral, C.rim, '#6CC07A'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-w / 2 + 46 + i * 36, -h / 2 + 39, 11, 0, 7); ctx.fill(); });
  setFont(ctx, 28); ctx.fillStyle = '#8A8378'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.title || 'your-script.txt', 0, -h / 2 + 41);
  setFont(ctx, o.size || 64); ctx.fillStyle = '#1B1D24'; ctx.textAlign = 'left';
  const shown = str.slice(0, Math.floor(typed));
  const lines = []; let cur = '';
  for (const wd of shown.split(' ')) { const tr = cur ? cur + ' ' + wd : wd; if (ctx.measureText(tr).width > w - 110 && cur) { lines.push(cur); cur = wd; } else cur = tr; }
  lines.push(cur);
  const lh = (o.size || 64) * 1.25, y0 = -h / 2 + 150;
  lines.forEach((l, i) => ctx.fillText(l, -w / 2 + 55, y0 + i * lh));
  if (o.cursor && Math.floor(t * 2.5) % 2 === 0) { const lw = ctx.measureText(lines[lines.length - 1]).width; ctx.fillStyle = C.coral; ctx.fillRect(-w / 2 + 58 + lw, y0 + (lines.length - 1) * lh - lh * 0.4, 6, lh * 0.8); }
  ctx.restore();
}
const T_TYPE0 = 3.35, T_TYPE1 = 4.75, T_BOOM = 5.9;
function sceneScript(ctx, t) {
  if (t < 2.62 || t > T_BOOM + 0.05) return;
  world(ctx, t, 0.15);
  const typed = SCRIPT_TXT.length * clamp((t - T_TYPE0) / (T_TYPE1 - T_TYPE0));
  const shake = t > 5.45 ? 6 + 26 * clamp((t - 5.45) / 0.45) : 0;
  docCard(ctx, t, DOC.x, DOC.y, DOC.w, DOC.h, SCRIPT_TXT, typed, { k: pop(t - 2.75, 0.35), cursor: true, shake });
  chipPill(ctx, 'YOUR SCRIPT', W / 2, DOC.y - DOC.h / 2 - 70, pop(t - 2.95));
  actor(ctx, 'host', 'point', 230, GROUND, { k: pop(t - 3.0, 0.3) });
  if (t > 5.45) { ctx.save(); ctx.globalAlpha = clamp((t - 5.45) / 0.45) * 0.5; const g = ctx.createRadialGradient(DOC.x, DOC.y, 50, DOC.x, DOC.y, 700); g.addColorStop(0, 'rgba(255,214,140,0.9)'); g.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

// ---------------------------------------------------------------- B3 (5.9–7.6): BOOM → the coffee-shop ad
const CAFE = { x: W / 2, w: 840 }; CAFE.h = CAFE.w; CAFE.door = CAFE.x - CAFE.w / 2 + 660 * CAFE.w / 760;
function cafeScene(ctx, t, t0) {
  world(ctx, t, 0);
  sprite(ctx, 'bg_cafe', CAFE.x, GROUND + 4, CAFE.w, { ax: 0.5, ay: 1 });
  // OPEN sign
  const ko = pop(t - t0 - 0.3);
  if (ko > 0) { ctx.save(); ctx.translate(CAFE.door, GROUND - 330); ctx.scale(ko, ko); ctx.rotate(Math.sin((t - t0) * 5) * 0.06 * Math.max(0, 1 - (t - t0))); ctx.fillStyle = '#6CC07A'; ctx.beginPath(); ctx.roundRect(-70, -28, 140, 56, 12); ctx.fill(); setFont(ctx, 30); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('OPEN', 0, 2); ctx.restore(); }
  // customers walk in
  const crowd = [['capper', 0.15], ['scientist', 0.45], ['coach', 0.75], ['capper', 1.05]];
  crowd.forEach(([who, d], i) => {
    const u = clamp((t - t0 - d) / 1.1); if (u <= 0) return;
    const x = lerp(W + 160, CAFE.door + 20, easeOut(u)), bob = u < 1 ? Math.abs(Math.sin((t - t0) * 11 + i)) * 12 : 0;
    actor(ctx, who, u < 1 ? 'stand' : 'cheer', x, GROUND - bob, { w: 230, flip: true, alpha: 1 - clamp((u - 0.85) / 0.15) });
  });
  actor(ctx, 'host', 'wave', 170, GROUND, { w: 260, k: pop(t - t0 - 0.1) });
}
function sceneCafe(ctx, t) {
  if (t < T_BOOM || t > 7.75) return;
  cafeScene(ctx, t, T_BOOM);
  // the letters of the script burst out
  const u = clamp((t - T_BOOM) / 0.9);
  if (u < 1) { const r = rnd(3); setFont(ctx, 64); ctx.save(); ctx.fillStyle = '#FBF8F2';
    for (let i = 0; i < SCRIPT_TXT.length; i++) { const ch = SCRIPT_TXT[i]; if (ch === ' ') continue; const a = r() * 6.283, d = easeOut(u) * (300 + r() * 800);
      ctx.save(); ctx.globalAlpha = 1 - u; ctx.translate(DOC.x + (i % 20 - 10) * 38 + Math.cos(a) * d, DOC.y + Math.floor(i / 20) * 80 + Math.sin(a) * d + u * u * 300); ctx.rotate(r() * 6 * u); ctx.fillText(ch, 0, 0); ctx.restore(); }
    ctx.restore(); }
  ripple(ctx, DOC.x, DOC.y, t, T_BOOM, { r: 600, n: 4 });
  speedLines(ctx, DOC.x, DOC.y, win(t, T_BOOM, T_BOOM + 0.35, 0.05, 0.25), 9);
  if (t < T_BOOM + 0.25) { ctx.fillStyle = `rgba(255,246,220,${0.7 * (1 - (t - T_BOOM) / 0.25)})`; ctx.fillRect(0, 0, W, H); }
  text(ctx, 'THIS.', W / 2, 330, 170, { k: win(t, T_BOOM, 6.9, 0.25, 0.2), fill: C.yellow, stroke: '#3A2A08', strokeW: 8, rot: -4 });
  badge(ctx, 'COFFEE SHOP AD', W / 2, 330, win(t, 6.95, 7.7));
  text(ctx, '+ CUSTOMERS', W / 2, 470, 70, { k: win(t, 6.7, 7.7), fill: C.gold, stroke: '#3A2A08', strokeW: 5 });
}

// ---------------------------------------------------------------- B4a (7.6–10.6): app launch, history Short, YouTube story
const T_APP = 7.75, T_HIST = 8.65, T_YT = 9.6, T_SAME = 10.6;
function appScene(ctx, t, t0) {
  world(ctx, t, 0.4);
  const k = pop(t - t0, 0.3), bob = Math.sin(t * 1.6) * 10;
  if (k > 0) { ctx.save(); ctx.translate(W / 2, 840 + bob); ctx.scale(k, k); ctx.translate(-W / 2, -840 - bob); phoneUI(ctx, W / 2 + 60, 840 + bob, 460, 900, t, t0 + 0.05); ctx.restore(); }
  productBox(ctx, 210, 1000 + Math.sin(t * 1.3) * 12, pop(t - t0 - 0.15, 0.3) * 1.1, t);
  const bx = 780; for (let i = 0; i < 3; i++) { const h = [120, 210, 320][i] * easeOut((t - t0 - 0.2 - i * 0.08) / 0.35); if (h <= 0) continue;
    ctx.fillStyle = C.rim; ctx.fillRect(bx + i * 80 + 4, GROUND - h - 3, 56, h); ctx.fillStyle = i === 2 ? C.coral : '#2A2D3A'; ctx.fillRect(bx + i * 80, GROUND - h, 56, h); }
  ripple(ctx, W / 2 + 60, 840 + 450 - 90, t, t0 + 0.55, { r: 140, n: 2, d: 0.5 });
}
function mapScene(ctx, t, t0) {
  ctx.fillStyle = C.teal; ctx.fillRect(0, 0, W, H);
  const M = p => [W / 2 + p[0] * W * 1.25, 300 + p[1] * H * 0.8];
  for (const poly of LAND) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); poly.forEach((p, i) => { const q = M(p); i ? ctx.lineTo(q[0] + 8, q[1] + 10) : ctx.moveTo(q[0] + 8, q[1] + 10); }); ctx.fill();
    ctx.fillStyle = C.olive; ctx.beginPath(); poly.forEach((p, i) => { const q = M(p); i ? ctx.lineTo(...q) : ctx.moveTo(...q); }); ctx.closePath(); ctx.fill();
  }
  const A = M([-0.25, 0.3]), B = M([0.32, 0.68]), Cc = [(A[0] + B[0]) / 2 + 160, Math.min(A[1], B[1]) - 120];
  const pts = []; for (let i = 0; i <= 60; i++) pts.push(quad(A, Cc, B, i / 60));
  const kr = clamp((t - t0 - 0.1) / 0.7);
  dotted(ctx, pts, kr, { color: C.yellow, step: 2, r: 6 });
  for (const [p, c, k] of [[A, C.coral, pop(t - t0)], [B, '#2F5D8C', pop(t - t0 - 0.6)]]) if (k > 0) { ctx.save(); ctx.translate(...p); ctx.scale(k * 1.6, k * 1.6); ctx.fillStyle = c; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -26, 18, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(0, 0); ctx.lineTo(8, -14); ctx.fill(); ctx.restore(); }
  if (kr > 0 && kr < 1) { const [px, py] = pts[Math.floor(kr * 60)]; orb(ctx, px, py, 18, '', 1); }
  text(ctx, 'WHAT IF…?', W / 2, 330, 96, { k: pop(t - t0), grad: ['#F9E27D', '#F4D03F'], stroke: '#3A2A08' });
}
function stadiumScene(ctx, t, t0) {
  sky(ctx, W / 2, 1050, 0.3);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [lx, dir] of [[120, 1], [960, -1]]) { const a = Math.PI / 2 + dir * (0.5 + 0.2 * Math.sin(t * 0.8)), g = ctx.createRadialGradient(lx, 820, 10, lx, 820, 1300); g.addColorStop(0, 'rgba(255,240,200,0.45)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, 820); ctx.arc(lx, 820, 1300, a - 0.12, a + 0.12); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  if (IMG.bg_stadium) ctx.drawImage(IMG.bg_stadium, -420, 780, 1920, 520);
  ctx.drawImage(CROWD, -460, 960, 2000, 230);
  ground(ctx, 1200, '#16241D');
  const kick = t > t0 + 0.25 && t < t0 + 0.55;
  actor(ctx, 'coach', 'point', 180, 1520, { w: 260 });
  actor(ctx, 'host', kick ? 'kick' : (t > t0 + 0.75 ? 'cheer' : 'stand'), 440, 1520, { w: 300 });
  const A = [560, 1500], B = [880, 860], Cc = [800, 560], u = clamp((t - t0 - 0.35) / 0.45);
  const pts = []; for (let i = 0; i <= 50; i++) pts.push(quad(A, Cc, B, i / 50));
  if (u > 0) dotted(ctx, pts, u, { step: 2, r: 5 });
  const bp = u > 0 ? quad(A, Cc, B, u) : A;
  if (u > 0 && u < 1) ghostTrail(ctx, d => { const q = quad(A, Cc, B, clamp(u - d)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q[0], q[1], 24, 0, 7); ctx.fill(); }, 4, 0.06, 0.6);
  ctx.fillStyle = '#F2F2F2'; ctx.beginPath(); ctx.arc(bp[0], bp[1], 24, 0, 7); ctx.fill();
  ripple(ctx, ...B, t, t0 + 0.8, { r: 220, n: 3 });
  text(ctx, 'x10', B[0] - 40, B[1] - 130, 100, { k: pop(t - t0 - 0.8), fill: C.yellow, stroke: '#3A2A08', rot: -6 });
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 90); ctx.fillRect(0, H - 90, W, 90);       // cinematic bars
}
function sceneMontage(ctx, t) {
  if (t < 7.55 || t > T_SAME + 0.1) return;
  let label;
  if (t < T_HIST) { appScene(ctx, t, T_APP); label = 'APP LAUNCH'; }
  else if (t < T_YT) { mapScene(ctx, t, T_HIST); label = 'HISTORY SHORT'; }
  else { stadiumScene(ctx, t, T_YT); label = 'YOUTUBE STORY'; }
  const t0 = t < T_HIST ? T_APP : t < T_YT ? T_HIST : T_YT;
  badge(ctx, label, W / 2, 210, pop(t - t0, 0.25));
  whip(ctx, t, T_APP); whip(ctx, t, T_HIST); whip(ctx, t, T_YT);
}

// ---------------------------------------------------------------- B4b (10.6–14.4): same idea — your words in, animation out
const T_WORDS = 11.6, T_OUT = 13.35;
function sceneSame(ctx, t) {
  if (t < T_SAME || t > 14.55) return;
  world(ctx, t, 0.45);
  text(ctx, 'SAME IDEA.', W / 2, 250, 104, { k: pop(t - T_SAME, 0.28), fill: C.white, stroke: C.rim, strokeW: 6 });
  // your words (a small script card)
  const kd = pop(t - (T_WORDS - 0.25), 0.3);
  if (kd > 0) docCard(ctx, t, W / 2, 560, 760, 300, 'Your idea, in a few lines.', 99, { k: kd, size: 50, title: 'your-words.txt' });
  chipPill(ctx, 'IN', W / 2 + 360, 420, pop(t - T_WORDS, 0.25), { size: 32 });
  // letters stream down into the screen
  if (t > 12.1 && t < T_OUT + 0.2) { const r = rnd(8); setFont(ctx, 44); ctx.fillStyle = '#FBF8F2'; ctx.textAlign = 'center';
    for (let i = 0; i < 26; i++) { const u = ((t - 12.1) * 1.4 + r()) % 1; const x = W / 2 + (r() - 0.5) * 520 * (1 - u), y = lerp(700, 1000, u);
      ctx.save(); ctx.globalAlpha = Math.sin(u * Math.PI); ctx.fillText('abcdefghijklmnopqrstuvwxyz'[i], x, y); ctx.restore(); } }
  const ka = clamp((t - 12.0) / 0.4);
  if (ka > 0) { ctx.save(); ctx.globalAlpha = ka; ctx.fillStyle = C.rim; ctx.beginPath(); const ay = 760 + Math.sin(t * 6) * 8;
    ctx.moveTo(W / 2 - 34, ay); ctx.lineTo(W / 2 + 34, ay); ctx.lineTo(W / 2 + 34, ay + 70); ctx.lineTo(W / 2 + 70, ay + 70); ctx.lineTo(W / 2, ay + 130); ctx.lineTo(W / 2 - 70, ay + 70); ctx.lineTo(W / 2 - 34, ay + 70); ctx.closePath(); ctx.fill(); ctx.restore(); }
  // animation out: a phone-shaped screen playing the scenes we just made
  const kf = pop(t - (T_OUT - 0.35), 0.35);
  if (kf > 0) {
    const fw = 420, fh = fw * 16 / 9, fx = W / 2, fy = 1330, sc = fw / W;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(kf, kf);
    ctx.fillStyle = C.rim; ctx.beginPath(); ctx.roundRect(-fw / 2 + 7, -fh / 2 - 5, fw + 4, fh, 34); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(-fw / 2 - 12, -fh / 2 - 12, fw + 24, fh + 24, 44); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-fw / 2, -fh / 2, fw, fh, 32); ctx.clip();
    ctx.translate(-fw / 2, -fh / 2); ctx.scale(sc, sc);
    const cyc = Math.floor(Math.max(0, t - T_OUT + 0.35) / 0.45) % 3;
    if (cyc === 0) cafeScene(ctx, t, T_OUT - 1.2); else if (cyc === 1) mapScene(ctx, t, T_OUT - 0.6); else stadiumScene(ctx, t, T_OUT - 0.1);
    ctx.restore();
  }
  chipPill(ctx, 'OUT', W / 2 + 270, 1330 - 373, pop(t - T_OUT, 0.25), { size: 32, bg: C.rim, fg: C.ink });
  ripple(ctx, W / 2, 1330, t, T_OUT, { r: 520, n: 3 });
}

// ---------------------------------------------------------------- B5 (14.4–19): your script could be next → link in bio
const T_NEXT = 14.55, T_LINK = 16.0;
const SEARCH = window.CTA === 'channel';  // YouTube: no clickable link yet, so viewers search the Freelancer username
const CTA_LABEL = SEARCH ? '@Slumboyx' : 'LINK IN BIO';
const CTA_TOP = SEARCH ? 'FIND ME ON FREELANCER' : 'HIRE ME ON FREELANCER';
function sceneEnd(ctx, t) {
  if (t < 14.4) return;
  world(ctx, t, 0);
  const cast = [['scientist', 190], ['host', 420], ['capper', 660], ['coach', 890]];
  cast.forEach(([who, x], i) => actor(ctx, who, t > T_NEXT + 0.9 + i * 0.1 ? 'cheer' : 'stand', x, GROUND, { w: 250, k: pop(t - T_NEXT - i * 0.12, 0.35) }));
  text(ctx, 'YOUR SCRIPT', W / 2, 300, 112, { k: pop(t - T_NEXT, 0.35), stroke: C.rim, strokeW: 7, spacing: 2 });
  text(ctx, 'COULD BE NEXT.', W / 2, 425, 112, { k: pop(t - T_NEXT - 0.15, 0.35), grad: ['#FBE29A', C.rim], stroke: '#3A2408', strokeW: 7, spacing: 2 });
  ripple(ctx, W / 2, 360, t, T_NEXT + 0.2, { r: 560, n: 3, squash: 0.45, w: 3 });
  const kl = pop(t - T_LINK + 0.2, 0.35);
  if (kl > 0) {
    text(ctx, CTA_TOP, W / 2, 1560, 52, { k: kl, spacing: 2 });
    const bob = Math.sin((t - T_LINK) * 7) * 8;
    ctx.save(); ctx.translate(W / 2, 1672 + bob); ctx.scale(kl, kl); setFont(ctx, 50); ctx.letterSpacing = SEARCH ? '1px' : '3px';
    const w = ctx.measureText(CTA_LABEL).width + 160; ctx.shadowColor = 'rgba(217,83,79,0.6)'; ctx.shadowBlur = 30;
    ctx.fillStyle = C.coral; ctx.beginPath(); ctx.roundRect(-w / 2, -54, w, 108, 54); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(CTA_LABEL, 26, 3);
    ctx.beginPath();
    if (SEARCH) { ctx.arc(-w / 2 + 50, -6, 15, 0, 7); ctx.moveTo(-w / 2 + 61, 5); ctx.lineTo(-w / 2 + 74, 18); }      // magnifier
    else { ctx.moveTo(-w / 2 + 54, 20); ctx.lineTo(-w / 2 + 54, -20); ctx.moveTo(-w / 2 + 38, -4); ctx.lineTo(-w / 2 + 54, -22); ctx.lineTo(-w / 2 + 70, -4); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    ripple(ctx, W / 2, 1672, t, T_LINK, { r: 320, n: 2, squash: 0.35, w: 3 });
  }
}

// ---------------------------------------------------------------- captions
const SUBS = [
  [0.05, 1.5, "Wait… don't scroll."], [1.55, 2.85, 'Give me ten seconds.'], [2.95, 5.4, 'You send me a script… like this.'],
  [5.45, 7.5, 'And I turn it into THIS.'], [7.6, 10.5, 'An app launch… a history Short… a YouTube story…'],
  [10.6, 14.35, 'Your words in… scroll-stopping animation out.'], [14.5, 15.9, 'Your script could be next.'],
  [15.95, 18.9, "Tap the link in my bio — let's bring it to life."],
];
let SUBS_ON = true;
function drawSubs(ctx, t) {
  if (!SUBS_ON) return;
  for (const [t0, t1, str] of SUBS) { const a = fade(t, t0, t1, 0.12); if (a <= 0) continue;
    const yc = t >= 14.4 ? 760 : t >= 10.6 && t < 14.4 ? 1840 - 60 : 1620;
    ctx.save(); ctx.globalAlpha = a; setFont(ctx, 50); const lines = []; let cur = '';
    for (const wd of str.split(' ')) { const tr = cur ? cur + ' ' + wd : wd; if (ctx.measureText(tr).width > 900 && cur) { lines.push(cur); cur = wd; } else cur = tr; } lines.push(cur);
    const lh = 64, y0 = yc - (lines.length - 1) * lh / 2, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 56;
    ctx.fillStyle = 'rgba(11,13,18,0.7)'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y0 - lh / 2 - 12, w, lines.length * lh + 24, 18); ctx.fill();
    ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh + 2)); ctx.restore(); }
}

// ---------------------------------------------------------------- compositor + player
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  sceneKnock(ctx, t); sceneScript(ctx, t); sceneCafe(ctx, t); sceneMontage(ctx, t); sceneSame(ctx, t); sceneEnd(ctx, t);
  timer(ctx, t);
  const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W, H);
  drawSubs(ctx, t);
  const fi = 1 - clamp(t / 0.2), fo = clamp((t - 18.88) / 0.12);
  if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
}
window.renderAt = renderAt; window.READY = false;
const SYNC = window.SYNC || null;
function storyAt(real) {
  if (!SYNC) return real; const k = SYNC.keys; if (real <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) if (real <= k[i + 1][0]) return lerp(k[i][1], k[i + 1][1], (real - k[i][0]) / (k[i + 1][0] - k[i][0] || 1));
  return k[k.length - 1][1];
}
loadAssets().then(() => {
  window.READY = true;
  const q = new URLSearchParams(location.search); if (q.has('nosubs')) SUBS_ON = false; if (q.has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play'), aud = document.getElementById('aud'), tm = document.getElementById('time'), sb = document.getElementById('subs');
  ctl.style.display = 'flex'; const DUR = SYNC ? SYNC.dur : DURATION; if (window.AUDIO) aud.src = window.AUDIO;
  let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(storyAt(t)); bar.value = t; tm.textContent = `${t.toFixed(1)} / ${DUR.toFixed(1)} s`; };
  const setPlay = p => { playing = p; btn.textContent = p ? '❚❚' : '▶'; last = performance.now(); if (window.AUDIO) { if (p) { aud.currentTime = t; aud.play().catch(() => {}); } else aud.pause(); } };
  btn.onclick = () => setPlay(!playing); sb.onclick = () => { SUBS_ON = !SUBS_ON; sb.textContent = SUBS_ON ? 'CC on' : 'CC off'; draw(); };
  bar.max = DUR; bar.oninput = () => { t = +bar.value; if (window.AUDIO) aud.currentTime = t; draw(); };
  const tick = now => { if (playing) { t = window.AUDIO && !aud.paused ? aud.currentTime : t + (now - last) / 1000; last = now; if (t >= DUR) { t = DUR; setPlay(false); } draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
