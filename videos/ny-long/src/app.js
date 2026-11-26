/* Why Albany, not New York City? — Mapheld 16:9 long-form (continues from the Short). renderAt(t) = voice clock incl. breathers. */
'use strict';
const W = 1920, H = 1080, DURATION = 198.97;
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
  nyc: [-73.98, 40.82, 520], hudson: [-74.0, 41.85, 200], harbor: [-74.02, 40.72, 800], kingston: [-73.97, 41.55, 260], state: [-75.8, 42.5, 160],
  albany: [-73.9, 42.75, 430], canal: [-76.3, 42.95, 228], usa: [-96.0, 38.2, 25], east: [-75.0, 40.15, 420], dc: [-77.04, 38.89, 1500], dcwide: [-77.2, 39.3, 260],
  pa: [-76.0, 40.1, 520], ca: [-122.0, 38.15, 360], il: [-88.7, 41.1, 200], vt: [-72.6, 44.15, 360],
};
const KEYS = [[0, 'nyc', 1], [2.6, 'nyc', 1.03], [4.2, 'hudson', 1], [13.0, 'hudson', 1.03], [14.6, 'usa', 1], [17.6, 'usa', 1.02], [19.2, 'harbor', 1], [29.5, 'harbor', 1.05],
  [31.0, 'kingston', 1], [43.0, 'kingston', 1.04], [44.6, 'hudson', 1], [50.6, 'hudson', 1.02], [51.8, 'nyc', 0.85], [55.0, 'nyc', 0.87], [56.4, 'state', 1], [64.7, 'state', 1.03],
  [64.8, 'state', 1.03], [71.9, 'albany', 1], [77.0, 'albany', 1.02], [78.0, 'state', 1], [82.6, 'state', 1], [83.6, 'canal', 1], [89.2, 'canal', 1.03], [90.4, 'usa', 1], [94.0, 'usa', 1.02],
  [95.0, 'state', 1], [110.7, 'state', 1.04], [112.0, 'east', 1], [128.2, 'east', 1.05], [130.0, 'dcwide', 1], [133.0, 'dcwide', 1.0], [134.4, 'dc', 1], [141.5, 'dc', 1.04], [145.0, 'usa', 1],
  [151.0, 'usa', 1.02], [152.0, 'pa', 1], [156.0, 'pa', 1.03], [157.0, 'ca', 1], [162.0, 'ca', 1.03], [163.0, 'il', 1], [172.4, 'il', 1.04], [173.4, 'vt', 1], [181.0, 'vt', 1.04],
  [182.6, 'hudson', 1], [192.9, 'hudson', 1.05], [198.97, 'hudson', 1.07]];
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
  for (const key of Object.keys(GEO).filter(k => k !== 'hudson' && k !== 'mohawk')) {
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

// ------------------------------------------------------------------ NY helpers
const pts = key => { const r = GEO[key][0], o = []; for (let i = 0; i < r.length; i += 2) o.push([r[i], r[i + 1]]); return o; };
const HUD = pts('hudson'), MOH = pts('mohawk');
const HUD_NYC_ALB = HUD.slice(0, 16), HUD_NYC_KGN = HUD.slice(0, 11);
const NYC = [-73.99, 40.73], ALB = [-73.756, 42.652], KGN = [-73.996, 41.927], POK = [-73.93, 41.70], PHL = [-75.16, 39.95], PRN = [-74.66, 40.35], DCC = [-77.036, 38.897];
const CANAL = [[-73.75, 42.65], [-73.94, 42.81], [-74.19, 42.94], [-74.86, 43.04], [-75.23, 43.10], [-75.46, 43.21], [-76.15, 43.05], [-76.6, 43.02], [-77.61, 43.16], [-78.2, 43.2], [-78.69, 43.17], [-78.88, 42.89]];
const DC_SQ = [[-77.041, 38.9955], [-76.9094, 38.8929], [-77.0391, 38.7907], [-77.172, 38.893]];
const BIG17 = ['AZ', 'AR', 'CO', 'GA', 'ID', 'IN', 'IA', 'MA', 'MS', 'OK', 'RI', 'TN', 'UT', 'OH', 'WY', 'WV'];   // + Hawaii (off-map)
function fillKey(ctx, c, key, style, a, glow) {
  if (a <= 0 || !PATHS[key]) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = style; ctx.fill(pp); if (glow) { ctx.globalAlpha = Math.min(1, a * 1.6); ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.shadowColor = glow; ctx.shadowBlur = 14; ctx.stroke(pp); } ctx.restore(); }
function strokeKey(ctx, c, key, col, lw, a = 1) { if (!PATHS[key] || a <= 0) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(pp); ctx.restore(); }
const USA_T = t => (t > 14.4 && t < 18.6) || (t > 89.9 && t < 94.8) || (t > 144.6 && t < 151.8);
function baseMap(ctx, c, t) {
  drawMap(ctx, c);
  fillKey(ctx, c, 'lakes', C.ocean, 1, null); strokeKey(ctx, c, 'lakes', C.coast, 2.5);
  for (const k of Object.keys(GEO)) if (k.startsWith('st_')) strokeKey(ctx, c, k, 'rgba(44,53,49,0.75)', 2.2);
  const nyGlow = t < 128.3 || t > 181.5 ? 1 : 0;
  if (nyGlow && !USA_T(t)) { fillKey(ctx, c, 'ny', C.gold, 0.1, null); strokeKey(ctx, c, 'ny', C.gold, 4, 0.85); }
}
function river(ctx, c, p, k, w = 9) { geoLine(ctx, c, p, k, '#5FB6D3', w, null, true); }
function icon(ctx, c, name, ll, w, k, o = {}) { const [x, y] = P(c, ll[0], ll[1]); sprite(ctx, name, x + (o.dx || 0), y + (o.dy || 0), w, { k, ay: o.ay ?? 0.9, ...o }); }
function ring(ctx, x, y, r, t, col = C.gold) { ctx.save(); for (let i = 0; i < 2; i++) { const u = ((t * 0.9 + i * 0.5) % 1); ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r * (0.5 + u), 0, 7); ctx.stroke(); } ctx.restore(); }
function fire(ctx, x, y, s, t, k, t0) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 2);
  for (let i = 0; i < 5; i++) { const ox = (i - 2) * s * 0.28, h = s * (0.7 + 0.3 * Math.sin(t * 13 + i * 2)) * k;
    for (const [col, m] of [['#E85D04', 1], ['#FFBA08', 0.6]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + ox - s * 0.16 * m, y); ctx.quadraticCurveTo(x + ox - s * 0.1, y - h * m * 0.6, x + ox + Math.sin(t * 9 + i) * 6, y - h * m); ctx.quadraticCurveTo(x + ox + s * 0.1, y - h * m * 0.6, x + ox + s * 0.16 * m, y); ctx.fill(); } }
  ctx.restore();
  for (let i = 0; i < 3; i++) { const u = ((t - t0) * 0.6 + i / 3) % 1; if (t > t0 + 0.2) puff(ctx, x + (i - 1) * s * 0.3, y - s * (1 + u * 1.4), s * 0.9, 0.15 + u * 0.8, 7 + i); }
}
function garrow(ctx, c, a, b, k, col = C.gold, w = 11) {
  if (k <= 0) return; const [x0, y0] = P(c, a[0], a[1]), [x1f, y1f] = P(c, b[0], b[1]); sarrow(ctx, x0, y0, x1f, y1f, k, col, w); }
function sarrow(ctx, x0, y0, x1f, y1f, k, col = C.gold, w = 11) {
  if (k <= 0) return; const e = easeOut(k), x1 = lerp(x0, x1f, e), y1 = lerp(y0, y1f, e);
  const ang = Math.atan2(y1 - y0, x1 - x0); ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = w + 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + 3, y0 + 4); ctx.lineTo(x1 + 3, y1 + 4); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const hs = w * 2.4; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 + hs * Math.cos(ang), y1 + hs * Math.sin(ang)); ctx.lineTo(x1 + hs * Math.cos(ang + 2.3), y1 + hs * Math.sin(ang + 2.3)); ctx.lineTo(x1 + hs * Math.cos(ang - 2.3), y1 + hs * Math.sin(ang - 2.3)); ctx.fill(); ctx.restore(); }
function dim(ctx, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#05080A'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function placeLabel(ctx, c, ll, text, k, dx = 0, dy = 50, size = 38) { const [x, y] = P(c, ll[0], ll[1]); goldLabel(ctx, text, x + dx, y + dy, size, k); }
function dot(ctx, c, ll, k, col = '#FFFFFF') { if (k <= 0) return; const [x, y] = P(c, ll[0], ll[1]); ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
function hopIcon(ctx, c, name, stops, times, t, w) {   // an icon that jumps from stop to stop along an arc
  let i = 0; while (i < times.length - 1 && t > times[i + 1]) i++;
  if (t < times[0]) return; const u = i < times.length - 1 ? clamp((t - times[i + 1] + 0.45) / 0.45) : 0;
  const a = P(c, ...stops[i]), b = P(c, ...stops[Math.min(i + 1, stops.length - 1)]);
  const x = lerp(a[0], b[0], easeIO(u)), y = lerp(a[1], b[1], easeIO(u)) - Math.sin(u * Math.PI) * 110;
  sprite(ctx, name, x, y, w, { ay: 0.9, k: pop(t - times[0]) });
}
function parchment(ctx, k, t) {
  if (k <= 0) return; ctx.save(); ctx.translate(W / 2, 470); ctx.scale(k, k); ctx.rotate(-0.02);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-410 + 10, -320 + 14, 820, 640);
  ctx.fillStyle = '#F3E3B5'; ctx.strokeStyle = '#6B4F1D'; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-410, -320, 820, 640, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3A2A10'; ctx.textAlign = 'center'; ctx.font = '800 92px "Playfair Display", serif'; ctx.fillText('We the People', 0, -200);
  ctx.globalAlpha = 0.35; for (let i = 0; i < 8; i++) { ctx.fillRect(-330, -110 + i * 46, 660 - (i % 3) * 90, 12); } ctx.globalAlpha = 1;
  const hk = clamp((t - 133.2) / 0.5); if (hk > 0) { ctx.fillStyle = 'rgba(244,208,63,0.75)'; ctx.fillRect(-340, 115, 680 * hk, 70); ctx.fillStyle = '#3A2A10'; ctx.font = '800 44px Montserrat'; ctx.fillText('A DISTRICT OF ITS OWN', 0, 165); }
  ctx.restore();
}
function scaleBeam(ctx, x, y, ang, k, t) {   // the balance scale: NYC vs upstate
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = '#6B4423'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-90, 330); ctx.lineTo(90, 330); ctx.lineTo(20, 0); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.rotate(ang); ctx.fillStyle = C.gold; ctx.fillRect(-470, -14, 940, 28); ctx.strokeRect(-470, -14, 940, 28);
  for (const sd of [-1, 1]) { const px = sd * 440; ctx.save(); ctx.translate(px, 0); ctx.rotate(-ang); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-120, 190); ctx.moveTo(0, 0); ctx.lineTo(120, 190); ctx.stroke();
    ctx.fillStyle = '#B8902A'; ctx.beginPath(); ctx.ellipse(0, 195, 150, 26, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fillStyle = C.gold; ctx.fill(); ctx.stroke(); ctx.restore();
}
function panPos(x, y, ang, sd) { return [x + Math.cos(ang) * sd * 440, y + Math.sin(ang) * sd * 440 + 195]; }
function coins(ctx, x, y, n, k) { if (k <= 0) return; for (let i = 0; i < n; i++) { const cx = x + ((i % 5) - 2) * 38, cy = y - Math.floor(i / 5) * 16 - 8; ctx.fillStyle = '#F4D03F'; ctx.strokeStyle = '#7A5C0E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 20 * k, 8 * k, 0, 0, 7); ctx.fill(); ctx.stroke(); } }
function wifiArcs(ctx, x, y, r, t, k, col) { if (k <= 0) return; ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const u = ((t * 0.8 + i / 4) % 1); ctx.globalAlpha = (1 - u) * k; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y, 30 + u * r, 0, 7); ctx.stroke(); } ctx.restore(); }
function bars(ctx, x, y, n, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); for (let i = 0; i < 4; i++) { ctx.fillStyle = i < n ? C.gold : 'rgba(255,255,255,0.25)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-36 + i * 20, -i * 14 - 16, 14, 16 + i * 14, 3); ctx.fill(); ctx.stroke(); } ctx.restore(); }
function firewall(ctx, c, t, k) {
  if (k <= 0) return; const [x0, y] = P(c, -75.2, 41.55), [x1] = P(c, -72.6, 41.55);
  ctx.save(); ctx.globalAlpha = clamp(k * 1.5); ctx.fillStyle = '#8E3B2E'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
  const L = lerp(x0, x1, easeOut(k)); for (let x = x0, j = 0; x < L; x += 70, j++) for (let r = 0; r < 2; r++) { ctx.beginPath(); ctx.rect(x + (r % 2) * 35, y - 40 + r * 40, 70, 40); ctx.fill(); ctx.stroke(); }
  ctx.restore(); for (let x = x0 + 30; x < L; x += 90) fire(ctx, x, y - 40, 70, t + x * 0.01, k, 999);
}

// ------------------------------------------------------------------ the story (storyboard = voice clock)
function scene(ctx, t) {
  const c = camAt(t); baseMap(ctx, c, t);
  const [nx, ny] = P(c, NYC[0], NYC[1]), [ax, ay] = P(c, ALB[0], ALB[1]);
  // rivers (Hudson always on in NY scenes; Mohawk from B7)
  if (t < 128.3 || t > 181.5) { if (!USA_T(t)) { river(ctx, c, HUD, t < 2.4 ? 0.2 : t < 4.4 ? lerp(0.2, 0.73, (t - 2.4) / 2) : t < 74.4 ? 0.73 : 1); if (t > 74.4) river(ctx, c, MOH, clamp((t - 74.5) / 1.3), 8); } }

  // ---------------- B1 hook (0–17.6)
  if (t < 14.6) {
    icon(ctx, c, 'skyline', NYC, lerp(300, 170, clamp((t - 2.6) / 1.6)), 1, { dy: 12 });
    person(ctx, t < 1.86 ? 'nyc_smug' : 'nyc_shock', 1500, 900, 300, { k: t < 4.4 ? 1 : popOut(5.0 - t, 0.5), sq: t > 1.86 && t < 2.2 ? 0.08 : 0 });
    stamp(ctx, 'NOT THE CAPITAL', nx + 20, ny - 130, t, 1.86, { size: 52, until: 13.3 });
    goldLabel(ctx, 'NEW YORK CITY', nx - 10, ny + 60, 40, popOut(13.3 - t));
    if (t > 3.3) { icon(ctx, c, 'capitol', ALB, 170, pop(t - 3.4)); goldLabel(ctx, 'ALBANY', ax + 190, ay - 40, 56, pop(t - 3.5)); ring(ctx, ax, ay - 30, 80, t); }
    kinetic(ctx, 'ABOUT 1% OF THE PEOPLE', 150, win(t, 4.7, 7.5), 80);
    chip(ctx, 'THE QUICK ANSWER:', 560, 150, win(t, 7.6, 10.9), { size: 40 });
    chip(ctx, '⚓ WARSHIPS', 980, 150, win(t, 8.5, 10.9), { size: 40 }); chip(ctx, '➜ GROWING WEST', 1370, 150, win(t, 9.9, 10.9), { size: 40 });
    kinetic(ctx, '…ONLY HALF THE STORY', 150, win(t, 11.1, 13.3), 84);
    if (t > 13.2) { dim(ctx, 0.5 * clamp((t - 13.3) / 0.5)); styledText(ctx, '?', W / 2, 520, 360, { k: pop(t - 13.45, 0.5), fill: C.yellow, stroke: C.goldDark }); }
  }
  if (t > 14.4 && t < 18.6) {
    const k = clamp((t - 15.3) / 0.6); for (const kk of Object.keys(GEO)) if (kk.startsWith('st_')) fillKey(ctx, c, kk, C.gold, 0.35 * k * popOut(18.4 - t, 0.4), null);
    kinetic(ctx, 'A FEAR THAT SHAPED THE WHOLE MAP', 150, win(t, 14.6, 17.5), 76);
  }
  // ---------------- B2 1776 (17.6–30)
  if (t > 17.6 && t < 30.1) {
    kinetic(ctx, '1776', 150, win(t, 18.9, 22.0), 140);
    for (let i = 0; i < 8; i++) { const u = easeOut(clamp((t - 20.2 - i * 0.28) / 3.0)); const tx = W / 2 - 520 + (i % 4) * 300 + (i > 3 ? 140 : 0), ty = 700 + (i > 3 ? 190 : 0);
      sprite(ctx, 'warship', lerp(tx + 200, tx, u), lerp(H + 260, ty, u) + wob(t, 0.5, 5, i), i > 3 ? 230 : 200, { ay: 0.8, k: t > 20.2 + i * 0.28 ? 1 : 0 }); }
    chip(ctx, '≈ 400 SHIPS · 32,000 TROOPS', W / 2, 150, win(t, 22.0, 25.4), { size: 42 });
    const occ = clamp((t - 24.5) / 0.6); if (occ > 0) { ctx.save(); ctx.globalAlpha = 0.55 * occ; ctx.fillStyle = '#D7263D'; ctx.beginPath(); const [mx, my] = P(c, -73.965, 40.785); ctx.ellipse(mx, my, 34, 120, 0.5, 0, 7); ctx.fill(); ctx.restore(); }
    goldLabel(ctx, 'MANHATTAN', ...[P(c, -73.97, 40.79)[0] + 200, P(c, -73.97, 40.79)[1] - 40], 44, pop(t - 24.6) * popOut(29.9 - t));
    stamp(ctx, 'OCCUPIED', 520, 430, t, 25.0, { size: 64, until: 29.9 });
    kinetic(ctx, '7 YEARS', 150, win(t, 26.5, 29.9), 120);
    const tk = clamp((t - 27.4) / 1.6); if (tk > 0) { ctx.save(); ctx.globalAlpha = popOut(29.9 - t); ctx.fillStyle = 'rgba(10,24,32,.9)'; ctx.beginPath(); ctx.roundRect(560, 245, 800, 54, 27); ctx.fill(); ctx.fillStyle = '#D7263D'; ctx.beginPath(); ctx.roundRect(566, 251, 788 * tk, 42, 21); ctx.fill(); setFont(ctx, 'Montserrat', 30); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('1776', 590, 273); ctx.textAlign = 'right'; ctx.fillText('1783', 1336, 273); ctx.restore(); }
  }
  // ---------------- B3 flight up the Hudson; Kingston burns (30–43.4)
  if (t > 30.0 && t < 43.4) {
    const sp = HUD_NYC_KGN.map(p => P(c, p[0], p[1])); const run = easeIO(clamp((t - 31.6) / 3.2)); const [lx, ly] = pointAlong(sp, run * 0.97);
    [[[-73.76, 41.03], 'WHITE PLAINS', 32.9], [[-73.90, 41.53], 'FISHKILL', 33.6]].forEach(([ll, nm, t0]) => { dot(ctx, c, ll, pop(t - t0)); placeLabel(ctx, c, ll, nm, pop(t - t0) * popOut(36.5 - t), 120, 0, 30); });
    icon(ctx, c, 'kingston', KGN, 210, pop(t - 36.9), { dx: -130, dy: 20 }); placeLabel(ctx, c, KGN, 'KINGSTON', pop(t - 37.0), -130, 70, 44);
    const flee = easeIn(clamp((t - 39.6) / 1.2));
    person(ctx, 'law_run', lx + 60, ly + 70 - flee * 700 - Math.abs(Math.sin(t * 12)) * 14, 200, { k: pop(t - 30.2) * (1 - clamp((t - 40.5) / 0.3)) });
    chip(ctx, 'LAWMAKERS RUN UPRIVER', W / 2, 150, win(t, 30.3, 33.0), { size: 42 }); chip(ctx, 'TOWN TO TOWN…', W / 2, 150, win(t, 33.0, 35.4), { size: 42 });
    for (let i = 0; i < 3; i++) { const u = easeOut(clamp((t - 34.5 - i * 0.2) / 1.4)); const tx = t < 39.8 ? nx + 140 + i * 90 : lerp(nx + 140 + i * 90, P(c, KGN[0], KGN[1])[0] + 60 + i * 90, easeIO(clamp((t - 39.9) / 1.3))); const ty = t < 39.8 ? lerp(H + 200, ny + 40, u) : lerp(ny + 40, P(c, KGN[0], KGN[1])[1] + 120, easeIO(clamp((t - 39.9) / 1.3)));
      person(ctx, 'redcoat', tx, ty + i * 20, 160, { k: t > 34.5 ? 1 : 0 }); }
    kinetic(ctx, '1777: FIRST STATE CAPITAL', 150, win(t, 35.5, 38.9), 78);
    chip(ctx, 'OCTOBER 1777', W / 2, 150, win(t, 38.9, 40.9), { size: 44, stroke: '#FF6B6B' });
    const [kx, ky] = P(c, KGN[0], KGN[1]); fire(ctx, kx - 130, ky + 10, 120, t, clamp((t - 41.0) / 0.5), 41.0);
    stamp(ctx, 'BURNED', W / 2, 150, t, 41.2, { size: 70, until: 43.3 });
  }
  // ---------------- B4 the capital keeps moving; a coast is in range (43.4–55.3)
  if (t > 43.4 && t < 55.4) {
    [[NYC, 'NEW YORK CITY'], [POK, 'POUGHKEEPSIE'], [KGN, 'KINGSTON'], [ALB, 'ALBANY']].forEach(([ll, nm], i) => { dot(ctx, c, ll, pop(t - 45.8 - i * 0.15) * popOut(50.9 - t)); placeLabel(ctx, c, ll, nm, pop(t - 45.9 - i * 0.15) * popOut(50.9 - t), -170, 0, 30); });
    if (t < 50.9) hopIcon(ctx, c, 'capitol', [NYC, POK, KGN, ALB, NYC, ALB], [46.5, 47.3, 47.8, 48.5, 49.4, 50.2], t, 130);
    chip(ctx, "IT COULDN'T SIT STILL", W / 2, 150, win(t, 44.1, 46.0), { size: 44 }); chip(ctx, '1780s–1790s: ON THE MOVE', W / 2, 150, win(t, 46.0, 49.4), { size: 42 });
    chip(ctx, 'NOBODY FORGOT THE LESSON', W / 2, 150, win(t, 49.4, 50.9), { size: 44 });
    if (t > 51.0) { icon(ctx, c, 'skyline', NYC, 260, pop(t - 51.0), { dy: 12 }); const u = easeOut(clamp((t - 52.3) / 1.6)); sprite(ctx, 'warship', lerp(nx + 500, nx + 220, u), lerp(H + 100, ny + 260, u) + wob(t, 0.4, 6), 300, { ay: 0.8 });
      if (t > 53.4) ring(ctx, nx, ny - 40, 140, t, '#FF6B6B'); kinetic(ctx, 'A COASTAL CAPITAL = IN RANGE', 150, win(t, 51.0, 55.2), 72, -2, '#FFFFFF'); }
  }
  // ---------------- B5 settlers west; NYC stuck in the corner (55.3–64.7)
  if (t > 55.4 && t < 64.8) {
    const towns = [[-78.85, 42.9], [-77.6, 43.15], [-76.15, 43.05], [-75.9, 42.1], [-75.2, 43.1], [-77.0, 42.3]];
    towns.forEach((p, i) => { garrow(ctx, c, [-74.2, 42.4], p, clamp((t - 58.2 - i * 0.18) / 1.0), '#F4ECD8', 9); icon(ctx, c, 'farm', p, 70, pop(t - 59.2 - i * 0.18)); });
    const [wx, wy] = P(c, -76.6, 42.6); sprite(ctx, 'wagon', lerp(wx + 300, wx - 60, easeOut(clamp((t - 58.2) / 2.6))), wy, 120, { k: win(t, 58.2, 64.6) });
    kinetic(ctx, 'NEW YORK GROWS WEST', 150, win(t, 56.6, 60.3), 84);
    if (t > 60.3) { icon(ctx, c, 'skyline', NYC, 120, 1, { dy: 10 }); ring(ctx, nx, ny, 70, t, '#FF6B6B'); chip(ctx, 'NYC: STUCK IN THE BOTTOM CORNER', W / 2, 150, win(t, 60.4, 64.6), { size: 42, stroke: '#FF6B6B' }); }
  }
  // ---------------- B7 the hallway: rivers, 1797, Erie Canal (71.8–89.2)
  if (t > 71.8 && t < 89.3) {
    icon(ctx, c, 'capitol', ALB, t < 77.5 ? 230 : 120, 1); if (t < 77.5) goldLabel(ctx, 'ALBANY', ax, ay - 250, 64, pop(t - 71.9));
    chip(ctx, 'ALBANY = THE HALLWAY', W / 2, 150, win(t, 71.9, 74.5), { size: 44 });
    if (t > 74.5 && t < 77.6) { const [mx, my] = P(c, -74.2, 42.93), [hx, hy] = P(c, -73.62, 43.15); styledText(ctx, 'MOHAWK', mx - 40, my - 40, 40, { k: pop(t - 74.6), fill: '#BFE6F2', stroke: C.ink }); styledText(ctx, 'HUDSON', hx + 110, hy, 40, { k: pop(t - 75.1), fill: '#BFE6F2', stroke: C.ink }); chip(ctx, 'WHERE TWO RIVERS MEET', W / 2, 150, win(t, 74.6, 76.1), { size: 44 }); }
    chip(ctx, '150 MILES FROM THE OCEAN', W / 2, 150, win(t, 76.2, 77.9), { size: 44 });
    if (t > 77.9 && t < 82.6) garrow(ctx, c, ALB, [-77.8, 43.0], clamp((t - 78.0) / 0.9), C.gold, 13);
    chip(ctx, 'ON THE ROAD WEST', W / 2, 150, win(t, 78.0, 79.2), { size: 44 });
    kinetic(ctx, '1797', 150, win(t, 79.3, 82.1), 140); stamp(ctx, 'PERMANENT CAPITAL', ax + 40, ay - 150, t, 80.9, { size: 44, color: '#1E8E3E', until: 82.6 });
    kinetic(ctx, '1825: THE ERIE CANAL', 150, win(t, 82.2, 84.3), 90);
    const ck = clamp((t - 83.4) / 4.0); if (ck > 0) { geoLine(ctx, c, CANAL, ck, C.gold, 9, null, true); const sp = CANAL.map(p => P(c, p[0], p[1]));
      for (let i = 0; i < 3; i++) { const u = (t - 84.2 - i * 0.9) / 4.5; if (u > 0 && u < ck) { const [bx, by] = pointAlong(sp, u); ctx.save(); ctx.fillStyle = '#7A4A26'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(bx - 18, by - 9, 36, 16, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#E2CB8C'; ctx.fillRect(bx - 10, by - 18, 20, 10); ctx.restore(); } } }
    styledText(ctx, '363 MILES', W / 2, 150, 120, { k: win(t, 84.4, 87.2), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    if (t > 87.2) { fillKey(ctx, c, 'lakes', '#5FD3FF', 0.35 * clamp((t - 87.3) / 0.5), '#5FD3FF'); chip(ctx, 'GATEWAY TO THE GREAT LAKES', W / 2, 150, win(t, 87.3, 89.2), { size: 42 }); placeLabel(ctx, c, [-78.88, 42.89], 'BUFFALO', pop(t - 87.0), 0, 50, 34); }
  }
  // ---------------- B8 the question (89.2–97.7)
  if (t > 89.9 && t < 94.8) {
    [[-71.06, 42.36, 'BOSTON'], [-71.41, 41.82, 'PROVIDENCE'], [-76.49, 38.98, 'ANNAPOLIS']].forEach(([lo, la, nm], i) => { dot(ctx, c, [lo, la], pop(t - 90.8 - i * 0.25), '#7DDC9A'); const [x, y] = P(c, lo, la); chip(ctx, nm + ' ✓', x + 120, y - 30 + i * 46, pop(t - 90.9 - i * 0.25) * popOut(94.6 - t), { size: 28, stroke: '#7DDC9A' }); });
    chip(ctx, 'PLENTY OF COASTAL CAPITALS DO FINE', W / 2, 150, win(t, 90.8, 94.4), { size: 42 });
  }
  if (t > 94.3 && t < 97.75) { dim(ctx, 0.45 * clamp((t - 94.4) / 0.4)); kinetic(ctx, 'WHAT WERE THEY REALLY AFRAID OF?', 420, win(t, 94.4, 97.6), 88); kinetic(ctx, 'TAKE A GUESS 🤔👇', 600, win(t, 95.9, 97.6), 100, 3, '#FFFFFF'); }
  // ---------------- B9 the city itself: the balance scale (97.7–110.8)
  if (t > 97.7 && t < 110.85) {
    dim(ctx, 0.35); const k = pop(t - 97.9, 0.4) * popOut(110.7 - t, 0.3);
    const tilt = -0.06 - 0.05 * clamp((t - 101.1) / 0.3) - 0.05 * clamp((t - 101.7) / 0.3) - 0.05 * clamp((t - 102.3) / 0.3) - 0.08 * clamp((t - 105.1) / 0.6);
    const ang = clamp(tilt, -0.32, 0.2); const bx = W / 2, by = 360;
    scaleBeam(ctx, bx, by, ang, k, t);
    const [lpx, lpy] = panPos(bx, by, ang, -1), [rpx, rpy] = panPos(bx, by, ang, 1);
    if (k > 0) { coins(ctx, lpx, lpy - 8, 5 + Math.floor(10 * clamp((t - 101.1) / 1.6)), k); person(ctx, 'nyc_smug', lpx - 30, lpy - 30, 190, { k }); person(ctx, 'farmer', rpx, rpy - 10, 190, { k: pop(t - 99.2) * k });
      goldLabel(ctx, 'NEW YORK CITY', lpx, lpy + 90, 40, k); goldLabel(ctx, 'UPSTATE', rpx, rpy + 90, 40, k); }
    chip(ctx, 'IT WAS THE CITY ITSELF', W / 2, 150, win(t, 97.9, 101.0), { size: 44 });
    ['MERCHANTS', 'BANKERS', 'CROWDS'].forEach((s, i) => chip(ctx, s, 640 + i * 320, 150, win(t, [101.1, 101.7, 102.3][i], 103.3), { size: 38 }));
    if (t > 103.3) { sprite(ctx, 'capitol', lpx + 10, lpy - 200, 150, { k: pop(t - 103.4) * k, ay: 0.9 }); chip(ctx, 'THE GOVERNMENT, IN MANHATTAN?', W / 2, 150, win(t, 103.4, 105.0), { size: 42 }); }
    ['💰 MONEY', '📢 PRESSURE', '🔥 MOBS AT THE DOOR'].forEach((s, i) => chip(ctx, s, 520 + i * 420, 150, win(t, [106.9, 107.5, 108.5][i], 110.6), { size: 40, stroke: '#FF6B6B' }));
    chip(ctx, 'THE CITY COULD LEAN ON IT', W / 2, 150, win(t, 105.1, 106.8), { size: 44 });
  }
  // ---------------- B10 June 1783: Congress besieged, Pennsylvania says no (110.8–128.3)
  if (t > 110.8 && t < 128.4) {
    const [px, py] = P(c, PHL[0], PHL[1]); icon(ctx, c, 'hall', PHL, 260, pop(t - 112.2), { dy: 20 }); goldLabel(ctx, 'PHILADELPHIA', px, py + 70, 44, pop(t - 117.5));
    chip(ctx, 'NOT PARANOIA', W / 2, 150, win(t, 111.0, 112.3), { size: 44 }); kinetic(ctx, 'JUNE 1783', 150, win(t, 112.3, 113.7), 110);
    chip(ctx, '≈ 400 UNPAID SOLDIERS', W / 2, 150, win(t, 113.7, 116.6), { size: 44 });
    for (let i = 0; i < 6; i++) { const a = Math.PI * (0.95 + i * 0.22); const u = easeOut(clamp((t - 114.6 - i * 0.12) / 0.9)); const r = lerp(700, 250, u);
      person(ctx, 'continental', px + Math.cos(a) * r * 1.3, py + 40 + Math.sin(a) * r * 0.25 + 60, 150, { k: t > 114.6 + i * 0.12 && t < 124.8 ? 1 : 0, flip: Math.cos(a) > 0, sq: Math.abs(Math.sin(t * 8 + i)) * 0.03 }); }
    bubble(ctx, px - 330, py - 120, 'PAY US!', 44, [40, 60], win(t, 118.2, 120.0));
    chip(ctx, 'CONGRESS: "PROTECT US?"', W / 2, 150, win(t, 119.9, 122.8), { size: 42 });
    person(ctx, 'law_ask', 300, 800, 230, { k: win(t, 119.9, 124.8) }); person(ctx, 'pa_no', 1620, 800, 230, { k: win(t, 120.3, 124.8) });
    goldLabel(ctx, 'PENNSYLVANIA', 1620, 860, 34, win(t, 120.3, 124.8)); bubble(ctx, 1600, 470, 'NO.', 64, [10, 70], win(t, 122.8, 124.8));
    stamp(ctx, 'REQUEST DENIED', W / 2, 150, t, 122.9, { size: 56, until: 124.8 });
    if (t > 124.8) { const [qx, qy] = P(c, PRN[0], PRN[1]); dot(ctx, c, PRN, pop(t - 125.0)); goldLabel(ctx, 'PRINCETON', qx + 200, qy - 10, 46, pop(t - 126.3));
      garrow(ctx, c, PHL, PRN, clamp((t - 125.4) / 1.2), '#FFFFFF', 10); const u = easeIO(clamp((t - 125.4) / 1.6)); person(ctx, 'law_run', lerp(px, qx, u), lerp(py, qy, u) + 60 - Math.abs(Math.sin(t * 12)) * 12, 170);
      kinetic(ctx, 'CONGRESS FLED', 150, win(t, 125.0, 128.2), 110); }
  }
  // ---------------- B11 the Constitution: a district owned by no state (128.3–144.2)
  if (t > 128.3 && t < 144.3) {
    if (t > 133.4) { const dk = clamp((t - 133.6) / 0.9); geoLine(ctx, c, [...DC_SQ, DC_SQ[0]], dk, C.gold, 7, null, true); if (dk >= 1) { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = C.gold; ctx.beginPath(); DC_SQ.forEach((p, i) => { const [x, y] = P(c, p[0], p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.fill(); ctx.restore(); } }
    if (t > 135.9) { icon(ctx, c, 'dome', DCC, 240, pop(t - 136.0), { dy: 40 }); goldLabel(ctx, 'WASHINGTON', ...[P(c, DCC[0], DCC[1])[0], P(c, DCC[0], DCC[1])[1] - 190], 56, pop(t - 136.1)); }
    if (t > 137.8) { const [qx, qy] = P(c, -77.08, 38.82); styledText(ctx, 'POTOMAC', qx - 120, qy + 40, 38, { k: pop(t - 137.9), fill: '#BFE6F2', stroke: C.ink, rot: -40 }); }
    chip(ctx, 'OWNED BY NO STATE', W / 2, 150, win(t, 134.5, 135.9), { size: 44 }); chip(ctx, 'BUILT FROM SCRATCH', W / 2, 150, win(t, 137.2, 139.3), { size: 44 });
    if (t > 139.3 && t < 142.4) { sarrow(ctx, 380, 300, 760, 470, clamp((t - 139.4) / 0.5), '#9CC9FF', 14); sarrow(ctx, 380, 820, 760, 640, clamp((t - 139.7) / 0.5), '#FFB38A', 14); styledText(ctx, 'NORTH', 320, 260, 54, { k: pop(t - 139.4), fill: '#9CC9FF', stroke: C.ink }); styledText(ctx, 'SOUTH', 320, 870, 54, { k: pop(t - 139.7), fill: '#FFB38A', stroke: C.ink }); chip(ctx, 'A NORTH–SOUTH DEAL', W / 2, 150, win(t, 139.4, 142.3), { size: 44 }); }
    stamp(ctx, 'NO STATE CAN HOLD IT HOSTAGE', W / 2, 150, t, 142.4, { size: 46, color: '#1E8E3E', until: 144.2 });
    if (t < 134.0) { dim(ctx, 0.55 * clamp((t - 128.4) / 0.4) * popOut(133.9 - t, 0.4)); parchment(ctx, pop(t - 130.8, 0.45) * popOut(133.9 - t, 0.4), t); chip(ctx, 'THE FOUNDERS NEVER FORGOT', W / 2, 150, win(t, 128.5, 130.8), { size: 44 }); }
  }
  // ---------------- B12 17 / 50 (144.2–151)
  if (t > 144.6 && t < 151.8) {
    const kA = clamp((t - 144.9) / 0.6), kG = clamp((t - 146.6) / 0.6);
    for (const k of Object.keys(GEO)) if (k.startsWith('st_') && k !== 'st_DC') { const gold = BIG17.includes(k.slice(3)); fillKey(ctx, c, k, gold ? C.gold : '#C0392B', (gold ? lerp(0.45, 0.9, kG) : lerp(0.45, 0.28, kG)) * kA * popOut(151.6 - t, 0.5), null); }
    if (kG > 0) for (const s of BIG17) strokeKey(ctx, c, 'st_' + s, '#FFF6C8', 3, kG * popOut(151.6 - t, 0.5));
    chip(ctx, 'THE STATES COPIED THE IDEA', W / 2, 150, win(t, 144.8, 146.5), { size: 44 });
    styledText(ctx, '17 / 50', W / 2, 160, 150, { k: win(t, 146.6, 151.0), fill: C.yellow, stroke: C.goldDark, rot: -3 }); chip(ctx, 'CAPITAL = BIGGEST CITY (+ HAWAII)', W / 2, 290, win(t, 148.3, 151.0), { size: 36 });
  }
  // ---------------- B13 Pennsylvania, California, Illinois (151–172.4)
  if (t > 151.6 && t < 156.9) { const L = [-76.31, 40.04], HB = [-76.88, 40.27]; icon(ctx, c, 'skyline', PHL, 170, pop(t - 152.3)); placeLabel(ctx, c, PHL, 'PHILADELPHIA', pop(t - 152.6), 0, 50, 36);
    dot(ctx, c, L, pop(t - 153.6)); placeLabel(ctx, c, L, 'LANCASTER 1799', pop(t - 153.7), 0, 50, 32); icon(ctx, c, 'capitol', HB, 140, pop(t - 154.6)); placeLabel(ctx, c, HB, 'HARRISBURG 1812', pop(t - 154.7), 0, 50, 36);
    garrow(ctx, c, PHL, L, clamp((t - 153.3) / 0.6), '#FFFFFF', 9); garrow(ctx, c, L, HB, clamp((t - 154.3) / 0.6), C.gold, 9); chip(ctx, 'PENNSYLVANIA: CLOSER TO THE MIDDLE', W / 2, 150, win(t, 151.7, 156.8), { size: 40 }); }
  if (t > 156.5 && t < 162.9) { const SJ = [-121.89, 37.34], VJ = [-122.26, 38.10], BN = [-122.16, 38.05], SC = [-121.49, 38.58], SF = [-122.42, 37.77];
    icon(ctx, c, 'skyline', SF, 150, pop(t - 157.0), { dx: -90 }); placeLabel(ctx, c, SF, 'SAN FRANCISCO', pop(t - 157.1), -150, 50, 32);
    [[SJ, 'SAN JOSE', 157.5, 130, -10], [VJ, 'VALLEJO', 158.2, -110, -10], [BN, 'BENICIA', 159.0, 120, 40]].forEach(([ll, nm, t0, dx, dy]) => { dot(ctx, c, ll, pop(t - t0)); placeLabel(ctx, c, ll, nm, pop(t - t0), dx, dy, 30); });
    icon(ctx, c, 'capitol', SC, 140, pop(t - 160.2)); placeLabel(ctx, c, SC, 'SACRAMENTO 1854', pop(t - 160.3), 0, 50, 36);
    garrow(ctx, c, SJ, VJ, clamp((t - 157.9) / 0.4), '#FFFFFF', 8); garrow(ctx, c, BN, SC, clamp((t - 159.8) / 0.5), C.gold, 9);
    if (t > 161.3) { const [x, y] = P(c, SF[0], SF[1]); redX(ctx, x - 90, y - 60, 150, clamp((t - 161.4) / 0.4)); } chip(ctx, 'CALIFORNIA: SACRAMENTO, NOT SAN FRANCISCO', W / 2, 150, win(t, 156.7, 162.8), { size: 38 }); }
  if (t > 162.5 && t < 172.5) { const SPR = [-89.65, 39.80], CHI = [-87.63, 41.88];
    icon(ctx, c, 'capitol', SPR, 150, pop(t - 163.1)); placeLabel(ctx, c, SPR, 'SPRINGFIELD', pop(t - 163.2), 210, -30, 40); chip(ctx, 'ILLINOIS PICKS SPRINGFIELD: 1839', W / 2, 150, win(t, 162.6, 165.2), { size: 42 });
    const grow = clamp((t - 167.8) / 1.4); icon(ctx, c, grow > 0 ? 'skyline' : 'farm', CHI, grow > 0 ? lerp(90, 220, easeOut(grow)) : 90, pop(t - 165.2)); placeLabel(ctx, c, CHI, 'CHICAGO', pop(t - 165.3), 190, 0, 40);
    chip(ctx, 'CHICAGO, 1839: ≈ 4,000 PEOPLE', W / 2, 150, win(t, 165.3, 167.7), { size: 42 }); chip(ctx, 'TODAY', W / 2, 150, win(t, 167.8, 169.0), { size: 44 });
    styledText(ctx, '20× BIGGER', W / 2, 160, 130, { k: win(t, 169.0, 172.3), fill: C.yellow, stroke: C.goldDark, rot: -3 }); }
  // ---------------- B14 Vermont: Montpelier (172.4–181.3)
  if (t > 172.9 && t < 181.4) { const MP = [-72.58, 44.26]; icon(ctx, c, 'dome', MP, 170, pop(t - 174.6)); placeLabel(ctx, c, MP, 'MONTPELIER', pop(t - 174.7), 0, 50, 46);
    fillKey(ctx, c, 'st_VT', C.gold, 0.3 * clamp((t - 173.2) / 0.5), C.gold); chip(ctx, 'THE RECORD: VERMONT', W / 2, 150, win(t, 173.2, 175.7), { size: 44 });
    styledText(ctx, '≈ 8,000 PEOPLE', W / 2, 160, 120, { k: win(t, 175.7, 178.9), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    if (t > 178.9) { sprite(ctx, 'burger', W / 2 + 420, 420, 200, { k: pop(t - 179.0) }); redX(ctx, W / 2 + 420, 420, 220, clamp((t - 179.4) / 0.4)); chip(ctx, 'NO McDONALD\'S IN TOWN', W / 2, 150, win(t, 179.1, 181.2), { size: 44 }); } }
  // ---------------- B15 firewall + comment question (181.3–193), end card
  if (t > 181.5) {
    icon(ctx, c, 'skyline', NYC, 280, pop(t - 182.0), { dy: 14 }); icon(ctx, c, 'capitol', ALB, 160, pop(t - 184.5));
    person(ctx, t < 183.8 ? 'nyc_smug' : 'nyc_shock', 1450, 900, 280, { k: pop(t - 182.1) * (t < 192.9 ? 1 : popOut(193.4 - t, 0.3)) });
    goldLabel(ctx, 'ALBANY', ax + 170, ay - 30, 50, pop(t - 184.6)); bubble(ctx, ax + 330, ay + 80, 'ORDER, ORDER.', 36, [-120, -40], win(t, 183.8, 186.5));
    chip(ctx, 'A GLOBAL POWERHOUSE…', W / 2, 150, win(t, 182.0, 183.7), { size: 44 }); chip(ctx, '…TAKES ORDERS FROM A RIVER TOWN', W / 2, 150, win(t, 183.8, 186.8), { size: 42 });
    firewall(ctx, c, t, clamp((t - 187.7) / 0.9)); kinetic(ctx, 'NOT A MISTAKE. A FIREWALL.', 150, win(t, 186.9, 188.9), 90);
    kinetic(ctx, 'WHICH CAPITAL MAKES THE LEAST SENSE? 👇', 150, win(t, 189.0, 192.9), 74);
  }
}
function endCard(ctx, t) {
  if (t < 192.97) return; const e = t - 192.97, k = clamp(e / 0.4);
  ctx.fillStyle = `rgba(4,10,14,${0.74 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, "IT WASN'T A MISTAKE.", W / 2, 250, 96, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'IT WAS A FIREWALL.', W / 2, 380, 116, { k: pop(e - 0.35, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  const kc = pop(e - 0.9, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 560); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 50);
    const w = ctx.measureText('SUBSCRIBE TO MAPHELD').width + 130; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -60, w, 120, 60); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 44, -22); ctx.lineTo(-w / 2 + 44, 22); ctx.lineTo(-w / 2 + 80, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SUBSCRIBE TO MAPHELD', 24, 3); ctx.restore(); }
  chip(ctx, 'WHICH CAPITAL MAKES THE LEAST SENSE? 👇', W / 2, 720, pop(e - 1.4, 0.35), { size: 40 });
  // the lawmaker stamps the Mapheld seal in the corner
  person(ctx, 'law_happy', 1660, 1010, 220, { k: pop(e - 1.8) });
  const se = e - 2.4; if (se > 0) { const sl = se < 0.16 ? lerp(2.2, 1, easeIn(se / 0.16)) : 1; ctx.save(); ctx.translate(1430, 860); ctx.rotate(-0.15); ctx.scale(sl, sl); ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 105, 0, 7); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 88, 0, 7); ctx.stroke(); setFont(ctx, 'Montserrat', 40); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MAPHELD', 0, 2); setFont(ctx, 'Montserrat', 18); ctx.fillText('★ EVERY BORDER HAS A STORY ★', 0, 44); ctx.restore(); }
}
function wifiCard(ctx, t) {
  if (t < 64.6 || t > 72.2) return; const k = clamp((t - 64.7) / 0.4) * clamp((72.1 - t) / 0.4);
  ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H); ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H);
  const X0 = 460, Y0 = 250, X1 = 1460, Y1 = 830, HL = 860, HR2 = 1060, MY = 540;
  const rooms = [[X0, Y0, HL, MY, 'CORNER BEDROOM'], [X0, MY, HL, Y1, 'KITCHEN'], [HR2, Y0, X1, MY, 'BEDROOM'], [HR2, MY, X1, Y1, 'LIVING ROOM']];
  ctx.fillStyle = '#E9E2CF'; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  ctx.fillStyle = '#D8CFB6'; ctx.fillRect(HL, Y0, HR2 - HL, Y1 - Y0);
  const moved = easeIO(clamp((t - 68.8) / 0.7)), rx = lerp(530, 960, moved), ry = lerp(320, MY, moved), full = clamp((t - 69.4) / 0.8);
  // signal coverage
  const rad = lerp(300, 720, full); const g = ctx.createRadialGradient(rx, ry, 10, rx, ry, rad); g.addColorStop(0, 'rgba(244,208,63,0.55)'); g.addColorStop(1, 'rgba(244,208,63,0)');
  ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, X1 - X0, Y1 - Y0); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0); wifiArcs(ctx, rx, ry, rad, t, clamp((t - 66.3) / 0.4), C.gold); ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 10; ctx.strokeRect(X0, Y0, X1 - X0, Y1 - Y0); ctx.lineWidth = 7;
  for (const [a, b, c2, d] of [[HL, Y0, HL, 380], [HL, 460, HL, 620], [HL, 700, HL, Y1], [HR2, Y0, HR2, 380], [HR2, 460, HR2, 620], [HR2, 700, HR2, Y1], [X0, MY, HL, MY], [HR2, MY, X1, MY]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke(); }
  rooms.forEach(([a, b, c2, d, nm], i) => { const cx = (a + c2) / 2, cy = (b + d) / 2; setFont(ctx, 'Montserrat', 26); ctx.fillStyle = '#5A5546'; ctx.textAlign = 'center'; ctx.fillText(nm, cx, d - 24);
    const covered = i === 0 || full > 0.5; bars(ctx, cx + 20, cy + 20, covered ? 4 : 0, clamp((t - 66.6) / 0.4));
    if (!covered && t > 67.4) { setFont(ctx, 'Montserrat', 30); ctx.fillStyle = '#C0392B'; ctx.fillText('✕ DEAD ZONE', cx, cy - 50); } });
  sprite(ctx, 'router', rx, ry, 130, { k: pop(t - 66.2) });
  styledText(ctx, 'NYC', 660, 300, 50, { k: pop(t - 67.3) * (1 - moved), fill: '#FF6B6B', stroke: C.ink });
  styledText(ctx, 'ALBANY', 960, 330, 46, { k: pop(t - 68.9), fill: C.gold, stroke: C.goldDark, rot: -90 });
  chip(ctx, 'THE WI-FI ROUTER PROBLEM', W / 2, 150, win(t, 64.9, 67.2), { size: 42 }); chip(ctx, 'IN THE CORNER: DEAD ZONES', W / 2, 150, win(t, 67.3, 68.8), { size: 42, stroke: '#FF6B6B' }); chip(ctx, 'IN THE HALLWAY: SIGNAL EVERYWHERE', W / 2, 150, win(t, 68.9, 71.9), { size: 42 });
  ctx.restore();
}
const CAPTIONS = [
  [0.2, 3.3, 'Not New York City…'], [3.4, 7.5, 'Albany: about 1% of the people'], [7.6, 10.9, 'Warships. A state growing west.'], [11.0, 13.3, 'Only half the story'], [13.4, 17.4, 'A fear that shaped America'],
  [17.7, 20.1, 'Start with the war'], [20.2, 24.4, '1776: the biggest fleet yet'], [24.5, 26.4, 'Manhattan taken'], [26.5, 29.8, 'Held for seven years'],
  [30.2, 32.8, 'Lawmakers ran up the Hudson'], [32.9, 35.4, 'Town to town'], [35.5, 38.8, '1777: Kingston, first capital'], [38.9, 43.2, 'October: burned to the ground'],
  [43.5, 45.9, 'After the war…'], [46.0, 49.3, 'The capital kept moving'], [49.4, 50.9, 'Nobody forgot'], [51.0, 55.2, 'A coast any fleet can reach'],
  [55.5, 58.2, 'New York grew west'], [58.3, 60.3, 'Settlers poured upstate'], [60.4, 64.5, 'NYC: stuck in the corner'],
  [64.9, 68.8, 'Router in the corner bedroom…'], [68.9, 71.7, '…or the hallway?'],
  [71.9, 74.5, 'Albany was the hallway'], [74.6, 76.1, 'Where two rivers meet'], [76.2, 79.2, '150 miles inland, on the road west'], [79.3, 82.1, '1797: permanent capital'], [82.2, 85.6, '1825: the Erie Canal'], [85.7, 89.1, 'Albany to the Great Lakes'],
  [89.3, 92.7, 'Coastal capitals do fine'], [92.8, 95.8, 'So what was the real fear?'], [95.9, 97.6, 'Take a guess'],
  [97.8, 101.0, 'The city itself'], [101.1, 103.3, 'Merchants, bankers, crowds'], [103.4, 106.8, 'They could lean on the government'], [106.9, 110.6, 'Money. Pressure. Mobs.'],
  [110.9, 113.7, 'June 1783'], [113.8, 117.5, '400 soldiers surround Congress'], [117.6, 119.9, 'Demanding their pay'], [120.0, 122.8, 'Pennsylvania, protect us?'], [122.9, 124.8, '"No."'], [124.9, 128.2, 'Congress fled to Princeton'],
  [128.5, 130.8, 'The founders never forgot'], [130.9, 134.5, 'A district of its own'], [134.6, 137.2, 'Owned by no state'], [137.3, 139.3, 'Washington, on the Potomac'], [139.4, 142.3, 'A North–South deal'], [142.4, 144.1, 'No hostages'],
  [144.4, 146.5, 'The states copied it'], [146.6, 150.8, 'Only 17 of 50'],
  [151.1, 156.6, 'Philadelphia → Lancaster → Harrisburg'], [156.7, 161.2, 'San Jose, Vallejo, Benicia…'], [161.3, 162.5, '…Sacramento'], [162.6, 165.2, 'Springfield, 1839'], [165.3, 167.7, 'Chicago: about 4,000 people'], [167.8, 172.3, 'Today: 20× bigger'],
  [172.6, 175.7, 'The record: Montpelier'], [175.8, 178.9, 'About 8,000 people'], [179.0, 181.2, 'Not one McDonald\'s'],
  [181.5, 183.7, 'A global powerhouse…'], [183.8, 186.8, '…takes orders from Albany'], [186.9, 188.9, 'Not a mistake. A firewall.'], [189.0, 192.8, 'Your pick? 👇'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .24, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, H * 1.0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (!(t > 65.2 && t < 71.6)) scene(ctx, t); wifiCard(ctx, t);
  vignette(ctx); if (t < 192.97) drawText(ctx, t); endCard(ctx, t);
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
