/* Why is the middle of Australia empty? — Mapheld 9:16 short (Part 1, ends on a cliffhanger). renderAt(t) draws storyboard time t (= voiceover time).
   Big-city lights are real cities sized by population; the small-town lights are illustrative. */
'use strict';
const W = 1080, H = 1920, DURATION = 46.45;
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
  aus: [133.6, -26.8, 25],
  wide: [134.0, -27.0, 13],
};
const KEYS = [
  [0, 'aus', 1.0], [4.0, 'aus', 1.04], [4.7, 'aus', 1.0], [15.3, 'aus', 1.03], [29.3, 'aus', 1.0], [35.8, 'aus', 1.03], [39.7, 'aus', 1.0], [42.6, 'wide', 1.0], [46.45, 'wide', 1.04],
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
  for (const key of ['wide', 'usland', 'aus', 'interior', 'usOnAus']) {
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
const AUS_CITIES = [['Sydney', 151.21, -33.87, 5.3], ['Melbourne', 144.96, -37.81, 5.2], ['Brisbane', 153.03, -27.47, 2.7], ['Perth', 115.86, -31.95, 2.3], ['Adelaide', 138.6, -34.93, 1.4],
  ['Gold Coast', 153.4, -28.0, 0.7], ['Newcastle', 151.78, -32.93, 0.5], ['Canberra', 149.13, -35.28, 0.47], ['Sunshine Coast', 153.07, -26.65, 0.4], ['Wollongong', 150.89, -34.42, 0.3], ['Geelong', 144.36, -38.15, 0.3],
  ['Hobart', 147.33, -42.88, 0.25], ['Townsville', 146.82, -19.26, 0.18], ['Cairns', 145.77, -16.92, 0.16], ['Darwin', 130.84, -12.46, 0.15], ['Toowoomba', 151.95, -27.56, 0.14], ['Ballarat', 143.85, -37.56, 0.11],
  ['Bendigo', 144.28, -36.76, 0.1], ['Launceston', 147.14, -41.43, 0.09], ['Mackay', 149.19, -21.14, 0.08], ['Rockhampton', 150.51, -23.38, 0.08], ['Bunbury', 115.64, -33.33, 0.08], ['Albury', 146.92, -36.08, 0.05],
  ['Kalgoorlie', 121.47, -30.75, 0.03], ['Alice Springs', 133.88, -23.7, 0.026], ['Mount Isa', 139.49, -20.73, 0.018]];
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
const night = t => 1 - clamp((t - 15.0) / 0.7);
function glowAt(ctx, x, y, r, a) { if (a <= 0 || x < -r * 3 || x > W + r * 3 || y < -r * 3 || y > H + r * 3) return; ctx.globalAlpha = a; ctx.drawImage(GLOW, x - r * 3, y - r * 3, r * 6, r * 6); }
function cityLights(ctx, c, t, k, day = false) {
  if (k <= 0) return; const sc = Math.pow(c.z / 30, 0.6);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const d of TOWNS) { const [x, y] = P(c, d[0], d[1]); glowAt(ctx, x, y, (2.2 + d[2] * 2.2) * sc, k * clamp((t - 0.6 - d[2] * 1.0) / 0.4) * (day ? 0.35 : 0.8) * (1 + 0.15 * Math.sin(t * 4 + d[2] * 50))); }
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

function sceneAus(ctx, c, t) {
  const n = night(t);
  if (t > 15.0) outback(ctx, c, clamp((t - 15.4) / 0.6) * (t > 29 ? 1 : 0) + (t > 29 ? 0 : 0));
  if (t > 29.0) outback(ctx, c, 1);
  if (n > 0) { ctx.save(); ctx.fillStyle = `rgba(3,7,18,${0.8 * n})`; ctx.fillRect(0, 0, W, H); ctx.restore(); strokeGeo(ctx, c, 'aus', 'rgba(170,190,200,0.35)', 2, { alpha: n }); }
  cityLights(ctx, c, t, n);
  if (n < 1 && t > 29) cityLights(ctx, c, t, 1, true);
  // B1 hook
  title(ctx, 'WHY IS THE\nMIDDLE EMPTY?', 250, t < 0.05 ? 1 : popOut(4.1 - t), 104);
  const [mx, my] = P(c, 134.2, -25.2);
  const ring = (t < 4.1 ? 1 : 0) + win(t, 12.1, 15.3);
  if (ring > 0) {
    const R = 0.27 * W * (c.z / 30);
    ctx.save(); ctx.globalAlpha = clamp(ring); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.setLineDash([22, 14]); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.restore();
    if (t < 4.1) styledText(ctx, '?', mx, my, 200, { k: pop(t - 0.3, 0.4), fill: C.gold, stroke: C.ink });
    chip(ctx, 'EMPTY INTERIOR', mx, my, win(t, 12.4, 15.3), { size: 44 });
  }
  // B2: same size as the lower 48
  const ku = win(t, 4.4, 8.2, 0.5, 0.35);
  if (ku > 0) {
    const off = (1 - easeOut(clamp((t - 4.4) / 0.9))) * 40, cc = { ...c, cx: c.cx - off };
    strokeGeo(ctx, cc, 'usOnAus', '#FFFFFF', 6, { alpha: clamp(ku), dash: [20, 12], off: -t * 30, fill: 'rgba(255,255,255,0.10)' });
    chip(ctx, '🇺🇸  LOWER 48 USA', W / 2, 340, ku, { size: 44, stroke: '#FFFFFF' });
    kinetic(ctx, '≈ SAME SIZE', 1450, win(t, 5.6, 8.0), 110);
  }
  // the coastal ribbon
  const kr = clamp((t - 9.6) / 1.4) * (1 - clamp((t - 15.2) / 0.4));
  if (kr > 0) { ctx.save(); ctx.beginPath(); ctx.moveTo(mx, my); ctx.arc(mx, my, 3000, -Math.PI / 2, -Math.PI / 2 + kr * 2 * Math.PI); ctx.closePath(); ctx.clip();
    strokeGeo(ctx, c, 'aus', 'rgba(244,208,63,0.35)', 38, { glow: 30 }); strokeGeo(ctx, c, 'aus', '#F4D03F', 5); ctx.restore(); }
  chip(ctx, 'MOST PEOPLE…', W / 2, 340, win(t, 8.2, 9.8), { size: 46 });
  chip(ctx, '…LIVE ON A THIN COASTAL RIBBON', W / 2, 340, win(t, 9.9, 12.0), { size: 40 });
  if (t > 10.3 && t < 15.4) { const k = win(t, 10.4, 15.3); cityLabel(ctx, c, 'Sydney', k, 40, 40); cityLabel(ctx, c, 'Melbourne', k, -20, 50); cityLabel(ctx, c, 'Brisbane', k, -40, 12); cityLabel(ctx, c, 'Perth', k, 70, 40); cityLabel(ctx, c, 'Adelaide', k, -30, 48, 34);
    const [sx, sy] = P(c, ...CITY('Sydney').slice(1, 3)), [px, py] = P(c, ...CITY('Perth').slice(1, 3));
    person(ctx, 'beach_surfer', sx + 105, sy + 60, 120, { k: pop(t - 10.8) * popOut(15.3 - t) }); person(ctx, 'beach_local', px - 70, py + 70, 120, { k: pop(t - 11.1) * popOut(15.3 - t) }); }
  kinetic(ctx, 'PITCH BLACK', 1450, win(t, 13.9, 15.3), 120, -4, '#FFFFFF');
  // B4: settlers pushed inland
  if (t > 29.0 && t < 35.9) {
    kinetic(ctx, 'NOT FOR LACK OF TRYING', 300, win(t, 29.2, 30.9), 78);
    const route = [[150.6, -33.6], [146.5, -31.5], [142.5, -29.5], [138.6, -27.6]].map(p => P(c, ...p));
    const u = easeIO((t - 30.9) / 2.6), [hx, hy, dx] = pointAlong(route, u), kk = pop(t - 30.8) * popOut(35.8 - t);
    geoLine(ctx, c, [[150.6, -33.6], [146.5, -31.5], [142.5, -29.5], [138.6, -27.6]], u, '#F4F1E6', 4, [12, 10]);
    for (let i = 0; i < 4; i++) { const [x, y] = pointAlong(route, Math.max(0, u - 0.06 - i * 0.05)); sprite(ctx, i % 2 ? 'cow' : 'sheep', x + (i % 2 ? 20 : -20), y + 40 + Math.abs(Math.sin(t * 9 + i)) * -10, i % 2 ? 120 : 105, { k: kk, flip: true }); }
    person(ctx, t > 35.0 ? 'settler_sad' : 'settler_walk', hx, hy + 40, 250, { k: kk, flip: true });
    goldLabel(ctx, 'THE RED CENTRE', mx, my - 30, 54, win(t, 32.9, 35.8));
    // wheat planted past the rain line, then failing
    const wheat = [[137.3, -31.4], [138.2, -31.0], [139.1, -31.5], [137.9, -32.2], [138.9, -32.4]];
    wheat.forEach(([lon, lat], i) => { const [x, y] = P(c, lon, lat); sprite(ctx, t > 35.0 + i * 0.06 ? 'wheat_dead' : 'wheat_ok', x, y, 105, { k: pop(t - 33.9 - i * 0.05) * popOut(35.8 - t), ay: 0.9 }); });
    if (t > 34.5) { geoLine(ctx, c, [[135.6, -33.0], [137.4, -33.3], [139.0, -33.6], [140.6, -33.9]], clamp((t - 34.5) / 0.4), '#5FD3FF', 5, [16, 10]); const [lx, ly] = P(c, 140.4, -33.9); chip(ctx, 'RAIN RUNS OUT', lx + 40, ly + 50, win(t, 34.6, 35.8), { size: 28, stroke: '#5FD3FF' }); }
  }
  // B5: why so dry?
  if (t > 35.8) {
    sprite(ctx, 'sun', mx, my - 20, 230 * (c.z / 30) ** 0.5, { k: pop(t - 36.2) * popOut(42.7 - t), rot: Math.sin(t * 3) * 5 });
    kinetic(ctx, 'WHY SO DRY?', 300, win(t, 35.9, 38.2), 120);
    [['#1', 38.8], ['#2', 39.0], ['#3', 39.2]].forEach(([s, t0], i) => {
      const k = win(t, t0, 42.7), x = 270 + i * 270, y = 1440, big = i === 0 && t > 39.8;
      if (k <= 0) return; ctx.save(); ctx.translate(x, y - (big ? 20 : 0)); const sc = k * (big ? 1.25 + 0.04 * Math.sin(t * 8) : 1); ctx.scale(sc, sc);
      ctx.fillStyle = big ? '#FFD43B' : 'rgba(10,24,32,0.94)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-100, -120, 200, 240, 24); ctx.fill(); ctx.stroke();
      setFont(ctx, 'Montserrat', 54); ctx.fillStyle = big ? C.ink : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, -50); setFont(ctx, 'Montserrat', 110); ctx.fillText('?', 0, 40); ctx.restore();
    });
    chip(ctx, "ISN'T EVEN IN AUSTRALIA", 270 + 40, 1240, win(t, 40.6, 42.7), { size: 34, stroke: '#FF6B6B' });
  }
}
// B3: split screen — the US interior vs Australia's Outback
function sceneSplit(ctx, t) {
  const k = clamp((t - 15.3) / 0.6) * (1 - clamp((t - 28.9) / 0.5)); if (k <= 0) return;
  const top = H / 2, slide = (1 - easeOut(k)) * top;
  const cu = { cx: -96.5, cy: -mercY(38.2), z: 15.5, rot: 0, tilt: 1, sx: W / 2, sy: top / 2 };
  const ca = { cx: 133.6, cy: -mercY(-27.0), z: 21, rot: 0, tilt: 1, sx: W / 2, sy: top + top / 2 };
  const focusUS = t < 21.1, dimUS = clamp((t - 21.1) / 0.5), dimAU = 1 - clamp((t - 20.9) / 0.5);
  // top: USA
  ctx.save(); ctx.translate(0, -slide); ctx.beginPath(); ctx.rect(0, 0, W, top); ctx.clip();
  drawMap(ctx, cu); usLights(ctx, cu, clamp((t - 15.8) / 0.8));
  riverLines(ctx, cu, ['Mississippi', 'Missouri', 'Ohio'], clamp((t - 18.4) / 1.8));
  const [rx, ry] = P(cu, -90.6, 34.5); goldLabel(ctx, 'MISSISSIPPI', rx + 30, ry, 40, pop(t - 20.2));
  goldLabel(ctx, 'USA', W / 2 - 60, 150, 70, pop(t - 15.7));
  chip(ctx, 'MILLIONS LIVE INLAND', W / 2, 820, win(t, 16.3, 20.9), { size: 40 });
  ctx.fillStyle = `rgba(0,0,0,${0.45 * dimUS})`; ctx.fillRect(0, 0, W, top); ctx.restore();
  // bottom: Australia
  ctx.save(); ctx.translate(0, slide); ctx.beginPath(); ctx.rect(0, top, W, top); ctx.clip();
  drawMap(ctx, ca); outback(ctx, ca, clamp((t - 21.8) / 0.9)); cityLights(ctx, ca, t, 1, true);
  goldLabel(ctx, 'OUTBACK', W / 2, top + top / 2 - 10, 76, pop(t - 22.9, 0.4));
  sprite(ctx, 'sun', 860, top + 150, 190, { k: pop(t - 23.9), rot: Math.sin(t * 3) * 6 });
  if (t > 23.5) { ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#FFE0B0'; ctx.lineWidth = 4; for (let i = 0; i < 5; i++) { const y = top + 380 + i * 40; ctx.beginPath(); for (let x = 300; x < 780; x += 10) ctx.lineTo(x, y + Math.sin(x / 30 + t * 6 + i) * 6); ctx.stroke(); } ctx.restore(); }
  person(ctx, t < 26 ? 'explorer_squint' : 'explorer_thirsty', 180, top + 880, 230, { k: pop(t - 23.0) });
  ctx.fillStyle = `rgba(0,0,0,${0.45 * dimAU})`; ctx.fillRect(0, top, W, top); ctx.restore();
  // divider + verdict
  ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = C.gold; ctx.fillRect(0, top - 4, W, 8); ctx.restore();
  styledText(ctx, 'DRIEST INHABITED\nCONTINENT', W / 2, top, 84, { k: win(t, 25.7, 28.9), fill: C.yellow, stroke: C.goldDark, rot: -3 });
}
// end card: cliffhanger
function sceneEnd(ctx, t) {
  if (t < 42.7) return; const e = t - 42.7, k = clamp(e / 0.35);
  ctx.fillStyle = `rgba(4,10,14,${0.75 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, 'WHY IS THE\nMIDDLE EMPTY?', W / 2, 640, 104, { k: pop(e - 0.1, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, "REASON #1 ISN'T\nEVEN IN AUSTRALIA", W / 2, 880, 82, { k: pop(e - 0.35, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  const kc = pop(e - 0.8, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 1110); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 46);
    const w = ctx.measureText('FULL STORY ON MAPHELD').width + 120; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -56, w, 112, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 40, -20); ctx.lineTo(-w / 2 + 40, 20); ctx.lineTo(-w / 2 + 72, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FULL STORY ON MAPHELD', 22, 3); ctx.restore(); }
}
const CAPTIONS = [
  [0.0, 2.3, 'Australia at night'], [2.3, 4.1, 'Look at the lights'], [4.2, 7.8, 'Almost as big as the US'], [7.9, 9.7, 'Yet most people…'], [9.7, 11.9, '…live on the coast'],
  [12.0, 13.7, 'The giant middle?'], [13.7, 15.3, 'Pitch black'],
  [15.5, 18.0, 'In America…'], [18.0, 21.0, '…people live inland'], [21.1, 23.5, "Australia's Outback"], [23.5, 25.6, 'One of the driest places'], [25.7, 28.9, 'Driest inhabited continent'],
  [29.2, 30.9, 'Not for lack of trying'], [30.9, 33.7, 'Sheep and cattle went inland'], [33.8, 35.7, 'Wheat where rain ran out'],
  [35.9, 37.9, 'So why so dry?'], [38.2, 39.7, 'Three reasons'], [39.7, 42.6, "#1 isn't even in Australia"],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t);
  if (!(t > 15.9 && t < 28.9)) { drawMap(ctx, c); sceneAus(ctx, c, t); }
  sceneSplit(ctx, t);
  vignette(ctx); if (t < 42.7) drawText(ctx, t); sceneEnd(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}
window.renderAt = renderAt; window.READY = false;
TOWNS = GEO.towns;
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
