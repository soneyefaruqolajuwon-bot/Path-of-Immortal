/* Why Canberra? — Mapheld 9:16 short (Part 1, ends on a cliffhanger). renderAt(t) draws storyboard time t (= voiceover time).
 */
'use strict';
const W = 1080, H = 1920, DURATION = 57.2;
const C = {
  ocean: '#1E4D5C', land: '#8A855C', coast: '#5E5A3B', halo: '#2C6A78', ink: '#141416',
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
  aus: [134.0, -27.5, 23],
  se: [147.6, -35.2, 95],
  nsw: [147.0, -33.6, 62],
  cbr: [149.1, -35.3, 260],
};
const KEYS = [
  [0, 'se', 1], [2.6, 'se', 1.0], [3.4, 'aus', 1], [11.6, 'aus', 1.05], [13.0, 'se', 1], [24.3, 'se', 1.04], [30.8, 'nsw', 1], [39.6, 'nsw', 1.04],
  [41.0, 'cbr', 1], [47.4, 'cbr', 1.05], [49.0, 'se', 1], [57.2, 'se', 1.05],
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

// ------------------------------------------------------------------ scenes (storyboard time = voiceover time, 0–57.2 s)
const PL = GEO.places;
function countryPath(c, iso) { const p = new Path2D(); for (const q of PATHS['c_' + iso] || []) p.addPath(q, camMatrix(c)); return p; }
function tint(ctx, c, iso, color, a, glow) {
  if (a <= 0 || !PATHS['c_' + iso]) return; const p = countryPath(c, iso);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill(p, 'evenodd');
  if (glow) { ctx.globalAlpha = Math.min(1, a * 2.2); ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.shadowColor = glow; ctx.shadowBlur = 16; ctx.stroke(p); }
  ctx.restore();
}
function chip(ctx, text, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', o.size || 34);
  const w = ctx.measureText(text).width + 50, h = (o.size || 34) * 1.75;
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
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 3); ctx.restore();
}
// tug-of-war: the two rivals pull the crown (screen space)
function tugOfWar(ctx, t, k, cy = 1250, mode = 'tug') {
  if (k <= 0.001) return;
  const sway = Math.sin(t * 5.3) * 26 + Math.sin(t * 2.1) * 12, mx = 540 + sway;
  const pose = n => mode === 'angry' ? `${n}_angry` : `${n}_tug`;
  person(ctx, pose('melbourne'), mx - 230, cy, 300, { k });
  person(ctx, pose('sydney'), mx + 230, cy, 300, { k });
  if (mode === 'tug') sprite(ctx, 'crown', mx, cy - 250 + Math.sin(t * 9) * 6, 170, { k, rot: sway * 0.2 });
  for (const [x, s] of [[mx - 270, 3], [mx + 270, 7]]) puff(ctx, x, cy - 10, 90, ((t * 1.6 + s * 0.1) % 1), s);
  if (mode === 'angry') puff(ctx, mx, cy - 180, 260, ((t * 1.2) % 1), 11);
}
function landmark(ctx, c, t, name, place, w, k, dy = 0) { if (k <= 0) return; const [x, y] = P(c, ...PL[place]); sprite(ctx, name, x, y + dy, w, { k, ay: 0.9 }); }

function sceneMap(ctx, c, t) {
  // states & capital-city landmarks (drawn objects, not pins)
  const unite = clamp((t - 14.2) / 1.0) * (1 - clamp((t - 19.5) / 1.0));
  if (unite > 0) for (const iso of ['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'WA', 'NT']) tint(ctx, c, iso, C.gold, 0.25 * unite, C.gold);
  const kN = clamp((t - 34.6) / 0.7) * (1 - clamp((t - 39.7) / 0.6));
  tint(ctx, c, 'NSW', C.gold, 0.4 * kN, C.gold); tint(ctx, c, 'VIC', '#7A7A7A', 0.4 * kN);
  ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 2; ctx.setLineDash([8, 7]);
  for (const iso of Object.keys(GEO.countries)) ctx.stroke(countryPath(c, iso)); ctx.restore();
  const showCities = t > 3.6 && t < 39.8 || t > 47.8;
  if (showCities) {
    landmark(ctx, c, t, 'opera_house', 'sydney', 150, pop(t - 3.8) , -10); landmark(ctx, c, t, 'tram', 'melbourne', 140, pop(t - 5.1), -10);
    const [sx, sy] = P(c, ...PL.sydney), [mx, my] = P(c, ...PL.melbourne);
    goldLabel(ctx, 'SYDNEY', sx - 20, sy + 60, 50, pop(t - 3.9)); goldLabel(ctx, 'MELBOURNE', mx + 20, my + 60, 50, pop(t - 5.2));
  }
  // B1: name the capital
  if (t < 12.6) {
    kinetic(ctx, 'CAPITAL OF AUSTRALIA?', 240, t < 1 ? 1 : win(t, 0, 6.0, 0.01, 0.2), 82);
    const [ax, ay] = P(c, 134, -25); if (t < 3.6) goldLabel(ctx, 'AUSTRALIA', ax, ay, 72, 1);
    const kf = clamp((t - 6.6) / 0.8);
    tugOfWar(ctx, t, (t < 6.6 ? 1 : 1 - kf * 0) * popOut(12.4 - t), 1250, t > 10.9 ? 'angry' : 'tug');
    if (kf > 0 && kf < 1) sprite(ctx, 'crown', 540, lerp(1000, -200, easeIn(kf)), 170, { rot: kf * 300 });
    kinetic(ctx, 'NEITHER!', 240, win(t, 6.8, 8.3), 120, -4, '#FF6B6B');
    const [cx, cy] = P(c, ...PL.canberra);
    if (t > 8.4) { styledText(ctx, '?', cx, cy - 40, 120, { k: win(t, 8.5, 12.4), fill: C.gold, stroke: C.ink }); chip(ctx, 'A BRAND-NEW CAPITAL', W / 2, 240, win(t, 8.6, 10.8), { size: 40 }); }
    chip(ctx, 'TO STOP THE FIGHT', W / 2, 240, win(t, 11.0, 12.5), { size: 40, stroke: '#E63946' });
  }
  // B2: 1901, two rivals
  if (t > 12.5 && t < 24.7) {
    title(ctx, '1901', 260, win(t, 14.8, 18.0, .4), 160);
    chip(ctx, 'ONE NATION', W / 2, 400, win(t, 14.4, 18.0), { size: 40 });
    kinetic(ctx, 'THE TWO BIGGEST RIVALS', 260, win(t, 17.6, 20.3), 74);
    tugOfWar(ctx, t, win(t, 20.2, 24.5), 1250, t > 22.6 ? 'angry' : 'tug');
    chip(ctx, 'NEITHER WILL LOSE', W / 2, 260, win(t, 22.6, 24.5), { size: 42, stroke: '#E63946' });
  }
  // B4: the constitution — inside NSW, 100 miles from Sydney
  if (t > 30.5 && t < 40.0) {
    person(ctx, t > 35.4 ? 'lawmaker_stamp' : 'lawmaker', 190, 1420, 300, { k: pop(t - 30.9) * popOut(39.8 - t) });
    const kd = win(t, 32.6, 34.6); if (kd > 0) { ctx.save(); ctx.translate(W / 2 + 80, 380); ctx.scale(kd, kd); ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-300, -150, 600, 300, 14); ctx.fill(); ctx.stroke();
      setFont(ctx, 'Playfair Display', 48); ctx.fillStyle = '#2A2118'; ctx.textAlign = 'center'; ctx.fillText('THE CONSTITUTION', 0, -70); setFont(ctx, 'Montserrat', 30); ctx.fillText('Section 125', 0, -20);
      ctx.fillStyle = 'rgba(255,212,59,0.6)'; ctx.fillRect(-250, 20, 500, 40); ctx.fillStyle = '#2A2118'; setFont(ctx, 'Montserrat', 26); ctx.fillText('…in New South Wales…', 0, 50); ctx.restore(); }
    const [nx, ny] = P(c, 146.0, -32.0); goldLabel(ctx, 'NEW SOUTH WALES', nx, ny, 56, win(t, 35.9, 39.7));
    const [mx, my] = P(c, ...PL.melbourne); stamp(ctx, 'NOT MELBOURNE', mx + 60, my - 120, t, 35.6, { size: 46, until: 39.7 });
    const kr = clamp((t - 37.2) / 1.0) * (1 - clamp((t - 39.6) / 0.4));
    if (kr > 0) { const [sx, sy] = P(c, ...PL.sydney), [, ey] = P(c, PL.sydney[0], PL.sydney[1] - 1.447), R = Math.abs(ey - sy) * easeOut(kr);
      ctx.save(); ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 6; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.ellipse(sx, sy, R * 0.83, R, 0, 0, 7); ctx.stroke();
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#FF6B6B'; ctx.fill(); ctx.restore(); chip(ctx, '100 MILES', sx - R * 0.83, sy - R * 0.6, kr, { size: 34, stroke: '#FF6B6B' }); }
    const [sx, sy] = P(c, ...PL.sydney); stamp(ctx, 'NOT SYDNEY', sx - 40, sy - 130, t, 38.8, { size: 46, until: 39.7 });
  }
  // B5: sheep country → design competition → Canberra
  if (t > 40.0 && t < 48.2) {
    const [cx, cy] = P(c, ...PL.canberra);
    for (let i = 0; i < 9; i++) { const r = rnd(1009 + i * 7919); r(); r(); const bx = cx + (r() - 0.5) * 820, by = cy + (r() - 0.5) * 560, run = clamp((t - 44.3 - r() * 0.3) / 0.9);
      const x = bx + (bx > cx ? 1 : -1) * easeIn(run) * 900, k = pop(t - 41.2 - i * 0.06) * (1 - clamp((t - 45.3) / 0.3)); if (k > 0) sprite(ctx, 'sheep', x, by + Math.abs(Math.sin(t * 8 + i)) * (run > 0 ? -16 : 0), 110, { k, flip: bx < cx }); }
    chip(ctx, 'QUIET SHEEP COUNTRY', W / 2, 260, win(t, 41.4, 42.5), { size: 40 });
    const kb = win(t, 42.5, 44.4); if (kb > 0) { ctx.save(); ctx.translate(W / 2, 520); ctx.scale(kb, kb); ctx.fillStyle = '#1F4E79'; ctx.strokeStyle = '#E8F1F8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-320, -220, 640, 440, 14); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(232,241,248,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-200, 120); ctx.lineTo(0, -140); ctx.lineTo(200, 120); ctx.closePath(); ctx.stroke(); for (const [x, y] of [[-200, 120], [0, -140], [200, 120]]) { ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, 40, 260, 40, 0, 0, 7); ctx.stroke(); ctx.restore(); chip(ctx, 'INTERNATIONAL DESIGN COMPETITION', W / 2, 260, kb, { size: 32 }); }
    const kc = pop(t - 44.5, 0.4);
    if (kc > 0) { ctx.save(); ctx.globalAlpha = clamp(kc); ctx.strokeStyle = 'rgba(244,241,230,0.85)'; ctx.lineWidth = 5; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 420 * easeOut(kc), cy + Math.sin(a) * 300 * easeOut(kc)); ctx.stroke(); }
      for (const r of [140, 260]) { ctx.beginPath(); ctx.ellipse(cx, cy, r * easeOut(kc), r * 0.7 * easeOut(kc), 0, 0, 7); ctx.stroke(); } ctx.restore();
      for (let i = 0; i < 10; i++) { const r = rnd(2040 + i * 6151); r(); r(); const a = r() * 6.283, d = 160 + r() * 240, k = pop(t - 44.8 - i * 0.07); if (k <= 0) continue; ctx.save(); ctx.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7); ctx.scale(k, k);
        ctx.fillStyle = '#EFE6D2'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(-22, -30, 44, 30); ctx.strokeRect(-22, -30, 44, 30); ctx.fillStyle = '#C0504D'; ctx.beginPath(); ctx.moveTo(-26, -30); ctx.lineTo(0, -48); ctx.lineTo(26, -30); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      sprite(ctx, 'parliament', cx, cy + 20, 300, { k: kc, ay: 0.9 }); }
    goldLabel(ctx, 'CANBERRA', cx, cy + 120, 110, pop(t - 45.6, 0.35));
  }
  // B6: the twist
  if (t > 47.8) {
    const [cx, cy] = P(c, ...PL.canberra);
    sprite(ctx, 'parliament', cx, cy, 160, { k: pop(t - 48.0), ay: 0.9 }); goldLabel(ctx, 'CANBERRA', cx, cy + 50, 44, pop(t - 48.1));
    kinetic(ctx, "BUT HERE'S THE TWIST", 260, win(t, 48.0, 49.6), 78);
    kinetic(ctx, '26 YEARS', 300, win(t, 49.6, 53.6), 150, -4);
    if (t > 52.1) styledText(ctx, '✕', cx, cy - 60, 180, { k: pop(t - 52.2), fill: '#FF3B3B', stroke: C.ink });
    person(ctx, 'melbourne_grin', 220, 1440, 260, { k: pop(t - 51.4, 0.35) });
  }
}
// B3: the car-seat gag (a dark-teal cutaway card)
function sceneCar(ctx, t) {
  const kk = clamp((t - 24.5) / 0.5) * (1 - clamp((t - 30.5) / 0.4)); if (kk <= 0) return;
  ctx.save(); ctx.fillStyle = `rgba(0,0,0,${0.4 * kk})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  const y0 = lerp(H, 260, easeOut(kk));
  ctx.save(); ctx.translate(0, y0 - 260);
  ctx.fillStyle = C.ocean; ctx.strokeStyle = 'rgba(244,208,63,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(50, 260, W - 100, 1180, 34); ctx.fill(); ctx.stroke();
  // the car
  ctx.save(); ctx.translate(540, 980); ctx.strokeStyle = C.ink; ctx.lineWidth = 8;
  ctx.fillStyle = '#C0504D'; ctx.beginPath(); ctx.moveTo(-420, 120); ctx.lineTo(-420, 0); ctx.quadraticCurveTo(-400, -60, -300, -70); ctx.lineTo(-200, -220); ctx.lineTo(220, -220); ctx.lineTo(330, -70); ctx.quadraticCurveTo(420, -60, 430, 0); ctx.lineTo(430, 120); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#BFE9F5'; ctx.beginPath(); ctx.moveTo(-180, -200); ctx.lineTo(0, -200); ctx.lineTo(0, -80); ctx.lineTo(-260, -80); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, -200); ctx.lineTo(210, -200); ctx.lineTo(300, -80); ctx.lineTo(20, -80); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const x of [-260, 280]) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, 120, 70, 0, 7); ctx.fill(); ctx.fillStyle = '#9AA3AE'; ctx.beginPath(); ctx.arc(x, 120, 30, 0, 7); ctx.fill(); }
  ctx.restore();
  styledText(ctx, 'BACK', 400, 1180, 34, { fill: '#DDE6EA' }); styledText(ctx, 'FRONT', 700, 1180, 34, { fill: '#DDE6EA' });
  // the rivals: squabbling in the front seat, then lifted into the back
  const lift = easeIO((t - 28.0) / 0.9), hx = lerp(700, 400, lift), hy = 940 - Math.sin(lift * Math.PI) * 260;
  const pose = t > 25.7 && t < 28 ? 'angry' : 'sulk';
  person(ctx, `melbourne_${pose}`, hx - 60 + (t < 28 ? Math.sin(t * 12) * 10 : 0), hy, 170);
  person(ctx, `sydney_${pose}`, hx + 60 - (t < 28 ? Math.sin(t * 12) * 10 : 0), hy, 170);
  if (t > 25.8 && t < 28) puff(ctx, hx, hy - 160, 150, ((t * 1.5) % 1), 4);
  // the parent's giant hand
  if (t > 27.6 && t < 29.4) { const ha = clamp((t - 27.6) / 0.3) * clamp((29.4 - t) / 0.3); ctx.save(); ctx.globalAlpha = ha; ctx.translate(hx, hy - 330); ctx.fillStyle = '#F2C9A0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(-110, -60, 220, 120, 50); ctx.fill(); ctx.stroke(); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(-100 + i * 54, 30, 40, 110, 20); ctx.fill(); ctx.stroke(); } ctx.fillRect(-60, -260, 120, 210); ctx.strokeRect(-60, -260, 120, 210); ctx.restore(); }
  if (t > 29.3) { styledText(ctx, '🔒', 690, 870, 90, { k: pop(t - 29.4) }); stamp(ctx, 'EMPTY', 700, 760, t, 29.6, { size: 54 }); }
  kinetic(ctx, 'FRONT-SEAT FIGHT', 420, win(t, 25.0, 27.8), 78);
  ctx.restore();
}
// end card: cliffhanger
function sceneEnd(ctx, t) {
  if (t < 53.5) return; const e = t - 53.5, k = clamp(e / 0.35);
  ctx.fillStyle = `rgba(4,10,14,${0.75 * k})`; ctx.fillRect(0, 0, W, H);
  styledText(ctx, '26 YEARS…', W / 2, 640, 120, { k: pop(e - 0.1, 0.35), fill: '#fff', stroke: C.ink });
  styledText(ctx, 'NOT IN CANBERRA?', W / 2, 780, 96, { k: pop(e - 0.3, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -3 });
  styledText(ctx, 'SO WHERE WAS IT?', W / 2, 920, 70, { k: pop(e - 0.6, 0.35), fill: '#fff', stroke: C.ink });
  const kc = pop(e - 1.0, 0.35); if (kc > 0) { ctx.save(); ctx.translate(W / 2, 1110); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 46);
    const w = ctx.measureText('FULL STORY ON MAPHELD').width + 120; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -56, w, 112, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 40, -20); ctx.lineTo(-w / 2 + 40, 20); ctx.lineTo(-w / 2 + 72, 0); ctx.closePath(); ctx.fill(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FULL STORY ON MAPHELD', 22, 3); ctx.restore(); }
}

const CAPTIONS = [
  [0.0, 2.6, 'Capital of Australia?'], [2.7, 4.8, 'Sydney?'], [4.9, 6.0, 'Melbourne?'], [6.1, 7.6, 'Neither.'], [7.7, 10.6, 'A brand-new capital'], [10.7, 12.4, 'To stop a fight'],
  [12.7, 15.8, 'One nation, 1901'], [15.9, 19.9, 'Two giant rivals'], [20.0, 22.6, 'Both wanted it'], [22.7, 24.4, 'Neither would lose'],
  [24.7, 27.4, 'The front-seat fight'], [27.5, 30.6, 'Both go in the back'],
  [30.8, 33.7, 'A compromise'], [33.8, 37.0, 'Inside New South Wales'], [37.1, 39.8, '100 miles from Sydney'],
  [40.0, 42.2, 'Sheep country'], [42.3, 44.2, 'A design contest'], [44.3, 47.6, 'Canberra is built'],
  [47.9, 49.5, 'But the twist…'], [49.6, 53.4, '26 years. Not here.'],
];
function drawText(ctx, t) { for (const [t0, t1, txt] of CAPTIONS) { const k = t0 === 0 ? (t < t1 ? 1 : 0) * popOut(t1 - t, 0.18) : win(t, t0, t1, .22, .16); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1000 }); } }
function vignette(ctx) { const g = ctx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .5, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t);
  drawMap(ctx, c); sceneMap(ctx, c, t); sceneCar(ctx, t);
  vignette(ctx); if (t < 53.6) drawText(ctx, t); sceneEnd(ctx, t);
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
