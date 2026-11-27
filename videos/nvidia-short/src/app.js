/* The Nvidia / Singapore cloud loophole — Mapheld 9:16 short; card, then glides back into frame 1 (loop). */
'use strict';
const W = 1080, H = 1920, DURATION = 65.47;
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
const V = { pac: [154, 30, 6.0], asia: [110, 22, 16.5], sea: [106, 8, 34], sg: [103.8, 1.6, 230] };
const KEYS = [[0, 'pac', 1], [4.6, 'pac', 1.04], [5.9, 'asia', 1], [11.9, 'asia', 1.04], [13.0, 'sea', 1], [18.7, 'sea', 1.03], [20.2, 'sg', 1], [29.6, 'sg', 1.05], [50.1, 'sg', 1.05], [51.3, 'sea', 1], [59.6, 'sea', 1.03], [61.0, 'asia', 1], [63.3, 'asia', 1.03], [64.8, 'asia', 1.03], [65.47, 'pac', 1]];
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
  const set = c.z > 40 ? PATHS.fine : PATHS.wide;   // fine set covers SE Asia only
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
function house(ctx, t, k) {   // B5 cutaway: guard at the front door, neighbour at the side window
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.4); ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2C6A78'; ctx.fillRect(0, 1420, W, H); // ground
  const hx = 90, hy = 760, hw = 620, hh = 660;
  ctx.fillStyle = '#E8D8B0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.rect(hx, hy, hw, hh); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#B5542B'; ctx.beginPath(); ctx.moveTo(hx - 50, hy + 10); ctx.lineTo(hx + hw / 2, hy - 250); ctx.lineTo(hx + hw + 50, hy + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  // front door (left), side window (right)
  ctx.fillStyle = '#6B4423'; ctx.beginPath(); ctx.roundRect(hx + 70, hy + 380, 150, 280, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(hx + 195, hy + 530, 10, 0, 7); ctx.fill();
  const wx = hx + 400, wy = hy + 260, ww = 190, wh = 170; ctx.fillStyle = '#1C2530'; ctx.fillRect(wx, wy, ww, wh);
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip(); person(ctx, 'china_reach', wx + ww / 2 - 10, wy + wh + 210, 260, { k: 1 }); ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.strokeRect(wx, wy, ww, wh); chip(ctx, '🇨🇳 CHINA', wx + ww / 2, wy - 50, pop(t - 30.3), { size: 32 });
  // guard + delivery being turned away at the door
  person(ctx, 'us_guard', hx + 145, 1440, 270, { k: pop(t - 30.0) });
  stamp(ctx, 'LOCKED', hx + 160, hy + 110, t, 30.9, { size: 52 });
  // fence + neighbour on the right, box sliding into the window
  ctx.fillStyle = '#F1EAD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; for (let i = 0; i < 6; i++) { const fx = 760 + i * 52; ctx.beginPath(); ctx.moveTo(fx, 1440); ctx.lineTo(fx, 1270); ctx.lineTo(fx + 18, 1250); ctx.lineTo(fx + 36, 1270); ctx.lineTo(fx + 36, 1440); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  person(ctx, 'neighbour', 900, 1330, 270, { k: pop(t - 31.4) });
  const u = easeIO(clamp((t - 32.4) / 1.2)); if (t > 32.4) chipIcon(ctx, lerp(900, wx + ww / 2, u), lerp(1130, wy + wh / 2 + 20, u) - Math.sin(u * Math.PI) * 120, 0.9, 1);
  styledText(ctx, '🤫', 990, 1010, 70, { k: win(t, 31.8, 34.5) });
  ctx.restore(); }
function stage(ctx, t, k) {   // B6: the CEO at a podium, resigns, comes back 11 days later
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
  const x0 = 60, y0 = 820, w = 960, h = 640; ctx.fillStyle = '#122A33'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.clip();
  const spot = ctx.createRadialGradient(540, y0 + 420, 20, 540, y0 + 420, 380); spot.addColorStop(0, 'rgba(255,240,180,0.35)'); spot.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = spot; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = '#0B1A20'; ctx.fillRect(x0, y0 + 560, w, 80);
  // CEO position: on podium → walks off left (38.8–39.8) → back on (49.0–49.6)
  const off = t < 38.8 ? 0 : t < 49.0 ? easeIO(clamp((t - 38.8) / 1.0)) : 1 - easeIO(clamp((t - 49.0) / 0.6));
  const cx = lerp(540, -120, off), sad = t > 38.3 && t < 49.0;
  person(ctx, sad ? 'ceo_sad' : 'ceo', cx, y0 + 520 - (off > 0 && off < 1 ? Math.abs(Math.sin(t * 9)) * 14 : 0), 300, { k: pop(t - 36.6) });
  // podium in front (hands stay above it)
  ctx.fillStyle = '#3A3A40'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(470, y0 + 430); ctx.lineTo(610, y0 + 430); ctx.lineTo(590, y0 + 580); ctx.lineTo(490, y0 + 580); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.gold; ctx.fillRect(500, y0 + 470, 80, 10);
  // calendar 11 days
  const kc = win(t, 47.5, 50.1); if (kc > 0) { ctx.save(); ctx.translate(840, y0 + 200); ctx.scale(kc, kc); ctx.fillStyle = '#FFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-90, -90, 180, 190, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#D7263D'; ctx.fillRect(-87, -87, 174, 46);
    setFont(ctx, 'Montserrat', 30); ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DAY', 0, -63); const d = Math.min(11, 1 + Math.floor(clamp((t - 47.6) / 0.9) * 10)); setFont(ctx, 'Montserrat', 92); ctx.fillStyle = C.ink; ctx.fillText(String(d), 0, 30); ctx.restore(); }
  ctx.restore(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.stroke();
  chip(ctx, "NVIDIA'S CEO, JENSEN HUANG", W / 2, y0 + 60, win(t, 37.4, 38.7), { size: 34 });
  stamp(ctx, 'RESIGNED', 290, y0 + 230, t, 38.3, { size: 64, until: 47.4 });
  stamp(ctx, 'REINSTATED', 290, y0 + 230, t, 49.1, { size: 64, until: 50.2, color: '#2ECC71' });
  ctx.restore(); }
function seal(ctx, x, y, k) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.15); ctx.scale(k, k); ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 78, 0, 7); ctx.stroke();
  setFont(ctx, 'Montserrat', 34); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MAPHELD', 0, 2); ctx.restore(); }

// ------------------------------------------------------------------ the story
function opening(ctx, c, t, A = 1) {   // shared first / last frame: the wall around China
  if (A <= 0) return; ctx.save(); ctx.globalAlpha = A;
  chinaWall(ctx, c, 1, t); title(ctx, 'BANNED:\nTHE BEST AI CHIPS', 330, 1, 104);
  const [x, y] = P(c, 104, 35); stamp(ctx, 'US EXPORT BAN', x, y + 30, 100, 0, { size: 46 });
  person(ctx, 'us_officer', 880, 1420, 260, { k: 1 });
  const [cx, cy] = P(c, CAL[0], CAL[1]); chipIcon(ctx, cx - 40, cy - 30, 1.0, 1); goldLabel(ctx, 'CALIFORNIA', cx - 110, cy - 100, 38, 1);
  ctx.restore(); }
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  // wall stays up the whole time (China is boxed in)
  if (t > 4.6 && t < 63.4) chinaWall(ctx, c, 1, t, t > 60.2 && t < 61.8 ? 2.5 : 1);
  // ---------- B1 the ban (0–4.83)
  if (t < 5.0) {
    opening(ctx, c, t, 1 - clamp((t - 4.6) / 0.4));
    [[0.6, 0], [1.6, 1], [2.6, 2], [3.4, 3]].forEach(([t0, i]) => { const u = clamp((t - t0) / 1.1); if (u <= 0 || u >= 1) return;
      const a = [CAL[0] - 2, CAL[1]], hit = [123 + i * 0.5, 36 - i * 4], b = [108 + i * 2, 4 - i * 1.5]; let lo, la;
      if (u < 0.6) { const v = easeIn(u / 0.6); lo = lerp(a[0], hit[0], v); la = lerp(a[1], hit[1], v) + Math.sin(v * Math.PI) * 14; } else { const v = easeOut((u - 0.6) / 0.4); lo = lerp(hit[0], b[0], v); la = lerp(hit[1], b[1], v) + Math.sin(v * Math.PI) * 6; }
      const [x, y] = P(c, lo, la); chipIcon(ctx, x, y, 0.8, 1); if (u > 0.58 && u < 0.7) puff(ctx, ...P(c, hit[0], hit[1]), 70, (u - 0.58) / 0.12, i + 2); });
    styledText(ctx, 'BOUNCED 💥', W / 2, 560, 60, { k: win(t, 2.3, 4.6), fill: '#FF6B6B', stroke: C.ink, rot: -3 });
  }
  // ---------- B2 still used them (4.83–9.79)
  if (t > 4.8 && t < 10.0) {
    const [sx, sy] = P(c, ...SGP); chipIcon(ctx, sx, sy, 0.9, pop(t - 5.3)); goldLabel(ctx, 'SINGAPORE', sx + 10, sy + 90, 44, pop(t - 5.5));
    dotted(ctx, c, arcPts(SGP, SHZ, 2), clamp((t - 6.2) / 0.8), C.gold, 7, [4, 14], t * 40); dotted(ctx, c, arcPts(SGP, BJ, 4), clamp((t - 6.5) / 0.9), C.gold, 7, [4, 14], t * 40);
    const [bx, by] = P(c, 108, 35); person(ctx, 'china_reach', bx, by + 120, 230, { k: pop(t - 5.6) });
    kinetic(ctx, 'STILL USED THEM', 330, win(t, 6.3, 7.4), 88);
    styledText(ctx, '0 CHIPS CROSSED', W / 2, 330, 96, { k: win(t, 7.6, 9.75), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  }
  // ---------- B3 renting, not smuggling (9.79–18.85)
  if (t > 9.8 && t < 19.0) {
    const k1 = win(t, 9.9, 11.3); if (k1 > 0) { const [x, y] = P(c, 116, 18); ctx.save(); ctx.translate(x, y); ctx.scale(k1, k1); ctx.fillStyle = '#8B5A2B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-110, -10); ctx.lineTo(110, -10); ctx.lineTo(80, 40); ctx.lineTo(-80, 40); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#C68B4E'; ctx.fillRect(-50, -70, 100, 60); ctx.strokeRect(-50, -70, 100, 60); ctx.restore(); chipIcon(ctx, x, y - 40, 0.5, k1, false); redX(ctx, x, y - 10, 220, clamp((t - 10.4) / 0.35)); }
    chip(ctx, 'NOT SMUGGLING…', W / 2, 330, win(t, 9.9, 11.3), { size: 46 });
    stamp(ctx, 'FOR RENT', W / 2, 340, t, 11.45, { size: 72, until: 12.6, color: C.gold });
    [[SGP, 13.08, 'SINGAPORE', [60, 110]], [KL, 13.64, 'MALAYSIA', [-150, 40]], [BKK, 14.3, 'THAILAND', [-150, -40]]].forEach(([ll, t0, lab, o]) => {
      const [x, y] = P(c, ll[0], ll[1]); rack(ctx, x, y + 20, 0.8, pop(t - t0), t); goldLabel(ctx, lab, x + o[0], y + o[1], 40, pop(t - t0 - 0.1)); });
    if (t > 14.8) { [SGP, KL, BKK].forEach((ll, i) => { const u = clamp((t - 14.9 - i * 0.15) / 0.8); if (u > 0 && u < 1) { const [x0, y0] = P(c, 128, 12 - i * 3), [x1, y1] = P(c, ll[0], ll[1]); chipIcon(ctx, lerp(x0, x1, easeOut(u)), lerp(y0, y1, easeOut(u)) - 60, 0.6, 1); } }); }
    badge(ctx, 'LEGAL ✓', W / 2, 460, win(t, 15.2, 16.2), '#1E8E3E');
    if (t > 16.2) { [SGP, KL, BKK].forEach((ll, i) => dotted(ctx, c, [[ll[0], ll[1] + 1], [ll[0] + 4 + i, 24]], clamp((t - 16.3 - i * 0.2) / 0.9), C.gold, 6, [4, 14], t * 40)); }
    chip(ctx, 'RENTED OUT ⏱', W / 2, 330, win(t, 16.25, 17.1), { size: 46 }); chip(ctx, '🌐 TO ANYONE ONLINE', W / 2, 330, win(t, 17.15, 18.8), { size: 46 });
  }
  // ---------- B4 Megaspeed (18.85–29.77)
  if (t > 18.8 && t < 30.0) {
    const [sx, sy] = P(c, ...SGP); const bs = clamp(c.z / 230, 0.5, 1.1);
    building(ctx, sx, sy + 40 * bs, 1.1 * bs, pop(t - 20.0), false); goldLabel(ctx, 'MEGASPEED', sx, sy - 240 * bs, 56, pop(t - 20.9));
    chip(ctx, 'A SINGAPORE COMPANY', W / 2, 330, win(t, 19.9, 21.9), { size: 42 });
    person(ctx, 'us_investigator', 230, 1450, 280, { k: pop(t - 22.0) });
    chip(ctx, 'US PROBE SINCE 2024', W / 2, 330, win(t, 22.4, 24.75), { size: 44 });
    if (t > 24.8) { const [x, y] = P(c, SGP[0] + 0.05, SGP[1] + 0.25); ctx.save(); ctx.strokeStyle = C.gold; ctx.setLineDash([4, 14]); ctx.lineDashOffset = -t * 40; ctx.lineWidth = 7; ctx.lineCap = 'round'; const k = clamp((t - 24.9) / 0.8); ctx.beginPath(); ctx.moveTo(x + 60, y - 200); ctx.lineTo(lerp(x + 60, 800, k), lerp(y - 200, 560, k)); ctx.stroke(); ctx.restore();
      chip(ctx, 'TO CHINA? ⬆', 800, 500, win(t, 25.4, 27.5), { size: 44, stroke: '#FF6B6B' }); }
    chip(ctx, 'SUSPECTED DIVERSION', W / 2, 330, win(t, 24.85, 27.5), { size: 44, stroke: '#FF6B6B' });
    chip(ctx, 'MEGASPEED DENIES WRONGDOING', W / 2, 330, win(t, 27.6, 29.7), { size: 38, stroke: '#FFFFFF' });
  }
  // ---------- B5 the side window (29.77–34.65)
  house(ctx, t, win(t, 29.8, 34.6, 0.35, 0.3));
  // ---------- B6 it blew up (34.65–50.13)
  if (t > 34.6 && t < 50.3) {
    dim(ctx, 0.6 * win(t, 34.7, 50.1, 0.4, 0.3));
    styledText(ctx, 'THEN IT BLEW UP 💥', W / 2, 330, 92, { k: win(t, 34.8, 36.6), fill: '#FF6B6B', stroke: C.ink, rot: -3 }); flash(ctx, clamp((t - 35.75) / 0.4));
    chip(ctx, '🚨 NOVEMBER 2026', W / 2, 460, win(t, 35.0, 36.6), { size: 40 });
    stage(ctx, t, win(t, 36.5, 50.1, 0.35, 0.3));
    chip(ctx, 'ADMITTED A RELATIONSHIP…', W / 2, 640, win(t, 38.85, 40.05), { size: 44 });
    chip(ctx, '…WITH A FORMER MEGASPEED EXEC', W / 2, 640, win(t, 40.1, 41.75), { size: 42 });
    chip(ctx, 'SUSPECTED INTEL LINKS', W / 2, 600, win(t, 41.8, 44.85), { size: 48, stroke: '#FF6B6B' }); chip(ctx, '— ACCORDING TO US OFFICIALS', W / 2, 700, win(t, 42.2, 44.85), { size: 32 });
    chip(ctx, 'NO EVIDENCE SHE WAS', W / 2, 600, win(t, 44.9, 47.45), { size: 46, stroke: '#2ECC71' }); chip(ctx, 'SENT TO TARGET HIM', W / 2, 700, win(t, 45.0, 47.45), { size: 46, stroke: '#2ECC71' });
    styledText(ctx, '11 DAYS LATER', W / 2, 330, 100, { k: win(t, 47.55, 50.1), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  }
  // ---------- B7 the map changed (50.13–59.64)
  if (t > 50.0 && t < 60.0) {
    kinetic(ctx, 'THE MAP CHANGED', 330, win(t, 50.3, 52.0), 92);
    const [sx, sy] = P(c, ...SGP); building(ctx, sx, sy + 20, clamp(c.z / 230, 0.45, 1.1), 1 - clamp((t - 51.3) / 0.6) * 0, true); stamp(ctx, 'BLACKLISTED', W / 2, 460, t, 52.6, { size: 56, until: 55.5 });
    if (t > 53.6 && t < 56.2) [SGP, KL, BKK, JKT].forEach((ll, i) => { const u = clamp((t - 53.7 - i * 0.12) / 1.0); const [x0, y0] = P(c, 128, 10 - i * 3), [x1, y1] = P(c, ...ll); const v = Math.min(u, 0.55); rack(ctx, lerp(x0, x1, v), lerp(y0, y1, v), 0.5, 1, t); if (u > 0.55) redX(ctx, lerp(x0, x1, 0.55), lerp(y0, y1, 0.55) - 30, 90, clamp((u - 0.55) / 0.3)); });
    chip(ctx, 'NVIDIA PAUSES SHIPMENTS (REPORTED)', W / 2, 330, win(t, 53.5, 55.6), { size: 34 });
    styledText(ctx, '4 COUNTRIES', W / 2, 330, 110, { k: win(t, 55.65, 59.6), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    [['sgp', 56.76, 'SINGAPORE', [700, 1230]], ['mys', 57.39, 'MALAYSIA', [300, 1010]], ['tha', 57.97, 'THAILAND', [340, 640]], ['idn', 58.6, 'INDONESIA', [700, 1450]]].forEach(([key, t0, lab, [x, y]]) => {
      fillKey(ctx, c, key, RED, 0.45 * clamp((t - t0) / 0.3), '#FF8A8A'); });
    [['THAILAND', 57.97], ['MALAYSIA', 57.39], ['SINGAPORE', 56.76], ['INDONESIA', 58.6]].forEach(([lab, t0], i) => chip(ctx, `⛔ ${lab}`, 790, 560 + i * 120, pop(t - t0) * popOut(59.7 - t), { size: 38, bg: '#7A0C08', stroke: '#FF8A8A' }));
  }
  // ---------- B8 a wall, but not around the cloud (59.64–63.3)
  if (t > 59.6 && t < 63.5) {
    const u = easeIO(clamp((t - 61.6) / 1.5)); const [x0, y0] = P(c, 104, 4), [x1, y1] = P(c, 112, 33);
    cloudBig(ctx, lerp(x0, x1, u), lerp(y0, y1, u), 1.1, pop(t - 61.7), t);
    styledText(ctx, 'BUT NOT THE CLOUD ☁️', W / 2, 330, 84, { k: pop(t - 61.8), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  }
  // ---------- card (63.3–64.8) then glide back to frame 1
  if (t > 63.2 && t < 65.5) {
    const k = clamp((t - 63.3) / 0.35) * (1 - clamp((t - 64.8) / 0.3)); ctx.save(); ctx.globalAlpha = 0.74 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    title(ctx, 'THE CLOUD\nLOOPHOLE', 450, pop(t - 63.35), 130); seal(ctx, W / 2, 1180, pop(t - 63.6));
    ctx.restore();
  }
  if (t > 64.9) opening(ctx, c, t, clamp((t - 64.95) / 0.5));
}
const QUESTION = 'CAN AI EVER BE\nWALLED OFF? 👇';
const CAPTIONS = [
  [0.0, 2.2, 'America banned China…'], [2.25, 4.7, "…from Nvidia's best AI chips"],
  [4.94, 6.95, 'Yet China still used them'], [7.0, 9.6, 'No chip crossed the border'],
  [9.9, 11.3, 'Not by smuggling…'], [11.4, 12.4, '…by renting'], [12.47, 14.75, 'Data centres next door'], [14.77, 16.2, 'Legally bought the chips'], [16.28, 18.7, '…and rented them out'],
  [18.96, 21.9, 'One buyer: Megaspeed'], [22.03, 24.7, 'Investigated since 2024'], [24.81, 27.5, 'Chips ending up in China?'], [27.58, 29.6, 'Megaspeed denies it'],
  [29.88, 31.2, 'Lock the front door…'], [31.28, 34.4, '…neighbour uses the window'],
  [34.76, 36.6, 'Then it blew up'], [36.71, 38.8, "Nvidia's CEO resigned"], [38.84, 41.7, 'A former Megaspeed exec'], [41.8, 44.85, 'Suspected intel links'], [44.92, 47.5, 'No evidence she was sent'], [47.59, 49.0, '11 days later…'], [49.04, 50.0, '…he was back'],
  [50.24, 52.0, 'The map changed overnight'], [52.09, 53.35, 'Megaspeed: blacklisted'], [53.4, 55.6, 'Nvidia paused shipments'], [55.62, 59.0, '…to four countries'],
  [59.75, 61.7, 'You can wall off a country…'], [61.78, 63.1, '…not the cloud'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); vignette(ctx); if (t < 63.3) drawText(ctx, t);
  if (t > 59.7 && t < 65.0) { const y = t < 63.3 ? 1430 : lerp(1430, 820, easeIO((t - 63.3) / 0.45)); styledText(ctx, QUESTION, W / 2, y, 70, { k: pop(t - 59.8) * (t > 64.7 ? popOut(65.0 - t, 0.3) : 1), fill: C.yellow, stroke: C.goldDark, rot: -2 }); }
  if (t > 64.9) { ctx.save(); ctx.globalAlpha = clamp((t - 64.95) / 0.5); styledText(ctx, 'America banned China…', W / 2, CAPTION.y + 80, CAPTION.size, { k: 1, shadow: CAPTION.shadow, maxW: 1000 }); ctx.restore(); }
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
