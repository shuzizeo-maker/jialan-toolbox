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
