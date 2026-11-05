// 初始化 Firebase；本機加上 ?emu 參數時改連 Emulator（測試用）
import {
  initializeApp, getAuth, connectAuthEmulator,
  initializeFirestore, connectFirestoreEmulator, persistentLocalCache, memoryLocalCache,
} from './fb-sdk.js';
import { firebaseConfig, configured } from './firebase-config.js';

function emuFlag() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!local) return false;
  try {
    if (new URLSearchParams(location.search).has('emu')) sessionStorage.setItem('jl_emu', '1');
    return sessionStorage.getItem('jl_emu') === '1';
  } catch { return new URLSearchParams(location.search).has('emu'); }
}

export const isEmu = emuFlag();
export const ready = configured || isEmu;

let app = null, auth = null, db = null;
if (ready) {
  app = initializeApp(isEmu ? { apiKey: 'demo-key', projectId: 'demo-jialan', authDomain: 'localhost' } : firebaseConfig);
  auth = getAuth(app);
  let cache;
  try { cache = isEmu ? memoryLocalCache() : persistentLocalCache(); } catch { cache = memoryLocalCache(); }
  db = initializeFirestore(app, { localCache: cache });
  if (isEmu) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}
export { app, auth, db };

import { describeError } from './errors.js';
/** 把 Firestore 錯誤轉成給人看的訊息 */
export function friendlyError(err) { return describeError(err, ready); }
