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
