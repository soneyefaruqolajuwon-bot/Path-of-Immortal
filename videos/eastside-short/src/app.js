/* Why are so many cities poorer on the east side? (English cities, coal smoke and the west wind) — Mapheld 9:16 short; card, then glides back into frame 1 (loop). */
'use strict';
const W = 1080, H = 1920, DURATION = 50.42;
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
const V = { london: [-0.115, 51.497, 1150], eng: [-1.9, 52.9, 150] };
const KEYS = [[0, 'london', 1], [7.4, 'london', 1.03], [8.7, 'eng', 1], [19.1, 'eng', 1.02], [38.1, 'eng', 1.02], [42.6, 'eng', 1.03], [43.9, 'london', 1], [48.2, 'london', 1.03], [50.42, 'london', 1]];
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
  for (const key of Object.keys(GEO).filter(k => !['thames'].includes(k))) {
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
// ------------------------------------------------------------------ east-side helpers
const GREY = '#6E6F73', THAMES = (() => { const r = GEO.thames[0], o = []; for (let i = 0; i < r.length; i += 2) o.push([r[i], r[i + 1]]); return o; })();
const CITIES = [['MANCHESTER', -2.24, 53.48], ['LIVERPOOL', -2.98, 53.41], ['LEEDS', -1.55, 53.80], ['SHEFFIELD', -1.47, 53.38], ['BIRMINGHAM', -1.90, 52.48], ['NOTTINGHAM', -1.15, 52.95], ['NEWCASTLE', -1.61, 54.97], ['BRISTOL', -2.59, 51.45], ['LEICESTER', -1.13, 52.64], ['LONDON', -0.12, 51.50]];
function splitTint(ctx, c, k, lonSplit = -0.095) {   // London: gold west, grey east
  if (k <= 0) return; const [x] = P(c, lonSplit, 51.5);
  ctx.save(); ctx.globalAlpha = 0.42 * k; ctx.fillStyle = C.gold; ctx.fillRect(0, 0, x, H); ctx.fillStyle = '#2B2D33'; ctx.fillRect(x, 0, W - x, H);
  ctx.globalAlpha = k; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.setLineDash([22, 16]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); ctx.restore(); }
function river(ctx, c, k = 1) { if (k <= 0) return; const sp = THAMES.map(p => P(c, p[0], p[1])); const path = partial(sp, k); if (!path) return; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#173E4A'; ctx.lineWidth = Math.max(10, c.z * 0.055) + 8; ctx.stroke(path); ctx.strokeStyle = '#3FA9E0'; ctx.lineWidth = Math.max(10, c.z * 0.055); ctx.stroke(path); ctx.restore(); }
function iconMasks(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  for (const [dx, rot, col, sad] of [[-30, -0.25, '#FFD43B', 0], [30, 0.25, '#E8E1D4', 1]]) { ctx.save(); ctx.translate(dx, 0); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 40, 50, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-14, -12, 7, 0, 7); ctx.arc(14, -12, 7, 0, 7); ctx.fill(); ctx.lineWidth = 5; ctx.beginPath(); if (sad) ctx.arc(0, 26, 14, Math.PI * 1.15, Math.PI * 1.85); else ctx.arc(0, 12, 14, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.restore(); } ctx.restore(); }
function iconMansion(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillStyle = '#F4F1E6'; ctx.fillRect(-70, -60, 140, 70); ctx.strokeRect(-70, -60, 140, 70);
  ctx.fillStyle = '#C9A227'; ctx.beginPath(); ctx.moveTo(-80, -60); ctx.lineTo(0, -105); ctx.lineTo(80, -60); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#F4F1E6'; for (let i = 0; i < 4; i++) { ctx.fillRect(-56 + i * 34, -56, 12, 62); ctx.strokeRect(-56 + i * 34, -56, 12, 62); } ctx.restore(); }
function iconMoney(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillStyle = '#C9A227'; ctx.beginPath(); ctx.moveTo(-20, -60); ctx.lineTo(20, -60); ctx.lineTo(12, -44); ctx.quadraticCurveTo(60, -20, 50, 20); ctx.quadraticCurveTo(40, 50, 0, 50); ctx.quadraticCurveTo(-40, 50, -50, 20); ctx.quadraticCurveTo(-60, -20, -12, -44); ctx.closePath(); ctx.fill(); ctx.stroke();
  setFont(ctx, 'Montserrat', 54); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('£', 0, 10); ctx.restore(); }
function iconCrane(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-30, 30); ctx.lineTo(-30, -90); ctx.lineTo(70, -90); ctx.moveTo(-30, -60); ctx.lineTo(10, -90); ctx.moveTo(60, -90); ctx.lineTo(60, -30); ctx.stroke(); ctx.fillStyle = '#C0392B'; ctx.fillRect(44, -32, 32, 24); ctx.strokeRect(44, -32, 32, 24); ctx.restore(); }
function iconFactory(ctx, x, y, s, t = 0, smoke = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillStyle = '#8B4A3A';
  ctx.beginPath(); ctx.moveTo(-80, 30); ctx.lineTo(-80, -20); ctx.lineTo(-40, -45); ctx.lineTo(-40, -20); ctx.lineTo(0, -45); ctx.lineTo(0, -20); ctx.lineTo(40, -45); ctx.lineTo(40, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillRect(50, -100, 26, 130); ctx.strokeRect(50, -100, 26, 130); ctx.fillStyle = '#F7C46C'; for (let i = 0; i < 3; i++) ctx.fillRect(-66 + i * 38, -6, 18, 14);
  if (smoke) for (let i = 0; i < 4; i++) { const u = ((t * 0.6 + i / 4) % 1); ctx.globalAlpha = smoke * (1 - u) * 0.85; ctx.fillStyle = '#3A3A3E'; ctx.beginPath(); ctx.arc(63 + u * 70, -110 - u * 70, 16 + u * 22, 0, 7); ctx.fill(); } ctx.restore(); }
function iconSlum(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  for (const [dx, h, r, col] of [[-50, 60, -0.06, '#7A6A5A'], [0, 80, 0.04, '#6B5B4B'], [50, 55, -0.03, '#82705E']]) { ctx.save(); ctx.translate(dx, 30); ctx.rotate(r); ctx.fillStyle = col; ctx.fillRect(-24, -h, 48, h); ctx.strokeRect(-24, -h, 48, h); ctx.beginPath(); ctx.moveTo(-28, -h); ctx.lineTo(0, -h - 24); ctx.lineTo(28, -h); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2A2D3A'; ctx.fillRect(-8, -h + 14, 16, 16); ctx.restore(); } ctx.restore(); }
function chimney(ctx, x, y, s, k, t, seed) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.fillStyle = '#8B4A3A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(-7, -40, 14, 40); ctx.strokeRect(-7, -40, 14, 40);
  const u = ((t * 0.7 + seed) % 1); ctx.globalAlpha = (1 - u) * 0.8; ctx.fillStyle = '#3A3A3E'; ctx.beginPath(); ctx.arc(u * 18, -48 - u * 26, 7 + u * 9, 0, 7); ctx.fill(); ctx.restore(); }
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
function windArrows(ctx, k, t, y0 = 500, y1 = 1300) { if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const y = lerp(y0, y1, i / 5), u = ((t * 0.7 + i * 0.37) % 1), x = -150 + u * (W + 300); ctx.beginPath(); ctx.moveTo(x - 160, y); ctx.quadraticCurveTo(x - 80, y - 30, x, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x - 26, y - 22); ctx.moveTo(x + 6, y); ctx.lineTo(x - 26, y + 22); ctx.stroke(); } ctx.restore(); }
// a Victorian industrial town (cutaway on parchment): factories in the middle, smoke bending east
function victorianTown(ctx, t, smokeK) {
  const gy = 1300; ctx.fillStyle = '#7A6A55'; ctx.fillRect(0, gy, W, H - gy); ctx.fillStyle = '#5E513F'; ctx.fillRect(0, gy, W, 10);
  for (let i = 0; i < 3; i++) iconFactory(ctx, 330 + i * 200, gy, 1.5, t, 0);
  // smoke plume drifting east (right), thickening on the east side
  if (smokeK > 0) { const r = rnd(12); for (let i = 0; i < 60; i++) { const u = ((t * 0.25 + r()) % 1), sx = 420 + r() * 420, x = sx + u * 700 * smokeK, y = gy - 260 - u * 300 + r() * 120;
      ctx.save(); ctx.globalAlpha = 0.55 * (1 - u * 0.6) * smokeK; ctx.fillStyle = '#2E2E33'; ctx.beginPath(); ctx.arc(x, y, 40 + u * 70, 0, 7); ctx.fill(); ctx.restore(); }
    const g = ctx.createLinearGradient(W * 0.45, 0, W, 0); g.addColorStop(0, 'rgba(40,40,46,0)'); g.addColorStop(1, `rgba(40,40,46,${0.55 * smokeK})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, gy); }
  setFont(ctx, 'Montserrat', 54); ctx.fillStyle = '#3A2A08'; ctx.textAlign = 'center'; ctx.fillText('WEST', 150, gy + 90); ctx.fillText('EAST', W - 150, gy + 90);
}
function campfire(ctx, t, k) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.4); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0D1630'); g.addColorStop(1, '#22304F'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF'; const r = rnd(3); for (let i = 0; i < 50; i++) { ctx.globalAlpha = clamp(k * 1.4) * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))); ctx.beginPath(); ctx.arc(r() * W, r() * 900, 2 + r() * 2, 0, 7); ctx.fill(); }
  ctx.globalAlpha = clamp(k * 1.4); ctx.fillStyle = '#1A2238'; ctx.fillRect(0, 1250, W, H);
  const fx = 540, fy = 1230; ctx.fillStyle = '#6B4423'; ctx.save(); ctx.translate(fx, fy); for (const a of [-0.4, 0.4]) { ctx.save(); ctx.rotate(a); ctx.fillRect(-90, -14, 180, 28); ctx.restore(); } ctx.restore();
  for (let i = 0; i < 3; i++) { const fl = 1 + 0.12 * Math.sin(t * 14 + i); ctx.fillStyle = ['#E63946', '#F4A300', '#FFD43B'][i]; ctx.beginPath(); ctx.moveTo(fx - (70 - i * 18), fy); ctx.quadraticCurveTo(fx - 40 + i * 8, fy - (200 - i * 50) * fl, fx, fy - (240 - i * 60) * fl); ctx.quadraticCurveTo(fx + 40 - i * 8, fy - (200 - i * 50) * fl, fx + (70 - i * 18), fy); ctx.closePath(); ctx.fill(); }
  // smoke blowing right
  for (let i = 0; i < 14; i++) { const u = ((t * 0.5 + i / 14) % 1); ctx.save(); ctx.globalAlpha = clamp(k * 1.4) * 0.6 * (1 - u); ctx.fillStyle = '#9AA0A8'; ctx.beginPath(); ctx.arc(fx + 40 + u * 480, fy - 260 - u * 160 + Math.sin(u * 7 + i) * 20, 40 + u * 60, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.restore(); }

// ------------------------------------------------------------------ the story
function cityBadge(ctx, x, y, r, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill(); ctx.fillStyle = GREY; ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.restore(); }
function londonLayer(ctx, c, t, A = 1, icons = true) {   // split London with its icons (used at the start, the end, and the loop frame)
  if (A <= 0) return; ctx.save(); ctx.globalAlpha = A;
  splitTint(ctx, c, 1); river(ctx, c, 1);
  const [wx, wy] = P(c, -0.20, 51.53), [ex, ey] = P(c, 0.0, 51.53);
  goldLabel(ctx, 'WEST END', 270, 330, 72, 1); styledText(ctx, 'EAST END', 810, 330, 72, { fill: '#C9CED6', stroke: C.ink, shadow: 5 }); if (!icons) { ctx.restore(); return; }
  const ic = (f, x, y, s, t0) => { const k = t < 0.5 ? 1 : pop(t - t0); if (k > 0) { ctx.save(); ctx.translate(x, y); ctx.scale(k, k); f(ctx, 0, 0, s); ctx.restore(); } };
  ic(iconMasks, 270, 620, 1.3, 1.73); ic(iconMansion, 270, 900, 1.5, 2.29); ic(iconMoney, 270, 1180, 1.4, 3.02);
  ic((g, x, y, s) => iconCrane(g, x, y, s), 800, 640, 1.4, 4.8); ic((g, x, y, s) => iconFactory(g, x, y, s, t), 800, 940, 1.4, 5.27); ic(iconSlum, 810, 1200, 1.4, 5.98);
  ctx.restore(); }
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  // ---------- B1 (0–7): London, West End vs East End  (and the loop frame)
  if (t < 8.6) londonLayer(ctx, c, t, 1 - clamp((t - 7.6) / 0.8));
  if (t < 1.4) kinetic(ctx, 'RICH WEST · POOR EAST?', 200, 1, 76);
  // ---------- B2 (7–12.9): city after city across England
  if (t > 8.2 && t < 13.1) {
    const k = popOut(12.9 - t, 0.3);
    CITIES.forEach(([n, lo, la], i) => { const [x, y] = P(c, lo, la); cityBadge(ctx, x, y, 34, pop(t - 8.5 - i * 0.16) * k); if (['MANCHESTER', 'BIRMINGHAM', 'LEEDS', 'LONDON', 'NEWCASTLE', 'BRISTOL'].includes(n)) styledText(ctx, n, x + (n === 'LEEDS' ? 120 : n === 'LIVERPOOL' ? -100 : 0), y + 62, 34, { k: pop(t - 8.6 - i * 0.16) * k, fill: '#FFFFFF', stroke: C.ink, shadow: 4 }); });
    chip(ctx, 'CITY AFTER CITY', W / 2, 330, win(t, 8.4, 10.4), { size: 46 });
    kinetic(ctx, 'EAST SIDE = POORER', 330, win(t, 10.5, 11.8), 84);
    chip(ctx, '…EVEN TODAY', W / 2, 330, win(t, 11.85, 12.85), { size: 50 });
  }
  // ---------- B3 (12.9–19.2): not bad luck · 5,000 chimneys · the wind
  if (t > 12.85 && t < 19.4) {
    const k = popOut(19.2 - t, 0.3);
    if (t < 14.0) { const kd = win(t, 12.95, 14.0); if (kd > 0) { ctx.save(); ctx.translate(W / 2, 800); ctx.rotate(t * 3); ctx.scale(kd, kd); ctx.fillStyle = '#FFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(-90, -90, 180, 180, 24); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; for (const [dx, dy] of [[-45, -45], [45, 45], [0, 0], [45, -45], [-45, 45]]) { ctx.beginPath(); ctx.arc(dx, dy, 14, 0, 7); ctx.fill(); } ctx.restore(); redX(ctx, W / 2, 800, 260, clamp((t - 13.3) / 0.3)); } chip(ctx, 'NOT BAD LUCK', W / 2, 330, win(t, 12.95, 14.0), { size: 50 }); }
    const r = rnd(41); for (let i = 0; i < 160; i++) { const base = CITIES[i % CITIES.length], lo = base[1] + (r() - 0.5) * 0.9, la = base[2] + (r() - 0.5) * 0.6; const [x, y] = P(c, lo, la); chimney(ctx, x, y, 0.9, pop(t - 14.6 - i * 0.008) * k * (t < 18.2 ? 1 : 0.5), t, r()); }
    odometer(ctx, t, 14.75, 1.4, 0, 5000, v => `${fmt(v)} CHIMNEYS`, W / 2, 330, 96, { k: t < 17.3 ? popOut(17.3 - t, 0.2) : 0 });
    if (t > 17.2) { silhouette(ctx, g => windCloud(g, W / 2, 900, 1.6, t, pop(t - 17.25)), clamp((t - 18.3) / 0.3)); if (t < 18.3) styledText(ctx, 'THE REAL CULPRIT?', W / 2, 330, 80, { k: pop(t - 17.3), fill: C.yellow, stroke: C.goldDark, rot: -3 }); else kinetic(ctx, 'THE WIND 💨', 330, pop(t - 18.34) * k, 110); }
  }
  // ---------- B4–B5 (19.2–33.7): 1800s coal smoke, the west wind, the rich move west
  if (t > 19.15 && t < 33.8) {
    const k = win(t, 19.2, 33.65, 0.35, 0.3); cutWorld(ctx, k, 'parchment', t);
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    victorianTown(ctx, t, t < 23.0 ? clamp((t - 20.3) / 1.2) * 0.25 : 0.25 + 0.75 * easeOut(clamp((t - 23.6) / 2.6)));
    chip(ctx, '📜 THE 1800s', W / 2, 330, win(t, 19.3, 21.3), { size: 50 });
    styledText(ctx, 'COAL. DAY AND NIGHT.', W / 2, 330, 84, { k: win(t, 21.4, 23.0), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    if (t > 23.1 && t < 27.9) { windArrows(ctx, clamp((t - 23.2) / 0.5) * popOut(27.8 - t), t, 520, 1100); windCloud(ctx, 170, 470, 0.7, t, pop(t - 23.2) * popOut(27.8 - t)); chip(ctx, 'BRITAIN: WIND FROM THE WEST ➜', W / 2 + 60, 330, win(t, 23.25, 26.4), { size: 40 }); chip(ctx, '…SMOKE GOES EAST', W / 2, 330, win(t, 26.5, 27.8), { size: 46 }); }
    // B5: the rich move west (upwind, clean air); the workers stay in the smoke
    if (t > 27.8) {
      ctx.save(); const sg = ctx.createRadialGradient(170, 760, 20, 170, 760, 520); sg.addColorStop(0, 'rgba(255,240,180,0.6)'); sg.addColorStop(1, 'rgba(255,240,180,0)'); ctx.globalAlpha = clamp((t - 29.9) / 0.5); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, 1300); ctx.restore();
      const u = easeIO(clamp((t - 28.4) / 1.6)); person(ctx, 'toff', lerp(560, 200, u), 1310 - (u > 0 && u < 1 ? Math.abs(Math.sin(t * 9)) * 12 : 0), 300, { k: pop(t - 28.0), flip: true });
      if (t > 30.4) styledText(ctx, '✨', 200, 820, 70, { k: pop(t - 30.4) });
      [[780, 31.3], [930, 31.5]].forEach(([x, t0], i) => person(ctx, i === 0 && Math.floor(t * 2) % 2 ? 'worker_cough' : 'worker', x, 1310, 260, { k: pop(t - t0), flip: true }));
      chip(ctx, '⬅ UPWIND', 330, 330, win(t, 29.5, 31.2), { size: 48 }); chip(ctx, 'CLEAN AIR', 280, 330, win(t, 30.3, 31.2), { size: 0.001 });
      chip(ctx, 'THE WORKERS STAYED…', W / 2, 330, win(t, 31.25, 32.6), { size: 44 }); styledText(ctx, '…IN THE SMOKE', W / 2, 330, 84, { k: win(t, 32.6, 33.6), fill: '#C9CED6', stroke: C.ink, rot: -3 });
    }
    ctx.restore();
  }
  // ---------- B6 (33.7–38.1): the campfire
  if (t > 33.6 && t < 38.2) {
    const k = win(t, 33.65, 38.1, 0.35, 0.3); campfire(ctx, t, k);
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    person(ctx, 'toff_cheer', 150, 1280, 260, { k: 1 });
    const run = clamp((t - 35.4) / 1.4); [[820, 'camper_panic', 0], [960, 'worker_cough', 0.15]].forEach(([x0, nm, d], i) => { const u = easeIO(clamp(run - d)); person(ctx, nm, lerp(x0, 300 + i * 110, u), 1280 - (u > 0 && u < 1 ? Math.abs(Math.sin(t * 12 + i)) * 26 : 0), 250, { k: 1, flip: u > 0 && u < 1 }); });
    chip(ctx, '🔥 LIKE A CAMPFIRE', W / 2, 330, win(t, 33.8, 35.3), { size: 48 });
    styledText(ctx, 'THE SMOKE-FREE SEAT 🏆', W / 2, 330, 72, { k: win(t, 35.4, 38.0), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    ctx.restore();
  }
  // ---------- B7 (38.1–44.8): the smoke is gone · still up to a fifth of the gap
  if (t > 38.05 && t < 44.0) {
    const k = popOut(43.9 - t, 0.3);
    const r = rnd(41); for (let i = 0; i < 160; i++) { const base = CITIES[i % CITIES.length], lo = base[1] + (r() - 0.5) * 0.9, la = base[2] + (r() - 0.5) * 0.6; const [x, y] = P(c, lo, la); chimney(ctx, x, y, 0.9, (1 - clamp((t - 38.6 - i * 0.004) / 0.3)) * k, t, r()); }
    chip(ctx, 'THE SMOKE: GONE (1970s)', W / 2, 330, win(t, 38.3, 39.75), { size: 44 });
    CITIES.forEach(([n, lo, la], i) => { const [x, y] = P(c, lo, la); cityBadge(ctx, x, y, 34, pop(t - 39.9 - i * 0.06) * k); });
    odometer(ctx, t, 41.45, 0.8, 0, 20, (v, u) => u < 1 ? `UP TO ${Math.round(v)}%` : 'UP TO 1/5', W / 2, 330, 130, { k });
    chip(ctx, 'OF THE GAP BETWEEN RICH & POOR AREAS', W / 2, 470, win(t, 42.2, 43.9), { size: 32 });
  }
  // ---------- B8 (44.8–48.2): blame the weather (back in London)
  if (t > 43.8) {
    londonLayer(ctx, c, 99, clamp((t - 43.85) / 0.6) * (1 - clamp((t - 48.25) / 0.4)), t < 47.0);
    windCloud(ctx, 470, 920, 1.4, t, pop(t - 47.1) * (1 - clamp((t - 48.2) / 0.3)));
    if (t < 48.2) kinetic(ctx, 'BLAME THE WEATHER 💨', 470, pop(t - 47.15), 76);
  }
  // ---------- card (48.2–49.75) then glide back into frame 1
  if (t > 48.1) {
    const k = clamp((t - 48.2) / 0.3) * (1 - clamp((t - 49.75) / 0.3)); ctx.save(); ctx.globalAlpha = 0.74 * k; ctx.fillStyle = '#071318'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4); title(ctx, 'BLAME\nTHE WIND', 520, pop(t - 48.25), 130); ctx.restore();
  }
  if (t > 49.7) londonLayer(ctx, c, 0, clamp((t - 49.75) / 0.55));
}
const QUESTION = 'WHICH SIDE OF YOUR\nCITY IS RICHER? 👇';
const CAPTIONS = [
  [0.0, 2.9, 'West End: money'], [2.95, 3.85, '…and mansions'], [3.9, 6.95, 'East End: docks and slums'],
  [7.1, 8.4, 'Not just London'], [8.45, 10.5, 'City after city…'], [10.52, 11.8, 'East side: poorer'], [11.85, 12.8, '…even today'],
  [12.95, 14.05, 'Not bad luck'], [14.1, 16.8, '5,000 factory chimneys'], [16.85, 18.25, 'The real culprit?'], [18.3, 19.1, 'The wind'],
  [19.3, 21.35, 'The 1800s'], [21.4, 23.0, 'Coal, day and night'], [23.05, 25.35, 'Wind from the west…'], [25.4, 27.7, '…smoke goes east'],
  [27.9, 30.2, 'The rich moved west'], [30.25, 31.2, '…into clean air'], [31.25, 33.5, 'Workers stayed in the smoke'],
  [33.75, 35.3, 'Like a campfire'], [35.35, 38.0, 'Everyone wants the clean seat'],
  [38.2, 39.75, 'The smoke is gone…'], [39.8, 41.35, '…the gap is not'], [41.4, 44.7, 'Up to a fifth of it'],
  [44.9, 47.1, 'Next time: "the West End"…'], [47.15, 48.1, '…blame the weather'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); vignette(ctx); if (t < 48.2) drawText(ctx, t);
  // the comment question rides the last spoken line, then stays on the card
  if (t > 44.9 && t < 49.9) { const y = t < 48.2 ? 1420 : lerp(1420, 860, easeIO((t - 48.2) / 0.45)); styledText(ctx, QUESTION, W / 2, y, 62, { k: pop(t - 45.0) * (t > 49.6 ? popOut(49.9 - t, 0.3) : 1), fill: C.yellow, stroke: C.goldDark, rot: -2 }); }
  if (t > 49.7) { ctx.save(); ctx.globalAlpha = clamp((t - 49.75) / 0.55); styledText(ctx, 'West End: money', W / 2, CAPTION.y + 80, CAPTION.size, { k: 1, shadow: CAPTION.shadow, maxW: 1000 }); kinetic(ctx, 'RICH WEST · POOR EAST?', 200, 1, 76); ctx.restore(); }
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
