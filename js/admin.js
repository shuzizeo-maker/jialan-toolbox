// 管理員資料層
import { db } from './firebase.js';
import {
  collection, collectionGroup, query, where, orderBy, limit, getDocs, getDoc, doc, writeBatch, updateDoc,
  deleteDoc, setDoc, addDoc, increment, serverTimestamp, getCountFromServer,
} from './fb-sdk.js';

const docs = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const STATS = () => doc(db, 'stats/site');

export async function listUsersByStatus(status, n = 50) {
  return docs(await getDocs(query(collection(db, 'users'), where('status', '==', status), orderBy('createdAt', 'asc'), limit(n))));
}

export async function approveUser(uid) {
  const b = writeBatch(db);
  b.update(doc(db, 'users', uid), { status: 'approved', updatedAt: serverTimestamp() });
  b.set(STATS(), { memberCount: increment(1) }, { merge: true });
  await b.commit();
}

export async function rejectUser(uid) { await deleteDoc(doc(db, 'users', uid)); }

export async function setSuspended(uid, suspended) {
  const b = writeBatch(db);
  b.update(doc(db, 'users', uid), { status: suspended ? 'suspended' : 'approved', updatedAt: serverTimestamp() });
  b.set(STATS(), { memberCount: increment(suspended ? -1 : 1) }, { merge: true });
  await b.commit();
}

export async function setRole(uid, role) { await updateDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() }); }

export async function countPendingUsers() {
  return (await getCountFromServer(query(collection(db, 'users'), where('status', '==', 'pending')))).data().count;
}

export async function listPendingTools(n = 50) {
  const tools = docs(await getDocs(query(collection(db, 'tools'), where('status', '==', 'pending'), limit(n))));
  return Promise.all(tools.map(async t => ({ ...t, links: (await getDoc(doc(db, 'tools', t.id, 'private', 'links'))).data() ?? {} })));
}

export async function listPublishedTools(n = 300) {
  return docs(await getDocs(query(collection(db, 'tools'), where('status', '==', 'published'), orderBy('updatedAt', 'desc'), limit(n))));
}

export async function publishTool(id) {
  const vs = await getDocs(collection(db, 'tools', id, 'versions'));
  const b = writeBatch(db);
  b.update(doc(db, 'tools', id), { status: 'published', updatedAt: serverTimestamp() });
  vs.forEach(v => b.update(v.ref, { toolStatus: 'published' }));
  await b.commit();
}

/** 退回 = 刪除工具（含網址與版本） */
export async function returnTool(id) {
  const vs = await getDocs(collection(db, 'tools', id, 'versions'));
  const b = writeBatch(db);
  vs.forEach(v => b.delete(v.ref));
  b.delete(doc(db, 'tools', id, 'private', 'links'));
  b.delete(doc(db, 'tools', id));
  await b.commit();
}

export async function saveAnnouncement({ id, title, body, date, pinned }) {
  const data = { title, body, date, pinned: !!pinned };
  if (id) await setDoc(doc(db, 'announcements', id), data);
  else await addDoc(collection(db, 'announcements'), data);
}

export async function deleteAnnouncement(id) { await deleteDoc(doc(db, 'announcements', id)); }

export async function markWishDone(wishId, toolId) {
  await updateDoc(doc(db, 'wishes', wishId), { status: toolId === undefined ? 'open' : 'done', doneToolId: toolId ?? null });
}
