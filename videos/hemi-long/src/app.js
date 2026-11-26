/* Why the north got a head start — Mapheld 16:9 long-form (continues from the 'fewer people than India' Short). */
'use strict';
const W = 1920, H = 1080, DURATION = 204.71;
const C = {
  ocean: '#1E4D5C', land: '#8A855C', landDim: '#6E6B50', coast: '#2C3531', halo: '#2C6A78', ink: '#141416',
  gold: '#F4D03F', goldDark: '#3A2A08', yellow: '#FFD43B', cyan: '#25E3FF', white: '#FFFFFF',
  usRed: '#B22234', usBlue: '#3C3B6E',
};
const CAPTION = { size: 50, y: 905, font: 'Montserrat', shadow: 4 };


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
  world: [20, 22, 6.8], fc: [41, 33, 34], eurasia: [62, 38, 10.5], americas: [-75, 8, 4.9], meso: [-102, 25, 24], andes: [-80, 2, 9], africa: [20, 2, 8.6], rivers: [72, 27, 12],
};
const KEYS = [[0, 'world', 1], [19.0, 'world', 1.03], [21.3, 'fc', 1], [35.0, 'fc', 1.04], [37.2, 'eurasia', 1], [65.3, 'eurasia', 1.03], [66.5, 'eurasia', 1], [85.8, 'eurasia', 1.03],
  [92.3, 'americas', 1], [104.4, 'americas', 1.02], [106.0, 'meso', 1], [117.9, 'meso', 1.03], [119.0, 'andes', 1], [130.0, 'andes', 1.02], [131.4, 'africa', 1], [151.0, 'africa', 1.03],
  [152.6, 'rivers', 1], [168.6, 'rivers', 1.03], [170.0, 'world', 1], [204.71, 'world', 1.06]];
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
function popGlow(ctx, c, list, k, scale = 1) { if (k <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75 * clamp(k); for (const [lo, la, p] of list) { const [x, y] = P(c, lo, la); const r = Math.sqrt(p) * 9 * scale * c.z / 6.8 * Math.min(1, k * 1.5); ctx.drawImage(GLOW, x - r, y - r, r * 2, r * 2); } ctx.restore(); }
function silhouette(ctx, key, x, y, w, col, glow) {   // draw a GEO shape scaled into a box centred at x,y
  const rs = GEO[key]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const r of rs) for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); const yy = -mercY(Math.max(-75, r[i + 1])); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
  const s = w / (x1 - x0); ctx.save(); ctx.translate(x - w / 2, y - (y1 - y0) * s / 2); ctx.scale(s, s); ctx.translate(-x0, -y0); ctx.beginPath();
  for (const r of rs) { for (let i = 0; i < r.length; i += 2) { const xx = r[i], yy = -mercY(Math.max(-75, r[i + 1])); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.closePath(); }
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2 / s; ctx.strokeStyle = glow || C.ink; ctx.stroke(); ctx.restore(); return (y1 - y0) * s; }
// ------------------------------------------------------------------ long-form helpers
const FC = [42, 34], CN = [112, 34], MX = [-99, 18], USSW = [-108, 34];
const FC_ARC = [[31.5, 30.5], [34.8, 32.0], [36.2, 34.5], [37.5, 36.7], [40.0, 37.3], [43.0, 36.9], [44.5, 34.6], [45.8, 32.3], [47.6, 30.6]];
const RIVERS = {
  nile: [[31.2, 30.0], [31.3, 27.2], [32.8, 25.7], [32.9, 24.1], [31.5, 21.8], [30.5, 19.5], [32.5, 15.6], [32.6, 12.0], [31.6, 9.5], [31.7, 6.0], [32.5, 3.5], [32.9, 0.4]],
  euphrates: [[47.8, 30.5], [46.5, 31.0], [45.0, 32.0], [44.3, 32.8], [43.0, 34.0], [41.0, 34.5], [39.5, 35.9], [38.3, 37.0], [39.5, 39.0]],
  tigris: [[47.8, 30.5], [47.0, 31.4], [45.8, 32.5], [44.4, 33.3], [43.7, 34.6], [43.1, 36.3], [42.2, 37.3], [40.5, 38.0]],
  indus: [[67.5, 24.3], [68.4, 25.4], [68.8, 27.7], [70.5, 28.9], [71.4, 30.2], [72.2, 32.4], [72.9, 33.8], [74.5, 35.5], [77, 35], [79.5, 32.5]],
  yellow: [[118.9, 37.7], [117, 36.7], [114.6, 34.9], [111.5, 34.7], [110.4, 34.6], [110.5, 37.5], [111.0, 39.8], [109.0, 40.6], [106.8, 39.3], [105.5, 37.5], [103.8, 36.1], [101.5, 35.5], [98.5, 34.9], [96.5, 34.6]],
};
function geoPath(c, pts) { return pts.map(p => P(c, p[0], p[1])); }
function glowLine(ctx, c, pts, k, col, w = 8, dash) { const sp = geoPath(c, pts); const path = partial(sp, k); if (!path) return; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [m, a] of [[4, .14], [2.2, .3]]) { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w * m; ctx.stroke(path); } ctx.globalAlpha = 1; if (dash) ctx.setLineDash(dash); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(path); ctx.restore(); }
function garrow(ctx, c, a, b, k, col = C.gold, w = 10) { if (k <= 0) return; const p0 = P(c, a[0], a[1]), p1 = P(c, b[0], b[1]); sarrow(ctx, p0[0], p0[1], p1[0], p1[1], k, col, w); }
function iconAt(ctx, c, name, ll, w, k, o = {}) { const [x, y] = P(c, ll[0], ll[1]); sprite(ctx, name, x + (o.dx || 0), y + (o.dy || 0), w, { k, ay: o.ay ?? 0.85, ...o }); }
function labelAt(ctx, c, ll, text, k, dx = 0, dy = 50, size = 34) { const [x, y] = P(c, ll[0], ll[1]); goldLabel(ctx, text, x + dx, y + dy, size, k); }
function dotAt(ctx, c, ll, k, col = '#FFFFFF') { if (k <= 0) return; const [x, y] = P(c, ll[0], ll[1]); ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
function emoji(ctx, ch, x, y, size, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.font = `${size}px "Noto Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, 0); ctx.restore(); }
function mover(ctx, c, name, a, b, u, w, k = 1) { const p0 = P(c, a[0], a[1]), p1 = P(c, b[0], b[1]); const e = easeIO(clamp(u)); sprite(ctx, name, lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e) - Math.abs(Math.sin(e * Math.PI * 6)) * 8, w, { k, ay: 0.85, flip: p1[0] < p0[0] }); }
function band(ctx, c, lat0, lat1, col, a) { if (a <= 0) return; const [, y0] = P(c, 0, lat1), [, y1] = P(c, 0, lat0); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, y0, W, y1 - y0); ctx.restore(); }
function card(ctx, k) { if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.2); ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H); ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore(); }

// ------------------------------------------------------------------ the story
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  // ---------------- B1 recap + the wheat/corn puzzle (0–19.6)
  if (t < 19.6) {
    equator(ctx, c, 1, t);
    fillKey(ctx, c, 'south', '#5FD3FF', 0.3 * win(t, 0.3, 5.4), '#5FD3FF'); fillKey(ctx, c, 'india', C.gold, 0.85 * win(t, 2.5, 5.4), '#FFF3B0');
    chip(ctx, 'THE WHOLE SOUTH < INDIA', W / 2, 150, win(t, 0.2, 3.4), { size: 44 });
    fillKey(ctx, c, 'north', C.gold, 0.35 * win(t, 3.5, 7.1), C.gold); styledText(ctx, '68% OF ALL LAND', W / 2, 160, 110, { k: win(t, 5.6, 7.2), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    chip(ctx, 'BUT EARLY FARMERS NOTICED SOMETHING…', W / 2, 150, win(t, 7.3, 9.6), { size: 42 });
    const [fx, fy] = P(c, ...FC), [cx2, cy2] = P(c, ...CN);
    if (t > 9.5) { labelAt(ctx, c, FC, 'MIDDLE EAST', pop(t - 9.7), 0, 60); labelAt(ctx, c, CN, 'CHINA', pop(t - 11.4), 0, 60); const wk = clamp((t - 10.4) / 1.2); sarrow(ctx, fx, fy, cx2, cy2, wk, C.gold, 10); mover(ctx, c, 'farmer_wheat', FC, CN, wk, 150, pop(t - 9.7)); chip(ctx, 'WHEAT: ALL THE WAY TO CHINA', W / 2, 150, win(t, 9.7, 12.2), { size: 42 }); }
    if (t > 12.2) { labelAt(ctx, c, MX, 'MEXICO', pop(t - 14.4), 0, 60); const ck = clamp((t - 12.6) / 6.5) * 0.5; garrow(ctx, c, MX, [lerp(MX[0], USSW[0], ck + 0.02), lerp(MX[1], USSW[1], ck + 0.02)], 1, '#FF6B6B', 8); iconAt(ctx, c, 'corn', [lerp(MX[0], USSW[0], ck), lerp(MX[1], USSW[1], ck)], 60, pop(t - 12.4));
      chip(ctx, 'CORN: THOUSANDS OF YEARS', W / 2, 150, win(t, 12.3, 16.6), { size: 42, stroke: '#FF6B6B' }); }
    kinetic(ctx, 'WHAT SLOWED THE AMERICAS DOWN?', 150, win(t, 16.7, 19.4), 76);
  }
  // ---------------- B2 the Fertile Crescent (19.6–35.3)
  if (t > 19.6 && t < 35.4) {
    glowLine(ctx, c, FC_ARC, clamp((t - 21.6) / 1.4), C.gold, 14);
    kinetic(ctx, '≈ 11,000 YEARS AGO', 150, win(t, 20.2, 22.5), 96);
    goldLabel(ctx, 'THE FERTILE CRESCENT', ...[P(c, 41.5, 41.3)[0], P(c, 41.5, 41.3)[1]], 52, pop(t - 21.9) * popOut(35.2 - t));
    [[[44.0, 33.0], 'IRAQ', 23.8], [[38.5, 35.0], 'SYRIA', 24.3], [[33.5, 38.0], 'TURKEY', 24.8]].forEach(([ll, n, t0]) => { const [x, y] = P(c, ll[0], ll[1]); styledText(ctx, n, x, y, 36, { k: pop(t - t0) * popOut(35.2 - t), fill: '#fff', stroke: C.ink }); });
    person(ctx, 'farmer_wheat', 330, 900, 280, { k: pop(t - 25.6) * popOut(35.2 - t) }); chip(ctx, 'AMONG THE FIRST FARMERS', W / 2, 150, win(t, 25.6, 28.2), { size: 44 });
    ['🌾 WHEAT', '🌾 BARLEY', '🫘 LENTILS', '🟢 PEAS', '🌿 FLAX'].forEach((s, i) => chip(ctx, s, 1480, 300 + i * 90, win(t, [28.4, 28.9, 29.4, 30.0, 30.6][i], 35.2), { size: 36 }));
    sprite(ctx, 'sheep', 760, 860, 150, { k: pop(t - 32.1) * popOut(35.2 - t), ay: 0.8 }); ['🐐', '🐖', '🐄'].forEach((e, i) => emoji(ctx, e, 930 + i * 130, 820, 90, pop(t - [32.6, 33.0, 33.5][i]) * popOut(35.2 - t)));
  }
  // ---------------- B3 farming spreads west and east (35.3–49.7)
  if (t > 35.3 && t < 49.8) {
    const end = popOut(49.6 - t, 0.3); glowLine(ctx, c, FC_ARC, 1, C.gold, 8);
    chip(ctx, "THOSE CROPS DIDN'T STAY PUT", W / 2, 150, win(t, 35.4, 37.0), { size: 44 });
    const GR = [22.5, 39.5], BR = [-1.5, 52.5], PE = [53, 32.5], IN = [78, 24];
    garrow(ctx, c, FC, GR, clamp((t - 37.4) / 0.9) * end, C.gold, 9); garrow(ctx, c, GR, BR, clamp((t - 40.2) / 0.9) * end, C.gold, 9);
    garrow(ctx, c, FC, PE, clamp((t - 42.4) / 0.8) * end, C.gold, 9); garrow(ctx, c, PE, IN, clamp((t - 43.6) / 0.8) * end, C.gold, 9); garrow(ctx, c, IN, CN, clamp((t - 45.2) / 1.2) * end, C.gold, 9);
    [[GR, 'GREECE', '≈ 9,000 YEARS AGO', 38.5], [BR, 'BRITAIN', '≈ 6,000 YEARS AGO', 40.5], [PE, 'PERSIA', '', 43.8], [IN, 'INDIA', '', 44.5], [CN, 'CHINA', '≈ 4,500 YEARS AGO', 47.0]].forEach(([ll, n, y, t0]) => {
      iconAt(ctx, c, 'wheat', ll, 46, pop(t - t0) * end, { dy: -6 }); labelAt(ctx, c, ll, n, pop(t - t0) * end, 0, 42, 32); if (y) { const [x, yy] = P(c, ll[0], ll[1]); chip(ctx, y, x, yy + 92, pop(t - t0 - 0.2) * end, { size: 26 }); } });
    chip(ctx, 'WEST…', W / 2, 150, win(t, 37.1, 42.3), { size: 44 }); chip(ctx, '…AND EAST', W / 2, 150, win(t, 42.4, 49.6), { size: 44 });
  }
  // ---------------- B4 both directions: horses, chickens, peaches (49.7–65.5)
  if (t > 49.7 && t < 65.6) {
    const end = popOut(65.4 - t, 0.3), CA = [66, 47], EU = [12, 49], SEA = [102, 15], PRS = [53, 32.5], CNa = [113, 34];
    chip(ctx, 'IT WORKED BOTH WAYS', W / 2, 150, win(t, 49.9, 51.4), { size: 44 });
    labelAt(ctx, c, CA, 'CENTRAL ASIA', pop(t - 52.9) * end, 0, 70, 32);
    if (t > 51.4) { const u1 = clamp((t - 53.6) / 1.2), u2 = clamp((t - 54.9) / 1.0); const hk = popOut(56.5 - t, 0.3); if (t < 55.0) mover(ctx, c, 'horse', CA, EU, u1, 130, pop(t - 51.5) * end); else mover(ctx, c, 'horse', CA, CNa, u2, 130, end * hk);
      garrow(ctx, c, CA, EU, u1 * end, '#C9A26B', 8); garrow(ctx, c, CA, CNa, u2 * end, '#C9A26B', 8); chip(ctx, '🐎 HORSES', W / 2, 150, win(t, 51.5, 56.3), { size: 44 }); }
    if (t > 56.3) { garrow(ctx, c, SEA, [80, 25], clamp((t - 56.8) / 1.2) * end, '#F4F1EA', 8); mover(ctx, c, 'chicken', SEA, [82, 24], clamp((t - 56.8) / 1.2), 90, pop(t - 56.4) * end * popOut(58.4 - t, 0.3)); labelAt(ctx, c, SEA, 'SOUTHEAST ASIA', pop(t - 57.0) * end, 0, 60, 30); chip(ctx, '🐔 CHICKENS', W / 2, 150, win(t, 56.4, 58.0), { size: 44 }); }
    if (t > 58.0) { const u = clamp((t - 59.3) / 2.0), u2 = clamp((t - 61.2) / 1.0); const pos = u < 1 ? null : 1; garrow(ctx, c, CNa, PRS, u * end, '#FFAA80', 8); garrow(ctx, c, PRS, EU, u2 * end, '#FFAA80', 8);
      if (u2 <= 0) mover(ctx, c, 'peach', CNa, PRS, u, 70, pop(t - 58.1) * end); else mover(ctx, c, 'peach', PRS, EU, u2, 70, end);
      chip(ctx, '🍑 PEACHES: FROM CHINA', W / 2, 150, win(t, 58.1, 62.8), { size: 42 }); labelAt(ctx, c, PRS, 'PERSIA', pop(t - 62.1) * end, 0, 50, 34);
      if (t > 62.8) { styledText(ctx, 'Prunus persica', W / 2, 160, 84, { k: win(t, 62.9, 65.4), fill: '#FFD6C2', stroke: C.ink, font: 'Playfair Display' }); chip(ctx, '= "THE PERSIAN PLUM"', W / 2, 270, win(t, 63.4, 65.4), { size: 40 }); } }
  }
  // ---------------- B5 the shape of Eurasia (65.5–86)
  if (t > 65.5 && t < 86.1) {
    const end = popOut(85.9 - t, 0.3);
    chip(ctx, 'WHY SO EASY?', W / 2, 150, win(t, 65.6, 67.8), { size: 44 });
    strokeKey(ctx, c, 'c_eurasia', C.gold, 6, clamp((t - 68.6) / 0.6) * end); kinetic(ctx, 'THE SHAPE OF EURASIA', 150, win(t, 68.0, 71.3), 90);
    const PT = [-9, 39.5], JP = [139.7, 36]; garrow(ctx, c, PT, JP, clamp((t - 71.4) / 2.0) * end, C.gold, 14); labelAt(ctx, c, PT, 'PORTUGAL', pop(t - 72.4) * end, 0, 50); labelAt(ctx, c, JP, 'JAPAN', pop(t - 73.4) * end, -20, 50);
    chip(ctx, 'IT STRETCHES SIDEWAYS', W / 2, 150, win(t, 71.4, 74.1), { size: 44 });
    band(ctx, c, 32, 48, '#F4D03F', 0.16 * clamp((t - 74.2) / 0.6) * end); chip(ctx, 'ROUGHLY THE SAME LATITUDES', W / 2, 150, win(t, 74.2, 77.1), { size: 42 });
    ['☀️ SAME SEASONS', '🕒 SAME DAY LENGTH', '🌦️ SAME WEATHER'].forEach((s, i) => chip(ctx, s, 520 + i * 440, 150, win(t, [77.3, 78.6, 79.7][i], 80.5), { size: 36 }));
    if (t > 80.5) [[-5, 40], [20, 42], [45, 38], [70, 40], [95, 38], [118, 36]].forEach((ll, i) => iconAt(ctx, c, 'wheat', ll, 52, pop(t - 81.0 - i * 0.35) * end));
    chip(ctx, 'GROWS HERE → GROWS THERE', W / 2, 150, win(t, 80.6, 85.8), { size: 42 });
  }
  // ---------------- B7 the Americas stretch up and down (92.2–104.7)
  if (t > 92.2 && t < 104.8) {
    const end = popOut(104.6 - t, 0.3); strokeKey(ctx, c, 'c_na', '#FF6B6B', 5, clamp((t - 92.7) / 0.5) * end); strokeKey(ctx, c, 'c_sa', '#FF6B6B', 5, clamp((t - 92.7) / 0.5) * end);
    chip(ctx, 'NOW LOOK AT THE AMERICAS', W / 2, 150, win(t, 92.4, 93.7), { size: 44 });
    garrow(ctx, c, [-100, 70], [-68, -52], clamp((t - 93.8) / 2.2) * end, '#FF6B6B', 14); labelAt(ctx, c, [-100, 70], 'ARCTIC', pop(t - 95.3) * end, -260, 130); labelAt(ctx, c, [-68, -52], 'ALMOST ANTARCTICA', pop(t - 96.0) * end, 300, -20);
    chip(ctx, 'THEY STRETCH UP AND DOWN', W / 2, 150, win(t, 93.8, 97.0), { size: 44 });
    [['#3A86FF', 45, 70], ['#7DDC9A', 25, 45], ['#F4A261', 12, 25], ['#2A9D8F', -15, 12], ['#B0A090', -40, -15]].forEach(([col, a, b], i) => band(ctx, c, a, b, col, 0.14 * clamp((t - 97.2 - i * 0.3) / 0.4) * end));
    chip(ctx, 'EVERY FEW HUNDRED MILES: NEW CLIMATE', W / 2, 150, win(t, 97.1, 101.4), { size: 40 });
    [['🏜️ DESERTS', 101.5], ['🌴 RAINFORESTS', 102.0], ['⛰️ MOUNTAINS', 102.8]].forEach(([s, t0], i) => chip(ctx, s, 560 + i * 400, 150, win(t, t0, 104.6), { size: 38 }));
  }
  // ---------------- B8 corn's slow trip north (104.7–118.1)
  if (t > 104.6 && t < 118.2) {
    const end = popOut(117.9 - t, 0.3), SM = [-99.5, 18.3];
    labelAt(ctx, c, SM, 'SOUTHERN MEXICO', pop(t - 106.1) * end, 0, 70, 38); kinetic(ctx, '≈ 9,000 YEARS AGO', 150, win(t, 106.8, 108.2), 96);
    const ck = clamp((t - 108.3) / 3.6); garrow(ctx, c, SM, USSW, ck * end, '#FF6B6B', 9); iconAt(ctx, c, 'corn', [lerp(SM[0], USSW[0], easeIO(ck)), lerp(SM[1], USSW[1], easeIO(ck))], 70 + 40 * clamp((t - 112.6) / 3.5), pop(t - 104.8) * end);
    labelAt(ctx, c, USSW, 'AMERICAN SOUTHWEST', pop(t - 110.2) * end, 260, 10, 38); styledText(ctx, '4,000+ YEARS', W / 2, 160, 120, { k: win(t, 108.4, 112.4), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    chip(ctx, 'IT HAD TO ADAPT TO SHORTER SUMMERS', W / 2, 150, win(t, 112.5, 117.8), { size: 40 });
    const nm = Math.min(4, Math.floor(clamp((t - 113.6) / 2.4) * 4)); for (let i = 0; i < nm; i++) sprite(ctx, 'corn', 1500 + i * 70, 640, 50 + i * 12, { ay: 1, k: end });
  }
  // ---------------- B9 llamas & potatoes never reached Mexico (118.1–130.2)
  if (t > 118.0 && t < 130.3) {
    const end = popOut(130.0 - t, 0.3), AN = [-72, -14], MXc = [-99, 19];
    labelAt(ctx, c, AN, 'THE ANDES', pop(t - 118.8) * end, 0, 90, 40); iconAt(ctx, c, 'llama', AN, 120, pop(t - 119.8) * end, { dx: -70 }); iconAt(ctx, c, 'potato', AN, 80, pop(t - 120.6) * end, { dx: 70 });
    garrow(ctx, c, AN, [-84, 4], clamp((t - 121.4) / 0.8) * end, '#FFFFFF', 9); const [bx, by] = P(c, -84, 4); redX(ctx, bx, by, 110, clamp((t - 122.3) / 0.4) * end);
    labelAt(ctx, c, MXc, 'MEXICO', pop(t - 122.3) * end, 0, 50, 40); chip(ctx, 'NEVER REACHED MEXICO', W / 2, 150, win(t, 121.5, 124.1), { size: 44, stroke: '#FF6B6B' });
    if (t > 124.1) { for (const ll of [AN, MXc]) { const [x, y] = P(c, ll[0], ll[1]); ring(ctx, x, y, 110, t); } chip(ctx, 'TWO FARMING WORLDS THAT NEVER SHARED', W / 2, 150, win(t, 124.2, 129.9), { size: 40 }); }
  }
  // ---------------- B10 Africa: Ethiopia, the tropics, and the Cape (130.2–151.3)
  if (t > 130.2 && t < 151.4) {
    const end = popOut(151.1 - t, 0.3), MED = [25, 33], ET = [39, 9], WA = [8, 7], CAPE = [19, -33.5];
    chip(ctx, 'AFRICA: THE SAME PROBLEM', W / 2, 150, win(t, 130.3, 131.7), { size: 44 });
    garrow(ctx, c, MED, ET, clamp((t - 132.0) / 1.4) * end, C.gold, 9); iconAt(ctx, c, 'wheat', ET, 50, pop(t - 133.4) * end); labelAt(ctx, c, ET, 'ETHIOPIA ✓', pop(t - 134.6) * end, 0, 50, 34);
    chip(ctx, 'WHEAT & BARLEY: FINE IN THE COOL HIGHLANDS', W / 2, 150, win(t, 131.8, 135.5), { size: 38 });
    band(ctx, c, -8, 8, '#2A9D8F', 0.22 * win(t, 135.6, 137.8) * end); const [tx, ty] = P(c, 22, 0); redX(ctx, tx, ty, 100, clamp((t - 136.0) / 0.4) * win(t, 135.6, 137.8));
    chip(ctx, 'NOT IN THE HOT, WET TROPICS', W / 2, 150, win(t, 135.6, 137.8), { size: 42 });
    if (t > 137.8) { const sp = [WA, [18, 0], [27, -10], [31, -22], [27, -29]]; glowLine(ctx, c, sp, clamp((t - 138.4) / 4.6), '#F4A261', 9); labelAt(ctx, c, WA, 'WEST AFRICA', pop(t - 138.6) * end, -60, -50, 32);
      emoji(ctx, '🌾', ...P(c, 27, -10), 60, pop(t - 141.4) * end); chip(ctx, 'FARMERS SPREAD SOUTH: SORGHUM & MILLET', W / 2, 150, win(t, 138.0, 143.0), { size: 38 });
      const [cx3, cy3] = P(c, ...CAPE); ctx.save(); ctx.globalAlpha = 0.45 * clamp((t - 146.4) / 0.6) * end; ctx.fillStyle = '#3A86FF'; ctx.beginPath(); ctx.ellipse(cx3 + 20, cy3, 80, 46, -0.2, 0, 7); ctx.fill(); ctx.restore();
      if (t > 143.1) { const [sx, sy] = P(c, 27, -29); ctx.save(); ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx - 70, sy + 30); ctx.lineTo(sx + 70, sy + 10); ctx.stroke(); ctx.restore(); chip(ctx, 'THEY STOPPED NEAR THE SOUTHERN TIP', W / 2, 150, win(t, 143.1, 144.6), { size: 40 }); }
      chip(ctx, '✕ NOT MOUNTAINS   ✕ NOT ARMIES', W / 2, 150, win(t, 144.7, 146.3), { size: 40 }); chip(ctx, 'SUMMER-RAIN CROPS vs WINTER-RAIN CAPE', W / 2, 150, win(t, 146.4, 151.0), { size: 38, stroke: '#3A86FF' });
      labelAt(ctx, c, CAPE, 'THE CAPE', pop(t - 148.6) * end, -40, 70, 34); }
  }
  // ---------------- B11 river valleys: first cities, writing, empires (151.3–168.8)
  if (t > 151.2 && t < 168.9) {
    const end = popOut(168.6 - t, 0.3); equator(ctx, c, clamp((t - 165.5) / 0.6) * end, t);
    chip(ctx, 'ONE MORE GIFT', W / 2, 150, win(t, 151.4, 153.6), { size: 44 }); chip(ctx, 'WIDE, FERTILE RIVER VALLEYS', W / 2, 150, win(t, 153.7, 156.3), { size: 44 });
    [['tigris', 156.4], ['euphrates', 156.9], ['nile', 157.8], ['indus', 158.6], ['yellow', 159.4]].forEach(([k, t0]) => glowLine(ctx, c, RIVERS[k], clamp((t - t0) / 0.8) * end, '#5FD3FF', 6));
    [[[46, 31.5], 'ziggurat', 'MESOPOTAMIA', 156.6, 70], [[31.1, 29.9], 'pyramid', 'EGYPT', 158.0, -40], [[72.9, 30.6], 'indus', 'INDUS', 158.8, 0], [[113.5, 35.5], 'gate', 'YELLOW RIVER', 159.6, 0]].forEach(([ll, ic, n, t0, dx]) => { iconAt(ctx, c, ic, ll, 100, pop(t - t0) * end, { dy: -10 }); labelAt(ctx, c, ll, n, pop(t - t0) * end, dx, 50, 30); });
    ['🏛️ FIRST CITIES', '✍️ FIRST WRITING', '👑 FIRST EMPIRES'].forEach((s, i) => chip(ctx, s, 520 + i * 440, 150, win(t, [161.1, 162.0, 163.2][i], 165.6), { size: 36 }));
    kinetic(ctx, 'ALL NORTH OF THE EQUATOR', 150, win(t, 165.6, 168.6), 88);
  }
  // ---------------- B12–13 the first billion; 9 in 10 today (168.8–188.2)
  if (t > 168.7 && t < 188.3) {
    equator(ctx, c, 1, t);
    ['🌍 MORE LAND', '🌾 CROPS THAT TRAVEL', '🌊 RIVERS'].forEach((s, i) => chip(ctx, s, 520 + i * 440, 150, win(t, [168.9, 169.7, 170.9][i], 172.1), { size: 38 }));
    const g = clamp((t - 172.2) / 5.5); popGlow(ctx, c, POP, g, 0.6 + 0.6 * g); popGlow(ctx, c, POPS, g * 0.5, 0.6);
    chip(ctx, 'ASIA & EUROPE KEEP GROWING', W / 2, 150, win(t, 172.2, 175.0), { size: 42 });
    styledText(ctx, '1 BILLION PEOPLE', W / 2, 160, 120, { k: win(t, 176.9, 181.3), fill: C.yellow, stroke: C.goldDark, rot: -3 }); chip(ctx, 'AROUND 1800', W / 2, 280, win(t, 175.1, 181.3), { size: 42 });
    chip(ctx, 'MOSTLY IN ASIA & EUROPE', W / 2, 380, win(t, 178.5, 181.3), { size: 40 });
    if (t > 181.4) { fillKey(ctx, c, 'north', C.gold, 0.35 * clamp((t - 183.4) / 0.6), C.gold); chip(ctx, 'THE HEAD START NEVER WENT AWAY', W / 2, 150, win(t, 181.5, 184.5), { size: 42 }); styledText(ctx, '9 IN 10 PEOPLE', W / 2, 160, 130, { k: win(t, 184.6, 188.1), fill: C.yellow, stroke: C.goldDark, rot: -3 }); }
  }
  // ---------------- B14 the continents dealt the cards (188.2–198.7)
  if (t > 188.2) {
    equator(ctx, c, 1, t); popGlow(ctx, c, POP, 1, 1.0); popGlow(ctx, c, POPS, 0.6, 0.7);
    person(ctx, 'north_cold', 560, 470, 200, { k: pop(t - 189.6) }); person(ctx, 'south_chill', 1380, 820, 200, { k: pop(t - 190.4) });
    chip(ctx, 'EVERYONE CROWDED NEAR THE TOP', W / 2, 150, win(t, 189.6, 191.7), { size: 42 }); chip(ctx, "HUMANITY DIDN'T PICK THE NORTH", W / 2, 150, win(t, 191.8, 194.2), { size: 42 });
    // playing cards dealt onto the continents
    [[-100, 45], [15, 50], [90, 45], [20, 5], [-60, -15], [135, -25]].forEach((ll, i) => { const u = easeOut(clamp((t - 194.4 - i * 0.18) / 0.5)); if (u <= 0) return; const [x, y] = P(c, ll[0], ll[1]); ctx.save(); ctx.translate(lerp(W / 2, x, u), lerp(H + 100, y, u)); ctx.rotate((i - 2.5) * 0.15 * (1 - u) + (i % 2 ? 0.1 : -0.1)); ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-34, -48, 68, 96, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = i < 3 ? '#C0392B' : C.ink; ctx.font = '800 40px Montserrat'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i < 3 ? '♥' : '♠', 0, 4); ctx.restore(); });
    kinetic(ctx, 'THE CONTINENTS DEALT THE CARDS', 150, win(t, 194.3, 198.6), 84);
  }
}
function streetCard(ctx, t) {   // B6: moving house on the same street
  if (t < 85.8 || t > 92.5) return; const k = clamp((t - 85.9) / 0.4) * clamp((92.4 - t) / 0.4); card(ctx, k); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.3);
  ctx.fillStyle = '#5A5A5A'; ctx.fillRect(0, 760, W, 120); ctx.strokeStyle = '#F4D03F'; ctx.lineWidth = 8; ctx.setLineDash([60, 40]); ctx.beginPath(); ctx.moveTo(0, 820); ctx.lineTo(W, 820); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#6AB04C'; ctx.fillRect(0, 700, W, 60);
  sprite(ctx, 'house', 520, 720, 300, { ay: 1 }); sprite(ctx, 'house', 1400, 720, 300, { ay: 1 });
  // the sun is the same over both houses
  ctx.fillStyle = '#FFD43B'; ctx.beginPath(); ctx.arc(960, 260, 80 + 4 * Math.sin(t * 3), 0, 7); ctx.fill(); ctx.strokeStyle = '#E0A800'; ctx.lineWidth = 6; ctx.stroke();
  const u = easeIO(clamp((t - 87.2) / 1.6)); const px = lerp(620, 1300, u);
  person(ctx, 'farmer_wheat', px - 60, 760 - Math.abs(Math.sin(u * Math.PI * 4)) * 14, 220);
  ctx.fillStyle = '#B5653C'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px + 40, 650); ctx.lineTo(px + 100, 650); ctx.lineTo(px + 92, 700); ctx.lineTo(px + 48, 700); ctx.closePath(); ctx.fill(); ctx.stroke();
  emoji(ctx, t > 90.4 ? '🌻' : '🌱', px + 70, 615, 70, 1);
  chip(ctx, 'SAME STREET', W / 2, 150, win(t, 86.1, 88.2), { size: 46 }); chip(ctx, 'SAME WEATHER · SAME SUNLIGHT', W / 2, 150, win(t, 88.3, 89.7), { size: 44 }); chip(ctx, 'YOUR PLANTS DON\'T EVEN NOTICE', W / 2, 150, win(t, 89.8, 92.2), { size: 44 });
  ctx.restore();
}
function endCard(ctx, t) {
  if (t < 198.71) return; const e = t - 198.71, k = clamp(e / 0.4);
  ctx.fillStyle = `rgba(4,10,14,${0.74 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, "HUMANITY DIDN'T PICK THE NORTH.", W / 2, 230, 84, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'THE CONTINENTS DID.', W / 2, 360, 112, { k: pop(e - 0.35, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  const kc = pop(e - 0.9, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 540); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 50);
    const w = ctx.measureText('SUBSCRIBE TO MAPHELD').width + 130; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -60, w, 120, 60); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 44, -22); ctx.lineTo(-w / 2 + 44, 22); ctx.lineTo(-w / 2 + 80, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SUBSCRIBE TO MAPHELD', 24, 3); ctx.restore(); }
  chip(ctx, 'WHICH SOUTHERN COUNTRY WOULD YOU MOVE TO? 👇', W / 2, 700, pop(e - 1.4, 0.35), { size: 40 });
  person(ctx, 'farmer_wheat', 1660, 1010, 220, { k: pop(e - 1.8) });
  const se = e - 2.4; if (se > 0) { const sl = se < 0.16 ? lerp(2.2, 1, easeIn(se / 0.16)) : 1; ctx.save(); ctx.translate(1420, 860); ctx.rotate(-0.15); ctx.scale(sl, sl); ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 105, 0, 7); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 88, 0, 7); ctx.stroke(); setFont(ctx, 'Montserrat', 40); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MAPHELD', 0, 2); setFont(ctx, 'Montserrat', 18); ctx.fillText('★ EVERY BORDER HAS A STORY ★', 0, 44); ctx.restore(); }
}
const CAPTIONS = [
  [0.2, 3.4, 'The whole south < India'], [3.5, 7.2, 'Most land is in the north'], [7.3, 9.6, 'But farmers noticed something'], [9.7, 12.2, 'Wheat reached China'], [12.3, 16.6, 'Corn: thousands of years'], [16.7, 19.4, 'What slowed the Americas?'],
  [19.7, 22.5, '11,000 years ago…'], [22.6, 25.5, 'Iraq, Syria, Turkey'], [25.6, 28.2, 'Among the first farmers'], [28.3, 31.3, 'Wheat, barley, lentils…'], [31.4, 35.1, '…sheep, goats, pigs, cattle'],
  [35.4, 37.0, 'The crops didn\'t stay put'], [37.1, 42.3, 'West: Greece, then Britain'], [42.4, 45.2, 'East: Persia, India…'], [45.3, 49.6, '…and China'],
  [49.9, 51.4, 'It worked both ways'], [51.5, 56.3, 'Horses from Central Asia'], [56.4, 58.0, 'Chickens from Southeast Asia'], [58.1, 62.8, 'Peaches from China'], [62.9, 65.4, '"The Persian plum"'],
  [65.6, 67.8, 'Why so easy?'], [67.9, 71.3, 'The shape of Eurasia'], [71.4, 74.1, 'Portugal to Japan'], [74.2, 77.2, 'Roughly the same latitudes'], [77.3, 80.5, 'Same seasons, days, weather'], [80.6, 85.8, 'Grows here, grows there'],
  [86.1, 88.2, 'Same street…'], [88.3, 92.2, '…your plants don\'t notice'],
  [92.4, 93.7, 'Now the Americas'], [93.8, 97.0, 'Up and down, not sideways'], [97.1, 101.4, 'New climate every few hundred miles'], [101.5, 104.5, 'Deserts, rainforests, mountains'],
  [104.8, 108.3, 'Corn: southern Mexico'], [108.4, 112.4, '4,000+ years to the Southwest'], [112.5, 117.8, 'It had to adapt to shorter summers'],
  [118.2, 121.4, 'The Andes: llamas, potatoes'], [121.5, 124.1, 'Never reached Mexico'], [124.2, 129.9, 'Two worlds that never shared'],
  [130.3, 131.7, 'Africa: the same problem'], [131.8, 135.5, 'Wheat thrived in Ethiopia'], [135.6, 137.8, 'Not in the wet tropics'], [137.9, 143.0, 'Farmers spread south'], [143.1, 146.3, 'They stopped near the tip'], [146.4, 151.0, 'Wrong rain season for their crops'],
  [151.4, 153.6, 'One more gift'], [153.7, 156.3, 'Fertile river valleys'], [156.4, 160.3, 'Tigris, Euphrates, Nile, Indus, Yellow'], [160.4, 165.5, 'First cities, writing, empires'], [165.6, 168.5, 'All north of the equator'],
  [168.9, 172.1, 'Land, crops, rivers'], [172.2, 175.0, 'Asia and Europe kept growing'], [175.1, 178.4, 'Around 1800: 1 billion people'], [178.5, 181.3, 'Mostly in Asia and Europe'], [181.5, 184.5, 'The head start never left'], [184.6, 188.1, 'Today: 9 in 10 live north'],
  [188.3, 191.7, 'Everyone crowded near the top'], [191.8, 194.2, 'Humanity didn\'t pick the north'], [194.3, 198.6, 'The continents dealt the cards'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .24, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, H * 1.0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (!(t > 86.4 && t < 92.0)) scene(ctx, t); streetCard(ctx, t);
  vignette(ctx); if (t < 198.71) drawText(ctx, t); endCard(ctx, t);
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
