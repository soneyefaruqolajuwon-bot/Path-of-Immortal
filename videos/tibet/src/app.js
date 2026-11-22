/* Why Airlines Avoid Flying Over Tibet — Mapheld 16:9 long-form. HTML5 Canvas, deterministic.
 * renderAt(t) draws storyboard time t (= real time of the 1.2x voiceover). GEO from geo_data.js.
 */
'use strict';
const W = 1920, H = 1080, DURATION = 162.5;
const C = {
  ocean: '#1E4D5C', land: '#8A855C', coast: '#5E5A3B', halo: '#2C6A78', ink: '#141416',
  gold: '#F4D03F', goldDark: '#3A2A08', yellow: '#FFD43B', cyan: '#25E3FF', white: '#FFFFFF',
  usRed: '#B22234', usBlue: '#3C3B6E',
};
const CAPTION = { size: 52, y: 985, font: 'Montserrat', shadow: 4 };   // spec said 48px; 64 reads better on phones


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
  eur: [68.0, 30.0, 11.5],
  tib: [88.0, 31.5, 38],
  mid: [80.0, 32.0, 17],
  lhasa: [97.5, 29.8, 58],
};
const KEYS = [  // [t, view, zoomMul]
  [0, 'eur', 1], [9.5, 'eur', 1.03], [16.4, 'eur', 1.08], [18.6, 'tib', 1], [23.2, 'tib', 1.04], [25.0, 'mid', 1], [31.8, 'mid', 1.03],
  [39.0, 'mid', 1.06], [110.8, 'tib', 0.96], [129.4, 'tib', 1.02], [131.4, 'lhasa', 1], [142.4, 'lhasa', 1.05], [145.4, 'eur', 1], [162.5, 'eur', 1.07],
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
  for (const key of ['eur', 'near']) {
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
  const set = c.z > 30 ? PATHS.near : PATHS.eur;
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

// ================================================================== scenes (storyboard time = voiceover time, 0–162.5 s)
const CT = GEO.cities;
function countryPath(c, iso) { const p = new Path2D(); for (const q of PATHS['c_' + iso] || []) p.addPath(q, camMatrix(c)); return p; }
function geoPoly(c, pts) { const p = new Path2D(); pts.forEach(([lon, lat], i) => { const [x, y] = P(c, lon, lat); i ? p.lineTo(x, y) : p.moveTo(x, y); }); p.closePath(); return p; }
function chip(ctx, text, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', o.size || 30);
  const w = ctx.measureText(text).width + 46, h = (o.size || 30) * 1.75;
  ctx.fillStyle = o.bg || 'rgba(10,24,32,0.92)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2); ctx.restore();
}
function goldLabel(ctx, text, x, y, size, k) { styledText(ctx, text, x, y, size, { k, fill: C.gold, stroke: C.goldDark, shadow: 5 }); }
function title(ctx, text, y, k, size = 110) { styledText(ctx, text, W / 2, y, size, { k, font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark }); }
function kinetic(ctx, text, x, y, k, size = 96, rot = -3) { styledText(ctx, text, x, y, size, { k, fill: C.yellow, stroke: C.goldDark, rot }); }
function catmull(pts, n = 12) {            // smooth a polyline (screen space)
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  out.push(pts[pts.length - 1]); return out;
}

// ---------------------------------------------------------------- flight corridors (all bend around the plateau)
const ROUTES = [
  ['london', [[40, 55], [60, 52], [80, 47.5], [100, 45]], 'beijing'], ['frankfurt', [[45, 50], [70, 46.5], [90, 44.5], [105, 38]], 'shanghai'],
  ['paris', [[35, 40], [60, 31], [78, 23.5], [95, 20], [108, 21]], 'hongkong'], ['london', [[30, 40], [55, 30], [72, 23], [88, 19.5]], 'bangkok'],
  ['istanbul', [[50, 45], [75, 46.5], [100, 44], [125, 38]], 'tokyo'], ['dubai', [[62, 33], [72, 40], [85, 44], [100, 42]], 'beijing'],
  ['dubai', [[70, 22], [88, 20.5], [100, 20]], 'hongkong'], ['delhi', [[82, 25], [92, 23], [100, 25], [108, 32]], 'beijing'],
  ['delhi', [[85, 24], [98, 24.5], [110, 28]], 'shanghai'], ['mumbai', [[88, 20], [102, 22], [115, 30]], 'seoul'],
  ['moscow', [[55, 45], [68, 37]], 'delhi'], ['kolkata', [[95, 24], [101, 26.5]], 'chengdu'], ['frankfurt', [[40, 40], [60, 28], [78, 15], [95, 8]], 'singapore'],
  ['doha', [[68, 22], [88, 21], [105, 22]], 'guangzhou'], ['tashkent', [[85, 43.5], [100, 42]], 'beijing'], ['karachi', [[80, 22], [95, 22.5]], 'kunming'],
  ['london', [[35, 42], [55, 36], [68, 31]], 'delhi'], ['dhaka', [[100, 25], [108, 32]], 'beijing'], ['moscow', [[70, 52], [95, 48], [115, 45]], 'seoul'],
  ['istanbul', [[50, 32], [70, 26]], 'mumbai'], ['almaty', [[95, 43], [108, 40]], 'beijing'], ['dubai', [[70, 30], [90, 22.5], [104, 23]], 'hanoi'],
];
function routeScreen(c, r) { const pts = [CT[r[0]], ...r[1], CT[r[2]]].map(p => P(c, p[0], p[1])); return catmull(pts, 10); }
function drawRoutes(ctx, c, t, k, alpha = 1, glow = 1) {
  if (k <= 0 || alpha <= 0) return;
  ROUTES.forEach((r, i) => {
    const kk = clamp(k * 1.6 - i * 0.03); if (kk <= 0) return;
    const sp = routeScreen(c, r), path = partial(sp, easeOut(kk)); if (!path) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (glow) { ctx.strokeStyle = 'rgba(244,208,63,0.18)'; ctx.lineWidth = 12; ctx.stroke(path); }
    ctx.strokeStyle = 'rgba(244,208,63,0.85)'; ctx.lineWidth = 3; ctx.stroke(path); ctx.restore();
    if (kk >= 1) for (let j = 0; j < 2; j++) {                         // jets flowing along the corridor
      const u = ((t * 0.045 + i * 0.137 + j * 0.5) % 1), [x, y] = pointAlong(sp, u), [x2, y2] = pointAlong(sp, Math.min(1, u + 0.01));
      sprite(ctx, 'plane_top', x, y, 26, { rot: Math.atan2(y2 - y, x2 - x) * 180 / Math.PI, alpha });
    }
  });
}
function plateau(ctx, c, t, o = {}) {        // the plateau as a dark "blank" polygon / highlighted region
  const p = geoPoly(c, GEO.plateau);
  ctx.save();
  if (o.dark) { ctx.globalAlpha = o.dark; ctx.fillStyle = '#0D1A1F'; ctx.fill(p); }
  if (o.tint) { ctx.globalAlpha = o.tint; ctx.fillStyle = '#C9A46A'; ctx.fill(p); }
  if (o.edge) { ctx.globalAlpha = o.edge; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.setLineDash([12, 9]); ctx.lineDashOffset = -t * 20; ctx.stroke(p); }
  ctx.restore();
}
function himalaya(ctx, c, k) {               // the ridge as a row of white peaks
  if (k <= 0) return;
  const sp = catmull(GEO.himalaya.map(p => P(c, p[0], p[1])), 8); const n = Math.floor(sp.length * clamp(k));
  ctx.save(); ctx.fillStyle = '#F4F1E6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  for (let i = 0; i < n; i += 3) { const [x, y] = sp[i], s = 9 + (i % 5) * 2.2 * c.z / 38; ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.6); ctx.lineTo(x, y - s); ctx.lineTo(x + s, y + s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------- map scenes
function sceneRadar(ctx, c, t) {              // 0–39.7 and 111–162.5
  const routesK = t < 40 ? clamp((t - 1.0) / 8) : 1;
  const routesA = t < 40 ? 1 - 0.6 * clamp((t - 17) / 1.5) : t < 145 ? 0.25 : clamp(0.25 + (t - 145) / 2);
  drawRoutes(ctx, c, t, routesK, routesA, t < 17 || t > 145);
  // the blank spot
  const dark = t < 18 ? 0.75 * clamp((t - 9.5) / 1.0) : t > 145 ? 0.55 : 0.0;
  const tint = t >= 17 && t < 40 ? 0.42 * clamp((t - 17.1) / 0.8) : t >= 111 && t < 145 ? 0.35 : 0;
  plateau(ctx, c, t, { dark, tint, edge: (t > 12.8 && t < 40) || t > 111 ? 0.9 : 0 });
  if (t > 12.8 && t < 16.6) { const [x, y] = P(c, 88, 33); styledText(ctx, '?', x, y, 140, { k: pop(t - 13.0) * (1 + wob(t, 1.5, 0.05)), fill: C.white, stroke: C.ink }); }
  chip(ctx, '● LIVE FLIGHT MAP', 210, 70, win(t, 0.1, 9.8), { size: 26, stroke: '#FF4D4D' });
  kinetic(ctx, 'THOUSANDS OF JETS', W / 2, 150, win(t, 5.6, 9.8), 92);
  // labels
  if (t > 17 && t < 40) {
    const kt = pop(t - 18.2);
    const [px, py] = P(c, 88.5, 33.4); goldLabel(ctx, 'TIBETAN PLATEAU', px, py, t < 24.8 ? 62 : 40, kt);
    himalaya(ctx, c, clamp((t - 20.6) / 1.0));
    const [hx, hy] = P(c, 82.5, 27.0); goldLabel(ctx, 'HIMALAYAS', hx, hy, t < 24.8 ? 46 : 32, pop(t - 20.8));
    const [ix, iy] = P(c, 79, 23.0), [cx, cy] = P(c, 104, 36); goldLabel(ctx, 'INDIA', ix, iy, 48, pop(t - 19.4)); goldLabel(ctx, 'CHINA', cx, cy, 48, pop(t - 19.6));
    title(ctx, 'ROOF OF THE WORLD', 140, win(t, 22.1, 25.4, .4), 104);
  }
  // shortcut vs detour
  if (t > 23.4 && t < 40) {
    const sc = [['delhi', 'beijing'], ['dubai', 'chengdu']];
    sc.forEach(([a, b], i) => { const k = clamp((t - 23.6 - i * 0.4) / 1.2); if (k <= 0) return;
      geoLine(ctx, c, [CT[a], CT[b]], k, '#FFFFFF', 4, [14, 12], false); });
    chip(ctx, 'SHORTER', ...P(c, 92, 36.5), win(t, 24.8, 31.6), { size: 28, stroke: '#FFFFFF' });
    const det = [ROUTES[7], ROUTES[5]];
    det.forEach((r, i) => { const k = clamp((t - 28.4 - i * 0.4) / 1.6); if (k <= 0) return;
      const sp = routeScreen(c, r), path = partial(sp, easeOut(k)); if (!path) return;
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(244,208,63,0.3)'; ctx.lineWidth = 16; ctx.stroke(path);
      ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.setLineDash([18, 10]); ctx.lineDashOffset = -t * 40; ctx.stroke(path); ctx.restore();
      const [x, y] = pointAlong(sp, easeOut(k)), [x2, y2] = pointAlong(sp, Math.min(1, easeOut(k) + 0.01));
      if (k < 1) sprite(ctx, 'plane_top', x, y, 44, { rot: Math.atan2(y2 - y, x2 - x) * 180 / Math.PI }); });
    chip(ctx, 'EVERY DAY: THE DETOUR', W / 2, 140, win(t, 29.6, 31.8), { size: 32 });
  }
  // not mainly politics → physics
  if (t > 32 && t < 40) {
    const dim = clamp((t - 32.2) / 0.5) * (1 - clamp((t - 39.3) / 0.4)); ctx.save(); ctx.globalAlpha = 0.45 * dim; ctx.fillStyle = '#06141A'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const strike = clamp((t - 35.6) / 0.4);
    [['POLITICS', 33.5, -260], ['MILITARY BASES', 34.6, 260]].forEach(([s, t0, dx]) => {
      const k = win(t, t0, 39.5); chip(ctx, s, W / 2 + dx, 330, k * (1 - 0.25 * strike), { size: 40, stroke: '#9AA3AE', fill: strike > 0 ? '#9AA3AE' : '#fff' });
      if (strike > 0 && k > 0) { ctx.save(); ctx.strokeStyle = '#E63946'; ctx.lineWidth = 7; ctx.lineCap = 'round'; const w = s.length * 15; ctx.beginPath(); ctx.moveTo(W / 2 + dx - w, 330); ctx.lineTo(W / 2 + dx - w + 2 * w * strike, 330); ctx.stroke(); ctx.restore(); } });
    styledText(ctx, 'not mainly…', W / 2, 420, 40, { k: win(t, 33.1, 35.6), fill: '#DDE6EA' });
    kinetic(ctx, 'PHYSICS', W / 2 - 200, 560, win(t, 37.5, 39.6), 120, -4);
    kinetic(ctx, '+ SURVIVAL', W / 2 + 230, 690, win(t, 38.6, 39.6), 92, 3);
  }
  // ---- after the cross-section: nowhere to land (111–129.6)
  if (t > 111 && t < 130) {
    const icons = [['ENGINE FIRE', 114.4], ['MEDICAL EMERGENCY', 115.2], ['WARNING LIGHT', 116.2]];
    icons.forEach(([s, t0], i) => { const k = win(t, t0, 118.6); sprite(ctx, 'warning', 420 + i * 540, 150, 64, { k }); chip(ctx, s, 420 + i * 540, 225, k, { size: 26, stroke: '#E63946' }); });
    const [jx, jy] = P(c, 87, 32.6);
    const kr = clamp((t - 117.8) / 1.0), R = lerp(40, 330, easeOut(kr)) * (1 + 0.5 * clamp((t - 127.0) / 1.6));
    if (kr > 0) { ctx.save(); ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 4; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.arc(jx, jy, R, 0, 7); ctx.stroke();
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#FF6B6B'; ctx.fill(); ctx.restore(); }
    if (t > 112) sprite(ctx, 'plane_top', jx, jy, 64, { k: pop(t - 112.0), rot: -8 + wob(t, 0.4, 3) });
    chip(ctx, 'NOWHERE TO LAND', jx, jy - 80, win(t, 118.1, 122.4), { size: 30, stroke: '#FF6B6B' });
    const good = ['delhi', 'kolkata', 'dhaka', 'chengdu', 'kunming', 'xian', 'urumqi'];
    good.forEach((n, i) => { const [x, y] = P(c, ...CT[n]); sprite(ctx, 'runway', x, y, 54, { k: pop(t - 120.3 - i * 0.12) }); });
    chip(ctx, 'LONG RUNWAYS · THICK AIR', W / 2, 140, win(t, 120.5, 123.4), { size: 30, stroke: '#2E8B57' });
    [['lhasa', 'Lhasa'], [[88.9, 29.3], 'Shigatse'], [[97.1, 30.55], 'Qamdo']].forEach(([p, nm], i) => {
      const [x, y] = Array.isArray(p) ? P(c, ...p) : P(c, ...CT[p]); const k = pop(t - 124.6 - i * 0.15);
      sprite(ctx, 'runway_bad', x, y, 50, { k }); styledText(ctx, nm, x, y + 44, 24, { k, fill: '#FFD6D6' }); });
    chip(ctx, 'EXTREME ALTITUDE', W / 2, 140, win(t, 125.3, 127.0), { size: 30, stroke: '#E63946' });
    chip(ctx, 'DIVERSION: VERY FAR AWAY', W / 2, 140, win(t, 127.2, 129.5), { size: 30, stroke: '#FF6B6B' });
  }
  // ---- the Lhasa exception (129.7–142.7)
  if (t > 129.6 && t < 143.5) {
    const [lx, ly] = P(c, ...CT.lhasa), [cx, cy] = P(c, ...CT.chengdu);
    sprite(ctx, 'runway', cx, cy, 70, { k: pop(t - 130.0) }); goldLabel(ctx, 'Chengdu', cx, cy + 62, 34, pop(t - 130.0));
    sprite(ctx, 'runway', lx, ly, 80, { k: pop(t - 132.6) }); goldLabel(ctx, 'LHASA', lx, ly + 70, 46, pop(t - 132.8));
    const route = catmull([[cx, cy], P(c, 99.5, 31.6), P(c, 95.0, 30.6), [lx, ly]], 12);
    const k = clamp((t - 130.6) / 3.4); if (k > 0) {
      const path = partial(route, easeIO(k)); if (path) { ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.setLineDash([18, 10]); ctx.lineDashOffset = -t * 40; ctx.lineCap = 'round'; ctx.stroke(path); ctx.restore(); }
      const [x, y] = pointAlong(route, easeIO(k)), [x2, y2] = pointAlong(route, Math.min(1, easeIO(k) + 0.01));
      sprite(ctx, 'plane_top', x, y, 84, { rot: Math.atan2(y2 - y, x2 - x) * 180 / Math.PI });
      sprite(ctx, 'oxygen_tank', x + 90, y - 90, 90, { k: win(t, 136.9, 142.6) });
    }
    chip(ctx, 'SPECIALLY EQUIPPED', W / 2, 140, win(t, 135.3, 137.0), { size: 32 });
    chip(ctx, 'EXTRA OXYGEN', W / 2 - 420, 140, win(t, 137.0, 142.6), { size: 30, stroke: '#4CB050' });
    chip(ctx, 'SPECIAL ENGINE SETTINGS', W / 2, 140, win(t, 138.4, 142.6), { size: 30 });
    chip(ctx, 'HIGH-ALTITUDE PILOTS', W / 2 + 440, 140, win(t, 140.0, 142.6), { size: 30 });
  }
  // ---- outro: extra fuel, the invisible wall, the tallest ceiling
  if (t > 145) {
    chip(ctx, '+ A LITTLE EXTRA FUEL', W / 2, 150, win(t, 146.4, 149.6), { size: 34 });
    const kw = clamp((t - 152.4) / 1.4);            // the invisible wall rises over the plateau
    if (kw > 0) { const p = geoPoly(c, GEO.plateau); const lift = 120 * easeOut(kw);
      ctx.save(); for (let i = 10; i >= 0; i--) { ctx.save(); ctx.translate(0, -lift * i / 10); ctx.globalAlpha = 0.05 + (i === 10 ? 0.25 : 0); ctx.fillStyle = i === 10 ? 'rgba(244,208,63,0.6)' : '#9FE7F5'; ctx.fill(p); ctx.restore(); }
      ctx.translate(0, -lift); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.stroke(p); ctx.restore(); }
    title(ctx, 'THE TALLEST CEILING ON EARTH', 150, pop(t - 157.7, 0.45), 92);
  }
}

// ---------------------------------------------------------------- side-view altitude cross-section (39.7–111.3)
const ALT = km => 925 - km * 60;            // altitude (km) → screen y
const XP = [[0, 0.2], [300, 0.3], [430, 1.6], [500, 5.6], [540, 8.0], [565, 8.85], [600, 7.2], [640, 7.8], [690, 5.6], [760, 4.8], [900, 4.6], [1100, 5.1],
  [1300, 4.7], [1500, 4.9], [1650, 4.4], [1760, 3.0], [1850, 1.2], [1920, 0.6]];
function terrainKm(x, m, t) {
  let tib = XP[XP.length - 1][1];
  for (let i = 0; i < XP.length - 1; i++) if (x <= XP[i + 1][0]) { const f = (x - XP[i][0]) / (XP[i + 1][0] - XP[i][0]); tib = lerp(XP[i][1], XP[i + 1][1], f * f * (3 - 2 * f)); break; }
  tib += 0.12 * Math.sin(x * 0.05) + 0.08 * Math.sin(x * 0.13);
  const flat = 0.15 + 0.06 * Math.sin(x * 0.02);
  return lerp(flat, tib, m);
}
function sectionBg(ctx, t, m) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0E1F2E'); g.addColorStop(0.55, '#1E4D5C'); g.addColorStop(1, '#3C7A86'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // altitude grid
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2; for (let km = 2; km <= 14; km += 2) { ctx.beginPath(); ctx.moveTo(0, ALT(km)); ctx.lineTo(W, ALT(km)); ctx.stroke(); } ctx.restore();
  // terrain
  const p = new Path2D(); p.moveTo(0, H); for (let x = 0; x <= W; x += 8) p.lineTo(x, ALT(terrainKm(x, m, t))); p.lineTo(W, H); p.closePath();
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.translate(6, 8); ctx.fill(p); ctx.restore();
  ctx.fillStyle = C.land; ctx.fill(p); ctx.strokeStyle = C.coast; ctx.lineWidth = 3; ctx.stroke(p);
  if (m > 0.5) { ctx.save(); ctx.clip(p); ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (const [x0, x1] of [[520, 610], [625, 660]]) { ctx.beginPath(); for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, ALT(terrainKm(x, m, t)) + 2); for (let x = x1; x >= x0; x -= 4) ctx.lineTo(x, ALT(terrainKm(x, m, t)) + 26); ctx.fill(); } ctx.restore(); }
  ctx.fillStyle = '#5E5A3B'; ctx.fillRect(0, ALT(0) + 2, W, H - ALT(0));
}
function levelLine(ctx, km, label, color, k, dash = [16, 12], align = 'left') {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(0, ALT(km)); ctx.lineTo(W * clamp(k * 1.3), ALT(km)); ctx.stroke(); ctx.restore();
  lab(ctx, label, align === 'left' ? 36 : W - 36, ALT(km) - 22, 26, clamp(k), color, align);
}
function lab(ctx, text, x, y, size, k, color = '#FFFFFF', align = 'left') {
  if (k <= 0.001) return; ctx.save(); ctx.globalAlpha = clamp(k); setFont(ctx, 'Montserrat', size); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(text, x + 3, y + 3); ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}
function gauge(ctx, x, y, label, v, k, o = {}) {      // horizontal bar gauge (oxygen / fuel temperature)
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = 'rgba(8,20,28,0.85)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-30, -54, 480, 108, 18); ctx.fill(); ctx.stroke();
  if (o.icon) sprite(ctx, o.icon, 6, 0, 54);
  setFont(ctx, 'Montserrat', 24); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, 50, -24);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.roundRect(50, 4, 360, 26, 13); ctx.fill();
  const col = o.color ? o.color(v) : (v > 0.35 ? '#4CB050' : v > 0.12 ? '#F4D03F' : '#E63946');
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(50, 4, Math.max(26, 360 * clamp(v)), 26, 13); ctx.fill();
  if (o.limit !== undefined) { ctx.fillStyle = '#E63946'; ctx.fillRect(50 + 360 * o.limit - 2, -2, 5, 38); }
  ctx.restore();
}
function planeSide(ctx, x, y, w, rot = 0, k = 1) { sprite(ctx, 'plane_side', x, y, w, { rot, k }); }
function sceneSection(ctx, t) {
  const m = t < 63.4 ? 0 : easeIO((t - 63.6) / 1.8);            // flat land → the plateau
  sectionBg(ctx, t, m);
  const CR = 11;                                                     // cruise ~11 km
  levelLine(ctx, CR, 'CRUISE ≈ 11 km (36,000 ft)', '#FFFFFF', clamp((t - 40.6) / 0.6) * (1 - clamp((t - 110.6) / 0.4)), [10, 10]);
  levelLine(ctx, 3, 'SAFE AIR ≈ 3 km (10,000 ft)', '#7CFC9A', clamp((t - 55.5) / 0.6) * (1 - clamp((t - 110.6) / 0.4)), [16, 12]);
  // ---- P4: thin air, pressurized cabin, a crack, emergency descent (39.7–53.2)
  if (t < 53.3) {
    const px = 980, py = ALT(CR) + wob(t, 0.5, 4);
    lab(ctx, 'AIR TOO THIN TO BREATHE', W / 2, 110, 40, win(t, 42.2, 46.4), '#BFE9F5', 'center');
    if (t > 44.6) { const kb = clamp((t - 44.8) / 0.5) * (t > 47.6 ? Math.max(0, 1 - (t - 47.6) * 3) : 1); ctx.save(); ctx.globalAlpha = 0.35 * kb; ctx.fillStyle = '#7CFC9A'; ctx.beginPath(); ctx.ellipse(px, py, 230, 100, 0, 0, 7); ctx.fill(); ctx.restore();
      chip(ctx, 'PRESSURIZED CABIN', px, py + 130, win(t, 45.0, 47.4), { size: 28, stroke: '#7CFC9A' }); }
    planeSide(ctx, px + (t > 50.4 ? (t - 50.4) * 40 : 0), py + (t > 50.4 ? easeIn((t - 50.4) / 2.8) * 160 : 0), 320, t > 50.4 ? 8 * clamp((t - 50.4) / 0.6) : 0, pop(t - 40.0, 0.4));
    if (t > 47.7) { flash(ctx, (t - 47.7) / 0.5, '#FF5050'); sprite(ctx, 'warning', px + 200, py - 120, 90, { k: win(t, 47.8, 53.1) * (1 + wob(t, 2.5, 0.06)) });
      chip(ctx, 'CABIN PRESSURE LOST', px, py + 110, win(t, 48.0, 50.6), { size: 30, stroke: '#E63946' });
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; const r = rnd(4); for (let i = 0; i < 6; i++) { const a = r() * 6.28; ctx.beginPath(); ctx.moveTo(px + 60, py - 8); ctx.lineTo(px + 60 + Math.cos(a) * 40 * clamp((t - 47.8) / 0.3), py - 8 + Math.sin(a) * 30 * clamp((t - 47.8) / 0.3)); ctx.stroke(); } ctx.restore(); }
    kinetic(ctx, 'EMERGENCY DESCENT', W / 2, 140, win(t, 50.6, 53.2), 84);
  }
  // ---- P5: normal flight: masks drop, descent reaches safe air in time (53.3–62.5)
  if (t >= 53.3 && t < 62.6) {
    const A = [760, ALT(CR)], B = [1700, ALT(3)], Cc = [1380, ALT(CR) - 10];
    const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([(1 - u) * (1 - u) * A[0] + 2 * u * (1 - u) * Cc[0] + u * u * B[0], (1 - u) * (1 - u) * A[1] + 2 * u * (1 - u) * Cc[1] + u * u * B[1]]); }
    const kd = clamp((t - 54.7) / 1.4); if (kd > 0) { const path = partial(pts, kd); if (path) { ctx.save(); ctx.strokeStyle = '#7CFC9A'; ctx.lineWidth = 5; ctx.setLineDash([4, 14]); ctx.lineCap = 'round'; ctx.stroke(path); ctx.restore(); } }
    const u = easeIO((t - 56.4) / 5.0), [x, y] = pointAlong(pts, u), [x2, y2] = pointAlong(pts, Math.min(1, u + 0.01));
    planeSide(ctx, x, y, 300, Math.atan2(y2 - y, x2 - x) * 180 / Math.PI);
    sprite(ctx, 'oxygen_mask', 300, 330, 120, { k: win(t, 56.8, 62.4), rot: wob(t, 0.8, 5) });
    const ox = 1 - clamp((t - 57.0) / 8.0);
    gauge(ctx, 1400, 110, 'PASSENGER OXYGEN', ox, win(t, 57.2, 62.4), { icon: 'oxygen_mask' });
    if (t > 61.3) { styledText(ctx, '✓ SAFE IN TIME', B[0] - 120, B[1] - 80, 48, { k: pop(t - 61.4), fill: '#7CFC9A' }); }
    lab(ctx, 'NORMAL FLIGHT · NEAR SEA LEVEL', 40, 110, 32, win(t, 58.8, 62.4), '#BFE9F5');
  }
  // ---- P6: over Tibet the ground rises (62.6–75)
  if (t >= 62.6 && t < 75.1) {
    lab(ctx, 'OVER TIBET', W / 2, 120, 64, win(t, 62.7, 66.0), C.gold, 'center');
    if (t > 64.3) { styledText(ctx, 'SAFE AIR IS UNDERGROUND', 1180, ALT(3) + 60, 34, { k: win(t, 64.4, 74.9), fill: '#FF8A8A' }); }
    levelLine(ctx, 4.42, 'Mt Whitney ≈ 4,420 m — tallest in the lower 48 US', '#FFD6A0', clamp((t - 69.3) / 0.6) * (1 - clamp((t - 74.6) / 0.4)), [6, 8], 'left');
    const kp = pop(t - 67.4); if (kp > 0) { styledText(ctx, 'TIBETAN PLATEAU', 1200, ALT(4.8) - 90, 52, { k: kp, fill: C.gold, stroke: C.goldDark }); styledText(ctx, 'average ≈ 4,500 m', 1200, ALT(4.8) - 40, 30, { k: kp, fill: '#fff' }); }
    const kh = pop(t - 72.1); if (kh > 0) { styledText(ctx, 'HIMALAYAS', 565, ALT(8.85) - 90, 48, { k: kh, fill: C.gold, stroke: C.goldDark }); styledText(ctx, 'Everest ≈ 8,850 m', 565, ALT(8.85) - 44, 28, { k: kh, fill: '#fff' }); }
    planeSide(ctx, 1000, ALT(CR) + wob(t, 0.5, 4), 260, 0, 1);
  }
  // ---- P7: a dive into rock; oxygen runs out before lower ground (75–85.7)
  if (t >= 75.1 && t < 85.8) {
    const S = [900, ALT(CR)];
    if (t > 75.8) flash(ctx, (t - 75.8) / 0.5, '#FF5050');
    sprite(ctx, 'warning', S[0] + 170, S[1] - 110, 80, { k: win(t, 75.9, 80.4) });
    // straight dive: hits the plateau
    const dive = []; for (let i = 0; i <= 50; i++) { const u = i / 50; dive.push([S[0] + u * 420, S[1] + u * u * (ALT(3) - S[1])]); }
    let hit = dive.length - 1; for (let i = 0; i < dive.length; i++) if (dive[i][1] >= ALT(terrainKm(dive[i][0], 1, t))) { hit = i; break; }
    const dk = clamp((t - 77.8) / 2.6), di = Math.min(hit, Math.floor(dk * dive.length));
    if (dk > 0 && t < 81.2) { ctx.save(); ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 5; ctx.setLineDash([4, 14]); ctx.lineCap = 'round'; ctx.beginPath(); dive.slice(0, di + 1).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); ctx.restore();
      const [x, y] = dive[di]; planeSide(ctx, x, y, 240, 30 * clamp(dk * 2));
      if (di >= hit && t > 80.2) { styledText(ctx, '✕', x, y - 10, 120, { k: pop(t - 80.3), fill: '#FF3B3B', stroke: C.ink }); kinetic(ctx, 'SOLID ROCK', x, y - 120, win(t, 80.3, 81.2), 64); } }
    // the long way: stay high, run east to lower ground — oxygen ends first
    if (t > 81.2) {
      const path = [S, [1100, ALT(6.4)], [1700, ALT(6.4)], [1880, ALT(3)]], sp = catmull(path, 16), u = clamp((t - 81.3) / 3.6);
      const pth = partial(sp, 1); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4; ctx.setLineDash([4, 14]); ctx.lineCap = 'round'; ctx.stroke(pth); ctx.restore();
      const [x, y] = pointAlong(sp, u), [x2, y2] = pointAlong(sp, Math.min(1, u + 0.01)); planeSide(ctx, x, y, 240, Math.atan2(y2 - y, x2 - x) * 180 / Math.PI);
      const ox = 1 - clamp((t - 81.4) / 1.6); gauge(ctx, 1400, 110, 'PASSENGER OXYGEN', ox, pop(t - 81.3), { icon: 'oxygen_mask' });
      if (ox <= 0) kinetic(ctx, 'OXYGEN GONE', W / 2, 250, win(t, 83.1, 85.7), 80);
      chip(ctx, 'LOWER GROUND', 1840, ALT(1.6) - 60, win(t, 84.2, 85.7), { size: 26, stroke: '#7CFC9A' });
    }
  }
  // ---- P8: mountain waves (85.7–100.6)
  if (t >= 85.7 && t < 100.7) {
    const flowK = clamp((t - 91.6) / 1.2);
    if (flowK > 0) for (let j = 0; j < 7; j++) {
      const base = 7.2 + j * 0.9, ph = t * 2.2 + j;
      ctx.save(); ctx.strokeStyle = `rgba(220,245,255,${0.35 + 0.06 * j})`; ctx.lineWidth = 3 + (j % 2); ctx.setLineDash([110, 16]); ctx.lineDashOffset = -t * 160;
      ctx.beginPath();
      for (let x = 0; x <= W * flowK; x += 10) {
        const ridge = Math.exp(-Math.pow((x - 570) / 90, 2)) * (2.6 - j * 0.25);
        const wave = x > 620 ? Math.sin((x - 620) / 150 * Math.PI * 2 - ph * 0.0) * (0.9 - j * 0.08) * clamp((t - 94.3) / 1.4) * Math.exp(-(x - 620) / 1600) : 0;
        const y = ALT(base + ridge + wave); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.restore();
    }
    lab(ctx, 'JET STREAM →', 60, ALT(13.6), 34, win(t, 92.1, 100.5), '#BFE9F5');
    lab(ctx, 'MOUNTAIN WAVES', 1250, ALT(13.6), 34, win(t, 95.1, 100.5), C.gold, 'center');
    const bounce = clamp((t - 95.9) / 0.6), bx = 1100, by = ALT(CR) + Math.sin(t * 5.2) * 46 * bounce + Math.sin(t * 9.1) * 12 * bounce;
    planeSide(ctx, bx, by, 260, Math.cos(t * 5.2) * 9 * bounce);
    kinetic(ctx, '↕ HUNDREDS OF FEET', W / 2, 170, win(t, 98.7, 100.6), 72);
    lab(ctx, 'EXTREME TURBULENCE', W / 2, 140, 52, win(t, 90.6, 95.0), '#FF8A8A', 'center');
  }
  // ---- P9: brutal cold, fuel temperature (100.7–111.3)
  if (t >= 100.7) {
    const cold = clamp((t - 102.3) / 0.8) * (1 - clamp((t - 110.8) / 0.5));
    if (cold > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); g.addColorStop(0, 'rgba(160,220,255,0)'); g.addColorStop(1, `rgba(190,235,255,${0.45 * cold})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    const tk = win(t, 101.0, 111.0); if (tk > 0) { sprite(ctx, 'thermometer', 260, 360, 90, { k: tk }); const lvl = 1 - clamp((t - 102.3) / 0.9); ctx.save(); ctx.fillStyle = '#5DADE2'; const h = 140 * lvl * tk; ctx.fillRect(260 - 6 * tk, 360 + 85 * tk - h - 40 * tk, 12 * tk, h); ctx.restore();
      lab(ctx, 'OUTSIDE ≈ −50 °C', 330, 300, 40, win(t, 102.9, 111.0), '#CFF1FF'); }
    const ft = 1 - 0.78 * clamp((t - 104.0) / 3.6) + (t > 108.8 ? 0.25 * clamp((t - 108.8) / 1.4) : 0);
    gauge(ctx, 1380, 110, 'FUEL TEMPERATURE', ft, win(t, 103.6, 111.0), { stroke: '#5DADE2', limit: 0.15, color: v => v > 0.35 ? '#5DADE2' : '#E63946' });
    lab(ctx, 'FREEZE LIMIT', 1440, 185, 22, win(t, 104.5, 111.0), '#FF8A8A');
    const step = clamp((t - 108.7) / 1.3), py = ALT(CR) + step * 70;
    planeSide(ctx, 1000, py + wob(t, 0.5, 4), 260, step > 0 && step < 1 ? 6 : 0);
    if (step > 0) chip(ctx, 'CHANGE ALTITUDE', 1000, py + 100, win(t, 108.8, 111.0), { size: 28 });
  }
}

// ---------------------------------------------------------------- captions (2–4 words, Mapheld style)
const CAPTIONS = [
  [0.1, 3.0, 'Open a flight map'], [3.1, 5.2, 'Europe and Asia'], [5.3, 10.0, 'Thousands of jets'], [10.2, 12.8, 'But in the middle…'], [12.9, 16.4, 'A blank spot'],
  [16.6, 19.3, 'The Tibetan Plateau'], [19.4, 23.5, 'Roof of the World'], [23.6, 27.9, 'Shorter straight across'], [28.0, 31.9, 'Airlines detour anyway'],
  [32.2, 35.6, 'Not mainly politics'], [35.7, 39.6, 'Physics and survival'],
  [39.8, 44.3, 'Air too thin'], [44.4, 47.2, 'Pressurized cabin'], [47.3, 50.1, 'A window cracks'], [50.2, 53.2, 'Emergency descent'],
  [53.3, 56.3, 'Down to breathable air'], [56.4, 58.9, 'Before masks run out'], [59.0, 62.4, 'Normally: plenty of time'],
  [62.6, 65.3, 'Over Tibet…'], [65.4, 71.9, 'The ground is higher'], [72.0, 74.9, 'Himalayas: higher still'],
  [75.1, 77.7, 'Lose pressure up there'], [77.8, 81.2, 'Dive into solid rock'], [81.3, 85.6, 'Oxygen runs out first'],
  [85.8, 90.0, 'A second danger'], [90.1, 94.2, 'Extreme turbulence'], [94.3, 97.7, 'Violent mountain waves'], [97.8, 100.5, 'Hundreds of feet'],
  [100.8, 103.6, 'Brutally cold air'], [103.7, 108.0, 'Fuel thickens'], [108.1, 111.2, 'Change altitude or route'],
  [111.4, 113.0, 'The final problem'], [113.1, 117.6, 'If anything goes wrong'], [117.7, 119.2, 'Nowhere to land'], [119.3, 123.4, 'Long runways, thick air'],
  [123.5, 126.7, 'Airports too high'], [126.8, 129.5, 'Diversions far away'],
  [129.8, 133.4, 'Flights to Lhasa'], [133.5, 136.9, 'Not ordinary flights'], [137.0, 139.5, 'Extra oxygen, special settings'], [139.6, 142.6, 'Mountain-trained pilots'],
  [142.9, 145.7, 'Everyone else'], [145.8, 149.8, 'Burns extra fuel'],
  [150.1, 154.7, 'Planes curve around'], [154.8, 157.1, 'Not a border'], [157.2, 161.5, 'The tallest ceiling'],
];
function drawText(ctx, t) {
  for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .26, .18); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); }
}
function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, H * 1.0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const secA = clamp((t - 39.7) / 0.9) * (1 - clamp((t - 110.9) / 0.9));
  if (secA < 1) {
    const c = camAt(t);
    drawMap(ctx, c);
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 1.6; ctx.setLineDash([7, 6]);
    for (const iso of Object.keys(GEO.countries)) ctx.stroke(countryPath(c, iso)); ctx.restore();
    sceneRadar(ctx, c, t);
  }
  if (secA > 0) {
    ctx.save(); ctx.globalAlpha = secA;
    const s = lerp(1.08, 1, easeOut(secA)); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
    sceneSection(ctx, t); ctx.restore();
  }
  vignette(ctx);
  drawText(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  const fi = 1 - clamp(t / 0.4), fo = clamp((t - 161.8) / 0.7);
  if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
}

window.renderAt = renderAt;
window.READY = false;
loadAssets().then(() => {
  window.READY = true;
  if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play'), aud = document.getElementById('aud');
  ctl.style.display = 'flex'; if (window.AUDIO) aud.src = window.AUDIO;
  let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); if (window.AUDIO) { if (playing) { aud.currentTime = t; aud.play().catch(() => {}); } else aud.pause(); } };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; if (window.AUDIO) aud.currentTime = t; draw(); };
  const tick = now => { if (playing) { t = window.AUDIO && !aud.paused ? aud.currentTime : t + (now - last) / 1000; last = now; if (t >= DURATION) t = 0; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
