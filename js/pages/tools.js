// 工具清單
import { h, mount } from '../dom.js';
import { initLayout } from '../layout.js';
import { panel, errorBox, loadingBox } from '../ui.js';
import { listTools } from '../tools.js';
import { filterByKeyword } from '../tool-filter.js';
import { CATEGORIES, getCategory } from '../categories.js';
import { toolRow } from '../tool-row.js';

const s = await initLayout({ page: 'tools', requires: 'member' });

if (s.allowed) {
  const params = new URLSearchParams(location.search);
  const cat = CATEGORIES.some(c => c.id === params.get('cat')) ? params.get('cat') : null;
  let sort = params.get('sort') === 'likes' ? 'likes' : 'new';
  let items = [], cursor = null;

  const listEl = h('div'), moreBtn = h('button', { class: 'btn', hidden: true, onclick: () => load(true) }, '載入更多');
  const q = h('input', { type: 'search', id: 'q', placeholder: '搜尋已載入的工具名稱、摘要、分享者…', oninput: render, 'aria-label': '搜尋工具' });
  const sortSel = h('select', { 'aria-label': '排序', onchange: e => { sort = e.target.value; load(false); } },
    h('option', { value: 'new', selected: sort === 'new' || undefined }, '最新更新'),
    h('option', { value: 'likes', selected: sort === 'likes' || undefined }, '最多讚'));
  const chips = h('div', { class: 'chips' },
    h('a', { class: `chip ${cat ? '' : 'on'}`, href: 'tools.html' }, '全部'),
    ...CATEGORIES.map(c => h('a', { class: `chip ${cat === c.id ? 'on' : ''}`, href: `tools.html?cat=${c.id}` }, c.name)));

  function render() {
    const shown = filterByKeyword(items, q.value);
    mount(listEl, shown.length ? shown.map(toolRow) : h('p', { class: 'empty' }, items.length ? '找不到符合的工具。' : '這個分類還沒有工具，歡迎分享！'));
  }
  async function load(more) {
    if (!more) { items = []; cursor = null; mount(listEl, loadingBox()); }
    moreBtn.disabled = true;
    try {
      const r = await listTools({ category: cat, sort, after: more ? cursor : null });
      items = [...items, ...r.items]; cursor = r.cursor;
      render();
    } catch (e) { mount(listEl, errorBox(e, () => load(false))); }
    moreBtn.disabled = false; moreBtn.hidden = !cursor;
  }

  mount(s.main, panel(cat ? `工具庫：${getCategory(cat).name}` : '工具庫：全部工具', {},
    chips, h('div', { class: 'toolbar' }, q, sortSel), listEl, h('p', { class: 'center' }, moreBtn)));
  load(false);
}
