/* Switzerland has invaded Liechtenstein 5 times, by accident — Mapheld 9:16 short (punchline ending, scoreboard card). */
'use strict';
const W = 1080, H = 1920, DURATION = 51.72;
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
const V = { alps: [8.2, 46.8, 215], lie: [9.54, 47.14, 2500] };
const KEYS = [[0, 'alps', 1], [8.7, 'alps', 1.05], [9.9, 'lie', 1], [35.9, 'lie', 1.05], [41.0, 'lie', 1], [51.72, 'lie', 1.08]];
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
// ------------------------------------------------------------------ Swiss helpers
const MALBUN = [9.609, 47.101], VADUZ = [9.521, 47.141], SOUTH = [9.505, 47.065], FOREST = [9.575, 47.19], TRIES = [9.56, 47.12];
let tally = 0;
function countries(ctx, c, t) {
  for (const [k, col] of [['deu', '#8A855C'], ['fra', '#8A855C'], ['ita', '#8A855C'], ['aut', '#9A9568']]) fillKey(ctx, c, k, col, 1, null);
  fillKey(ctx, c, 'che', '#DA291C', 0.38, null); fillKey(ctx, c, 'lie', '#F4D03F', 0.5, '#002B7F');
  for (const k of ['deu', 'fra', 'ita', 'aut', 'che', 'lie']) strokeKey(ctx, c, k, '#2C3531', 2.5);
  // the Swiss cross drawn on Switzerland when zoomed out
  if (c.z < 600) { const [x, y] = P(c, 8.2, 46.8); ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.fillRect(x - 22, y - 70, 44, 140); ctx.fillRect(x - 70, y - 22, 140, 44); ctx.restore(); }
}
function scoreboard(ctx, n, k, x = W - 200, y = 140) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = 'rgba(10,24,32,0.92)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-170, -60, 340, 120, 20); ctx.fill(); ctx.stroke();
  setFont(ctx, 'Montserrat', 22); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ACCIDENTAL INVASIONS', 0, -30); setFont(ctx, 'Montserrat', 64); ctx.fillStyle = C.yellow; ctx.fillText(String(n), 0, 18); ctx.restore(); }
function shell(ctx, c, from, to, u, t0, t) { if (u <= 0) return; const p0 = P(c, from[0], from[1]), p1 = P(c, to[0], to[1]); const e = clamp(u); const x = lerp(p0[0], p1[0], e), y = lerp(p0[1], p1[1], e) - Math.sin(e * Math.PI) * 260;
  if (e < 1) { ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); } else { const b = clamp((t - t0) / 0.6); if (b < 1) { ctx.save(); ctx.globalAlpha = 1 - b; ctx.fillStyle = '#FFB703'; ctx.beginPath(); ctx.arc(p1[0], p1[1], 30 + b * 90, 0, 7); ctx.fill(); ctx.fillStyle = '#E85D04'; ctx.beginPath(); ctx.arc(p1[0], p1[1], 15 + b * 50, 0, 7); ctx.fill(); ctx.restore(); } } }
function fire(ctx, x, y, s, t, k) { if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 2); for (let i = 0; i < 5; i++) { const ox = (i - 2) * s * 0.28, h = s * (0.7 + 0.3 * Math.sin(t * 13 + i * 2)) * k;
  for (const [col, m] of [['#E85D04', 1], ['#FFBA08', 0.6]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + ox - s * 0.16 * m, y); ctx.quadraticCurveTo(x + ox - s * 0.1, y - h * m * 0.6, x + ox + Math.sin(t * 9 + i) * 6, y - h * m); ctx.quadraticCurveTo(x + ox + s * 0.1, y - h * m * 0.6, x + ox + s * 0.16 * m, y); ctx.fill(); } } ctx.restore(); }
function tree(ctx, x, y, s) { ctx.fillStyle = '#5A3A1E'; ctx.fillRect(x - 4, y - 10, 8, 16); ctx.fillStyle = '#2E7D32'; ctx.strokeStyle = '#1B4D1F'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x + s * 0.8, y - 6); ctx.lineTo(x - s * 0.8, y - 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
function cloud(ctx, x, y, s, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#5E6E74'; for (const [dx, dy, r] of [[0, 0, 1], [0.9, 0.1, 0.8], [-0.9, 0.15, 0.75], [0.4, -0.5, 0.75]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill(); } ctx.restore(); }

// ------------------------------------------------------------------ the story
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c); countries(ctx, c, t);
  // running tally of accidental invasions (the gag)
  tally = t < 9.0 ? 0 : t < 13.7 ? 1 : t < 19.5 ? 2 : t < 24.2 ? 3 : t < 29.7 ? 4 : 5;
  if (t > 8.9 && t < 49.7) scoreboard(ctx, tally, pop(t - 9.0) * popOut(49.6 - t), W - 200, 150);
  // ---------------- B1 hook (0–8.83)
  if (t < 9.0) {
    const [sx, sy] = P(c, 8.2, 46.8), [lx, ly] = P(c, 9.54, 47.14);
    styledText(ctx, 'SWITZERLAND', sx, sy + 130, 56, { fill: '#fff', stroke: C.ink, k: 1 });
    styledText(ctx, 'THE MOST NEUTRAL\nCOUNTRY ON EARTH', W / 2, 330, 84, { fill: C.yellow, stroke: C.goldDark, rot: -3, k: t < 3.8 ? 1 : popOut(4.2 - t, 0.3) });
    stamp(ctx, '🕊️ NEUTRAL', W / 2, 560, t, 2.8, { size: 56, color: '#1E8E3E', until: 4.1 });
    if (t > 5.6) { ring(ctx, lx, ly, 60, t, '#FFD83D'); goldLabel(ctx, 'LIECHTENSTEIN', lx - 170, ly - 110, 50, pop(t - 5.8)); }
    styledText(ctx, 'INVADED IT\n5 TIMES', W / 2, 330, 104, { fill: '#FF6B6B', stroke: C.ink, rot: -3, k: win(t, 4.8, 7.6) });
    styledText(ctx, '…BY ACCIDENT', W / 2, 330, 110, { fill: C.yellow, stroke: C.goldDark, rot: -3, k: win(t, 7.7, 9.0) });
    person(ctx, 'swiss_map', 300, 1500, 320, { k: pop(t - 7.6) });
  }
  // ---------------- B2 1968 shells + 1976 packhorses (8.83–19.32)
  if (t > 8.8 && t < 19.4) {
    const [mx, my] = P(c, ...MALBUN); sprite(ctx, 'chalet', mx, my, 170, { ay: 0.9, k: pop(t - 9.6) * popOut(13.5 - t) });
    kinetic(ctx, '1968', 330, win(t, 8.9, 10.3), 130); goldLabel(ctx, 'THE ONLY SKI RESORT', mx - 30, my + 70, 40, pop(t - 12.2) * popOut(13.5 - t));
    for (let i = 0; i < 5; i++) shell(ctx, c, [9.44, 47.18 - i * 0.012], [MALBUN[0] + (i - 2) * 0.004, MALBUN[1] + (i % 2) * 0.004], (t - 10.3 - i * 0.18) / 0.9, 11.2 + i * 0.18, t);
    if (t > 13.6) { kinetic(ctx, '1976', 330, win(t, 13.6, 15.3), 130); chip(ctx, '75 SOLDIERS + PACK HORSES', W / 2, 460, win(t, 15.3, 17.8), { size: 38 });
      const u = clamp((t - 15.0) / 3.6); for (let i = 0; i < 3; i++) { const lo = lerp(9.47, 9.56, u) - i * 0.055, la = 47.072 + (i % 2) * 0.006; const [x, y] = P(c, lo, la); person(ctx, i === 1 ? 'swiss_map' : 'swiss_march', x, y + Math.abs(Math.sin(t * 6 + i)) * -6, 170, { k: pop(t - 14.8 - i * 0.1) }); }
      const [hx, hy] = P(c, lerp(9.47, 9.56, u) - 0.165, 47.064); sprite(ctx, 'packhorse', hx, hy, 190, { ay: 0.95, k: pop(t - 15.6) });
      if (t > 16.8) { const [bx, by] = P(c, 9.497, 47.085); chip(ctx, '↩ WRONG TURN', bx + 40, by - 230, pop(t - 16.9), { size: 36, bg: C.gold, fill: C.ink, stroke: C.goldDark }); } }
  }
  // ---------------- B3 1985 missiles + 1992 orders (19.32–29.46)
  if (t > 19.3 && t < 29.5) {
    kinetic(ctx, '1985', 330, win(t, 19.4, 20.6), 130);
    const storm = win(t, 19.6, 24.0); for (let i = 0; i < 4; i++) cloud(ctx, 150 + i * 260, 520 + (i % 2) * 40, 80, 0.85 * storm);
    if (storm > 0) { ctx.save(); ctx.globalAlpha = 0.6 * storm; ctx.strokeStyle = '#BFE6F2'; ctx.lineWidth = 3; const r = rnd(3); for (let i = 0; i < 60; i++) { const x = r() * W, y = 560 + ((r() * 900 + t * 700) % 900); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 20); ctx.stroke(); } ctx.restore(); }
    const [fx, fy] = P(c, ...FOREST); const mu = clamp((t - 20.5) / 1.2);
    if (mu > 0 && mu < 1) sprite(ctx, 'missile', lerp(-150, fx, mu), lerp(700, fy, mu), 200, { rot: 18 });
    if (t > 21.0 && t < 24.1) { for (let i = 0; i < 9; i++) { const tx = fx - 300 + (i % 5) * 140, ty = fy + 60 + Math.floor(i / 5) * 120; tree(ctx, tx, ty, 44); fire(ctx, tx, ty - 20, 100, t + i, clamp((t - 21.7 - i * 0.08) / 0.6)); } chip(ctx, 'FOREST FIRE 🔥', W / 2, 460, win(t, 22.9, 24.0), { size: 40 }); }
    if (t > 24.0) { kinetic(ctx, '1992', 330, win(t, 24.1, 25.3), 130); person(ctx, 'swiss_orders', 330, 1500, 300, { k: pop(t - 24.6) });
      chip(ctx, 'FOLLOWING ORDERS ✓', W / 2, 460, win(t, 25.3, 27.1), { size: 40, stroke: '#7DDC9A' }); stamp(ctx, 'WRONG COUNTRY', W / 2 + 60, 900, t, 28.3, { size: 60, until: 29.4 }); }
  }
  // ---------------- B4 2007: 171 soldiers lost at night (29.46–36.14)
  if (t > 29.4 && t < 36.2) {
    const night = clamp((t - 29.6) / 0.6) * popOut(36.1 - t, 0.4); ctx.save(); ctx.globalAlpha = 0.5 * night; ctx.fillStyle = '#0A1630'; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (night > 0) { ctx.save(); ctx.globalAlpha = night; ctx.fillStyle = '#F4F1EA'; ctx.beginPath(); ctx.arc(860, 560, 50, 0, 7); ctx.fill(); ctx.fillStyle = '#0A1630'; ctx.beginPath(); ctx.arc(880, 545, 44, 0, 7); ctx.fill(); ctx.restore(); }
    kinetic(ctx, '2007', 330, win(t, 29.6, 30.8), 130); styledText(ctx, '171 SOLDIERS', W / 2, 330, 120, { k: win(t, 30.9, 32.5), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    const u = clamp((t - 31.6) / 3.8); for (let i = 0; i < 18; i++) { const row = Math.floor(i / 6), col = i % 6; const lo = lerp(9.46, 9.56, u) - col * 0.028 - row * 0.01, la = 47.085 + row * 0.02; const [x, y] = P(c, lo, la); person(ctx, i === 7 ? 'swiss_map' : 'swiss_march', x, y - Math.abs(Math.sin(t * 6 + i)) * 5, 96, { k: pop(t - 31.4 - i * 0.03) }); }
    chip(ctx, 'LOST AT NIGHT 🌙', W / 2, 330, win(t, 32.6, 33.9), { size: 44 });
    if (t > 34.0) { const [ax, ay] = P(c, 9.473, 47.1), [bx, by] = P(c, 9.493, 47.1); ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.setLineDash([16, 10]); ctx.beginPath(); ctx.moveTo(ax, ay - 140); ctx.lineTo(lerp(ax, bx + 80, clamp((t - 34.1) / 0.6)), ay - 140); ctx.stroke(); ctx.restore(); chip(ctx, '1 MILE+ INTO LIECHTENSTEIN', W / 2, 330, win(t, 34.1, 36.0), { size: 38 }); }
  }
  // ---------------- B6 no army since 1868 + the quote (41.1–49.72)
  if (t > 41.0) {
    person(ctx, 'lie_shrug', W / 2, 1520, 380, { k: pop(t - 41.3) * (t < 49.7 ? 1 : 0), sq: t > 46.2 && t < 46.6 ? 0.06 : 0 });
    styledText(ctx, 'NO ARMY\nSINCE 1868', W / 2, 330, 104, { k: win(t, 42.5, 44.4), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    chip(ctx, '🪖 ARMY: 0 SOLDIERS', W / 2, 560, win(t, 42.8, 44.4), { size: 42, stroke: '#FF6B6B' });
    chip(ctx, 'ASKED ABOUT THE INVASION…', W / 2, 330, win(t, 44.5, 46.9), { size: 42 });
    if (t > 46.9) { bubble(ctx, W / 2, 900, '"Not like they stormed', 40, [0, 90], win(t, 47.0, 49.7)); bubble(ctx, W / 2, 990, 'over here with attack helicopters."', 34, [0, 60], win(t, 47.6, 49.7));
      const hu = clamp((t - 48.2) / 1.0); sprite(ctx, 'heli', lerp(W + 200, W - 260, easeOut(hu)), 600, 260, { k: hu > 0 ? 1 : 0, rot: -6 }); redX(ctx, W - 260, 600, 220, clamp((t - 48.8) / 0.35)); }
    styledText(ctx, 'WHAT WOULD YOUR\nCOUNTRY DO? 👇', W / 2, 330, 72, { k: pop(t - 46.9) * popOut(49.7 - t, 0.2), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  }
  // ---------------- end card (49.72–51.72): the scoreboard
  if (t > 49.6) {
    const k = clamp((t - 49.7) / 0.3); ctx.save(); ctx.globalAlpha = 0.78 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = k; title(ctx, 'ACCIDENTAL\nINVASIONS', 520, pop(t - 49.75), 116);
    const s = pop(t - 49.9); if (s > 0) { ctx.save(); ctx.translate(W / 2, 860); ctx.scale(s, s); sprite(ctx, 'flag_che', -280, 0, 190, {}); sprite(ctx, 'flag_lie', 280, 0, 190, {}); setFont(ctx, 'Montserrat', 150); ctx.fillStyle = C.yellow; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 14; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText('5 – 0', 0, 10); ctx.fillText('5 – 0', 0, 10); ctx.restore(); }
    styledText(ctx, 'WHAT WOULD YOUR\nCOUNTRY DO? 👇', W / 2, 1150, 66, { k: 1, fill: '#fff', stroke: C.ink, rot: -2 });
    ctx.restore();
  }
}
function analogy(ctx, t, k) {   // B5 36.14–41.1: walking into the neighbour's house, five times
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.3); ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H); ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#6AB04C'; ctx.fillRect(0, 1200, W, 300); sprite(ctx, 'house', W / 2 + 120, 1220, 520, { ay: 1 });
  const n = Math.min(5, Math.floor(clamp((t - 37.6) / 2.0) * 5) + (t > 37.6 ? 1 : 0)); const cyc = ((t - 37.6) / 0.4) % 1;
  if (t > 37.4 && t < 39.6) person(ctx, 'swiss_march', lerp(140, W / 2 + 60, cyc), 1300, 230, { k: 1 - (cyc > 0.85 ? (cyc - 0.85) / 0.15 : 0) });
  for (let i = 0; i < n; i++) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); if (i < 4) { ctx.moveTo(380 + i * 50, 520); ctx.lineTo(380 + i * 50, 640); } else { ctx.moveTo(350, 620); ctx.lineTo(560, 540); } ctx.stroke(); }
  chip(ctx, "WALKING INTO YOUR NEIGHBOUR'S HOUSE…", W / 2, 330, win(t, 36.3, 38.2), { size: 36 }); chip(ctx, '…FIVE TIMES', W / 2, 330, win(t, 38.3, 39.3), { size: 44 });
  chip(ctx, '🔓 DOOR STILL UNLOCKED', W / 2, 330, win(t, 39.4, 41.0), { size: 44, bg: '#1E8E3E', fill: '#fff' });
  ctx.restore(); }
const CAPTIONS = [
  [0.0, 3.8, 'The most neutral country…'], [3.9, 7.6, '…invaded its neighbour 5 times'], [7.7, 8.8, 'By accident'],
  [8.9, 13.5, '1968: shells on the ski resort'], [13.6, 18.6, '1976: soldiers and pack horses'],
  [19.4, 23.9, '1985: missiles start a fire'], [24.1, 27.1, '1992: following orders…'], [27.2, 29.3, '…into the wrong country'],
  [29.6, 32.5, '2007: 171 soldiers'], [32.6, 35.6, 'Lost at night, a mile in'],
  [36.3, 40.9, 'Five times, door still open'],
  [41.2, 44.4, 'No army since 1868'], [44.5, 46.9, 'Asked about the invasion…'], [47.0, 49.6, '"No attack helicopters"'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (!(t > 36.5 && t < 40.8)) scene(ctx, t); analogy(ctx, t, clamp((t - 36.14) / 0.35) * clamp((41.1 - t) / 0.35));
  vignette(ctx); if (t < 49.7) drawText(ctx, t);
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
