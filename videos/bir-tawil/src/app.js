/* Bir Tawil: the only land outside Antarctica nobody claims — Mapheld 9:16 short, built as a LOOP (last frame = first frame). */
'use strict';
const W = 1080, H = 1920, DURATION = 50.75;
const C = {
  ocean: '#1E4D5C', land: '#8A855C', landDim: '#6E6B50', coast: '#2C3531', halo: '#2C6A78', ink: '#141416',
  gold: '#F4D03F', goldDark: '#3A2A08', yellow: '#FFD43B', cyan: '#25E3FF', white: '#FFFFFF',
  usRed: '#B22234', usBlue: '#3C3B6E',
};
const CAPTION = { size: 66, y: 1600, font: 'Montserrat', shadow: 4 };   // spec said 48px; 64 reads better on phones


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
  bt: [33.66, 21.88, 470], region: [31.0, 22.5, 70], borders: [35.0, 22.35, 230],
};
const KEYS = [[0, 'bt', 1], [3.3, 'bt', 1.0], [5.0, 'region', 1], [12.0, 'region', 1.02], [18.4, 'region', 1.0], [19.6, 'borders', 1], [40.8, 'borders', 1.02], [42.0, 'bt', 0.85], [47.0, 'bt', 0.88], [48.9, 'bt', 1.0], [50.75, 'bt', 1.0]];
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
  for (const key of ['wide', 'egy', 'sdn', 'brt', 'hal']) {
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
  const set = PATHS.wide;
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
  ctx.save(); ctx.setTransform(M); ctx.strokeStyle = C.coast; ctx.lineWidth = 2.6 / c.z; ctx.lineJoin = 'round'; for (const p of set) ctx.stroke(p); ctx.restore();
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

// ------------------------------------------------------------------ scenes (storyboard time = voiceover time, 0–65.7 s)
const PL = GEO.places;
const fmt = n => Math.round(n).toLocaleString('en-US');
function chip(ctx, text, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', o.size || 38);
  const w = ctx.measureText(text).width + 54, h = (o.size || 38) * 1.75;
  ctx.fillStyle = o.bg || 'rgba(10,24,32,0.92)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2); ctx.restore();
}
function goldLabel(ctx, text, x, y, size, k) { styledText(ctx, text, x, y, size, { k, fill: C.gold, stroke: C.goldDark, shadow: 5 }); }
function title(ctx, text, y, k, size = 130) { styledText(ctx, text, W / 2, y, size, { k, font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark }); }
function kinetic(ctx, text, y, k, size = 100, rot = -3, fill = C.yellow) { styledText(ctx, text, W / 2, y, size, { k, fill, stroke: C.goldDark, rot }); }
function person(ctx, name, x, y, w, o = {}) { sprite(ctx, name, x, y, w, { ay: 0.96, ...o }); }
function stamp(ctx, text, x, y, t, t0, o = {}) {
  const e = t - t0; if (e < 0 || (o.until && t > o.until)) return;
  const sl = e < 0.16 ? lerp(2.3, 1, easeIn(e / 0.16)) : 1 + 0.05 * Math.max(0, 1 - (e - 0.16) * 6), a = o.until ? clamp((o.until - t) / 0.2) : 1;
  const col = o.color || '#D7263D', size = o.size || 60;
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot ?? -9) * Math.PI / 180); ctx.scale(sl, sl); ctx.globalAlpha = a; setFont(ctx, 'Montserrat', size);
  const w = ctx.measureText(text).width + 56, h = size * 1.45;
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 3); ctx.restore();
}
function redX(ctx, x, y, s, k) {
  if (k <= 0) return; ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = s * 0.14; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8;
  const a = clamp(k * 2), b = clamp(k * 2 - 1);
  ctx.beginPath(); ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x - s / 2 + s * a, y - s / 2 + s * a); ctx.stroke();
  if (b > 0) { ctx.beginPath(); ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x + s / 2 - s * b, y - s / 2 + s * b); ctx.stroke(); } ctx.restore();
}
function spriteHand(name, x, feet, w, hx, hy) { const im = IMG[name]; const h = w * (im ? im.height / im.width : 520 / 300); return [x - w / 2 + hx * w / 300, feet - 0.96 * h + hy * w / 300]; }

const EGYC = '#CE1126', SDNC = '#007229', SAND = '#E2C38B';
function fillKey(ctx, c, key, style, a, glow) {
  if (a <= 0 || !PATHS[key]) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = style; ctx.fill(pp); if (glow) { ctx.globalAlpha = Math.min(1, a * 1.6); ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.shadowColor = glow; ctx.shadowBlur = 16; ctx.stroke(pp); } ctx.restore(); }
function at(c, lon, lat) { return P(c, lon, lat); }
function line22(ctx, c, k, col = C.gold, label) { if (k <= 0) return; const [x0, y] = P(c, 25, 22), [x1] = P(c, 37.5, 22); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, clamp(k)), y); ctx.stroke(); ctx.restore(); if (label) chip(ctx, label, Math.min(W - 180, lerp(x0, x1, clamp(k)) - 40), y - 60, clamp(k * 2), { size: 34 }); }
function line1902(ctx, c, k, label) { const r = GEO.line1902[0], pts = []; for (let i = 0; i < r.length; i += 2) pts.push([r[i], r[i + 1]]); geoLine(ctx, c, pts, k, '#FFFFFF', 6, [16, 10]); if (label && k > 0.6) { const [x, y] = P(c, 35.3, 23.0); chip(ctx, label, x - 40, y - 70, clamp((k - 0.6) * 3), { size: 34, stroke: '#FFFFFF' }); } }
function opening(ctx, c, t, k) {   // the shared first/last frame elements (the loop seam)
  fillKey(ctx, c, 'brt', C.gold, 0.6 * (0.85 + 0.15 * Math.sin(t * 4)), C.gold);
  const [bx, by] = at(c, 33.66, 21.88); styledText(ctx, '?', bx, by, 160, { fill: '#FFFFFF', stroke: C.ink, k });
  styledText(ctx, 'NOBODY CLAIMS\nTHIS LAND', W / 2, 270, 104, { fill: C.yellow, stroke: C.goldDark, rot: -3, k });
}
function scene(ctx, t) {
  const c = camAt(t); drawMap(ctx, c);
  const tintE = t > 4.0 ? clamp((t - 4.4) / 0.8) * (1 - clamp((t - 48.9) / 0.9)) * 0.35 : 0;
  fillKey(ctx, c, 'egy', EGYC, tintE, null); fillKey(ctx, c, 'sdn', SDNC, tintE, null);
  // halaib colouring follows the border being shown
  let halCol = null, brtCol = null;
  if (t > 25.8 && t < 29.8) { halCol = EGYC; if (t > 26.4) brtCol = SDNC; } else if (t > 29.8 && t < 33.0) { halCol = SDNC; if (t > 30.9) brtCol = EGYC; }
  if (halCol) fillKey(ctx, c, 'hal', halCol, 0.75, '#FFFFFF');
  if (t > 33.0 && t < 40.9) fillKey(ctx, c, 'hal', C.gold, 0.55 + 0.25 * Math.sin(t * 5), C.gold);
  if (brtCol) fillKey(ctx, c, 'brt', brtCol, 0.85, '#FFFFFF');
  // the loop seam: opening composition at the start and again at the very end
  const kOpen = t < 3.3 ? 1 : t < 3.9 ? 1 - (t - 3.3) / 0.6 : t > 48.9 ? clamp((t - 48.9) / 0.9) : 0;
  if (kOpen > 0) opening(ctx, c, t, kOpen);
  else if (!brtCol) fillKey(ctx, c, 'brt', C.gold, 0.55, C.gold);
  chip(ctx, '(OUTSIDE ANTARCTICA)', W / 2, 470, t < 3.3 ? 1 : clamp((t - 49.2) / 0.6), { size: 32 });
  if (t > 3.6 && t < 12.3) { const [ex, ey] = at(c, 29.5, 26.5), [sx, sy] = at(c, 30.0, 16.0); goldLabel(ctx, 'EGYPT', ex, ey, 64, pop(t - 4.4)); goldLabel(ctx, 'SUDAN', sx, sy, 64, pop(t - 5.0)); }
  // B2 name + size vs London
  if (t > 6.0 && t < 12.2) { const [bx, by] = at(c, 33.66, 21.88); goldLabel(ctx, 'BIR TAWIL', bx, by - 90, 56, pop(t - 6.4)); chip(ctx, '≈ 2,060 KM² OF SAND & ROCK', W / 2, 330, win(t, 7.5, 10.0), { size: 38 });
    if (t > 10.0) { const r = 0.2 * c.z, [lx, ly] = at(c, 36.4, 21.2); ctx.save(); ctx.globalAlpha = clamp((t - 10.1) / 0.4); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.arc(lx, ly, r, 0, 7); ctx.stroke(); ctx.restore(); styledText(ctx, 'LONDON', lx, ly + r + 40, 36, { k: pop(t - 10.2), fill: '#fff', stroke: C.ink }); chip(ctx, 'BIGGER THAN ALL OF LONDON', W / 2, 330, win(t, 10.1, 12.0), { size: 38 }); } }
  // B3 "not ours!" and the mid-video question
  if (t > 12.0 && t < 18.4) {
    person(ctx, t > 13.9 ? 'egy_push' : 'egy_stand', 250, 1560, 280, { k: pop(t - 12.2) }); person(ctx, t > 13.9 ? 'sdn_push' : 'sdn_stand', 830, 1560, 280, { k: pop(t - 12.4), flip: true });
    bubble(ctx, 260, 1060, 'NOT OURS!', 40, [0, 60], win(t, 14.0, 15.0)); bubble(ctx, 820, 1060, 'NOT OURS!', 40, [0, 60], win(t, 14.2, 15.0));
    kinetic(ctx, 'GUESS WHY 🤔👇', 330, win(t, 15.0, 18.2), 100);
  }
  // B4 two borders
  if (t > 18.2 && t < 40.9) { line22(ctx, c, clamp((t - 20.2) / 1.6), C.gold, t < 24.8 ? '1899 · STRAIGHT LINE' : '1899'); line1902(ctx, c, clamp((t - 22.6) / 1.6), t < 24.8 ? '1902' : '1902'); }
  if (t > 18.2 && t < 24.8) kinetic(ctx, 'TWO BORDERS', 330, win(t, 18.3, 20.2), 110);
  // B5 who gets what
  if (t > 24.8 && t < 33.0) { const [hx, hy] = at(c, 35.6, 22.55); goldLabel(ctx, 'HALAIB TRIANGLE', hx, hy - 30, 46, pop(t - 27.7)); const [bx, by] = at(c, 33.66, 21.88); goldLabel(ctx, 'BIR TAWIL', bx, by + 70, 40, 1);
    chip(ctx, t < 29.0 ? '1899 LINE: HALAIB → EGYPT' : '1902 LINE: HALAIB → SUDAN', W / 2, 330, win(t, 25.0, 32.9), { size: 38, stroke: t < 29.0 ? '#FF8A95' : '#7DDC9A' });
    if (t > 26.4 && t < 29.0) chip(ctx, 'BIR TAWIL → SUDAN', W / 2, 1360, win(t, 26.5, 28.9), { size: 38 }); if (t > 30.9) chip(ctx, 'BIR TAWIL → EGYPT', W / 2, 1360, win(t, 31.0, 32.9), { size: 38 }); }
  // B6 both grab Halaib, both push Bir Tawil away
  if (t > 33.0 && t < 40.95) {
    const grab = t < 37.4; person(ctx, grab ? 'egy_reach' : 'egy_push', 250, 1560, 280, { k: pop(t - 33.1) }); person(ctx, grab ? 'sdn_reach' : 'sdn_push', 830, 1560, 280, { k: pop(t - 33.3), flip: true });
    chip(ctx, 'BOTH WANT HALAIB', W / 2, 330, win(t, 33.2, 35.1), { size: 42 }); chip(ctx, 'EACH PICKS THE BORDER THAT GIVES IT HALAIB', W / 2, 330, win(t, 35.2, 37.5), { size: 30 });
    chip(ctx, '…AND THAT BORDER GIVES BIR TAWIL AWAY', W / 2, 330, win(t, 37.6, 39.7), { size: 32 }); stamp(ctx, 'NOBODY CLAIMS IT', W / 2, 1000, t, 39.8, { size: 46, until: 40.9 });
  }
  // B7 would-be kings
  if (t > 40.9 && t < 46.6) { const [bx, by] = at(c, 33.66, 21.88); person(ctx, 'king', bx + 40, by + 120, 300, { k: pop(t - 41.6) }); chip(ctx, '👑 SELF-DECLARED KINGS…', W / 2, 330, win(t, 42.0, 44.2), { size: 40 });
    stamp(ctx, 'NOT RECOGNIZED', W / 2, 1300, t, 45.4, { size: 58, until: 46.5 }); }
  // B8 no roads, no towns, no owner → back to the opening frame
  if (t > 46.5 && t < 48.9) { ['NO ROADS', 'NO TOWNS', 'NO OWNER'].forEach((s, i) => chip(ctx, s, W / 2, 1180 + i * 120, win(t, [46.6, 47.3, 48.1][i], 48.9), { size: 46 })); kinetic(ctx, 'WOULD YOU CLAIM IT? 👇', 330, win(t, 46.6, 48.8), 84); }
}
const CAPTIONS = [
  [0.0, 3.3, 'Nobody claims this land'], [3.4, 5.9, 'Between Egypt and Sudan'], [6.0, 9.9, 'Bir Tawil'], [10.0, 12.0, 'Bigger than London'],
  [12.1, 14.9, '"It\'s not ours!"'], [15.0, 18.1, 'Take a guess…'], [18.3, 22.5, 'Border 1: a straight line'], [22.6, 24.7, 'Border 2: a few years later'],
  [24.9, 28.9, 'Line 1: Halaib → Egypt'], [29.0, 32.9, 'Line 2: Halaib → Sudan'], [33.1, 37.5, 'Both want Halaib…'], [37.6, 40.8, '…so nobody takes Bir Tawil'],
  [41.0, 46.4, 'Self-declared kings: ignored'], [46.6, 48.8, 'No roads. No towns.'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); vignette(ctx); drawText(ctx, t);
  if (t > 48.9) styledText(ctx, 'Nobody claims this land', W / 2, CAPTION.y + 80, CAPTION.size, { k: clamp((t - 49.6) / 0.6), shadow: CAPTION.shadow, maxW: 1000 });
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}
window.renderAt = renderAt; window.READY = false;
loadAssets().then(() => {
  window.READY = true; if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  ctl.style.display = 'flex'; let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; draw(); };
  const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; last = now; draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
