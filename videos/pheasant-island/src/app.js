/* Pheasant Island: the island that changes country every 6 months — Mapheld 9:16 short. renderAt(t) draws storyboard time t (= voiceover time). */
'use strict';
const W = 1080, H = 1920, DURATION = 61.96;
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
  iberia: [-1.5, 44.0, 52], basque: [-1.77, 43.35, 2600],
};
const KEYS = [[0, 'iberia', 1], [6.8, 'iberia', 1], [9.6, 'basque', 1], [61.96, 'basque', 1.05]];
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
  for (const key of ['wide', 'near', 'fra', 'esp']) {
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
  const set = c.z > 60 ? PATHS.near : PATHS.wide;
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

const ESP = '#AA151B', ESPY = '#F1BF00', FRB = '#002395', FRR = '#ED2939';
function fillKey(ctx, c, key, style, a, glow) {
  if (a <= 0 || !PATHS[key]) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = style; ctx.fill(pp); if (glow) { ctx.globalAlpha = Math.min(1, a * 1.6); ctx.strokeStyle = glow; ctx.lineWidth = 4; ctx.stroke(pp); } ctx.restore();
}
// the river scene: France on the top bank (Hendaye), Spain on the bottom bank (Irun), the island in the middle
function flagDraw(ctx, x, y, w, kind, wave = 0) {
  const h = w * 0.66; ctx.save(); ctx.translate(x, y); ctx.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12; ctx.lineTo(u * w, Math.sin(u * 5 + wave) * w * 0.04); } for (let i = 12; i >= 0; i--) { const u = i / 12; ctx.lineTo(u * w, h + Math.sin(u * 5 + wave) * w * 0.04); } ctx.closePath(); ctx.clip();
  if (kind === 'esp') { ctx.fillStyle = ESP; ctx.fillRect(0, -20, w, h + 40); ctx.fillStyle = ESPY; ctx.fillRect(0, h * 0.25, w, h * 0.5); }
  else if (kind === 'fra') { ctx.fillStyle = FRB; ctx.fillRect(0, -20, w / 3, h + 40); ctx.fillStyle = '#fff'; ctx.fillRect(w / 3, -20, w / 3, h + 40); ctx.fillStyle = FRR; ctx.fillRect(2 * w / 3, -20, w / 3, h + 40); }
  else { ctx.fillStyle = ESP; ctx.fillRect(0, -20, w / 2, h + 40); ctx.fillStyle = FRB; ctx.fillRect(w / 2, -20, w / 2, h + 40); ctx.fillStyle = ESPY; ctx.fillRect(0, h * 0.25, w / 2, h * 0.5); ctx.fillStyle = '#fff'; ctx.fillRect(w / 2 + w / 6, -20, w / 6, h + 40); ctx.fillStyle = FRR; ctx.fillRect(w / 2 + w / 3, -20, w / 6, h + 40); }
  ctx.restore(); }
function riverScene(ctx, t, flag, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8FC1D6'); g.addColorStop(0.4, '#CFE6EE'); g.addColorStop(1, '#CFE6EE'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#7FA35A'; ctx.beginPath(); ctx.moveTo(0, 420); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 640 + Math.sin(x / 120) * 24); ctx.lineTo(W, 420); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7FA35A'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 1260 + Math.sin(x / 140 + 1) * 24); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ocean; ctx.beginPath(); ctx.moveTo(0, 640); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 640 + Math.sin(x / 120) * 24); for (let x = W; x >= 0; x -= 30) ctx.lineTo(x, 1260 + Math.sin(x / 140 + 1) * 24); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; for (let i = 0; i < 8; i++) { const y = 720 + i * 66, off = (t * 40 + i * 70) % 200; ctx.beginPath(); for (let x = -200 + off; x < W; x += 200) { ctx.moveTo(x, y); ctx.lineTo(x + 70, y); } ctx.stroke(); }
  for (const [x, w, h] of [[120, 120, 140], [300, 160, 180], [820, 140, 150], [960, 110, 120]]) { ctx.fillStyle = '#EFE6D2'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillRect(x - w / 2, 560 - h, w, h); ctx.strokeRect(x - w / 2, 560 - h, w, h); ctx.fillStyle = '#C0504D'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, 564 - h); ctx.lineTo(x, 520 - h); ctx.lineTo(x + w / 2 + 8, 564 - h); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  for (const [x, w, h] of [[160, 140, 130], [380, 120, 110], [780, 150, 160], [960, 120, 130]]) { ctx.fillStyle = '#F4D9A8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.fillRect(x - w / 2, 1450 - h, w, h); ctx.strokeRect(x - w / 2, 1450 - h, w, h); ctx.fillStyle = '#B5562E'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, 1454 - h); ctx.lineTo(x, 1410 - h); ctx.lineTo(x + w / 2 + 8, 1454 - h); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (o.labels !== false) { styledText(ctx, '🇫🇷 FRANCE · HENDAYE', W / 2, 380, 52, { fill: '#fff', stroke: C.ink }); styledText(ctx, '🇪🇸 SPAIN · IRUN', W / 2, 1520, 52, { fill: '#fff', stroke: C.ink }); }
  // the island
  const ix = W / 2, iy = 960, s = o.islandScale || 1;
  ctx.save(); ctx.translate(ix, iy); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(0, 10, 330, 110, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#8DB35A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, 300, 90, -0.05, 0, 7); ctx.fill(); ctx.stroke();
  for (const [x, y, r] of [[-200, -40, 38], [-150, -70, 46], [150, -60, 44], [210, -30, 36], [-60, -60, 30]]) { ctx.fillStyle = '#4E7A3A'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); }
  if (o.monument !== false) { ctx.fillStyle = '#EFE6D2'; ctx.fillRect(-26, -150, 52, 120); ctx.strokeRect(-26, -150, 52, 120); ctx.beginPath(); ctx.moveTo(-36, -150); ctx.lineTo(0, -190); ctx.lineTo(36, -150); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (flag) { ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(120, -20); ctx.lineTo(120, -320); ctx.stroke(); flagDraw(ctx, 124, -316, 170, flag, t * 3); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(124, -316, 170, 112); }
  ctx.restore();
}
function calendarCard(ctx, x, y, s, label, sub, k, col = '#E63946') { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k * s, k * s); ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-140, -120, 280, 250, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-140, -120, 280, 70, [22, 22, 0, 0]); ctx.fill(); ctx.stroke(); setFont(ctx, 'Montserrat', 40); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, -84);
  setFont(ctx, 'Montserrat', 110); ctx.fillStyle = C.ink; ctx.fillText(sub, 0, 40); ctx.restore(); }
function monthWheel(ctx, x, y, r, t, ang) {   // Feb–Jul Spain, Aug–Jan France; a pointer sweeps round
  const M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  for (let i = 0; i < 12; i++) { const a0 = -Math.PI / 2 + i * Math.PI / 6, sp = i >= 1 && i <= 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a0, a0 + Math.PI / 6); ctx.closePath(); ctx.fillStyle = sp ? (i % 2 ? ESP : '#C42830') : (i % 2 ? FRB : '#1A3BB0'); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    const am = a0 + Math.PI / 12; styledText(ctx, M[i], x + Math.cos(am) * r * 0.72, y + Math.sin(am) * r * 0.72, r * 0.13, { fill: sp ? ESPY : '#fff', shadow: 2 }); }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, 7); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -r * 1.08); ctx.lineTo(18, -r * 0.3); ctx.lineTo(-18, -r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
function pitch(ctx, x, y, w, k) { if (k <= 0) return; const h = w * 0.64; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = 'rgba(76,175,80,0.85)'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, h * 0.15, 0, 7); ctx.stroke(); ctx.strokeRect(-w / 2, -h * 0.22, w * 0.14, h * 0.44); ctx.strokeRect(w / 2 - w * 0.14, -h * 0.22, w * 0.14, h * 0.44); ctx.restore(); }

function scene(ctx, t) {
  const c = camAt(t);
  // S1 hook: the island, the calendar flips July 31 → August 1, the flag flips
  if (t < 6.6) {
    riverScene(ctx, t, t < 5.55 ? 'esp' : 'fra', { labels: false });
    styledText(ctx, 'THIS ISLAND\nSWITCHES COUNTRY', W / 2, 220, 92, { fill: C.yellow, stroke: C.goldDark, rot: -3, k: t < 0.05 ? 1 : popOut(6.5 - t) });
    calendarCard(ctx, 230, 1130 - 380, 0.85, t < 4.3 ? 'JULY' : 'AUGUST', t < 4.3 ? '31' : '1', t > 2.6 ? 1 : pop(t - 0.5), t < 4.3 ? '#E63946' : '#2E86DE');
    if (t > 4.2 && t < 4.6) flash(ctx, (t - 4.2) / 0.4);
    stamp(ctx, 'NOW FRENCH', 780, 1150, t, 5.6, { size: 54, color: FRB, until: 6.5 });
    return;
  }
  // S2 the map: France and Spain → the Basque border → the island
  if (t < 12.8) {
    drawMap(ctx, c); fillKey(ctx, c, 'fra', FRB, 0.35, '#9DB4FF'); fillKey(ctx, c, 'esp', ESP, 0.35, '#FFB0B0');
    const [fx, fy] = P(c, 2.3, 46.8), [ex, ey] = P(c, -3.6, 40.0); if (c.z < 200) { goldLabel(ctx, 'FRANCE', fx, fy, 64, 1); goldLabel(ctx, 'SPAIN', ex, ey, 64, 1); }
    const [ix, iy] = P(c, ...GEO.places.island); const kz = clamp((c.z - 300) / 1200);
    if (c.z > 200) { const [hx, hy] = P(c, ...GEO.places.hendaye), [rx, ry] = P(c, ...GEO.places.irun); goldLabel(ctx, 'HENDAYE', hx + 160, hy - 90, 44, kz); goldLabel(ctx, 'IRUN', rx - 120, ry + 90, 44, kz); }
    ctx.save(); ctx.translate(ix, iy); const s = 1 + 2 * kz; ctx.fillStyle = '#8DB35A'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 18 * s, 6 * s, -0.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.shadowColor = C.gold; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(ix, iy, 60 + 20 * Math.sin(t * 4), 0, 7); ctx.stroke(); ctx.restore();
    goldLabel(ctx, 'PHEASANT ISLAND', ix, iy + 150, 60, pop(t - 6.9));
    chip(ctx, 'BIDASOA RIVER · THE BORDER', W / 2, 330, win(t, 10.0, 12.8), { size: 40 });
    return;
  }
  // S2b smaller than a football field
  if (t < 15.25) { riverScene(ctx, t, 'fra'); pitch(ctx, W / 2, 960, 720, pop(t - 13.1, 0.35)); chip(ctx, '⚽ SMALLER THAN A FOOTBALL PITCH', W / 2, 260, win(t, 13.1, 15.2), { size: 38 }); return; }
  // S3 the calendar: Feb–Jul Spanish, Aug–Jan French; two naval commanders take turns
  if (t < 24.75) {
    const ang = t < 15.9 ? 0.5 : t < 18.4 ? lerp(0.5, 3.3, easeIO((t - 15.9) / 1.2)) : t < 20.6 ? lerp(3.3, 6.0, easeIO((t - 18.4) / 1.2)) : 6.0 + (t - 20.6) * 1.4;
    const month = ((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (Math.PI / 6), sp = month >= 1 && month < 7;
    riverScene(ctx, t, sp ? 'esp' : 'fra', { labels: false });
    monthWheel(ctx, W / 2, 470, 250, t, ang);
    styledText(ctx, sp ? 'SPANISH' : 'FRENCH', W / 2, 800, 80, { fill: sp ? ESPY : '#fff', stroke: C.ink, k: t > 16.9 ? 1 : 0 });
    if (t > 20.8) { const kk = pop(t - 20.9); person(ctx, (t > 22.9 && Math.floor((t - 22.9) * 1.5) % 2 === 0) ? 'officer_esp_give' : 'officer_esp_stand', 260, 1560, 270, { k: kk }); person(ctx, (t > 22.9 && Math.floor((t - 22.9) * 1.5) % 2 === 1) ? 'officer_fra_give' : 'officer_fra_stand', 820, 1560, 270, { k: kk, flip: true }); }
    chip(ctx, 'TWO NAVAL COMMANDERS TAKE TURNS', W / 2, 160, win(t, 21.0, 24.6), { size: 36 });
    return;
  }
  // S4 1659: twenty years of war, neutral ground, the Treaty of the Pyrenees
  if (t < 37.4) {
    riverScene(ctx, t, null, { labels: false, monument: false });
    kinetic(ctx, 'WHY SHARE IT?', 300, win(t, 24.8, 27.2), 104, -3, '#FFFFFF');
    title(ctx, '1659', 300, win(t, 27.3, 29.3, 0.35), 170);
    if (t > 29.3 && t < 31.3) { ctx.save(); const k = pop(t - 29.4); ctx.translate(W / 2, 960); ctx.scale(k, k); for (const sd of [-1, 1]) { ctx.save(); ctx.rotate(sd * 0.7); ctx.fillStyle = '#C9CED6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.fillRect(-12, -200, 24, 300); ctx.strokeRect(-12, -200, 24, 300); ctx.fillStyle = '#7A4A2A'; ctx.fillRect(-40, 90, 80, 22); ctx.strokeRect(-40, 90, 80, 22); ctx.restore(); } ctx.restore(); kinetic(ctx, '20+ YEARS OF WAR', 300, win(t, 29.4, 31.3), 90, -3, '#FF6B6B'); }
    if (t > 31.3) { chip(ctx, 'NEUTRAL GROUND: THE MIDDLE OF THE RIVER', W / 2, 260, win(t, 31.4, 34.4), { size: 34 });
      const u = easeOut((t - 33.4) / 1.4); person(ctx, 'dipl_fra', lerp(540, 700, u), lerp(560, 930, u), 220, { k: pop(t - 33.3), flip: true }); person(ctx, 'dipl_esp', lerp(540, 380, u), lerp(1450, 930, u), 220, { k: pop(t - 33.3) });
      if (t > 35.4) { const k = pop(t - 35.5); ctx.save(); ctx.translate(W / 2, 520); ctx.scale(k, k); ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-360, -110, 720, 220, 14); ctx.fill(); ctx.stroke(); setFont(ctx, 'Playfair Display', 56); ctx.fillStyle = '#2A2118'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TREATY OF', 0, -36); ctx.fillText('THE PYRENEES', 0, 34); ctx.restore(); } }
    return;
  }
  // S5 1660: the young king meets his Spanish bride on the island
  if (t < 44.4) {
    riverScene(ctx, t, null, { labels: false, monument: false });
    title(ctx, '1660', 300, win(t, 37.5, 39.9, 0.35), 160);
    const u = easeOut((t - 40.6) / 1.6); person(ctx, 'king_fra', lerp(820, 650, u), 930, 240, { k: pop(t - 40.4), flip: true }); person(ctx, 'infanta_esp', lerp(260, 430, u), 930, 240, { k: pop(t - 42.3) });
    chip(ctx, 'LOUIS XIV MEETS HIS SPANISH BRIDE', W / 2, 260, win(t, 40.6, 44.3), { size: 36 });
    if (t > 42.9) for (let i = 0; i < 6; i++) { const uu = ((t - 42.9) * 0.7 + i / 6) % 1; heart(ctx, W / 2 + Math.sin(i * 2 + t) * 60, 760 - uu * 260, 1.6, 1 - uu); }
    return;
  }
  // S6 so they shared it
  if (t < 48.6) {
    riverScene(ctx, t, 'half');
    stamp(ctx, 'SHARED', W / 2, 700, t, 47.6, { size: 90, color: '#1E8449', rot: -8 });
    person(ctx, 'officer_esp_wave', 300, 1560, 250, { k: pop(t - 44.6) }); person(ctx, 'officer_fra_wave', 780, 1560, 250, { k: pop(t - 44.8), flip: true });
    return;
  }
  // S7 today: nobody lives there, no visits… one of the smallest shared lands. Which side?
  if (t < 55.7) {
    riverScene(ctx, t, ((Math.floor(t / 1.3)) % 2) ? 'esp' : 'fra', { labels: false });
    chip(ctx, '🚫 NOBODY LIVES HERE', W / 2, 260, win(t, 48.7, 50.3), { size: 44 }); chip(ctx, '🔒 USUALLY NO VISITS', W / 2, 260, win(t, 50.3, 51.5), { size: 44 });
    chip(ctx, 'ONE OF THE SMALLEST LANDS', W / 2, 220, win(t, 51.6, 55.6), { size: 40 }); chip(ctx, 'SHARED BY TWO COUNTRIES', W / 2, 320, win(t, 52.6, 55.6), { size: 40 });
    return;
  }
  riverScene(ctx, t, ((Math.floor(t / 0.9)) % 2) ? 'esp' : 'fra', { labels: false });
  kinetic(ctx, 'WHICH SIDE?', 280, pop(t - 55.8), 120);
  person(ctx, 'officer_esp_wave', 300, 1560, 260, { k: pop(t - 56.2) }); person(ctx, 'officer_fra_wave', 780, 1560, 260, { k: pop(t - 57.6), flip: true });
  chip(ctx, '🇪🇸 SPAIN', 300, 1200, pop(t - 56.9), { size: 50, stroke: ESPY }); chip(ctx, '🇫🇷 FRANCE', 780, 1200, pop(t - 57.9), { size: 50, stroke: '#9DB4FF' });
}
function heart(ctx, x, y, s, a) { ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#FF3B5C'; ctx.beginPath(); ctx.moveTo(0, 18); ctx.bezierCurveTo(-40, -10, -20, -40, 0, -20); ctx.bezierCurveTo(20, -40, 40, -10, 0, 18); ctx.fill(); ctx.restore(); }
function sceneEnd(ctx, t) {
  if (t < 59.0) return; const e = t - 59.0, k = clamp(e / 0.35);
  ctx.fillStyle = `rgba(4,10,14,${0.72 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, 'COMMENT YOUR SIDE 👇', W / 2, 700, 84, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'NEXT SWITCH: FEB 1', W / 2, 860, 90, { k: pop(e - 0.3, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  const kc = pop(e - 0.8, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 1060); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 46);
    const w = ctx.measureText('FOLLOW MAPHELD').width + 120; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -56, w, 112, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 40, -20); ctx.lineTo(-w / 2 + 40, 20); ctx.lineTo(-w / 2 + 72, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FOLLOW MAPHELD', 22, 3); ctx.restore(); }
}
const CAPTIONS = [
  [0.0, 2.7, 'Spanish… until August'], [2.7, 6.5, 'Then, overnight: French'], [6.6, 9.4, 'Pheasant Island'], [9.4, 12.8, 'On the Spain–France border'], [12.85, 15.1, 'Smaller than a football pitch'],
  [15.25, 18.3, 'Feb to July: Spanish'], [18.35, 20.7, 'Aug to Jan: French'], [20.8, 24.6, 'Two commanders take turns'],
  [24.75, 27.2, 'Why share it?'], [27.3, 31.2, '1659: 20+ years of war'], [31.3, 35.3, 'They met on neutral ground'], [35.4, 37.3, 'The Treaty of the Pyrenees'],
  [37.45, 40.1, 'A year later…'], [40.2, 44.3, 'Louis XIV met his bride here'], [44.45, 48.4, 'So they shared it'],
  [48.6, 51.2, 'Nobody lives there'], [51.3, 55.6, 'One of the smallest shared lands'], [55.8, 58.9, 'Spain or France?'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  scene(ctx, t); vignette(ctx); if (t < 59.0) drawText(ctx, t); sceneEnd(ctx, t);
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
