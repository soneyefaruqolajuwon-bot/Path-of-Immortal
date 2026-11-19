/* Point Roberts — Map Warden-style 9:16 explainer. HTML5 Canvas, deterministic.
 * renderAt(t) draws the frame at storyboard time t (seconds, 0–93, as in the script).
 * Assets: window.ASSETS {name: dataURI}, geometry: GEO (geo_data.js).
 */
'use strict';
const W = 1080, H = 1920, DURATION = 93;
const C = {
  ocean: '#1E4D5C', land: '#8A855C', coast: '#5E5A3B', halo: '#2C6A78', ink: '#141416',
  gold: '#F4D03F', goldDark: '#3A2A08', yellow: '#FFD43B', cyan: '#25E3FF', white: '#FFFFFF',
  usRed: '#B22234', usBlue: '#3C3B6E',
};
const CAPTION = { size: 64, y: 1320, font: 'Montserrat', shadow: 4 };   // spec said 48px; 64 reads better on phones
const BORDER_LAT = GEO.borderLat;

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
  prClose: [-123.06, 48.989, 9000],
  prGate: [-123.064, 48.999, 11000],
  pnw: [-122.93, 49.0, 2300],
  route: [-122.905, 49.03, 1950],
  na: [-104.0, 41.5, 24],
  ferry: [-122.8, 48.875, 1250],
};
const KEYS = [  // [t, view, zoomMul, rot, tilt]
  [0, 'prClose', 1], [9.0, 'prClose', 1.04], [10.6, 'pnw', 1], [14.0, 'pnw', 1.08],
  [15.6, 'na', 1], [25.0, 'na', 1.06], [27.3, 'pnw', 1], [29.0, 'prClose', 0.82], [36.0, 'prClose', 0.88],
  [37.2, 'route', 1], [51.0, 'route', 1.04], [52.2, 'prClose', 0.95], [61.0, 'prClose', 1.0, -4, 0.86],
  [62.4, 'pnw', 1.15], [67.0, 'pnw', 1.2], [68.4, 'prGate', 1], [75.0, 'prGate', 1.05],
  [76.0, 'prClose', 0.9], [79.6, 'prClose', 0.95], [81.0, 'ferry', 1], [86.0, 'ferry', 1.04],
  [86.9, 'prGate', 1], [88.0, 'prGate', 1.02], [89.6, 'prClose', 1], [93.0, 'prClose', 1],
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
  for (const key of ['na', 'pnw', 'pr']) {
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
  return Promise.all([...jobs, document.fonts.ready]);
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
  const set = c.z >= 500 ? PATHS.pnw : PATHS.na;
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

function prPath(c) {
  const p = new Path2D(); p.addPath(PATHS.pr[0], camMatrix(c)); return p;
}
function prBBox(c) {
  const r = GEO.pr[0]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < r.length; i += 2) { const [x, y] = P(c, r[i], r[i + 1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}
function usFlag(ctx, x, y, w, h, stars = true) {
  const sh = h / 13;
  for (let i = 0; i < 13; i++) { ctx.fillStyle = i % 2 ? '#fff' : C.usRed; ctx.fillRect(x, y + i * sh, w, sh + 0.6); }
  const cw = w * 0.4, ch = sh * 7; ctx.fillStyle = C.usBlue; ctx.fillRect(x, y, cw, ch);
  if (stars) { ctx.fillStyle = '#fff'; for (let r = 0; r < 9; r++) for (let i = 0; i < (r % 2 ? 5 : 6); i++) {
    ctx.beginPath(); ctx.arc(x + cw * ((i + (r % 2 ? 1 : 0.5)) / 6), y + ch * (r + 0.75) / 9.5, Math.max(1, Math.min(cw, ch) * 0.035), 0, 7); ctx.fill(); } }
}
function drawPRFlag(ctx, c, k, alpha = 0.92, wipeFrom = null) {
  if (k <= 0) return;
  const [x0, y0, x1, y1] = prBBox(c);
  ctx.save(); ctx.clip(prPath(c));
  if (wipeFrom) { ctx.beginPath(); ctx.arc(wipeFrom[0], wipeFrom[1], Math.hypot(x1 - x0, y1 - y0) * 1.2 * easeOut(k), 0, 7); ctx.clip(); }
  ctx.globalAlpha = alpha; usFlag(ctx, x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, c.z / 2500); ctx.stroke(prPath(c)); ctx.restore();
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

// ------------------------------------------------------------------ scenes (storyboard time)
const GATE1 = [-123.0636, BORDER_LAT];   // Point Roberts crossing
const GATE2 = [-122.7565, BORDER_LAT];   // Peace Arch / Blaine crossing
const ROUTE = [[-123.055, 48.986], GATE1, [-123.063, 49.03], [-123.03, 49.065], [-122.93, 49.09], [-122.83, 49.07],
               [-122.775, 49.035], GATE2, [-122.752, 48.99]];
const BELLINGHAM = [-122.49, 48.75];
const FERRY_ROUTE = [BELLINGHAM, [-122.62, 48.76], [-122.8, 48.82], [-122.95, 48.9], [-123.03, 48.955], [-123.045, 48.973]];

function residentHome(ctx, c, t, k) {
  // resident stands in the middle of Point Roberts
  const [x, y] = P(c, -123.06, 48.981);
  const bob = Math.abs(Math.sin(t * LOOPF(60))) * 12;
  sprite(ctx, 'resident_stressed', x, y + 150 - bob, 360, { k, ay: 1, sq: Math.sin(t * LOOPF(60) * 2) * 0.02 });
}

function sceneColdOpen(ctx, c, t) {   // 0–9 and the loop return 89.6–93
  const inLoopEnd = t >= 89.4;
  if (t < 9.4 || inLoopEnd) {
    const k = inLoopEnd ? pop(t - 89.6) : popOut(9.4 - t);
    residentHome(ctx, c, t, k);
  }
  if (t > 9.4) return;
  // passport pops beside the resident
  const kp = win(t, 0.8, 3.1);
  sprite(ctx, 'passport', 820, 760, 150, { k: kp, rot: wob(t, 1.6, 8) });
  styledText(ctx, '?!', 870, 610, 110, { k: kp, fill: C.yellow, stroke: C.ink });
  // footprints stepping over the border
  const [, by] = P(c, -123.06, BORDER_LAT);
  const kf = win(t, 3.6, 6.0);
  for (let i = 0; i < 2; i++) {
    const fx = 470 + i * 110, fy = by + 40 - i * 80;
    ctx.save(); ctx.globalAlpha = clamp(kf); ctx.fillStyle = '#fff'; ctx.translate(fx, fy); ctx.rotate(-0.2);
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 36, 0, 0, 7); ctx.fill();
    for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(-14 + j * 9, -44 + Math.abs(j - 1.5) * 4, 6, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  styledText(ctx, '2 FT', 690, by - 70, 64, { k: win(t, 4.0, 6.0), fill: C.yellow, stroke: C.ink, rot: -6 });
  // Canada (north of the border)
  const kc = pop(t - 3.0) * popOut(9.3 - t);
  sprite(ctx, 'canada_cheerful', 790, by - 300 + wob(t, 1.4, 8), 520, { k: kc, sq: wob(t, 3, 0.02) });
  // USA with ruler
  const ku = pop(t - 6.0) * popOut(9.3 - t);
  sprite(ctx, t < 8.4 ? 'usa_confident' : 'usa_confused', 290, by - 300 + wob(t, 1.4, 8, 1), 520, { k: ku });
  if (t > 7.9 && t < 9.3) {   // ruler slam along the line
    const u = easeIn((t - 7.9) / 0.25);
    sprite(ctx, 'ruler', W / 2, lerp(by - 500, by, u), 1150, { k: 1, rot: lerp(-14, 0, u) });
    puff(ctx, 120, by, 120, (t - 8.15) / 1.0, 4); puff(ctx, 960, by, 120, (t - 8.15) / 1.0, 6);
  }
}

function sceneTrapped(ctx, c, t) {    // 9–14
  if (t < 9.6 || t > 14.4) return;
  const k = win(t, 10.2, 14.4);
  drawPRFlag(ctx, c, clamp((t - 10.0) / 0.6), 0.6 + 0.3 * Math.sin(t * 6));
  const [x, y] = P(c, -123.06, 48.975);
  styledText(ctx, 'POINT ROBERTS, USA', x + 60, y + 90, 46, { k, fill: C.yellow, stroke: C.ink });
  mapLabel(ctx, c, -122.86, 49.2, 'CANADA', 64, win(t, 10.4, 14.4));
  mapLabel(ctx, c, -122.62, 48.86, 'USA', 64, win(t, 10.6, 14.4));
  // red "cut off" ring
  const kr = win(t, 11.0, 14.4);
  if (kr) { ctx.save(); ctx.strokeStyle = '#E63946'; ctx.lineWidth = 8; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.arc(x, y - 20, 110 * kr, 0, 7); ctx.stroke(); ctx.restore(); }
}

function scene1846(ctx, c, t) {       // 14–25
  if (t < 14.2 || t > 25.5) return;
  const ex = popOut(25.4 - t);
  // Britain (north) and USA (south) flag characters
  const [bx, by] = P(c, -110, 56), [ux, uy] = P(c, -100, 40);
  sprite(ctx, 'britain_surprised', bx, by, 440, { k: win(t, 15.0, 19.4), rot: wob(t, .8, 3) });
  sprite(ctx, 'usa_confident', ux, uy, 440, { k: win(t, 15.3, 19.4), rot: wob(t, .8, 3, 1) });
  // giant ruler slams onto the 49th parallel
  const [lx0, ly] = P(c, -123.3, 49), [lx1] = P(c, -95.15, 49);
  if (t > 16.2 && t < 20.4) {
    const u = easeIn((t - 16.2) / 0.3), out = popOut(20.4 - t);
    sprite(ctx, 'ruler', (lx0 + lx1) / 2, lerp(ly - 700, ly - 4, u), (lx1 - lx0) * 1.15, { k: out, rot: lerp(-20, 0, u) });
    puff(ctx, lx0, ly, 140, (t - 16.5) / 1.1, 2); puff(ctx, lx1, ly, 140, (t - 16.5) / 1.1, 3);
  }
  // blindfolded diplomats with quills
  const kd = win(t, 19.4, 25.4);
  const scrib = t > 20 && t < 22 ? wob(t, 6, 6) : 0;
  sprite(ctx, 'diplomat_uk_blindfolded', 300, 1270, 330, { k: kd, ay: 1, rot: scrib });
  sprite(ctx, 'diplomat_us_blindfolded', 780, 1270, 330, { k: kd, ay: 1, rot: -scrib });
  styledText(ctx, '?', 300, 760 - wob(t, 2, 8), 110, { k: win(t, 22.4, 25.4), fill: C.yellow, stroke: C.ink });
  styledText(ctx, '?', 780, 760 - wob(t, 2, 8, 1), 110, { k: win(t, 22.6, 25.4), fill: C.yellow, stroke: C.ink });
  mapLabel(ctx, c, -97, 49.8, '49th PARALLEL', 38, win(t, 18.0, 25.4));
}

function sceneSlice(ctx, c, t) {      // 25–36
  if (t < 27.0 || t > 36.4) return;
  // knife flash along the border, then the tip fills with the US flag
  const [x0, by] = P(c, -123.12, BORDER_LAT), [x1] = P(c, -122.99, BORDER_LAT);
  if (t > 28.6 && t < 29.6) {
    const k = (t - 28.6) / 1.0;
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 16 * (1 - k) + 2; ctx.shadowColor = '#fff'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(W * clamp(k * 3), by); ctx.stroke(); ctx.restore();
  }
  const fill = clamp((t - 29.0) / 0.7);
  const ex = popOut(36.3 - t);
  if (fill > 0) {
    ctx.save(); const drop = Math.sin(clamp((t - 29.0) / 0.5) * Math.PI) * 18; ctx.translate(0, drop);
    drawPRFlag(ctx, c, fill * ex, 0.92, [W / 2, by]); ctx.restore();
  }
  // a car tries to drive in from the US mainland and bonks
  if (t > 32.6) {
    const u = clamp((t - 32.6) / 1.2);
    const [sx, sy] = P(c, -122.975, 48.945), [tx, ty] = P(c, -123.028, 48.977);
    const bonk = u >= 1 ? Math.sin((t - 33.8) * 20) * Math.exp(-(t - 33.8) * 4) * 14 : 0;
    sprite(ctx, 'icon_car', lerp(sx, tx, easeOut(u)) + bonk, lerp(sy, ty, easeOut(u)), 230, { k: ex });
    if (t > 33.8) { ctx.save(); ctx.globalAlpha = ex; ctx.strokeStyle = '#E63946'; ctx.lineWidth = 18; ctx.lineCap = 'round';
      const k = pop(t - 33.8); ctx.translate(tx - 120, ty - 120); ctx.scale(k, k);
      ctx.beginPath(); ctx.moveTo(-45, -45); ctx.lineTo(45, 45); ctx.moveTo(45, -45); ctx.lineTo(-45, 45); ctx.stroke(); ctx.restore(); }
  }
}

function sceneLife(ctx, c, t) {       // 36–51: rule of three + school bus through 4 checkpoints
  if (t < 36.6 || t > 51.4) return;
  const ex = popOut(51.3 - t);
  drawPRFlag(ctx, c, ex, 0.85);
  mapLabel(ctx, c, -123.07, 48.955, 'POINT ROBERTS', 34, ex);
  mapLabel(ctx, c, -122.76, 48.965, 'BLAINE, USA', 34, ex);
  mapLabel(ctx, c, -122.93, 49.055, 'CANADA', 50, ex);
  sprite(ctx, 'icon_no_hospital', 250, 1560, 250, { k: win(t, 37.4, 51.3) });
  sprite(ctx, 'icon_no_highschool', 540, 1560, 250, { k: win(t, 39.0, 51.3) });
  // route + gates
  const sp = ROUTE.map(p => P(c, p[0], p[1]));
  const kr = clamp((t - 40.2) / 0.8);
  if (kr > 0) { ctx.save(); ctx.globalAlpha = ex; geoLine(ctx, c, ROUTE, kr, C.cyan, 6, [16, 12], true); ctx.restore(); }
  const crossings = [42.0, 44.6, 46.6, 48.4];
  const gateOpen = (gi) => {   // gate 0 = Point Roberts, 1 = Blaine
    const ts = gi === 0 ? [crossings[0], crossings[3]] : [crossings[1], crossings[2]];
    let o = 0; for (const tc of ts) o = Math.max(o, clamp(1 - Math.abs(t - tc) / 0.45) * 1.4);
    return clamp(o);
  };
  [GATE1, GATE2].forEach((g, gi) => {
    const [gx, gy] = P(c, g[0], g[1]);
    const k = win(t, 40.4 + gi * 0.2, 51.3);
    gate(ctx, gx + 6, gy, 0.3, gateOpen(gi), k);
  });
  // bus there and back
  let u = null, dir = 1;
  if (t >= 41.2 && t < 45.6) u = clamp((t - 41.2) / 4.0);
  else if (t >= 45.9 && t < 49.2) { u = 1 - clamp((t - 45.9) / 3.0); dir = -1; }
  else if (t >= 45.6 && t < 45.9) u = 1;
  else if (t >= 49.2) u = 0;
  if (u !== null && t > 41.0) {
    const [bx, by, dx] = pointAlong(sp, easeIO(u) * 0.98 + 0.01);
    busSprite(ctx, bx, by - 30, 220, t, dx * dir < 0 && dir > 0 ? true : (dir < 0 ? dx > 0 : dx < 0), ex);
  }
  crossings.forEach((tc, i) => {
    const g = i === 0 || i === 3 ? GATE1 : GATE2; const [gx, gy] = P(c, g[0], g[1]);
    sprite(ctx, 'stamp', gx + (g === GATE1 ? 170 : -170), gy - 150, 260, { k: win(t, tc, tc + 0.9, 0.2, 0.2), rot: -8 });
  });
  const n = crossings.filter(tc => t >= tc).length;
  const kn = win(t, 41.3, 51.3);
  styledText(ctx, `${n} Checkpoint${n === 1 ? '' : 's'}`, W / 2, 300, 120, { k: kn * (1 + 0.15 * Math.max(0, 1 - (t - (crossings[n - 1] || 0)) * 4)), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  styledText(ctx, 'PER DAY', W / 2, 420, 70, { k: kn, fill: C.white, stroke: C.goldDark, rot: -3 });
}
function busSprite(ctx, x, y, w, t, flip, k) {
  const body = IMG.bus_body; if (!body || k <= 0) return;
  const h = w * body.height / body.width;
  ctx.save(); ctx.translate(x, y + Math.abs(Math.sin(t * 18)) * 3); ctx.scale(flip ? -k : k, k);
  for (const wx of [160, 590]) sprite(ctx, 'bus_wheel', -w / 2 + wx / 740 * w, -h / 2 + 222 / 240 * h, 100 / 740 * w * 1.0, { rot: t * 900 });
  ctx.drawImage(body, -w / 2, -h / 2, w, h); ctx.restore();
}
function gate(ctx, x, y, s, open, k) {
  if (k <= 0) return;
  const post = IMG.gate_post, arm = IMG.gate_arm; if (!post || !arm) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k * s, k * s);
  // pivot of the arm sits at (130, 110) of the post image; the post's base is at (65, 300)
  ctx.save(); ctx.translate(65, -190); ctx.rotate(-open * 80 * Math.PI / 180); ctx.drawImage(arm, -40, -60); ctx.restore();
  ctx.drawImage(post, -65 + 0, -300); ctx.restore();
}

function sceneWitness(ctx, c, t) {    // 51–61
  if (t < 51.2 || t > 61.5) return;
  const ex = popOut(61.3 - t);
  // spotlight
  const ks = clamp((t - 51.4) / 0.5) * ex;
  if (ks > 0) { ctx.save(); const g = ctx.createRadialGradient(540, 980, 140, 540, 980, 620);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.72 * ks})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  const slide = 1 - easeOut((t - 52.0) / 0.6);
  sprite(ctx, 'mobster_witness', 540 - slide * 700, 1180, 400, { k: t > 52 ? ex : 0, ay: 1 });
  sprite(ctx, 'witness_file', 820, 640, 300, { k: win(t, 54.4, 61.3), rot: wob(t, .8, 5) });
  bubble(ctx, 300, 640, 'Shhh…', 54, [40, 90], win(t, 57.6, 61.3));
}

function sceneBackyard(ctx, c, t) {   // 61–75
  if (t < 61.2 || t > 75.6) return;
  const ex = popOut(66.6 - t);
  drawPRFlag(ctx, c, t < 67.5 ? 1 : 0, 0.85);
  sprite(ctx, 'canada_cheerful', 760, 620, 480, { k: win(t, 61.8, 66.6), rot: wob(t, 1, 4) });
  sprite(ctx, 'icon_car', 250, 1020, 210, { k: win(t, 62.6, 66.6) });
  sprite(ctx, 'icon_ferry', 540, 1090, 210, { k: win(t, 63.0, 66.6) });
  sprite(ctx, 'icon_plane', 830, 1020, 210, { k: win(t, 63.4, 66.6) });
  styledText(ctx, '170 YEARS', W / 2, 330, 130, { k: win(t, 62.2, 66.6), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  // 2020: the gate slams and the padlock drops
  if (t > 67.6) {
    const [gx, gy] = P(c, GATE1[0], GATE1[1]);
    const kg = win(t, 67.8, 75.4);
    const open = t < 70.3 ? 1 : 1 - easeIn((t - 70.3) / 0.18);
    gate(ctx, gx + 40, gy + 40, 0.9, open, kg);
    if (t > 71.2) {
      const u = easeIn((t - 71.2) / 0.25);
      const bounce = t > 71.45 ? Math.abs(Math.sin((t - 71.45) * 10)) * Math.exp(-(t - 71.45) * 5) * 40 : 0;
      sprite(ctx, 'padlock', gx - 140, lerp(gy - 900, gy - 60, u) - bounce, 260, { k: popOut(75.4 - t) });
      if (t > 71.45) puff(ctx, gx - 140, gy + 40, 160, (t - 71.45) / 1.0, 9);
    }
    sprite(ctx, 'usa_trapped', 560, 1085, 480, { k: win(t, 72.4, 75.4) });
  }
  flash(ctx, (t - 70.3) / 0.35, '#fff');
}

function sceneGhost(ctx, c, t) {      // 75–86
  if (t < 75.0 || t > 87.2) return;
  const dim = clamp((t - 75.2) / 0.6) * popOut(86.8 - t, 0.6);
  if (dim > 0) { ctx.save(); ctx.fillStyle = `rgba(28,32,40,${0.5 * dim})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (t > 75.4 && t < 80.2) {
    const u = (t - 75.4) / 4.4;
    sprite(ctx, 'tumbleweed', lerp(W + 150, -150, u), 1120 - Math.abs(Math.sin(u * 14)) * 60, 190, { rot: -u * 1100 });
  }
  // shelf goes empty
  const ksh = win(t, 76.6, 80.2);
  if (ksh > 0) {
    ctx.save(); ctx.translate(540, 760); ctx.scale(ksh, ksh);
    ctx.fillStyle = '#8B5A2B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(-300, 60, 600, 30, 6); ctx.fill(); ctx.stroke();
    ctx.restore();
    const gone = clamp((t - 78.0) / 0.25);
    sprite(ctx, 'milk', 400, 760, 110, { k: ksh * (1 - gone), ay: 0.9 });
    sprite(ctx, 'bread', 640, 790, 190, { k: ksh * (1 - gone), ay: 0.9 });
    if (t > 78.0) styledText(ctx, 'SOLD OUT', 540, 700, 72, { k: win(t, 78.2, 80.2), fill: '#E63946', stroke: '#fff', rot: -8 });
  }
  // emergency ferry
  if (t > 80.6) {
    const ex = popOut(86.6 - t);
    geoLine(ctx, c, FERRY_ROUTE, clamp((t - 80.8) / 1.0) * ex, C.cyan, 6, [16, 12], true);
    const sp = FERRY_ROUTE.map(p => P(c, p[0], p[1]));
    const u = clamp((t - 81.4) / 3.4);
    const [fx, fy] = pointAlong(sp, easeIO(u));
    sprite(ctx, 'icon_ferry', fx, fy, 210, { k: pop(t - 81.2) * ex });
    sprite(ctx, 'milk', fx - 40, fy - 120, 50, { k: pop(t - 81.6) * ex, rot: wob(t, 1, 8) });
    sprite(ctx, 'bread', fx + 40, fy - 110, 90, { k: pop(t - 81.8) * ex, rot: wob(t, 1, 8, 1) });
    drawPRFlag(ctx, c, ex, 0.85);
    mapLabel(ctx, c, BELLINGHAM[0] - 0.07, BELLINGHAM[1] - 0.035, 'Bellingham, WA', 34, ex);
  }
}

function sceneReopen(ctx, c, t) {     // 86–90: padlock shatters, gate lifts
  if (t < 86.4 || t > 89.6) return;
  const [gx, gy] = P(c, GATE1[0], GATE1[1]);
  const kg = win(t, 86.5, 89.4);
  const open = t < 87.6 ? 0 : easeOut((t - 87.6) / 0.4);
  gate(ctx, gx + 40, gy + 40, 0.9, open, kg);
  const im = IMG.padlock; if (!im) return;
  const px = gx - 140, py = gy - 60, w = 260, h = w * im.height / im.width;
  if (t < 87.0) { sprite(ctx, 'padlock', px, py + wob(t, 10, 3), w, { k: pop(t - 86.5) }); return; }
  const u = t - 87.0; if (u > 1.4) return;
  const shards = [[[0, 0], [.5, 0], [.4, .45]], [[.5, 0], [1, 0], [1, .4], [.4, .45]], [[0, 0], [.4, .45], [0, .6]],
                  [[0, .6], [.4, .45], [.55, .75], [0, 1]], [[.4, .45], [1, .4], [1, .8], [.55, .75]], [[0, 1], [.55, .75], [1, .8], [1, 1]]];
  shards.forEach((sh, i) => {
    const cxm = sh.reduce((a, p) => a + p[0], 0) / sh.length - .5, cym = sh.reduce((a, p) => a + p[1], 0) / sh.length - .5;
    const vx = cxm * 900 + (i - 2.5) * 40, vy = cym * 700 - 500;
    ctx.save(); ctx.globalAlpha = clamp(1 - u / 1.4);
    ctx.translate(px + vx * u, py + vy * u + 900 * u * u); ctx.rotate((i % 2 ? 1 : -1) * u * 6);
    ctx.beginPath(); sh.forEach((p, j) => { const X = (p[0] - .5) * w, Y = (p[1] - .5) * h; j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
    ctx.clip(); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
  });
  flash(ctx, u / 0.3, '#FFE8A3');
}

const CAPTIONS = [
  [0.0, 3.0, 'Passport… for milk?!'], [3.05, 6.0, 'Two feet outside!'], [6.05, 9.0, 'We drew a straight line!'],
  [10.8, 14.0, 'Trapped inside Canada'], [21.6, 25.0, 'Nobody zoomed in'], [33.0, 36.0, "Can't even drive there"],
  [37.5, 39.0, 'No hospital.'], [39.1, 40.8, 'No high school.'], [46.8, 51.0, 'Just to get to class'],
  [51.4, 55.6, 'Wait… what?!'], [56.0, 61.0, 'Hiding mobsters'], [61.4, 66.4, 'Canada = backyard'],
  [70.4, 75.0, 'Canada locked the gates'], [75.6, 79.8, 'Ghost town'], [80.6, 86.0, 'Emergency ferries'],
  [86.6, 89.4, 'The border reopened…'], [89.6, 93.0, '…wondering how'],
];
const TITLES = [[14.4, 18.6, '1846: The Map Blunder'], [68.8, 72.6, '2020: Locked In']];
const KINETIC = [[29.8, 36.0, '5 Square Miles']];

function drawText(ctx, t) {
  for (const [t0, t1, txt] of CAPTIONS) {
    const k = t0 === 0 ? (t <= t1 ? popOut(t1 - t, .18) : 0) : win(t, t0, t1, .26, .18);
    if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 960 });
  }
  for (const [t0, t1, txt] of TITLES) {
    const k = win(t, t0, t1, .35, .2);
    if (k <= 0) continue;
    ctx.save(); ctx.globalAlpha = clamp(k) * 0.55; ctx.fillStyle = '#0C1418'; ctx.beginPath(); ctx.roundRect(70, 230, W - 140, 150, 30); ctx.fill(); ctx.restore();
    styledText(ctx, txt, W / 2, 305, 84, { k, font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark, maxW: 880 });
  }
  for (const [t0, t1, txt] of KINETIC) styledText(ctx, txt, W / 2, 330, 120, { k: win(t, t0, t1), fill: C.yellow, stroke: C.goldDark, rot: -3 });
}

function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

const SHAKES = [8.15, 16.5, 70.3, 71.45, 87.0];
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = camAt(t);
  for (const s of SHAKES) if (t >= s && t < s + 0.3) { const a = 16 * (1 - (t - s) / 0.3), r = rnd(Math.floor(t * 60)); c.sx += (r() - .5) * 2 * a; c.sy += (r() - .5) * 2 * a; }
  drawMap(ctx, c);
  // 49th parallel (always), glowing gold while it's being drawn in 1846
  const glow = t > 16.4 && t < 25.5;
  const k49 = glow ? easeIO((t - 16.6) / 1.6) : 1;
  geoLine(ctx, c, [[-123.4, BORDER_LAT], [-95.15, BORDER_LAT]], k49, glow ? C.gold : 'rgba(255,255,255,0.85)', glow ? 8 : 4, glow ? null : [16, 12], glow);
  vignette(ctx);
  sceneColdOpen(ctx, c, t); sceneTrapped(ctx, c, t); scene1846(ctx, c, t); sceneSlice(ctx, c, t);
  sceneLife(ctx, c, t); sceneWitness(ctx, c, t); sceneBackyard(ctx, c, t); sceneGhost(ctx, c, t); sceneReopen(ctx, c, t);
  drawText(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ------------------------------------------------------------------ player (preview) / render hooks
window.renderAt = renderAt;
window.READY = false;
loadAssets().then(() => {
  window.READY = true;
  const cv = document.getElementById('cv');
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
