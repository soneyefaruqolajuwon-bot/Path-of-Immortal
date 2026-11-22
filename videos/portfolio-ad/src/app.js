/* Portfolio ad — twilight rim-lit stickman style, 1920×1080, 30 s. HTML5 Canvas, deterministic.
 * renderAt(t) draws storyboard time t (seconds). window.ASSETS {name: dataURI}. Optional window.SYNC {dur, keys:[[real, story]...]}
 * and window.AUDIO (data URI) let the player run on the voiced timeline with sound.
 */
'use strict';
const W = 1920, H = 1080, DURATION = 30, GROUND = 905;
const VERT = !!window.VERTICAL;          // 9:16 TikTok/Reels cut: scene in a tall band, camera follows the action, text re-laid out
const OVER = { badges: [] };
const C = {
  ink: '#0B0D12', rim: '#F5B041', rim2: '#E59866', coral: '#D9534F', orange: '#D98850', violet: '#4A3B5C', navy: '#181C2E',
  gold: '#F4D03F', white: '#FFFFFF', window: '#F7C46C', teal: '#1E4D5C', olive: '#8A855C', yellow: '#FFD43B',
};

// ------------------------------------------------------------------ math / easing
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = t => Math.pow(clamp(t), 3);
const back = (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
const pop = (dt, d = 0.32) => dt <= 0 ? 0 : back(dt / d);
const popOut = (left, d = 0.22) => left >= d ? 1 : easeOut(Math.max(0, left) / d);
const win = (t, t0, t1, fin = .32, fout = .22) => (t < t0 || t > t1) ? 0 : pop(t - t0, fin) * popOut(t1 - t, fout);
const fade = (t, t0, t1, d = 0.3) => clamp((t - t0) / d) * clamp((t1 - t) / d);
function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const quad = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]];

// ------------------------------------------------------------------ assets
const IMG = {}; let SKYLINE, CROWD, GRAIN;
function loadAssets() {
  const jobs = Object.entries(window.ASSETS).map(([k, src]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => { console.warn('asset', k); res(); }; im.src = src;
  }));
  const fonts = ['800 64px "Montserrat"'].map(f => document.fonts.load(f));
  return Promise.all([...jobs, ...fonts]).then(() => document.fonts.ready).then(() => { SKYLINE = makeSkyline(); CROWD = makeCrowd(); GRAIN = makeGrain(); });
}
function offscreen(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function makeSkyline() {          // far city: violet silhouettes with dim warm windows
  const cv = offscreen(2600, 520), g = cv.getContext('2d'), r = rnd(11);
  let x = 0;
  while (x < 2600) {
    const w = 70 + r() * 120, h = 140 + r() * 330;
    g.fillStyle = '#2E2740'; g.fillRect(x, 520 - h, w, h);
    if (r() < 0.3) { g.fillRect(x + w / 2 - 3, 520 - h - 40, 6, 40); }
    for (let wy = 520 - h + 18; wy < 500; wy += 26) for (let wx = x + 10; wx < x + w - 14; wx += 22)
      if (r() < 0.22) { g.fillStyle = r() < 0.5 ? 'rgba(247,196,108,0.55)' : 'rgba(247,196,108,0.25)'; g.fillRect(wx, wy, 9, 13); }
    x += w + 6 + r() * 20;
  }
  return cv;
}
function makeCrowd() {            // stadium crowd rows: heads + shoulders with a warm rim on the upper right
  const cv = offscreen(2000, 260), g = cv.getContext('2d'), r = rnd(5);
  for (let row = 0; row < 4; row++) {
    const y = 60 + row * 52, s = 0.8 + row * 0.15;
    for (let x = -20; x < 2020; x += 34 * s + r() * 10) {
      const hy = y - r() * 8;
      g.fillStyle = C.rim; g.beginPath(); g.arc(x + 2.5, hy - 2, 13 * s, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x + 2.5, hy + 30 * s - 2, 24 * s, 20 * s, 0, Math.PI, 0); g.fill();
      g.fillStyle = row % 2 ? '#0F1118' : C.ink; g.beginPath(); g.arc(x, hy, 13 * s, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x, hy + 30 * s, 24 * s, 20 * s, 0, Math.PI, 0); g.fill(); g.fillRect(x - 24 * s, hy + 30 * s, 48 * s, 60);
    }
  }
  return cv;
}
function makeGrain() {
  const n = 256, cv = offscreen(n, n), g = cv.getContext('2d'), r = rnd(3), d = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = r() * 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 10; }
  g.putImageData(d, 0, 0); return cv;
}

// ------------------------------------------------------------------ drawing helpers
function sprite(ctx, name, x, y, w, o = {}) {
  const im = IMG[name]; if (!im) return;
  const k = o.k === undefined ? 1 : o.k; if (k <= 0.001) return;
  const h = w * im.height / im.width;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot * Math.PI / 180);
  ctx.scale(k * (o.flip ? -1 : 1), k);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.filter) ctx.filter = o.filter;
  ctx.drawImage(im, -w * (o.ax ?? 0.5), -h * (o.ay ?? 0.5), w, h); ctx.restore();
}
// characters: 240×440 sprites, feet at y≈409 → ay 0.93
const CH_W = 290;
function actor(ctx, who, pose, x, y, o = {}) { sprite(ctx, `${who}_${pose}`, x, y, o.w || CH_W, { ay: 0.93, ...o }); }
function handOf(pose, w = CH_W) {   // front-hand offset from the feet anchor (matches make_assets.py geometry)
  const H = { catch: [165, 58], cheer: [165, 66], point: [227, 166], stand: [131, 260] }[pose] || [165, 58];
  return [(H[0] - 120) * w / 240, (H[1] - 409) * w / 240];
}
function setFont(ctx, size) { ctx.font = `800 ${size}px "Montserrat", "Inter", sans-serif`; }
function text(ctx, s, x, y, size, o = {}) {
  const k = o.k === undefined ? 1 : o.k; if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (o.rot) ctx.rotate(o.rot * Math.PI / 180);
  setFont(ctx, size); ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (o.spacing) ctx.letterSpacing = o.spacing + 'px';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(s, 0, size * 0.06); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || size * 0.1; ctx.strokeText(s, 0, 0); }
  if (o.grad) { const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, o.grad[0]); g.addColorStop(1, o.grad[1]); ctx.fillStyle = g; }
  else ctx.fillStyle = o.fill || C.white;
  ctx.fillText(s, 0, 0); ctx.restore();
}
function badge(ctx, label, x, y, k, native) {
  if (k <= 0.001) return;
  if (VERT && !native) { OVER.badges.push([label, k]); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); setFont(ctx, 34); ctx.letterSpacing = '3px';
  const w = ctx.measureText(label).width + 110, h = 78;
  ctx.fillStyle = 'rgba(11,13,18,0.86)'; ctx.strokeStyle = C.rim; ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(245,176,65,0.45)'; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.arc(-w / 2 + 42, 0, 10, 0, 7); ctx.fill();
  ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 22, 2); ctx.restore();
}
function ripple(ctx, x, y, t, t0, o = {}) {        // thin expanding white/gold target rings
  const n = o.n || 3, R = o.r || 280, d = o.d || 0.9;
  for (let i = 0; i < n; i++) {
    const u = (t - t0 - i * 0.12) / d; if (u <= 0 || u >= 1) continue;
    ctx.save(); ctx.globalAlpha = (1 - u) * 0.9; ctx.strokeStyle = i % 2 ? C.rim : C.white; ctx.lineWidth = (o.w || 4) * (1 - u * 0.6);
    ctx.beginPath(); ctx.ellipse(x, y, R * easeOut(u), R * easeOut(u) * (o.squash || 1), 0, 0, 7); ctx.stroke(); ctx.restore();
  }
}
function dotted(ctx, pts, k, o = {}) {              // clean white dotted trajectory
  if (k <= 0) return;
  const n = Math.floor((pts.length - 1) * clamp(k));
  ctx.save(); ctx.fillStyle = o.color || C.white;
  for (let i = 0; i <= n; i += (o.step || 2)) { ctx.globalAlpha = (o.alpha ?? 0.9) * (o.tailFade ? 0.25 + 0.75 * i / Math.max(1, n) : 1); ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], o.r || 4, 0, 7); ctx.fill(); }
  ctx.restore();
}
function callout(ctx, x0, y0, x1, y1, label, k, o = {}) {   // leader line + crisp label
  if (k <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= clamp(k); ctx.strokeStyle = C.white; ctx.lineWidth = 2.5;
  const e = easeOut(k);
  ctx.beginPath(); ctx.arc(x0, y0, 7, 0, 7); ctx.fillStyle = C.white; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, e), lerp(y0, y1, e)); ctx.stroke();
  if (e > 0.6) { const dir = x1 >= x0 ? 1 : -1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + dir * 26, y1); ctx.stroke();
    setFont(ctx, o.size || 34); ctx.textAlign = dir > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle';
    ctx.globalAlpha *= clamp((e - 0.6) / 0.4); ctx.fillStyle = o.color || C.white; ctx.fillText(label, x1 + dir * 38, y1); }
  ctx.restore();
}
function orb(ctx, x, y, r, label, k = 1) {
  if (k <= 0) return;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.2); g.addColorStop(0, 'rgba(255,230,150,0.9)'); g.addColorStop(0.35, 'rgba(245,176,65,0.35)'); g.addColorStop(1, 'rgba(245,176,65,0)');
  ctx.globalAlpha = k; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.fill();
  const b = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); b.addColorStop(0, '#FFF6D6'); b.addColorStop(0.5, '#F7C948'); b.addColorStop(1, '#E08E2B');
  ctx.fillStyle = b; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  if (label) { setFont(ctx, Math.max(12, r * 0.36)); ctx.fillStyle = '#5A3608'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '1px';
    const parts = label.split(' '); parts.forEach((p, i) => ctx.fillText(p, x, y + (i - (parts.length - 1) / 2) * r * 0.42)); }
  ctx.restore();
}
function rays(ctx, x, y, t, a = 1, n = 9, len = 1500) {     // soft volumetric light shafts from the sun
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = Math.PI + (i + 0.5) / n * Math.PI + Math.sin(t * 0.3 + i) * 0.03, w = 0.05 + (i % 3) * 0.025;
    const g = ctx.createRadialGradient(x, y, 40, x, y, len); g.addColorStop(0, `rgba(255,214,140,${0.11 * a})`); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, len, ang - w, ang + w); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function sky(ctx, sunX = 1300, sunY = 760, dark = 0) {
  sprite(ctx, 'bg_sky', W / 2, H / 2, W, { ax: 0.5, ay: 0.5 });
  sprite(ctx, 'sun', sunX, sunY, 920);
  if (dark > 0) { ctx.fillStyle = `rgba(10,12,24,${dark})`; ctx.fillRect(0, 0, W, H); }
}
function ground(ctx, y = GROUND, col = '#12141C') {
  ctx.fillStyle = col; ctx.fillRect(0, y, W, H - y);
  const g = ctx.createLinearGradient(0, y, 0, y + 60); g.addColorStop(0, 'rgba(245,176,65,0.35)'); g.addColorStop(1, 'rgba(245,176,65,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y, W, 60);
  ctx.fillStyle = C.rim; ctx.fillRect(0, y - 2, W, 3);
}
function ghostTrail(ctx, draws, n, gap, alpha = 0.35) {   // afterimages: draws(back) for back = n..1
  for (let i = n; i >= 1; i--) { ctx.save(); ctx.globalAlpha = alpha * (1 - i / (n + 1)); draws(i * gap); ctx.restore(); }
}
function speedLines(ctx, x, y, k, seed = 1) {          // manga-style radial action lines
  if (k <= 0) return; const r = rnd(seed);
  ctx.save(); ctx.globalAlpha = k * 0.7; ctx.strokeStyle = C.white;
  for (let i = 0; i < 46; i++) { const a = r() * 6.283, r0 = 220 + r() * 160, r1 = r0 + 260 + r() * 500; ctx.lineWidth = 1 + r() * 3;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
  ctx.restore();
}
function blurLayer(ctx, px, fn) { ctx.save(); ctx.filter = `blur(${px}px)`; fn(); ctx.restore(); }

// ------------------------------------------------------------------ scene 1 (0–6.2): café street, the slow-motion catch
const ORB_A = [-90, 250], ORB_C = [560, 60], HOST_X = 1040, JUMP = 70;
const CATCH = (() => { const h = handOf('catch'); return [HOST_X + h[0], GROUND - JUMP + h[1]]; })();
const T_CATCH = 3.6;
function hostRunX(t) { return lerp(-160, HOST_X, easeOut((t - 1.9) / 1.5)); }
function sceneStreet(ctx, t, camX) {
  sky(ctx);
  rays(ctx, 1300, 760, t, 1);
  ctx.drawImage(SKYLINE, -300 - camX * 0.25, GROUND - 520 + 10);
  blurLayer(ctx, 1.2, () => { ctx.globalAlpha = 0.35; ctx.fillStyle = '#4A3B5C'; ctx.fillRect(0, GROUND - 200, W, 200); });
  sprite(ctx, 'bg_cafe', 520 - camX * 0.6, GROUND + 4, 760, { ax: 0.5, ay: 1 });
  // lamp post
  const lx = 1520 - camX * 0.6;
  ctx.fillStyle = C.rim; ctx.fillRect(lx + 3, 380, 14, GROUND - 380); ctx.fillStyle = C.ink; ctx.fillRect(lx, 382, 14, GROUND - 380);
  const lg = ctx.createRadialGradient(lx + 7, 380, 4, lx + 7, 380, 160); lg.addColorStop(0, 'rgba(255,220,150,0.9)'); lg.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx + 7, 380, 160, 0, 7); ctx.fill(); ctx.fillStyle = '#FFE7B0'; ctx.beginPath(); ctx.arc(lx + 7, 380, 16, 0, 7); ctx.fill();
  ground(ctx);
  // the idea orb in slow motion + dotted trajectory
  const u = clamp((t - 0.3) / (T_CATCH - 0.3)), uu = u * 0.85 + easeIO(u) * 0.15;
  const pts = []; for (let i = 0; i <= 80; i++) pts.push(quad(ORB_A, ORB_C, CATCH, i / 80 * uu));
  if (t < T_CATCH) dotted(ctx, pts, 1, { tailFade: true, step: 3, alpha: 0.75 });
  // host: dash in with afterimages, leap, catch
  if (t > 1.9) {
    const running = t < 3.35;
    const pose = running ? (Math.floor(t / 0.085) % 2 ? 'run_a' : 'run_b') : 'catch';
    const jumpK = running ? 0 : Math.sin(clamp((t - 3.35) / 0.9) * Math.PI);
    const x = running ? hostRunX(t) : HOST_X, y = GROUND - (running ? 0 : JUMP * (t < T_CATCH ? jumpK / Math.sin(clamp((T_CATCH - 3.35) / 0.9) * Math.PI) : jumpK));
    if (running) ghostTrail(ctx, d => actor(ctx, 'host', pose, hostRunX(t - d), GROUND), 5, 0.035, 0.5);
    actor(ctx, 'host', t > 4.6 ? 'cheer' : pose, x, Math.min(GROUND, y));
  }
  const held = t >= T_CATCH;
  if (!held) orb(ctx, ...quad(ORB_A, ORB_C, CATCH, uu), 46, 'YOUR IDEA');
  else {
    const hp = t > 4.6 ? handOf('cheer') : handOf('catch');
    const jumpK = Math.sin(clamp((t - 3.35) / 0.9) * Math.PI);
    const hy = t > 4.6 ? GROUND + hp[1] : GROUND - JUMP * jumpK + hp[1];
    orb(ctx, HOST_X + hp[0] + 4, hy - 30 + Math.sin(t * 3) * 4, 46 + 4 * Math.max(0, 1 - (t - T_CATCH) * 3), 'YOUR IDEA');
  }
  speedLines(ctx, ...CATCH, win(t, T_CATCH - 0.05, T_CATCH + 0.35, 0.05, 0.25), 4);
  ripple(ctx, ...CATCH, t, T_CATCH, { r: 320, n: 4 });
  callout(ctx, CATCH[0] + 60, CATCH[1] - 30, VERT ? 1290 : 1420, VERT ? 230 : 300, '0.025 s', fade(t, 3.8, 6.0) * clamp((t - 3.8) / 0.5), { size: 52, color: C.gold });
  // attention meter draining (most videos get scrolled past)
  const ka = win(t, 0.4, 3.2);
  if (ka > 0 && !VERT) {
    const left = clamp(1 - (t - 0.6) / 2.0);
    ctx.save(); ctx.translate(760, 70); ctx.scale(ka, ka);
    text(ctx, 'ATTENTION', 0, 0, 30, { align: 'left', spacing: 3, fill: C.white });
    ctx.fillStyle = 'rgba(11,13,18,0.7)'; ctx.beginPath(); ctx.roundRect(0, 28, 380, 22, 11); ctx.fill();
    ctx.fillStyle = left > 0.3 ? C.rim : C.coral; ctx.beginPath(); ctx.roundRect(0, 28, Math.max(22, 380 * left), 22, 11); ctx.fill();
    text(ctx, `${(left * 2).toFixed(1)} s`, 400, 40, 30, { align: 'left', fill: left > 0.3 ? C.white : C.coral });
    ctx.restore();
  }
  // soft-blurred foreground silhouettes (parallax faster than the world)
  blurLayer(ctx, 9, () => {
    ctx.fillStyle = '#07080C';
    const fx = -camX * 1.5;
    ctx.beginPath(); ctx.ellipse(120 + fx, H + 40, 260, 220, 0, 0, 7); ctx.fill();
    ctx.fillRect(1820 + fx * 0.6, 0, 70, H);
    ctx.beginPath(); ctx.ellipse(1760 + fx, H + 60, 220, 160, 0, 0, 7); ctx.fill();
  });
}

// ------------------------------------------------------------------ scene 2 (6.2–13): brand & product ads
const PHONE = { x: 980, y: 480, w: 370, h: 720 };
function phoneUI(ctx, x, y, w, h, t, t0) {
  ctx.save(); ctx.translate(x - w / 2, y - h / 2);
  // body + rim
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.roundRect(6, -5, w, h, 46); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 46); ctx.fill();
  ctx.fillStyle = '#F6F2EC'; ctx.beginPath(); ctx.roundRect(14, 14, w - 28, h - 28, 34); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(14, 14, w - 28, h - 28, 34); ctx.clip();
  const iw = w - 28, k = i => clamp((t - t0 - i * 0.18) / 0.4);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(iw / 2 - 30, 24, 88, 22, 11); ctx.fill();
  setFont(ctx, 30); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText('your brand', 40, 98);
  // hero card
  ctx.globalAlpha = k(0); const hg = ctx.createLinearGradient(30, 120, 30 + iw, 300); hg.addColorStop(0, C.orange); hg.addColorStop(1, C.violet);
  ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(34, 122 + 20 * (1 - k(0)), iw - 40, 190, 22); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(90, 220 + 20 * (1 - k(0)), 34, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(140, 196 + 20 * (1 - k(0)), 120, 14); ctx.fillRect(140, 222 + 20 * (1 - k(0)), 80, 14);
  // list rows
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = k(i + 1); const ry = 336 + i * 64 + 16 * (1 - k(i + 1));
    ctx.fillStyle = '#E7E1D8'; ctx.beginPath(); ctx.roundRect(34, ry, iw - 40, 52, 14); ctx.fill();
    ctx.fillStyle = [C.coral, C.rim, C.teal][i]; ctx.beginPath(); ctx.roundRect(44, ry + 8, 36, 36, 9); ctx.fill();
    ctx.fillStyle = '#B9B1A6'; ctx.fillRect(94, ry + 14, 110 - i * 14, 10); ctx.fillRect(94, ry + 30, 70, 8); }
  // buy button (pressed at 10.8)
  ctx.globalAlpha = k(4); const press = 1 - 0.08 * Math.max(0, 1 - Math.abs(t - 10.85) * 8);
  ctx.save(); ctx.translate(iw / 2 + 14, h - 90); ctx.scale(press, press);
  ctx.fillStyle = C.coral; ctx.beginPath(); ctx.roundRect(-iw / 2 + 30, -32, iw - 60, 64, 32); ctx.fill();
  setFont(ctx, 28); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BUY NOW', 0, 2); ctx.restore();
  ctx.restore(); ctx.restore();
}
function productBox(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.2) * 0.04); ctx.scale(s, s);
  const f = [[-90, -60], [60, -60], [60, 110], [-90, 110]], top = [[-90, -60], [-40, -110], [110, -110], [60, -60]], side = [[60, -60], [110, -110], [110, 60], [60, 110]];
  const P = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.fill(); };
  P(side, C.rim); P(f, C.coral); P(top, '#E8706B');
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-15, 25, 34, 0, 7); ctx.fill(); ctx.fillStyle = C.coral; star(ctx, -15, 25, 20); ctx.fill();
  ctx.restore();
}
function star(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); }
function sceneBrand(ctx, t, camX) {
  sky(ctx, 1300, 760, 0.35);
  rays(ctx, 1300, 760, t, 0.6);
  // storefront: big glowing window panes behind the stage
  ctx.save(); ctx.translate(-camX * 0.3, 0);
  for (let i = 0; i < 5; i++) { const x = 160 + i * 330;
    ctx.fillStyle = C.ink; ctx.fillRect(x - 12, 160, 284, 760);
    const g = ctx.createLinearGradient(0, 180, 0, 900); g.addColorStop(0, 'rgba(255,214,140,0.95)'); g.addColorStop(1, 'rgba(217,136,80,0.55)');
    ctx.fillStyle = g; ctx.fillRect(x, 180, 260, 700); ctx.fillStyle = 'rgba(11,13,18,0.5)'; ctx.fillRect(x + 126, 180, 8, 700); ctx.fillRect(x, 520, 260, 8); }
  ctx.restore();
  ctx.fillStyle = 'rgba(11,13,18,0.18)'; ctx.fillRect(0, 0, W, H);
  ground(ctx);
  // expanding orb → stage (transition)
  const ke = clamp((t - 6.2) / 0.8);
  if (ke < 1) orb(ctx, lerp(CATCH[0], PHONE.x, easeIO(ke)), lerp(GROUND - 200, PHONE.y, easeIO(ke)), lerp(46, 420, easeIn(ke)), ke < 0.3 ? 'YOUR IDEA' : '', 1 - easeIn(ke));
  ripple(ctx, PHONE.x, PHONE.y, t, 6.9, { r: 520, n: 3 });
  // phone + product + bars
  const kp = pop(t - 6.9, 0.45), bob = Math.sin(t * 1.6) * 10;
  if (kp > 0) { ctx.save(); ctx.translate(PHONE.x, PHONE.y + bob); ctx.scale(kp, kp); ctx.translate(-PHONE.x, -PHONE.y - bob); phoneUI(ctx, PHONE.x, PHONE.y + bob, PHONE.w, PHONE.h, t, 7.2); ctx.restore(); }
  productBox(ctx, 620, 560 + Math.sin(t * 1.3 + 1) * 12, pop(t - 7.4, 0.4) * 1.05, t);
  const base = 840, bx = 1290;
  for (let i = 0; i < 5; i++) {
    const h = [110, 180, 250, 340, 460][i] * easeOut((t - 8.0 - i * 0.22) / 0.5);
    if (h <= 0) continue;
    ctx.fillStyle = C.rim; ctx.fillRect(bx + i * 84 + 5, base - h - 4, 62, h);
    ctx.fillStyle = i === 4 ? C.coral : '#2A2D3A'; ctx.fillRect(bx + i * 84, base - h, 62, h);
  }
  const tl = []; for (let i = 0; i <= 40; i++) { const u = i / 40; tl.push([bx + 31 + u * 336, base - 140 - Math.pow(u, 1.6) * 400]); }
  dotted(ctx, tl, clamp((t - 9.0) / 0.8), { step: 2, r: 4 });
  if (t > 9.8) { const [ax, ay] = tl[40]; ctx.save(); ctx.globalAlpha = clamp((t - 9.8) / 0.3); ctx.fillStyle = C.white; ctx.beginPath(); ctx.moveTo(ax + 22, ay - 16); ctx.lineTo(ax - 8, ay - 14); ctx.lineTo(ax + 8, ay + 12); ctx.closePath(); ctx.fill(); ctx.restore(); }
  text(ctx, '+ REVENUE', bx + 180, base + 46, 30, { k: pop(t - 9.6), fill: C.gold, spacing: 2 });
  if (!VERT) callout(ctx, PHONE.x - 150, 330 + bob, 600, 270, 'CUSTOM UI', clamp((t - 9.4) / 0.5) * popOut(12.8 - t), { size: 30 });
  if (!VERT) callout(ctx, PHONE.x + 150, 420 + bob, 1250, 300, 'SMOOTH MOTION', clamp((t - 9.8) / 0.5) * popOut(12.8 - t), { size: 30 });
  // cursor taps BUY NOW
  const kc = fade(t, 10.0, 12.6);
  if (kc > 0) {
    const tx = PHONE.x + 20, ty = PHONE.y + PHONE.h / 2 - 90 + bob, u = easeIO((t - 10.0) / 0.8);
    const cx = lerp(1300, tx, u), cy = lerp(900, ty, u);
    ctx.save(); ctx.globalAlpha = kc; ctx.translate(cx, cy); ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.lineTo(12, 36); ctx.lineTo(22, 58); ctx.lineTo(30, 54); ctx.lineTo(20, 32); ctx.lineTo(36, 32); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ripple(ctx, tx, ty, t, 10.85, { r: 120, n: 2, d: 0.6 });
    text(ctx, '+1 ORDER', VERT ? tx - 190 : tx - 300, VERT ? ty - 110 : ty - 30, 36, { k: win(t, 11.0, 12.6), fill: C.gold });
  }
  actor(ctx, 'host', 'point', 260, GROUND, { k: pop(t - 7.2) });
  badge(ctx, 'BRAND & PRODUCT ADS', W / 2, 90, win(t, 7.0, 12.9));
}

// ------------------------------------------------------------------ scene 3 (13–20): viral shorts in a 9:16 frame
const VF = { x: W / 2, y: 560, h: 820 }; VF.w = VF.h * 9 / 16;
const LAND = [[[-0.5, 0.2], [-0.1, 0.05], [0.25, 0.18], [0.3, 0.42], [0.05, 0.5], [-0.3, 0.45], [-0.5, 0.35]], [[0.15, 0.62], [0.45, 0.58], [0.5, 0.75], [0.2, 0.8]], [[-0.45, 0.68], [-0.25, 0.66], [-0.2, 0.78], [-0.42, 0.8]]];
function shortsContent(ctx, x0, y0, w, h, t) {
  const clipB = t > 16.7;
  if (!clipB) {     // a map explainer: teal sea, olive land, dotted route, kinetic number
    ctx.fillStyle = C.teal; ctx.fillRect(x0, y0, w, h);
    const zx = 1 + 0.08 * clamp((t - 13.4) / 3);
    const M = (p) => [x0 + w / 2 + p[0] * w * zx, y0 + h * 0.1 + p[1] * h * zx];
    for (const poly of LAND) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); poly.forEach((p, i) => { const q = M(p); i ? ctx.lineTo(q[0] + 5, q[1] + 7) : ctx.moveTo(q[0] + 5, q[1] + 7); }); ctx.fill();
      ctx.fillStyle = C.olive; ctx.beginPath(); poly.forEach((p, i) => { const q = M(p); i ? ctx.lineTo(...q) : ctx.moveTo(...q); }); ctx.closePath(); ctx.fill(); }
    const A = M([-0.25, 0.3]), B = M([0.32, 0.68]), Cc = [(A[0] + B[0]) / 2 + 60, Math.min(A[1], B[1]) - 40];
    const pts = []; for (let i = 0; i <= 60; i++) pts.push(quad(A, Cc, B, i / 60));
    const kr = clamp((t - 14.0) / 1.6);
    dotted(ctx, pts, kr, { color: C.yellow, step: 2, r: 4 });
    for (const [p, c, k] of [[A, C.coral, pop(t - 13.7)], [B, '#2F5D8C', pop(t - 15.6)]]) if (k > 0) { ctx.save(); ctx.translate(...p); ctx.scale(k, k); ctx.fillStyle = c; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -26, 18, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(0, 0); ctx.lineTo(8, -14); ctx.fill(); ctx.restore(); }
    if (kr > 0 && kr < 1) { const [px, py] = pts[Math.floor(kr * 60)]; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); }
    text(ctx, 'WHAT IF…?', x0 + w / 2, y0 + 70, 46, { k: pop(t - 13.5), grad: ['#F9E27D', '#F4D03F'], stroke: '#3A2A08' });
    text(ctx, '24 HRS', x0 + w / 2, y0 + h * 0.5, 84, { k: win(t, 15.8, 16.65), fill: C.yellow, stroke: '#3A2A08', rot: -4 });
    text(ctx, 'Hook in 1 second', x0 + w / 2, y0 + h - 120, 32, { k: win(t, 14.2, 16.65) });
  } else {         // a reflex clip: stickman catch, ripple, stopwatch number
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, C.navy); g.addColorStop(0.6, C.violet); g.addColorStop(1, C.orange); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = '#12141C'; ctx.fillRect(x0, y0 + h * 0.78, w, h * 0.22); ctx.fillStyle = C.rim; ctx.fillRect(x0, y0 + h * 0.78 - 2, w, 3);
    const cx = x0 + w / 2 - 40, cy = y0 + h * 0.78;
    actor(ctx, 'host', t < 17.5 ? 'stand' : 'catch', cx, cy, { w: 170 });
    const hp = handOf('catch', 170), target = [cx + hp[0], cy + hp[1]];
    const u = clamp((t - 16.8) / 0.7), ball = quad([x0 + w + 30, y0 + 140], [x0 + w * 0.7, y0 + 60], target, u);
    if (t < 17.5) { ghostTrail(ctx, d => { const b = quad([x0 + w + 30, y0 + 140], [x0 + w * 0.7, y0 + 60], target, clamp(u - d)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b[0], b[1], 14, 0, 7); ctx.fill(); }, 4, 0.06, 0.6);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball[0], ball[1], 14, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(...target, 14, 0, 7); ctx.fill(); }
    ripple(ctx, ...target, t, 17.5, { r: 160, n: 3 });
    text(ctx, '0.025 s', x0 + w / 2, y0 + 150, 72, { k: pop(t - 17.6), fill: C.yellow, stroke: '#3A2A08' });
    text(ctx, 'Reaction time', x0 + w / 2, y0 + h - 120, 32, { k: pop(t - 17.0) });
  }
  // progress bar like a real Short
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x0, y0 + h - 8, w, 8); ctx.fillStyle = C.white; ctx.fillRect(x0, y0 + h - 8, w * clamp((t - 13.3) / 6.6), 8);
}
function sceneShorts(ctx, t, frame) {
  // frame: {x0,y0,w,h,r} — the 9:16 window (it grows to full screen at the end of this scene)
  sky(ctx, 1300, 760, 0.55);
  ctx.drawImage(SKYLINE, -500, GROUND - 510); ground(ctx);
  ctx.fillStyle = 'rgba(11,13,18,0.45)'; ctx.fillRect(0, 0, W, H);
  // retention meter
  const km = win(t, 14.4, 19.7);
  if (km > 0) {
    const v = lerp(35, 92, easeOut((t - 15.0) / 3.2)), mx = VERT ? 1320 : 1500, my = 260, mh = 520;
    ctx.save(); ctx.translate(mx, my + mh / 2); ctx.scale(km, km); ctx.translate(-mx, -(my + mh / 2));
    text(ctx, 'RETENTION', mx, my - 40, 32, { spacing: 3 });
    ctx.fillStyle = 'rgba(11,13,18,0.8)'; ctx.beginPath(); ctx.roundRect(mx - 34, my, 68, mh, 34); ctx.fill();
    ctx.strokeStyle = C.rim; ctx.lineWidth = 3; ctx.stroke();
    const fh = (mh - 12) * v / 100, g = ctx.createLinearGradient(0, my + mh, 0, my); g.addColorStop(0, C.coral); g.addColorStop(1, C.rim);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(mx - 28, my + mh - 6 - fh, 56, fh, 28); ctx.fill();
    text(ctx, `${Math.round(v)}%`, mx, my + mh + 50, 54, { fill: C.gold });
    ctx.restore();
  }
  // likes floating up
  for (let i = 0; i < 7; i++) { const u = ((t - 15.6) * 0.45 + i / 7) % 1; if (t < 15.6 || t > 19.6) break;
    text(ctx, '♥', (VERT ? frame.x0 - 60 : frame.x0 + frame.w + 60) + Math.sin(i * 2 + t * 2) * 24, 860 - u * 520, 40 + (i % 3) * 10, { fill: i % 2 ? C.coral : '#FF8A80', alpha: (1 - u) * 0.9, shadow: false }); }
  actor(ctx, 'capper', t > 17.6 ? 'cheer' : 'point', VERT ? 560 : 420, GROUND, { k: pop(t - 13.8) });
  badge(ctx, 'VIRAL SHORTS & REELS', 420, 120, win(t, 13.6, 19.7));
  // the vertical frame
  const { x0, y0, w, h, r } = frame;
  ctx.save(); ctx.fillStyle = C.rim; ctx.beginPath(); ctx.roundRect(x0 + 7, y0 - 5, w, h, r); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(x0 - 10, y0 - 10, w + 20, h + 20, r + 10); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x0, y0, w, h, r); ctx.clip();
  shortsContent(ctx, x0, y0, w, h, t);
  ctx.restore();
  text(ctx, '9:16', x0 + w + 70, y0 + 40, 30, { k: win(t, 13.6, 19.6), fill: C.rim, spacing: 4 });
}

// ------------------------------------------------------------------ scene 4 (20–26): long-form storytelling, twilight stadium
function stadium(ctx, t) {
  const zoom = 1 + 0.12 * easeIO((t - 20.6) / 5.4);
  ctx.save(); ctx.translate(W / 2, 600); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -600);
  sky(ctx, 960, 640, 0.25);
  // spotlights
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [lx, dir] of [[205, 1], [1715, -1]]) for (let j = 0; j < 2; j++) {
    const a = Math.PI / 2 + dir * (0.45 + 0.3 * Math.sin(t * 0.8 + j * 1.7)), len = 1400;
    const g = ctx.createRadialGradient(lx, 410, 10, lx, 410, len); g.addColorStop(0, 'rgba(255,240,200,0.45)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, 410); ctx.arc(lx, 410, len, a - 0.11, a + 0.11); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  sprite(ctx, 'bg_stadium', W / 2, 380, W, { ax: 0.5, ay: 0 });
  { const bob = Math.abs(Math.sin(t * 7)) * (t > 22.6 ? 7 : 1.5);
    ctx.save(); ctx.globalAlpha = 0.85; ctx.drawImage(CROWD, -40, 500 - bob, 2000, 230); ctx.restore(); }
  ground(ctx, 730, '#16241D');
  const fg = ctx.createLinearGradient(0, 730, 0, H); fg.addColorStop(0, 'rgba(60,110,70,0.35)'); fg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fg; ctx.fillRect(0, 730, W, H - 730);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(W / 2, 880, 300, 60, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W / 2, 730); ctx.lineTo(W / 2, H); ctx.stroke();
  // coach + host, kick with dotted trajectory and afterimages
  actor(ctx, 'coach', t > 23.0 ? 'cheer' : 'point', 420, 960, { k: pop(t - 20.8) });
  const kicking = t > 21.5 && t < 22.4;
  actor(ctx, 'host', kicking ? 'kick' : (t > 23.0 ? 'cheer' : 'stand'), 760, 960);
  const A = [905, 940], B = [1560, 520], Cc = [1260, 220];
  const u = clamp((t - 21.75) / 0.85);
  const pts = []; for (let i = 0; i <= 60; i++) pts.push(quad(A, Cc, B, i / 60));
  if (t > 21.75) dotted(ctx, pts, u, { step: 2, r: 4.5 });
  const ball = (uu) => quad(A, Cc, B, clamp(uu));
  const drawBall = (p, a = 1) => { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.rim; ctx.beginPath(); ctx.arc(p[0] + 4, p[1] - 3, 22, 0, 7); ctx.fill(); ctx.fillStyle = '#F2F2F2'; ctx.beginPath(); ctx.arc(p[0], p[1], 22, 0, 7); ctx.fill(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(p[0] - 4, p[1] + 2, 8, 0, 7); ctx.fill(); ctx.restore(); };
  if (t < 21.75) drawBall(A);
  else if (u < 1) { ghostTrail(ctx, d => drawBall(ball(u - d)), 5, 0.05, 0.6); drawBall(ball(u)); }
  else drawBall(B);
  ripple(ctx, ...B, t, 22.6, { r: 300, n: 4 });
  // target ring + HUD
  ctx.save(); ctx.globalAlpha = fade(t, 21.0, 25.8); ctx.strokeStyle = C.white; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
  ctx.beginPath(); ctx.arc(...B, 54, 0, 7); ctx.stroke(); ctx.restore();
  text(ctx, 'x10', VERT ? B[0] - 10 : B[0] + 130, VERT ? B[1] - 130 : B[1] - 90, 96, { k: win(t, 22.7, 25.8), fill: C.yellow, stroke: '#3A2A08', rot: -6 });
  ctx.restore();
}
function sceneLong(ctx, t) {
  stadium(ctx, t);
  // cinematic letterbox + chapter HUD
  const lb = VERT ? 0 : easeIO((t - 20.6) / 0.6) * (1 - easeIO((t - 25.6) / 0.4)) * 80;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, H - lb, W, lb);
  badge(ctx, 'YOUTUBE EXPLAINERS & STORIES', W / 2, 160, win(t, 21.0, 25.7));
  const kh = VERT ? 0 : win(t, 21.4, 25.6);
  if (kh > 0) { ctx.save(); ctx.globalAlpha = clamp(kh); text(ctx, 'CHAPTER 2 · THE BIG MOMENT', 120, H - 150, 26, { align: 'left', spacing: 3, fill: '#E8E2D6' });
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(120, H - 120, 520, 6); ctx.fillStyle = C.rim; ctx.fillRect(120, H - 120, 520 * lerp(0.25, 0.6, clamp((t - 21.4) / 4)), 6); ctx.restore(); }
}

// ------------------------------------------------------------------ scene 5 (26–30): hero lineup + CTA
function sceneOutro(ctx, t) {
  sky(ctx, 960, 760, 0);
  rays(ctx, 960, 760, t, 1.2, 11, 1700);
  ctx.drawImage(SKYLINE, -340, GROUND - 500);
  ctx.fillStyle = 'rgba(46,39,64,0.5)'; ctx.fillRect(0, GROUND - 120, W, 120);
  ground(ctx);
  const cast = [['scientist', 570, 26.5], ['host', 830, 26.3], ['capper', 1090, 26.7], ['coach', 1350, 26.9]];
  for (const [who, x, t0] of cast) actor(ctx, who, t > t0 + 0.9 ? 'cheer' : 'stand', x, GROUND, { k: pop(t - t0, 0.4) });
  if (VERT) return;                        // the vertical cut lays its own end-card type out
  const k1 = pop(t - 26.6, 0.4), k2 = pop(t - 27.3, 0.4);
  text(ctx, 'ANY NICHE. ANY FORMAT.', W / 2, 170, 100, { k: k1, stroke: C.rim, strokeW: 7, spacing: 2 });
  text(ctx, "LET'S CREATE YOUR VIDEO.", W / 2, 292, 76, { k: k2, grad: ['#FBE29A', C.rim], stroke: '#3A2408', strokeW: 6, spacing: 2 });
  ripple(ctx, W / 2, 240, t, 27.3, { r: 760, n: 3, squash: 0.3, w: 3 });
  const kc = pop(t - 28.2, 0.4);
  if (kc > 0) { ctx.save(); ctx.translate(W / 2, 400); ctx.scale(kc, kc); setFont(ctx, 30); ctx.letterSpacing = '3px';
    const w = ctx.measureText('SEND ME YOUR SCRIPT').width + 80; ctx.fillStyle = C.coral; ctx.beginPath(); ctx.roundRect(-w / 2, -34, w, 68, 34); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SEND ME YOUR SCRIPT', 0, 2); ctx.restore(); }
}

// ------------------------------------------------------------------ subtitles
const SUBS = [
  [0.2, 2.4, 'Most videos get scrolled past within seconds.'], [2.5, 4.3, 'What if yours stopped viewers cold —'],
  [4.4, 6.1, 'and kept them watching till the very last frame?'],
  [6.3, 12.8, 'Whether you need a high-converting brand commercial,'],
  [13.1, 16.5, 'a scroll-stopping vertical Short,'], [16.6, 19.8, 'or a cinematic YouTube explainer —'],
  [20.1, 23.0, 'I turn complex ideas into clean, custom 2D animation'], [23.1, 25.7, 'with sharp storytelling and smooth motion.'],
  [26.1, 29.9, "Send me your script or idea today — let's bring it to life."],
];
let SUBS_ON = true;
function drawSubs(ctx, t) {
  if (!SUBS_ON) return;
  for (const [t0, t1, s] of SUBS) { const a = fade(t, t0, t1, 0.15); if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a; setFont(ctx, 38); const w = ctx.measureText(s).width + 48;
    ctx.fillStyle = 'rgba(11,13,18,0.62)'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, H - 112, w, 62, 14); ctx.fill();
    ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, W / 2, H - 80); ctx.restore(); }
}

// ------------------------------------------------------------------ compositor
function renderAt(t, ctx) {
  if (VERT) return renderVertical(t, ctx);
  renderScene(t, ctx || document.getElementById('cv').getContext('2d'));
}
function renderScene(t, ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  const camX = t * 18;                                   // gentle parallax drift
  if (t < 6.2) sceneStreet(ctx, t, camX);
  else if (t < 13.0) {
    // whip-pan out at the end of scene 2
    const wp = easeIn((t - 12.7) / 0.3);
    ctx.save(); ctx.translate(-wp * W, 0); sceneBrand(ctx, t, camX); ctx.restore();
    if (wp > 0) { ctx.save(); ctx.translate(W - wp * W, 0); sceneShorts(ctx, 13.0, shortsFrame(13.0)); ctx.restore(); }
  } else if (t < 20.0) {
    const wp = 1 - easeOut((t - 13.0) / 0.35);
    ctx.save(); ctx.translate(wp * W * 0.3, 0); sceneShorts(ctx, t, shortsFrame(t)); ctx.restore();
  } else if (t < 26.0) sceneLong(ctx, t);
  else sceneOutro(ctx, t);
  // whip streaks
  const ws = Math.max(win(t, 12.65, 13.4, 0.1, 0.25), 0);
  if (ws > 0) { const r = rnd(9); ctx.save(); ctx.globalAlpha = clamp(ws) * 0.5; ctx.fillStyle = C.white;
    for (let i = 0; i < 40; i++) ctx.fillRect(r() * W, r() * H, 200 + r() * 600, 2 + r() * 3); ctx.restore(); }
  // the 9:16 frame grows into the 16:9 stadium shot
  if (t >= 19.4 && t < 20.0) {
    const f = shortsFrame(t);
    ctx.save(); ctx.beginPath(); ctx.roundRect(f.x0, f.y0, f.w, f.h, f.r); ctx.clip(); sceneLong(ctx, 20.0); ctx.restore();
  }
  // cut-to-black beat before the reveal
  if (VERT) return;
  const bl = fade(t, 25.75, 26.2, 0.12);
  if (bl > 0) { ctx.fillStyle = `rgba(0,0,0,${bl})`; ctx.fillRect(0, 0, W, H); }
  // global vignette + grain
  const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.45, W / 2, H * 0.5, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W, H);
  drawSubs(ctx, t);
  // fade in / out
  const fi = 1 - clamp(t / 0.35), fo = clamp((t - 29.6) / 0.4);
  if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
}
// ------------------------------------------------------------------ vertical (9:16) cut
const VW = 1080, VH = 1920;
const FOCUS = [[0, 560], [1.0, 560], [3.3, 1000], [3.6, 1083], [4.2, 1150], [6.0, 1150], [6.4, 980], [7.2, 880], [8.4, 900], [9.2, 1250], [9.9, 1250],
  [10.4, 1000], [12.6, 1000], [13.0, 960], [14.6, 960], [15.3, 1060], [17.3, 1060], [17.8, 840], [19.3, 840], [19.6, 960], [20.4, 700], [21.6, 720],
  [22.5, 1290], [23.1, 1290], [23.7, 820], [26.0, 820]];
let OFF = null;
function focusAt(t) {
  const k = FOCUS; if (t <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) if (t <= k[i + 1][0]) return lerp(k[i][1], k[i + 1][1], easeIO((t - k[i][0]) / (k[i + 1][0] - k[i][0])));
  return k[k.length - 1][1];
}
function wrapLines(ctx, s, maxW) {
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (ctx.measureText(tryS).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS; }
  if (cur) lines.push(cur); return lines;
}
function renderVertical(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d');
  if (!OFF) { OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H; }
  OVER.badges = [];
  renderScene(t, OFF.getContext('2d'));
  const outro = t >= 26.0;
  const s = outro ? 1.0 : 1.4, bandH = H * s, yb = outro ? 640 : (VH - bandH) / 2;
  const vis = VW / s, fx = outro ? W / 2 : clamp(focusAt(t), vis / 2, W - vis / 2), sx = fx - vis / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.imageSmoothingQuality = 'high';
  ctx.save(); ctx.filter = 'blur(14px)';
  ctx.drawImage(OFF, sx, 0, vis, 1, -30, -30, VW + 60, yb + 32);                     // extend the band's top row upward (sky)
  ctx.drawImage(OFF, sx, H - 1, vis, 1, -30, yb + bandH - 2, VW + 60, VH - yb - bandH + 32);  // and its bottom row downward (ground)
  ctx.restore();
  ctx.drawImage(OFF, sx, 0, vis, H, 0, yb, VW, bandH);
  const tg = ctx.createLinearGradient(0, 0, 0, yb + 80); tg.addColorStop(0, 'rgba(0,0,0,0.55)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, VW, yb + 80);
  // overlays, laid out for a phone (clear of TikTok's top tabs and bottom caption area)
  for (const [label, k] of OVER.badges) badge(ctx, label, VW / 2, 300, k, true);
  const ka = win(t, 0.4, 3.2);
  if (ka > 0) {
    const left = clamp(1 - (t - 0.6) / 2.0);
    ctx.save(); ctx.translate(VW / 2, 300); ctx.scale(ka, ka);
    text(ctx, 'ATTENTION', 0, -40, 34, { spacing: 4 });
    ctx.fillStyle = 'rgba(11,13,18,0.7)'; ctx.beginPath(); ctx.roundRect(-260, 0, 520, 26, 13); ctx.fill();
    ctx.fillStyle = left > 0.3 ? C.rim : C.coral; ctx.beginPath(); ctx.roundRect(-260, 0, Math.max(26, 520 * left), 26, 13); ctx.fill();
    text(ctx, `${(left * 2).toFixed(1)} s`, 0, 70, 40, { fill: left > 0.3 ? C.white : C.coral });
    ctx.restore();
  }
  if (outro) {
    const k1 = pop(t - 26.6, 0.4), k2 = pop(t - 27.3, 0.4), kc = pop(t - 28.2, 0.4);
    text(ctx, 'ANY NICHE.', VW / 2, 300, 108, { k: k1, stroke: C.rim, strokeW: 7, spacing: 2 });
    text(ctx, 'ANY FORMAT.', VW / 2, 420, 108, { k: k1, stroke: C.rim, strokeW: 7, spacing: 2 });
    text(ctx, "LET'S CREATE", VW / 2, 570, 80, { k: k2, grad: ['#FBE29A', C.rim], stroke: '#3A2408', strokeW: 6, spacing: 2 });
    text(ctx, 'YOUR VIDEO.', VW / 2, 662, 80, { k: k2, grad: ['#FBE29A', C.rim], stroke: '#3A2408', strokeW: 6, spacing: 2 });
    ripple(ctx, VW / 2, 480, t, 27.3, { r: 600, n: 3, squash: 0.45, w: 3 });
    if (kc > 0) { ctx.save(); ctx.translate(VW / 2, 800); ctx.scale(kc, kc); setFont(ctx, 40); ctx.letterSpacing = '3px';
      const w = ctx.measureText('SEND ME YOUR SCRIPT').width + 96; ctx.fillStyle = C.coral; ctx.beginPath(); ctx.roundRect(-w / 2, -44, w, 88, 44); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SEND ME YOUR SCRIPT', 0, 2); ctx.restore(); }
  }
  // subtitles: big, two lines max, sitting on the ground above TikTok's caption area
  if (SUBS_ON) for (const [t0, t1, str] of SUBS) { const a = fade(t, t0, t1, 0.15); if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a; setFont(ctx, 50); const lines = wrapLines(ctx, str, 900), lh = 64, y0 = (outro ? 1640 : 1560) - (lines.length - 1) * lh / 2;
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 56;
    ctx.fillStyle = 'rgba(11,13,18,0.66)'; ctx.beginPath(); ctx.roundRect(VW / 2 - w / 2, y0 - lh / 2 - 12, w, lines.length * lh + 24, 18); ctx.fill();
    ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, VW / 2, y0 + i * lh + 2)); ctx.restore(); }
  // vignette, grain, black beat, fades
  const g = ctx.createRadialGradient(VW / 2, VH * 0.5, VH * 0.35, VW / 2, VH * 0.5, VH * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, VW, VH);
  const bl = fade(t, 25.75, 26.2, 0.12), fi = 1 - clamp(t / 0.35), fo = clamp((t - 29.6) / 0.4);
  const dark = Math.max(bl, fi, fo); if (dark > 0) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, VW, VH); }
}
function shortsFrame(t) {
  const grow = easeIO((t - 19.4) / 0.6);
  const w = lerp(VF.w, W, grow), h = lerp(VF.h, H, grow), x0 = lerp(VF.x - VF.w / 2, 0, grow), y0 = lerp(VF.y - VF.h / 2, 0, grow);
  return { x0, y0, w, h, r: lerp(40, 0, grow) };
}

// ------------------------------------------------------------------ player (real-time clock; follows the voiced timeline when SYNC is present)
window.renderAt = renderAt;
window.READY = false;
const SYNC = window.SYNC || null;
function storyAt(real) {
  if (!SYNC) return real;
  const k = SYNC.keys; if (real <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) if (real <= k[i + 1][0]) return lerp(k[i][1], k[i + 1][1], (real - k[i][0]) / (k[i + 1][0] - k[i][0] || 1));
  return k[k.length - 1][1];
}
loadAssets().then(() => {
  window.READY = true;
  const q = new URLSearchParams(location.search);
  if (q.has('nosubs')) SUBS_ON = false;
  if (q.has('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play'), aud = document.getElementById('aud'), tm = document.getElementById('time'), sb = document.getElementById('subs');
  ctl.style.display = 'flex';
  const DUR = SYNC ? SYNC.dur : DURATION;
  if (window.AUDIO) aud.src = window.AUDIO;
  let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(storyAt(t)); bar.value = t; tm.textContent = `${t.toFixed(1)} / ${DUR.toFixed(1)} s`; };
  const setPlay = p => { playing = p; btn.textContent = p ? '❚❚' : '▶'; last = performance.now();
    if (window.AUDIO) { if (p) { aud.currentTime = t; aud.play().catch(() => {}); } else aud.pause(); } };
  btn.onclick = () => setPlay(!playing);
  sb.onclick = () => { SUBS_ON = !SUBS_ON; sb.textContent = SUBS_ON ? 'CC on' : 'CC off'; draw(); };
  document.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); setPlay(!playing); } });
  bar.max = DUR; bar.oninput = () => { t = +bar.value; if (window.AUDIO) aud.currentTime = t; draw(); };
  const tick = now => {
    if (playing) { t = window.AUDIO && !aud.paused ? aud.currentTime : t + (now - last) / 1000; last = now;
      if (t >= DUR) { t = DUR; setPlay(false); } draw(); }
    requestAnimationFrame(tick);
  };
  draw(); requestAnimationFrame(tick);
});
