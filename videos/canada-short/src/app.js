/* Why is northern Canada empty? Part 1 — Mapheld 9:16 short (ends on a cliffhanger). renderAt(t) draws storyboard time t (= voiceover time).
   Big-city lights are real cities sized by population; small-town lights are illustrative. */
'use strict';
const W = 1080, H = 1920, DURATION = 42.5;
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
  na: [-97.0, 56.0, 11], atl: [-40.0, 60.0, 6.0], sixty: [-104.0, 60.5, 22], ground: [-100.0, 57.0, 30],
};
const KEYS = [
  [0, 'na', 1], [3.6, 'na', 1.03], [12.6, 'na', 1.05], [15.4, 'na', 1], [17.0, 'atl', 1], [26.2, 'atl', 1.03], [27.4, 'sixty', 1], [31.8, 'sixty', 1.04], [33.6, 'ground', 1], [42.5, 'ground', 1.05],
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
  for (const key of ['wide', 'lakes', 'can', 'usa', 'scandi', 'shield']) {
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
  ctx.save(); ctx.setTransform(M); ctx.fillStyle = C.ocean; for (const p of PATHS.lakes) ctx.fill(p); ctx.strokeStyle = C.coast; ctx.lineWidth = 2.6 / c.z; ctx.lineJoin = 'round'; for (const p of set) ctx.stroke(p); for (const p of PATHS.lakes) ctx.stroke(p); ctx.restore();
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

// ------------------------------------------------------------------ scenes (storyboard time = voiceover time, 0–46.45 s)
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

// ---- real cities (metro populations, millions, rounded) — sizes the night-light glows
const AUS_CITIES = [['Toronto', -79.38, 43.65, 6.7], ['Montreal', -73.57, 45.5, 4.4], ['Vancouver', -123.12, 49.28, 2.8], ['Calgary', -114.07, 51.05, 1.6], ['Edmonton', -113.49, 53.55, 1.5],
  ['Ottawa', -75.7, 45.42, 1.5], ['Winnipeg', -97.14, 49.9, 0.9], ['Quebec City', -71.21, 46.81, 0.85], ['Hamilton', -79.87, 43.26, 0.8], ['Kitchener', -80.49, 43.45, 0.6], ['London', -81.25, 42.98, 0.55],
  ['Halifax', -63.57, 44.65, 0.5], ['Victoria', -123.37, 48.43, 0.4], ['Saskatoon', -106.67, 52.13, 0.35], ['Regina', -104.62, 50.45, 0.26], ["St. John's", -52.71, 47.56, 0.22], ['Sudbury', -81.0, 46.5, 0.17],
  ['Thunder Bay', -89.25, 48.38, 0.12], ['Whitehorse', -135.06, 60.72, 0.03], ['Yellowknife', -114.37, 62.45, 0.02], ['Iqaluit', -68.52, 63.75, 0.008],
  ['Oslo', 10.75, 59.91, 1.1], ['Stockholm', 18.07, 59.33, 1.6], ['Helsinki', 24.94, 60.17, 1.3], ['Gothenburg', 11.97, 57.71, 0.6], ['Bergen', 5.32, 60.39, 0.3], ['Tampere', 23.76, 61.5, 0.25], ['Trondheim', 10.4, 63.43, 0.2], ['Uppsala', 17.64, 59.86, 0.2]];
const US_CITIES = [[-74.0, 40.7, 19], [-118.2, 34.05, 13], [-87.63, 41.88, 9.4], [-96.8, 32.78, 7.6], [-95.37, 29.76, 7.1], [-77.04, 38.9, 6.3], [-75.16, 39.95, 6.2], [-80.19, 25.76, 6.1], [-84.39, 33.75, 6.1],
  [-71.06, 42.36, 4.9], [-112.07, 33.45, 4.9], [-122.42, 37.77, 4.6], [-83.05, 42.33, 4.3], [-122.33, 47.6, 4], [-93.27, 44.98, 3.7], [-117.16, 32.72, 3.3], [-82.46, 27.95, 3.2], [-104.99, 39.74, 2.9],
  [-90.2, 38.63, 2.8], [-76.61, 39.29, 2.8], [-80.84, 35.23, 2.7], [-98.49, 29.42, 2.6], [-122.68, 45.52, 2.5], [-79.99, 40.44, 2.4], [-97.74, 30.27, 2.4], [-115.14, 36.17, 2.3], [-84.51, 39.1, 2.3],
  [-94.58, 39.1, 2.2], [-83.0, 39.96, 2.1], [-86.16, 39.77, 2.1], [-81.69, 41.5, 2.1], [-86.78, 36.16, 2.0], [-87.91, 43.04, 1.6], [-97.52, 35.47, 1.4], [-90.05, 35.15, 1.3], [-85.76, 38.25, 1.3],
  [-111.89, 40.76, 1.3], [-86.8, 33.52, 1.1], [-95.94, 41.26, 1.0], [-90.07, 29.95, 1.0], [-95.99, 36.15, 1.0], [-106.65, 35.08, 0.9], [-92.29, 34.75, 0.75], [-93.61, 41.59, 0.7], [-97.34, 37.69, 0.65]];
let GLOW, TOWNS;
function makeGlow() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,244,190,1)'); gr.addColorStop(0.22, 'rgba(244,208,63,0.8)'); gr.addColorStop(1, 'rgba(244,208,63,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return cv;
}
function glowAt(ctx, x, y, r, a) { if (a <= 0 || x < -r * 3 || x > W + r * 3 || y < -r * 3 || y > H + r * 3) return; ctx.globalAlpha = a; ctx.drawImage(GLOW, x - r * 3, y - r * 3, r * 6, r * 6); }
function cityLights(ctx, c, t, k, day = false) {
  if (k <= 0) return; const sc = Math.pow(c.z / 30, 0.6);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const d of TOWNS) { const [x, y] = P(c, d[0], d[1]); glowAt(ctx, x, y, (2.2 + d[2] * 2.2) * sc, (d[3] ? 0.28 : 1) * k * clamp((t - 0.6 - d[2] * 1.0) / 0.4) * (day ? 0.35 : 0.8) * (1 + 0.15 * Math.sin(t * 4 + d[2] * 50))); }
  AUS_CITIES.forEach(([, lon, lat, pop], i) => { const [x, y] = P(c, lon, lat); glowAt(ctx, x, y, (5 + 12 * Math.sqrt(pop)) * sc, k * clamp((t - 0.1 - i * 0.04) / 0.35) * (day ? 0.45 : 1) * (t > 2.4 && t < 3.8 ? 1 + 0.25 * Math.sin((t - 2.4) * Math.PI / 1.4) : 1)); });
  ctx.restore();
}
function usLights(ctx, c, k) {
  if (k <= 0) return; const sc = Math.pow(c.z / 30, 0.6);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [lon, lat, pop] of US_CITIES) { const [x, y] = P(c, lon, lat); glowAt(ctx, x, y, (3 + 5 * Math.sqrt(pop)) * sc, k * 0.8); }
  ctx.restore();
}
function fillGeo(ctx, c, key, style, alpha = 1, i = null) { const M = camMatrix(c); ctx.save(); ctx.globalAlpha = alpha; ctx.setTransform(M); ctx.fillStyle = style; (i === null ? PATHS[key] : [PATHS[key][i]]).forEach(p => ctx.fill(p)); ctx.restore(); }
function strokeGeo(ctx, c, key, style, w, o = {}) {
  const M = camMatrix(c); const pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M);
  ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha = o.alpha; if (o.dash) { ctx.setLineDash(o.dash); ctx.lineDashOffset = o.off || 0; } if (o.glow) { ctx.shadowColor = style; ctx.shadowBlur = o.glow; }
  ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(pp); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(pp); } ctx.restore();
}
function outback(ctx, c, k) {
  if (k <= 0) return;
  ctx.save(); const cl = new Path2D(); for (const p of PATHS.aus) cl.addPath(p, camMatrix(c)); ctx.clip(cl);
  for (const [w, a] of [[c.z * 1.4, 0.12], [c.z * 0.9, 0.16], [c.z * 0.45, 0.2]]) strokeGeo(ctx, c, 'interior', '#B5562E', w, { alpha: a * k });
  fillGeo(ctx, c, 'interior', '#B5562E', 0.55 * k);
  ctx.restore();
}
function riverLines(ctx, c, names, k, color = '#5FD3FF') {
  if (k <= 0) return; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const n of names) for (const r of GEO.rivers[n] || []) {
    const sp = []; for (let i = 0; i < r.length; i += 2) sp.push(P(c, r[i], r[i + 1]));
    const path = partial(sp, k); if (!path) continue;
    ctx.strokeStyle = 'rgba(95,211,255,0.35)'; ctx.lineWidth = 14; ctx.stroke(path); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.stroke(path);
  }
  ctx.restore();
}
const CITY = n => AUS_CITIES.find(c => c[0] === n);
function cityLabel(ctx, c, name, k, dx = 0, dy = 46, size = 40) { const d = CITY(name); const [x, y] = P(c, d[1], d[2]); goldLabel(ctx, name.toUpperCase(), x + dx, y + dy, size, k); }

// ================================================================== Part 1 scenes (storyboard 0–42.5 s)
const night = t => t < 26.4 ? 1 : 1 - clamp((t - 26.4) / 0.8);
function latLine(ctx, c, lat, k, col = '#FFFFFF', label) { if (k <= 0) return; const y = P(c, 0, lat)[1]; ctx.save(); ctx.globalAlpha = clamp(k); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.setLineDash([18, 12]);
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * clamp(k), y); ctx.stroke(); ctx.restore(); if (label) styledText(ctx, label, 120, y - 30, 38, { k: clamp(k), fill: col }); }
function borderGlow(ctx, c, k) {   // the 49th parallel + Great Lakes stretch, as a glowing band
  if (k <= 0) return; const pts = [[-123.3, 49], [-95.2, 49], [-95.2, 49.4], [-89.6, 48.0], [-84.5, 46.5], [-82.4, 43.0], [-79.0, 43.2], [-76.4, 44.1], [-74.7, 45.0], [-71.5, 45.0], [-69.2, 47.4], [-67.8, 47.1], [-67.0, 45.2]];
  geoLine(ctx, c, pts, k, '#F4D03F', 8, null, true);
}
function sceneMap(ctx, c, t) {
  const n = night(t);
  if (n > 0) { ctx.save(); ctx.fillStyle = `rgba(3,7,18,${0.8 * n})`; ctx.fillRect(0, 0, W, H); ctx.restore(); strokeGeo(ctx, c, 'can', 'rgba(170,190,200,0.35)', 2, { alpha: n }); }
  cityLights(ctx, c, t, n > 0 ? n : 0.6, n <= 0); usLights(ctx, c, 0.3 * n);
  // hook
  title(ctx, 'WHY IS CANADA\nSO EMPTY?', 250, t < 0.05 ? 1 : popOut(3.7 - t), 104);
  const [cx, cy] = P(c, -100, 63);
  goldLabel(ctx, 'CANADA', cx, cy, 70, win(t, 2.7, 6.0));
  chip(ctx, '2ND-LARGEST COUNTRY ON EARTH', W / 2, 300, win(t, 4.2, 6.2), { size: 38 });
  borderGlow(ctx, c, clamp((t - 7.4) / 1.8) * popOut(15.4 - t));
  chip(ctx, 'A THIN RIBBON ALONG THE US BORDER', W / 2, 300, win(t, 7.4, 10.1), { size: 36 });
  const kd = win(t, 10.2, 12.8); if (kd > 0) { const [dx, dy] = P(c, -100, 62); ctx.save(); ctx.globalAlpha = clamp(kd); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.ellipse(dx, dy, 330, 200, 0, 0, 7); ctx.stroke(); ctx.restore(); styledText(ctx, 'DARK', dx, dy, 100, { k: kd, fill: '#fff', stroke: C.ink }); }
  // too cold? look at Scandinavia
  if (t > 12.8 && t < 27.0) {
    kinetic(ctx, 'TOO COLD?', 300, win(t, 13.0, 15.7), 110, -3, '#BFE6FF');
    if (t > 13.0 && t < 15.8) { const r = rnd(3); ctx.save(); ctx.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { const y = (r() * H + t * 150 * (0.6 + r())) % H; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(r() * W, y, 4 + r() * 3, 0, 7); ctx.fill(); } ctx.restore(); }
    fillGeo(ctx, c, 'scandi', '#F4D03F', 0.25 * win(t, 16.4, 26.5));
    latLine(ctx, c, 60, clamp((t - 19.0) / 1.6) * popOut(26.5 - t), '#FFFFFF', '60°N');
    for (const [nm, lo, la, dy] of [['OSLO', 10.75, 59.91, 50], ['STOCKHOLM', 18.07, 59.33, 90], ['HELSINKI', 24.94, 60.17, -50]]) { const [x, y] = P(c, lo, la); goldLabel(ctx, nm, x, y + dy, 34, win(t, 17.3 + (nm === 'STOCKHOLM' ? 0.4 : nm === 'HELSINKI' ? 1.1 : 0), 26.5)); }
    const [tx, ty] = P(c, -97, 60); goldLabel(ctx, "CANADA'S NORTHERN\nTERRITORIES", Math.max(200, tx), ty - 80, 34, win(t, 20.4, 26.5));
    ['scandi_nor', 'scandi_swe', 'scandi_fin'].forEach((s, i) => person(ctx, s, 640 + i * 150, 1520, 170, { k: pop(t - 22.6 - i * 0.12) * popOut(26.5 - t) }));
    chip(ctx, 'CAPITALS · HIGHWAYS · FARMS', W / 2, 300, win(t, 22.6, 26.4), { size: 38 });
  }
  // same latitude in Canada: forest, rock, lakes… few roads
  if (t > 26.5 && t < 32.2) {
    latLine(ctx, c, 60, 1, '#FFFFFF', '60°N');
    const r = rnd(21); for (let i = 0; i < 24; i++) { const x = 60 + r() * 960, y = P(c, 0, 60)[1] + (r() - 0.5) * 360; const kind = i % 3, k = pop(t - 28.3 - i * 0.03) * popOut(32.0 - t); if (k <= 0) continue;
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (kind === 0) { ctx.fillStyle = '#2F5D3A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(18, 10); ctx.lineTo(-18, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (kind === 1) { ctx.fillStyle = '#7C8189'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, 0, 0, 7); ctx.fill(); ctx.stroke(); } else { ctx.fillStyle = '#2C6A78'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, 0.3, 0, 7); ctx.fill(); } ctx.restore(); }
    chip(ctx, 'FOREST · ROCK · LAKES', W / 2, 300, win(t, 28.3, 30.3), { size: 40 }); chip(ctx, 'VERY FEW ROADS', W / 2, 300, win(t, 30.4, 32.0), { size: 44, stroke: '#FF6B6B' });
  }
  // the real reason is underground
  if (t > 32.0) {
    kinetic(ctx, 'COLD = ONLY PART OF IT', 300, win(t, 32.1, 34.0), 76, -3, '#FFFFFF');
    const kc = clamp((t - 34.4) / 1.0); if (kc > 0) { const y0 = 900, h = 520 * easeOut(kc); ctx.save(); ctx.fillStyle = '#5E3A22'; ctx.fillRect(0, y0, W, 70 * kc); ctx.fillStyle = '#6E737C'; ctx.fillRect(0, y0 + 70 * kc, W, h);
      const r = rnd(5); ctx.strokeStyle = '#4A4E56'; ctx.lineWidth = 5; for (let i = 0; i < 18; i++) { let x = r() * W, y = y0 + 90 + r() * h * 0.9; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 3; j++) { x += (r() - 0.5) * 140; y += (r() - 0.5) * 70; ctx.lineTo(x, Math.max(y0 + 80, y)); } ctx.stroke(); } ctx.restore();
      styledText(ctx, '?', W / 2, y0 + 300, 220, { k: pop(t - 35.6), fill: C.yellow, stroke: C.goldDark }); chip(ctx, 'SOME OF THE OLDEST ROCK ON EARTH', W / 2, y0 + 30, win(t, 36.6, 38.9), { size: 34 }); }
    person(ctx, 'farmer_dig', 200, 900, 220, { k: pop(t - 34.6) * (t < 38.9 ? 1 : 0) });
  }
}
function sceneEnd(ctx, t) {
  if (t < 38.9) return; const e = t - 38.9, k = clamp(e / 0.35);
  ctx.fillStyle = `rgba(4,10,14,${0.78 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, 'THE REAL REASON', W / 2, 640, 100, { k: pop(e - 0.1, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'IS UNDERGROUND…', W / 2, 780, 104, { k: pop(e - 0.3, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  const kc = pop(e - 0.8, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 1000); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 46);
    const w = ctx.measureText('FULL STORY ON MAPHELD').width + 120; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -56, w, 112, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 40, -20); ctx.lineTo(-w / 2 + 40, 20); ctx.lineTo(-w / 2 + 72, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FULL STORY ON MAPHELD', 22, 3); ctx.restore(); }
}
const CAPTIONS = [
  [0.0, 3.7, 'North America at night'], [3.9, 6.1, 'The 2nd-largest country'], [6.2, 9.9, 'Yet everyone lives here…'], [10.0, 12.7, '…and the north is dark'],
  [13.0, 15.7, 'Too cold?'], [15.8, 18.8, 'Look across the Atlantic'], [18.9, 22.5, 'Same latitude…'], [22.6, 26.4, '…capital cities'],
  [26.7, 30.3, 'Same latitude in Canada'], [30.4, 31.8, 'Very few roads'], [32.0, 34.0, 'Cold is only part of it'], [34.1, 38.8, 'The answer is underground'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t); drawMap(ctx, c); sceneMap(ctx, c, t);
  vignette(ctx); if (t < 38.9) drawText(ctx, t); sceneEnd(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}
window.renderAt = renderAt; window.READY = false;
TOWNS = (() => { const g = document.createElement('canvas').getContext('2d'), us = new Path2D(); for (const r of GEO.usa) { for (let i = 0; i < r.length; i += 2) { const x = r[i], y = -mercY(r[i + 1]); i ? us.lineTo(x, y) : us.moveTo(x, y); } us.closePath(); }
  return GEO.towns.map(d => [d[0], d[1], d[2], g.isPointInPath(us, d[0], -mercY(d[1])) ? 1 : 0]); })();
loadAssets().then(() => {
  GLOW = makeGlow();
  window.READY = true; if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  ctl.style.display = 'flex'; let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; draw(); };
  const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; last = now; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
