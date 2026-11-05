// 每天第一次進站才播放翻牌開場
export function shouldShowOpening(dateKey, storage = globalThis.localStorage) {
  try {
    if (storage.getItem('jl_last_open') === dateKey) return false;
    storage.setItem('jl_last_open', dateKey);
    return true;
  } catch { return true; }
}
