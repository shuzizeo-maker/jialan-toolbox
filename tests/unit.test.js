import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategory } from '../js/categories.js';

test('categories: 12 fixed in spec order', () => {
  assert.deepEqual(CATEGORIES.map(c => c.name),
    ['校長','教務處','學務處','總務處','輔導室','人事會計','導師','科任','教學','附幼','進修部','其他']);
  assert.deepEqual(CATEGORIES.map(c => c.icon), ['校','教','學','總','輔','人','導','科','課','幼','進','其']);
  assert.equal(new Set(CATEGORIES.map(c => c.id)).size, 12);
  assert.equal(new Set(CATEGORIES.map(c => c.color)).size, 12);
  assert.equal(getCategory('nope').name, '其他');
  assert.equal(getCategory('subject').name, '科任');
});

import { todayKey, formatRoc, taipeiParts } from '../js/clock.js';
import { isHttpsUrl, validateProfile, validateTool, validateWish, COUNTIES, JOB_TITLES } from '../js/validate.js';

test('todayKey uses Taipei time', () => {
  assert.equal(todayKey(new Date('2026-11-04T16:30:00Z')), '20261105');
  assert.equal(todayKey(new Date('2026-12-31T15:59:00Z')), '20261231');
  assert.equal(todayKey(new Date('2026-12-31T16:00:00Z')), '20270101');
});
test('formatRoc', () => {
  assert.equal(formatRoc(new Date('2026-11-05T05:34:00Z')), '115年11月5日（四）13:34');
  assert.equal(formatRoc(new Date('2026-12-31T16:05:00Z')), '116年1月1日（五）00:05');
  assert.equal(taipeiParts(new Date('2026-11-05T05:34:09Z')).ss, 9);
});
test('isHttpsUrl', () => {
  for (const ok of ['https://a.github.io/x/', 'https://github.com/u/r']) assert.ok(isHttpsUrl(ok));
  for (const bad of ['http://a.com', 'javascript:alert(1)', 'https://', '', ' ', 'ftp://x', 'data:text/html,x', null, undefined, 'https://a b.com'])
    assert.equal(isHttpsUrl(bad), false, String(bad));
});
test('validateProfile', () => {
  assert.equal(COUNTIES.length, 22); assert.ok(COUNTIES.includes('臺東縣'));
  assert.deepEqual(JOB_TITLES, ['校長','主任','組長','教師','職員']);
  assert.ok(validateProfile({county:'臺東縣', school:'嘉蘭國小', realName:'王小明', jobTitle:'教師'}).ok);
  assert.ok(validateProfile({county:'臺東縣', school:'嘉蘭國小', realName:'   ', jobTitle:'教師'}).errors.realName);
  assert.ok(validateProfile({county:'臺東縣', school:'嘉蘭國小', realName:'王', jobTitle:'工友'}).errors.jobTitle);
  assert.ok(validateProfile({county:'火星', school:'嘉蘭國小', realName:'王', jobTitle:'教師'}).errors.county);
  assert.ok(validateProfile({county:'臺東縣', school:'嘉蘭國小', realName:'王'.repeat(21), jobTitle:'教師'}).errors.realName);
});
test('validateTool requires at least one https link', () => {
  const t = {name:'x', summary:'y', category:'academic', author:'z', authorGithub:''};
  assert.ok(validateTool(t, {}).errors.links);
  assert.ok(validateTool(t, {onlineUrl:'http://x.com'}).errors.onlineUrl);
  assert.ok(validateTool(t, {sourceUrl:'https://github.com/a/b'}).ok);
  assert.ok(validateTool({...t, category:'bad'}, {sourceUrl:'https://github.com/a/b'}).errors.category);
  assert.ok(validateTool({...t, authorGithub:'bad name!'}, {sourceUrl:'https://github.com/a/b'}).errors.authorGithub);
  assert.ok(validateTool({...t, summary:'字'.repeat(301)}, {sourceUrl:'https://github.com/a/b'}).errors.summary);
});
test('validateWish', () => {
  assert.ok(validateWish({title:'成績系統', detail:'', category:'academic'}).ok);
  assert.ok(validateWish({title:'', detail:'', category:'academic'}).errors.title);
});

import { parseCalendar, holidayStatus, loadHolidays } from '../js/holidays.js';
import { readFileSync } from 'node:fs';
const sample = [
  {date:'20261009', week:'五', isHoliday:true, description:'國慶日補假'},
  {date:'20261010', week:'六', isHoliday:true, description:'國慶日'},
  {date:'20261011', week:'日', isHoliday:true, description:''},
  {date:'20261225', week:'五', isHoliday:true, description:'行憲紀念日'},
];
test('parseCalendar drops plain weekends', () => {
  assert.deepEqual(parseCalendar(sample).map(h => h.date), ['20261009','20261010','20261225']);
  assert.throws(() => parseCalendar({}));
});
test('holidayStatus', () => {
  const l = parseCalendar(sample);
  const s = holidayStatus(l, '20261010');
  assert.equal(s.today.name, '國慶日');
  assert.equal(s.next.name, '行憲紀念日');
  assert.equal(holidayStatus(l, '20261105').daysUntil, 50);
  assert.equal(holidayStatus(l, '20261226').next, null);
  assert.equal(holidayStatus(l, '20261001').upcoming.length, 3);
});
test('loadHolidays falls back on CDN failure and bad JSON', async () => {
  const fallback = [{date:'20270101', week:'五', isHoliday:true, description:'開國紀念日'}];
  const mk = (cdn) => async (url) => url.startsWith('https://cdn') ? cdn()
    : { ok: true, json: async () => fallback };
  for (const cdn of [() => { throw new Error('blocked'); }, async () => ({ ok:false }), async () => ({ ok:true, json: async () => ({oops:1}) })])
    assert.equal((await loadHolidays(2027, mk(cdn)))[0].name, '開國紀念日');
  assert.deepEqual(await loadHolidays(2027, async () => { throw new Error('x'); }), []);
});
test('bundled holiday files parse', () => {
  for (const y of [2026, 2027]) {
    const l = parseCalendar(JSON.parse(readFileSync(new URL(`../data/holidays-${y}.json`, import.meta.url))));
    assert.ok(l.length >= 8, String(y));
    assert.ok(l.every(h => h.date.startsWith(String(y))));
  }
});

import { CARDS, ELEMENTS, RARITIES, DAILY } from '../js/luckcard/pool.js';
import { drawCard, getGuestId, hashString, mulberry32 } from '../js/luckcard/draw.js';

test('pool integrity', () => {
  assert.equal(CARDS.length, 60);
  assert.deepEqual(CARDS.map(c => c.no), Array.from({length:60}, (_, i) => i + 1));
  for (const r of RARITIES) assert.equal(CARDS.filter(c => c.rarity === r.id).length, r.count, r.id);
  const hp = { N:[50,90], R:[80,110], SR:[100,140], SSR:[130,170], UR:[180,220] };
  for (const c of CARDS) {
    assert.equal(c.skills.length, 2, c.name);
    assert.ok(c.skills.every(s => s.cost >= 1 && s.cost <= 3 && s.name && s.desc), c.name);
    assert.ok(ELEMENTS.some(e => e.id === c.element), c.name);
    assert.ok(c.hp >= hp[c.rarity][0] && c.hp <= hp[c.rarity][1], c.name);
    assert.ok(c.emoji && c.quote && c.name);
  }
  assert.equal(new Set(CARDS.map(c => c.name)).size, 60);
  assert.deepEqual(ELEMENTS.map(e => e.name), ['行政系','教學系','輔導系','總務系','體育系','藝文系']);
  assert.ok(DAILY.yi.length >= 20 && DAILY.ji.length >= 20 && DAILY.colors.length >= 8);
});
test('hash and prng are stable', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
  const r = mulberry32(1); const v = r(); assert.ok(v >= 0 && v < 1);
  assert.equal(mulberry32(1)(), v);
});
test('drawCard deterministic per date+identity', () => {
  assert.deepEqual(drawCard('20261105', 'u1'), drawCard('20261105', 'u1'));
  const ids = new Set(Array.from({length:30}, (_, i) => drawCard(`202611${String(i+1).padStart(2,'0')}`, 'u1').card.no));
  assert.ok(ids.size > 10);
});
test('rarity distribution within 1%', () => {
  const n = 100000, cnt = {};
  for (let i = 0; i < n; i++) { const r = drawCard('20261105', 'id' + i).card.rarity; cnt[r] = (cnt[r] || 0) + 1; }
  for (const r of RARITIES) assert.ok(Math.abs(cnt[r.id] / n * 100 - r.weight) < 1, r.id);
});
test('daily yi != ji, luckyCategory valid', () => {
  for (let i = 0; i < 500; i++) { const d = drawCard('20261105', 'x' + i).daily;
    assert.notEqual(d.yi, d.ji); assert.ok(CATEGORIES.some(c => c.id === d.luckyCategory));
    assert.ok(d.luckyNumber >= 1 && d.luckyNumber <= 99); assert.ok(d.luckyColor.hex); }
});
test('getGuestId survives throwing storage', () => {
  assert.equal(getGuestId({ getItem(){ throw 1; }, setItem(){ throw 1; } }), 'guest');
  const m = new Map(), s = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(getGuestId(s), getGuestId(s));
  assert.notEqual(getGuestId(s), 'guest');
});

import { gateClick, stateOf, isMember, isAdmin, gateMessage } from '../js/gate.js';
test('gateClick', () => {
  assert.ok(gateClick('loading', 'member'));
  assert.equal(gateClick('guest', 'member').action, 'login');
  assert.equal(gateClick('noprofile', 'member').action, 'profile');
  assert.ok(gateClick('pending', 'member').message.includes('審核中'));
  assert.ok(gateClick('suspended', 'member').message.includes('停用'));
  assert.equal(gateClick('approved', 'member'), null);
  assert.ok(gateClick('approved', 'admin'));
  assert.equal(gateClick('approved', 'admin', { role: 'admin', status: 'approved' }), null);
  assert.equal(gateClick('guest', null), null);
});
test('stateOf', () => {
  assert.equal(stateOf(undefined, undefined), 'loading');
  assert.equal(stateOf({uid:'a'}, undefined), 'loading');
  assert.equal(stateOf(null, null), 'guest');
  assert.equal(stateOf({uid:'a'}, null), 'noprofile');
  assert.equal(stateOf({uid:'a'}, {status:'approved'}), 'approved');
  assert.equal(stateOf({uid:'a'}, {status:'pending'}), 'pending');
  assert.equal(stateOf({uid:'a'}, {status:'weird'}), 'suspended');
  assert.ok(isMember('approved') && !isMember('pending'));
  assert.ok(isAdmin('approved', {role:'admin'}) && !isAdmin('suspended', {role:'admin'}));
  assert.ok(gateMessage('guest').title);
});

import { shouldShowOpening } from '../js/luckcard/opening-state.js';
test('shouldShowOpening once per day, true on storage failure', () => {
  const m = new Map(), s = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(shouldShowOpening('20261105', s), true);
  assert.equal(shouldShowOpening('20261105', s), false);
  assert.equal(shouldShowOpening('20261106', s), true);
  assert.equal(shouldShowOpening('20261105', { getItem(){ throw 1; }, setItem(){ throw 1; } }), true);
});
