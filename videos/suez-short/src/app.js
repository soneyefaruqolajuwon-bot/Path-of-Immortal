/* One stuck ship froze 12% of world trade (the Ever Given, Suez 2021) — Mapheld 9:16 short; card, then glides back into frame 1 (loop). */
'use strict';
const W = 1080, H = 1920, DURATION = 64.94;
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
const V = { world: [52, 18, 7.2], suez: [33.2, 28.8, 46], canal: [32.4, 30.5, 260], tr: [30.5, 41.6, 44] };
const KEYS = [[0, 'world', 1], [5.6, 'world', 1.04], [7.0, 'suez', 1], [12.9, 'suez', 1.04], [14.4, 'canal', 1], [15.6, 'canal', 1.02], [40.9, 'suez', 1], [48.8, 'suez', 1.04], [53.5, 'suez', 1.04], [55.4, 'tr', 1], [62.3, 'tr', 1.04], [63.9, 'tr', 1.04], [64.94, 'world', 1]];
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
  for (const key of Object.keys(GEO).filter(k => !['canal'].includes(k))) {
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
  const set = c.z > 30 ? PATHS.mid : PATHS.wide;
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

function windCloud(ctx, x, y, s, t, k = 1) {   // the culprit: a cheeky cloud blowing west → east
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  ctx.fillStyle = '#F4F7FA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; const cl = new Path2D(); cl.arc(-80, 10, 60, 0, 7); cl.arc(0, -30, 85, 0, 7); cl.arc(80, 10, 62, 0, 7); cl.rect(-80, 10, 160, 66); ctx.fill(cl);
  ctx.beginPath(); ctx.arc(-80, 10, 60, Math.PI * 0.5, Math.PI * 1.6); ctx.arc(0, -30, 85, Math.PI * 1.15, Math.PI * 1.9); ctx.arc(80, 10, 62, Math.PI * 1.4, Math.PI * 0.5); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = C.ink; for (const ex of [-30, 30]) { ctx.beginPath(); ctx.ellipse(ex, -24, 10, 14, 0, 0, 7); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-50, -54); ctx.lineTo(-14, -44); ctx.moveTo(50, -54); ctx.lineTo(14, -44); ctx.stroke();   // cheeky brows
  ctx.fillStyle = '#F4B6C2'; for (const ex of [-58, 58]) { ctx.beginPath(); ctx.ellipse(ex, 12, 22, 16, 0, 0, 7); ctx.fill(); }      // puffed cheeks
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(66, 20, 13, 16, 0, 0, 7); ctx.fill();                                            // blowing "o"
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { const u = ((t * 1.4 + i / 3) % 1); ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.moveTo(110 + u * 160, -10 + i * 26); ctx.quadraticCurveTo(150 + u * 160, -26 + i * 26, 190 + u * 160, -10 + i * 26); ctx.stroke(); }
  ctx.restore(); }

// ------------------------------------------------------------------ Suez helpers
const CANALPTS = (() => { const r = GEO.canal[0], o = []; for (let i = 0; i < r.length; i += 2) o.push([r[i], r[i + 1]]); return o; })();
const SHIP_COLS = ['#E63946', '#F4A300', '#2A9D8F', '#3A86FF', '#F4D03F'];
function topShip(ctx, x, y, len, rot, o = {}) {   // a container ship seen from above; (x,y) = centre, len = px
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const w = len * 0.15;
  ctx.fillStyle = o.hull || '#1F3B73'; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, len * 0.012);
  ctx.beginPath(); ctx.moveTo(-len / 2, -w / 2); ctx.lineTo(len * 0.38, -w / 2); ctx.quadraticCurveTo(len / 2, 0, len * 0.38, w / 2); ctx.lineTo(-len / 2, w / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  const n = Math.max(3, Math.round(len / 40)); for (let i = 0; i < n; i++) { ctx.fillStyle = SHIP_COLS[(i + (o.seed || 0)) % 5]; ctx.fillRect(-len * 0.4 + i * (len * 0.68 / n), -w * 0.36, len * 0.68 / n - 2, w * 0.72); }
  ctx.fillStyle = '#F4F1EA'; ctx.fillRect(-len * 0.48, -w * 0.4, len * 0.08, w * 0.8); ctx.restore(); }
function cutCanal(ctx, t, A, o = {}) {   // top-down canal cutaway: sandy banks + a vertical water channel
  if (A <= 0) return; ctx.save(); ctx.globalAlpha = A;
  ctx.fillStyle = '#E3C98B'; ctx.fillRect(0, 0, W, H); const r = rnd(5); ctx.fillStyle = 'rgba(180,140,80,0.35)'; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 30 + r() * 60, 8 + r() * 10, 0, 0, 7); ctx.fill(); }
  const cw = o.cw || 520, x0 = W / 2 - cw / 2, tide = o.tide || 0;
  const g = ctx.createLinearGradient(x0, 0, x0 + cw, 0); g.addColorStop(0, '#1E6FA8'); g.addColorStop(0.5, '#3FA9E0'); g.addColorStop(1, '#1E6FA8'); ctx.fillStyle = g; ctx.fillRect(x0 - tide * 40, 0, cw + tide * 80, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4; for (let i = 0; i < 10; i++) { const y = (i * 210 + t * 60) % H; ctx.beginPath(); ctx.moveTo(x0 + 40, y); ctx.lineTo(x0 + 80, y + 20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0 + cw - 80, y + 100); ctx.lineTo(x0 + cw - 40, y + 120); ctx.stroke(); }
  ctx.strokeStyle = '#B8935A'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x0 - tide * 40, 0); ctx.lineTo(x0 - tide * 40, H); ctx.moveTo(x0 + cw + tide * 40, 0); ctx.lineTo(x0 + cw + tide * 40, H); ctx.stroke();
  ctx.restore(); }
function digger(ctx, x, y, s, t) {   // the famous tiny excavator
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.roundRect(-60, -10, 120, 30, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F4C430'; ctx.fillRect(-46, -60, 70, 50); ctx.strokeRect(-46, -60, 70, 50); ctx.fillStyle = '#9ED0E6'; ctx.fillRect(-36, -52, 28, 26);
  const a = -0.6 + Math.sin(t * 5) * 0.35; ctx.save(); ctx.translate(24, -40); ctx.rotate(a); ctx.fillStyle = '#F4C430'; ctx.fillRect(0, -8, 80, 16); ctx.strokeRect(0, -8, 80, 16);
  ctx.translate(80, 0); ctx.rotate(1.2 + Math.sin(t * 5) * 0.4); ctx.fillRect(0, -6, 60, 12); ctx.strokeRect(0, -6, 60, 12); ctx.fillStyle = '#5A5F6B'; ctx.beginPath(); ctx.moveTo(60, -16); ctx.lineTo(84, -10); ctx.lineTo(74, 16); ctx.lineTo(56, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.restore(); }
function tug(ctx, x, y, s, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = '#C0392B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-34, -14); ctx.lineTo(22, -14); ctx.quadraticCurveTo(38, 0, 22, 14); ctx.lineTo(-34, 14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#F4F1EA'; ctx.fillRect(-20, -8, 22, 16); ctx.strokeRect(-20, -8, 22, 16); ctx.restore(); }
function ruleOut(ctx, kind, x, y, k, xk) {   // a war tank / pirate flag, crossed out
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = 'rgba(10,24,32,0.9)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 120, 0, 7); ctx.fill(); ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  if (kind === 'war') { ctx.fillStyle = '#556B2F'; ctx.beginPath(); ctx.roundRect(-70, -10, 140, 50, 16); ctx.fill(); ctx.stroke(); ctx.fillRect(-36, -42, 72, 34); ctx.strokeRect(-36, -42, 72, 34); ctx.fillRect(30, -32, 70, 12); ctx.strokeRect(30, -32, 70, 12); }
  else { ctx.fillStyle = '#5A3B28'; ctx.fillRect(-50, -70, 10, 140); ctx.fillStyle = '#141416'; ctx.fillRect(-40, -70, 100, 66); ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(10, -44, 14, 0, 7); ctx.fill(); ctx.strokeStyle = '#FFF'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(30, -10); ctx.moveTo(30, -20); ctx.lineTo(-10, -10); ctx.stroke(); }
  ctx.restore(); redX(ctx, x, y, 180 * k, xk); }
function empire(ctx, x, y, h) {   // Empire State Building silhouette, base at (x,y), height h px (drawn upright, then the caller rotates)
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#C9CED6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; const w = h * 0.12;
  ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.55); ctx.lineTo(-w * 0.7, -h * 0.55); ctx.lineTo(-w * 0.7, -h * 0.75); ctx.lineTo(-w * 0.4, -h * 0.75); ctx.lineTo(-w * 0.4, -h * 0.86); ctx.lineTo(-w * 0.15, -h * 0.86); ctx.lineTo(0, -h); ctx.lineTo(w * 0.15, -h * 0.86); ctx.lineTo(w * 0.4, -h * 0.86); ctx.lineTo(w * 0.4, -h * 0.75); ctx.lineTo(w * 0.7, -h * 0.75); ctx.lineTo(w * 0.7, -h * 0.55); ctx.lineTo(w, -h * 0.55); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
function tollbooths(ctx, t, A, blocked) {
  if (A <= 0) return; ctx.save(); ctx.globalAlpha = A; ctx.fillStyle = '#2B2D33'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#F4D03F'; ctx.lineWidth = 4; ctx.setLineDash([30, 26]); for (let i = 1; i < 10; i++) { const x = 40 + i * 100; ctx.beginPath(); ctx.moveTo(x, 1250); ctx.lineTo(x, H); ctx.stroke(); } ctx.setLineDash([]);
  // funnel into 3 booths
  ctx.fillStyle = '#1C1F26'; ctx.beginPath(); ctx.moveTo(0, 1250); ctx.lineTo(380, 900); ctx.lineTo(380, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(W, 1250); ctx.lineTo(700, 900); ctx.lineTo(700, 0); ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
  for (let b = 0; b < 3; b++) { const bx = 420 + b * 110; ctx.fillStyle = '#F4F1EA'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillRect(bx - 18, 820, 36, 60); ctx.strokeRect(bx - 18, 820, 36, 60);
    const closed = blocked && b === 1; ctx.strokeStyle = closed ? '#FF3B3B' : '#7CFC9A'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(bx + 18, 850); ctx.lineTo(bx + 18 + (closed ? 80 : 30), closed ? 850 : 790); ctx.stroke(); }
  // ships queueing as cars (moving unless blocked)
  const stop = blocked ? 1 : 0; for (let lane = 0; lane < 10; lane++) for (let i = 0; i < 5; i++) { const x = 90 + lane * 100, base = 1300 + i * 130, y = base - (stop ? 0 : ((t * 160 + lane * 40) % 130)); ctx.save(); ctx.translate(x, y); ctx.scale(2.2, 1); topShip(ctx, 0, 0, 110, -Math.PI / 2, { seed: lane + i, hull: '#3A5BA0' }); ctx.restore(); }
  ctx.restore(); }

// ------------------------------------------------------------------ the story
function sceneMap(ctx, c, t) {
  // ships drifting freely across the oceans (B1), then frozen (B2)
  if (t < 7.2) { const fr = t > 6.5 ? 0 : 1; const r = rnd(8); for (let i = 0; i < 26; i++) { const lo = 40 + r() * 70, la = -30 + r() * 45, sp = (r() - 0.5) * 6, ang = r() * 6.28; const tt = fr ? t : 6.5;
      const [x, y] = P(c, lo + Math.cos(ang) * sp * tt * 0.3, la + Math.sin(ang) * sp * tt * 0.3); topShip(ctx, x, y, 46, ang, { seed: i }); } }
  // the canal line on the map
  if (c.z > 30) { const sp = CANALPTS.map(p => P(c, p[0], p[1])); ctx.save(); ctx.strokeStyle = '#3FA9E0'; ctx.lineWidth = Math.max(6, c.z * 0.05); ctx.lineCap = 'round'; ctx.shadowColor = '#9FE8FF'; ctx.shadowBlur = 14; ctx.beginPath(); sp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); }
}
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c); sceneMap(ctx, c, t);
  // ---------- B1 (0–4.6): 70% ocean, room for everyone
  if (t < 4.7) { odometer(ctx, t, 0.75, 0.85, 0, 70, (v, u) => u < 1 ? `${Math.round(v)}% OCEAN` : '70% OCEAN', W / 2, 330, 120, { k: t < 4.3 ? 1 : popOut(4.6 - t) }); chip(ctx, 'ROOM FOR EVERYONE?', W / 2, 470, win(t, 2.4, 4.5), { size: 44 }); }
  if (t < 0.75) kinetic(ctx, 'ONE SHIP vs THE WORLD', 330, 1, 84);
  // ---------- B2 (4.6–10.6): one ship got stuck → 12% of global trade frozen
  if (t > 4.6 && t < 10.7) {
    const k = popOut(10.55 - t, 0.3);
    if (t > 6.3) { const [x, y] = P(c, 32.5, 30.1); ring(ctx, x, y, 70, t, '#FF3B3B'); stamp(ctx, 'STUCK', x + 160, y - 120, t, 6.76, { size: 60 }); }
    styledText(ctx, 'ONE SHIP', W / 2, 330, 120, { k: win(t, 5.85, 7.45), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    odometer(ctx, t, 7.6, 0.9, 0, 12, (v, u) => `${Math.round(v)}% OF GLOBAL TRADE`, W / 2, 330, 84, { k: t > 7.5 ? k : 0 });
    if (t > 7.6) chip(ctx, '❄️ FROZEN', W / 2, 470, win(t, 7.7, 10.5), { size: 46 });
  }
  // ---------- B3 (10.6–15.4): not a war, not pirates… the wind, in a ditch in the desert
  if (t > 10.6 && t < 15.5) {
    ruleOut(ctx, 'war', 300, 860, win(t, 10.75, 12.6), clamp((t - 11.1) / 0.3)); ruleOut(ctx, 'pirate', 780, 860, win(t, 11.7, 12.6), clamp((t - 12.0) / 0.3));
    chip(ctx, 'NOT A WAR', 300, 1040, win(t, 10.8, 12.6), { size: 38 }); chip(ctx, 'NOT PIRATES', 780, 1040, win(t, 11.75, 12.6), { size: 38 });
    if (t > 12.6) { silhouette(ctx, g => windCloud(g, W / 2, 860, 1.5, t, pop(t - 12.65)), clamp((t - 12.95) / 0.3)); kinetic(ctx, 'THE WIND 💨', 330, pop(t - 13.0) * popOut(15.4 - t), 110); }
    chip(ctx, '…IN A DITCH IN THE DESERT', W / 2, 470, win(t, 13.8, 15.35), { size: 42 });
  }
  // ---------- B4 (15.4–27.0): the Ever Given: longer than the Empire State is tall; the wind shoves it; bow + stern jam
  if (t > 15.4 && t < 27.1) {
    const k = win(t, 15.45, 27.0, 0.35, 0.25);
    if (t < 19.5) { cutWorld(ctx, k, 'blueprint', t); ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
      const shipLen = 820; topShip(ctx, W / 2, 760, shipLen * pop(t - 15.6, 0.4), 0, {}); chip(ctx, 'THE EVER GIVEN', W / 2, 330, pop(t - 15.7), { size: 50 });
      chip(ctx, '≈ 400 m (1,312 ft)', W / 2, 880, pop(t - 16.6), { size: 38 });
      if (t > 17.2) { ctx.save(); ctx.translate(W / 2 - shipLen / 2, 1180); ctx.rotate(Math.PI / 2 * easeOut(clamp((t - 17.3) / 0.6))); ctx.translate(0, 0); empire(ctx, 0, 0, shipLen * 381 / 400); ctx.restore(); ctx.restore();
        ctx.save(); ctx.globalAlpha = clamp(k * 1.4); chip(ctx, 'EMPIRE STATE BUILDING: 381 m', W / 2, 1320, pop(t - 17.9), { size: 34 }); }
      ctx.restore();
    } else {
      cutCanal(ctx, t, k); ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
      const shove = easeOut(clamp((t - 22.2) / 1.6)), sail = clamp((t - 19.5) / 2.6);
      const ang = -Math.PI / 2 + shove * 0.83, cy = lerp(1500, 960, easeOut(sail));
      topShip(ctx, W / 2 + Math.sin(t * 40) * (t > 24.1 && t < 24.3 || t > 25.5 && t < 25.7 ? 6 : 0), cy, 760, ang, {});
      if (t > 21.3 && t < 24.0) { windCloud(ctx, 190, 760, 0.9, t, pop(t - 21.35) * popOut(24.0 - t)); }
      if (t > 24.1) puff(ctx, W / 2 + 270, 960 - 250, 120, clamp((t - 24.1) / 0.6), 3); if (t > 25.55) puff(ctx, W / 2 - 270, 960 + 250, 120, clamp((t - 25.55) / 0.6), 5);
      chip(ctx, 'SUEZ CANAL, EGYPT', W / 2, 330, win(t, 19.6, 21.9), { size: 46 });
      chip(ctx, 'BOW: STUCK', W / 2 + 260, 560, pop(t - 24.15), { size: 36, stroke: '#FF6B6B' }); chip(ctx, 'STERN: STUCK', W / 2 - 260, 1400, pop(t - 25.6), { size: 36, stroke: '#FF6B6B' });
      stamp(ctx, 'BLOCKED', W / 2, 330, t, 26.1, { size: 72 });
      ctx.restore();
    }
  }
  // ---------- B5 (27.0–32.95): one tiny digger vs a 200,000-ton ship
  if (t > 26.95 && t < 33.0) {
    const k = win(t, 27.0, 32.9, 0.3, 0.25); cutCanal(ctx, t, k);
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    topShip(ctx, W / 2, 960, 760, -Math.PI / 2 + 0.83, {});
    digger(ctx, 900, 700, 0.85 * pop(t - 28.5), t); if (t > 28.6) ring(ctx, 900, 680, 90, t);
    person(ctx, 'egypt_panic', 880, 1560, 280, { k: pop(t - 28.0) });
    chip(ctx, '🚜 ONE TINY DIGGER', W / 2, 330, win(t, 28.4, 30.7), { size: 46 });
    odometer(ctx, t, 30.8, 1.2, 0, 200000, v => `vs ${fmt(v)} TONS`, W / 2, 330, 92, { k: t > 30.75 ? popOut(32.9 - t) : 0 });
    ctx.restore();
  }
  // ---------- B6 (32.95–41.0): the ten-lane highway and the tollbooths
  if (t > 32.9 && t < 41.05) {
    const k = win(t, 32.95, 40.95, 0.35, 0.3); tollbooths(ctx, t, k, t > 38.6);
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    chip(ctx, 'A 10-LANE HIGHWAY…', W / 2, 330, win(t, 33.1, 36.2), { size: 46 }); chip(ctx, '…INTO A FEW TOLLBOOTHS', W / 2, 330, win(t, 36.25, 38.25), { size: 44 });
    chip(ctx, 'BLOCK ONE BOOTH…', W / 2, 330, win(t, 38.3, 39.6), { size: 46 });
    stamp(ctx, 'EVERYTHING STOPS', W / 2, 560, t, 40.0, { size: 60 });
    ctx.restore();
  }
  // ---------- B7 (41.0–48.9): six days, 400+ ships, $9.6 billion a day
  if (t > 40.9 && t < 49.0) {
    const k = popOut(48.85 - t, 0.3);
    const n = Math.floor(clamp((t - 41.3) / 3.0) * 60), r = rnd(13);
    for (let i = 0; i < n; i++) { const north = i % 2 === 0, lo = north ? 31.6 + r() * 3.0 : 32.6 + r() * 2.2, la = north ? 31.6 + r() * 1.1 : 27.6 + r() * 1.6; const [x, y] = P(c, lo, la); topShip(ctx, x, y, 34, north ? 1.57 : -1.57, { seed: i }); }
    const [sx, sy] = P(c, 32.56, 30.02); ring(ctx, sx, sy, 50, t, '#FF3B3B');
    const day = Math.min(6, 1 + Math.floor(clamp((t - 41.2) / 1.2) * 6)); ctx.save(); ctx.translate(200, 230); ctx.scale(k, k); ctx.fillStyle = '#FFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-100, -90, 200, 190, 16); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#D7263D'; ctx.fillRect(-97, -87, 194, 48); setFont(ctx, 'Montserrat', 28); ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DAY', 0, -62); setFont(ctx, 'Montserrat', 90); ctx.fillStyle = C.ink; ctx.fillText(String(day), 0, 30); ctx.restore();
    odometer(ctx, t, 42.2, 0.8, 0, 400, (v, u) => u < 1 ? `${Math.round(v)} SHIPS` : '400+ SHIPS', W / 2 + 90, 330, 96, { k: t < 44.5 ? 1 : popOut(45.0 - t) });
    odometer(ctx, t, 45.1, 1.2, 0, 9.6, v => `$${v.toFixed(1)} BILLION`, W / 2, 330, 104, { k: k });
    chip(ctx, '…EVERY SINGLE DAY', W / 2, 470, win(t, 47.4, 48.85), { size: 46 });
  }
  // ---------- B8 (48.9–53.4): a high spring tide + tugboats → free
  if (t > 48.85 && t < 53.5) {
    const k = win(t, 48.9, 53.4, 0.35, 0.3), tide = easeOut(clamp((t - 50.2) / 1.0)); cutCanal(ctx, t, k, { tide });
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    const fix = easeIO(clamp((t - 51.4) / 1.4)), ang = -Math.PI / 2 + 0.83 * (1 - fix);
    topShip(ctx, W / 2, 960, 760, ang, {});
    const tugs = [[W / 2 + 380, 600], [W / 2 - 380, 1320], [W / 2 + 330, 1300]]; tugs.forEach(([x, y], i) => { if (t < 51.2 + i * 0.1) return; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(W / 2 + (i === 1 ? -150 : 150), 960 + (i === 0 ? -140 : 140)); ctx.stroke(); tug(ctx, x + Math.sin(t * 6 + i) * 6, y, 1.4, i === 1 ? 3.14 : 0); });
    chip(ctx, '🌊 HIGH SPRING TIDE', W / 2, 330, win(t, 50.2, 51.6), { size: 44 }); chip(ctx, '+ A FLEET OF TUGBOATS', W / 2, 330, win(t, 51.65, 52.9), { size: 42 });
    if (t > 52.7) { stamp(ctx, 'FREE!', W / 2, 560, t, 52.75, { size: 90, color: '#2ECC71' }); person(ctx, 'egypt_cheer', 880, 1560, 280, { k: pop(t - 52.8) }); }
    ctx.restore();
  }
  // ---------- B9 (53.4–62.3): the Bosporus: half a mile wide, through a city of 16 million
  if (t > 53.4 && t < 63.9) {
    const k = t < 62.3 ? 1 : 1 - clamp((t - 62.3) / 0.3);
    if (t < 55.5) chip(ctx, 'NOT EVEN THE TIGHTEST', W / 2, 330, win(t, 53.6, 55.5), { size: 46 });
    if (t > 55.0 && t < 57.9) { const [bx, by] = P(c, 29.05, 41.12); ring(ctx, bx, by, 60, t, C.gold); chip(ctx, 'THE NARROWEST STRAIT IN WORLD SHIPPING', W / 2, 330, win(t, 55.65, 57.8), { size: 30 }); }
    if (t > 57.6) {
      const kc = clamp((t - 57.6) / 0.35) * k; ctx.save(); ctx.globalAlpha = kc;
      const g = ctx.createLinearGradient(0, 0, 0, 1260); g.addColorStop(0, '#2B3A67'); g.addColorStop(1, '#E59866'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1260);
      ctx.fillStyle = '#1E6FA8'; ctx.fillRect(0, 1250, W, H - 1250); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4; for (let i = 0; i < 8; i++) { const y = 1290 + i * 60; ctx.beginPath(); ctx.moveTo((i * 130 + t * 40) % W, y); ctx.lineTo((i * 130 + t * 40) % W + 60, y); ctx.stroke(); }
      // a tanker sailing between the two halves of the city (side view)
      const sx = lerp(-300, 1380, clamp((t - 57.7) / 5.0)); ctx.fillStyle = '#7A1F1F'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx - 220, 1240); ctx.lineTo(sx + 200, 1240); ctx.lineTo(sx + 240, 1200); ctx.lineTo(sx - 240, 1200); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#F4F1EA'; ctx.fillRect(sx - 230, 1140, 70, 60); ctx.strokeRect(sx - 230, 1140, 70, 60);
      ctx.restore();
      const rev = clamp((t - 60.45) / 0.35);
      const drawCity = gg => { gg.globalAlpha = kc; const r = rnd(21); for (const side of [-1, 1]) for (let i = 0; i < 8; i++) { const x = W / 2 + side * (250 + i * 58), h = 130 + r() * 230, y = 1250; gg.fillStyle = i % 3 ? '#C9A27A' : '#E8D8B0'; gg.strokeStyle = C.ink; gg.lineWidth = 3; gg.fillRect(x - 26, y - h, 52, h); gg.strokeRect(x - 26, y - h, 52, h);
        if (i % 4 === 1) { gg.beginPath(); gg.arc(x, y - h, 28, Math.PI, 0); gg.fill(); gg.stroke(); gg.fillRect(x + 34, y - h - 120, 10, 120 + h); gg.strokeRect(x + 34, y - h - 120, 10, 120 + h); } }
        gg.fillStyle = '#5E513F'; gg.fillRect(0, 1250, W / 2 - 220, 16); gg.fillRect(W / 2 + 220, 1250, W / 2, 16); };
      if (t > 59.0) silhouette(ctx, drawCity, rev); else drawCity(ctx);
      // ruler across the gap
      ctx.save(); ctx.globalAlpha = kc; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(W / 2 - 215, 1100); ctx.lineTo(W / 2 + 215, 1100); ctx.moveTo(W / 2 - 215, 1080); ctx.lineTo(W / 2 - 215, 1120); ctx.moveTo(W / 2 + 215, 1080); ctx.lineTo(W / 2 + 215, 1120); ctx.stroke(); ctx.restore();
      setFont(ctx, 'Montserrat', 26); ctx.save(); ctx.globalAlpha = kc; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.fillText('EUROPE', 200, 1330); ctx.fillText('ASIA', W - 200, 1330); ctx.restore();
      odometer(ctx, t, 57.85, 0.75, 0, 0.5, (v, u) => u < 1 ? `${v.toFixed(2)} MILE` : '½ MILE (≈ 750 m)', W / 2, 330, 100, { k: t > 57.8 ? k : 0 });
      if (t > 60.45) { odometer(ctx, t, 60.85, 1.0, 0, 16, (v, u) => `${Math.round(v)} MILLION PEOPLE`, W / 2, 470, 64, { k: k, rot: -2 }); goldLabel(ctx, 'ISTANBUL', W / 2, 600, 84, pop(t - 60.5) * k); }
    }
  }
  // ---------- card (62.3–63.9) then glide back into frame 1
  if (t > 62.2) {
    const k = clamp((t - 62.3) / 0.3) * (1 - clamp((t - 63.9) / 0.3)); ctx.save(); ctx.globalAlpha = 0.74 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4); title(ctx, 'ONE SHIP.\nONE WORLD.', 520, pop(t - 62.35), 130); ctx.restore();
  }
}
const QUESTION = 'WHICH CHOKEPOINT WOULD\nHURT THE WORLD MOST? 👇';
const CAPTIONS = [
  [0.0, 2.35, 'Earth: 70% ocean'], [2.4, 4.5, 'Room for every ship?'],
  [4.65, 7.4, 'Then ONE ship got stuck…'], [7.45, 10.45, '…freezing 12% of world trade'],
  [10.6, 12.6, 'Not a war. Not pirates.'], [12.65, 13.7, 'The wind…'], [13.75, 15.35, '…in a ditch in the desert'],
  [15.5, 17.15, 'The Ever Given'], [17.2, 19.5, 'Longer than the Empire State is tall'], [19.55, 22.2, "Sailing Egypt's Suez Canal…"], [22.25, 23.6, '…winds shoved it sideways'], [23.65, 26.9, 'Bow and stern: jammed'],
  [27.1, 28.35, 'The first rescue?'], [28.4, 30.7, 'One tiny digger…'], [30.75, 32.85, '…vs a 200,000-ton ship'],
  [33.0, 37.4, 'A 10-lane highway…'], [37.45, 38.25, '…a few tollbooths'], [38.3, 40.9, 'Block one: everything stops'],
  [41.05, 43.1, '6 days, 400+ ships'], [43.15, 47.4, '$9.6 billion held up…'], [47.45, 48.8, '…every single day'],
  [48.95, 51.15, 'Freed by a high tide…'], [51.2, 53.3, '…and a fleet of tugboats'],
  [53.5, 55.55, 'Not even the tightest squeeze'], [55.6, 59.05, 'The narrowest: half a mile wide…'], [59.1, 62.2, '…through a city of 16 million'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); vignette(ctx); if (t < 62.3) drawText(ctx, t);
  if (t > 59.1 && t < 64.1) { const y = t < 62.3 ? 1460 : lerp(1460, 860, easeIO((t - 62.3) / 0.45)); styledText(ctx, QUESTION, W / 2, y, 58, { k: pop(t - 59.2) * (t > 63.8 ? popOut(64.1 - t, 0.3) : 1), fill: C.yellow, stroke: C.goldDark, rot: -2 }); }
  if (t > 63.9) { ctx.save(); ctx.globalAlpha = clamp((t - 63.95) / 0.55); styledText(ctx, 'Earth: 70% ocean', W / 2, CAPTION.y + 80, CAPTION.size, { k: 1, shadow: CAPTION.shadow, maxW: 1000 }); kinetic(ctx, 'ONE SHIP vs THE WORLD', 330, 1, 84); ctx.restore(); }
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
