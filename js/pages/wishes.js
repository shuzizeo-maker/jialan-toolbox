// 許願池
import { h, mount } from '../dom.js';
import { initLayout } from '../layout.js';
import { panel, catBadge, fill, fieldError, showDialog } from '../ui.js';
import { CATEGORIES } from '../categories.js';
import { validateWish } from '../validate.js';
import { listWishes, createWish, toggleVote, hasVoted } from '../wishes.js';
import { getTool } from '../tools.js';

const s = await initLayout({ page: 'wishes', requires: 'member' });

if (s.allowed) {
  const status = new URLSearchParams(location.search).get('status') === 'done' ? 'done' : 'open';
  const listEl = h('div');
  const field = (label, control, key) => h('label', label, control, h('span', { class: 'field-error', dataset: { error: key } }));
  const form = h('form', { class: 'form', novalidate: true },
    field('想要的工具', h('input', { name: 'title', maxlength: '60', placeholder: '例如：自動排代課表' }), 'title'),
    field('說明（選填）', h('textarea', { name: 'detail', maxlength: '500', placeholder: '希望它能做什麼？' }), 'detail'),
    field('處室', h('select', { name: 'category' }, h('option', { value: '' }, '請選擇'), ...CATEGORIES.map(c => h('option', { value: c.id }, c.name))), 'category'),
    h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, '🌠 許願')));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const w = { title: form.title.value, detail: form.detail.value, category: form.category.value };
    const v = validateWish(w);
    fieldError(form, v.errors);
    if (!v.ok) return;
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      await createWish(w, s.user.uid, s.profile.realName);
      form.reset();
      if (status === 'open') load(); else location.href = 'wishes.html';
    } catch (err) { console.warn(err); showDialog('許願失敗', '請稍後再試。'); }
    btn.disabled = false;
  });

  function voteButton(w, voted) {
    const count = h('span', { class: 'vote-count' }, String(w.voteCount));
    const btn = h('button', { class: `btn btn-small btn-vote ${voted ? 'on' : ''}`, 'aria-pressed': String(voted) }, voted ? '已 +1 ' : '+1 ', count);
    let state = voted, n = w.voteCount;
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      try {
        const r = await toggleVote(w.id, s.user.uid);
        n += r === state ? 0 : (r ? 1 : -1); state = r;
        btn.classList.toggle('on', r); btn.setAttribute('aria-pressed', String(r));
        btn.firstChild.textContent = r ? '已 +1 ' : '+1 '; count.textContent = String(n);
      } catch (err) { console.warn(err); showDialog('操作失敗', '請稍後再試。'); }
      btn.disabled = false;
    });
    return btn;
  }

  function load() {
    fill(listEl, async () => {
      const wishes = await listWishes({ status });
      const extra = await Promise.all(wishes.map(async w => ({
        voted: status === 'open' ? await hasVoted(w.id, s.user.uid) : false,
        tool: w.doneToolId ? await getTool(w.doneToolId).catch(() => null) : null,
      })));
      return wishes.map((w, i) => ({ ...w, ...extra[i] }));
    }, list => list.length ? list.map(w => h('div', { class: 'wish-row' },
      h('div', { class: 'wish-main' },
        h('p', catBadge(w.category), ' ', h('b', w.title)),
        w.detail ? h('p', { class: 'tool-summary muted' }, w.detail) : null,
        h('p', { class: 'muted small' }, `許願人：${w.byName}`,
          w.tool ? ['　✅ 已實現：', h('a', { href: `tool.html?id=${encodeURIComponent(w.tool.id)}` }, w.tool.name)] : null)),
      status === 'open' ? voteButton(w, w.voted) : h('span', { class: 'muted small' }, '+1 × ', h('span', { class: 'vote-count' }, String(w.voteCount)))))
      : h('p', { class: 'empty' }, status === 'open' ? '目前沒有願望，許下第一個吧！' : '還沒有實現的願望。'));
  }

  mount(s.main,
    panel('許個願', {}, h('p', { class: 'muted' }, '找不到需要的工具嗎？許個願，其他老師可以 +1，會做的人就知道大家需要什麼。'), form),
    panel('許願池', {},
      h('div', { class: 'chips' },
        h('a', { class: `chip ${status === 'open' ? 'on' : ''}`, href: 'wishes.html' }, '許願中'),
        h('a', { class: `chip ${status === 'done' ? 'on' : ''}`, href: 'wishes.html?status=done' }, '已實現')),
      listEl));
  load();
}
