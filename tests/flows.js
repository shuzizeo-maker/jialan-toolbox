// 端對端流程測試（需先啟動 Emulator 與本機伺服器）：node tests/flows.js <flow|all>
import assert from 'node:assert/strict';
import { launch, newPage, open, BASE } from './pw.js';
import { seed } from './seed.js';

const flows = {};

/** 等 #who 變成指定文字；途中頁面自行重新整理也沒關係 */
async function waitText(page, text, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try { await page.waitForFunction(t => document.getElementById('who')?.textContent === t, text, { timeout: 8000 }); return; }
    catch (e) { if (i === tries - 1) throw e; await page.waitForTimeout(300); }
  }
}

flows.profileAndApprove = async (b) => {
  const u = await newPage(b);
  u.on('dialog', d => d.accept());
  await open(u, 'index.html', 'newbie@example.com');
  await u.waitForURL(/profile\.html/);
  assert.equal(await u.inputValue('[name=county]'), '臺東縣');
  assert.equal(await u.inputValue('[name=school]'), '嘉蘭國小');
  await u.click('button[type=submit]');
  assert.match(await u.textContent('[data-error=realName]'), /真實姓名/);
  await u.fill('[name=realName]', '新老師');
  await u.selectOption('[name=jobTitle]', '教師');
  await u.click('button[type=submit]');
  await u.waitForSelector('.success-box');
  await u.goto(`${BASE}/index.html`);
  await u.waitForFunction(() => document.getElementById('who')?.textContent === '審核中');
  await u.click('.lc-overlay button', { timeout: 3000 }).catch(() => {});
  await u.click('#sidebar a[href^="tools.html?cat="]');
  assert.equal(await u.textContent('dialog[open] h3'), '帳號審核中');

  const a = await newPage(b);
  a.on('dialog', d => d.accept());
  await open(a, 'admin.html', 'admin@example.com');
  const card = a.locator('.admin-card', { hasText: '新老師' });
  await card.waitFor();
  await card.locator('button', { hasText: '通過' }).click();
  await a.locator('.admin-card', { hasText: '新老師' }).waitFor({ state: 'detached' });

  // 審核通過後頁面會自動重新整理
  await waitText(u, '新老師（教師）');
  const g = await newPage(b);
  await open(g, 'admin.html', 'alice@example.com');
  await g.waitForSelector('.gate-box');
  assert.match(await g.textContent('.gate-box h2'), /權限不足/);
  for (const p of [u, a, g]) assert.deepEqual(p.errors, []);
};

flows.likeAndFavorite = async (b) => {
  const g = await newPage(b);
  await open(g, 'tool.html?id=field');
  await g.waitForSelector('.gate-box');
  assert.equal(await g.locator('a[href*="example.github.io"]').count(), 0);

  const m = await newPage(b);
  await open(m, 'tool.html?id=field', 'alice@example.com');
  await m.waitForSelector('#btn-like');
  assert.ok(await m.locator('a[href="https://example.github.io/field/"]').count() === 1);
  const before = +(await m.textContent('#like-count'));
  for (let i = 0; i < 5; i++) await m.click('#btn-like', { force: true, noWaitAfter: true }).catch(() => {});
  await m.waitForFunction(() => !document.getElementById('btn-like').disabled);
  await m.waitForTimeout(800);
  const shown = +(await m.textContent('#like-count'));
  assert.ok(shown === before || shown === before + 1, `shown ${shown} before ${before}`);
  await m.reload();
  await m.waitForSelector('#btn-like');
  const liked = (await m.getAttribute('#btn-like', 'aria-pressed')) === 'true';
  assert.equal(+(await m.textContent('#like-count')), before + (liked ? 1 : 0));

  await m.click('#btn-fav');
  await m.waitForFunction(() => document.getElementById('btn-fav').getAttribute('aria-pressed') === 'true');
  await m.goto(`${BASE}/favorites.html`);
  await m.waitForSelector('.tool-row');
  assert.match(await m.textContent('.tool-row'), /校外教學文件小幫手/);

  await m.goto(`${BASE}/tools.html?cat=student`);
  await m.waitForSelector('.tool-row');
  assert.equal(await m.locator('.tool-row').count(), 1);
  await m.goto(`${BASE}/tools.html`);
  await m.waitForSelector('.tool-row');
  assert.equal(await m.locator('.tool-row').count(), 8);
  await m.fill('#q', '採購');
  assert.equal(await m.locator('.tool-row:visible').count(), 1);
  for (const p of [g, m]) assert.deepEqual(p.errors, []);
};

flows.uploadFlow = async (b) => {
  const evil = '<img src=x onerror=alert(1)>測試';
  const alerts = [];
  const u = await newPage(b);
  u.on('dialog', d => { alerts.push(d.message()); d.dismiss(); });
  await open(u, 'upload.html', 'alice@example.com');
  await u.fill('[name=name]', evil);
  await u.selectOption('[name=category]', 'teaching');
  await u.fill('[name=summary]', '測試摘要');
  await u.fill('[name=author]', '陳老師');
  await u.fill('[name=onlineUrl]', 'http://x.com');
  await u.click('button[type=submit]');
  assert.match(await u.textContent('[data-error=onlineUrl]'), /https/);
  await u.fill('[name=onlineUrl]', 'https://x.github.io/t/');
  await u.click('button[type=submit]');
  await u.waitForSelector('.success-box');
  const toolHref = await u.getAttribute('.success-box a', 'href');

  const a = await newPage(b);
  a.on('dialog', d => { alerts.push(d.message()); d.accept(); });
  await open(a, 'admin.html#tools', 'admin@example.com');
  const card = a.locator('.admin-card', { hasText: '測試摘要' });
  await card.waitFor();
  assert.equal(await card.locator('.tool-name').textContent(), evil);
  assert.equal(await a.locator('img[src=x]').count(), 0);
  await card.locator('button', { hasText: '發布' }).click();
  await card.waitFor({ state: 'detached' });

  await u.goto(`${BASE}/${toolHref}`);
  await u.click('a:has-text("新增版本")');
  await u.waitForSelector('[name=note]');
  await u.fill('[name=note]', '第二版修正');
  await u.click('button[type=submit]');
  await u.waitForSelector('.success-box');

  await a.goto(`${BASE}/index.html`);
  await a.waitForFunction(t => [...document.querySelectorAll('.feed li')].some(li => li.textContent.includes(t) && li.textContent.includes('v2')), evil);
  assert.equal(await a.locator('img[src=x]').count(), 0);
  assert.deepEqual(alerts, []);
  for (const p of [u, a]) assert.deepEqual(p.errors, []);
};

const name = process.argv[2] ?? 'all';
const list = name === 'all' ? Object.keys(flows) : [name];
const b = await launch();
let failed = 0;
for (const f of list) {
  if (!flows[f]) { console.log(`unknown flow ${f}`); failed++; continue; }
  await seed();
  try { await flows[f](b); console.log(`ok - ${f}`); }
  catch (e) { failed++; console.log(`not ok - ${f}\n  ${e.message.split('\n').slice(0, 6).join('\n  ')}`); }
}
await b.close();
console.log(failed ? `# fail ${failed}` : `# pass ${list.length}`);
process.exit(failed ? 1 : 0);
