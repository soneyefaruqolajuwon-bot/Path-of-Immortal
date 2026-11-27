/* The Darién Gap — Mapheld 16:9 long-form (continues from the Short). renderAt(t) = voice clock incl. breathers. */
'use strict';
const W = 1920, H = 1080, DURATION = 216.02;
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
const V = { amer: [-85, 10, 6.2], gap: [-78.2, 8.4, 360], atl: [-40, 33, 9], mid: [-82, 8, 24], carib: [-77.6, 9.4, 200] };
const KEYS = [[0, 'amer', 1], [10.6, 'amer', 1.03], [13.2, 'gap', 1], [21.6, 'gap', 1.03], [23.2, 'atl', 1], [30.6, 'atl', 1.03], [32.2, 'gap', 1], [36.6, 'gap', 1.03],
  [50.0, 'gap', 1.0], [107.8, 'gap', 1.04], [109.6, 'gap', 1.04], [111.2, 'mid', 1], [126.8, 'mid', 1.03], [134.0, 'gap', 1], [165.6, 'gap', 1.04], [183.9, 'gap', 1.07],
  [185.6, 'gap', 1], [190.0, 'gap', 1.02], [191.2, 'carib', 1], [199.8, 'carib', 1.03], [201.4, 'amer', 1], [216.02, 'amer', 1.05]];
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
function carAt(ctx, c, ll, dir, k = 1, sq = 0) { const [x, y] = P(c, ll[0], ll[1]); const w = clamp(c.z * 0.55, 70, 200); sprite(ctx, 'car', x, y, w, { k, ay: 0.82, flip: dir < 0, sq }); }
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
// ------------------------------------------------------------------ long-form helpers (16:9)
const SCOT = [-4.2, 56.0], NEWED = [-77.68, 8.9], COLON = [-79.9, 9.36], CTG = [-75.5, 10.4];
function panel(ctx, k, x0 = 1000, y0 = 230, w = 860, h = 610) { if (k <= 0) return null; ctx.save(); ctx.globalAlpha = clamp(k * 1.4); ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 26); ctx.fillStyle = '#2F6B3A'; ctx.fill(); ctx.save(); ctx.clip(); return { x0, y0, w, h }; }
function panelEnd(ctx, p) { if (!p) return; ctx.restore(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(p.x0, p.y0, p.w, p.h, 26); ctx.stroke(); ctx.restore(); }
function jungleBack(ctx, p, seed = 8) { const r = rnd(seed); for (let i = 0; i < 14; i++) { const tx = p.x0 + r() * p.w, ty = p.y0 + 30 + r() * 220; ctx.fillStyle = i % 2 ? '#1F4D29' : '#3E8A4B'; ctx.beginPath(); ctx.arc(tx, ty, 60 + r() * 50, 0, 7); ctx.fill(); } }
function rain(ctx, p, t, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = 'rgba(220,240,255,0.8)'; ctx.lineWidth = 3; const r = rnd(4); for (let i = 0; i < 70; i++) { const xx = p.x0 + r() * p.w, yy = p.y0 + ((r() * p.h + t * 600) % p.h); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 6, yy + 18); ctx.stroke(); } ctx.restore(); }
function unionCard(ctx, t, k) {   // 1707: the Saltire + St George cross become one flag
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.3); ctx.fillStyle = 'rgba(7,19,24,0.85)'; ctx.fillRect(0, 0, W, H);
  const m = easeIO(clamp((t - 41.6) / 1.2)); const fw = 360, fh = 220;
  const draw = (x, y, sal, geo) => { ctx.save(); ctx.translate(x, y); ctx.fillStyle = sal ? '#005EB8' : '#FFFFFF'; ctx.fillRect(-fw / 2, -fh / 2, fw, fh); if (sal) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(-fw / 2, -fh / 2); ctx.lineTo(fw / 2, fh / 2); ctx.moveTo(fw / 2, -fh / 2); ctx.lineTo(-fw / 2, fh / 2); ctx.stroke(); }
    if (geo) { ctx.fillStyle = '#C8102E'; ctx.fillRect(-fw / 2, -22, fw, 44); ctx.fillRect(-22, -fh / 2, 44, fh); } ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.strokeRect(-fw / 2, -fh / 2, fw, fh); ctx.restore(); };
  if (m < 1) { draw(lerp(620, 960, m), 480, true, false); ctx.globalAlpha *= 1 - m * 0.4; draw(lerp(1300, 960, m), 480, false, true); }
  else draw(960, 480, true, true);
  styledText(ctx, 'SCOTLAND', 620, 680, 44, { k: 1 - m, fill: '#fff', stroke: C.ink }); styledText(ctx, 'ENGLAND', 1300, 680, 44, { k: 1 - m, fill: '#fff', stroke: C.ink });
  styledText(ctx, '1707', 960, 210, 120, { k: pop(t - 42.3), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  ctx.restore();
}
function gavel(ctx, t, t0, k) { if (k <= 0) return; const e = t - t0; const ang = e < 0 ? -0.9 : e < 0.15 ? lerp(-0.9, 0.2, e / 0.15) : 0.2; ctx.save(); ctx.translate(1380, 520); ctx.rotate(ang);
  ctx.fillStyle = '#6B4423'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-20, -260, 40, 260, 10); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-110, -330, 220, 90, 20); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#5A3A1E'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(1240, 560, 300, 50, 12); ctx.fill(); ctx.stroke(); if (e > 0.15 && e < 0.8) for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.strokeStyle = C.yellow; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(1390 + Math.cos(a) * 60, 560 + Math.sin(a) * 30); ctx.lineTo(1390 + Math.cos(a) * 110, 560 + Math.sin(a) * 60); ctx.stroke(); } }
function sub16(ctx, t, k) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.3); const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2C6A78'); gr.addColorStop(1, '#0E2A33'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 24; i++) { const bx = (i * 157) % W, by = H - ((t * 80 + i * 90) % H); ctx.beginPath(); ctx.arc(bx, by, 6 + (i % 3) * 3, 0, 7); ctx.fill(); }
  const cx = 960, cy = 640; ctx.fillStyle = '#F4C430'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(cx, cy, 520, 160, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(cx - 110, cy - 270, 220, 130, 20); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9ED0E6'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx - 380 + i * 190, cy + 10, 36, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#F4C430'; ctx.beginPath(); ctx.moveTo(cx + 500, cy); ctx.lineTo(cx + 610, cy - 100); ctx.lineTo(cx + 610, cy + 100); ctx.closePath(); ctx.fill(); ctx.stroke();
  person(ctx, 'driller', cx - 330, cy - 140, 240, { k: pop(t - 127.1) });
  const hole = clamp((t - 128.7) / 0.5); if (hole > 0 && t < 130.3) { ctx.fillStyle = '#5FD3FF'; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.25; ctx.beginPath(); ctx.arc(cx - 352 + Math.cos(a) * 40 * hole, cy - 150 + Math.sin(a) * 60 * hole, 8, 0, 7); ctx.fill(); } }
  person(ctx, 'panic', cx + 260, cy - 150, 230, { k: pop(t - 129.4) });
  if (t > 130.3) { const s = pop(t - 130.3, 0.25); ctx.save(); ctx.translate(cx - 340, cy - 130); ctx.rotate(-0.2); ctx.scale(s, s); ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.rect(-170, -36, 340, 72); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#141416'; for (let i = -6; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-170 + i * 50, 36); ctx.lineTo(-150 + i * 50, 36); ctx.lineTo(-110 + i * 50, -36); ctx.lineTo(-130 + i * 50, -36); ctx.fill(); } ctx.restore();
    ctx.fillStyle = '#FFD43B'; ctx.fillRect(-90, -26, 180, 52); setFont(ctx, 'Montserrat', 50); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NOPE', 0, 3); ctx.restore(); }
  chip(ctx, 'DRILL A HOLE IN A SUBMARINE…', W / 2, 150, win(t, 127.2, 131.8), { size: 44 }); chip(ctx, '…TO SAVE A SHORT WALK?', W / 2, 150, win(t, 131.9, 133.9), { size: 44 });
  ctx.restore(); }
function migrants(ctx, c, t, k) {   // a steady line of small walking figures along the route north
  if (k <= 0) return; const route = [[-76.75, 8.45], [-77.2, 8.1], [-77.6, 7.95], [-77.9, 8.2], [-78.1, 8.5]]; ctx.save(); ctx.globalAlpha = clamp(k);
  for (let i = 0; i < 26; i++) { const u = ((t * 0.05 + i / 26) % 1); const [lo, la] = geoAlong(route, u); const [x, y] = P(c, lo, la); ctx.fillStyle = '#FFF3D6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 16, 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillRect(x - 4, y - 10, 8, 14); ctx.strokeRect(x - 4, y - 10, 8, 14); }
  ctx.restore(); }

// ------------------------------------------------------------------ the story
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  const atl = t > 22.0 && t < 32.0;
  if (!atl) { road(ctx, c, HN); road(ctx, c, HS); if (c.z > 40) { const sp = CANAL.map(p => P(c, p[0], p[1])); ctx.save(); ctx.strokeStyle = '#5FD3FF'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); sp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); } }
  const green = t > 64.0 && t < 200.5; if (!atl) { gapFill(ctx, c, green ? 0.6 : 0.45 + 0.2 * Math.sin(t * 5), green ? '#2E7D32' : '#D7263D', green ? null : '#FF6B6B'); if (green && c.z > 40) trees(ctx, c, clamp((t - 64.2) / 0.6)); }
  // ---------------- B1 the highway and the gap (0–22.1)
  if (t < 22.1) {
    const k = t < 0.4 ? 0 : t < 12.6 ? easeIO((t - 0.4) / 12.2) * 0.985 : 0.985;
    let [lo, la, dir] = geoAlong(HN, k); if (t > 12.0) { const u = easeOut(clamp((t - 12.2) / 1.6)); lo = lerp(-78.9, CARSTOP[0], u); la = lerp(8.95, CARSTOP[1], u); dir = 1; }
    carAt(ctx, c, [lo, la], dir < 0 ? -1 : 1, 1, t > 13.9 && t < 14.3 ? 0.12 : 0); barrier(ctx, c, pop(t - 13.3), t);
    styledText(ctx, '19,000 MILES', W / 2, 160, 120, { k: win(t, 5.0, 9.3), fill: C.yellow, stroke: C.goldDark, rot: -3 }); chip(ctx, 'THE LONGEST DRIVABLE ROAD ON EARTH', W / 2, 290, win(t, 7.1, 9.3), { size: 40 });
    kinetic(ctx, '…EXCEPT ONE GAP', 160, win(t, 9.4, 13.2), 110, -3, '#FF6B6B');
    stamp(ctx, 'ROAD ENDS HERE', W / 2, 180, t, 14.1, { size: 60, until: 15.5 }); if (t > 14.1) puff(ctx, ...P(c, YAV[0] + 0.03, YAV[1]), 120, clamp((t - 14.1) / 0.6), 3);
    const [gx, gy] = P(c, -77.55, 7.75); goldLabel(ctx, 'THE DARIÉN GAP', gx, gy, 64, pop(t - 15.6));
    styledText(ctx, '300+ YEARS UNDEFEATED', W / 2, 160, 96, { k: win(t, 17.1, 21.9), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  }
  // ---------------- B2 the Scots, 1698 (22.1–50.05)
  if (t > 22.0 && t < 32.1) {
    kinetic(ctx, '1698', 160, win(t, 22.2, 25.4), 140); labelAt(ctx, c, SCOT, 'SCOTLAND', pop(t - 24.2), 40, 70, 44);
    for (let i = 0; i < 5; i++) { const u = clamp((t - 23.3 - i * 0.25) / 6.5); if (u <= 0) continue; const lo = lerp(SCOT[0] - 3, NEWED[0], u), la = lerp(SCOT[1] - 1, NEWED[1], u) + Math.sin(u * Math.PI) * 6 + (i - 2) * 1.2; const [x, y] = P(c, lo, la); sprite(ctx, 'scot_ship', x, y + wob(t, 0.5, 4, i), 110, { ay: 0.8, flip: true }); }
    chip(ctx, '5 SHIPS', W / 2, 150, win(t, 23.3, 26.1), { size: 44 }); chip(ctx, "THOUSANDS OF SCOTS' SAVINGS 💰", W / 2, 150, win(t, 26.2, 29.3), { size: 42 }); chip(ctx, 'A COLONY BETWEEN TWO OCEANS', W / 2, 150, win(t, 29.4, 31.9), { size: 42 });
  }
  if (t > 32.0 && t < 50.1) {
    const [fx, fy] = P(c, ...NEWED); const fall = clamp((t - 35.3) / 1.2);
    sprite(ctx, 'fort', fx - 40, fy + 10, 220, { ay: 1, k: pop(t - 32.1) * (1 - fall * 0.6), rot: fall * 12 });
    goldLabel(ctx, 'NEW EDINBURGH', fx - 40, fy + 50, 44, pop(t - 32.3) * popOut(36.8 - t));
    stamp(ctx, 'DISASTER', W / 2, 160, t, 32.5, { size: 72, until: 36.8 });
    ['🤒 FEVER', '🍞 HUNGER', '🌴 THE JUNGLE'].forEach((s2, i) => chip(ctx, s2, 1480, 330 + i * 90, win(t, [33.4, 33.9, 34.5][i], 36.8), { size: 38 }));
    if (t > 37.0 && t < 41.4) { chip(ctx, 'A HUGE SHARE OF SCOTLAND\'S MONEY: GONE', W / 2, 150, win(t, 37.0, 41.3), { size: 40 }); for (let i = 0; i < 14; i++) { const u = ((t - 37.0) * 0.7 + i / 14) % 1; ctx.fillStyle = '#F4D03F'; ctx.strokeStyle = '#7A5C0E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(380 + i * 85, 300 + u * 500, 24, 9, 0, 0, 7); ctx.fill(); ctx.stroke(); } }
    unionCard(ctx, t, win(t, 40.9, 49.9, 0.4, 0.4));
    if (t > 40.9) { chip(ctx, 'SCOTLAND JOINS ENGLAND', W / 2, 790, win(t, 41.5, 44.4), { size: 44 }); chip(ctx, '…AND THE INVESTORS GOT PAID BACK', W / 2, 790, win(t, 44.5, 46.5), { size: 42 }); kinetic(ctx, 'THE JUNGLE HELPED CREATE THE UK', 790, win(t, 46.6, 49.9), 76); }
  }
  // ---------------- B3 the canal, 1914 (50–63.4)
  if (t > 50.0 && t < 63.5) {
    carAt(ctx, c, CARSTOP, 1); barrier(ctx, c, 1, t);
    kinetic(ctx, '1914', 160, win(t, 52.8, 55.5), 130); const su = clamp((t - 53.6) / 3.2); if (su > 0) { const [lo, la] = geoAlong(CANAL, su); const [sx, sy] = P(c, lo, la); sprite(ctx, 'cargo', sx, sy, 160, { ay: 0.7 }); }
    const [ax, ay] = P(c, -79.62, 9.05), [bx, by] = P(c, ...YAV); goldLabel(ctx, 'PANAMA CANAL', ax - 20, ay + 120, 56, pop(t - 54.9));
    const dk = clamp((t - 57.5) / 0.8); if (dk > 0) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.setLineDash([18, 12]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, dk), lerp(ay, by, dk)); ctx.stroke(); ctx.restore(); chip(ctx, '≈ 150 MILES', (ax + bx) / 2, (ay + by) / 2 - 70, win(t, 57.7, 63.3), { size: 38 }); }
    chip(ctx, 'PEOPLE FINALLY WON A ROUND', W / 2, 150, win(t, 50.1, 52.7), { size: 44 }); chip(ctx, '1970s: 60 MILES OF ROAD? EASY.', W / 2, 150, win(t, 59.4, 63.3), { size: 42 });
  }
  // ---------------- B4 what's in there (63.4–77.3)
  if (t > 63.3 && t < 77.4) {
    carAt(ctx, c, CARSTOP, 1); barrier(ctx, c, 1, t); chip(ctx, "UNTIL YOU SEE WHAT'S IN THERE", W / 2, 150, win(t, 63.5, 66.2), { size: 42 });
    ['🌴 RAINFOREST', '🐊 SWAMPS', '⛰️ MOUNTAINS'].forEach((s2, i) => chip(ctx, s2, 540 + i * 420, 150, win(t, [66.3, 67.1, 68.0][i], 69.3), { size: 38 }));
    const p = panel(ctx, win(t, 69.2, 77.2, 0.35, 0.3)); if (p) { ctx.fillStyle = '#7FA7B5'; ctx.fillRect(p.x0, p.y0, p.w, p.h); ctx.fillStyle = '#5E6E74'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(p.x0 + 100 + i * 180, p.y0 + 40, 90, 0, 7); ctx.fill(); }
      rain(ctx, p, t); const mudY = p.y0 + 380; ctx.fillStyle = '#5C4033'; ctx.beginPath(); ctx.moveTo(p.x0, mudY); for (let xx = 0; xx <= p.w; xx += 40) ctx.lineTo(p.x0 + xx, mudY + Math.sin(xx * 0.05 + t * 3) * 8); ctx.lineTo(p.x0 + p.w, p.y0 + p.h); ctx.lineTo(p.x0, p.y0 + p.h); ctx.fill();
      if (t > 73.7) { const sh = Math.sin((t - 73.7) * 1.5) * 120; ctx.strokeStyle = '#3A86C8'; ctx.lineWidth = 40; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x0, mudY + 120); ctx.bezierCurveTo(p.x0 + 250, mudY + 60 + sh, p.x0 + 600, mudY + 200 - sh, p.x0 + p.w, mudY + 110); ctx.stroke(); }
      person(ctx, 'engineer', p.x0 + 220, mudY + 40 + easeIn(clamp((t - 72.4) / 2)) * 60, 200);
      panelEnd(ctx, p); }
    chip(ctx, 'HEAVIEST RAIN IN THE AMERICAS', W / 2, 150, win(t, 69.4, 71.2), { size: 42 }); chip(ctx, 'BOTTOMLESS MUD', W / 2, 150, win(t, 71.3, 73.8), { size: 44 }); chip(ctx, 'RIVERS MOVE EVERY YEAR', W / 2, 150, win(t, 73.9, 77.2), { size: 42 });
  }
  // ---------------- B5 1972: two Range Rovers (77.3–93)
  if (t > 77.2 && t < 93.1) {
    carAt(ctx, c, CARSTOP, 1); barrier(ctx, c, 1, t);
    chip(ctx, '1972: A BRITISH ARMY EXPEDITION', W / 2, 150, win(t, 77.4, 80.6), { size: 42 }); chip(ctx, 'TWO RANGE ROVERS', W / 2, 150, win(t, 80.7, 82.2), { size: 44 });
    chip(ctx, 'MACHETES', W / 2, 150, win(t, 82.3, 84.9), { size: 44 }); chip(ctx, 'BRIDGES & RAFTS', W / 2, 150, win(t, 85.0, 88.5), { size: 44 }); chip(ctx, 'AND THE CARS KEPT BREAKING', W / 2, 150, win(t, 88.6, 90.2), { size: 42 });
    styledText(ctx, '≈ 100 DAYS', W / 2, 160, 130, { k: win(t, 90.3, 92.9), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    const p = panel(ctx, win(t, 78.4, 92.9, 0.35, 0.3)); if (p) { jungleBack(ctx, p); const groundY = p.y0 + 450, river = clamp((t - 86.6) / 0.5) * (1 - clamp((t - 88.4) / 0.5));
      ctx.fillStyle = '#5C4033'; ctx.fillRect(p.x0, groundY, p.w, p.h); if (river > 0) { ctx.globalAlpha *= river; ctx.fillStyle = '#3A86C8'; ctx.fillRect(p.x0, groundY - 10, p.w, p.h); ctx.globalAlpha /= river; }
      if (t > 82.3 && t < 85.4) for (let i = 0; i < 5; i++) { const vx = p.x0 + 560 + i * 60, cut = clamp((t - 82.6 - i * 0.3) / 0.4); ctx.strokeStyle = '#1F4D29'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(vx, p.y0); ctx.lineTo(vx + Math.sin(i) * 10, p.y0 + 340 + cut * 120); ctx.stroke(); }
      const onRaft = t > 86.8 && t < 88.4, bob = onRaft ? Math.sin(t * 3) * 6 : 0, broken = t > 88.6 && t < 90.2;
      const rx = onRaft ? lerp(p.x0 + 140, p.x0 + 640, easeIO(clamp((t - 86.9) / 1.4))) : t >= 88.4 ? lerp(p.x0 + 640, p.x0 + 900, clamp((t - 90.2) / 2.4)) : p.x0 + 300;
      if (onRaft) { ctx.fillStyle = '#8B5A2B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.fillRect(rx - 160, groundY - 6 + bob, 320, 24); ctx.strokeRect(rx - 160, groundY - 6 + bob, 320, 24); }
      if (t > 85.0 && t < 86.8) { ctx.fillStyle = '#8B5A2B'; for (let i = 0; i < 6; i++) ctx.fillRect(p.x0 + 420 + i * 40, groundY - 8, 30, 16); }
      sprite(ctx, 'rangerover', rx + (broken ? Math.sin(t * 40) * 3 : 0), groundY + 4 + bob, 280, { ay: 1 }); if (broken) puff(ctx, rx + 100, groundY - 120, 110, ((t - 88.6) % 0.8) / 0.8, 5);
      if (t > 82.2) person(ctx, 'soldier', onRaft ? rx - 220 : p.x0 + 520, groundY + 10 + bob, 200, { k: pop(t - 82.2) });
      const day = Math.max(1, Math.round(100 * easeIn(clamp((t - 78.6) / 12.3)) ** 0.6)); chip(ctx, `DAY ${day}`, p.x0 + p.w - 120, p.y0 + 55, 1, { size: 40, bg: '#141416', fill: day >= 100 ? C.yellow : '#fff' });
      panelEnd(ctx, p); }
  }
  // ---------------- B6 1971: the deal; B7 1974: the court (93–109.6)
  if (t > 93.0 && t < 109.7) {
    carAt(ctx, c, CARSTOP, 1); barrier(ctx, c, 1, t);
    chip(ctx, 'MEANWHILE, A REAL ROAD WAS COMING', W / 2, 150, win(t, 93.1, 96.2), { size: 42 }); kinetic(ctx, '1971', 160, win(t, 96.3, 98.6), 130);
    person(ctx, 'us_official', 330, 820, 250, { k: win(t, 97.3, 104.9) }); person(ctx, 'pan_official', 540, 820, 250, { k: win(t, 97.9, 104.9) });
    goldLabel(ctx, 'UNITED STATES', 330, 866, 30, win(t, 97.3, 104.9)); goldLabel(ctx, 'PANAMA', 540, 866, 30, win(t, 97.9, 104.9));
    chip(ctx, 'A DEAL TO CLOSE THE GAP', W / 2, 150, win(t, 98.7, 101.2), { size: 44 }); styledText(ctx, 'US PAYS ⅔', W / 2, 160, 120, { k: win(t, 101.3, 102.6), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    if (t > 102.6) { const u = clamp((t - 102.7) / 2.4); const [bx, by] = P(c, lerp(-78.3, -77.95, u), lerp(8.55, 8.3, u)); sprite(ctx, 'bulldozer', bx, by, 150, { ay: 0.9, k: pop(t - 102.7) * (t < 107.2 ? 1 : 0.6) }); chip(ctx, 'THE BULLDOZERS ROLL IN', W / 2, 150, win(t, 102.7, 105.1), { size: 44 }); }
    if (t > 105.0) { gavel(ctx, t, 107.2, win(t, 105.2, 109.5)); kinetic(ctx, '3 YEARS LATER…', 160, win(t, 105.3, 107.0), 96); stamp(ctx, 'HALTED · 1974', W / 2, 170, t, 107.3, { size: 64, until: 109.5 }); }
  }
  // ---------------- B8 not trees: cows (109.6–126.9)
  if (t > 109.5 && t < 127.0) {
    const end = popOut(126.8 - t, 0.3);
    chip(ctx, 'ENVIRONMENTAL GROUPS SUED', W / 2, 150, win(t, 109.7, 112.5), { size: 44 });
    if (t > 112.5 && t < 114.0) { chip(ctx, '🌳 NOT ABOUT TREES…', W / 2, 150, win(t, 112.5, 113.9), { size: 44 }); }
    kinetic(ctx, 'IT WAS ABOUT COWS 🐄', 160, win(t, 114.0, 116.0), 100);
    fillKey(ctx, c, 'sa', '#D7263D', 0.35 * clamp((t - 115.0) / 0.6) * end, null); fillKey(ctx, c, 'na', '#1E8E3E', 0.35 * clamp((t - 120.2) / 0.5) * end, null);
    const r = rnd(21); for (let i = 0; i < 10; i++) { const ll = [-76 + r() * 20, -1 - r() * 12]; const [x, y] = P(c, ll[0], ll[1]); sprite(ctx, i % 3 ? 'virus' : 'cow', x, y, i % 3 ? 60 : 100, { k: pop(t - 115.4 - i * 0.12) * end }); }
    chip(ctx, 'FOOT-AND-MOUTH DISEASE', W / 2, 150, win(t, 116.1, 119.4), { size: 44, stroke: '#FF6B6B' }); chip(ctx, 'IT WIPES OUT ENTIRE HERDS', W / 2, 150, win(t, 119.5, 120.1), { size: 40, stroke: '#FF6B6B' });
    const [nx, ny] = P(c, -95, 20); badge(ctx, 'DISEASE-FREE ✓', nx, ny, pop(t - 120.3) * end, '#1E8E3E');
    if (t > 122.8) { gapFill(ctx, c, 0.9 * end, C.gold, '#FFF3B0'); const [gx, gy] = P(c, -77.5, 8.0); ring(ctx, gx, gy, 80, t); stamp(ctx, 'QUARANTINE WALL', gx + 260, gy - 60, t, 124.3, { size: 50, until: 126.8 }); person(ctx, 'inspector', 1650, 900, 230, { k: pop(t - 123.3) * end }); }
  }
  // ---------------- B10 stalled (134–141.8)
  if (t > 133.9 && t < 141.9) {
    carAt(ctx, c, CARSTOP, 1); barrier(ctx, c, 1, t); const [bx, by] = P(c, -77.95, 8.3); sprite(ctx, 'bulldozer', bx, by, 150, { ay: 0.9, alpha: lerp(1, 0.35, clamp((t - 138.6) / 1.5)) });
    if (t > 138.6) styledText(ctx, 'Z z z', bx + 90, by - 120 - (t - 138.6) * 10, 48, { k: pop(t - 138.7), fill: '#fff', stroke: C.ink });
    chip(ctx, 'AMERICAN FARMERS: DISASTER RISK', W / 2, 150, win(t, 134.2, 137.0), { size: 40 }); stamp(ctx, 'PROJECT STALLED', W / 2, 170, t, 137.1, { size: 62, until: 139.5 }); chip(ctx, '…AND NEVER RESTARTED', W / 2, 150, win(t, 139.6, 141.7), { size: 44 });
  }
  // ---------------- B11 the people of the forest + the park (141.8–165.7)
  if (t > 141.7 && t < 165.8) {
    const end = popOut(165.6 - t, 0.3); const [hx, hy] = P(c, -77.85, 8.05);
    sprite(ctx, 'stilt', hx, hy, 150, { ay: 1, k: pop(t - 144.4) * end });
    ['EMBERÁ', 'WOUNAAN', 'GUNA'].forEach((s2, i) => chip(ctx, s2, 600 + i * 360, 150, win(t, [144.5, 145.0, 145.6][i], 149.0), { size: 44 }));
    chip(ctx, 'HERE FOR CENTURIES', W / 2, 260, win(t, 147.4, 149.0), { size: 40 });
    const p = panel(ctx, win(t, 149.9, 156.0, 0.35, 0.3)); if (p) { ctx.fillStyle = '#2F6B3A'; ctx.fillRect(p.x0, p.y0, p.w, p.h); jungleBack(ctx, p, 13); const ry = p.y0 + p.h / 2; const grow = clamp((t - 151.6) / 2.5);
      ctx.fillStyle = '#C9A26B'; for (let i = 0; i < 8; i++) { const fx = p.x0 + 60 + i * 100, len = 40 + grow * 160 * ((i % 3) / 2 + 0.5); ctx.fillRect(fx, ry - len, 46, len * 2); }
      ctx.fillStyle = '#8B7355'; ctx.fillRect(p.x0, ry - 22, p.w, 44); ctx.strokeStyle = '#F4D03F'; ctx.lineWidth = 5; ctx.setLineDash([30, 20]); ctx.beginPath(); ctx.moveTo(p.x0, ry); ctx.lineTo(p.x0 + p.w, ry); ctx.stroke(); ctx.setLineDash([]);
      ['🪓 LOGGING', '🏚️ LAND GRABS', '🔥 DEFORESTATION'].forEach((s2, i) => chip(ctx, s2, p.x0 + 160 + i * 270, p.y0 + p.h - 60, pop(t - [152.0, 152.5, 153.3][i]), { size: 30, stroke: '#FF6B6B' }));
      panelEnd(ctx, p); styledText(ctx, 'THE AMAZON', 1430, 200, 44, { k: win(t, 150.1, 156.0), fill: '#fff', stroke: C.ink }); }
    chip(ctx, 'SO THEY FOUGHT TO KEEP IT OUT', W / 2, 150, win(t, 155.9, 158.9), { size: 42 });
    if (t > 158.9) { strokeKey(ctx, c, 'gap', C.gold, 7, clamp((t - 159.0) / 0.5) * end); const [px, py] = P(c, -77.15, 8.75); goldLabel(ctx, 'DARIÉN NATIONAL PARK', px + 120, py, 48, pop(t - 159.2) * end); chip(ctx, 'UNESCO WORLD HERITAGE SITE', W / 2, 150, win(t, 160.4, 165.6), { size: 42 });
      ['🐆', '🦜', '🐸', '🦋'].forEach((e, i) => emoji(ctx, e, 1500 + (i % 2) * 140, 420 + Math.floor(i / 2) * 150, 90, pop(t - 162.6 - i * 0.15) * end)); }
  }
  // ---------------- B12 migration (165.7–184)
  if (t > 165.6 && t < 184.1) {
    const end = popOut(183.9 - t, 0.3); chip(ctx, 'A NEW PURPOSE NOBODY PLANNED', W / 2, 150, win(t, 165.8, 168.9), { size: 42 });
    ['🚫 NO ROADS', '🚫 NO POLICE'].forEach((s2, i) => chip(ctx, s2, 760 + i * 400, 150, win(t, [168.9, 169.6][i], 172.3), { size: 40 }));
    migrants(ctx, c, t, clamp((t - 170.5) / 0.8) * end); chip(ctx, 'ONE OF THE MOST DANGEROUS ROUTES IN THE WORLD', W / 2, 150, win(t, 172.4, 174.1), { size: 38 });
    styledText(ctx, '2023: 500,000+ PEOPLE', W / 2, 160, 104, { k: win(t, 174.2, 178.2), fill: C.yellow, stroke: C.goldDark, rot: -3 }); chip(ctx, 'ON FOOT', W / 2, 280, win(t, 177.5, 178.2), { size: 40 });
    ['🌊 RIVERS', '🟫 MUD', '⚠️ ARMED GANGS'].forEach((s2, i) => chip(ctx, s2, 560 + i * 400, 150, win(t, [178.3, 178.8, 179.4][i], 180.7), { size: 38 }));
    chip(ctx, 'GOVERNMENTS: EVEN LESS EAGER TO OPEN IT', W / 2, 150, win(t, 180.8, 183.8), { size: 40 });
  }
  // ---------------- B13 Yaviza, the ferry, the cargo ship (184–200.3)
  if (t > 183.9 && t < 200.4) {
    const end = popOut(200.2 - t, 0.3);
    if (t < 191.0) { carAt(ctx, c, CARSTOP, 1); barrier(ctx, c, 1, t); const [yx, yy] = P(c, ...YAV); sprite(ctx, 'yaviza', yx + 200, yy + 40, 160, { ay: 1, k: pop(t - 188.9) }); chip(ctx, 'YOUR ROAD TRIP ENDS HERE', W / 2, 150, win(t, 186.8, 188.8), { size: 44 }); goldLabel(ctx, 'YAVIZA, PANAMA', yx + 200, yy - 170, 48, pop(t - 189.0)); }
    else {
      labelAt(ctx, c, COLON, 'COLÓN', pop(t - 191.3) * end, -60, -50, 38); labelAt(ctx, c, CTG, 'CARTAGENA', pop(t - 191.5) * end, 0, -50, 38);
      kinetic(ctx, '2014: A CAR FERRY', 160, win(t, 190.5, 192.9), 100);
      const fu = clamp((t - 191.6) / 2.4); if (t < 195.4) { const [x0, y0] = P(c, ...COLON), [x1, y1] = P(c, ...CTG); const sink = clamp((t - 194.2) / 1.0); sprite(ctx, 'ferry', lerp(x0, x1, fu * 0.7), lerp(y0, y1, fu * 0.7) + 40 + sink * 80, 220, { ay: 0.8, alpha: 1 - sink, rot: sink * 15 }); }
      stamp(ctx, 'LASTED A FEW MONTHS', W / 2, 170, t, 194.2, { size: 58, until: 196.6 });
      if (t > 196.6) { const u = clamp((t - 196.8) / 2.6); const [x0, y0] = P(c, ...COLON), [x1, y1] = P(c, ...CTG); const x = lerp(x0, x1, u), y = lerp(y0, y1, u) + 40; sprite(ctx, 'cargo', x, y, 260, { ay: 0.7 }); sprite(ctx, 'car', x - 20, y - 80, 110, { ay: 0.8 }); chip(ctx, 'YOUR CAR GOES BY CARGO SHIP', W / 2, 150, win(t, 196.8, 198.0), { size: 42 }); }
      kinetic(ctx, 'THE JUNGLE WINS AGAIN', 160, win(t, 198.0, 200.2), 96, -3, '#7DDC9A');
    }
  }
  // ---------------- B14 the question (200.3–210)
  if (t > 200.3) {
    carAt(ctx, c, CARSTOP, 1, clamp((t - 200.5) / 0.4));
    chip(ctx, 'AFTER 300 YEARS…', W / 2, 150, win(t, 201.0, 204.9), { size: 44 });
    if (t > 205.0 && t < 210.1) { chip(ctx, '🛣️ BUILD THE LAST 60 MILES?', 560, 150, pop(t - 205.0), { size: 40, bg: '#1F3B73' }); chip(ctx, '🌳 KEEP IT CLOSED FOREVER?', 1360, 150, pop(t - 207.6), { size: 40, bg: '#1E5E2E' }); }
  }
}
function endCard(ctx, t) {
  if (t < 210.02) return; const e = t - 210.02, k = clamp(e / 0.4);
  ctx.fillStyle = `rgba(4,10,14,${0.74 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, '300 YEARS. 60 MILES.', W / 2, 230, 92, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'STILL NO ROAD.', W / 2, 360, 116, { k: pop(e - 0.35, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -2 });
  const kc = pop(e - 0.9, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 540); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 50);
    const w = ctx.measureText('SUBSCRIBE TO MAPHELD').width + 130; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -60, w, 120, 60); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 44, -22); ctx.lineTo(-w / 2 + 44, 22); ctx.lineTo(-w / 2 + 80, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SUBSCRIBE TO MAPHELD', 24, 3); ctx.restore(); }
  chip(ctx, 'BUILD IT OR KEEP IT CLOSED? 👇', W / 2, 700, pop(e - 1.4, 0.35), { size: 42 });
  person(ctx, 'inspector', 1680, 1010, 220, { k: pop(e - 1.8) });
  const se = e - 2.4; if (se > 0) { const sl = se < 0.16 ? lerp(2.2, 1, easeIn(se / 0.16)) : 1; ctx.save(); ctx.translate(1420, 860); ctx.rotate(-0.15); ctx.scale(sl, sl); ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 105, 0, 7); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 88, 0, 7); ctx.stroke(); setFont(ctx, 'Montserrat', 40); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MAPHELD', 0, 2); setFont(ctx, 'Montserrat', 18); ctx.fillText('★ EVERY BORDER HAS A STORY ★', 0, 44); ctx.restore(); }
}
const CAPTIONS = [
  [0.2, 4.9, 'Alaska to Argentina'], [5.0, 9.3, '19,000 miles of road'], [9.4, 14.3, 'Except one gap'], [14.4, 17.0, 'The Darién Gap'], [17.1, 21.9, '300 years undefeated'],
  [22.2, 26.1, '1698: five ships from Scotland'], [26.2, 31.9, 'A colony between two oceans'], [32.0, 36.8, 'A disaster'], [36.9, 40.9, 'A huge share of the money, gone'], [41.0, 44.4, '1707: Scotland joins England'], [44.5, 46.5, 'Investors paid back'], [46.6, 49.9, 'The jungle helped make the UK'],
  [50.1, 52.7, 'People finally won a round'], [52.8, 57.4, '1914: the Panama Canal'], [57.5, 59.3, '150 miles away'], [59.4, 63.3, 'So 60 miles should be easy…'],
  [63.5, 66.2, 'Until you see what\'s in there'], [66.3, 69.3, 'Rainforest, swamps, mountains'], [69.4, 73.8, 'Heavy rain, bottomless mud'], [73.9, 77.2, 'Rivers that move every year'],
  [77.4, 80.6, '1972: a British Army expedition'], [80.7, 84.9, 'Two Range Rovers, machetes'], [85.0, 88.5, 'Bridges and rafts'], [88.6, 90.2, 'The cars kept breaking'], [90.3, 92.9, 'About 100 days to cross'],
  [93.1, 96.2, 'Meanwhile, a real road'], [96.3, 101.2, '1971: the US and Panama deal'], [101.3, 102.6, 'The US pays two-thirds'], [102.7, 105.1, 'The bulldozers roll in'], [105.3, 109.4, '1974: a court stops it'],
  [109.7, 112.5, 'Environmental groups sued'], [112.6, 115.9, 'Not trees. Cows.'], [116.0, 120.1, 'Foot-and-mouth disease'], [120.2, 122.7, 'North America: free of it'], [122.8, 126.7, 'The jungle was the wall'],
  [127.1, 131.8, 'Like drilling a submarine…'], [131.9, 133.9, '…to save a short walk'],
  [134.2, 137.0, 'A disaster risk for farmers'], [137.1, 139.5, 'The project stalled'], [139.6, 141.6, 'It never came back'],
  [141.9, 144.4, 'They didn\'t want it either'], [144.5, 149.0, 'Emberá, Wounaan and Guna peoples'], [149.1, 154.0, 'Roads bring logging, land grabs'], [154.1, 158.9, 'So they fought to keep it out'], [159.0, 162.5, 'Darién National Park'], [162.6, 165.6, 'UNESCO World Heritage'],
  [165.8, 168.9, 'A new purpose'], [169.0, 174.1, 'One of the most dangerous routes'], [174.2, 178.2, '2023: 500,000+ crossed on foot'], [178.3, 180.7, 'Rivers, mud, armed gangs'], [180.8, 183.8, 'Governments keep it closed'],
  [184.1, 188.8, 'Your road trip ends…'], [188.9, 190.4, '…in Yaviza'], [190.5, 194.1, '2014: a car ferry'], [194.2, 196.6, 'It lasted a few months'], [196.7, 198.0, 'Your car goes by ship'], [198.1, 200.2, 'The jungle wins again'],
  [200.4, 204.9, 'After 300 years…'], [205.0, 209.9, 'Build it, or keep it closed?'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .24, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, H * 1.0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (!(t > 127.4 && t < 133.7)) scene(ctx, t); sub16(ctx, t, clamp((t - 126.95) / 0.4) * clamp((134.0 - t) / 0.4));
  vignette(ctx); if (t < 210.02) drawText(ctx, t); endCard(ctx, t);
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
function labelAt(ctx, c, ll, text, k, dx = 0, dy = 50, size = 34) { const [x, y] = P(c, ll[0], ll[1]); goldLabel(ctx, text, x + dx, y + dy, size, k); }
function emoji(ctx, ch, x, y, size, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.font = `${size}px "Noto Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, 0); ctx.restore(); }
