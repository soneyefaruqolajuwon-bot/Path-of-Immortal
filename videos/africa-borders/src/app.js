/* Why Africa's Borders Are Straight Lines — Mapheld 16:9 long-form. HTML5 Canvas, deterministic.
 * renderAt(t) draws storyboard time t (= real time of the 1.2x voiceover).
 */
'use strict';
const W = 1920, H = 1080, DURATION = 175.8;
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
  africa: [18.0, 2.0, 11.0],
  eurafrica: [12.0, 26.0, 7.4],
  europe: [6.0, 48.5, 24],
  sahara: [24.0, 23.5, 34],
  west: [-6.0, 19.5, 32],
  namibia: [19.0, -21.0, 34],
};
const KEYS = [
  [0, 'africa', 1], [13.4, 'africa', 1.04], [25.4, 'africa', 1.07], [28.6, 'eurafrica', 1], [52.4, 'eurafrica', 1.04], [55.2, 'europe', 1], [90.2, 'europe', 1.06],
  [92.2, 'africa', 1], [111.6, 'africa', 1.04], [112.9, 'sahara', 1], [116.0, 'sahara', 1.04], [117.0, 'west', 1], [117.9, 'west', 1.02], [118.8, 'namibia', 1],
  [123.0, 'namibia', 1.04], [125.0, 'africa', 1], [163.4, 'africa', 1.04], [165.0, 'sahara', 0.9], [168.6, 'sahara', 0.95], [170.4, 'africa', 0.98], [175.8, 'africa', 1.05],
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

// colonial empires c. 1914 (simplified) and the independence palette
const EMPIRE = { GBR: ['EGY', 'SDN', 'SSD', 'UGA', 'KEN', 'ZMB', 'ZWE', 'MWI', 'BWA', 'ZAF', 'LSO', 'SWZ', 'NGA', 'GHA', 'SLE', 'GMB', 'SOL'],
  FRA: ['MAR', 'DZA', 'TUN', 'MRT', 'SEN', 'MLI', 'BFA', 'NER', 'GIN', 'CIV', 'BEN', 'TCD', 'CAF', 'GAB', 'COG', 'MDG', 'DJI'],
  DEU: ['TZA', 'RWA', 'BDI', 'NAM', 'CMR', 'TGO'], BEL: ['COD'], PRT: ['AGO', 'MOZ', 'GNB'], ESP: ['ESH', 'GNQ'], ITA: ['LBY', 'ERI', 'SOM'] };
const ECOL = { GBR: '#C0504D', FRA: '#4F6FB5', DEU: '#7A7A7A', BEL: '#E0B22C', PRT: '#3E9B5A', ESP: '#E08A2C', ITA: '#2FA39A' };
const POWERS = [['GBR', 'gbr', 45.0, [-2, 53]], ['FRA', 'fra', 45.4, [2.3, 46.5]], ['DEU', 'deu', 45.9, [10.5, 51.2]], ['BEL', 'bel', 46.4, [4.5, 50.6]],
  ['PRT', 'prt', 47.0, [-8.2, 39.6]], ['ESP', 'esp', 47.5, [-3.7, 40.2]], ['ITA', 'ita', 48.2, [12.6, 42.8]]];
const IND = ['#E74C3C', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6', '#E67E22', '#1ABC9C', '#FF6F91', '#C0E218', '#00B8D4'];
function empireOf(iso) { for (const [p, list] of Object.entries(EMPIRE)) if (list.includes(iso)) return p; return null; }
function tintAfrica(ctx, c, t) {
  const kc = clamp((t - 45.0) / 3.4) * (1 - clamp((t - 134.0) / 1.2)), ki = clamp((t - 134.3) / 1.4) * (1 - clamp((t - 170.5) / 2.0) * 0.5);
  const isos = Object.keys(GEO.africa);
  isos.forEach((iso, i) => {
    const emp = empireOf(iso);
    if (emp && kc > 0) { const pidx = POWERS.findIndex(p => p[0] === emp), kk = clamp((t - POWERS[pidx][2]) / 0.8) * kc;
      if (kk > 0) { ctx.save(); ctx.globalAlpha = 0.55 * kk; ctx.fillStyle = ECOL[emp]; ctx.fill(countryPath(c, iso), 'evenodd'); ctx.restore(); } }
    if (ki > 0) { ctx.save(); ctx.globalAlpha = 0.5 * ki; ctx.fillStyle = IND[(i * 7) % IND.length]; ctx.fill(countryPath(c, iso), 'evenodd'); ctx.restore(); }
  });
}
function bordersAll(ctx, c, t, alpha = 0.55) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#2C3531'; ctx.lineWidth = 2.2;
  for (const iso of Object.keys(GEO.countries)) ctx.stroke(countryPath(c, iso)); ctx.restore();
}

// ---------------------------------------------------------------- the map layer (everything that lives on the map)
function sceneMap(ctx, c, t) {
  tintAfrica(ctx, c, t);
  bordersAll(ctx, c, t);
  // B1–B2: straight vs natural borders
  if (t < 28.5) {
    const kn = win(t, 5.8, 13.5), ks = clamp((t - 9.0) / 1.6) * (1 - clamp((t - 27.0) / 1.2));
    for (const key of GEO.natural) border(ctx, c, key, kn > 0 ? 1 : 0, '#7FD3FF', 5, { glow: true, glowColor: 'rgba(127,211,255,0.35)' });
    if (kn > 0) { const [x, y] = P(c, 15.5, -3.5); chip(ctx, 'RIVER BORDER', x + 120, y, kn, { size: 24, stroke: '#7FD3FF' }); }
    GEO.straight.forEach((key, i) => border(ctx, c, key, clamp(ks * 1.4 - i * 0.04)));
    if (ks > 0 && t < 13.6) { const [x, y] = P(c, 31, 22); chip(ctx, 'RULER STRAIGHT', x + 40, y - 70, win(t, 9.6, 13.6), { size: 26 }); }
    // the finger tracing a border
    if (t > 2.3 && t < 4.5) { const line = GEO.borders.cod_cog[0], u = clamp((t - 2.4) / 1.8), sp = line.map(p => P(c, p[0], p[1])), [x, y] = pointAlong(sp, u);
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(x - 13, y + 8, 26, 80, 12); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // wooden ruler + pencil over the Egypt–Sudan line
    const kr = win(t, 11.3, 15.2); if (kr > 0) { const [x0, y0] = P(c, 25, 22), [x1] = P(c, 37, 22); sprite(ctx, 'ruler', (x0 + x1) / 2, y0 - 28, x1 - x0 + 80, { k: kr, rot: -1 }); }
    if (t > 15.4 && t < 20.6) { const [x, y] = P(c, 12, 23); goldLabel(ctx, 'SAHARA', x, y, 60, win(t, 15.5, 20.6)); }
    if (t > 16.3 && t < 20.6) border(ctx, c, 'lby_tcd', 1, '#FFFFFF', 8, { glow: true });
    // a community split down the middle (on the Mali–Niger line)
    const kv = win(t, 18.2, 23.0); if (kv > 0) { const [x, y] = P(c, 4.2, 15.0);
      person(ctx, t > 19.6 ? 'villager0_sad' : 'villager0', x - 70 - 30 * clamp((t - 19.6) / 0.6), y + 40, 70, { k: kv }); person(ctx, t > 19.6 ? 'villager1_sad' : 'villager1', x + 70 + 30 * clamp((t - 19.6) / 0.6), y + 40, 70, { k: kv, flip: true }); }
    // nature vs ruler: geometry textbook grid
    const kg = win(t, 24.4, 28.0); if (kg > 0) { ctx.save(); ctx.globalAlpha = 0.45 * clamp(kg); ctx.strokeStyle = '#F4F1E6'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      for (let lon = -20; lon <= 55; lon += 5) { const [x0, y0] = P(c, lon, 38), [x1, y1] = P(c, lon, -36); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      for (let lat = -35; lat <= 37; lat += 5) { const [x0, y0] = P(c, -20, lat), [x1, y1] = P(c, 55, lat); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); } ctx.restore();
      kinetic(ctx, 'A GEOMETRY TEXTBOOK?', W / 2, 150, kg, 80); }
    chip(ctx, 'NATURE: CURVES', 360, 150, win(t, 20.8, 24.2), { size: 30, stroke: '#7FD3FF' });
    chip(ctx, 'RULERS: STRAIGHT', W - 380, 150, win(t, 21.6, 24.2), { size: 30 });
  }
  // B3–B4: the 1880s, the coast, the scramble
  if (t > 26 && t < 56) {
    title(ctx, 'THE 1880s', 150, win(t, 28.6, 32.0, .4), 110);
    title(ctx, 'THE SCRAMBLE FOR AFRICA', 150, win(t, 33.1, 37.4, .4), 92);
    const ports = [[-17.4, 14.7], [-0.2, 5.6], [3.4, 6.45], [13.2, -8.8], [18.4, -33.9], [32.6, -25.9], [39.3, -6.8], [45.3, 2.0], [29.9, 31.2], [-7.6, 33.6]];
    ports.forEach(([lon, lat], i) => { const k = win(t, 37.6 + i * 0.12, 44.4); if (k > 0) { const [x, y] = P(c, lon, lat); ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = '#F1EAD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.fillRect(-9, -14, 18, 14); ctx.strokeRect(-9, -14, 18, 14); ctx.beginPath(); ctx.moveTo(-11, -14); ctx.lineTo(0, -24); ctx.lineTo(11, -14); ctx.closePath(); ctx.fillStyle = '#B03A2E'; ctx.fill(); ctx.stroke(); ctx.restore(); } });
    chip(ctx, 'COASTAL TRADING POSTS', W / 2, 150, win(t, 38.4, 40.0), { size: 30 });
    // steamships head inland up the rivers
    const routes = [[[-12, 40], [-18, 20], [-16.5, 13.5], [-12, 13.2]], [[5, 38], [-10, 20], [6, 4.2], [6.7, 6.5], [6.5, 9.5]], [[-5, 36], [-12, 5], [10, -4], [12.5, -6.1], [15, -4.5]], [[30, 34], [31.2, 30.5], [32.5, 24.5], [32.6, 18]]];
    routes.forEach((r, i) => { const u = clamp((t - 40.4 - i * 0.25) / 4.4); if (u <= 0 || t > 49) return; const sp = r.map(p => P(c, p[0], p[1])), [x, y] = pointAlong(sp, easeIO(u)), [x2] = pointAlong(sp, Math.min(1, easeIO(u) + 0.01));
      sprite(ctx, 'steamship', x, y, 120, { flip: x2 < x, k: pop(t - 40.4 - i * 0.25) * clamp((49 - t) / 0.4) }); });
    chip(ctx, 'STEAMSHIPS', W / 2 - 430, 150, win(t, 40.4, 44.2), { size: 28 }); chip(ctx, 'QUININE', W / 2, 150, win(t, 41.3, 44.2), { size: 28, stroke: '#7FD3FF' });
    chip(ctx, 'RAPID-FIRE WEAPONS', W / 2 + 470, 150, win(t, 42.3, 44.2), { size: 28, stroke: '#E63946' });
    POWERS.forEach(([emp, f, t0, ll]) => { const k = win(t, t0, 52.2); if (k <= 0) return; const [x, y] = P(c, ...ll); sprite(ctx, 'marker_' + f, x, y, 66, { k, ay: 0.95 }); });
    kinetic(ctx, 'EVERYONE RUSHES IN', W / 2, 150, win(t, 48.8, 52.4), 84);
  }
  // B5: rivalry in Europe → Bismarck hosts Berlin
  if (t > 52.4 && t < 64) {
    const kw = win(t, 54.4, 57.0); if (kw > 0) { for (const [a, b] of [[[2.3, 48.9], [13.4, 52.5]], [[-0.1, 51.5], [2.3, 48.9]], [[-0.1, 51.5], [13.4, 52.5]]]) {
      const [x0, y0] = P(c, ...a), [x1, y1] = P(c, ...b); ctx.save(); ctx.globalAlpha = clamp(kw); ctx.strokeStyle = '#E63946'; ctx.lineWidth = 6; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 50; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore(); }
      chip(ctx, 'RISK OF WAR IN EUROPE', W / 2, 150, kw, { size: 32, stroke: '#E63946' }); }
    const [bx, by] = P(c, 13.4, 52.5);
    sprite(ctx, 'berlin_building', bx, by + 8, 220, { k: win(t, 59.4, 63.8), ay: 0.95 }); goldLabel(ctx, 'Berlin', bx, by + 52, 44, win(t, 59.6, 63.8));
    person(ctx, 'bismarck', 360, 930, 260, { k: win(t, 57.1, 63.6) }); chip(ctx, 'OTTO VON BISMARCK', 360, 990, win(t, 57.4, 63.6), { size: 26 });
    title(ctx, 'BERLIN, 1884', 150, win(t, 59.8, 63.4, .4), 96);
    kinetic(ctx, '14 COUNTRIES', W / 2 + 420, 330, win(t, 61.6, 63.6), 84);
  }
  // B8–B9: treaties, blank maps, rulers along latitude and longitude
  if (t > 90 && t < 112.6) {
    const parch = clamp((t - 97.4) / 1.0) * (1 - clamp((t - 111.8) / 0.8));
    if (parch > 0) { ctx.save(); ctx.globalAlpha = 0.38 * parch; ctx.fillStyle = '#D9C69A'; for (const iso of Object.keys(GEO.africa)) ctx.fill(countryPath(c, iso), 'evenodd'); ctx.restore();
      const r = rnd(12); for (let i = 0; i < 16; i++) { const lon = 5 + r() * 25, lat = -8 + r() * 26, [x, y] = P(c, lon, lat); styledText(ctx, '?', x, y, 44 + r() * 26, { k: pop(t - 98.4 - i * 0.07) * parch, fill: '#5A4A38', stroke: '#F4F1E6', shadow: 0 }); } }
    chip(ctx, '20 YEARS · HUNDREDS OF TREATIES', W / 2, 150, win(t, 91.3, 95.0), { size: 30 });
    for (let i = 0; i < 14; i++) { const u = clamp((t - 93.4 - i * 0.18) / 1.2); if (u <= 0 || u >= 1) continue; const r = rnd(30 + i), x = lerp(300 + r() * 1300, 700 + r() * 600, u), y = lerp(-60, 300 + r() * 500, easeIn(u));
      ctx.save(); ctx.translate(x, y); ctx.rotate((r() - 0.5) * 1.2 + u * 2); ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(-28, -36, 56, 72); ctx.strokeRect(-28, -36, 56, 72);
      ctx.fillStyle = '#9A8F7A'; for (let j = 0; j < 5; j++) ctx.fillRect(-18, -24 + j * 11, 36, 3); ctx.restore(); }
    chip(ctx, 'LONDON · PARIS · BERLIN', W / 2, 220, win(t, 95.4, 97.4), { size: 28 });
    chip(ctx, 'INCOMPLETE MAPS', W / 2, 150, win(t, 97.6, 101.6), { size: 30, stroke: '#D9C69A' });
    // the squinting diplomat, then the shrug, then the ruler
    person(ctx, 'diplomat_squint', 300, 1000, 240, { k: win(t, 102.6, 106.4) }); sprite(ctx, 'magnifier', 420, 760, 150, { k: win(t, 102.8, 106.4), rot: wob(t, 0.6, 8) });
    chip(ctx, 'BLANK SPOT', W / 2, 150, win(t, 102.8, 106.0), { size: 30, stroke: '#D9C69A' });
    person(ctx, 'diplomat_shrug', W - 300, 1000, 240, { k: win(t, 106.3, 111.8) }); chip(ctx, 'EASIEST SHORTCUT', W / 2, 150, win(t, 106.4, 108.3), { size: 30 });
    const kl = clamp((t - 108.4) / 0.6); if (kl > 0 && t < 112) {
      const A = P(c, 0, 19.5), B = P(c, 25, 19.5);
      sprite(ctx, 'ruler', (A[0] + B[0]) / 2, A[1] - 26 - 60 * (1 - easeOut(kl)), B[0] - A[0] + 60, { k: 1, alpha: clamp(kl * 2) * clamp((112 - t) / 0.4) });
      geoPolyline(ctx, c, [[0, 19.5], [25, 19.5]], clamp((t - 108.9) / 0.6), C.gold, 7, { glow: true });
      const [ax, ay] = A, [bx2, by2] = B; for (const [x, y] of [[ax, ay], [bx2, by2]]) { ctx.save(); ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
    }
    const kg = win(t, 109.8, 112.4); if (kg > 0) { ctx.save(); ctx.globalAlpha = 0.5 * clamp(kg); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      for (let lon = -20; lon <= 55; lon += 10) { const [x0, y0] = P(c, lon, 38), [x1, y1] = P(c, lon, -36); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      for (let lat = -30; lat <= 35; lat += 10) { const [x0, y0] = P(c, -20, lat), [x1, y1] = P(c, 55, lat); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); } ctx.restore();
      chip(ctx, 'LATITUDE & LONGITUDE', W / 2, 150, kg, { size: 30 }); }
  }
  // B10: the famous examples
  if (t > 112 && t < 124.4) {
    const ke = clamp((t - 113.0) / 0.9) * (1 - clamp((t - 116.6) / 0.4));
    border(ctx, c, 'egy_sdn', ke, C.gold, 8); border(ctx, c, 'egy_lby', ke, C.gold, 6);
    if (ke > 0) { const [ex, ey] = P(c, 30, 26.5), [sx, sy] = P(c, 30, 17.5); goldLabel(ctx, 'EGYPT', ex, ey, 64, pop(t - 112.5)); goldLabel(ctx, 'SUDAN', sx, sy, 64, pop(t - 113.0));
      const [lx, ly] = P(c, 33, 22); chip(ctx, '22°N', lx, ly - 46, win(t, 114.4, 116.4), { size: 26 }); }
    const kw = clamp((t - 117.0) / 0.6) * (1 - clamp((t - 118.5) / 0.4));
    if (kw > 0) { border(ctx, c, 'mrt_mli', 1, C.gold, 8); border(ctx, c, 'dza_mli', 1, C.gold, 6); border(ctx, c, 'dza_mrt', 1, C.gold, 6);
      const [mx, my] = P(c, -10.5, 20.5), [lx, ly] = P(c, -2.5, 17); goldLabel(ctx, 'MAURITANIA', mx, my, 52, pop(t - 117.3)); goldLabel(ctx, 'MALI', lx, ly, 56, pop(t - 117.0)); }
    const kn = clamp((t - 118.6) / 0.6);
    if (kn > 0 && t < 124.4) { ctx.save(); ctx.globalAlpha = 0.45 * kn; ctx.fillStyle = C.gold; ctx.fill(countryPath(c, 'NAM'), 'evenodd'); ctx.restore();
      const [nx, ny] = P(c, 17.5, -21.5); goldLabel(ctx, 'NAMIBIA', nx, ny, 60, pop(t - 118.4));
      border(ctx, c, 'nam_bwa', clamp((t - 119.2) / 0.8), C.gold, 7);
      const kc = clamp((t - 120.8) / 0.6); if (kc > 0) { ctx.save(); ctx.globalAlpha = 0.8 * kc; ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
        for (const r of GEO.caprivi) { const p = new Path2D(); for (let i = 0; i < r.length; i += 2) { const [x, y] = P(c, r[i], r[i + 1]); i ? p.lineTo(x, y) : p.moveTo(x, y); } p.closePath(); ctx.fill(p); ctx.stroke(p); } ctx.restore();
        const [cx2, cy2] = P(c, 23.3, -17.9); chip(ctx, 'CAPRIVI STRIP', cx2, cy2 - 70, win(t, 121.0, 124.2), { size: 28 }); }
      const kz = clamp((t - 122.3) / 0.8); if (kz > 0) { geoPolyline(ctx, c, [[22.0, -16.3], [23.3, -17.2], [24.5, -17.6], [25.3, -17.8], [26.5, -17.9]], kz, '#7FD3FF', 7, { glow: true, glowColor: 'rgba(127,211,255,0.35)' });
        const [zx, zy] = P(c, 25.6, -17.0); chip(ctx, 'ZAMBEZI', zx, zy - 30, kz, { size: 24, stroke: '#7FD3FF' }); }
    }
  }
  // B12–B14 (on the map): cracks, Addis Ababa, Cairo, frozen borders
  if (t > 140 && t < 163.5) {
    const kc = clamp((t - 141.9) / 0.8) * (1 - clamp((t - 152.6) / 0.4));
    if (kc > 0) { const r = rnd(4); ctx.save(); ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 3.5; ctx.globalAlpha = kc * (0.75 + 0.25 * Math.sin(t * 14));
      for (const key of GEO.straight.concat(['mli_ner', 'sdn_tcd'])) for (const line of GEO.borders[key] || []) { const sp = line.map(p => P(c, p[0], p[1]));
        ctx.beginPath(); sp.forEach(([x, y], i) => { const j = (r() - 0.5) * 10; i ? ctx.lineTo(x + j, y + j) : ctx.moveTo(x, y); }); ctx.stroke(); } ctx.restore();
      chip(ctx, 'CONFLICT RISK', W / 2, 150, win(t, 142.6, 145.3), { size: 30, stroke: '#E63946' }); }
    const [ax, ay] = P(c, 38.75, 9.03);
    sprite(ctx, 'africa_hall', ax, ay + 10, 170, { k: win(t, 146.4, 152.2), ay: 0.95 }); goldLabel(ctx, 'ADDIS ABABA · 1963', ax, ay + 50, 34, win(t, 146.6, 152.2));
    chip(ctx, 'FOUNDED: ORGANIZATION OF AFRICAN UNITY', W / 2, 150, win(t, 147.0, 148.8), { size: 28 });
    const [cx3, cy3] = P(c, 31.24, 30.04); goldLabel(ctx, 'CAIRO · 1964', cx3 - 40, cy3 + 46, 40, win(t, 148.8, 156.2));
    chip(ctx, 'NEARLY EVERY MEMBER (NOT SOMALIA OR MOROCCO)', W / 2, 150, win(t, 149.0, 151.8), { size: 26 });
    stamp(ctx, 'BORDERS\nFROZEN', W / 2, 520, t, 152.4, { color: C.gold, size: 96, rot: -6, until: 156.4 });
    chip(ctx, 'MANY WARS PREVENTED', W / 2 - 300, 150, win(t, 157.2, 160.0), { size: 30, stroke: '#2ECC71' });
    chip(ctx, 'NOT ALL', W / 2 + 260, 150, win(t, 158.7, 160.0), { size: 30, stroke: '#E63946' });
    for (const [lon, lat, nm] of [[44.0, 7.0, 'Ogaden 1977'], [37.6, 14.6, 'Badme 1998']]) { const k = win(t, 158.9, 160.2); if (k <= 0) continue; const [x, y] = P(c, lon, lat);
      ctx.save(); ctx.globalAlpha = clamp(k) * (0.6 + 0.4 * Math.sin(t * 12)); ctx.fillStyle = '#FF3B3B'; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); ctx.restore(); styledText(ctx, nm, x + 90, y, 24, { k, fill: '#FFD6D6' }); }
    const kf = clamp((t - 160.1) / 1.2); if (kf > 0) { ctx.save(); ctx.globalAlpha = 0.85 * kf * (1 - clamp((t - 163.0) / 0.5)); ctx.strokeStyle = '#BFF3FF'; ctx.lineWidth = 3; ctx.shadowColor = '#BFF3FF'; ctx.shadowBlur = 12;
      for (const iso of Object.keys(GEO.africa)) ctx.stroke(countryPath(c, iso)); ctx.restore(); chip(ctx, 'FROZEN ONTO THE MODERN MAP', W / 2, 150, win(t, 160.4, 163.2), { size: 30, stroke: '#BFF3FF' }); }
  }
  // B15: the fingerprint
  if (t > 163.2) {
    border(ctx, c, 'egy_sdn', clamp((t - 164.2) / 1.2), C.gold, 8); border(ctx, c, 'lby_tcd', clamp((t - 164.5) / 1.2), C.gold, 6); border(ctx, c, 'mrt_mli', clamp((t - 164.8) / 1.2), C.gold, 6);
    chip(ctx, 'NOT A NATURAL BOUNDARY', W / 2, 150, win(t, 167.8, 169.6), { size: 30, stroke: '#7FD3FF' });
    const kf = clamp((t - 169.6) / 1.2); if (kf > 0) { const [fx, fy] = P(c, 18, 5); ctx.save(); ctx.globalAlpha = 0.5 * kf; ctx.strokeStyle = C.gold; ctx.lineWidth = 5;
      for (let i = 0; i < 16; i++) { const r = 30 + i * 26; ctx.beginPath(); for (let a = 0; a <= 6.3; a += 0.05) { const rr = r + 10 * Math.sin(a * 3 + i) ; const x = fx + Math.cos(a) * rr * 0.8, y = fy + Math.sin(a) * rr; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } ctx.restore(); }
    title(ctx, 'DRAWN WITH RULERS', 150, pop(t - 171.0, 0.45), 104);
  }
}

// ---------------------------------------------------------------- cutaway cards (B6–B7, B11–B13 people)
function card(ctx, k) {        // a dark-teal card that rises over the map
  if (k <= 0) return null; const y = lerp(H + 40, 70, easeOut(k));
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.fillStyle = C.ocean; ctx.beginPath(); ctx.roundRect(80, y, W - 160, H - 150, 34); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(244,208,63,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(80, y, W - 160, H - 150, 34); ctx.stroke(); ctx.restore();
  return y - 70;
}
function sceneCards(ctx, t) {
  // B6: the conference room — no Africans invited; the "ruler" myth
  const k6 = clamp((t - 63.0) / 0.7) * (1 - clamp((t - 90.4) / 0.6));
  const dy = card(ctx, k6);
  if (dy !== null) {
    ctx.save(); ctx.translate(0, dy);
    if (t < 75.0) {
      ctx.fillStyle = '#6B4A2B'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(360, 760, 1000, 90, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4E3520'; ctx.fillRect(400, 850, 30, 120); ctx.fillRect(1290, 850, 30, 120);
      [['british_diplomat', 470], ['french_diplomat', 690], ['bismarck', 910], ['portuguese_diplomat', 1130]].forEach(([n, x], i) => person(ctx, n, x, 800, 210, { k: pop(t - 63.3 - i * 0.12) }));
      // the door
      ctx.fillStyle = '#5A3D25'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.fillRect(1520, 330, 220, 470); ctx.strokeRect(1520, 330, 220, 470); ctx.fillStyle = '#C9A227'; ctx.beginPath(); ctx.arc(1560, 580, 12, 0, 7); ctx.fill();
      stamp(ctx, 'NO AFRICANS\nINVITED', 1630, 520, t, 66.2, { size: 46, rot: -12 });
      // the myth bubble
      const km = win(t, 67.7, 74.6);
      if (km > 0) { ctx.save(); ctx.translate(760, 330); ctx.scale(km, km); ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, 330, 190, 0, 0, 7); ctx.fill(); ctx.stroke();
        for (const [bx, by, br] of [[180, 210, 26], [230, 260, 16]]) { ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill(); ctx.stroke(); }
        const cm = { cx: 18, cy: -mercY(2), z: 3.6, rot: 0, tilt: 1, sx: 0, sy: 0 }; ctx.save(); ctx.translate(-40, 10); ctx.fillStyle = C.land; ctx.strokeStyle = '#2C3531'; ctx.lineWidth = 1.5;
        for (const iso of Object.keys(GEO.africa)) { const p = countryPath(cm, iso); ctx.fill(p, 'evenodd'); ctx.stroke(p); } ctx.restore();
        ctx.save(); ctx.rotate(-0.5 + 0.3 * Math.sin(t * 3)); sprite(ctx, 'ruler', 30, -20, 360, {}); ctx.restore(); ctx.restore();
        styledText(ctx, 'THE MYTH', 760, 120, 44, { k: km, fill: C.white }); }
      stamp(ctx, 'MYTH', 900, 360, t, 68.8, { size: 110, rot: -10, until: 74.6 });
    } else {
      // B7: the rulebook — effective occupation
      const kd = pop(t - 75.0, 0.4); ctx.save(); ctx.translate(W / 2 - 200, 520); ctx.scale(kd, kd); ctx.rotate(-0.03);
      ctx.fillStyle = '#F4ECD6'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-330, -380, 660, 760, 18); ctx.fill(); ctx.stroke();
      setFont(ctx, 'Playfair Display', 44); ctx.fillStyle = '#2A2118'; ctx.textAlign = 'center'; ctx.fillText('GENERAL ACT', 0, -300); setFont(ctx, 'Montserrat', 26); ctx.fillText('BERLIN CONFERENCE · 1885', 0, -250);
      ctx.fillStyle = '#B9AE96'; for (let i = 0; i < 14; i++) ctx.fillRect(-260, -190 + i * 34, i % 4 === 3 ? 340 : 520, 8);
      const kh = clamp((t - 84.4) / 0.6); if (kh > 0) { ctx.fillStyle = 'rgba(255,212,59,0.6)'; ctx.fillRect(-270, 110, 540 * kh, 34); setFont(ctx, 'Montserrat', 26); ctx.fillStyle = '#2A2118'; ctx.textAlign = 'left'; ctx.fillText('…effective occupation…', -250, 136); }
      ctx.restore();
      chip(ctx, 'THE RULEBOOK', W / 2 - 200, 110, win(t, 75.9, 78.3), { size: 32 });
      // flag on the coast = no longer enough
      const kf = win(t, 78.4, 83.8); if (kf > 0) { ctx.save(); ctx.translate(1340, 360); ctx.scale(kf, kf);
        ctx.fillStyle = '#E8D9A8'; ctx.beginPath(); ctx.ellipse(0, 90, 200, 40, 0, 0, 7); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-20, 90); ctx.lineTo(-20, -90); ctx.stroke();
        ctx.fillStyle = '#C0392B'; ctx.beginPath(); ctx.moveTo(-20, -90); ctx.lineTo(80, -60); ctx.lineTo(-20, -30); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        styledText(ctx, 'FLAG ON THE COAST?', 1340, 520, 36, { k: kf, fill: '#fff' }); }
      if (t > 80.8 && t < 84) styledText(ctx, '✕', 1340, 360, 220, { k: pop(t - 80.8), fill: '#FF3B3B', stroke: C.ink });
      stamp(ctx, 'EFFECTIVE\nOCCUPATION', W / 2 - 200, 560, t, 85.0, { size: 64, rot: -9 });
      [['Treaties with local rulers', 86.1], ['A working administration', 87.6], ['Formal notice to rivals', 89.0]].forEach(([s, t0], i) => {
        const k = pop(t - t0, 0.3); if (k <= 0) return; ctx.save(); ctx.translate(1180, 300 + i * 110); ctx.scale(k, k); styledText(ctx, '✓', 0, 0, 60, { fill: '#2ECC71' });
        setFont(ctx, 'Montserrat', 36); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, 50, 2); ctx.restore(); });
    }
    ctx.restore();
  }
  // B11: one community, split overnight (people strip at the bottom of the map)
  const k11 = clamp((t - 123.6) / 0.6) * (1 - clamp((t - 131.9) / 0.5));
  if (k11 > 0) {
    ctx.save(); ctx.globalAlpha = k11; ctx.fillStyle = 'rgba(14,34,42,0.88)'; ctx.beginPath(); ctx.roundRect(160, 470, W - 320, 470, 30); ctx.fill(); ctx.strokeStyle = 'rgba(244,208,63,0.6)'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    const split = easeOut((t - 124.3) / 1.0), sad = t > 125.0;
    [0, 1, 2, 3].forEach(i => { const side = i < 2 ? -1 : 1, x = 560 + i * 270 + side * 150 * split; person(ctx, `villager${i}${sad ? '_sad' : ''}`, x, 900, 190, { k: pop(t - 123.7 - i * 0.08) * k11, flip: i >= 2 }); });
    if (split > 0) { ctx.save(); ctx.globalAlpha = k11; ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.shadowColor = C.gold; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(W / 2, 490); ctx.lineTo(W / 2, 490 + 440 * split); ctx.stroke(); ctx.restore(); }
    [['Languages', 127.6, '💬'], ['Trade', 128.5, '⚖'], ['Families', 129.4, '♥']].forEach(([s, t0, ic], i) => {
      const k = pop(t - t0, 0.3) * k11; if (k <= 0) return; chip(ctx, s.toUpperCase() + ' — SPLIT', 560 + i * 400, 560, k, { size: 26, stroke: '#E63946' }); });
    stamp(ctx, 'OVERNIGHT', W / 2, 700, t, 131.1, { size: 84, rot: -8, until: 131.9 });
  }
  // B12–B13: the independence leaders (bottom strip)
  const k12 = clamp((t - 135.2) / 0.6) * (1 - clamp((t - 156.2) / 0.6));
  if (k12 > 0) {
    const worried = t > 136.6 && t < 149.6, cheer = t >= 149.6;
    [['gha', 260], ['eth', 520], ['nga', 1400], ['sen', 1660]].forEach(([iso, x], i) => person(ctx, `leader_${iso}${worried ? '_worried' : cheer ? '_cheer' : ''}`, x, 935, 205, { k: pop(t - 135.3 - i * 0.12) * k12 }));
    chip(ctx, 'AN AGONIZING CHOICE', W / 2, 150, win(t, 136.2, 139.0), { size: 32, stroke: '#E63946' });
    chip(ctx, 'ARBITRARY · FLAWED', W / 2, 150, win(t, 139.0, 141.8), { size: 30 });
  }
}

// ---------------------------------------------------------------- captions
const CAPTIONS = [
  [0.1, 2.3, 'A map of Africa'], [2.4, 4.3, 'Trace the borders'], [4.4, 8.9, 'Coasts and rivers curve'], [9.0, 13.7, 'Drawn with a ruler'],
  [13.9, 18.1, 'Razor-straight lines'], [18.2, 20.7, 'Splitting communities'], [20.8, 22.7, 'Nature never does this'], [22.8, 26.0, 'A geometry textbook?'],
  [26.2, 29.9, 'Back to the 1880s'], [30.0, 34.8, 'The Scramble for Africa'],
  [35.0, 39.9, 'Trading on the coast'], [40.0, 44.6, 'Then: into the interior'], [44.7, 48.7, 'Seven European empires'], [48.8, 52.7, 'All rushing in'],
  [52.9, 57.1, 'Rivals on the brink'], [57.2, 60.7, 'Bismarck hosts Berlin'], [60.8, 63.0, 'Fourteen countries'],
  [63.3, 67.5, 'No Africans invited'], [67.6, 70.3, 'A popular myth'], [70.4, 74.8, 'No ruler at the table'],
  [75.0, 78.3, 'They wrote the rulebook'], [78.4, 82.6, 'A flag wasn\'t enough'], [82.7, 85.9, 'Effective occupation'], [86.0, 90.6, 'Treaties, offices, notice'],
  [90.9, 93.3, 'Twenty years'], [93.4, 97.5, 'Hundreds of treaties'], [97.6, 101.7, 'Using incomplete maps'],
  [101.9, 105.9, 'A blank spot'], [106.0, 108.0, 'The easiest shortcut'], [108.1, 112.0, 'Latitude and longitude'],
  [112.1, 116.0, 'Egypt and Sudan'], [116.1, 118.8, 'Mali, Mauritania'], [118.9, 121.1, 'Namibia'], [121.2, 123.4, 'Corridors to rivers'],
  [123.6, 127.2, 'Lines hit the ground'], [127.3, 131.0, 'People split apart'], [131.1, 132.1, 'Overnight'],
  [132.3, 135.3, 'Independence'], [135.4, 137.5, 'An agonizing choice'], [137.6, 140.4, 'Arbitrary, flawed'], [140.5, 145.4, 'Redraw one, risk all'],
  [145.6, 148.8, 'The OAU'], [148.9, 151.9, 'A historic pledge'], [152.0, 156.4, 'Keep the borders'],
  [156.6, 158.6, 'Many wars prevented'], [158.7, 160.0, 'Not all'], [160.1, 163.1, 'Lines frozen in place'],
  [163.3, 166.6, 'A razor-straight frontier'], [166.7, 169.1, 'Not nature'], [169.2, 172.6, 'A diplomat\'s fingerprint'],
];
function drawText(ctx, t) {
  for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .26, .18); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); }
}
function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H * .5, H * .4, W / 2, H * .5, H * 1.0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function renderAt(t, ctx) {
  if (VERT) return renderVertical(t, ctx);
  renderScene(t, ctx || document.getElementById('cv').getContext('2d'));
}
function renderScene(t, ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const c = camAt(t);
  drawMap(ctx, c);
  sceneMap(ctx, c, t);
  sceneCards(ctx, t);
  if (VERT) return;
  vignette(ctx);
  drawText(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  const fi = 1 - clamp(t / 0.4), fo = clamp((t - 175.1) / 0.7);
  if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- 9:16 teaser: scene band + title above + big captions below
const VW = 1080, VH = 1920;
const VKEYS = [[0, 960, 1.32], [56.6, 960, 1.32], [57.4, 630, 1.32], [59.3, 630, 1.32], [60.0, 1000, 1.32], [62.8, 1000, 1.32], [63.4, 800, 1.15], [65.9, 800, 1.15], [66.4, 1400, 1.15], [67.4, 1400, 1.15], [68.0, 860, 1.15], [75.5, 860, 1.15]];     // [t, focus x, scale]
let OFF = null;
function vcam(t) { const k = VKEYS; if (t <= k[0][0]) return k[0]; for (let i = 0; i < k.length - 1; i++) if (t <= k[i + 1][0]) { const u = easeIO((t - k[i][0]) / (k[i + 1][0] - k[i][0])); return [t, lerp(k[i][1], k[i + 1][1], u), lerp(k[i][2], k[i + 1][2], u)]; } return k[k.length - 1]; }
function renderVertical(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  if (!OFF) { OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H; }
  const ts = SHORT_END ? Math.min(t, SHORT_END) : t;
  renderScene(ts, OFF.getContext('2d'));
  const [, fxk, s] = vcam(ts), bandH = H * s, yb = (VH - bandH) / 2 + 40, vis = VW / s, fx = clamp(fxk, vis / 2, W - vis / 2), sx = fx - vis / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.save(); ctx.filter = 'blur(16px)';
  ctx.drawImage(OFF, sx, 0, vis, 1, -30, -30, VW + 60, yb + 32);
  ctx.drawImage(OFF, sx, H - 1, vis, 1, -30, yb + bandH - 2, VW + 60, VH - yb - bandH + 32);
  ctx.restore();
  ctx.fillStyle = 'rgba(6,16,22,0.55)'; ctx.fillRect(0, 0, VW, yb); ctx.fillRect(0, yb + bandH, VW, VH - yb - bandH);
  ctx.drawImage(OFF, sx, 0, vis, H, 0, yb, VW, bandH);
  ctx.fillStyle = C.gold; ctx.fillRect(0, yb - 3, VW, 3); ctx.fillRect(0, yb + bandH, VW, 3);
  styledText(ctx, "WHY AFRICA'S BORDERS ARE STRAIGHT", VW / 2, Math.max(150, yb / 2 + 10), 58, { font: 'Playfair Display', grad: ['#F9E27D', '#F4D03F'], stroke: C.goldDark, maxW: 1010 });
  for (const [t0, t1, txt] of CAPTIONS) { if (SHORT_END && t0 > SHORT_END - 0.3) continue; const k = win(ts, t0, t1, .26, .18); if (k > 0 && !(SHORT_END && t > SHORT_END + 0.2)) styledText(ctx, txt, VW / 2, 1600, 72, { k, shadow: 6, maxW: 1000 }); }
  const g = ctx.createRadialGradient(VW / 2, VH * .5, VH * .35, VW / 2, VH * .5, VH * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (SHORT_END && t > SHORT_END) {                      // cliffhanger end card
    const e = t - SHORT_END, k = clamp(e / 0.35);
    ctx.fillStyle = `rgba(4,10,14,${0.74 * k})`; ctx.fillRect(0, 0, VW, VH);
    styledText(ctx, 'NOT A RULER', VW / 2, 560, 104, { k: pop(e - 0.1, 0.35), fill: C.white, stroke: C.ink });
    styledText(ctx, 'AT A TABLE…', VW / 2, 680, 104, { k: pop(e - 0.25, 0.35), fill: C.white, stroke: C.ink });
    styledText(ctx, 'SO HOW?', VW / 2, 840, 140, { k: pop(e - 0.5, 0.35), fill: C.yellow, stroke: C.goldDark, rot: -3 });
    const kc = pop(e - 0.9, 0.35);
    if (kc > 0) { ctx.save(); ctx.translate(VW / 2, 1060); ctx.scale(kc, kc); setFont(ctx, 'Montserrat', 48);
      const w = ctx.measureText('FULL VIDEO ON YOUTUBE').width + 150; ctx.fillStyle = '#E62117'; ctx.beginPath(); ctx.roundRect(-w / 2, -58, w, 116, 58); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w / 2 + 50, -22); ctx.lineTo(-w / 2 + 50, 22); ctx.lineTo(-w / 2 + 86, 0); ctx.closePath(); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FULL VIDEO ON YOUTUBE', 30, 3); ctx.restore(); }
    styledText(ctx, 'Mapheld', VW / 2, 1190, 64, { k: pop(e - 1.2, 0.35), fill: C.gold, stroke: C.goldDark });
  }
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, VW, VH); ctx.restore();
  const fi = 1 - clamp(t / 0.3); if (fi > 0) { ctx.fillStyle = `rgba(0,0,0,${fi})`; ctx.fillRect(0, 0, VW, VH); }
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
