/* The Gambia — Map Warden-style 9:16 explainer. HTML5 Canvas, deterministic.
 * renderAt(t) draws the frame at storyboard time t (seconds, 0–93, as in the script).
 * Assets: window.ASSETS {name: dataURI}, geometry: GEO (geo_data.js).
 */
'use strict';
const W = 1080, H = 1920, DURATION = 67;
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
  mouth: [-16.45, 13.45, 1500],
  westAfrica: [-12.5, 13.6, 62],
  gambia: [-15.2, 13.5, 330],
  east: [-14.4, 13.5, 700],
};
const KEYS = [  // [t, view, zoomMul]
  [0, 'mouth', 1], [5.5, 'mouth', 1.06], [8.0, 'westAfrica', 1], [10.5, 'westAfrica', 1.05], [13.0, 'gambia', 1], [17.5, 'gambia', 1.02],
  [29.0, 'gambia', 1.0], [35.0, 'gambia', 1.03], [45.0, 'gambia', 1.0], [47.0, 'east', 1], [52.0, 'east', 1.05], [54.0, 'gambia', 0.95],
  [62.5, 'gambia', 0.98], [67.0, 'westAfrica', 1.6],
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

// ------------------------------------------------------------------ scenes (storyboard time 0–67 s)
const ROUTE = []; for (let i = 0; i < GEO.route.length; i += 2) ROUTE.push([GEO.route[i], GEO.route[i + 1]]);
const KM = (c, lat = 13.5) => c.z / 111.32 * (1 / Math.cos(lat * Math.PI / 180));   // px per km (Mercator)

function offsetLine(sp, d) {
  return sp.map((p, i) => {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [p[0] - dy / L * d, p[1] + dx / L * d];
  });
}
function smoothPts(pts, n = 6) {
  const out = [], Q = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < Q.length - 2; i++) for (let j = 0; j < n; j++) {
    const t = j / n, t2 = t * t, t3 = t2 * t, a = Q[i - 1], b = Q[i], c2 = Q[i + 1], d = Q[i + 2];
    out.push([0, 1].map(k => 0.5 * (2 * b[k] + (-a[k] + c2[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c2[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c2[k] + d[k]) * t3)));
  }
  out.push(Q[Q.length - 2]); return out;
}
function countryPath(c, iso) { const p = new Path2D(); for (const q of PATHS['c_' + iso]) p.addPath(q, camMatrix(c)); return p; }
function tint(ctx, c, iso, color, a, glow) {
  if (a <= 0) return; const p = countryPath(c, iso);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill(p, 'evenodd');
  if (glow) { ctx.globalAlpha = Math.min(1, a * 2.5); ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.shadowColor = glow; ctx.shadowBlur = 18; ctx.stroke(p); }
  ctx.restore();
}
function gambiaFlagFill(ctx, c, k, clipX) {     // the Gambia filled with its flag colours, optionally revealed up to clipX
  if (k <= 0) return; const p = countryPath(c, 'GMB');
  ctx.save(); ctx.clip(p, 'evenodd'); if (clipX !== undefined) { ctx.beginPath(); ctx.rect(0, 0, clipX, H); ctx.clip(); }
  const [, y0] = P(c, -15, 13.83), [, y1] = P(c, -15, 13.06), h = y1 - y0;
  ctx.globalAlpha = 0.8 * k;
  [['#CE1126', 0, 6], ['#FFFFFF', 6, 6], ['#0C1C8C', 7, 4], ['#3A7728', 12, 6]].forEach(([col, a, b]) => { ctx.fillStyle = col; ctx.fillRect(0, y0 + h * a / 18, W, h * b / 18 + 1); });
  ctx.restore();
}
function stamp(ctx, text, x, y, size, color, k, rot = -12) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180); const sc = k < 1 ? 1 + (1 - k) * 1.5 : 1; ctx.scale(sc, sc);
  ctx.globalAlpha = clamp(k * 1.5); setFont(ctx, 'Montserrat', size); const w = ctx.measureText(text).width + size * 0.8, h = size * 1.35;
  ctx.strokeStyle = color; ctx.lineWidth = size * 0.1; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, size * 0.18); ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, size * 0.04); ctx.restore();
}

function sceneColdOpen(ctx, c, t) {        // 0–5.5
  if (t > 6.2) return;
  const ex = popOut(6.0 - t);
  const [rx, ry] = P(c, -16.45, 13.43);
  sprite(ctx, 'british_officer', 300, ry + 130 + wob(t, 1.3, 6), 380, { k: pop(t - 0.2) * ex, ay: 1 });
  bubble(ctx, 300, ry - 590, 'OURS!', 70, [0, 90], win(t, 0.5, 2.6));
  sprite(ctx, 'french_woman', 820, 820 + wob(t, 1.3, 6, 1), 340, { k: pop(t - 2.2) * ex, ay: 1 });
  bubble(ctx, 640, 200, '…as far as your cannons reach', 40, [170, 90], win(t, 2.5, 5.6));
}

function sceneHook(ctx, c, t) {            // 5.5–17.5
  if (t < 6 || t > 18.2) return;
  const ex = popOut(18.0 - t);
  tint(ctx, c, 'SEN', '#00853F', 0.18 * clamp((t - 9.0) / 0.8) * ex);
  tint(ctx, c, 'GMB', '#FFD43B', 0.55 * clamp((t - 8.4) / 0.6) * ex, '#FFD43B');
  if (t < 12.8) { mapLabel(ctx, c, -14.5, 15.6, 'SENEGAL', 60, win(t, 9.0, 12.6)); mapLabel(ctx, c, -14.0, 10.5, 'WEST AFRICA', 44, win(t, 8.2, 12.6)); }
  else { mapLabel(ctx, c, -14.9, 14.35, 'SENEGAL', 64, win(t, 13.2, 17.8)); mapLabel(ctx, c, -14.9, 12.75, 'SENEGAL', 48, win(t, 13.4, 17.8)); }
  const [gx, gy] = P(c, -15.0, 13.47);
  sprite(ctx, 'marker_gmb', gx, gy - 30, 140, { k: win(t, 13.0, 17.8), ay: 0.95 });
  styledText(ctx, 'THE GAMBIA', gx, gy + 110, 62, { k: win(t, 13.3, 17.8), fill: C.gold, stroke: C.goldDark });
  styledText(ctx, 'SMALLEST COUNTRY\nIN MAINLAND AFRICA', W / 2, 330, 84, { k: win(t, 14.4, 17.8), fill: C.yellow, stroke: C.goldDark, rot: -3 });
}

function sceneLegend(ctx, c, t) {          // 17.5–35
  if (t < 17.5 || t > 35.5) return;
  const sepia = clamp((t - 17.6) / 0.6) * (1 - clamp((t - 30.6) / 0.5));
  if (sepia > 0) { ctx.save(); ctx.globalAlpha = 0.38 * sepia; ctx.fillStyle = '#7A5C2E'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  stamp(ctx, 'LEGEND', W / 2, 300, 96, '#E9D8A6', win(t, 17.8, 30.4, 0.35, 0.3), -6);
  const sp = ROUTE.map(p => P(c, p[0], p[1]));
  const u = easeIO((t - 18.6) / 10.0);
  const [bx, by] = pointAlong(sp, clamp(u));
  // country "grows" behind the boat
  if (t < 31.2) gambiaFlagFill(ctx, c, clamp((t - 18.6) / 0.5) * (1 - clamp((t - 30.6) / 0.6)), bx);
  // shots every ~0.9 s, alternating banks
  const fade = 1 - clamp((t - 30.6) / 0.6);
  for (let i = 0; i < 12; i++) {
    const ts = 19.0 + i * 0.85; if (t < ts || ts > 29) continue;
    const us = easeIO((ts - 18.6) / 10.0), [sx, sy] = pointAlong(sp, clamp(us)), [sx2, sy2] = pointAlong(sp, clamp(us + 0.01));
    const dx = sx2 - sx, dy = sy2 - sy, L = Math.hypot(dx, dy) || 1, side = i % 2 ? 1 : -1, d = 10 * KM(c);
    const lx = sx - dy / L * d * side, ly = sy + dx / L * d * side;
    const fly = clamp((t - ts) / 0.45);
    ctx.save(); ctx.globalAlpha = fade; ctx.strokeStyle = '#FFE8A3'; ctx.lineWidth = 4; ctx.setLineDash([10, 9]);
    ctx.beginPath(); const mx = (sx + lx) / 2, my = (sy + ly) / 2 - 60; ctx.moveTo(sx, sy);
    for (let k = 1; k <= 20; k++) { const q = k / 20 * fly; ctx.lineTo((1 - q) * (1 - q) * sx + 2 * (1 - q) * q * mx + q * q * lx, (1 - q) * (1 - q) * sy + 2 * (1 - q) * q * my + q * q * ly); }
    ctx.stroke(); ctx.restore();
    if (fly >= 1) { puff(ctx, lx, ly, 70, (t - ts - 0.45) / 1.2, i + 3); ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = '#FF6B3D'; ctx.beginPath(); ctx.arc(lx, ly, 9, 0, 7); ctx.fill(); ctx.restore(); }
    if (t - ts < 0.25) { ctx.save(); ctx.fillStyle = `rgba(255,220,120,${1 - (t - ts) / 0.25})`; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 7); ctx.fill(); ctx.restore(); }
  }
  if (t > 18.2 && t < 30.8) sprite(ctx, 'gunboat', bx, by - 60 + Math.sin(t * 3) * 3, 380, { k: pop(t - 18.2) * fade });
  // MYTH
  if (t > 30.4) { stamp(ctx, 'MYTH', W / 2, 760, 170, '#FF3B47', clamp((t - 30.5) / 0.25) * popOut(35.2 - t), -14); }
  styledText(ctx, 'No evidence it happened', W / 2, 1000, 50, { k: win(t, 31.6, 35.2), fill: C.white, stroke: C.ink });
}

function sceneTruth(ctx, c, t) {           // 35–52
  if (t < 35 || t > 52.5) return;
  const kd = win(t, 36.0, 41.6);
  if (kd > 0) { ctx.save(); ctx.globalAlpha = 0.4 * clamp(kd); ctx.fillStyle = '#071C2A'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  styledText(ctx, '1889', W / 2, 300, 150, { k: win(t, 35.4, 39.4, 0.4), font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark });
  sprite(ctx, 'british_diplomat', 280, 1000, 340, { k: kd, ay: 1 });
  sprite(ctx, 'french_diplomat', 800, 1000, 340, { k: win(t, 36.3, 41.6), ay: 1 });
  sprite(ctx, 'treaty_1889', W / 2, 1110, 250, { k: win(t, 37.0, 41.6), rot: wob(t, 0.7, 3) });
  // 10 km strip on each bank
  const ks = clamp((t - 41.6) / 1.8) * popOut(52.2 - t);
  if (ks > 0) {
    const coarse = ROUTE.filter((_, i) => i % 7 === 0 || i === ROUTE.length - 1);
    const sp = smoothPts(coarse.map(p => P(c, p[0], p[1]))), d = 10 * KM(c);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(244,208,63,0.28)'; ctx.lineWidth = 2 * d; ctx.stroke(partial(sp, ks));
    ctx.setLineDash([12, 9]); ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
    for (const s of [-1, 1]) ctx.stroke(partial(offsetLine(sp, s * d), ks));
    ctx.restore();
    styledText(ctx, '10 KM\nEACH SIDE', W / 2, 330, 120, { k: win(t, 42.2, 46.0), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  }
  // surveyors trace the border
  if (t > 45.2) {
    const kb = clamp((t - 46.6) / 4.6);
    const p = countryPath(c, 'GMB');
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * 0.05 + kb * W * 1.2, H); ctx.clip();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 14; ctx.stroke(p); ctx.restore();
    sprite(ctx, 'surveyor', lerp(160, 900, kb), 1260, 330, { k: win(t, 45.6, 52.2), ay: 1, flip: false });
  }
}

function sceneResult(ctx, c, t) {          // 52–67
  if (t < 52.5) return;
  const ex = popOut(62.6 - t);
  gambiaFlagFill(ctx, c, clamp((t - 52.6) / 0.6));
  const p = countryPath(c, 'GMB'); ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.globalAlpha = clamp((t - 52.6) / 0.6); ctx.stroke(p); ctx.restore();
  // length bracket
  const a = P(c, -16.82, 14.0), b = P(c, -13.79, 14.0), kl = win(t, 53.0, 62.4);
  if (kl > 0) { ctx.save(); ctx.globalAlpha = clamp(kl); ctx.strokeStyle = C.gold; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(a[0], a[1] + 16); ctx.lineTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], easeOut((t - 53) / 1.2)), b[1]); ctx.stroke();
    if (t > 54.2) { ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0], b[1] + 16); ctx.stroke(); } ctx.restore();
    styledText(ctx, '~320 KM LONG', W / 2, a[1] - 70, 76, { k: kl, fill: C.yellow, stroke: C.goldDark }); }
  // width bracket
  const w0 = P(c, -16.0, 13.83), w1 = P(c, -16.0, 13.06), kw = win(t, 56.2, 62.4);
  if (kw > 0) { ctx.save(); ctx.globalAlpha = clamp(kw); ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(w0[0] - 14, w0[1]); ctx.lineTo(w0[0] + 14, w0[1]); ctx.moveTo(w0[0], w0[1]); ctx.lineTo(w1[0], w1[1]); ctx.moveTo(w1[0] - 14, w1[1]); ctx.lineTo(w1[0] + 14, w1[1]); ctx.stroke(); ctx.restore();
    styledText(ctx, 'UNDER 50 KM WIDE', W / 2, w1[1] + 90, 66, { k: kw, fill: '#FF8A8A', stroke: C.ink }); }
  tint(ctx, c, 'SEN', '#00853F', 0.3 * clamp((t - 59.0) / 0.8), '#4ADE80');
  mapLabel(ctx, c, -14.9, 14.5, 'SENEGAL', 60, win(t, 59.2, 66.8));
  sprite(ctx, 'marker_sen', ...P(c, -15.6, 14.6), 120, { k: win(t, 59.4, 66.8), ay: 0.95 });
  // sunset ending
  const ks = clamp((t - 62.6) / 1.4);
  if (ks > 0) { ctx.save(); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(255,140,60,${0.35 * ks})`); g.addColorStop(1, `rgba(120,40,90,${0.3 * ks})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

const CAPTIONS = [
  [0.4, 2.2, 'This river is OURS.'], [2.3, 5.5, 'As far as your cannons reach'],
  [6.0, 10.8, 'A snake-shaped country'], [10.9, 14.2, 'Following a river'], [14.3, 17.4, 'The smallest in mainland Africa'],
  [17.7, 22.5, 'The popular story…'], [22.6, 29.0, 'Where cannonballs landed'], [29.2, 31.4, '…one problem'],
  [35.3, 39.4, 'The real border: a deal'], [39.5, 45.0, 'The river + 10 km each side'], [45.2, 52.0, 'Surveyors traced every bend'],
  [52.4, 56.0, 'About 320 km long'], [56.1, 59.0, '…under 50 km wide'], [59.1, 62.4, 'Wrapped by Senegal'],
  [62.6, 67.0, 'No cannons. Just a river.'],
];
function drawText(ctx, t) {
  for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .26, .18); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 960 }); }
}
function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
const SHAKES = [30.5];
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = camAt(t);
  for (const s of SHAKES) if (t >= s && t < s + 0.3) { const a = 16 * (1 - (t - s) / 0.3), r = rnd(Math.floor(t * 60)); c.sx += (r() - .5) * 2 * a; c.sy += (r() - .5) * 2 * a; }
  drawMap(ctx, c);
  // national borders (subtle) + the river
  ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
  for (const iso of ['SEN', 'GMB', 'GNB', 'MLI', 'MRT', 'GIN']) if (PATHS['c_' + iso]) ctx.stroke(countryPath(c, iso)); ctx.restore();
  const rp = partial(ROUTE.map(p => P(c, p[0], p[1])), 1); ctx.save(); ctx.strokeStyle = '#3F8FB0'; ctx.lineWidth = Math.max(4, 2.2 * KM(c)); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(rp); ctx.restore();
  vignette(ctx);
  sceneColdOpen(ctx, c, t); sceneHook(ctx, c, t); sceneLegend(ctx, c, t); sceneTruth(ctx, c, t); sceneResult(ctx, c, t);
  drawText(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}

window.renderAt = renderAt;
window.READY = false;
loadAssets().then(() => {
  window.READY = true;
  const params = new URLSearchParams(location.search);
  if (params.has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  ctl.style.display = 'flex';
  let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; draw(); };
  const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t -= DURATION; last = now; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
