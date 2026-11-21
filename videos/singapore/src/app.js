/* Singapore: the country kicked out of its own federation — Mapheld 9:16 explainer. HTML5 Canvas, deterministic.
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
  asia: [108.0, 8.0, 9.5],
  sea: [107.0, 2.0, 62],
  south: [102.9, 2.4, 190],
  strait: [103.82, 1.42, 1500],
  island: [103.83, 1.33, 1150],
};
const KEYS = [  // [t, view, zoomMul]
  [0, 'asia', 1.6], [4.5, 'sea', 1], [12.0, 'sea', 1.03], [27.0, 'sea', 1.06], [29.0, 'south', 1], [39.0, 'south', 1.05],
  [41.0, 'strait', 1], [55.5, 'strait', 1.06], [62.0, 'strait', 1.06], [63.4, 'island', 1], [70.0, 'island', 1.05], [79.4, 'island', 1.12],
  [81.4, 'asia', 1], [85, 'asia', 1.05],
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
  for (const key of ['asia', 'sea', 'near']) {
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
  for (const [iso, rs] of Object.entries(GEO.countries)) PATHS['c_' + iso] = rs.map(r => {
    const p = new Path2D(); for (let i = 0; i < r.length; i += 2) { const x = r[i], y = -mercY(r[i + 1]); i ? p.lineTo(x, y) : p.moveTo(x, y); } p.closePath(); return p; });
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
  const set = c.z < 22 ? PATHS.asia : (c.z < 700 ? PATHS.sea : PATHS.near);
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

// ------------------------------------------------------------------ scenes (storyboard time 0–85 s)
const PL = GEO.places;
const STRAIT = [[103.58, 1.44], [103.66, 1.455], [103.72, 1.46], [103.78, 1.455], [103.84, 1.448], [103.9, 1.44], [103.97, 1.425], [104.05, 1.40]];
const SHIP_IN = [[[97.5, 6.0], [100.5, 3.6], [103.2, 1.6]], [[111.0, 6.5], [107.0, 3.5], [104.3, 1.6]], [[106.5, -4.5], [105.0, -1.0], [104.0, 1.0]]];

function countryPath(c, iso, dx = 0, dy = 0) {
  const m = new DOMMatrix().translate(dx, dy).multiply(camMatrix(c));
  const p = new Path2D(); for (const q of PATHS['c_' + iso]) p.addPath(q, m); return p;
}
function tint(ctx, c, iso, color, a, glow, dx = 0, dy = 0) {
  if (a <= 0 || !PATHS['c_' + iso]) return; const p = countryPath(c, iso, dx, dy);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill(p, 'evenodd');
  if (glow) { ctx.globalAlpha = Math.min(1, a * 2); ctx.strokeStyle = glow; ctx.lineWidth = 4; ctx.shadowColor = glow; ctx.shadowBlur = 16; ctx.stroke(p); }
  ctx.restore();
}
function chip(ctx, text, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot || 0) * Math.PI / 180); ctx.scale(k, k); setFont(ctx, 'Montserrat', o.size || 30);
  const w = ctx.measureText(text).width + 46, h = (o.size || 30) * 1.75;
  ctx.fillStyle = o.bg || 'rgba(10,24,32,0.92)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2); ctx.restore();
}
function stamp(ctx, text, x, y, size, color, k, rot = -12) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180); const sc = k < 1 ? 1 + (1 - k) * 1.5 : 1; ctx.scale(sc, sc);
  ctx.globalAlpha = clamp(k * 1.5); setFont(ctx, 'Montserrat', size); const w = ctx.measureText(text).width + size * 0.8, h = size * 1.35;
  ctx.fillStyle = 'rgba(20,8,10,0.55)'; ctx.strokeStyle = color; ctx.lineWidth = size * 0.1; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, size * 0.18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, size * 0.04); ctx.restore();
}
function qpoint(a, b, ctrl, u) { return [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * ctrl[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * ctrl[1] + u * u * b[1]]; }
function sgShift(t) { return t < 52.4 ? 0 : 26 * easeOut((t - 52.4) / 0.8); }

function sceneHook(ctx, c, t) {           // 0–12
  if (t > 12.5) return;
  const [sx, sy] = P(c, ...PL.singapore);
  [['WAR', 1.6], ['REVOLUTION', 2.4], ['TREATY', 3.2]].forEach(([lab, t0], i) =>
    chip(ctx, '✓ ' + lab, 230 + i * 310, 300, win(t, t0, 6.4), { size: 34, fill: '#8CE99A', stroke: '#8CE99A' }));
  if (t > 5.4) {
    const u = ((t - 5.4) * 0.8) % 1;
    ctx.save(); ctx.strokeStyle = `rgba(239,51,64,${(1 - u) * 0.9})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sx, sy, 20 + u * 160, 0, 7); ctx.stroke(); ctx.restore();
  }
  tint(ctx, c, 'SGP', '#EF3340', clamp((t - 5.4) / 0.5), '#EF3340');
  chip(ctx, 'SINGAPORE', sx, sy + 90, win(t, 5.8, 12.2), { size: 34, fill: '#FF8A92', stroke: '#EF3340' });
  stamp(ctx, 'KICKED OUT', W / 2, 360, 96, '#FF4D57', win(t, 8.2, 12.2, 0.25), -8);
}

function sceneMerger(ctx, c, t) {         // 12–28
  if (t < 12 || t > 29) return;
  const uk = win(t, 12.2, 15.2), ex = popOut(28.6 - t);
  for (const iso of ['MYS', 'SGP']) tint(ctx, c, iso, '#C8102E', 0.28 * clamp(uk));
  chip(ctx, '~150 YEARS OF BRITISH RULE', W / 2, 1070, uk, { size: 28 });
  const kf = clamp((t - 15.0) / 0.8) * ex;
  tint(ctx, c, 'MYS', '#4A7BD0', 0.5 * kf, '#7FB0FF'); tint(ctx, c, 'SGP', '#4A7BD0', 0.5 * kf, '#7FB0FF');
  styledText(ctx, '1963', W / 2, 300, 150, { k: win(t, 14.6, 19.4, .4), font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark });
  chip(ctx, 'FEDERATION OF MALAYSIA', W / 2, 440, win(t, 15.4, 28.4), { size: 36, fill: '#BFD8FF', stroke: '#7FB0FF' });
  // ships flowing into Singapore's port
  const [sx, sy] = P(c, ...PL.singapore);
  if (t > 19.6) SHIP_IN.forEach((r, j) => {
    const sp = r.map(p => P(c, ...p));
    for (let i = 0; i < 2; i++) {
      const u = ((t - 19.6) * 0.12 + i * 0.5 + j * 0.17) % 1, [x, y] = pointAlong(sp, u), [x2, y2] = pointAlong(sp, clamp(u + 0.01));
      sprite(ctx, 'cargo_ship', x, y, 120, { rot: Math.atan2(y2 - y, x2 - x) * 180 / Math.PI, k: pop(t - 19.6 - j * 0.2) * ex });
    }
    ctx.save(); ctx.globalAlpha = 0.6 * ex; ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 30; ctx.stroke(partial(sp, clamp((t - 19.6) / 0.8))); ctx.restore();
  });
  chip(ctx, "ONE OF ASIA'S BUSIEST PORTS", sx, sy + 120, win(t, 20.4, 24.8), { size: 26, fill: C.cyan, stroke: C.cyan });
  // resources on the mainland
  [['icon_rubber', 101.6, 4.6, 24.6], ['icon_tin', 101.0, 3.0, 25.2], ['icon_timber', 113.5, 2.2, 25.8]].forEach(([n, lon, lat, t0]) =>
    sprite(ctx, n, ...P(c, lon, lat), 120, { k: win(t, t0, 28.4) }));
}

function sceneTension(ctx, c, t) {        // 28–40
  if (t < 28.5 || t > 41) return;
  const ex = popOut(40.6 - t);
  tint(ctx, c, 'MYS', '#4A7BD0', 0.42 * ex); tint(ctx, c, 'SGP', '#4A7BD0', 0.42 * ex);
  const [kx, ky] = P(c, ...PL.kl), [sx, sy] = P(c, ...PL.singapore);
  sprite(ctx, 'parliament', kx, ky - 10, 220, { k: win(t, 29.0, 40.6), ay: 0.92 });
  chip(ctx, 'KUALA LUMPUR', kx, ky + 50, win(t, 29.2, 40.6), { size: 24 });
  const LX = 270, RX = 810, FY = 1200;
  sprite(ctx, 'malaysia_leader', LX, FY, 250, { k: win(t, 30.0, 40.6), ay: 1 });
  sprite(ctx, 'singapore_leader', RX, FY, 250, { k: win(t, 30.4, 40.6), ay: 1 });
  chip(ctx, 'MALAYSIA', LX, FY + 30, win(t, 30.0, 40.6), { size: 24, fill: '#BFD8FF', stroke: '#7FB0FF' });
  chip(ctx, 'SINGAPORE', RX, FY + 30, win(t, 30.4, 40.6), { size: 24, fill: '#FF8A92', stroke: '#EF3340' });
  if (t > 31.0) {      // crackling tension line between the two
    const a = [LX + 70, FY - 210], b = [RX - 70, FY - 210], r = rnd(Math.floor(t * 14));
    ctx.save(); ctx.globalAlpha = ex; ctx.strokeStyle = '#FF4D57'; ctx.lineWidth = 6; ctx.shadowColor = '#FF4D57'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(...a); for (let i = 1; i < 9; i++) { const f = i / 9; ctx.lineTo(lerp(a[0], b[0], f) + (r() - .5) * 40, lerp(a[1], b[1], f) + (r() - .5) * 40); } ctx.lineTo(...b); ctx.stroke(); ctx.restore();
  }
  [['ECONOMY', 34.6], ['REPRESENTATION', 35.8], ['WHO HOLDS POWER', 37.2]].forEach(([lab, t0], i) => chip(ctx, lab, W / 2, 300 + i * 95, win(t, t0, 40.4), { size: 34, stroke: '#FF4D57' }));
}

function sceneSplit(ctx, c, t) {          // 40–56
  if (t < 40.5 || t > 63.6) return;
  const [sx, sy] = P(c, ...PL.singapore);
  // riots: smoke and fire in the streets
  if (t < 47.5) for (let i = 0; i < 6; i++) {
    const px = sx - 150 + (i % 3) * 150, py = sy - 30 + Math.floor(i / 3) * 70;
    puff(ctx, px, py - 40, 70, ((t - 41.0) * 0.55 + i / 6) % 1, i + 2);
    if (i % 2 === 0) { ctx.save(); ctx.globalAlpha = 0.85 * popOut(47.4 - t); ctx.fillStyle = '#FF7A00';
      ctx.beginPath(); ctx.moveTo(px - 18, py + 30); ctx.quadraticCurveTo(px, py - 30 - Math.sin(t * 15 + i) * 10, px + 18, py + 30); ctx.fill(); ctx.restore(); }
  }
  chip(ctx, 'RIOTS — 1964', W / 2, 300, win(t, 41.2, 45.6), { size: 40, stroke: '#FF7A00', fill: '#FFB36B' });
  // the crack along the Johor Strait
  const kc = clamp((t - 45.0) / 1.6);
  if (kc > 0 && t < 56) {
    const sp = STRAIT.map(p => P(c, ...p)), r = rnd(7);
    const jag = sp.map((p, i) => [p[0], p[1] + (i % 2 ? 10 : -10)]);
    ctx.save(); ctx.strokeStyle = '#FF4D57'; ctx.lineWidth = 8; ctx.shadowColor = '#FF4D57'; ctx.shadowBlur = 18; ctx.globalAlpha = popOut(55.6 - t);
    ctx.stroke(partial(jag, kc)); ctx.restore();
  }
  chip(ctx, 'JOHOR STRAIT', W / 2 - 220, P(c, 103.7, 1.47)[1] - 90, win(t, 45.4, 49.0), { size: 26 });
  // parliament gavel severs the connection
  const kg = win(t, 48.6, 55.6);
  if (kg > 0) {
    const swing = t < 52.2 ? -0.5 + Math.sin(t * 3) * 0.08 : (t < 52.45 ? lerp(-0.5, 0.35, (t - 52.2) / 0.25) : 0.35);
    ctx.save(); ctx.translate(W / 2 + 120, P(c, 103.8, 1.46)[1] - 140); ctx.rotate(swing); ctx.scale(kg, kg);
    const im = IMG.gavel; if (im) ctx.drawImage(im, -330, -225, 495, 340); ctx.restore();
  }
  stamp(ctx, 'UNANIMOUS VOTE', W / 2, 330, 72, '#FF4D57', win(t, 50.4, 56.0, 0.25), -6);
  if (t > 52.3 && t < 53.2) { ctx.save(); ctx.globalAlpha = 0.5 * (1 - (t - 52.3) / 0.9); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  styledText(ctx, '9 AUGUST 1965', W / 2, 460, 70, { k: win(t, 53.0, 56.0), font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark });
}

function drawSingapore(ctx, c, t) {        // Singapore drifts away after the vote and takes its own colour
  if (t < 52.3) return;
  const d = sgShift(t);
  ctx.save(); ctx.fillStyle = C.ocean; ctx.fill(countryPath(c, 'SGP'), 'evenodd'); ctx.restore();   // erase original spot
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(countryPath(c, 'SGP', 6, d + 8), 'evenodd');
  ctx.fillStyle = C.land; ctx.fill(countryPath(c, 'SGP', 0, d), 'evenodd'); ctx.restore();
  tint(ctx, c, 'SGP', '#EF3340', 0.75, '#FF8A92', 0, d);
}

function sceneAlone(ctx, c, t) {          // 56–70: Lee in tears, then the island alone
  if (t < 55.8 || t > 71.5) return;
  const ktv = win(t, 56.0, 62.6);
  if (ktv > 0) {
    ctx.save(); ctx.globalAlpha = 0.6 * clamp(ktv); ctx.fillStyle = '#071C2A'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.translate(W / 2, 820); ctx.scale(ktv, ktv);
    ctx.fillStyle = '#3A2E26'; ctx.strokeStyle = C.ink; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(-330, -270, 660, 520, 40); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9BB4BC'; ctx.beginPath(); ctx.roundRect(-280, -225, 470, 430, 30); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 2; i++) { ctx.fillStyle = '#C9A227'; ctx.beginPath(); ctx.arc(250, -120 + i * 110, 26, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-120, -270); ctx.lineTo(-200, -380); ctx.moveTo(60, -270); ctx.lineTo(140, -380); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.roundRect(W / 2 - 280 * ktv, 820 - 225 * ktv, 470 * ktv, 430 * ktv, 30); ctx.clip();
    sprite(ctx, 'lee_tears', W / 2 - 45, 1060 + Math.sin(t * 5) * 3, 360, { k: ktv, ay: 1 });
    ctx.globalAlpha = 0.12; for (let y = 600; y < 1100; y += 8) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, W, 3); } ctx.restore();
    chip(ctx, 'LEE KUAN YEW', W / 2 - 45, 1130, ktv, { size: 30 });
    chip(ctx, 'TELEVISED PRESS CONFERENCE', W / 2, 400, win(t, 56.6, 62.6), { size: 26 });
  }
  // the island alone: neighbours fade, warning badges
  const ka = clamp((t - 63.0) / 0.8) * popOut(71.2 - t, 0.6);
  if (ka > 0) {
    const all = new Path2D(); for (const p of PATHS.near) all.addPath(p, camMatrix(c));
    ctx.save(); ctx.globalAlpha = 0.85 * ka; ctx.fillStyle = C.ocean; ctx.fill(all, 'evenodd'); ctx.restore();
    drawSingapore(ctx, c, t);
    [['warn_water', 64.4], ['warn_resources', 65.8], ['warn_army', 67.2]].forEach(([n, t0], i) => sprite(ctx, n, W / 2, 330 + i * 140, 600, { k: win(t, t0, 71.0) }));
  }
}

function sceneRise(ctx, c, t) {           // 70–85: doubt -> skyline, cranes, trade arcs
  if (t < 70) return;
  const [sx, sy] = P(c, ...PL.singapore);
  chip(ctx, 'MANY DOUBTED IT COULD SURVIVE', W / 2, 360, win(t, 70.2, 73.6), { size: 30, stroke: '#FF4D57' });
  const ks = clamp((t - 73.4) / 1.6) * popOut(79.6 - t, 0.4);
  if (ks > 0) {
    const im = IMG.skyline; if (im) { ctx.save(); const w = 620, h = w * im.height / im.width;
      ctx.beginPath(); ctx.rect(sx - w / 2, sy - h - 10, w, h + 20); ctx.clip(); ctx.drawImage(im, sx - w / 2, sy - h + (1 - easeOut(ks)) * h, w, h); ctx.restore(); }
    sprite(ctx, 'crane', sx + 340, sy + 40, 230, { k: pop(t - 74.4) * popOut(79.6 - t), ay: 1 });
    sprite(ctx, 'crane', sx - 340, sy + 40, 200, { k: pop(t - 74.8) * popOut(79.6 - t), ay: 1, flip: true });
  }
  // trade arcs across Asia
  if (t > 79.6) {
    tint(ctx, c, 'SGP', '#EF3340', 1, '#FF8A92');
    const a = [sx, sy];
    Object.entries(GEO.hubs).forEach(([name, ll], i) => {
      const b = P(c, ...ll), ctrl = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 160], k = clamp((t - 80.4 - i * 0.25) / 1.0);
      if (k <= 0) return;
      ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.shadowColor = C.gold; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(...a);
      for (let j = 1; j <= 24; j++) ctx.lineTo(...qpoint(a, b, ctrl, j / 24 * k)); ctx.stroke(); ctx.restore();
      if (k >= 1) { ctx.save(); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(b[0], b[1], 8, 0, 7); ctx.fill(); ctx.restore(); styledText(ctx, name, b[0], b[1] - 28, 24, { shadow: 2 }); }
    });
    const r = ((t - 79.6) * 0.8) % 1; ctx.save(); ctx.strokeStyle = `rgba(244,208,63,${1 - r})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(sx, sy, 10 + r * 70, 0, 7); ctx.stroke(); ctx.restore();
    styledText(ctx, 'ONE OF THE RICHEST\nHUBS ON EARTH', W / 2, 330, 84, { k: win(t, 81.2, 85.5), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  }
}

const CAPTIONS = [
  [0.3, 3.2, 'Wars, revolutions, treaties'], [3.3, 5.6, 'That’s how nations are born'], [5.7, 8.2, 'Except Singapore'], [8.3, 12.0, 'Kicked out, against its will'],
  [12.2, 15.2, 'After British rule'], [15.3, 19.4, 'The Federation of Malaysia'], [19.6, 24.4, 'A world-class port'], [24.5, 28.2, '+ land and resources'],
  [28.6, 32.8, 'Behind closed doors…'], [32.9, 36.4, 'Tensions boiled over'], [36.5, 40.4, 'Who holds the power?'],
  [40.8, 45.2, 'Riots in the streets'], [45.3, 48.6, 'Trust collapsed'], [48.7, 52.2, 'Parliament votes'], [52.3, 56.0, 'Singapore: expelled'],
  [56.2, 60.0, 'Hours later…'], [60.1, 63.2, 'Lee Kuan Yew, in tears'], [63.4, 70.0, 'Alone. Overnight.'],
  [70.2, 73.4, 'Many expected collapse'], [73.5, 79.0, 'Survival by strategy and trade'], [79.2, 85.0, 'The unwanted island won'],
];
function drawText(ctx, t) {
  for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .26, .18); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 960 }); }
}
function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
const SHAKES = [52.3];
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = camAt(t);
  for (const s of SHAKES) if (t >= s && t < s + 0.35) { const a = 18 * (1 - (t - s) / 0.35), r = rnd(Math.floor(t * 60)); c.sx += (r() - .5) * 2 * a; c.sy += (r() - .5) * 2 * a; }
  drawMap(ctx, c);
  if (c.z < 700) { ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 1.6; ctx.setLineDash([7, 6]);
    for (const iso of Object.keys(GEO.countries)) if (PATHS['c_' + iso]) ctx.stroke(countryPath(c, iso)); ctx.restore(); }
  if (t < 63 || t > 71.5) drawSingapore(ctx, c, t);
  vignette(ctx);
  sceneHook(ctx, c, t); sceneMerger(ctx, c, t); sceneTension(ctx, c, t); sceneSplit(ctx, c, t); sceneAlone(ctx, c, t); sceneRise(ctx, c, t);
  drawText(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}

window.renderAt = renderAt;
window.READY = false;
loadAssets().then(() => {
  window.READY = true;
  if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  ctl.style.display = 'flex';
  let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; draw(); };
  const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t -= DURATION; last = now; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
