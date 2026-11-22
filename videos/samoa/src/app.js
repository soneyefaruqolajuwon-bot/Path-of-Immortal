/* Samoa: the country that skipped a Friday — Mapheld 9:16 explainer. HTML5 Canvas, deterministic.
 * renderAt(t) draws the frame at storyboard time t (seconds). Longitudes are 0..360 (antimeridian-safe).
 * Assets: window.ASSETS {name: dataURI}, geometry: GEO (geo_data.js).
 */
'use strict';
const W = 1080, H = 1920, DURATION = 68;
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
  pacific: [168.0, -29.0, 18],
  line: [188.3, -13.9, 160],
  east: [194.0, -13.0, 40],
  samoa: [188.55, -14.6, 300],
};
const KEYS = [  // [t, view, zoomMul]
  [0, 'pacific', 1], [5.8, 'pacific', 1.06], [8.6, 'line', 1], [13.2, 'line', 1.05], [15.2, 'east', 1], [19.6, 'east', 1.04],
  [22.0, 'pacific', 1], [43.4, 'pacific', 1.07], [45.8, 'line', 1], [57.4, 'line', 1.06], [59.6, 'samoa', 1], [68, 'samoa', 1.06],
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
  for (const key of ['pac', 'near']) {
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
  const set = c.z > 60 ? PATHS.near : PATHS.pac;
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

// ------------------------------------------------------------------ scenes (storyboard time 0–68 s)
const PL = GEO.places;
function countryPath(c, iso) { const p = new Path2D(); for (const q of PATHS['c_' + iso]) p.addPath(q, camMatrix(c)); return p; }
function tint(ctx, c, iso, color, a, glow) {
  if (a <= 0 || !PATHS['c_' + iso]) return; const p = countryPath(c, iso);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill(p, 'evenodd');
  if (glow) { ctx.globalAlpha = Math.min(1, a * 2.2); ctx.strokeStyle = glow; ctx.lineWidth = 4; ctx.shadowColor = glow; ctx.shadowBlur = 16; ctx.stroke(p); }
  ctx.restore();
}
function chip(ctx, text, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (o.rot) ctx.rotate(o.rot * Math.PI / 180); setFont(ctx, 'Montserrat', o.size || 30);
  const w = ctx.measureText(text).width + 46, h = (o.size || 30) * 1.75;
  ctx.fillStyle = o.bg || 'rgba(10,24,32,0.92)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2); ctx.restore();
}
function goldLabel(ctx, text, x, y, size, k) { styledText(ctx, text, x, y, size, { k, fill: C.gold, stroke: C.goldDark, shadow: 5 }); }
function title(ctx, text, y, k, size = 120) { styledText(ctx, text, W / 2, y, size, { k, font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark }); }
function kinetic(ctx, text, y, k, size = 120, rot = -3) { styledText(ctx, text, W / 2, y, size, { k, fill: C.yellow, stroke: C.goldDark, rot }); }
function star(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); }
function dot(ctx, x, y, r, k = 1, col = '#fff') { if (k <= 0) return; ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r * k, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }

// day badge: a little calendar-tab "SUN" / "MON" over a place
function dayBadge(ctx, x, y, day, k, col, o = {}) {
  if (k <= 0.001) return;
  const s = o.size || 46;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', s);
  const w = Math.max(ctx.measureText(day).width + 50, s * 2.6), h = s * 1.9;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -h + 8, w, h, 14); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-w / 2 + 3, -h + 3, w - 6, h * 0.26, [11, 11, 0, 0]); ctx.fill();
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(day, 0, -h * 0.42);
  ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(0, 16); ctx.lineTo(12, -2); ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
}
// ------------------------------------------------------------------ the International Date Line (old ↔ new)
const IDL_OLD_CTRL = [[-5.84, 190.6], [-8.0, 186.4], [-11.0, 185.7], [-13.5, 185.7], [-15.6, 186.5], [-17.3, 187.5]];
function oldX(lat) {
  const q = IDL_OLD_CTRL;
  if (lat >= q[0][0] || lat <= q[q.length - 1][0]) return null;
  for (let i = 0; i < q.length - 1; i++) if (lat <= q[i][0] && lat >= q[i + 1][0]) { const f = (lat - q[i][0]) / (q[i + 1][0] - q[i][0]); return lerp(q[i][1], q[i + 1][1], easeIO(f) * 0.3 + f * 0.7); }
  return null;
}
const IDL_NEW = GEO.idlNew;
const IDL_OLD = IDL_NEW.map(([x, y]) => { const ox = oldX(y); return [ox === null ? x : ox, y]; });
function idlAt(m) { return IDL_NEW.map((p, i) => [lerp(IDL_OLD[i][0], p[0], m), p[1]]); }
let MORPH = 0;          // 0 = pre-2011 line, 1 = today's line
function drawIDL(ctx, c, t, emph) {
  const sp = idlAt(MORPH).map(p => P(c, p[0], p[1]));
  const path = partial(sp, 1); if (!path) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (emph > 0) { ctx.globalAlpha = 0.35 * emph; ctx.strokeStyle = C.cyan; ctx.lineWidth = 26; ctx.stroke(path); ctx.globalAlpha = 1; }
  ctx.setLineDash([22, 16]); ctx.lineDashOffset = -t * 30;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 9; ctx.stroke(path);
  ctx.strokeStyle = emph > 0 ? '#E8FDFF' : '#F4F1E6'; ctx.lineWidth = 5 + 2 * emph; ctx.stroke(path);
  ctx.restore();
}
// screen x of the line at a given latitude (for side labels)
function idlScreenAt(c, lat) {
  const pts = idlAt(MORPH);
  for (let i = 0; i < pts.length - 1; i++) if (lat <= pts[i][1] && lat >= pts[i + 1][1]) { const f = (lat - pts[i][1]) / (pts[i + 1][1] - pts[i][1] || 1); return P(c, lerp(pts[i][0], pts[i + 1][0], f), lat); }
  return P(c, 180, lat);
}

// ------------------------------------------------------------------ calendar card (THU 29 → torn FRI 30 → SAT 31)
function calendarCard(ctx, x, y, w, t, o) {
  // o: {t0 pop, tFlip (THU lifts away, FRI shows), tCross (X drawn on FRI), tTear (FRI torn off → SAT), t1 out, skipFri}
  const k = win(t, o.t0, o.t1, .35, .25); if (k <= 0) return;
  const bumpSat = 1 + 0.12 * Math.max(0, 1 - (t - o.tTear - 0.5) * 3) * (t > o.tTear + 0.5 ? 1 : 0);
  // bottom of the pad: SAT 31 (always underneath)
  sprite(ctx, 'calendar_sat31', x, y, w, { k: k * bumpSat });
  // middle page FRI 30 (unless skipped) — torn off with a crumple
  if (!o.skipFri && t < o.tTear + 1.4) {
    const u = clamp((t - o.tTear) / 1.3);
    if (u <= 0) sprite(ctx, 'calendar_fri30', x, y, w, { k });
    else {
      const e = easeIn(u), sq = Math.sin(u * 30) * 0.18 * u;
      sprite(ctx, 'calendar_fri30', x + e * 520 + Math.sin(u * 9) * 30, y - Math.sin(u * 3.1) * 220 + e * 300, w * (1 - 0.55 * u), { k, rot: u * 420, sq, alpha: 1 - clamp((u - 0.75) / 0.25) });
    }
    // the red X
    const kx = clamp((t - o.tCross) / 0.4);
    if (kx > 0 && t < o.tTear) {
      const h = w * 460 / 400, x0 = x - w * 0.35, y0 = y - h * 0.1, x1 = x + w * 0.35, y1 = y + h * 0.4;
      ctx.save(); ctx.strokeStyle = '#E63946'; ctx.lineWidth = w * 0.05; ctx.lineCap = 'round';
      const a = clamp(kx * 2), b = clamp(kx * 2 - 1);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, a), lerp(y0, y1, a)); ctx.stroke();
      if (b > 0) { ctx.beginPath(); ctx.moveTo(x1, y0); ctx.lineTo(lerp(x1, x0, b), lerp(y0, y1, b)); ctx.stroke(); }
      ctx.restore();
    }
  }
  // top page THU 29 — flips up and over
  if (t < o.tFlip + 0.5) {
    const u = clamp((t - o.tFlip) / 0.45);
    const im = IMG.calendar_thu29; if (!im) return;
    const h = w * im.height / im.width;
    ctx.save(); ctx.translate(x, y - h / 2); ctx.scale(k, k * (1 - easeIn(u) * 1.0)); if (u > 0) ctx.globalAlpha = 1 - u * 0.3;
    ctx.drawImage(im, -w / 2, 0, w, h); ctx.restore();
  }
}

// ------------------------------------------------------------------ B1 0–8.6: Thursday night → Saturday morning
function sceneHook(ctx, c, t) {
  if (t > 9.5) return;
  const night = 1 - clamp((t - 5.4) / 1.2);
  if (night > 0) {
    ctx.save(); ctx.globalAlpha = 0.72 * night; ctx.fillStyle = '#06121C'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const dawn = clamp((t - 3.0) / 0.6);
    ctx.save(); ctx.globalAlpha = night;
    const r = rnd(7); for (let i = 0; i < 26; i++) { const x = r() * W, y = 120 + r() * 640; ctx.globalAlpha = night * (1 - dawn) * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))); ctx.fillStyle = '#fff'; star(ctx, x, y, 5 + r() * 6); ctx.fill(); }
    ctx.globalAlpha = night * (1 - dawn); ctx.fillStyle = '#F7F1C8'; ctx.beginPath(); ctx.arc(820, 300, 80, 0, 7); ctx.fill();
    ctx.fillStyle = '#06121C'; ctx.beginPath(); ctx.arc(850, 280, 72, 0, 7); ctx.fill();
    ctx.globalAlpha = night * dawn; const g = ctx.createRadialGradient(820, 340, 10, 820, 340, 160); g.addColorStop(0, '#FFE680'); g.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(820, 340, 160, 0, 7); ctx.fill(); ctx.fillStyle = '#FFD43B'; ctx.beginPath(); ctx.arc(820, 340, 70, 0, 7); ctx.fill();
    ctx.restore();
  }
  const ko = popOut(6.2 - t, 0.35);
  // the Samoan: asleep, then shocked
  const awake = t > 3.0;
  sprite(ctx, awake ? 'samoan' : 'samoan_sleepy', 300, 1180, 380, { k: pop(t - 0.2) * ko, ay: 0.95, sq: awake ? 0.08 * Math.max(0, 1 - (t - 3.0) * 4) : wob(t, 0.6, 0.015) });
  if (!awake) for (let i = 0; i < 3; i++) { const u = ((t * 0.7 + i / 3) % 1); styledText(ctx, 'z', 420 + u * 90, 760 - u * 160, 40 + i * 14, { k: pop(t - 0.5) * (1 - u), fill: '#DDEBFF' }); }
  bubble(ctx, 360, 640, 'SATURDAY?!', 52, [-40, 90], win(t, 3.3, 6.1) * ko);
  // calendar: THU 29 → SAT 31 (Friday never shows)
  calendarCard(ctx, 760, 1000, 330, t, { t0: 0.6, tFlip: 2.8, tCross: 99, tTear: 2.8, t1: 6.0, skipFri: true });
  styledText(ctx, '?', 930, 760, 120, { k: win(t, 3.3, 6.0) * (1 + wob(t, 2, 0.06)), fill: C.gold, stroke: C.ink });
  // Samoa revealed
  const ks = clamp((t - 7.2) / 0.5) * popOut(13.0 - t);
  tint(ctx, c, 'WSM', C.gold, 0.6 * ks, C.gold);
}

// ------------------------------------------------------------------ B2 8.6–21: east of the Date Line since 1892, synced with California
function sceneEast(ctx, c, t) {
  if (t < 7 || t > 22.5) return;
  const [sx, sy] = P(c, ...PL.samoa);
  const kl = win(t, 7.4, 21.6);
  goldLabel(ctx, 'SAMOA', sx - 40, sy + 110, 64, kl);
  sprite(ctx, 'marker_wsm', sx - 40, sy - 20, 110, { k: win(t, 7.6, 21.6), ay: 0.95 });
  const kd = win(t, 9.6, 14.8);
  const [lx, ly] = idlScreenAt(c, -17.5);
  chip(ctx, 'INTERNATIONAL DATE LINE', Math.min(lx + 20, W - 260), ly, kd, { size: 28, stroke: C.cyan });
  title(ctx, '1892', 300, win(t, 10.0, 14.6, .4), 150);
  chip(ctx, 'EAST OF THE LINE', W / 2, 430, win(t, 10.6, 14.6), { size: 30 });
  // trade route to California (off-screen east)
  const kr = clamp((t - 15.4) / 1.6), out = popOut(21.4 - t);
  if (kr > 0 && out > 0) {
    const a = P(c, PL.samoa[0] + 0.6, PL.samoa[1]), b = [W + 60, P(c, 210, 12)[1]];
    const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 220]); }
    const path = partial(pts, easeOut(kr));
    if (path) { ctx.save(); ctx.globalAlpha = out; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(244,208,63,0.3)'; ctx.lineWidth = 26; ctx.stroke(path);
      ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.setLineDash([22, 14]); ctx.lineDashOffset = -t * 40; ctx.stroke(path); ctx.restore(); }
    const [px, py] = pointAlong(pts, easeOut(kr));
    chip(ctx, 'CALIFORNIA →', Math.min(px, W - 190), py - 70, pop(t - 15.8) * out, { size: 34, fill: C.gold });
    chip(ctx, 'US TRADERS', W - 200, py + 10, pop(t - 16.4) * out, { size: 26 });
    chip(ctx, 'SAME CALENDAR', W / 2, 1120, win(t, 17.0, 21.2), { size: 32, stroke: '#7FD3FF' });
  }
  chip(ctx, 'GREAT FOR SHIPPING ✓', W / 2, 440, win(t, 18.2, 21.2), { size: 32, fill: '#9BE89B', stroke: '#9BE89B' });
}

// ------------------------------------------------------------------ B3/B4 21–44: next-door partners, a day ahead
function sceneNeighbours(ctx, c, t) {
  if (t < 21 || t > 45) return;
  const out = popOut(44.2 - t);
  const S = P(c, ...PL.samoa), SY = P(c, ...PL.sydney), AK = P(c, ...PL.auckland);
  const kc = clamp((t - 21.8) / 0.6) * out;
  tint(ctx, c, 'WSM', C.gold, 0.7 * kc, C.gold); tint(ctx, c, 'AUS', '#7FD3FF', 0.22 * kc); tint(ctx, c, 'NZL', '#7FD3FF', 0.3 * kc);
  goldLabel(ctx, 'SAMOA', S[0] - 10, S[1] + 70, 54, pop(t - 21.8) * out);
  goldLabel(ctx, 'AUSTRALIA', 210, P(c, 140, -24)[1], 58, pop(t - 22.4) * out);
  goldLabel(ctx, 'NEW ZEALAND', AK[0] + 60, AK[1] + 110, 50, pop(t - 22.8) * out);
  dot(ctx, SY[0], SY[1], 11, pop(t - 22.4) * out); dot(ctx, AK[0], AK[1], 11, pop(t - 22.8) * out);
  // trade arcs
  for (const [dst, t0] of [[SY, 23.0], [AK, 23.5]]) {
    const k = clamp((t - t0) / 1.4); if (k <= 0) continue;
    const mx = (S[0] + dst[0]) / 2, my = Math.min(S[1], dst[1]) - 160;
    const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([(1 - u) * (1 - u) * S[0] + 2 * u * (1 - u) * mx + u * u * dst[0], (1 - u) * (1 - u) * S[1] + 2 * u * (1 - u) * my + u * u * dst[1]]); }
    const path = partial(pts, easeOut(k)); if (!path) continue;
    ctx.save(); ctx.globalAlpha = out * (t > 29 ? 0.45 : 1); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(244,208,63,.25)'; ctx.lineWidth = 22; ctx.stroke(path);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 40; ctx.stroke(path); ctx.restore();
  }
  chip(ctx, 'BIGGEST TRADE PARTNERS', W / 2, 300, win(t, 24.0, 27.0), { size: 32 });
  kinetic(ctx, 'NEARLY 1 DAY\nAHEAD', 330, win(t, 27.2, 30.6), 104);
  // B4: SUN vs MON, then FRI vs SAT
  const kb = win(t, 30.4, 44.0);
  const swap = 36.2;
  const dS = t < swap ? 'SUN' : 'FRI', dA = t < swap ? 'MON' : 'SAT';
  const bump = t >= swap ? 1 + 0.25 * Math.max(0, 1 - (t - swap) * 4) : 1;
  dayBadge(ctx, S[0], S[1] - 40, dS, kb * bump * pop(t - 30.4), '#CE1126');
  dayBadge(ctx, SY[0], SY[1] - 30, dA, kb * bump * pop(t - 30.8), '#00843D');
  dayBadge(ctx, AK[0], AK[1] - 30, dA, kb * bump * pop(t - 31.0), '#00247D');
  chip(ctx, '9 AM', SY[0] + 10, SY[1] + 60, win(t, 31.4, 35.8), { size: 26 });
  chip(ctx, 'still 9 AM', S[0] - 10, S[1] + 140, win(t, 32.6, 35.8), { size: 26 });
  chip(ctx, 'AFTERNOON', S[0] - 50, S[1] + 140, win(t, 36.6, 43.8), { size: 26 });
  // weekend: CLOSED signs swing in AUS/NZ
  for (const [p, t0, dx] of [[SY, 37.4, 170], [AK, 37.7, 170]]) {
    const k = win(t, t0, 43.8); if (k <= 0) continue;
    sprite(ctx, 'closed_sign', p[0] + dx, p[1] - 120, 150, { k, rot: wob(t - t0, 0.9, 8 * Math.max(0, 1 - (t - t0) * 0.6)), ay: 0.05 });
  }
  const kn = win(t, 39.6, 43.9);
  if (kn > 0) {
    kinetic(ctx, '2 WORKDAYS', 300, kn * (1 + 0.08 * Math.max(0, 1 - (t - 39.6) * 3)), 128);
    styledText(ctx, 'LOST EVERY WEEK', W / 2, 410, 54, { k: pop(t - 40.0) * popOut(43.9 - t), fill: C.white });
  }
}

// ------------------------------------------------------------------ B5 44–58: December 2011, Friday deleted, the line bends
function sceneSkip(ctx, c, t) {
  if (t < 43.8 || t > 60) return;
  title(ctx, 'DECEMBER 2011', 250, win(t, 44.0, 48.4, .4), 104);
  const S = P(c, ...PL.samoa), A = P(c, ...PL.pago);
  const ko = popOut(58.6 - t);
  tint(ctx, c, 'WSM', C.gold, 0.6 * clamp((t - 45.8) / 0.5) * ko, C.gold);
  goldLabel(ctx, 'SAMOA', S[0] - 10, S[1] + 140, 56, win(t, 46.0, 58.6));
  // the Samoan government official who makes the call
  sprite(ctx, 'samoan', 140, 1230, 220, { k: win(t, 46.4, 58.4), ay: 0.95, sq: t > 50.0 && t < 50.5 ? 0.06 : 0 });
  bubble(ctx, 220, 900, "LET'S JUMP!", 40, [-30, 70], win(t, 48.0, 51.0));
  calendarCard(ctx, 870, 520, 290, t, { t0: 46.8, tFlip: 49.0, tCross: 49.8, tTear: 50.6, t1: 58.4 });
  chip(ctx, 'MIDNIGHT', 870, 300, win(t, 48.0, 50.4), { size: 30 });
  // the line bends east around Samoa
  const km = win(t, 51.0, 58.4);
  if (t > 51.0 && t < 54.4) {
    const [lx, ly] = idlScreenAt(c, -13.6);
    for (let i = 0; i < 3; i++) { const u = ((t - 51 + i * 0.3) % 1); ctx.save(); ctx.globalAlpha = (1 - u) * 0.9; ctx.fillStyle = C.cyan; ctx.beginPath();
      const ax = lx + 30 + u * 120; ctx.moveTo(ax, ly - 20 + i * 0); ctx.lineTo(ax + 34, ly); ctx.lineTo(ax, ly + 20); ctx.closePath(); ctx.fill(); ctx.restore(); }
  }
  goldLabel(ctx, 'AMERICAN\nSAMOA', A[0] + 110, A[1] + 140, 46, win(t, 54.0, 58.6));
  sprite(ctx, 'marker_asm', A[0] + 6, A[1] - 6, 90, { k: win(t, 54.2, 58.6), ay: 0.95 });
  chip(ctx, 'OTHER SIDE', A[0] + 110, A[1] + 240, win(t, 55.0, 58.6), { size: 26, stroke: C.cyan });
  chip(ctx, 'DATE LINE', idlScreenAt(c, -9)[0] + 4, idlScreenAt(c, -9)[1], km, { size: 26, stroke: C.cyan });
  if (t > 50.6 && t < 51.0) flash(ctx, (t - 50.6) / 0.4, '#FFF6C8');
}

// ------------------------------------------------------------------ B6 58–68: 30-minute flight, 24-hour time jump
function sceneHop(ctx, c, t) {
  if (t < 58.6) return;
  const S = P(c, ...PL.apia), A = P(c, ...PL.pago);
  const kin = clamp((t - 59.4) / 0.6);
  tint(ctx, c, 'WSM', C.gold, 0.45 * kin); tint(ctx, c, 'ASM', '#7FD3FF', 0.45 * kin);
  goldLabel(ctx, 'SAMOA', S[0] - 120, S[1] + 110, 60, pop(t - 59.6));
  goldLabel(ctx, 'AMERICAN\nSAMOA', Math.min(A[0] + 170, W - 150), A[1] + 50, 44, pop(t - 59.9));
  dot(ctx, S[0], S[1], 12, pop(t - 59.6)); dot(ctx, A[0], A[1], 12, pop(t - 59.9));
  dayBadge(ctx, S[0], S[1] - 30, 'SAT', pop(t - 60.2), '#CE1126', { size: 50 });
  dayBadge(ctx, A[0], A[1] - 30, 'FRI', pop(t - 60.4), '#002B7F', { size: 50 });
  // the arc
  const mx = (S[0] + A[0]) / 2, my = Math.min(S[1], A[1]) - 330;
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([(1 - u) * (1 - u) * S[0] + 2 * u * (1 - u) * mx + u * u * A[0], (1 - u) * (1 - u) * (S[1] - 150) + 2 * u * (1 - u) * my + u * u * (A[1] - 150)]); }
  const ka = clamp((t - 60.8) / 0.8);
  const path = partial(pts, easeOut(ka));
  if (path) { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,212,59,.25)'; ctx.lineWidth = 26; ctx.stroke(path);
    ctx.strokeStyle = C.yellow; ctx.lineWidth = 8; ctx.setLineDash([20, 14]); ctx.lineDashOffset = -t * 40; ctx.stroke(path); ctx.restore(); }
  kinetic(ctx, '24-HOUR\nTIME JUMP', my - 150, pop(t - 61.2), 100, -2);
  chip(ctx, '30-MIN FLIGHT', mx, my + 40, pop(t - 61.6), { size: 30, stroke: C.yellow });
  // plane: there (−24 h) and back (+24 h)
  const go = clamp((t - 62.0) / 2.0), back2 = clamp((t - 64.6) / 2.0);
  if (t > 61.8) {
    const u = t < 64.4 ? easeIO(go) : 1 - easeIO(back2);
    const [px, py] = pointAlong(pts, u), [qx, qy] = pointAlong(pts, clamp(u + (t < 64.4 ? 0.02 : -0.02)));
    const ang = Math.atan2(qy - py, qx - px) * 180 / Math.PI;
    sprite(ctx, 'airplane', px, py, 170, { k: pop(t - 61.8), rot: ang, flip: false });
  }
  styledText(ctx, '−24 H', A[0] + 60, A[1] - 250, 70, { k: win(t, 64.0, 65.4), fill: '#7FD3FF', stroke: C.ink });
  styledText(ctx, '+24 H', S[0] - 60, S[1] - 250, 70, { k: win(t, 66.6, 68.4), fill: C.yellow, stroke: C.ink });
  // the neighbours: American Samoa didn't switch
  sprite(ctx, 'samoan', 200, 1250, 230, { k: pop(t - 59.8), ay: 0.95 });
  sprite(ctx, 'american_samoan', 900, 1270, 200, { k: pop(t - 60.0), ay: 0.95 });
  bubble(ctx, 820, 975, 'NOT SWITCHING', 32, [40, 50], win(t, 60.2, 62.6));
}

const CAPTIONS = [
  [0.3, 2.8, 'Asleep on Thursday…'], [3.0, 5.4, 'Wake up: Saturday'], [5.5, 8.4, 'Not sci-fi'], [8.5, 10.0, "That's Samoa"],
  [10.1, 14.8, 'East of the line'], [14.9, 18.0, 'Synced with California'], [18.1, 21.4, 'Made sense back then'],
  [21.6, 25.0, 'Then trade shifted'], [25.1, 30.2, 'Next door, a day ahead'],
  [30.4, 33.0, 'Monday in Sydney'], [33.1, 36.0, 'Sunday in Samoa'], [36.2, 39.4, 'Weekend already'], [39.6, 43.8, 'Two workdays lost'],
  [44.0, 47.0, 'December 2011'], [47.1, 50.4, 'Jump the Date Line'], [50.6, 53.6, 'Friday deleted'], [53.7, 58.4, 'Straight to Saturday'],
  [58.6, 61.8, "Neighbour didn't switch"], [61.9, 64.6, '30-minute flight'], [64.7, 68.0, 'A day back in time'],
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
  MORPH = easeIO((t - 51.0) / 2.6);
  drawMap(ctx, c);
  const emph = Math.max(win(t, 9.4, 15.0), win(t, 45.6, 58.4), 0) * 1;
  drawIDL(ctx, c, t, clamp(emph));
  vignette(ctx);
  sceneHook(ctx, c, t); sceneEast(ctx, c, t); sceneNeighbours(ctx, c, t); sceneSkip(ctx, c, t); sceneHop(ctx, c, t);
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
