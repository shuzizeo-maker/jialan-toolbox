# 部署設定步驟

照下面的步驟做一次，大約 20 分鐘，網站就能上線。

> **費用提醒**：整個網站只用 Firebase 的 **Spark（免費）方案**。全程**不要**升級成 Blaze 方案，也**不要**綁信用卡。這樣 Google 就沒有辦法向你收費。超過免費額度時，只會當天暫停，隔天自動恢復。

---

## 1. 建立 Firebase 專案

1. 打開 <https://console.firebase.google.com>，用你的 Google 帳號登入。
2. 按「建立專案」（或「新增專案」），專案名稱可以取 `jialan-toolbox`。
3. 「Google Analytics」可以關閉，然後按「建立專案」。

## 2. 啟用 Google 登入

1. 左側選單：**建構 → Authentication**，按「開始使用」。
2. 切到「**登入方式**」分頁，選擇 **Google**，把右上角的開關打開。
3. 「專案的公開名稱」填「嘉蘭國小教學行政工具庫」，並選擇「專案支援電子郵件」，按「儲存」。

## 3. 建立 Firestore 資料庫

1. 左側選單：**建構 → Firestore Database**，按「建立資料庫」。
2. 位置選 **`asia-east1`（臺灣）**。位置建立後就不能更改。
3. 選「以**正式版模式**啟動」，然後按「建立」。

## 4. 把網頁應用程式設定貼進網站

1. 點左上角齒輪 → **專案設定** → 「一般」分頁，往下捲到「你的應用程式」。
2. 按網頁圖示 **`</>`**，暱稱填 `toolbox`，**不要**勾選 Firebase Hosting，按「註冊應用程式」。
3. 畫面會出現一段 `const firebaseConfig = { ... }`。把裡面的 6 個值複製到本專案的 `js/firebase-config.js`，取代每一個 `REPLACE_ME`。

> 這些值是公開資訊，可以放上 GitHub。資料的安全性由下一步的安全規則負責。

## 5. 部署安全規則與索引

**方法 A：用指令（推薦，規則和索引一次完成）**

在專案資料夾執行：

```bash
npm install
```

```bash
npx firebase login
```

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project 你的專案ID
```

專案 ID 就是 `firebase-config.js` 裡的 `projectId`。

**方法 B：用主控台**

1. **Firestore Database → 規則** 分頁：把 `firestore.rules` 的全部內容貼上，然後按「發布」。
2. 索引：網站第一次查詢時，瀏覽器的開發者工具（F12 → Console）會出現「The query requires an index」的錯誤和一個連結。點那個連結，再按「建立」即可。需要的索引都列在 `firestore.indexes.json`。

## 6. 放上 GitHub Pages

1. 在 GitHub 建立一個新的 repository，例如 `jialan-toolbox`，設為 Public。
2. 把本專案推上去：

   ```bash
   git remote add origin https://github.com/你的帳號/jialan-toolbox.git
   ```

   ```bash
   git push -u origin main
   ```

3. 到 repo 的 **Settings → Pages**：Source 選「Deploy from a branch」，Branch 選 `main`、資料夾選 `/ (root)`，按 Save。
4. 等 1～2 分鐘，網址就是 `https://你的帳號.github.io/jialan-toolbox/`。

## 7. 加入授權網域

Google 登入只能在授權過的網域使用：

1. Firebase 主控台：**Authentication → 設定 → 授權網域**。
2. 按「新增網域」，填入 `你的帳號.github.io`（不用加 https 或路徑）。

## 8. 把自己設為第一位管理員

1. 打開網站，用 Google 登入，填完基本資料並送出。
2. Firebase 主控台：**Firestore Database → 資料**，點 `users` 集合，找到你的文件（文件裡的 email 是你的帳號）。
3. 把 `status` 改成 `approved`，把 `role` 改成 `admin`。
4. （選做）建立集合 `stats`，在裡面建立文件 ID 為 `site` 的文件，加入欄位 `memberCount`，類型選 number，值填 `1`。之後每次審核通過，網站會自動更新這個數字。
5. 回到網站重新整理，導覽列會出現「後台」。

完成！之後其他人申請時，到「後台 → 待審核會員」按「通過」即可。

---

## 之後改用學校網域（選做）

1. 在 repo 的 **Settings → Pages → Custom domain** 填入網域，例如 `tools.xxx.edu.tw`，並依 GitHub 的說明到學校 DNS 加一筆 CNAME 記錄。
2. 到 Firebase **Authentication → 設定 → 授權網域**，新增這個網域。

## 國定假日資料

網站會優先讀取線上的 TaiwanCalendar 資料，讀不到時才使用 `data/holidays-YYYY.json`。這些備援檔是人工整理的，每年人事行政總處公告新的辦公日曆表後，請更新或新增下一年度的檔案。

## 本機開發與測試（給維護者）

```bash
npm run emu
```

開另一個終端機視窗：

```bash
node tests/seed.js
```

```bash
npm run serve
```

然後打開 <http://localhost:5500/?emu>。測試指令：

```bash
npm run test:unit
```

```bash
npm run test:rules
```

`npm run test:rules` 要在 Emulator 沒有執行時跑；如果 Emulator 已經開著，改用 `node --test tests/rules.test.js`。另外，`node tests/flows.js all` 和 `node tests/screenshots.js` 需要 Emulator 和本機伺服器都在執行。
