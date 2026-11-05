// 工具清單列
import { h } from './dom.js';
import { catIcon, verTag } from './ui.js';
import { getCategory } from './categories.js';

export function toolRow(t) {
  return h('div', { class: 'tool-row', dataset: { name: t.name } },
    catIcon(t.category),
    h('div', h('a', { class: 't-name', href: `tool.html?id=${encodeURIComponent(t.id)}` }, t.name), ' ', verTag(t.currentVersion),
      h('small', { class: 'muted' }, `　${getCategory(t.category).name}・${t.author}`)),
    h('span', { class: 't-side' }, `❤ ${t.likeCount}`),
    h('p', { class: 't-sum' }, t.summary));
}
