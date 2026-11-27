/* Canada has more lakes than the rest of the world combined — Mapheld 9:16 short; card, then glides back into frame 1 (loop). */
'use strict';
const W = 1080, H = 1920, DURATION = 57.11;
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
const V = { na: [-98, 50, 6.2], can: [-96.5, 63.5, 11.6], hud: [-85, 59.5, 27] };
const KEYS = [[0, 'na', 1], [9.5, 'na', 1.03], [10.6, 'can', 1], [22.4, 'can', 1.03], [32.8, 'can', 1.03], [46.6, 'can', 1.05], [48.0, 'hud', 1], [54.7, 'hud', 1.04], [56.4, 'hud', 1.04], [57.11, 'na', 1]];
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
  for (const key of Object.keys(GEO).filter(k => !['ponds'].includes(k))) {
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
  const set = c.z > 40 ? PATHS.fine : PATHS.wide;
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
// ------------------------------------------------------------------ lakes helpers
const LAKE = '#5FC3E4', LAKE_DK = '#2B8DB3', ROCK = '#5E5A55', CHEESE = '#F2C14E', HOLE = '#B98A2A';
const PONDS = []; { const g = GEO.ponds, r = rnd(5); for (let i = 0; i < g.length; i += 3) PONDS.push([g[i], g[i + 1], g[i + 2], 0.55 + r() * 0.6, r() * 3.14, r()]); }
function lakePath(c, k) {   // real lakes + stylised ponds (k = share revealed, ponds pop in by their random order)
  const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS.lakes) pp.addPath(p, M);
  for (const [lo, la, s, asp, rot, ord] of PONDS) { if (ord > k) continue; const [x, y] = P(c, lo, la); const r = s * 0.42 * c.z * Math.min(1, (k - ord) * 12 + 0.2); pp.moveTo(x + r, y); pp.ellipse(x, y, r, r * asp, rot, 0, 6.283); }
  return pp; }
function drawLakes(ctx, c, k, col = LAKE, a = 1, rim = LAKE_DK) {
  if (k <= 0 || a <= 0) return; const pp = lakePath(c, k); ctx.save(); ctx.globalAlpha = a * clamp(k * 3); ctx.fillStyle = col; ctx.fill(pp); ctx.strokeStyle = rim; ctx.lineWidth = 1.6; ctx.stroke(pp); ctx.restore(); }
function cheese(ctx, c, k) {
  if (k <= 0) return; fillKey(ctx, c, 'can', CHEESE, k); const pp = lakePath(c, 1);
  ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = HOLE; ctx.fill(pp); ctx.translate(-2, -2); ctx.fillStyle = '#8C6418'; ctx.fill(pp); ctx.restore(); }
function iceSheet(ctx, c, k, a = 1, t = 0) {   // k: wipe from the north (0..1)
  if (k <= 0 || a <= 0) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS.ice) pp.addPath(p, M);
  const [, yN] = P(c, -95, 84), [, yS] = P(c, -95, 38), yE = lerp(yN, yS, easeOut(k));
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); for (let x = W; x >= 0; x -= 30) ctx.lineTo(x, yE + Math.sin(x * 0.02 + k * 9) * 40 + Math.sin(x * 0.051) * 22); ctx.closePath(); ctx.clip(); ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, yN, 0, yS); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#CFEFFF'); ctx.fillStyle = g; ctx.fill(pp);
  ctx.strokeStyle = '#8FD3F0'; ctx.lineWidth = 6; ctx.shadowColor = '#BFF0FF'; ctx.shadowBlur = 20; ctx.stroke(pp); ctx.shadowBlur = 0;
  ctx.clip(pp); ctx.strokeStyle = 'rgba(120,190,220,0.45)'; ctx.lineWidth = 3; const r = rnd(9);
  for (let i = 0; i < 26; i++) { const x = r() * W, y = lerp(yN, yS, r()); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 + r() * 50, y + 10 + r() * 20); ctx.lineTo(x + 60 + r() * 60, y - 8); ctx.stroke(); }
  ctx.restore(); }
function cloud(ctx, x, y, s, k, dark) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.fillStyle = dark ? '#9AA7B0' : '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(-60, 10, 50, 0, 7); ctx.arc(0, -20, 66, 0, 7); ctx.arc(65, 8, 52, 0, 7); ctx.rect(-60, 10, 125, 50); ctx.fill();
  ctx.beginPath(); ctx.arc(-60, 10, 50, Math.PI * 0.5, Math.PI * 1.6); ctx.arc(0, -20, 66, Math.PI * 1.15, Math.PI * 1.9); ctx.arc(65, 8, 52, Math.PI * 1.4, Math.PI * 0.5); ctx.closePath(); ctx.stroke(); ctx.restore(); }
function sun(ctx, x, y, s, k, t) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.rotate(t * 0.6); ctx.strokeStyle = '#FFB703'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) { const a = i * 0.628; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 72, Math.sin(a) * 72); ctx.lineTo(Math.cos(a) * 100, Math.sin(a) * 100); ctx.stroke(); }
  ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 58, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
function upArrow(ctx, x, y, s, k, col = '#7CFC9A', rot = 0) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * k, s * k); ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(40, -14); ctx.lineTo(16, -14); ctx.lineTo(16, 40); ctx.lineTo(-16, 40); ctx.lineTo(-16, -14); ctx.lineTo(-40, -14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
function bucketC(ctx, x, y, w, label, k, col = '#9AA3AD') {   // small labelled bucket of lakes, (x,y) = bottom centre
  if (k <= 0) return; const h = w * 0.78; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.lineJoin = 'round';
  ctx.fillStyle = LAKE; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -h, w / 2, w * 0.12, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.lineTo(w / 2, -h); ctx.lineTo(w * 0.38, 0); ctx.lineTo(-w * 0.38, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  setFont(ctx, 'Montserrat', w * 0.2); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let fs = w * 0.2; while (ctx.measureText(label).width > w * 0.8 && fs > 8) { fs -= 1; setFont(ctx, 'Montserrat', fs); } ctx.fillText(label, 0, -h * 0.45); ctx.restore(); }

// ------------------------------------------------------------------ B1 the balance scale (0–9.64); also the loop frame
const DROPS = [['ASIA', 1.2], ['AFRICA', 1.7], ['EUROPE', 2.33], ['S. AMERICA', 2.95], ['AUSTRALIA', 3.78], ['USA', 5.2]];
const SLOT = [[-100, 0], [0, 0], [100, 0], [-50, -82], [50, -82], [0, -164]];
function scaleAngle(t) {
  let a = 0; for (const [, t0] of DROPS) a += 2.6 * easeOut(clamp((t - t0 - 0.28) / 0.35));
  const tl = t - 6.9; if (tl > 0) { const target = -15.5, spring = target - (target - a) * Math.exp(-tl * 4.5) * Math.cos(tl * 11); return spring; }
  return a; }
function scaleScene(ctx, t, A = 1) {
  if (A <= 0) return; ctx.save(); ctx.globalAlpha = A;
  dim(ctx, 0.5); title(ctx, 'CANADA vs\nTHE WORLD', 330, 1, 118); chip(ctx, 'WHO HAS MORE LAKES? 🌊', W / 2, 520, 1, { size: 40 });
  const px = W / 2, py = 880, L = 315, ang = scaleAngle(t) * Math.PI / 180;
  // stand
  ctx.fillStyle = '#C9A227'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(px - 26, py); ctx.lineTo(px + 26, py); ctx.lineTo(px + 34, py + 600); ctx.lineTo(px - 34, py + 600); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(px, py + 610, 170, 34, 0, 0, 7); ctx.fill(); ctx.stroke();
  const ends = [-1, 1].map(sd => [px + sd * L * Math.cos(ang), py + sd * L * Math.sin(ang)]);
  // pans hang straight down from the beam ends
  ends.forEach(([ex, ey], i) => {
    const pyy = ey + 300; ctx.strokeStyle = '#3A2A08'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 140, pyy); ctx.moveTo(ex, ey); ctx.lineTo(ex + 140, pyy); ctx.stroke();
    if (i === 1) DROPS.forEach(([lab, t0], j) => { const f = clamp((t - t0 + 0.3) / 0.3), yy = pyy + SLOT[j][1] - (1 - easeIn(f)) * 700; bucketC(ctx, ex + SLOT[j][0], yy, j === 5 ? 110 : 100, lab, f > 0 ? 1 : 0, j === 5 ? '#B8C4D6' : '#9AA3AD'); });
    if (i === 0 && t > 6.3) { const f = clamp((t - 6.3) / 0.55), yy = pyy - (1 - easeIn(f)) * 900; person(ctx, 'canadian_bucket', ex, yy + 6, 270, { sq: f >= 1 && t < 7.2 ? 0.1 * Math.sin((t - 6.85) * 30) * Math.exp(-(t - 6.85) * 5) : 0 }); }
    ctx.fillStyle = '#C9A227'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ex - 160, pyy); ctx.quadraticCurveTo(ex, pyy + 90, ex + 160, pyy); ctx.closePath(); ctx.fill(); ctx.stroke();
    chip(ctx, i ? '🌍 EVERYONE ELSE' : '🇨🇦 CANADA', ex, pyy + 105, 1, { size: 34 });
  });
  // beam on top
  ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.fillStyle = '#E0B93A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-L - 14, -14, 2 * L + 28, 28, 14); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#E0B93A'; ctx.beginPath(); ctx.arc(px, py, 30, 0, 7); ctx.fill(); ctx.stroke();
  if (t > 7.7) kinetic(ctx, 'CANADA WINS 🏆', 660, pop(t - 7.75), 88);
  ctx.restore(); }

// ------------------------------------------------------------------ cross-sections
function crossIce(ctx, t, k) {   // B4: ice sheet up to 2 miles thick presses the crust down and scrapes it to bare rock
  if (k <= 0) return; const x0 = 40, y0 = 600, w = 1000, h = 860, base = y0 + 560;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.4); ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.save(); ctx.clip();
  const sky = ctx.createLinearGradient(0, y0, 0, base); sky.addColorStop(0, '#9FD3E8'); sky.addColorStop(1, '#E3F4FA'); ctx.fillStyle = sky; ctx.fillRect(x0, y0, w, h);
  const iceH = 430 * easeOut(clamp((t - 24.4) / 1.3)), sag = 70 * easeIO(clamp((t - 28.4) / 1.2)), slide = 120 * easeIO(clamp((t - 30.2) / 1.6));
  const ix0 = x0 + 90 + slide, ix1 = x0 + w - 150 + slide;
  const surf = x => base + sag * Math.max(0, Math.sin(clamp((x - (x0 + 40)) / (w - 80)) * Math.PI));
  // mantle + crust
  ctx.fillStyle = '#E07A3F'; ctx.fillRect(x0, base + 150, w, h); ctx.fillStyle = '#8B5E3C'; ctx.beginPath(); ctx.moveTo(x0, surf(x0)); for (let x = x0; x <= x0 + w; x += 20) ctx.lineTo(x, surf(x)); for (let x = x0 + w; x >= x0; x -= 20) ctx.lineTo(x, surf(x) + 190 + sag * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#76736E'; ctx.beginPath(); ctx.moveTo(x0, surf(x0)); for (let x = x0; x <= x0 + w; x += 20) ctx.lineTo(x, surf(x)); for (let x = x0 + w; x >= x0; x -= 20) ctx.lineTo(x, surf(x) + 60); ctx.closePath(); ctx.fill();
  // soil: scraped off wherever the ice has slid over it
  const scr = slide > 0 ? x0 + 90 + slide * 4.2 : -1; ctx.fillStyle = '#4E8A3A';
  for (let x = x0; x < x0 + w; x += 20) { if (x < scr) continue; ctx.fillRect(x, surf(x) - 14, 21, 18); }
  if (slide > 2) { const bx = Math.min(scr, ix1 + 10); ctx.fillStyle = '#6B4A2A'; ctx.beginPath(); ctx.ellipse(bx + 20, surf(bx) - 20, 26 + slide * 0.25, 22 + slide * 0.15, 0, 0, 7); ctx.fill(); }
  // ice slab (domed)
  if (iceH > 1) { ctx.beginPath(); ctx.moveTo(ix0, surf(ix0)); for (let x = ix0; x <= ix1; x += 10) { const u = (x - ix0) / (ix1 - ix0); ctx.lineTo(x, surf(x) - iceH * Math.pow(Math.sin(u * Math.PI), 0.45)); } for (let x = ix1; x >= ix0; x -= 20) ctx.lineTo(x, surf(x)); ctx.closePath();
    const g = ctx.createLinearGradient(0, base - iceH, 0, base); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#AEE2F7'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#4FA9CF'; ctx.lineWidth = 6; ctx.stroke(); }
  // CN Tower for scale (553 m vs ~3 km of ice)
  const kT = pop(t - 25.9); if (kT > 0) { const tx = x0 + 70 + slide * 0, ty = surf(x0 + 70), th = 430 * 553 / 3200 * kT; ctx.fillStyle = '#E8E4DA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tx - 7, ty); ctx.lineTo(tx - 2, ty - th); ctx.lineTo(tx + 2, ty - th); ctx.lineTo(tx + 7, ty); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(tx, ty - th * 0.62, 12 * kT, 6 * kT, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  // labels
  ctx.restore(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.stroke();
  if (iceH > 40) { const ax = x0 + w / 2 + slide - 30, top = base - iceH; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ax, top + 6); ctx.lineTo(ax, base - 8); ctx.stroke();
    for (const [yy, d] of [[top + 6, 1], [base - 8, -1]]) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(ax, yy); ctx.lineTo(ax - 16, yy + 24 * d); ctx.lineTo(ax + 16, yy + 24 * d); ctx.fill(); } }
  styledText(ctx, 'UP TO 2 MILES', W / 2, 420, 100, { k: win(t, 25.2, 32.7), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  chip(ctx, '≈ 3 KM OF ICE', W / 2, 530, win(t, 25.8, 28.3), { size: 34 });
  if (kT > 0) { chip(ctx, 'CN TOWER', x0 + 150, base - 140, win(t, 26.0, 28.3), { size: 26 }); sarrow(ctx, x0 + 120, base - 110, x0 + 82, base - 62, win(t, 26.1, 28.3), C.white, 6); }
  for (let i = 0; i < 3; i++) upArrow(ctx, x0 + 300 + i * 200, base + 110 + Math.sin(t * 6 + i) * 6, 0.9, win(t, 28.5 + i * 0.1, 30.1), '#FF6B6B', Math.PI);
  chip(ctx, 'CRUST PUSHED DOWN ⬇', W / 2, 530, win(t, 28.6, 30.15), { size: 36, stroke: '#FF6B6B' });
  stamp(ctx, 'BARE ROCK', x0 + 260, base + 70, t, 31.8, { size: 56, until: 32.75, color: '#FFFFFF' });
  chip(ctx, 'SOIL SCRAPED AWAY', W / 2, 530, win(t, 30.3, 31.75), { size: 36 });
  ctx.restore(); }
function crossRock(ctx, t, k) {   // B6: a lake sitting in a basin of waterproof Shield rock
  if (k <= 0) return; const x0 = 40, y0 = 640, w = 1000, h = 760, base = y0 + 330;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.4); ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.save(); ctx.clip();
  ctx.fillStyle = '#BFE6F2'; ctx.fillRect(x0, y0, w, h);
  const basin = new Path2D(); basin.moveTo(x0, base); basin.lineTo(x0 + 230, base); basin.bezierCurveTo(x0 + 300, base + 260, x0 + 700, base + 260, x0 + 770, base); basin.lineTo(x0 + w, base); basin.lineTo(x0 + w, y0 + h); basin.lineTo(x0, y0 + h); basin.closePath();
  const water = new Path2D(); water.moveTo(x0 + 230, base + 6); water.bezierCurveTo(x0 + 300, base + 260, x0 + 700, base + 260, x0 + 770, base + 6); water.closePath();
  ctx.fillStyle = LAKE; ctx.fill(water); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 4; for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let xx = 280; xx <= 720; xx += 20) ctx.lineTo(x0 + xx, base + 40 + i * 50 + Math.sin(xx * 0.05 + t * 3 + i) * 5); ctx.stroke(); }
  ctx.fillStyle = '#6E6A66'; ctx.fill(basin); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; const r = rnd(3);
  for (let i = 0; i < 40; i++) { const xx = x0 + r() * w, yy = base + 30 + r() * 420; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 40, yy + 12); ctx.stroke(); }
  ctx.fillStyle = '#4E8A3A'; ctx.fillRect(x0, base - 10, 230, 12); ctx.fillRect(x0 + 770, base - 10, w - 770, 12);
  // drops try to sink, bounce off the rock
  for (let i = 0; i < 4; i++) { const u = ((t - 41.0) * 0.9 + i * 0.25) % 1; if (t < 41.0) break; const dx = x0 + 380 + i * 80, bottom = base + 200 + Math.sin(i * 1.3) * 18; const yy = u < 0.6 ? lerp(base + 30, bottom, u / 0.6) : bottom - Math.sin((u - 0.6) / 0.4 * Math.PI) * 50;
    ctx.fillStyle = '#1E6FA8'; ctx.beginPath(); ctx.arc(dx, yy, 11, 0, 7); ctx.fill(); }
  ctx.restore(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 28); ctx.stroke();
  chip(ctx, 'BILLIONS OF YEARS OLD', W / 2, y0 + 120, win(t, 40.8, 41.95), { size: 36 });
  stamp(ctx, 'WATERPROOF ROCK', W / 2, y0 + 120, t, 42.0, { size: 58, until: 44.0, color: '#FFD43B' });
  if (t > 42.9) { const kx = clamp((t - 43.0) / 0.4); sarrow(ctx, x0 + 500, base + 250, x0 + 500, base + 400, win(t, 42.85, 44.0), '#5FC3E4', 12); redX(ctx, x0 + 500, base + 340, 120, kx * popOut(44.0 - t)); }
  ctx.restore(); }
function scoop(ctx, t) {   // giant hand + ice cream scoop gouging Canada (33.2–36.9)
  const hits = [[34.35, -78, 57], [35.05, -103, 61], [35.75, -73, 52]], start = 33.2, end = 37.0; if (t < start || t > end) return;
  let x, y, ang = 0, ball = 0;
  const pos = i => P(camAt(t), hits[i][1], hits[i][2]);
  const path = [[1250, 300], ...hits.map((h, i) => pos(i)), [1250, 250]], times = [start, ...hits.map(h => h[0]), end];
  let i = 0; while (i < times.length - 2 && t > times[i + 1]) i++; const u = clamp((t - times[i]) / (times[i + 1] - times[i])), e = easeIO(u);
  x = lerp(path[i][0], path[i + 1][0], e); y = lerp(path[i][1], path[i + 1][1], e) - Math.sin(u * Math.PI) * 220; ang = -0.5 + Math.sin(u * Math.PI) * 0.4;
  ball = hits.filter(h => t > h[0]).length;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  // arm + sleeve from off-screen top right
  ctx.strokeStyle = C.ink; ctx.lineWidth = 92; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(150, -250); ctx.lineTo(1000, -1100); ctx.stroke(); ctx.strokeStyle = '#3D5A80'; ctx.lineWidth = 78; ctx.stroke();
  // scoop: handle + bowl (+ a ball of scooped-out Canada)
  ctx.strokeStyle = C.ink; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(150, -250); ctx.lineTo(30, -60); ctx.stroke(); ctx.strokeStyle = '#C0C8CC'; ctx.lineWidth = 22; ctx.stroke();
  ctx.fillStyle = '#C0C8CC'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 70, -0.3, Math.PI + 0.3, false); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (ball) { ctx.fillStyle = C.land; ctx.beginPath(); ctx.arc(0, -10, 66 + ball * 6, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#4E8A3A'; ctx.beginPath(); ctx.arc(-20, -50, 12, 0, 7); ctx.arc(25, -40, 9, 0, 7); ctx.fill(); }
  // the hand gripping the handle, drawn on top (house rule)
  ctx.fillStyle = SKIN_C; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(120, -205, 62, 50, -0.9, 0, 7); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 4; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(85 + k * 22, -185 + k * 12); ctx.lineTo(105 + k * 22, -160 + k * 12); ctx.stroke(); }
  ctx.restore(); }
const SKIN_C = '#F2C9A0';

// ------------------------------------------------------------------ the story
const HUD = [[-95, 60.5], [-91, 64.5], [-80.5, 63.5], [-78, 58], [-89, 56.3], [-86, 67.5]];
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  // ---------- lakes layer: hidden in B1, revealed B2, under ice B4, empty basins B5, refilled B6, on from then on
  let lk = 0, lkMode = 'water';
  if (t > 9.9 && t < 24.5) lk = clamp((t - 10.0) / 1.6);
  if (t >= 32.6 && t < 38.0) { lkMode = 'empty'; lk = t < 35.85 ? clamp((t - 33.9) / 2.0) * 0.55 : 0.55 + 0.45 * clamp((t - 35.9) / 0.6); }
  if (t >= 38.0) lk = t < 56.4 ? 1 : 1 - clamp((t - 56.45) / 0.5);
  if (lkMode === 'water') drawLakes(ctx, c, lk, LAKE, 1);
  else drawLakes(ctx, c, lk, '#3B3836', 1, '#1E1C1B');
  if (t > 37.6 && t < 40.4) { const f = clamp((t - 38.5) / 1.4); drawLakes(ctx, c, f, LAKE, 1); }   // water pours into the holes
  // ---------- B1 the scale over a dimmed map
  if (t < 10.2) scaleScene(ctx, t, t < 9.4 ? 1 : 1 - clamp((t - 9.4) / 0.6));
  // ---------- B2 Swiss cheese + 60 %
  if (t > 9.6 && t < 16.5) {
    const ch = win(t, 11.55, 12.95, 0.3, 0.35); cheese(ctx, c, ch);
    chip(ctx, '🧀 LIKE SWISS CHEESE', W / 2, 330, win(t, 11.6, 12.9), { size: 44 });
    if (t > 15.2) strokeKey(ctx, c, 'can', C.gold, 6, win(t, 15.25, 16.35));
    styledText(ctx, '60%', W / 2, 300, 190, { k: win(t, 13.05, 16.3), fill: C.yellow, stroke: C.goldDark, rot: -4 });
    chip(ctx, "OF ALL THE WORLD'S LAKES", W / 2, 450, win(t, 13.5, 16.3), { size: 40 });
  }
  // ---------- B3 not the rain; blame the Ice Age
  if (t > 16.4 && t < 22.5) {
    const [cx1, cy1] = P(c, -100, 66);
    const kc = win(t, 16.5, 18.0); cloud(ctx, cx1, cy1, 1.3, kc, true);
    if (kc > 0) { ctx.save(); ctx.strokeStyle = '#7FD3FF'; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let i = 0; i < 9; i++) { const u = ((t * 1.6 + i / 9) % 1), xx = cx1 - 110 + i * 28; ctx.globalAlpha = kc * (1 - u); ctx.beginPath(); ctx.moveTo(xx, cy1 + 90 + u * 160); ctx.lineTo(xx - 6, cy1 + 112 + u * 160); ctx.stroke(); } ctx.restore(); }
    redX(ctx, cx1, cy1 + 30, 240, clamp((t - 17.3) / 0.3) * popOut(18.0 - t));
    chip(ctx, 'NOT THE RAIN', W / 2, 330, win(t, 16.6, 18.0), { size: 46 });
    sun(ctx, cx1, cy1, 1.0, win(t, 18.1, 20.3), t); chip(ctx, 'THE FAR NORTH: SURPRISINGLY DRY', W / 2, 330, win(t, 18.2, 20.3), { size: 38 });
    // frost creeping in from the edges + the Ice Age title
    const fr = clamp((t - 20.4) / 1.6); if (fr > 0) { ctx.save(); const g = ctx.createRadialGradient(W / 2, H / 2, H * (0.75 - 0.35 * fr), W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(220,245,255,0)'); g.addColorStop(1, `rgba(220,245,255,${0.75 * fr})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  // ---------- B4 the ice sheet (map), then the cross-section
  if (t > 21.0 && t < 33.6) {
    const kI = clamp((t - 21.3) / 2.4), aI = t < 32.6 ? 1 : 1 - clamp((t - 32.6) / 0.8); iceSheet(ctx, c, kI, aI, t);
    if (t < 24.5) chip(ctx, 'TENS OF THOUSANDS OF YEARS', W / 2, 330, win(t, 22.55, 24.4), { size: 40 });
    crossIce(ctx, t, win(t, 24.35, 32.75, 0.35, 0.3));
    title(ctx, 'THE LAST\nICE AGE ❄️', 360, win(t, 20.9, 22.45), 120);
  }
  // ---------- B5 the giant ice cream scoop (ice gone, basins left behind)
  if (t > 32.8 && t < 37.6) {
    chip(ctx, '🍨 A GIANT ICE CREAM SCOOP', W / 2, 330, win(t, 33.6, 35.8), { size: 42 });
    chip(ctx, '…LEAVING THE HOLES BEHIND', W / 2, 330, win(t, 35.9, 37.4), { size: 42 });
    scoop(ctx, t);
  }
  // ---------- B6 meltwater, waterproof rock, still there today
  if (t > 37.4 && t < 46.6) {
    chip(ctx, '💧 THE ICE MELTS', W / 2, 330, win(t, 37.6, 38.5), { size: 44 }); chip(ctx, '…AND FILLS THE HOLES', W / 2, 330, win(t, 38.55, 40.2), { size: 44 });
    if (t < 39.8) iceSheet(ctx, c, 1, 0.55 * (1 - clamp((t - 37.6) / 1.4)), t);
    crossRock(ctx, t, win(t, 40.2, 44.05, 0.35, 0.3));
    chip(ctx, 'NOWHERE TO DRAIN', W / 2, 330, win(t, 42.8, 44.0), { size: 46, stroke: '#FF6B6B' });
    chip(ctx, 'SO IT STAYED…', W / 2, 330, win(t, 44.1, 44.9), { size: 46 }); chip(ctx, '…STILL THERE TODAY', W / 2, 330, win(t, 44.95, 46.4), { size: 46 });
    if (t > 44.0) { const [qx, qy] = P(c, -104, 58.5); person(ctx, 'canadian_canoe', qx + Math.sin(t * 2) * 6, qy + 140 + Math.sin(t * 3) * 4, 300, { k: pop(t - 44.15) * popOut(46.5 - t) }); }
  }
  // ---------- B7 the ground is still bouncing back (Hudson Bay)
  if (t > 46.45 && t < 55.0) {
    const end = t < 54.7 ? 1 : popOut(54.95 - t, 0.25);
    kinetic(ctx, 'THE WILD PART 🤯', 330, win(t, 46.6, 47.9), 88);
    HUD.forEach(([lo, la], i) => { const [x, y] = P(c, lo, la); upArrow(ctx, x, y - 10 - Math.abs(Math.sin(t * 3 + i)) * 26, 0.85, pop(t - 48.1 - i * 0.12) * end); });
    const [hx, hy] = P(c, -86, 60); goldLabel(ctx, 'HUDSON BAY', hx, hy, 62, pop(t - 50.8) * end);
    chip(ctx, 'STILL BOUNCING BACK', W / 2, 330, win(t, 48.0, 50.6), { size: 44 });
    styledText(ctx, '+1 CM A YEAR', W / 2, 310, 120, { k: pop(t - 51.85) * end, fill: C.yellow, stroke: C.goldDark, rot: -3 });
    chip(ctx, '≈ 0.4 INCH, EVERY SINGLE YEAR', W / 2, 440, pop(t - 52.6) * end, { size: 34 });
    person(ctx, 'canadian_shock', 870, 1240 - Math.abs(Math.sin(t * 3)) * 30, 210, { k: pop(t - 48.4) * end });
  }
  // ---------- card (54.75–56.4) then glide back into frame 1
  if (t > 54.6 && t < 57.2) {
    const k = clamp((t - 54.7) / 0.35) * (1 - clamp((t - 56.4) / 0.3)); ctx.save(); ctx.globalAlpha = 0.74 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    title(ctx, 'SCOOPED BY\nTHE ICE AGE', 430, pop(t - 54.75), 120);
    if (window.TIKTOK) {
      chip(ctx, '▶ FULL VIDEO ON YOUTUBE', W / 2, 1000, pop(t - 54.9), { size: 48, bg: '#E62117', fill: '#FFFFFF', stroke: '#7A0C08' });
      const kS = pop(t - 55.0); if (kS > 0) { ctx.save(); ctx.translate(W / 2, 1150); ctx.scale(kS, kS); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-330, -58, 660, 116, 58); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(-255, -6, 24, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-238, 12); ctx.lineTo(-215, 35); ctx.stroke();
        setFont(ctx, 'Montserrat', 60); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('Mapheld'.slice(0, Math.max(0, Math.min(7, Math.floor((t - 55.1) * 14)))), -190, 4); ctx.restore(); }
      chip(ctx, 'DETAILS IN THE CAPTION ⬇', W / 2, 1290, pop(t - 55.3), { size: 32 });
    } else {
      chip(ctx, 'WHY IS CANADA SO EMPTY? ▶', 400, 1180, pop(t - 54.9), { size: 38, bg: C.gold, fill: C.ink, stroke: C.goldDark });
      const b = Math.abs(Math.sin((t - 54.9) * 4.2)) * 40, kA = pop(t - 54.9);
      if (kA > 0) { ctx.save(); ctx.translate(240, 1300 + b); ctx.scale(kA, kA); ctx.fillStyle = C.yellow; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-34, -70); ctx.lineTo(34, -70); ctx.lineTo(34, 10); ctx.lineTo(80, 10); ctx.lineTo(0, 100); ctx.lineTo(-80, 10); ctx.lineTo(-34, 10); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); if (t < 56.4) ring(ctx, 240, 1560, 70, t); }
      person(ctx, 'canadian_canoe', 820, 1500, 300, { k: pop(t - 55.0) });
    }
    ctx.restore();
  }
}
const QUESTION = 'WITHOUT GOOGLING:\nHOW MANY LAKES\nDOES CANADA HAVE? 👇';
const CAPTIONS = [
  [0.0, 4.6, 'Every lake on Earth…'], [4.7, 6.4, '…plus the USA'], [6.45, 7.7, 'Canada alone…'], [7.75, 9.5, '…still has more'],
  [9.75, 11.5, 'From above…'], [11.55, 12.8, '…Swiss cheese'], [12.87, 15.05, "60% of the world's lakes"], [15.11, 16.3, '…are right here'],
  [16.5, 18.0, 'Not because of rain'], [18.1, 20.3, 'The far north is dry'], [20.44, 22.3, 'Blame the Ice Age'],
  [22.56, 24.3, 'Tens of thousands of years'], [24.37, 26.45, 'Ice up to 2 miles thick'], [26.5, 27.8, '…on top of Canada'], [27.84, 30.1, 'It pushed the crust down'], [30.2, 32.6, '…and scraped it bare'],
  [32.93, 34.0, 'Like a giant…'], [34.05, 35.8, '…ice cream scoop'], [35.88, 37.3, '…leaving the holes'],
  [37.58, 38.5, 'The ice melted…'], [38.54, 40.2, '…water filled the holes'], [40.31, 42.7, 'Hard, waterproof rock'], [42.78, 43.95, 'Nowhere to drain'], [44.07, 44.9, 'So it stayed…'], [44.92, 46.3, '…still there today'],
  [46.56, 47.9, "Here's the wild part"], [47.96, 50.6, 'The ground is bouncing back'], [50.74, 51.7, 'Around Hudson Bay…'], [51.76, 54.5, '…1 cm every year'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t);
  if (t > 56.5) scaleScene(ctx, 0, clamp((t - 56.55) / 0.5));   // glide back into frame 1 (loop)
  vignette(ctx); if (t < 54.7) drawText(ctx, t);
  // the comment question rides the last spoken line, then stays on the card
  if (t > 51.0 && t < 56.5) { const y = t < 54.7 ? 1450 : lerp(1450, 760, easeIO((t - 54.7) / 0.45)); styledText(ctx, QUESTION, W / 2, y, 60, { k: pop(t - 51.1) * (t > 56.2 ? popOut(56.5 - t, 0.3) : 1), fill: C.yellow, stroke: C.goldDark, rot: -2 }); }
  if (t > 56.35) { ctx.save(); ctx.globalAlpha = clamp((t - 56.4) / 0.55); styledText(ctx, 'Every lake on Earth…', W / 2, CAPTION.y + 80, CAPTION.size, { k: 1, shadow: CAPTION.shadow, maxW: 1000 }); ctx.restore(); }
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
