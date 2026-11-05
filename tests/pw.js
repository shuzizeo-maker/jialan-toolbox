// Playwright 共用：把 gstatic 的 Firebase SDK 導到 node_modules（沙箱連不到 CDN），並擋掉外部字型與 CDN
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const fbDir = require.resolve('firebase/package.json').replace(/package\.json$/, '');

export const BASE = 'http://localhost:5500';

export async function launch() { return chromium.launch(); }

export async function newPage(browser, { width = 1280, height = 900, scale = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, locale: 'zh-TW', timezoneId: 'Asia/Taipei' });
  await ctx.route('https://www.gstatic.com/firebasejs/**', route => {
    const file = new URL(route.request().url()).pathname.split('/').pop();
    route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(fbDir + file) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/, r => r.abort());
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  return page;
}

/** 以 Emulator 帳號登入（email 為 null 表示訪客） */
export async function open(page, path, email = null) {
  if (email) {
    // 在不會自動重新整理的 profile 頁登入，避免與目標頁的狀態重載互相干擾
    await page.goto(`${BASE}/profile.html?emu`);
    await page.waitForFunction(() => window.__emuSignIn);
    await page.evaluate(e => window.__emuSignIn(e), email);
    await page.waitForFunction(() => !['訪客', '…'].includes(document.getElementById('who')?.textContent));
    await page.goto(`${BASE}/${path}`);
  } else {
    await page.goto(`${BASE}/${path}${path.includes('?') ? '&' : '?'}emu`);
  }
  await page.waitForFunction(() => document.getElementById('who') && document.getElementById('who').textContent !== '…');
}
