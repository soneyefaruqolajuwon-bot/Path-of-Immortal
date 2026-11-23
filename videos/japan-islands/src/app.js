/* Japan's island count doubled — Mapheld 9:16 short. renderAt(t) draws storyboard time t (= voiceover time).
   The gold offshore specks are illustrative stand-ins, not real island positions. */
'use strict';
const W = 1080, H = 1920, DURATION = 71.1;
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
  jp: [136.4, 37.4, 46],
  kyu: [129.95, 33.05, 175],
  far: [139.5, 33.0, 21],
  zoom: [129.75, 33.25, 330],
};
const KEYS = [
  [0, 'jp', 1.0], [8.6, 'jp', 1.05], [9.4, 'jp', 1.0], [19.3, 'jp', 1.05], [45.0, 'jp', 1.0], [46.6, 'kyu', 1], [56.2, 'kyu', 1.05],
  [58.0, 'far', 1], [64.6, 'far', 1.06], [67.8, 'zoom', 1], [71.1, 'zoom', 1.06],
];
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
  for (const key of ['wide', 'near', 'japan', 'eez']) {
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
  const set = c.z > 30 ? PATHS.near : PATHS.wide;
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
  ctx.save(); ctx.setTransform(M); ctx.fillStyle = 'rgba(20,30,28,0.28)'; fillAll(); ctx.fillStyle = C.land; for (const p of PATHS.japan) ctx.fill(p); ctx.restore();
  ctx.save(); ctx.setTransform(M); const cl = new Path2D(); for (const p of PATHS.japan) cl.addPath(p); ctx.clip(cl); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
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

// ------------------------------------------------------------------ scenes (storyboard time = voiceover time, 0–71.1 s)
const PL = GEO.places;
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

// ---- the counter badge (top)
function counterValue(t) {
  if (t < 0.5) return 6852;
  if (t < 2.4) return lerp(6852, 14125, easeIO((t - 0.5) / 1.9));
  if (t < 2.9) return 14125;
  if (t < 3.5) return lerp(14125, 6852, easeIn((t - 2.9) / 0.6));
  if (t < 11.6) return 6852;
  if (t < 20) return lerp(6852, 14125, easeIO((t - 11.6) / 2.3));
  if (t < 52.8) return 6852;
  return lerp(6852, 14125, easeIO((t - 52.8) / 3.0));
}
function counterBadge(ctx, t, k, y = 200, scale = 1) {
  if (k <= 0.001) return;
  const v = counterValue(t), spinning = (t > 0.5 && t < 2.4) || (t > 11.6 && t < 13.9) || (t > 52.8 && t < 55.8) || (t > 2.9 && t < 3.5);
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(k * scale, k * scale);
  const w = 640, h = 190;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 8, -h / 2 + 10, w, h, 34); ctx.fill();
  ctx.fillStyle = 'rgba(10,24,32,0.94)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 34); ctx.fill(); ctx.stroke();
  setFont(ctx, 'Montserrat', 34); ctx.fillStyle = '#DDE6EA'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('OFFICIAL ISLANDS', 0, -50);
  ctx.restore();
  styledText(ctx, fmt(v), W / 2, y + 28 * k * scale, 104 * scale, { k: k * (spinning ? 1 + 0.03 * Math.sin(t * 40) : 1), fill: v > 7000 ? C.yellow : '#FFFFFF', stroke: C.goldDark, shadow: 4 });
}

// ---- island dots (illustrative)
let GLOW, ISL;
function makeGlow() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.25, 'rgba(244,208,63,0.85)'); gr.addColorStop(1, 'rgba(244,208,63,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return cv;
}
const sweepFront = (t, t0, d) => easeIO((t - t0) / d) * 1.3 - 0.15;
const diag = (x, y) => x / W * 0.42 + y / H * 0.58;
const scanY = t => lerp(-80, H * 1.05, clamp((t - 52.8) / 2.8));
function dotLit(t, x, y) {
  if (t < 4) { let a = clamp((sweepFront(t, 0.5, 1.9) - diag(x, y)) / 0.04); if (t > 2.9) a *= (1 - clamp((t - 2.9) / 0.55)) * (Math.sin(t * 90) > -0.3 ? 1 : 0.3); return a; }
  if (t < 21) return clamp((sweepFront(t, 11.4, 2.2) - diag(x, y)) / 0.04);
  if (t < 52.8) return 0;
  if (t < 56.4) return clamp((scanY(t) - y) / 60);
  return 1;
}
function drawDots(ctx, c, t) {
  const faint = t > 44.4 ? clamp((t - 44.5) / 0.5) : 0;
  const sz = Math.pow(c.z / 44, 0.5);
  ctx.save();
  const lit = [];
  for (const d of ISL) {
    const x = c.sx + c.z * (d[0] - c.cx), y = c.sy + c.z * c.tilt * (d[3] - c.cy);
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    const a = dotLit(t, x, y), s = (2.4 + d[2] * 2.8) * sz;
    if (faint > 0 && a < 1) { ctx.globalAlpha = 0.55 * faint * (1 - a); ctx.fillStyle = '#DCE3E6'; ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, 7); ctx.fill(); }
    if (a > 0) lit.push([x, y, s, a, d[2]]);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, s, a, r] of lit) { const tw = t > 56 ? 1 + 0.35 * Math.sin(t * 5 + r * 40) : 1; ctx.globalAlpha = a; ctx.drawImage(GLOW, x - s * 3 * tw, y - s * 3 * tw, s * 6 * tw, s * 6 * tw); }
  ctx.globalCompositeOperation = 'source-over';
  for (const [x, y, s, a] of lit) { ctx.globalAlpha = a; ctx.fillStyle = '#FFF6C8'; ctx.beginPath(); ctx.arc(x, y, s * 0.6, 0, 7); ctx.fill(); }
  ctx.restore();
  // green "verified" checks while the modern scan runs
  if (t > 52.8 && t < 56.8) {
    const out = clamp((56.8 - t) / 0.4);
    for (const d of ISL) {
      if (d[2] > 0.16) continue;
      const x = c.sx + c.z * (d[0] - c.cx), y = c.sy + c.z * c.tilt * (d[3] - c.cy);
      if (x < 0 || x > W || y < 0 || y > H) continue;
      const tl = 52.8 + 2.8 * (y + 80) / (H * 1.05 + 80), k = pop(t - tl, 0.25) * out; if (k <= 0) continue;
      ctx.save(); ctx.translate(x, y - 26); ctx.scale(k, k); ctx.fillStyle = '#2ECC71'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-1, 5); ctx.lineTo(7, -5); ctx.stroke(); ctx.restore();
    }
  }
  return lit;
}
function nearestDot(c, sx, sy) {
  let best = null, bd = 1e9;
  for (const d of ISL) { const x = c.sx + c.z * (d[0] - c.cx), y = c.sy + c.z * c.tilt * (d[3] - c.cy), dd = (x - sx) ** 2 + (y - sy) ** 2; if (dd < bd) { bd = dd; best = [x, y]; } }
  return best;
}
function radarBand(ctx, f, color = C.gold) {
  // the line where diag(x, y) = f
  const yAt = x => (f - x / W * 0.42) * H / 0.58, x0 = -300, x1 = W + 300;
  ctx.save(); ctx.lineCap = 'round';
  const back = 0.07, yb = x => (f - back - x / W * 0.42) * H / 0.58;
  const g = ctx.createLinearGradient(0, yb(W / 2), 0, yAt(W / 2)); g.addColorStop(0, 'rgba(244,208,63,0)'); g.addColorStop(1, 'rgba(244,208,63,0.28)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, yb(x0)); ctx.lineTo(x1, yb(x1)); ctx.lineTo(x1, yAt(x1)); ctx.lineTo(x0, yAt(x0)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 30; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0, yAt(x0)); ctx.lineTo(x1, yAt(x1)); ctx.stroke();
  ctx.restore();
}
function landmark(ctx, c, name, place, w, k, dy = 0) { if (k <= 0) return; const [x, y] = P(c, ...PL[place]); sprite(ctx, name, x, y + dy, w, { k, ay: 0.92 }); }

function volcano(ctx, x, y, s, k, t) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  for (let i = 0; i < 4; i++) { const ph = (t * 0.8 + i * 0.25) % 1; ctx.globalAlpha = 0.7 * (1 - ph); ctx.fillStyle = '#B9B4A8'; ctx.beginPath(); ctx.arc(Math.sin(i * 2) * s * 0.1, -s * 0.55 - ph * s * 0.6, s * (0.08 + ph * 0.12), 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.fillStyle = '#7A5A3A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-s / 2, s * 0.3); ctx.lineTo(-s * 0.1, -s * 0.45); ctx.lineTo(s * 0.1, -s * 0.45); ctx.lineTo(s / 2, s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FF6B2B'; ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.45); ctx.lineTo(s * 0.1, -s * 0.45); ctx.lineTo(s * 0.16, -s * 0.25); ctx.lineTo(s * 0.04, -s * 0.32); ctx.lineTo(-s * 0.05, -s * 0.18); ctx.lineTo(-s * 0.15, -s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function plates(ctx, x, y, s, k, t) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); const j = Math.sin(t * 14) * 4;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 7;
  ctx.fillStyle = '#9C7B54'; ctx.beginPath(); ctx.moveTo(-s / 2, -s * 0.25); ctx.lineTo(-s * 0.02 + j, -s * 0.25); ctx.lineTo(-s * 0.1 + j, 0); ctx.lineTo(-s * 0.02 + j, s * 0.25); ctx.lineTo(-s / 2, s * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#B8956A'; ctx.beginPath(); ctx.moveTo(s / 2, -s * 0.25); ctx.lineTo(s * 0.04 - j, -s * 0.25); ctx.lineTo(-s * 0.04 - j, 0); ctx.lineTo(s * 0.04 - j, s * 0.25); ctx.lineTo(s / 2, s * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * 0.42, -s * 0.42); ctx.lineTo(sd * s * 0.18, -s * 0.42); ctx.lineTo(sd * s * 0.18, -s * 0.5); ctx.lineTo(sd * s * 0.06, -s * 0.38); ctx.lineTo(sd * s * 0.18, -s * 0.26); ctx.lineTo(sd * s * 0.18, -s * 0.34); ctx.lineTo(sd * s * 0.42, -s * 0.34); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

function sceneMap(ctx, c, t) {
  // landmarks & labels (Tokyo is drawn as Tokyo Tower, not a pin)
  const lab = t < 19.6 || t > 44.4;
  if (lab) { landmark(ctx, c, 'tokyo_tower', 'tokyo', 70 * Math.pow(c.z / 44, 0.35), pop(t - 4.3)); const [tx, ty] = P(c, ...PL.tokyo); goldLabel(ctx, 'TOKYO', tx + 90, ty + 18, 40 * Math.pow(c.z / 44, 0.3), pop(t - 4.4) * (c.z < 120 ? 1 : 0)); }
  if (t < 19.6) {
    const [jx, jy] = P(c, ...PL.japan); goldLabel(ctx, 'JAPAN', jx - 40, jy + 40, 70, t < 3 ? 1 : popOut(9.0 - t));
    const [px, py] = P(c, ...PL.pacific), [sx, sy] = P(c, ...PL.seaofjapan);
    goldLabel(ctx, 'PACIFIC\nOCEAN', px, py + 40, 44, win(t, 3.6, 8.8)); goldLabel(ctx, 'SEA OF\nJAPAN', sx - 60, sy, 40, win(t, 3.9, 8.8));
  }
  const lit = drawDots(ctx, c, t);
  if (t > 0.5 && t < 2.6) radarBand(ctx, sweepFront(t, 0.5, 1.9));
  if (t > 11.4 && t < 13.8) radarBand(ctx, sweepFront(t, 11.4, 2.2));
  // B1 hook
  counterBadge(ctx, t, t < 19.4 ? popOut(19.5 - t) : 0);
  kinetic(ctx, 'WAIT…', 1380, win(t, 2.3, 2.95, .15, .1), 120, -4);
  chip(ctx, '◀◀  REWIND', W / 2, 1380, win(t, 2.95, 3.7, .12, .15), { size: 44 });
  if (t > 2.9 && t < 3.5) { ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#25E3FF'; for (let i = 0; i < 6; i++) { const r = rnd(Math.floor(t * 30) * 7 + i); ctx.fillRect(0, r() * H, W, 6 + r() * 30); } ctx.restore(); }
  kinetic(ctx, '≈ 7,000 ISLANDS', 1380, win(t, 6.5, 8.7), 104);
  // B2 2023 recount
  title(ctx, '2023', 1360, win(t, 9.3, 11.2, .35), 170);
  chip(ctx, 'GOVERNMENT RECOUNT', W / 2, 1360, win(t, 11.2, 13.4), { size: 44 });
  kinetic(ctx, 'DOUBLED!', 1360, win(t, 13.9, 15.4), 140, -4);
  // B3 nothing new
  kinetic(ctx, '+0 NEW ROCKS', 1330, win(t, 15.9, 17.2), 100);
  volcano(ctx, 330, 1380, 200, win(t, 17.2, 19.4), t); redX(ctx, 330, 1350, 230, clamp((t - 17.6) / 0.35) * popOut(19.4 - t));
  plates(ctx, 760, 1380, 220, win(t, 18.0, 19.4), t); redX(ctx, 760, 1360, 230, clamp((t - 18.4) / 0.35) * popOut(19.4 - t));
  // B7 modern recount (camera on western Kyushu)
  if (t > 45.0 && t < 56.8) {
    const kk = win(t, 45.1, 56.6);
    if (t > 48.4 && t < 52.6) {     // digital grid scan
      const by = lerp(-40, H + 40, easeIO((t - 48.5) / 2.4)), fa = clamp((52.6 - t) / 0.4);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, by); ctx.clip(); ctx.strokeStyle = `rgba(37,227,255,${0.35 * fa})`; ctx.lineWidth = 2;
      const off = (c.cx * c.z) % 60; for (let x = -off; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.restore();
      ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = '#25E3FF'; ctx.shadowColor = '#25E3FF'; ctx.shadowBlur = 30; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(W, by); ctx.stroke(); ctx.restore();
    }
    if (t > 52.8 && t < 55.8) { const y = scanY(t); ctx.save(); ctx.strokeStyle = '#2EFF8C'; ctx.shadowColor = '#2EFF8C'; ctx.shadowBlur = 34; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.restore(); }
    chip(ctx, "JAPAN'S MAPPING AGENCY", W / 2, 230, win(t, 45.5, 47.4), { size: 42 });
    chip(ctx, '💻  BY COMPUTER', W / 2, 230, win(t, 47.6, 48.5), { size: 44, stroke: '#25E3FF' });
    chip(ctx, 'HIGH-RES DIGITAL MAPS', W / 2, 230, win(t, 48.5, 50.3), { size: 44, stroke: '#25E3FF' });
    chip(ctx, 'SAME 100 m RULE', W / 2, 230, win(t, 50.4, 52.5), { size: 48 });
    counterBadge(ctx, t, win(t, 52.6, 56.6));
    [[53.4, 680, 640], [54.1, 330, 980], [54.8, 760, 1200]].forEach(([t0, sx, sy], i) => {
      const k = win(t, t0, 56.5); if (k <= 0) return; const [dx, dy] = nearestDot(c, sx, sy);
      ctx.save(); ctx.globalAlpha = clamp(k); ctx.strokeStyle = '#2EFF8C'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + (i === 1 ? 60 : -60), dy - 90); ctx.stroke(); ctx.restore();
      chip(ctx, '✔ VERIFIED ISLAND', dx + (i === 1 ? 60 : -60), dy - 110, k, { size: 28, stroke: '#2EFF8C', fill: '#BFFFD9' });
    });
    person(ctx, t < 47.6 ? 'carto_point' : 'carto_tap', 200, 1560, 300, { k: pop(t - 45.2) * popOut(56.5 - t) });
  }
  // B8 payoff
  if (t > 56.4) {
    chip(ctx, 'LAND AREA: +0 km²', W / 2, 1300, win(t, 56.8, 58.8), { size: 46 });
    const ke = clamp((t - 58.9) / 1.1), kf = popOut(64.9 - t, 0.4);
    if (ke > 0 && kf > 0) {
      const [ox, oy] = P(c, 139.5, 33.5), M = camMatrix(c);
      ctx.save(); ctx.globalAlpha = kf; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, 3000, -Math.PI / 2, -Math.PI / 2 + ke * 2 * Math.PI); ctx.closePath(); ctx.clip();
      ctx.setTransform(M); const p = PATHS.eez[0]; ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(p);
      ctx.setTransform(1, 0, 0, 1, 0, 0); const pp = new Path2D(); pp.addPath(p, M); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; ctx.setLineDash([22, 14]); ctx.lineDashOffset = -t * 20; ctx.stroke(pp); ctx.restore();
    }
    chip(ctx, '✔ BORDERS UNCHANGED', W / 2, 1300, win(t, 59.5, 61.6), { size: 44, stroke: '#FFFFFF' });
    // the big count
    const kb = win(t, 60.4, 65.0);
    if (kb > 0) {
      const v = t < 61.4 ? 6852 : lerp(6852, 14125, easeOut((t - 61.4) / 2.2));
      styledText(ctx, 'OFFICIAL ISLANDS', W / 2, 190, 44, { k: kb });
      styledText(ctx, fmt(v), W / 2, 320, 190, { k: kb * (t > 63.6 ? 1 + 0.12 * Math.max(0, 1 - (t - 63.6) * 4) : 1), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    }
    // the 1987 surveyor drops his magnifying glass; the modern mapmaker beams
    const ks = pop(t - 61.0) * popOut(68.4 - t);
    person(ctx, t < 62.0 ? 'surveyor_idle' : 'surveyor_shock', 200, 1540, 290, { k: ks });
    if (t > 62.0 && ks > 0) { const [hx, hy] = spriteHand('surveyor_shock', 200, 1540, 290, 250, 270), f = clamp((t - 62.0) / 0.5), gy = 1530;
      const y = f < 1 ? lerp(hy, gy, f * f) : gy - Math.abs(Math.sin((t - 62.5) * 9)) * 30 * Math.exp(-(t - 62.5) * 5);
      sprite(ctx, 'magnifier', hx + f * 60, y, 70, { rot: f * 150 + (t - 62) * 30, ay: 0.7, k: ks }); }
    person(ctx, 'carto_proud', 880, 1540, 270, { k: pop(t - 61.3) * popOut(68.4 - t) });
    kinetic(ctx, "THE MAP DIDN'T CHANGE…", 330, win(t, 65.1, 66.8), 76, -2, '#FFFFFF');
    kinetic(ctx, 'WE JUST ZOOMED IN 🔍', 330, win(t, 66.8, 68.5), 84);
  }
}
function slideCard(t, t0, t1) { return clamp((t - t0) / 0.5) * (1 - clamp((t - t1) / 0.45)); }

// ---- 1987 paper chart (drawn once into an offscreen canvas)
const CH = { x: 60, y: 330, w: 960, h: 1100, cx: 134.6, cy: 35.6, z: 36 };
let CHART;
const chartXY = (lon, lat) => [CH.w / 2 + CH.z * (lon - CH.cx), CH.h / 2 - CH.z * (mercY(lat) - mercY(CH.cy))];
function makeChart() {
  const cv = document.createElement('canvas'); cv.width = CH.w; cv.height = CH.h; const g = cv.getContext('2d');
  g.fillStyle = '#EADBB4'; g.fillRect(0, 0, CH.w, CH.h);
  g.save(); g.globalAlpha = 0.5; g.fillStyle = g.createPattern(NOISE, 'repeat'); g.fillRect(0, 0, CH.w, CH.h); g.restore();
  g.strokeStyle = 'rgba(110,80,40,0.25)'; g.lineWidth = 2;
  for (let lon = 124; lon <= 148; lon += 4) { const [x] = chartXY(lon, 30); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH.h); g.stroke(); }
  for (let lat = 24; lat <= 48; lat += 4) { const [, y] = chartXY(130, lat); g.beginPath(); g.moveTo(0, y); g.lineTo(CH.w, y); g.stroke(); }
  g.lineJoin = 'round';
  for (const r of GEO.japan) { g.beginPath(); for (let i = 0; i < r.length; i += 2) { const [x, y] = chartXY(r[i], r[i + 1]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fillStyle = '#D9C48F'; g.fill(); g.strokeStyle = '#4A3520'; g.lineWidth = 2.5; g.stroke(); }
  g.fillStyle = '#4A3520'; for (const d of ISL) { const [x, y] = chartXY(d[0], d[1]); g.beginPath(); g.arc(x, y, 0.8 + d[2] * 0.9, 0, 7); g.fill(); }
  // compass rose + title block
  g.save(); g.translate(150, 170); g.strokeStyle = '#4A3520'; g.fillStyle = '#4A3520'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 70, 0, 7); g.stroke();
  for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, -90); g.lineTo(14, 0); g.lineTo(-14, 0); g.closePath(); i % 2 ? g.stroke() : g.fill(); }
  g.restore(); g.font = '800 34px "Playfair Display"'; g.fillStyle = '#4A3520'; g.textAlign = 'center'; g.fillText('N', 150, 62);
  g.font = '800 38px "Playfair Display"'; g.fillText('COASTAL SURVEY CHART', 690, 1010); g.font = '800 28px "Montserrat"'; g.fillText('JAPAN · 1987', 690, 1055);
  g.strokeStyle = '#4A3520'; g.lineWidth = 6; g.strokeRect(10, 10, CH.w - 20, CH.h - 20); g.lineWidth = 2; g.strokeRect(22, 22, CH.w - 44, CH.h - 44);
  return cv;
}
function blob(ctx, x, y, R, seed, fill = '#D9C48F') {
  const r = rnd(seed), ph = [r() * 6, r() * 6, r() * 6], pts = [];
  for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283, rr = R * (1 + 0.2 * Math.sin(3 * a + ph[0]) + 0.1 * Math.sin(5 * a + ph[1]) + 0.06 * Math.sin(9 * a + ph[2])); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]); }
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#4A3520'; ctx.lineWidth = 5; ctx.stroke();
  return pts;
}
const LENS_PATH = [[22.6, 129.6, 33.0], [26.0, 132.6, 34.0], [31.0, 130.0, 32.6], [33.2, 133.5, 34.2], [34.6, 141.6, 39.0]];
function lensAt(t) { let i = 0; while (i < LENS_PATH.length - 2 && LENS_PATH[i + 1][0] <= t) i++; const a = LENS_PATH[i], b = LENS_PATH[i + 1], u = easeIO((t - a[0]) / (b[0] - a[0])); return chartXY(lerp(a[1], b[1], u), lerp(a[2], b[2], u)); }
function sceneChart(ctx, t) {
  const kin = clamp((t - 19.45) / 0.5), kout = clamp((t - 37.25) / 0.45); if (kin <= 0 || kout >= 1) return;
  ctx.save(); ctx.translate(-W * easeIn(kout), H * (1 - easeOut(kin)));
  ctx.fillStyle = '#5C4A32'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; ctx.drawImage(CHART, CH.x, CH.y); ctx.restore();
  // "MISSED" specks blink red and vanish
  if (t > 33.2 && t < 35.0) {
    for (let i = 0; i < 70; i++) { const d = ISL[(i * 53) % ISL.length], [x, y] = chartXY(d[0], d[1]); const k = clamp((t - 33.3 - i * 0.012) / 0.2) * clamp((34.9 - t) / 0.3);
      if (k <= 0) continue; ctx.save(); ctx.globalAlpha = k * (Math.sin(t * 30 + i) > 0 ? 1 : 0.4); ctx.strokeStyle = '#D7263D'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(CH.x + x, CH.y + y, 12, 0, 7); ctx.stroke(); ctx.restore(); }
    kinetic(ctx, 'THOUSANDS MISSED', 270, win(t, 33.3, 34.9), 88, -3, '#FF6B6B');
  }
  // the magnifying lens drifting along the coast
  const showLens = (t > 22.4 && t < 26.4) || (t > 30.8 && t < 34.9);
  if (showLens) {
    const kl = t < 26.4 ? win(t, 22.5, 26.3) : win(t, 30.9, 34.8), [lx0, ly0] = lensAt(t), lx = CH.x + lx0, ly = CH.y + ly0, R = 150 * kl, Z = 3;
    ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.clip(); ctx.drawImage(CHART, lx0 - R / Z, ly0 - R / Z, 2 * R / Z, 2 * R / Z, lx - R, ly - R, 2 * R, 2 * R); ctx.fillStyle = 'rgba(190,235,255,0.12)'; ctx.fillRect(lx - R, ly - R, 2 * R, 2 * R); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#2B2B33'; ctx.lineWidth = 22 * kl; ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.stroke(); ctx.lineCap = 'round'; ctx.strokeStyle = '#6B4423'; ctx.lineWidth = 30 * kl; ctx.beginPath(); ctx.moveTo(lx + R * 0.72, ly + R * 0.72); ctx.lineTo(lx + R * 1.5, ly + R * 1.5); ctx.stroke(); ctx.restore();
  }
  // titles
  chip(ctx, 'COAST GUARD SURVEY', W / 2, 200, win(t, 20.2, 21.6), { size: 46, bg: 'rgba(40,28,14,0.92)' });
  title(ctx, '1987', 210, win(t, 21.6, 23.2, .35), 170);
  kinetic(ctx, 'COUNTED BY HAND ✍', 210, win(t, 23.2, 24.6), 84, -3, '#FFF3D6');
  kinetic(ctx, 'ON PAPER CHARTS', 210, win(t, 24.6, 26.0), 84, -3, '#FFF3D6');
  // tally scribbles in the corner while counting
  if (t > 23.0 && t < 26.2) { ctx.save(); ctx.globalAlpha = clamp((26.2 - t) / 0.3); ctx.strokeStyle = '#4A3520'; ctx.lineWidth = 5; ctx.lineCap = 'round'; const n = Math.floor((t - 23.0) * 9);
    for (let i = 0; i < Math.min(n, 30); i++) { const g = Math.floor(i / 5), j = i % 5, x0 = 600 + (g % 3) * 120, y0 = 470 + Math.floor(g / 3) * 80; ctx.beginPath();
      if (j < 4) { ctx.moveTo(x0 + j * 18, y0); ctx.lineTo(x0 + j * 18 + 3, y0 + 50); } else { ctx.moveTo(x0 - 8, y0 + 40); ctx.lineTo(x0 + 70, y0 + 8); } ctx.stroke(); } ctx.restore(); }
  // B5: the 100 m rule — inset on one islet with its coastline traced
  const ki = win(t, 26.2, 30.9);
  if (ki > 0) {
    ctx.save(); ctx.translate(540, 860); ctx.scale(ki, ki);
    ctx.fillStyle = '#F3E7C6'; ctx.strokeStyle = '#2B2B33'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, 320, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(30,77,92,0.25)'; ctx.beginPath(); ctx.arc(0, 0, 306, 0, 7); ctx.fill();
    const pts = blob(ctx, 0, 0, 150, 77);
    const kt = clamp((t - 27.6) / 1.8);
    if (kt > 0) { const n = Math.floor(kt * pts.length); ctx.strokeStyle = C.gold; ctx.lineWidth = 9; ctx.setLineDash([18, 10]); ctx.beginPath(); for (let i = 0; i <= n; i++) { const p = pts[i % pts.length]; i ? ctx.lineTo(p[0] * 1.12, p[1] * 1.12) : ctx.moveTo(p[0] * 1.12, p[1] * 1.12); } ctx.stroke(); ctx.setLineDash([]);
      const p = pts[n % pts.length]; ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p[0] * 1.12, p[1] * 1.12, 16, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    chip(ctx, 'COASTLINE ≥ 100 m AROUND', W / 2, 210, win(t, 28.4, 30.9), { size: 40 });
    stamp(ctx, '✔ ISLAND', 760, 600, t, 30.0, { color: '#1E8449', size: 54, until: 30.9, rot: 8 });
  }
  // B5: tight clusters counted as one
  const kc = win(t, 34.9, 37.3);
  if (kc > 0) {
    ctx.save(); ctx.translate(540, 860); ctx.scale(kc, kc);
    ctx.fillStyle = '#F3E7C6'; ctx.strokeStyle = '#2B2B33'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, 320, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(30,77,92,0.25)'; ctx.beginPath(); ctx.arc(0, 0, 306, 0, 7); ctx.fill();
    [[-90, -60, 60, 11], [60, -90, 48, 12], [80, 50, 66, 13], [-60, 90, 44, 14], [0, 0, 30, 15]].forEach(([x, y, r, s], i) => { if (t > 35.0 + i * 0.08) blob(ctx, x, y, r, s); });
    const kl = clamp((t - 35.4) / 0.6); if (kl > 0) { ctx.strokeStyle = '#D7263D'; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(0, 0, 235, 210, 0, -Math.PI / 2, -Math.PI / 2 + kl * 6.283); ctx.stroke(); }
    ctx.restore();
    styledText(ctx, '= 1', 860, 620, 120, { k: pop(t - 36.0), fill: '#FF6B6B', stroke: C.ink });
  }
  // the 1987 surveyor (Japan cape)
  const pose = t > 35.9 && t < 36.6 ? 'surveyor_stamp' : t > 34.9 && t < 35.9 ? 'surveyor_idle' : (t > 22.4 && t < 26.3) || (t > 30.8 && t < 34.9) ? 'surveyor_squint' : t > 26.3 && t < 30.8 ? 'surveyor_idle' : 'surveyor_idle';
  person(ctx, t > 36.6 ? 'surveyor_shrug' : pose, 190, 1560, 330, { k: pop(t - 20.0) });
  stamp(ctx, 'COUNTED AS ONE', 640, 1240, t, 36.4, { size: 48, until: 37.3 });
  ctx.restore();
}

// ---- the couch-cushion gag (a dark-teal cutaway card)
const COINS = (() => { const r = rnd(4242), a = []; for (let i = 0; i < 40; i++) a.push([280 + r() * 260, 1040 - Math.floor(i / 10) * 16 + r() * 18 - 9, r()]); return a; })();
function sceneCouch(ctx, c, t) {
  const kin = clamp((t - 37.35) / 0.5); if (kin <= 0 || t > 45.2) return;
  const fade = 1 - clamp((t - 43.9) / 0.5);
  ctx.save(); ctx.globalAlpha = fade; ctx.translate(W * (1 - easeOut(kin)), 0);
  ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#163A46'; ctx.fillRect(0, 1180, W, H - 1180);
  ctx.strokeStyle = 'rgba(244,208,63,0.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(40, 160, W - 80, H - 320, 34); ctx.stroke();
  sprite(ctx, 'couch', 540, 1000, 760);
  // coins hiding in the seat gap (revealed by the flashlight)
  const nC = t < 39.6 ? 0 : t < 40.85 ? 14 : 40;
  const lightOn = t > 39.0 && t < 43.9;
  for (let i = 0; i < nC; i++) { const [x, y] = COINS[i]; sprite(ctx, 'coin', x, y, 46, { k: pop(t - (i < 14 ? 39.6 + i * 0.03 : 40.85 + (i - 14) * 0.015), 0.25) }); }
  // the cushion: on the seat, then lifted
  const lift = easeIO((t - 38.3) / 0.6);
  sprite(ctx, 'cushion', 660, 1050, 250);
  sprite(ctx, 'cushion', lerp(410, 680, lift), lerp(1050, 1060, lift) - Math.sin(lift * Math.PI) * 120, 250, { rot: lerp(0, -28, lift) });
  person(ctx, t > 42.7 ? 'couchguy_look' : 'couchguy_lift', 880, 1430, 280);
  if (lightOn) {
    const [hx, hy] = spriteHand('couchguy_lift', 880, 1430, 280, 316, 370), tx = 410, ty = 1035;
    const ang = Math.atan2(ty - hy, tx - hx), len = Math.hypot(tx - hx, ty - hy) * 1.15, spread = 0.2;
    ctx.save(); const dark = new Path2D(); dark.rect(-W, 0, 3 * W, H);
    const cone = new Path2D(); cone.moveTo(hx, hy); cone.lineTo(hx + Math.cos(ang - spread) * len, hy + Math.sin(ang - spread) * len); cone.lineTo(hx + Math.cos(ang + spread) * len, hy + Math.sin(ang + spread) * len); cone.closePath();
    dark.addPath(cone); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(dark, 'evenodd');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,230,140,0.22)'; ctx.fill(cone); ctx.restore();
  }
  kinetic(ctx, 'TWICE THE CHANGE!', 330, win(t, 40.85, 42.6), 90);
  chip(ctx, '7,000+ HIDDEN', W / 2, 330, win(t, 42.6, 43.9), { size: 54 });
  styledText(ctx, '×2', 300, 870, 140, { k: win(t, 41.0, 43.8), fill: C.yellow, stroke: C.goldDark, rot: -8 });
  ctx.restore();
  // coins fly out of the card and become specks along Japan's coast
  if (t > 43.7) {
    for (let i = 0; i < COINS.length; i++) {
      const d = ISL[(i * 37 + 11) % ISL.length], tx = c.sx + c.z * (d[0] - c.cx), ty = c.sy + c.z * c.tilt * (d[3] - c.cy);
      const u = easeIO((t - 43.7 - COINS[i][2] * 0.25) / 0.9); if (u <= 0 || u >= 1) continue;
      const [sx, sy] = COINS[i], x = lerp(sx, tx, u), y = lerp(sy, ty, u) - Math.sin(u * Math.PI) * 300;
      sprite(ctx, 'coin', x, y, lerp(46, 10, u), { rot: u * 360 });
    }
  }
}

// end card
function sceneEnd(ctx, t) {
  if (t < 68.5) return; const e = t - 68.5, k = clamp(e / 0.35);
  ctx.fillStyle = `rgba(4,10,14,${0.72 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, 'SAME JAPAN.', W / 2, 640, 110, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'SHARPER MAP.', W / 2, 780, 110, { k: pop(e - 0.25, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  title(ctx, '14,125 ISLANDS', 960, pop(e - 0.5, 0.4), 104);
  const kc = pop(e - 0.9, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 1160); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 46);
    const w = ctx.measureText('FOLLOW MAPHELD').width + 120; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -56, w, 112, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 40, -20); ctx.lineTo(-w / 2 + 40, 20); ctx.lineTo(-w / 2 + 72, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FOLLOW MAPHELD', 22, 3); ctx.restore(); }
}

const CAPTIONS = [
  [0.0, 2.0, 'For decades…'], [2.0, 4.6, 'Every official map'], [4.6, 6.3, 'An island nation'], [6.3, 8.6, 'Nearly 7,000 islands'],
  [8.8, 10.5, 'Then, in 2023…'], [10.5, 12.7, 'A fresh recount'], [12.7, 14.9, 'The count DOUBLED'],
  [15.0, 17.0, 'No new rocks'], [17.0, 18.0, 'No new volcanoes'], [18.0, 19.35, 'No shifting plates'],
  [19.5, 21.6, 'A coast guard survey'], [21.6, 22.8, 'Back in 1987'], [22.8, 24.5, 'Counted by hand'], [24.5, 25.9, 'On paper charts'],
  [26.1, 27.1, 'The rule:'], [27.1, 29.5, '100 m of coastline'], [29.5, 30.9, '= an island'], [31.0, 33.2, 'Spotted by eye?'], [33.3, 34.6, 'Thousands slipped by'],
  [34.7, 36.0, 'Tight clusters…'], [36.0, 37.25, '…counted as one'],
  [37.5, 39.0, 'Couch cushions'], [39.0, 40.4, 'Plus a flashlight'], [40.5, 42.6, 'Twice the change'], [42.7, 44.4, 'There all along'],
  [45.0, 47.3, "Japan's mapping agency"], [47.4, 48.4, 'By computer'], [48.5, 50.2, 'High-res digital maps'], [50.3, 52.6, 'Same 100 m rule'],
  [52.7, 54.6, 'Thousands of islets'], [54.6, 56.3, 'Suddenly showed up'],
  [56.5, 58.7, 'Land: not an inch'], [58.9, 60.3, 'Borders: unchanged'], [60.4, 62.0, 'But Japan woke up'], [62.0, 64.9, 'With 14,125 islands'],
  [65.1, 66.7, "The map didn't change"], [66.8, 68.4, 'We just zoomed in'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t);
  const covered = (t > 20.0 && t < 37.3) || (t > 37.9 && t < 43.9);
  if (!covered) { drawMap(ctx, c); sceneMap(ctx, c, t); }
  sceneChart(ctx, t); sceneCouch(ctx, c, t);
  vignette(ctx); if (t < 68.5) drawText(ctx, t); sceneEnd(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}
window.renderAt = renderAt; window.READY = false;
ISL = GEO.islets.map(d => [d[0], d[1], d[2], -mercY(d[1])]);
loadAssets().then(() => {
  GLOW = makeGlow(); CHART = makeChart();
  window.READY = true; if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play'), aud = document.getElementById('aud');
  ctl.style.display = 'flex'; let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; draw(); };
  const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; last = now; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
