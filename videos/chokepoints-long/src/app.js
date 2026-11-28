/* Six chokepoints, #6 → #1 — Mapheld 16:9 long-form (companion to the Suez Short). renderAt(t) = voice clock incl. breathers. */
'use strict';
const W = 1920, H = 1080, DURATION = 364.86;
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
const V = { world: [22, 14, 7.2], suez0: [32.45, 30.4, 300], bos: [29.0, 41.6, 120], bsea: [33.0, 43.0, 42], pan: [-79.75, 9.15, 230], bab: [43.4, 12.9, 120], afr: [30, 5, 10.5], sue: [32.6, 29.8, 70], mal: [101.2, 3.0, 95], sgp: [103.85, 1.25, 600], hor: [56.4, 26.4, 130] };
const KEYS = [[0, 'suez0', 1], [8.6, 'suez0', 1.03], [10.6, 'world', 1], [32.2, 'world', 1.03], [54.9, 'world', 1], [56.8, 'bos', 1], [72.5, 'bos', 1.04], [74.2, 'bsea', 1], [91.2, 'bsea', 1.03], [93.2, 'pan', 1],
  [142.4, 'pan', 1.04], [144.4, 'bab', 1], [171.8, 'bab', 1.04], [173.6, 'afr', 1], [188.2, 'afr', 1.02], [190.2, 'sue', 1], [221.6, 'sue', 1.04], [223.6, 'mal', 1], [243.4, 'mal', 1.04], [245.2, 'sgp', 1], [252.4, 'sgp', 1.04], [253.8, 'mal', 1],
  [261.9, 'mal', 1.03], [263.8, 'hor', 1], [308.8, 'hor', 1.04], [310.6, 'world', 1], [364.86, 'world', 1.06]];
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
  for (const key of Object.keys(GEO).filter(k => !['suezc', 'panc', 'bosp'].includes(k))) {
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
  let set = PATHS.wide; if (c.z > 25) { const hw = W / 2 / c.z, hh = H / 2 / c.z, la = y => Math.atan(Math.sinh(y * Math.PI / 180)) * 180 / Math.PI;
    const lo0 = c.cx - hw, lo1 = c.cx + hw, la0 = la(-c.cy - hh), la1 = la(-c.cy + hh); let best = null;
    for (const [k, b] of Object.entries(REGIONS)) if (lo0 >= b[0] && lo1 <= b[2] && la0 >= b[1] && la1 <= b[3]) { const area = (b[2] - b[0]) * (b[3] - b[1]); if (!best || area < best[1]) best = [k, area]; }
    if (best) set = PATHS[best[0]]; }
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
function donut(ctx, x, y, r, frac, k, label, sub) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.lineWidth = r * 0.42;
  ctx.strokeStyle = 'rgba(10,24,32,0.85)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  ctx.strokeStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + 6.283 * frac * clamp(k)); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.restore(); styledText(ctx, label, x, y, r * 0.62, { k, fill: C.yellow, stroke: C.goldDark }); if (sub) chip(ctx, sub, x, y + r * 1.55, k, { size: 30 }); }
// ------------------------------------------------------------------ chokepoint helpers
const fmtN = n => Math.round(n).toLocaleString('en-US');
const pts = k => { const r = GEO[k][0], o = []; for (let i = 0; i < r.length; i += 2) o.push([r[i], r[i + 1]]); return o; };
const SUEZC = pts('suezc'), PANC = pts('panc'), BOSP = pts('bosp');
const CP = [   // number, name, lon, lat
  [6, 'BOSPORUS', 29.05, 41.1], [5, 'PANAMA CANAL', -79.7, 9.1], [4, 'BAB EL-MANDEB', 43.3, 12.6], [3, 'SUEZ CANAL', 32.45, 30.4], [2, 'MALACCA', 101.0, 3.0], [1, 'HORMUZ', 56.3, 26.6]];
const SHIPC = ['#E63946', '#F4A300', '#2A9D8F', '#3A86FF', '#F4D03F'];
function topShip(ctx, x, y, len, rot, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const w = len * 0.15;
  ctx.fillStyle = o.hull || '#1F3B73'; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, len * 0.012);
  ctx.beginPath(); ctx.moveTo(-len / 2, -w / 2); ctx.lineTo(len * 0.38, -w / 2); ctx.quadraticCurveTo(len / 2, 0, len * 0.38, w / 2); ctx.lineTo(-len / 2, w / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  const n = Math.max(3, Math.round(len / 40)); for (let i = 0; i < n; i++) { ctx.fillStyle = SHIPC[(i + (o.seed || 0)) % 5]; ctx.fillRect(-len * 0.4 + i * (len * 0.68 / n), -w * 0.36, len * 0.68 / n - 2, w * 0.72); }
  ctx.fillStyle = '#F4F1EA'; ctx.fillRect(-len * 0.48, -w * 0.4, len * 0.08, w * 0.8); ctx.restore(); }
function tanker(ctx, x, y, len, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const w = len * 0.16; ctx.fillStyle = '#7A1F1F'; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, len * 0.012);
  ctx.beginPath(); ctx.moveTo(-len / 2, -w / 2); ctx.lineTo(len * 0.38, -w / 2); ctx.quadraticCurveTo(len / 2, 0, len * 0.38, w / 2); ctx.lineTo(-len / 2, w / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#C9A227'; ctx.lineWidth = Math.max(2, w * 0.18); ctx.beginPath(); ctx.moveTo(-len * 0.35, 0); ctx.lineTo(len * 0.3, 0); ctx.stroke(); ctx.fillStyle = '#F4F1EA'; ctx.fillRect(-len * 0.48, -w * 0.4, len * 0.1, w * 0.8); ctx.restore(); }
function cpRing(ctx, c, i, k, t, col = C.gold, label = true) {
  if (k <= 0) return; const [n, name, lo, la] = CP[i]; const [x, y] = P(c, lo, la); ctx.save(); ctx.globalAlpha = k; ring(ctx, x, y, 34, t + i * 0.2, col);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.restore();
  if (label) { const off = { 0: [0, -50], 1: [0, 50], 2: [60, 40], 3: [-70, -40], 4: [0, 50], 5: [60, -40] }[i]; chip(ctx, `#${n} ${name}`, x + off[0], y + off[1], k, { size: 22 }); } }
function lineGlow(ctx, c, P_, col, w, k = 1, dash) { const sp = P_.map(p => P(c, p[0], p[1])); const path = partial(sp, k); if (!path) return; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.lineWidth = w; ctx.stroke(path); ctx.restore(); }
function numCard(ctx, t, t0, t1, n, name) {   // big gold "#N" stamp at each countdown step
  const k = win(t, t0, t1, 0.3, 0.3); if (k <= 0) return; ctx.save(); ctx.globalAlpha = 0.55 * clamp(k); ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.translate(W / 2, 470); ctx.scale(k, k); ctx.fillStyle = 'rgba(11,13,18,0.9)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, 170, 0, 7); ctx.fill(); ctx.stroke();
  setFont(ctx, 'Montserrat', 180); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`#${n}`, 0, 12); ctx.restore();
  styledText(ctx, name, W / 2, 740, 74, { k, fill: '#FFFFFF', stroke: C.ink, rot: -2 }); }
function countdownRow(ctx, t, lit, k = 1) {   // six badges along the top; the active one glows
  if (k <= 0) return; for (let i = 0; i < 6; i++) { const n = 6 - i, x = W / 2 - 375 + i * 150, on = n === lit, done = lit && n > lit;
    ctx.save(); ctx.globalAlpha = k * (done ? 0.45 : 1); ctx.translate(x, 70); ctx.scale(on ? 1.15 : 1, on ? 1.15 : 1); ctx.fillStyle = on ? C.gold : 'rgba(11,13,18,0.85)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill(); ctx.stroke();
    setFont(ctx, 'Montserrat', 30); ctx.fillStyle = on ? C.ink : C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`#${n}`, 0, 2); ctx.restore(); } }
function canalTop(ctx, t, A, ang, o = {}) {   // top-down canal cutaway with the Ever Given (16:9)
  if (A <= 0) return; ctx.save(); ctx.globalAlpha = A; ctx.fillStyle = '#E3C98B'; ctx.fillRect(0, 0, W, H); const r = rnd(5); ctx.fillStyle = 'rgba(180,140,80,0.35)'; for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 30 + r() * 60, 8 + r() * 10, 0, 0, 7); ctx.fill(); }
  const cw = 420, x0 = W / 2 - cw / 2; const g = ctx.createLinearGradient(x0, 0, x0 + cw, 0); g.addColorStop(0, '#1E6FA8'); g.addColorStop(0.5, '#3FA9E0'); g.addColorStop(1, '#1E6FA8'); ctx.fillStyle = g; ctx.fillRect(x0, 0, cw, H);
  ctx.strokeStyle = '#B8935A'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, H); ctx.moveTo(x0 + cw, 0); ctx.lineTo(x0 + cw, H); ctx.stroke();
  topShip(ctx, W / 2, o.y || 540, 600, ang, {}); ctx.restore(); }
function digger(ctx, x, y, s, t) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.roundRect(-60, -10, 120, 30, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F4C430'; ctx.fillRect(-46, -60, 70, 50); ctx.strokeRect(-46, -60, 70, 50); const a = -0.6 + Math.sin(t * 5) * 0.35; ctx.save(); ctx.translate(24, -40); ctx.rotate(a); ctx.fillRect(0, -8, 80, 16); ctx.strokeRect(0, -8, 80, 16); ctx.translate(80, 0); ctx.rotate(1.2 + Math.sin(t * 5) * 0.4); ctx.fillRect(0, -6, 60, 12); ctx.strokeRect(0, -6, 60, 12); ctx.restore(); ctx.restore(); }
function tollbooths16(ctx, t, A, blocked) {   // 10 lanes flowing right into 6 booths
  if (A <= 0) return; ctx.save(); ctx.globalAlpha = A; ctx.fillStyle = '#2B2D33'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1C1F26'; ctx.beginPath(); ctx.moveTo(1000, 0); ctx.lineTo(1400, 300); ctx.lineTo(W, 300); ctx.lineTo(W, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(1000, H); ctx.lineTo(1400, 780); ctx.lineTo(W, 780); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#F4D03F'; ctx.lineWidth = 3; ctx.setLineDash([28, 24]); for (let i = 1; i < 10; i++) { const y = 110 + i * 80; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(980, y); ctx.stroke(); } ctx.setLineDash([]);
  for (let b = 0; b < 6; b++) { const by = 330 + b * 80; ctx.fillStyle = '#F4F1EA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.fillRect(1430, by - 22, 50, 44); ctx.strokeRect(1430, by - 22, 50, 44); const closed = blocked && b === 2;
    ctx.strokeStyle = closed ? '#FF3B3B' : '#7CFC9A'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(1480, by); ctx.lineTo(closed ? 1580 : 1520, closed ? by : by - 40); ctx.stroke(); }
  for (let lane = 0; lane < 10; lane++) for (let i = 0; i < 6; i++) { const y = 150 + lane * 80, base = 900 - i * 170, x = base + (blocked ? 0 : ((t * 140 + lane * 33) % 170)); ctx.save(); ctx.translate(x, y); ctx.scale(1, 1.7); topShip(ctx, 0, 0, 130, 0, { seed: lane + i, hull: '#3A5BA0' }); ctx.restore(); }
  ctx.restore(); }
function icon(ctx, kind, x, y, s, k) {   // everyday items + small symbols
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.fillStyle = 'rgba(11,13,18,0.85)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.fill(); ctx.stroke();
  setFont(ctx, 'Montserrat', 70); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText({ phone: '📱', coffee: '☕', shoe: '👟', fuel: '⛽', wheat: '🌾', corn: '🌽', oil: '🛢️', money: '💰', doc: '📄', truck: '🚚', train: '🚆', box: '📦', sun: '☀️', cloud: '🌧️', tank: '🛢️' }[kind] || '?', 0, 6); ctx.restore(); }
function lockSection(ctx, t, A, level, rise) {   // Panama locks cross-section: steps up to Gatun Lake (level 0..1 = lake height)
  if (A <= 0) return; ctx.save(); ctx.globalAlpha = A; cutWorld(ctx, 1, 'blueprint', t);
  const steps = [[160, 760], [520, 640], [880, 520], [1240, 520]]; ctx.fillStyle = '#5E513F'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(100, 900); ctx.lineTo(100, 780); steps.forEach(([x, y], i) => { ctx.lineTo(x, y + 40); ctx.lineTo(x + 360, y + 40); }); ctx.lineTo(1820, 560); ctx.lineTo(1820, 900); ctx.closePath(); ctx.fill(); ctx.stroke();
  const lakeTop = lerp(560, 400, level); ctx.fillStyle = '#3FA9E0'; ctx.fillRect(1240, lakeTop, 580, 560 - lakeTop + 4); ctx.fillStyle = '#3FA9E0'; steps.slice(0, 3).forEach(([x, y]) => ctx.fillRect(x, y - 30, 360, 70));
  setFont(ctx, 'Montserrat', 34); ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.fillText('GATUN LAKE', 1530, lakeTop - 20); ctx.fillText('SEA', 200, 860);
  const step = Math.min(2, Math.floor(rise * 3)), sy = steps[step][1] - 30; ctx.save(); ctx.translate(steps[step][0] + 180, sy); ctx.fillStyle = '#1F3B73'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-140, -10); ctx.lineTo(140, -10); ctx.lineTo(110, 20); ctx.lineTo(-110, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 5; i++) { ctx.fillStyle = SHIPC[i]; ctx.fillRect(-100 + i * 40, -40, 36, 30); } ctx.restore();
  ctx.restore(); }
function carriers(ctx, t, A) {   // eight aircraft carriers end to end across the Phillips Channel
  if (A <= 0) return; ctx.save(); ctx.globalAlpha = A; for (let i = 0; i < 8; i++) { const k = pop(t - 249.8 - i * 0.12); if (k <= 0) continue; ctx.save(); ctx.translate(250 + i * 200, 560); ctx.scale(k, k); ctx.fillStyle = '#7A8590'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-96, -26); ctx.lineTo(96, -26); ctx.lineTo(80, 26); ctx.lineTo(-90, 26); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#4A535C'; ctx.fillRect(30, -40, 22, 14); ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(70, 0); ctx.stroke(); ctx.restore(); }
  ctx.restore(); }

// ------------------------------------------------------------------ the story
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  // map overlays that persist: canal + Bosporus lines when zoomed
  if (c.z > 40) { lineGlow(ctx, c, SUEZC, '#3FA9E0', Math.max(5, c.z * 0.03)); lineGlow(ctx, c, PANC, '#3FA9E0', Math.max(5, c.z * 0.03)); lineGlow(ctx, c, BOSP, '#3FA9E0', Math.max(5, c.z * 0.05)); }
  // ---------- P1 (0–8.8): recap: one stuck ship, 12%, six days
  if (t < 9.2) {
    const shove = easeOut(clamp((t - 1.2) / 0.9)); canalTop(ctx, t, 1 - clamp((t - 8.4) / 0.6), -Math.PI / 2 + 0.83 * Math.max(shove, t < 1.2 ? 1 : 0));
    if (t < 1.9) kinetic(ctx, 'ONE STUCK SHIP', 150, 1, 96);
    stamp(ctx, 'STUCK', 1500, 300, t, 1.9, { size: 70, until: 8.4 });
    odometer(ctx, t, 4.4, 0.8, 0, 12, (v, u) => `${Math.round(v)}% OF WORLD TRADE FROZEN`, W / 2, 150, 74, { k: popOut(8.4 - t) });
    chip(ctx, '📅 SIX DAYS', 1500, 820, win(t, 6.6, 8.4), { size: 46 });
  }
  // ---------- P2–P3 (8.8–32.4): one of six · 80% by sea · everyday items · the countdown
  if (t > 8.8 && t < 32.6) {
    const k = popOut(32.4 - t, 0.3);
    chip(ctx, 'JUST ONE OF SIX', W / 2, 120, win(t, 9.9, 11.6), { size: 46 });
    odometer(ctx, t, 11.9, 0.8, 0, 80, (v, u) => `${Math.round(v)}% OF GOODS GO BY SEA`, W / 2, 140, 76, { k: t < 15.3 ? 1 : popOut(15.6 - t) });
    // shipping lanes converging on the chokepoints
    const lanes = [[[-74, 40], [-79.7, 9.1], [-120, 10]], [[-5, 48], [29.05, 41.1], [36, 44]], [[-5, 36], [32.45, 30.4], [43.3, 12.6], [56, 13], [56.3, 26.6]], [[56, 13], [80, 6], [101, 3], [115, 15]], [[-5, 36], [-20, 0], [20, -36], [56, -10], [80, 6]]];
    lanes.forEach((ln, i) => lineGlow(ctx, c, ln, C.gold, 5, clamp((t - 12.4 - i * 0.3) / 1.4) * k, [6, 10]));
    for (let i = 0; i < 6; i++) cpRing(ctx, c, i, pop(t - 17.5 - i * 0.12) * k, t, C.gold, t > 17.5);
    styledText(ctx, 'SIX TINY GAPS', W / 2, 140, 84, { k: win(t, 15.4, 19.4), fill: C.yellow, stroke: C.goldDark, rot: -2 });
    [['phone', 19.6], ['coffee', 20.2], ['shoe', 20.9], ['fuel', 21.5]].forEach(([kd, t0], i) => icon(ctx, kd, W - 150, 200 + i * 160, 0.9, win(t, t0, 26.9)));
    [['KANSAS', -98, 38.5, 23.1], ['TORONTO', -79.4, 43.7, 23.7], ['SYDNEY', 151.2, -33.9, 24.3], ['ENGLISH MIDLANDS', -1.9, 52.5, 25.4]].forEach(([n, lo, la, t0]) => { const [x0, y] = P(c, lo, la), hw = n.length * 9 + 30, x = clamp(x0, 30 + hw, W - 30 - hw); if (x0 > -50 && x0 < W + 50) chip(ctx, n, x, y, win(t, t0, 26.9), { size: 24 }); });
    // P3: the countdown promise
    if (t > 27.1) { countdownRow(ctx, t, 0, pop(t - 27.2) * k); styledText(ctx, 'COUNTING DOWN: #6 → #1', W / 2, 220, 72, { k: win(t, 28.4, 32.3), fill: C.yellow, stroke: C.goldDark, rot: -2 }); }
  }
  // ---------- P4 (32.4–55.1): why traffic jams? geometry · detours · the tollbooth highway
  if (t > 32.3 && t < 55.2) {
    const k = popOut(55.0 - t, 0.3);
    if (t < 48.9) {
      odometer(ctx, t, 33.6, 0.8, 0, 70, (v, u) => `${Math.round(v)}% WATER… SO WHY JAMS?`, W / 2, 140, 70, { k: t < 36.4 ? 1 : popOut(36.6 - t) });
      styledText(ctx, 'GEOMETRY.', W / 2, 140, 96, { k: win(t, 36.6, 39.6), fill: C.yellow, stroke: C.goldDark, rot: -2 });
      if (t > 37.3) { ctx.save(); ctx.globalAlpha = 0.3 * clamp((t - 37.4) / 0.4) * popOut(48.8 - t); for (const p of PATHS.wide) { ctx.save(); ctx.setTransform(camMatrix(c)); ctx.strokeStyle = C.gold; ctx.lineWidth = 4 / c.z; ctx.stroke(p); ctx.restore(); } ctx.restore(); }
      lineGlow(ctx, c, [[-5, 36], [-17, 15], [-10, -20], [20, -38], [45, -20], [56, 13]], '#FF6B6B', 6, clamp((t - 39.7) / 1.0) * k, [10, 10]);
      lineGlow(ctx, c, [[-60, 10], [-45, -10], [-55, -40], [-68, -57], [-80, -40], [-80, -10]], '#FF6B6B', 6, clamp((t - 40.7) / 1.0) * k, [10, 10]);
      chip(ctx, '+ THOUSANDS OF MILES', 1500, 820, win(t, 41.4, 48.7), { size: 40, stroke: '#FF6B6B' }); chip(ctx, '+ WEEKS AT SEA', 1500, 900, win(t, 42.5, 48.7), { size: 40, stroke: '#FF6B6B' });
      if (t > 46.1) { for (let i = 0; i < 6; i++) cpRing(ctx, c, i, pop(t - 46.2 - i * 0.1) * k, t, C.gold, false); styledText(ctx, 'SO SHIPS TAKE THE SHORTCUTS', W / 2, 140, 64, { k: win(t, 46.2, 48.8), fill: C.yellow, stroke: C.goldDark, rot: -2 }); }
    } else { tollbooths16(ctx, t, win(t, 48.9, 55.0, 0.35, 0.3), t > 52.6); chip(ctx, 'A 10-LANE HIGHWAY…', 520, 120, win(t, 49.1, 52.0), { size: 44 }); chip(ctx, '…INTO 6 TOLLBOOTHS', 520, 120, win(t, 52.0, 54.9), { size: 44 }); }
  }
  // countdown row stays on screen through the countdown (#6 at 55 → #1 at 262)
  const lit = t < 55 ? 0 : t < 91.3 ? 6 : t < 142.5 ? 5 : t < 188.3 ? 4 : t < 221.7 ? 3 : t < 262 ? 2 : t < 308.9 ? 1 : 0;
  if (t > 55 && t < 308.9) countdownRow(ctx, t, lit, 1);
  // ---------- #6 BOSPORUS (55.1–91.3)
  numCard(ctx, t, 55.1, 57.0, 6, 'THE BOSPORUS');
  if (t > 56.8 && t < 91.4) {
    const k = popOut(91.3 - t, 0.3);
    if (t < 63.3) { chip(ctx, 'THE NARROWEST STRAIT IN WORLD SHIPPING', W / 2, 170, win(t, 57.2, 63.2), { size: 36 }); const [x, y] = P(c, 29.05, 41.1); ring(ctx, x, y, 60, t, C.gold); }
    if (t > 63.3 && t < 72.6) { const [e1, e2] = [P(c, 26.5, 42.3), P(c, 31.8, 40.4)]; goldLabel(ctx, 'EUROPE', ...e1, 52, pop(t - 63.9)); goldLabel(ctx, 'ASIA', ...e2, 52, pop(t - 64.3));
      const [ix, iy] = P(c, 29.0, 41.05); goldLabel(ctx, 'ISTANBUL', ix - 180, iy + 40, 46, pop(t - 67.4)); chip(ctx, 'THE BOSPORUS', ix + 200, iy - 60, pop(t - 65.1), { size: 36 });
      odometer(ctx, t, 69.4, 0.8, 0, 0.5, (v, u) => u < 1 ? `${v.toFixed(2)} MILE WIDE` : '½ MILE WIDE (≈ 750 m)', W / 2, 170, 76, { k: popOut(72.5 - t) });
      // inset: a tanker sliding through the city
      const kk = win(t, 66.0, 72.5); if (kk > 0) { ctx.save(); ctx.translate(380, 760); ctx.scale(kk, kk); ctx.fillStyle = '#E59866'; ctx.fillRect(-260, -200, 520, 300); ctx.fillStyle = '#1E6FA8'; ctx.fillRect(-260, 40, 520, 60);
        const r = rnd(4); for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const x = sd * (90 + i * 44), h = 60 + r() * 100; ctx.fillStyle = i % 2 ? '#C9A27A' : '#E8D8B0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillRect(x - 18, 40 - h, 36, h); ctx.strokeRect(x - 18, 40 - h, 36, h); }
        const sx = lerp(-300, 300, clamp((t - 66.0) / 6.0)); ctx.fillStyle = '#7A1F1F'; ctx.fillRect(sx - 70, 22, 140, 22); ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.strokeRect(-260, -200, 520, 300); ctx.restore(); } }
    if (t > 72.6) {
      const [bx, by] = P(c, 29.05, 41.1), [sx2, sy2] = P(c, 34, 43.5); sarrow(ctx, sx2, sy2, bx + 20, by - 10, clamp((t - 74.5) / 0.8) * k, C.gold, 12); styledText(ctx, 'THE ONLY WAY OUT', W / 2, 170, 76, { k: win(t, 74.5, 77.2), fill: C.yellow, stroke: C.goldDark, rot: -2 });
      [['wheat', 77.4], ['corn', 77.8], ['oil', 78.4]].forEach(([kd, t0], i) => { const u = clamp((t - t0) / 3.0); const [x0, y0] = P(c, 33 + i * 2, 45.5 - i * 0.8); icon(ctx, kd, lerp(x0, bx, easeIO(u)), lerp(y0, by, easeIO(u)), 0.6, pop(t - t0) * (u < 1 ? 1 : 0) * k); });
      [['UKRAINE', 31, 49.0, 78.9], ['RUSSIA', 44, 48.5, 79.5], ['KAZAKHSTAN', 50.5, 47.2, 79.9]].forEach(([n, lo, la, t0]) => { const [x, y] = P(c, lo, la); chip(ctx, n, x, y, pop(t - t0) * popOut(83.5 - t), { size: 28 }); });
      if (t > 83.6) { person(ctx, 'turkey_key', 260, 960, 320, { k: pop(t - 83.7) * k }); chip(ctx, '📜 1936 TREATY: TURKEY HOLDS THE KEY', W / 2 + 120, 170, win(t, 83.7, 88.2), { size: 36 }); }
      chip(ctx, '🌾 FOOD PRICES ⬆ WORLDWIDE', W / 2 + 120, 170, win(t, 88.3, 91.2), { size: 40, stroke: '#FF6B6B' });
    }
  }
  // ---------- #5 PANAMA (91.3–142.5)
  numCard(ctx, t, 91.4, 93.4, 5, 'THE PANAMA CANAL');
  if (t > 93.2 && t < 142.6) {
    const k = popOut(142.4 - t, 0.3);
    if (t < 99.6) { chip(ctx, 'A 50-MILE SHORTCUT', W / 2, 170, win(t, 93.4, 97.7), { size: 44 }); icon(ctx, 'cloud', 1650, 380, 1, win(t, 97.8, 99.5)); styledText(ctx, '…THAT RUNS ON RAIN?', W / 2, 170, 76, { k: win(t, 97.8, 99.5), fill: C.yellow, stroke: C.goldDark, rot: -2 }); }
    if (t > 99.6 && t < 113.6) { const [px, py] = P(c, -79.75, 9.15); goldLabel(ctx, 'PANAMA CANAL', px, py - 230, 54, pop(t - 101.8));
      odometer(ctx, t, 103.6, 1.0, 0, 8000, (v, u) => `SAVES ${fmtN(v)} MILES`, W / 2, 170, 74, { k: t < 106.8 ? 1 : popOut(107.0 - t) });
      chip(ctx, '≈ 5% OF GLOBAL SEA TRADE', 1500, 760, win(t, 107.1, 113.4), { size: 38 }); chip(ctx, '≈ 40% OF US CONTAINER TRAFFIC', 1500, 850, win(t, 109.5, 113.4), { size: 38 });
      for (let i = 0; i < 4; i++) { const u = ((t * 0.12 + i / 4) % 1); const [x, y] = P(c, lerp(-79.92, -79.57, u), lerp(9.38, 8.95, u)); topShip(ctx, x, y, 40, 2.0, { seed: i }); } }
    if (t > 113.4) {
      const lv = t < 126.2 ? 1 : 1 - 0.75 * easeOut(clamp((t - 126.9) / 4.0)); lockSection(ctx, t, win(t, 113.5, 142.4, 0.35, 0.3), lv, clamp((t - 117.0) / 6.0));
      chip(ctx, 'LOCKS LIFT SHIPS OVER THE MOUNTAINS', W / 2, 170, win(t, 116.2, 119.9), { size: 38 });
      odometer(ctx, t, 122.9, 1.0, 0, 50, (v, u) => `${Math.round(v)} MILLION GALLONS PER SHIP`, W / 2, 170, 70, { k: t < 126.1 ? 1 : popOut(126.3 - t) });
      if (t > 126.2) { icon(ctx, 'sun', 1700, 220, 1.1, pop(t - 126.8) * k); chip(ctx, '☀️ DROUGHT: 2023–2024', W / 2, 170, win(t, 126.8, 131.8), { size: 44 });
        const cr = t < 133.6 ? 38 : Math.round(lerp(38, 22, easeOut(clamp((t - 133.6) / 1.2)))); chip(ctx, `${cr} CROSSINGS / DAY`, W / 2, 170, win(t, 131.9, 136.2), { size: 50, stroke: cr < 30 ? '#FF6B6B' : C.gold });
        person(ctx, 'panama_sign', 260, 960, 320, { k: pop(t - 132.0) * k }); chip(ctx, '⏳ UP TO 3 WEEKS IN LINE', W / 2, 170, win(t, 136.3, 139.7), { size: 44 }); chip(ctx, '💰 MILLIONS PAID AT AUCTION', W / 2, 170, win(t, 139.8, 142.3), { size: 44 }); }
    }
  }
  // ---------- #4 BAB EL-MANDEB (142.5–188.3)
  numCard(ctx, t, 142.6, 144.6, 4, 'BAB EL-MANDEB');
  if (t > 144.4 && t < 188.4) {
    const k = popOut(188.2 - t, 0.3);
    if (t < 172) {
      const [bx, by] = P(c, 43.35, 12.6);
      odometer(ctx, t, 143.7, 0.7, 0, 18, (v, u) => `${Math.round(v)} MILES WIDE`, W / 2, 170, 80, { k: t > 144.6 ? win(t, 144.6, 149.0) : 0 });
      goldLabel(ctx, 'RED SEA', ...P(c, 40.3, 15.2), 50, pop(t - 150.2)); chip(ctx, 'BAB EL-MANDEB', bx + 200, by - 40, pop(t - 151.4), { size: 36 }); goldLabel(ctx, 'YEMEN', ...P(c, 46.5, 15.0), 50, pop(t - 153.4)); goldLabel(ctx, 'HORN OF AFRICA', ...P(c, 46.0, 10.9), 44, pop(t - 153.9));
      if (t < 159.6) { lineGlow(ctx, c, [[47, 11.5], [43.4, 12.6], [41, 15], [38, 19.5]], C.gold, 8, clamp((t - 155.6) / 1.4), [8, 10]); chip(ctx, 'ASIA ⇄ EUROPE: THE FAST ROUTE', W / 2, 170, win(t, 155.6, 159.5), { size: 40 }); }
      if (t > 159.6) { chip(ctx, 'LATE 2023', W / 2, 170, win(t, 159.7, 163.0), { size: 46, stroke: '#FF6B6B' });
        for (let i = 0; i < 5; i++) { const [x, y] = P(c, 42.0 + i * 0.6, 14.6 - i * 0.4); const u = ((t - 161.4 - i * 0.25) % 1.2) / 1.2; if (t > 161.4 + i * 0.25) { ctx.save(); ctx.globalAlpha = (1 - u) * popOut(171.8 - t); ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 20 + u * 50, 0, 7); ctx.stroke(); ctx.restore(); } }
        chip(ctx, '🚀 MISSILES & DRONES', W / 2, 170, win(t, 163.1, 169.1), { size: 44, stroke: '#FF6B6B' });
        const ut = easeIO(clamp((t - 169.2) / 1.6)); for (let i = 0; i < 3; i++) { const [x, y] = P(c, 44.0 + i * 0.7, lerp(12.0, 11.0, ut) - i * 0.3); topShip(ctx, x, y, 50, lerp(-2.2, 0.9, ut), { seed: i }); }
        stamp(ctx, 'RED SEA ABANDONED', W / 2, 260, t, 169.3, { size: 54, until: 171.8 }); }
    } else {
      // around Africa
      lineGlow(ctx, c, [[43.4, 12.6], [32.45, 30.4], [30, 33], [10, 37], [-6, 36]], 'rgba(255,255,255,0.5)', 5, 1, [6, 10]);
      lineGlow(ctx, c, [[50, 12], [52, -5], [40, -25], [20, -36], [10, -25], [5, 0], [-18, 12], [-12, 30], [-6, 36]], C.gold, 7, clamp((t - 176.6) / 2.0), [8, 10]);
      chip(ctx, 'AROUND AFRICA', ...P(c, -6, -12), win(t, 177.0, 188.0), { size: 34 });
      odometer(ctx, t, 179.2, 0.8, 0, 4000, (v, u) => `+${fmtN(v)} MILES`, W / 2, 170, 80, { k: t < 182.8 ? 1 : popOut(183.0 - t) });
      chip(ctx, '+ UP TO 2 WEEKS', 1560, 300, win(t, 180.8, 188.0), { size: 40 });
      icon(ctx, 'fuel', 1500, 520, 0.8, win(t, 182.9, 188.0)); icon(ctx, 'doc', 1660, 520, 0.8, win(t, 183.8, 188.0));
      styledText(ctx, 'RED SEA TRAFFIC: ROUGHLY HALVED', W / 2, 170, 64, { k: win(t, 185.9, 188.1), fill: '#FF6B6B', stroke: C.ink, rot: -2 });
    }
  }
  // ---------- #3 SUEZ (188.3–221.7)
  numCard(ctx, t, 188.4, 190.4, 3, 'THE SUEZ CANAL');
  if (t > 190.2 && t < 221.8) {
    const k = popOut(221.6 - t, 0.3);
    if (t < 197.0) { const [sx, sy] = P(c, 32.45, 30.4); goldLabel(ctx, 'SUEZ CANAL', sx + 220, sy - 40, 54, pop(t - 194.2)); goldLabel(ctx, 'EGYPT', ...P(c, 29.5, 27.0), 54, pop(t - 194.0)); chip(ctx, 'THE DESERT DITCH FROM THAT FAMOUS JAM', W / 2, 170, win(t, 190.5, 196.9), { size: 36 }); }
    else if (t < 206.8) { const shove = easeOut(clamp((t - 199.8) / 1.0)); canalTop(ctx, t, win(t, 197.0, 206.8, 0.35, 0.2), -Math.PI / 2 + 0.83 * shove); chip(ctx, 'MARCH 2021: THE EVER GIVEN', W / 2, 120, win(t, 197.1, 199.7), { size: 42 });
      if (t > 200.6) stamp(ctx, 'BOW STUCK', 1450, 300, t, 200.7, { size: 46, until: 206.7 }); if (t > 201.9) stamp(ctx, 'STERN STUCK', 470, 800, t, 202.0, { size: 46, until: 206.7 }); chip(ctx, '📅 6 DAYS', 1500, 860, win(t, 204.6, 206.7), { size: 46 }); }
    else { odometer(ctx, t, 207.1, 0.7, 0, 12, (v, u) => `${Math.round(v)}% OF GLOBAL TRADE`, W / 2, 170, 76, { k: t < 211.2 ? 1 : popOut(211.4 - t) });
      const [sx, sy] = P(c, 32.5, 30.1); digger(ctx, sx + 160, sy + 60, 0.6 * win(t, 211.3, 213.0), t); ring(ctx, sx, sy, 50, t, '#FF3B3B');
      const n = Math.floor(clamp((t - 213.0) / 3.0) * 60), r = rnd(13); for (let i = 0; i < n; i++) { const north = i % 2 === 0, lo = north ? 31.6 + r() * 3.0 : 32.6 + r() * 2.2, la = north ? 31.6 + r() * 1.2 : 27.6 + r() * 1.8; const [x, y] = P(c, lo, la); topShip(ctx, x, y, 26, north ? 1.57 : -1.57, { seed: i }); }
      odometer(ctx, t, 213.1, 0.8, 0, 400, (v, u) => u < 1 ? `${Math.round(v)} SHIPS` : '400+ SHIPS WAITING', W / 2, 170, 76, { k: t < 216.9 ? 1 : popOut(217.1 - t) });
      odometer(ctx, t, 217.1, 1.0, 0, 9.6, v => `$${v.toFixed(1)} BILLION / DAY`, W / 2, 170, 84, { k });
      person(ctx, 'egypt_panic', 1660, 960, 300, { k: pop(t - 211.5) * k }); }
  }
  // ---------- #2 MALACCA (221.7–262)
  numCard(ctx, t, 221.8, 223.8, 2, 'THE STRAIT OF MALACCA');
  if (t > 223.6 && t < 262.1) {
    const k = popOut(261.9 - t, 0.3);
    if (t < 230.4) styledText(ctx, 'A QUARTER OF WORLD TRADE…', W / 2, 170, 72, { k: win(t, 225.7, 230.3), fill: C.yellow, stroke: C.goldDark, rot: -2 });
    if (t > 230.4 && t < 243.5) { goldLabel(ctx, 'MALAYSIA', ...P(c, 102.5, 4.6), 50, pop(t - 231.2)); goldLabel(ctx, 'INDONESIA', ...P(c, 101.0, -0.8), 50, pop(t - 231.7)); chip(ctx, 'SINGAPORE', ...P(c, 104.6, 1.6), pop(t - 232.4), { size: 30 }); chip(ctx, 'STRAIT OF MALACCA', ...P(c, 98.5, 4.3), pop(t - 233.8), { size: 34 });
      for (let i = 0; i < 10; i++) { const u = ((t * 0.08 + i / 10) % 1); const [x, y] = P(c, lerp(95.5, 104.3, u), lerp(6.0, 1.3, u) + (i % 2 ? 0.25 : -0.25)); (i % 3 === 0 ? tanker : topShip)(ctx, x, y, 48, 0.5, { seed: i }); }
      chip(ctx, '≈ 25% OF SEABORNE TRADE', 1560, 760, win(t, 237.2, 243.4), { size: 38 }); chip(ctx, '≈ 30% OF SEABORNE OIL', 1560, 850, win(t, 239.5, 243.4), { size: 38 }); }
    if (t > 243.5 && t < 252.6) { odometer(ctx, t, 246.5, 0.8, 0, 1.7, (v, u) => `${v.toFixed(1)} MILES WIDE`, W / 2, 170, 80, { k: popOut(252.5 - t) }); chip(ctx, 'NEAR SINGAPORE: THE TIGHTEST POINT', W / 2, 270, win(t, 243.7, 246.4), { size: 36 });
      if (t > 249.6) { cutWorld(ctx, win(t, 249.6, 252.5, 0.3, 0.2), 'blueprint', t); carriers(ctx, t, win(t, 249.6, 252.5, 0.3, 0.2)); styledText(ctx, '≈ 8 AIRCRAFT CARRIERS END TO END', W / 2, 170, 66, { k: win(t, 249.7, 252.5), fill: C.yellow, stroke: C.goldDark, rot: -2 }); } }
    if (t > 252.6) { chip(ctx, 'IF MALACCA CLOSED…', W / 2, 170, win(t, 252.7, 256.2), { size: 46, stroke: '#FF6B6B' });
      [['CHINA', 112, 22, 254.0], ['JAPAN', 108.8, 10.8, 254.5], ['S. KOREA', 109.6, 7.5, 255.4]].forEach(([n, lo, la, t0], i) => { const xy = [1500 + (i - 1) * 0, 300 + i * 80]; chip(ctx, `➜ ${n}`, xy[0], xy[1], win(t, t0, 261.8), { size: 34 }); });
      lineGlow(ctx, c, [[95.5, 5.5], [96.5, 2], [99, -1.5], [102, -4], [104.8, -6.2], [106, -5], [107.5, -2], [108.5, 2]], '#FF6B6B', 7, clamp((t - 256.3) / 1.6), [10, 10]); chip(ctx, 'DETOUR THROUGH INDONESIA', W / 2, 170, win(t, 256.3, 261.8), { size: 42 }); }
  }
  // ---------- #1 HORMUZ (262–308.9)
  numCard(ctx, t, 262.1, 264.2, 1, 'THE STRAIT OF HORMUZ');
  if (t > 264.0 && t < 309.0) {
    const k = popOut(308.8 - t, 0.3);
    if (t < 268.7) chip(ctx, '⛽ GAS PRICES ON EVERY CONTINENT', W / 2, 170, win(t, 264.3, 268.6), { size: 42 });
    goldLabel(ctx, 'IRAN', ...P(c, 56.5, 28.2), 56, pop(t - 269.4) * k); goldLabel(ctx, 'OMAN', ...P(c, 57.5, 24.0), 56, pop(t - 270.0) * k); chip(ctx, 'STRAIT OF HORMUZ', ...P(c, 56.9, 26.9), pop(t - 271.1) * k, { size: 32 });
    if (t > 272 && t < 279.2) { odometer(ctx, t, 273.4, 0.6, 0, 21, (v, u) => `${Math.round(v)} MILES WIDE`, W / 2, 170, 80, { k: popOut(279.1 - t) });
      if (t > 275.5) { lineGlow(ctx, c, [[55.6, 26.0], [56.35, 26.45], [57.0, 26.2]], '#FFFFFF', 6, clamp((t - 275.6) / 0.6), [10, 8]); lineGlow(ctx, c, [[55.7, 26.15], [56.4, 26.6], [57.1, 26.35]], '#FFFFFF', 6, clamp((t - 275.8) / 0.6), [10, 8]); chip(ctx, 'SHIPPING LANES: ~2 MILES EACH WAY', W / 2, 270, win(t, 275.6, 279.0), { size: 34 }); } }
    if (t > 279.1 && t < 293.0) { for (let i = 0; i < 8; i++) { const u = ((t * 0.1 + i / 8) % 1); const [x, y] = P(c, lerp(52, 59.5, u), lerp(26.2, 25.6, u) + Math.sin(u * 6) * 0.3); tanker(ctx, x, y, 46, 0.1); }
      donut(ctx, 1560, 420, 110, 0.2, win(t, 280.7, 292.8), '≈ 1/5', "OF THE WORLD'S OIL"); donut(ctx, 360, 420, 90, 0.2, win(t, 284.4, 292.8), '≈ 1/5', 'OF THE WORLD\'S LNG');
      chip(ctx, 'NO PIPELINE BIG ENOUGH TO REPLACE IT', W / 2, 170, win(t, 289.9, 292.8), { size: 38 }); }
    if (t > 292.9) { chip(ctx, 'EARLY 2026: WAR', W / 2, 170, win(t, 293.0, 296.3), { size: 46, stroke: '#FF6B6B' }); person(ctx, 'iran_gate', 260, 960, 320, { k: pop(t - 295.5) * k });
      const gk = easeOut(clamp((t - 296.3) / 0.6)); if (gk > 0) { const [gx, gy] = P(c, 56.35, 26.5); ctx.save(); ctx.translate(gx - 120, gy); ctx.rotate(-Math.PI / 2 * (1 - gk)); ctx.fillStyle = '#FFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillRect(0, -14, 240, 28); ctx.strokeRect(0, -14, 240, 28); for (let i = 0; i < 4; i++) { ctx.fillStyle = '#D7263D'; ctx.fillRect(14 + i * 58, -14, 30, 28); } ctx.restore(); stamp(ctx, 'CLOSED', 1500, 300, t, 296.5, { size: 70, until: 308.7 }); }
      chip(ctx, 'IEA: THE LARGEST ENERGY SUPPLY SHOCK EVER', W / 2, 170, win(t, 302.4, 307.2), { size: 36, stroke: '#FF6B6B' }); styledText(ctx, '…AND IT ISN\'T OVER', W / 2, 170, 76, { k: win(t, 307.2, 308.8), fill: '#FF6B6B', stroke: C.ink, rot: -2 }); }
  }
  // ---------- the twist (308.9–342.9): ripples reach inland towns
  if (t > 308.8 && t < 343.0) {
    const k = popOut(342.8 - t, 0.3);
    kinetic(ctx, 'THE TWIST', 140, win(t, 309.6, 311.8), 96);
    [['NEW YORK', -74, 40.7, 314.7], ['LONDON', -0.1, 51.5, 315.2], ['SYDNEY', 151.2, -33.9, 315.7]].forEach(([n, lo, la, t0]) => { const [x, y] = P(c, lo, la); if (x < W - 40) chip(ctx, `⚓ ${n}`, x, y, win(t, t0, 319.0), { size: 26 }); });
    chip(ctx, '"ONLY IF YOU LIVE BY A PORT"?', W / 2, 170, win(t, 312.6, 317.3), { size: 40 });
    if (t > 317.4) { for (let i = 0; i < 6; i++) { const [, , lo, la] = CP[i]; const [x, y] = P(c, lo, la); for (let r = 0; r < 2; r++) { const u = ((t * 0.35 + r * 0.5 + i * 0.13) % 1); ctx.save(); ctx.globalAlpha = (1 - u) * 0.8 * k; ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 30 + u * 260, 0, 7); ctx.stroke(); ctx.restore(); } }
      chip(ctx, 'LANDLOCKED TOWNS TOO', W / 2, 170, win(t, 321.8, 324.0), { size: 44 }); chip(ctx, '📦 JUST-IN-TIME: ALMOST ZERO SPARE STOCK', W / 2, 170, win(t, 324.0, 329.5), { size: 36 });
      [['FREIGHT ⬆', 330.9], ['DIESEL ⬆', 331.9], ['CONTAINERS SHORT', 333.2]].forEach(([s2, t0], i) => chip(ctx, s2, 560 + i * 400, 270, win(t, t0, 342.6), { size: 38, stroke: '#FF6B6B' }));
      icon(ctx, 'train', 1560, 520, 0.7, win(t, 335.0, 342.6)); icon(ctx, 'truck', 1720, 520, 0.7, win(t, 335.3, 342.6));
      [['ALBERTA 🛒⬆', -114, 53.5, 339.0], ['KANSAS 🛒⬆', -98, 38.5, 339.6], ['BIRMINGHAM 🛒⬆', -1.9, 52.5, 340.3]].forEach(([n, lo, la, t0]) => { const [x, y] = P(c, lo, la); chip(ctx, n, Math.max(140, x), y, win(t, t0, 342.6), { size: 26, stroke: '#FF6B6B' }); }); }
  }
  // ---------- the punchline + question (342.9–358) and the end card
  if (t > 342.8) {
    for (let i = 0; i < 6; i++) cpRing(ctx, c, i, pop(t - 343.2 - i * 0.12) * (1 - clamp((t - 358.0) / 0.4)), t, C.gold, false);
    styledText(ctx, 'THE WORLD ECONOMY, BALANCED ON 6 STRIPS OF WATER', W / 2, 160, 56, { k: win(t, 346.8, 352.9), fill: C.yellow, stroke: C.goldDark, rot: -2, maxW: 1800 });
  }
  if (t > 357.9) {
    const k = clamp((t - 358.0) / 0.4); ctx.save(); ctx.globalAlpha = 0.78 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    title(ctx, 'THE 6 CHOKEPOINTS', 260, pop(t - 358.1), 110); seal(ctx, 1660, 820, pop(t - 358.7));
    chip(ctx, '🔔 SUBSCRIBE FOR MORE MAP STORIES', W / 2, 820, pop(t - 359.1), { size: 40, bg: '#E62117', fill: '#FFFFFF', stroke: '#7A0C08' });
  }
}
const QUESTION = 'WHICH OF THESE 6 CHOKEPOINTS IS THE RISKIEST RIGHT NOW? 👇';
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .5, H * .45, W / 2, H * .5, H * .95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
const NOSUBS = new URLSearchParams(location.search).has('nosubs');
function drawText(ctx, t) { if (NOSUBS) return; for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .2, .14); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1700 }); } }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); vignette(ctx); if (t < 358.0) drawText(ctx, t);
  if (t > 353.4) { const y = t < 358.0 ? 820 : lerp(820, 560, easeIO((t - 358.0) / 0.5)); styledText(ctx, QUESTION, W / 2, y, 56, { k: pop(t - 353.5), fill: C.yellow, stroke: C.goldDark, rot: -2, maxW: 1800 }); }
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
