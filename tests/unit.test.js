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
