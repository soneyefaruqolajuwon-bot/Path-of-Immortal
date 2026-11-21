// Inlines src/*.js into one self-contained file: out/mapheld-preview.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/<script src="(src\/[\w.]+)"><\/script>/g, (_, f) =>
  `<script>\n${fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`);
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out/mapheld-preview.html'), html);
console.log('out/mapheld-preview.html', (html.length / 1024).toFixed(0), 'KB');
