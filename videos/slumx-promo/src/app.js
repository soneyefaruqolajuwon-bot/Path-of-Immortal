/* Slumx self-promo — kinetic-typography motion ad (native 9:16, 120 BPM, music only). renderAt(t) draws time t. */
'use strict';
const W = 1080, H = 1920, DURATION = 26.5, BEAT = 0.5;
const GOLD = '#F5B041', INK = '#0B0D12', WHITE = '#FFFFFF', CREAM = '#FFF4DE';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }, easeOut = t => 1 - Math.pow(1 - clamp(t), 3), easeIn = t => Math.pow(clamp(t), 3);
const back = (t, s = 2.2) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; }, pop = (dt, d = 0.28) => dt <= 0 ? 0 : back(dt / d);
function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const IMG = {}, CLIPF = [];
function load() { const jobs = [];
  for (const [k, src] of Object.entries(window.SHOTS)) jobs.push(new Promise(r => { const im = new Image(); im.onload = () => { IMG[k] = im; r(); }; im.src = src; }));
  window.CLIP.forEach((src, i) => jobs.push(new Promise(r => { const im = new Image(); im.onload = () => { CLIPF[i] = im; r(); }; im.src = src; })));
  jobs.push(document.fonts.load('800 80px "Montserrat"')); return Promise.all(jobs).then(() => document.fonts.ready); }
function font(s) { return `800 ${s}px "Montserrat", sans-serif`; }
function word(ctx, s, x, y, size, col, k = 1, o = {}) {   // big kinetic word, squash-and-stretch pop
  if (k <= 0.001) return; ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); const sx = k * (1 + (o.stretch || 0)), sy = k * (1 - (o.stretch || 0) * 0.5); ctx.scale(sx, sy);
  ctx.font = font(size); let fs = size; const w = ctx.measureText(s).width; if (w > (o.maxW || 980)) { fs = size * (o.maxW || 980) / w; ctx.font = font(fs); }
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = (o.ls ?? -0.03 * fs) + 'px'; ctx.fillStyle = col; ctx.fillText(s, 0, 0); ctx.restore(); }
const bg = (ctx, col) => { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); };
function blob(ctx, cx, cy, r, col, t, seed = 1, wob = 0.12) { const rr = rnd(seed), ph = [rr() * 6, rr() * 6, rr() * 6]; ctx.beginPath();
  for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.283, q = r * (1 + wob * Math.sin(3 * a + ph[0] + t * 2) + wob * 0.6 * Math.sin(5 * a + ph[1] - t * 1.5) + wob * 0.4 * Math.sin(7 * a + ph[2] + t)); i ? ctx.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : ctx.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }
function ribbon(ctx, t, col, y0, amp, w) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); for (let x = -200; x <= W + 200; x += 20) ctx.lineTo(x, y0 + Math.sin(x / 180 + t * 3) * amp); ctx.stroke(); ctx.restore(); }
function wipe(ctx, t, t0, col, kind = 'circle', x = W / 2, y = H / 2) {   // liquid transitions
  const u = (t - t0) / 0.5; if (u <= 0) return false; const e = easeIO(u);
  if (kind === 'circle') { blob(ctx, x, y, 2300 * e, col, t, 7, 0.08 * (1 - e)); }
  else if (kind === 'sweep') { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-50, H + 50); const X = lerp(-400, W + 1400, e); ctx.lineTo(X - 600, H + 50); ctx.quadraticCurveTo(X, H * 0.5, X - 600, -50); ctx.lineTo(-50, -50); ctx.closePath(); ctx.fill(); ctx.restore(); }
  return u >= 1; }
function phone(ctx, x, y, w, rot, screenFn, o = {}) {
  const h = w * 2.05, r = w * 0.16; ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30; ctx.fillStyle = '#16181F'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#2A2D38'; ctx.beginPath(); ctx.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, r - 3); ctx.fill();
  const sw = w * 0.9, sh = h * 0.95; ctx.save(); ctx.beginPath(); ctx.roundRect(-sw / 2, -sh / 2, sw, sh, r * 0.8); ctx.clip(); ctx.fillStyle = '#000'; ctx.fillRect(-sw / 2, -sh / 2, sw, sh); screenFn(ctx, -sw / 2, -sh / 2, sw, sh); ctx.restore();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(-w * 0.14, -sh / 2 + w * 0.04, w * 0.28, w * 0.07, w * 0.035); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.beginPath(); ctx.moveTo(-sw / 2, -sh / 2); ctx.lineTo(-sw / 2 + sw * 0.45, -sh / 2); ctx.lineTo(-sw / 2, -sh / 2 + sh * 0.35); ctx.closePath(); ctx.fill(); ctx.restore(); }
const shot = name => (ctx, x, y, w, h) => { const im = IMG[name]; if (im) ctx.drawImage(im, x, y, w, h); };
const clipAt = t => (ctx, x, y, w, h) => { const im = CLIPF[Math.floor(Math.max(0, t) * 12) % CLIPF.length]; if (im) ctx.drawImage(im, x, y, w, h); };
function sparkles(ctx, cx, cy, t, k, seed = 3) { if (k <= 0) return; const r = rnd(seed); for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = (180 + r() * 360) * easeOut(k), s = 10 + r() * 20, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 1.2;
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.globalAlpha = clamp(1.4 - k) * (0.6 + 0.4 * Math.sin(t * 8 + i)); ctx.fillStyle = i % 3 ? GOLD : WHITE; ctx.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? s * 0.35 : s, aa = j * Math.PI / 4; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); } }
function card(ctx, x, y, label, icon, k, on) { if (k <= 0.001) return; ctx.save(); ctx.translate(x, y); ctx.scale(k * (on ? 1.06 : 1), k * (on ? 1.06 : 1)); const w = 820, h = 210;
  ctx.fillStyle = on ? GOLD : WHITE; ctx.strokeStyle = GOLD; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 40); ctx.fill(); ctx.stroke();
  ctx.fillStyle = on ? INK : GOLD; ctx.beginPath(); ctx.arc(-w / 2 + 120, 0, 66, 0, 7); ctx.fill(); ctx.fillStyle = on ? GOLD : WHITE; ctx.font = font(64); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, -w / 2 + 120, 4);
  ctx.fillStyle = INK; ctx.font = font(68); ctx.textAlign = 'left'; ctx.letterSpacing = '-2px'; ctx.fillText(label, -w / 2 + 230, 6); ctx.restore(); }
function logo(ctx, x, y, s, k) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.rotate((1 - clamp(k)) * -0.4); ctx.fillStyle = GOLD; ctx.beginPath(); ctx.roundRect(-110, -110, 220, 220, 54); ctx.fill();
  ctx.fillStyle = INK; ctx.font = 'italic 700 170px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('S', 0, 10); ctx.restore(); }

function renderAt(t, ctx) {
  ctx = ctx || document.getElementById('cv').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
  // 0–3: GOT · AN · IDEA? / BUT NO · VIDEO?
  if (t < 3.25) {
    if (t < 1.0) { bg(ctx, INK); word(ctx, 'GOT', W / 2, 820, 330, WHITE, pop(t)); word(ctx, 'AN', W / 2, 1110, 330, GOLD, pop(t - 0.5)); }
    else if (t < 2.0) { bg(ctx, GOLD); word(ctx, 'IDEA?', W / 2, 960, 300, INK, pop(t - 1.0), { stretch: 0.1 * Math.max(0, 1 - (t - 1.0) * 4) }); }
    else { bg(ctx, INK); word(ctx, 'BUT NO', W / 2, 800, 220, WHITE, pop(t - 2.0)); word(ctx, 'VIDEO?', W / 2, 1060, 250, GOLD, pop(t - 2.5), { rot: -0.04 }); }
    if (t > 2.75) wipe(ctx, t, 2.75, GOLD, 'circle', W / 2, 1900);
    return;
  }
  // 3.25–7.5: Slumx solved it — hero phone with a real Slumx animation playing
  if (t < 7.5) {
    bg(ctx, GOLD); blob(ctx, W / 2, 1180, 470, CREAM, t, 2, 0.1); ribbon(ctx, t, 'rgba(255,255,255,0.35)', 1700, 60, 60);
    word(ctx, 'SLUMX', W / 2, 300, 150, INK, pop(t - 3.3)); word(ctx, 'solved it.', W / 2, 450, 120, WHITE, pop(t - 3.6), { ls: -4 });
    const rise = easeOut((t - 3.5) / 0.8); phone(ctx, W / 2, lerp(2300, 1200, rise), 420, Math.sin(t * 1.4) * 0.05 - 0.06, clipAt(t - 3.8));
    sparkles(ctx, W / 2, 1150, t, clamp((t - 4.0) / 1.2));
    if (t > 7.0) wipe(ctx, t, 7.0, WHITE, 'sweep');
    return;
  }
  // 7.5–11.5: what I make — cards pop on the beat, a gold ribbon sweeps through
  if (t < 11.5) {
    bg(ctx, WHITE); ribbon(ctx, t, GOLD, lerp(2200, -300, easeIO((t - 7.5) / 4.0)), 160, 140);
    word(ctx, 'I ANIMATE', W / 2, 330, 130, INK, pop(t - 7.6));
    const items = [['STORY ADS', '▶'], ['EXPLAINERS', '✎'], ['SHORTS & REELS', '♪']], active = Math.floor((t - 9.0) / 0.5) % 3;
    items.forEach(([l, ic], i) => card(ctx, W / 2, 760 + i * 300, l, ic, pop(t - 8.0 - i * 0.5), t > 9.5 && active === i));
    if (t > 11.0) wipe(ctx, t, 11.0, GOLD, 'circle', 900, 1600);
    return;
  }
  // 11.5–15.5: pick your style — real portfolio screens fan out
  if (t < 15.5) {
    bg(ctx, GOLD); blob(ctx, W / 2, 1900, 900, CREAM, t, 5, 0.06);
    word(ctx, 'pick your', W / 2, 280, 120, WHITE, pop(t - 11.6), { ls: -4 }); word(ctx, 'STYLE', W / 2, 420, 170, INK, pop(t - 11.9));
    const names = ['japan', 'barber', 'cafe', 'mars', 'canada'], spread = easeOut((t - 12.2) / 0.9);
    names.forEach((n, i) => { const d = i - 2; phone(ctx, W / 2 + d * 230 * spread, 1180 + Math.abs(d) * 60 * spread, 300, d * 0.18 * spread, shot(n)); });
    if (t > 15.0) wipe(ctx, t, 15.0, INK, 'sweep');
    return;
  }
  // 15.5–19.5: Make it yours
  if (t < 19.5) {
    bg(ctx, INK); blob(ctx, 780, 1150, 420, GOLD, t, 9, 0.12);
    const slide = easeOut((t - 15.6) / 0.6); word(ctx, 'Make it', lerp(-300, 330, slide), 520, 130, WHITE, 1, { align: 'center', ls: -4 }); word(ctx, 'YOURS', 330, 680, 170, GOLD, pop(t - 16.3));
    const scr = t < 17.5 ? 'mars' : 'pheasant'; phone(ctx, lerp(1400, 760, easeOut((t - 15.8) / 0.7)), 1150, 400, -0.08 + Math.sin(t * 1.3) * 0.04, shot(scr));
    word(ctx, 'your brand · your story · your style', W / 2, 1720, 44, CREAM, pop(t - 17.0), { ls: 0 });
    if (t > 19.0) wipe(ctx, t, 19.0, GOLD, 'circle', 780, 1150);
    return;
  }
  // 19.5–22.5: SEND YOUR IDEA → ANIMATED → DONE
  if (t < 22.5) {
    const b = Math.floor((t - 19.5) / 0.5);
    const seq = [[GOLD, 'SEND', INK], [GOLD, 'YOUR IDEA', INK], [INK, '↓', GOLD], [WHITE, 'ANIMATED', INK], [GOLD, 'DONE ✓', INK], [GOLD, 'DONE ✓', INK]][Math.min(5, b)];
    bg(ctx, seq[0]); word(ctx, seq[1], W / 2, 960, seq[1].length > 6 ? 200 : 300, seq[2], pop(t - 19.5 - Math.min(b, 4) * 0.5, 0.22), { stretch: 0.08 * Math.max(0, 1 - ((t - 19.5) % 0.5) * 6) });
    if (b >= 4) sparkles(ctx, W / 2, 960, t, clamp((t - 21.5) / 1.0), 11);
    if (t > 22.0) wipe(ctx, t, 22.0, WHITE, 'circle', W / 2, 960);
    return;
  }
  // 22.5–26.5: logo build + slogan + where to find me
  bg(ctx, WHITE); ribbon(ctx, t, 'rgba(245,176,65,0.25)', 300, 80, 70); ribbon(ctx, t + 1, 'rgba(245,176,65,0.25)', 1650, 80, 70);
  logo(ctx, W / 2, 700, 1.3, pop(t - 22.6, 0.4));
  word(ctx, 'Slumx', W / 2, 960, 120, INK, pop(t - 23.0), { ls: -3 });
  word(ctx, 'Your story.', W / 2, 1110, 90, INK, pop(t - 23.4), { ls: -2 }); word(ctx, 'ANIMATED.', W / 2, 1220, 110, GOLD, pop(t - 23.7));
  const kb = pop(t - 24.3); if (kb > 0) { ctx.save(); ctx.translate(W / 2, 1440); ctx.scale(kb, kb); ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-400, -80, 800, 160, 80); ctx.fill();
    ctx.fillStyle = '#9AA3AE'; ctx.font = font(30); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '3px'; ctx.fillText('FIND ME ON FREELANCER', 0, -28); ctx.fillStyle = GOLD; ctx.font = font(56); ctx.letterSpacing = '0px'; ctx.fillText('🔍 @Slumboyx', 0, 26); ctx.restore(); }
}
window.renderAt = renderAt; window.READY = false;
load().then(() => { window.READY = true; if (location.search.includes('render')) return;
  const ctl = document.getElementById('ctl'), bar = document.getElementById('bar'), btn = document.getElementById('play'); ctl.style.display = 'flex'; let playing = false, t = 0, last = 0;
  const draw = () => { renderAt(t); bar.value = t; }; btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  bar.oninput = () => { t = +bar.value; draw(); }; const tick = now => { if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; last = now; draw(); } requestAnimationFrame(tick); }; draw(); requestAnimationFrame(tick); });
