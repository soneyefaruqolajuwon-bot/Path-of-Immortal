/* Half the planet has fewer people than India — Mapheld 9:16 short; cliffhanger card, then glides back into frame 1 (loop). */
'use strict';
const W = 1080, H = 1920, DURATION = 63.59;
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
  world: [33, 12, 4.6], south: [35, -18, 4.0], north: [40, 26, 5.0], twist: [8, 27, 4.0],
};
const KEYS = [[0, 'world', 1], [8.0, 'world', 1.02], [17.9, 'south', 1], [21.3, 'south', 1.02], [22.2, 'world', 1], [32.4, 'world', 1.02], [33.4, 'south', 1], [40.5, 'south', 1.03],
  [45.6, 'north', 1], [49.3, 'north', 1.02], [50.4, 'twist', 1], [60.2, 'twist', 1.04], [62.9, 'twist', 1.05], [63.59, 'world', 1]];
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
  for (const key of Object.keys(GEO)) {
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
  const set = PATHS.wide;
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

// ------------------------------------------------------------------ scenes (storyboard time = voiceover time, 0–65.7 s)
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

// ------------------------------------------------------------------ helpers
function fillKey(ctx, c, key, style, a, glow, off) {
  if (a <= 0 || !PATHS[key]) return; let M = camMatrix(c); if (off) M = M.translate(off[0], off[1]); const pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = style; ctx.fill(pp); if (glow) { ctx.globalAlpha = Math.min(1, a * 1.6); ctx.strokeStyle = glow; ctx.lineWidth = 4; ctx.shadowColor = glow; ctx.shadowBlur = 14; ctx.stroke(pp); } ctx.restore(); }
function strokeKey(ctx, c, key, col, lw, a = 1, off) { if (!PATHS[key] || a <= 0) return; let M = camMatrix(c); if (off) M = M.translate(off[0], off[1]); const pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.shadowColor = col; ctx.shadowBlur = lw > 4 ? 14 : 0; ctx.stroke(pp); ctx.restore(); }
function equator(ctx, c, k = 1, t = 0) { if (k <= 0) return; const [, y] = P(c, 0, 0); ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.shadowColor = C.gold; ctx.shadowBlur = 18 + 6 * Math.sin(t * 3); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * k, y); ctx.stroke(); ctx.restore(); return y; }
function ring(ctx, x, y, r, t, col = C.gold) { ctx.save(); for (let i = 0; i < 2; i++) { const u = ((t * 0.9 + i * 0.5) % 1); ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r * (0.5 + u), 0, 7); ctx.stroke(); } ctx.restore(); }
function dim(ctx, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#05080A'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function sarrow(ctx, x0, y0, x1f, y1f, k, col = C.gold, w = 11) {
  if (k <= 0) return; const e = easeOut(k), x1 = lerp(x0, x1f, e), y1 = lerp(y0, y1f, e);
  const ang = Math.atan2(y1 - y0, x1 - x0); ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = w + 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + 3, y0 + 4); ctx.lineTo(x1 + 3, y1 + 4); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const hs = w * 2.4; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 + hs * Math.cos(ang), y1 + hs * Math.sin(ang)); ctx.lineTo(x1 + hs * Math.cos(ang + 2.3), y1 + hs * Math.sin(ang + 2.3)); ctx.lineTo(x1 + hs * Math.cos(ang - 2.3), y1 + hs * Math.sin(ang - 2.3)); ctx.fill(); ctx.restore(); }
// population: big metro areas + dense farm belts (millions), drawn as a heat glow
const POP = [[139.7, 35.7, 37], [77.2, 28.6, 32], [121.5, 31.2, 29], [90.4, 23.8, 23], [31.2, 30.0, 22], [116.4, 39.9, 21], [72.9, 19.1, 21], [135.5, 34.7, 19], [-99.1, 19.4, 22], [-74, 40.7, 19], [67, 24.9, 17], [106.5, 29.6, 17], [29, 41, 16], [88.4, 22.6, 15], [121, 14.6, 15], [3.4, 6.5, 15],
  [113.3, 23.1, 14], [117.2, 39.1, 14], [74.3, 31.5, 14], [77.6, 13, 13], [2.35, 48.9, 11], [-74.1, 4.7, 11], [80.3, 13.1, 11], [100.5, 13.8, 11], [127, 37.6, 10], [-0.1, 51.5, 9.5], [37.6, 55.8, 12.6], [-118.2, 34, 12.5], [51.4, 35.7, 9.5], [106.7, 10.8, 9], [-87.6, 41.9, 8.9],
  [78.5, 17.4, 10.5], [44.4, 33.3, 7.5], [46.7, 24.7, 7.5], [-3.7, 40.4, 6.7], [-79.4, 43.7, 6.4], [32.5, 15.6, 6], [38.7, 9, 5.5], [-4, 5.3, 5.5], [8.5, 12, 4.2], [12.5, 41.9, 4.3], [13.4, 52.5, 3.6],
  [82, 26, 40], [86, 25, 30], [115, 33, 40], [104, 30, 15], [10, 50, 20], [7, 9, 15], [76, 21, 20], [120, 36, 15], [31, 27, 8], [-85, 37, 10], [-95, 33, 6], [72, 33, 10], [110, 22, 12]];
const POPS = [[-46.6, -23.5, 22], [-58.4, -34.6, 15.5], [-43.2, -22.9, 13.5], [106.8, -6.2, 11], [15.3, -4.3, 17], [-77, -12, 11], [28, -26.2, 10], [13.2, -8.8, 9], [39.3, -6.8, 7.8], [-70.7, -33.5, 6.9], [151.2, -33.9, 5.4], [145, -37.8, 5.2], [-43.9, -19.9, 6], [112.7, -7.3, 7], [36.8, -1.3, 5.3], [110, -7.3, 20], [-40, -8, 8], [33, -14, 8]];
let GLOW;
function makeGlow() { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,236,150,1)'); gr.addColorStop(0.3, 'rgba(244,208,63,0.6)'); gr.addColorStop(1, 'rgba(244,208,63,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return cv; }
function popGlow(ctx, c, list, k, scale = 1) { if (k <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75 * clamp(k); for (const [lo, la, p] of list) { const [x, y] = P(c, lo, la); const r = Math.sqrt(p) * 9 * scale * c.z / 4.6 * Math.min(1, k * 1.5); ctx.drawImage(GLOW, x - r, y - r, r * 2, r * 2); } ctx.restore(); }
function silhouette(ctx, key, x, y, w, col, glow) {   // draw a GEO shape scaled into a box centred at x,y
  const rs = GEO[key]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const r of rs) for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); const yy = -mercY(Math.max(-75, r[i + 1])); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
  const s = w / (x1 - x0); ctx.save(); ctx.translate(x - w / 2, y - (y1 - y0) * s / 2); ctx.scale(s, s); ctx.translate(-x0, -y0); ctx.beginPath();
  for (const r of rs) { for (let i = 0; i < r.length; i += 2) { const xx = r[i], yy = -mercY(Math.max(-75, r[i + 1])); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.closePath(); }
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2 / s; ctx.strokeStyle = glow || C.ink; ctx.stroke(); ctx.restore(); return (y1 - y0) * s; }
function scale(ctx, k, tilt, t) {   // India vs the entire southern half
  if (k <= 0) return; const bx = W / 2, by = 1150; ctx.save(); ctx.translate(bx, by); ctx.scale(k, k);
  ctx.fillStyle = '#6B4423'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-70, 300); ctx.lineTo(70, 300); ctx.lineTo(16, 0); ctx.lineTo(-16, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.rotate(tilt); ctx.fillStyle = C.gold; ctx.fillRect(-320, -12, 640, 24); ctx.strokeRect(-320, -12, 640, 24);
  for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 300, 0); ctx.rotate(-tilt); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-110, 170); ctx.moveTo(0, 0); ctx.lineTo(110, 170); ctx.stroke();
    ctx.fillStyle = '#B8902A'; ctx.beginPath(); ctx.ellipse(0, 175, 140, 24, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (sd < 0) { silhouette(ctx, 'india', 0, 95, 130, C.gold, '#3A2A08'); styledText(ctx, 'INDIA', 0, 245, 44, { fill: C.gold, stroke: C.goldDark }); styledText(ctx, '≈ 1.4 BILLION', 0, 295, 34, { fill: '#fff', stroke: C.ink }); }
    else { silhouette(ctx, 'south', 0, 130, 230, '#8A855C', '#2C3531'); styledText(ctx, 'THE WHOLE SOUTH', 0, 245, 34, { fill: '#fff', stroke: C.ink }); styledText(ctx, '≈ 1 BILLION', 0, 295, 34, { fill: '#fff', stroke: C.ink }); }
    ctx.restore(); }
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fillStyle = C.gold; ctx.fill(); ctx.stroke(); ctx.restore(); }
function thermo(ctx, x, y, frac, col, label, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-22, -170, 44, 190, 22); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 40, 40, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 40, 30, 0, 7); ctx.fill(); ctx.fillRect(-12, 20 - 170 * frac, 24, 170 * frac + 10);
  styledText(ctx, label, 0, 130, 52, { fill: '#fff', stroke: C.ink }); ctx.restore(); }
function snow(ctx, x0, x1, y0, y1, t, a) { if (a <= 0) return; const r = rnd(5); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { const x = x0 + r() * (x1 - x0) + Math.sin(t * 1.5 + i) * 10, y = y0 + ((r() * (y1 - y0) + t * 90 * (0.6 + r() * 0.6)) % (y1 - y0)); ctx.beginPath(); ctx.arc(x, y, 3 + r() * 4, 0, 7); ctx.fill(); } ctx.restore(); }
function badge(ctx, text, x, y, k, col) { chip(ctx, text, x, y, k, { size: 40, bg: col, fill: '#fff', stroke: C.ink }); }
// tectonic drift: each continent starts nudged toward a Pangaea-like clump, then slides home
const DRIFT = { c_na: [32, 4], c_sa: [26, 8], c_eu: [0, 0], c_as: [-6, 4], c_af: [0, 0], c_oc: [-62, -14], c_an: [-10, 22] };
function driftMap(ctx, c, u) {
  ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  for (const [k, [dx, dy]] of Object.entries(DRIFT)) { const off = [dx * (1 - u), dy * (1 - u)]; fillKey(ctx, c, k, 'rgba(0,0,0,0.3)', 1, null, [off[0] + 1.2, off[1] - 1.6]); fillKey(ctx, c, k, C.land, 1, null, off); strokeKey(ctx, c, k, C.coast, 2.5, 1, off); }
}
function pizza(ctx, t, k) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.3); ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H); ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = 860, s = pop(t - 40.6, 0.45); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = '#C9A26B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-420, -420, 840, 840, 14); ctx.fill(); ctx.stroke();   // box
  ctx.fillStyle = '#B88F58'; ctx.beginPath(); ctx.roundRect(-420, -560, 840, 140, 14); ctx.fill(); ctx.stroke();   // lid
  // north half: loaded
  ctx.save(); ctx.beginPath(); ctx.rect(-400, -400, 800, 400); ctx.clip();
  ctx.fillStyle = '#E8A94E'; ctx.beginPath(); ctx.arc(0, 0, 360, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#F6D06E'; ctx.beginPath(); ctx.arc(0, 0, 320, 0, 7); ctx.fill();
  const r = rnd(9); for (let i = 0; i < 16; i++) { const a = Math.PI + r() * Math.PI, d = 60 + r() * 220; ctx.fillStyle = '#C0392B'; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 26, 0, 7); ctx.fill(); ctx.strokeStyle = '#7A1F17'; ctx.lineWidth = 3; ctx.stroke(); }
  for (let i = 0; i < 12; i++) { const a = Math.PI + r() * Math.PI, d = 60 + r() * 230; ctx.fillStyle = '#4C8C2B'; ctx.fillRect(Math.cos(a) * d - 8, Math.sin(a) * d - 4, 16, 8); }
  ctx.restore();
  // south half: mostly box, a couple of crumbs and one lonely slice
  ctx.fillStyle = '#E8A94E'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(170, 60); ctx.arc(170, 60, 130, 0.3, 1.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#C0392B'; ctx.beginPath(); ctx.arc(240, 120, 14, 0, 7); ctx.fill();
  ctx.fillStyle = '#9C7A4A'; for (const [x, y] of [[-150, 120], [-60, 240], [40, 180], [-220, 260]]) { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }
  ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.setLineDash([24, 14]); ctx.beginPath(); ctx.moveTo(-430, 0); ctx.lineTo(430, 0); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  styledText(ctx, 'NORTH', W / 2, 420, 64, { k: pop(t - 42.3) * clamp(k * 1.3), fill: C.gold, stroke: C.goldDark });
  styledText(ctx, 'SOUTH: MOSTLY BOX', W / 2, 1360, 60, { k: pop(t - 44.0) * clamp(k * 1.3), fill: '#fff', stroke: C.ink });
  person(ctx, 'south_poke', 200, 1560, 260, { k: pop(t - 43.6) * clamp(k * 1.3) });
}

// ------------------------------------------------------------------ the story
const OPEN_T = t => t < 3.0 ? 1 : 0;
function opening(ctx, c, t, k) {   // shared first/last frame: the equator + the hook title
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = k;
  styledText(ctx, 'FEWER PEOPLE\nTHAN INDIA?!', W / 2, 330, 118, { fill: C.yellow, stroke: C.goldDark, rot: -3, k: 1 });
  chip(ctx, 'THE ENTIRE SOUTHERN HALF OF EARTH', W / 2, 520, 1, { size: 36 });
  if (t > 8.15) { const [, eqY] = P(c, 0, 0); styledText(ctx, 'NORTH', 120, eqY - 60, 40, { fill: '#fff', stroke: C.ink, k: 1 }); styledText(ctx, 'SOUTH', 120, eqY + 60, 40, { fill: '#fff', stroke: C.ink, k: 1 }); }
  ctx.restore();
}
function scene(ctx, t) {
  const c = camAt(t);
  const driftK = t > 21.4 && t < 26.6;
  if (driftK) driftMap(ctx, c, easeIO(clamp((t - 21.6) / 4.4))); else drawMap(ctx, c);
  const south = t < 8.1 || (t > 17.8 && t < 21.4) || (t > 32.6 && t < 40.6);
  // north / south tint
  const eqY = equator(ctx, c, 1, t);
  if (t < 8.15) {
    if (t > 3.0) { popGlow(ctx, c, POP, clamp((t - 3.1) / 0.8)); popGlow(ctx, c, POPS, clamp((t - 3.1) / 0.8)); }
    if (t > 4.4) fillKey(ctx, c, 'south', '#5FD3FF', 0.35 * clamp((t - 4.5) / 0.5), '#5FD3FF');
    if (t > 7.0) fillKey(ctx, c, 'india', C.gold, 0.85 * clamp((t - 7.2) / 0.4), '#FFF3B0');
    styledText(ctx, 'NORTH', 120, eqY - 60, 40, { fill: '#fff', stroke: C.ink, k: 1 }); styledText(ctx, 'SOUTH', 120, eqY + 60, 40, { fill: '#fff', stroke: C.ink, k: 1 });
    chip(ctx, 'TWO EQUAL HALVES', W / 2, 330, win(t, 3.0, 3.9), { size: 44 }); chip(ctx, '…BUT NOT EQUAL PEOPLE', W / 2, 330, win(t, 3.0, 4.4), { size: 44 });
    scale(ctx, pop(t - 6.2, 0.4), -0.16 * easeOut(clamp((t - 7.2) / 0.6)), t);
    styledText(ctx, 'FEWER PEOPLE\nTHAN INDIA', W / 2, 330, 112, { fill: C.yellow, stroke: C.goldDark, rot: -3, k: win(t, 4.5, 8.1) });
  }
  // ---------------- B2 weather: split screen, Chicago vs Hobart
  if (t > 8.15 && t < 17.9) {
    const k = clamp((t - 8.2) / 0.5) * clamp((17.85 - t) / 0.4);
    const half = (cam, top) => { ctx.save(); ctx.beginPath(); ctx.rect(0, top ? 0 : H / 2, W, H / 2); ctx.clip(); drawMap(ctx, cam); ctx.restore(); };
    const cA = { cx: -87.6, cy: -mercY(41.9), z: 34, rot: 0, tilt: 1, sx: W / 2, sy: H * 0.27 }, cB = { cx: 147.3, cy: -mercY(-42.9), z: 34, rot: 0, tilt: 1, sx: W / 2, sy: H * 0.75 };
    ctx.save(); ctx.globalAlpha = k; half(cA, true); half(cB, false);
    ctx.fillStyle = C.gold; ctx.fillRect(0, H / 2 - 5, W, 10);
    snow(ctx, 0, W, 0, H / 2 - 10, t, 0.9);
    const [chx, chy] = P(cA, -87.6, 41.9), [hbx, hby] = P(cB, 147.3, -42.9);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; for (const [x, y] of [[chx, chy], [hbx, hby]]) { ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); ctx.stroke(); }
    goldLabel(ctx, 'CHICAGO', chx, chy - 50, 56, pop(t - 13.8)); goldLabel(ctx, 'HOBART', hbx, hby - 50, 56, pop(t - 11.4));
    chip(ctx, '42° NORTH', 200, 120, pop(t - 14.3), { size: 34 }); chip(ctx, '43° SOUTH', 200, H / 2 + 80, pop(t - 12.7), { size: 34 });
    person(ctx, 'north_cold', 800, 860 + Math.sin(t * 40) * 3, 260, { k: pop(t - 8.4) }); person(ctx, 'south_chill', 800, 1780, 260, { k: pop(t - 9.6) });
    thermo(ctx, 230, 700, 0.18, '#3A86FF', '≈ −4°C', pop(t - 15.3)); thermo(ctx, 230, 1600, 0.55, '#FF6B35', '≈ +8°C', pop(t - 15.5));
    badge(ctx, 'EXTREME WINTERS', W / 2, 330, win(t, 9.4, 17.8), '#3A6EA5'); badge(ctx, 'MILDER ✓', W / 2, H / 2 + 200, win(t, 10.4, 17.8), '#1E8E3E');
    kinetic(ctx, '10°C+ WARMER', H / 2 + 330, win(t, 16.1, 17.8), 90);
    ctx.restore();
  }
  // ---------------- B3 not much south to live on
  if (t > 17.8 && t < 21.5) {
    fillKey(ctx, c, 'south', C.land, 0.0); const k = win(t, 18.0, 21.4);
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#E9C46A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(600, 1080, 120, 34, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    person(ctx, 'south_chill', 600, 1085, 220, { k });
    chip(ctx, 'NOT MUCH SOUTH TO LIVE ON', W / 2, 330, win(t, 19.4, 21.4), { size: 42 }); chip(ctx, 'NOBODY AVOIDED THE SOUTH', W / 2, 330, win(t, 18.0, 19.4), { size: 42 });
  }
  // ---------------- B4 drift + 68%
  if (t > 21.4 && t < 32.7) {
    chip(ctx, 'HUNDREDS OF MILLIONS OF YEARS', W / 2, 330, win(t, 21.6, 24.0), { size: 38 }); kinetic(ctx, 'CONTINENTAL DRIFT', 330, win(t, 24.1, 26.4), 92);
    if (t > 26.4) { fillKey(ctx, c, 'north', C.gold, 0.4 * clamp((t - 26.5) / 0.6), C.gold); }
    styledText(ctx, '68%', W / 2, 330, 210, { k: win(t, 28.8, 32.6), fill: C.yellow, stroke: C.goldDark, rot: -3 }); chip(ctx, 'OF ALL LAND IS NORTH', W / 2, 500, win(t, 29.3, 32.6), { size: 44 });
  }
  // ---------------- B5 the south: Australia, South America, Africa's tip… ocean
  if (t > 32.6 && t < 40.7) {
    const k1 = clamp((t - 33.7) / 0.4), k2 = clamp((t - 34.8) / 0.4), k3 = clamp((t - 35.9) / 0.4);
    fillKey(ctx, c, 'c_oc', C.gold, 0.5 * k1, C.gold); fillKey(ctx, c, 'c_sa', C.gold, 0.5 * k2, C.gold);
    ctx.save(); const [, ey] = P(c, 0, 0); ctx.beginPath(); ctx.rect(0, ey, W, H); ctx.clip(); fillKey(ctx, c, 'c_af', C.gold, 0.5 * k3, C.gold); ctx.restore();
    const lab = (lo, la, s, kk) => { const [x, y] = P(c, lo, la); goldLabel(ctx, s, x, y, 40, pop(kk)); };
    lab(122, -24, 'AUSTRALIA', t - 33.7); lab(-46, -12, 'SOUTH AMERICA', t - 34.8); lab(24, -29, 'TIP OF AFRICA', t - 35.9);
    if (t > 37.1) { ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 4); const [, ey] = P(c, 0, 0); ctx.fillStyle = '#5FD3FF'; ctx.globalCompositeOperation = 'overlay'; ctx.fillRect(0, ey, W, H - ey); ctx.restore(); styledText(ctx, 'OCEAN', W / 2 - 200, 1150, 80, { k: pop(t - 37.2), fill: '#BFE6F2', stroke: C.ink }); }
    styledText(ctx, '80% WATER', W / 2, 330, 150, { k: win(t, 38.1, 40.6), fill: C.yellow, stroke: C.goldDark, rot: -3 }); chip(ctx, 'THE SOUTHERN HALF', W / 2, 480, win(t, 38.5, 40.6), { size: 40 });
  }
  // ---------------- B7 more land → farms, cities, people
  if (t > 45.6 && t < 50.5) {
    popGlow(ctx, c, POP, clamp((t - 48.4) / 0.6), 1.2);
    [[2, 47], [80, 25], [112, 33], [-90, 38], [35, 30], [100, 50]].forEach((p, i) => { const [x, y] = P(c, p[0], p[1]); sprite(ctx, 'farm', x, y, 80, { k: pop(t - 46.7 - i * 0.07) * popOut(50.4 - t), ay: 0.9 }); });
    [[0, 52], [77, 29], [121, 31], [-74, 41], [139, 36]].forEach((p, i) => { const [x, y] = P(c, p[0], p[1]); sprite(ctx, 'skyline', x, y - 30, 110, { k: pop(t - 47.5 - i * 0.08) * popOut(50.4 - t), ay: 0.9 }); });
    chip(ctx, 'MORE FARMS', W / 2, 330, win(t, 46.7, 47.5), { size: 44 }); chip(ctx, 'MORE CITIES', W / 2, 330, win(t, 47.5, 48.3), { size: 44 }); kinetic(ctx, 'MORE PEOPLE', 330, win(t, 48.4, 50.3), 110);
  }
  // ---------------- B8 twist: wheat races to China, corn crawls north
  if (t > 49.4) {
    const FC = [42, 34], CN = [112, 34], MX = [-97, 18], US = [-108, 34];
    const [fx, fy] = P(c, ...FC), [cx2, cy2] = P(c, ...CN), [mx, my] = P(c, ...MX), [ux, uy] = P(c, ...US);
    const end = popOut(60.25 - t, 0.3);
    if (t < 60.3) {
      goldLabel(ctx, 'FERTILE CRESCENT', fx, fy + 60, 34, pop(t - 50.8) * end); goldLabel(ctx, 'CHINA', cx2, cy2 + 60, 40, pop(t - 52.6) * end); goldLabel(ctx, 'MEXICO', mx, my + 60, 38, pop(t - 55.4) * end);
      const wk = clamp((t - 51.6) / 1.2); sarrow(ctx, fx, fy, cx2, cy2, wk * end, C.gold, 10);
      person(ctx, 'farmer_wheat', lerp(fx, cx2, easeIO(wk)), lerp(fy, cy2, easeIO(wk)) - 20 - Math.abs(Math.sin(t * 12)) * 10, 160, { k: pop(t - 50.8) * end });
      const ck = clamp((t - 53.6) / 6.5) * 0.45; sarrow(ctx, mx, my, lerp(mx, ux, ck / 0.45 * 0.99 + 0.01), lerp(my, uy, ck / 0.45 * 0.99 + 0.01), (t > 53.6 ? 1 : 0) * end * 0.5, '#FF6B6B', 8);
      sprite(ctx, 'corn', lerp(mx, ux, ck), lerp(my, uy, ck) - 30, 70, { k: pop(t - 53.6) * end, ay: 0.9 });
      chip(ctx, 'WHEAT: ACROSS ASIA', W / 2, 330, win(t, 50.8, 53.5), { size: 42 }); chip(ctx, 'CORN: THOUSANDS OF YEARS', W / 2, 330, win(t, 53.6, 57.5), { size: 40, stroke: '#FF6B6B' });
      if (t > 57.6) { strokeKey(ctx, c, 'c_eurasia', C.gold, 6, clamp((t - 57.7) / 0.5) * end); strokeKey(ctx, c, 'c_na', '#FF6B6B', 5, clamp((t - 58.0) / 0.5) * end); strokeKey(ctx, c, 'c_sa', '#FF6B6B', 5, clamp((t - 58.0) / 0.5) * end);
        { const a = P(c, -5, 47), b = P(c, 138, 47), d = P(c, -92, 58), e = P(c, -64, -48); sarrow(ctx, a[0], a[1], b[0], b[1], clamp((t - 58.4) / 0.5) * end, C.gold, 12); sarrow(ctx, d[0], d[1], e[0], e[1], clamp((t - 58.7) / 0.5) * end, '#FF6B6B', 12); }
        kinetic(ctx, 'THE SHAPE', 330, win(t, 58.5, 60.2), 130); }
    }
  }
  // ---------------- card + glide back to frame 1
  if (t > 60.2 && t < 63.55) {
    const k = clamp((t - 60.25) / 0.35) * (1 - clamp((t - 62.85) / 0.6)); ctx.save(); ctx.globalAlpha = 0.74 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    title(ctx, 'WHY THE SHAPE\nCHANGED HISTORY', 470, pop(t - 60.3), 116);
    if (window.TIKTOK) {
      chip(ctx, '▶ FULL VIDEO ON YOUTUBE', W / 2, 900, pop(t - 60.7), { size: 48, bg: '#E62117', fill: '#FFFFFF', stroke: '#7A0C08' });
      const kS = pop(t - 61.0); if (kS > 0) { ctx.save(); ctx.translate(W / 2, 1060); ctx.scale(kS, kS); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-330, -58, 660, 116, 58); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(-255, -6, 24, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-238, 12); ctx.lineTo(-215, 35); ctx.stroke();
        setFont(ctx, 'Montserrat', 60); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; const typed = 'Mapheld'.slice(0, Math.max(0, Math.min(7, Math.floor((t - 61.2) * 12)))); ctx.fillText(typed, -190, 4); ctx.restore(); }
      chip(ctx, 'DETAILS IN THE CAPTION ⬇', W / 2, 1200, pop(t - 61.6), { size: 32 });
    } else {
      chip(ctx, 'FULL STORY: TAP HERE', 370, 1180, pop(t - 60.7), { size: 40, bg: C.gold, fill: C.ink, stroke: C.goldDark });
      const b = Math.abs(Math.sin((t - 60.7) * 4.2)) * 40, kA = pop(t - 60.7);
      if (kA > 0) { ctx.save(); ctx.translate(240, 1300 + b); ctx.scale(kA, kA); ctx.fillStyle = C.yellow; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-34, -70); ctx.lineTo(34, -70); ctx.lineTo(34, 10); ctx.lineTo(80, 10); ctx.lineTo(0, 100); ctx.lineTo(-80, 10); ctx.lineTo(-34, 10); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); if (t < 62.85) ring(ctx, 240, 1560, 70, t); }
      person(ctx, 'farmer_wheat', 800, 1500, 340, { k: pop(t - 60.6) });
    }
    kinetic(ctx, 'DID YOU KNOW THIS? 👇', 740, pop(t - 60.5), 64);
    ctx.restore();
  }
  if (t < 3.0) opening(ctx, c, t, 1); else if (t > 62.95) opening(ctx, c, t, clamp((t - 63.0) / 0.5));
}
const CAPTIONS = [
  [0.0, 2.9, 'Two equal halves…'], [3.0, 4.4, '…but not equal people'], [4.5, 8.0, 'The whole south < India'],
  [8.3, 11.3, 'It\'s not the weather'], [11.4, 14.2, 'Hobart vs. Chicago'], [14.3, 17.7, 'Hobart: 10°C+ warmer'],
  [18.0, 19.4, 'Nobody avoided the south'], [19.5, 21.3, 'There just wasn\'t much of it'],
  [21.6, 26.3, 'The continents drifted…'], [26.4, 28.7, '…and most ended up north'], [28.8, 32.5, '68% of all land'],
  [32.7, 37.0, 'Australia, South America, Africa\'s tip…'], [37.1, 40.4, '…and ocean. 80% water'],
  [40.6, 44.0, 'A badly cut pizza'], [44.1, 45.6, 'Mostly box'],
  [45.9, 49.3, 'More land, more people'], [49.6, 53.4, 'Wheat: all the way to China'], [53.5, 57.5, 'Corn: thousands of years'], [57.6, 60.1, 'The shape of the continents'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); pizza(ctx, t, clamp((t - 40.45) / 0.35) * clamp((45.75 - t) / 0.35));
  vignette(ctx); if (t < 60.2) drawText(ctx, t);
  if (t > 62.95) { ctx.save(); ctx.globalAlpha = clamp((t - 63.0) / 0.5); styledText(ctx, 'Two equal halves…', W / 2, CAPTION.y + 80, CAPTION.size, { k: 1, shadow: CAPTION.shadow, maxW: 1000 }); ctx.restore(); }
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}
window.renderAt = renderAt; window.READY = false;
loadAssets().then(() => {
  GLOW = makeGlow(); window.READY = true; if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  ctl.style.display = 'flex'; let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; draw(); };
  const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; last = now; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
