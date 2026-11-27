/* 6 Times Countries Invaded By Accident — Mapheld 16:9 countdown long-form. renderAt(t) = voice clock incl. breathers. */
'use strict';
const W = 1920, H = 1080, DURATION = 210.66;
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
const V = { world: [-60, 35, 5.2], alps: [8.6, 47.0, 300], alpsE: [10.1, 47.1, 330], lie: [9.53, 47.14, 2300], spain: [-5.0, 36.9, 260], gib: [-5.355, 36.155, 7000], cr: [-83.85, 10.9, 900], balk: [23.4, 41.7, 330], kiska: [-182.45, 51.98, 1100] };
const KEYS = [[0, 'world', 1], [14.8, 'world', 1.03], [19.0, 'alps', 1], [25.0, 'alps', 1.03], [26.4, 'lie', 1], [42.4, 'lie', 1.04], [46.0, 'spain', 1], [53.6, 'spain', 1.03], [55.6, 'gib', 1], [77.4, 'gib', 1.04],
  [81.2, 'alpsE', 1], [100.9, 'alpsE', 1.04], [104.9, 'cr', 1], [138.4, 'cr', 1.05], [142.4, 'balk', 1], [162.9, 'balk', 1.04], [167.9, 'kiska', 1], [193.9, 'kiska', 1.05], [196.0, 'world', 1], [210.66, 'world', 1.04]];
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
  const set = landSet(c);
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

function landSet(c) { if (c.z > 3000) return PATHS.fine_gib; if (c.z > 600 && c.cx < -150) return PATHS.fine_kiska.concat(PATHS.wide); if (c.z > 600 && c.cx < -70) return PATHS.fine_cr; if (c.z > 120 && c.cx > -15) return PATHS.eu; return PATHS.wide; }
// ------------------------------------------------------------------ helpers (16:9)
function fillKey(ctx, c, key, style, a, glow) { if (a <= 0 || !PATHS[key]) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = style; ctx.fill(pp); if (glow) { ctx.globalAlpha = Math.min(1, a * 1.6); ctx.strokeStyle = glow; ctx.lineWidth = 4; ctx.shadowColor = glow; ctx.shadowBlur = 12; ctx.stroke(pp); } ctx.restore(); }
function strokeKey(ctx, c, key, col, lw, a = 1) { if (!PATHS[key] || a <= 0) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(pp); ctx.restore(); }
function ring(ctx, x, y, r, t, col = C.gold) { ctx.save(); for (let i = 0; i < 2; i++) { const u = ((t * 0.9 + i * 0.5) % 1); ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r * (0.5 + u), 0, 7); ctx.stroke(); } ctx.restore(); }
function dim(ctx, a, col = '#05080A') { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function sarrow(ctx, x0, y0, x1f, y1f, k, col = C.gold, w = 11) { if (k <= 0) return; const e = easeOut(k), x1 = lerp(x0, x1f, e), y1 = lerp(y0, y1f, e); const ang = Math.atan2(y1 - y0, x1 - x0); ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = w + 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + 3, y0 + 4); ctx.lineTo(x1 + 3, y1 + 4); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); const hs = w * 2.4; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 + hs * Math.cos(ang), y1 + hs * Math.sin(ang)); ctx.lineTo(x1 + hs * Math.cos(ang + 2.3), y1 + hs * Math.sin(ang + 2.3)); ctx.lineTo(x1 + hs * Math.cos(ang - 2.3), y1 + hs * Math.sin(ang - 2.3)); ctx.fill(); ctx.restore(); }
function labelAt(ctx, c, ll, text, k, dx = 0, dy = 50, size = 34) { const [x, y] = P(c, ll[0], ll[1]); goldLabel(ctx, text, x + dx, y + dy, size, k); }
function iconAt(ctx, c, name, ll, w, k, o = {}) { const [x, y] = P(c, ll[0], ll[1]); sprite(ctx, name, x + (o.dx || 0), y + (o.dy || 0), w, { k, ay: o.ay ?? 0.85, ...o }); }
function fire(ctx, x, y, s, t, k) { if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 2); for (let i = 0; i < 5; i++) { const ox = (i - 2) * s * 0.28, h = s * (0.7 + 0.3 * Math.sin(t * 13 + i * 2)) * k; for (const [col, m] of [['#E85D04', 1], ['#FFBA08', 0.6]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + ox - s * 0.16 * m, y); ctx.quadraticCurveTo(x + ox - s * 0.1, y - h * m * 0.6, x + ox + Math.sin(t * 9 + i) * 6, y - h * m); ctx.quadraticCurveTo(x + ox + s * 0.1, y - h * m * 0.6, x + ox + s * 0.16 * m, y); ctx.fill(); } } ctx.restore(); }
function boom(ctx, x, y, t, t0, s = 1) { const b = clamp((t - t0) / 0.7); if (t < t0 || b >= 1) return; ctx.save(); ctx.globalAlpha = 1 - b; ctx.fillStyle = '#FFB703'; ctx.beginPath(); ctx.arc(x, y, (30 + b * 100) * s, 0, 7); ctx.fill(); ctx.fillStyle = '#E85D04'; ctx.beginPath(); ctx.arc(x, y, (15 + b * 60) * s, 0, 7); ctx.fill(); ctx.restore(); }
function scoreboard(ctx, n, k, x, y, label = 'ACCIDENTAL INVASIONS') { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = 'rgba(10,24,32,0.92)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-170, -60, 340, 120, 20); ctx.fill(); ctx.stroke(); setFont(ctx, 'Montserrat', 22); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, -30); setFont(ctx, 'Montserrat', 64); ctx.fillStyle = C.yellow; ctx.fillText(String(n), 0, 18); ctx.restore(); }
function gavel(ctx, x, y, t, t0, k) { if (k <= 0) return; const e = t - t0; const ang = e < 0 ? -0.9 : e < 0.15 ? lerp(-0.9, 0.2, e / 0.15) : 0.2; ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(x, y); ctx.save(); ctx.rotate(ang); ctx.fillStyle = '#6B4423'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-18, -230, 36, 230, 10); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-100, -290, 200, 80, 18); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.fillStyle = '#5A3A1E'; ctx.beginPath(); ctx.roundRect(-140, 40, 280, 46, 12); ctx.fill(); ctx.stroke(); ctx.restore(); }
function phone(ctx, x, y, k, t, wrong = true) {   // a phone showing a map whose border line is in the wrong place
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = '#141416'; ctx.beginPath(); ctx.roundRect(-150, -280, 300, 560, 40); ctx.fill(); ctx.fillStyle = '#E8F0E3'; ctx.beginPath(); ctx.roundRect(-130, -240, 260, 480, 18); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-130, -240, 260, 480, 18); ctx.clip(); ctx.fillStyle = '#9ED0E6'; ctx.fillRect(-130, 60, 260, 200); ctx.fillStyle = '#5FA8D3'; ctx.lineWidth = 16; ctx.strokeStyle = '#5FA8D3'; ctx.beginPath(); ctx.moveTo(-130, -40); ctx.bezierCurveTo(-40, -10, 30, -60, 130, 20); ctx.stroke();
  ctx.setLineDash([14, 10]); ctx.strokeStyle = '#D7263D'; ctx.lineWidth = 6; ctx.beginPath(); const off = wrong ? 70 : 0; ctx.moveTo(-130, -40 + off); ctx.bezierCurveTo(-40, -10 + off, 30, -60 + off, 130, 20 + off); ctx.stroke(); ctx.setLineDash([]);
  setFont(ctx, 'Montserrat', 26); ctx.fillStyle = '#0067C6'; ctx.textAlign = 'center'; ctx.fillText('NICARAGUA', 0, -150); ctx.fillStyle = '#CE1126'; ctx.fillText('COSTA RICA', 0, 160); ctx.restore();
  setFont(ctx, 'Montserrat', 24); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('GOOGLE MAPS (2010)', 0, -255); ctx.restore(); }
function fog(ctx, t, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; for (let i = 0; i < 9; i++) { const x = ((i * 260 + t * 30) % (W + 600)) - 300, y = 200 + (i % 4) * 220; const g = ctx.createRadialGradient(x, y, 20, x, y, 360); g.addColorStop(0, 'rgba(225,232,236,0.85)'); g.addColorStop(1, 'rgba(225,232,236,0)'); ctx.fillStyle = g; ctx.fillRect(x - 360, y - 360, 720, 720); } ctx.restore(); }
// a countdown title card: big number, two caped rivals, "A vs B"
function numCard(ctx, t, t0, t1, n, title, left, right, flags) {
  const k = clamp((t - t0) / 0.35) * clamp((t1 - t) / 0.35); if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.3); ctx.fillStyle = '#0E2A33'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 360, 40, W / 2, 360, 700); g.addColorStop(0, 'rgba(244,208,63,0.25)'); g.addColorStop(1, 'rgba(244,208,63,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const s = pop(t - t0 - 0.05, 0.4); ctx.save(); ctx.translate(W / 2, 300); ctx.scale(s, s); ctx.rotate((1 - s) * 0.4); setFont(ctx, 'Playfair Display', 260); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 22; ctx.strokeStyle = C.goldDark; ctx.strokeText('#' + n, 0, 0); ctx.fillStyle = C.gold; ctx.fillText('#' + n, 0, 0); ctx.restore();
  styledText(ctx, title, W / 2, 520, 74, { k: pop(t - t0 - 0.35), fill: '#fff', stroke: C.ink, maxW: 1700 });
  if (left) person(ctx, left, 430, 1060, 260, { k: pop(t - t0 - 0.5) }); if (right) person(ctx, right, 1490, 1060, 260, { k: pop(t - t0 - 0.7), flip: true });
  if (flags) { sprite(ctx, flags[0], 520, 300, 170, { k: pop(t - t0 - 0.5) }); if (flags[1]) sprite(ctx, flags[1], 1400, 300, 170, { k: pop(t - t0 - 0.7) }); }
  ctx.restore(); }

// ------------------------------------------------------------------ the story
const PLACES = [[9.53, 47.14, '6'], [-5.35, 36.14, '5'], [9.53, 47.14, '4'], [-83.65, 10.85, '3'], [23.2, 41.4, '2'], [-182.45, 51.98, '1']];
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  // country tints where they matter
  if (c.cx > -15 && c.z > 120) { for (const k of ['deu', 'fra', 'ita', 'aut', 'prt', 'mkd']) strokeKey(ctx, c, k, '#2C3531', 2); fillKey(ctx, c, 'che', '#DA291C', 0.32, null); fillKey(ctx, c, 'lie', '#F4D03F', 0.5, '#002B7F'); fillKey(ctx, c, 'esp', '#F1BF00', 0.18, null); fillKey(ctx, c, 'gib', '#C8102E', 0.6, '#FFFFFF'); fillKey(ctx, c, 'grc', '#0D5EAF', 0.25, null); fillKey(ctx, c, 'bgr', '#00966E', 0.25, null); for (const k of ['che', 'lie', 'esp', 'gib', 'grc', 'bgr']) strokeKey(ctx, c, k, '#2C3531', 2.5); }
  if (c.cx < -70 && c.cx > -150 && c.z > 200) { fillKey(ctx, c, 'nic', '#0067C6', 0.22, null); fillKey(ctx, c, 'cri', '#CE1126', 0.22, null); strokeKey(ctx, c, 'nic', '#2C3531', 3); strokeKey(ctx, c, 'cri', '#2C3531', 3); }
  // ---------------- B1 intro (0–15.1)
  if (t < 15.2) {
    PLACES.forEach(([lo, la, n], i) => { if (i === 2) return; const [x, y] = P(c, lo, la); const k = pop(t - 4.7 - i * 0.25); if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill(); ctx.stroke(); setFont(ctx, 'Montserrat', 30); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, 0, 2); ctx.restore(); });
    kinetic(ctx, 'ARMIES GETTING LOST', 160, win(t, 0.2, 4.2), 100);
    ['THE WRONG PLACE', 'THE WRONG COUNTRY', 'NOBODY AT ALL'].forEach((s, i) => chip(ctx, s, 520 + i * 440, 150, win(t, [6.1, 7.1, 8.1][i], 9.3), { size: 40 }));
    if (t > 9.3) { styledText(ctx, '#1: 34,000 SOLDIERS', W / 2, 150, 96, { k: win(t, 9.4, 14.9), fill: C.yellow, stroke: C.goldDark, rot: -2 }); chip(ctx, 'VS. AN EMPTY ISLAND', W / 2, 270, win(t, 12.2, 14.9), { size: 44 }); const [x, y] = P(c, -182.45, 51.98); ring(ctx, x, y, 70, t, '#FF6B6B'); }
  }
  // ---------------- B3 #6 Switzerland vs Liechtenstein (19.1–42.6)
  if (t > 19.0 && t < 42.7) {
    const tally = t < 26.6 ? 0 : t < 28.7 ? 1 : t < 31.0 ? 3 : t < 33.0 ? 4 : 5; if (t > 26.4) scoreboard(ctx, tally, pop(t - 26.5) * popOut(42.5 - t), W - 220, 150);
    chip(ctx, 'THE MOST NEUTRAL COUNTRY ON EARTH', W / 2, 150, win(t, 19.3, 22.4), { size: 42 }); kinetic(ctx, '5 INVASIONS · BY ACCIDENT', 160, win(t, 22.5, 26.4), 86);
    const [mx, my] = P(c, 9.609, 47.101); sprite(ctx, 'chalet', mx, my, 150, { ay: 0.9, k: win(t, 26.5, 28.6) }); for (let i = 0; i < 3; i++) boom(ctx, mx + (i - 1) * 50, my - 30, t, 27.3 + i * 0.2);
    if (t > 28.6 && t < 31.0) { const u = clamp((t - 28.7) / 2.0); const [hx, hy] = P(c, lerp(9.44, 9.53, u), 47.07); sprite(ctx, 'packhorse', hx - 160, hy, 170, { ay: 0.95 }); person(ctx, 'swiss_march', hx, hy, 170); chip(ctx, '↩ WRONG TURN', hx, hy - 230, pop(t - 29.8), { size: 34, bg: C.gold, fill: C.ink, stroke: C.goldDark }); }
    if (t > 30.9 && t < 33.1) { const [fx, fy] = P(c, 9.575, 47.19); const mu = clamp((t - 31.0) / 0.6); if (mu < 1) sprite(ctx, 'missile', lerp(-100, fx, mu), lerp(300, fy, mu), 180, { rot: 15 }); for (let i = 0; i < 6; i++) fire(ctx, fx - 300 + i * 120, fy + 60, 150, t + i, clamp((t - 31.6 - i * 0.06) / 0.4)); }
    if (t > 32.9 && t < 38.8) { dim(ctx, 0.4 * win(t, 33.0, 38.7), '#0A1630'); styledText(ctx, '2007: 171 SOLDIERS', W / 2, 160, 96, { k: win(t, 33.1, 36.6), fill: C.yellow, stroke: C.goldDark, rot: -2 }); chip(ctx, 'LOST AT NIGHT · 1 MILE+ IN', W / 2, 160, win(t, 36.7, 38.7), { size: 42 });
      const u = clamp((t - 33.4) / 4.6); for (let i = 0; i < 15; i++) { const row = Math.floor(i / 5), col = i % 5; const [x, y] = P(c, lerp(9.45, 9.55, u) - col * 0.03 - row * 0.012, 47.095 + row * 0.02); person(ctx, 'swiss_march', x, y - Math.abs(Math.sin(t * 6 + i)) * 5, 96); } }
    if (t > 38.8) { person(ctx, 'lie_shrug', 1550, 1000, 300, { k: pop(t - 38.9) }); chip(ctx, "LIECHTENSTEIN DIDN'T EVEN COMPLAIN", W / 2, 150, win(t, 38.9, 40.4), { size: 40 }); chip(ctx, '🪖 ARMY: 0', W / 2, 150, win(t, 40.5, 42.5), { size: 48, stroke: '#FF6B6B' }); }
  }
  // ---------------- B5/B6 #5 Britain vs Spain (46.2–77.7)
  if (t > 46.1 && t < 77.8) {
    if (t < 55.5) { const [gx, gy] = P(c, -5.35, 36.14); sprite(ctx, 'gib_rock', gx, gy, 130, { ay: 0.92, k: pop(t - 47.8) }); goldLabel(ctx, 'GIBRALTAR', gx + 10, gy + 60, 44, pop(t - 47.9)); labelAt(ctx, c, [-4.2, 37.6], 'SPAIN', pop(t - 46.6), 0, 0, 64);
      chip(ctx, 'BRITISH FOR 300+ YEARS', W / 2, 150, win(t, 49.6, 51.6), { size: 44 }); person(ctx, 'esp_local', 1560, 1000, 280, { k: win(t, 51.6, 55.4) }); bubble(ctx, 1520, 640, 'WE WANT IT BACK!', 40, [20, 70], win(t, 51.8, 53.8)); stamp(ctx, 'TOUCHY', W / 2, 170, t, 53.9, { size: 72, until: 55.4 }); }
    else {
      const [bx, by] = P(c, -5.352, 36.163); goldLabel(ctx, 'LA LÍNEA, SPAIN 🇪🇸', bx + 460, by - 170, 44, pop(t - 55.8) * popOut(77.6 - t)); const [gx, gy] = P(c, -5.352, 36.13); goldLabel(ctx, 'GIBRALTAR 🇬🇧', gx + 260, gy + 120, 44, pop(t - 56.0) * popOut(77.6 - t));
      kinetic(ctx, 'FEBRUARY 2002', 160, win(t, 54.6, 57.9), 100); chip(ctx, 'TARGET: A BEACH IN GIBRALTAR', W / 2, 150, win(t, 56.8, 58.6), { size: 40 });
      const u = clamp((t - 58.6) / 2.0); if (t < 71.5) { const back = clamp((t - 69.8) / 1.5); sprite(ctx, 'craft', lerp(W + 150, bx + 260, easeOut(u)) + back * 600, lerp(by + 300, by + 30, easeOut(u)), 230, { ay: 0.7 }); }
      if (t > 60.2 && t < 70.5) for (let i = 0; i < 3; i++) person(ctx, 'uk_marine', bx + 140 - i * 110 - clamp((t - 60.3) / 1.6) * 120, by + 60 + (i % 2) * 20, 200, { k: pop(t - 60.3 - i * 0.15) * popOut(70.4 - t) });
      stamp(ctx, '…IN SPAIN', W / 2, 170, t, 63.0, { size: 72, until: 65.2 });
      if (t > 65.2 && t < 72.0) { person(ctx, 'esp_local', 420, 1000, 280, { k: pop(t - 65.3) }); bubble(ctx, 470, 640, 'GIBRALTAR IS THAT WAY →', 36, [-10, 70], win(t, 66.8, 69.6)); chip(ctx, 'OUT WITHIN MINUTES', W / 2, 150, win(t, 69.7, 71.8), { size: 44 }); }
      if (t > 71.8) { dim(ctx, 0.75 * clamp((t - 71.9) / 0.4)); person(ctx, 'uk_marine', W / 2, 900, 300, { k: pop(t - 72.0) }); ctx.save(); ctx.fillStyle = '#141416'; ctx.beginPath(); ctx.roundRect(W / 2 + 64, 530, 36, 72, 10); ctx.fill(); ctx.restore(); chip(ctx, 'HEADQUARTERS ☎️', W / 2, 150, win(t, 72.0, 74.3), { size: 44 });
        bubble(ctx, W / 2, 390, '"Sir… we\'ve just invaded Spain."', 48, [0, 70], win(t, 74.4, 77.6)); }
    }
  }
  // ---------------- B8 #4 the army that came home bigger (81.4–101.2)
  if (t > 81.3 && t < 101.3) {
    const [lx, ly] = P(c, 9.53, 47.14), [tx, ty] = P(c, 11.5, 47.0); labelAt(ctx, c, [9.53, 47.14], 'LIECHTENSTEIN', pop(t - 81.6), -60, -120, 40); labelAt(ctx, c, [11.5, 47.0], 'THE MOUNTAINS', pop(t - 86.7), 0, 90, 36);
    kinetic(ctx, '1866', 160, win(t, 83.6, 86.0), 140);
    const out = clamp((t - 85.0) / 2.6), back = clamp((t - 90.6) / 2.4), u = t < 90.6 ? out : 1 - back, n = t < 92.0 ? 80 : 81;
    for (let i = 0; i < 5; i++) { const x = lerp(lx, tx, u) - i * 70 * (t < 90.6 ? 1 : -1), y = lerp(ly, ty, u) + 40; person(ctx, 'lie_1866', x, y, 150, { flip: t > 90.6 }); }
    if (t > 92.0) { const x = lerp(lx, tx, u) + 5 * 70, y = lerp(ly, ty, u) + 40; person(ctx, 'lie_friend', x, y, 150, { k: pop(t - 92.1), flip: true }); }
    scoreboard(ctx, n, win(t, 85.0, 99.9) * (t > 92.0 && t < 92.4 ? 1.15 : 1), W - 220, 150, 'SOLDIERS');
    chip(ctx, 'NEVER FIRED A SHOT', W / 2, 150, win(t, 88.4, 89.6), { size: 44 }); chip(ctx, 'LEGEND SAYS…', W / 2, 150, win(t, 89.7, 92.0), { size: 44 }); kinetic(ctx, '+1 FRIEND', 160, win(t, 92.1, 95.6), 120);
    stamp(ctx, '1868: ARMY ABOLISHED', W / 2, 170, t, 96.4, { size: 60, until: 101.0 });
  }
  // ---------------- B10/B11 #3 Nicaragua vs Costa Rica (105.2–138.6)
  if (t > 105.1 && t < 138.7) {
    const RIVER = [[-84.4, 11.0], [-84.15, 10.95], [-83.95, 10.9], [-83.8, 10.92], [-83.7, 10.93]]; const sp = RIVER.map(p => P(c, p[0], p[1])); ctx.save(); ctx.strokeStyle = '#5FD3FF'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); sp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
    const ISLA = [-83.66, 10.84]; labelAt(ctx, c, [-84.2, 11.15], 'NICARAGUA', pop(t - 105.5), 0, 0, 52); labelAt(ctx, c, [-84.1, 10.62], 'COSTA RICA', pop(t - 105.7), 0, 0, 52); labelAt(ctx, c, [-84.1, 10.97], 'SAN JUAN RIVER', pop(t - 107.2), 0, -30, 30);
    kinetic(ctx, '2010', 160, win(t, 105.3, 107.5), 130); const [ix, iy] = P(c, ...ISLA);
    if (t > 109.8) { goldLabel(ctx, 'ISLA CALERO', ix + 30, iy + 90, 42, pop(t - 111.9)); for (let i = 0; i < 3; i++) { const u = clamp((t - 109.9 - i * 0.2) / 1.6); person(ctx, 'nic_commander', lerp(ix - 200, ix - 40, u) - i * 60, iy - 20 + lerp(-120, 0, u), 130, { k: u > 0 ? 1 : 0 }); }
      if (t > 112.9) { ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ix + 60, iy); ctx.lineTo(ix + 60, iy - 110); ctx.stroke(); ctx.restore(); sprite(ctx, 'flag_nic', ix + 105, iy - 90, 90, { k: pop(t - 113.0) }); } }
    if (t > 114.3 && t < 124.9) { person(ctx, 'cri_police', 1560, 1000, 280, { k: pop(t - 114.4) }); bubble(ctx, 1520, 640, "THAT'S OUR ISLAND!", 40, [20, 70], win(t, 114.6, 116.4)); bubble(ctx, 420, 640, 'CHECK GOOGLE MAPS.', 40, [-20, 70], win(t, 116.5, 118.6)); person(ctx, 'nic_commander', 420, 1000, 280, { k: win(t, 116.4, 124.8) });
      phone(ctx, W / 2, 560, win(t, 118.6, 121.6) * pop(t - 118.6, 0.4), t); chip(ctx, 'GOOGLE: OUR BORDER WAS WRONG ✓', W / 2, 150, win(t, 121.8, 124.8), { size: 40 }); }
    if (t > 124.9) { chip(ctx, 'BUT THE CRISIS WAS REAL', W / 2, 150, win(t, 125.0, 127.3), { size: 44 }); person(ctx, 'cri_police', 1560, 1000, 280, { k: win(t, 126.6, 131.6) }); styledText(ctx, 'COSTA RICA: NO ARMY\nSINCE 1948', W / 2, 200, 76, { k: win(t, 127.4, 129.7), fill: C.yellow, stroke: C.goldDark, rot: -2 }); chip(ctx, 'SO IT SENT POLICE 👮', W / 2, 150, win(t, 129.8, 131.6), { size: 44 });
      gavel(ctx, 1500, 700, t, 132.6, win(t, 131.7, 138.5)); chip(ctx, 'INTERNATIONAL COURT OF JUSTICE', W / 2, 150, win(t, 131.7, 133.6), { size: 40 }); stamp(ctx, "2015: COSTA RICA'S ISLAND", W / 2 - 200, 170, t, 134.0, { size: 56, until: 138.5 }); }
  }
  // ---------------- B13 #2 Greece vs Bulgaria (142.7–163.1)
  if (t > 142.6 && t < 163.2) {
    labelAt(ctx, c, [21.9, 41.1], 'GREECE', pop(t - 144.7), 0, 0, 58); labelAt(ctx, c, [25.0, 42.15], 'BULGARIA', pop(t - 145.1), 0, 0, 58); kinetic(ctx, '1925', 160, win(t, 142.8, 145.8), 140);
    const [bx, by] = P(c, 23.2, 41.42); ring(ctx, bx, by, 60, t);
    if (t < 150.3) { const du = clamp((t - 146.7) / 1.3), su = clamp((t - 148.7) / 1.2); sprite(ctx, 'dog', lerp(bx - 260, bx + 80, du), by + 40, 120, { ay: 0.9, k: pop(t - 146.0) }); person(ctx, 'grc_soldier', lerp(bx - 400, bx - 60, su), by + 90, 200, { k: pop(t - 146.2) }); chip(ctx, 'A SOLDIER CHASES HIS DOG ACROSS THE BORDER', W / 2, 150, win(t, 146.1, 150.2), { size: 38 }); }
    if (t > 150.2 && t < 151.9) { dim(ctx, 0.5 * win(t, 150.2, 151.8)); chip(ctx, 'A BULGARIAN GUARD OPENED FIRE', W / 2, 150, win(t, 150.2, 151.8), { size: 44, stroke: '#FF6B6B' }); }
    if (t > 151.8) { for (let i = 0; i < 4; i++) { const a = P(c, 22.6 + i * 0.35, 41.0), b = P(c, 22.8 + i * 0.35, 41.75); sarrow(ctx, a[0], a[1], b[0], b[1], clamp((t - 152.0 - i * 0.15) / 0.8), '#0D5EAF', 12); } chip(ctx, 'GREEK TROOPS MARCH IN', W / 2, 150, win(t, 151.9, 154.8), { size: 44 }); }
    if (t > 154.8) { gavel(ctx, 1520, 720, t, 156.4, win(t, 154.9, 159.5)); chip(ctx, 'LEAGUE OF NATIONS: CEASEFIRE', W / 2, 150, win(t, 154.9, 157.3), { size: 42 }); chip(ctx, 'GREECE PULLS OUT · PAYS COMPENSATION', W / 2, 150, win(t, 157.4, 159.6), { size: 40 }); }
    if (t > 159.6) { title(ctx, 'THE WAR OF THE STRAY DOG', 170, pop(t - 159.7), 84); sprite(ctx, 'dog', W / 2, 860, 200, { ay: 0.9, k: pop(t - 160.2) }); }
  }
  // ---------------- B15 #1 USA & Canada vs nobody: Kiska (168.2–194.2)
  if (t > 168.1 && t < 194.3) {
    const KS = [-182.45, 51.98]; const [kx, ky] = P(c, ...KS); labelAt(ctx, c, KS, 'KISKA, ALASKA', pop(t - 171.6), 0, 230, 48);
    styledText(ctx, '1943 · WORLD WAR II', W / 2, 160, 90, { k: win(t, 168.3, 171.4), fill: C.yellow, stroke: C.goldDark, rot: -2 });
    sprite(ctx, t < 181.8 ? 'jp_base' : 'empty_base', kx, ky + 40, 190, { ay: 0.9, k: pop(t - 170.6) }); chip(ctx, 'OCCUPIED BY JAPAN', W / 2, 150, win(t, 171.5, 173.9), { size: 44 });
    if (t > 173.9) { for (let i = 0; i < 4; i++) { const u = easeOut(clamp((t - 174.0 - i * 0.25) / 2.6)); sprite(ctx, i % 2 ? 'craft' : 'destroyer', lerp(W + 300, kx + 380 + i * 60, u), lerp(H - 120 - i * 70, ky + 200 - i * 40, u), i % 2 ? 180 : 260, { ay: 0.7 }); }
      styledText(ctx, '34,000+ TROOPS', W / 2, 160, 110, { k: win(t, 174.1, 177.2), fill: C.yellow, stroke: C.goldDark, rot: -2 }); sprite(ctx, 'flag_us', 760, 300, 110, { k: win(t, 175.3, 177.2) }); sprite(ctx, 'flag_can', 1160, 300, 110, { k: win(t, 175.9, 177.2) }); }
    if (t > 177.2) { for (let i = 0; i < 8; i++) { const ang = i / 8 * 6.283; person(ctx, i % 2 ? 'can_soldier' : 'us_soldier', kx + Math.cos(ang + t * 0.15) * 260, ky + Math.sin(ang + t * 0.15) * 110 + 40, 110, { k: pop(t - 177.4 - i * 0.1) * popOut(193.9 - t) }); } }
    fog(ctx, t, 0.75 * win(t, 177.2, 188.6, 0.8, 0.8));
    chip(ctx, 'THEY SEARCHED FOR DAYS…', W / 2, 150, win(t, 179.2, 180.7), { size: 44 }); chip(ctx, '…AND FOUND NOTHING', W / 2, 150, win(t, 180.8, 181.7), { size: 44 }); chip(ctx, 'THE JAPANESE HAD LEFT WEEKS EARLIER', W / 2, 150, win(t, 181.8, 184.8), { size: 40 });
    if (t > 185.9 && t < 187.4) for (let i = 0; i < 6; i++) { const fx = kx - 300 + i * 120, fy = ky + 20 + (i % 2) * 60; if (Math.sin(t * 30 + i * 2) > 0.6) { ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(fx, fy, 10, 0, 7); ctx.fill(); } }
    chip(ctx, 'IN THE FOG, THEY FIRED AT EACH OTHER', W / 2, 150, win(t, 185.0, 187.4), { size: 40, stroke: '#FF6B6B' });
    if (t > 187.3) { const [dx, dy] = [kx + 420, ky + 230]; sprite(ctx, 'destroyer', dx, dy, 280, { ay: 0.7, k: popOut(190.4 - t, 0.6) }); boom(ctx, dx, dy - 20, t, 188.1, 1.4); }
    styledText(ctx, '≈ 300 KILLED OR WOUNDED', W / 2, 160, 90, { k: win(t, 189.0, 191.4), fill: '#FFFFFF', stroke: C.ink }); styledText(ctx, 'ON AN EMPTY ISLAND', W / 2, 160, 96, { k: win(t, 191.5, 194.1), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  }
  // ---------------- B16 outro (194.2–204.7)
  if (t > 194.1) {
    PLACES.forEach(([lo, la, n], i) => { if (i === 2) return; const [x, y] = P(c, lo, la); ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); ctx.stroke(); });
    for (const [lo, la, nm, t0] of [[9.53, 47.14, 'LIECHTENSTEIN', 197.0], [-83.9, 9.9, 'COSTA RICA', 197.4]]) { const [x, y] = P(c, lo, la); ring(ctx, x, y, 60, t, '#7DDC9A'); chip(ctx, nm + ': NO ARMY', x, y - 70, win(t, t0, 204.5), { size: 30, stroke: '#7DDC9A' }); }
    chip(ctx, 'THE ONES THAT ENDED BEST…', W / 2, 150, win(t, 194.3, 198.9), { size: 44 }); kinetic(ctx, 'NO ARMY. NO WAR.', 160, win(t, 199.0, 201.6), 110); chip(ctx, 'JUST A VERY AWKWARD APOLOGY 🙃', W / 2, 150, win(t, 201.7, 204.6), { size: 44 });
  }
}
function cards(ctx, t) {
  numCard(ctx, t, 15.0, 19.2, 6, 'SWITZERLAND vs LIECHTENSTEIN', 'swiss_march', 'lie_shrug', ['flag_che', 'flag_lie']);
  numCard(ctx, t, 42.6, 46.3, 5, 'BRITAIN vs SPAIN', 'uk_marine', 'esp_local', ['flag_uk', 'flag_esp']);
  numCard(ctx, t, 77.6, 81.5, 4, 'THE ARMY THAT CAME HOME BIGGER', 'lie_1866', 'lie_friend', ['flag_lie', null]);
  numCard(ctx, t, 101.1, 105.3, 3, 'NICARAGUA vs COSTA RICA', 'nic_commander', 'cri_police', ['flag_nic', 'flag_cri']);
  numCard(ctx, t, 138.6, 142.8, 2, 'GREECE vs BULGARIA', 'grc_soldier', null, ['flag_grc', 'flag_bgr']);
  numCard(ctx, t, 163.1, 168.3, 1, 'THE UNITED STATES & CANADA vs NOBODY', 'us_soldier', 'can_soldier', ['flag_us', 'flag_can']);
}
function endCard(ctx, t) {
  if (t < 204.66) return; const e = t - 204.66, k = clamp(e / 0.4);
  ctx.fillStyle = `rgba(4,10,14,${0.76 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, '6 ACCIDENTAL INVASIONS.', W / 2, 230, 90, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'WHICH WAS THE CRAZIEST? 👇', W / 2, 360, 96, { k: pop(e - 0.35, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  const kc = pop(e - 0.9, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 560); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 50); const w = ctx.measureText('SUBSCRIBE TO MAPHELD').width + 130; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -60, w, 120, 60); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 44, -22); ctx.lineTo(-w / 2 + 44, 22); ctx.lineTo(-w / 2 + 80, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SUBSCRIBE TO MAPHELD', 24, 3); ctx.restore(); }
  person(ctx, 'lie_shrug', 1680, 1010, 220, { k: pop(e - 1.6) });
  const se = e - 2.2; if (se > 0) { const sl = se < 0.16 ? lerp(2.2, 1, easeIn(se / 0.16)) : 1; ctx.save(); ctx.translate(1420, 860); ctx.rotate(-0.15); ctx.scale(sl, sl); ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 105, 0, 7); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 88, 0, 7); ctx.stroke(); setFont(ctx, 'Montserrat', 40); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MAPHELD', 0, 2); setFont(ctx, 'Montserrat', 18); ctx.fillText('★ EVERY BORDER HAS A STORY ★', 0, 44); ctx.restore(); }
}
const CAPTIONS = [
  [0.2, 4.2, 'Armies getting lost'], [4.3, 9.3, 'Six accidental invasions'], [9.4, 14.9, '#1: 34,000 soldiers vs nobody'],
  [19.3, 22.4, 'The most neutral country'], [22.5, 26.4, 'Invaded its neighbour 5 times'], [26.5, 32.8, 'Shells, horses, missiles…'], [32.9, 38.7, '…171 lost soldiers'], [38.8, 42.5, 'Liechtenstein has no army'],
  [46.3, 49.5, 'Gibraltar: British territory'], [49.6, 53.8, 'Spain wants it back'], [54.6, 58.6, '2002: a training exercise'], [58.7, 62.9, 'Marines storm the beach…'], [63.0, 65.2, '…in Spain'],
  [65.4, 69.6, 'Wrong beach'], [69.7, 71.8, 'Gone within minutes'], [72.0, 77.5, '"Sir, we\'ve just invaded Spain"'],
  [81.5, 85.0, '1866: Liechtenstein\'s army'], [85.1, 89.6, '80 soldiers march off to war'], [89.7, 95.6, 'Legend says 81 came back'], [95.7, 100.9, '1868: army abolished'],
  [105.3, 109.7, '2010: dredging the San Juan'], [109.8, 114.3, 'Soldiers raise a flag on Isla Calero'], [114.4, 118.6, '"Check Google Maps"'], [118.7, 124.8, 'The online map was wrong'],
  [125.0, 129.7, 'Costa Rica has no army'], [129.8, 133.6, 'It sent police, and went to court'], [133.7, 138.4, '2015: Costa Rica\'s island'],
  [142.8, 146.0, '1925: Greece and Bulgaria'], [146.1, 150.1, 'A soldier chases his dog'], [150.2, 154.8, 'Shots, then an invasion'], [154.9, 159.6, 'The League of Nations steps in'], [159.7, 162.9, 'The War of the Stray Dog'],
  [168.3, 173.9, '1943: Kiska, occupied by Japan'], [174.0, 178.9, '34,000+ troops, thick fog'], [179.0, 184.8, 'The island was empty'], [184.9, 188.9, 'Friendly fire and a mine'], [189.0, 194.1, '≈300 casualties'],
  [194.3, 198.9, 'Best endings: no army'], [199.0, 204.5, 'Just an awkward apology'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .24, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, H * 1.0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
const CARD_SPANS = [[15.4, 18.8], [43.0, 45.9], [78.0, 81.1], [101.5, 104.9], [139.0, 142.4], [163.5, 167.9]];
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (!CARD_SPANS.some(([a, b]) => t > a && t < b)) scene(ctx, t); cards(ctx, t);
  vignette(ctx); if (t < 204.66) drawText(ctx, t); endCard(ctx, t);
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
