/* EcomRolodex contest entry — 9:16, 1080×1920, ~15 s. Deterministic canvas compositor.
 * The phone screen shows REAL frames captured from the live blaqcards.com mobile site (dist/frames/…), never redrawn.
 * prepare(t) loads the screen frame needed at storyboard time t; renderAt(t) draws it.
 */
'use strict';
const W = 1080, H = 1920, DURATION = 15;
const C = {
  bg: '#07090F', teal: '#11CBAC', teal2: '#29C4A9', blue: '#2EA3F2', blue2: '#3E50FF', indigo: '#5963C1',
  ink: '#444654', white: '#FFFFFF', soft: '#F5FBFE',
};
const FONT = '"Poppins", Helvetica, Arial, sans-serif';

// ------------------------------------------------------------------ easing
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeOut5 = t => 1 - Math.pow(1 - clamp(t), 5);
const back = (t, s = 1.4) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
const pop = (dt, d = 0.28) => dt <= 0 ? 0 : back(dt / d);
const fade = (t, t0, t1, d = 0.18) => clamp((t - t0) / d) * clamp((t1 - t) / d);

// ------------------------------------------------------------------ screen clips (real captures, 30 fps)
// [start, clip, firstFrame, lastFrame, rate]  — the screen shows clip frames from `start` on.
const CLIPS = [
  [1.70, 'home', 0, 69, 1],
  [4.55, 'product', 8, 69, 1],
  [6.85, 'cart', 0, 34, 1],
];
const TAP = { x: 255, y: 809 };          // the store's sticky "Add to cart" button (css px of a 390×844 screen)
const T_TAP = 6.85, T_CART = 7.05, T_CTA = 9.6;
function screenFrame(t) {
  let c = CLIPS[0];
  for (const k of CLIPS) if (t >= k[0]) c = k;
  const [t0, clip, a, b] = c;
  let f;
  if (clip === 'cart') {                   // hold, then the real slide-in (frames 6..33), then the settled drawer (34)
    if (t < T_CART) f = 0; else f = Math.min(33, 6 + Math.floor((t - T_CART) * 30)); if (t > T_CART + 1.2) f = 34;
  } else f = Math.min(b, a + Math.floor((t - t0) * 30));
  return `frames/${clip}/${String(f).padStart(3, '0')}.jpg`;
}
const CACHE = new Map();
function loadImg(src) {
  if (CACHE.has(src)) return CACHE.get(src);
  const p = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  p.then(im => { p.img = im; }); CACHE.set(src, p);
  if (CACHE.size > 40) CACHE.delete(CACHE.keys().next().value);
  return p;
}
async function prepare(t) { await loadImg(screenFrame(t)); }

// ------------------------------------------------------------------ assets
const IMG = {};
function loadAssets() {
  const jobs = Object.entries(window.ASSETS || {}).map(([k, src]) => new Promise(res => { const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = res; im.src = src; }));
  const fonts = ['600 40px "Poppins"', '700 40px "Poppins"', '800 40px "Poppins"'].map(f => document.fonts.load(f));
  return Promise.all([...jobs, ...fonts]).then(() => document.fonts.ready);
}

// ------------------------------------------------------------------ text
function setFont(ctx, size, wt = 700) { ctx.font = `${wt} ${size}px ${FONT}`; }
function gradFill(ctx, x0, x1) { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, C.teal); g.addColorStop(1, C.blue); return g; }
// rich line: segments [[text, highlight?], ...]
function richLine(ctx, segs, x, y, size, o = {}) {
  setFont(ctx, size, o.wt || 800); ctx.textBaseline = 'middle';
  const widths = segs.map(s => ctx.measureText(s[0]).width), total = widths.reduce((a, b) => a + b, 0);
  let cx = x - total / 2;
  segs.forEach(([s, hi], i) => {
    if (hi) { ctx.fillStyle = gradFill(ctx, cx, cx + widths[i]); } else ctx.fillStyle = o.color || C.white;
    ctx.textAlign = 'left'; ctx.fillText(s, cx, y); cx += widths[i];
  });
}
function chip(ctx, label, x, y, k, o = {}) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, o.size || 38, 700);
  const w = ctx.measureText(label).width + 64, h = (o.size || 38) * 1.9;
  ctx.shadowColor = 'rgba(17,203,172,0.45)'; ctx.shadowBlur = 30;
  ctx.fillStyle = gradFill(ctx, -w / 2, w / 2); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 3);
  ctx.restore();
}

// ------------------------------------------------------------------ backgrounds
function darkStudio(ctx, t) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const glow = (x, y, r, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  glow(200 + Math.sin(t * 0.5) * 40, 380, 760, 'rgba(17,203,172,A)', 0.18);
  glow(900 + Math.cos(t * 0.4) * 40, 1350, 820, 'rgba(89,99,193,A)', 0.22);
  // desk: soft floor with a spotlight
  const fy = 1500, g = ctx.createLinearGradient(0, fy, 0, H); g.addColorStop(0, '#11141D'); g.addColorStop(1, '#05060A');
  ctx.fillStyle = g; ctx.fillRect(0, fy, W, H - fy);
  const s = ctx.createRadialGradient(W / 2, fy + 60, 10, W / 2, fy + 60, 520); s.addColorStop(0, 'rgba(255,255,255,0.10)'); s.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = s; ctx.fillRect(0, fy, W, H - fy);
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, fy, W, 2);
}

// ------------------------------------------------------------------ phone (vector device; screen = real capture)
const PH = { w: 640, r: 82 }; PH.sh = PH.w * 844 / 390;
function phone(ctx, cx, cy, scale, rot, t, o = {}) {
  const sw = PH.w, sh = PH.sh, bz = 22, bw = sw + bz * 2, bh = sh + bz * 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale);
  // shadow + body
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 40;
  const body = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); body.addColorStop(0, '#2A2D36'); body.addColorStop(0.5, '#5B5F6B'); body.addColorStop(1, '#22252D');
  ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(-bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8, PH.r + bz + 4); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#0A0B0F'; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, PH.r + bz); ctx.fill();
  // side buttons
  ctx.fillStyle = '#3A3E48'; ctx.fillRect(bw / 2 + 2, -bh * 0.22, 7, 150); ctx.fillRect(-bw / 2 - 9, -bh * 0.28, 7, 70); ctx.fillRect(-bw / 2 - 9, -bh * 0.18, 7, 110);
  // screen
  ctx.save(); ctx.beginPath(); ctx.roundRect(-sw / 2, -sh / 2, sw, sh, PH.r); ctx.clip();
  const p = CACHE.get(o.src || screenFrame(t)); const im = p && p.img;
  if (im) ctx.drawImage(im, -sw / 2, -sh / 2, sw, sh); else { ctx.fillStyle = '#000'; ctx.fillRect(-sw / 2, -sh / 2, sw, sh); }
  if (o.tap) tapMark(ctx, -sw / 2 + TAP.x * sw / 390, -sh / 2 + TAP.y * sh / 844, o.tap);
  // glass sheen
  const gl = ctx.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2); gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(0.35, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = gl; ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.restore();
  // dynamic island
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(-70, -sh / 2 + 22, 140, 40, 20); ctx.fill();
  ctx.restore();
}
function tapMark(ctx, x, y, k) {          // a finger-tap indicator: soft dot + expanding ring
  ctx.save();
  ctx.globalAlpha = clamp(k < 0.5 ? k * 3 : (1 - k) * 2); ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(x, y, 34 * (k < 0.3 ? 1 - k : 0.8), 0, 7); ctx.fill();
  ctx.globalAlpha = clamp(1 - k); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 30 + 90 * easeOut(k), 0, 7); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ scene: hook (0–1.7) — identical template stores
function templateCard(ctx, x, y, w, h, shade) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = shade; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 22); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  const bar = (bx, by, bw, bh, r = 6) => { ctx.beginPath(); ctx.roundRect(-w / 2 + bx * w, -h / 2 + by * h, bw * w, bh * h, r); ctx.fill(); };
  bar(0.08, 0.05, 0.84, 0.05); bar(0.08, 0.14, 0.84, 0.32, 12); bar(0.08, 0.51, 0.6, 0.04); bar(0.08, 0.58, 0.4, 0.04);
  bar(0.08, 0.68, 0.39, 0.22, 10); bar(0.53, 0.68, 0.39, 0.22, 10);
  ctx.restore();
}
function sceneHook(ctx, t) {
  if (t > 2.0) return;
  darkStudio(ctx, t);
  const cw = 270, ch = 470, gap = 36, z = 1 + 0.04 * t;
  const out = easeIO((t - 1.45) / 0.3);                     // grid zooms into the centre card → phone
  ctx.save(); ctx.translate(W / 2, 1060); ctx.scale(z * lerp(1, 2.4, out), z * lerp(1, 2.4, out)); ctx.translate(-W / 2, -1060);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const i = r * 3 + c, k = pop(t - 0.05 - i * 0.035, 0.3);
    if (k <= 0) continue;
    const x = W / 2 + (c - 1) * (cw + gap), y = 1060 + (r - 1) * (ch * 0.62 + gap);
    ctx.save(); ctx.globalAlpha = (i === 4 ? 1 : 1 - out);
    ctx.translate(x, y); ctx.scale(k, k); templateCard(ctx, 0, 0, cw, ch * 0.62, '#1A1E29'); ctx.restore();
  }
  ctx.restore();
  // headline
  const k1 = pop(t - 0.05, 0.3), k2 = pop(t - 0.5, 0.3), ko = 1 - easeIO((t - 1.45) / 0.25);
  ctx.save(); ctx.globalAlpha = ko;
  if (k1 > 0) { ctx.save(); ctx.translate(W / 2, 300); ctx.scale(k1, k1); richLine(ctx, [['Most Shopify stores']], 0, 0, 76); ctx.restore(); }
  if (k2 > 0) { ctx.save(); ctx.translate(W / 2, 400); ctx.scale(k2, k2); richLine(ctx, [['look ', 0], ['exactly the same.', 1]], 0, 0, 76); ctx.restore(); }
  ctx.restore();
  // "same" stamps: copy labels flicker on the cards
  if (t > 0.9 && t < 1.45) { setFont(ctx, 30, 700); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'center';
    for (let i = 0; i < 9; i++) { if (i === 4) continue; const r = Math.floor(i / 3), c = i % 3; ctx.fillText('SAME', W / 2 + (c - 1) * (cw + gap), 1060 + (r - 1) * (ch * 0.62 + gap) + 110); } }
}

// ------------------------------------------------------------------ scene: the real store on a phone (1.7–9.6)
function scenePhone(ctx, t) {
  if (t < 1.45 || t > T_CTA + 0.8) return;
  if (t >= 2.0) darkStudio(ctx, t);
  const kin = easeOut5((t - 1.55) / 0.5);
  // camera: push-in with a slow tilt; punch-ins on cuts
  const punch = (tc) => 0.035 * Math.max(0, 1 - Math.abs(t - tc) * 5);
  let scale = lerp(2.1, 0.98, kin) + 0.06 * easeIO((t - 2.0) / 7.5) + punch(4.55) + punch(T_TAP);
  let rot = lerp(0.12, -0.035, kin) + 0.03 * Math.sin((t - 2) * 0.5);
  let cy = 960;
  // CTA: phone drops away
  const outK = easeIO((t - T_CTA) / 0.6);
  scale *= lerp(1, 0.55, outK); cy = lerp(cy, 2300, outK); rot = lerp(rot, 0.25, outK);
  // reflection on the desk
  const tapK = clamp((t - T_TAP) / 0.55);
  phone(ctx, W / 2, cy, scale, rot, t, { tap: tapK > 0 && tapK < 1 ? tapK : 0 });
  if (t < 1.75) { ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - clamp((t - 1.55) / 0.2))})`; ctx.fillRect(0, 0, W, H); }   // flash on the cut
  // feature chips (beat-locked)
  chip(ctx, 'Custom homepage', 320, 250, pop(t - 2.25) * (1 - clamp((t - 4.4) / 0.15)));
  chip(ctx, 'Built for mobile', 760, 1300, pop(t - 3.25) * (1 - clamp((t - 4.4) / 0.15)));
  chip(ctx, 'Product pages that sell', W / 2, 230, pop(t - 4.75) * (1 - clamp((t - 6.75) / 0.15)));
  chip(ctx, 'Smooth cart experience', W / 2, 230, pop(t - 7.25) * (1 - clamp((t - T_CTA - 0.1) / 0.15)));
}

// ------------------------------------------------------------------ scene: CTA (9.6–15)
function sceneCTA(ctx, t) {
  if (t < T_CTA) return;
  const k = easeIO((t - T_CTA) / 0.55);
  // white brand card wipes up from the bottom
  ctx.save(); const top = lerp(H, 0, k); ctx.beginPath(); ctx.rect(0, top, W, H - top); ctx.clip();
  ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 1500, 0, W / 2, 1500, 900); g.addColorStop(0, 'rgba(17,203,172,0.20)'); g.addColorStop(0.5, 'rgba(46,163,242,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lg = IMG.ecomrolodex_logo;
  if (lg) { const kl = pop(t - T_CTA - 0.35, 0.35); if (kl > 0) { ctx.save(); ctx.translate(W / 2, 470); ctx.scale(kl, kl); const lw = 860, lh = lw * lg.height / lg.width; ctx.drawImage(lg, -lw / 2, -lh / 2, lw, lh); ctx.restore(); } }
  const k1 = pop(t - T_CTA - 0.75, 0.3);
  if (k1 > 0) { ctx.save(); ctx.translate(W / 2, 760); ctx.scale(k1, k1); richLine(ctx, [['Want yours']], 0, -46, 68, { color: '#14161F' }); richLine(ctx, [['redesigned?', 1]], 0, 46, 68, { color: '#14161F' }); ctx.restore(); }
  const k2 = pop(t - T_CTA - 1.35, 0.32);
  if (k2 > 0) {
    ctx.save(); ctx.translate(W / 2, 1060); ctx.scale(k2, k2);
    setFont(ctx, 58, 700); ctx.fillStyle = '#14161F'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Comment', 0, -78);
    setFont(ctx, 104, 800); const w = ctx.measureText('REDESIGN').width + 90;
    ctx.shadowColor = 'rgba(46,163,242,0.45)'; ctx.shadowBlur = 40; ctx.fillStyle = gradFill(ctx, -w / 2, w / 2);
    ctx.beginPath(); ctx.roundRect(-w / 2, 20, w, 150, 32); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = C.white; ctx.fillText('REDESIGN', 0, 100);
    ctx.restore();
  }
  const k3 = pop(t - T_CTA - 2.0, 0.3);
  if (k3 > 0) { ctx.save(); ctx.translate(W / 2, 1380); ctx.scale(k3, k3); setFont(ctx, 54, 600); ctx.fillStyle = C.indigo; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ecomrolodex.com', 0, 0);
    ctx.fillStyle = gradFill(ctx, -230, 230); ctx.fillRect(-230, 44, 460, 5); ctx.restore(); }
  ctx.restore();
}

// ------------------------------------------------------------------ captions (voiceover, works muted)
const CAPS = [
  [0.05, 1.45, null],                                             // the hook headline already carries the words
  [1.75, 2.9, [['Yours ', 0], ["shouldn't.", 1]]],
  [2.95, 4.5, [['A custom homepage, ', 0], ['built for mobile.', 1]]],
  [4.6, 6.75, [['Product pages ', 0], ['that sell.', 1]]],
  [6.85, 9.5, [['A cart that feels ', 0], ['smooth', 1]], [['from the ', 0], ['first tap.', 0]]],
  [9.7, 11.9, [['Want yours ', 0], ['redesigned?', 1]]],
];
function drawCaptions(ctx, t) {
  for (const [t0, t1, l1, l2] of CAPS) {
    if (!l1) continue; const a = fade(t, t0, t1, 0.12); if (a <= 0) continue;
    const onWhite = t >= T_CTA + 0.4;
    if (onWhite) continue;                                       // the end card has its own big type
    ctx.save(); ctx.globalAlpha = a;
    const y = 1720, k = pop(t - t0, 0.22); ctx.translate(W / 2, y); ctx.scale(k, k);
    setFont(ctx, 54, 800);
    const txt = l => l.map(s => s[0]).join(''), w = Math.max(ctx.measureText(txt(l1)).width, l2 ? ctx.measureText(txt(l2)).width : 0) + 70;
    const hh = l2 ? 170 : 104;
    ctx.fillStyle = 'rgba(7,9,15,0.78)'; ctx.beginPath(); ctx.roundRect(-w / 2, -hh / 2, w, hh, 28); ctx.fill();
    if (l2) { richLine(ctx, l1, 0, -36, 54); richLine(ctx, l2, 0, 36, 54); } else richLine(ctx, l1, 0, 2, 54);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ compositor
function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  sceneHook(ctx, t);
  scenePhone(ctx, t);
  sceneCTA(ctx, t);
  drawCaptions(ctx, t);
  const fo = clamp((t - 14.75) / 0.25);
  if (fo > 0) { ctx.fillStyle = `rgba(255,255,255,${fo})`; ctx.fillRect(0, 0, W, H); }
}

window.renderAt = renderAt; window.prepare = prepare; window.READY = false;
loadAssets().then(async () => {
  window.READY = true;
  if (new URLSearchParams(location.search).has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play');
  ctl.style.display = 'flex';
  let playing = false, t = 0, last = 0;
  const draw = async () => { await prepare(t); renderAt(t); bar.value = t; };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.max = DURATION; bar.oninput = () => { t = +bar.value; draw(); };
  const tick = async now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; last = now; await draw(); } requestAnimationFrame(tick); };
  draw(); requestAnimationFrame(tick);
});
