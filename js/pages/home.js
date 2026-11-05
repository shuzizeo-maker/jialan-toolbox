// 主畫面
import { h, mount } from '../dom.js';
import { initLayout, link, holidaysPromise } from '../layout.js';
import { panel, catBadge, verTag, fill, fmtDate, showDialog } from '../ui.js';
import { listLatestVersions, listTopTools, countPublishedTools, countPublishedVersions } from '../tools.js';
import { listAnnouncements } from '../announcements.js';
import { saveTodayCard } from '../cards.js';
import { drawCard, getGuestId } from '../luckcard/draw.js';
import { CARDS } from '../luckcard/pool.js';
import { renderCard, showOpening } from '../luckcard/render.js';
import { shouldShowOpening } from '../luckcard/opening-state.js';
import { todayKey } from '../clock.js';
import { holidayStatus } from '../holidays.js';
import { db, ready, isEmu } from '../firebase.js';
import { doc, getDoc, collection, query, where, getCountFromServer } from '../fb-sdk.js';

const s = await initLayout({ page: 'home' });
const key = todayKey();

// ---------- 今日好運卡 ----------
let result = drawCard(key, s.member ? s.user.uid : getGuestId());
const forced = isEmu && new URLSearchParams(location.search).get('card');
if (forced) result = { ...result, card: CARDS[+forced - 1] ?? result.card };
if (s.member) saveTodayCard(s.user.uid, key, result.card).catch(e => console.warn(e));
if (forced || shouldShowOpening(key)) showOpening(result, key);

const enlarge = () => {
  const d = showDialog('今日好運卡', s.member ? '這張卡已收進你的卡冊。' : '登入會員後，每天抽到的卡都會收進卡冊喔！');
  d.classList.add('dialog-card');
  d.querySelector('h3').after(renderCard(result, { dateKey: key }));
};

// ---------- 版面 ----------
const latest = h('div'), rank = h('div'), stats = h('div'), anns = h('div'), hol = h('div');
mount(s.main, h('div', { class: 'home-grid' },
  h('div', { class: 'home-center' },
    panel('最新修正', { cls: 'o-latest' }, latest),
    panel('熱門工具排行榜', { cls: 'o-rank', extra: h('small', '依按讚數・前 10 名') }, rank)),
  h('div', { class: 'home-right' },
    panel('今日好運卡', { cls: 'accent o-luck', id: 'luck-panel' },
      h('button', { class: 'lc-mini-wrap', onclick: enlarge, 'aria-label': '放大今日好運卡' },
        renderCard(result, { dateKey: key, size: 'thumb' }),
        h('span', { class: 'lc-mini-text' }, h('b', result.card.name), h('br'),
          h('small', { class: 'muted' }, `宜：${result.daily.yi}`), h('br'),
          h('small', { class: 'muted' }, `忌：${result.daily.ji}`), h('br'),
          h('small', { class: 'link-like' }, '點擊放大 🔍')))),
    panel('工具庫統計', { cls: 'red o-stats' }, stats),
    panel('最新公告', { cls: 'o-anns' }, anns),
    panel('近期假日', { cls: 'o-hol' }, hol),
    panel('Help', { cls: 'o-help' }, h('ul', { class: 'side-list help-list' },
      h('li', h('a', { href: 'help.html#start' }, '第一次使用：登入、填資料、等審核')),
      h('li', h('a', { href: 'help.html#use' }, '如何開啟或下載工具')),
      h('li', h('a', { href: 'help.html#upload' }, '如何分享（上傳）工具')),
      h('li', h('a', { href: 'help.html#wish' }, '許願池：找不到就許願')),
      h('li', h('a', { href: 'help.html#card' }, '今日好運卡與卡冊')))))));

if (!ready) {
  const off = h('div', { class: 'error-box' }, '網站尚未完成 Firebase 設定，目前只能顯示版面、時鐘、假日與好運卡。');
  for (const el of [latest, rank, stats, anns]) mount(el, off.cloneNode(true));
} else {
  fill(latest, () => listLatestVersions(8), items => items.length
    ? h('ul', { class: 'feed' }, ...items.map(v => h('li',
        h('span', { class: 'title' }, catBadge(v.category), link(`tool.html?id=${encodeURIComponent(v.toolId)}`, v.toolName), verTag(v.version)),
        h('span', { class: 'meta' }, `${v.note}・${fmtDate(v.createdAt)}`))))
    : h('p', { class: 'empty' }, '目前還沒有工具，歡迎分享第一個！'));

  fill(rank, () => listTopTools(10), items => items.length
    ? h('table', { class: 'rank' },
        h('thead', h('tr', h('th', '名次'), h('th', '工具名稱'), h('th', { class: 'col-cat' }, '處室'), h('th', '讚數'))),
        h('tbody', ...items.map((t, i) => h('tr',
          h('td', { class: `num rank-${i + 1}` }, String(i + 1)),
          h('td', link(`tool.html?id=${encodeURIComponent(t.id)}`, t.name)),
          h('td', { class: 'col-cat' }, catBadge(t.category)),
          h('td', { class: 'likes' }, `❤ ${t.likeCount}`)))))
    : h('p', { class: 'empty' }, '還沒有排行資料。'));

  fill(stats, async () => {
    const [tools, versions, site, pending] = await Promise.all([
      countPublishedTools(), countPublishedVersions(),
      getDoc(doc(db, 'stats/site')).then(d => d.data()?.memberCount ?? 0).catch(() => null),
      s.admin ? getCountFromServer(query(collection(db, 'users'), where('status', '==', 'pending'))).then(r => r.data().count) : null,
    ]);
    return { tools, versions, site, pending };
  }, v => h('ul', { class: 'stat-list' },
    h('li', '收錄工具', h('b', String(v.tools)), '個'),
    h('li', '累計版本修正', h('b', String(v.versions)), '次'),
    v.site != null ? h('li', '已審核會員', h('b', String(v.site)), '位') : null,
    v.pending != null ? h('li', h('a', { href: 'admin.html' }, '待審核會員'), h('b', String(v.pending)), '位') : null));

  fill(anns, () => listAnnouncements(3), items => items.length
    ? h('div', ...items.map((a, i) => h('details', { class: 'ann', open: i === 0 || undefined },
        h('summary', a.pinned ? h('span', { class: 'pin' }, '📌 ') : null, a.title, h('span', { class: 'ann-date' }, a.date)),
        h('div', { class: 'ann-body' }, a.body))))
    : h('p', { class: 'empty' }, '目前沒有公告。'));
}

fill(hol, () => holidaysPromise, list => {
  const st = holidayStatus(list, key);
  const fmt = d => `${+d.slice(4, 6)}/${+d.slice(6)}`;
  return h('ul', { class: 'stat-list' },
    st.today ? h('li', '今天：', h('b', st.today.name)) : null,
    ...st.upcoming.map(x => h('li', `${fmt(x.date)}　${x.name}`)),
    st.upcoming.length ? null : h('li', { class: 'muted' }, '暫無假日資料'));
});
