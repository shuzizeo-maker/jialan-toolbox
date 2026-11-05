// 錯誤訊息轉換（純函式）
/** 缺索引時，Firestore 錯誤訊息會附上主控台建立連結；只接受 Firebase 主控台網址 */
export function indexUrl(err) {
  if (!String(err?.code ?? '').includes('failed-precondition')) return null;
  const m = String(err?.message ?? '').match(/https:\/\/console\.firebase\.google\.com\/[^\s"')]+/);
  return m ? m[0] : null;
}

export function describeError(err, ready) {
  const code = err?.code ?? '';
  if (indexUrl(err)) return '資料庫還缺少一個索引（只需建立一次）。管理員請點下方連結，在 Firebase 主控台按「建立」，約 1～5 分鐘後重新整理。';
  if (code.includes('permission-denied')) return '沒有權限讀取這些資料。';
  if (code.includes('resource-exhausted')) return '今日使用量已達上限，明天自動恢復。';
  if (code.includes('unavailable') || code.includes('deadline')) return '暫時無法連線，請稍後再試。';
  if (!ready) return '網站尚未完成 Firebase 設定。';
  return '暫時無法載入，請稍後再試。';
}
