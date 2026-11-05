// 整站截圖驗收（需 Emulator 與本機伺服器）：node tests/screenshots.js
import { mkdirSync } from 'node:fs';
import { launch, newPage, open } from './pw.js';
import { seed } from './seed.js';

const OUT = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const SHOTS = [
  ['home-guest', 'index.html', null],
  ['home-member', 'index.html', 'alice@example.com'],
  ['tools', 'tools.html', 'alice@example.com'],
  ['tool', 'tool.html?id=field', 'alice@example.com'],
  ['upload', 'upload.html', 'alice@example.com'],
  ['wishes', 'wishes.html', 'alice@example.com'],
  ['cards', 'cards.html', 'alice@example.com'],
  ['admin', 'admin.html', 'admin@example.com'],
  ['help', 'help.html', null],
  ['opening-ssr', 'index.html?card=55', null],
];
const WIDTHS = [[1280, 900], [390, 844]];

await seed();
const b = await launch();
let problems = 0, count = 0;
for (const [w, hgt] of WIDTHS) {
  for (const [name, path, email] of SHOTS) {
    const p = await newPage(b, { width: w, height: hgt });
    await open(p, path, email);
    if (name === 'opening-ssr') {
      await p.waitForSelector('.lc-overlay');
      await p.click('.lc-flip', { force: true });
      await p.waitForTimeout(1500);
    } else {
      const close = p.locator('.lc-overlay button');
      if (await close.count()) await close.click();
      await p.waitForFunction(() => !document.querySelector('.loading'), null, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(600);
    }
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await p.screenshot({ path: `${OUT}${name}-${w}.png`, fullPage: name !== 'opening-ssr' });
    count++;
    if (overflow || p.errors.length) { problems++; console.log(`not ok - ${name}@${w}`, overflow ? 'horizontal scroll' : '', p.errors); }
    else console.log(`ok - ${name}@${w}`);
    await p.context().close();
  }
}
await b.close();
console.log(`${count} screenshots`);
console.log(problems ? `# fail ${problems}` : `# pass ${count}`);
process.exit(problems ? 1 : 0);
