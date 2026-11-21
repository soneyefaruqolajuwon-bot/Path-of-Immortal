/* Why maps lie: the Mercator projection — Mapheld 16:9 long-form. HTML5 Canvas, deterministic.
 * renderAt(t) draws the frame at storyboard time t (seconds, 0–93, as in the script).
 * Assets: window.ASSETS {name: dataURI}, geometry: GEO (geo_data.js).
 */
'use strict';
const W = 1920, H = 1080, DURATION = 195;
const C = {
  ocean: "#1E4D5C", land: '#8A855C', coast: '#5E5A3B', halo: '#2C6A78', ink: '#141416',
  gold: '#F4D03F', goldDark: '#3A2A08', yellow: '#FFD43B', cyan: '#25E3FF', white: '#FFFFFF',
  usRed: '#B22234', usBlue: '#3C3B6E',
};
const CAPTION = { size: 50, y: 968, font: 'Montserrat', shadow: 4 };   // lower-third subtitles


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


// ------------------------------------------------------------------ assets
const IMG = {};
let NOISE, NOISE_FINE;
function loadAssets() {
  const jobs = Object.entries(window.ASSETS).map(([k, src]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => { console.warn('asset', k); res(); }; im.src = src;
  }));
  NOISE = noiseTile(256, 10, 0.035);
  NOISE_FINE = noiseTile(256, 1.5, 0.025);
  prepGeo();
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

function partial(sp, k) {
  if (k <= 0) return new Path2D();
  if (sp.length < 2) return new Path2D();
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

// ------------------------------------------------------------------ projections (all take lon/lat in degrees)
const D2R = Math.PI / 180;
const mY = lat => mercY(Math.max(-85, Math.min(85, lat)));
const gpY = lat => 114.59 * Math.sin(lat * D2R);               // equal-area cylindrical (Gall–Peters proportions)
function projOne(d, lon, lat) {
  if (d.type === 'O') {
    const l = (lon - d.lon) * D2R, p = lat * D2R, p0 = d.lat * D2R;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    let x = d.R * Math.cos(p) * Math.sin(l), y = d.R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l));
    if (cosc < 0) { const n = Math.hypot(x, y) || 1; x = x / n * d.R; y = y / n * d.R; }
    return [W / 2 + x, H / 2 - y];
  }
  const dl = lon - d.lon;
  const x = W / 2 + dl * d.z;
  if (d.type === 'M') return [x, H / 2 - (mY(lat) - mY(d.lat)) * d.z];
  if (d.type === 'E') return [x, H / 2 - (lat - d.lat) * d.z];
  return [x, H / 2 - (gpY(lat) - gpY(d.lat)) * d.z];             // 'A'
}
// globe <-> flat: unroll the sphere like a peeling cylinder, so the far side only appears as it rolls into view
function unroll(o, f, u) {
  const s = Math.max(1 - u, 1e-3), Reff = lerp(o.R, f.z / D2R, u), lon0 = lerp(o.lon, f.lon, u), latc = lerp(0, f.lat, u) * D2R;
  const wF = f.type === 'E' ? 0 : easeIn(u);
  return (lon, lat) => {
    let dl = (lon - lon0) * D2R;
    if (Math.abs(dl * s) > Math.PI / 2) dl = Math.sign(dl) * Math.PI / 2 / s;   // slide hidden land onto the rim
    const ph = lat * D2R;
    const x = Reff * Math.sin(dl * s) / s * lerp(1, Math.cos(ph), s), y = Reff * (Math.sin(ph * s) - Math.sin(latc * s)) / s;
    const U = [W / 2 + x, H / 2 - y];
    if (wF <= 0) return U;
    const F = projOne(f, lon, lat); return [lerp(U[0], F[0], wF), lerp(U[1], F[1], wF)];
  };
}
function makeCam(a, b, u) {
  const cam = { a, b, u, type: u <= 0 ? a.type : (u >= 1 ? b.type : 'mix'), z: u <= 0 ? a.z : b.z };
  if (u <= 0 || !b) cam.projV = (lon, lat) => projOne(a, lon, lat);
  else if (u >= 1) cam.projV = (lon, lat) => projOne(b, lon, lat);
  else if (a.type === 'O' && b.type !== 'O') cam.projV = unroll(a, b, u);
  else if (b.type === 'O' && a.type !== 'O') cam.projV = unroll(b, a, 1 - u);
  else cam.projV = (lon, lat) => { const p = projOne(a, lon, lat), q = projOne(b, lon, lat); return [lerp(p[0], q[0], u), lerp(p[1], q[1], u)]; };
  cam.proj = (lon, lat) => cam.projV(lon, lat) || [-9999, -9999];
  cam.isGlobe = (a.type === 'O' && u < 0.5) || (b && b.type === 'O' && u >= 0.5);
  cam.globeR = a.type === 'O' ? a.R : (b && b.type === 'O' ? b.R : 0);
  cam.globeK = a.type === 'O' ? 1 - u : (b && b.type === 'O' ? u : 0);
  return cam;
}
function P(c, lon, lat) { return c.proj(lon, lat); }

const Mv = (lon, lat, z) => ({ type: 'M', lon, lat, z }), Ev = (lon, lat, z) => ({ type: 'E', lon, lat, z }),
      Av = (lon, lat, z) => ({ type: 'A', lon, lat, z }), Ov = (lon, lat, R) => ({ type: 'O', lon, lat, R });
const BCN = [2.165, 41.392];
const KEYS = [
  [0, Mv(10, 38, 4.5)], [10.8, Mv(5, 34, 4.9)], [18.3, Mv(0, 34, 4.7)], [31.3, Mv(10, 38, 4.6)], [37.8, Mv(-20, 36, 4.6)],
  [42.0, Ov(-30, 0, 430)], [47.0, Ov(-38, 18, 440)], [52.5, Ov(-45, 0, 450)], [56.5, Ev(-30, 25, 5.4)], [60.0, Ev(-35, 26, 13)], [72.4, Ev(-35, 26, 13.5)],
  [75.6, Mv(-35, 26, 13.5)], [88, Mv(-35, 26, 13.5)], [91, Mv(10, 38, 4.6)], [103, Mv(10, 38, 4.6)], [105.6, Av(10, 0, 4.9)],
  [109, Av(10, 0, 4.9)], [114.2, Mv(10, 38, 4.6)], [137, Mv(10, 38, 4.6)], [147.3, Mv(BCN[0], BCN[1], 6)], [153.5, Mv(BCN[0], BCN[1], 140000)],
  [166, Mv(BCN[0], BCN[1], 160000)], [172, Mv(10, 38, 4.6)], [175.5, Ov(20, 0, 450)], [177.8, Ov(30, 12, 450)], [180.2, Ov(10, 0, 450)], [183.0, Mv(10, 38, 4.6)], [188.8, Mv(10, 38, 4.6)],
  [191.2, Ov(0, 0, 450)], [195, Ov(-25, 10, 450)],
];
function camAt(t) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= t) i++;
  const [t0, a] = KEYS[i], [t1, b] = KEYS[i + 1], u = clamp((t - t0) / (t1 - t0));
  if (a.type !== b.type) return makeCam(a, b, easeIO(u));
  const e = easeIO(u), d = { type: a.type };
  if (a.type === 'O') { d.lon = lerp(a.lon, b.lon, e); d.lat = lerp(a.lat, b.lat, e); d.R = lerp(a.R, b.R, e); return makeCam(d, null, 0); }
  const big = Math.abs(Math.log(b.z / a.z)) > 0.4;
  d.z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), e));
  const w = big ? (1 / a.z - 1 / d.z) / (1 / a.z - 1 / b.z) : e;
  d.lon = lerp(a.lon, b.lon, w);
  if (a.type === 'M') { const y = lerp(mY(a.lat), mY(b.lat), w); d.lat = Math.atan(Math.sinh(y * D2R)) / D2R; } else d.lat = lerp(a.lat, b.lat, w);
  return makeCam(d, null, 0);
}

// ------------------------------------------------------------------ geometry
const RINGS = {};
function toRings(flat) { return flat.map(r => { const pts = []; for (let i = 0; i < r.length; i += 2) pts.push([r[i], r[i + 1]]); return pts; }); }
function prepGeo() {
  for (const [k, v] of Object.entries(GEO)) if (Array.isArray(v)) RINGS[k] = toRings(v);
  RINGS.worldBox = RINGS.world.map(r => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of r) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; });
}
function ringsPath(c, rings, boxes) {
  const p = new Path2D();
  let vis = null;
  if (boxes && c.type === 'M' && c.z > 60) {        // cull far rings at deep zoom
    const span = W / c.a.z;
    vis = [c.a.lon - span, c.a.lat - span, c.a.lon + span, c.a.lat + span];
  }
  rings.forEach((r, i) => {
    if (vis) { const b = boxes[i]; if (b[2] < vis[0] || b[0] > vis[2] || b[3] < vis[1] - 2 || b[1] > vis[3] + 2) return; }
    let prev = null, started = false;
    r.forEach(([lon, lat]) => {
      const q = c.projV(lon, lat);
      if (!q) { prev = null; return; }
      if (!started || !prev) { p.moveTo(q[0], q[1]); started = true; } else p.lineTo(q[0], q[1]);
      prev = q;
    });
    if (started) p.closePath();
  });
  return p;
}
// rotate rings on the sphere so centroid c0 moves to c1 (area-preserving: shows TRUE size at the new latitude)
function vec(lon, lat) { const l = lon * D2R, p = lat * D2R; return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]; }
function unvec(v) { return [Math.atan2(v[1], v[0]) / D2R, Math.asin(Math.max(-1, Math.min(1, v[2]))) / D2R]; }
function moveRings(rings, c0, c1, u) {
  const a = vec(...c0), b = vec(...c1);
  let k = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const n = Math.hypot(...k) || 1; k = k.map(x => x / n);
  const ang = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * u, cs = Math.cos(ang), sn = Math.sin(ang);
  return rings.map(r => r.map(([lon, lat]) => {
    const v = vec(lon, lat), kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    const cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
    return unvec([0, 1, 2].map(i => v[i] * cs + cr[i] * sn + k[i] * kv * (1 - cs)));
  }));
}
function circleRing(lon, lat, rDeg, n = 48) {
  const p1 = lat * D2R, l1 = lon * D2R, d = rDeg * D2R, out = [];
  for (let i = 0; i <= n; i++) {
    const th = i / n * 2 * Math.PI, p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th));
    const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    out.push([l2 / D2R, p2 / D2R]);
  }
  return out;
}

// ------------------------------------------------------------------ drawing layers
function drawBase(ctx, c, t) {
  ctx.fillStyle = '#0E2E38'; ctx.fillRect(0, 0, W, H);
  // ocean: full frame on flat maps, a disc on the globe
  if (c.globeK >= 0.999) {
    ctx.save(); ctx.fillStyle = C.ocean; ctx.beginPath(); ctx.arc(W / 2, H / 2, c.globeR, 0, 7); ctx.fill(); ctx.restore();
  } else if (c.globeK > 0) {
    ctx.save(); ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 0.55 * c.globeK; ctx.fillStyle = '#0E2E38'; ctx.fillRect(0, 0, W, H); ctx.restore();
  } else { ctx.fillStyle = C.ocean; ctx.fillRect(0, 0, W, H); }
  ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}
function drawGraticule(ctx, c, a, step = 30, color = '#F4F1E6') {
  if (a <= 0) return;
  const p = new Path2D();
  for (let lon = -180; lon <= 180; lon += step) { let prev = null; for (let la = -84; la <= 84; la += 3) { const q = c.projV(lon, la); if (!q) { prev = null; continue; } prev ? p.lineTo(...q) : p.moveTo(...q); prev = q; } }
  for (let la = -75; la <= 75; la += step / 2) { let prev = null;
    for (let lo = -180; lo <= 180; lo += 3) { const q = c.projV(lo, la); if (!q) { prev = null; continue; } prev ? p.lineTo(...q) : p.moveTo(...q); prev = q; } }
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke(p); ctx.restore();
}
function drawLand(ctx, c) {
  const p = ringsPath(c, RINGS.world, RINGS.worldBox);
  ctx.save(); ctx.translate(5, 7); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(p, 'evenodd'); ctx.restore();
  ctx.fillStyle = C.land; ctx.fill(p, 'evenodd');
  ctx.save(); ctx.clip(p, 'evenodd'); ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.strokeStyle = C.coast; ctx.lineWidth = 1.6; ctx.stroke(p);
}
function hl(ctx, c, key, a, color = C.gold, rings) {
  if (a <= 0) return;
  const p = ringsPath(c, rings || RINGS[key]);
  ctx.save(); ctx.globalAlpha = 0.55 * a; ctx.fillStyle = color; ctx.fill(p, 'evenodd');
  ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.stroke(p); ctx.restore();
}
function globeRim(ctx, c) {
  if (c.globeK < 0.999) return;
  ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.shadowColor = C.gold; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, c.globeR, 0, 7); ctx.stroke(); ctx.restore();
}
function chip(ctx, text, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 'Montserrat', o.size || 30);
  const w = ctx.measureText(text).width + 46, h = (o.size || 30) * 1.75;
  ctx.fillStyle = o.bg || 'rgba(10,24,32,0.92)'; ctx.strokeStyle = o.stroke || C.gold; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2); ctx.restore();
}
function gold(ctx, text, x, y, size, k, rot = -2) { styledText(ctx, text, x, y, size, { k, fill: C.gold, stroke: C.goldDark, rot }); }

// moving "true size" copies: [key, from, to, t0, t1 (arrive), tEnd]
const MOVES = [
  ['GRL', GEO.centroids.GRL, [2.6, 28.0], 13.8, 16.6, 31.0],
  ['ALASKA', GEO.centroids.ALASKA, [-118, 21], 19.6, 22.2, 31.0],
  ['RUS', GEO.centroids.RUS, [95, 2], 23.0, 26.2, 31.0],
  ['CAN', GEO.centroids.CAN, [-38, 3], 23.6, 26.8, 31.0],
];
function sceneCompare(ctx, c, t) {        // P1–P4 (0–37.8)
  if (t > 38.5) return;
  const ex = popOut(37.6 - t, 0.6);
  hl(ctx, c, 'GRL', win(t, 2.4, 37.6, .5) * ex);
  hl(ctx, c, 'AFRICA', win(t, 6.4, 37.6, .5) * ex);
  mapLabel(ctx, c, -41, 74, 'GREENLAND', 32, win(t, 2.6, 13.6));
  mapLabel(ctx, c, 20, 5, 'AFRICA', 40, win(t, 6.6, 18.0));
  gold(ctx, 'AFRICA = 14× GREENLAND', W / 2, 130, 86, win(t, 11.6, 18.0, .4));
  hl(ctx, c, 'DZA', win(t, 14.2, 18.4) * 0.6, '#FFFFFF');
  mapLabel(ctx, c, 2.6, 36.0, 'ALGERIA', 26, win(t, 14.6, 18.4));
  for (const [key, a, b, t0, t1, tEnd] of MOVES) {
    if (t < t0 || t > tEnd + 0.4) continue;
    const u = easeIO((t - t0) / (t1 - t0)), k = popOut(tEnd + 0.4 - t, 0.4);
    hl(ctx, c, key, win(t, t0 - 0.6, tEnd) * 0.35, '#FFFFFF');
    hl(ctx, c, null, k, '#FF9F43', moveRings(RINGS[key], a, b, u));
    if (u >= 1) { const q = c.proj(...b); chip(ctx, 'TRUE SIZE', q[0], q[1] + 90, win(t, t1, tEnd), { size: 22, fill: '#FFB36B', stroke: '#FF9F43' }); }
  }
  hl(ctx, c, 'MEX', win(t, 19.6, 24.0) * 0.5, '#FFFFFF');
  for (const [key, lon, lat, t0] of [['IND', 79, 22, 27.2], ['BRA', -52, -10, 27.8], ['IDN', 115, -1, 28.4]]) {
    hl(ctx, c, key, win(t, t0, 31.2), '#7FE7FF');
    const q = c.proj(lon, lat); chip(ctx, '≈ TRUE SIZE', q[0], q[1] + 60, win(t, t0 + 0.2, 31.2), { size: 20, fill: '#7FE7FF', stroke: '#7FE7FF' });
  }
  gold(ctx, '?', W / 2, 160, 200, win(t, 32.0, 37.4, .4), 0);
}

const LISBON = [-9.14, 38.72], BARBADOS = [-59.6, 13.1];
function rhumbFromChart(a, b, n = 60) {   // compass bearing read off a plate-carrée chart, then sailed for real (a rhumb line)
  const slope = (b[1] - a[1]) / (b[0] - a[0]), y0 = mY(a[1]), out = [];
  for (let i = 0; i <= n; i++) { const lon = lerp(a[0], b[0], i / n), y = y0 + slope * (lon - a[0]); out.push([lon, Math.atan(Math.sinh(y * D2R)) / D2R]); }
  return out;
}
function trueRhumb(a, b, n = 60) {        // straight line on Mercator = constant bearing that actually arrives
  const out = []; for (let i = 0; i <= n; i++) { const f = i / n, y = lerp(mY(a[1]), mY(b[1]), f); out.push([lerp(a[0], b[0], f), Math.atan(Math.sinh(y * D2R)) / D2R]); } return out;
}
function geoPath(c, pts) { const p = new Path2D(); pts.forEach((q, i) => { const s = c.proj(...q); i ? p.lineTo(...s) : p.moveTo(...s); }); return p; }
function sceneNavigation(ctx, c, t) {     // P5–P8 (37.8–88)
  if (t < 38 || t > 89) return;
  // caravel on the globe / chart
  const kShip = win(t, 43.0, 52.0);
  if (kShip > 0) { const q = c.proj(-30 + Math.sin(t * 0.4) * 2, 30); sprite(ctx, 'caravel', q[0], q[1] - 20, 170, { k: kShip, rot: wob(t, 0.4, 3) }); }
  chip(ctx, '1500s', W / 2, 120, win(t, 40.0, 47.0), { size: 40, fill: C.gold });
  chip(ctx, '3D SPHERE', W / 2 - 330, 130, win(t, 47.6, 56.0), { size: 30 });
  chip(ctx, 'FLAT PAPER', W / 2 + 330, 130, win(t, 49.4, 56.0), { size: 30 });
  // horizontal stretch arrows while the globe peels open
  const ka = win(t, 52.8, 58.0);
  if (ka > 0) for (const y of [260, 820]) { ctx.save(); ctx.globalAlpha = clamp(ka); ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(560, y); ctx.lineTo(1360, y); ctx.stroke();
    for (const [x, s] of [[560, -1], [1360, 1]]) { ctx.beginPath(); ctx.moveTo(x + s * 26, y); ctx.lineTo(x - s * 6, y - 18); ctx.lineTo(x - s * 6, y + 18); ctx.fill(); } ctx.restore(); }
  chip(ctx, 'SHAPES WARP', W / 2, 130, win(t, 58.0, 61.4), { size: 30, stroke: '#FF9F43', fill: '#FFB36B' });
  // the voyage on the flat (plate carrée) chart: ruler line vs. the compass track actually sailed
  if (t > 60.4 && t < 72.6) {
    const kk = popOut(72.4 - t), A = c.proj(...LISBON), B = c.proj(...BARBADOS);
    ctx.save(); ctx.globalAlpha = kk; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.setLineDash([16, 12]);
    ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(lerp(A[0], B[0], clamp((t - 60.6) / 1.0)), lerp(A[1], B[1], clamp((t - 60.6) / 1.0))); ctx.stroke(); ctx.restore();
    for (const [p, lab] of [[A, 'LISBON'], [B, 'ISLAND']]) { ctx.save(); ctx.globalAlpha = kk; ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(...p, 10, 0, 7); ctx.fill(); ctx.restore(); chip(ctx, lab, p[0], p[1] - 46, kk, { size: 22 }); }
    const track = rhumbFromChart(LISBON, BARBADOS), sp = track.map(q => c.proj(...q)), u = clamp((t - 62.0) / 3.6);
    ctx.save(); ctx.globalAlpha = kk; ctx.strokeStyle = '#FF4D57'; ctx.lineWidth = 6; ctx.stroke(partial(sp, u)); ctx.restore();
    const [x, y] = pointAlong(sp, u); sprite(ctx, 'caravel', x, y - 30, 120, { k: kk * pop(t - 62.0), flip: true });
    sprite(ctx, 'warn_badge', W / 2, 140, 560, { k: win(t, 65.8, 68.6) });
    sprite(ctx, 'compass_rose', 240, 760, 200, { k: win(t, 61.0, 72.4), rot: Math.sin(t * 2) * 6 });
  }
  // Mercator himself + right angles as the grid stretches vertically
  sprite(ctx, 'mercator', 230, 760, 300, { k: win(t, 68.8, 88.0), ay: 0.75 });
  gold(ctx, '1569 · GERARDUS MERCATOR', W / 2 + 120, 130, 56, win(t, 69.0, 75.6, .4));
  const kr = win(t, 74.0, 79.0);
  if (kr > 0) for (const [lon, lat] of [[-50, 15], [-20, 15], [-50, 30], [-20, 30], [-35, 45]]) {
    const q = c.proj(lon, lat); ctx.save(); ctx.globalAlpha = clamp(kr); ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.strokeRect(q[0], q[1] - 26, 26, 26); ctx.restore();
  }
  chip(ctx, '90° EVERYWHERE', W / 2 + 120, 230, win(t, 75.6, 79.2), { size: 30 });
  if (t > 75 && t < 79) { for (const y of [180, 880]) { const ky = clamp((t - 75.0) / 0.6) * popOut(78.8 - t);
    ctx.save(); ctx.globalAlpha = ky; ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(1700, 540); ctx.lineTo(1700, y); ctx.stroke();
    const s = y < 540 ? -1 : 1; ctx.beginPath(); ctx.moveTo(1700, y + s * 26); ctx.lineTo(1682, y - s * 6); ctx.lineTo(1718, y - s * 6); ctx.fill(); ctx.restore(); } }
  // P8: ruler line on Mercator = one steady bearing that arrives
  if (t > 78.6) {
    const kk = popOut(88.0 - t), A = c.proj(...LISBON), B = c.proj(...BARBADOS), track = trueRhumb(LISBON, BARBADOS), sp = track.map(q => c.proj(...q));
    const ul = clamp((t - 79.4) / 1.2), us = clamp((t - 81.0) / 4.0);
    ctx.save(); ctx.globalAlpha = kk; ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.stroke(partial([A, B], ul)); ctx.restore();
    for (const [p, lab] of [[A, 'LISBON'], [B, 'ISLAND']]) chip(ctx, lab, p[0], p[1] - 46, kk, { size: 22 });
    const [x, y] = pointAlong(sp, us); sprite(ctx, 'caravel', x, y - 30, 120, { k: kk * pop(t - 81.0), flip: true });
    chip(ctx, '✓ ONE STEADY BEARING', W / 2, 140, win(t, 84.8, 88.0), { size: 32, stroke: '#8CE99A', fill: '#8CE99A' });
    sprite(ctx, 'compass_rose', 1680, 760, 200, { k: win(t, 79.2, 88.0) });
  }
}

function sceneStretch(ctx, c, t) {        // P9–P11 (88–133.6)
  if (t < 88.5 || t > 134) return;
  // a single true-size circle at 62°N: stretched horizontally, then vertically
  if (t < 103.4) {
    const k = win(t, 89.4, 103.2), [x, y] = c.proj(15, 62), [ex, ey] = c.proj(25, 0), r0 = 8 * c.a.z;
    const sx = 1 + (1 / Math.cos(62 * D2R) - 1) * easeIO((t - 91.6) / 2.4), sy = 1 + (1 / Math.cos(62 * D2R) - 1) * easeIO((t - 96.4) / 2.4);
    if (k > 0) {
      ctx.save(); ctx.globalAlpha = clamp(k); ctx.fillStyle = 'rgba(244,208,63,0.35)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x, y, r0 * sx, r0 * sy, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(ex, ey, r0, r0, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
      chip(ctx, '↔ STRETCHED ×2', x, y - r0 * sy - 50, win(t, 92.0, 103.2), { size: 26 });
      chip(ctx, '↕ ×2 TOO', x + r0 * sx + 140, y, win(t, 96.8, 103.2), { size: 26 });
      chip(ctx, 'EQUATOR: UNCHANGED', ex, ey + r0 + 50, win(t, 93.0, 103.2), { size: 24, fill: '#7FE7FF', stroke: '#7FE7FF' });
    }
  }
  // Tissot circles everywhere: equal on the equal-area map, ballooning on Mercator
  const kt = win(t, 103.4, 118.0, .5, .5);
  if (kt > 0) {
    ctx.save(); ctx.globalAlpha = 0.85 * clamp(kt);
    for (let la = -60; la <= 75; la += 15) for (let lo = -165; lo <= 180; lo += 30) {
      const p = geoPath(c, circleRing(lo, la, 4.0)); ctx.fillStyle = 'rgba(244,208,63,0.28)'; ctx.fill(p); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke(p);
    }
    ctx.restore();
  }
  for (const [key, lon, lat, t0] of [['KEN', 38, 1, 104.6], ['COL', -73, 4, 105.2], ['IDN', 115, -1, 105.8]]) {
    hl(ctx, c, key, win(t, t0, 109.6), '#7FE7FF'); const q = c.proj(lon, lat);
    chip(ctx, key === 'KEN' ? 'KENYA' : key === 'COL' ? 'COLOMBIA' : 'INDONESIA', q[0], q[1] + 50, win(t, t0, 109.6), { size: 22, fill: '#7FE7FF', stroke: '#7FE7FF' });
  }
  chip(ctx, 'TRUE SIZES (EQUAL-AREA)', W / 2, 120, win(t, 105.8, 109.8), { size: 30, fill: '#7FE7FF', stroke: '#7FE7FF' });
  for (const [key, t0] of [['CAN', 110.6], ['NOR', 111.4], ['SWE', 111.4], ['FIN', 111.4], ['ATA', 112.2], ['GRL', 113.0]]) hl(ctx, c, key, win(t, t0, 118.0));
  gold(ctx, 'MERCATOR', W / 2, 120, 76, win(t, 113.6, 118.0, .4));
  // P11: a navigation tool… that became the world's wall map
  sprite(ctx, 'compass_rose', 1700, 280, 200, { k: win(t, 118.6, 124.6) });
  chip(ctx, 'BUILT FOR SAILORS', W / 2, 120, win(t, 118.8, 124.6), { size: 34 });
  const kf = clamp((t - 124.8) / 1.0) * popOut(133.4 - t, 0.6);
  if (kf > 0) {   // the map becomes a framed classroom wall map
    ctx.save(); ctx.globalAlpha = kf; ctx.fillStyle = 'rgba(40,30,22,0.92)';
    const m = lerp(0, 70, easeOut(kf)); ctx.fillRect(0, 0, W, m); ctx.fillRect(0, H - m, W, m); ctx.fillRect(0, 0, m, H); ctx.fillRect(W - m, 0, m, H);
    ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 14; ctx.strokeRect(m, m, W - 2 * m, H - 2 * m); ctx.restore();
    chip(ctx, 'THE DEFAULT MAP', W / 2, 140, win(t, 126.0, 133.2), { size: 34 });
  }
}

function sceneStreets(ctx, c, t) {        // P12–P14 (133.6–168.8)
  if (t < 133.8 || t > 172) return;
  // phone frame around the map
  const kp = clamp((t - 135.0) / 1.0) * popOut(168.0 - t, 0.8);
  // street layer fades in as we zoom deep into the city
  const zs = c.type === 'M' ? c.a.z : 1, ks = clamp((Math.log(zs) - Math.log(3000)) / (Math.log(30000) - Math.log(3000)));
  if (ks > 0) {
    ctx.save(); ctx.globalAlpha = ks;
    ctx.fillStyle = '#E9E4D6'; ctx.fillRect(0, 0, W, H);
    const block = 0.00125 * zs, street = block * 0.22, ox = W / 2, oy = H / 2;
    ctx.fillStyle = '#FFFFFF'; const n = Math.ceil(W / block) + 2;
    for (let i = -n; i <= n; i++) { ctx.fillRect(ox + i * block - street / 2, 0, street, H); ctx.fillRect(0, oy + i * block - street / 2, W, street); }
    ctx.fillStyle = '#C9C1AA';
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const x = ox + i * block + street / 2, y = oy + j * block + street / 2; if (x > W || y > H || x + block < 0 || y + block < 0) continue;
      ctx.beginPath(); ctx.roundRect(x + 4, y + 4, block - street - 8, block - street - 8, Math.min(18, block * 0.08)); ctx.fill(); }
    // roundabout at the central intersection
    const rr = street * 1.4; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ox, oy, rr + street * 0.55, 0, 7); ctx.fill();
    ctx.fillStyle = '#8CC084'; ctx.strokeStyle = '#5E8C4A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ox, oy, rr * 0.55, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
    // 90° corners
    const k9 = win(t, 152.4, 160.0);
    if (k9 > 0) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = ox + dx * block, y = oy + dy * block, s = street * 0.5 + 6;
      ctx.save(); ctx.globalAlpha = clamp(k9); ctx.strokeStyle = C.gold; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x + s, y + s + 34); ctx.lineTo(x + s, y + s); ctx.lineTo(x + s + 34, y + s); ctx.stroke(); ctx.restore();
      styledText(ctx, '90°', x + s + 52, y + s + 48, 30, { k: k9, fill: C.gold, stroke: C.goldDark });
    }
    const kr = win(t, 155.0, 160.0);
    if (kr > 0) { ctx.save(); ctx.globalAlpha = clamp(kr); ctx.strokeStyle = '#2E9B4F'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(ox, oy, rr + street * 0.75, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#FF4D57'; ctx.setLineDash([14, 10]); ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(ox, oy, (rr + street * 0.75) * 1.8, rr + street * 0.75, 0, 0, 7); ctx.stroke(); ctx.restore();
      chip(ctx, '✓ STAYS ROUND', ox, oy - rr - street - 70, kr, { size: 26, stroke: '#2E9B4F', fill: '#8CE99A' });
      chip(ctx, '✗ NO STRETCHED OVALS', ox + (rr + street) * 2.3, oy + rr + 30, win(t, 156.2, 160.0), { size: 22, stroke: '#FF4D57', fill: '#FF8A92' }); }
    // P14: car takes a clean 90° turn
    if (t > 160.2 && t < 167.4) {
      const u = clamp((t - 160.4) / 5.0), lane = street * 0.25, sx = ox + block - lane, turnY = oy - block + lane;
      const L1 = H + 100 - turnY, L2 = block * 0.9, s = u * (L1 + L2);
      let x, y, ang;
      if (s < L1) { x = sx; y = H + 100 - s; ang = 0; } else { const q = s - L1, a = clamp(q / 160) * 90; x = sx - q; y = turnY; ang = -a; }
      sprite(ctx, 'car_top', x, Math.max(turnY, y), Math.max(40, street * 0.75), { rot: ang, k: popOut(167.2 - t) });
      styledText(ctx, '90° TURN', W / 2, turnY - 110, 46, { k: win(t, 163.4, 167.2), fill: C.gold, stroke: C.goldDark });
    }
  }
  if (kp > 0) {
    const im = IMG.phone_frame; if (im) { const h = 1000, w = h * im.width / im.height;
      ctx.save(); ctx.globalAlpha = 0.6 * kp; ctx.fillStyle = '#071C2A';
      ctx.fillRect(0, 0, W / 2 - w / 2 + 10, H); ctx.fillRect(W / 2 + w / 2 - 10, 0, W, H); ctx.restore();
      ctx.save(); ctx.globalAlpha = kp; ctx.drawImage(im, W / 2 - w / 2, H / 2 - h / 2, w, h); ctx.restore(); }
    // live location dot (not a pin)
    if (ks < 0.5) { ctx.save(); const r = ((t * 0.8) % 1); ctx.globalAlpha = kp * (1 - ks * 2); ctx.fillStyle = `rgba(66,133,244,${0.4 * (1 - r)})`; ctx.beginPath(); ctx.arc(...c.proj(...BCN), 10 + r * 30, 0, 7); ctx.fill();
      ctx.fillStyle = '#4285F4'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(...c.proj(...BCN), 11, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
    chip(ctx, 'WEB MERCATOR', W / 2 + 520, 220, win(t, 142.0, 150.0), { size: 30 });
  }
}

function sceneEnding(ctx, c, t) {         // P15–P16 (168.8–195)
  if (t < 172.2) return;
  for (const [key, t0] of [['CAN', 172.6], ['RUS', 172.6], ['GRL', 172.6]]) hl(ctx, c, key, win(t, t0, 179.6));
  for (const [key, t0] of [['IND', 173.4], ['BRA', 173.4], ['IDN', 173.4], ['KEN', 173.4]]) hl(ctx, c, key, win(t, t0, 179.6), '#7FE7FF');
  chip(ctx, 'LOOKS: HUGE', W / 2 - 300, 130, win(t, 172.8, 179.6), { size: 30 });
  chip(ctx, 'LOOKS: SMALL', W / 2 + 300, 130, win(t, 173.6, 179.6), { size: 30, fill: '#7FE7FF', stroke: '#7FE7FF' });
  // the drag: Greenland pulled down toward the equator, snapping to true size
  if (t > 183.0 && t < 191.0) {
    const u = easeIO((t - 183.6) / 2.6), k = popOut(190.8 - t, 0.5), to = [20, 2];
    hl(ctx, c, 'GRL', win(t, 183.0, 190.8) * 0.35, '#FFFFFF');
    const rs = moveRings(RINGS.GRL, GEO.centroids.GRL, to, u); hl(ctx, c, null, k, '#FF9F43', rs);
    const mv = moveRings([[GEO.centroids.GRL]], GEO.centroids.GRL, to, u)[0][0];
    const hp = c.proj(...mv); sprite(ctx, 'hand_cursor', hp[0] + 40, hp[1] + 60, 110, { k: k * pop(t - 183.2) });
    if (u >= 1) { flash(ctx, (t - 186.2) / 0.5, '#FFE8A3'); chip(ctx, 'REAL SIZE', hp[0], hp[1] - 120, win(t, 186.3, 190.8), { size: 30, fill: '#FFB36B', stroke: '#FF9F43' }); }
  }
}

const CAPTIONS = [
  [0.3, 3.4, 'Look at Greenland'], [3.5, 6.4, 'On almost every map…'], [6.5, 10.6, 'It looks as big as Africa'],
  [10.9, 14.0, 'Africa: 14× bigger'], [14.1, 18.2, 'Greenland fits in Algeria'],
  [18.5, 22.4, 'Alaska vs. Mexico'], [22.5, 26.8, 'Russia looks enormous'], [26.9, 31.2, 'The tropics look tiny'],
  [31.5, 37.6, 'So why are maps so wrong?'],
  [38.0, 42.6, 'Back to the 1500s'], [42.7, 47.4, 'Ships crossing oceans'], [47.5, 52.4, 'A sphere vs. flat paper'],
  [52.7, 57.8, 'Peel a globe flat…'], [57.9, 62.4, 'Something has to break'], [62.5, 68.4, 'Miss the island, run out of water'],
  [68.7, 73.4, 'Gerardus Mercator, 1569'], [73.5, 78.4, 'Every line meets at 90°'],
  [78.7, 83.4, 'Draw a straight line…'], [83.5, 88.0, 'Follow one bearing'],
  [88.3, 92.8, 'One catch'], [92.9, 97.4, 'Stretch it sideways…'], [97.5, 102.8, '…then stretch it up'],
  [103.2, 109.8, 'Equator: almost unchanged'], [109.9, 118.2, 'Near the poles: giants'],
  [118.5, 124.6, 'Built for sailors'], [124.7, 133.4, 'Became the default map'],
  [133.8, 140.2, 'Nobody sails by paper now…'], [140.3, 147.2, 'So why do phones use it?'],
  [147.5, 152.2, 'Zoom into your street'], [152.3, 156.4, 'Blocks stay square'], [156.5, 160.0, 'Roundabouts stay round'],
  [160.2, 164.4, 'A 90° turn matters more'], [164.5, 168.6, 'than Greenland vs. Africa'],
  [169.0, 174.6, 'The side effect…'], [174.7, 180.0, 'A distorted mental map'],
  [180.4, 185.4, 'Drag a country to the equator'], [185.5, 191.0, 'Reality snaps back'],
];
function drawText(ctx, t) {
  for (const [t0, t1, txt] of CAPTIONS) { const k = win(t, t0, t1, .26, .18); if (k > 0) styledText(ctx, txt, W / 2, CAPTION.y, CAPTION.size, { k, shadow: CAPTION.shadow, maxW: 1500 }); }
}
function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function gratAlpha(t) {
  if (t < 38) return 0.18;
  if (t < 104) return 0.45;
  if (t < 118) return 0.3;
  return 0.18;
}
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = camAt(t);
  drawBase(ctx, c, t);
  drawGraticule(ctx, c, gratAlpha(t) * (c.type === 'M' && c.a.z > 200 ? 0 : 1));
  drawLand(ctx, c);
  globeRim(ctx, c);
  vignette(ctx);
  sceneCompare(ctx, c, t); sceneNavigation(ctx, c, t); sceneStretch(ctx, c, t); sceneStreets(ctx, c, t); sceneEnding(ctx, c, t);
  drawText(ctx, t);
  ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = ctx.createPattern(NOISE_FINE, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
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
