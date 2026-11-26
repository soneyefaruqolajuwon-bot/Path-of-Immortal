/* Why Albany, not New York City? Mapheld 9:16 short; ends on a cliffhanger card for the long-form. */
'use strict';
const W = 1080, H = 1920, DURATION = 60.5;
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
  open: [-74.15, 41.0, 430], hudson: [-73.95, 41.85, 360], harbor: [-74.0, 40.72, 950], kingston: [-73.97, 41.55, 620], coast: [-73.98, 40.95, 520],
  state: [-75.9, 42.75, 145], albany: [-73.76, 42.6, 640], usa: [-96.5, 38.6, 17.5],
};
const KEYS = [[0, 'open', 1], [5.6, 'open', 1.04], [7.4, 'hudson', 1], [11.2, 'hudson', 1.03], [12.9, 'harbor', 1], [19.9, 'harbor', 1.05], [21.2, 'kingston', 1], [26.0, 'kingston', 1.04],
  [27.2, 'coast', 1], [30.0, 'coast', 1.03], [31.4, 'state', 1], [40.2, 'state', 1.03], [41.3, 'albany', 1], [45.6, 'albany', 1.05], [48.0, 'usa', 1], [56.4, 'usa', 1.06], [60.5, 'usa', 1.08]];
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
const NYC = [-73.99, 40.73], ALB = [-73.756, 42.652], KGN = [-73.996, 41.927];
const BIG17 = ['AZ', 'AR', 'CO', 'GA', 'ID', 'IN', 'IA', 'MA', 'MS', 'OK', 'RI', 'TN', 'UT', 'OH', 'WY', 'WV'];   // + Hawaii (off-map)
function fillKey(ctx, c, key, style, a, glow) {
  if (a <= 0 || !PATHS[key]) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = style; ctx.fill(pp); if (glow) { ctx.globalAlpha = Math.min(1, a * 1.6); ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.shadowColor = glow; ctx.shadowBlur = 14; ctx.stroke(pp); } ctx.restore(); }
function strokeKey(ctx, c, key, col, lw, a = 1) { if (!PATHS[key]) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(pp); ctx.restore(); }
function baseMap(ctx, c, t) {
  drawMap(ctx, c);
  fillKey(ctx, c, 'lakes', C.ocean, 1, null); strokeKey(ctx, c, 'lakes', C.coast, 2.5);
  for (const k of Object.keys(GEO)) if (k.startsWith('st_')) strokeKey(ctx, c, k, 'rgba(44,53,49,0.75)', 2.2);
  // New York State always glows a little: it's the subject
  const usaK = clamp((t - 46.5) / 1.5);
  fillKey(ctx, c, 'ny', C.gold, 0.12 * (1 - usaK), null); strokeKey(ctx, c, 'ny', C.gold, 4, 0.85 * (1 - usaK * 0.6));
}
function river(ctx, c, p, k, w = 9) { geoLine(ctx, c, p, k, '#5FB6D3', w, null, true); }
function icon(ctx, c, name, ll, w, k, o = {}) { const [x, y] = P(c, ll[0], ll[1]); sprite(ctx, name, x + (o.dx || 0), y + (o.dy || 0), w, { k, ay: o.ay ?? 0.9, ...o }); }
function ring(ctx, x, y, r, t, col = C.gold) { ctx.save(); for (let i = 0; i < 2; i++) { const u = ((t * 0.9 + i * 0.5) % 1); ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r * (0.5 + u), 0, 7); ctx.stroke(); } ctx.restore(); }
function fire(ctx, x, y, s, t, k) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 2);
  for (let i = 0; i < 5; i++) { const ox = (i - 2) * s * 0.28, h = s * (0.7 + 0.3 * Math.sin(t * 13 + i * 2)) * k;
    for (const [col, m] of [['#E85D04', 1], ['#FFBA08', 0.6]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + ox - s * 0.16 * m, y); ctx.quadraticCurveTo(x + ox - s * 0.1, y - h * m * 0.6, x + ox + Math.sin(t * 9 + i) * 6, y - h * m); ctx.quadraticCurveTo(x + ox + s * 0.1, y - h * m * 0.6, x + ox + s * 0.16 * m, y); ctx.fill(); } }
  ctx.restore();
  for (let i = 0; i < 3; i++) { const u = ((t - 24.7) * 0.6 + i / 3) % 1; if (t > 24.9) puff(ctx, x + (i - 1) * s * 0.3, y - s * (1 + u * 1.4), s * 0.9, 0.15 + u * 0.8, 7 + i); }
}
function arrow(ctx, c, a, b, k, col = C.gold) {
  if (k <= 0) return; const [x0, y0] = P(c, a[0], a[1]), [x1f, y1f] = P(c, b[0], b[1]); const e = easeOut(k), x1 = lerp(x0, x1f, e), y1 = lerp(y0, y1f, e);
  const ang = Math.atan2(y1 - y0, x1 - x0); ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + 3, y0 + 4); ctx.lineTo(x1 + 3, y1 + 4); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 + 26 * Math.cos(ang), y1 + 26 * Math.sin(ang)); ctx.lineTo(x1 + 22 * Math.cos(ang + 2.3), y1 + 22 * Math.sin(ang + 2.3)); ctx.lineTo(x1 + 22 * Math.cos(ang - 2.3), y1 + 22 * Math.sin(ang - 2.3)); ctx.fill(); ctx.restore(); }

// ------------------------------------------------------------------ scenes (storyboard = voice clock; cliffhanger card 56.5–60.5)
function scene(ctx, t) {
  const c = camAt(t); baseMap(ctx, c, t);
  const [nx, ny] = P(c, NYC[0], NYC[1]), [ax, ay] = P(c, ALB[0], ALB[1]);
  // rivers: the Hudson draws itself up to Albany, the Mohawk later
  const hudK = t < 6.0 ? 0.0 : clamp((t - 6.0) / 3.6);
  if (t < 46.5) { river(ctx, c, HUD, t < 30 ? hudK * 0.73 : lerp(0.73, 1, clamp((t - 38.3) / 1.2))); river(ctx, c, MOH, clamp((t - 38.6) / 1.4), 8); }
  // ---------------- B1 hook: NYC wears the crown… NOT THE CAPITAL
  if (t < 11.3) {
    icon(ctx, c, 'skyline', NYC, lerp(320, 220, clamp((t - 5.6) / 1.8)), 1, { dy: 10 });
    person(ctx, t < 3.95 ? 'nyc_smug' : 'nyc_shock', 810, 1500, 380, { k: t < 5.6 ? 1 : popOut(6.2 - t, 0.5), sq: t > 3.95 && t < 4.3 ? 0.08 : 0 });
    styledText(ctx, 'CAPITAL OF\nNEW YORK?', W / 2, 300, 112, { fill: C.yellow, stroke: C.goldDark, rot: -3, k: t < 3.9 ? 1 : popOut(4.3 - t, 0.3) });
    stamp(ctx, 'NOT THE CAPITAL', nx + 10, ny - 150, t, 3.95, { size: 54, until: 11.2 });
    goldLabel(ctx, 'NEW YORK CITY', nx - 40, ny + 70, 46, t < 4 ? 1 : popOut(11.2 - t));
  }
  // ---------------- B2 Albany: 1% of the people, 150 miles upriver
  if (t > 5.6 && t < 11.3) {
    icon(ctx, c, 'capitol', ALB, 190, pop(t - 5.85), { dy: 0 }); goldLabel(ctx, 'ALBANY', ax + 230, ay - 40, 64, pop(t - 5.9)); if (t > 6.0) ring(ctx, ax, ay - 40, 90, t);
    kinetic(ctx, 'ABOUT 1% OF THE PEOPLE', 300, win(t, 7.3, 9.2), 72);
    chip(ctx, '~8.3 MILLION  vs  ~100,000', W / 2, 410, win(t, 7.5, 9.2), { size: 34 });
    chip(ctx, '150 MILES UP THE HUDSON', W / 2, 300, win(t, 9.3, 11.2), { size: 44 });
    const [hx, hy] = P(c, -73.86, 41.35); styledText(ctx, 'HUDSON', hx + 70, hy, 34, { k: win(t, 9.3, 11.2), fill: '#BFE6F2', stroke: C.ink, rot: -80 });
  }
  // ---------------- B3 1776: warships take Manhattan, 7 years
  if (t > 11.3 && t < 20.4) {
    styledText(ctx, 'WHY ALBANY?', W / 2, 300, 100, { fill: C.yellow, stroke: C.goldDark, rot: -3, k: win(t, 11.4, 13.4) });
    kinetic(ctx, '1776', 300, win(t, 13.6, 16.6), 150);
    const occ = clamp((t - 17.2) / 0.6);
    if (occ > 0) { ctx.save(); ctx.globalAlpha = 0.55 * occ; ctx.fillStyle = '#D7263D'; ctx.beginPath(); const [mx, my] = P(c, -73.97, 40.78); ctx.ellipse(mx, my, 34, 120, 0.5, 0, 7); ctx.fill(); ctx.restore(); }
    goldLabel(ctx, 'MANHATTAN', nx + 150, ny - 120, 44, pop(t - 17.3));
    for (let i = 0; i < 3; i++) { const u = easeOut(clamp((t - 14.9 - i * 0.35) / 2.6)); const [hx, hy] = P(c, -74.03 + (i - 1) * 0.07, 40.55 + i * 0.03); sprite(ctx, 'warship', lerp(hx + (i - 1) * 120, hx + (i - 1) * 40, u), lerp(H + 300, hy + 60, u) + wob(t, 0.5, 6, i), 300, { ay: 0.8, k: t > 14.9 + i * 0.35 ? 1 : 0 }); }
    stamp(ctx, 'OCCUPIED', W / 2, 560, t, 17.7, { size: 64, until: 20.3 });
    kinetic(ctx, '7 YEARS', 1230, win(t, 18.9, 20.3), 130, 3);
  }
  // ---------------- B4 lawmakers flee upriver; Kingston burns
  if (t > 20.0 && t < 26.3) {
    const sp = HUD_NYC_KGN.map(p => P(c, p[0], p[1])); const run = easeIO(clamp((t - 20.4) / 2.4)); const [lx, ly] = pointAlong(sp, run * 0.97);
    icon(ctx, c, 'kingston', KGN, 230, pop(t - 22.4), { dx: -150, dy: 20 }); goldLabel(ctx, 'KINGSTON', ...P(c, KGN[0] - 0.24, KGN[1] - 0.2), 48, pop(t - 22.8));
    const flee = easeIn(clamp((t - 23.2) / 1.3)); person(ctx, 'law_run', lx + 40, ly + 60 - flee * 900 - Math.abs(Math.sin(t * 12)) * 16, 240, { k: pop(t - 20.3) * (1 - clamp((t - 24.2) / 0.3)) });
    chip(ctx, 'LAWMAKERS FLEE UPRIVER', W / 2, 300, win(t, 20.4, 22.7), { size: 42 }); chip(ctx, '1777: FIRST STATE CAPITAL', W / 2, 300, win(t, 22.8, 23.6), { size: 40 });
    for (let i = 0; i < 2; i++) { const u = easeOut(clamp((t - 23.5 - i * 0.2) / 1.2)); person(ctx, 'redcoat', lerp(W + 150, 760 + i * 130, u), 1210 + i * 40, 200, { k: t > 23.5 ? 1 : 0 }); }
    const [kx, ky] = P(c, KGN[0], KGN[1]); fire(ctx, kx - 150, ky + 10, 130, t, clamp((t - 24.7) / 0.5));
    stamp(ctx, 'BURNED', W / 2, 330, t, 24.9, { size: 66, until: 26.2 });
  }
  // ---------------- B5 mid question: back on the coast? …they didn't
  if (t > 26.2 && t < 30.4) {
    icon(ctx, c, 'skyline', NYC, 210, 1, { dy: 10 }); sprite(ctx, 'warship', nx - 40 + wob(t, 0.4, 10), ny + 300, 320, { ay: 0.8, k: pop(t - 26.6) });
    kinetic(ctx, 'WOULD YOU? 🤔', 300, win(t, 26.5, 29.0), 110);
    redX(ctx, nx, ny - 60, 260, clamp((t - 29.2) / 0.4)); kinetic(ctx, 'THEY DIDN\'T', 300, win(t, 29.2, 30.3), 120, -3, '#FFFFFF');
  }
  // ---------------- B6 settlers pour west; NYC stuck in the corner; Albany at the crossroads
  if (t > 30.2 && t < 40.6) {
    const towns = [[-78.85, 42.9], [-77.6, 43.15], [-76.15, 43.05], [-75.9, 42.1], [-75.2, 43.1]];
    towns.forEach((p, i) => { arrow(ctx, c, ALB, p, clamp((t - 31.9 - i * 0.18) / 0.9), '#F4ECD8'); icon(ctx, c, 'farm', p, 74, pop(t - 32.7 - i * 0.18)); });
    const [wx, wy] = P(c, -76.9, 42.55); sprite(ctx, 'wagon', lerp(wx + 260, wx - 40, easeOut(clamp((t - 31.9) / 2.2))), wy, 120, { k: win(t, 31.9, 36.0) });
    chip(ctx, 'SETTLERS POUR WEST', W / 2, 300, win(t, 32.0, 33.3), { size: 44 });
    if (t > 33.3) { ring(ctx, nx, ny, 70, t, '#FF6B6B'); chip(ctx, 'NYC: STUCK IN THE CORNER', W / 2, 300, win(t, 33.3, 35.9), { size: 40, stroke: '#FF6B6B' }); }
    icon(ctx, c, 'capitol', ALB, 110, 1); if (t > 35.9) ring(ctx, ax, ay - 20, 80, t);
    chip(ctx, 'ALBANY: IN THE MIDDLE', W / 2, 300, win(t, 35.9, 38.5), { size: 44 });
    arrow(ctx, c, ALB, [-73.42, 44.55], clamp((t - 36.4) / 0.6)); arrow(ctx, c, ALB, [-73.98, 40.9], clamp((t - 36.6) / 0.6)); arrow(ctx, c, ALB, [-75.6, 43.25], clamp((t - 36.8) / 0.6));
    if (t > 38.6) { const [mx, my] = P(c, -74.6, 42.9), [hx, hy] = P(c, -73.65, 43.4); styledText(ctx, 'MOHAWK', mx, my - 40, 38, { k: pop(t - 38.7), fill: '#BFE6F2', stroke: C.ink }); styledText(ctx, 'HUDSON', hx + 90, hy, 38, { k: pop(t - 39.4), fill: '#BFE6F2', stroke: C.ink }); }
  }
  // ---------------- B7 safe, close, 1797, capital for good
  if (t > 40.4 && t < 46.4) {
    icon(ctx, c, 'capitol', ALB, 300, 1); goldLabel(ctx, 'ALBANY', ax, ay - 330, 70, 1);
    const shipK = win(t, 40.5, 41.8, 0.2, 0.2); sprite(ctx, 'warship', W / 2 - 200, 1420, 260, { k: shipK, ay: 0.8 }); redX(ctx, W / 2 - 200, 1340, 220, clamp((t - 40.6) / 0.4) * (t < 41.8 ? 1 : 0));
    chip(ctx, 'SAFE FROM WARSHIPS', W / 2, 300, win(t, 40.5, 41.6), { size: 44 });
    [[-73.9, 42.75], [-73.6, 42.55], [-73.95, 42.45], [-73.55, 42.85]].forEach((p, i) => icon(ctx, c, 'farm', p, 90, win(t, 41.6 + i * 0.1, 42.6)));
    chip(ctx, 'CLOSE TO THE PEOPLE', W / 2, 300, win(t, 41.6, 42.6), { size: 44 });
    kinetic(ctx, '1797', 300, win(t, 42.7, 46.3), 150);
    person(ctx, 'law_happy', 230, 1560, 260, { k: pop(t - 43.3) });
    stamp(ctx, 'CAPITAL FOR GOOD', W / 2, 1180, t, 44.4, { size: 54, color: '#1E8E3E', until: 46.3 });
  }
  // ---------------- B8 not the only state: 17 of 50
  if (t > 45.6) {
    const kA = clamp((t - 47.3) / 0.8), kG = clamp((t - 49.4) / 0.6);
    if (kA > 0) for (const k of Object.keys(GEO)) if (k.startsWith('st_') && k !== 'st_DC') { const gold = BIG17.includes(k.slice(3)); fillKey(ctx, c, k, gold ? C.gold : '#C0392B', (gold ? lerp(0.45, 0.9, kG) : lerp(0.45, 0.28, kG)) * kA, null); }
    if (kG > 0) for (const s of BIG17) strokeKey(ctx, c, 'st_' + s, '#FFF6C8', 3, kG);
    strokeKey(ctx, c, 'st_NY', C.white, 5, kA);
    chip(ctx, 'HERE\'S THE STRANGE PART', W / 2, 300, win(t, 46.0, 47.2), { size: 44 });
    chip(ctx, 'NEW YORK WASN\'T THE ONLY ONE', W / 2, 300, win(t, 47.3, 49.3), { size: 40 });
    styledText(ctx, '17 / 50', W / 2, 330, 190, { k: win(t, 49.45, 56.4), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    chip(ctx, 'CAPITAL = BIGGEST CITY', W / 2, 480, win(t, 50.5, 56.4), { size: 40 }); chip(ctx, '+ HAWAII', 170, 1330, win(t, 50.0, 56.4), { size: 30 });
    if (t > 53.6) { const d = clamp((t - 53.8) / 1.2); ctx.save(); ctx.globalAlpha = 0.55 * d; ctx.fillStyle = '#05080A'; ctx.fillRect(0, 0, W, H); ctx.restore(); styledText(ctx, '?', W / 2, 1000, 420, { k: pop(t - 54.0, 0.5), fill: C.yellow, stroke: C.goldDark }); }
  }
  // ---------------- cliffhanger card: points at the Related-video link (bottom-left, above the title)
  if (t > 56.3) {
    const k = clamp((t - 56.3) / 0.4); ctx.save(); ctx.globalAlpha = 0.72 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const g = ctx.createRadialGradient(W / 2, 520, 40, W / 2, 520, 520); g.addColorStop(0, `rgba(244,208,63,${0.22 * k})`); g.addColorStop(1, 'rgba(244,208,63,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    title(ctx, 'THE HIDDEN\nREASON', 470, pop(t - 56.4) * (1 + 0.015 * Math.sin(t * 5)), 150);
    styledText(ctx, 'a fear most people\nhave never heard of', W / 2, 700, 58, { k: pop(t - 56.8), fill: '#FFFFFF', stroke: C.ink });
    kinetic(ctx, 'CAN YOU GUESS IT? 👇', 880, pop(t - 57.2), 70);
    // the NYC guy points down-left at the link
    person(ctx, 'nyc_point', 800, 1500 + Math.sin(t * 4) * 6, 380, { k: pop(t - 57.0) });
    // bouncing arrow + label right above where YouTube shows "Related video"
    const b = Math.abs(Math.sin((t - 57.3) * 4.2)) * 40, kA = pop(t - 57.3);
    if (kA > 0) {
      chip(ctx, 'FULL STORY: TAP HERE', 370, 1180, kA, { size: 40, bg: C.gold, fill: C.ink, stroke: C.goldDark });
      ctx.save(); ctx.translate(240, 1300 + b); ctx.scale(kA, kA); ctx.fillStyle = C.yellow; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 8; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-34, -70); ctx.lineTo(34, -70); ctx.lineTo(34, 10); ctx.lineTo(80, 10); ctx.lineTo(0, 100); ctx.lineTo(-80, 10); ctx.lineTo(-34, 10); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
      ring(ctx, 240, 1560, 70, t);
    }
  }
}
const CAPTIONS = [
  [0.0, 2.5, 'You\'ve had this wrong…'], [2.5, 5.5, 'NOT New York City'], [5.7, 9.2, 'It\'s Albany'], [9.3, 11.2, '150 miles up the Hudson'],
  [11.4, 13.5, 'Why pick Albany?'], [13.6, 17.1, '1776: British warships'], [17.2, 20.2, 'Manhattan, taken for 7 years'],
  [20.4, 22.7, 'Lawmakers ran upriver'], [22.8, 26.1, 'Kingston: burned'], [26.4, 29.0, 'Back to the coast?'], [29.2, 30.2, 'They didn\'t.'],
  [30.3, 33.3, 'Settlers poured west'], [33.4, 35.8, 'NYC: stuck in the corner'], [35.9, 38.5, 'Albany: in the middle'], [38.6, 40.4, 'Where the Mohawk meets the Hudson'],
  [40.6, 42.6, 'Safe. Close to the people.'], [42.7, 45.5, '1797: capital for good'], [45.9, 49.3, 'New York wasn\'t alone'], [49.4, 53.5, 'Only 17 of 50 states'], [53.6, 56.3, 'One reason: a hidden fear'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); vignette(ctx); if (t < 56.3) drawText(ctx, t);
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
