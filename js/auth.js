// 登入狀態：{ user, profile, state }，state 見 gate.js
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut,
  GoogleAuthProvider, signInWithCredential, doc, onSnapshot,
} from './fb-sdk.js';
import { auth, db, ready, isEmu } from './firebase.js';
import { stateOf } from './gate.js';

let session = { user: ready ? undefined : null, profile: ready ? undefined : null, state: ready ? 'loading' : 'guest' };
const listeners = new Set();
let unsubProfile = null;

function emit(user, profile) {
  session = { user, profile, state: stateOf(user, profile) };
  for (const cb of listeners) cb(session);
}

if (ready) {
  onAuthStateChanged(auth, user => {
    unsubProfile?.(); unsubProfile = null;
    if (!user) { emit(null, null); return; }
    emit(user, undefined);
    unsubProfile = onSnapshot(doc(db, 'users', user.uid),
      snap => emit(user, snap.exists() ? snap.data() : null),
      () => emit(user, null));
  });
}

export function onSession(cb) { listeners.add(cb); cb(session); return () => listeners.delete(cb); }
export function getSession() { return session; }

/** 等到狀態不是 loading */
export function sessionReady() {
  return new Promise(resolve => {
    const off = onSession(s => { if (s.state !== 'loading') { queueMicrotask(() => off()); resolve(s); } });
  });
}

export async function signIn() {
  if (!ready) { alert('網站尚未完成 Firebase 設定。'); return; }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e?.code)) {
      await signInWithRedirect(auth, provider);
    } else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
      alert('登入失敗，請再試一次。');
    }
  }
}

export async function signOut() { if (ready) await fbSignOut(auth); location.href = 'index.html'; }

// 僅限本機 Emulator：自動化測試用的登入捷徑
if (isEmu) {
  window.__emuSignIn = (email, name = email.split('@')[0]) =>
    signInWithCredential(auth, GoogleAuthProvider.credential(
      JSON.stringify({ sub: `sub-${email}`, email, email_verified: true, name })));
}
