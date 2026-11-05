// 我的卡冊
import { h, mount } from '../dom.js';
import { initLayout } from '../layout.js';
import { panel, fill, showDialog } from '../ui.js';
import { listMyCards } from '../cards.js';
import { buildAlbum } from '../luckcard/album.js';
import { CARDS, RARITIES } from '../luckcard/pool.js';
import { renderCard, renderSilhouette } from '../luckcard/render.js';
import { drawCard } from '../luckcard/draw.js';
import { dotDate } from '../clock.js';

const s = await initLayout({ page: 'cards', requires: 'member' });

if (s.allowed) {
  const el = h('div');
  mount(s.main, el);
  fill(el, () => listMyCards(s.user.uid), docs => {
    const a = buildAlbum(docs);
    const zoom = (card, info) => {
      const d = showDialog(card.name, `收集 ${info.count} 次・第一次：${dotDate(info.first)}・最近：${dotDate(info.last)}`);
      d.classList.add('dialog-card');
      const result = drawCard(info.last, s.user.uid);
      d.querySelector('h3').after(renderCard({ card, daily: result.card.no === card.no ? result.daily : null }, { dateKey: info.last }));
    };
    const pct = Math.round(a.ownedCount / a.total * 100);
    return [
      panel('我的卡冊', {},
        h('p', { class: 'album-progress' }, '已收集 ', h('b', String(a.ownedCount)), ` / ${a.total} 張（${pct}%）`),
        h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' },
          h('span', { style: { width: `${pct}%` } })),
        h('p', { class: 'rarity-stats' }, ...RARITIES.map(r => h('span', { class: `rs rs-${r.id}` }, `${r.id} ${a.byRarity[r.id].owned}/${a.byRarity[r.id].total}`))),
        h('div', { class: 'album-grid' }, ...CARDS.map(c => {
          const info = a.owned.get(c.no);
          if (!info) return h('div', { class: 'album-cell' }, renderSilhouette(c));
          return h('button', { class: 'album-cell owned', onclick: () => zoom(c, info), 'aria-label': `${c.name}，收集 ${info.count} 次` },
            renderCard({ card: c, daily: null }, { size: 'thumb' }), info.count > 1 ? h('span', { class: 'album-count' }, `×${info.count}`) : null);
        }))),
      panel('最近 30 天', {}, a.recent.length ? h('ul', { class: 'feed' }, ...a.recent.map(r => {
        const c = CARDS[r.no - 1];
        return h('li', `${dotDate(r.dateKey)}　${c.emoji} ${c.name}（${c.rarity}）`);
      })) : h('p', { class: 'empty' }, '還沒有抽卡紀錄。回主畫面就能抽今天的卡！')),
    ];
  });
}
