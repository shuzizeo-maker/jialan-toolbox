// 工具詳細頁
import { h, mount } from '../dom.js';
import { initLayout } from '../layout.js';
import { panel, catBadge, verTag, errorBox, loadingBox, fmtDate, showDialog } from '../ui.js';
import { getTool, getLinks, listVersions, toggleLike, hasLiked, toggleFavorite, isFavorite } from '../tools.js';
import { isHttpsUrl } from '../validate.js';

const s = await initLayout({ page: 'tools', requires: 'member' });

if (s.allowed) {
  const id = new URLSearchParams(location.search).get('id') ?? '';
  mount(s.main, loadingBox());
  try {
    const tool = id ? await getTool(id) : null;
    if (!tool) {
      mount(s.main, panel('找不到工具', {}, h('p', '這個工具不存在，或還在審核中。'), h('a', { href: 'tools.html' }, '← 回工具庫')));
    } else {
      const [links, versions, liked, fav] = await Promise.all([getLinks(id), listVersions(id), hasLiked(id, s.user.uid), isFavorite(id, s.user.uid)]);
      document.title = `${tool.name}｜嘉蘭國小教學行政工具庫`;
      const canEdit = s.admin || tool.uploaderUid === s.user.uid;
      const ext = (url, label, cls) => isHttpsUrl(url)
        ? h('a', { class: `btn big-btn ${cls}`, href: url, target: '_blank', rel: 'noopener noreferrer' }, label) : null;

      const likeCount = h('span', { id: 'like-count' }, String(tool.likeCount));
      const likeBtn = h('button', { class: `btn ${liked ? 'on' : ''}`, id: 'btn-like', 'aria-pressed': String(liked) }, liked ? '❤ 已讚 ' : '♡ 按讚 ', likeCount);
      let likedNow = liked, count = tool.likeCount;
      likeBtn.addEventListener('click', async () => {
        if (likeBtn.disabled) return;
        likeBtn.disabled = true;
        try {
          const r = await toggleLike(id, s.user.uid);
          count += r === likedNow ? 0 : (r ? 1 : -1); likedNow = r;
          likeBtn.classList.toggle('on', r); likeBtn.setAttribute('aria-pressed', String(r));
          likeBtn.firstChild.textContent = r ? '❤ 已讚 ' : '♡ 按讚 '; likeCount.textContent = String(count);
        } catch (e) { console.warn(e); showDialog('按讚失敗', '請稍後再試。'); }
        likeBtn.disabled = false;
      });
      const favBtn = h('button', { class: `btn ${fav ? 'on' : ''}`, id: 'btn-fav', 'aria-pressed': String(fav) }, fav ? '★ 已收藏' : '☆ 收藏');
      favBtn.addEventListener('click', async () => {
        if (favBtn.disabled) return;
        favBtn.disabled = true;
        try {
          const r = await toggleFavorite(id, s.user.uid);
          favBtn.classList.toggle('on', r); favBtn.setAttribute('aria-pressed', String(r)); favBtn.textContent = r ? '★ 已收藏' : '☆ 收藏';
        } catch (e) { console.warn(e); showDialog('收藏失敗', '請稍後再試。'); }
        favBtn.disabled = false;
      });

      const ghOk = /^[A-Za-z0-9-]{1,39}$/.test(tool.authorGithub || '');
      mount(s.main,
        panel('工具資訊', {},
          h('div', { class: 'tool-head' },
            h('p', catBadge(tool.category), ' ', verTag(tool.currentVersion), tool.status !== 'published' ? h('span', { class: 'notice small' }, ' 審核中，僅你和管理員看得到') : null),
            h('h1', tool.name),
            h('p', { class: 'muted' }, '分享者：', tool.author,
              ghOk ? [' （', h('a', { href: `https://github.com/${tool.authorGithub}`, target: '_blank', rel: 'noopener noreferrer' }, `GitHub @${tool.authorGithub}`), '）'] : null,
              `・更新於 ${fmtDate(tool.updatedAt)}`)),
          h('p', { class: 'tool-summary' }, tool.summary),
          h('div', { class: 'tool-actions' },
            ext(links.onlineUrl, '▶ 線上使用', 'btn-primary'),
            ext(links.downloadUrl, '⬇ 下載', 'btn-primary'),
            ext(links.sourceUrl, '</> GitHub 原始碼', '')),
          h('div', { class: 'tool-actions' }, likeBtn, favBtn,
            canEdit ? h('a', { class: 'btn', href: `upload.html?id=${encodeURIComponent(id)}` }, '＋ 新增版本') : null,
            canEdit ? h('a', { class: 'btn', href: `upload.html?id=${encodeURIComponent(id)}&edit=1` }, '✎ 編輯') : null)),
        panel('版本紀錄', {}, versions.length ? h('ul', { class: 'timeline' }, ...versions.map(v => h('li',
          h('b', `v${v.version}`), h('span', { class: 'muted small' }, `　${fmtDate(v.createdAt)}`),
          h('div', { class: 'note' }, v.note)))) : h('p', { class: 'empty' }, '尚無版本紀錄')));
    }
  } catch (e) { mount(s.main, errorBox(e, () => location.reload())); }
}
