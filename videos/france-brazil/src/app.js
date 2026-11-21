/* France's longest border is with Brazil — Map Warden-style 9:16 explainer. HTML5 Canvas, deterministic.
 * renderAt(t) draws the frame at storyboard time t (seconds, 0–93, as in the script).
 * Assets: window.ASSETS {name: dataURI}, geometry: GEO (geo_data.js).
 */
'use strict';
const W = 1080, H = 1920, DURATION = 56;
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
  europe: [4.0, 46.0, 48],
  border: [1.0, 44.0, 120],
  atlantic: [-26.0, 25.0, 15],
  guiana: [-53.0, 3.2, 125],
  world: [-25.0, 20.0, 12],
  amazon: [-56.0, -1.5, 42],
};
const KEYS = [  // [t, view, zoomMul]
  [0, 'europe', 1], [7.5, 'europe', 1.06], [9.0, 'border', 1], [12.5, 'border', 1.05], [14.5, 'atlantic', 1], [16.6, 'atlantic', 1.04],
  [18.6, 'guiana', 1], [26.0, 'guiana', 1.04], [44.0, 'guiana', 1.08], [46.0, 'world', 1], [51.0, 'world', 1.04], [53.6, 'amazon', 1], [56.0, 'amazon', 1.05],
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
  for (const key of ['world', 'europe', 'guiana']) {
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
  const set = c.z >= 40 ? (c.cx < -20 ? PATHS.guiana : PATHS.europe) : PATHS.world;
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

// ------------------------------------------------------------------ scenes (storyboard time 0–56 s)
function lineFlat(c, r) { const p = new Path2D(); for (let i = 0; i < r.length; i += 2) { const [x, y] = P(c, r[i], r[i + 1]); i ? p.lineTo(x, y) : p.moveTo(x, y); } return p; }
function countryPath(c, iso) { const p = new Path2D(); for (const q of PATHS['c_' + iso]) p.addPath(q, camMatrix(c)); return p; }
function tint(ctx, c, iso, color, a, glow) {
  if (a <= 0 || !PATHS['c_' + iso]) return; const p = countryPath(c, iso);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill(p, 'evenodd');
  if (glow) { ctx.globalAlpha = Math.min(1, a * 2.5); ctx.strokeStyle = glow; ctx.lineWidth = 4; ctx.shadowColor = glow; ctx.shadowBlur = 16; ctx.stroke(p); }
  ctx.restore();
}
function glowBorder(ctx, c, lines, k, color = '#F4D03F') {
  if (k <= 0) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const r of lines) {
    const sp = []; for (let i = 0; i < r.length; i += 2) sp.push(P(c, r[i], r[i + 1]));
    const p = partial(sp, k); if (!p) continue;
    ctx.strokeStyle = color; ctx.globalAlpha = 0.3; ctx.lineWidth = 18; ctx.stroke(p);
    ctx.globalAlpha = 1; ctx.lineWidth = 7; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.stroke(p);
  }
  ctx.restore();
}
function chip(ctx, text, x, y, k, o = {}) {      // dark rounded label chip
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', o.size || 34);
  const w = ctx.measureText(text).width + (o.icon ? 90 : 50), h = (o.size || 34) * 1.7;
  ctx.fillStyle = 'rgba(10,24,32,0.92)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  if (o.icon) { ctx.fillStyle = o.iconColor; ctx.beginPath(); ctx.arc(-w / 2 + 40, 0, 20, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
    if (o.icon === 'x') { ctx.moveTo(-w / 2 + 32, -8); ctx.lineTo(-w / 2 + 48, 8); ctx.moveTo(-w / 2 + 48, -8); ctx.lineTo(-w / 2 + 32, 8); }
    else { ctx.moveTo(-w / 2 + 31, 1); ctx.lineTo(-w / 2 + 38, 8); ctx.lineTo(-w / 2 + 50, -8); } ctx.stroke(); }
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, o.icon ? 22 : 0, 2);
  if (o.strike) { ctx.strokeStyle = '#FF5A5F'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-w / 2 + 70, 0); ctx.lineTo(lerp(-w / 2 + 70, w / 2 - 20, clamp(o.strike)), 0); ctx.stroke(); }
  ctx.restore();
}

function sceneHook(ctx, c, t) {          // 0–9: which country shares France's longest land border?
  if (t > 9.4) return;
  const ex = popOut(9.2 - t);
  tint(ctx, c, 'FRA_EU', '#F4D03F', 0.3 * clamp((t - 0.3) / 0.6) * ex, '#F4D03F');
  mapLabel(ctx, c, 2.0, 48.9, 'FRANCE', 56, win(t, 0.4, 9.0));
  sprite(ctx, 'french_man', ...P(c, 2.6, 43.9), 190, { k: win(t, 0.8, 9.0), ay: 1 });
  styledText(ctx, '?', ...P(c, 6.8, 47.8), 140, { k: win(t, 1.6, 6.0), fill: C.gold, stroke: C.ink });
  const [sx, sy] = P(c, -4.2, 42.4), [gx, gy] = P(c, 10.4, 51.0);
  tint(ctx, c, 'ESP', '#AA151B', 0.25 * win(t, 3.6, 6.2));
  tint(ctx, c, 'DEU', '#DD0000', 0.25 * win(t, 4.4, 6.2));
  sprite(ctx, 'marker_esp', sx, sy, 130, { k: win(t, 3.6, 6.2), ay: 0.95 }); chip(ctx, 'SPAIN?', sx, sy + 50, win(t, 3.7, 6.2));
  sprite(ctx, 'marker_deu', gx, gy, 130, { k: win(t, 4.4, 6.2), ay: 0.95 }); chip(ctx, 'GERMANY?', gx, gy + 50, win(t, 4.5, 6.2));
  // the answer: Brazil
  const kb = win(t, 6.3, 9.0);
  if (kb > 0) {
    ctx.save(); ctx.translate(W / 2, 360); ctx.scale(kb, kb);
    ctx.fillStyle = 'rgba(10,24,32,0.94)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-230, -200, 460, 400, 30); ctx.fill(); ctx.stroke();
    ctx.restore();
    sprite(ctx, 'marker_bra', W / 2, 330, 200, { k: kb, ay: 0.5 });
    styledText(ctx, 'BRAZIL', W / 2, 500, 80, { k: kb, fill: C.gold, stroke: C.goldDark });
    styledText(ctx, '!', W / 2 + 200, 220, 160, { k: win(t, 6.6, 9.0), fill: C.gold, stroke: C.ink, rot: 10 });
  }
}

function sceneSpain(ctx, c, t) {         // 9–14.5: the Spain border, just under 400 miles
  if (t < 8.8 || t > 15) return;
  const ex = popOut(14.8 - t);
  tint(ctx, c, 'FRA_EU', '#F4D03F', 0.2 * ex);
  tint(ctx, c, 'ESP', '#AA151B', 0.22 * ex);
  glowBorder(ctx, c, GEO.fraEsp, clamp((t - 9.4) / 1.6) * ex);
  mapLabel(ctx, c, 1.6, 44.6, 'FRANCE', 52, win(t, 9.2, 14.6)); mapLabel(ctx, c, -1.2, 42.7, 'SPAIN', 52, win(t, 9.3, 14.6));
  const n = Math.round(387 * easeOut((t - 10.4) / 1.6));
  styledText(ctx, `${n} Miles`, W / 2, 330, 140, { k: win(t, 10.2, 14.6), fill: C.yellow, stroke: C.goldDark, rot: -3 });
}

function sceneAtlantic(ctx, c, t) {      // 14.5–18.6: thousands of miles away
  if (t < 14.2 || t > 19) return;
  const ex = popOut(18.8 - t);
  const a = P(c, ...GEO.paris), b = P(c, ...GEO.cayenne), mid = [(a[0] + b[0]) / 2 - 40, (a[1] + b[1]) / 2 - 220];
  const k = clamp((t - 14.8) / 1.4) * ex;
  if (k > 0) {
    ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(...a);
    for (let i = 1; i <= 30; i++) { const q = i / 30 * k; ctx.lineTo((1 - q) * (1 - q) * a[0] + 2 * (1 - q) * q * mid[0] + q * q * b[0], (1 - q) * (1 - q) * a[1] + 2 * (1 - q) * q * mid[1] + q * q * b[1]); }
    ctx.stroke(); ctx.restore();
    for (const p of [a, b]) { ctx.save(); ctx.globalAlpha = ex; ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(p[0], p[1], 10, 0, 7); ctx.fill(); ctx.restore(); }
  }
  chip(ctx, '4,000+ MILES', mid[0] + 40, mid[1] + 70, win(t, 15.4, 18.6), { fill: C.gold });
  styledText(ctx, 'ATLANTIC OCEAN', ...P(c, -38, 30), 34, { k: win(t, 14.8, 18.6), fill: '#BFD8E0', shadow: 2 });
}

function sceneGuiana(ctx, c, t) {        // 18.6–44: the longer border + French Guiana is France
  if (t < 18.4 || t > 45.8) return;
  const ex = popOut(45.6 - t);
  tint(ctx, c, 'GUF', '#F4D03F', 0.3 * clamp((t - 18.8) / 0.6) * ex, '#F4D03F');
  tint(ctx, c, 'BRA', '#009C3B', 0.16 * clamp((t - 19.0) / 0.6) * ex);
  glowBorder(ctx, c, GEO.gufBra, clamp((t - 19.6) / 1.8) * ex);
  mapLabel(ctx, c, -50.8, 1.9, 'BRAZIL', 54, win(t, 19.2, 26.0));
  // 453 vs 387 comparison (the Brazil border is longer)
  const n = Math.round(453 * easeOut((t - 20.2) / 1.6));
  styledText(ctx, `${n} Miles`, W / 2, 500, 120, { k: win(t, 20.0, 23.6), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  const kc = win(t, 21.8, 26.0);
  if (kc > 0) {
    ctx.save(); ctx.globalAlpha = clamp(kc); ctx.translate(W / 2, 250);
    ctx.fillStyle = 'rgba(10,24,32,0.94)'; ctx.strokeStyle = 'rgba(244,208,63,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-440, -130, 880, 260, 24); ctx.fill(); ctx.stroke();
    ctx.restore();
    styledText(ctx, "FRANCE'S LONGEST LAND BORDERS", W / 2, 155, 30, { k: kc, fill: '#BFD8E0', shadow: 0 });
    const g = easeOut((t - 22.0) / 1.0);
    ctx.save(); ctx.globalAlpha = clamp(kc);
    ctx.fillStyle = '#E8DFC0'; ctx.fillRect(W / 2 - 250, 205, 480 * 387 / 453 * g, 36);
    ctx.fillStyle = '#F4D03F'; ctx.fillRect(W / 2 - 250, 275, 480 * g, 36); ctx.restore();
    styledText(ctx, 'Spain', W / 2 - 330, 223, 32, { k: kc, shadow: 0 }); styledText(ctx, 'Brazil', W / 2 - 330, 293, 32, { k: kc, shadow: 0 });
    styledText(ctx, '387 mi', W / 2 + 330, 223, 32, { k: kc, shadow: 0 }); styledText(ctx, '453 mi', W / 2 + 330, 293, 32, { k: kc, fill: C.gold, shadow: 0 });
  }
  const [gx, gy] = P(c, -53.1, 4.3);
  chip(ctx, 'FRENCH GUIANA', gx, gy - 150, win(t, 26.2, 44.8), { size: 30 });
  chip(ctx, "SOUTH AMERICA'S NORTHERN COAST", W / 2, gy + 330, win(t, 27.0, 31.0), { size: 24 });
  // not a colony, not semi-independent
  chip(ctx, 'A colony', W / 2, 260, win(t, 28.6, 33.0), { icon: 'x', iconColor: '#E63946', strike: (t - 29.0) / 0.4 });
  chip(ctx, 'Semi-independent', W / 2, 360, win(t, 29.6, 33.0), { icon: 'x', iconColor: '#E63946', strike: (t - 30.0) / 0.4 });
  chip(ctx, 'Overseas department of France', W / 2, 260, win(t, 33.0, 43.4), { icon: 'check', iconColor: '#F4D03F', fill: C.gold });
  // Paris = Cayenne
  const kp = win(t, 34.4, 37.2);
  if (kp > 0) {
    ctx.save(); ctx.translate(W / 2, 440); ctx.scale(kp, kp);
    ctx.fillStyle = 'rgba(10,24,32,0.94)'; ctx.strokeStyle = 'rgba(244,208,63,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-330, -110, 660, 220, 22); ctx.fill(); ctx.stroke();
    ctx.restore();
    styledText(ctx, 'Paris', W / 2 - 200, 440, 46, { k: kp }); styledText(ctx, '=', W / 2, 440, 90, { k: kp, fill: C.gold, stroke: C.goldDark });
    styledText(ctx, 'Cayenne', W / 2 + 200, 440, 46, { k: kp }); styledText(ctx, 'BOTH FRANCE', W / 2, 515, 24, { k: kp, fill: '#BFD8E0', shadow: 0 });
  }
  // resident: vote, euro, passport
  sprite(ctx, 'guiana_resident', 820, 1160, 260, { k: win(t, 37.2, 44.6), ay: 1 });
  [['icon_vote', 'FRENCH VOTE', 37.8], ['icon_euro', 'THE EURO', 39.4], ['icon_passport', 'PASSPORT', 40.6]].forEach(([n, lab, t0], i) => {
    const x = 200 + i * 230, k = win(t, t0, 44.0);
    sprite(ctx, n, x, 420, 170, { k });
    styledText(ctx, lab, x, 535, 26, { k, shadow: 2 });
  });
}

function sceneSpace(ctx, c, t) {         // 41.8–46: Europe's gateway to space
  if (t < 41.6 || t > 46.4) return;
  const [kx, ky] = P(c, ...GEO.kourou);
  chip(ctx, 'KOUROU SPACEPORT', kx, ky + 80, win(t, 41.8, 46.0), { size: 26 });
  const up = easeIn((t - 43.4) / 2.2);
  const ry = ky - 60 - up * 1500;
  if (t > 43.4) {      // exhaust trail
    ctx.save(); const g = ctx.createLinearGradient(0, ry, 0, ky); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(kx - 10, ry + 80, 20, ky - ry - 80); ctx.restore();
    ctx.save(); ctx.fillStyle = '#FFB703'; ctx.beginPath(); ctx.moveTo(kx - 18, ry + 70); ctx.lineTo(kx, ry + 120 + Math.sin(t * 40) * 10); ctx.lineTo(kx + 18, ry + 70); ctx.fill(); ctx.restore();
  }
  sprite(ctx, 'rocket', kx, ry, 70, { k: pop(t - 42.0) });
  if (t > 43.4 && t < 44.6) puff(ctx, kx, ky - 20, 160, (t - 43.4) / 1.2, 5);
  styledText(ctx, "EUROPE'S GATEWAY\nTO SPACE", W / 2, 330, 80, { k: win(t, 43.6, 46.0), fill: C.yellow, stroke: C.goldDark, rot: -3 });
}

function sceneEnding(ctx, c, t) {        // 46–56: France's biggest neighbour isn't in Europe
  if (t < 45.8) return;
  const a = P(c, ...GEO.paris), b = P(c, ...GEO.cayenne);
  const k = clamp((t - 46.4) / 1.2) * popOut(52.4 - t);
  if (k > 0) {
    ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.beginPath(); ctx.moveTo(...a);
    const mid = [(a[0] + b[0]) / 2 - 30, (a[1] + b[1]) / 2 - 160];
    for (let i = 1; i <= 30; i++) { const q = i / 30 * k; ctx.lineTo((1 - q) * (1 - q) * a[0] + 2 * (1 - q) * q * mid[0] + q * q * b[0], (1 - q) * (1 - q) * a[1] + 2 * (1 - q) * q * mid[1] + q * q * b[1]); }
    ctx.stroke(); ctx.restore();
    for (const p of [a, b]) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, 7); ctx.fill(); ctx.restore(); }
    mapLabel(ctx, c, 2.4, 52.0, 'FRANCE', 30, k); mapLabel(ctx, c, -53, 9, 'FRENCH GUIANA', 26, k);
  }
  chip(ctx, "FRANCE'S BIGGEST NEIGHBOR?", W / 2, 520, win(t, 46.6, 52.4), { size: 28 });
  chip(ctx, 'NOT IN EUROPE', ...P(c, 6, 58), win(t, 48.8, 52.4), { icon: 'x', iconColor: '#E63946', size: 26 });
  // Amazon finale
  const ka = clamp((t - 52.6) / 0.8);
  if (ka > 0) {
    tint(ctx, c, 'BRA', '#2E7D32', 0.45 * ka); tint(ctx, c, 'GUF', '#F4D03F', 0.3 * ka, '#F4D03F');
    mapLabel(ctx, c, -54, -6, 'BRAZIL', 80, ka); chip(ctx, 'AMAZON RAINFOREST', ...P(c, -58, -13.5), pop(t - 53.0), { size: 28 });
    mapLabel(ctx, c, -53, 5.6, 'FRENCH GUIANA', 30, ka);
    sprite(ctx, 'brazilian', ...P(c, -62, -9.5), 240, { k: pop(t - 53.4), ay: 1 });
    sprite(ctx, 'guiana_resident', ...P(c, -46.5, 6.0), 200, { k: pop(t - 53.7), ay: 1 });
  }
}

const CAPTIONS = [
  [0.3, 2.6, 'Ask anyone'], [2.7, 4.4, "France's longest land border?"], [4.5, 6.2, 'Spain? Germany?'], [6.3, 9.0, "It's Brazil"],
  [9.2, 12.2, 'France–Spain border'], [12.3, 14.4, 'Just under 400 miles'], [14.6, 18.6, 'Thousands of miles away'],
  [18.8, 23.6, 'An even longer border'], [23.8, 28.4, 'Because of French Guiana'], [28.5, 33.0, 'Not a colony'],
  [33.1, 37.2, 'Officially France'], [37.3, 41.8, 'French votes, euros, passports'], [41.9, 46.0, 'Europe’s gateway to space'],
  [46.2, 49.6, "France's biggest neighbor"], [49.7, 52.6, "…isn't in Europe"], [52.7, 56.0, 'Deep in the Amazon'],
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
  ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 1.6; ctx.setLineDash([7, 6]);
  for (const iso of ['FRA_EU', 'ESP', 'DEU', 'BRA', 'GUF', 'SUR']) if (PATHS['c_' + iso]) ctx.stroke(countryPath(c, iso)); ctx.restore();
  vignette(ctx);
  sceneHook(ctx, c, t); sceneSpain(ctx, c, t); sceneAtlantic(ctx, c, t); sceneGuiana(ctx, c, t); sceneSpace(ctx, c, t); sceneEnding(ctx, c, t);
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
