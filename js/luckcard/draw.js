// 決定性抽卡：同一人同一天一定抽到同一張
import { CARDS, RARITIES, DAILY } from './pool.js';
import { CATEGORIES } from '../categories.js';

export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
const TOTAL = RARITIES.reduce((s, r) => s + r.weight, 0);

export function drawCard(dateKey, identity) {
  const rand = mulberry32(hashString(`${dateKey}|${identity}`));
  let roll = rand() * TOTAL, rarity = RARITIES[0];
  for (const r of RARITIES) { if (roll < r.weight) { rarity = r; break; } roll -= r.weight; }
  const card = pick(rand, CARDS.filter(c => c.rarity === rarity.id));
  const yi = pick(rand, DAILY.yi);
  const ji = pick(rand, DAILY.ji.filter(x => x !== yi));
  return {
    card,
    daily: {
      yi, ji,
      luckyCategory: pick(rand, CATEGORIES).id,
      luckyNumber: 1 + Math.floor(rand() * 99),
      luckyColor: pick(rand, DAILY.colors),
    },
  };
}

export function getGuestId(storage = globalThis.localStorage) {
  try {
    let id = storage.getItem('jl_guest_id');
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2);
      storage.setItem('jl_guest_id', id);
    }
    return id;
  } catch { return 'guest'; }
}
