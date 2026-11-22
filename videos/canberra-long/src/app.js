/* Why Canberra? Part 2 — Mapheld 16:9 long-form. renderAt(t) draws storyboard time t (= voiceover time incl. breathers).
 */
'use strict';
const W = 1920, H = 1080, DURATION = 183.4;
GEO.countries = Object.assign({}, GEO.africa, GEO.europe);
const VERT = !!window.VERTICAL, SHORT_END = window.SHORT_END || 0;   // 9:16 teaser cut that ends on a cliffhanger
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
  aus: [134.0, -27.0, 26], se: [147.6, -35.2, 120], mel: [145.0, -37.82, 900], nsw: [148.6, -33.6, 95], dal: [149.0, -35.7, 300],
  cbr: [149.12, -35.33, 1100], actjb: [149.9, -35.25, 420],
};
const KEYS = [
  [0, 'se', 1], [14.3, 'se', 1.04], [15.8, 'mel', 1], [29.3, 'mel', 1.05], [30.7, 'nsw', 1], [37.2, 'nsw', 1.03], [38.6, 'dal', 1], [56.6, 'dal', 1.03],
  [57.9, 'cbr', 1], [61.2, 'cbr', 1.02], [62.6, 'actjb', 1], [86.0, 'actjb', 1.05], [99.6, 'cbr', 1], [158.8, 'cbr', 1.08], [160.8, 'se', 1], [172.8, 'se', 1.03],
  [174.6, 'aus', 1], [183.4, 'aus', 1.05],
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
  for (const key of ['world']) {
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
  const set = PATHS.world;
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

// ================================================================== scenes (storyboard time = voiceover time, 0–175.8 s)
function countryPath(c, iso) { const p = new Path2D(); for (const q of PATHS['c_' + iso] || []) p.addPath(q, camMatrix(c)); return p; }
function chip(ctx, text, x, y, k, o = {}) {
  if (k <= 0.001) return;
  if (VERT && (y === 150 || y === 220)) x = 960 + (x - 960) * 0.42;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', o.size || 30);
  const w = ctx.measureText(text).width + 46, h = (o.size || 30) * 1.75;
  ctx.fillStyle = o.bg || 'rgba(10,24,32,0.92)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2); ctx.restore();
}
function goldLabel(ctx, text, x, y, size, k) { styledText(ctx, text, x, y, size, { k, fill: C.gold, stroke: C.goldDark, shadow: 5 }); }
function title(ctx, text, y, k, size = 104) { styledText(ctx, text, W / 2, y, size, { k, font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark, maxW: VERT ? 760 : 980 }); }
function kinetic(ctx, text, x, y, k, size = 96, rot = -3) { if (VERT) x = 960 + (x - 960) * 0.3; styledText(ctx, text, x, y, size, { k, fill: C.yellow, stroke: C.goldDark, rot, maxW: VERT ? 760 : 980 }); }
function person(ctx, name, x, y, w, o = {}) { sprite(ctx, name, x, y, w, { ay: 0.96, ...o }); }   // feet anchor
// rubber stamp that slams in (big → normal), slightly tilted, with a worn texture
function stamp(ctx, text, x, y, t, t0, o = {}) {
  const e = t - t0; if (e < 0 || (o.until && t > o.until)) return;
  const sl = e < 0.18 ? lerp(2.3, 1, easeIn(e / 0.18)) : 1 + 0.06 * Math.max(0, 1 - (e - 0.18) * 6), a = clamp(e / 0.1) * (o.until ? clamp((o.until - t) / 0.25) : 1);
  const col = o.color || '#D7263D', size = o.size || 64;
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot ?? -8) * Math.PI / 180); ctx.scale(sl, sl); ctx.globalAlpha = a;
  setFont(ctx, 'Montserrat', size); const lines = text.split('\n'), w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 60, h = size * 1.25 * lines.length + 34;
  ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 14); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 8); ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.2 + 3));
  ctx.globalCompositeOperation = 'destination-out'; const r = rnd(text.length * 7);       // ink wear
  for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * w, (r() - 0.5) * h, 1 + r() * 4, 0, 7); ctx.fill(); }
  ctx.restore();
}
function geoPolyline(ctx, c, pts, k, color, width, o = {}) {
  const sp = pts.map(p => P(c, p[0], p[1])); const path = partial(sp, clamp(k)); if (!path) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.glow) { ctx.strokeStyle = o.glowColor || 'rgba(244,208,63,0.35)'; ctx.lineWidth = width * 4; ctx.stroke(path); }
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(path); ctx.restore();
}
function border(ctx, c, key, k, color = C.gold, width = 6, o = { glow: true }) { for (const line of GEO.borders[key] || []) geoPolyline(ctx, c, line, k, color, width, o); }

// ================================================================== scenes (storyboard time = voiceover time incl. breathers, 0–183.4 s)
const PL = GEO.places;
function tint(ctx, c, iso, color, a, glow) {
  if (a <= 0 || !PATHS['c_' + iso]) return; const p = countryPath(c, iso);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill(p, 'evenodd');
  if (glow) { ctx.globalAlpha = Math.min(1, a * 2.2); ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.shadowColor = glow; ctx.shadowBlur = 16; ctx.stroke(p); }
  ctx.restore();
}
function at(c, k) { return P(c, ...PL[k]); }
function marker(ctx, c, name, place, w, k, dy = 0) { if (k <= 0) return; const [x, y] = at(c, place); sprite(ctx, name, x, y + dy, w, { k, ay: 0.92 }); }
function town(ctx, c, place, label, k, o = {}) {
  if (k <= 0) return; const [x, y] = at(c, place);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = o.color || '#F1EAD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.fillRect(-13, -20, 26, 20); ctx.strokeRect(-13, -20, 26, 20); ctx.beginPath(); ctx.moveTo(-16, -20); ctx.lineTo(0, -34); ctx.lineTo(16, -20); ctx.closePath(); ctx.fillStyle = '#B03A2E'; ctx.fill(); ctx.stroke(); ctx.restore();
  styledText(ctx, label, x, y + 26, o.size || 30, { k, fill: o.fill || '#FFFFFF', stroke: 'rgba(0,0,0,0.4)' });
}
function rivals(ctx, t, k, mode, x0 = 360, x1 = 1560) {
  if (k <= 0.001) return;
  person(ctx, `melbourne${mode ? '_' + mode : ''}`, x0, 1020, 260, { k }); person(ctx, `sydney${mode ? '_' + mode : ''}`, x1, 1020, 260, { k });
}
function card(ctx, k) {           // dark-teal cutaway card over the map
  if (k <= 0) return false; const y = lerp(H + 40, 70, easeOut(k));
  ctx.save(); ctx.fillStyle = `rgba(0,0,0,${0.35 * clamp(k)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.translate(0, y - 70); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.fillStyle = C.ocean; ctx.beginPath(); ctx.roundRect(80, 70, W - 160, H - 150, 34); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(244,208,63,0.6)'; ctx.lineWidth = 4; ctx.stroke(); return y - 70;
}
function endCard(ctx) { ctx.restore(); }
function calendarFlip(ctx, x, y, t, t0, t1, y0, y1) {
  const u = clamp((t - t0) / (t1 - t0)), yr = Math.round(lerp(y0, y1, easeIO(u)));
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-150, -110, 300, 220, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E63946'; ctx.beginPath(); ctx.roundRect(-147, -107, 294, 56, [14, 14, 0, 0]); ctx.fill(); setFont(ctx, 'Montserrat', 30); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PARLIAMENT IN', 0, -78);
  setFont(ctx, 'Montserrat', 88); ctx.fillStyle = C.ink; ctx.fillText(String(yr), 0, 30); ctx.restore();
}
function snowflakes(ctx, t, k) { if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#FFFFFF'; const r = rnd(7); for (let i = 0; i < 60; i++) { const x = (r() * W + t * 30) % W, y = (r() * H + t * (60 + r() * 60)) % H; ctx.beginPath(); ctx.arc(x, y, 2 + r() * 3, 0, 7); ctx.fill(); } ctx.restore(); }

// ---------------------------------------------------------------- the map layer
function sceneMap(ctx, c, t) {
  const showStates = t < 160 || t > 160;
  ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 2; ctx.setLineDash([8, 7]); for (const iso of Object.keys(GEO.countries)) ctx.stroke(countryPath(c, iso)); ctx.restore();
  // B1 (0–15): the rivalry, 1901, an empty field
  if (t < 15.4) {
    marker(ctx, c, 'opera_house', 'sydney', 130, pop(t - 0.1)); marker(ctx, c, 'tram', 'melbourne', 120, pop(t - 0.6));
    const [sx, sy] = at(c, 'sydney'), [mx, my] = at(c, 'melbourne'); goldLabel(ctx, 'SYDNEY', sx, sy + 50, 44, pop(t - 0.1)); goldLabel(ctx, 'MELBOURNE', mx, my + 50, 44, pop(t - 0.6));
    rivals(ctx, t, win(t, 0.2, 6.2), 'tug', 520, 1400); sprite(ctx, 'crown', 960 + Math.sin(t * 5) * 30, 760, 150, { k: win(t, 0.3, 4.4) });
    const [cx, cy] = at(c, 'canberra'); styledText(ctx, '?', cx, cy - 30, 110, { k: win(t, 8.2, 15.0), fill: C.gold, stroke: C.ink });
    title(ctx, '1901', 150, win(t, 6.8, 10.0, .4), 140);
    chip(ctx, 'NOT ONE STREET', cx - 260, cy + 90, win(t, 9.6, 14.8), { size: 30 }); chip(ctx, 'NOT ONE BUILDING', cx + 260, cy + 90, win(t, 10.6, 14.8), { size: 30 });
    kinetic(ctx, 'SO WHERE DID THEY GO?', W / 2, 150, win(t, 11.5, 15.0), 84);
  }
  // B2 (15–30): Melbourne — Victoria's parliament moves out to the exhibition hall
  if (t > 15.0 && t < 30.4) {
    const [mx, my] = at(c, 'melbourne');
    goldLabel(ctx, 'MELBOURNE', W / 2, 150, 90, win(t, 15.2, 18.8, .3));
    const kd = win(t, 15.9, 19.2); if (kd > 0) { ctx.save(); ctx.translate(W / 2, 520); ctx.scale(kd, kd); ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-380, -150, 760, 300, 14); ctx.fill(); ctx.stroke();
      setFont(ctx, 'Playfair Display', 50); ctx.fillStyle = '#2A2118'; ctx.textAlign = 'center'; ctx.fillText('THE CONSTITUTION', 0, -60); ctx.fillStyle = 'rgba(255,212,59,0.6)'; ctx.fillRect(-330, 0, 660, 50); ctx.fillStyle = '#2A2118'; setFont(ctx, 'Montserrat', 30); ctx.fillText('…meet in Melbourne until the capital is ready', 0, 36); ctx.restore(); }
    sprite(ctx, 'vic_parliament', 600, 760, 380, { k: win(t, 19.3, 29.6) }); styledText(ctx, "VICTORIA'S PARLIAMENT", 600, 820, 30, { k: win(t, 19.5, 29.6), fill: '#fff' });
    sprite(ctx, 'exhibition', 1380, 760, 400, { k: win(t, 22.8, 29.6) }); styledText(ctx, 'EXHIBITION HALL', 1380, 820, 30, { k: win(t, 23.4, 29.6), fill: '#fff' });
    const walk = clamp((t - 21.6) / 2.4), wx = lerp(720, 1240, easeIO(walk)), bob = walk > 0 && walk < 1 ? Math.abs(Math.sin(t * 10)) * 10 : 0;
    if (t > 21.3 && t < 29.6) { person(ctx, 'melbourne_sulk', wx, 1010 - bob, 220, { flip: false }); ctx.save(); ctx.translate(wx + 20, 830 - bob); ctx.fillStyle = '#B98B55'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.fillRect(-50, -40, 100, 70); ctx.strokeRect(-50, -40, 100, 70); ctx.restore(); }
    chip(ctx, '"TEMPORARY"', W / 2, 230, win(t, 25.6, 27.0), { size: 34 });
    if (t > 26.6) calendarFlip(ctx, W / 2, 360, t, 26.8, 28.6, 1901, 1927);
    kinetic(ctx, '26 YEARS', W / 2, 150, win(t, 27.1, 29.9), 110);
  }
  // B3 (30–43): the site hunt → Dalgety, 1904
  if (t > 30.3 && t < 43.4) {
    const tour = ['albury', 'tumut', 'orange', 'armidale', 'lyndhurst', 'bombala', 'dalgety'];
    const kt = clamp((t - 32.9) / 4.0), sp = tour.map(k => at(c, k));
    tour.forEach((k, i) => town(ctx, c, k, k[0].toUpperCase() + k.slice(1), pop(t - 31.2 - i * 0.25), { size: 26 }));
    const path = partial(sp, kt); if (path) { ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 30; ctx.stroke(path); ctx.restore(); }
    if (kt > 0 && kt < 1) { const [x, y] = pointAlong(sp, kt); person(ctx, 'lawmaker', x, y, 110); }
    chip(ctx, 'THE HUNT FOR A CAPITAL', W / 2, 150, win(t, 30.6, 34.8), { size: 34 });
    [['☁ WEATHER', 35.3, -420], ['💧 WATER', 35.9, 0], ['⛰ VIEWS', 36.7, 420]].forEach(([s, t0, dx]) => chip(ctx, s, W / 2 + dx, 230, win(t, t0, 37.4), { size: 32 }));
    title(ctx, '1904', 150, win(t, 37.5, 42.9, .4), 130);
    const [dx, dy] = at(c, 'dalgety'); goldLabel(ctx, 'DALGETY', dx, dy - 70, 60, pop(t - 40.0));
    if (t > 40.8) { chip(ctx, '❄ SNOWY MOUNTAINS', dx - 320, dy + 80, win(t, 40.8, 43.0), { size: 30, stroke: '#BFE9F5' }); }
  }
  // B4 (43–62): NSW hates it → Yass-Canberra → the surveyor finds the valley
  if (t > 43.0 && t < 62.0) {
    const kN = clamp((t - 43.1) / 0.6) * (1 - clamp((t - 50.5) / 0.6)); tint(ctx, c, 'NSW', '#E63946', 0.18 * kN, '#E63946');
    person(ctx, 'sydney_angry', 300, 1030, 260, { k: win(t, 43.3, 50.6) });
    const [dx, dy] = at(c, 'dalgety'); town(ctx, c, 'dalgety', 'Dalgety', t < 51 ? 1 : 0);
    snowflakes(ctx, t, win(t, 45.0, 46.4));
    chip(ctx, 'TOO COLD', W / 2 - 380, 150, win(t, 45.0, 50.4), { size: 34, stroke: '#BFE9F5' }); chip(ctx, 'TOO REMOTE', W / 2, 150, win(t, 45.7, 50.4), { size: 34 });
    chip(ctx, 'TOO CLOSE TO VICTORIA', W / 2 + 470, 150, win(t, 47.1, 50.4), { size: 34, stroke: '#E63946' });
    stamp(ctx, 'SCRAPPED', dx, dy - 60, t, 49.8, { size: 56, until: 52.2 });
    const [yx, yy] = at(c, 'yass'), [cx, cy] = at(c, 'canberra');
    if (t > 51.6 && t < 57.9) { town(ctx, c, 'yass', 'Yass', pop(t - 51.6)); goldLabel(ctx, 'YASS-CANBERRA', (yx + cx) / 2 + 240, (yy + cy) / 2, 54, pop(t - 51.8));
      ctx.save(); ctx.globalAlpha = 0.25 * clamp((t - 51.8) / 0.5); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse((yx + cx) / 2, (yy + cy) / 2, 170, 230, 0.3, 0, 7); ctx.fill(); ctx.restore(); }
    if (t > 53.6 && t < 57.9) { const u = clamp((t - 54.2) / 3.0), x = lerp(yx - 220, cx, easeIO(u)), y = lerp(yy - 30, cy, easeIO(u)), bob = Math.abs(Math.sin(t * 12)) * 8;
      person(ctx, 'surveyor', x, y - bob, 140); for (let i = 0; i < 4; i++) sprite(ctx, 'sheep', cx - 300 + i * 160, cy + 160 + (i % 2) * 40, 80, { k: pop(t - 55.3 - i * 0.1) }); }
    // the valley (close-up): hills ring + river
    if (t > 57.6) { const k = clamp((t - 57.7) / 0.6); ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = '#6E7A3E'; ctx.lineWidth = 6;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, cy, 520 + i * 60, 320 + i * 40, 0.1, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#7B8A47'; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, hx = cx + Math.cos(a) * 560, hy = cy + Math.sin(a) * 350; ctx.beginPath(); ctx.moveTo(hx - 60, hy + 30); ctx.lineTo(hx, hy - 50); ctx.lineTo(hx + 60, hy + 30); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#5DADE2'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 800, cy - 40); ctx.bezierCurveTo(cx - 300, cy + 120, cx + 200, cy - 140, cx + 800, cy + 30); ctx.stroke(); ctx.restore();
      chip(ctx, 'THE EXACT SITE', W / 2, 150, win(t, 57.8, 61.5), { size: 36 }); styledText(ctx, 'river', cx + 420, cy - 60, 30, { k: pop(t - 59.4), fill: '#BFE9F5' }); }
  }
  // B5 (62–75): Federal Capital Territory + Jervis Bay
  if (t > 61.7 && t < 75.2) {
    title(ctx, '1911', 150, win(t, 61.8, 64.6, .4), 130);
    const ka = clamp((t - 63.3) / 0.7); tint(ctx, c, 'ACT', C.gold, 0.5 * ka, C.gold);
    const [cx, cy] = at(c, 'canberra'); goldLabel(ctx, 'FEDERAL CAPITAL TERRITORY', cx - 60, cy - 200, 46, pop(t - 64.8));
    const kj = clamp((t - 69.4) / 0.6); tint(ctx, c, 'JBT', C.gold, 0.7 * kj, C.gold);
    const [jx, jy] = at(c, 'jervis'); sprite(ctx, 'lighthouse', jx + 40, jy, 90, { k: pop(t - 69.6), ay: 0.95 }); goldLabel(ctx, 'JERVIS BAY', jx, jy + 70, 46, pop(t - 69.7));
    chip(ctx, 'A CAPITAL NEEDS A COASTLINE', W / 2, 150, win(t, 67.8, 70.6), { size: 34 });
    if (t > 71.9) { ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(lerp(cx, jx, clamp((t - 72.0) / 0.8)), lerp(cy, jy, clamp((t - 72.0) / 0.8))); ctx.stroke(); ctx.restore();
      chip(ctx, 'FAR FROM THE CITY', (cx + jx) / 2, (cy + jy) / 2 - 50, pop(t - 72.3), { size: 28 }); }
  }
  // B6 (75–86.5): King O'Malley bans alcohol
  if (t > 74.9 && t < 86.6) {
    const [cx, cy] = at(c, 'canberra'); tint(ctx, c, 'ACT', C.gold, 0.35, C.gold);
    person(ctx, t > 80.2 ? 'omalley_ban' : 'omalley', 360, 1030, 300, { k: win(t, 76.6, 86.4) });
    chip(ctx, 'KING O\'MALLEY', 360, 1050, win(t, 77.7, 86.4), { size: 30 }); chip(ctx, 'THE MINISTER IN CHARGE', W / 2, 150, win(t, 75.2, 77.6), { size: 34 });
    if (t > 80.2) { ctx.save(); ctx.translate(cx + 300, cy - 40); const k = pop(t - 80.3); ctx.scale(k, k); ctx.fillStyle = '#7B4A16'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-30, -40, 60, 120, 12); ctx.fill(); ctx.stroke(); ctx.fillRect(-12, -90, 24, 54); ctx.strokeRect(-12, -90, 24, 54); ctx.restore();
      styledText(ctx, '✕', cx + 300, cy - 20, 200, { k: pop(t - 80.7), fill: '#FF3B3B', stroke: C.ink }); }
    stamp(ctx, 'NO ALCOHOL', cx - 120, cy + 140, t, 81.0, { size: 70 });
    chip(ctx, 'UNTIL 1928', W / 2, 150, win(t, 83.5, 86.4), { size: 36, stroke: '#E63946' });
  }
  // B8 (on the map): the name — Canberra, 1913
  if (t > 116.8 && t < 124.2) {
    const [cx, cy] = at(c, 'canberra'); title(ctx, '1913', 150, win(t, 116.9, 119.4, .4), 130);
    goldLabel(ctx, 'CANBERRA', cx, cy - 40, 150, pop(t - 119.4, 0.4));
    chip(ctx, 'FROM A LOCAL ABORIGINAL NAME', W / 2, 250, win(t, 121.0, 123.8), { size: 32 });
  }
  // B9 (124–139): slow building, Griffin vs the bureaucrats, the war
  if (t > 123.8 && t < 139.6) {
    const [cx, cy] = at(c, 'canberra'); goldLabel(ctx, 'CANBERRA', cx, cy - 300, 60, 1);
    for (let i = 0; i < 3; i++) { const x = cx - 400 + i * 380, y = cy + 60; const k = pop(t - 124.2 - i * 0.2); if (k <= 0) continue; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillStyle = '#F4D03F';
      ctx.fillRect(-12, -300, 24, 300); ctx.strokeRect(-12, -300, 24, 300); ctx.beginPath(); for (let j = 0; j < 10; j++) { ctx.moveTo(-12, -j * 30); ctx.lineTo(12, -j * 30 - 30); } ctx.stroke();      // lattice mast
      ctx.fillRect(-90, -318, 300, 18); ctx.strokeRect(-90, -318, 300, 18); ctx.fillStyle = '#6B7280'; ctx.fillRect(-90, -312, 44, 34); ctx.strokeRect(-90, -312, 44, 34);    // jib + counterweight
      ctx.fillStyle = '#F4D03F'; ctx.beginPath(); ctx.moveTo(-14, -318); ctx.lineTo(0, -360); ctx.lineTo(14, -318); ctx.closePath(); ctx.fill(); ctx.stroke();
      const hy = -230 + Math.sin(t * 1.5 + i) * 30; ctx.beginPath(); ctx.moveTo(170, -300); ctx.lineTo(170, hy); ctx.stroke(); ctx.fillStyle = '#B98B55'; ctx.fillRect(150, hy, 40, 30); ctx.strokeRect(150, hy, 40, 30);
      ctx.fillStyle = '#EFE6D2'; ctx.fillRect(40, -90, 120, 90); ctx.strokeRect(40, -90, 120, 90); ctx.strokeStyle = '#9AA3AE'; for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(40, -30 * j); ctx.lineTo(160, -30 * j); ctx.stroke(); }
      ctx.restore(); }
    chip(ctx, 'BUILDING A CITY IS SLOW', W / 2, 150, win(t, 124.0, 126.4), { size: 34 });
    person(ctx, t > 130 ? 'walter_angry' : 'walter', 420, 1030, 260, { k: win(t, 126.5, 134.4) }); chip(ctx, 'WALTER BURLEY GRIFFIN', 420, 1050, win(t, 126.6, 129.9), { size: 26 });
    person(ctx, 'bureaucrat', 1300, 1030, 240, { k: win(t, 130.1, 134.4) }); person(ctx, 'bureaucrat', 1520, 1030, 240, { k: win(t, 130.3, 134.4), flip: true });
    stamp(ctx, 'PLAN CHANGED', 960, 520, t, 131.3, { size: 60, until: 134.4 });
    chip(ctx, '1920: GRIFFIN\'S JOB ENDS', W / 2, 150, win(t, 132.9, 134.6), { size: 34, stroke: '#E63946' });
    const kw = win(t, 134.6, 139.4); if (kw > 0) { ctx.save(); ctx.globalAlpha = 0.5 * clamp(kw); ctx.fillStyle = '#1B1F2A'; ctx.fillRect(0, 0, W, H); ctx.restore(); title(ctx, 'WORLD WAR I', 150, kw, 110); chip(ctx, 'THE MONEY DRIES UP', W / 2, 270, kw, { size: 34 }); }
    if (t > 137.0) { const x = lerp(700, 900, (t - 137) / 2.5); ctx.save(); ctx.translate(x, 900); ctx.fillStyle = '#C9A46A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 50, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 25, 0, 5); ctx.stroke();
      ctx.fillStyle = '#8A9A5B'; ctx.beginPath(); ctx.roundRect(-70, 40, 160, 24, 12); ctx.fill(); ctx.stroke(); ctx.restore(); chip(ctx, 'CONSTRUCTION CRAWLED', x, 860, pop(t - 137.2), { size: 28 }); }
  }
  // B10 (139–160.5): 1927 → depression & war → the lake (1964) → Parliament House (1988)
  if (t > 139.2 && t < 160.8) {
    const [cx, cy] = at(c, 'canberra');
    title(ctx, t < 146 ? '1927' : t < 150.4 ? '1930s–40s' : t < 154.9 ? '1964' : '1988', 150, win(t, 140.1, 160.4, .3), 130);
    sprite(ctx, 'old_parliament', cx - 380, cy + 40, 380, { k: pop(t - 142.6), ay: 0.9 }); styledText(ctx, 'PARLIAMENT HOUSE · 1927', cx - 380, cy + 100, 28, { k: pop(t - 142.8), fill: '#fff' });
    if (t > 141.2 && t < 144) { ctx.save(); ctx.strokeStyle = '#E63946'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx - 600, cy + 60); ctx.lineTo(cx - 160, cy + 60); ctx.stroke(); ctx.restore(); sprite(ctx, 'crown', cx - 380, cy - 220, 90, { k: pop(t - 141.3) }); chip(ctx, 'A ROYAL VISITOR OPENS IT', W / 2, 260, win(t, 141.3, 144.0), { size: 30 }); }
    person(ctx, 'melbourne_sulk', 300, 1030, 240, { k: win(t, 144.6, 147.0) }); chip(ctx, 'GOODBYE, MELBOURNE', 300, 1050, win(t, 144.8, 147.0), { size: 28 });
    const kd = win(t, 146.8, 150.2); if (kd > 0) { ctx.save(); ctx.globalAlpha = 0.45 * clamp(kd); ctx.fillStyle = '#1B1F2A'; ctx.fillRect(0, 0, W, H); ctx.restore(); chip(ctx, 'DEPRESSION · WORLD WAR II', W / 2, 270, kd, { size: 34, stroke: '#E63946' }); }
    const kl = clamp((t - 150.5) / 2.5);
    if (kl > 0) { ctx.save(); ctx.fillStyle = '#3E86B8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx + 40, cy + 230, 520 * easeOut(kl), 70 * easeOut(kl), -0.12, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
      styledText(ctx, 'LAKE BURLEY GRIFFIN', cx + 40, cy + 230, 34, { k: pop(t - 152.0), fill: '#fff' }); }
    sprite(ctx, 'parliament', cx + 380, cy - 20, 420, { k: pop(t - 155.2), ay: 0.9 }); styledText(ctx, 'PARLIAMENT HOUSE · 1988', cx + 380, cy + 40, 28, { k: pop(t - 155.5), fill: '#fff' });
  }
  // B11 (160.5–173): Canberra today; the rivals sulk
  if (t > 160.4 && t < 173.6) {
    marker(ctx, c, 'opera_house', 'sydney', 120, 1); marker(ctx, c, 'tram', 'melbourne', 110, 1); marker(ctx, c, 'parliament', 'canberra', 170, pop(t - 160.6));
    const [cx, cy] = at(c, 'canberra'); goldLabel(ctx, 'CANBERRA', cx, cy + 60, 60, pop(t - 160.7));
    const [sx, sy] = at(c, 'sydney'), [mx, my] = at(c, 'melbourne'); goldLabel(ctx, 'SYDNEY', sx, sy + 50, 40, 1); goldLabel(ctx, 'MELBOURNE', mx, my + 50, 40, 1);
    kinetic(ctx, 'NEARLY HALF A MILLION PEOPLE', W / 2, 150, win(t, 161.8, 165.0), 78);
    [['EMBASSIES', 163.7, -420], ['MUSEUMS', 164.3, 0], ['NATIONAL GOVERNMENT', 165.1, 440]].forEach(([s, t0, dx]) => chip(ctx, s, W / 2 + dx, 260, win(t, t0, 167.6), { size: 30 }));
    rivals(ctx, t, win(t, 168.9, 173.2), 'sulk', 300, 1620);
    chip(ctx, 'TWO RIVALS. ONE NEW CITY.', W / 2, 150, win(t, 169.1, 173.0), { size: 36 });
  }
  // B12 (173–183.4): the whole story
  if (t > 173.2) {
    marker(ctx, c, 'parliament', 'canberra', 140, 1);
    const [cx, cy] = at(c, 'canberra'); goldLabel(ctx, 'CANBERRA', cx, cy + 50, 46, 1);
    person(ctx, 'sydney', 1500, 1030, 240, { k: pop(t - 174.4) }); person(ctx, 'melbourne', 420, 1030, 240, { k: pop(t - 174.6) });
    title(ctx, 'THE WHOLE STORY', 150, pop(t - 176.8, 0.45), 110);
  }
}
// ---------------------------------------------------------------- cutaway cards: the design competition (B7) and the name (B8)
function sceneCards(ctx, t) {
  const k7 = clamp((t - 86.6) / 0.6) * (1 - clamp((t - 99.4) / 0.5));
  if (k7 > 0) { card(ctx, k7);
    title(ctx, 'DESIGN THE CAPITAL', 200, pop(t - 87.0, 0.35), 90);
    for (let i = 0; i < 24; i++) { const u = clamp((t - 89.2 - i * 0.04) / 0.8), r = rnd(400 + i * 977); r(); const x = lerp(W / 2 + (r() - 0.5) * 1400, 760 + (i % 6) * 18, easeOut(u)), y = lerp(-100, 560 - Math.floor(i / 6) * 16, easeOut(u));
      if (u <= 0) continue; ctx.save(); ctx.translate(x, y); ctx.rotate((r() - 0.5) * 0.6 * (1 - u)); ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(-70, -45, 140, 90); ctx.strokeRect(-70, -45, 140, 90); ctx.fillStyle = '#9AB3C9'; ctx.fillRect(-56, -32, 112, 40); ctx.restore(); }
    kinetic(ctx, '130+ ENTRIES', 760, 760, win(t, 89.8, 99.2), 90);
    person(ctx, 'brit_architect', 1420, 900, 280, { k: win(t, 91.5, 95.6) });
    const kb = win(t, 92.6, 95.6); if (kb > 0) { ctx.save(); ctx.translate(1600, 520); ctx.scale(kb, kb); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.fillRect(-150, -60, 300, 120); ctx.strokeRect(-150, -60, 300, 120);
      setFont(ctx, 'Montserrat', 50); ctx.fillStyle = '#E63946'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BOYCOTT', 0, 4); ctx.restore(); }
    person(ctx, 'walter', 1300, 900, 260, { k: win(t, 97.6, 99.3) }); person(ctx, 'marion', 1560, 900, 260, { k: win(t, 98.8, 99.3) });
    chip(ctx, 'THE WINNERS', 1430, 350, win(t, 95.7, 99.2), { size: 36 }); chip(ctx, 'WALTER BURLEY GRIFFIN & MARION MAHONY GRIFFIN', 1430, 430, win(t, 97.8, 99.2), { size: 22 });
    endCard(ctx);
  }
  // the plan drawn over the valley (100–107.6)
  if (t > 99.8 && t < 107.9) {
    const c = camAt(t), [cx, cy] = P(c, ...PL.canberra), k = clamp((t - 100.2) / 1.0);
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#1F4E79'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#E8F1F8'; ctx.lineWidth = 6; ctx.setLineDash([16, 10]); ctx.globalAlpha = k;
    const A = [cx, cy - 280], B = [cx - 360, cy + 220], Cc = [cx + 360, cy + 220]; ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...Cc); ctx.closePath(); ctx.stroke();
    for (const p of [A, B, Cc]) { ctx.beginPath(); ctx.arc(p[0], p[1], 60, 0, 7); ctx.stroke(); } ctx.restore();
    const kl = clamp((t - 102.4) / 1.0); if (kl > 0) { ctx.save(); ctx.fillStyle = 'rgba(93,173,226,0.85)'; ctx.beginPath(); ctx.ellipse(cx, cy + 40, 520 * kl, 60 * kl, -0.1, 0, 7); ctx.fill(); ctx.restore(); }
    [['LAKES', 102.5, -500], ['HILLS', 103.0, 0], ['GRAND AVENUES', 104.0, 500]].forEach(([s, t0, dx]) => chip(ctx, s, W / 2 + dx, 160, win(t, t0, 107.4), { size: 34, stroke: '#E8F1F8' }));
    title(ctx, 'A BREATHTAKING PLAN', 270, win(t, 100.4, 102.4, .3), 90);
    chip(ctx, 'LINED UP WITH THE MOUNTAINS', W / 2, 960, win(t, 105.0, 107.4), { size: 32, stroke: '#E8F1F8' });
  }
  // B8: the name board
  const k8 = clamp((t - 107.7) / 0.6) * (1 - clamp((t - 116.7) / 0.5));
  if (k8 > 0) { card(ctx, k8);
    title(ctx, 'NAME THE CAPITAL', 200, pop(t - 108.0, 0.35), 90);
    const notes = ['?', '??', '…', '?', '???', '…'];
    notes.forEach((s, i) => { const k = pop(t - 109.6 - i * 0.18, 0.3); if (k <= 0) return; const x = 300 + (i % 3) * 260, y = 420 + Math.floor(i / 3) * 220; ctx.save(); ctx.translate(x, y); ctx.rotate(((i * 37) % 9 - 4) * 0.02); ctx.scale(k, k);
      ctx.fillStyle = ['#FFE680', '#FFB3C1', '#B5EAD7'][i % 3]; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(-110, -80, 220, 160); ctx.strokeRect(-110, -80, 220, 160); setFont(ctx, 'Montserrat', 60); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 4); ctx.restore(); });
    chip(ctx, '…SOME WERE CREATIVE', 560, 860, win(t, 111.3, 116.5), { size: 32 });
    const parts = [['SYD', '#E63946'], ['MEL', '#2E86DE'], ['AD', '#F39C12'], ['PER', '#27AE60'], ['BRIS', '#8E44AD'], ['HO', '#16A085']];
    let x = 1150; setFont(ctx, 'Montserrat', 52); const widths = parts.map(p => ctx.measureText(p[0]).width), total = widths.reduce((a, b) => a + b, 0); x = 1400 - total / 2;
    parts.forEach(([s, col], i) => { const k = pop(t - 112.9 - i * 0.12, 0.3); if (k > 0) { ctx.save(); ctx.translate(x + widths[i] / 2, 560); ctx.scale(k, k); setFont(ctx, 'Montserrat', 52); ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 0); ctx.restore(); } x += widths[i]; });
    styledText(ctx, 'Sydney · Melbourne · Adelaide · Perth · Brisbane · Hobart', 1400, 640, 22, { k: pop(t - 113.6), fill: '#DDE6EA' });
    if (t > 115.2) styledText(ctx, '"SYDMELADPERBRISHO"', 1400, 760, 46, { k: pop(t - 115.3, 0.3), fill: C.yellow, stroke: C.goldDark });
    endCard(ctx);
  }
}

const CAPTIONS = [
  [0.1, 4.9, 'Two rival cities'], [5.0, 6.7, 'A brand-new capital'], [6.8, 9.5, '1901: nothing there'], [9.6, 11.4, 'Not one street'], [11.5, 14.6, 'So where did they go?'],
  [15.1, 17.6, 'To Melbourne'], [17.7, 20.0, 'Until it was ready'], [20.1, 22.8, 'Victoria moves out'], [22.9, 25.0, 'Into an exhibition hall'], [25.1, 29.7, 'For 26 years'],
  [30.0, 32.8, 'The hunt begins'], [32.9, 37.3, 'Weather, water, views'], [37.4, 42.5, '1904: Dalgety'],
  [43.2, 47.0, 'NSW hated it'], [47.1, 49.6, 'Too close to Victoria'], [49.7, 53.4, 'Scrapped for Yass-Canberra'], [53.5, 57.2, 'A surveyor rides out'], [57.3, 61.4, 'The perfect valley'],
  [61.8, 66.3, 'A capital territory'], [66.4, 70.6, 'Plus a coastline'], [70.7, 74.6, 'Jervis Bay'],
  [74.9, 77.6, 'The minister in charge'], [77.7, 80.1, "King O'Malley"], [80.2, 83.4, 'Alcohol: banned'], [83.5, 86.3, 'Until 1928'],
  [86.6, 89.1, 'A world contest'], [89.2, 91.4, '130+ entries'], [91.5, 95.6, 'British architects boycott'], [95.7, 99.9, 'The Griffins win'], [100.0, 104.4, 'Lakes, hills, avenues'], [104.5, 107.4, 'Lined up with mountains'],
  [107.7, 111.3, 'Naming the capital'], [111.4, 114.8, 'Some were creative'], [114.9, 116.8, '"Sydmeladperbrisho"'], [116.9, 120.0, '1913: Canberra'], [120.1, 123.6, 'A local Aboriginal name'],
  [123.9, 126.4, 'Building is slow'], [126.5, 130.0, 'Griffin takes charge'], [130.1, 132.8, 'Fighting bureaucrats'], [132.9, 134.5, 'Out by 1920'], [134.6, 137.2, 'War drains the money'], [137.3, 139.1, 'Construction crawls'],
  [139.4, 144.0, '1927: Parliament arrives'], [144.1, 146.5, 'Goodbye, Melbourne'], [146.6, 150.3, 'More delays'], [150.4, 154.4, 'The lake: 1964'], [154.5, 160.2, 'Parliament House: 1988'],
  [160.6, 163.4, 'Nearly half a million'], [163.5, 166.0, 'The nation\'s capital'], [166.1, 172.8, 'Born from a rivalry'],
  [173.3, 176.2, '"Sydney is the capital"'], [176.3, 179.0, 'Now you know the story'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .26, .18); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, H * 1.0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function sceneSubscribe(ctx, t) {
  if (t < 179.2) return; const e = t - 179.2, k = clamp(e / 0.4);
  ctx.fillStyle = `rgba(4,10,14,${0.7 * k})`; ctx.fillRect(0, 0, W, H);
  title(ctx, 'MAPHELD', 430, pop(e - 0.1, 0.4), 130);
  styledText(ctx, 'Every border has a story.', W / 2, 560, 48, { k: pop(e - 0.4, 0.4), fill: '#fff' });
  const kc = pop(e - 0.8, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 700); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 44); const w = ctx.measureText('SUBSCRIBE').width + 110;
    ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -50, w, 100, 50); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SUBSCRIBE', 0, 3); ctx.restore(); }
}
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t);
  drawMap(ctx, c); sceneMap(ctx, c, t); sceneCards(ctx, t);
  vignette(ctx); if (t < 179.2) drawText(ctx, t); sceneSubscribe(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  const fi = 1 - clamp(t / 0.4), fo = clamp((t - 182.9) / 0.5); if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
}
window.renderAt = renderAt; window.READY = false;
loadAssets().then(() => {
  window.READY = true; if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play'), aud = document.getElementById('aud');
  ctl.style.display = 'flex'; if (window.AUDIO) aud.src = window.AUDIO; let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); if (window.AUDIO) { if (playing) { aud.currentTime = t; aud.play().catch(() => {}); } else aud.pause(); } };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; if (window.AUDIO) aud.currentTime = t; draw(); };
  const tick = now => { if (playing) { t = window.AUDIO && !aud.paused ? aud.currentTime : t + (now - last) / 1000; last = now; if (t >= DURATION) t = 0; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
