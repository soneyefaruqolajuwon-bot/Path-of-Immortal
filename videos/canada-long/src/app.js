/* Why is northern Canada empty? Part 2 — Mapheld 16:9 long-form (continues from the Part 1 short).
   renderAt(t) draws storyboard time t (= voiceover time incl. breathers). Shield, lowlands, permafrost limit, current and routes are simplified. */
'use strict';
const W = 1920, H = 1080, DURATION = 178.1;
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
  na: [-96.0, 57.5, 13], atl: [-45.0, 52.0, 6.6], shield: [-88.0, 58.5, 15.5], north: [-104.0, 63.0, 15], corridor: [-78.0, 45.2, 58],
};
const KEYS = [
  [0, 'na', 1], [14.0, 'na', 1.03], [15.6, 'atl', 1], [32.6, 'atl', 1.03], [34.4, 'shield', 1], [52.3, 'shield', 1.03], [93.0, 'shield', 1], [106.0, 'shield', 1.03],
  [107.4, 'north', 1], [115.8, 'north', 1.03], [117.2, 'corridor', 1], [128.0, 'corridor', 1.03], [129.4, 'shield', 1], [148.4, 'shield', 1.03], [150.0, 'na', 1], [178.1, 'na', 1.05],
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

// ---- helpers shared with the Australia long-form
function polyPath(c, pts, close = true) { const p = new Path2D(); pts.forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); i ? p.lineTo(x, y) : p.moveTo(x, y); }); if (close) p.closePath(); return p; }
function card(ctx, k, col = C.ocean) {
  if (k <= 0) return false; ctx.save(); ctx.globalAlpha = clamp(k * 1.2); ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(244,208,63,0.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(40, 40, W - 80, H - 80, 30); ctx.stroke(); ctx.restore(); return true;
}
function cloudAt(ctx, name, x, y, w, k = 1, o = {}) { sprite(ctx, name, x, y, w, { k, ...o }); }
function rainDrops(ctx, x0, x1, y0, y1, t, a = 1, seed = 2) { if (a <= 0) return; const r = rnd(seed); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#7FC8FF'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 40; i++) { const x = lerp(x0, x1, r()), sp = 0.7 + r() * 0.6, y = y0 + ((r() * (y1 - y0) + t * 420 * sp) % (y1 - y0)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 22); ctx.stroke(); } ctx.restore(); }
function arrow(ctx, x0, y0, x1, y1, col, w = 10, k = 1) { if (k <= 0) return; const x = lerp(x0, x1, k), y = lerp(y0, y1, k), a = Math.atan2(y1 - y0, x1 - x0); ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(w * 2.4, 0); ctx.lineTo(-w, -w * 1.8); ctx.lineTo(-w, w * 1.8); ctx.closePath(); ctx.fill(); ctx.restore(); }
function profileGround(ctx, pts, col, y0 = 900) { ctx.beginPath(); ctx.moveTo(pts[0][0], y0); pts.forEach(p => ctx.lineTo(...p)); ctx.lineTo(pts[pts.length - 1][0], y0); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.stroke(); }
// ================================================================== Part 2 scenes (storyboard 0–178.1 s)
const night = t => t < 14.0 ? 1 : 1 - clamp((t - 14.0) / 0.8);
const BORDER = [[-123.3, 49], [-95.2, 49], [-95.2, 49.4], [-89.6, 48.0], [-84.5, 46.5], [-82.4, 43.0], [-79.0, 43.2], [-76.4, 44.1], [-74.7, 45.0], [-71.5, 45.0], [-69.2, 47.4], [-67.8, 47.1], [-67.0, 45.2]];
const GULF = [[-88, 25], [-80, 26], [-75, 33], [-66, 40], [-50, 45], [-35, 50], [-20, 55], [-5, 59], [5, 63], [12, 67]];
const ROAD = [[-81.0, 46.5], [-84.0, 48.0], [-88.5, 49.5], [-93.0, 50.7], [-97.85, 55.74]];
const ROUTES = [[[-117, 61.5], [-121.5, 63.5], [-126, 66], [-131, 67.5], [-134.5, 68.5]], [[-108, 56], [-102, 55.5], [-97, 56.5], [-94.2, 58.7]], [[-80, 51], [-76.5, 53.5], [-77.8, 56]], [[-115, 68], [-105, 68.5], [-95, 68.2], [-85, 68.7]], [[-61, 56], [-63, 58.5], [-64.5, 60]]];
const MINES = [['GOLD', 'timmins'], ['NICKEL', 'sudbury'], ['URANIUM', 'athabasca'], ['DIAMONDS', 'diavik'], ['GOLD', 'valdor'], ['NICKEL', 'thompson']];
function pl(name) { return GEO.places[name]; }
let SLATE;
function makeSlate() { const cv = document.createElement('canvas'); cv.width = cv.height = 160; const g = cv.getContext('2d'); g.fillStyle = '#6E737C'; g.fillRect(0, 0, 160, 160); const r = rnd(4);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(r() * 160, r() * 160, 6 + r() * 16, 3 + r() * 8, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(40,44,50,0.45)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { let x = r() * 160, y = r() * 160; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 3; j++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); } return cv; }
function shieldFill(ctx, c, k, white = 0) {
  if (k <= 0) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS.shield) pp.addPath(p, M);
  ctx.save(); ctx.globalAlpha = 0.85 * k; ctx.fillStyle = ctx.createPattern(SLATE, 'repeat'); ctx.fill(pp); if (white > 0) { ctx.globalAlpha = white * k; ctx.fillStyle = '#EEF6FA'; ctx.fill(pp); }
  ctx.globalAlpha = k; ctx.strokeStyle = '#C9D3DC'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.stroke(pp); ctx.restore();
}
function thermo(ctx, x, y, s, frac, col, label, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k * s, k * s); ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(-26, -200, 52, 230, 26); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 50, 42, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 50, 32, 0, 7); ctx.fill(); ctx.fillRect(-12, 20 - 200 * frac, 24, 200 * frac + 20);
  ctx.restore(); styledText(ctx, label, x, y + 130 * s * k, 52 * s, { k, fill: '#fff', stroke: C.ink }); }
function campfire(ctx, x, y, s, t, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k * s, k * s);
  const g = ctx.createRadialGradient(0, -30, 10, 0, -30, 220); g.addColorStop(0, 'rgba(255,190,90,0.55)'); g.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -30, 220, 0, 7); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillStyle = '#6B4423'; ctx.save(); ctx.rotate(0.3); ctx.fillRect(-60, -8, 120, 18); ctx.strokeRect(-60, -8, 120, 18); ctx.restore(); ctx.save(); ctx.rotate(-0.3); ctx.fillRect(-60, -8, 120, 18); ctx.strokeRect(-60, -8, 120, 18); ctx.restore();
  for (const [col, sc] of [['#E63946', 1], ['#F4A261', 0.7], ['#FFE08A', 0.4]]) { const f = 1 + 0.08 * Math.sin(t * 12 * sc); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-36 * sc, 0); ctx.quadraticCurveTo(-30 * sc, -60 * sc * f, 0, -110 * sc * f); ctx.quadraticCurveTo(30 * sc, -60 * sc * f, 36 * sc, 0); ctx.closePath(); ctx.fill(); }
  ctx.restore(); }
function sceneMap(ctx, c, t) {
  const n = night(t);
  if (n > 0) { ctx.save(); ctx.fillStyle = `rgba(3,7,18,${0.8 * n})`; ctx.fillRect(0, 0, W, H); ctx.restore(); strokeGeo(ctx, c, 'can', 'rgba(170,190,200,0.35)', 2, { alpha: n }); }
  // shield (from the reveal on)
  const ks = clamp((t - 38.0) / 1.0) * (t < 129.0 ? 1 : popOut(150.0 - t, 1.0));
  if (t > 37.9 && t < 150.5) shieldFill(ctx, c, ks, t > 101.7 && t < 106.5 ? clamp((t - 101.8) / 1.2) * popOut(106.4 - t) * 0.0 : 0);
  cityLights(ctx, c, t, n > 0 ? n : 0.55, n <= 0); usLights(ctx, c, 0.3 * n);
  // B1 recap
  if (t < 14.4) {
    geoLine(ctx, c, BORDER, clamp((t - 1.4) / 1.6), '#F4D03F', 8, null, true);
    const kd = win(t, 4.0, 9.4); if (kd > 0) { const [dx, dy] = P(c, -100, 63); ctx.save(); ctx.globalAlpha = clamp(kd); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.ellipse(dx, dy, 420, 220, 0, 0, 7); ctx.stroke(); ctx.restore(); styledText(ctx, 'VAST DARKNESS', dx, dy, 70, { k: kd, fill: '#fff', stroke: C.ink }); }
    chip(ctx, 'SCANDINAVIA: JUST AS FAR NORTH… AND THRIVING', W / 2, 120, win(t, 5.8, 8.5), { size: 36 });
    [['CLIMATE', 10.9], ['ROCK', 11.8]].forEach(([s, t0], i) => { const k = win(t, t0, 14.3); if (k <= 0) return; ctx.save(); ctx.translate(760 + i * 400, 540); ctx.scale(k, k); ctx.fillStyle = 'rgba(10,24,32,0.95)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-170, -110, 340, 220, 26); ctx.fill(); ctx.stroke();
      setFont(ctx, 'Montserrat', 30); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i ? '#2' : '#1', 0, -50); setFont(ctx, 'Montserrat', 64); ctx.fillStyle = '#fff'; ctx.fillText(s, 0, 20); ctx.restore(); });
    title(ctx, 'WHY IS NORTHERN CANADA EMPTY?', 110, win(t, 0.1, 4.0), 72);
  }
  // B2 climate: the Gulf Stream vs Arctic air
  if (t > 14.3 && t < 33.5) {
    fillGeo(ctx, c, 'scandi', '#F4A261', 0.35 * win(t, 16.0, 33.2));
    const kg = clamp((t - 17.8) / 3.0) * popOut(33.2 - t); if (kg > 0) { geoLine(ctx, c, GULF, kg, '#FF8A3D', 14, null, true); const sp = GULF.map(p => P(c, ...p)), [ax, ay] = pointAlong(sp, Math.min(0.999, kg)), [bx, by] = pointAlong(sp, Math.max(0, kg - 0.02)); arrow(ctx, bx, by, ax, ay, '#FF8A3D', 12, 1); }
    const [gx, gy] = P(c, -55, 41); goldLabel(ctx, 'GULF STREAM', gx, gy + 60, 48, win(t, 19.3, 33.2)); chip(ctx, 'A WARM CURRENT FROM THE TROPICS', W / 2, 120, win(t, 17.8, 21.9), { size: 38, stroke: '#FF8A3D' });
    const [sx, sy] = P(c, 15, 63); goldLabel(ctx, 'SCANDINAVIA', sx, sy - 100, 44, win(t, 15.8, 33.2));
    if (t > 24.3) for (let i = 0; i < 6; i++) { const x0 = P(c, -125 + i * 12, 78)[0], u = ((t - 24.4) * 0.6 + i * 0.15) % 1, ya = P(c, 0, 76)[1], yb = P(c, 0, 52)[1]; ctx.save(); ctx.globalAlpha = (1 - u) * popOut(33.2 - t); arrow(ctx, x0, lerp(ya, yb, u) - 80, x0 + 20, lerp(ya, yb, u), '#7FC8FF', 9); ctx.restore(); }
    chip(ctx, 'NORTHERN CANADA: NO SUCH HELP', W / 2, 120, win(t, 22.4, 24.4), { size: 40 }); chip(ctx, '❄ ARCTIC AIR POURS SOUTH', W / 2, 120, win(t, 24.5, 27.5), { size: 40, stroke: '#7FC8FF' });
    if (t > 27.5) { const [ox, oy] = P(c, 10.75, 59.9), [yx, yy] = P(c, -114.4, 62.4); thermo(ctx, ox, oy - 160, 0.7, 0.55, '#F4A261', 'OSLO ≈ −4 °C', pop(t - 27.6)); thermo(ctx, yx, yy - 160, 0.7, 0.12, '#2E86DE', 'YELLOWKNIFE ≈ −26 °C', pop(t - 28.3));
      chip(ctx, 'JANUARY AVERAGE · 20°+ COLDER', W / 2, 120, win(t, 29.6, 33.2), { size: 40 }); }
  }
  // B3/B4 the Shield reveal
  if (t > 33.2 && t < 52.6) {
    chip(ctx, 'A SECOND PROBLEM… UNDER THE GROUND', W / 2, 120, win(t, 35.0, 37.6), { size: 38 });
    const [sx, sy] = P(c, -92, 64); goldLabel(ctx, 'CANADIAN SHIELD', sx, sy, 64, win(t, 38.2, 52.4));
    const [hx, hy] = P(c, ...pl('hudson')); goldLabel(ctx, 'HUDSON BAY', hx, hy, 44, win(t, 42.0, 52.4));
    chip(ctx, '≈ HALF OF CANADA', W / 2, 120, win(t, 44.2, 46.6), { size: 42 }); chip(ctx, 'ANCIENT GRANITE & GNEISS', W / 2, 120, win(t, 46.7, 48.5), { size: 42 });
    if (t > 48.5) { const [ax, ay] = P(c, ...pl('acasta')); ctx.save(); ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ax, ay, 12 * pop(t - 48.6), 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); chip(ctx, '≈ 4 BILLION-YEAR-OLD ROCK', ax + 40, ay - 60, win(t, 48.7, 52.4), { size: 30 }); chip(ctx, 'SOME OF THE OLDEST ROCKS ON EARTH', W / 2, 120, win(t, 48.6, 52.4), { size: 38 }); }
  }
  // B9 engineering nightmare: blasting, sinking bridges, ice
  if (t > 93.0 && t < 106.6) {
    const kr = clamp((t - 96.6) / 3.0); geoLine(ctx, c, ROAD, kr, '#F4F1E6', 7, [16, 10]);
    if (t > 96.6) { const sp = ROAD.map(p => P(c, ...p)), [x, y] = pointAlong(sp, kr); puff(ctx, x, y - 20, 110, ((t - 96.6) * 1.8) % 1, Math.floor(t * 2)); }
    if (t > 99.1) { const sp = ROAD.map(p => P(c, ...p)), [x, y] = pointAlong(sp, 0.7), sink = clamp((t - 99.4) / 1.4); ctx.save(); ctx.fillStyle = '#5E6B3A'; ctx.beginPath(); ctx.ellipse(x, y + 20, 90, 34, 0, 0, 7); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
      for (let i = 0; i < 5; i++) { const u = ((t * 0.9) + i / 5) % 1; ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#9DB87A'; ctx.beginPath(); ctx.arc(x - 50 + i * 25, y + 10 - u * 30, 6 + u * 4, 0, 7); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.translate(x, y + sink * 26); ctx.rotate(sink * 0.12); ctx.fillStyle = '#9AA3AE'; ctx.fillRect(-90, -16, 180, 14); ctx.strokeRect(-90, -16, 180, 14); for (const bx of [-70, 0, 70]) { ctx.fillRect(bx - 5, -2, 10, 30); } ctx.restore(); goldLabel(ctx, 'MUSKEG', x, y + 90, 40, win(t, 99.3, 106.4)); }
    if (t > 101.7) { const kw = clamp((t - 101.8) / 1.4) * popOut(106.4 - t); const M = camMatrix(c); ctx.save(); ctx.globalAlpha = 0.85 * kw; ctx.fillStyle = '#EEF6FA'; ctx.setTransform(M); for (const p of PATHS.lakes) ctx.fill(p); ctx.restore();
      const [hx, hy] = P(c, ...pl('hudson')); ctx.save(); ctx.globalAlpha = 0.8 * kw; ctx.fillStyle = '#EEF6FA'; ctx.beginPath(); ctx.ellipse(hx + 10, hy + 20, 5.5 * c.z, 6.5 * c.z, 0.3, 0, 7); ctx.fill(); ctx.restore(); }
    person(ctx, t > 99.2 ? 'engineer_scratch' : 'engineer_plan', 230, 1010, 280, { k: pop(t - 93.3) * popOut(106.4 - t) });
    chip(ctx, 'AN EXPENSIVE NIGHTMARE', W / 2, 120, win(t, 93.2, 96.5), { size: 42 }); chip(ctx, '💥 BLAST THROUGH GRANITE', W / 2, 120, win(t, 96.6, 99.1), { size: 40 });
    chip(ctx, 'BRIDGES ON SHIFTING MUSKEG', W / 2, 120, win(t, 99.2, 101.7), { size: 40 }); chip(ctx, '🧊 RIVERS, LAKES, HUDSON BAY FREEZE', W / 2, 120, win(t, 101.8, 106.4), { size: 38, stroke: '#BFE6FF' });
  }
  // B10 permafrost
  if (t > 106.4 && t < 117.4) {
    const kp = clamp((t - 109.2) / 1.0) * popOut(117.2 - t); if (kp > 0) { const pts = GEO.perma[0], line = []; for (let i = 0; i < pts.length; i += 2) line.push([pts[i], pts[i + 1]]); const poly = [...line, [-52, 84], [-142, 84]];
      const pp = new Path2D(); poly.forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); i ? pp.lineTo(x, y) : pp.moveTo(x, y); }); pp.closePath(); const cp = new Path2D(); for (const p of PATHS.can) cp.addPath(p, camMatrix(c));
      ctx.save(); ctx.clip(cp); ctx.clip(pp); ctx.globalAlpha = 0.45 * kp; ctx.fillStyle = '#BFE6FF'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 0.5 * kp; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; for (let x = -H; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); } ctx.restore();
      geoLine(ctx, c, line, kp, '#BFE6FF', 5, [14, 10]); }
    const [px, py] = P(c, -108, 66); goldLabel(ctx, 'PERMAFROST', px, py, 64, win(t, 109.3, 117.2)); chip(ctx, 'THE GROUND ITSELF IS FROZEN', W / 2, 120, win(t, 107.6, 111.6), { size: 40, stroke: '#BFE6FF' });
    if (t > 111.6) { const k = pop(t - 111.7); ctx.save(); ctx.translate(1450, 820); ctx.scale(k, k); ctx.fillStyle = 'rgba(10,24,32,0.92)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-300, -170, 600, 320, 24); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3A3A40'; ctx.lineWidth = 26; ctx.beginPath(); for (let x = -260; x <= -20; x += 10) ctx.lineTo(x, 60 + Math.sin(x / 30 + 1) * 24 * clamp((t - 112.0) / 0.8)); ctx.stroke();
      ctx.save(); ctx.translate(160, 60); ctx.rotate(0.18 * clamp((t - 113.3) / 0.8)); ctx.translate(0, 24 * clamp((t - 113.3) / 0.8)); sprite(ctx, 'house', 0, 0, 170, { ay: 1 }); ctx.restore();
      ctx.fillStyle = '#BFE6FF'; ctx.globalAlpha = 0.6; ctx.fillRect(-280, 70, 560, 70); ctx.restore(); chip(ctx, 'THAW → ROADS BUCKLE, BUILDINGS SINK', W / 2, 120, win(t, 111.7, 117.2), { size: 36 }); }
  }
  // B11 the southern corridor
  if (t > 116.8 && t < 129.0) {
    const corr = [[-83.5, 42.0], [-79.0, 42.8], [-76.5, 43.8], [-74.0, 45.2], [-71.0, 46.8], [-70.0, 47.6], [-73.0, 46.4], [-76.0, 45.4], [-79.6, 44.4], [-81.8, 43.6], [-83.0, 42.6]];
    const kc = clamp((t - 117.4) / 1.0) * popOut(128.8 - t); if (kc > 0) { const pp = polyPath(c, corr); ctx.save(); ctx.globalAlpha = 0.45 * kc; ctx.fillStyle = '#6FBF4A'; ctx.fill(pp); ctx.globalAlpha = kc; ctx.strokeStyle = '#B6F08E'; ctx.lineWidth = 5; ctx.shadowColor = '#B6F08E'; ctx.shadowBlur = 20; ctx.stroke(pp); ctx.restore(); }
    for (const [lab, lo, la, t0] of [['ST. LAWRENCE', -71.0, 47.6, 117.9], ['SOUTHERN ONTARIO', -80.5, 44.4, 118.8], ['GREAT LAKES', -84.0, 44.8, 119.7]]) { const [x, y] = P(c, lo, la); goldLabel(ctx, lab, x, y - 50, 40, win(t, t0, 128.6)); }
    [[-80.6, 43.2], [-78.2, 44.0], [-75.5, 45.0], [-72.6, 46.1], [-81.8, 42.8]].forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); sprite(ctx, i % 2 ? 'cow' : 'wheat_ok', x, y, i % 2 ? 90 : 80, { k: pop(t - 120.6 - i * 0.1) * popOut(128.6 - t), ay: 0.9 }); });
    chip(ctx, 'DEEP, RICH SOIL', W / 2, 120, win(t, 120.5, 122.1), { size: 42, stroke: '#B6F08E' }); chip(ctx, 'THE LAKES SOFTEN THE WINTERS', W / 2, 120, win(t, 122.2, 123.7), { size: 40 });
    if (t > 123.7) { const [ux, uy] = P(c, -77, 41.0); goldLabel(ctx, 'UNITED STATES', ux, uy - 20, 50, win(t, 123.8, 128.6)); for (let i = 0; i < 3; i++) { const x = 760 + i * 220; arrow(ctx, x, 560, x, 780, '#F4D03F', 9, clamp((t - 124.0 - i * 0.15) / 0.6) * popOut(128.6 - t)); arrow(ctx, x + 40, 780, x + 40, 560, '#F4D03F', 9, clamp((t - 124.3 - i * 0.15) / 0.6) * popOut(128.6 - t)); }
      chip(ctx, 'NEXT DOOR: THE BIGGEST ECONOMY ON EARTH', W / 2, 120, win(t, 123.8, 128.6), { size: 36 }); }
  }
  // B12 Indigenous peoples: routes along rivers and coasts (no characters, just the land)
  if (t > 128.2 && t < 139.0) {
    const k = clamp((t - 128.6) / 0.8) * popOut(138.8 - t);
    ROUTES.forEach((r, i) => geoLine(ctx, c, r, clamp((t - 133.4 - i * 0.2) / 1.6) * k, '#FF9F43', 9, [6, 12], true));
    chip(ctx, 'FOR THOUSANDS OF YEARS', W / 2, 120, win(t, 128.4, 131.2), { size: 42 }); chip(ctx, 'NORTHERN FORESTS · ARCTIC COASTS', W / 2, 120, win(t, 131.3, 133.4), { size: 40 }); chip(ctx, 'DEEP KNOWLEDGE OF LAND, WILDLIFE, WATERWAYS', W / 2, 120, win(t, 133.5, 138.6), { size: 34 });
  }
  // B13 mines
  if (t > 138.6 && t < 149.0) {
    MINES.forEach(([lab, place], i) => { const [x, y] = P(c, ...pl(place)), k = pop(t - 141.6 - i * 0.3) * popOut(148.8 - t); sprite(ctx, 'headframe', x, y, 80, { k, ay: 0.95 }); chip(ctx, lab, x, y + 40, k, { size: 26 }); });
    chip(ctx, '⛏ WEALTH FROM ANCIENT ROCK', W / 2, 120, win(t, 138.8, 146.5), { size: 40 }); chip(ctx, 'REMOTE MINING TOWNS', W / 2, 120, win(t, 145.4, 148.8), { size: 40 });
  }
  // B14 islands in a wilderness; the big cities stay south
  if (t > 148.4 && t < 160.4) {
    MINES.forEach(([, place], i) => { const [x, y] = P(c, ...pl(place)), k = win(t, 150.6, 154.0); if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k); ctx.fillStyle = 'rgba(244,208,63,0.35)'; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(x, y, 40, 0, 7); ctx.stroke(); ctx.restore(); });
    chip(ctx, 'ISLANDS IN A VAST WILDERNESS', W / 2, 120, win(t, 150.7, 154.1), { size: 40 });
    for (const [nm, dx, dy, t0] of [['Toronto', 20, 46, 154.3], ['Montreal', 30, -40, 154.8], ['Vancouver', 40, 44, 155.4], ['Calgary', 0, -40, 156.1]]) cityLabel(ctx, c, nm, win(t, t0, 160.2), dx, dy, 40);
    geoLine(ctx, c, BORDER, clamp((t - 156.4) / 1.4) * popOut(160.2 - t), '#F4D03F', 7, null, true);
    chip(ctx, 'CLOSE TO THE SOUTHERN RIM', W / 2, 120, win(t, 156.6, 160.2), { size: 40 });
  }
  // B15 the campfire
  if (t > 160.0) {
    const [fx, fy] = P(c, -88, 49.2);
    campfire(ctx, fx, fy, 1.0, t, pop(t - 163.8, 0.4));
    ['camper_0', 'camper_1', 'farmer_dig', 'camper_0', 'camper_1'].forEach((s, i) => { const a = Math.PI + 0.35 + i * 0.6, x = fx + Math.cos(a) * 200, y = fy + 60 + Math.sin(a) * 50; if (Math.sin(a) > 0.1) return; person(ctx, s, x, y, 120, { k: pop(t - 164.0 - i * 0.08) * popOut(172.0 - t), flip: x > fx }); });
    chip(ctx, 'HUDDLED ALONG THE BORDER…', W / 2, 120, win(t, 160.2, 163.0), { size: 40 }); kinetic(ctx, 'LIKE A CAMPFIRE', 130, win(t, 163.1, 166.9), 84);
    chip(ctx, "NOT JUST THE COLD…", W / 2, 120, win(t, 165.5, 166.9), { size: 42 }); kinetic(ctx, 'WHERE A CITY CAN TAKE ROOT', 130, win(t, 167.0, 172.0), 72, -3, '#B6F08E');
  }
}
// ---- cutaway cards (cross-section, driveway)
function sceneCards(ctx, t) {
  // B5–B7 glaciers scrape the Shield; bare rock, muskeg, no farms
  { const k = clamp((t - 52.5) / 0.5) * (1 - clamp((t - 82.9) / 0.4)); if (card(ctx, k)) { ctx.save(); ctx.globalAlpha = clamp(k * 1.2);
      styledText(ctx, '← NORTH', 220, 160, 40, { fill: '#BFE6FF' }); styledText(ctx, 'SOUTH →', 1700, 160, 40, { fill: '#FFE0B0' });
      const scrape = clamp((t - 54.2) / 6.0), gx = lerp(320, 1350, easeIO(scrape)), rock = (x) => 720 + Math.sin(x / 90) * 40 + Math.sin(x / 37) * 18;
      ctx.fillStyle = '#6E737C'; ctx.beginPath(); ctx.moveTo(80, 980); for (let x = 80; x <= 1840; x += 20) ctx.lineTo(x, rock(x)); ctx.lineTo(1840, 980); ctx.closePath(); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.stroke();
      ctx.save(); ctx.globalAlpha *= 0.85; ctx.fillStyle = ctx.createPattern(SLATE, 'repeat'); ctx.beginPath(); ctx.moveTo(80, 980); for (let x = 80; x <= 1840; x += 20) ctx.lineTo(x, rock(x)); ctx.lineTo(1840, 980); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#6B4A2A'; ctx.beginPath(); ctx.moveTo(Math.max(80, gx), rock(Math.max(80, gx))); for (let x = Math.max(80, gx); x <= 1840; x += 20) ctx.lineTo(x, rock(x) - 50); ctx.lineTo(1840, rock(1840)); for (let x = 1840; x >= Math.max(80, gx); x -= 20) ctx.lineTo(x, rock(x)); ctx.closePath(); ctx.fill();
      const pile = 140 * easeIO(scrape); ctx.fillStyle = '#7A5530'; ctx.beginPath(); ctx.moveTo(1400, rock(1400)); ctx.quadraticCurveTo(1640, rock(1640) - 60 - pile, 1840, rock(1840) - pile * 0.6); ctx.lineTo(1840, rock(1840)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
      if (t < 63.8) { ctx.fillStyle = '#DCEFFA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(gx - 900, 260); ctx.lineTo(gx - 40, 300); ctx.lineTo(gx + 60, rock(gx + 60) - 60); ctx.lineTo(gx + 60, rock(gx + 60)); ctx.lineTo(gx - 900, rock(gx) + 20); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#A9CDE0'; ctx.lineWidth = 4; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(gx - 820 + i * 150, 330); ctx.lineTo(gx - 760 + i * 150, rock(gx) - 30); ctx.stroke(); } styledText(ctx, 'ICE AGE GLACIER', gx - 380, 400, 44, { fill: '#2B4A6B' }); }
      styledText(ctx, 'GREAT LAKES · MIDWEST', 1640, rock(1640) - 140 - pile, 34, { k: win(t, 59.6, 63.8), fill: C.gold, stroke: C.goldDark });
      chip(ctx, 'GLACIERS SCRAPE LIKE BULLDOZERS', W / 2, 110, win(t, 53.6, 57.2), { size: 40 }); chip(ctx, 'THE SOIL GETS PUSHED SOUTH', W / 2, 110, win(t, 57.3, 63.7), { size: 40 });
      if (t > 63.8) { for (const x of [380, 620, 900, 1150]) { ctx.fillStyle = '#4E6B3A'; ctx.beginPath(); ctx.ellipse(x, rock(x) - 6, 60, 16, 0, 0, 7); ctx.fill(); for (let i = 0; i < 3; i++) { const u = ((t * 0.8) + i / 3 + x) % 1; ctx.save(); ctx.globalAlpha *= 1 - u; ctx.strokeStyle = '#9DB87A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x - 20 + i * 20, rock(x) - 12 - u * 30, 5, 0, 7); ctx.stroke(); ctx.restore(); } }
        chip(ctx, 'BARE ROCK · JAGGED RIDGES', W / 2, 110, win(t, 64.6, 67.4), { size: 40 }); goldLabel(ctx, 'MUSKEG', 620, rock(620) + 70, 50, win(t, 67.5, 82.8)); chip(ctx, 'SOGGY SWAMPS & PEAT BOGS', W / 2, 110, win(t, 67.5, 71.5), { size: 40 }); }
      if (t > 71.5) { person(ctx, t > 73.1 && t < 76.0 ? 'farmer_clang' : 'farmer_dig', 900, rock(900) + 6, 260, { k: pop(t - 71.6) }); if (t > 73.1 && t < 74.4) styledText(ctx, 'CLANG!', 1060, 500, 80, { k: pop(t - 73.15, 0.15), fill: C.yellow, stroke: C.ink, rot: 10 });
        chip(ctx, 'THIN, ACIDIC SOIL', W / 2, 110, win(t, 71.7, 73.8), { size: 42 }); stamp(ctx, 'TOO ROCKY TO FARM', 1420, 420, t, 74.8, { size: 56, until: 76.2 });
        [['NO FARMS', 76.3], ['NO TOWNS', 77.7], ['NO ROADS', 79.2]].forEach(([s, t0], i) => { const kk = win(t, t0, 82.8); if (kk <= 0) return; ctx.save(); ctx.translate(560 + i * 400, 300); ctx.scale(kk, kk); ctx.fillStyle = 'rgba(10,24,32,0.95)'; ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-150, -46, 300, 92, 22); ctx.fill(); ctx.stroke(); setFont(ctx, 'Montserrat', 42); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 3); ctx.restore(); if (i) arrow(ctx, 360 + i * 400, 300, 400 + i * 400, 300, '#FF6B6B', 7, kk); }); }
      ctx.restore(); } }
  // B8 the concrete driveway
  { const k = clamp((t - 83.1) / 0.5) * (1 - clamp((t - 92.9) / 0.4)); if (card(ctx, k)) { ctx.save(); ctx.globalAlpha = clamp(k * 1.2);
      ctx.fillStyle = '#A7ADB5'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.fillRect(160, 200, 1600, 640); ctx.strokeRect(160, 200, 1600, 640);
      ctx.strokeStyle = 'rgba(80,86,94,0.5)'; ctx.lineWidth = 3; for (let x = 360; x < 1760; x += 200) { ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x, 760); ctx.stroke(); } for (let y = 360; y < 760; y += 160) { ctx.beginPath(); ctx.moveTo(160, y); ctx.lineTo(1760, y); ctx.stroke(); }
      ctx.fillStyle = '#6FBF4A'; ctx.fillRect(160, 760, 1600, 80); ctx.strokeRect(160, 760, 1600, 80); ctx.fillStyle = '#8B5E3C'; for (let x = 170; x < 1760; x += 40) ctx.fillRect(x, 840, 12, 50); ctx.fillRect(160, 860, 1600, 10);
      const nh = Math.floor(clamp((t - 87.2) / 2.8) * 22); for (let i = 0; i < nh; i++) sprite(ctx, 'house', 200 + i * 70, 800, 90, { ay: 1, k: pop(t - 87.2 - i * 0.12, 0.25) });
      if (t > 85.5 && t < 87.4) { person(ctx, 'farmer_clang', 900, 640, 220); styledText(ctx, 'CLANG!', 1080, 420, 70, { k: pop(t - 85.7, 0.15), fill: C.yellow, stroke: C.ink, rot: 10 }); }
      chip(ctx, 'A HUGE PROPERTY… ALMOST ALL CONCRETE', W / 2, 110, win(t, 83.3, 87.1), { size: 38 }); chip(ctx, 'EVERYONE SQUEEZES ONTO THE GRASS', W / 2, 110, win(t, 87.2, 92.8), { size: 38, stroke: '#B6F08E' });
      ctx.restore(); } }
}
function sceneSubscribe(ctx, t) {
  if (t < 172.1) return; const e = t - 172.1, k = clamp(e / 0.4);
  ctx.fillStyle = `rgba(4,10,14,${0.72 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, "IT'S NOT JUST THE COLD.", W / 2, 380, 100, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, "IT'S THE ROCK.", W / 2, 520, 120, { k: pop(e - 0.35, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  const kc = pop(e - 0.9, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 720); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 50);
    const w = ctx.measureText('SUBSCRIBE TO MAPHELD').width + 130; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -60, w, 120, 60); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 44, -22); ctx.lineTo(-w / 2 + 44, 22); ctx.lineTo(-w / 2 + 80, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SUBSCRIBE TO MAPHELD', 24, 3); ctx.restore(); }
}
const CAPTIONS = [
  [0.2, 3.8, 'A ribbon of light along the border'], [3.9, 5.7, 'Darkness to the north'], [5.8, 8.5, 'Scandinavia thrives up there'], [8.6, 10.2, "So what's going on?"], [10.3, 14.2, 'Climate… and rock'],
  [14.4, 17.7, 'First: the climate'], [17.8, 21.9, 'A warm current: the Gulf Stream'], [22.0, 24.4, 'Northern Canada: no such help'], [24.5, 27.5, 'Arctic air pours south'], [27.6, 33.1, '20°+ colder at the same latitude'],
  [33.4, 37.6, 'A second problem: underground'], [37.7, 41.2, 'The Canadian Shield'], [41.4, 46.0, 'About half of Canada'], [46.1, 52.3, 'Some of the oldest rock on Earth'],
  [52.6, 57.2, 'Ice Age glaciers scraped it'], [57.3, 63.6, 'The soil went south'], [63.9, 67.4, 'Bare rock and ridges'], [67.5, 71.4, 'Swamps called muskeg'],
  [71.7, 75.9, 'Thin, acidic soil'], [76.0, 78.3, 'No farms, no towns…'], [78.4, 82.9, '…no highways or railways'],
  [83.2, 87.1, 'All concrete driveway…'], [87.2, 92.9, '…squeeze onto the grass'],
  [93.2, 96.1, 'Building here: a nightmare'], [96.2, 98.4, 'Blasting through granite'], [98.5, 101.6, 'Bridges over muskeg'], [101.7, 106.3, 'Rivers, lakes, Hudson Bay freeze'],
  [106.6, 109.2, 'Further north: frozen ground'], [109.3, 111.6, 'Permafrost'], [111.7, 116.0, 'Thaw: roads buckle, buildings sink'],
  [116.2, 120.3, 'Meanwhile, in the south…'], [120.4, 123.6, 'Rich soil, milder winters'], [123.7, 128.2, 'And the US next door'],
  [128.4, 133.4, 'Indigenous peoples, for millennia'], [133.5, 138.6, 'Deep knowledge of the land'],
  [138.8, 141.6, "Today, wealth from the Shield"], [141.7, 146.4, 'Gold, nickel, uranium, diamonds'],
  [148.8, 154.1, 'Northern towns stay small'], [154.2, 159.9, 'Big cities stay south'],
  [160.1, 162.9, 'Huddled along the border'], [163.0, 165.4, 'Like around a campfire'], [165.5, 166.9, 'Not just the cold…'], [167.0, 171.9, '…the only soil a city can root in'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .24, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, H * 1.0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
const COVER = [[53.1, 82.9], [83.7, 92.9]];
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t);
  if (!COVER.some(([a, b]) => t > a && t < b)) { drawMap(ctx, c); sceneMap(ctx, c, t); }
  sceneCards(ctx, t);
  vignette(ctx); if (t < 172.1) drawText(ctx, t); sceneSubscribe(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}
window.renderAt = renderAt; window.READY = false;
TOWNS = (() => { const g = document.createElement('canvas').getContext('2d'), us = new Path2D(); for (const r of GEO.usa) { for (let i = 0; i < r.length; i += 2) { const x = r[i], y = -mercY(r[i + 1]); i ? us.lineTo(x, y) : us.moveTo(x, y); } us.closePath(); }
  return GEO.towns.map(d => [d[0], d[1], d[2], g.isPointInPath(us, d[0], -mercY(d[1])) ? 1 : 0]); })();
loadAssets().then(() => {
  GLOW = makeGlow(); SLATE = makeSlate();
  window.READY = true; if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  ctl.style.display = 'flex'; let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; draw(); };
  const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; last = now; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
