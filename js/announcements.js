import { db } from './firebase.js';
import { collection, query, orderBy, limit, getDocs } from './fb-sdk.js';

/** 置頂優先、再依日期新到舊 */
export async function listAnnouncements(n = 3, all = false) {
  const q = all ? query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(50))
    : query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(n + 5));
  const items = (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
  items.sort((a, b) => (b.pinned === true) - (a.pinned === true) || String(b.date).localeCompare(String(a.date)));
  return all ? items : items.slice(0, n);
}
