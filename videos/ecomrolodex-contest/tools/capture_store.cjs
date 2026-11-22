// Records the LIVE blaqcards.com mobile site in a real mobile browser (iPhone 13 emulation, 3x pixels).
// Every frame is a real screenshot of the live page: nothing is redrawn. Output: capture/<clip>/f0000.jpg …
//   node capture_store.cjs <outdir>
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2];
const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const human = u => 0.82 * ease(u) + 0.18 * u;          // a thumb flick: quick middle, soft start and stop
async function shoot(pg, dir, i) { await pg.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 }); }
async function clean(pg) {
  await pg.addStyleTag({ content: 'shopify-chat,#shopify-chat{display:none!important} ::-webkit-scrollbar{display:none}' });
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  // A: homepage scroll
  const A = path.join(OUT, 'home'); fs.mkdirSync(A, { recursive: true });
  await pg.goto('https://blaqcards.com', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await clean(pg);
  for (let y = 0; y < 2600; y += 300) { await pg.evaluate(y => scrollTo(0, y), y); await pg.waitForTimeout(250); }   // let lazy images load
  await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(1500);
  let n = 0;
  for (let i = 0; i < 12; i++) await shoot(pg, A, n++);
  for (let i = 0; i <= 105; i++) { await pg.evaluate(y => scrollTo(0, y), Math.round(1950 * human(i / 105))); await pg.waitForTimeout(40); await shoot(pg, A, n++); }
  for (let i = 0; i < 8; i++) await shoot(pg, A, n++);
  console.log('home frames', n);
  // B: product page
  const B = path.join(OUT, 'product'); fs.mkdirSync(B, { recursive: true });
  await pg.goto('https://blaqcards.com/products/simple-luxury-metal-card', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await clean(pg);
  for (let y = 0; y < 1200; y += 300) { await pg.evaluate(y => scrollTo(0, y), y); await pg.waitForTimeout(250); }
  await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(1500);
  n = 0;
  for (let i = 0; i < 10; i++) await shoot(pg, B, n++);
  for (let i = 0; i <= 45; i++) { await pg.evaluate(y => scrollTo(0, y), Math.round(450 * human(i / 45))); await pg.waitForTimeout(40); await shoot(pg, B, n++); }
  for (let i = 0; i < 14; i++) await shoot(pg, B, n++);
  const btn = pg.locator('.sticky-add-to-cart-button').first();
  const box = await btn.boundingBox(); console.log('product frames', n, 'sticky ATC box (css px)', JSON.stringify(box));
  fs.writeFileSync(path.join(OUT, 'tap.json'), JSON.stringify(box));
  // C: add to cart → drawer slides in (animations slowed 20x so every frame of the real transition is captured)
  const Cdir = path.join(OUT, 'cart'); fs.mkdirSync(Cdir, { recursive: true });
  const cdp = await ctx.newCDPSession(pg); await cdp.send('Animation.enable');
  await btn.click({ noWaitAfter: true });
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.05 });
  n = 0; const t0 = Date.now();
  while (Date.now() - t0 < 16000) await shoot(pg, Cdir, n++);
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 }); await pg.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) await shoot(pg, Cdir, n++);
  console.log('cart frames', n);
  await b.close();
})();
