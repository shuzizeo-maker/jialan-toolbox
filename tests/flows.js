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
