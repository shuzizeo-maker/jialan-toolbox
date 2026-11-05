// 好運卡 DOM、翻牌開場
import { h } from '../dom.js';
import { ELEMENTS, RARITIES } from './pool.js';
import { getCategory } from '../categories.js';
import { dotDate } from '../clock.js';

const el = id => ELEMENTS.find(e => e.id === id) ?? ELEMENTS[0];
const rar = id => RARITIES.find(r => r.id === id) ?? RARITIES[0];

export function renderCard({ card, daily }, { dateKey, size = 'full' } = {}) {
  const e = el(card.element), r = rar(card.rarity);
  const cat = daily ? getCategory(daily.luckyCategory) : null;
  return h('article', {
    class: `lc lc-${card.rarity} lc-el-${card.element} lc-${size}`,
    style: { '--g1': e.gradient[0], '--g2': e.gradient[1] },
    'aria-label': `今日好運卡：${card.name}（${card.rarity}）`,
  },
    h('div', { class: 'lc-inner' },
      h('header', { class: 'lc-top' },
        h('span', { class: 'lc-rarity' }, h('b', card.rarity), ' ', '★'.repeat(r.stars)),
        h('span', { class: 'lc-hp' }, h('small', '元氣'), ` ${card.hp}`)),
      h('h3', { class: 'lc-name' }, card.name),
      h('div', { class: 'lc-art' }, h('span', { class: 'lc-emoji' }, card.emoji), h('span', { class: 'lc-shine' })),
      h('div', { class: 'lc-type' }, `${e.name}・No.${String(card.no).padStart(3, '0')}`),
      h('ul', { class: 'lc-skills' },
        ...card.skills.map(s => h('li',
          h('span', { class: 'lc-cost' }, '⚡'.repeat(s.cost)),
          h('span', { class: 'lc-skill' }, h('b', s.name), h('small', s.desc))))),
      daily ? h('div', { class: 'lc-daily' },
        h('div', { class: 'lc-yi' }, h('b', '宜'), daily.yi),
        h('div', { class: 'lc-ji' }, h('b', '忌'), daily.ji),
        h('div', { class: 'lc-luck' },
          h('span', '幸運處室 ', h('b', cat.name)),
          h('span', '幸運數字 ', h('b', String(daily.luckyNumber))),
          h('span', '幸運色 ', h('i', { class: 'lc-swatch', style: { background: daily.luckyColor.hex } }), h('b', daily.luckyColor.name)))) : null,
      h('p', { class: 'lc-quote' }, `「${card.quote}」`),
      h('footer', { class: 'lc-foot' },
        h('span', `No.${String(card.no).padStart(3, '0')} / 60`),
        dateKey ? h('span', dotDate(dateKey)) : null)));
}

export function renderSilhouette(card) {
  return h('article', { class: `lc lc-thumb lc-unknown`, 'aria-label': '尚未收集' },
    h('div', { class: 'lc-inner' },
      h('header', { class: 'lc-top' }, h('span', { class: 'lc-rarity' }, h('b', card.rarity)), h('span', '')),
      h('h3', { class: 'lc-name' }, '？？？'),
      h('div', { class: 'lc-art' }, h('span', { class: 'lc-emoji' }, card.emoji)),
      h('footer', { class: 'lc-foot' }, h('span', `No.${String(card.no).padStart(3, '0')}`))));
}

const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** 全螢幕翻牌開場：點擊翻面，Esc／按鈕／點外圍關閉 */
export function showOpening(result, dateKey) {
  return new Promise(resolve => {
    const special = ['SSR', 'UR'].includes(result.card.rarity);
    const face = renderCard(result, { dateKey });
    const flip = h('div', { class: 'lc-flip', role: 'button', tabindex: '0', 'aria-label': '點擊翻開今日好運卡' },
      h('div', { class: 'lc-back' }, h('span', { class: 'lc-back-logo' }, '嘉'), h('small', '今日好運卡'), h('em', '點擊翻開')),
      h('div', { class: 'lc-front' }, face));
    const hint = h('p', { class: 'lc-hint' }, '點一下卡片翻開今天的運勢！');
    const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); resolve(); };
    const onKey = e => { if (e.key === 'Escape') close(); else if (e.key === 'Enter' || e.key === ' ') reveal(); };
    const reveal = () => {
      if (flip.classList.contains('flipped')) return;
      flip.classList.add('flipped');
      if (special && !reduced()) ov.classList.add('burst');
      hint.textContent = special ? `✨ 恭喜抽到 ${result.card.rarity}！✨` : '祝你今天順順利利！';
    };
    const particles = special ? h('div', { class: 'lc-particles', 'aria-hidden': 'true' },
      ...Array.from({ length: 24 }, (_, i) => h('i', { style: { '--i': i, '--x': `${(i * 37) % 100}%` } }))) : null;
    const ov = h('div', { class: `lc-overlay ${reduced() ? 'no-motion' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': '今日好運卡' },
      h('div', { class: 'lc-rays', 'aria-hidden': 'true' }), particles,
      h('div', { class: 'lc-stage' }, h('h2', { class: 'lc-title' }, '🎴 今日好運卡'), flip, hint,
        h('button', { class: 'btn', onclick: close }, '收下卡片')));
    flip.addEventListener('click', reveal);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
    flip.focus();
  });
}
