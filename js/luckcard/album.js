// 卡冊統計（純函式）。cardDocs: [{ id: 'yyyymmdd', cardNo }]
import { CARDS, RARITIES } from './pool.js';

export function buildAlbum(cardDocs) {
  const owned = new Map();
  const sorted = [...cardDocs].sort((a, b) => a.id.localeCompare(b.id));
  for (const d of sorted) {
    const o = owned.get(d.cardNo);
    if (o) { o.count++; o.last = d.id; } else owned.set(d.cardNo, { count: 1, first: d.id, last: d.id });
  }
  const byRarity = Object.fromEntries(RARITIES.map(r => [r.id, {
    total: CARDS.filter(c => c.rarity === r.id).length,
    owned: CARDS.filter(c => c.rarity === r.id && owned.has(c.no)).length,
  }]));
  return {
    owned, total: CARDS.length, ownedCount: owned.size, byRarity,
    recent: sorted.slice(-30).reverse().map(d => ({ dateKey: d.id, no: d.cardNo })),
  };
}
