/* Bolivia: the country named after its liberator — Mapheld 9:16 explainer. HTML5 Canvas, deterministic.
 * renderAt(t) draws the frame at storyboard time t (seconds, 0–93, as in the script).
 * Assets: window.ASSETS {name: dataURI}, geometry: GEO (geo_data.js).
 */
'use strict';
const W = 1080, H = 1920, DURATION = 50;
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
  sa: [-60.0, -21.0, 19.5],
  north: [-70.5, 3.0, 52],
  andes: [-70.0, -6.0, 36],
  upper: [-64.6, -17.0, 58],
};
const KEYS = [  // [t, view, zoomMul]
  [0, 'sa', 1], [8.6, 'sa', 1.04], [10.6, 'north', 1], [17.5, 'north', 1.05], [19.6, 'andes', 1], [24.8, 'andes', 1.04],
  [26.8, 'upper', 1], [29.5, 'upper', 1.03], [41.5, 'upper', 1.08], [44.0, 'sa', 1.06], [50, 'sa', 1.1],
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

// ------------------------------------------------------------------ scenes (storyboard time 0–50 s)
const CITY = GEO.cities;
const ROUTE = ['caracas', 'bogota', 'quito', 'lima', 'lapaz', 'sucre'].map(k => CITY[k]);
const SPANISH = ['VEN', 'COL', 'PAN', 'ECU', 'PER', 'BOL', 'CHL', 'ARG', 'PRY', 'URY'];
const SIX = [['VEN', 19.6], ['COL', 20.3], ['PAN', 20.9], ['ECU', 21.5], ['PER', 22.2], ['BOL', 22.9]];

function countryPath(c, iso) { const p = new Path2D(); for (const q of PATHS['c_' + iso]) p.addPath(q, camMatrix(c)); return p; }
function tint(ctx, c, iso, color, a, glow) {
  if (a <= 0 || !PATHS['c_' + iso]) return; const p = countryPath(c, iso);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill(p, 'evenodd');
  if (glow) { ctx.globalAlpha = Math.min(1, a * 2.2); ctx.strokeStyle = glow; ctx.lineWidth = 4; ctx.shadowColor = glow; ctx.shadowBlur = 16; ctx.stroke(p); }
  ctx.restore();
}
function chip(ctx, text, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', o.size || 30);
  const w = ctx.measureText(text).width + 46, h = (o.size || 30) * 1.75;
  ctx.fillStyle = 'rgba(10,24,32,0.92)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2); ctx.restore();
}
function routeScreen(c) { return ROUTE.map(p => P(c, p[0], p[1])); }
function drawRoute(ctx, c, k, alpha = 1) {
  if (k <= 0) return;
  const sp = routeScreen(c), path = partial(sp, k);
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(244,208,63,0.25)'; ctx.lineWidth = 30; ctx.stroke(path);
  ctx.strokeStyle = C.gold; ctx.lineWidth = 9; ctx.setLineDash([24, 14]); ctx.lineDashOffset = -performance_t * 40; ctx.stroke(path); ctx.setLineDash([]);
  // arrowhead at the moving tip
  const [x, y] = pointAlong(sp, clamp(k)), [x0, y0] = pointAlong(sp, clamp(k - 0.01));
  const a = Math.atan2(y - y0, x - x0);
  ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-20, -26); ctx.lineTo(-10, 0); ctx.lineTo(-20, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  return [x, y];
}
let performance_t = 0;

function sceneNames(ctx, c, t) {        // 0–9: most countries are named after tribes, rivers, features
  if (t > 10) return;
  const ex = popOut(9.6 - t);
  [['ECU', 'ECUADOR → the equator', -74.5, -1.0, 1.4], ['PRY', 'PARAGUAY → a river', -58.0, -23.0, 2.4], ['URY', 'URUGUAY → a river', -56.0, -32.8, 3.2]]
    .forEach(([iso, lab, lon, lat, t0]) => { const k = win(t, t0, 9.4); tint(ctx, c, iso, '#7FD3FF', 0.35 * clamp(k)); chip(ctx, lab, ...P(c, lon, lat), k, { size: 26 }); });
  tint(ctx, c, 'BOL', C.gold, 0.55 * clamp((t - 5.4) / 0.6) * ex, C.gold);
  const [bx, by] = P(c, -64.6, -16.8);
  chip(ctx, 'BOLIVIA → a real person', bx, by - 90, win(t, 5.8, 9.4), { size: 28, fill: C.gold });
  sprite(ctx, 'bolivar_badge', bx + 250, by - 330, 200, { k: win(t, 6.4, 9.4), alpha: 0.95 });
  styledText(ctx, '?', bx + 340, by - 430, 110, { k: win(t, 6.6, 9.4), fill: C.gold, stroke: C.ink });
}

function sceneEmpire(ctx, c, t) {       // 9–19: Spanish Empire, Bolívar rises in Venezuela
  if (t < 9 || t > 30) return;
  const ks = clamp((t - 9.2) / 0.8);
  for (const iso of SPANISH) {
    const freed = SIX.find(s => s[0] === iso);
    const fade = freed ? 1 - clamp((t - freed[1]) / 0.5) : 1 - clamp((t - 24.6) / 0.6);
    tint(ctx, c, iso, '#AA151B', 0.32 * ks * fade);
  }
  styledText(ctx, 'EARLY 1800s', W / 2, 300, 110, { k: win(t, 9.4, 13.6, .4), font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark });
  sprite(ctx, 'marker_esp', W / 2 - 60, 1000, 120, { k: win(t, 10.2, 15.0), ay: 0.95 });
  chip(ctx, 'SPANISH EMPIRE', W / 2 - 60, 1060, win(t, 10.0, 15.0), { size: 30, stroke: '#F1BF00' });
  // Bolívar appears at Caracas
  const [cx, cy] = P(c, ...CITY.caracas);
  const kb = win(t, 14.2, 16.4);
  sprite(ctx, 'bolivar_badge', cx + 40, cy - 200, 240, { k: kb });
  chip(ctx, 'SIMÓN BOLÍVAR', cx + 40, cy - 50, kb, { size: 28, fill: C.gold });
  chip(ctx, 'Venezuelan', cx + 40, cy + 6, win(t, 14.8, 16.4), { size: 22 });
}

function sceneLiberation(ctx, c, t) {   // 16–29.5: liberation sweeps south, six countries light up
  if (t < 16 || t > 44.5) return;
  performance_t = t;
  const k = easeIO((t - 16.4) / 7.0);
  const lateFade = t > 41.5 ? 1 - clamp((t - 41.5) / 1.0) * 0.6 : 1;
  for (const [iso, t0] of SIX) tint(ctx, c, iso, C.gold, 0.42 * clamp((t - t0) / 0.5) * lateFade, t < 29.5 ? C.gold : null);
  const tip = drawRoute(ctx, c, k, t < 29.5 ? 1 : 0.35 * lateFade);
  if (tip && t < 25.2) sprite(ctx, 'bolivar_badge', tip[0] + 10, tip[1] - 150, 170, { k: pop(t - 16.4) * popOut(25.0 - t) });
  const n = SIX.filter(s => t >= s[1]).length;
  const kn = win(t, 19.6, 26.4);
  if (kn > 0) styledText(ctx, `${n} COUNTR${n === 1 ? 'Y' : 'IES'}`, W / 2, 300, 120, { k: kn * (1 + 0.1 * Math.max(0, 1 - (t - (SIX[n - 1] || [0, 0])[1]) * 4)), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  // Upper Peru
  const [ux, uy] = P(c, -64.6, -16.8);
  chip(ctx, 'UPPER PERU', ux, uy - 40, win(t, 26.4, 30.0), { size: 40, fill: C.gold });
  styledText(ctx, '1825', W / 2, 300, 140, { k: win(t, 27.0, 31.0, .4), font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark });
  if (t > 27.6 && t < 29.6) for (let i = 0; i < 10; i++) {   // freedom sparks
    const a = i / 10 * 6.28, r = 80 + (t - 27.6) * 260;
    ctx.save(); ctx.globalAlpha = 1 - (t - 27.6) / 2; ctx.fillStyle = C.gold;
    star(ctx, ux + Math.cos(a) * r, uy + Math.sin(a) * r * 0.7, 16); ctx.fill(); ctx.restore();
  }
}
function star(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); }

function sceneName(ctx, c, t) {         // 29.5–43: República Bolívar -> Bolivia
  if (t < 29.6 || t > 50.5) return;
  const [ux, uy] = P(c, -64.6, -16.8);
  const kd = win(t, 30.0, 41.6);
  if (kd > 0) { ctx.save(); ctx.globalAlpha = 0.35 * clamp(kd); ctx.fillStyle = '#071C2A'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // scroll flies to the map label at the end
  const fly = easeIO((t - 40.4) / 1.4);
  const sx = lerp(W / 2, ux, fly), sy = lerp(560, uy, fly), sc = lerp(1, 0.35, fly);
  const morph = clamp((t - 37.8) / 0.6);
  if (t < 41.8) {
    sprite(ctx, 'scroll_republic_of_bolivar', sx, sy, 940 * sc, { k: pop(t - 30.4) * (1 - morph) });
    sprite(ctx, 'scroll_bolivia', sx, sy, 940 * sc, { k: morph * popOut(41.8 - t, 0.3) });
  }
  chip(ctx, 'AUGUST 1825', W / 2, 420, win(t, 30.8, 37.6), { size: 30 });
  // fan club gag
  const kf = win(t, 33.6, 37.6);
  if (kf > 0) {
    ctx.save(); ctx.translate(W / 2 + 230, 700); ctx.rotate(-0.18); ctx.scale(kf, kf);
    ctx.strokeStyle = '#FF5E8A'; ctx.lineWidth = 10; setFont(ctx, 'Montserrat', 54);
    const w = ctx.measureText('FAN CLUB?').width + 50; ctx.beginPath(); ctx.roundRect(-w / 2, -45, w, 90, 16); ctx.stroke();
    ctx.fillStyle = '#FF5E8A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FAN CLUB?', 0, 4); ctx.restore();
    for (let i = 0; i < 4; i++) { const u = ((t - 33.6) * 0.6 + i / 4) % 1;
      ctx.save(); ctx.globalAlpha = (1 - u) * clamp(kf); ctx.fillStyle = '#FF5E8A'; setFont(ctx, 'Montserrat', 48); ctx.textAlign = 'center';
      ctx.fillText('♥', W / 2 - 300 + i * 200, 500 - u * 140); ctx.restore(); }
  }
  // congressman's quill rewrites the ending
  const kq = win(t, 36.6, 39.4);
  if (kq > 0) sprite(ctx, 'quill', W / 2 + 230 + Math.sin(t * 18) * 10 * clamp((t - 37.2) / 0.3), 470, 260, { k: kq, rot: -10 });
  chip(ctx, 'OCTOBER 1825', W / 2, 420, win(t, 38.0, 40.4), { size: 30 });
  // BOLIVIA in gold on the map
  const kl = clamp((t - 41.4) / 0.5);
  if (kl > 0) {
    tint(ctx, c, 'BOL', C.gold, 0.55 * kl, C.gold);
    styledText(ctx, 'BOLIVIA', ux, uy + 8, t < 43 ? 120 : 84, { k: back(clamp((t - 41.4) / 0.5)), fill: C.gold, stroke: C.goldDark, shadow: 6 });
  }
  // finale: Bolívar badge beside his namesake country
  const ke = clamp((t - 44.6) / 0.6);
  if (ke > 0) {
    sprite(ctx, 'bolivar_badge', ux + 300, uy - 520, 240, { k: pop(t - 44.6) });
    styledText(ctx, 'Simón Bolívar', ux + 300, uy - 365, 40, { k: pop(t - 44.9), fill: C.white });
    ctx.save(); ctx.globalAlpha = ke; ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(ux + 220, uy - 420); ctx.quadraticCurveTo(ux + 120, uy - 260, ux + 30, uy - 50); ctx.stroke(); ctx.restore();
  }
}

const CAPTIONS = [
  [0.3, 2.8, 'Most countries are named'], [2.9, 5.2, 'After tribes, rivers, places'], [5.3, 9.0, 'Bolivia? A real person'],
  [9.2, 12.6, 'Early 1800s'], [12.7, 15.6, 'Ruled by Spain'], [15.7, 19.2, 'Until Simón Bolívar'],
  [19.4, 24.4, 'Six future countries'], [24.6, 29.4, 'Upper Peru breaks free'],
  [29.6, 33.4, 'República Bolívar'], [33.5, 36.6, 'A bit of a fan club'], [36.7, 40.6, 'Two months later…'],
  [41.6, 45.0, 'Bolivia'], [45.1, 50.0, 'Named after its liberator'],
];
function drawText(ctx, t) {
  for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .26, .18); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 960 }); }
}
function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = camAt(t);
  drawMap(ctx, c);
  ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 1.8; ctx.setLineDash([7, 6]);
  for (const iso of Object.keys(GEO.countries)) if (PATHS['c_' + iso]) ctx.stroke(countryPath(c, iso)); ctx.restore();
  vignette(ctx);
  sceneNames(ctx, c, t); sceneEmpire(ctx, c, t); sceneLiberation(ctx, c, t); sceneName(ctx, c, t);
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
