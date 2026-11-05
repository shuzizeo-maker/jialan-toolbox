// 工具清單的關鍵字篩選（純函式）
export function filterByKeyword(items, q) {
  const k = (q ?? '').trim().toLowerCase();
  if (!k) return items;
  return items.filter(t => [t.name, t.summary, t.author].some(v => String(v ?? '').toLowerCase().includes(k)));
}
