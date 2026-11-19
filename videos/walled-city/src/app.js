/* Kowloon Walled City — Map Warden-style 9:16 explainer. HTML5 Canvas, deterministic.
 * renderAt(t) draws the frame at storyboard time t (seconds, 0–93, as in the script).
 * Assets: window.ASSETS {name: dataURI}, geometry: GEO (geo_data.js).
 */
'use strict';
const W = 1080, H = 1920, DURATION = 85;
const C = {
  ocean: '#1E4D5C', land: '#8A855C', coast: '#5E5A3B', halo: '#2C6A78', ink: '#141416',
  gold: '#F4D03F', goldDark: '#3A2A08', yellow: '#FFD43B', cyan: '#25E3FF', white: '#FFFFFF',
  usRed: '#B22234', usBlue: '#3C3B6E',
};
const CAPTION = { size: 64, y: 1320, font: 'Montserrat', shadow: 4 };   // spec said 48px; 64 reads better on phones
const KWC = GEO.walledCity;

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
  hk: [114.17, 22.325, 2600],
  kwc: [114.1903, 22.3322, 16000],
  region: [114.0, 22.5, 700],
  kowloon: [114.18, 22.33, 7000],
};
const KEYS = [  // [t, view, zoomMul, rot, tilt]
  [0, 'hk', 1], [3.4, 'kwc', 1], [8.0, 'kwc', 1.1],
  [9.6, 'region', 1], [12.4, 'region', 1.07], [13.4, 'kowloon', 1], [15.6, 'kowloon', 1.05],
  [16.6, 'kwc', 1.5], [30.0, 'kwc', 1.62], [36.0, 'kwc', 1.5], [51.0, 'kwc', 1.62], [59.0, 'kwc', 1.4],
  [65.0, 'kwc', 1.5], [77.0, 'kwc', 1.62], [81.0, 'kwc', 1.62], [84.4, 'hk', 1.15], [85.0, 'hk', 1.15],
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
  return { cx: lerp(x0, x1, w), cy: lerp(y0, y1, w), z, rot: lerp(a[3] || 0, b[3] || 0, ue), tilt: lerp(a[4] || 1, b[4] || 1, ue), sx: W / 2, sy: H * 0.47 };
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
  for (const key of ['region', 'hk', 'nt']) {
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
  const set = c.z >= 1500 ? PATHS.hk : PATHS.region;
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
  ctx.save(); ctx.setTransform(M); ctx.strokeStyle = C.coast; ctx.lineWidth = 2.2 / c.z; for (const p of set) ctx.stroke(p); ctx.restore();
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
  if (k <= 0 || sp.length < 2) return null;
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

// ------------------------------------------------------------------ scenes (storyboard time, 0–85 as in the script)

function unionJack(ctx, x, y, w, h) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#012169'; ctx.fillRect(x, y, w, h);
  const diag = (col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke(); };
  const cross = (col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke(); };
  diag('#fff', h * 0.2); diag('#C8102E', h * 0.067); cross('#fff', h * 0.333); cross('#C8102E', h * 0.2);
  ctx.restore();
}
function drawLease(ctx, c, k, alpha = 0.55) {          // 1898 leased area tinted with the Union Jack
  if (k <= 0) return;
  const clip = new Path2D(); for (const p of PATHS.nt) clip.addPath(p, camMatrix(c));
  const [cx, cy] = P(c, 114.15, 22.42);
  if (!window.UJ_TILE) { const cv = document.createElement('canvas'); cv.width = 150; cv.height = 75; unionJack(cv.getContext('2d'), 0, 0, 150, 75); window.UJ_TILE = cv; }
  ctx.save(); ctx.clip(clip, 'evenodd');
  ctx.beginPath(); ctx.arc(cx, cy, 1400 * easeOut(k), 0, 7); ctx.clip();
  ctx.globalAlpha = alpha; ctx.fillStyle = ctx.createPattern(window.UJ_TILE, 'repeat'); ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // the Walled City is the hole in the lease
  ctx.save(); ctx.fillStyle = C.land; ctx.globalAlpha = clamp(k); ctx.fill(footprint(c)); ctx.restore();
}
function footprint(c) {                                 // the ~210 m x 120 m block, top-down
  const [lon, lat] = KWC, dLon = 0.00105, dLat = 0.00055;
  const pts = [[-dLon, -dLat], [dLon, -dLat], [dLon, dLat], [-dLon, dLat]].map(([a, b]) => P(c, lon + a, lat + b));
  const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(...q) : p.moveTo(...q)); p.closePath(); return p;
}

// --- isometric diorama (sprites share the same iso grid: see tools/make_assets.py)
const DIO = { x: 540, y: 860, w: 1300 };   // screen centre + width of the 1000x760 iso sprites
function isoP(x, y, z = 0) { return [410 + (x - y) * 0.866 * 26, 250 + (x + y) * 13 - z * 26]; }
function dioSprite(ctx, name, o = {}) {
  const im = IMG[name]; if (!im) return;
  const sc = (o.scale || 1) * DIO.w / im.width, w = im.width * sc, h = im.height * sc;
  const x0 = (o.x || DIO.x) - w / 2, y0 = (o.y || DIO.y) - h / 2;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.rise !== undefined) {               // towers emerge from the ground: clip above the plate's near edges
    const m = 0.8, L = isoP(-m, 12 + m), B = isoP(20 + m, 12 + m), R = isoP(20 + m, -m);
    ctx.beginPath(); ctx.moveTo(x0 + L[0] * sc, y0 + L[1] * sc); ctx.lineTo(x0 + B[0] * sc, y0 + B[1] * sc); ctx.lineTo(x0 + R[0] * sc, y0 + R[1] * sc);
    ctx.lineTo(x0 + R[0] * sc, -2000); ctx.lineTo(x0 + L[0] * sc, -2000); ctx.closePath(); ctx.clip();
    ctx.translate(0, (1 - o.rise) * 150 * sc);
  }
  if (o.sy) { ctx.translate(0, y0 + h * 0.75); ctx.scale(1, o.sy); ctx.translate(0, -(y0 + h * 0.75)); }
  ctx.drawImage(im, x0, y0, w, h); ctx.restore();
}
function dioPlate(ctx, col) {               // bare lot (after demolition)
  const sc = DIO.w / 1000, x0 = DIO.x - DIO.w / 2, y0 = DIO.y - 760 * sc / 2, m = 0.8;
  const pts = [isoP(-m, -m), isoP(20 + m, -m), isoP(20 + m, 12 + m), isoP(-m, 12 + m)];
  ctx.save(); ctx.beginPath(); pts.forEach((q, i) => { const X = x0 + q[0] * sc, Y = y0 + q[1] * sc; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}
function dim(ctx, a) { if (a > 0) { ctx.save(); ctx.fillStyle = `rgba(8,22,28,${a})`; ctx.fillRect(0, 0, W, H); ctx.restore(); } }

function sceneIntro(ctx, c, t) {              // 0–8: zoom into a tiny block in Hong Kong
  if (t > 15.6) return;
  const kf = clamp((t - 2.6) / 0.6) * popOut(15.5 - t);
  if (kf > 0) {
    ctx.save(); ctx.globalAlpha = kf; ctx.fillStyle = 'rgba(244,208,63,0.35)'; ctx.fill(footprint(c));
    ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.shadowColor = C.gold; ctx.shadowBlur = 18; ctx.stroke(footprint(c)); ctx.restore();
  }
  const [px, py] = P(c, ...KWC);
  const drop = 1 - easeOut((t - 0.9) / 0.45);
  if (t > 0.9 && t < 15.5) sprite(ctx, 'pin', px, py - drop * 400, 110, { ay: 0.97, k: popOut(15.5 - t) * (t < 14 || t > 14.6 ? 1 : 1) });
  if (t < 3.4) mapLabel(ctx, c, 114.1, 22.42, 'HONG KONG', 56, win(t, 0.3, 3.2));
  mapLabel(ctx, c, ...[KWC[0], KWC[1] - 0.0016], 'Kowloon Walled City', 40, win(t, 3.6, 8.0));
  // neither country wants it
  sprite(ctx, 'britain_shrug', 270, 520 + wob(t, 1.2, 6), 470, { k: win(t, 3.4, 7.9) });
  sprite(ctx, 'china_shrug', 810, 520 + wob(t, 1.2, 6, 1), 470, { k: win(t, 3.7, 7.9) });
}

function scene1898(ctx, c, t) {               // 8–21: the lease that left out one fort
  if (t < 8.2 || t > 21.4) return;
  drawLease(ctx, c, clamp((t - 10.0) / 1.2) * popOut(16.6 - t, 0.6));
  if (t < 14) {
    mapLabel(ctx, c, 114.17, 22.215, 'HONG KONG', 44, win(t, 9.8, 13.2));
    mapLabel(ctx, c, 113.72, 22.86, 'CHINA', 64, win(t, 10.0, 13.2));
    sprite(ctx, 'britain_point', 300, 1080, 400, { k: win(t, 10.3, 13.2) });
    sprite(ctx, 'china_shrug', 800, 520, 400, { k: win(t, 10.6, 13.2) });
  }
  // "left out": pulsing red hole where the fort is
  const kh = win(t, 13.4, 15.6);
  if (kh > 0) {
    const [x, y] = P(c, ...KWC);
    ctx.save(); ctx.strokeStyle = '#E63946'; ctx.lineWidth = 8; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.arc(x, y, (60 + 10 * Math.sin(t * 6)) * kh, 0, 7); ctx.stroke(); ctx.restore();
    styledText(ctx, 'NOT INCLUDED', x, y - 110, 54, { k: kh, fill: '#FF6B6B', stroke: C.ink });
  }
  // loophole: they point at each other
  bubble(ctx, 300, 330, 'Yours.', 54, [30, 80], win(t, 16.0, 18.2));
  bubble(ctx, 780, 330, 'No, YOURS.', 54, [-30, 80], win(t, 16.6, 18.2));
  sprite(ctx, 'britain_point', 250, 520, 420, { k: win(t, 15.8, 18.2) });
  sprite(ctx, 'china_point', 830, 520, 420, { k: win(t, 16.1, 18.2) });
  // no taxes / no building codes / no police
  [[18.3, 'icon_no_tax', 220], [19.3, 'icon_no_codes', 540], [20.2, 'icon_no_police', 860]].forEach(([t0, n, x]) =>
    sprite(ctx, n, x, 470, 230, { k: win(t, t0, 21.3) }));
}

function sceneCity(ctx, c, t) {               // 14.6–81: the block itself as an isometric diorama
  const on = t > 15.2 && t < 84.5 && !(t > 30.6 && t < 35.9) && !(t > 46.2 && t < 50.9);
  if (!on) return;
  const shrink = t > 81.0 ? easeIO((t - 81.0) / 3.3) : 0;
  dim(ctx, 0.5 * clamp((t - 15.2) / 0.6) * (1 - shrink));
  ctx.save();
  if (shrink > 0) {                            // fly the park back down onto the map
    const [mx, my] = P(c, ...KWC);
    ctx.translate(lerp(0, mx - DIO.x, shrink), lerp(0, my - DIO.y, shrink));
    ctx.translate(DIO.x, DIO.y); ctx.scale(1 - 0.97 * shrink, 1 - 0.97 * shrink); ctx.translate(-DIO.x, -DIO.y);
  }
  let shake = 0;
  if (t > 42.6 && t < 45.4) shake = Math.sin(t * 60) * 3;
  if (t > 70.0 && t < 73.6) shake = Math.sin(t * 70) * 7 * (1 - (t - 70) / 3.6);
  ctx.translate(shake, 0);
  const kIn = pop(t - 15.4, 0.45);
  if (t < 24.2) dioSprite(ctx, 'walled_city_1898_fort', { scale: kIn, alpha: 1 - clamp((t - 21.4) / 0.6) });
  if (t > 21.4 && t < 28.0) dioSprite(ctx, 'walled_city_1960s_growing', { rise: easeOut((t - 21.4) / 2.2) });
  if (t > 24.2 && t < 73.8) {
    const rise = t < 70.2 ? easeOut((t - 24.2) / 3.2) : 1 - easeIn((t - 70.2) / 3.4);
    if (t > 70.2) dioPlate(ctx, '#8C7F68');
    dioSprite(ctx, 'walled_city_1980s_megastructure', { rise });
  }
  if (t >= 73.6 && t < 77.4) dioPlate(ctx, '#8C7F68');
  if (t > 77.2) dioSprite(ctx, 'walled_city_1995_park', { sy: lerp(0.2, 1, back((t - 77.2) / 0.7)), alpha: clamp((t - 77.2) / 0.4) });
  // demolition dust
  if (t > 70.0 && t < 75.0) for (let i = 0; i < 6; i++) puff(ctx, 300 + i * 95, 960 + (i % 2) * 60, 170, ((t - 70.0 - i * 0.35) % 1.6) / 1.6, i + 3);
  ctx.restore();
  // jet skims the rooftops
  if (t > 42.0 && t < 45.8) {
    const u = (t - 42.0) / 3.8;
    const jx = lerp(1600, -600, u), jy = lerp(470, 900, u);
    ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(jx - 40, jy + 260, 300, 40, 0.2, 0, 7); ctx.fill(); ctx.restore();
    sprite(ctx, 'jet', jx, jy, 820, { rot: 12 });
  }
  // compensation + crane
  [[65.4, 300, 600], [65.8, 780, 560], [66.2, 540, 1180]].forEach(([t0, x, y]) => sprite(ctx, 'money_bag', x, y, 190, { k: win(t, t0, 68.6) }));
  if (t > 68.4 && t < 74.6) {
    const enter = easeOut((t - 68.4) / 0.8), ex = popOut(74.5 - t);
    const CS = 0.95, cx = lerp(1350, 640, enter), cy = 1000;
    const swing = Math.sin((t - 68.4) * 3.2) * 0.55;
    ctx.save(); ctx.translate(cx - 310 * CS + 560 * CS, cy - 340 * CS + 60 * CS); ctx.rotate(swing); ctx.globalAlpha = ex;
    ctx.drawImage(IMG.wrecking_ball, -60 * CS, 0, 120 * CS, 420 * CS); ctx.restore();
    sprite(ctx, 'crane', cx, cy, 620 * CS, { alpha: ex, ax: 0.5, ay: 0.5 });
  }
}

function sceneAlley(ctx, c, t) {               // 30.6–36 and 46.2–51: inside the maze
  const seg = (t > 30.4 && t < 36.1) ? [30.4, 36.1] : (t > 46.0 && t < 51.1) ? [46.0, 51.1] : null;
  if (!seg) return;
  const k = clamp((t - seg[0]) / 0.35) * clamp((seg[1] - t) / 0.35);
  const im = IMG.alley_interior; if (!im) return;
  ctx.save(); ctx.globalAlpha = k;
  const sc = H / 1500 * 1.02, w = 900 * sc, x0 = (W - w) / 2, zoom = 1 + (t - seg[0]) * 0.015;
  ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(im, x0, -10, w, 1500 * sc);
  // falling drips
  const drops = [[180, 266], [420, 266], [720, 266], [300, 386], [560, 386], [140, 526], [780, 526], [480, 651]];
  drops.forEach(([dx, dy], i) => {
    const per = 1.1 + (i % 3) * 0.35, ph = ((t + i * 0.37) % per) / per;
    const X = x0 + dx * sc, Y0 = dy * sc - 10, Y = Y0 + ph * ph * 1200;
    ctx.fillStyle = '#8FD6FF'; ctx.globalAlpha = k * (1 - ph * 0.4);
    ctx.beginPath(); ctx.ellipse(X, Y, 7, 13, 0, 0, 7); ctx.fill();
  });
  ctx.globalAlpha = k;
  if (seg[0] < 40) {
    sprite(ctx, 'umbrella_person', 790, 1880, 360, { ay: 1, k: pop(t - 31.4), rot: wob(t, 0.6, 2) });
    sprite(ctx, 'umbrella_person', 300, 1800, 270, { ay: 1, k: pop(t - 32.2), flip: true });
  } else {
    [[46.3, 220, 520], [46.9, 860, 640], [47.5, 330, 900]].forEach(([t0, x, y]) => sprite(ctx, 'dentist_sign', x, y + wob(t, 0.8, 6), 230, { k: pop(t - t0) }));
    if (t > 48.4) { dim(ctx, 0.45 * clamp((t - 48.4) / 0.4)); sprite(ctx, 'gang_silhouettes', 560, 1000, 620, { k: pop(t - 48.6), ay: 0.5 }); }
  }
  ctx.restore();
}

function sceneLife(ctx, c, t) {                // 51–65: movie bars, families, the 1987 deal
  if (t < 51.0 || t > 65.4) return;
  const bars = win(t, 51.2, 54.2, 0.5, 0.4);
  if (bars > 0) { ctx.save(); ctx.fillStyle = '#000'; const bh = 230 * clamp(bars); ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    ctx.fillStyle = `rgba(30,30,30,${0.35 * clamp(bars)})`; ctx.fillRect(0, bh, W, H - 2 * bh); ctx.restore(); }
  const kf = win(t, 54.2, 59.2);
  if (kf > 0) { ctx.save(); const g = ctx.createRadialGradient(540, 1060, 50, 540, 1060, 520); g.addColorStop(0, `rgba(255,214,140,${0.45 * clamp(kf)})`); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); sprite(ctx, 'family', 540, 1060, 560, { k: kf }); }
  const kd = win(t, 59.3, 65.2);
  dim(ctx, 0.35 * clamp(kd));
  sprite(ctx, 'britain_deal', 300, 560, 470, { k: kd });
  sprite(ctx, 'china_deal', 780, 560, 470, { k: win(t, 59.6, 65.2) });
  sprite(ctx, 'agreement_1987', 540, 960, 300, { k: win(t, 60.4, 65.2), rot: wob(t, 0.7, 3) });
}

const CAPTIONS = [
  [0.4, 3.0, 'This tiny block'], [3.1, 5.6, 'Neither wanted it'], [5.7, 8.0, 'Wildest city on Earth'],
  [9.6, 12.5, 'Britain leased the land'], [12.6, 15.6, '…except this fort'], [15.7, 18.2, 'A legal loophole'],
  [18.3, 19.2, 'No taxes.'], [19.3, 20.2, 'No building codes.'], [20.3, 21.2, 'No police.'],
  [21.4, 24.0, 'So people built…'], [24.1, 26.0, '…and never stopped'], [31.0, 33.4, 'No sunlight below'],
  [33.5, 36.0, 'Umbrellas… indoors'], [39.6, 42.0, 'Four football fields'], [42.2, 45.8, 'Planes skimmed the roofs'],
  [46.2, 48.4, 'Unlicensed dentists'], [48.5, 51.0, 'Gangs ran it'], [51.3, 54.1, 'Like a dystopian movie'],
  [54.3, 59.1, 'Real families lived here'], [59.4, 61.4, 'Until 1987'], [61.5, 65.0, 'Gone too far'],
  [65.4, 68.5, 'Residents compensated'], [68.6, 71.6, 'The maze, cleared'], [71.7, 77.0, 'Torn down'],
  [77.6, 81.0, 'Now, a quiet park'], [81.2, 85.0, 'Almost nothing left'],
];
const KINETIC = [[8.6, 12.4, '1898'], [26.0, 31.0, '300 Towers'], [72.4, 77.0, '1994']];

function drawText(ctx, t) {
  for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .26, .18); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 960 }); }
  for (const [t0, t1, txt] of KINETIC) styledText(ctx, txt, W / 2, 300, 150, { k: win(t, t0, t1, .4, .25), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  const kp = win(t, 36.4, 41.6, .4, .25);   // 35,000 People counts up
  if (kp > 0) { const n = Math.round(35000 * easeOut((t - 36.4) / 1.6) / 100) * 100;
    styledText(ctx, n.toLocaleString('en-US'), W / 2, 270, 150, { k: kp, fill: C.yellow, stroke: C.goldDark, rot: -3 });
    styledText(ctx, 'PEOPLE', W / 2, 400, 80, { k: kp, fill: C.white, stroke: C.goldDark, rot: -3 }); }
  const kff = win(t, 39.6, 42.0);           // size comparison: four football fields
  if (kff > 0) sprite(ctx, 'football_fields', 540, 1600, 560, { k: kff });
}

function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

const SHAKES = [70.0, 71.3];
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = camAt(t);
  for (const s of SHAKES) if (t >= s && t < s + 0.3) { const a = 14 * (1 - (t - s) / 0.3), r = rnd(Math.floor(t * 60)); c.sx += (r() - .5) * 2 * a; c.sy += (r() - .5) * 2 * a; }
  drawMap(ctx, c);
  vignette(ctx);
  sceneIntro(ctx, c, t); scene1898(ctx, c, t); sceneCity(ctx, c, t); sceneAlley(ctx, c, t); sceneLife(ctx, c, t);
  // the green park square stays on the map at the very end
  if (t > 83.4) {
    const [px, py] = P(c, ...KWC), k = pop(t - 83.4);
    sprite(ctx, 'pin', px, py, 90, { ay: 0.97, k });
    styledText(ctx, 'Kowloon Walled City Park', px, py + 60, 40, { k: pop(t - 83.7), stroke: 'rgba(0,0,0,0.35)' });
  }
  drawText(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ------------------------------------------------------------------ player (preview) / render hooks
window.renderAt = renderAt;
window.READY = false;
loadAssets().then(() => {
  window.READY = true;
  const params = new URLSearchParams(location.search);
  if (params.has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  ctl.style.display = 'flex';
  let playing = false, t = 0, last = 0;
  const audio = document.getElementById('aud');
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now();
    if (audio && audio.src) { audio.currentTime = t; playing ? audio.play() : audio.pause(); } };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; if (audio && audio.src) audio.currentTime = t; draw(); };
  const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t -= DURATION; last = now; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
