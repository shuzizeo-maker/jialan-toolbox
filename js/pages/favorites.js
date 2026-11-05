import { h, mount } from '../dom.js';
import { initLayout } from '../layout.js';
import { panel, fill } from '../ui.js';
import { listFavorites } from '../tools.js';
import { toolRow } from '../tool-row.js';

const s = await initLayout({ page: 'favorites', requires: 'member' });
if (s.allowed) {
  const el = h('div');
  mount(s.main, panel('我的收藏', {}, el));
  fill(el, () => listFavorites(s.user.uid), list => list.length ? list.map(toolRow)
    : h('p', { class: 'empty' }, '還沒有收藏的工具。在工具頁按「☆ 收藏」就會出現在這裡。'));
}
