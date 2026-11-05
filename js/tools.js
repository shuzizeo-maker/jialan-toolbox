// 工具資料層
import { db } from './firebase.js';
import {
  collection, collectionGroup, query, where, orderBy, limit, getDocs, getCountFromServer,
} from './fb-sdk.js';

const docs = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const PUB = where('status', '==', 'published');

export async function listLatestVersions(n = 8) {
  const snap = await getDocs(query(collectionGroup(db, 'versions'),
    where('toolStatus', '==', 'published'), orderBy('createdAt', 'desc'), limit(n)));
  return snap.docs.map(d => ({ id: d.id, toolId: d.ref.parent.parent.id, ...d.data() }));
}

export async function listTopTools(n = 10) {
  return docs(await getDocs(query(collection(db, 'tools'), PUB, orderBy('likeCount', 'desc'), limit(n))));
}

export async function countPublishedTools() {
  return (await getCountFromServer(query(collection(db, 'tools'), PUB))).data().count;
}

export async function countPublishedVersions() {
  return (await getCountFromServer(query(collectionGroup(db, 'versions'), where('toolStatus', '==', 'published')))).data().count;
}

import {
  doc, getDoc, setDoc, deleteDoc, runTransaction, startAfter, serverTimestamp, documentId,
} from './fb-sdk.js';

export const PAGE_SIZE = 30;

export async function listTools({ category = null, sort = 'new', after = null } = {}) {
  const parts = [collection(db, 'tools'), PUB];
  if (category) parts.push(where('category', '==', category));
  parts.push(orderBy(sort === 'likes' ? 'likeCount' : 'updatedAt', 'desc'));
  if (after) parts.push(startAfter(after));
  parts.push(limit(PAGE_SIZE));
  const snap = await getDocs(query(...parts));
  return { items: docs(snap), cursor: snap.docs.length === PAGE_SIZE ? snap.docs.at(-1) : null };
}

export async function getTool(id) {
  const d = await getDoc(doc(db, 'tools', id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

export async function getLinks(id) {
  return (await getDoc(doc(db, 'tools', id, 'private', 'links'))).data() ?? {};
}

export async function listVersions(id) {
  const snap = await getDocs(query(collection(db, 'tools', id, 'versions'), orderBy('version', 'desc'), limit(50)));
  return docs(snap);
}

/** 交易：有讚就取消（-1），沒讚就按讚（+1）；回傳交易後是否為已讚 */
export async function toggleLike(toolId, uid) {
  const toolRef = doc(db, 'tools', toolId), likeRef = doc(db, 'tools', toolId, 'likes', uid);
  return runTransaction(db, async tx => {
    const [t, l] = [await tx.get(toolRef), await tx.get(likeRef)];
    const count = t.data()?.likeCount ?? 0;
    if (l.exists()) { tx.delete(likeRef); tx.update(toolRef, { likeCount: count - 1 }); return false; }
    tx.set(likeRef, { createdAt: serverTimestamp() }); tx.update(toolRef, { likeCount: count + 1 }); return true;
  });
}

export async function hasLiked(toolId, uid) {
  return (await getDoc(doc(db, 'tools', toolId, 'likes', uid))).exists();
}

export async function isFavorite(toolId, uid) {
  return (await getDoc(doc(db, 'users', uid, 'favorites', toolId))).exists();
}

export async function toggleFavorite(toolId, uid) {
  const ref = doc(db, 'users', uid, 'favorites', toolId);
  if ((await getDoc(ref)).exists()) { await deleteDoc(ref); return false; }
  await setDoc(ref, { createdAt: serverTimestamp() }); return true;
}

export async function listFavorites(uid) {
  const favs = await getDocs(query(collection(db, 'users', uid, 'favorites'), orderBy('createdAt', 'desc'), limit(100)));
  const tools = await Promise.all(favs.docs.map(f => getTool(f.id).catch(() => null)));
  return tools.filter(t => t && t.status === 'published');
}
