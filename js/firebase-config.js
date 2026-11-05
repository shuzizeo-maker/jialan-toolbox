// 請貼上 Firebase 主控台 →「專案設定」→「你的應用程式」中的網頁應用程式設定。
// 這些值是公開資訊，可以提交到 GitHub；資料安全由 firestore.rules 負責。
export const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};
export const configured = firebaseConfig.apiKey !== 'REPLACE_ME';
