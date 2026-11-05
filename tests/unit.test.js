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
