/* Why is France next to Canada? (Saint-Pierre and Miquelon) — Mapheld 9:16 short. renderAt(t) draws storyboard time t (= voiceover time). */
'use strict';
const W = 1080, H = 1920, DURATION = 65.7;
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
  eastcan: [-60.5, 48.6, 50],
  nfl: [-56.0, 47.25, 230],
  spm: [-56.25, 46.93, 700],
  northam: [-86.0, 41.5, 17],
  banks: [-54.3, 46.1, 120],
  ferry: [-56.0, 46.93, 430],
  atlantic: [-25.5, 47.0, 12],
};
const KEYS = [
  [0, 'eastcan', 1], [1.4, 'eastcan', 1.0], [4.6, 'nfl', 1], [7.2, 'nfl', 1.0], [8.4, 'spm', 1], [20.2, 'spm', 1.06], [21.7, 'northam', 1], [31.0, 'northam', 1.04],
  [33.0, 'banks', 1], [40.8, 'banks', 1.04], [46.0, 'spm', 1], [49.9, 'spm', 1.03], [51.0, 'ferry', 1], [55.2, 'ferry', 1.03], [57.6, 'atlantic', 1], [65.7, 'atlantic', 1.04],
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
  for (const key of ['wide', 'near', 'spm', 'france']) {
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
  for (const k of ['east', 'west']) PATHS['nf_' + k] = GEO.newfr[k].map(r => { const p = new Path2D(); for (let i = 0; i < r.length; i += 2) { const x = r[i], y = -mercY(r[i + 1]); i ? p.lineTo(x, y) : p.moveTo(x, y); } p.closePath(); return p; });
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

const FBLUE = '#2B59C3', UKRED = '#C8102E', ESYEL = '#F1BF00';
function fillKey(ctx, c, key, style, a, glow) {
  if (a <= 0 || !PATHS[key]) return; const M = camMatrix(c), pp = new Path2D(); for (const p of PATHS[key]) pp.addPath(p, M);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = style; ctx.fill(pp);
  if (glow) { ctx.globalAlpha = Math.min(1, a * 1.6); ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.shadowColor = glow; ctx.shadowBlur = 18; ctx.stroke(pp); } ctx.restore();
}
function at(c, place, dx = 0, dy = 0) { const [x, y] = P(c, ...PL[place]); return [x + dx, y + dy]; }
function harbourAt(ctx, c, t, flag, w, k = 1) { const [x, y] = P(c, -56.2, 46.86); sprite(ctx, flag === 'uk' ? 'harbour_uk' : 'harbour_fr', x, y, w, { k, ay: 0.95 }); }
function spmGlow(ctx, c, t, a = 1) {
  fillKey(ctx, c, 'spm', C.gold, 0.55 * a * (0.8 + 0.2 * Math.sin(t * 5)), C.gold);
  if (c.z < 300) { const [x, y] = P(c, -56.25, 46.93); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.arc(x, y, 34 + 6 * Math.sin(t * 4), 0, 7); ctx.stroke(); ctx.restore(); }
}
function flipFlag(t) {   // who flies over the islands
  if (t < 33.9) return 'fr';
  if (t < 34.25) return 'uk';
  if (t > 46.3 && t < 49.2) { const seq = [[46.4, 'uk'], [46.9, 'fr'], [47.35, 'uk'], [47.9, 'fr'], [48.4, 'uk']]; let f = 'fr'; for (const [t0, v] of seq) if (t >= t0) f = v; return f; }
  return 'fr';
}
function sceneMap(ctx, c, t) {
  // New France (c. 1750) and how it was split
  if (t > 20.0 && t < 33.0) {
    const k = clamp((t - 20.4) / 0.8) * (1 - clamp((t - 31.4) / 0.6));
    const e = t < 28.4 ? FBLUE : UKRED, w = t < 29.6 ? FBLUE : ESYEL;
    const fe = t > 28.4 && t < 28.7 ? 1 : 0.5, fw = t > 29.6 && t < 29.9 ? 1 : 0.5;
    fillKey(ctx, c, 'nf_east', e, k * fe, k > 0.5 ? (t < 28.4 ? '#9DB4FF' : '#FF8A95') : null); fillKey(ctx, c, 'nf_west', w, k * fw, k > 0.5 ? (t < 29.6 ? '#9DB4FF' : '#FFE08A') : null);
    goldLabel(ctx, 'NEW FRANCE', W / 2, 640, 80, win(t, 21.2, 28.3));
    const [cx, cy] = P(c, -76, 48.5), [mx, my] = P(c, -88, 40); goldLabel(ctx, 'CANADA', cx, cy, 48, win(t, 22.7, 28.3)); goldLabel(ctx, 'MIDWEST', mx, my, 44, win(t, 23.8, 28.3));
    if (t > 28.4) { const [bx, by] = P(c, -80, 46); sprite(ctx, 'flag_gbr', bx, by, 110, { k: pop(t - 28.45) * popOut(31.3 - t) }); goldLabel(ctx, 'TO BRITAIN', bx, by + 70, 44, win(t, 28.5, 31.3)); }
    if (t > 29.6) { const [sx, sy] = P(c, -101, 39); sprite(ctx, 'flag_esp', sx, sy, 110, { k: pop(t - 29.65) * popOut(31.3 - t) }); goldLabel(ctx, 'TO SPAIN', sx, sy + 70, 44, win(t, 29.7, 31.3)); }
    title(ctx, '1763', 330, win(t, 24.6, 27.3, 0.35), 150);
    kinetic(ctx, 'FRANCE GIVES IT ALL UP', 1400, win(t, 27.3, 28.4), 70);
    person(ctx, 'british_contract', 860, 1500, 260, { k: pop(t - 28.5) * popOut(31.3 - t) });
  }
  // the islands themselves
  const showSPM = t < 20.4 || t > 31.6;
  if (showSPM) { spmGlow(ctx, c, t); harbourAt(ctx, c, t, flipFlag(t), Math.min(230, 90 * Math.pow(c.z / 50, 0.5)), pop(t - 0.2)); }
  // B1 hook
  title(ctx, 'WHY IS FRANCE\nNEXT TO CANADA?', 260, t < 0.05 ? 1 : popOut(4.6 - t), 100);
  if (t < 8.4) { const [x, y] = at(c, 'canada'), [nx, ny] = at(c, 'newfoundland'); goldLabel(ctx, 'CANADA', x, y, 64, popOut(4.6 - t)); goldLabel(ctx, 'NEWFOUNDLAND', nx, ny, 50, win(t, 4.1, 8.3)); }
  // B2 euros, French, French plates — legally France
  if (t > 5.3 && t < 15.4) {
    goldLabel(ctx, 'NORTH ATLANTIC', W / 2, 1380, 54, win(t, 6.8, 9.0));
    chip(ctx, 'A TINY GROUP OF ISLANDS', W / 2, 330, win(t, 7.6, 9.2), { size: 42 });
    sprite(ctx, 'euro', 250, 520, 170, { k: win(t, 9.4, 15.3), rot: Math.sin(t * 3) * 10 }); goldLabel(ctx, 'EUROS', 250, 650, 46, win(t, 9.5, 15.3));
    if (t > 10.3) { ctx.save(); const k = win(t, 10.3, 15.3); ctx.translate(820, 520); ctx.scale(k, k); ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-150, -60, 300, 120, 40); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-40, 56); ctx.lineTo(-70, 110); ctx.lineTo(0, 58); ctx.fill(); setFont(ctx, 'Montserrat', 54); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Bonjour !', 0, 4); ctx.restore(); }
    sprite(ctx, 'car', 540, 1330, 280, { k: win(t, 11.4, 15.3) }); goldLabel(ctx, 'FRENCH PLATES', 540, 1440, 44, win(t, 11.9, 15.3));
    kinetic(ctx, 'LEGALLY: FRANCE 🇫🇷', 330, win(t, 13.0, 15.35), 92);
  }
  // B3 the name
  if (t > 15.4 && t < 20.4) {
    const [sx, sy] = at(c, 'stpierre'), [mx, my] = at(c, 'miquelon');
    goldLabel(ctx, 'SAINT-PIERRE', sx + 210, sy + 40, 58, win(t, 15.9, 20.3)); goldLabel(ctx, 'MIQUELON', mx + 250, my, 58, win(t, 16.6, 20.3));
    kinetic(ctx, 'THE LAST PIECE\nOF NEW FRANCE', 330, win(t, 17.4, 20.3), 82);
    person(ctx, 'french_wave', 200, 1540, 280, { k: win(t, 15.5, 20.3) });
  }
  // B5 the peace talks: just these two islands
  if (t > 31.4 && t < 41.0) {
    const kk = win(t, 31.6, 40.9);
    person(ctx, t > 34.2 ? 'french_proud' : 'french_wave', 200, 1550, 290, { k: kk });
    person(ctx, t > 34.2 ? 'british_puzzled' : 'british_contract', 450, 1550, 250, { k: kk });
    bubble(ctx, 330, 1030, 'JUST THESE TWO\nLITTLE ISLANDS!', 34, [-40, 70], win(t, 32.4, 36.2));
    chip(ctx, 'HANDED BACK TO FRANCE', W / 2, 330, win(t, 34.3, 36.3), { size: 42 });
    // the Grand Banks: fish and fishing boats
    if (t > 36.4) { const [bx, by] = at(c, 'banks'); const kb = clamp((t - 36.5) / 0.6) * popOut(40.8 - t);
      ctx.save(); ctx.globalAlpha = 0.25 * kb; ctx.fillStyle = '#7FD3FF'; ctx.beginPath(); ctx.ellipse(bx, by, 320, 200, -0.3, 0, 7); ctx.fill(); ctx.restore();
      for (let i = 0; i < 6; i++) { const r = rnd(70 + i * 13); const x = bx + (r() - 0.5) * 520 + Math.sin(t * 1.5 + i) * 30, y = by + (r() - 0.5) * 300; sprite(ctx, 'cod', x, y, 120, { k: pop(t - 36.7 - i * 0.1) * popOut(40.8 - t), flip: i % 2 === 0 }); }
      goldLabel(ctx, 'GRAND BANKS', bx, by - 230, 58, win(t, 38.4, 40.8)); chip(ctx, '🐟 RICH COD WATERS', W / 2, 330, win(t, 37.0, 40.8), { size: 42 }); }
  }
  // B7 seized again and again… always handed back; then the ferry and French border control
  if (t > 45.9 && t < 50.9) {
    const seq = [46.4, 46.9, 47.35, 47.9, 48.4]; seq.forEach((t0, i) => stamp(ctx, i % 2 ? 'BACK TO FRANCE' : 'SEIZED', W / 2 + (i % 2 ? 60 : -60), 420 + i * 70, t, t0, { size: 44, color: i % 2 ? '#FFFFFF' : '#FF4D5E', until: 49.9, rot: i % 2 ? 6 : -8 }));
    chip(ctx, '✔ ALWAYS HANDED BACK', W / 2, 1380, win(t, 49.0, 50.9), { size: 44 });
  }
  if (t > 50.0 && t < 55.4) {
    const [fx, fy] = at(c, 'fortune'), [sx, sy] = at(c, 'stpierre');
    const u = easeIO((t - 50.5) / 2.0), x = lerp(fx, sx + 60, u), y = lerp(fy, sy + 20, u);
    ctx.save(); ctx.setLineDash([12, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
    sprite(ctx, 'ferry', x, y, 150, { k: pop(t - 50.3), flip: true });
    const [nx, ny] = at(c, 'fortune', 40, -40); goldLabel(ctx, 'FROM CANADA', nx + 60, ny - 30, 40, win(t, 50.4, 52.4));
    chip(ctx, '🛂 FRENCH BORDER CONTROL', W / 2, 330, win(t, 52.6, 55.3), { size: 40, stroke: '#9DB4FF' });
    person(ctx, t > 53.3 ? 'douane_stamp' : 'douane_desk', 230, 1540, 280, { k: pop(t - 52.7) * popOut(55.3 - t) });
    person(ctx, 'traveller', 820, 1540 - Math.abs(Math.sin(t * 8)) * (t > 54.0 ? 12 : 0), 240, { k: pop(t - 52.9) * popOut(55.3 - t) });
    stamp(ctx, 'ENTRÉE ✔', 540, 1200, t, 53.4, { size: 54, color: C.gold, until: 55.3, rot: -6 });
  }
  // B8 an ocean away? no — a ferry ride
  if (t > 55.3) {
    fillKey(ctx, c, 'france', FBLUE, 0.55 * clamp((t - 55.9) / 0.6), '#9DB4FF');
    const [px, py] = P(c, 2.5, 46.6), [sx, sy] = P(c, -56.25, 46.93);
    goldLabel(ctx, 'FRANCE', px, py + 70, 54, pop(t - 56.0)); goldLabel(ctx, 'NORTH\nAMERICA', 150, 560, 46, pop(t - 57.8)); goldLabel(ctx, 'ATLANTIC OCEAN', (px + sx) / 2, sy + 160, 46, pop(t - 57.0));
    const k = clamp((t - 58.8) / 1.2); if (k > 0) { const mx = (px + sx) / 2, my = Math.min(py, sy) - 260, pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(quadPt([px, py], [mx, my], [sx, sy], u)); }
      const pp = partial(pts, k); if (pp) { ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.setLineDash([20, 14]); ctx.lineDashOffset = -t * 40; ctx.shadowColor = C.gold; ctx.shadowBlur = 16; ctx.stroke(pp); ctx.restore(); } }
    kinetic(ctx, 'AN OCEAN AWAY?', 330, win(t, 55.4, 58.6), 96, -3, '#FFFFFF');
    kinetic(ctx, 'FRANCE… NEXT DOOR', 330, win(t, 59.4, 62.4), 96);
    person(ctx, 'french_wave', 210, 1550, 270, { k: win(t, 59.5, 62.4) });
  }
}
const quadPt = (a, m, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * m[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * m[1] + u * u * b[1]];
function bubble(ctx, x, y, text, size, tail, k) {
  if (k <= 0.001) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', size);
  const lines = text.split('\n'), w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 70, h = lines.length * size * 1.25 + 40;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 34); ctx.moveTo(-30, h / 2 - 2); ctx.lineTo(tail[0], h / 2 + tail[1]); ctx.lineTo(20, h / 2 - 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 30); ctx.fill();
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.25 + 3)); ctx.restore();
}
// B6: the mansion and the fishing shed (dark-teal cutaway card)
function sceneMansion(ctx, t) {
  const k = clamp((t - 40.8) / 0.45) * (1 - clamp((t - 45.7) / 0.4)); if (k <= 0) return;
  ctx.save(); ctx.translate(0, H * (1 - easeOut(k)));
  ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#163A46'; ctx.fillRect(0, 1180, W, H - 1180);
  ctx.strokeStyle = 'rgba(244,208,63,0.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(40, 160, W - 80, H - 320, 34); ctx.stroke();
  sprite(ctx, 'mansion', 400, 1180, 620, { ay: 1 });
  sprite(ctx, 'shed', 880, 1250, 300, { ay: 1 }); ctx.fillStyle = '#1E4D5C'; ctx.fillRect(730, 1250, 300, 200);
  const give = clamp((t - 41.3) / 1.0);
  if (t < 43.2) { person(ctx, 'french_keys', 300, 1440, 240); person(ctx, give > 0.6 ? 'british_keys' : 'british_grab', 520, 1440, 240); }
  else { person(ctx, 'british_keys', 400, 1440, 240); const u = easeOut((t - 43.3) / 0.7); person(ctx, t > 44.0 ? 'french_hug' : 'french_wave', lerp(300, 860, u), lerp(1440, 1270, u), 200); }
  kinetic(ctx, 'SELL THE MANSION…', 300, win(t, 41.0, 43.2), 82);
  kinetic(ctx, '…KEEP THE FISHING SHED', 300, win(t, 43.2, 45.7), 72);
  stamp(ctx, 'STILL OURS', 820, 980, t, 44.5, { size: 54, color: C.gold, until: 45.7, rot: -8 });
  ctx.restore();
}
function sceneEnd(ctx, t) {
  if (t < 62.5) return; const e = t - 62.5, k = clamp(e / 0.35);
  ctx.fillStyle = `rgba(4,10,14,${0.72 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, 'FRANCE IS JUST', W / 2, 640, 96, { k: pop(e - 0.05, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'A FERRY RIDE', W / 2, 770, 110, { k: pop(e - 0.25, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  styledText(ctx, 'FROM CANADA', W / 2, 900, 96, { k: pop(e - 0.45, 0.35), fill: '#fff', stroke: C.ink });
  const kc = pop(e - 0.9, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 1100); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 46);
    const w = ctx.measureText('FOLLOW MAPHELD').width + 120; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -56, w, 112, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 40, -20); ctx.lineTo(-w / 2 + 40, 20); ctx.lineTo(-w / 2 + 72, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FOLLOW MAPHELD', 22, 3); ctx.restore(); }
}
const CAPTIONS = [
  [0.0, 2.3, 'Eastern Canada…'], [2.3, 5.2, 'Off Newfoundland'], [5.3, 7.5, 'In the North Atlantic'], [7.5, 9.3, 'Tiny islands'], [9.3, 11.1, 'Euros. French.'], [11.1, 12.8, 'French plates'], [12.8, 15.35, "Legally, it's France"],
  [15.45, 17.3, 'Saint-Pierre and Miquelon'], [17.3, 20.25, 'Last piece of New France'],
  [20.35, 24.5, 'France once claimed all this'], [24.5, 27.3, 'Then it lost a war'], [27.3, 29.5, 'Canada → Britain'], [29.5, 31.3, 'Louisiana → Spain'],
  [31.4, 34.2, 'But in the peace talks…'], [34.2, 36.3, 'Two tiny islands back'], [36.3, 38.5, 'For the fishing fleets'], [38.5, 40.75, 'The Grand Banks'],
  [40.85, 43.1, 'Sell the mansion…'], [43.1, 45.9, '…keep the fishing shed'],
  [46.0, 48.1, 'Britain seized them…'], [48.1, 49.9, '…and gave them back'], [50.0, 52.5, 'Arriving from Canada?'], [52.5, 55.1, 'French border control'],
  [55.25, 58.6, 'An ocean away?'], [58.7, 62.4, 'A short ferry ride'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y + 80, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t);
  if (!(t > 41.3 && t < 45.7)) { drawMap(ctx, c); sceneMap(ctx, c, t); }
  sceneMansion(ctx, t);
  vignette(ctx); if (t < 62.5) drawText(ctx, t); sceneEnd(ctx, t);
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
