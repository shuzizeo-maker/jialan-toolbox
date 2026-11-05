// 上傳工具／新增版本／編輯工具
import { h, mount } from '../dom.js';
import { initLayout } from '../layout.js';
import { panel, fieldError, showDialog, loadingBox, errorBox } from '../ui.js';
import { CATEGORIES } from '../categories.js';
import { validateTool, validateLinks } from '../validate.js';
import { createTool, addVersion, updateTool, getTool, getLinks } from '../tools.js';

const s = await initLayout({ page: 'upload', requires: 'member' });

const field = (label, control, key, hint) =>
  h('label', label, hint ? h('small', hint) : null, control, h('span', { class: 'field-error', dataset: { error: key } }));
const linkFields = (l = {}) => [
  h('span', { class: 'field-error', dataset: { error: 'links' } }),
  field('線上使用網址', h('input', { name: 'onlineUrl', type: 'url', value: l.onlineUrl ?? '', placeholder: 'https://帳號.github.io/工具/' }), 'onlineUrl', '例如 GitHub Pages 網址'),
  field('下載網址', h('input', { name: 'downloadUrl', type: 'url', value: l.downloadUrl ?? '', placeholder: 'https://github.com/帳號/工具/releases' }), 'downloadUrl', '例如 Release 或檔案下載連結'),
  field('GitHub 原始碼網址', h('input', { name: 'sourceUrl', type: 'url', value: l.sourceUrl ?? '', placeholder: 'https://github.com/帳號/工具' }), 'sourceUrl'),
];
const readLinks = f => ({ onlineUrl: f.onlineUrl.value, downloadUrl: f.downloadUrl.value, sourceUrl: f.sourceUrl.value });
const toolFields = (t = {}) => [
  field('工具名稱', h('input', { name: 'name', value: t.name ?? '', maxlength: '60' }), 'name'),
  field('處室分類', h('select', { name: 'category' }, h('option', { value: '' }, '請選擇'),
    ...CATEGORIES.map(c => h('option', { value: c.id, selected: c.id === t.category || undefined }, c.name))), 'category'),
  field('摘要', h('textarea', { name: 'summary', maxlength: '300' }, t.summary ?? ''), 'summary', '最多 300 字，說明工具能做什麼'),
  field('分享者名稱', h('input', { name: 'author', value: t.author ?? s.profile?.realName ?? '', maxlength: '30' }), 'author', '工具原作者或分享者'),
  field('分享者 GitHub 帳號', h('input', { name: 'authorGithub', value: t.authorGithub ?? '', maxlength: '39', placeholder: '選填' }), 'authorGithub'),
];
const readTool = f => ({ name: f.name.value, category: f.category.value, summary: f.summary.value, author: f.author.value, authorGithub: f.authorGithub.value });

function submitter(form, handler) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    if (btn.disabled) return;
    btn.disabled = true;
    try { await handler(); } catch (err) { console.warn(err); showDialog('送出失敗', '資料沒有送出成功，請檢查欄位或稍後再試。'); }
    btn.disabled = false;
  });
}

const done = (msg, id) => mount(s.main, panel('完成', {}, h('div', { class: 'success-box' }, h('p', msg),
  h('p', h('a', { href: `tool.html?id=${encodeURIComponent(id)}` }, '查看工具頁'), '　', h('a', { href: 'index.html' }, '回主畫面')))));

if (s.allowed) {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    const form = h('form', { class: 'form', novalidate: true }, ...toolFields(), ...linkFields(),
      field('版本說明', h('input', { name: 'note', value: '第一版上傳', maxlength: '200' }), 'note'),
      h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, '送出審核')));
    submitter(form, async () => {
      const t = readTool(form), l = readLinks(form), v = validateTool(t, l);
      fieldError(form, v.errors);
      if (!v.ok) return;
      const newId = await createTool(t, l, form.note.value, s.user.uid);
      done('已送出，管理員審核後就會公開。', newId);
    });
    mount(s.main, panel('上傳工具', {}, h('p', { class: 'muted' }, '分享放在 GitHub 上的工具。至少填一個網址，送出後由管理員審核。'), form));
  } else {
    mount(s.main, loadingBox());
    try {
      const tool = await getTool(id);
      if (!tool || !(s.admin || tool.uploaderUid === s.user.uid)) {
        mount(s.main, panel('無權限', {}, h('p', '只有工具的上傳者或管理員可以修改這個工具。'), h('a', { href: 'tools.html' }, '← 回工具庫')));
      } else {
        const links = await getLinks(id);
        if (params.get('edit')) {
          const form = h('form', { class: 'form', novalidate: true }, ...toolFields(tool), ...linkFields(links),
            h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, '儲存修改')));
          submitter(form, async () => {
            const t = readTool(form), l = readLinks(form), v = validateTool(t, l);
            fieldError(form, v.errors);
            if (!v.ok) return;
            await updateTool(id, t, l);
            done('已儲存修改。', id);
          });
          mount(s.main, panel(`編輯：${tool.name}`, {}, form));
        } else {
          const form = h('form', { class: 'form', novalidate: true },
            h('p', `目前版本 v${tool.currentVersion}，送出後成為 v${tool.currentVersion + 1}。`),
            field('修改摘要', h('textarea', { name: 'note', maxlength: '200' }), 'note', '這一版改了什麼？'),
            ...linkFields(links),
            h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, '新增版本')));
          submitter(form, async () => {
            const l = readLinks(form), e = validateLinks(l);
            const note = form.note.value.trim();
            if (!note || note.length > 200) e.note = '請填寫修改摘要（200 字以內）';
            fieldError(form, e);
            if (Object.keys(e).length) return;
            const n = await addVersion(id, note, s.user.uid, l);
            done(`已新增 v${n}。`, id);
          });
          mount(s.main, panel(`新增版本：${tool.name}`, {}, form));
        }
      }
    } catch (e) { mount(s.main, errorBox(e, () => location.reload())); }
  }
}
