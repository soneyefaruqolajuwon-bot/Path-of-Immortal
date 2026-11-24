/* Why all of China runs on one clock — Mapheld 9:16 short. renderAt(t) draws storyboard time t (= voiceover time).
   Historic zones and US zones are drawn as simple meridian bands (stylised). */
'use strict';
const W = 1080, H = 1920, DURATION = 63.5;
const C = {
  ocean: '#1E4D5C', land: '#8A855C', landDim: '#6E6B50', coast: '#2C3531', halo: '#2C6A78', ink: '#141416',
  gold: '#F4D03F', goldDark: '#3A2A08', yellow: '#FFD43B', cyan: '#25E3FF', white: '#FFFFFF',
  usRed: '#B22234', usBlue: '#3C3B6E',
};
const CAPTION = { size: 66, y: 1600, font: 'Montserrat', shadow: 4 };   // spec said 48px; 64 reads better on phones


// ------------------------------------------------------------------ math / easing
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = t => Math.pow(clamp(t), 3);
const back = (t, s = 1.9) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
const pop = (dt, d = 0.32) => dt <= 0 ? 0 : back(dt / d);
const popOut = (left, d = 0.22) => left >= d ? 1 : easeOut(Math.max(0, left) / d);
const win = (t, t0, t1, fin = .32, fout = .22) => (t < t0 || t > t1) ? 0 : pop(t - t0, fin) * popOut(t1 - t, fout);
const wob = (t, f, a, ph = 0) => Math.sin(t * f * 2 * Math.PI + ph) * a;
const LOOPF = n => n * 2 * Math.PI / DURATION;          // frequencies that loop cleanly at t = 93
const mercY = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI;
function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

// ------------------------------------------------------------------ camera
const V = {
  china: [103.0, 36.0, 14.0],
  west: [82.0, 40.0, 42],
  wide: [104.0, 35.0, 12],
};
const KEYS = [
  [0, 'china', 1.0], [4.2, 'china', 1.03], [5.3, 'west', 1], [7.2, 'west', 1.02], [8.4, 'china', 1], [26.6, 'china', 1.03],
  [40.6, 'china', 1], [42.0, 'west', 1], [52.2, 'west', 1.03], [53.6, 'china', 1], [56.0, 'china', 1.02], [60.5, 'wide', 1], [63.5, 'wide', 1.03],
];
function camAt(t) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= t) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const u = clamp((t - a[0]) / (b[0] - a[0]));
  const va = V[a[1]], vb = V[b[1]];
  const z0 = va[2] * a[2], z1 = vb[2] * b[2];
  const big = Math.abs(Math.log(z1 / z0)) > 0.4;
  const ue = big ? easeIO(u) : u * 0.2 + easeIO(u) * 0.8;
  const z = Math.exp(lerp(Math.log(z0), Math.log(z1), ue));
  const x0 = va[0], y0 = -mercY(va[1]), x1 = vb[0], y1 = -mercY(vb[1]);
  const w = big ? (1 / z0 - 1 / z) / (1 / z0 - 1 / z1) : ue;
  return { cx: lerp(x0, x1, w), cy: lerp(y0, y1, w), z, rot: lerp(a[3] || 0, b[3] || 0, ue), tilt: lerp(a[4] || 1, b[4] || 1, ue), sx: W / 2, sy: H * 0.5 };
}
function camMatrix(c) {
  return new DOMMatrix().translate(c.sx, c.sy).rotate(c.rot).scale(c.z, c.z * c.tilt).translate(-c.cx, -c.cy);
}
function P(c, lon, lat) {
  const p = camMatrix(c).transformPoint(new DOMPoint(lon, -mercY(lat)));
  return [p.x, p.y];
}

// ------------------------------------------------------------------ assets
const IMG = {};
let NOISE, NOISE_FINE, PATHS = {};
function loadAssets() {
  const jobs = Object.entries(window.ASSETS).map(([k, src]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => { console.warn('asset', k); res(); }; im.src = src;
  }));
  for (const key of ['wide', 'usland', 'chn', 'usOnChina', 'usMain']) {
    PATHS[key] = GEO[key].map(r => {
      const p = new Path2D();
      for (let i = 0; i < r.length; i += 2) {
        const x = r[i], y = -mercY(r[i + 1]);
        i ? p.lineTo(x, y) : p.moveTo(x, y);
      }
      p.closePath();
      return p;
    });
  }
  NOISE = noiseTile(256, 10, 0.035);
  NOISE_FINE = noiseTile(256, 1.5, 0.025);
  const fonts = ['800 84px "Playfair Display"', '800 64px "Montserrat"'].map(f => document.fonts.load(f));
  return Promise.all([...jobs, ...fonts]).then(() => document.fonts.ready);
}
function noiseTile(n, blob, amp) {
  const cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'); const r = rnd(n * 7 + blob * 13);
  for (let i = 0; i < n * n / (blob * blob) * 0.8; i++) {
    const x = r() * n, y = r() * n, rad = blob * (0.5 + r());
    g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${amp * r()})` : `rgba(0,0,0,${amp * r()})`;
    for (const [dx, dy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) { g.beginPath(); g.arc(x + dx, y + dy, rad, 0, 7); g.fill(); }
  }
  return cv;
}

// ------------------------------------------------------------------ map
function drawMap(ctx, c) {
  ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.fillStyle = ctx.createPattern(NOISE, 'repeat');
  ctx.translate(-(c.cx * 40 % 256), -(c.cy * 40 % 256)); ctx.fillRect(0, 0, W + 512, H + 512); ctx.restore();
  const set = c.cx < 0 ? PATHS.usland : PATHS.wide;
  const M = camMatrix(c);
  const fillAll = () => { for (const p of set) ctx.fill(p, 'evenodd'); };
  // drop shadow
  ctx.save(); ctx.setTransform(new DOMMatrix().translate(7, 10).multiply(M));
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; fillAll(); ctx.restore();
  // shallow halo
  ctx.save(); ctx.setTransform(M); ctx.strokeStyle = 'rgba(44,106,120,0.55)'; ctx.lineWidth = 14 / c.z; ctx.lineJoin = 'round';
  for (const p of set) ctx.stroke(p);
  ctx.fillStyle = C.land; fillAll();
  ctx.restore();
  // texture
  ctx.save(); ctx.setTransform(M);
  const clip = new Path2D(); for (const p of set) clip.addPath(p);
  ctx.clip(clip, 'evenodd'); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.globalAlpha = 0.9; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save(); ctx.setTransform(M); ctx.fillStyle = 'rgba(20,30,28,0.25)'; fillAll(); if (c.cx > 0) { ctx.fillStyle = C.land; for (const p of PATHS.chn) ctx.fill(p); } ctx.restore();
  ctx.save(); ctx.setTransform(M); ctx.strokeStyle = C.coast; ctx.lineWidth = 2.6 / c.z; ctx.lineJoin = 'round'; for (const p of set) ctx.stroke(p); ctx.restore();
}

function geoLine(ctx, c, pts, k, color, width, dash, glow) {
  const sp = pts.map(p => P(c, p[0], p[1]));
  const path = partial(sp, k); if (!path) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (glow) for (const [m, a] of [[5, .12], [2.6, .25]]) { ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = width * m; ctx.stroke(path); }
  ctx.globalAlpha = 1; if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = width + 4; ctx.stroke(path);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(path); ctx.restore();
}
function partial(sp, k) {
  if (k <= 0 || sp.length < 2) return null;  // callers check for null
  const seg = []; let tot = 0;
  for (let i = 0; i < sp.length - 1; i++) { const d = Math.hypot(sp[i + 1][0] - sp[i][0], sp[i + 1][1] - sp[i][1]); seg.push(d); tot += d; }
  const target = tot * clamp(k); const p = new Path2D(); p.moveTo(...sp[0]); let acc = 0;
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= target) { const f = (target - acc) / (seg[i] || 1); p.lineTo(lerp(sp[i][0], sp[i + 1][0], f), lerp(sp[i][1], sp[i + 1][1], f)); return p; }
    p.lineTo(...sp[i + 1]); acc += seg[i];
  }
  return p;
}
function pointAlong(sp, k) {
  const seg = []; let tot = 0;
  for (let i = 0; i < sp.length - 1; i++) { const d = Math.hypot(sp[i + 1][0] - sp[i][0], sp[i + 1][1] - sp[i][1]); seg.push(d); tot += d; }
  let target = tot * clamp(k), acc = 0;
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= target) { const f = (target - acc) / (seg[i] || 1); return [lerp(sp[i][0], sp[i + 1][0], f), lerp(sp[i][1], sp[i + 1][1], f), sp[i + 1][0] - sp[i][0]]; }
    acc += seg[i];
  }
  const n = sp.length - 1; return [sp[n][0], sp[n][1], sp[n][0] - sp[n - 1][0]];
}

// ------------------------------------------------------------------ sprites & text
function sprite(ctx, name, x, y, w, o = {}) {
  const im = IMG[name]; if (!im) return;
  const k = o.k === undefined ? 1 : o.k; if (k <= 0.001) return;
  const h = w * im.height / im.width;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot * Math.PI / 180);
  const sq = o.sq || 0; ctx.scale(k * (1 + sq) * (o.flip ? -1 : 1), k * (1 - sq));
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  const ax = o.ax === undefined ? 0.5 : o.ax, ay = o.ay === undefined ? 0.5 : o.ay;
  ctx.drawImage(im, -w * ax, -h * ay, w, h); ctx.restore();
}
function setFont(ctx, fam, size) { ctx.font = `800 ${size}px "${fam}", "Inter", sans-serif`; }
function styledText(ctx, text, x, y, size, o = {}) {
  const k = o.k === undefined ? 1 : o.k; if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot * Math.PI / 180); ctx.scale(k, k);
  setFont(ctx, o.font || CAPTION.font, size);
  let s = size; const mw = o.maxW || 980;
  const lines = text.split('\n');
  const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
  if (widest > mw) { s = size * mw / widest; setFont(ctx, o.font || CAPTION.font, s); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  lines.forEach((l, i) => {
    const ly = (i - (lines.length - 1) / 2) * s * 1.12;
    const sh = o.shadow === undefined ? Math.max(3, s * 0.06) : o.shadow;
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillText(l, sh, ly + sh);
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = s * 0.12; ctx.strokeText(l, 0, ly); }
    if (o.grad) { const g = ctx.createLinearGradient(0, ly - s / 2, 0, ly + s / 2); g.addColorStop(0, o.grad[0]); g.addColorStop(1, o.grad[1]); ctx.fillStyle = g; }
    else ctx.fillStyle = o.fill || C.white;
    ctx.fillText(l, 0, ly);
  });
  ctx.restore();
}
function mapLabel(ctx, c, lon, lat, text, size, k = 1) {
  const [x, y] = P(c, lon, lat); styledText(ctx, text, x, y, size, { k, shadow: 3, stroke: 'rgba(0,0,0,0.35)' });
}
function bubble(ctx, x, y, text, size, tail, k) {
  if (k <= 0.001) return;
  ctx.save(); setFont(ctx, CAPTION.font, size);
  const tw = ctx.measureText(text).width, w = tw + size * 1.2, h = size * 1.8;
  ctx.translate(x, y); ctx.scale(k, k);
  const rr = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.roundRect(px, py, pw, ph, r); };
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(-w / 2 + 6, -h / 2 + 8, w, h, h * .45); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * .45); ctx.moveTo(-w * .08, h * .35); ctx.lineTo(tail[0], tail[1]); ctx.lineTo(w * .1, h * .35);
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = '#fff'; rr(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, h * .42); ctx.fill();
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2);
  ctx.restore();
}
function puff(ctx, x, y, s, k, seed = 1) {
  if (k <= 0 || k >= 1) return; const r = rnd(seed);
  for (let i = 0; i < 7; i++) {
    const a = r() * 6.28, d = s * (.15 + .55 * easeOut(k)) * (.4 + .6 * r()), rad = s * (.18 + .22 * easeOut(k)) * (.7 + .5 * r());
    ctx.globalAlpha = 1 - easeIn(k); ctx.fillStyle = '#ECEAE4'; ctx.strokeStyle = '#5A5850'; ctx.lineWidth = s * .03;
    ctx.beginPath(); ctx.arc(x + d * Math.cos(a), y + d * Math.sin(a) - s * .3 * k, rad, 0, 7); ctx.fill(); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function flash(ctx, k, color = '#fff') { if (k <= 0 || k >= 1) return; ctx.save(); ctx.globalAlpha = 0.55 * (1 - k); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }

// ------------------------------------------------------------------ scenes (storyboard time = voiceover time, 0–63.5 s)
const PL = GEO.places;
const fmt = n => Math.round(n).toLocaleString('en-US');
function chip(ctx, text, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', o.size || 38);
  const w = ctx.measureText(text).width + 54, h = (o.size || 38) * 1.75;
  ctx.fillStyle = o.bg || 'rgba(10,24,32,0.92)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2); ctx.restore();
}
function goldLabel(ctx, text, x, y, size, k) { styledText(ctx, text, x, y, size, { k, fill: C.gold, stroke: C.goldDark, shadow: 5 }); }
function title(ctx, text, y, k, size = 130) { styledText(ctx, text, W / 2, y, size, { k, font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark }); }
function kinetic(ctx, text, y, k, size = 100, rot = -3, fill = C.yellow) { styledText(ctx, text, W / 2, y, size, { k, fill, stroke: C.goldDark, rot }); }
function person(ctx, name, x, y, w, o = {}) { sprite(ctx, name, x, y, w, { ay: 0.96, ...o }); }
function stamp(ctx, text, x, y, t, t0, o = {}) {
  const e = t - t0; if (e < 0 || (o.until && t > o.until)) return;
  const sl = e < 0.16 ? lerp(2.3, 1, easeIn(e / 0.16)) : 1 + 0.05 * Math.max(0, 1 - (e - 0.16) * 6), a = o.until ? clamp((o.until - t) / 0.2) : 1;
  const col = o.color || '#D7263D', size = o.size || 60;
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot ?? -9) * Math.PI / 180); ctx.scale(sl, sl); ctx.globalAlpha = a; setFont(ctx, 'Montserrat', size);
  const w = ctx.measureText(text).width + 56, h = size * 1.45;
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 3); ctx.restore();
}
function redX(ctx, x, y, s, k) {
  if (k <= 0) return; ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = s * 0.14; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8;
  const a = clamp(k * 2), b = clamp(k * 2 - 1);
  ctx.beginPath(); ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x - s / 2 + s * a, y - s / 2 + s * a); ctx.stroke();
  if (b > 0) { ctx.beginPath(); ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x + s / 2 - s * b, y - s / 2 + s * b); ctx.stroke(); } ctx.restore();
}
function spriteHand(name, x, feet, w, hx, hy) { const im = IMG[name]; const h = w * (im ? im.height / im.width : 520 / 300); return [x - w / 2 + hx * w / 300, feet - 0.96 * h + hy * w / 300]; }

const CRED = '#DE2910';
const ZONE_COLS = ['#6C8EBF', '#82B366', '#D6B656', '#D79B00', '#B85450'];
function chnPath(c) { const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS.chn) pp.addPath(p, M); return pp; }
function keyPath(c, key) { const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M); return pp; }
function bands(ctx, c, clipPath, edges, cols, a, merge = 0, mergeCol = CRED, fromX = W) {
  if (a <= 0) return; ctx.save(); ctx.clip(clipPath); ctx.globalAlpha = a;
  const xs = [-9999, ...edges.map(l => P(c, l, 30)[0]), 9999];
  for (let i = 0; i < cols.length; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(xs[i], 0, xs[i + 1] - xs[i], H); }
  if (merge > 0) { const mx = lerp(fromX, -50, easeIO(merge)); ctx.fillStyle = mergeCol; ctx.fillRect(mx, 0, W * 3, H); }
  ctx.globalAlpha = a * 0.9; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
  for (let i = 1; i < xs.length - 1; i++) if (merge === 0 || xs[i] < lerp(fromX, -50, easeIO(merge))) { ctx.beginPath(); ctx.moveTo(xs[i], 0); ctx.lineTo(xs[i], H); ctx.stroke(); }
  ctx.restore();
}
function nightWest(ctx, c, lonEdge, a) {   // darkness west of a longitude, soft edge
  if (a <= 0) return; const x = P(c, lonEdge, 35)[0]; const g = ctx.createLinearGradient(x - 160, 0, x + 60, 0);
  g.addColorStop(0, `rgba(4,8,26,${0.72 * a})`); g.addColorStop(1, 'rgba(4,8,26,0)'); ctx.fillStyle = g; ctx.fillRect(-10, 0, x + 70, H);
  ctx.save(); ctx.globalAlpha = a; const r = rnd(5); ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const sx = r() * (x - 120), sy = r() * H * 0.7; if (sx > 0) { ctx.globalAlpha = a * (0.4 + 0.6 * r()); ctx.fillRect(sx, sy, 3, 3); } } ctx.restore();
}
function clockFace(ctx, x, y, r, hrs, o = {}) {   // a clock whose face shows day (light) or night (dark)
  const k = o.k === undefined ? 1 : o.k; if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(6, 8, r, 0, 7); ctx.fill();
  ctx.fillStyle = o.night ? '#1B2550' : '#FFF8E1'; ctx.strokeStyle = C.ink; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.night ? '#9FB0FF' : C.ink; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.arc(Math.sin(a) * r * 0.8, -Math.cos(a) * r * 0.8, r * (i % 3 ? 0.03 : 0.06), 0, 7); ctx.fill(); }
  if (o.night) { ctx.fillStyle = '#FFE9A8'; ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.35, r * 0.18, 0, 7); ctx.fill(); ctx.fillStyle = '#1B2550'; ctx.beginPath(); ctx.arc(r * 0.43, -r * 0.42, r * 0.15, 0, 7); ctx.fill(); }
  else if (o.sun) { ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(r * 0.38, -r * 0.38, r * 0.15, 0, 7); ctx.fill(); }
  const h = (hrs % 12) / 12 * 2 * Math.PI, m = (hrs % 1) * 2 * Math.PI; ctx.strokeStyle = o.night ? '#FFFFFF' : C.ink; ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(h) * r * 0.5, -Math.cos(h) * r * 0.5); ctx.stroke();
  ctx.lineWidth = r * 0.065; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(m) * r * 0.75, -Math.cos(m) * r * 0.75); ctx.stroke();
  ctx.fillStyle = CRED; ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, 7); ctx.fill();
  if (o.label) { setFont(ctx, 'Montserrat', r * 0.34); const w = ctx.measureText(o.label).width + r * 0.5; ctx.fillStyle = 'rgba(10,24,32,0.92)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-w / 2, r * 1.1, w, r * 0.55, r * 0.27); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.label, 0, r * 1.39); }
  ctx.restore();
}
const fmtTime = h => { const hh = Math.floor(h) % 24, mm = Math.round((h % 1) * 60) % 60; const ap = hh >= 12 ? 'PM' : 'AM'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; };
function cityClock(ctx, c, place, r, hrs, o = {}) { const [x, y] = P(c, ...GEO.places[place]); clockFace(ctx, x, y - r * 1.1, r, hrs, o); ctx.save(); ctx.globalAlpha = o.k ?? 1; ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }

function sceneMap(ctx, c, t) {
  const cp = chnPath(c);
  // glow on China
  ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.shadowColor = C.gold; ctx.shadowBlur = 16; ctx.globalAlpha = 0.85; ctx.stroke(cp); ctx.restore();
  // historic five zones → one (1949)
  if (t > 18.6 && t < 27.0) {
    const k = clamp((t - 18.9) / 0.6) * (1 - clamp((t - 26.4) / 0.5)), merge = clamp((t - 21.7) / 2.0);
    bands(ctx, c, cp, [82.5, 97.5, 112.5, 127.5], ZONE_COLS, 0.75 * k, merge, CRED, P(c, 116.4, 40)[0]);
    kinetic(ctx, '5 TIME ZONES', 330, win(t, 19.1, 20.3), 100);
    title(ctx, '1949', 330, win(t, 20.3, 21.7, 0.35), 160);
    kinetic(ctx, 'ONE CLOCK: BEIJING', 330, win(t, 22.0, 24.4), 82, -3, '#FFFFFF');
    kinetic(ctx, 'ONE UNITED NATION', 330, win(t, 24.4, 26.6), 88);
    person(ctx, 'official_set', 230, 1540, 300, { k: win(t, 21.8, 26.6) });
    if (t > 21.8) clockFace(ctx, 230, 1040, 90, 8 + clamp((t - 22.0) / 1.5) * 4, { k: win(t, 21.9, 26.6), sun: true });
  }
  // B1/B2 hook: ten in the morning, still dark in the far west
  if (t < 12.7) {
    const dark = t < 4.4 ? 1 : t < 8.4 ? 1 : 1 - clamp((t - 11.0) / 1.0);
    nightWest(ctx, c, t < 5.3 ? 86 : 79.5, dark);
    cityClock(ctx, c, 'kashgar', c.z > 30 ? 120 : 70, 10, { night: true, label: '10:00 AM', k: pop(t - 0.3) * (t > 8.4 && t < 10 ? popOut(9.9 - t) : 1) * (t > 10.2 ? 0 : 1) });
    if (c.z < 30 && t < 10.2) cityClock(ctx, c, 'beijing', 70, 10, { sun: true, label: '10:00 AM', k: pop(t - 0.5) * popOut(10.1 - t) });
    title(ctx, '10 AM…\nAND STILL DARK?', 300, t < 0.05 ? 1 : popOut(4.3 - t), 100);
    const [kx, ky] = P(c, ...GEO.places.kashgar); goldLabel(ctx, 'KASHGAR', kx + (c.z > 30 ? 230 : 0), ky + 50, c.z > 30 ? 60 : 44, win(t, 4.6, 12.6));
    if (t > 5.8 && t < 8.3) { const r = rnd(3); ctx.save(); ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const y = (r() * H + t * 160 * (0.6 + r())) % H; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(r() * W, y, 4 + r() * 4, 0, 7); ctx.fill(); } ctx.restore(); chip(ctx, '❄ A NORMAL WINTER MORNING', W / 2, 330, win(t, 5.9, 8.3), { size: 40 }); }
    // as wide as the US
    const ku = win(t, 8.6, 12.6, 0.5, 0.3);
    if (ku > 0) { const off = (1 - easeOut(clamp((t - 8.6) / 0.9))) * 60; strokeUS(ctx, { ...c, cx: c.cx - off }, ku, t); chip(ctx, '🇺🇸 SAME SCALE', W / 2, 330, win(t, 8.8, 10.4), { size: 42, stroke: '#FFFFFF' }); }
    if (t > 10.4) { goldLabel(ctx, 'CHINA', W / 2, 600, 80, win(t, 10.4, 12.6)); clockFace(ctx, W / 2, 1380, 130, 10, { k: win(t, 10.5, 12.6), sun: true, label: 'ONE CLOCK' }); }
  }
  // B7: coping — schools open later, two clocks, two start times
  if (t > 40.5 && t < 52.4) {
    kinetic(ctx, 'HOW DO PEOPLE COPE?', 330, win(t, 40.6, 42.0), 86, -3, '#FFFFFF');
    const [kx, ky] = P(c, ...GEO.places.kashgar), [ux, uy] = P(c, ...GEO.places.urumqi);
    goldLabel(ctx, 'XINJIANG', (kx + ux) / 2 + 60, uy - 140, 70, win(t, 45.3, 52.3));
    if (t < 45.0) { sprite(ctx, 'school', 540, 1040, 360, { k: win(t, 42.2, 44.9) }); clockFace(ctx, 820, 820, 100, 10, { k: win(t, 42.4, 44.9), sun: true, label: 'OPENS 10:00' }); chip(ctx, 'SCHOOLS & OFFICES OPEN LATER', W / 2, 330, win(t, 42.3, 44.9), { size: 38 }); }
    else if (t < 49.7) { ctx.save(); ctx.fillStyle = 'rgba(10,24,32,0.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
      clockFace(ctx, 300, 900, 160, 10, { k: pop(t - 45.0), sun: true, label: 'BEIJING TIME' }); clockFace(ctx, 780, 900, 160, 8, { k: pop(t - 46.1), sun: true, label: 'LOCAL TIME' });
      chip(ctx, 'UNOFFICIAL LOCAL TIME: −2 HOURS', W / 2, 330, win(t, 46.2, 49.6), { size: 36 }); }
    else { ctx.save(); ctx.fillStyle = 'rgba(10,24,32,0.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
      const k = pop(t - 49.8, 0.3); ctx.save(); ctx.translate(W / 2, 760); ctx.scale(k, k); ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-380, -160, 760, 320, 30); ctx.fill(); ctx.stroke();
      setFont(ctx, 'Montserrat', 50); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('📅 MEETING', 0, -80); setFont(ctx, 'Montserrat', 72); ctx.fillStyle = CRED; ctx.fillText('10:00?  8:00?', 0, 40); ctx.restore();
      person(ctx, 'worker_a', 300, 1540, 260, { k: pop(t - 50.0) }); person(ctx, 'worker_b', 780, 1540, 260, { k: pop(t - 50.3) });
      chip(ctx, 'TWO START TIMES', W / 2, 330, win(t, 50.6, 52.3), { size: 46 }); }
  }
  // B8: one clock, this much land — morning everywhere at once
  if (t > 52.3) {
    const [ex] = P(c, 134.8, 35), [wx] = P(c, 73.6, 35), y = P(c, 104, 47.5)[1];
    const ka = win(t, 52.6, 55.6); if (ka > 0) { ctx.save(); ctx.globalAlpha = clamp(ka); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(wx, y); ctx.lineTo(ex, y); ctx.stroke();
      for (const [x, d] of [[wx, 1], [ex, -1]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 26, y - 16); ctx.lineTo(x + d * 26, y + 16); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); } ctx.restore(); }
    kinetic(ctx, 'ONE CLOCK… ALL THIS LAND', 330, win(t, 52.6, 55.7), 74);
    if (t > 55.7) {
      const sx = P(c, lerp(122, 96, easeIO((t - 56.0) / 4.0)), 35)[0];
      nightWest(ctx, c, lerp(122, 96, easeIO((t - 56.0) / 4.0)), clamp((t - 55.8) / 0.4));
      ctx.save(); const g = ctx.createRadialGradient(W + 40, 700, 20, W + 40, 700, 520); g.addColorStop(0, 'rgba(255,214,120,0.55)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      for (const [pl, d] of [['beijing', 0], ['shanghai', 0.1], ['urumqi', 0.2], ['kashgar', 0.3]]) cityClock(ctx, c, pl, 52, 7, { sun: pl === 'beijing' || pl === 'shanghai', night: pl === 'urumqi' || pl === 'kashgar', k: pop(t - 56.4 - d) });
      kinetic(ctx, '7:00 AM EVERYWHERE', 330, win(t, 56.6, 58.2), 86, -3, '#FFFFFF');
      if (t > 58.2) { const [kx, ky] = P(c, ...GEO.places.kashgar); styledText(ctx, '☀️?', kx + 140, ky - 170, 70, { k: pop(t - 58.4) }); chip(ctx, "THE SUN HASN'T GOT THE MEMO", W / 2, 330, win(t, 58.3, 60.5), { size: 40 }); }
    }
  }
}
function strokeUS(ctx, c, k, t) { const pp = keyPath(c, 'usOnChina'); ctx.save(); ctx.globalAlpha = clamp(k); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill(pp); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.setLineDash([20, 12]); ctx.lineDashOffset = -t * 30; ctx.stroke(pp); ctx.restore(); }
// B3: split — the US uses four zones, China uses one
function sceneSplit(ctx, t) {
  const k = clamp((t - 12.6) / 0.6) * (1 - clamp((t - 17.9) / 0.5)); if (k <= 0) return;
  const top = H / 2, slide = (1 - easeOut(k)) * top;
  const cu = { cx: -96.5, cy: -mercY(38.5), z: 16, rot: 0, tilt: 1, sx: W / 2, sy: top / 2 }, cc = { cx: 104, cy: -mercY(36), z: 15, rot: 0, tilt: 1, sx: W / 2, sy: top + top / 2 };
  ctx.save(); ctx.translate(0, -slide); ctx.beginPath(); ctx.rect(0, 0, W, top); ctx.clip(); drawMap(ctx, cu);
  bands(ctx, cu, keyPath(cu, 'usMain'), [-112.5, -97.5, -84], ['#6C8EBF', '#82B366', '#D6B656', '#D79B00'], 0.75 * clamp((t - 13.6) / 0.6));
  goldLabel(ctx, 'USA', W / 2, 140, 64, pop(t - 12.9)); kinetic(ctx, '4 TIME ZONES', 820, win(t, 14.1, 17.9), 80);
  ctx.restore();
  ctx.save(); ctx.translate(0, slide); ctx.beginPath(); ctx.rect(0, top, W, top); ctx.clip(); drawMap(ctx, cc);
  const cp = chnPath(cc); ctx.save(); ctx.globalAlpha = 0.8 * clamp((t - 15.4) / 0.5); ctx.fillStyle = CRED; ctx.fill(cp); ctx.restore();
  goldLabel(ctx, 'CHINA', W / 2, top + 130, 64, pop(t - 15.3) * popOut(15.7 - t, 0.15) + 0); kinetic(ctx, '1 TIME ZONE', top + 260, win(t, 15.7, 17.9), 80);
  clockFace(ctx, W / 2, top + 480, 90, 10, { k: win(t, 16.8, 17.9), sun: true, label: 'BEIJING TIME' });
  ctx.restore();
  ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = C.gold; ctx.fillRect(0, top - 4, W, 8); ctx.restore();
}
// B5: where is the sun? Beijing vs Kashgar (two sky panels)
function skyPanel(ctx, y0, h, name, sunU, hrs, t, o = {}) {
  const sunY = Math.sin(sunU * Math.PI), dusk = o.dusk || 0;
  const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, dusk > 0 ? '#3B2A5A' : '#5DADE2'); g.addColorStop(1, dusk > 0 ? '#F28C38' : '#D6EAF8'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, h);
  const hy = y0 + h * 0.8; ctx.fillStyle = C.land; ctx.fillRect(0, hy, W, y0 + h - hy); ctx.strokeStyle = C.coast; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
  ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, x = lerp(80, W - 80, u), yy = hy - Math.sin(u * Math.PI) * h * 0.6; i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); ctx.restore();
  const sx = lerp(80, W - 80, sunU), sy = hy - sunY * h * 0.6; ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, hy - y0); ctx.clip();
  ctx.fillStyle = 'rgba(255,214,120,0.45)'; ctx.beginPath(); ctx.arc(sx, sy, 80, 0, 7); ctx.fill(); ctx.fillStyle = '#FFC93C'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sx, sy, 48, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
  goldLabel(ctx, name, 200, y0 + 70, 56, 1); clockFace(ctx, W - 170, y0 + 140, 90, hrs, { sun: true, label: fmtTime(hrs) });
}
function sceneSun(ctx, t) {
  const k = clamp((t - 26.6) / 0.5) * (1 - clamp((t - 35.6) / 0.4)); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H);
  // Beijing: noon, sun at the top
  skyPanel(ctx, 160, 640, 'BEIJING', 0.5, 12, t);
  // Kashgar: noon → sun still climbing; 3 PM → highest; summer 10 PM → sunset
  let hrs = 12, su = 0.3, dusk = 0;
  if (t > 31.1) { const u = easeIO((t - 31.2) / 1.0); hrs = lerp(12, 15, u); su = lerp(0.3, 0.5, u); }
  if (t > 33.1) { const u = easeIO((t - 33.2) / 1.4); hrs = lerp(15, 22, u); su = lerp(0.5, 0.98, u); dusk = u; }
  if (t > 29.2) skyPanel(ctx, 860, 640, 'KASHGAR', su, hrs, t, { dusk });
  chip(ctx, 'NOON: SUN AT THE TOP', W / 2, 760, win(t, 27.6, 29.2), { size: 36 });
  chip(ctx, 'NOON… SUN STILL CLIMBING', W / 2, 1460, win(t, 29.4, 31.1), { size: 36 });
  chip(ctx, 'HIGHEST AT 3 PM', W / 2, 1460, win(t, 31.3, 33.1), { size: 40 });
  chip(ctx, '☀ SUMMER SUNSET: ~10 PM', W / 2, 1460, win(t, 33.3, 35.6), { size: 38 });
  ctx.restore();
}
// B6: the family that shares one alarm clock (cutaway card)
function sceneFamily(ctx, t) {
  const k = clamp((t - 35.6) / 0.45) * (1 - clamp((t - 40.4) / 0.4)); if (k <= 0) return;
  ctx.save(); ctx.translate(W * (1 - easeOut(k)), 0); ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.fillStyle = '#0E1F3A'; ctx.globalAlpha = 0.9; ctx.fillRect(W * 0.62, 160, W * 0.38, 1300); ctx.restore();
  ctx.fillStyle = '#163A46'; ctx.fillRect(0, 1300, W, 300); ctx.fillStyle = '#5A5A5A'; ctx.fillRect(0, 1300, W, 40); ctx.setLineDash([30, 24]); ctx.strokeStyle = '#F4D03F'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 1320); ctx.lineTo(W, 1320); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(244,208,63,0.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(40, 160, W - 80, H - 320, 34); ctx.stroke();
  ctx.fillStyle = '#EFE6D2'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.fillRect(80, 820, 500, 480); ctx.strokeRect(80, 820, 500, 480); ctx.fillStyle = '#C0504D'; ctx.beginPath(); ctx.moveTo(60, 830); ctx.lineTo(330, 640); ctx.lineTo(600, 830); ctx.closePath(); ctx.fill(); ctx.stroke();
  person(ctx, 'dad', 240, 1290, 230); person(ctx, 'kid', 430, 1290, 190);
  const ring = t > 37.3 ? Math.sin(t * 60) * 8 : 0; sprite(ctx, 'alarm', 330 + ring, 760, 150);
  if (t > 37.3) for (let i = 0; i < 4; i++) { const u = ((t - 37.3) * 0.8 + i / 4) % 1; ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#FFD43B'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(330, 760, 90 + u * 700, -0.5, 0.5); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = '#B9C6D3'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.fillRect(760, 1050, 230, 250); ctx.strokeRect(760, 1050, 230, 250); ctx.fillStyle = '#7A4A3A'; ctx.beginPath(); ctx.moveTo(745, 1056); ctx.lineTo(875, 950); ctx.lineTo(1005, 1056); ctx.closePath(); ctx.fill(); ctx.stroke();
  const r = rnd(4); ctx.fillStyle = '#fff'; for (let i = 0; i < 20; i++) ctx.fillRect(W * 0.64 + r() * W * 0.32, 200 + r() * 600, 3, 3);
  person(ctx, t > 38.4 ? 'cousin_shock' : 'cousin_sleep', 875, 1290, 170);
  if (t > 38.4) styledText(ctx, 'TOO EARLY!', 860, 880, 54, { k: pop(t - 38.5), fill: '#FF6B6B', stroke: C.ink });
  chip(ctx, '🚗 2 HOURS', 660, 1400, win(t, 39.0, 40.4), { size: 40 });
  kinetic(ctx, 'ONE ALARM FOR EVERYONE', 300, win(t, 36.3, 40.4), 74);
  ctx.restore();
}
function sceneEnd(ctx, t) {
  if (t < 60.6) return; const e = t - 60.6, k = clamp(e / 0.35);
  ctx.fillStyle = `rgba(4,10,14,${0.72 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, 'SAME CLOCK.', W / 2, 680, 120, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'DIFFERENT SUN.', W / 2, 830, 120, { k: pop(e - 0.3, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  const kc = pop(e - 0.8, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 1060); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 46);
    const w = ctx.measureText('FOLLOW MAPHELD').width + 120; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -56, w, 112, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 40, -20); ctx.lineTo(-w / 2 + 40, 20); ctx.lineTo(-w / 2 + 72, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FOLLOW MAPHELD', 22, 3); ctx.restore(); }
}
const CAPTIONS = [
  [0.0, 2.2, 'Waking up at 10 AM…'], [2.2, 4.3, '…and still no sun'], [4.4, 7.3, 'Far western China'], [7.3, 10.4, 'As wide as the US'], [10.4, 12.6, 'Yet ONE clock'],
  [12.75, 15.3, 'The US: four zones'], [15.3, 17.9, 'China: just one'], [18.0, 20.2, 'Once: five zones'], [20.2, 24.4, 'After 1949: Beijing time'], [24.4, 26.6, 'One united nation'],
  [26.75, 28.9, 'Beijing: sun at noon'], [28.9, 31.1, 'Kashgar, far west…'], [31.1, 33.1, 'Highest around 3 PM'], [33.1, 35.6, 'Summer sunset ~10 PM'],
  [35.8, 38.1, 'One family alarm'], [38.1, 40.4, 'Even for the cousin'],
  [40.6, 42.0, 'How do people cope?'], [42.0, 44.8, 'Things open later'], [44.8, 47.9, 'Many use local time'], [47.9, 49.7, 'Two hours behind'], [49.7, 52.2, 'Two start times'],
  [52.4, 55.6, 'One clock, all this land'], [55.7, 58.1, 'Morning everywhere'], [58.1, 60.4, 'Even in the dark'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t);
  const covered = (t > 13.3 && t < 17.9) || (t > 27.2 && t < 35.6) || (t > 36.1 && t < 40.4);
  if (!covered) { drawMap(ctx, c); sceneMap(ctx, c, t); }
  sceneSplit(ctx, t); sceneSun(ctx, t); sceneFamily(ctx, t);
  vignette(ctx); if (t < 60.6) drawText(ctx, t); sceneEnd(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
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
