/* Where does China's AI actually run? — Mapheld 16:9 long-form (Nvidia / Johor / Hong Kong). renderAt(t) = voice clock incl. breathers. */
'use strict';
const W = 1920, H = 1080, DURATION = 223.49;
const C = {
  ocean: '#1E4D5C', land: '#8A855C', landDim: '#6E6B50', coast: '#2C3531', halo: '#2C6A78', ink: '#141416',
  gold: '#F4D03F', goldDark: '#3A2A08', yellow: '#FFD43B', cyan: '#25E3FF', white: '#FFFFFF',
  usRed: '#B22234', usBlue: '#3C3B6E',
};
const CAPTION = { size: 48, y: 905, font: 'Montserrat', shadow: 4 };


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
const V = { world: [168, 26, 7.0], asia: [113, 22, 26], asia2: [112, 16, 24], johor: [103.72, 1.55, 330], sea: [106, 6, 44], hk: [114.15, 22.32, 320] };
const KEYS = [[0, 'world', 1], [14.6, 'world', 1.03], [16.2, 'asia', 1], [19.4, 'asia', 1.03], [21.6, 'sea', 1], [23.3, 'sea', 1.02], [24.9, 'world', 1], [39.4, 'world', 1.04], [41.2, 'asia', 1],
  [50.6, 'asia', 1.03], [52.3, 'johor', 1], [71.6, 'johor', 1.06], [72.8, 'asia2', 1], [82.0, 'asia2', 1.03], [89.2, 'sea', 1], [101.4, 'sea', 1.03], [102.9, 'johor', 1], [115.4, 'johor', 1.04],
  [119.2, 'johor', 1.04], [120.6, 'asia2', 1], [150.2, 'asia2', 1.02], [151.4, 'sea', 1], [171.3, 'sea', 1.03], [175.6, 'sea', 1.03], [177.2, 'hk', 1], [192.7, 'hk', 1.05], [202.1, 'hk', 1.05], [203.6, 'world', 1], [223.49, 'world', 1.06]];
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
  const set = c.z > 100 ? PATHS.fine : PATHS.wide;   // fine set covers SE Asia only (Johor, Hong Kong zooms)
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
function badge(ctx, text, x, y, k, col) { chip(ctx, text, x, y, k, { size: 40, bg: col, fill: '#fff', stroke: C.ink }); }
// ------------------------------------------------------------------ Nvidia helpers
const RED = '#FF3B3B';
const CAL = [237.9, 37.4], SGP = [103.82, 1.35], KL = [101.7, 3.1], BKK = [100.5, 13.75], JKT = [106.8, -6.2], SHZ = [114.06, 22.55], BJ = [116.4, 39.9];
function chipIcon(ctx, x, y, s, k = 1, glow = true) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  if (glow) { ctx.shadowColor = C.gold; ctx.shadowBlur = 24; }
  ctx.fillStyle = '#2B2B33'; ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-30, -30, 60, 60, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.lineWidth = 4; for (let i = -1; i <= 1; i++) for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(i * 16, sd * 30); ctx.lineTo(i * 16, sd * 42); ctx.moveTo(sd * 30, i * 16); ctx.lineTo(sd * 42, i * 16); ctx.stroke(); }
  ctx.fillStyle = C.gold; ctx.fillRect(-14, -14, 28, 28); ctx.restore(); }
function rack(ctx, x, y, s, k, t) {   // server rack with blinking lights; (x,y) bottom centre
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.fillStyle = '#1C2530'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-40, -120, 80, 120, 8); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 4; i++) { ctx.fillStyle = '#33414F'; ctx.fillRect(-32, -112 + i * 28, 64, 22); for (let j = 0; j < 3; j++) { ctx.fillStyle = (Math.sin(t * 7 + i * 1.7 + j * 2.3) > 0) ? '#7CFC9A' : C.gold; ctx.fillRect(14 + j * 0 - 26 + j * 10, -104 + i * 28, 6, 6); } }
  ctx.restore(); }
function arcPts(a, b, lift) { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * lift]); } return pts; }
function dotted(ctx, c, pts, k, col = C.gold, w = 6, dash = [4, 14], off = 0) {
  if (k <= 0) return; const sp = pts.map(p => P(c, p[0], p[1])); const path = partial(sp, k); if (!path) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash); ctx.lineDashOffset = -off; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.stroke(path); ctx.restore(); }
function chinaWall(ctx, c, k, t, glow = 1) {   // red dashed glowing wall around China
  if (k <= 0) return; fillKey(ctx, c, 'chn', 'rgba(215,38,61,0.28)', k);
  let M = camMatrix(c); const pp = new Path2D(); for (const p of PATHS.chn) pp.addPath(p, M);
  ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = RED; ctx.lineWidth = 9; ctx.setLineDash([26, 14]); ctx.lineDashOffset = -t * 40; ctx.shadowColor = RED; ctx.shadowBlur = 18 + 10 * glow * Math.sin(t * 5); ctx.stroke(pp); ctx.restore(); }
function building(ctx, x, y, s, k, locked) {   // the Megaspeed office (generic, no logo)
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.fillStyle = '#3E4C5E'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-70, -220, 140, 220, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9ED0E6'; for (let r = 0; r < 6; r++) for (let q = 0; q < 3; q++) ctx.fillRect(-52 + q * 38, -200 + r * 32, 28, 20);
  if (locked) { ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-30, -40, 60, 46, 6); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -40, 18, Math.PI, 0); ctx.stroke(); }
  ctx.restore(); }
function cloudBig(ctx, x, y, s, k, t) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.shadowColor = '#9FE8FF'; ctx.shadowBlur = 30;
  const cl = new Path2D(); cl.arc(-70, 10, 55, 0, 7); cl.arc(0, -25, 75, 0, 7); cl.arc(75, 8, 58, 0, 7); cl.rect(-70, 10, 145, 58); ctx.fill(cl); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(-70, 10, 55, Math.PI * 0.5, Math.PI * 1.6); ctx.arc(0, -25, 75, Math.PI * 1.15, Math.PI * 1.9); ctx.arc(75, 8, 58, Math.PI * 1.4, Math.PI * 0.5); ctx.closePath(); ctx.stroke();
  for (let i = 0; i < 3; i++) chipIcon(ctx, -55 + i * 55, 20, 0.45, 1, false); ctx.restore(); }
function seal(ctx, x, y, k) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.15); ctx.scale(k, k); ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 78, 0, 7); ctx.stroke();
  setFont(ctx, 'Montserrat', 34); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MAPHELD', 0, 2); ctx.restore(); }

// ------------------------------------------------------------------ visual-polish kit (counters, silhouettes, cutaway worlds)
function odometer(ctx, t, t0, dur, from, to, fmt, x, y, size, o = {}) {   // eased count-up with a little slot-roll jitter
  const k = o.k === undefined ? 1 : o.k; if (k <= 0 || t < t0) return; const u = clamp((t - t0) / dur), e = easeOut(u);
  const v = from + (to - from) * e, jit = u < 1 ? Math.sin(t * 60) * 5 * (1 - u) : 0;
  styledText(ctx, fmt(v, u), x, y + jit, size * (u < 1 ? 1 : 1 + 0.08 * Math.max(0, 1 - (t - t0 - dur) * 5)), { k: k * pop(t - t0, 0.25), fill: o.fill || C.yellow, stroke: o.stroke || C.goldDark, rot: o.rot ?? -3 }); }
let SIL_CV = null;
function silhouette(ctx, drawFn, reveal) {   // draw anything as a black shape with a white rim, cross-fading to the real thing (reveal 0..1)
  if (!SIL_CV) { SIL_CV = document.createElement('canvas'); SIL_CV.width = W; SIL_CV.height = H; }
  const g = SIL_CV.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); drawFn(g);
  if (reveal < 1) { const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tg = tmp.getContext('2d');
    tg.drawImage(SIL_CV, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#FFFFFF'; tg.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 1 - reveal; for (const [dx, dy] of [[-6, 0], [6, 0], [0, -6], [0, 6], [-4, -4], [4, 4], [-4, 4], [4, -4]]) ctx.drawImage(tmp, dx, dy);
    tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(SIL_CV, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#0A0A0C'; tg.fillRect(0, 0, W, H); ctx.drawImage(tmp, 0, 0); ctx.restore(); }
  if (reveal > 0) { ctx.save(); ctx.globalAlpha = reveal; ctx.drawImage(SIL_CV, 0, 0); ctx.restore(); } }
function cutWorld(ctx, k, kind, t = 0) {   // full-screen backdrop for cutaways: 'ice' | 'blueprint' | 'parchment'
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k);
  if (kind === 'ice') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#DFF4FB'); g.addColorStop(0.62, '#9ED5EA'); g.addColorStop(1, '#2C6A78'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; const r = rnd(17); for (let i = 0; i < 60; i++) { const x = (r() * W + Math.sin(t + i) * 30) % W, y = (r() * H + t * (40 + r() * 50)) % H; ctx.beginPath(); ctx.arc(x, y, 3 + r() * 5, 0, 7); ctx.fill(); } }
  else if (kind === 'blueprint') { ctx.fillStyle = '#0F5CA8'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#2D7BC6'; ctx.lineWidth = 2; for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; for (let x = 0; x <= W; x += 300) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += 300) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
  else { ctx.fillStyle = '#B9A389'; ctx.fillRect(0, 0, W, H); }
  ctx.restore(); }
const countUp = (t, t0, dur, to) => to * easeOut(clamp((t - t0) / dur));
const fmtInt = v => Math.round(v).toLocaleString('en-US');
// ------------------------------------------------------------------ long-form helpers
const JOHOR = [103.6, 1.62], HKG = [114.17, 22.3], TPE = [121.0, 23.8], SHA = [121.47, 31.23];
const CAL2 = [237.9, 37.4];
function serverChar(ctx, x, y, s, t, o = {}) {   // OUR SERVER: a rack with a face. (x,y) = bottom centre
  const k = o.k === undefined ? 1 : o.k; if (k <= 0) return; const on = o.on !== false, sad = !!o.sad;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 110, 16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = on ? '#24313F' : '#1A2129'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(-90, -300, 180, 300, 16); ctx.fill(); ctx.stroke();
  // face panel
  ctx.fillStyle = on ? '#33414F' : '#232B33'; ctx.beginPath(); ctx.roundRect(-70, -282, 140, 110, 12); ctx.fill();
  if (on) { ctx.fillStyle = '#FFFFFF'; for (const sx of [-30, 30]) { ctx.beginPath(); ctx.ellipse(sx, -236, 17, sad ? 12 : 20, 0, 0, 7); ctx.fill(); } ctx.fillStyle = C.ink; for (const sx of [-30, 30]) { ctx.beginPath(); ctx.arc(sx + (o.look || 0) * 6, -233, 8, 0, 7); ctx.fill(); }
    if (o.shock) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, -194, 13, 16, 0, 0, 7); ctx.fill(); } else { ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); if (sad) { ctx.moveTo(-18, -192); ctx.quadraticCurveTo(0, -204, 18, -192); } else { ctx.moveTo(-20, -200); ctx.quadraticCurveTo(0, -184, 20, -200); } ctx.stroke(); } }
  else { ctx.strokeStyle = '#6B7785'; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (const sx of [-30, 30]) { ctx.beginPath(); ctx.moveTo(sx - 15, -234); ctx.lineTo(sx + 15, -234); ctx.stroke(); } }
  // drive bays + lights
  for (let i = 0; i < 4; i++) { ctx.fillStyle = on ? '#3E4D5D' : '#262E37'; ctx.fillRect(-70, -158 + i * 36, 140, 26); for (let j = 0; j < 3; j++) { ctx.fillStyle = on ? ((Math.sin(t * 7 + i * 1.7 + j * 2.3) > 0) ? '#7CFC9A' : C.gold) : '#3A434D'; ctx.fillRect(34 + j * 12, -150 + i * 36, 7, 7); } }
  // a glowing gold chip badge on its chest
  if (o.chip !== false) chipIcon(ctx, -40, -138, 0.32, 1, on);
  ctx.restore(); }
function shipSprite(ctx, x, y, s, k, cargo, flip) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k * (flip ? -1 : 1), s * k);
  ctx.fillStyle = '#1F3B73'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-110, -20); ctx.lineTo(110, -20); ctx.lineTo(85, 20); ctx.lineTo(-85, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F4F1EA'; ctx.fillRect(60, -62, 34, 42); ctx.strokeRect(60, -62, 34, 42);
  if (cargo) { ctx.fillStyle = '#24313F'; ctx.beginPath(); ctx.roundRect(-70, -78, 90, 58, 8); ctx.fill(); ctx.stroke(); chipIcon(ctx, -25, -49, 0.35, 1, false); }
  ctx.restore(); }
function iconX(ctx, kind, x, y, k, xk) {   // ship / form / sneaky smuggler, each crossed out
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = 'rgba(10,24,32,0.92)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 80, 0, 7); ctx.fill(); ctx.stroke();
  if (kind === 'ship') shipSprite(ctx, 0, 20, 0.55, 1, true);
  if (kind === 'form') { ctx.fillStyle = '#FFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.fillRect(-32, -42, 64, 84); ctx.strokeRect(-32, -42, 64, 84); ctx.fillStyle = '#999'; for (let i = 0; i < 4; i++) ctx.fillRect(-22, -28 + i * 16, 44, 5); ctx.fillStyle = '#D7263D'; ctx.beginPath(); ctx.arc(14, 26, 10, 0, 7); ctx.fill(); }
  if (kind === 'sneak') { ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.arc(0, -18, 26, 0, 7); ctx.fill(); ctx.fillRect(-24, 4, 48, 40); ctx.fillStyle = '#F2C9A0'; ctx.fillRect(-18, -24, 36, 12); ctx.fillStyle = C.ink; ctx.fillRect(-12, -22, 7, 7); ctx.fillRect(5, -22, 7, 7); }
  ctx.restore(); redX(ctx, x, y, 110 * k, xk); }
function donut(ctx, x, y, r, frac, k, label, sub) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.lineWidth = r * 0.42;
  ctx.strokeStyle = 'rgba(10,24,32,0.85)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  ctx.strokeStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + 6.283 * frac * clamp(k)); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.restore(); styledText(ctx, label, x, y, r * 0.62, { k, fill: C.yellow, stroke: C.goldDark }); if (sub) chip(ctx, sub, x, y + r * 1.55, k, { size: 30 }); }
function crates(ctx, x, y, n, k, t) {   // stack of H200 crates at Hong Kong
  if (k <= 0) return; let i = 0; for (let row = 0; row < 4; row++) for (let col = 0; col < 6 - row; col++) { if (i++ >= n) break; const cx = x + (col - (5 - row) / 2) * 111, cy = y - row * 87;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k * 1.5, k * 1.5); ctx.fillStyle = '#C68B4E'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.fillRect(-34, -52, 68, 52); ctx.strokeRect(-34, -52, 68, 52); ctx.fillStyle = C.ink; setFont(ctx, 'Montserrat', 15); ctx.textAlign = 'center'; ctx.fillText('H200', 0, -22); ctx.restore(); } }
function stage16(ctx, t, k, cfg) {   // CEO at a podium in a panel; cfg: {in, off0, off1, back0, back1, sadFrom, sadTo}
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
  const x0 = 560, y0 = 250, w = 800, h = 600; ctx.fillStyle = '#122A33'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.clip();
  const spot = ctx.createRadialGradient(960, y0 + 400, 20, 960, y0 + 400, 360); spot.addColorStop(0, 'rgba(255,240,180,0.35)'); spot.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = spot; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = '#0B1A20'; ctx.fillRect(x0, y0 + 520, w, 80);
  let off = 0; if (cfg.off0 !== undefined && t > cfg.off0) off = easeIO(clamp((t - cfg.off0) / 1.0)); if (cfg.back0 !== undefined && t > cfg.back0) off = 1 - easeIO(clamp((t - cfg.back0) / 0.7));
  const cx = lerp(960, x0 - 140, off), sad = cfg.sadFrom !== undefined && t > cfg.sadFrom && (cfg.sadTo === undefined || t < cfg.sadTo);
  person(ctx, sad ? 'ceo_sad' : 'ceo', cx, y0 + 490 - (off > 0 && off < 1 ? Math.abs(Math.sin(t * 9)) * 12 : 0), 290, { k: pop(t - cfg.in) });
  ctx.fillStyle = '#3A3A40'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(890, y0 + 400); ctx.lineTo(1030, y0 + 400); ctx.lineTo(1010, y0 + 540); ctx.lineTo(910, y0 + 540); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.gold; ctx.fillRect(920, y0 + 440, 80, 10);
  if (cfg.cal) { const [c0, c1, from, to] = cfg.cal, kc = win(t, c0, c1); if (kc > 0) { ctx.save(); ctx.translate(x0 + w - 130, y0 + 150); ctx.scale(kc, kc); ctx.fillStyle = '#FFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-90, -90, 180, 190, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#D7263D'; ctx.fillRect(-87, -87, 174, 46);
    setFont(ctx, 'Montserrat', 30); ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NOV', 0, -63); const d = Math.round(lerp(from, to, clamp((t - c0 - 0.2) / 1.0))); setFont(ctx, 'Montserrat', 92); ctx.fillStyle = C.ink; ctx.fillText(String(d), 0, 30); ctx.restore(); } }
  ctx.restore(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.stroke(); ctx.restore(); }
function house16(ctx, t, k, mode) {   // mode 'neighbour' (B8) or 'flip' (B17: window boarded by the US, front door locked by China)
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.4); ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#2C6A78'; ctx.fillRect(0, 860, W, H);
  const hx = 560, hy = 380, hw = 640, hh = 480;
  ctx.fillStyle = '#E8D8B0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.rect(hx, hy, hw, hh); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#B5542B'; ctx.beginPath(); ctx.moveTo(hx - 50, hy + 10); ctx.lineTo(hx + hw / 2, hy - 210); ctx.lineTo(hx + hw + 50, hy + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  const dx = hx + 60, dw = 150, dy = hy + 200, dh = 280; ctx.fillStyle = '#6B4423'; ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(dx + 125, dy + 150, 10, 0, 7); ctx.fill();
  const wx = hx + 400, wy = hy + 150, ww = 190, wh = 170; ctx.fillStyle = '#1C2530'; ctx.fillRect(wx, wy, ww, wh);
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip(); person(ctx, 'china_reach', wx + ww / 2 - 10, wy + wh + 210, 260, { k: 1 }); ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.strokeRect(wx, wy, ww, wh); chip(ctx, '🇨🇳 CHINA', wx + ww / 2, wy - 46, 1, { size: 30 });
  // fence + neighbour (right)
  ctx.fillStyle = '#F1EAD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; for (let i = 0; i < 7; i++) { const fx = 1260 + i * 52; ctx.beginPath(); ctx.moveTo(fx, 880); ctx.lineTo(fx, 720); ctx.lineTo(fx + 18, 700); ctx.lineTo(fx + 36, 720); ctx.lineTo(fx + 36, 880); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (mode === 'neighbour') {
    person(ctx, 'us_guard', dx + 75 - 260, 900, 260, { k: pop(t - 82.4) });
    stamp(ctx, 'LOCKED', dx + 75, dy - 60, t, 83.3, { size: 46 });
    person(ctx, 'neighbour', 1430, 820, 260, { k: pop(t - 83.6) });
    const u = easeIO(clamp((t - 84.4) / 1.1)); if (t > 84.4) chipIcon(ctx, lerp(1430, wx + ww / 2, u), lerp(620, wy + wh / 2 + 20, u) - Math.sin(u * Math.PI) * 110, 0.9, 1);
    styledText(ctx, '🤫', 1560, 520, 70, { k: win(t, 84.2, 88.9) });
    chip(ctx, 'TECHNICALLY… NOBODY USED THE DOOR', W / 2, 120, win(t, 85.9, 88.9), { size: 40 });
  } else {
    // China locks its own front door; the US boards up the side window
    person(ctx, 'china_lock', dx + 75 - 250, 900, 260, { k: pop(t - 198.2) });
    const kb = clamp((t - 196.9) / 0.6); if (kb > 0) { ctx.fillStyle = '#8B5A2B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; for (let i = 0; i < 3; i++) { const kk = clamp(kb * 3 - i); if (kk <= 0) continue; ctx.save(); ctx.translate(wx + ww / 2, wy + 40 + i * 50); ctx.rotate((i % 2 ? 0.12 : -0.12)); ctx.scale(kk, 1); ctx.fillRect(-115, -14, 230, 28); ctx.strokeRect(-115, -14, 230, 28); ctx.restore(); } }
    person(ctx, 'us_guard', 1430, 880, 250, { k: pop(t - 196.3) });
    if (t > 199.4) { const kl = pop(t - 199.4); ctx.save(); ctx.translate(dx + dw / 2, dy + 120); ctx.scale(kl, kl); ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-36, -10, 72, 58, 8); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -10, 24, Math.PI, 0); ctx.lineWidth = 9; ctx.stroke(); ctx.restore(); }
    chip(ctx, '🇺🇸 SIDE WINDOW: NAILED SHUT', 1400, 300, win(t, 196.6, 201.8), { size: 34 });
    chip(ctx, '🇨🇳 FRONT DOOR: LOCKED FROM INSIDE', 520, 300, win(t, 199.3, 201.8), { size: 34 });
  }
  ctx.restore(); }

// ------------------------------------------------------------------ the story
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  const wallOn = (t > 15.8 && t < 23.6) || (t > 41.0 && t < 82.3) || (t > 89.0 && t < 192.9) || t > 211.8;
  if (wallOn) chinaWall(ctx, c, clamp(Math.min(t - 15.8, t > 41 ? t - 41.0 : 9, t > 211.8 ? t - 211.8 : 9) / 0.5), t, t > 212.5 && t < 214 ? 2.5 : 1);
  // ---------- B1–2 cold open: the resignation and return (0–15.6)
  if (t < 16.0) {
    dim(ctx, 0.62 * (1 - clamp((t - 15.0) / 0.8)));
    stage16(ctx, t, win(t, 0.0, 15.4, 0.01, 0.4), { in: 0.0, off0: 4.3, back0: 13.6, sadFrom: 4.2, sadTo: 13.6, cal: [12.6, 15.2, 12, 23] });
    if (t < 4.3) chip(ctx, '📅 NOVEMBER 12, 2026', W / 2, 140, 1, { size: 44 });
    stamp(ctx, 'RESIGNED', 420, 500, t, 4.3, { size: 70, until: 13.5 });
    chip(ctx, 'JENSEN HUANG · NVIDIA CEO', W / 2, 140, win(t, 5.0, 7.3), { size: 44 });
    styledText(ctx, 'THE ENGINE OF THE AI BOOM', W / 2, 140, 64, { k: win(t, 7.4, 9.5), fill: C.yellow, stroke: C.goldDark, rot: -2 });
    chip(ctx, 'EFFECTIVE IMMEDIATELY', W / 2, 140, win(t, 9.6, 12.4), { size: 46, stroke: '#FF6B6B' });
    styledText(ctx, '11 DAYS LATER…', W / 2, 140, 84, { k: win(t, 12.7, 15.4), fill: C.yellow, stroke: C.goldDark, rot: -2 });
    stamp(ctx, 'BACK', 1500, 500, t, 14.1, { size: 70, color: '#2ECC71', until: 15.4 });
  }
  // ---------- B2 the loophole + a tiny country to the south (15.6–23.5)
  if (t > 15.6 && t < 23.7) {
    const k = win(t, 15.9, 23.4);
    kinetic(ctx, 'A LOOPHOLE', 130, win(t, 16.5, 19.3), 90);
    const [sx, sy] = P(c, ...SGP); dotted(ctx, c, arcPts(SGP, SHZ, 2), clamp((t - 17.4) / 1.0) * k, C.gold, 7, [4, 14], t * 40); dotted(ctx, c, arcPts(SGP, BJ, 4), clamp((t - 17.7) / 1.0) * k, C.gold, 7, [4, 14], t * 40);
    if (t > 19.4) { ring(ctx, sx, sy, 60, t); goldLabel(ctx, 'SINGAPORE', sx + 10, sy + 80, 50, pop(t - 19.6) * k); }
    const [hx, hy] = P(c, ...HKG); if (t > 20.5) { ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = '#FFF'; ctx.lineWidth = 5; ctx.setLineDash([16, 12]); const u = clamp((t - 20.5) / 0.7); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lerp(hx, sx, u), lerp(hy, sy, u)); ctx.stroke(); ctx.restore(); chip(ctx, t < 21.6 ? `${fmtInt(countUp(t, 21.0, 0.6, 1600))} MILES` : '1,600 MILES (2,600 KM)', (hx + sx) / 2 + 200, (hy + sy) / 2, pop(t - 21.0) * k, { size: 38 }); }
  }
  // ---------- B3–4 follow one server: California → Taiwan → shipped (23.5–39.6)
  if (t > 23.5 && t < 41.5) {
    const kk = win(t, 23.6, 41.3, 0.32, 0.4);
    serverChar(ctx, 300, 900, 0.95, t, { k: pop(t - 25.2) * popOut(41.0 - t, 0.4), look: 1 });
    chip(ctx, 'OUR SERVER 👋', 300, 560, win(t, 25.4, 30.9), { size: 38 });
    chip(ctx, 'BUILT ➜ SWITCHED ON IN CHINA', W / 2 + 120, 130, win(t, 26.8, 30.9), { size: 40 });
    const [ax, ay] = P(c, ...CAL2), [tx, ty] = P(c, ...TPE);
    if (t > 31.8) { ring(ctx, ax, ay, 40, t); goldLabel(ctx, 'CALIFORNIA', ax, ay - 70, 44, pop(t - 32.0) * kk); badge(ctx, 'DESIGN', ax, ay + 60, pop(t - 32.3) * kk, '#1F3B73'); }
    if (t > 33.4) { dotted(ctx, c, arcPts(CAL2, TPE, 14), clamp((t - 33.4) / 0.9) * kk, C.gold, 7, [4, 14], t * 40); }
    if (t > 34.2) { ring(ctx, tx, ty, 40, t); goldLabel(ctx, 'TAIWAN', tx + 40, ty - 70, 44, pop(t - 34.3) * kk); badge(ctx, 'MADE HERE', tx + 50, ty + 62, pop(t - 34.5) * kk, '#1F3B73'); }
    chip(ctx, '🏠 WORTH ABOUT AS MUCH AS A HOUSE', W / 2 + 120, 130, win(t, 36.3, 39.5), { size: 40 });
    if (t > 37.7) { const u = clamp((t - 37.8) / 3.0); const [x, y] = P(c, lerp(TPE[0], 116, u), lerp(TPE[1] - 1.5, 17, u)); shipSprite(ctx, x, y, 0.8, pop(t - 37.8) * popOut(41.3 - t, 0.3), true, true); }
  }
  // ---------- B5 not allowed into China (39.6–49.9)
  if (t > 39.6 && t < 50.2) {
    const u = clamp((t - 41.2) / 1.0), bump = t > 42.2 ? Math.sin(clamp((t - 42.2) / 0.5) * Math.PI) : 0; const [x0, y0] = P(c, 116, 17), [x1, y1] = P(c, 116.5, 21.6);
    shipSprite(ctx, lerp(x0, x1, easeOut(u)) - bump * 30, lerp(y0, y1, easeOut(u)) + bump * 40, 0.9, popOut(49.9 - t, 0.3), true, false);
    if (t > 42.1 && t < 43.0) puff(ctx, x1, y1 - 30, 90, (t - 42.1) / 0.9, 4);
    chip(ctx, '⛔ NOT ALLOWED', W / 2, 130, win(t, 40.6, 42.5), { size: 46, stroke: '#FF6B6B' });
    chip(ctx, 'SINCE 2022', W / 2, 130, win(t, 42.6, 44.2), { size: 46 });
    person(ctx, 'us_officer', 1640, 930, 300, { k: win(t, 43.5, 49.8) });
    const [cx, cy] = P(c, 102, 29); stamp(ctx, 'US EXPORT BAN', cx, cy, t, 44.3, { size: 60, until: 49.8 });
    styledText(ctx, 'THE FRONT DOOR IS SHUT 🚪', W / 2, 140, 70, { k: win(t, 47.3, 49.8), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  }
  // ---------- B6 Johor (49.9–64.5)
  if (t > 49.9 && t < 64.7) {
    const k = popOut(64.5 - t, 0.3);
    if (t > 50.0 && t < 52.4) { const u = easeIO(clamp((t - 50.0) / 2.2)); const [x0, y0] = P(c, 115, 20), [x1, y1] = P(c, ...JOHOR); shipSprite(ctx, lerp(x0, x1, u), lerp(y0, y1, u), 0.8, 1, true, true); }
    const [jx, jy] = P(c, ...JOHOR), [sx, sy] = P(c, 103.82, 1.33);
    goldLabel(ctx, 'JOHOR, MALAYSIA', jx - 120, jy - 250, 56, pop(t - 52.0) * k); goldLabel(ctx, 'SINGAPORE', sx + 60, sy + 170, 56, pop(t - 54.5) * k);
    const [cwx, cwy] = P(c, 103.77, 1.45); if (t > 53.8) { ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = C.gold; ctx.lineWidth = 12; ctx.shadowColor = C.gold; ctx.shadowBlur = 18; ctx.beginPath(); ctx.moveTo(cwx, cwy - 24); ctx.lineTo(cwx, cwy + 24); ctx.stroke(); ctx.restore(); chip(ctx, 'THE CAUSEWAY', cwx - 230, cwy + 10, win(t, 53.9, 56.0), { size: 34 }); }
    // racks multiply across Johor
    const r = rnd(31); for (let i = 0; i < 16; i++) { const lo = 103.35 + r() * 0.65, la = 1.6 + r() * 0.35; const [x, y] = P(c, lo, la); rack(ctx, x, y, 0.55, pop(t - 55.4 - i * 0.22) * k, t); }
    chip(ctx, 'ONE OF ASIA\'S FASTEST-GROWING DATA-CENTRE MARKETS', W / 2, 130, win(t, 57.6, 60.0), { size: 36 });
    ['🏞️ CHEAP LAND', '⚡ CHEAP POWER', '🌐 FIBRE CABLES'].forEach((s2, i) => chip(ctx, s2, 560 + i * 400, 130, win(t, [60.0, 60.7, 61.5][i], 64.3), { size: 38 }));
    if (t > 61.8) { const kf = clamp((t - 61.9) / 1.0) * k; ctx.save(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 4; ctx.shadowColor = C.cyan; ctx.shadowBlur = 10; for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.3; ctx.beginPath(); ctx.moveTo(jx, jy); ctx.lineTo(jx + Math.cos(a) * 900 * kf, jy + Math.sin(a) * 900 * kf); ctx.stroke(); } ctx.restore(); }
  }
  // ---------- B7 rented out; the login screen; Shanghai; no ship/form/smuggler (64.5–82.2)
  if (t > 64.4 && t < 82.4) {
    const k = popOut(82.2 - t, 0.3);
    const [jx, jy] = P(c, ...JOHOR);
    cutWorld(ctx, win(t, 68.9, 72.0, 0.35, 0.25), 'blueprint', t);
    const hop = [66.9, 68.2].reduce((acc, h) => acc + (t > h && t < h + 0.4 ? Math.sin((t - h) / 0.4 * Math.PI) * 60 : 0), 0);
    const on = t > 65.9; serverChar(ctx, t < 72.0 ? 1500 : jx, t < 72.0 ? 900 - hop : jy + 10, t < 72.0 ? 0.95 : 0.32, t, { k: pop(t - 64.6) * k, on, look: -1 });
    if (t < 72.0 && t > 65.1) { ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1590, 760); ctx.bezierCurveTo(1700, 760, 1700, 900, 1800, 920); ctx.stroke(); ctx.restore(); }
    if (t < 72.0) stamp(ctx, 'FOR RENT', 1500, 520, t, 66.9, { size: 56, color: C.gold, until: 71.9 });
    styledText(ctx, "HERE'S THE TRICK", W / 2, 140, 76, { k: win(t, 67.8, 69.2), fill: C.yellow, stroke: C.goldDark, rot: -2 });
    if (t > 69.2 && t < 72.1) { const kb = win(t, 69.3, 72.0); chip(ctx, '⛔ BANNED: THE CHIPS', 640, 140, kb, { size: 42, stroke: '#FF6B6B' }); chip(ctx, '✅ NOT BANNED: THE LOGIN', 1280, 140, win(t, 70.4, 72.0), { size: 42, stroke: '#2ECC71' });
      const kl = pop(t - 70.6) * popOut(72.0 - t); if (kl > 0) { ctx.save(); ctx.translate(820, 560); ctx.scale(kl, kl); ctx.fillStyle = '#F4F1EA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(-220, -140, 440, 280, 18); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1F3B73'; ctx.fillRect(-216, -136, 432, 44); setFont(ctx, 'Montserrat', 30); ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LOG IN', 0, -114);
        ctx.fillStyle = '#FFF'; ctx.strokeStyle = '#999'; ctx.lineWidth = 3; for (let i = 0; i < 2; i++) { ctx.fillRect(-170, -60 + i * 70, 340, 46); ctx.strokeRect(-170, -60 + i * 70, 340, 46); } ctx.fillStyle = C.ink; setFont(ctx, 'Montserrat', 26); ctx.fillText('••••••••', 0, 33); ctx.fillStyle = '#2ECC71'; ctx.beginPath(); ctx.roundRect(-80, 88, 160, 40, 12); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.fillText('ENTER', 0, 109); ctx.restore(); } }
    if (t > 72.0) { const [hx, hy] = P(c, ...SHA); goldLabel(ctx, 'SHANGHAI', hx + 20, hy - 60, 46, pop(t - 72.2) * k); person(ctx, 'china_reach', hx + 160, hy + 200, 200, { k: pop(t - 72.4) * k });
      dotted(ctx, c, arcPts(JOHOR, SHA, 3), clamp((t - 72.8) / 1.2) * k, C.gold, 7, [4, 14], t * 40);
      const [mx, my] = P(c, 114, 16); chip(ctx, t < 74.0 ? `${fmtInt(countUp(t, 73.4, 0.6, 2000))} MILES` : '2,000+ MILES (3,200+ KM)', mx + 180, my, win(t, 73.4, 76.5), { size: 40 });
      chip(ctx, 'THE SERVER MOVES: 0 INCHES', W / 2, 130, win(t, 76.6, 78.6), { size: 42 });
      [['ship', 78.7], ['form', 79.3], ['sneak', 80.3]].forEach(([kd, t0], i) => iconX(ctx, kd, 1280 + i * 230, 700, pop(t - t0) * k, clamp((t - t0 - 0.25) / 0.3)));
      ['NO SHIP', 'NO FORMS', 'NO SMUGGLER'].forEach((s2, i) => chip(ctx, s2, 1280 + i * 230, 815, pop(t - [78.7, 79.3, 80.3][i]) * k, { size: 26 })); }
  }
  // ---------- B8 the side-window analogy (82.2–89.1)
  house16(ctx, t, win(t, 82.2, 89.1, 0.35, 0.3), 'neighbour');
  // ---------- B9 a quarter of China's AI compute (89.1–101.3)
  if (t > 89.0 && t < 101.5) {
    const k = popOut(101.3 - t, 0.3);
    const pts = [[101.6, 3.1], [103.6, 1.6], [100.5, 13.7], [106.8, -6.2], [103.8, 1.35], [101.2, 2.9], [100.9, 13.9], [106.6, -6.4], [104.0, 1.9], [102.3, 3.0], [101.5, 12.7], [107.0, -6.0]];
    pts.forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); rack(ctx, x + (i % 3) * 22 - 22, y + 10, 0.45, pop(t - 89.6 - i * 0.12) * k, t); });
    chip(ctx, "THIS WASN'T A FEW SERVERS", W / 2, 130, win(t, 89.2, 90.7), { size: 42 });
    chip(ctx, 'ONE ESTIMATE: INSTITUTE FOR PROGRESS (WASHINGTON)', W / 2, 130, win(t, 90.8, 95.2), { size: 34 });
    donut(ctx, 1500, 380, 120, 0.24, win(t, 95.2, 101.2), '≈ ' + Math.round(countUp(t, 95.2, 0.6, 24)) + '%', "OF CHINA'S AI COMPUTE");
    donut(ctx, 1500, 760, 90, 0.75, win(t, 97.8, 101.2), Math.round(countUp(t, 97.8, 0.6, 75)) + '%', 'OF THAT: SE ASIA');
    if (t > 98.8) fillKey(ctx, c, 'mys', C.gold, 0.35 * win(t, 98.9, 101.2)), fillKey(ctx, c, 'tha', C.gold, 0.35 * win(t, 98.9, 101.2)), fillKey(ctx, c, 'idn', C.gold, 0.35 * win(t, 98.9, 101.2)), fillKey(ctx, c, 'sgp', C.gold, 0.6 * win(t, 98.9, 101.2));
  }
  // ---------- B10–11 Megaspeed (101.3–127.5)
  if (t > 101.2 && t < 127.6) {
    const k = popOut(127.4 - t, 0.3);
    const [sx, sy] = P(c, 103.82, 1.33), [jx, jy] = P(c, ...JOHOR); const bs = clamp(c.z / 330, 0.4, 1.1);
    if (c.z > 100) { building(ctx, sx + 40, sy + 60 * bs, 1.0 * bs, pop(t - 102.8) * k, false); goldLabel(ctx, 'MEGASPEED', sx + 40, sy - 200 * bs, 56, pop(t - 103.5) * k); }
    chip(ctx, 'ONE OF THE BIGGEST BUYERS', W / 2, 130, win(t, 101.4, 103.4), { size: 42 });
    chip(ctx, 'CUSTOMS RECORDS (BLOOMBERG)', W / 2, 130, win(t, 104.2, 106.8), { size: 40 });
    odometer(ctx, t, 106.8, 0.75, 0, 4.6, v => 'AT LEAST $' + v.toFixed(1) + ' BILLION', W / 2, 140, 92, { k: popOut(109.8 - t), rot: -2 });
    if (t > 109.8) { serverChar(ctx, jx - 40, jy + 30, 0.4 * bs / 1.04, t, { k: pop(t - 110.0) * k }); chip(ctx, 'RENTED TO ALIBABA (REPORTED)', W / 2, 130, win(t, 111.6, 113.7), { size: 40 }); badge(ctx, 'LEGAL UNDER CURRENT RULES ✓', W / 2, 130, win(t, 113.7, 115.4), '#1E8E3E'); }
    // B11 investigators
    person(ctx, 'us_investigator', 300, 920, 300, { k: win(t, 116.8, 127.3) });
    chip(ctx, 'US INVESTIGATION SINCE 2024', W / 2, 130, win(t, 115.7, 119.4), { size: 40 });
    if (t > 119.4) { const [cx2, cy2] = P(c, 112, 24); dotted(ctx, c, arcPts([103.85, 1.4], [112, 24], 2), clamp((t - 119.6) / 1.0) * k, '#FF6B6B', 7, [4, 14], t * 40); chip(ctx, 'INSIDE CHINA?', cx2, cy2 + 70, win(t, 120.4, 122.7), { size: 44, stroke: '#FF6B6B' }); }
    chip(ctx, 'MEGASPEED DENIES ANY WRONGDOING', W / 2, 130, win(t, 122.7, 124.5), { size: 40, stroke: '#FFFFFF' });
    chip(ctx, 'NVIDIA: NO CHIPS WERE DIVERTED', W / 2, 130, win(t, 124.5, 127.3), { size: 40, stroke: '#FFFFFF' });
  }
  // ---------- B12–13 back to the resignation (127.5–150.4)
  if (t > 127.4 && t < 150.5) {
    dim(ctx, 0.62 * win(t, 127.5, 150.3, 0.4, 0.4));
    stage16(ctx, t, win(t, 128.4, 150.2, 0.35, 0.4), { in: 128.4, sadFrom: 129.5, sadTo: 144.1, cal: [143.6, 146.4, 12, 23] });
    stamp(ctx, 'RESIGNED', 420, 500, t, 129.4, { size: 70, until: 144.0 });
    chip(ctx, 'ADMITTED A RELATIONSHIP…', W / 2, 130, win(t, 131.2, 132.4), { size: 44 });
    chip(ctx, '…WITH A FORMER MEGASPEED EXECUTIVE', W / 2, 130, win(t, 132.4, 134.2), { size: 42 });
    chip(ctx, 'SUSPECTED INTEL LINKS', W / 2, 115, win(t, 134.3, 138.8), { size: 46, stroke: '#FF6B6B' }); chip(ctx, '— ACCORDING TO SOME US OFFICIALS', W / 2, 200, win(t, 134.6, 138.8), { size: 32 });
    chip(ctx, 'NO EVIDENCE SHE WAS SENT TO TARGET HIM', W / 2, 115, win(t, 139.1, 143.4), { size: 44, stroke: '#2ECC71' }); chip(ctx, '— US INTELLIGENCE OFFICIALS TO CONGRESS', W / 2, 200, win(t, 139.4, 143.4), { size: 30 });
    stamp(ctx, 'REINSTATED', 1500, 500, t, 144.5, { size: 64, color: '#2ECC71', until: 146.6 });
    styledText(ctx, 'BUT THE MAP HAD ALREADY CHANGED', W / 2, 140, 66, { k: win(t, 146.6, 150.2), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  }
  // ---------- B14 the crackdown (150.4–171.5)
  if (t > 150.3 && t < 171.6) {
    const k = popOut(171.4 - t, 0.3);
    const [sx, sy] = P(c, 103.82, 1.33); building(ctx, sx + 10, sy, 0.38, k, true);
    stamp(ctx, 'BLACKLISTED', W / 2, 140, t, 151.0, { size: 60, until: 155.2 });
    const fl = [[103.8, 1.3], [101.7, 3.1], [103.6, 1.6], [100.5, 13.7], [101.2, 2.9], [103.9, 1.4]]; fl.forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); chip(ctx, '⛔', x + (i % 2 ? 40 : -40), y - 40 - (i % 3) * 30, win(t, 152.2 + i * 0.12, 155.2), { size: 28, bg: '#7A0C08', stroke: '#FF8A8A' }); });
    chip(ctx, '+ 6 OTHER FIRMS', 1560, 300, win(t, 152.2, 155.2), { size: 40, stroke: '#FF6B6B' });
    chip(ctx, 'NEW US RULES: DATA CENTRES MUST PROVE IT', W / 2, 130, win(t, 155.3, 160.3), { size: 38 });
    const kc = win(t, 155.6, 160.3); if (kc > 0) { ctx.save(); ctx.translate(1560, 560); ctx.scale(kc, kc); ctx.fillStyle = '#B8935A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-150, -150, 300, 300, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFF'; ctx.fillRect(-130, -120, 260, 250);
      setFont(ctx, 'Montserrat', 22); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ['WHO OWNS IT?', 'WHO USES IT?', 'NO CHINA AI', 'NO BLACKLIST'].forEach((s2, i) => { ctx.fillText(s2, -70, -80 + i * 58); if (t > 156.6 + i * 0.6) { ctx.strokeStyle = '#2ECC71'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-115, -82 + i * 58); ctx.lineTo(-105, -70 + i * 58); ctx.lineTo(-91, -96 + i * 58); ctx.stroke(); } }); ctx.restore(); }
    fillKey(ctx, c, 'mys', '#FF6B6B', 0.4 * win(t, 160.3, 163.7), '#FF8A8A'); chip(ctx, '🇲🇾 MALAYSIA: STOP HOSTING THEM', W / 2, 130, win(t, 160.3, 163.7), { size: 40 });
    if (t > 163.8 && t < 167.6) [[103.8, 1.35], [101.7, 3.1], [100.5, 13.7], [106.8, -6.2]].forEach((ll, i) => { const u = clamp((t - 163.9 - i * 0.15) / 1.2); const [x0, y0] = P(c, 125, 12 - i * 4), [x1, y1] = P(c, ...ll); const v = Math.min(u, 0.55); shipSprite(ctx, lerp(x0, x1, v), lerp(y0, y1, v), 0.45, 1, true, true); if (u > 0.55) redX(ctx, lerp(x0, x1, 0.55), lerp(y0, y1, 0.55) - 20, 80, clamp((u - 0.55) / 0.3)); });
    chip(ctx, 'NVIDIA PAUSES SHIPMENTS (REPORTED)', W / 2, 130, win(t, 163.8, 166.5), { size: 40 });
    styledText(ctx, '4 COUNTRIES', W / 2, 140, 96, { k: win(t, 166.5, 171.3), fill: C.yellow, stroke: C.goldDark, rot: -2 });
    [['sgp', 167.7], ['mys', 168.3], ['tha', 169.0], ['idn', 169.6]].forEach(([key, t0]) => fillKey(ctx, c, key, RED, 0.45 * clamp((t - t0) / 0.3) * k, '#FF8A8A'));
    [['THAILAND', 169.0], ['MALAYSIA', 168.3], ['SINGAPORE', 167.7], ['INDONESIA', 169.6]].forEach(([lab, t0], i) => chip(ctx, `⛔ ${lab}`, 1600, 330 + i * 110, pop(t - t0) * k, { size: 36, bg: '#7A0C08', stroke: '#FF8A8A' }));
  }
  // ---------- B15 our server switches off (171.5–175.4)
  if (t > 171.4 && t < 175.6) {
    const k = win(t, 171.5, 175.4, 0.35, 0.3); cutWorld(ctx, k, 'blueprint', t);
    serverChar(ctx, W / 2, 880, 1.25, t, { k, on: t < 173.7, sad: t > 172.6, look: 0 });
    if (t > 173.7) { styledText(ctx, 'z', W / 2 + 150, 420 - ((t - 173.7) * 40) % 60, 54, { k, fill: '#BFE6F2' }); styledText(ctx, 'z', W / 2 + 200, 360 - ((t - 173.9) * 40) % 60, 40, { k: k * clamp((t - 173.9) * 3), fill: '#BFE6F2' }); }
    chip(ctx, 'OUR SERVER…', W / 2, 130, win(t, 171.6, 172.9), { size: 44 }); chip(ctx, '…SWITCHED OFF?', W / 2, 130, win(t, 173.0, 175.3), { size: 44 });
  }
  // ---------- B16 the twist: Hong Kong (175.4–192.9)
  if (t > 175.4 && t < 193.0) {
    const k = popOut(192.85 - t, 0.3);
    kinetic(ctx, 'THE TWIST', 140, win(t, 175.6, 177.8), 96);
    chip(ctx, 'AMERICA: YEARS KEEPING CHIPS OUT…', W / 2, 130, win(t, 177.9, 180.8), { size: 40 });
    const [hx, hy] = P(c, 114.17, 22.29); const n = Math.floor(clamp((t - 181.0) / 2.0) * 18);
    crates(ctx, hx + 200, hy + 330, n, k, t); if (t > 186.4) ring(ctx, hx, hy, 50, t); goldLabel(ctx, 'HONG KONG', hx - 200, hy - 70, 60, pop(t - 186.6) * k);
    odometer(ctx, t, 181.0, 0.9, 0, 600000, v => '≈ ' + fmtInt(Math.round(v / 1000) * 1000) + ' NVIDIA H200s', W / 2, 140, 84, { k: popOut(184.0 - t), rot: -2 });
    person(ctx, 'us_officer', 300, 930, 280, { k: win(t, 183.9, 192.6) }); stamp(ctx, 'US: APPROVED ✓', 300, 520, t, 184.6, { size: 46, color: '#7CFC9A', until: 192.6 });
    chip(ctx, '⏳ WAITING', hx + 300, hy - 90, win(t, 187.8, 192.6), { size: 40 });
    if (t > 189.2 && t < 192.7) { const ks = pop(t - 189.2) * popOut(192.6 - t); silhouette(ctx, g => person(g, 'china_lock', 1730, 930, 280, { k: ks }), clamp((t - 190.9) / 0.3)); if (t < 190.9) styledText(ctx, '?', 1730, 600, 120, { k: pop(t - 189.4), fill: C.yellow, stroke: C.goldDark }); }
    styledText(ctx, t < 190.9 ? 'BLOCKED BY…' : 'BLOCKED BY… BEIJING', W / 2, 140, 84, { k: win(t, 189.7, 192.7), fill: '#FF6B6B', stroke: C.ink, rot: -2 });
  }
  // ---------- B17 China locks its own front door (192.9–202)
  house16(ctx, t, win(t, 192.9, 201.9, 0.35, 0.3), 'flip');
  if (t > 192.9 && t < 196.2) { chip(ctx, 'BEIJING: USE CHINESE-MADE CHIPS', W / 2, 130, win(t, 193.0, 196.1), { size: 40 }); chipIcon(ctx, W / 2 + 470, 130, 0.7, win(t, 194.6, 196.1)); }
  // ---------- B18 the new oil (202–211.3)
  if (t > 201.9 && t < 211.5) {
    const k = popOut(211.3 - t, 0.3);
    const kd = win(t, 203.0, 206.0); if (kd > 0) { ctx.save(); ctx.translate(360, 860); ctx.scale(kd, kd); ctx.strokeStyle = C.ink; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(0, -260); ctx.lineTo(80, 0); ctx.moveTo(-55, -80); ctx.lineTo(55, -80); ctx.moveTo(-30, -170); ctx.lineTo(30, -170); ctx.stroke(); ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.ellipse(0, 6, 140, 26, 0, 0, 7); ctx.fill(); ctx.restore(); redX(ctx, 360, 740, 240, clamp((t - 205.0) / 0.4)); chip(ctx, 'OIL 🛢️', 360, 920, kd, { size: 36 }); }
    // undersea cables + ports + data centres
    const lines = [[[103.8, 1.3], [114.2, 22.3]], [[114.2, 22.3], [121.5, 31.2]], [[103.8, 1.3], [72.8, 19]], [[72.8, 19], [55.3, 25.2]], [[121.0, 25], [237.9, 37.4]], [[139.7, 35.6], [237.9, 37.4]], [[103.8, 1.3], [151.2, -33.9]], [[114.2, 22.3], [139.7, 35.6]]];
    lines.forEach((ab, i) => dotted(ctx, c, arcPts(ab[0], ab[1], 6), clamp((t - 206.4 - i * 0.15) / 1.0) * k, C.cyan, 9, [3, 14], t * 40));
    [[103.8, 1.3], [114.2, 22.3], [121.5, 31.2], [237.9, 37.4], [55.3, 25.2], [139.7, 35.6]].forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); rack(ctx, x, y, 0.55, pop(t - 207.0 - i * 0.15) * k, t); });
    styledText(ctx, 'THE NEW OIL: COMPUTING POWER', W / 2, 140, 70, { k: win(t, 206.2, 211.2), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  }
  // ---------- B19 where does the side window open next? (211.3–217.4) + end card
  if (t > 211.3) {
    const qs = [[78, 22], [54, 24]]; // India, the Gulf: the next big AI data-centre hubs
    qs.forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); styledText(ctx, '?', x, y, 110, { k: pop(t - 214.2 - i * 0.3) * (1 - clamp((t - 217.2) / 0.4)), fill: C.yellow, stroke: C.goldDark, rot: Math.sin(t * 3 + i) * 8 }); });
    chip(ctx, 'A WALL AROUND AI…', W / 2, 130, win(t, 212.5, 214.0), { size: 44 });
  }
  if (t > 217.0) {
    const k = clamp((t - 217.1) / 0.4); ctx.save(); ctx.globalAlpha = 0.78 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    title(ctx, 'THE AI LOOPHOLE', 260, pop(t - 217.2), 110);
    seal(ctx, 1660, 820, pop(t - 217.8));
    chip(ctx, '🔔 SUBSCRIBE FOR MORE MAP STORIES', W / 2, 820, pop(t - 218.2), { size: 40, bg: '#E62117', fill: '#FFFFFF', stroke: '#7A0C08' });
  }
}
const QUESTION = 'WHERE DOES THE LOOPHOLE MOVE NEXT? 👇';
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .5, H * .45, W / 2, H * .5, H * .95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
const NOSUBS = new URLSearchParams(location.search).has('nosubs');
function drawText(ctx, t) { if (NOSUBS) return; for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .2, .14); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1700 }); } }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); vignette(ctx); if (t < 217.1) drawText(ctx, t);
  if (t > 214.0) { const y = t < 217.1 ? 800 : lerp(800, 560, easeIO((t - 217.1) / 0.5)); styledText(ctx, QUESTION, W / 2, y, 64, { k: pop(t - 214.1), fill: C.yellow, stroke: C.goldDark, rot: -2, maxW: 1700 }); }
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
