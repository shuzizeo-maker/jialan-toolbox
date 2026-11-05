// 國定假日：優先讀 TaiwanCalendar（jsDelivr），失敗時改用 data/ 內建備援
export const CDN_URL = year => `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`;
const localUrl = year => new URL(`../data/holidays-${year}.json`, import.meta.url).href;

export function parseCalendar(json) {
  if (!Array.isArray(json)) throw new Error('holiday data must be an array');
  return json
    .filter(d => d && d.isHoliday && typeof d.description === 'string' && d.description.trim()
      && /^\d{8}$/.test(d.date))
    .map(d => ({ date: d.date, name: d.description.trim() }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function tryLoad(url, fetchFn, timeoutMs) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, ctrl ? { signal: ctrl.signal } : undefined);
    if (!res || !res.ok) throw new Error('bad response');
    return parseCalendar(await res.json());
  } finally { if (timer) clearTimeout(timer); }
}

export async function loadHolidays(year, fetchFn = fetch) {
  try { return await tryLoad(CDN_URL(year), fetchFn, 4000); } catch { /* fall back */ }
  try { return await tryLoad(localUrl(year), fetchFn, 4000); } catch { return []; }
}

const toUtc = key => Date.UTC(+key.slice(0, 4), +key.slice(4, 6) - 1, +key.slice(6, 8));

export function holidayStatus(list, key) {
  const today = list.find(h => h.date === key) ?? null;
  const after = list.filter(h => h.date > key);
  const next = after[0] ?? null;
  return {
    today, next,
    daysUntil: next ? Math.round((toUtc(next.date) - toUtc(key)) / 86400000) : null,
    upcoming: after.slice(0, 3),
  };
}
