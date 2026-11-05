// 首次登入填寫／修改基本資料
import { h, mount } from '../dom.js';
import { initLayout } from '../layout.js';
import { panel, fieldError, showDialog } from '../ui.js';
import { COUNTIES, JOB_TITLES, validateProfile } from '../validate.js';
import { db } from '../firebase.js';
import { doc, setDoc, updateDoc, serverTimestamp } from '../fb-sdk.js';
import { signIn } from '../auth.js';

const s = await initLayout({ page: 'profile' });

if (s.state === 'guest') {
  mount(s.main, h('div', { class: 'gate-box' }, h('h2', '請先登入'), h('p', '請使用 Google 帳號登入後填寫基本資料。'),
    h('button', { class: 'btn btn-primary', onclick: signIn }, '使用 Google 登入')));
} else {
  const p = s.profile ?? {};
  const isNew = !s.profile;
  const opt = (v, cur) => h('option', { value: v, selected: v === cur || undefined }, v);
  const field = (label, control, key, hint) => h('label', label, hint ? h('small', hint) : null, control, h('span', { class: 'field-error', dataset: { error: key } }));
  const form = h('form', { class: 'form', novalidate: true },
    field('縣市', h('select', { name: 'county' }, ...COUNTIES.map(c => opt(c, p.county ?? '臺東縣'))), 'county'),
    field('學校', h('input', { name: 'school', value: p.school ?? '嘉蘭國小', maxlength: '30', autocomplete: 'organization' }), 'school'),
    field('真實姓名', h('input', { name: 'realName', value: p.realName ?? '', maxlength: '20', autocomplete: 'name' }), 'realName', '管理員會依姓名確認身分'),
    field('職務', h('select', { name: 'jobTitle' }, h('option', { value: '' }, '請選擇'), ...JOB_TITLES.map(j => opt(j, p.jobTitle))), 'jobTitle'),
    h('label', 'Google 帳號', h('input', { value: s.user.email ?? '', disabled: true })),
    h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, isNew ? '送出申請' : '儲存修改')));

  const status = s.state === 'pending' ? h('p', { class: 'notice' }, '您的帳號審核中，管理員通過後即可使用所有功能。')
    : s.state === 'suspended' ? h('p', { class: 'notice' }, '您的帳號已停用，如有疑問請聯繫網站管理員。') : null;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(['county', 'school', 'realName', 'jobTitle'].map(k => [k, form.elements[k].value.trim()]));
    const v = validateProfile(data);
    fieldError(form, v.errors);
    if (!v.ok) return;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const ref = doc(db, 'users', s.user.uid);
      if (isNew) {
        await setDoc(ref, { ...data, email: s.user.email ?? '', displayName: s.user.displayName ?? '',
          status: 'pending', role: 'user', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else {
        await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
      }
      mount(s.main, panel('基本資料', {}, h('div', { class: 'success-box' },
        isNew || s.state === 'pending' ? '已送出，請等待管理員審核。審核通過後重新整理頁面即可使用所有功能。' : '已儲存修改。'),
        h('p', h('a', { href: 'index.html' }, '← 回主畫面'))));
    } catch (err) {
      console.warn(err);
      btn.disabled = false;
      showDialog('送出失敗', '資料沒有送出成功，請檢查欄位後再試一次。');
    }
  });

  mount(s.main, panel(isNew ? '填寫基本資料' : '我的基本資料', {},
    isNew ? h('p', '歡迎！請填寫以下資料，送出後由網站管理員審核。本站開放外校教職員申請。') : status,
    form));
}
