// Render all SVG assets (or one file) onto a PNG for review: node contact_sheet.cjs out.png [file.svg]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const A = path.resolve(__dirname, '..', 'assets');
const out = process.argv[2], single = process.argv[3];
(async () => {
  const files = single ? [path.resolve(single)] :
    fs.readdirSync(A).filter(f => f.endsWith('.svg') && !f.includes('point_roberts_map')).sort().map(f => path.join(A, f));
  const font = `@font-face{font-family:Montserrat;src:url(file://${A}/fonts/montserrat-latin-800-normal.woff2);font-weight:800}`;
  const html = single
    ? `<html><head><style>${font}body{margin:0}img{width:1600px}</style></head><body><img src="file://${files[0]}"></body></html>`
    : `<html><head><style>${font}body{background:#1E4D5C;margin:0;display:grid;grid-template-columns:repeat(6,260px);gap:6px;padding:6px;font:12px sans-serif;color:#fff}
       div{background:#2a5d6c;text-align:center}img{width:250px;height:200px;object-fit:contain}p{margin:0}</style></head><body>` +
      files.map(f => `<div><img src="file://${f}"><p>${path.basename(f)}</p></div>`).join('') + '</body></html>';
  const tmp = path.join(__dirname, '_sheet.html'); fs.writeFileSync(tmp, html);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await pg.goto('file://' + tmp); await pg.waitForTimeout(600);
  await pg.screenshot({ path: out, fullPage: true }); await b.close(); fs.unlinkSync(tmp);
})();
