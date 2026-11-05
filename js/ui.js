// 共用 UI 元件（全部經由 h() 建構，使用者資料只會是純文字）
import { h, mount } from './dom.js';
import { getCategory } from './categories.js';
import { friendlyError } from './firebase.js';
import { indexUrl } from './errors.js';

/** 論壇式區塊：斜角標題 + 內容 */
export function panel(title, opts = {}, ...children) {
  return h('section', { class: `panel ${opts.cls ?? ''}`, id: opts.id },
    h('h2', { class: 'panel-head' }, h('span', title), opts.extra ?? null),
    h('div', { class: 'panel-body' }, ...children));
}

export function catBadge(catId, sub) {
  const c = getCategory(catId);
  return h('span', { class: 'cat-badge', style: { '--c': c.color } },
    h('b', { class: 'cat-icon' }, c.icon), c.name, sub ? h('small', `・${sub}`) : null);
}

export function catIcon(catId) {
  const c = getCategory(catId);
  return h('b', { class: 'cat-icon', style: { '--c': c.color } }, c.icon);
}

export function verTag(n) { return h('span', { class: 'ver-tag' }, `v${n}`); }

export function loadingBox() { return h('p', { class: 'muted loading' }, '載入中…'); }

export function errorBox(err, retry) {
  console.warn(err);
  const url = indexUrl(err);
  return h('div', { class: 'error-box' }, friendlyError(err),
    err?.code ? h('small', { class: 'muted' }, `（代碼：${String(err.code).replace(/^firestore\//, '')}）`) : null,
    url ? h('a', { class: 'btn btn-small btn-primary', href: url, target: '_blank', rel: 'noopener noreferrer' }, '建立索引') : null,
    retry ? h('button', { class: 'btn btn-small', onclick: retry }, '重新整理') : null);
}

/** 讓區塊各自載入、各自失敗 */
export async function fill(el, loader, render) {
  mount(el, loadingBox());
  try { mount(el, await render(await loader())); }
  catch (e) { mount(el, errorBox(e, () => fill(el, loader, render))); }
}

let dlg;
export function showDialog(title, message, actions = []) {
  dlg?.remove();
  dlg = h('dialog', { class: 'dialog' },
    h('h3', title), h('p', message),
    h('div', { class: 'dialog-actions' },
      ...actions.map(a => h('button', { class: `btn ${a.primary ? 'btn-primary' : ''}`, onclick: () => { dlg.close(); a.run?.(); } }, a.label)),
      h('button', { class: 'btn', onclick: () => dlg.close() }, '關閉')));
  document.body.appendChild(dlg);
  dlg.showModal();
  return dlg;
}

export function fmtDate(ts) {
  const d = ts?.toDate ? ts.toDate() : (typeof ts === 'number' ? new Date(ts) : null);
  if (!d || isNaN(d)) return '';
  return `${d.getFullYear() - 1911}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function fieldError(form, errors) {
  form.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; });
  for (const [k, msg] of Object.entries(errors)) {
    const slot = form.querySelector(`[data-error="${k}"]`);
    if (slot) slot.textContent = msg;
  }
}
