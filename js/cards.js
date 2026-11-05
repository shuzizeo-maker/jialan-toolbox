// 卡冊資料層
import { db } from './firebase.js';
import { doc, setDoc, getDocs, collection, query, orderBy, limit, serverTimestamp } from './fb-sdk.js';

export async function saveTodayCard(uid, dateKey, card) {
  try {
    await setDoc(doc(db, 'users', uid, 'cards', dateKey), { cardNo: card.no, rarity: card.rarity, createdAt: serverTimestamp() });
  } catch (e) {
    if (!String(e?.code).includes('permission-denied')) throw e; // 已存在（今天抽過）會被規則擋下
  }
}

export async function listMyCards(uid, n = 400) {
  const snap = await getDocs(query(collection(db, 'users', uid, 'cards'), orderBy('__name__', 'desc'), limit(n)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
