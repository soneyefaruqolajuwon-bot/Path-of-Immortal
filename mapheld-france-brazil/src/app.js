/* Mapheld — "France's Longest Border Is Brazil"
   Deterministic renderer: render(t) draws the full 1080×1920 frame for any time t (seconds).
   The preview plays it in real time; scripts/render.mjs steps it frame by frame for the MP4. */
window.MAPHELD_INIT = function () {
  const { GEO, ICONS, TL } = window;
  const { T, E } = TL;
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1080, H = 1920;
  const C = {
    ocean: '#1E4D5C', land: '#8A855C', hi: '#ABA46E', coast: '#A39E74', border: '#D2CCA2',
    gold: '#F5C542', ink: '#0F2F3A', white: '#FFFFFF', red: '#E0614F', jungle: '#5F7F45'
  };
  const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ramp = (t, a, b) => clamp((t - a) / (b - a));
  const eio = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const eout = u => 1 - Math.pow(1 - u, 3);
  const ein = u => u * u * u;
  const back = u => { const c1 = 1.9, c3 = c1 + 1; return u <= 0 ? 0 : u >= 1 ? 1 : 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
  const win = (t, a, b, d = 0.35) => Math.min(ramp(t, a, a + d), 1 - ramp(t, b - d, b));
  const merc = (lon, lat) => [lon, -180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, u) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(u))).toString(16).padStart(2, '0')).join(''); };
  const fmt = n => Math.round(n).toLocaleString('en-US');

  // ---------- dom ----------
  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const set = (e, attrs) => { for (const k in attrs) e.setAttribute(k, attrs[k]); };
  const show = (e, o) => { e.setAttribute('opacity', clamp(o).toFixed(3)); e.style.display = o <= 0.001 ? 'none' : ''; };
  const place = (e, x, y, s = 1) => e.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})`);

  // ---------- camera ----------
  const K = (t, lon, lat, w, fy = 0.5) => ({ t, c: merc(lon, lat), w, fy });
  const CAM = [
    K(0, 2.6, 46.6, 30, 0.47),
    K(T.fb, 2.6, 46.6, 23, 0.47),
    K(T.fb + 1.7, -0.8, 43.6, 11.5, 0.46),
    K(T.meanwhile, -0.8, 43.6, 10.5, 0.46),
    K(T.sa, -24, 26, 118, 0.48),
    K(E.shares, -53.1, 3.75, 8.6, 0.45),
    K(T.because + 0.6, -53.1, 3.75, 8.3, 0.45),
    K(T.coast, -55.0, 3.6, 18, 0.56),
    K(T.legally, -55.0, 3.6, 16.5, 0.56),
    K(T.dept + 1.0, -53.0, 3.9, 10, 0.64),
    K(T.people, -53.0, 3.9, 9.6, 0.64),
    K(T.vote, -52.9, 4.25, 7.8, 0.62),
    K(T.next, -52.9, 4.25, 7.2, 0.62),
    K(T.next + 2.6, -24, 27, 118, 0.5),
    K(T.deep, -24, 27, 108, 0.5),
    K(T.deep + 2.2, -57, -1.0, 34, 0.5),
    K(TL.DURATION, -57, -1.0, 29, 0.5)
  ];
  function camAt(t) {
    let i = 0;
    while (i < CAM.length - 2 && t >= CAM[i + 1].t) i++;
    const a = CAM[i], b = CAM[i + 1];
    const u = eio(ramp(t, a.t, b.t));
    const w = Math.exp(lerp(Math.log(a.w), Math.log(b.w), u));
    // Tie the pan to the zoom on big zoom moves, so the camera never whips across while zoomed in.
    const f = Math.abs(Math.log(b.w / a.w)) > 0.3 ? (w - a.w) / (b.w - a.w) : u;
    return { cx: lerp(a.c[0], b.c[0], f), cy: lerp(a.c[1], b.c[1], f), w, fy: lerp(a.fy, b.fy, u) };
  }

  // ================= build scene =================
  const svg = document.getElementById('stage');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.fontFamily = FONT;
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <filter id="landShadow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <feDropShadow dx="0" dy="7" stdDeviation="9" flood-color="#000" flood-opacity="0.42"/>
    </filter>
    <filter id="uiShadow" x="-20%" y="-30%" width="140%" height="170%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.45"/>
    </radialGradient>
    <linearGradient id="capShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#08191F" stop-opacity="0"/><stop offset="1" stop-color="#08191F" stop-opacity="0.7"/>
    </linearGradient>
    <linearGradient id="trail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF3C4" stop-opacity="0.95"/><stop offset="0.25" stop-color="#FFFFFF" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.15"/>
    </linearGradient>`;

  el('rect', { width: W, height: H, fill: C.ocean }, svg);
  const camGrat = el('g', {}, svg);
  const grat = el('path', { d: GEO.graticule, fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.055 }, camGrat);
  const camLand = el('g', {}, el('g', { filter: 'url(#landShadow)' }, svg));
  const byName = {};
  for (const c of GEO.countries) byName[c.name] = el('path', { d: c.d, fill: C.land }, camLand);
  el('path', { d: GEO.france.other, fill: C.land }, camLand);
  const frMetro = el('path', { d: GEO.france.metro, fill: C.hi }, camLand);
  const frGuiana = el('path', { d: GEO.france.guiana, fill: C.land }, camLand);

  const camLines = el('g', { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
  const coast = el('path', { d: GEO.borders.coast, stroke: C.coast }, camLines);
  const internal = el('path', { d: GEO.borders.internal, stroke: C.border }, camLines);
  const guianaRing = el('path', { d: GEO.france.guiana, stroke: C.gold }, camLines);
  function goldLine(d) {
    const g = el('g', {}, camLines);
    const layers = [[18, 0.16], [9, 0.35], [4.2, 1]].map(([w, o]) =>
      ({ w, p: el('path', { d, stroke: C.gold, 'stroke-opacity': o, pathLength: 1 }, g) }));
    return { g, layers };
  }
  const goldEs = goldLine(GEO.borders.frEs);
  const goldBr = goldLine(GEO.borders.frBr);
  const arc = el('path', { d: GEO.arc, stroke: C.white, 'stroke-opacity': 0.9, pathLength: 1 }, camLines);

  const camGroups = [camGrat, camLand, camLines];
  const vignette = el('rect', { width: W, height: H, fill: 'url(#vignette)' }, svg);
  const ui = el('g', {}, svg);

  // ---------- UI builders ----------
  function text(parent, str, o = {}) {
    const t = el('text', {
      'font-size': o.size || 40, 'font-weight': o.weight || 800, fill: o.fill || C.white,
      'text-anchor': o.anchor || 'middle', 'letter-spacing': o.ls || 0
    }, parent);
    if (o.stroke) set(t, { stroke: o.stroke, 'stroke-width': o.sw || 10, 'paint-order': 'stroke', 'stroke-linejoin': 'round' });
    if (o.italic) t.setAttribute('font-style', 'italic');
    t.textContent = str;
    return t;
  }
  function chip(str, o = {}) {
    const size = o.size || 34, pad = o.pad || 26;
    const g = el('g', { filter: 'url(#uiShadow)' }, ui);
    const r = el('rect', { fill: o.bg || C.ink, 'fill-opacity': o.bgOp ?? 0.92 }, g);
    if (o.border) set(r, { stroke: o.border, 'stroke-width': 3 });
    const tx = text(g, str, { size, weight: o.weight || 800, fill: o.fill || C.white, ls: o.ls ?? 1.5 });
    const h = size * 1.75;
    const w = tx.getComputedTextLength() + pad * 2;
    set(r, { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2 });
    set(tx, { y: size * 0.36 });
    const tip = o.pointer === false ? 0 : 16;
    if (tip) el('path', { d: `M-14 ${h / 2 - 1} L0 ${h / 2 + tip} L14 ${h / 2 - 1} Z`, fill: o.bg || C.ink, 'fill-opacity': o.bgOp ?? 0.92 }, g);
    g.style.display = 'none';
    return { g, w, h, lift: h / 2 + tip };
  }
  function icon(parent, name, size) {
    const g = el('g', {}, parent);
    const inner = el('g', { transform: `scale(${size / 100}) translate(-50 -50)` }, g);
    inner.innerHTML = ICONS[name]();
    return g;
  }

  // Hook
  const lblFrance = text(ui, 'FRANCE', { size: 58, weight: 900, ls: 8, stroke: C.ink, sw: 12 });
  const chipSpain = chip('SPAIN?', { size: 44 });
  const chipGermany = chip('GERMANY?', { size: 44 });
  const brazilCard = el('g', { filter: 'url(#uiShadow)' }, ui);
  el('rect', { x: -230, y: -40, width: 460, height: 440, rx: 40, fill: C.ink, 'fill-opacity': 0.94, stroke: C.gold, 'stroke-width': 4 }, brazilCard);
  const mb = el('g', { transform: 'translate(-140 -10) scale(1.75)' }, brazilCard);
  el('path', { d: GEO.mini.brazil.brazil, fill: C.land }, mb);
  el('path', { d: GEO.mini.brazil.guiana, fill: C.gold }, mb);
  text(brazilCard, 'BRAZIL', { size: 64, weight: 900, fill: C.gold, ls: 6 }).setAttribute('y', 360);

  // Reveal
  const lbl387 = text(ui, '', { size: 104, weight: 900, fill: C.gold, stroke: C.ink, sw: 14 });
  const lbl453 = text(ui, '', { size: 104, weight: 900, fill: C.gold, stroke: C.ink, sw: 14 });
  const chipFar = chip('4,000+ MILES', { size: 40, fill: C.gold, pointer: false });
  const lblAtlantic = text(ui, 'ATLANTIC OCEAN', { size: 40, weight: 600, ls: 14, italic: true, fill: '#BFD6DC' });
  const lblSA = text(ui, 'SOUTH AMERICA', { size: 44, weight: 700, ls: 14, fill: '#E9E5C8' });
  const dotParis = el('circle', { r: 11, fill: C.white, stroke: C.gold, 'stroke-width': 5 }, ui);
  const dotCay = el('circle', { r: 11, fill: C.white, stroke: C.gold, 'stroke-width': 5 }, ui);
  const arcHead = el('circle', { r: 9, fill: C.gold }, ui);

  const bars = el('g', { filter: 'url(#uiShadow)' }, ui);
  el('rect', { x: 60, y: 0, width: 960, height: 330, rx: 40, fill: C.ink, 'fill-opacity': 0.94 }, bars);
  text(bars, "FRANCE'S LONGEST LAND BORDERS", { size: 30, weight: 700, anchor: 'start', ls: 3, fill: '#9FBEC6' }).setAttribute('transform', 'translate(110 72)');
  const BAR_X = 300, BAR_MAX = 520;
  const barRow = (y, name, color) => {
    text(bars, name, { size: 42, weight: 700, anchor: 'start' }).setAttribute('transform', `translate(110 ${y + 15})`);
    el('rect', { x: BAR_X, y: y - 26, width: BAR_MAX, height: 52, rx: 26, fill: '#FFFFFF', 'fill-opacity': 0.07 }, bars);
    const bar = el('rect', { x: BAR_X, y: y - 26, height: 52, rx: 26, fill: color }, bars);
    const val = text(bars, '', { size: 46, weight: 900, anchor: 'end', fill: color === C.gold ? C.gold : C.white });
    val.setAttribute('transform', `translate(985 ${y + 17})`);
    return { bar, val };
  };
  const rowEs = barRow(150, 'Spain', '#C9C39A');
  const rowBr = barRow(250, 'Brazil', C.gold);

  // How it happened
  const chipGuiana = chip('FRENCH GUIANA', { size: 42, border: C.gold });
  const chipCoast = chip("SOUTH AMERICA'S NORTHERN COAST", { size: 32 });
  function card(y, str, kind) {
    const g = el('g', { filter: 'url(#uiShadow)' }, ui);
    const good = kind === 'check';
    el('rect', { x: -420, y: -62, width: 840, height: 124, rx: 30, fill: C.ink, 'fill-opacity': 0.94,
      stroke: good ? C.gold : 'none', 'stroke-width': 4 }, g);
    el('circle', { cx: -340, cy: 0, r: 40, fill: good ? C.gold : C.red }, g);
    const ic = icon(g, kind, 52); set(ic, { transform: 'translate(-340 0)', color: good ? C.ink : C.white });
    const tx = text(g, str, { size: good ? 46 : 48, weight: good ? 900 : 700, anchor: 'start', fill: good ? C.gold : C.white });
    set(tx, { x: -272, y: 16 });
    let len = tx.getComputedTextLength();
    if (len > 650) { const fs = (good ? 46 : 48) * 650 / len; tx.setAttribute('font-size', fs.toFixed(1)); tx.setAttribute('y', (fs * 0.35).toFixed(1)); len = 650; }
    const strike = el('line', { x1: -282, y1: 2, x2: -282, y2: 2, stroke: C.red, 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
    strike.style.display = 'none';
    g.style.display = 'none';
    return { g, y, len, strike };
  }
  const cardColony = card(300, 'A colony', 'cross');
  const cardSemi = card(450, 'Semi-independent', 'cross');
  const cardDept = card(290, 'Overseas department of France', 'check');

  const equation = el('g', { filter: 'url(#uiShadow)' }, ui);
  el('rect', { x: -420, y: 0, width: 840, height: 316, rx: 36, fill: C.ink, 'fill-opacity': 0.94 }, equation);
  const eqSide = (x, mini, dot, name) => {
    const g = el('g', { transform: `translate(${x - 100} 12) scale(1.25)` }, equation);
    el('path', { d: mini.d, fill: C.hi }, g);
    el('circle', { cx: dot[0], cy: dot[1], r: 7, fill: C.white, stroke: C.gold, 'stroke-width': 3 }, g);
    text(equation, name, { size: 36, weight: 800 }).setAttribute('transform', `translate(${x} 282)`);
  };
  eqSide(-230, GEO.mini.france, GEO.mini.france.paris, 'Paris');
  eqSide(230, GEO.mini.guiana, GEO.mini.guiana.cayenne, 'Cayenne');
  text(equation, '=', { size: 120, weight: 900, fill: C.gold }).setAttribute('transform', 'translate(0 160)');
  text(equation, 'BOTH FRANCE', { size: 26, weight: 800, ls: 4, fill: '#9FBEC6' }).setAttribute('transform', 'translate(0 225)');

  // Quirks
  function badge(iconName, label) {
    const g = el('g', {}, ui);
    el('circle', { r: 118, fill: C.ink, 'fill-opacity': 0.94, filter: 'url(#uiShadow)' }, g);
    el('circle', { r: 118, fill: 'none', stroke: C.gold, 'stroke-width': 4, 'stroke-opacity': 0.8 }, g);
    icon(g, iconName, 168);
    const lb = text(g, label, { size: 32, weight: 800, ls: 2, stroke: C.ink, sw: 10 });
    lb.setAttribute('y', 172);
    g.style.display = 'none';
    return { g, lb };
  }
  const bVote = badge('ballot', 'FRENCH VOTE');
  const bEuro = badge('euro', 'THE EURO');
  const bPass = badge('flag', 'PASSPORT');
  const passMini = icon(bPass.g, 'passport', 92); set(passMini, { transform: 'translate(78 70) rotate(10)' });
  const BADGES = [[bVote, 'vote', 215], [bEuro, 'euro', 540], [bPass, 'passport', 865]];

  const pin = icon(ui, 'pin', 92);
  const chipKourou = chip('KOUROU SPACEPORT', { size: 34, fill: C.gold, pointer: false });
  const trail = el('rect', { fill: 'url(#trail)', rx: 14 }, ui);
  const puffs = Array.from({ length: 7 }, () => el('circle', { fill: '#F2F0E6' }, ui));
  const rocket = el('g', {}, ui);
  const rocketInner = el('g', { transform: 'translate(-50 -82)' }, rocket);
  const flame = el('g', {}, rocketInner);
  flame.innerHTML = ICONS.flame();
  el('g', {}, rocketInner).innerHTML = ICONS.rocket();

  // Close
  const ringA = el('circle', { fill: 'none', stroke: C.gold }, ui);
  const ringB = el('circle', { fill: 'none', stroke: C.gold }, ui);
  const lblFrance2 = text(ui, 'FRANCE', { size: 40, weight: 900, ls: 6, stroke: C.ink, sw: 10 });
  const lblGuiana2 = text(ui, 'FRENCH GUIANA', { size: 34, weight: 900, ls: 3, fill: C.gold, stroke: C.ink, sw: 10 });
  const chipQ = chip("FRANCE'S BIGGEST NEIGHBOR?", { size: 40, pointer: false, border: C.gold });
  const chipNotEu = chip('✕  NOT IN EUROPE', { size: 38, bg: C.red, bgOp: 0.95 });
  const lblBrazil = text(ui, 'BRAZIL', { size: 96, weight: 900, ls: 14, fill: '#EDEAD2', stroke: C.ink, sw: 12 });
  const chipAmazon = chip('AMAZON RAINFOREST', { size: 40, bg: '#2F4F22', bgOp: 0.95, pointer: false });

  // Captions
  el('rect', { y: 1160, width: W, height: H - 1160, fill: 'url(#capShade)' }, ui);
  const capG = el('g', {}, ui);
  const cap = el('text', { 'font-size': 82, 'font-weight': 800, fill: C.white, 'text-anchor': 'middle',
    stroke: '#08191F', 'stroke-width': 12, 'stroke-opacity': 0.55, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, capG);
  let capChunk = null;

  // End card
  const endBg = el('rect', { width: W, height: H, fill: C.ink }, svg);
  const endG = el('g', {}, svg);
  const logo = el('g', { transform: 'translate(-110 -230) scale(2.2)' }, endG);
  logo.innerHTML = ICONS.logoMark();
  text(endG, 'MAPHELD', { size: 130, weight: 900, ls: 10 }).setAttribute('y', 110);
  const endSub = text(endG, 'Follow for more map facts', { size: 44, weight: 600, fill: '#BFD6DC' });
  endSub.setAttribute('y', 200);

  // ================= render =================
  function render(t) {
    const cam = camAt(t);
    const k = W / cam.w, tx = W / 2 - cam.cx * k, ty = H * cam.fy - cam.cy * k;
    const tf = `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(5)})`;
    for (const g of camGroups) g.setAttribute('transform', tf);
    const px = v => (v / k).toFixed(5);
    const S = (x, y) => [x * k + tx, y * k + ty];
    const SL = (lon, lat) => S(...merc(lon, lat));
    const SP = name => S(...GEO.points[name]);

    set(grat, { 'stroke-width': px(1.2) });
    set(coast, { 'stroke-width': px(1.3) });
    set(internal, { 'stroke-width': px(1.7) });

    // ---- land fills ----
    const pSpain = win(t, T.spain, T.reality + 0.3, 0.3), pGer = win(t, T.germany, T.reality + 0.3, 0.3);
    byName.Spain.setAttribute('fill', mix(C.land, '#B8B07A', pSpain * (0.75 + 0.25 * Math.sin(t * 9))));
    byName.Germany.setAttribute('fill', mix(C.land, '#B8B07A', pGer * (0.75 + 0.25 * Math.sin(t * 9))));
    const flash = win(t, T.brazil, T.brazil + 1.0, 0.25);
    frMetro.setAttribute('fill', mix(C.hi, '#D8CF8E', flash));
    frGuiana.setAttribute('fill', mix(C.land, C.hi, ramp(t, T.sa, T.sa + 1.2)));
    byName.Brazil.setAttribute('fill', mix(C.land, C.jungle, eio(ramp(t, T.deep, T.deep + 1.8))));
    const ringO = win(t, T.fg, T.fg + 2.2, 0.4) * (0.6 + 0.4 * Math.sin(t * 6)) + win(t, T.deep + 1.5, 70, 0.6) * 0.5;
    set(guianaRing, { 'stroke-width': px(4), 'stroke-opacity': ringO.toFixed(3) });

    // ---- gold borders ----
    const drawGold = (gl, p, glow) => {
      show(gl.g, p > 0.001 ? 1 : 0);
      for (const L of gl.layers) set(L.p, { 'stroke-width': px(L.w * (L.w > 5 ? glow : 1)), 'stroke-dasharray': `${p.toFixed(4)} 2` });
    };
    drawGold(goldEs, eio(ramp(t, T.fb + 0.9, E.m387 + 0.2)), 1);
    const brPulse = 1 + 0.35 * Math.sin(t * 5) * win(t, T.m453 + 1.6, 70, 0.5);
    drawGold(goldBr, eio(ramp(t, T.m453 - 0.3, T.m453 + 1.5)), brPulse);

    // ---- hook ----
    { const [x, y] = SL(2.3, 46.9); show(lblFrance, win(t, 0.3, T.fb + 0.8, 0.5)); place(lblFrance, x, y, 1); }
    const popChip = (c, lon, lat, a, b) => {
      const o = win(t, a, b, 0.3); show(c.g, o);
      if (o > 0) { const [x, y] = SL(lon, lat); c.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.6 + 0.4 * back(ramp(t, a, a + 0.45))).toFixed(3)}) translate(0 ${-c.lift})`); }
    };
    popChip(chipSpain, -3.7, 40.2, T.spain, T.reality + 0.4);
    popChip(chipGermany, 10.3, 51.0, T.germany, T.reality + 0.4);
    { const o = win(t, T.brazil, T.fb + 0.9, 0.3); show(brazilCard, o); place(brazilCard, 540, 190 + 30 * (1 - eout(ramp(t, T.brazil, T.brazil + 0.5))), 0.7 + 0.3 * back(ramp(t, T.brazil, T.brazil + 0.5))); }

    // ---- reveal: 387 ----
    { const p = eio(ramp(t, T.fb + 0.9, E.m387 + 0.2)); const o = win(t, T.fb + 0.9, T.meanwhile + 0.7, 0.3);
      lbl387.textContent = `${fmt(387 * p)} Miles`; show(lbl387, o);
      const [x, y] = SL(-1.2, 41.6); place(lbl387, x, y, 1 + 0.12 * win(t, E.m387 + 0.1, E.m387 + 0.7, 0.15)); }

    // ---- arc Paris → Cayenne ----
    const arcO = Math.max(win(t, T.far - 0.3, T.shares + 0.9, 0.3), win(t, T.next + 1.6, T.deep + 0.6, 0.4));
    const arcP = t < T.next ? eio(ramp(t, T.far - 0.3, E.sa)) : eio(ramp(t, T.next + 1.6, T.next + 3.2));
    set(arc, { 'stroke-width': px(4), 'stroke-dasharray': `${arcP.toFixed(4)} 2`, opacity: arcO.toFixed(3) });
    show(arcHead, arcO * (arcP < 0.995 ? 1 : 0));
    if (arcO > 0) {
      const L = arc.getTotalLength(); const pt = arc.getPointAtLength(L * arcP);
      const [hx, hy] = S(pt.x, pt.y); set(arcHead, { cx: hx, cy: hy });
    }
    { const [x, y] = SP('paris'); set(dotParis, { cx: x, cy: y }); show(dotParis, arcO); }
    { const [x, y] = SP('cayenne'); set(dotCay, { cx: x, cy: y }); show(dotCay, arcO); }
    { const o = win(t, T.far, T.shares + 0.6, 0.3); show(chipFar.g, o);
      if (o > 0) { const [x, y] = S(...GEO.arcMid); place(chipFar.g, x + 40, y - 70, 0.6 + 0.4 * back(ramp(t, T.far, T.far + 0.45))); } }
    { const o = Math.max(win(t, T.meanwhile + 0.8, T.shares, 0.4), win(t, T.next + 2.2, T.deep + 0.5, 0.4)) * 0.8;
      const [x, y] = SL(-38, 28); show(lblAtlantic, o); place(lblAtlantic, x, y, 1); }

    // ---- reveal: 453 + bars ----
    { const p = eio(ramp(t, T.m453 - 0.3, T.m453 + 1.5)); const o = win(t, T.m453 - 0.2, T.because + 0.9, 0.3);
      lbl453.textContent = `${fmt(453 * p)} Miles`; show(lbl453, o);
      const [x, y] = SL(-53.25, 1.55); place(lbl453, x, y + 20, 1 + 0.12 * win(t, T.m453 + 1.4, T.m453 + 2.0, 0.15)); }
    { const a = T.withbrazil - 0.3, o = win(t, a, T.because + 1.2, 0.4); show(bars, o);
      bars.setAttribute('transform', `translate(0 ${(200 - 50 * (1 - eout(ramp(t, a, a + 0.6)))).toFixed(1)})`);
      const pe = eout(ramp(t, a + 0.2, a + 1.2)), pb = eout(ramp(t, a + 0.5, a + 1.7));
      set(rowEs.bar, { width: Math.max(52, BAR_MAX * 387 / 453 * pe) }); rowEs.val.textContent = `${fmt(387 * pe)} mi`;
      set(rowBr.bar, { width: Math.max(52, BAR_MAX * pb) }); rowBr.val.textContent = `${fmt(453 * pb)} mi`; }

    // ---- how it happened ----
    const pinChip = (c, x, y, a, b, extra = 0) => {
      const o = win(t, a, b, 0.3); show(c.g, o);
      if (o > 0) c.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.6 + 0.4 * back(ramp(t, a, a + 0.45))).toFixed(3)}) translate(0 ${-c.lift - extra})`);
    };
    { const [x, y] = SP('guianaLabel'); pinChip(chipGuiana, x, y, T.fg, T.people + 0.4, 10); }
    { const [x, y] = SL(-56.0, 6.9); pinChip(chipCoast, x, y, T.coast, T.legally + 0.2); }
    { const [x, y] = SL(-57.5, 0.2); show(lblSA, win(t, T.coast - 0.3, T.dept + 0.6, 0.5) * 0.75); place(lblSA, x, y, 1); }
    const showCard = (cd, a, b, strikeAt) => {
      const o = win(t, a, b, 0.35); cd.g.style.display = o > 0 ? '' : 'none'; cd.g.setAttribute('opacity', o.toFixed(3));
      const s = 0.85 + 0.15 * back(ramp(t, a, a + 0.45));
      cd.g.setAttribute('transform', `translate(540 ${cd.y}) scale(${s.toFixed(3)})`);
      if (strikeAt) { const sp = eout(ramp(t, strikeAt, strikeAt + 0.45)); cd.strike.style.display = sp > 0 ? '' : 'none';
        set(cd.strike, { x2: (-282 + (cd.len + 20) * sp).toFixed(1) }); }
    };
    showCard(cardColony, T.colony, T.legally + 0.3, T.colony + 0.7);
    showCard(cardSemi, T.semi, T.legally + 0.3, T.semi + 0.8);
    showCard(cardDept, T.dept, T.people + 0.3);
    { const o = win(t, T.paris, T.people + 0.3, 0.35); show(equation, o);
      equation.setAttribute('transform', `translate(540 ${(430 + 40 * (1 - eout(ramp(t, T.paris, T.paris + 0.5)))).toFixed(1)})`); }

    // ---- quirks ----
    const toTop = eio(ramp(t, T.esa - 0.2, T.esa + 0.7));
    for (const [b, tag, x] of BADGES) {
      const a = T[tag], o = win(t, a, T.launch + 1.2, 0.4);
      show(b.g, o);
      if (o > 0) {
        const s = back(ramp(t, a, a + 0.5)) * lerp(1, 0.62, toTop);
        place(b.g, lerp(x, 540 + (x - 540) * 0.68, toTop), lerp(560, 300, toTop), Math.max(0.001, s));
        show(b.lb, 1 - toTop * 0.999 + 0.001);
      }
    }
    const [kx, ky] = SP('kourou');
    { const a = T.esa + 0.2; const o = win(t, a, T.launch + 0.3, 0.25); show(pin, o);
      place(pin, kx, ky - 46 - 260 * (1 - eout(ramp(t, a, a + 0.5))), 1); }
    { const a = T.esa + 0.5; const o = win(t, a, T.next + 0.3, 0.3); show(chipKourou.g, o);
      if (o > 0) place(chipKourou.g, kx + 40, ky + 150, 0.6 + 0.4 * back(ramp(t, a, a + 0.45))); }
    { const a = T.launch - 0.1, lift = T.launch + 0.7, end = E.space + 0.2;
      const o = win(t, a, end + 0.5, 0.25); show(rocket, o);
      const up = ein(ramp(t, lift, end)) * 1500;
      const shake = t > lift - 0.3 && t < lift + 0.6 ? Math.sin(t * 80) * 2.5 : 0;
      const ry = ky - up;
      place(rocket, kx + shake, ry, 1.9 * (0.4 + 0.6 * back(ramp(t, a, a + 0.4))));
      const ignite = ramp(t, lift - 0.4, lift);
      flame.setAttribute('transform', `translate(0 80) translate(50 0) scale(${(0.5 + 0.5 * ignite).toFixed(3)} ${(ignite * (0.85 + 0.25 * Math.sin(t * 41))).toFixed(3)}) translate(-50 0)`);
      const trO = win(t, lift, end + 0.6, 0.4) * 0.9; show(trail, trO);
      set(trail, { x: kx - 13, y: ry + 150, width: 26, height: Math.max(0, up - 150 + 10) });
      puffs.forEach((pf, i) => {
        const pu = ramp(t, lift - 0.2 + i * 0.12, lift + 2.4 + i * 0.12);
        const dir = i % 2 ? 1 : -1;
        set(pf, { cx: kx + dir * (20 + 80 * eout(pu)) * (1 + i * 0.25), cy: ky + 10 - 25 * eout(pu) - i * 6, r: 14 + 34 * eout(pu) });
        show(pf, Math.min(pu * 6, 1) * (1 - pu) * 0.45 * win(t, lift - 0.2, end + 0.6, 0.4));
      });
    }

    // ---- close ----
    { const o = win(t, T.next + 1.8, T.deep + 0.3, 0.4);
      const ph = (t * 0.9) % 1;
      for (const [ring, pt] of [[ringA, 'paris'], [ringB, 'cayenne']]) {
        const [x, y] = SP(pt); set(ring, { cx: x, cy: y, r: 14 + 46 * ph, 'stroke-width': 5 * (1 - ph) + 1 }); show(ring, o * (1 - ph));
      }
      { const [x, y] = SL(2.3, 52.5); show(lblFrance2, o); place(lblFrance2, x, y - 30, 1); }
      { const [x, y] = SP('cayenne'); show(lblGuiana2, Math.max(o, win(t, T.deep + 1.4, 70, 0.5))); place(lblGuiana2, x, y - 46, 1); } }
    { const a = T.biggest - 0.2, o = win(t, a, T.deep + 0.3, 0.35); show(chipQ.g, o);
      if (o > 0) place(chipQ.g, 540, 300, 0.6 + 0.4 * back(ramp(t, a, a + 0.45))); }
    { const [x, y] = SL(10, 60); pinChip(chipNotEu, x, y, T.notEurope, T.deep + 0.4); }
    { const o = win(t, T.deep + 1.0, 70, 0.6); const [x, y] = SL(-53, -8); show(lblBrazil, o); place(lblBrazil, x, y, 0.9 + 0.1 * eout(ramp(t, T.deep + 1.0, T.deep + 1.8))); }
    { const a = T.amazon, o = win(t, a, 70, 0.35); show(chipAmazon.g, o);
      if (o > 0) { const [x, y] = SL(-62, -2.5); place(chipAmazon.g, x, y, 0.6 + 0.4 * back(ramp(t, a, a + 0.45))); } }

    // ---- captions ----
    const ch = TL.chunkAt(t);
    if (ch !== capChunk) {
      capChunk = ch; cap.textContent = ''; cap.removeAttribute('font-size'); cap.setAttribute('font-size', 82);
      if (ch) {
        ch.text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).forEach(part => {
          const gold = part.startsWith('**');
          const ts = el('tspan', gold ? { fill: C.gold, 'font-weight': 900 } : {}, cap);
          ts.textContent = gold ? part.slice(2, -2) : part;
        });
        const len = cap.getComputedTextLength();
        if (len > 940) cap.setAttribute('font-size', (82 * 940 / len).toFixed(1));
      }
    }
    if (ch) {
      const u = ramp(t, ch.start, ch.start + 0.18);
      show(capG, ramp(t, ch.start, ch.start + 0.1));
      capG.setAttribute('transform', `translate(540 1470) scale(${(0.92 + 0.08 * eout(u)).toFixed(4)})`);
    } else show(capG, 0);

    // ---- end card ----
    const endA = 68.4;
    show(endBg, eout(ramp(t, endA, endA + 0.5)) * 0.97);
    show(endG, ramp(t, endA + 0.2, endA + 0.5));
    place(endG, 540, 900, 0.8 + 0.2 * back(ramp(t, endA + 0.2, endA + 0.8)));
    show(endSub, ramp(t, endA + 0.6, endA + 0.9));
  }

  window.MAPHELD = { render, duration: TL.DURATION, segments: TL.SEGMENTS };
};
