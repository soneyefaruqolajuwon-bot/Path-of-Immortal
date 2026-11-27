/* "One Red Paperclip" — true story, Slumx 2D Short (native 9:16, twilight rim-lit stickman style).
 * renderAt(t) draws storyboard time t (= voiceover time). */
'use strict';
const W = 1080, H = 1920, DURATION = 53.06, GROUND = 1440;
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
// ================================================================== One Red Paperclip — props
const RED = '#D7263D';
function paperclip(ctx, x, y, s, rot = 0, glow = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const p = new Path2D('M-14,40 L-14,-34 Q-14,-52 4,-52 Q22,-52 22,-34 L22,30 Q22,44 10,44 Q-2,44 -2,30 L-2,-22');
  if (glow) { ctx.shadowColor = '#FF6B6B'; ctx.shadowBlur = 30 * glow; }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 15; ctx.stroke(p); ctx.strokeStyle = RED; ctx.lineWidth = 9; ctx.stroke(p); ctx.restore();
}
function fishPen(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.fillStyle = '#2E86AB'; ctx.beginPath(); ctx.roundRect(-8, -10, 16, 80, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F39C12'; ctx.beginPath(); ctx.ellipse(0, -28, 22, 14, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-14, -2); ctx.lineTo(14, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(8, -31, 3.5, 0, 7); ctx.fill(); ctx.restore();
}
function doorknob(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.fillStyle = '#B8860B'; ctx.beginPath(); ctx.roundRect(-14, -6, 28, 50, 6); ctx.fill(); ctx.stroke();
  const g = ctx.createRadialGradient(-10, -30, 4, 0, -22, 34); g.addColorStop(0, '#FFE8A3'); g.addColorStop(1, '#C9932C'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -22, 30, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
}
function stove(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.fillStyle = '#2E7D32'; ctx.beginPath(); ctx.roundRect(-110, -70, 220, 70, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1B5E20'; ctx.fillRect(-110, -110, 220, 40); ctx.strokeRect(-110, -110, 220, 40);
  ctx.fillStyle = '#9AA3AE'; for (const bx of [-55, 55]) { ctx.beginPath(); ctx.ellipse(bx, -70, 34, 10, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  for (const bx of [-55, 55]) for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#FFB703' : '#4FC3F7'; ctx.beginPath(); ctx.ellipse(bx - 20 + i * 10, -84 - Math.random() * 0, 4, 9, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
function generator(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.fillStyle = '#C0392B'; ctx.beginPath(); ctx.roundRect(-120, -150, 240, 130, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2B2B33'; ctx.fillRect(-90, -120, 120, 70); ctx.strokeRect(-90, -120, 120, 70);
  ctx.fillStyle = '#F4D03F'; ctx.beginPath(); ctx.moveTo(70, -120); ctx.lineTo(50, -80); ctx.lineTo(66, -80); ctx.lineTo(56, -48); ctx.lineTo(90, -94); ctx.lineTo(72, -94); ctx.lineTo(84, -120); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2B2B33'; for (const wx of [-80, 80]) { ctx.beginPath(); ctx.arc(wx, -18, 22, 0, 7); ctx.fill(); ctx.stroke(); } ctx.restore();
}
function snowmobile(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.fillStyle = '#9AA3AE'; ctx.beginPath(); ctx.moveTo(-180, 0); ctx.lineTo(160, 0); ctx.quadraticCurveTo(200, 0, 200, -20); ctx.stroke();
  ctx.fillStyle = '#F4C430'; ctx.beginPath(); ctx.moveTo(-150, -30); ctx.lineTo(120, -30); ctx.quadraticCurveTo(190, -40, 170, -90); ctx.lineTo(60, -110); ctx.lineTo(-40, -90); ctx.lineTo(-150, -80); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.roundRect(-160, -40, 210, 34, 16); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9ED0E6'; ctx.beginPath(); ctx.moveTo(40, -108); ctx.lineTo(80, -150); ctx.lineTo(100, -104); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function van(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 7;
  ctx.fillStyle = '#F4F1EA'; ctx.beginPath(); ctx.roundRect(-200, -230, 260, 190, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E8E1D0'; ctx.beginPath(); ctx.moveTo(60, -170); ctx.lineTo(140, -170); ctx.lineTo(190, -110); ctx.lineTo(190, -40); ctx.lineTo(60, -40); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9ED0E6'; ctx.beginPath(); ctx.moveTo(80, -155); ctx.lineTo(132, -155); ctx.lineTo(168, -112); ctx.lineTo(80, -112); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2B2B33'; for (const wx of [-130, 120]) { ctx.beginPath(); ctx.arc(wx, -38, 36, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9AA3AE'; ctx.beginPath(); ctx.arc(wx, -38, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#2B2B33'; } ctx.restore();
}
function paper(ctx, x, y, s, lines, rot = -0.06) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = '#FBF6EA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillRect(-90, -120, 180, 240); ctx.strokeRect(-90, -120, 180, 240);
  setFont(ctx, 30); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, 0, -70 + i * 46));
  ctx.strokeStyle = '#2B3A67'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-60, 90); ctx.bezierCurveTo(-30, 60, 0, 110, 60, 80); ctx.stroke(); ctx.restore();
}
function snowGlobe(ctx, x, y, s, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.fillStyle = '#6B4423'; ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(50, 0); ctx.lineTo(40, -26); ctx.lineTo(-40, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
  const g = ctx.createRadialGradient(-16, -80, 6, 0, -66, 50); g.addColorStop(0, '#E8F7FF'); g.addColorStop(1, '#7FC8E8'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -66, 46, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.moveTo(-18, -32); ctx.lineTo(0, -64); ctx.lineTo(18, -32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; const r = rnd(5); for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = r() * 38; ctx.beginPath(); ctx.arc(Math.cos(a) * d, -66 + ((Math.sin(a) * d + t * 20) % 40), 3, 0, 7); ctx.fill(); }
  ctx.restore();
}
function clapper(ctx, x, y, s, open = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.fillStyle = '#2B2B33'; ctx.fillRect(-80, -50, 160, 110); ctx.strokeRect(-80, -50, 160, 110);
  setFont(ctx, 24); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MOVIE', 0, -6); ctx.fillText('ROLE', 0, 26);
  ctx.save(); ctx.translate(-80, -50); ctx.rotate(-0.5 * open); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, -26, 160, 26); ctx.strokeRect(0, -26, 160, 26); ctx.fillStyle = '#2B2B33';
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 32, -26); ctx.lineTo(28 + i * 32, -26); ctx.lineTo(16 + i * 32, 0); ctx.lineTo(-2 + i * 32, 0); ctx.closePath(); ctx.fill(); } ctx.restore(); ctx.restore();
}
function farmhouse(ctx, x, y, s, lit = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 8;
  ctx.fillStyle = '#E8D8B0'; ctx.fillRect(-200, -300, 400, 300); ctx.strokeRect(-200, -300, 400, 300);
  ctx.fillStyle = '#8E2B1E'; ctx.beginPath(); ctx.moveTo(-240, -290); ctx.lineTo(0, -470); ctx.lineTo(240, -290); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5A3B28'; ctx.fillRect(-40, -150, 80, 150); ctx.strokeRect(-40, -150, 80, 150);
  ctx.fillStyle = lit ? '#F7C46C' : '#2A2D3A'; for (const [wx, wy] of [[-140, -250], [80, -250], [-140, -130], [80, -130], [-30, -380]]) { ctx.fillRect(wx, wy, 60, 64); ctx.strokeRect(wx, wy, 60, 64); }
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-210, -20, 420, 20); ctx.strokeRect(-210, -20, 420, 20); ctx.restore();
}
function key(ctx, x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillStyle = '#F4D03F';
  ctx.beginPath(); ctx.arc(0, -30, 24, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, -30, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#F4D03F'; ctx.fillRect(-6, -8, 12, 70); ctx.strokeRect(-6, -8, 12, 70); ctx.fillRect(6, 40, 16, 8); ctx.fillRect(6, 54, 12, 8); ctx.restore();
}
function bulb(ctx, x, y, s, k) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.shadowColor = '#FFE3A3'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#FFE7B0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -20, 36, 0, 7); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#9AA3AE'; ctx.fillRect(-16, 12, 32, 22); ctx.strokeRect(-16, 12, 32, 22);
  ctx.strokeStyle = '#FFE3A3'; ctx.lineWidth = 6; for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 50, -20 + Math.sin(a) * 50); ctx.lineTo(Math.cos(a) * 70, -20 + Math.sin(a) * 70); ctx.stroke(); } ctx.restore();
}
const ITEMS = { clip: (c, x, y, s, t) => paperclip(c, x, y, s * 1.1, 0.3, 0.6), pen: (c, x, y, s) => fishPen(c, x, y, s * 1.3), knob: (c, x, y, s) => doorknob(c, x, y, s * 1.2), globe: (c, x, y, s, t) => snowGlobe(c, x, y, s, t),
  clap: (c, x, y, s) => clapper(c, x, y, s * 0.8), rent: (c, x, y, s) => paper(c, x + 40 * s, y - 20 * s, s * 0.6, ['RENT', 'PAID', '1 YEAR']), key: (c, x, y, s) => key(c, x, y, s * 1.2) };
// a character holding a prop in the front hand; the hand is redrawn on top of the prop (house rule)
function holding(ctx, who, x, w, item, t, o = {}) {
  const pose = o.pose || 'hold'; actor(ctx, who, pose, x, GROUND, { w, flip: o.flip });
  if (!item) return; let [hx, hy] = at(x, GROUND, w, ...HANDS[pose]); if (o.flip) hx = 2 * x - hx;
  ITEMS[item](ctx, hx, hy - 6 * w / 240, (o.s || 1) * w / 300, t);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(hx, hy, 10 * w / 240, 0, 7); ctx.fill();
}
function flashRing(ctx, x, y, t, t0, r = 160) { const u = (t - t0) / 0.45; if (u < 0 || u > 1) return; ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#FFE3A3'; ctx.lineWidth = 12 * (1 - u) + 2; ctx.beginPath(); ctx.arc(x, y, r * (0.3 + u), 0, 7); ctx.stroke();
  for (let i = 0; i < 10; i++) { const a = i * 0.628; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * (0.5 + u), y + Math.sin(a) * r * (0.5 + u)); ctx.lineTo(x + Math.cos(a) * r * (0.75 + u), y + Math.sin(a) * r * (0.75 + u)); ctx.stroke(); } ctx.restore(); }
function chipLabel(ctx, s, x, y, k, o = {}) {
  if (k <= 0.001) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, o.size || 40); const w = ctx.measureText(s).width + 60, h = (o.size || 40) * 1.7;
  ctx.fillStyle = o.bg || 'rgba(11,13,18,0.88)'; ctx.strokeStyle = o.stroke || C.rim; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 2); ctx.restore();
}
// TRADE #n counter (top-left), ticks up through each trade
const TRADES = [[10.6, 1], [13.09, 2], [14.84, 3], [16.16, 4], [17.43, 6], [18.34, 8], [19.5, 10], [23.84, 11], [26.14, 12], [33.21, 13], [41.77, 14]];
function tradeCounter(ctx, t) {
  if (t < 10.4 || t > 50.3) return; let n = 0, t0 = 0; for (const [tt, v] of TRADES) if (t >= tt) { n = v; t0 = tt; }
  const prev = TRADES.filter(([tt]) => tt < t0).map(([, v]) => v).pop() || 0, u = clamp((t - t0) / 0.35), shown = Math.round(lerp(prev, n, u));
  const k = popOut(50.3 - t) * (t < 10.8 ? pop(t - 10.4) : 1), bump = 1 + 0.18 * Math.max(0, 1 - (t - t0) / 0.3);
  ctx.save(); ctx.translate(200, 200); ctx.scale(k * bump, k * bump); ctx.fillStyle = 'rgba(11,13,18,0.88)'; ctx.strokeStyle = RED; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-150, -56, 300, 112, 24); ctx.fill(); ctx.stroke();
  paperclip(ctx, -100, 4, 0.85, 0.3); setFont(ctx, 26); ctx.fillStyle = '#E8E1D4'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('TRADE', -66, -20);
  setFont(ctx, 54); ctx.fillStyle = n >= 14 ? C.gold : '#FFFFFF'; ctx.fillText(`#${shown}`, -66, 22); setFont(ctx, 26); ctx.fillStyle = '#9AA3AE'; ctx.fillText('/14', 50, 26); ctx.restore();
}
function headline(ctx, s, k, o = {}) { let size = o.size || 84; setFont(ctx, size); const wd = ctx.measureText(s).width; if (wd > 900) size *= 900 / wd; text(ctx, s, W / 2, o.y || 330, size, { k, fill: o.fill || C.yellow, stroke: C.ink, strokeW: 8, rot: o.rot ?? -3 }); }
function commentBubble(ctx, s, x, y, k, rot) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k); setFont(ctx, 40); const w = ctx.measureText(s).width + 50;
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-w / 2, -40, w, 80, 20); ctx.moveTo(-20, 38); ctx.lineTo(-40, 70); ctx.lineTo(4, 38); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 2); ctx.restore(); }
// prairie town backdrop (Kipling, Saskatchewan): wide sky, grain elevators, low houses
function prairie(ctx, t) {
  sky(ctx, 760, 1180, 0.1); rays(ctx, 760, 1180, t, 0.8, 9, 1500);
  ctx.fillStyle = '#1A1D28'; ctx.fillRect(0, GROUND - 60, W, 60);
  const el = (x, h) => { ctx.fillStyle = '#12141C'; ctx.fillRect(x - 40, GROUND - h, 80, h); ctx.beginPath(); ctx.moveTo(x - 46, GROUND - h); ctx.lineTo(x, GROUND - h - 60); ctx.lineTo(x + 46, GROUND - h); ctx.closePath(); ctx.fill(); ctx.fillStyle = C.rim; ctx.fillRect(x + 36, GROUND - h, 4, h); };
  el(140, 360); el(230, 300);
  for (let i = 0; i < 6; i++) { const x = 380 + i * 120, hh = 90 + (i % 3) * 30; ctx.fillStyle = '#12141C'; ctx.fillRect(x, GROUND - hh, 90, hh); ctx.beginPath(); ctx.moveTo(x - 8, GROUND - hh); ctx.lineTo(x + 45, GROUND - hh - 40); ctx.lineTo(x + 98, GROUND - hh); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#F7C46C'; ctx.fillRect(x + 30, GROUND - hh + 24, 26, 26); }
  ground(ctx, GROUND, '#151821');
}
function hollywood(ctx, t) {
  sky(ctx, 300, 1100, 0.15); rays(ctx, 300, 1100, t, 0.7, 9, 1500);
  ctx.fillStyle = '#1A1D28'; ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(0, 1050); ctx.quadraticCurveTo(300, 860, 620, 1000); ctx.quadraticCurveTo(860, 900, 1080, 1010); ctx.lineTo(1080, GROUND); ctx.closePath(); ctx.fill();
  setFont(ctx, 58); ctx.fillStyle = '#F4F1E6'; ctx.textAlign = 'center'; ctx.letterSpacing = '8px'; ctx.fillText('HOLLYWOOD', 330, 960); ctx.letterSpacing = '0px';
  ground(ctx, GROUND);
}

// ================================================================== the story (voice clock, 0–53.06 s)
function scene(ctx, t) {
  // ---------- B1 (0–5.75): 2005, Kyle, one red paperclip, a crazy idea
  if (t < 5.8) {
    world(ctx, t);
    if (t < 1.35) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H); paperclip(ctx, W / 2, 900, 4.2 + 0.1 * Math.sin(t * 6), 0.3, 1); headline(ctx, '📎 → 🏠 ?', 1, { size: 130, y: 380, rot: -2 }); headline(ctx, 'ONE PAPERCLIP. ONE HOUSE.', 1, { size: 62, y: 520, fill: '#FFFFFF', rot: -2 }); return; }
    const wu = easeOut((t - 1.35) / 0.9), kx = lerp(-150, 420, wu);
    if (t < 2.25) actor(ctx, 'kyle', Math.floor(t * 8) % 2 ? 'run_a' : 'run_b', kx, GROUND, { w: 320 });
    else holding(ctx, 'kyle', 420, 320, t > 2.95 ? 'clip' : null, t, { pose: t > 2.95 ? 'hold' : 'wave', s: 1.15 });
    chipLabel(ctx, '2005 · CANADA 🇨🇦', W / 2, 300, win(t, 1.4, 3.0), { size: 44 });
    chipLabel(ctx, 'KYLE', 420, 880, win(t, 2.3, 4.2), { size: 40 });
    if (t > 3.0) flashRing(ctx, ...at(420, GROUND, 320, ...HANDS.hold), t, 3.0, 120);
    headline(ctx, '1 RED PAPERCLIP', win(t, 3.1, 4.3), { size: 88 });
    bulb(ctx, 560, 780, 1.1, pop(t - 4.3)); headline(ctx, 'A CRAZY IDEA', win(t, 4.4, 5.7), { size: 92 });
  }
  // ---------- B2 (5.75–11.63): post online; two women swap a fish pen
  if (t > 5.7 && t < 11.7) {
    world(ctx, t);
    const swap = clamp((t - 10.3) / 0.6);
    if (t < 8.85) { actor(ctx, 'kyle', 'phone', 360, GROUND, { w: 320 });
      const k = pop(t - 6.0, 0.3); ctx.save(); ctx.translate(760, 860); ctx.scale(k, k); ctx.fillStyle = '#12141C'; ctx.strokeStyle = C.rim; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-230, -330, 460, 660, 40); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#F4F1EA'; ctx.beginPath(); ctx.roundRect(-200, -290, 400, 580, 22); ctx.fill(); setFont(ctx, 30); ctx.fillStyle = '#2B3A67'; ctx.textAlign = 'left'; ctx.fillText('NEW POST', -170, -240);
        paperclip(ctx, 0, -80, 2.2, 0.3); const msg = "I'll trade this for something bigger."; setFont(ctx, 30); ctx.fillStyle = C.ink; const n = Math.floor(clamp((t - 7.0) / 1.2) * msg.length);
        const s = msg.slice(0, n); ctx.fillText(s.slice(0, 20), -170, 110); ctx.fillText(s.slice(20), -170, 152); ctx.fillStyle = '#2ECC71'; ctx.beginPath(); ctx.roundRect(-80, 200, 160, 54, 16); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('POST', 0, 228); ctx.restore(); }
    else {
      holding(ctx, 'kyle', 300, 320, swap < 0.5 ? 'clip' : 'pen', t, { s: swap < 0.5 ? 1.4 : 1 });
      const wu = easeOut((t - 8.85) / 0.9);
      actor(ctx, 'ana', t < 9.75 ? 'stand' : 'wave', lerp(1250, 900, wu), GROUND, { w: 300, flip: true });
      holding(ctx, 'jill', lerp(1150, 720, wu), 300, swap < 0.5 ? 'pen' : 'clip', t, { flip: true, s: swap < 0.5 ? 1 : 1.4 });
      if (swap > 0 && swap < 1) { const a = at(300, GROUND, 320, ...HANDS.hold), b = [2 * 720 - at(720, GROUND, 300, ...HANDS.hold)[0], at(720, GROUND, 300, ...HANDS.hold)[1]], m = [(a[0] + b[0]) / 2, a[1] - 220];
        const p1 = quad(a, m, b, swap), p2 = quad(b, [m[0], m[1] - 80], a, swap); paperclip(ctx, ...p1, 1.6, swap * 6); fishPen(ctx, ...p2, 1.3); }
      chipLabel(ctx, 'TWO STRANGERS', W / 2, 300, win(t, 8.9, 10.3), { size: 44 });
      if (t > 10.6) { flashRing(ctx, ...at(300, GROUND, 320, ...HANDS.hold), t, 10.6); headline(ctx, 'A FISH PEN 🐟', win(t, 10.6, 11.6), { size: 88 }); }
    }
  }
  // ---------- B3 (11.63–20.86): the trade-up montage
  if (t > 11.6 && t < 20.9) {
    world(ctx, t);
    const seq = [[11.6, 'pen', 'FISH PEN'], [13.09, 'knob', 'DOORKNOB'], [14.84, 'stove', 'CAMPING STOVE'], [16.16, 'gen', 'GENERATOR'], [17.43, 'sled', 'SNOWMOBILE'], [18.34, 'van', 'A VAN'], [19.5, 'rent', '1 YEAR FREE RENT']];
    let cur = seq[0]; for (const s of seq) if (t >= s[0]) cur = s; const [t0, it, lab] = cur, k = t0 === 11.6 ? 1 : pop(t - t0, 0.28);
    const held = ['pen', 'knob', 'rent'].includes(it);
    holding(ctx, 'kyle', 300, 320, held ? it : null, t, { pose: held ? 'hold' : (Math.floor(t * 2.5) % 2 ? 'cheer' : 'point'), s: k * (it === 'rent' ? 1.3 : 1.2) });
    const gx = 740;
    if (it === 'stove') stove(ctx, gx, GROUND, 1.25 * k); if (it === 'gen') generator(ctx, gx, GROUND, 1.2 * k); if (it === 'sled') snowmobile(ctx, gx, GROUND, 1.25 * k); if (it === 'van') van(ctx, gx + 20, GROUND, 1.25 * k);
    if (t0 > 11.6) { flashRing(ctx, held ? at(300, GROUND, 320, ...HANDS.hold)[0] : gx, held ? at(300, GROUND, 320, ...HANDS.hold)[1] : GROUND - 140, t, t0, 200); speedLines(ctx, W / 2, 900, clamp(1 - (t - t0) / 0.4), Math.floor(t0)); }
    chipLabel(ctx, lab, W / 2, 330, k * popOut(seq[seq.indexOf(cur) + 1] ? seq[seq.indexOf(cur) + 1][0] - t : 20.8 - t, 0.1), { size: 52, stroke: C.gold });
    // the "size" meter: every trade is bigger
    const lvl = (seq.indexOf(cur) + 1) / 9; ctx.save(); ctx.translate(980, 1000); ctx.fillStyle = 'rgba(11,13,18,0.8)'; ctx.fillRect(-26, -360, 52, 360); ctx.fillStyle = C.gold; ctx.fillRect(-20, -6 - 348 * lvl, 40, 348 * lvl); setFont(ctx, 22); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('VALUE', 0, 30); ctx.restore();
  }
  // ---------- B4 (20.86–27.13): the "stupid" trade: an afternoon with a rock legend… for a snow globe
  if (t > 20.85 && t < 27.2) {
    world(ctx, t, 0.25);
    if (t < 23.35) {
      ctx.fillStyle = 'rgba(120,20,30,0.45)'; ctx.fillRect(0, 0, W, H);
      actor(ctx, 'kyle', 'shock', W / 2, GROUND, { w: 340 });
      [['😂 BAD TRADE', 260, 560, -0.12, 21.6], ['WHY?!', 820, 640, 0.1, 21.9], ["HE'S LOST IT", 300, 820, 0.08, 22.2], ['NO WAY 💀', 800, 900, -0.08, 22.45], ['🤡🤡🤡', 540, 420, 0.04, 22.7]].forEach(([s, x, y, r, t0]) => commentBubble(ctx, s, x, y, pop(t - t0, 0.22), r));
      headline(ctx, 'THE "STUPID" TRADE', win(t, 21.0, 23.3), { size: 84, y: 300 });
    } else {
      holding(ctx, 'kyle', 300, 320, t > 26.1 ? 'globe' : null, t, { pose: t > 26.1 ? 'hold' : 'point', s: 1.1 });
      const rx = t < 26.0 ? 780 : lerp(780, 1400, easeIn((t - 26.0) / 0.8)); actor(ctx, 'rocker', Math.floor(t * 3) % 2 ? 'cheer' : 'point', rx, GROUND, { w: 330, flip: true, k: pop(t - 23.6) });
      if (t < 26.0) { chipLabel(ctx, '🎸 A ROCK LEGEND', 780, 900, win(t, 24.4, 26.0), { size: 40 }); chipLabel(ctx, '⏰ ONE AFTERNOON', W / 2, 330, win(t, 23.5, 25.9), { size: 48 }); }
      if (t > 26.1) { flashRing(ctx, ...at(300, GROUND, 320, ...HANDS.hold), t, 26.14); headline(ctx, '…FOR A SNOW GLOBE?!', win(t, 26.1, 27.1), { size: 80, y: 330 });
        commentBubble(ctx, '😭😭', 820, 620, pop(t - 26.4, 0.2), 0.1); }
    }
  }
  // ---------- B5 (27.13–34.9): Kyle knew something: an actor obsessed with snow globes → a movie role
  if (t > 27.1 && t < 34.95) {
    if (t < 28.55) { world(ctx, t); holding(ctx, 'kyle', 420, 330, 'globe', t, { s: 1.1 }); bulb(ctx, 600, 760, 1.1, pop(t - 27.7)); headline(ctx, 'BUT KYLE KNEW SOMETHING…', win(t, 27.2, 28.55), { size: 70 }); }
    else {
      hollywood(ctx, t);
      // shelves of snow globes behind the actor (pop in on "obsessed")
      if (t > 30.1) { for (let row = 0; row < 2; row++) { ctx.fillStyle = '#5A3B28'; ctx.fillRect(560, 620 + row * 160, 480, 16); for (let i = 0; i < 6; i++) snowGlobe(ctx, 600 + i * 78, 620 + row * 160, 0.6 * pop(t - 30.15 - (row * 6 + i) * 0.04, 0.2), t); } }
      const give = clamp((t - 31.8) / 0.7);
      holding(ctx, 'kyle', 250, 300, give < 0.5 ? 'globe' : (t > 33.2 ? 'clap' : null), t, { s: 1.1 });
      holding(ctx, 'actor', 800, 320, give >= 1 ? 'globe' : null, t, { flip: true, pose: give >= 1 ? 'hold' : 'stand', s: 1.1 });
      if (give > 0 && give < 1) { const a = at(250, GROUND, 300, ...HANDS.hold), b = [2 * 800 - at(800, GROUND, 320, ...HANDS.hold)[0], at(800, GROUND, 320, ...HANDS.hold)[1]]; snowGlobe(ctx, ...quad(a, [(a[0] + b[0]) / 2, a[1] - 260], b, give), 1.0, t); }
      if (t > 32.6 && t < 33.2) { const u = (t - 32.6) / 0.6, a = [2 * 800 - at(800, GROUND, 320, ...HANDS.hold)[0], at(800, GROUND, 320, ...HANDS.hold)[1]], b = at(250, GROUND, 300, ...HANDS.hold); clapper(ctx, ...quad(a, [(a[0] + b[0]) / 2, a[1] - 260], b, u), 0.8, 1); }
      if (give >= 1) for (let i = 0; i < 3; i++) heart(ctx, 760 + i * 40, 760 - ((t * 60 + i * 40) % 160), 1.4, 0.9);
      chipLabel(ctx, '🎬 HOLLYWOOD ACTOR', W / 2, 300, win(t, 28.6, 30.1), { size: 46 });
      headline(ctx, 'OBSESSED WITH SNOW GLOBES', win(t, 30.2, 31.75), { size: 66 });
      if (t > 33.2) { flashRing(ctx, ...at(250, GROUND, 300, ...HANDS.hold), t, 33.21); headline(ctx, 'A REAL MOVIE ROLE 🎬', win(t, 33.2, 34.85), { size: 80 }); }
    }
  }
  // ---------- B6 (34.9–40.96): Kipling, Saskatchewan makes the final offer: the house (silhouette tease, then reveal)
  if (t > 34.85 && t < 41.0) {
    prairie(ctx, t);
    const hk = clamp((t - 38.9) / 0.5);
    if (hk > 0) { ctx.save(); if (t < 40.15) ctx.filter = 'brightness(0)'; farmhouse(ctx, 760, GROUND, 0.95 * easeOut(hk), t >= 40.15); ctx.restore(); if (t < 40.15) { ctx.save(); ctx.globalAlpha = 0.9; setFont(ctx, 120); ctx.fillStyle = C.yellow; ctx.textAlign = 'center'; ctx.fillText('?', 760, GROUND - 230); ctx.restore(); } else flashRing(ctx, 760, GROUND - 230, t, 40.16, 300); }
    // town sign
    const sk = pop(t - 35.4); ctx.save(); ctx.translate(250, GROUND); ctx.scale(sk, sk); ctx.fillStyle = '#5A3B28'; ctx.fillRect(-8, -200, 16, 200); ctx.fillRect(150, -200, 16, 200); ctx.fillStyle = '#2E6B4F'; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-60, -330, 290, 140, 12); ctx.fill(); ctx.stroke();
    setFont(ctx, 40); ctx.fillStyle = '#F4F1E6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('KIPLING', 85, -285); setFont(ctx, 22); ctx.fillText('SASKATCHEWAN', 85, -238); ctx.restore();
    const mk = pop(t - 36.8); actor(ctx, 'mayor', t > 38.4 ? 'point' : 'stand', 580, GROUND, { w: 310, k: mk });
    chipLabel(ctx, 'A TINY TOWN', W / 2, 300, win(t, 35.3, 37.3), { size: 46 });
    headline(ctx, 'THE FINAL OFFER', win(t, 37.4, 38.5), { size: 84 });
    if (t > 38.5 && t < 40.1) bubble(ctx, 640, 620, 'GIVE US THE\nMOVIE ROLE…', win(t, 38.5, 40.1, 0.2, 0.1), [-60, 120]);
    if (t > 40.15) headline(ctx, '…AND YOU GET A HOUSE 🏠', win(t, 40.15, 40.95), { size: 70 });
  }
  // ---------- B7 (40.96–45.64): one year, fourteen trades, the keys
  if (t > 40.95 && t < 45.7) {
    prairie(ctx, t); farmhouse(ctx, 760, GROUND, 0.95, 1);
    const keyGiven = t > 44.3;
    actor(ctx, 'mayor', t > 43.9 && t < 44.4 ? 'hold' : 'stand', 980, GROUND, { w: 280, flip: true });
    holding(ctx, 'kyle', 330, 320, keyGiven ? 'key' : null, t, { pose: keyGiven ? 'cheer' : 'stand' });
    if (t > 43.9 && t < 44.4) { const u = (t - 43.9) / 0.5; key(ctx, lerp(900, 380, u), lerp(1080, 1000, u) - Math.sin(u * Math.PI) * 160, 1.4, u * 6); }
    if (keyGiven) { const [hx, hy] = at(330, GROUND, 320, ...HANDS.cheer); key(ctx, hx, hy - 30, 1.4, 0.3); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(hx, hy, 13, 0, 7); ctx.fill();
      const r = rnd(9); for (let i = 0; i < 40; i++) { const u = ((t - 44.3) * 0.6 + r()) % 1; ctx.fillStyle = [C.gold, RED, '#2ECC71', '#4FC3F7'][i % 4]; ctx.fillRect(r() * W, u * 1400, 12, 18); } }
    headline(ctx, 'ONE YEAR.', win(t, 41.0, 41.75), { size: 96 });
    headline(ctx, '14 TRADES.', win(t, 41.77, 42.95), { size: 110, fill: C.gold });
    // the whole chain, sliding past
    if (t > 42.95 && t < 44.1) { const u = (t - 42.95) / 1.15; ctx.save(); ctx.fillStyle = 'rgba(11,13,18,0.82)'; ctx.fillRect(0, 230, W, 220); ctx.translate(lerp(900, -1500, u), 340);
      const chain = [c => paperclip(c, 0, 10, 1.1, 0.3), c => fishPen(c, 0, 10, 1.0), c => doorknob(c, 0, 30, 1.0), c => stove(c, 0, 50, 0.45), c => generator(c, 0, 70, 0.45), c => snowmobile(c, 0, 50, 0.4), c => van(c, 0, 70, 0.35), c => paper(c, 0, 0, 0.6, ['RENT', 'PAID']), c => snowGlobe(c, 0, 60, 0.9, t), c => clapper(c, 0, 10, 0.6), c => farmhouse(c, 0, 80, 0.3)];
      chain.forEach((f, i) => { ctx.save(); ctx.translate(i * 230, 0); f(ctx); ctx.restore(); if (i < chain.length - 1) { setFont(ctx, 50); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.fillText('→', i * 230 + 115, 20); } }); ctx.restore(); }
    if (keyGiven) headline(ctx, 'THE KEYS TO A REAL HOME 🔑', win(t, 44.3, 45.6), { size: 64 });
  }
  // ---------- B8 (45.64–53.06): the giant red paperclip
  if (t > 45.6) {
    prairie(ctx, t); farmhouse(ctx, 760, GROUND, 0.95, 1);
    const g = easeOut(clamp((t - 46.2) / 1.0)); if (g > 0) { ctx.save(); ctx.translate(250, GROUND); paperclip(ctx, 0, -380 * g, 8.5 * g, 0, 0.4); ctx.fillStyle = '#5A5F6B'; ctx.fillRect(-80, -20, 160, 20); ctx.restore(); }
    actor(ctx, 'kyle', 'cheer', 520, GROUND, { w: 230 }); actor(ctx, 'mayor', t > 48.4 ? 'point' : 'wave', 960, GROUND, { w: 250, flip: true });
    if (t > 48.5 && t < 50.4) { clapper(ctx, 860, 1010, 0.7, Math.abs(Math.sin((t - 48.5) * 6))); }
    headline(ctx, 'A GIANT RED PAPERCLIP 📎', win(t, 46.3, 47.75), { size: 66 });
  }
}
const QUESTION = 'WHAT WOULD YOU\nTRADE FIRST? 👇';
const SUBS = [
  [0.0, 1.3, ''], [1.3, 4.2, 'In 2005, a guy in Canada named Kyle had one red paperclip…'], [4.25, 5.7, '…and a crazy idea.'],
  [5.8, 8.8, 'He posted it online: "I\'ll trade this for something bigger."'], [8.85, 11.55, 'Two women swapped him a pen… shaped like a fish.'],
  [11.7, 13.75, 'He traded the pen for a handmade doorknob.'], [13.8, 16.95, 'The doorknob for a camping stove. The stove for a generator.'], [17.0, 20.75, 'Then came a snowmobile… a van… even a whole year of free rent.'],
  [20.9, 23.3, 'Then he made the trade everyone called stupid.'], [23.35, 27.05, 'He swapped an afternoon with rock legend Alice Cooper… for a snow globe.'],
  [27.2, 28.5, 'But Kyle knew something.'], [28.55, 31.7, 'Hollywood actor Corbin Bernsen was OBSESSED with snow globes.'], [31.75, 34.8, 'And for that one… Corbin gave him a role in a real movie.'],
  [34.95, 38.45, 'Then a tiny town in Saskatchewan called Kipling made the final offer.'], [38.5, 40.9, 'Give us the movie role… and you can have a house.'],
  [41.0, 42.9, 'One year. Fourteen trades.'], [42.95, 45.55, 'From a paperclip… to the keys of a real home.'],
  [45.7, 47.75, 'And the town built a giant red paperclip…'], [47.8, 50.25, '…to remember the day it traded a house for a movie role.'],
];
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#07090F'; ctx.fillRect(0, 0, W, H);
  scene(ctx, t); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  tradeCounter(ctx, t);
  // end: dim, question stays, Slumx sign-off
  if (t > 50.3) { ctx.fillStyle = `rgba(7,9,15,${0.82 * clamp((t - 50.3) / 0.4)})`; ctx.fillRect(0, 0, W, H); }
  if (t > 47.8) { const y = t < 50.3 ? 470 : lerp(470, 760, easeIO((t - 50.3) / 0.5)); text(ctx, QUESTION.split('\n')[0], W / 2, y - 50, 70, { k: pop(t - 47.85), fill: C.yellow, stroke: C.ink, strokeW: 8, rot: -2 }); text(ctx, QUESTION.split('\n')[1], W / 2, y + 40, 70, { k: pop(t - 47.95), fill: C.yellow, stroke: C.ink, strokeW: 8, rot: -2 }); }
  if (t > 50.6) { const ks = pop(t - 50.6, 0.4); ctx.save(); ctx.globalAlpha = clamp(ks); paperclip(ctx, W / 2, 1180, 2.4 * ks, 0.3, 1); setFont(ctx, 30); ctx.fillStyle = '#E8E1D4'; ctx.textAlign = 'center'; ctx.letterSpacing = '4px'; ctx.fillText('STORIES ANIMATED BY', W / 2, 1420);
    ctx.font = 'italic 700 72px Georgia, serif'; ctx.fillStyle = C.gold; ctx.letterSpacing = '0px'; ctx.fillText('Slumx', W / 2, 1500); ctx.restore(); }
  const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W, H);
  if (!new URLSearchParams(location.search).has('nosubs')) for (const [t0, t1, s] of SUBS) caption(ctx, s, t, t0, t1);
}
function caption(ctx, str, t, t0, t1) {
  if (!str) return; const a = fade(t, t0, t1, 0.1); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; setFont(ctx, 50);
  const lines = []; let cur = ''; for (const wd of str.split(' ')) { const tr = cur ? cur + ' ' + wd : wd; if (ctx.measureText(tr).width > 920 && cur) { lines.push(cur); cur = wd; } else cur = tr; } lines.push(cur);
  const lh = 64, y0 = 1660 - (lines.length - 1) * lh / 2, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 56;
  ctx.fillStyle = 'rgba(11,13,18,0.75)'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y0 - lh / 2 - 12, w, lines.length * lh + 24, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh + 2)); ctx.restore();
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
