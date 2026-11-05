// 共用版型：橫幅、導覽列、左側欄、頁尾、登入閘門、字級
import { h, mount } from './dom.js';
import { onSession, sessionReady, signIn, signOut, getSession } from './auth.js';
import { gateClick, gateMessage, isAdmin, isMember } from './gate.js';
import { startClock, todayKey } from './clock.js';
import { loadHolidays, holidayStatus } from './holidays.js';
import { CATEGORIES } from './categories.js';
import { showDialog } from './ui.js';
import { db, ready } from './firebase.js';
import { collection, query, where, getCountFromServer } from './fb-sdk.js';

const NAV = [
  { href: 'index.html', label: '主畫面', page: 'home' },
  { href: 'tools.html', label: '工具庫', page: 'tools', requires: 'member' },
  { href: 'upload.html', label: '上　傳', page: 'upload', requires: 'member' },
  { href: 'wishes.html', label: '許願池', page: 'wishes', requires: 'member' },
  { href: 'cards.html', label: '卡　冊', page: 'cards', requires: 'member' },
  { href: 'help.html', label: '使用說明', page: 'help' },
  { href: 'admin.html', label: '後　台', page: 'admin', requires: 'admin', adminOnly: true },
];

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

// ---------- 字級 ----------
function applyFontSize(size) {
  document.documentElement.classList.remove('fs-s', 'fs-m', 'fs-l');
  document.documentElement.classList.add(`fs-${size}`);
  store.set('jl_fs', size);
  document.querySelectorAll('.fs-btn').forEach(b => b.classList.toggle('on', b.dataset.size === size));
}

// ---------- 閘門 ----------
export function openGate(info) {
  const actions = [];
  if (info.action === 'login') actions.push({ label: '使用 Google 登入', primary: true, run: signIn });
  if (info.action === 'profile') actions.push({ label: '前往填寫', primary: true, run: () => { location.href = 'profile.html'; } });
  showDialog(info.title, info.message, actions);
}

function installGate() {
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a[data-requires]');
    if (!a) return;
    const s = getSession();
    const info = gateClick(s.state, a.dataset.requires, s.profile);
    if (info) { e.preventDefault(); openGate(info); }
  });
}

/** 受限連結 */
export function link(href, text, requires = 'member', attrs = {}) {
  return h('a', { href, dataset: requires ? { requires } : undefined, ...attrs }, text);
}

// ---------- 橫幅 ----------
function renderTop(s) {
  const who = s.state === 'approved' ? `${s.profile.realName}（${s.profile.jobTitle}）`
    : s.state === 'pending' ? '審核中' : s.state === 'suspended' ? '已停用'
    : s.state === 'noprofile' ? '待填資料' : s.state === 'loading' ? '…' : '訪客';
  const tabs = [h('span', { class: 'who', id: 'who' }, who), h('a', { class: 'tab', href: 'index.html' }, '主畫面')];
  if (s.state === 'guest') tabs.push(h('button', { class: 'tab', id: 'btn-login', onclick: signIn }, 'Google 登入'));
  else if (s.state !== 'loading') {
    if (s.state === 'noprofile' || s.state === 'pending') tabs.push(h('a', { class: 'tab', href: 'profile.html' }, '基本資料'));
    tabs.push(h('button', { class: 'tab', id: 'btn-logout', onclick: signOut }, '登出'));
  }
  return tabs;
}

function banner() {
  const fs = store.get('jl_fs') || 'm';
  return h('header', { class: 'banner' },
    h('a', { class: 'brand', href: 'index.html' },
      h('span', { class: 'logo' }, h('img', { src: './assets/logo.png', alt: '嘉蘭國小校徽', width: '64', height: '64' })),
      h('span', { class: 'brand-text' },
        h('strong', '嘉蘭國小教學行政工具庫'),
        h('small', '好用的工具大家分享，準時下班不是夢'))),
    h('div', { class: 'top-tabs', id: 'top-tabs' }),
    h('div', { class: 'fs-switch' }, h('span', '字級'),
      ...[['s', '小'], ['m', '中'], ['l', '大']].map(([k, t]) =>
        h('button', { class: `fs-btn ${k === fs ? 'on' : ''}`, dataset: { size: k }, onclick: () => applyFontSize(k), 'aria-label': `字級${t}` }, t))));
}

// ---------- 導覽列 ----------
function navbar(page) {
  const clock = h('span', { class: 'clock', id: 'clock' });
  startClock(clock);
  const holiday = h('span', { class: 'holiday', id: 'holiday' });
  return h('nav', { class: 'navbar' },
    h('button', { class: 'hamburger', 'aria-label': '選單', onclick: () => document.body.classList.toggle('side-open') }, '☰'),
    clock,
    h('div', { class: 'nav-links', id: 'nav-links' },
      ...NAV.map(n => h('a', {
        href: n.href, class: n.page === page ? 'on' : '', dataset: { requires: n.requires, adminOnly: n.adminOnly ? '1' : undefined },
        hidden: n.adminOnly ? true : undefined,
      }, n.label))),
    holiday);
}

export const holidaysPromise = (async () => {
  const y = +todayKey().slice(0, 4);
  const [a, b] = await Promise.all([loadHolidays(y), loadHolidays(y + 1)]);
  return [...a, ...b];
})();

async function fillHoliday() {
  const el = document.getElementById('holiday');
  const s = holidayStatus(await holidaysPromise, todayKey());
  if (s.today) el.textContent = `🎌 今天是${s.today.name}，假期愉快！`;
  else if (s.next) el.textContent = `🎌 下個假日：${s.next.name}（${+s.next.date.slice(4, 6)}/${+s.next.date.slice(6)}，還有 ${s.daysUntil} 天）`;
}

// ---------- 左側欄 ----------
function sideBlock(key, title, ...children) {
  const collapsed = store.get(`jl_side_${key}`) === '1';
  const body = h('div', { class: 'side-body', hidden: collapsed || undefined }, ...children);
  return h('section', { class: 'side-block' },
    h('h3', { class: 'side-head' }, title,
      h('button', { class: 'side-toggle', 'aria-label': '收合', onclick: () => {
        body.hidden = !body.hidden; store.set(`jl_side_${key}`, body.hidden ? '1' : '0');
      } }, '−')),
    body);
}

async function loadCounts() {
  try {
    const cached = JSON.parse(sessionStorage.getItem('jl_counts') || 'null');
    if (cached && Date.now() - cached.t < 600000) return cached.v;
  } catch { /* ignore */ }
  if (!ready) return null;
  const base = collection(db, 'tools');
  const pub = where('status', '==', 'published');
  const [total, ...cats] = await Promise.all([
    getCountFromServer(query(base, pub)),
    ...CATEGORIES.map(c => getCountFromServer(query(base, pub, where('category', '==', c.id)))),
  ]);
  const v = { total: total.data().count, cats: Object.fromEntries(CATEGORIES.map((c, i) => [c.id, cats[i].data().count])) };
  try { sessionStorage.setItem('jl_counts', JSON.stringify({ t: Date.now(), v })); } catch { /* ignore */ }
  return v;
}

function sidebar() {
  const memberBox = h('div', { id: 'side-member' });
  const counts = loadCounts().catch(() => null);
  const n = (id) => { const s = h('span', { class: 'count' }, ''); counts.then(v => { if (v) s.textContent = `(${id ? v.cats[id] : v.total})`; }); return s; };
  return h('aside', { class: 'sidebar', id: 'sidebar' },
    sideBlock('member', '會員專區', memberBox),
    sideBlock('lib', '工具庫',
      h('ul', { class: 'side-list' },
        h('li', link('tools.html', ['📁 全部工具', n(null)])),
        h('li', link('favorites.html', '⭐ 我的收藏')))),
    sideBlock('cats', '處室分類',
      h('ul', { class: 'side-list cats' },
        ...CATEGORIES.map(c => h('li', link(`tools.html?cat=${c.id}`, [
          h('b', { class: 'cat-icon', style: { '--c': c.color } }, c.icon), c.name, n(c.id)]))))),
    sideBlock('ops', '常用作業',
      h('ul', { class: 'side-list' },
        h('li', link('upload.html', '📤 上傳工具')),
        h('li', link('wishes.html', '🌠 許願池')),
        h('li', link('cards.html', '🃏 我的卡冊')),
        h('li', h('a', { href: 'help.html' }, '📖 使用說明')))));
}

function renderMember(s) {
  const el = document.getElementById('side-member');
  if (!el) return;
  if (s.state === 'approved') {
    mount(el, h('p', { class: 'hello' }, `${s.profile.realName} 老師，您好！`),
      h('p', { class: 'muted small' }, `${s.profile.school}・${s.profile.jobTitle}`));
  } else if (s.state === 'guest') {
    mount(el, h('p', { class: 'muted small' }, '登入後可以瀏覽與下載工具、按讚、收藏、許願與收集好運卡。'),
      h('button', { class: 'btn btn-primary btn-block', onclick: signIn }, '使用 Google 登入'));
  } else if (s.state === 'loading') {
    mount(el, h('p', { class: 'muted small' }, '確認登入狀態中…'));
  } else {
    const g = gateMessage(s.state);
    mount(el, h('p', { class: 'notice' }, g.message),
      s.state !== 'suspended' ? h('a', { class: 'btn btn-block', href: 'profile.html' }, '查看／修改基本資料') : null);
  }
}

function footer() {
  return h('footer', { class: 'footer' },
    h('p', '嘉蘭國小教學行政工具庫・工具版權屬各分享者所有，請依各工具的授權方式使用。'),
    h('p', { class: 'muted' }, h('a', { href: 'help.html' }, '使用說明'), '｜本站使用 Google 帳號登入，僅蒐集審核所需的基本資料。'));
}

/**
 * 產生版型並回傳確定後的 session。
 * requires 不符合時，main 會顯示閘門訊息，回傳的 session.allowed 為 false。
 */
export async function initLayout({ page, requires = null } = {}) {
  applyFontSize(store.get('jl_fs') || 'm');
  const app = document.getElementById('app');
  const main = h('main', { class: 'main', id: 'main' }, h('p', { class: 'muted loading' }, '載入中…'));
  mount(app, banner(), navbar(page), h('div', { class: 'layout' }, sidebar(), main), footer());
  installGate();
  fillHoliday().catch(() => {});

  onSession(s => {
    mount(document.getElementById('top-tabs'), ...renderTop(s));
    renderMember(s);
    document.querySelectorAll('[data-admin-only]').forEach(a => { a.hidden = !isAdmin(s.state, s.profile); });
  });

  const s = await sessionReady();
  if (s.state === 'noprofile' && page !== 'profile') { location.href = 'profile.html'; return new Promise(() => {}); }
  const info = gateClick(s.state, requires, s.profile);
  if (info) {
    mount(main, h('div', { class: 'gate-box' }, h('h2', info.title), h('p', info.message),
      info.action === 'login' ? h('button', { class: 'btn btn-primary', onclick: signIn }, '使用 Google 登入') : null,
      h('p', h('a', { href: 'index.html' }, '← 回主畫面'))));
    // 登入或審核狀態改變時重新整理，讓頁面重新判斷
    onSession(n => { if (n.state !== 'loading' && n.state !== s.state) location.reload(); });
    return { ...s, allowed: false, main };
  }
  // 權限降級（登出、被停權）時重新整理
  onSession(n => { if (n.state !== 'loading' && n.state !== s.state && (requires || page === 'home')) location.reload(); });
  return { ...s, allowed: true, main, member: isMember(s.state), admin: isAdmin(s.state, s.profile) };
}
