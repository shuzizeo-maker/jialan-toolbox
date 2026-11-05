import test, { before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, increment, serverTimestamp,
  collection, collectionGroup, query, where, orderBy, limit, getDocs, getCountFromServer,
} from 'firebase/firestore';
import { todayKey } from '../js/clock.js';

let env;
const profile = (status, role = 'user') => ({
  county: '臺東縣', school: '嘉蘭國小', realName: '測試', jobTitle: '教師',
  email: 'x@example.com', displayName: 'x', status, role, createdAt: 1, updatedAt: 1,
});
const tool = (status, uploaderUid, extra = {}) => ({
  name: '工具', summary: '摘要', category: 'academic', author: '作者', authorGithub: '',
  uploaderUid, status, likeCount: 0, currentVersion: 1, createdAt: 1, updatedAt: 1, ...extra,
});
const version = (toolStatus, byUid) => ({
  version: 1, note: '第一版上傳', createdAt: 1, byUid, toolName: '工具', category: 'academic', toolStatus,
});
const links = { onlineUrl: 'https://a.github.io/t/', downloadUrl: '', sourceUrl: 'https://github.com/a/t' };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-jialan',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), profile('approved'));
    await setDoc(doc(db, 'users/bob'), profile('approved'));
    await setDoc(doc(db, 'users/admin'), profile('approved', 'admin'));
    await setDoc(doc(db, 'users/pete'), profile('pending'));
    await setDoc(doc(db, 'users/sam'), profile('suspended'));
    await setDoc(doc(db, 'tools/t1'), tool('published', 'admin'));
    await setDoc(doc(db, 'tools/t1/private/links'), links);
    await setDoc(doc(db, 'tools/t1/versions/v1'), version('published', 'admin'));
    await setDoc(doc(db, 'tools/t2'), tool('pending', 'alice'));
    await setDoc(doc(db, 'tools/t2/private/links'), links);
    await setDoc(doc(db, 'tools/t2/versions/v1'), version('pending', 'alice'));
    await setDoc(doc(db, 'wishes/w1'), { title: '願望', detail: '', category: 'other', byUid: 'alice', byName: '測試', voteCount: 0, status: 'open', doneToolId: null, createdAt: 1 });
    await setDoc(doc(db, 'announcements/a1'), { title: '公告', body: '內容', date: '2026-11-05', pinned: false });
    await setDoc(doc(db, 'stats/site'), { memberCount: 3 });
  });
});
const as = (uid, token = { email: 'x@example.com' }) => (uid ? env.authenticatedContext(uid, token) : env.unauthenticatedContext()).firestore();

test('guest reads published tool, not links', async () => {
  const db = as(null);
  await assertSucceeds(getDoc(doc(db, 'tools/t1')));
  await assertFails(getDoc(doc(db, 'tools/t1/private/links')));
});

test('pending and suspended cannot read links; member can', async () => {
  await assertFails(getDoc(doc(as('pete'), 'tools/t1/private/links')));
  await assertFails(getDoc(doc(as('sam'), 'tools/t1/private/links')));
  await assertSucceeds(getDoc(doc(as('alice'), 'tools/t1/private/links')));
});

test('guest cannot read pending tool t2; uploader and admin can', async () => {
  await assertFails(getDoc(doc(as(null), 'tools/t2')));
  await assertFails(getDoc(doc(as('bob'), 'tools/t2')));
  await assertSucceeds(getDoc(doc(as('alice'), 'tools/t2')));
  await assertSucceeds(getDoc(doc(as('admin'), 'tools/t2')));
  await assertSucceeds(getDoc(doc(as('alice'), 'tools/t2/private/links')));
  await assertFails(getDoc(doc(as('bob'), 'tools/t2/private/links')));
});

test('public queries: published tools, latest versions, counts', async () => {
  const db = as(null);
  await assertSucceeds(getDocs(query(collection(db, 'tools'), where('status', '==', 'published'), orderBy('likeCount', 'desc'), limit(10))));
  await assertSucceeds(getDocs(query(collectionGroup(db, 'versions'), where('toolStatus', '==', 'published'), orderBy('createdAt', 'desc'), limit(8))));
  await assertSucceeds(getCountFromServer(query(collection(db, 'tools'), where('status', '==', 'published'))));
  await assertFails(getDocs(query(collection(db, 'tools'), limit(10))));
  await assertFails(getDocs(query(collection(db, 'users'), where('status', '==', 'pending'))));
  await assertSucceeds(getCountFromServer(query(collection(as('admin'), 'users'), where('status', '==', 'pending'))));
});

test('versions list follows parent tool visibility', async () => {
  await assertSucceeds(getDocs(query(collection(as(null), 'tools/t1/versions'), orderBy('version', 'desc'), limit(50))));
  await assertFails(getDocs(query(collection(as(null), 'tools/t2/versions'), limit(50))));
  await assertSucceeds(getDocs(query(collection(as('alice'), 'tools/t2/versions'), limit(50))));
});

test('user creates own profile only as pending/user', async () => {
  const db = as('newbie');
  await assertFails(setDoc(doc(db, 'users/newbie'), profile('approved')));
  await assertFails(setDoc(doc(db, 'users/newbie'), profile('pending', 'admin')));
  await assertFails(setDoc(doc(db, 'users/other'), profile('pending')));
  await assertFails(setDoc(doc(db, 'users/newbie'), { ...profile('pending'), jobTitle: '工友' }));
  await assertSucceeds(setDoc(doc(db, 'users/newbie'), profile('pending')));
});

test('profile email must match the signed-in Google account', async () => {
  const db = as('mallory', { email: 'mallory@example.com' });
  await assertFails(setDoc(doc(db, 'users/mallory'), { ...profile('pending'), email: 'principal@school.edu.tw' }));
  await assertFails(setDoc(doc(db, 'users/mallory'), { ...profile('pending'), email: 'mallory@example.com', displayName: 'x'.repeat(101) }));
  await assertSucceeds(setDoc(doc(db, 'users/mallory'), { ...profile('pending'), email: 'mallory@example.com' }));
  await assertFails(updateDoc(doc(db, 'users/mallory'), { displayName: 'y'.repeat(101) }));
});

test('user cannot change own status/role; can change realName', async () => {
  const db = as('pete');
  await assertFails(updateDoc(doc(db, 'users/pete'), { status: 'approved' }));
  await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { role: 'admin' }));
  await assertSucceeds(updateDoc(doc(db, 'users/pete'), { realName: '王小明', updatedAt: 2 }));
  await assertFails(getDoc(doc(as('alice'), 'users/bob')));
});

test('admin can approve user and update stats', async () => {
  const db = as('admin');
  const b = writeBatch(db);
  b.update(doc(db, 'users/pete'), { status: 'approved', updatedAt: 2 });
  b.update(doc(db, 'stats/site'), { memberCount: increment(1) });
  await assertSucceeds(b.commit());
  await assertSucceeds(updateDoc(doc(db, 'users/sam'), { status: 'approved' }));
  await assertSucceeds(deleteDoc(doc(db, 'users/pete')));
});

test('member creates tool only as pending with likeCount 0', async () => {
  const db = as('alice');
  const mk = (t) => { const b = writeBatch(db);
    b.set(doc(db, 'tools/n1'), t); b.set(doc(db, 'tools/n1/private/links'), links);
    b.set(doc(db, 'tools/n1/versions/v1'), version(t.status, 'alice')); return b.commit(); };
  await assertFails(mk(tool('published', 'alice')));
  await assertFails(mk(tool('pending', 'alice', { likeCount: 5 })));
  await assertFails(mk(tool('pending', 'bob')));
  await assertSucceeds(mk(tool('pending', 'alice')));
});

test('pending user cannot create tool', async () => {
  const db = as('pete');
  const b = writeBatch(db);
  b.set(doc(db, 'tools/n2'), tool('pending', 'pete'));
  b.set(doc(db, 'tools/n2/private/links'), links);
  await assertFails(b.commit());
});

test('non-admin cannot publish; admin publishes with versions', async () => {
  await assertFails(updateDoc(doc(as('alice'), 'tools/t2'), { status: 'published' }));
  const db = as('admin');
  const b = writeBatch(db);
  b.update(doc(db, 'tools/t2'), { status: 'published', updatedAt: 2 });
  b.update(doc(db, 'tools/t2/versions/v1'), { toolStatus: 'published' });
  await assertSucceeds(b.commit());
  await assertSucceeds(getDoc(doc(as(null), 'tools/t2/versions/v1')));
});

test('uploader adds version v2 and edits content', async () => {
  const db = as('alice');
  const b = writeBatch(db);
  b.update(doc(db, 'tools/t2'), { currentVersion: 2, updatedAt: 2 });
  b.set(doc(db, 'tools/t2/versions/v2'), { ...version('pending', 'alice'), version: 2, note: '修正' });
  await assertSucceeds(b.commit());
  await assertSucceeds(updateDoc(doc(db, 'tools/t2'), { summary: '新摘要', updatedAt: 3 }));
  await assertFails(updateDoc(doc(as('bob'), 'tools/t2'), { summary: 'hack' }));
  const bobDb = as('bob');
  const b2 = writeBatch(bobDb);
  b2.update(doc(bobDb, 'tools/t1'), { currentVersion: 2 });
  b2.set(doc(bobDb, 'tools/t1/versions/v2'), { ...version('published', 'bob'), version: 2 });
  await assertFails(b2.commit());
});

test('uploader syncs toolName/category on own versions only', async () => {
  await assertSucceeds(updateDoc(doc(as('alice'), 'tools/t2/versions/v1'), { toolName: '新名稱', category: 'teaching' }));
  await assertFails(updateDoc(doc(as('alice'), 'tools/t2/versions/v1'), { toolStatus: 'published' }));
  await assertFails(updateDoc(doc(as('bob'), 'tools/t2/versions/v1'), { toolName: 'hack' }));
});

test('like must pair with +1 in same batch', async () => {
  const db = as('alice');
  await assertFails(setDoc(doc(db, 'tools/t1/likes/alice'), { createdAt: 1 }));
  await assertFails(updateDoc(doc(db, 'tools/t1'), { likeCount: increment(1) }));
  let b = writeBatch(db);
  b.set(doc(db, 'tools/t1/likes/alice'), { createdAt: 1 });
  b.update(doc(db, 'tools/t1'), { likeCount: increment(1) });
  await assertSucceeds(b.commit());
  b = writeBatch(db);
  b.set(doc(db, 'tools/t1/likes/alice'), { createdAt: 2 });
  b.update(doc(db, 'tools/t1'), { likeCount: increment(1) });
  await assertFails(b.commit());
  b = writeBatch(db);
  b.update(doc(db, 'tools/t1'), { likeCount: increment(2) });
  await assertFails(b.commit());
  b = writeBatch(db);
  b.delete(doc(db, 'tools/t1/likes/alice'));
  b.update(doc(db, 'tools/t1'), { likeCount: increment(-1) });
  await assertSucceeds(b.commit());
  b = writeBatch(db);
  b.update(doc(db, 'tools/t1'), { likeCount: increment(-1) });
  await assertFails(b.commit());
});

test('cannot like as someone else', async () => {
  const db = as('alice');
  const b = writeBatch(db);
  b.set(doc(db, 'tools/t1/likes/bob'), { createdAt: 1 });
  b.update(doc(db, 'tools/t1'), { likeCount: increment(1) });
  await assertFails(b.commit());
});

test('favorites only by owner member', async () => {
  await assertSucceeds(setDoc(doc(as('alice'), 'users/alice/favorites/t1'), { createdAt: 1 }));
  await assertFails(setDoc(doc(as('bob'), 'users/alice/favorites/t1'), { createdAt: 1 }));
  await assertFails(setDoc(doc(as('pete'), 'users/pete/favorites/t1'), { createdAt: 1 }));
});

test('card only for today (Taipei)', async () => {
  const db = as('alice');
  const today = todayKey(new Date());
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  const card = { cardNo: 7, rarity: 'N', createdAt: 1 };
  await assertFails(setDoc(doc(db, `users/alice/cards/${yesterday}`), card));
  await assertFails(setDoc(doc(db, `users/alice/cards/${today}`), { ...card, cardNo: 99 }));
  await assertSucceeds(setDoc(doc(db, `users/alice/cards/${today}`), card));
  await assertFails(setDoc(doc(db, `users/alice/cards/${today}`), { ...card, cardNo: 8 }));
  await assertFails(deleteDoc(doc(db, `users/alice/cards/${today}`)));
  await assertFails(setDoc(doc(as('pete'), `users/pete/cards/${today}`), card));
});

test('vote pairs with voteCount like likes', async () => {
  const db = as('bob');
  await assertSucceeds(getDoc(doc(db, 'wishes/w1')));
  await assertFails(getDoc(doc(as(null), 'wishes/w1')));
  await assertFails(setDoc(doc(db, 'wishes/w1/votes/bob'), { createdAt: 1 }));
  const b = writeBatch(db);
  b.set(doc(db, 'wishes/w1/votes/bob'), { createdAt: 1 });
  b.update(doc(db, 'wishes/w1'), { voteCount: increment(1) });
  await assertSucceeds(b.commit());
  await assertFails(updateDoc(doc(db, 'wishes/w1'), { status: 'done' }));
  await assertSucceeds(updateDoc(doc(as('admin'), 'wishes/w1'), { status: 'done', doneToolId: 't1' }));
  await assertSucceeds(setDoc(doc(db, 'wishes/w2'), { title: '新願望', detail: '', category: 'other', byUid: 'bob', byName: '測試', voteCount: 0, status: 'open', doneToolId: null, createdAt: 1 }));
  await assertFails(setDoc(doc(db, 'wishes/w3'), { title: '新願望', detail: '', category: 'other', byUid: 'bob', byName: '測試', voteCount: 9, status: 'open', doneToolId: null, createdAt: 1 }));
});

test('only admin writes announcements and stats/site; anyone reads announcements', async () => {
  await assertSucceeds(getDoc(doc(as(null), 'announcements/a1')));
  await assertSucceeds(getDoc(doc(as(null), 'stats/site')));
  await assertFails(setDoc(doc(as('alice'), 'announcements/a2'), { title: 'x', body: 'y', date: '2026-11-05', pinned: false }));
  await assertFails(updateDoc(doc(as('alice'), 'stats/site'), { memberCount: 100 }));
  await assertSucceeds(setDoc(doc(as('admin'), 'announcements/a2'), { title: 'x', body: 'y', date: '2026-11-05', pinned: true }));
});

test('link urls must be https', async () => {
  const db = as('alice');
  await assertFails(setDoc(doc(db, 'tools/t2/private/links'), { ...links, onlineUrl: 'javascript:alert(1)' }));
  await assertFails(setDoc(doc(db, 'tools/t2/private/links'), { onlineUrl: '', downloadUrl: '', sourceUrl: '' }));
  await assertSucceeds(setDoc(doc(db, 'tools/t2/private/links'), { ...links, downloadUrl: 'https://github.com/a/t/releases' }));
});

test('suspended behaves as guest for member writes', async () => {
  const db = as('sam');
  await assertFails(setDoc(doc(db, 'wishes/w9'), { title: '願望', detail: '', category: 'other', byUid: 'sam', byName: 's', voteCount: 0, status: 'open', doneToolId: null, createdAt: 1 }));
  const b = writeBatch(db);
  b.set(doc(db, 'tools/t1/likes/sam'), { createdAt: 1 });
  b.update(doc(db, 'tools/t1'), { likeCount: increment(1) });
  await assertFails(b.commit());
});
