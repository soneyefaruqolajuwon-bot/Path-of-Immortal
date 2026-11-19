/* The Impossible Strait (Strait of Hormuz) — 16:9 map explainer, Part 1. HTML5 Canvas, deterministic.
 * renderAt(t) draws the frame at storyboard time t (seconds, 0–93, as in the script).
 * Assets: window.ASSETS {name: dataURI}, geometry: GEO (geo_data.js).
 */
'use strict';
const W = 1920, H = 1080, DURATION = 115;
const C = {
  ocean: '#0A3652', land: '#8A855C', coast: '#5E5A3B', halo: '#2C6A78', ink: '#141416',
  gold: '#F4D03F', goldDark: '#3A2A08', yellow: '#FFD43B', cyan: '#25E3FF', white: '#FFFFFF',
  usRed: '#B22234', usBlue: '#3C3B6E',
};
const CAPTION = { size: 50, y: 968, font: 'Montserrat', shadow: 4 };   // lower-third subtitles


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
  strait: [56.4, 26.62, 1000],
  tight: [56.42, 26.6, 1350],
  outside: [57.1, 25.85, 700],
  gulf: [52.4, 27.6, 105],
  mid: [56.05, 25.6, 330],
  arcs: [56.2, 26.7, 640],
};
const KEYS = [  // [t, view, zoomMul, rot, tilt]
  [0, 'strait', 0.8], [6, 'strait', 1], [10.5, 'tight', 1], [17.0, 'tight', 1.04], [18.8, 'strait', 0.72], [32.0, 'strait', 0.76],
  [34.2, 'outside', 1], [41.0, 'outside', 0.94], [45.5, 'gulf', 1], [52, 'gulf', 1.04], [65, 'gulf', 1.06], [75, 'gulf', 1.03],
  [77.2, 'mid', 1], [88, 'mid', 1.08], [90, 'arcs', 1], [115, 'arcs', 1.1],
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
  for (const key of ['land']) {
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
  PATHS.borders = GEO.borders.map(r => { const p = new Path2D(); for (let i = 0; i < r.length; i += 2) { const x = r[i], y = -mercY(r[i + 1]); i ? p.lineTo(x, y) : p.moveTo(x, y); } return p; });
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
  const set = PATHS.land;
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

// ------------------------------------------------------------------ Part 1 scenes (storyboard time 0–115 s)
// Hook 0:00–0:45 · Chapter 1 "The Geography Trap" 0:45–1:55

const NMI = (c) => c.z / 60 * 1.118;       // px per nautical mile at ~26.5°N (Mercator)
const LANE = GEO.laneCentre;
const PORTS = {   // main export terminals inside the Gulf
  IRQ: [48.8, 29.75], KWT: [48.15, 29.2], SAU: [50.15, 26.65], QAT: [51.6, 25.9], ARE: [53.6, 24.6], IRN: [50.32, 29.24],
};
const MARKERS = [  // [iso, lon, lat, t]
  ['sau', 48.4, 25.3, 53.4], ['irq', 46.9, 30.4, 54.6], ['kwt', 47.55, 29.25, 55.6], ['qat', 51.2, 25.25, 56.6],
  ['are', 54.3, 23.9, 57.6], ['irn', 54.2, 28.6, 58.8],
];
const MISSILE_SITES = [[56.27, 27.18], [55.95, 26.9], [56.37, 26.86], [57.0, 27.05], [55.4, 26.75]];

function offsetLine(sp, d) {   // screen polyline offset by d px along its normal
  return sp.map((p, i) => {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [p[0] - dy / L * d, p[1] + dx / L * d];
  });
}
function smooth(pts, n = 8) {
  const out = [], P2 = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P2.length - 2; i++) for (let j = 0; j < n; j++) {
    const t = j / n, t2 = t * t, t3 = t2 * t, p0 = P2[i - 1], p1 = P2[i], p2 = P2[i + 1], p3 = P2[i + 2];
    out.push([0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
  }
  out.push(P2[P2.length - 2]); return out;
}
function laneScreen(c) { return smooth(LANE.map(p => P(c, p[0], p[1]))); }

function drawBorders(ctx, c, a = 0.75) {
  ctx.save(); ctx.setTransform(camMatrix(c)); ctx.globalAlpha = a; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 1.8 / c.z;
  ctx.setLineDash([7 / c.z, 6 / c.z]); for (const p of PATHS.borders) ctx.stroke(p); ctx.restore();
}
function tintCountry(ctx, c, iso, color, a, glow = false) {
  if (a <= 0 || !PATHS['c_' + iso]) return;
  const path = new Path2D(); for (const p of PATHS['c_' + iso]) path.addPath(p, camMatrix(c));
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill(path, 'evenodd');
  if (glow) { ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.stroke(path); }
  ctx.restore();
}
function musandamPath(c) {
  const path = new Path2D();
  GEO.countries.OMN.forEach((r, i) => { if (Math.min(...r.filter((_, k) => k % 2)) > 25.5) path.addPath(PATHS.c_OMN[i], camMatrix(c)); });
  return path;
}
function callout(ctx, x, y, text, k, o = {}) {   // kinetic yellow callout label with a pointer
  if (k <= 0.001) return;
  const dx = o.dx || 0, dy = o.dy === undefined ? -90 : o.dy;
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * clamp(k), y + dy * clamp(k)); ctx.stroke();
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.restore();
  styledText(ctx, text, x + dx, y + dy - 30, o.size || 56, { k, fill: C.gold, stroke: C.goldDark, maxW: 900 });
}

function drawLanes(ctx, c, k, tankers) {
  if (k <= 0) return;
  const sp = laneScreen(c), n = NMI(c);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const side of [-1, 1]) {
    const lane = offsetLine(sp, side * 2 * n);
    const path = partial(lane, k);
    ctx.strokeStyle = 'rgba(127,231,255,0.16)'; ctx.lineWidth = Math.max(10, 2 * n); ctx.stroke(path);
    for (const e of [-1, 1]) {
      const edge = partial(offsetLine(lane, e * Math.max(5, n)), k);
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = -side * performanceT * 30; ctx.strokeStyle = 'rgba(127,231,255,0.85)'; ctx.lineWidth = 2.5; ctx.stroke(edge); ctx.setLineDash([]);
    }
  }
  ctx.restore();
  if (!tankers) return;
  // tankers: outbound (laden) on the southern lane, inbound on the northern lane
  for (const side of [-1, 1]) {
    const lane = offsetLine(sp, side * 2 * n);
    const N = 5;
    for (let i = 0; i < N; i++) {
      let u = ((performanceT * 0.022 + i / N + (side > 0 ? 0.1 : 0)) % 1);
      if (side > 0) u = 1 - u;                // inbound sails the other way
      const [x, y] = pointAlong(lane, u), [x2, y2] = pointAlong(lane, clamp(u + (side > 0 ? -0.01 : 0.01)));
      const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;
      sprite(ctx, 'tanker_top', x, y, tankers, { rot: ang, k: clamp(k * 3 - 2) });
    }
  }
}
let performanceT = 0;

function drawRangeArc(ctx, x, y, r, k, t) {
  if (k <= 0) return;
  const rr = r * easeOut(k);
  const g = ctx.createRadialGradient(x, y, rr * 0.3, x, y, rr);
  g.addColorStop(0, 'rgba(230,57,70,0.03)'); g.addColorStop(0.8, 'rgba(230,57,70,0.14)'); g.addColorStop(1, 'rgba(230,57,70,0.0)');
  ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,77,87,0.9)'; ctx.lineWidth = 3.5; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.arc(x, y, rr, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); ctx.restore();
}

function sceneHook(ctx, c, t) {     // 0–45
  if (t > 46.5) return;
  const ex = popOut(46.2 - t, 0.4);
  // pulsing ring on the strait
  const [sx, sy] = P(c, 56.37, 26.62);
  const kr = win(t, 0.3, 4.4);
  if (kr > 0) { ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.globalAlpha = clamp(kr) * (0.6 + 0.4 * Math.sin(t * 5));
    ctx.beginPath(); ctx.arc(sx, sy, 300 + 20 * Math.sin(t * 3), 0, 7); ctx.stroke(); ctx.restore(); }
  // 21 nautical miles marker
  const a = P(c, 56.40, 26.41), b = P(c, 56.36, 26.85);
  const km = clamp((t - 4.4) / 0.9) * popOut(19 - t);
  if (km > 0) {
    ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(lerp(a[0], b[0], easeOut(km)), lerp(a[1], b[1], easeOut(km))); ctx.stroke();
    for (const p of [a, b]) { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(p[0], p[1], 9 * clamp(km * 2), 0, 7); ctx.fill(); }
    ctx.restore();
    callout(ctx, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, '21 Nautical Miles Wide', win(t, 5.0, 19), { dx: 330, dy: -40, size: 50 });
  }
  // the two shipping lanes + tankers
  performanceT = t;
  drawLanes(ctx, c, clamp((t - 7.4) / 1.4) * popOut(46.0 - t, 0.5), t > 10.6 ? 120 : 0);
  const lp = P(c, 56.62, 26.42);
  callout(ctx, lp[0], lp[1], '2 Lanes · 2 Miles Each', win(t, 8.2, 12.5), { dx: 220, dy: 120, size: 44 });
  // 20% of global oil + barrel counter
  styledText(ctx, '20% of Global Oil', W / 2, 150, 104, { k: win(t, 12.0, 19.0), fill: C.gold, stroke: C.goldDark, rot: -2 });
  const kb = win(t, 13.0, 19.0);
  if (kb > 0) {
    for (let i = 0; i < 10; i++) sprite(ctx, 'oil_barrel', 1500 + (i % 5) * 70, 840 - Math.floor(i / 5) * 90, 64, { k: pop(t - 13.0 - i * 0.12) * popOut(19 - t) });
    styledText(ctx, '≈ 20 million barrels / day', 1640, 690, 34, { k: kb });
  }
  // title label
  styledText(ctx, 'STRAIT OF HORMUZ', sx, sy - 300, 92, { k: win(t, 18.6, 32.0, .45), font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark });
  // flashpoint pulses
  if (t > 22.2 && t < 32.2) for (let i = 0; i < 3; i++) {
    const u = ((t - 22.2) * 0.6 + i / 3) % 1;
    ctx.save(); ctx.strokeStyle = `rgba(255,77,87,${(1 - u) * 0.8})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sx, sy, 60 + u * 420, 0, 7); ctx.stroke(); ctx.restore();
  }
  sprite(ctx, 'chart_crash', 1600, 760, 380, { k: win(t, 28.0, 32.4), rot: wob(t, 3, 2) });
  // superpower warships parked outside the strait
  const ships = [[57.35, 25.5, 34.6], [57.75, 25.85, 35.1], [56.85, 25.1, 35.6], [58.1, 25.35, 36.1]];
  ships.forEach(([lon, lat, t0], i) => {
    const [x, y] = P(c, lon, lat), slide = 1 - easeOut((t - t0) / 0.9);
    sprite(ctx, 'warship_top', x + slide * 900, y, 200, { k: t > t0 ? ex : 0, rot: -25 + i * 6 });
  });
  sprite(ctx, 'marker_usa', ...P(c, 57.75, 25.85).map((v, i) => v + (i ? -70 : 0)), 70, { k: win(t, 36.4, 45.6), ay: 0.95 });
}

function sceneChapterCard(ctx, t) {   // 42.4–46.6
  const k = win(t, 42.4, 46.6, 0.5, 0.35);
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k) * 0.6; ctx.fillStyle = '#071C2A'; ctx.fillRect(0, 0, W, H); ctx.restore();
  styledText(ctx, 'CHAPTER 1', W / 2, H / 2 - 80, 44, { k, fill: '#EDE3B8', shadow: 3 });
  styledText(ctx, 'The Geography Trap', W / 2, H / 2 + 10, 110, { k, font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark });
}

function sceneChapter1(ctx, c, t) {   // 45–115
  if (t < 45.5) return;
  drawBorders(ctx, c, clamp((t - 45.6) / 0.8) * 0.8);
  // dead-end cul-de-sac: glowing axis from the Gulf's closed end to its only exit
  const axis = [[48.6, 29.6], [50.4, 28.0], [52.6, 26.9], [54.8, 26.3], [56.25, 26.6], [57.3, 25.6]];
  const kd = clamp((t - 46.6) / 1.6) * popOut(65.0 - t, 0.5);
  if (kd > 0) {
    geoLine(ctx, c, axis, kd, C.cyan, 7, [18, 12], true);
    const [ex2, ey2] = P(c, 49.9, 29.75);
    styledText(ctx, 'DEAD END', ex2, ey2, 46, { k: win(t, 47.8, 65), fill: '#FF6B6B', stroke: C.ink, rot: -8 });
    const [ox, oy] = P(c, 56.6, 26.4);
    styledText(ctx, 'ONLY EXIT →', ox + 150, oy - 70, 40, { k: win(t, 49.0, 65), fill: C.cyan, stroke: C.ink });
  }
  // the oil producers, one by one
  for (const [iso, lon, lat, t0] of MARKERS) {
    const k = win(t, t0, 75.4);
    tintCountry(ctx, c, iso.toUpperCase(), '#F4D03F', 0.22 * clamp(k));
    const [x, y] = P(c, lon, lat);
    sprite(ctx, 'marker_' + iso, x, y, 124, { k, ay: 0.95 });
  }
  const kbar = win(t, 60.4, 66.0);
  if (kbar > 0) {
    Object.values(PORTS).forEach(([lon, lat], i) => { const [x, y] = P(c, lon, lat); sprite(ctx, 'oil_barrel', x, y, 46, { k: pop(t - 60.4 - i * 0.15) * popOut(66 - t) }); });
    styledText(ctx, 'Millions of Barrels / Day', W / 2, 120, 76, { k: kbar, fill: C.gold, stroke: C.goldDark, rot: -2 });
  }
  // every route converges on one exit door
  const exitP = [56.3, 26.58];
  const kr = clamp((t - 65.6) / 2.0) * popOut(76.4 - t, 0.5);
  if (kr > 0) {
    Object.values(PORTS).forEach((p, i) => geoLine(ctx, c, [p, [lerp(p[0], exitP[0], 0.6), lerp(p[1], exitP[1], 0.6) - 0.2], exitP], clamp(kr * 1.3 - i * 0.05), C.gold, 5, [14, 10], true));
    const [dx, dy] = P(c, ...exitP);
    sprite(ctx, 'exit_door', dx + 10, dy - 40, 110, { k: win(t, 68.4, 76.4), ay: 0.95 });
    for (const [lab, x, y, t0] of [['→ ASIA', 1700, 420, 70.2], ['→ EUROPE', 1700, 640, 70.8], ['→ AMERICA', 1700, 860, 71.4]]) {
      geoLine(ctx, c, [[57.0, 25.6], [59.5, 24.5]], clamp((t - t0 + 0.4) / 0.6) * popOut(76.4 - t), C.gold, 5, [14, 10], false);
      styledText(ctx, lab, x, y, 50, { k: win(t, t0, 76.4), fill: C.white, stroke: C.ink });
    }
  }
  // Musandam: Oman's exclave
  const km = clamp((t - 77.6) / 0.8) * popOut(115 - t, 0.5);
  if (km > 0) {
    tintCountry(ctx, c, 'ARE', '#9AA3AC', 0.25 * clamp(win(t, 78.6, 88.0)));
    const mp = musandamPath(c);
    ctx.save(); ctx.globalAlpha = 0.6 * km; ctx.fillStyle = '#DB161B'; ctx.fill(mp, 'evenodd');
    ctx.strokeStyle = '#FF5A5F'; ctx.lineWidth = 4; ctx.shadowColor = '#FF5A5F'; ctx.shadowBlur = 18; ctx.stroke(mp); ctx.restore();
    const [mx, my] = P(c, 56.25, 25.95);
    callout(ctx, mx, my, 'MUSANDAM = OMAN', win(t, 78.4, 88.4), { dx: -340, dy: 40, size: 50 });
    mapLabel(ctx, c, 55.55, 25.25, 'UAE', 54, win(t, 79.2, 88.4));
    mapLabel(ctx, c, 57.6, 23.6, 'OMAN (mainland)', 40, win(t, 81.0, 88.4));
    const [g1x, g1y] = P(c, 56.15, 25.55), [g2x, g2y] = P(c, 56.35, 24.75);
    const kg = win(t, 81.6, 88.4);
    if (kg > 0) { ctx.save(); ctx.globalAlpha = clamp(kg); ctx.strokeStyle = C.white; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(g1x, g1y); ctx.lineTo(g2x, g2y); ctx.stroke(); ctx.restore();
      styledText(ctx, 'separated by UAE land', (g1x + g2x) / 2 + 190, (g1y + g2y) / 2, 32, { k: kg }); }
  }
  // two countries hold the keys
  if (t > 88.0) {
    tintCountry(ctx, c, 'IRN', '#239F40', 0.22 * clamp((t - 88.2) / 0.6), true);
    const [ix, iy] = P(c, 56.2, 27.25), [ox, oy] = P(c, 56.3, 26.0);
    sprite(ctx, 'key', ix - 160, iy - 60, 150, { k: win(t, 90.2, 99.0), rot: -10 });
    sprite(ctx, 'key', 1250, 800, 150, { k: win(t, 90.6, 99.0), rot: 10 });
    sprite(ctx, 'oman_calm', 1640, 800, 380, { k: win(t, 94.8, 101.0) });
    styledText(ctx, 'Neutral peacekeeper', 1640, 980 - 330, 34, { k: win(t, 95.4, 101.0), fill: C.white });
    sprite(ctx, 'iran_stern', 290, 260, 380, { k: win(t, 100.8, 115) });
    // coastal missiles, fast boats, mines
    MISSILE_SITES.forEach(([lon, lat], i) => {
      const [x, y] = P(c, lon, lat), t0 = 101.4 + i * 0.35;
      drawRangeArc(ctx, x, y, 210, clamp((t - t0) / 0.9), t);
      sprite(ctx, 'missile_site', x, y, 70, { k: pop(t - t0) });
    });
    performanceT = t;
    drawLanes(ctx, c, clamp((t - 101.0) / 1.0), 90);
    [[56.0, 26.62, 104.2], [56.55, 26.7, 104.6], [56.2, 26.75, 105.0]].forEach(([lon, lat, t0], i) => {
      const [x, y] = P(c, lon, lat); sprite(ctx, 'fast_boat', x + Math.sin(t * 1.5 + i) * 40, y + Math.cos(t * 1.2 + i) * 14, 120, { k: pop(t - t0), rot: 20 - i * 30 });
    });
    [[56.42, 26.55, 106.0], [56.62, 26.45, 106.4], [56.15, 26.5, 106.8], [56.75, 26.25, 107.2]].forEach(([lon, lat, t0]) => {
      const [x, y] = P(c, lon, lat); sprite(ctx, 'sea_mine', x, y + Math.sin(t * 2) * 3, 52, { k: pop(t - t0) });
    });
  }
}

const CAPTIONS = [
  [0.3, 4.3, 'This tiny curve of water'], [4.4, 7.4, '21 nautical miles wide'], [7.5, 11.0, 'Lanes just 2 miles across'],
  [11.2, 17.4, "One-fifth of the world's oil"], [17.6, 22.0, 'The Strait of Hormuz'], [22.1, 27.8, 'A global flashpoint'],
  [27.9, 32.0, 'One mistake, one crash'], [32.2, 37.0, 'Warships parked outside'], [37.1, 42.2, 'Just look at the map'],
  [46.2, 52.0, 'A dead-end cul-de-sac'], [52.2, 60.4, 'Oil giants all around'], [60.5, 65.0, 'Millions of barrels a day'],
  [65.2, 70.0, 'Most of it has one way out'], [70.1, 75.0, 'One single exit door'], [75.2, 81.0, "That tip? It's Oman"],
  [81.1, 88.0, 'Musandam: an exclave'], [88.2, 94.8, 'Two countries hold the keys'], [95.0, 100.8, 'Oman: the peacekeeper'],
  [100.9, 107.8, 'Iran: missiles, boats, mines'], [107.9, 115, 'Aimed at passing tankers'],
];

function drawText(ctx, t) {
  for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .26, .18); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1400 }); }
}

function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = camAt(t);
  drawMap(ctx, c);
  vignette(ctx);
  sceneHook(ctx, c, t); sceneChapter1(ctx, c, t); sceneChapterCard(ctx, t);
  drawText(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
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
