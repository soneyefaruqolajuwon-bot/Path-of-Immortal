/* Why is the middle of Australia empty? Part 2 — Mapheld 16:9 long-form (continues from the Part 1 short).
   renderAt(t) draws storyboard time t (= voiceover time incl. breathers). Belts, range, basin and Goyder's Line are simplified outlines. */
'use strict';
const W = 1920, H = 1080, DURATION = 223.0;
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
  aus: [134.0, -26.8, 25], world: [55, 2, 5.4], east: [146.5, -28.5, 38], lakeEyre: [137.6, -28.7, 130],
  sa: [138.2, -33.2, 80], wa: [119.8, -31.3, 75], alice: [134.0, -27.5, 34], north: [133.0, -17.5, 42],
};
const KEYS = [
  [0, 'aus', 1], [15.8, 'aus', 1.03], [17.6, 'world', 1], [31.4, 'world', 1.03], [32.6, 'aus', 1], [51.6, 'aus', 1], [56.4, 'aus', 1.02], [57.4, 'lakeEyre', 1], [65.4, 'lakeEyre', 1.03],
  [66.9, 'east', 1], [75.4, 'east', 1.03], [76.4, 'aus', 1], [89.0, 'aus', 1], [107.0, 'aus', 1.02], [140.2, 'aus', 1], [158.8, 'aus', 1.02], [160.3, 'sa', 1], [171.0, 'sa', 1.03],
  [172.4, 'aus', 1], [176.4, 'aus', 1.02], [177.7, 'wa', 1], [184.8, 'wa', 1.03], [186.1, 'alice', 1], [196.2, 'alice', 1.03], [197.5, 'north', 1], [205.8, 'north', 1.03],
  [207.4, 'aus', 1], [223.0, 'aus', 1.04],
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
  for (const key of ['world', 'wide', 'usland', 'aus', 'interior', 'usOnAus']) {
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
  const set = c.z < 10 ? PATHS.world : PATHS.wide;
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

// ================================================================== Part 2 scenes (storyboard 0–223 s)
const GDR = [[145.3, -15.8], [145.9, -18.8], [147.3, -21.8], [148.8, -24.6], [151.2, -27.6], [151.4, -30.6], [150.2, -33.4], [149.0, -36.0], [147.2, -37.1], [145.2, -37.5], [143.2, -37.3]];
const GAB = [[138, -18.5], [142.5, -17.8], [146, -20], [148.5, -24], [150.2, -27.5], [149, -30.5], [146, -32.5], [142, -32.8], [139, -30.5], [136.4, -27.5], [135.2, -23.5], [136.2, -20]];
const GOYDER = [[134.3, -32.6], [135.6, -32.9], [136.4, -33.1], [137.6, -32.7], [138.5, -32.6], [138.9, -33.0], [139.0, -33.7], [139.5, -34.5], [140.3, -35.3], [141.0, -36.2]];
const PIPE = [[116.2, -31.9], [117.2, -31.6], [118.3, -31.5], [119.3, -31.2], [120.4, -31.0], [121.47, -30.75]];
const ROADS = [[[138.6, -34.9], [137.7, -32.5], [136.8, -30.5], [134.6, -29.0], [133.9, -25.5], [133.88, -23.7]], [[130.84, -12.46], [132.3, -14.5], [133.3, -17.5], [134.2, -21.0], [133.88, -23.7]]];
const ROUTES = [[[121, -24], [124, -22.5], [127, -23.5], [129.5, -22], [132, -23.2]], [[129, -27], [131.5, -25.8], [133.5, -26.7], [136, -25.5]], [[124, -28.5], [126.5, -27.2], [129, -28.4]], [[132.5, -20], [134.5, -19], [136.5, -20.3], [138.5, -19.4]]];
const WATERHOLES = [[124, -22.5], [129.5, -22], [131.5, -25.8], [136, -25.5], [126.5, -27.2], [134.5, -19], [138.5, -19.4], [127, -23.5]];
function polyPath(c, pts, close = true) { const p = new Path2D(); pts.forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); i ? p.lineTo(x, y) : p.moveTo(x, y); }); if (close) p.closePath(); return p; }
function mountains(ctx, c, k, size = 34) {
  if (k <= 0) return; const sp = GDR.map(p => P(c, ...p)), n = 26;
  for (let i = 0; i <= n * clamp(k); i++) { const [x, y] = pointAlong(sp, i / n), s = size * (0.75 + 0.35 * Math.sin(i * 1.7) ** 2);
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#6B5A3A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.3); ctx.lineTo(0, -s * 0.7); ctx.lineTo(s * 0.7, s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4E6B3A'; ctx.beginPath(); ctx.moveTo(-s * 0.18, -s * 0.25); ctx.lineTo(0, -s * 0.7); ctx.lineTo(s * 0.18, -s * 0.25); ctx.closePath(); ctx.fill(); ctx.restore(); }
}
function card(ctx, k, col = C.ocean) {
  if (k <= 0) return false; ctx.save(); ctx.globalAlpha = clamp(k * 1.2); ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(244,208,63,0.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(40, 40, W - 80, H - 80, 30); ctx.stroke(); ctx.restore(); return true;
}
function reasonTag(ctx, n, label, t, t0, t1) {
  const k = win(t, t0, t1, 0.3, 0.2); if (k <= 0) return; ctx.save(); ctx.translate(250, 120); ctx.scale(k, k);
  ctx.fillStyle = C.yellow; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-190, -54, 380, 108, 24); ctx.fill(); ctx.stroke();
  setFont(ctx, 'Montserrat', 30); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`REASON #${n}`, 0, -18); setFont(ctx, 'Montserrat', 40); ctx.fillText(label, 0, 22); ctx.restore();
}
function cloudAt(ctx, name, x, y, w, k = 1, o = {}) { sprite(ctx, name, x, y, w, { k, ...o }); }
function rainDrops(ctx, x0, x1, y0, y1, t, a = 1, seed = 2) { if (a <= 0) return; const r = rnd(seed); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#7FC8FF'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 40; i++) { const x = lerp(x0, x1, r()), sp = 0.7 + r() * 0.6, y = y0 + ((r() * (y1 - y0) + t * 420 * sp) % (y1 - y0)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 22); ctx.stroke(); } ctx.restore(); }
function arrow(ctx, x0, y0, x1, y1, col, w = 10, k = 1) { if (k <= 0) return; const x = lerp(x0, x1, k), y = lerp(y0, y1, k), a = Math.atan2(y1 - y0, x1 - x0); ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(w * 2.4, 0); ctx.lineTo(-w, -w * 1.8); ctx.lineTo(-w, w * 1.8); ctx.closePath(); ctx.fill(); ctx.restore(); }

function anchor(ctx, x, y, s, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = 'rgba(10,24,32,0.9)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, s * 1.3, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.gold; ctx.lineWidth = s * 0.18; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -s * 0.55, s * 0.2, 0, 7); ctx.moveTo(0, -s * 0.35); ctx.lineTo(0, s * 0.7); ctx.moveTo(-s * 0.4, -s * 0.1); ctx.lineTo(s * 0.4, -s * 0.1); ctx.moveTo(-s * 0.65, s * 0.25); ctx.quadraticCurveTo(0, s * 1.05, s * 0.65, s * 0.25); ctx.stroke(); ctx.restore(); }
function sceneMap(ctx, c, t) {
  const n = night(t);
  if (t > 15.0 && c.z >= 10) outback(ctx, c, clamp((t - 15.4) / 0.8));
  if (n > 0) { ctx.save(); ctx.fillStyle = `rgba(3,7,18,${0.8 * n})`; ctx.fillRect(0, 0, W, H); ctx.restore(); strokeGeo(ctx, c, 'aus', 'rgba(170,190,200,0.35)', 2, { alpha: n }); }
  if (c.z >= 10) { cityLights(ctx, c, t, n); if (n < 1) cityLights(ctx, c, t, (1 - n) * 0.7, true); }
  const [mx, my] = P(c, 134.2, -25.2);
  // B1 recap: a ring of light around a dark hole
  if (t < 16.2) {
    const kr = clamp((t - 4.4) / 1.6) * popOut(15.9 - t); if (kr > 0) { ctx.save(); ctx.beginPath(); ctx.moveTo(mx, my); ctx.arc(mx, my, 3000, -Math.PI / 2, -Math.PI / 2 + kr * 6.283); ctx.closePath(); ctx.clip();
      strokeGeo(ctx, c, 'aus', 'rgba(244,208,63,0.32)', 30, { glow: 26 }); strokeGeo(ctx, c, 'aus', '#F4D03F', 4); ctx.restore(); }
    const kd = win(t, 6.7, 15.9); if (kd > 0) { const R = 0.27 * 1080 * c.z / 30; ctx.save(); ctx.globalAlpha = clamp(kd); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.setLineDash([20, 12]); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.restore(); }
    styledText(ctx, 'PITCH BLACK', mx, my, 70, { k: win(t, 9.8, 12.2), fill: '#fff', stroke: C.ink });
    styledText(ctx, 'WHY?', mx, my, 110, { k: win(t, 12.3, 13.9), fill: C.yellow, stroke: C.goldDark });
    [['#1', 'LOCATION'], ['#2', 'GEOLOGY'], ['#3', 'MOUNTAINS']].forEach(([s, l], i) => { const k = win(t, 14.0 + i * 0.12, 16.1); if (k <= 0) return; ctx.save(); ctx.translate(560 + i * 400, 540); ctx.scale(k, k);
      ctx.fillStyle = i === 0 && t > 15.6 ? C.yellow : 'rgba(10,24,32,0.95)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-160, -150, 320, 300, 26); ctx.fill(); ctx.stroke();
      setFont(ctx, 'Montserrat', 64); ctx.fillStyle = i === 0 && t > 15.6 ? C.ink : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, -50); setFont(ctx, 'Montserrat', 120); ctx.fillText('?', 0, 50); ctx.restore(); });
    title(ctx, 'WHY IS THE MIDDLE EMPTY?', 120, win(t, 0.1, 4.2), 84);
  }
  // B2 reason 1: the subtropical high-pressure belts
  if (t > 16.0 && t < 32.6) {
    reasonTag(ctx, 1, 'LOCATION', t, 16.3, 32.2);
    const kb = clamp((t - 19.2) / 0.8) * popOut(32.3 - t);
    if (kb > 0) for (const [la0, la1, lab] of [[-20, -36, 'HIGH-PRESSURE BELT'], [18, 33, '']]) { const y0 = P(c, 0, la0)[1], y1 = P(c, 0, la1)[1];
      ctx.save(); ctx.globalAlpha = 0.35 * kb; ctx.fillStyle = '#E8A33D'; ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0)); ctx.restore();
      if (t > 24.4) for (let i = 0; i < 9; i++) { const x = 120 + i * 210, u = ((t - 24.4) * 0.7 + i * 0.13) % 1, yy = lerp(Math.min(y0, y1) - 40, Math.max(y0, y1) - 20, u); ctx.save(); ctx.globalAlpha = kb * (1 - u); arrow(ctx, x, yy - 50, x, yy, '#FFF3D6', 7); ctx.restore(); }
      if (lab) chip(ctx, lab, W / 2, (y0 + y1) / 2, win(t, 19.5, 32.2), { size: 34 }); }
    const ye = P(c, 0, 0)[1]; ctx.save(); ctx.globalAlpha = win(t, 22.1, 32.2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([16, 10]); ctx.beginPath(); ctx.moveTo(0, ye); ctx.lineTo(W, ye); ctx.stroke(); ctx.restore();
    styledText(ctx, 'EQUATOR', 1780, ye - 26, 34, { k: win(t, 22.2, 32.2), fill: '#fff' });
    chip(ctx, '⬇ DRY AIR SINKS & WARMS', W / 2, 160, win(t, 24.5, 28.2), { size: 40 });
    if (t > 26.6 && t < 28.6) { const u = easeOut((t - 26.7) / 1.4), [ax, ay] = P(c, 134, -26); cloudAt(ctx, 'cloud_dry', ax + u * 420, ay - 40 - u * 120, 160, 1 - clamp((t - 28.0) / 0.5)); }
    const [sx, sy] = P(c, 13, 23), [ax, ay] = P(c, 134, -25); goldLabel(ctx, 'SAHARA', sx, sy, 50, win(t, 29.6, 32.2)); goldLabel(ctx, 'AUSTRALIA', ax, ay + 70, 44, win(t, 19.6, 32.2));
  }
  // B4 rivers and the salt lake
  if (t > 51.1 && t < 66.4) {
    const kr = clamp((t - 52.7) / 1.4); riverLines(ctx, c, ['Murray', 'Darling'], kr * popOut(57.2 - t));
    const [rx, ry] = P(c, 144.0, -33.6); goldLabel(ctx, 'MURRAY–DARLING', rx + 40, ry - 70, 42, win(t, 52.9, 57.2));
    const kb = win(t, 53.8, 57.1); if (kb > 0) { ctx.save(); ctx.translate(380, 560); ctx.scale(kb, kb); ctx.fillStyle = 'rgba(10,24,32,0.92)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-260, -230, 520, 460, 26); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5FB3FF'; ctx.fillRect(-200, 150 - 300, 160, 300); ctx.fillRect(80, 150 - 18, 120, 18); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(-200, -150, 160, 300); ctx.strokeRect(80, -150, 120, 300);
      setFont(ctx, 'Montserrat', 28); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('MISSISSIPPI', -120, 196); ctx.fillText('MURRAY–DARLING', 140, 196); ctx.restore(); }
    if (t > 57.3) { const [lx, ly] = P(c, 137.5, -28.55), R = 1.05 * c.z, kl = pop(t - 57.6, 0.4);
      ctx.save(); ctx.translate(lx, ly); ctx.scale(kl, kl); ctx.fillStyle = t > 61.6 && t < 63.4 ? '#7FC8FF' : '#F2F0E8'; ctx.strokeStyle = '#9A8F7A'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, 0, R * 0.55, R * 0.95, 0.2, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(R * 0.25, R * 1.3, R * 0.25, R * 0.4, 0.1, 0, 7); ctx.fill(); ctx.stroke();
      if (!(t > 61.6 && t < 63.4)) { ctx.strokeStyle = 'rgba(150,140,120,0.7)'; ctx.lineWidth = 2; const r = rnd(9); for (let i = 0; i < 26; i++) { const a = r() * 6.283, d = r() * R * 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d * 1.6); ctx.lineTo(Math.cos(a + 0.6) * (d + 20), Math.sin(a + 0.6) * (d + 20) * 1.6); ctx.stroke(); } }
      ctx.restore();
      goldLabel(ctx, 'KATI THANDA–LAKE EYRE', lx, ly - R * 1.3, 52, win(t, 58.0, 66.0)); chip(ctx, 'USUALLY A CRUST OF DRY SALT', W / 2, 160, win(t, 59.5, 61.6), { size: 40 });
      chip(ctx, 'FULL ONLY A HANDFUL OF TIMES', W / 2, 160, win(t, 61.7, 66.0), { size: 40, stroke: '#7FC8FF' }); }
  }
  // B5 reason 3: the Great Dividing Range
  if (t > 66.0 && t < 76.0) {
    reasonTag(ctx, 3, 'MOUNTAINS', t, 66.3, 75.5);
    mountains(ctx, c, clamp((t - 68.6) / 1.6), 30); const [gx, gy] = P(c, 148.2, -26.8); goldLabel(ctx, 'GREAT DIVIDING RANGE', gx - 360, gy, 52, win(t, 68.9, 75.5));
    const [px, py] = P(c, 155.5, -27.5); goldLabel(ctx, 'PACIFIC\nOCEAN', px, py, 50, win(t, 71.6, 75.5)); chip(ctx, 'ALONG THE EASTERN EDGE', W / 2, 160, win(t, 70.4, 75.5), { size: 40 });
  }
  // B7 the south gets winter storms off the Southern Ocean
  if (t > 88.8 && t < 99.6) {
    for (const [nm, dx, dy] of [['Melbourne', 30, 50], ['Adelaide', -40, 50], ['Perth', 80, 40]]) cityLabel(ctx, c, nm, win(t, 89.0 + (nm === 'Adelaide' ? 0.4 : nm === 'Perth' ? 1.0 : 0), 99.4), dx, dy, 40);
    const fy = P(c, 130, lerp(-47, -36.5, easeOut((t - 91.8) / 3.2)))[1], fade = 1 - clamp((t - 96.3) / 1.4);
    for (let f = 0; f < 2; f++) { const yy = fy + f * 70, x0 = 260 + f * 120; if (t < 91.8) break; ctx.save(); ctx.globalAlpha = clamp((t - 91.8) / 0.5) * fade; ctx.strokeStyle = '#3D7CF0'; ctx.fillStyle = '#3D7CF0'; ctx.lineWidth = 7;
      ctx.beginPath(); for (let x = x0; x < x0 + 1300; x += 20) ctx.lineTo(x, yy + Math.sin(x / 140) * 30); ctx.stroke(); for (let x = x0 + 40; x < x0 + 1300; x += 110) { const y = yy + Math.sin(x / 140) * 30; ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.lineTo(x, y - 30); ctx.closePath(); ctx.fill(); } ctx.restore();
      rainDrops(ctx, x0, x0 + 1300, yy - 80, yy + 20, t, 0.6 * clamp((t - 92) / 0.5) * fade, 3 + f); }
    goldLabel(ctx, 'SOUTHERN OCEAN', W / 2, 820, 48, win(t, 93.2, 99.4)); chip(ctx, '❄ WINTER STORMS', W / 2, 160, win(t, 92.0, 95.0), { size: 40 }); chip(ctx, 'FADE BEFORE THE MIDDLE', W / 2, 160, win(t, 96.3, 99.4), { size: 40 });
    if (t > 96.5) { const [ex, ey] = P(c, 134, -24.5); person(ctx, 'explorer_thirsty', ex, ey + 120, 170, { k: win(t, 96.6, 99.4) }); }
  }
  // B9 opening: the Great Artesian Basin outline
  if (t > 106.9 && t < 113.6) {
    const kg = clamp((t - 109.8) / 1.0) * popOut(113.5 - t); if (kg > 0) { const pp = polyPath(c, GAB); ctx.save(); ctx.globalAlpha = 0.5 * kg; ctx.fillStyle = '#2E86DE'; ctx.fill(pp); ctx.globalAlpha = kg; ctx.strokeStyle = '#7FC8FF'; ctx.lineWidth = 5; ctx.shadowColor = '#7FC8FF'; ctx.shadowBlur = 20; ctx.setLineDash([14, 10]); ctx.stroke(pp); ctx.restore(); }
    const [gx, gy] = P(c, 142.5, -25); goldLabel(ctx, 'GREAT ARTESIAN BASIN', gx, gy, 50, win(t, 111.3, 113.5)); chip(ctx, 'UNDERGROUND', W / 2, 160, win(t, 109.9, 113.5), { size: 40, stroke: '#7FC8FF' });
  }
  // B11 Indigenous Australians: seasonal travel and waterholes (no characters, just the land)
  if (t > 140.0 && t < 150.4) {
    const k = clamp((t - 140.4) / 0.8) * popOut(150.2 - t);
    ROUTES.forEach((r, i) => geoLine(ctx, c, r, clamp((t - 146.4 - i * 0.2) / 1.2) * k, '#E07A2E', 5, [4, 12]));
    WATERHOLES.forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); sprite(ctx, 'waterhole', x, y, 70, { k: pop(t - 147.6 - i * 0.08) * popOut(150.2 - t) }); });
    chip(ctx, 'TENS OF THOUSANDS OF YEARS', W / 2, 160, win(t, 140.3, 143.0), { size: 40 }); chip(ctx, 'DEEP KNOWLEDGE OF COUNTRY', W / 2, 160, win(t, 145.1, 147.4), { size: 40 }); chip(ctx, 'SEASONAL TRAVEL · PRECIOUS WATERHOLES', W / 2, 160, win(t, 147.5, 150.2), { size: 38 });
  }
  // B12 settlers push inland; Goyder's Line
  if (t > 150.1 && t < 171.6) {
    if (t < 159.4) {
      const route = [[150.6, -33.6], [146.5, -31.5], [142.5, -29.5], [138.6, -27.6]], sp = route.map(p => P(c, ...p)), u = easeIO((t - 154.6) / 2.4), [hx, hy] = pointAlong(sp, u), kk = pop(t - 150.4) * popOut(159.3 - t);
      geoLine(ctx, c, route, u, '#F4F1E6', 4, [12, 10]);
      for (let i = 0; i < 4; i++) { const [x, y] = pointAlong(sp, Math.max(0, u - 0.06 - i * 0.05)); sprite(ctx, i % 2 ? 'cow' : 'sheep', x + (i % 2 ? 20 : -20), y + 40, i % 2 ? 110 : 95, { k: kk, flip: true }); }
      person(ctx, t > 158.0 ? 'settler_sad' : 'settler_walk', hx, hy + 40, 230, { k: kk, flip: true });
      [[137.3, -28.4], [138.4, -27.2], [139.6, -28.8]].forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); sprite(ctx, t > 158.3 ? 'wheat_dead' : 'wheat_ok', x, y, 90, { k: pop(t - 157.3 - i * 0.08) * popOut(159.3 - t), ay: 0.9 }); });
      chip(ctx, 'CROPS BEYOND THE RAIN: FAILED', W / 2, 160, win(t, 157.4, 159.3), { size: 40 });
    } else {
      const kl = clamp((t - 162.3) / 2.3); geoLine(ctx, c, GOYDER, kl, '#5FB3FF', 7, [18, 10], true);
      const [lx, ly] = P(c, 139.8, -34.4); goldLabel(ctx, "GOYDER'S LINE", lx + 170, ly + 40, 50, win(t, 163.0, 171.4));
      const [nx, ny] = P(c, 137.5, -31.5), [sx2, sy2] = P(c, 138.8, -34.6); styledText(ctx, 'UNRELIABLE RAIN', nx, ny - 60, 36, { k: win(t, 164.4, 171.4), fill: '#FFD3A0' }); styledText(ctx, 'RELIABLE RAIN', sx2 - 200, sy2 + 40, 36, { k: win(t, 164.6, 171.4), fill: '#BFE6FF' });
      person(ctx, kl > 0 && kl < 1 ? 'goyder_draw' : 'goyder_point', 260, 1000, 300, { k: pop(t - 160.4) * popOut(171.4 - t) });
      [[137.2, -31.6], [138.1, -31.2], [139.0, -31.9], [138.6, -32.3]].forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); sprite(ctx, t > 169.2 + i * 0.06 ? 'wheat_dead' : 'wheat_ok', x, y, 100, { k: pop(t - 165.9 - i * 0.07) * popOut(171.4 - t), ay: 0.9 }); });
      if (t > 167.1 && t < 168.3) rainDrops(ctx, 900, 1500, 200, 700, t, 0.8, 5);
      if (t > 168.3) sprite(ctx, 'sun', 1500, 260, 220, { k: pop(t - 168.4) * popOut(171.4 - t), rot: Math.sin(t * 3) * 6 });
      chip(ctx, 'A RUN OF WET YEARS…', W / 2, 160, win(t, 167.1, 168.3), { size: 40, stroke: '#7FC8FF' });
      stamp(ctx, 'WIPED OUT', 1200, 560, t, 169.6, { size: 70, until: 171.4 });
    }
  }
  // B13 anchored to the coast
  if (t > 171.5 && t < 176.6) { for (const nm of ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Darwin', 'Hobart']) { const d = CITY(nm); const [x, y] = P(c, d[1], d[2]); anchor(ctx, x, y - 40, 26, win(t, 172.0, 176.4)); }
    chip(ctx, 'ANCHORED TO THE RAINY COAST', W / 2, 160, win(t, 172.4, 176.4), { size: 42 }); }
  // B14 Kalgoorlie's pipeline; Alice Springs and the road trains
  if (t > 176.4 && t < 186.4) {
    const [kx, ky] = P(c, 121.47, -30.75); sprite(ctx, 'headframe', kx, ky, 130, { k: pop(t - 178.2), ay: 0.95 }); goldLabel(ctx, 'KALGOORLIE', kx, ky + 50, 46, pop(t - 178.4));
    chip(ctx, '⛏ GOLD-MINING CITY', W / 2, 160, win(t, 178.9, 180.8), { size: 40 });
    const kp = clamp((t - 181.0) / 2.4); geoLine(ctx, c, PIPE, kp, '#5FB3FF', 9, null, true);
    if (kp >= 1) { ctx.save(); const sp = PIPE.map(p => P(c, ...p)); for (let i = 0; i < 8; i++) { const [x, y] = pointAlong(sp, ((t - 183) * 0.25 + i / 8) % 1); ctx.fillStyle = '#E8F6FF'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); } ctx.restore(); }
    const [px, py] = P(c, 116.0, -31.95); goldLabel(ctx, 'PERTH', px - 40, py + 50, 40, win(t, 184.2, 186.3)); chip(ctx, '💧 500+ KM WATER PIPELINE', W / 2, 160, win(t, 181.0, 186.3), { size: 40, stroke: '#7FC8FF' });
  }
  if (t > 185.0 && t < 197.0) {
    const [ax, ay] = P(c, 133.88, -23.7); sprite(ctx, 'town', ax, ay, 150, { k: pop(t - 185.3), ay: 0.92 }); goldLabel(ctx, 'ALICE SPRINGS', ax, ay + 50, 44, win(t, 185.4, 196.6));
    chip(ctx, 'RUNS ON ANCIENT GROUNDWATER', W / 2, 160, win(t, 187.2, 189.9), { size: 40, stroke: '#7FC8FF' });
    ROADS.forEach((r, i) => { geoLine(ctx, c, r, clamp((t - 188.6) / 1.0), '#F4F1E6', 4, [10, 8]); const sp = r.map(p => P(c, ...p)), u = ((t - 189.6) * 0.18 + i * 0.4) % 1; if (t > 189.6) { const [x, y] = pointAlong(sp, u), [x2] = pointAlong(sp, Math.min(1, u + 0.01)); sprite(ctx, 'truck', x, y, 150, { flip: x2 < x }); } });
    if (t > 190.4) { const u = ((t - 190.4) * 0.22) % 1; sprite(ctx, 'plane', lerp(300, ax, u), lerp(220, ay - 60, u), 150, { rot: 8 }); }
    chip(ctx, 'FOOD & FUEL TRUCKED IN', W / 2, 160, win(t, 190.0, 192.1), { size: 40 }); kinetic(ctx, 'A MEGA-CITY HERE?', 300, win(t, 192.2, 196.6), 92);
    stamp(ctx, 'HAUL IN EVERYTHING', 1400, 560, t, 194.6, { size: 54, until: 196.6 });
  }
  // B15 the tropical north: drenched, then dry
  if (t > 196.7 && t < 206.4) {
    const [dx, dy] = P(c, 130.84, -12.46); goldLabel(ctx, 'TROPICAL NORTH', W / 2, 820, 50, win(t, 197.3, 206.0));
    if (t < 203.0) { for (let i = 0; i < 4; i++) cloudAt(ctx, 'cloud_happy', 400 + i * 340, 240 + (i % 2) * 40, 260, win(t, 197.6 + i * 0.1, 203.0)); rainDrops(ctx, 250, 1700, 300, 760, t, clamp((t - 198.3) / 0.4) * popOut(203.0 - t), 9); chip(ctx, '🌧 DRENCHED EVERY WET SEASON', W / 2, 160, win(t, 198.3, 201.2), { size: 40 }); chip(ctx, '…ALL AT ONCE', W / 2, 160, win(t, 201.3, 203.0), { size: 42 }); }
    else { sprite(ctx, 'sun', 960, 320, 260, { k: pop(t - 203.1), rot: Math.sin(t * 3) * 6 }); chip(ctx, '☀ THEN MONTHS OF DRY HEAT', W / 2, 160, win(t, 203.2, 206.0), { size: 40 }); }
  }
  // B16 the frying pan
  if (t > 206.0) {
    const k = clamp((t - 209.2) / 0.8);
    if (k > 0) { const [hx] = P(c, 155, -27); ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = '#2B2B33'; ctx.lineWidth = 46; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, my); ctx.lineTo(hx + 300, my - 40); ctx.stroke(); ctx.restore();
      strokeGeo(ctx, c, 'aus', '#2B2B33', 30, { alpha: k }); fillGeo(ctx, c, 'interior', '#FF5A1F', 0.35 * k * (0.8 + 0.2 * Math.sin(t * 6)));
      ctx.save(); ctx.globalAlpha = 0.35 * k; ctx.strokeStyle = '#FFE0B0'; ctx.lineWidth = 4; for (let i = 0; i < 5; i++) { const y = my - 100 + i * 50; ctx.beginPath(); for (let x = mx - 260; x < mx + 260; x += 10) ctx.lineTo(x, y + Math.sin(x / 30 + t * 6 + i) * 8); ctx.stroke(); } ctx.restore(); }
    const rim = [['Sydney', 'beach_surfer', 80, 40], ['Melbourne', 'beach_local', -30, 70], ['Brisbane', 'beach_local', 80, 20], ['Perth', 'beach_surfer', -80, 40], ['Adelaide', 'beach_local', 0, 80]];
    rim.forEach(([nm, sp, dx, dy], i) => { const d = CITY(nm); const [x, y] = P(c, d[1], d[2]); person(ctx, sp, x + dx, y + dy, 110, { k: pop(t - 209.6 - i * 0.1) * popOut(218.9 - t) }); });
    kinetic(ctx, 'A HOT FRYING PAN', 140, win(t, 209.3, 212.0), 84);
    chip(ctx, 'NOT JUST BEACH WEATHER…', W / 2, 140, win(t, 212.6, 214.2), { size: 42 });
    if (t > 215.5) { rainDrops(ctx, 1250, 1650, 250, 700, t, clamp((t - 215.6) / 0.4) * popOut(218.9 - t), 11); kinetic(ctx, 'WHERE THE RAIN IS RELIABLE', 140, win(t, 215.6, 218.9), 74, -3, '#BFE6FF'); }
  }
}
// ---- cutaway cards
function profileGround(ctx, pts, col, y0 = 900) { ctx.beginPath(); ctx.moveTo(pts[0][0], y0); pts.forEach(p => ctx.lineTo(...p)); ctx.lineTo(pts[pts.length - 1][0], y0); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.stroke(); }
function sceneCards(ctx, t) {
  // B3 reason 2: geology — young peaks + big rivers vs Australia's old flat rock
  { const k = clamp((t - 32.3) / 0.5) * (1 - clamp((t - 50.9) / 0.4)); if (card(ctx, k)) { ctx.save(); ctx.globalAlpha = clamp(k * 1.2);
      reasonTag(ctx, 2, 'GEOLOGY', t, 32.4, 50.9);
      const left = t < 38.0, flatten = clamp((t - 39.3) / 2.2);
      if (left) { profileGround(ctx, [[120, 800], [360, 780], [560, 360], [700, 520], [860, 300], [1020, 560], [1200, 420], [1400, 760], [1800, 800]], '#7D6B4A');
        for (const [x, y] of [[560, 360], [860, 300], [1200, 420]]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 50, y + 60); ctx.lineTo(x, y); ctx.lineTo(x + 50, y + 60); ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = '#5FB3FF'; ctx.lineWidth = 12; ctx.lineCap = 'round'; const kr = clamp((t - 36.4) / 1.2); ctx.beginPath(); ctx.moveTo(870, 360); ctx.quadraticCurveTo(1000, 700, 1600, 790 * 1 - 0); ctx.globalAlpha = kr; ctx.stroke(); ctx.globalAlpha = 1;
        chip(ctx, 'YOUNG, TOWERING MOUNTAINS → BIG RIVERS', W / 2, 200, win(t, 34.0, 38.0), { size: 38 }); }
      else { const h = lerp(1, 0.08, flatten), base = 800; profileGround(ctx, [[120, base], [400, base - 300 * h], [700, base - 380 * h], [1000, base - 260 * h], [1300, base - 340 * h], [1800, base - 20]], '#B5562E');
        if (t > 43.6) { const u = clamp((t - 44.6) / 2.6); cloudAt(ctx, 'cloud_happy', lerp(1800, 200, u), 330, 260, 1); }
        chip(ctx, 'ANCIENT, WORN-DOWN, FLAT', W / 2, 200, win(t, 38.1, 41.8), { size: 40 }); chip(ctx, 'HUNDREDS OF MILLIONS OF YEARS', W / 2, 200, win(t, 41.9, 43.6), { size: 40 });
        chip(ctx, 'NO PEAKS TO CATCH THE RAIN', W / 2, 200, win(t, 43.7, 47.1), { size: 40 }); stamp(ctx, 'NO GIANT RIVERS', 960, 560, t, 47.4, { size: 70, until: 50.9 }); }
      ctx.restore(); } }
  // B6 the rain-shadow cross-section (Pacific on the right, interior on the left)
  { const k = clamp((t - 75.5) / 0.5) * (1 - clamp((t - 88.6) / 0.4)); if (card(ctx, k)) { ctx.save(); ctx.globalAlpha = clamp(k * 1.2);
      ctx.fillStyle = '#1E4D5C'; ctx.fillRect(1500, 700, 380, 200); goldLabel(ctx, 'PACIFIC', 1690, 820, 44, 1);
      profileGround(ctx, [[80, 760], [600, 750], [1000, 730], [1150, 420], [1260, 460], [1330, 640], [1500, 700]], '#8A855C');
      ctx.save(); ctx.beginPath(); ctx.rect(80, 0, 1000, 900); ctx.clip(); ctx.fillStyle = 'rgba(181,86,46,0.55)'; ctx.fillRect(80, 600, 1000, 300); ctx.restore();
      ctx.fillStyle = '#4E8A3A'; ctx.fillRect(1330, 690, 170, 14); goldLabel(ctx, 'GREAT DIVIDING RANGE', 1210, 380, 34, 1); goldLabel(ctx, 'INTERIOR', 500, 830, 40, 1);
      for (const [x, h] of [[1380, 60], [1420, 90], [1460, 50]]) { ctx.fillStyle = '#EFE6D2'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(x, 690 - h, 26, h); ctx.strokeRect(x, 690 - h, 26, h); }
      styledText(ctx, 'BRISBANE · SYDNEY', 1420, 560, 30, { k: win(t, 81.8, 88.5), fill: C.gold, stroke: C.goldDark });
      const u = clamp((t - 75.8) / 1.8), cx0 = lerp(1820, 1400, easeOut(u)), rise = clamp((t - 78.4) / 1.0), cy = lerp(560, 300, rise);
      if (t < 83.6) { cloudAt(ctx, t > 77.5 ? 'cloud_strain' : 'cloud_happy', cx0, cy, 300, 1); arrow(ctx, 1860, 640, 1560, 620, '#BFE6FF', 9, clamp((t - 75.9) / 0.8)); if (t > 79.9) rainDrops(ctx, 1300, 1520, cy + 60, 700, t, 0.9, 4); }
      else { const v = easeIO((t - 83.6) / 2.4); cloudAt(ctx, 'cloud_dry', lerp(1250, 600, v), lerp(300, 380, v), 240, 1); arrow(ctx, 1150, 340, lerp(1150, 500, v), 420, '#FFD3A0', 9, 1); }
      chip(ctx, 'MOIST PACIFIC WINDS', W / 2, 140, win(t, 75.8, 77.5), { size: 40 }); chip(ctx, 'RISE, COOL… RAIN ON THE COAST', W / 2, 140, win(t, 78.4, 83.5), { size: 40 }); chip(ctx, 'DRY AIR SPILLS INLAND', W / 2, 140, win(t, 83.6, 88.5), { size: 40, stroke: '#FFB36B' });
      if (t > 85.8) person(ctx, 'explorer_thirsty', 380, 760, 200, { k: pop(t - 85.9) });
      ctx.restore(); } }
  // B8 the upside-down dinner plate
  { const k = clamp((t - 99.5) / 0.5) * (1 - clamp((t - 106.8) / 0.4)); if (card(ctx, k)) { ctx.save(); ctx.globalAlpha = clamp(k * 1.2);
      ctx.save(); ctx.translate(960, 640); ctx.fillStyle = '#F4F1E6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(0, 40, 520, 90, 0, Math.PI, 0); ctx.lineTo(520, 60); ctx.ellipse(0, 60, 520, 40, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#4A90C2'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 40, 470, 70, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.restore();
      const tilt = clamp((t - 100.0) / 0.8); ctx.save(); ctx.translate(1520, 300); ctx.rotate(-0.9 * tilt); ctx.fillStyle = '#9ED8F0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-70, -90); ctx.lineTo(70, -90); ctx.lineTo(90, 110); ctx.lineTo(-90, 110); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-70, -90); ctx.lineTo(-110, -120); ctx.lineTo(-80, -60); ctx.stroke(); ctx.beginPath(); ctx.arc(110, 10, 50, -1.2, 1.2); ctx.stroke(); ctx.restore();
      if (t > 100.8) { ctx.save(); ctx.strokeStyle = '#5FB3FF'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1410, 230); ctx.quadraticCurveTo(1440, 420, 1460, 600); ctx.stroke();
        for (let i = 0; i < 10; i++) { const u = ((t - 101) * 1.4 + i / 10) % 1; ctx.fillStyle = '#5FB3FF'; ctx.beginPath(); ctx.arc(lerp(1470, 1540, u), lerp(650, 900, u * u), 12, 0, 7); ctx.fill(); } ctx.restore(); }
      chip(ctx, 'THE RIM GETS SOAKED', W / 2, 160, win(t, 103.1, 104.4), { size: 42, stroke: '#7FC8FF' }); stamp(ctx, 'BONE DRY', 900, 560, t, 104.6, { size: 74, until: 106.8 });
      ctx.restore(); } }
  // B9 underground: the bore, the hot mineral water, the slow refill
  { const k = clamp((t - 113.5) / 0.5) * (1 - clamp((t - 127.9) / 0.4)); if (card(ctx, k, '#2A1E16')) { ctx.save(); ctx.globalAlpha = clamp(k * 1.2);
      const g = ctx.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, '#F2B66B'); g.addColorStop(1, '#F7D9A8'); ctx.fillStyle = g; ctx.fillRect(40, 40, W - 80, 280);
      ctx.fillStyle = '#B5562E'; ctx.fillRect(40, 320, W - 80, 40); for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#7A4A2A', '#5E3A22', '#4A2E1C'][i]; ctx.fillRect(40, 360 + i * 120, W - 80, 120); }
      const ag = ctx.createLinearGradient(0, 600, 0, 760); ag.addColorStop(0, '#2E86DE'); ag.addColorStop(1, '#1B4F8A'); ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(40, 640); for (let x = 40; x <= W - 40; x += 40) ctx.lineTo(x, 630 + Math.sin(x / 160) * 20); ctx.lineTo(W - 40, 780); ctx.lineTo(40, 780); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3); ctx.fillStyle = '#7FC8FF'; ctx.fillRect(40, 620, W - 80, 160); ctx.restore(); goldLabel(ctx, 'GREAT ARTESIAN BASIN', 1300, 720, 46, 1);
      ctx.fillStyle = '#9AA3AE'; ctx.fillRect(700, 330, 16, 300); sprite(ctx, 'pump', 708, 340, 120, { ay: 1 }); sprite(ctx, 'cow', 1100, 300, 140, { ay: 1 }); sprite(ctx, 'cow', 1280, 305, 120, { ay: 1, flip: true });
      ctx.fillStyle = '#5A3B28'; ctx.fillRect(1500, 210, 10, 110); ctx.fillStyle = '#F4ECD6'; ctx.fillRect(1440, 190, 140, 50); setFont(ctx, 'Montserrat', 22); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText('STATION', 1510, 222);
      const up = clamp((t - 117.6) / 0.6); if (up > 0) { ctx.save(); ctx.strokeStyle = '#7FC8FF'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(708, 630); ctx.lineTo(708, lerp(630, 340, up)); ctx.stroke(); ctx.restore(); }
      person(ctx, t > 118.4 && t < 121.5 ? 'farmer_spit' : 'farmer_pump', 560, 330, 220, { k: pop(t - 114.0) });
      if (t > 117.9 && t < 121.5) for (let i = 0; i < 4; i++) { const u = ((t - 118) * 0.7 + i / 4) % 1; ctx.save(); ctx.globalAlpha = 0.7 * (1 - u); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(760 + i * 20, 300 - u * 120); ctx.quadraticCurveTo(780 + i * 20, 270 - u * 120, 760 + i * 20, 240 - u * 120); ctx.stroke(); ctx.restore(); }
      chip(ctx, 'KEEPS STATIONS & TOWNS ALIVE', W / 2, 110, win(t, 114.1, 116.8), { size: 38 }); chip(ctx, '🔥 HOT & MINERAL-HEAVY', W / 2, 110, win(t, 117.9, 119.7), { size: 42, stroke: '#FF8A4C' });
      if (t > 119.7 && t < 121.7) { sprite(ctx, 'wheat_dead', 1000, 320, 110, { ay: 1, k: pop(t - 119.8) }); chip(ctx, 'POOR FOR WATERING CROPS', W / 2, 110, win(t, 119.8, 121.7), { size: 40 }); }
      if (t > 121.7) { const lvl = 0.12 + 0.03 * (t - 121.7); ctx.save(); ctx.translate(1700, 470); ctx.fillStyle = 'rgba(10,24,32,0.9)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.fillRect(-50, -120, 100, 240); ctx.strokeRect(-50, -120, 100, 240); ctx.fillStyle = '#5FB3FF'; ctx.fillRect(-44, 114 - 228 * lvl, 88, 228 * lvl);
        setFont(ctx, 'Montserrat', 22); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('REFILL', 0, 150); ctx.restore(); chip(ctx, '🐌 REFILLS INCREDIBLY SLOWLY', W / 2, 110, win(t, 121.8, 123.7), { size: 40 }); }
      if (t > 123.7) { chip(ctx, '💧 SOME FELL AS RAIN OVER A MILLION YEARS AGO', W / 2, 110, win(t, 123.8, 127.8), { size: 36 }); const u = clamp((t - 124.2) / 2.2); ctx.save(); ctx.fillStyle = '#5FB3FF'; ctx.beginPath(); ctx.arc(lerp(200, 1300, u), lerp(140, 690, u), 14, 0, 7); ctx.fill(); ctx.restore(); }
      ctx.restore(); } }
  // B10 worn-out soils
  { const k = clamp((t - 128.2) / 0.5) * (1 - clamp((t - 139.9) / 0.4)); if (card(ctx, k, '#3A2618')) { ctx.save(); ctx.globalAlpha = clamp(k * 1.2);
      ctx.fillStyle = '#B5562E'; ctx.fillRect(40, 520, W - 80, 520); ctx.strokeStyle = '#6B2E14'; ctx.lineWidth = 6; const r = rnd(13); for (let i = 0; i < 30; i++) { let x = r() * W, y = 560 + r() * 440; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 160; y += (r() - 0.5) * 90; ctx.lineTo(x, y); } ctx.stroke(); }
      const nut = ['N', 'P', 'K', 'Ca', 'Fe', 'Mg']; nut.forEach((s, i) => { const u = clamp((t - 134.0 - i * 0.15) / 1.6), x = 300 + i * 260; ctx.save(); ctx.globalAlpha = (1 - u) * clamp(k * 1.2); styledText(ctx, s, x, lerp(700, 300, u), 70, { fill: '#9DE07A', stroke: C.ink }); ctx.restore(); });
      chip(ctx, 'AMONG THE OLDEST SOILS ON EARTH', W / 2, 180, win(t, 129.2, 133.9), { size: 42 }); chip(ctx, 'NUTRIENTS STRIPPED AWAY', W / 2, 180, win(t, 134.0, 136.5), { size: 42 });
      if (t > 136.6) { ctx.save(); ctx.translate(1500, 420); const kv = pop(t - 136.7); ctx.scale(kv, kv); ctx.fillStyle = '#7A5A3A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-120, 90); ctx.lineTo(-20, -90); ctx.lineTo(20, -90); ctx.lineTo(120, 90); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        redX(ctx, 1500, 420, 260, clamp((t - 137.4) / 0.4)); chip(ctx, 'NO FRESH VOLCANIC ASH', W / 2, 180, win(t, 136.8, 139.8), { size: 42 }); }
      ctx.restore(); } }
}
function sceneSubscribe(ctx, t) {
  if (t < 218.9) return; const e = t - 218.9, k = clamp(e / 0.4);
  ctx.fillStyle = `rgba(4,10,14,${0.72 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, 'THE RAIN DECIDES', W / 2, 380, 110, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'WHERE PEOPLE LIVE', W / 2, 520, 110, { k: pop(e - 0.3, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  const kc = pop(e - 0.8, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 720); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 50);
    const w = ctx.measureText('SUBSCRIBE TO MAPHELD').width + 130; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -60, w, 120, 60); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 44, -22); ctx.lineTo(-w / 2 + 44, 22); ctx.lineTo(-w / 2 + 80, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SUBSCRIBE TO MAPHELD', 24, 3); ctx.restore(); }
}
const CAPTIONS = [
  [0.2, 3.9, 'A ring of light… around a dark hole'], [4.3, 6.6, 'Everyone lives on the coast'], [6.7, 10.6, 'The driest inhabited continent'], [11.0, 13.2, "So let's find out why"], [13.3, 16.0, 'It comes down to three things'],
  [16.3, 18.9, 'First: location'], [18.9, 23.6, 'A belt of high pressure'], [23.7, 27.9, 'Dry air sinks and warms'], [28.0, 31.9, 'The same belt as the Sahara'],
  [32.3, 37.9, 'Second: geology'], [38.0, 43.5, 'Ancient, flat, worn-down rock'], [43.6, 47.1, 'No peaks to catch the rain'], [47.2, 50.8, 'So no giant rivers'],
  [51.3, 53.7, 'The Murray–Darling'], [53.7, 56.6, 'A tiny fraction of the Mississippi'], [56.7, 61.4, 'Lake Eyre: usually dry salt'], [61.5, 65.9, 'Full only a handful of times'],
  [66.3, 69.8, 'Third: the mountains'], [69.9, 75.3, 'Along the eastern edge'],
  [75.7, 78.4, 'Moist Pacific winds'], [78.5, 83.4, 'Rain falls on the coast'], [83.5, 88.5, 'Dry air spills inland'],
  [89.0, 91.7, 'Melbourne, Adelaide, Perth'], [91.8, 94.0, 'Winter storms'], [94.1, 99.3, 'They fade before the middle'],
  [99.6, 102.9, 'Water over an upside-down plate'], [103.0, 106.8, 'Rim soaked, middle dry'],
  [107.1, 113.4, 'An underground reservoir'], [114.0, 116.8, 'Keeps stations alive'], [116.9, 121.6, 'Hot and mineral-heavy'], [121.7, 123.7, 'Refills very slowly'], [123.8, 127.8, 'Rain from a million years ago'],
  [128.3, 133.9, 'The oldest, most worn-out soils'], [134.0, 136.5, 'Nutrients stripped away'], [136.6, 139.8, 'No fresh volcanic ash'],
  [140.2, 144.9, 'Indigenous Australians'], [145.0, 150.0, 'Knowledge, travel, waterholes'],
  [150.3, 154.6, 'Then European settlers'], [154.7, 157.1, 'Sheep and cattle went inland'], [157.2, 159.4, 'But crops kept failing'], [159.5, 164.7, "Goyder's Line"], [164.8, 168.2, 'Wheat beyond it in wet years…'], [168.3, 171.3, '…then drought'],
  [171.6, 176.4, 'Cities stayed on the coast'],
  [176.6, 180.3, 'Kalgoorlie: gold'], [180.4, 185.2, 'Water piped 500+ km'], [185.3, 188.6, 'Alice Springs'], [188.7, 192.1, 'Food and fuel trucked in'], [192.2, 196.6, 'A mega-city? Hard.'],
  [196.9, 201.2, 'The tropical north'], [201.3, 206.0, 'Rain all at once, then dry'],
  [206.2, 209.2, 'Hugging the shoreline'], [209.3, 211.9, 'Round a hot frying pan'], [212.0, 215.5, 'Not just beach weather'], [215.6, 218.8, 'Where rain is reliable'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .24, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, H * 1.0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
const COVER = [[32.9, 50.9], [76.1, 88.6], [100.1, 106.8], [114.1, 127.9], [128.8, 139.9]];
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t);
  if (!COVER.some(([a, b]) => t > a && t < b)) { drawMap(ctx, c); sceneMap(ctx, c, t); }
  sceneCards(ctx, t);
  vignette(ctx); if (t < 218.9) drawText(ctx, t); sceneSubscribe(ctx, t);
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
