// 許願池資料層
import { db } from './firebase.js';
import {
  collection, query, where, orderBy, limit, getDocs, getDoc, doc, setDoc, runTransaction, serverTimestamp,
} from './fb-sdk.js';

export async function listWishes({ status = 'open' } = {}, n = 50) {
  const snap = await getDocs(query(collection(db, 'wishes'), where('status', '==', status), orderBy('voteCount', 'desc'), limit(n)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createWish(w, uid, name) {
  const ref = doc(collection(db, 'wishes'));
  await setDoc(ref, { title: w.title.trim(), detail: (w.detail ?? '').trim(), category: w.category,
    byUid: uid, byName: name, voteCount: 0, status: 'open', doneToolId: null, createdAt: serverTimestamp() });
  return ref.id;
}

export async function toggleVote(wishId, uid) {
  const wRef = doc(db, 'wishes', wishId), vRef = doc(db, 'wishes', wishId, 'votes', uid);
  return runTransaction(db, async tx => {
    const [w, v] = [await tx.get(wRef), await tx.get(vRef)];
    const n = w.data()?.voteCount ?? 0;
    if (v.exists()) { tx.delete(vRef); tx.update(wRef, { voteCount: n - 1 }); return false; }
    tx.set(vRef, { createdAt: serverTimestamp() }); tx.update(wRef, { voteCount: n + 1 }); return true;
  });
}

export async function hasVoted(wishId, uid) {
  return (await getDoc(doc(db, 'wishes', wishId, 'votes', uid))).exists();
}
