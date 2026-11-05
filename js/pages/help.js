// 使用說明（訪客也可看）
import { h, mount } from '../dom.js';
import { initLayout } from '../layout.js';
import { panel } from '../ui.js';
import { RARITIES } from '../luckcard/pool.js';

const s = await initLayout({ page: 'help' });
const sec = (id, title, ...body) => h('section', { id, class: 'help-sec' }, h('h3', title), ...body);
const ol = (...items) => h('ol', ...items.map(i => h('li', i)));

mount(s.main, panel('使用說明', {},
  h('p', '嘉蘭國小教學行政工具庫收錄老師們分享的教學、行政工具。工具本身放在各分享者的 GitHub，本站負責分類、介紹、版本紀錄與熱門排行。'),
  sec('start', '第一次使用：登入、填資料、等審核',
    ol('點右上角「Google 登入」，使用任何 Google 帳號登入。',
      '第一次登入會進入「填寫基本資料」：縣市、學校、真實姓名、職務。本站也開放外校教職員申請。',
      '送出後狀態為「審核中」，管理員通過後重新整理頁面，就能使用所有功能。'),
    h('p', { class: 'muted' }, '未登入或審核中時，可以瀏覽主畫面，但無法開啟工具和其他功能。')),
  sec('use', '如何開啟或下載工具',
    ol('從左側「處室分類」或上方「工具庫」找到工具，可用關鍵字搜尋。',
      '進入工具頁後，依工具提供的方式點選：「▶ 線上使用」直接開啟網頁工具；「⬇ 下載」下載檔案；「</> GitHub 原始碼」查看原始碼。',
      '覺得好用就按「♡ 按讚」，讚數會影響主畫面的熱門排行；按「☆ 收藏」可以在「我的收藏」快速找到。')),
  sec('upload', '如何分享（上傳）工具',
    ol('點「上傳」，填寫工具名稱、處室、摘要、分享者，以及至少一個網址（必須是 https:// 開頭）。',
      '送出後由管理員審核，通過後就會出現在工具庫和主畫面的「最新修正」。',
      '工具有更新時，到工具頁按「＋ 新增版本」寫下修改摘要，版本號會自動加一。')),
  sec('wish', '許願池：找不到就許願',
    h('p', '找不到需要的工具，就到「許願池」許個願。其他老師可以按 +1，讓會做工具的人知道大家最需要什麼。管理員會把已經實現的願望連結到對應的工具。')),
  sec('card', '今日好運卡與卡冊',
    h('p', '每天第一次進站會翻開一張「今日好運卡」，同一個人同一天抽到的卡固定不變。會員抽到的卡會自動收進「卡冊」，看看你能不能集滿 60 張！'),
    h('table', { class: 'rank' }, h('thead', h('tr', h('th', '稀有度'), h('th', '張數'), h('th', '抽中機率'))),
      h('tbody', ...RARITIES.map(r => h('tr', h('td', `${r.id} ${'★'.repeat(r.stars)}`), h('td', { class: 'num' }, String(r.count)), h('td', { class: 'num' }, `${r.weight}%`)))))),
  sec('contact', '聯絡管理員',
    h('p', '帳號審核、工具下架或其他問題，請聯繫嘉蘭國小網站管理員。'))));

if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
