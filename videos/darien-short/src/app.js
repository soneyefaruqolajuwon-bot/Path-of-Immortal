/* The Darién Gap — Mapheld 9:16 short; card, then glides back into frame 1 (loop). */
'use strict';
const W = 1080, H = 1920, DURATION = 54.27;
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
const V = { amer: [-100, 15, 10.5], gap: [-78.3, 8.4, 230], mid: [-82, 4, 26] };
const KEYS = [[0, 'amer', 1], [5.9, 'amer', 1.03], [7.6, 'gap', 1], [17.6, 'gap', 1.03], [25.9, 'gap', 1.05], [30.5, 'gap', 1.05], [31.8, 'mid', 1], [38.6, 'mid', 1.03], [41.8, 'gap', 1], [50.97, 'gap', 1.05], [53.4, 'amer', 1], [54.27, 'amer', 1]];
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
  for (const key of Object.keys(GEO).filter(k => !['hwy_n', 'hwy_s', 'canal'].includes(k))) {
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
// ------------------------------------------------------------------ Darién helpers
const gp = k => { const r = GEO[k][0], o = []; for (let i = 0; i < r.length; i += 2) o.push([r[i], r[i + 1]]); return o; };
const HN = gp('hwy_n'), HS = gp('hwy_s'), CANAL = gp('canal');
const YAV = [-77.69, 8.16], TURBO = [-76.73, 8.09], CARSTOP = [-78.05, 8.42];
function geoAlong(pts, k) { const seg = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); tot += d; }
  let target = tot * clamp(k), acc = 0; for (let i = 0; i < seg.length; i++) { if (acc + seg[i] >= target) { const f = (target - acc) / (seg[i] || 1); return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f), pts[i + 1][0] - pts[i][0]]; } acc += seg[i]; } const l = pts[pts.length - 1]; return [l[0], l[1], 1]; }
function road(ctx, c, pts, col = C.gold) { const sp = pts.map(p => P(c, p[0], p[1])); ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const w = Math.max(5, Math.min(14, c.z * 0.06));
  ctx.beginPath(); sp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); for (const [m, a] of [[3.2, .16], [1.8, .32]]) { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w * m; ctx.stroke(); } ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = w + 4; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); ctx.restore(); }
function carAt(ctx, c, ll, dir, k = 1, sq = 0) { const [x, y] = P(c, ll[0], ll[1]); const w = clamp(c.z * 0.85, 80, 210); sprite(ctx, 'car', x, y, w, { k, ay: 0.82, flip: dir < 0, sq }); }
function barrier(ctx, c, k, t) { if (k <= 0) return; const [x, y] = P(c, YAV[0] + 0.06, YAV[1]); const s = clamp(c.z / 230, 0.35, 1.1) * k; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (let i = 0; i < 2; i++) { ctx.fillStyle = '#5A3A1E'; ctx.fillRect(-70 + i * 130, -40, 12, 90); }
  ctx.beginPath(); ctx.rect(-80, -70, 160, 40); ctx.fillStyle = '#fff'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = '#D7263D'; for (let i = -3; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-80 + i * 40, -30); ctx.lineTo(-60 + i * 40, -70); ctx.lineTo(-40 + i * 40, -70); ctx.lineTo(-60 + i * 40, -30); ctx.fill(); } ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.strokeRect(-80, -70, 160, 40); ctx.restore(); }
function gapFill(ctx, c, k, col, glow) { fillKey(ctx, c, 'gap', col, k, glow); }
function trees(ctx, c, k) { if (k <= 0) return; const r = rnd(11); const pts = []; for (let i = 0; i < 70; i++) { const lo = -78.25 + r() * 1.5, la = 7.25 + r() * 1.65; pts.push([lo, la]); }
  const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS.gap) pp.addPath(p, M);
  ctx.save(); ctx.clip(pp); for (const [lo, la] of pts) { const [x, y] = P(c, lo, la); const s = 14 * k; ctx.fillStyle = '#2E7D32'; ctx.strokeStyle = '#1B4D1F'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#43A047'; ctx.beginPath(); ctx.arc(x - 4, y - 4, s * 0.5, 0, 7); ctx.fill(); } ctx.restore(); }
function mudPanel(ctx, t, k) {   // cross-section: rain + bottomless mud swallowing a bulldozer
  if (k <= 0) return; const x0 = 70, y0 = 1080, w = 940, h = 440; ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
  ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 26); ctx.fillStyle = '#7FA7B5'; ctx.fill(); ctx.save(); ctx.clip();
  ctx.fillStyle = '#5E6E74'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x0 + 120 + i * 190, y0 + 40, 80, 0, 7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(220,240,255,0.8)'; ctx.lineWidth = 3; const r = rnd(4); for (let i = 0; i < 60; i++) { const xx = x0 + r() * w, yy = y0 + 80 + ((r() * 300 + t * 600) % 300); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 6, yy + 18); ctx.stroke(); }
  const sink = easeIn(clamp((t - 23.6) / 2.2)) * 90; const mudY = y0 + 300;
  sprite(ctx, 'bulldozer', x0 + 560, mudY + 40 + sink, 300, { ay: 1 });
  person(ctx, 'engineer', x0 + 230, mudY + 30 + sink * 0.6, 200, { k: 1 });
  ctx.fillStyle = '#5C4033'; ctx.beginPath(); ctx.moveTo(x0, mudY); for (let xx = 0; xx <= w; xx += 40) ctx.lineTo(x0 + xx, mudY + Math.sin(xx * 0.05 + t * 3) * 8); ctx.lineTo(x0 + w, y0 + h); ctx.lineTo(x0, y0 + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7A5A44'; for (let i = 0; i < 8; i++) { const bx = x0 + 80 + i * 110, by = mudY + 40 + ((t * 40 + i * 30) % 80); ctx.beginPath(); ctx.arc(bx, by, 8, 0, 7); ctx.fill(); }
  ctx.restore(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 26); ctx.stroke(); ctx.restore(); }
function lens(ctx, t, k) { if (k <= 0) return; const cx = 540, cy = 980, R = 330 * k; ctx.save(); ctx.fillStyle = '#0E2A33'; ctx.strokeStyle = '#C0C8CC'; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); ctx.stroke(); ctx.clip();
  const g = clamp((t - 28.0) / 1.4); for (let i = 0; i < 7; i++) { const a = i * 0.9 + t * 0.4, d = 60 + (i % 3) * 80; sprite(ctx, 'virus', cx + Math.cos(a) * d, cy + Math.sin(a) * d, (40 + 50 * g) * (0.8 + 0.2 * Math.sin(t * 5 + i)), { k: g }); } ctx.restore(); }
function submarine(ctx, t, k) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.3); const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2C6A78'); gr.addColorStop(1, '#0E2A33'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 18; i++) { const bx = (i * 137) % W, by = H - ((t * 80 + i * 160) % H); ctx.beginPath(); ctx.arc(bx, by, 6 + (i % 3) * 3, 0, 7); ctx.fill(); }
  const cy = 1050; ctx.fillStyle = '#F4C430'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(540, cy, 430, 150, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(420, cy - 260, 200, 130, 20); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9ED0E6'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(250 + i * 190, cy + 10, 34, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#F4C430'; ctx.beginPath(); ctx.moveTo(960, cy); ctx.lineTo(1050, cy - 90); ctx.lineTo(1050, cy + 90); ctx.closePath(); ctx.fill(); ctx.stroke();
  // driller on deck, drilling down into the hull
  person(ctx, 'driller', 300, cy - 130, 240, { k: pop(t - 38.6) });
  const hole = clamp((t - 39.7) / 0.5); if (hole > 0 && t < 41.0) { ctx.fillStyle = '#5FD3FF'; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.25; ctx.beginPath(); ctx.arc(278 + Math.cos(a) * 40 * hole, cy - 140 + Math.sin(a) * 60 * hole, 8, 0, 7); ctx.fill(); } }
  person(ctx, 'panic', 760, cy - 140, 230, { k: pop(t - 40.2) });
  if (t > 41.0) { const s = pop(t - 41.0, 0.25); ctx.save(); ctx.translate(290, cy - 120); ctx.rotate(-0.25); ctx.scale(s, s); ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.rect(-170, -36, 340, 72); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#141416'; for (let i = -6; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-170 + i * 50, 36); ctx.lineTo(-150 + i * 50, 36); ctx.lineTo(-110 + i * 50, -36); ctx.lineTo(-130 + i * 50, -36); ctx.fill(); } ctx.restore();
    ctx.fillStyle = '#FFD43B'; ctx.fillRect(-90, -26, 180, 52); setFont(ctx, 'Montserrat', 50); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NOPE', 0, 3); ctx.restore(); }
  chip(ctx, 'DRILL A HOLE IN A SUBMARINE…', W / 2, 330, win(t, 38.5, 41.1), { size: 40 }); chip(ctx, '…TO SAVE A SHORT WALK?', W / 2, 330, win(t, 41.2, 42.8), { size: 40 });
  ctx.restore(); }

// ------------------------------------------------------------------ the story
function opening(ctx, c, t, k) {   // shared first/last frame
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = k;
  styledText(ctx, '19,000 MILES', W / 2, 300, 132, { fill: C.yellow, stroke: C.goldDark, rot: -3, k: 1 }); chip(ctx, 'ALASKA → ARGENTINA', W / 2, 450, 1, { size: 40 });
  carAt(ctx, c, HN[0], -1, 1); ctx.restore(); }
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  const subOn = t > 38.7 && t < 42.6;
  if (!subOn) {
    // highway + canal always present
    road(ctx, c, HN); road(ctx, c, HS); if (c.z > 40) { const sp = CANAL.map(p => P(c, p[0], p[1])); ctx.save(); ctx.strokeStyle = '#5FD3FF'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); sp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); }
    // the gap: red until the jungle story, then green (and gold as the "wall")
    const red = t < 18.9 || t > 53.3 ? 1 : 0;
    gapFill(ctx, c, red ? 0.45 + 0.2 * Math.sin(t * 5) : 0.6, red ? '#D7263D' : '#2E7D32', red ? '#FF6B6B' : null);
    if (!red && c.z > 40) trees(ctx, c, clamp((t - 19.4) / 0.6));
  }
  // ---------------- B1 the drive (0–10.3)
  if (t < 10.3) {
    const k = t < 0.3 ? 0 : t < 4.8 ? easeIO((t - 0.3) / 4.5) * 0.985 : t < 8.4 ? 0.985 : lerp(0.985, 1, easeOut((t - 8.4) / 0.6));
    let [lo, la, dir] = geoAlong(HN, k); if (t > 7.4) { const u = easeOut(clamp((t - 7.6) / 1.5)); lo = lerp(-78.9, CARSTOP[0], u); la = lerp(8.95, CARSTOP[1], u); dir = 1; } carAt(ctx, c, [lo, la], dir < 0 ? -1 : 1, 1, t > 9.0 && t < 9.4 ? 0.12 : 0);
    if (t < 4.75) { styledText(ctx, '19,000 MILES', W / 2, 300, 132, { fill: C.yellow, stroke: C.goldDark, rot: -3, k: t < 4.4 ? 1 : popOut(4.75 - t, 0.3) }); chip(ctx, 'ALASKA → ARGENTINA', W / 2, 450, t < 4.4 ? 1 : popOut(4.75 - t, 0.3), { size: 40 }); }
    styledText(ctx, '…EXCEPT 60 MILES', W / 2, 300, 110, { fill: '#FF6B6B', stroke: C.ink, rot: -3, k: win(t, 4.8, 7.3) });
    if (t > 6.4) { const [px, py] = P(c, -79.8, 8.95), [cx2, cy2] = P(c, -74.5, 5.5); goldLabel(ctx, 'PANAMA', px, py - 60, 54, pop(t - 7.3)); goldLabel(ctx, 'COLOMBIA', cx2, cy2, 54, pop(t - 7.8)); }
    barrier(ctx, c, pop(t - 8.4), t); stamp(ctx, 'ROAD ENDS HERE', W / 2, 360, t, 9.2, { size: 50, until: 10.2 });
    if (t > 9.2) puff(ctx, ...P(c, YAV[0] + 0.03, YAV[1]), 120, clamp((t - 9.2) / 0.6), 3);
  }
  // ---------------- B2 the canal next door (10.3–17.9)
  if (t > 10.2 && t < 17.95) {
    carAt(ctx, c, CARSTOP, 1); barrier(ctx, c, 1, t);
    chip(ctx, "NOT BECAUSE NOBODY COULD BUILD IT", W / 2, 330, win(t, 10.4, 12.3), { size: 38 });
    const [ax, ay] = P(c, -79.62, 9.05), [bx, by] = P(c, ...YAV); const dk = clamp((t - 12.4) / 0.8);
    if (dk > 0) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.setLineDash([18, 12]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, dk), lerp(ay, by, dk)); ctx.stroke(); ctx.restore(); }
    chip(ctx, '≈ 150 MILES', (ax + bx) / 2 - 20, (ay + by) / 2 - 120, win(t, 12.6, 17.8), { size: 36 });
    const su = clamp((t - 14.0) / 3.6); if (su > 0) { const [lo, la] = geoAlong(CANAL, su); const [sx, sy] = P(c, lo, la); sprite(ctx, 'cargo', sx, sy, 150, { ay: 0.7, k: pop(t - 14.0) }); }
    goldLabel(ctx, 'PANAMA CANAL', ax + 170, ay - 260, 52, pop(t - 15.3)); chip(ctx, 'BUILT 1914', ax + 170, ay - 185, pop(t - 16.4), { size: 36 });
    { const [qx, qy] = P(c, ...CARSTOP); bubble(ctx, qx + 90, qy - 170, '?!', 54, [-40, 60], win(t, 15.6, 17.8)); }
  }
  // ---------------- B3 the jungle + mud (17.9–25.9)
  if (t > 17.9 && t < 25.95) {
    carAt(ctx, c, CARSTOP, 1); barrier(ctx, c, 1, t);
    kinetic(ctx, 'SO WHAT STOPPED THEM?', 330, win(t, 18.0, 19.3), 84);
    const [gx, gy] = P(c, -77.5, 8.9); goldLabel(ctx, 'THE DARIÉN GAP', gx, gy - 110, 66, pop(t - 21.0));
    ['🌴 RAINFOREST', '🐊 SWAMPS', '🟫 MUD'].forEach((s, i) => chip(ctx, s, 250 + i * 290, 470, win(t, [22.1, 22.7, 23.4][i], 25.8), { size: 34 }));
    mudPanel(ctx, t, win(t, 23.3, 25.85, 0.35, 0.3));
  }
  // ---------------- B4 something you can't see (25.9–30.4)
  if (t > 25.9 && t < 30.5) {
    dim(ctx, 0.6 * clamp((t - 26.0) / 0.5) * popOut(30.4 - t, 0.3)); chip(ctx, "SOMETHING YOU CAN'T SEE…", W / 2, 400, win(t, 27.6, 30.4), { size: 44 });
    lens(ctx, t, pop(t - 27.8, 0.45) * popOut(30.4 - t, 0.3)); styledText(ctx, 'A VIRUS', W / 2, 1460, 140, { k: win(t, 29.3, 30.4), fill: '#FF6B6B', stroke: C.ink, rot: -3 });
  }
  // ---------------- B5 foot-and-mouth: the jungle as a wall (30.4–38.3)
  if (t > 30.4 && t < 38.75) {
    const end = popOut(38.6 - t, 0.3);
    fillKey(ctx, c, 'sa', '#D7263D', 0.35 * clamp((t - 30.6) / 0.6) * end, null); fillKey(ctx, c, 'na', '#1E8E3E', 0.35 * clamp((t - 34.7) / 0.5) * end, null);
    const r = rnd(21); for (let i = 0; i < 9; i++) { const ll = [-76 + r() * 18, -1 - r() * 13]; const [x, y] = P(c, ll[0], ll[1]); sprite(ctx, i % 3 ? 'virus' : 'cow', x, y, i % 3 ? 70 : 110, { k: pop(t - 31.0 - i * 0.12) * end }); }
    chip(ctx, 'FOOT-AND-MOUTH DISEASE', W / 2, 330, win(t, 31.2, 32.6), { size: 42, stroke: '#FF6B6B' }); chip(ctx, 'WIPES OUT CATTLE HERDS', W / 2, 330, win(t, 32.7, 34.6), { size: 42, stroke: '#FF6B6B' });
    const [nx, ny] = P(c, -92, 22); badge(ctx, 'DISEASE-FREE ✓', nx, ny, pop(t - 34.8) * end, '#1E8E3E');
    if (t > 35.9) { gapFill(ctx, c, 0.9 * end, C.gold, '#FFF3B0'); const [gx, gy] = P(c, -77.5, 8.0); ring(ctx, gx, gy, 90, t); stamp(ctx, 'QUARANTINE WALL', W / 2 + 60, 1000, t, 36.8, { size: 52, until: 38.6 }); person(ctx, 'inspector', 230, 1500, 240, { k: pop(t - 36.2) * end }); }
  }
  // ---------------- B7 the wall stayed; Yaviza (42.9–51)
  if (t > 42.5 && t < 53.5) {
    const end = t < 50.97 ? 1 : popOut(51.6 - t, 0.4);
    gapFill(ctx, c, 0.35 * clamp((t - 43.4) / 0.5) * end, C.gold, '#FFF3B0'); chip(ctx, 'THE WALL STAYED', W / 2, 330, win(t, 43.0, 44.3), { size: 46 });
    const [yx, yy] = P(c, ...YAV); sprite(ctx, 'yaviza', yx + 150, yy + 40, 160, { ay: 1, k: pop(t - 47.6) * end });
    carAt(ctx, c, CARSTOP, 1, end); barrier(ctx, c, end, t);
    chip(ctx, 'THE LONGEST ROAD ON EARTH…', W / 2, 330, win(t, 44.4, 47.5), { size: 42 }); chip(ctx, '…ENDS IN A TINY TOWN', W / 2, 330, win(t, 47.6, 49.2), { size: 42 });
    styledText(ctx, '60 MILES OF JUNGLE', W / 2, 340, 100, { k: win(t, 49.2, 50.97), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  }
  // ---------------- card + glide back to frame 1
  if (t > 50.9 && t < 54.2) {
    const k = clamp((t - 50.97) / 0.35) * (1 - clamp((t - 53.55) / 0.6)); ctx.save(); ctx.globalAlpha = 0.74 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    title(ctx, 'THE ROAD THAT\nNEVER GOT BUILT', 470, pop(t - 51.0), 116);
    styledText(ctx, 'PAVE IT OR\nKEEP IT CLOSED? 👇', W / 2, 760, 64, { k: pop(t - 51.2), fill: C.yellow, stroke: C.goldDark, rot: -2 });
    if (window.TIKTOK) {
      chip(ctx, '▶ FULL VIDEO ON YOUTUBE', W / 2, 960, pop(t - 51.4), { size: 48, bg: '#E62117', fill: '#FFFFFF', stroke: '#7A0C08' });
      const kS = pop(t - 51.6); if (kS > 0) { ctx.save(); ctx.translate(W / 2, 1110); ctx.scale(kS, kS); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-330, -58, 660, 116, 58); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(-255, -6, 24, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-238, 12); ctx.lineTo(-215, 35); ctx.stroke();
        setFont(ctx, 'Montserrat', 60); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; const typed = 'Mapheld'.slice(0, Math.max(0, Math.min(7, Math.floor((t - 51.8) * 12)))); ctx.fillText(typed, -190, 4); ctx.restore(); }
      chip(ctx, 'DETAILS IN THE CAPTION ⬇', W / 2, 1250, pop(t - 52.2), { size: 32 });
    } else {
      chip(ctx, 'FULL STORY: TAP HERE', 370, 1180, pop(t - 51.4), { size: 40, bg: C.gold, fill: C.ink, stroke: C.goldDark });
      const b = Math.abs(Math.sin((t - 51.4) * 4.2)) * 40, kA = pop(t - 51.4);
      if (kA > 0) { ctx.save(); ctx.translate(240, 1300 + b); ctx.scale(kA, kA); ctx.fillStyle = C.yellow; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-34, -70); ctx.lineTo(34, -70); ctx.lineTo(34, 10); ctx.lineTo(80, 10); ctx.lineTo(0, 100); ctx.lineTo(-80, 10); ctx.lineTo(-34, 10); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); if (t < 53.5) ring(ctx, 240, 1560, 70, t); }
      sprite(ctx, 'car', 820, 1420, 330, { k: pop(t - 51.3), ay: 0.8, flip: true });
    }
    ctx.restore();
  }
  if (t > 53.6) opening(ctx, c, t, clamp((t - 53.65) / 0.5));
}
const CAPTIONS = [
  [0.0, 4.7, 'Alaska to Argentina by car…'], [4.8, 6.4, '…except 60 miles'], [6.5, 10.1, 'Here, the road just stops'],
  [10.4, 12.3, 'Not because nobody could build it'], [12.4, 15.2, '150 miles away…'], [15.3, 17.7, '…they dug the Panama Canal'],
  [18.0, 19.3, 'So what stopped them?'], [19.4, 22.0, 'The jungle is part of it'], [22.1, 25.8, 'Swamps, rain and mud'],
  [26.0, 29.2, 'Something you can\'t see…'], [29.3, 30.3, 'A virus'],
  [30.6, 32.6, 'Foot-and-mouth disease'], [32.7, 34.6, 'It kills cattle herds'], [34.7, 35.8, 'North America: free of it'], [35.9, 38.2, 'The jungle was the wall'],
  [38.5, 41.1, 'Like drilling a submarine…'], [41.2, 42.8, '…to save a short walk'],
  [43.0, 44.3, 'So the wall stayed'], [44.4, 47.5, 'The longest road on Earth…'], [47.6, 49.2, '…ends in Yaviza'], [49.3, 50.9, '60 miles of jungle'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); submarine(ctx, t, clamp((t - 38.3) / 0.35) * clamp((42.85 - t) / 0.35));
  vignette(ctx); if (t < 50.9) drawText(ctx, t);
  if (t > 53.6) { ctx.save(); ctx.globalAlpha = clamp((t - 53.65) / 0.5); styledText(ctx, 'Alaska to Argentina by car…', W / 2, CAPTION.y + 80, CAPTION.size, { k: 1, shadow: CAPTION.shadow, maxW: 1000 }); ctx.restore(); }
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
