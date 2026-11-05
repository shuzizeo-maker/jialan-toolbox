// Firebase 主控台 →「專案設定」→「你的應用程式」中的網頁應用程式設定。
// 這些值是公開資訊，可以提交到 GitHub；資料安全由 firestore.rules 負責。
export const firebaseConfig = {
  apiKey: 'AIzaSyB5s88VxaNcwm0AH5Jw0isALc24kebZYyg',
  authDomain: 'jialan-toolbox.firebaseapp.com',
  projectId: 'jialan-toolbox',
  storageBucket: 'jialan-toolbox.firebasestorage.app',
  messagingSenderId: '753953590514',
  appId: '1:753953590514:web:517a6219db191439f8d46b',
};
export const configured = firebaseConfig.apiKey !== 'REPLACE_ME';
