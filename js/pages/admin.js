// 管理員後台
import { h, mount } from '../dom.js';
import { initLayout } from '../layout.js';
import { panel, fill, catBadge, fmtDate, showDialog } from '../ui.js';
import * as A from '../admin.js';
import { listAnnouncements } from '../announcements.js';
import { isHttpsUrl } from '../validate.js';
import { db } from '../firebase.js';
import { collection, query, where, orderBy, limit, getDocs } from '../fb-sdk.js';

const s = await initLayout({ page: 'admin', requires: 'admin' });

if (s.allowed) {
  const body = h('div');
  const TABS = [
    ['pending', '待審核會員', renderPendingUsers],
    ['members', '會員管理', renderMembers],
    ['tools', '待審核工具', renderPendingTools],
    ['anns', '公告管理', renderAnns],
    ['wishes', '許願管理', renderWishes],
  ];
  const tabBar = h('div', { class: 'tabs', role: 'tablist' }, ...TABS.map(([k, label]) =>
    h('button', { dataset: { tab: k }, role: 'tab', onclick: () => show(k) }, label)));
  function show(k) {
    tabBar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === k));
    history.replaceState(null, '', `#${k}`);
    TABS.find(t => t[0] === k)[2](body);
  }
  mount(s.main, panel('管理員後台', {}, tabBar, body));
  show(TABS.some(t => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'pending');

  // 操作包裝：確認、執行、失敗提示、重新整理該分頁
  async function act(msg, fn, refresh) {
    if (msg && !confirm(msg)) return;
    try { await fn(); } catch (e) { console.warn(e); showDialog('操作失敗', '請稍後再試，或確認您的管理員權限。'); }
    refresh();
  }

  const userCard = (u, ...actions) => h('div', { class: 'admin-card' },
    h('dl', { class: 'kv' },
      h('dt', '姓名'), h('dd', h('b', u.realName)),
      h('dt', '職務'), h('dd', u.jobTitle),
      h('dt', '學校'), h('dd', `${u.county} ${u.school}`),
      h('dt', 'Email'), h('dd', u.email || '—'),
      h('dt', '申請時間'), h('dd', fmtDate(u.createdAt) || '—')),
    h('div', { class: 'row-actions' }, ...actions));

  function renderPendingUsers(el) {
    const again = () => renderPendingUsers(el);
    fill(el, () => A.listUsersByStatus('pending'), list => list.length ? h('div', ...list.map(u => userCard(u,
      h('button', { class: 'btn btn-primary btn-small', onclick: () => act(null, () => A.approveUser(u.id), again) }, '通過'),
      h('button', { class: 'btn btn-danger btn-small', onclick: () => act(`確定拒絕「${u.realName}」的申請？對方可以重新申請。`, () => A.rejectUser(u.id), again) }, '拒絕'))))
      : h('p', { class: 'empty' }, '目前沒有待審核的會員。'));
  }

  function renderMembers(el) {
    const again = () => renderMembers(el);
    fill(el, async () => [...await A.listUsersByStatus('approved', 200), ...await A.listUsersByStatus('suspended', 200)],
      list => h('div', ...list.map(u => userCard(u,
        h('span', { class: 'muted small' }, u.status === 'suspended' ? '已停權' : u.role === 'admin' ? '管理員' : '會員'),
        u.id === s.user.uid ? h('span', { class: 'muted small' }, '（這是你）') : [
          u.status === 'suspended'
            ? h('button', { class: 'btn btn-small', onclick: () => act(`恢復「${u.realName}」的帳號？`, () => A.setSuspended(u.id, false), again) }, '恢復')
            : h('button', { class: 'btn btn-danger btn-small', onclick: () => act(`停權「${u.realName}」？`, () => A.setSuspended(u.id, true), again) }, '停權'),
          u.status === 'approved' ? (u.role === 'admin'
            ? h('button', { class: 'btn btn-small', onclick: () => act(`取消「${u.realName}」的管理員權限？`, () => A.setRole(u.id, 'user'), again) }, '取消管理員')
            : h('button', { class: 'btn btn-small', onclick: () => act(`把「${u.realName}」設為管理員？`, () => A.setRole(u.id, 'admin'), again) }, '設為管理員')) : null,
        ]))));
  }

  const linkRow = (label, url) => url
    ? [h('dt', label), h('dd', isHttpsUrl(url) ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url) : url)]
    : [];

  function renderPendingTools(el) {
    const again = () => renderPendingTools(el);
    fill(el, () => A.listPendingTools(), list => list.length ? h('div', ...list.map(t => h('div', { class: 'admin-card' },
      h('p', catBadge(t.category), ' ', h('b', { class: 'tool-name' }, t.name)),
      h('dl', { class: 'kv' },
        h('dt', '摘要'), h('dd', { class: 'tool-summary' }, t.summary),
        h('dt', '分享者'), h('dd', t.author + (t.authorGithub ? `（GitHub：${t.authorGithub}）` : '')),
        ...linkRow('線上使用', t.links.onlineUrl), ...linkRow('下載', t.links.downloadUrl), ...linkRow('原始碼', t.links.sourceUrl)),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-primary btn-small', onclick: () => act(null, () => A.publishTool(t.id), again) }, '發布'),
        h('button', { class: 'btn btn-danger btn-small', onclick: () => act(`確定退回「${t.name}」？工具資料會被刪除。`, () => A.returnTool(t.id), again) }, '退回')))))
      : h('p', { class: 'empty' }, '目前沒有待審核的工具。'));
  }

  function renderAnns(el) {
    const again = () => renderAnns(el);
    const form = (a = {}) => {
      const f = h('form', { class: 'form admin-card' },
        h('label', '標題', h('input', { name: 'title', value: a.title ?? '', maxlength: '60', required: true })),
        h('label', '內容', h('textarea', { name: 'body', maxlength: '1000' }, a.body ?? '')),
        h('label', '日期', h('input', { name: 'date', type: 'date', value: a.date ?? new Date().toISOString().slice(0, 10), required: true })),
        h('label', { class: 'inline' }, h('input', { name: 'pinned', type: 'checkbox', checked: a.pinned || undefined }), ' 置頂'),
        h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, a.id ? '儲存' : '新增公告')));
      f.addEventListener('submit', e => {
        e.preventDefault();
        const v = { id: a.id, title: f.title.value.trim(), body: f.body.value.trim(), date: f.date.value, pinned: f.pinned.checked };
        if (!v.title) return;
        act(null, () => A.saveAnnouncement(v), again);
      });
      return f;
    };
    fill(el, () => listAnnouncements(0, true), list => h('div', form(), ...list.map(a => h('div', { class: 'admin-card' },
      h('p', a.pinned ? '📌 ' : '', h('b', a.title), h('span', { class: 'muted small' }, `　${a.date}`)),
      h('p', { class: 'tool-summary' }, a.body),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-small', onclick: e => e.target.closest('.admin-card').replaceWith(form(a)) }, '編輯'),
        h('button', { class: 'btn btn-danger btn-small', onclick: () => act(`刪除公告「${a.title}」？`, () => A.deleteAnnouncement(a.id), again) }, '刪除'))))));
  }

  function renderWishes(el) {
    const again = () => renderWishes(el);
    fill(el, async () => {
      const [wishes, tools] = await Promise.all([
        getDocs(query(collection(db, 'wishes'), orderBy('createdAt', 'desc'), limit(100))).then(r => r.docs.map(d => ({ id: d.id, ...d.data() }))),
        A.listPublishedTools(),
      ]);
      return { wishes, tools };
    }, ({ wishes, tools }) => wishes.length ? h('div', ...wishes.map(w => {
      const sel = h('select', { 'aria-label': '對應工具' }, h('option', { value: '' }, '（選擇實現此願望的工具）'),
        ...tools.map(t => h('option', { value: t.id, selected: t.id === w.doneToolId || undefined }, t.name)));
      return h('div', { class: 'admin-card' },
        h('p', catBadge(w.category), ' ', h('b', w.title), h('span', { class: 'muted small' }, `　+1 × ${w.voteCount}・${w.byName}・${w.status === 'done' ? '已實現' : '許願中'}`)),
        w.detail ? h('p', { class: 'tool-summary' }, w.detail) : null,
        h('div', { class: 'row-actions' }, sel,
          h('button', { class: 'btn btn-primary btn-small', onclick: () => act(null, () => A.markWishDone(w.id, sel.value || null), again) }, '標記已實現'),
          w.status === 'done' ? h('button', { class: 'btn btn-small', onclick: () => act(null, () => A.markWishDone(w.id, undefined), again) }, '改回許願中') : null));
    })) : h('p', { class: 'empty' }, '目前沒有願望。'));
  }
}
