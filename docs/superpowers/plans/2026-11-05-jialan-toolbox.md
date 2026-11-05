# 嘉蘭國小教學行政工具庫 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 建立一個仿舊式論壇風格的教學行政工具入口網站，部署在 GitHub Pages。功能包括 Google 登入加會員審核、工具分類與版本紀錄、按讚排行、收藏、許願池、今日好運卡和卡冊。

**Architecture：** 純 HTML、CSS、ES Modules，不需要建置步驟。每個頁面是一個 HTML 檔，搭配 `js/pages/<page>.js` 作為進入點，共用 `layout.js` 產生的版型和登入閘門。資料存在 Firestore（Spark 免費方案），權限全部由 `firestore.rules` 把關。純邏輯（日期、假日、抽卡、驗證）寫成不依賴 DOM 的模組，用 Node 內建測試。

**Tech Stack：** Firebase JS SDK（從 gstatic CDN 載入模組版，版本固定為與 devDependencies 中 `firebase` 相同的版本）、Firebase Auth（只開 Google）、Cloud Firestore、firebase-tools 搭配 `@firebase/rules-unit-testing`（測試規則）、`node --test`、Playwright（截圖）。

**Spec：** `docs/superpowers/specs/2026-11-05-jialan-toolbox-design.md`

## Global Constraints

- 網站名稱：「嘉蘭國小教學行政工具庫」。副標語：「好工具大家分享，下班追劇不是夢」。
- 介面文字一律使用正體中文（臺灣用語）。
- 處室分類固定 12 類，依序為：校長、教務處、學務處、總務處、輔導室、人事會計、導師、科任、教學、附幼、進修部、其他。代表字依序為：校、教、學、總、輔、人、導、科、課、幼、進、其。
- 職務選項：校長、主任、組長、教師、職員。縣市預設「臺東縣」，學校預設「嘉蘭國小」。
- 時區一律使用 Asia/Taipei。日期鍵格式為 `yyyymmdd`。民國年 = 西元年 − 1911。
- 使用者資料只能用 `textContent` 或 `js/dom.js` 的 `h()` 輸出。**任何檔案都禁止把使用者資料放進 `innerHTML`。**
- 網址欄位只接受 `https://` 開頭。外部連結一律加上 `target="_blank" rel="noopener noreferrer"`。
- 每個 Firestore 查詢都要加 `limit`：最新修正 8 筆、排行 10 筆、公告 3 筆、清單每頁 30 筆。
- 必須維持 Spark 方案：不使用 Cloud Functions、Storage，或任何需要 Blaze 方案的功能。
- 網站在執行時期不需要任何 npm 套件。`package.json` 只放開發和測試用的工具。
- 外部網路資源只限以下三個：gstatic 的 Firebase SDK、TaiwanCalendar 的 jsDelivr JSON、Google Fonts（Noto Sans TC）。
- 版面斷點：寬度 768px 以下為單欄手機版。

## Review Focus

1. **登入後網頁先閃出主畫面、身分狀態還沒載入完就點連結**：狀態未確定前，所有受限連結都應視為受限，不能放行。→ Task 6 的 `gateClick` 測試。
2. **使用者在名稱、摘要、許願中輸入 `<img onerror>` 或 `javascript:` 網址**：必須以純文字顯示，網址必須被拒絕。→ Task 2 的 `isHttpsUrl` 測試，以及 Task 12 的截圖檢查。
3. **使用者在臺北時間午夜前後操作，或電腦時區不是臺北**：卡片日期和時鐘應以臺北時間為準。→ Task 2 的 `todayKey` 測試，以及 Task 4 的規則時區測試。
4. **假日 CDN 被擋或回傳格式異常**：應改用內建 JSON，不能讓整個主畫面壞掉。→ Task 3 的 `loadHolidays` 測試。
5. **快速連點按讚或 +1**：計數不可以重複加，也不可以變成負數。→ Task 4 的規則測試，以及 Task 9 的 `toggleLike` 使用交易。

---

## File Structure

| 檔案 | 職責 |
|---|---|
| `js/categories.js` | 處室清單與查詢 |
| `js/clock.js` | 臺北時間拆解、民國格式、日期鍵、時鐘元件 |
| `js/holidays.js` | 假日解析、載入（CDN 優先，失敗時用備援）、狀態計算 |
| `js/validate.js` | 網址和表單驗證（純函式） |
| `js/dom.js` | 安全的 DOM 建構工具 `h()`、`clear()` |
| `js/luckcard/pool.js` | 卡池、屬性、稀有度、每日詞庫（純資料） |
| `js/luckcard/draw.js` | 雜湊、亂數產生器、抽卡（純函式） |
| `js/luckcard/render.js` | 卡片 DOM、翻牌開場、縮圖 |
| `js/firebase-config.js` | Firebase 專案設定（由網站擁有者填寫） |
| `js/firebase.js` | 初始化、本機 Emulator 切換、匯出 `auth`、`db` |
| `js/auth.js` | 身分狀態 |
| `js/layout.js` | 橫幅、導覽列、側欄、頁尾、閘門、字級 |
| `js/tools.js`、`js/wishes.js`、`js/cards.js`、`js/admin.js`、`js/announcements.js` | 各功能的 Firestore 資料層 |
| `js/pages/*.js` | 各頁面的進入點 |
| `css/base.css`、`css/card.css` | 樣式 |
| `firestore.rules`、`firestore.indexes.json`、`firebase.json` | 後端設定 |
| `tests/*.test.js`、`tests/seed.js`、`tests/screenshots.js` | 測試、Emulator 種子資料、截圖 |
| `docs/setup.md`、`README.md` | 設定說明 |

**相對於規格的實作細節：** 統計數字的做法如下。

- 工具數用 Firestore 的 `count()` 聚合查詢，條件是 `tools` 中 `status == published`。
- 版本數用 collectionGroup `versions` 中 `toolStatus == published` 的 `count()`。
- 會員數由 `stats/site.memberCount` 提供，管理員審核時一併更新。
- 待審核數只有管理員看得到，用 `users` 中 `status == pending` 的 `count()`。

這樣做是因為上傳者新增版本時不能寫入 `stats`，改用聚合查詢就不會有這個問題，而且每 1000 筆只算 1 次讀取。

---

### Task 1：專案骨架與測試工具

**Files:**
- Create: `package.json`, `.gitignore`, `firebase.json`, `README.md`, `js/categories.js`, `tests/unit.test.js`

**Interfaces:**
- Produces: `CATEGORIES: Array<{id, name, icon, color}>`，id 依序為 `principal, academic, student, general, counseling, personnel, homeroom, subject, teaching, preschool, extension, other`。以及 `getCategory(id) -> category | CATEGORIES.at(-1)`。
- Produces: npm scripts `test:unit` = `node --test tests/unit.test.js`、`test:rules` = `firebase emulators:exec --only firestore "node --test tests/rules.test.js"`、`serve` = `npx http-server -p 5500 -c-1 .`、`emu` = `firebase emulators:start --only auth,firestore`。

- [ ] **Step 1：** 建立 `package.json`（`"type": "module"`；devDependencies 包含 `firebase-tools`、`@firebase/rules-unit-testing`、`firebase`、`http-server`，全部固定精確版本）。`firebase.json` 設定 firestore rules 和 indexes 路徑，以及 emulators：auth 9099、firestore 8080、ui 關閉。`.gitignore` 排除 `node_modules`、`*.log`、`screenshots/`。
- [ ] **Step 2：寫失敗的測試** `categories`：
  ```js
  test('categories: 12 fixed in spec order', () => {
    assert.deepEqual(CATEGORIES.map(c => c.name),
      ['校長','教務處','學務處','總務處','輔導室','人事會計','導師','科任','教學','附幼','進修部','其他']);
    assert.deepEqual(CATEGORIES.map(c => c.icon), ['校','教','學','總','輔','人','導','科','課','幼','進','其']);
    assert.equal(new Set(CATEGORIES.map(c => c.id)).size, 12);
    assert.equal(getCategory('nope').name, '其他');
  });
  ```
- [ ] **Step 3：** 執行 `npm install && npm run test:unit`。預期結果：FAIL（模組不存在）。
- [ ] **Step 4：** 實作 `js/categories.js`，每類的顏色要兩兩不同。
- [ ] **Step 5：** 執行 `npm run test:unit`。預期結果：PASS。
- [ ] **Step 6：** Commit：`chore: 專案骨架與處室分類`。

### Task 2：時鐘、驗證與 DOM 工具

**Files:**
- Create: `js/clock.js`, `js/validate.js`, `js/dom.js`
- Test: `tests/unit.test.js`

**Interfaces:**
- Produces（clock.js）：
  - `taipeiParts(date: Date) -> {y, m, d, hh, mm, ss, weekday}`：weekday 為「日一二三四五六」其中一字。實作用 `Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei', ...}).formatToParts`。
  - `todayKey(date = new Date()) -> 'yyyymmdd'`
  - `formatRoc(date) -> '115年11月5日（四）13:34'`
  - `startClock(el, now = () => new Date()) -> stopFn`：每秒更新 `el.textContent`。
- Produces（validate.js）：
  - `isHttpsUrl(s) -> boolean`：用 `new URL` 解析，protocol 必須是 `https:`，且必須有 hostname。
  - `validateProfile(p) -> {ok, errors: {field: msg}}`：realName 必填且 1～20 字（先 trim）；jobTitle 必須在 `JOB_TITLES` 中；county 必須在 `COUNTIES`（22 個縣市）中；school 必填且 1～30 字。
  - `validateTool(t, links) -> {ok, errors}`：name 1～60 字；summary 1～300 字；category 必須是合法 id；author 1～30 字；authorGithub 可以空白，有填時必須符合 `^[A-Za-z0-9-]{1,39}$`；三個網址至少有一個，且有填的都必須通過 `isHttpsUrl`。
  - `validateWish(w)`：title 1～60 字，detail 0～500 字，category 必須是合法 id。
  - 常數 `JOB_TITLES`、`COUNTIES`。
- Produces（dom.js）：
  - `h(tag, attrs?, ...children) -> Element`：字串型別的 children 一律用 `document.createTextNode`；attrs 支援 `class`、`dataset`、`on<Event>`、其他 setAttribute。設定 `href` 時，只接受 `https:`、相對路徑和 `#` 開頭，其他一律改成 `#`。
  - `clear(el)`

- [ ] **Step 1：寫失敗的測試：**
  ```js
  test('todayKey uses Taipei time', () => {
    assert.equal(todayKey(new Date('2026-11-04T16:30:00Z')), '20261105'); // 臺北 00:30
    assert.equal(todayKey(new Date('2026-12-31T15:59:00Z')), '20261231');
    assert.equal(todayKey(new Date('2026-12-31T16:00:00Z')), '20270101');
  });
  test('formatRoc', () => {
    assert.equal(formatRoc(new Date('2026-11-05T05:34:00Z')), '115年11月5日（四）13:34');
  });
  test('isHttpsUrl', () => {
    for (const ok of ['https://a.github.io/x/', 'https://github.com/u/r']) assert.ok(isHttpsUrl(ok));
    for (const bad of ['http://a.com', 'javascript:alert(1)', 'https://', '', ' ', 'ftp://x', 'data:text/html,x'])
      assert.equal(isHttpsUrl(bad), false);
  });
  test('validateProfile', () => {
    assert.ok(validateProfile({county:'臺東縣', school:'嘉蘭國小', realName:'王小明', jobTitle:'教師'}).ok);
    assert.ok(validateProfile({county:'臺東縣', school:'嘉蘭國小', realName:'   ', jobTitle:'教師'}).errors.realName);
    assert.ok(validateProfile({county:'臺東縣', school:'嘉蘭國小', realName:'王', jobTitle:'工友'}).errors.jobTitle);
  });
  test('validateTool requires at least one https link', () => {
    const t = {name:'x', summary:'y', category:'academic', author:'z', authorGithub:''};
    assert.ok(validateTool(t, {}).errors.links);
    assert.ok(validateTool(t, {onlineUrl:'http://x.com'}).errors.onlineUrl);
    assert.ok(validateTool(t, {sourceUrl:'https://github.com/a/b'}).ok);
  });
  ```
  另外寫 `h()` 的測試：`tests/dom.test.js` 使用 Node 22 沒有內建的 DOM，所以改用 Playwright 的 `page.evaluate`，放在 Task 12 測。這裡只測純函式。
- [ ] **Step 2：** 執行 `npm run test:unit`。預期結果：FAIL。
- [ ] **Step 3：** 實作三個模組。
- [ ] **Step 4：** 執行 `npm run test:unit`。預期結果：PASS。
- [ ] **Step 5：** Commit：`feat: 民國時鐘、表單驗證、安全 DOM 工具`。

### Task 3：國定假日

**Files:**
- Create: `js/holidays.js`, `data/holidays-2026.json`, `data/holidays-2027.json`
- Test: `tests/unit.test.js`

**Interfaces:**
- 資料格式與 TaiwanCalendar 相同：`[{date:'20261010', week:'六', isHoliday:true, description:'國慶日'}]`。
- Produces：
  - `parseCalendar(json) -> Holiday[]`：Holiday 的格式是 `{date:'yyyymmdd', name}`。只保留 `isHoliday && description` 非空白的項目，依日期排序。輸入不是陣列時丟出錯誤。
  - `loadHolidays(year, fetchFn = fetch) -> Promise<Holiday[]>`：先嘗試 `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`（逾時 4 秒）。失敗或解析錯誤時改讀 `./data/holidays-${year}.json`。兩者都失敗時回傳 `[]`。
  - `holidayStatus(list, key) -> {today: Holiday|null, next: Holiday|null, daysUntil: number|null, upcoming: Holiday[]}`：upcoming 是今天之後的前 3 個。daysUntil 以日曆天計算。
  - `CDN_URL(year)`。

- [ ] **Step 1：** 建立備援 JSON，只放有名稱的國定假日和補假。2026 年（民國 115 年）的內容依人事行政總處公告的 115 年辦公日曆表；2027 年則依 116 年辦公日曆表（如果還沒公告，只放固定日期的國定假日，並在 `README.md` 註明「待公告後更新」）。實作時無法連網核對的話，要在 commit 訊息和 README 中標註「需人工核對」。
- [ ] **Step 2：寫失敗的測試：**
  ```js
  const sample = [
    {date:'20261009', week:'五', isHoliday:true, description:'國慶日補假'},
    {date:'20261010', week:'六', isHoliday:true, description:'國慶日'},
    {date:'20261011', week:'日', isHoliday:true, description:''},
    {date:'20261225', week:'五', isHoliday:true, description:'行憲紀念日'},
  ];
  test('parseCalendar drops plain weekends', () => {
    assert.deepEqual(parseCalendar(sample).map(h => h.date), ['20261009','20261010','20261225']);
    assert.throws(() => parseCalendar({}));
  });
  test('holidayStatus', () => {
    const l = parseCalendar(sample);
    const s = holidayStatus(l, '20261010');
    assert.equal(s.today.name, '國慶日');
    assert.equal(s.next.name, '行憲紀念日');
    assert.equal(holidayStatus(l, '20261105').daysUntil, 50);
    assert.equal(holidayStatus(l, '20261226').next, null);
  });
  test('loadHolidays falls back on CDN failure and bad JSON', async () => {
    const fallback = [{date:'20270101', week:'五', isHoliday:true, description:'開國紀念日'}];
    const mk = (cdn) => async (url) => url.startsWith('https://cdn') ? cdn()
      : { ok: true, json: async () => fallback };
    for (const cdn of [() => { throw new Error('blocked'); }, async () => ({ ok:false }), async () => ({ ok:true, json: async () => ({oops:1}) })])
      assert.equal((await loadHolidays(2027, mk(cdn)))[0].name, '開國紀念日');
    assert.deepEqual(await loadHolidays(2027, async () => { throw new Error('x'); }), []);
  });
  ```
- [ ] **Step 3：** 執行 `npm run test:unit`。預期結果：FAIL。
- [ ] **Step 4：** 實作 `js/holidays.js`。
- [ ] **Step 5：** 執行 `npm run test:unit`。預期結果：PASS。
- [ ] **Step 6：** Commit：`feat: 國定假日載入與狀態計算`。

### Task 4：Firestore 安全規則與索引

**Files:**
- Create: `firestore.rules`, `firestore.indexes.json`, `tests/rules.test.js`

**Interfaces:**
- 資料路徑和欄位依規格第 5 節，`stats/site` 只有 `memberCount`。
- 規則輔助函式：
  - `signedIn()`
  - `me()`：`get(/databases/$(database)/documents/users/$(request.auth.uid)).data`
  - `isMember()`：`me().status == 'approved'`
  - `isAdmin()`：`isMember() && me().role == 'admin'`
  - `taipeiKey()`：取 `request.time + duration.value(8, 'h')`，把年、月、日轉成字串並補零，組成 yyyymmdd。
- 按讚的規則寫法：建立 `likes/{uid}` 時，規則要求 `getAfter(tool).data.likeCount == get(tool).data.likeCount + 1`；刪除時要求 −1。更新 tool 的 likeCount 時，同樣用 `existsAfter` 和 `exists` 比對 like 文件。votes 和 `voteCount` 採相同寫法。
- 各集合的白名單欄位用 `request.resource.data.keys().hasOnly([...])` 限制；字串長度與 `validate.js` 一致；網址用 `matches('^https://[^\\s]+$')` 檢查。
- `firestore.indexes.json`：
  - collectionGroup `versions`：`toolStatus ASC, createdAt DESC`
  - `tools`：`status ASC, likeCount DESC`
  - `tools`：`status ASC, updatedAt DESC`
  - `tools`：`status ASC, category ASC, updatedAt DESC`
  - `wishes`：`status ASC, voteCount DESC`
  - `users`：`status ASC, createdAt ASC`

- [ ] **Step 1：寫失敗的測試**（使用 `initializeTestEnvironment` 並載入規則檔）。用 `withSecurityRulesDisabled` 建立的種子資料：alice（approved）、admin（approved、role admin）、pete（pending）、sam（suspended）、published 工具 t1（likeCount 0，附 links 與 version）、pending 工具 t2。每個測試的名稱與斷言如下：
  - `guest reads published tool, not links`：訪客讀 t1 → succeeds；讀 `t1/private/links` → fails。
  - `pending and suspended cannot read links; member can`
  - `guest cannot read pending tool t2; uploader and admin can`
  - `user creates own profile only as pending/user`：建立 `{status:'approved'}` → fails；建立 `{status:'pending', role:'user', …}` → succeeds。
  - `user cannot change own status/role; can change realName`
  - `admin can approve user`
  - `member creates tool only as pending with likeCount 0`；`pending user cannot create tool`
  - `non-admin cannot publish`：alice 把自己的工具改成 published → fails。
  - `like must pair with +1 in same batch`：只寫 like 文件 → fails；只把 likeCount 加 1 → fails；兩者在同一批次 → succeeds；再按讚一次 → fails；取消讚並 −1 → succeeds。
  - `cannot like as someone else`
  - `card only for today (Taipei)`：建立 `cards/{todayKey()}` → succeeds（測試中以 `todayKey(new Date())` 計算）；建立昨天的 → fails；更新今天的 → fails；刪除 → fails。
  - `vote pairs with voteCount like likes`
  - `only admin writes announcements and stats/site; anyone reads announcements`
  - `link urls must be https`：pending 工具的上傳者寫入 `onlineUrl:'javascript:alert(1)'` → fails。
  - `suspended behaves as guest for member writes`：sam 許願 → fails。
- [ ] **Step 2：** 執行 `npm run test:rules`，並先放一份全部拒絕的空規則。預期結果：所有應該成功的測試都 FAIL。
- [ ] **Step 3：** 實作 `firestore.rules` 和 `firestore.indexes.json`。
- [ ] **Step 4：** 執行 `npm run test:rules`。預期結果：全部 PASS。如果測試剛好在臺北午夜前後執行，日期測試可能不穩定，可以接受。
- [ ] **Step 5：** Commit：`feat: Firestore 安全規則、索引與規則測試`。

### Task 5：好運卡池與抽卡

**Files:**
- Create: `js/luckcard/pool.js`, `js/luckcard/draw.js`
- Test: `tests/unit.test.js`

**Interfaces:**
- Produces（pool.js）：
  - `ELEMENTS`：6 種屬性 `{id, name, gradient:[c1,c2]}`，id 依序為 `admin, teach, counsel, general, sports, arts`，名稱依序為行政系、教學系、輔導系、總務系、體育系、藝文系。
  - `RARITIES = [{id:'N',weight:50,count:24},{id:'R',weight:28,count:16},{id:'SR',weight:15,count:12},{id:'SSR',weight:6,count:6},{id:'UR',weight:1,count:2}]`
  - `CARDS`：共 60 張，每張是 `{no:1..60, name, emoji, element, rarity, hp, skills:[{name, cost:1..3, desc},{…}], quote}`。hp 範圍依稀有度：N 為 50～90、R 為 80～110、SR 為 100～140、SSR 為 130～170、UR 為 180～220。內容要以校園日常為主題，帶點幽默。
  - `DAILY = {yi: string[≥20], ji: string[≥20], colors: [{name, hex}≥8]}`
- Produces（draw.js）：
  - `hashString(s) -> uint32`（FNV-1a）
  - `mulberry32(seed) -> () => number in [0,1)`
  - `drawCard(dateKey, identity) -> {card, daily:{yi, ji, luckyCategory: categoryId, luckyNumber: 1..99, luckyColor:{name,hex}}}`：種子為 `hashString(dateKey + '|' + identity)`。依序抽稀有度、再抽卡片、再抽每日欄位；yi 和 ji 不可以相同。
  - `getGuestId(storage = globalThis.localStorage) -> string`：在 try/catch 中讀寫 key `jl_guest_id`（`crypto.randomUUID()`）。失敗時回傳 `'guest'`。

- [ ] **Step 1：寫失敗的測試：**
  ```js
  test('pool integrity', () => {
    assert.equal(CARDS.length, 60);
    assert.deepEqual(CARDS.map(c => c.no), Array.from({length:60}, (_, i) => i + 1));
    for (const r of RARITIES) assert.equal(CARDS.filter(c => c.rarity === r.id).length, r.count);
    for (const c of CARDS) { assert.equal(c.skills.length, 2); assert.ok(ELEMENTS.some(e => e.id === c.element)); }
  });
  test('drawCard deterministic per date+identity', () => {
    assert.deepEqual(drawCard('20261105', 'u1'), drawCard('20261105', 'u1'));
    const ids = new Set(Array.from({length:30}, (_, i) => drawCard(`202611${String(i+1).padStart(2,'0')}`, 'u1').card.no));
    assert.ok(ids.size > 10);
  });
  test('rarity distribution within 1%', () => {
    const n = 100000, cnt = {};
    for (let i = 0; i < n; i++) { const r = drawCard('20261105', 'id' + i).card.rarity; cnt[r] = (cnt[r] || 0) + 1; }
    for (const r of RARITIES) assert.ok(Math.abs(cnt[r.id] / n * 100 - r.weight) < 1, r.id);
  });
  test('daily yi != ji, luckyCategory valid', () => {
    for (let i = 0; i < 500; i++) { const d = drawCard('20261105', 'x' + i).daily;
      assert.notEqual(d.yi, d.ji); assert.ok(CATEGORIES.some(c => c.id === d.luckyCategory)); }
  });
  test('getGuestId survives throwing storage', () => {
    assert.equal(getGuestId({ getItem(){ throw 1; }, setItem(){ throw 1; } }), 'guest');
    const m = new Map(), s = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
    assert.equal(getGuestId(s), getGuestId(s));
  });
  ```
- [ ] **Step 2：** 執行 `npm run test:unit`。預期結果：FAIL。
- [ ] **Step 3：** 實作 pool.js（60 張卡的內容）和 draw.js。
- [ ] **Step 4：** 執行 `npm run test:unit`。預期結果：PASS。
- [ ] **Step 5：** Commit：`feat: 今日好運卡卡池與決定性抽卡`。

### Task 6：Firebase 初始化、身分狀態與共用版型

**Files:**
- Create: `js/firebase-config.js`, `js/firebase.js`, `js/auth.js`, `js/layout.js`, `js/gate.js`, `css/base.css`, `tests/seed.js`
- Test: `tests/unit.test.js`（只測 `gate.js` 的純函式）

**Interfaces:**
- `firebase-config.js`：`export const firebaseConfig = {apiKey:'REPLACE_ME', …}`；`export const configured = firebaseConfig.apiKey !== 'REPLACE_ME'`。
- `firebase.js`：匯出 `{app, auth, db, ready: boolean}`。
  - 網址帶 `?emu` 時把旗標存入 sessionStorage；當 hostname 是 `localhost` 或 `127.0.0.1`，且旗標存在時，連到 Emulator（auth 9099、firestore 8080）並使用 demo 專案 id `demo-jialan`。
  - 開啟 `persistentLocalCache`。
  - 沒有設定也沒有啟用 Emulator 時，`ready=false`，其他模組顯示離線狀態。
- `gate.js`（純函式）：
  - `stateOf(user, profile) -> 'loading'|'guest'|'noprofile'|'pending'|'approved'|'suspended'`
  - `isMember(state)`、`isAdmin(state, profile)`
  - `gateClick(state, requires) -> null | {title, message, action:'login'|'profile'|null}`：requires 為 `'member'` 或 `'admin'`；state 為 `'loading'` 時一律攔截。
  - `gateMessage(state)`：各身分對應的正體中文提示，依規格第 9 節。
- `auth.js`：
  - `onSession(cb)`：cb 收到 `{user, profile, state}`；監聽登入狀態，並用 onSnapshot 監聽 `users/{uid}`，資料一變就重新通知。
  - `signIn()`：使用 `signInWithPopup` 加上 GoogleAuthProvider，在手機上被阻擋時改用 redirect。
  - `signOut()`、`getSession()`。
- `layout.js`：
  - `initLayout({page, requires = null}) -> Promise<session>`：在 `#app` 中產生橫幅、導覽列（含 `startClock` 和假日資訊）、左側欄（處室計數、收合狀態記在 localStorage）、`<main id="main">`、頁尾。
  - 對所有 `a[data-requires]` 的點擊呼叫 `gateClick`，被攔截時顯示對話框。`requires` 不符合時，main 改成顯示閘門訊息，並回傳 session 讓頁面自行判斷。
  - state 為 `noprofile` 且目前頁面不是 profile 時，導向 `profile.html`。
  - 字級切換：在 `<html>` 加上 class `fs-s`、`fs-m` 或 `fs-l`，並存入 localStorage `jl_fs`。
- `base.css`：用 `:root` 變數定義配色：
  - `--banner:#1f4e8c`
  - `--nav:#2d63a8`
  - `--block-head:#3a74bf`
  - `--accent:#e8892b`
  - `--bg:#eef1f5`
  - `--panel:#fff`

  區塊標題做成斜角標籤（用 `clip-path`），三欄 grid 寬度為 `220px 1fr 300px`，768px 以下改成單欄並啟用漢堡選單，另含徽章、表格、按鈕、對話框樣式。
- `tests/seed.js`：用 Admin 權限（`withSecurityRulesDisabled` 或 Emulator REST）建立示範資料，包含：
  - 3 位使用者（管理員、會員、待審核者）
  - 8 個 published 工具，分布在各處室，含版本和讚數
  - 1 個 pending 工具
  - 3 則公告
  - 4 個許願
  - `stats/site`

  另外在 Auth Emulator 建立對應帳號。執行方式：`npm run emu` 之後再執行 `node tests/seed.js`。

- [ ] **Step 1：寫失敗的測試：**
  ```js
  test('gateClick', () => {
    assert.ok(gateClick('loading', 'member'));
    assert.equal(gateClick('guest', 'member').action, 'login');
    assert.equal(gateClick('noprofile', 'member').action, 'profile');
    assert.ok(gateClick('pending', 'member').message.includes('審核中'));
    assert.ok(gateClick('suspended', 'member').message.includes('停用'));
    assert.equal(gateClick('approved', 'member'), null);
    assert.ok(gateClick('approved', 'admin'));          // 一般會員不能進後台
  });
  test('stateOf', () => {
    assert.equal(stateOf(undefined, undefined), 'loading');
    assert.equal(stateOf(null, null), 'guest');
    assert.equal(stateOf({uid:'a'}, null), 'noprofile');
    assert.equal(stateOf({uid:'a'}, {status:'approved'}), 'approved');
  });
  ```
  `isAdmin` 由呼叫端傳入 profile 判斷。`gateClick` 處理 admin 需求時，接收 `(state, requires, profile)`。
- [ ] **Step 2：** 執行 `npm run test:unit`。預期結果：FAIL。
- [ ] **Step 3：** 實作 gate.js，再實作其他模組和 base.css。另外建立一個暫時的 `index.html`，只呼叫 `initLayout({page:'home'})`。
- [ ] **Step 4：** 執行 `npm run test:unit`。預期結果：PASS。手動驗證：執行 `npm run emu`、`node tests/seed.js`、`npm run serve`，用 Playwright 打開 `http://localhost:5500/?emu`，截圖確認橫幅、導覽列、時鐘、側欄都正確，且點側欄的處室連結時會跳出「請先登入」對話框。
- [ ] **Step 5：** Commit：`feat: Firebase 初始化、身分狀態、論壇版型與登入閘門`。

### Task 7：好運卡畫面與主畫面

**Files:**
- Create: `js/luckcard/render.js`, `css/card.css`, `js/announcements.js`, `js/pages/home.js`, `js/tools.js`（本任務只做主畫面需要的讀取函式）, `js/cards.js`
- Modify: `index.html`

**Interfaces:**
- Consumes：`drawCard`、`getGuestId`、`todayKey`、`initLayout`、`h`、`loadHolidays`、`holidayStatus`、`getCategory`。
- Produces（render.js）：
  - `renderCard({card, daily}, {dateKey, size:'full'|'thumb'}) -> Element`：版面依規格第 7 節，上方是稀有度星級和 HP，接著是卡名、插圖框（屬性漸層加 emoji）、屬性、兩個技能（能量用 ⚡ 表示）、宜和忌、幸運處室、幸運數字、幸運色、鼓勵語，底部是 `No.042 / 2026.11.05`。class 名稱為 `lc lc-<rarity> lc-el-<element>`。
  - `showOpening(result, dateKey) -> Promise<void>`：全螢幕遮罩，先顯示卡背，點擊後翻面（CSS 3D rotateY），SSR 和 UR 加上光芒和粒子效果。可以按 Esc、按鈕或點遮罩外圍關閉。系統設定 `prefers-reduced-motion` 時不播放動畫。
  - `shouldShowOpening(dateKey, storage) -> boolean`：讀寫 localStorage `jl_last_open`，讀寫失敗時回傳 true。
- Produces（tools.js 讀取函式）：
  - `listLatestVersions(n = 8)`：collectionGroup 查詢，條件 `toolStatus == published`，依 createdAt 由新到舊。
  - `listTopTools(n = 10)`
  - `countPublishedTools()`、`countPublishedVersions()`
- Produces（announcements.js）：`listAnnouncements(n = 3)`：先取 pinned 為 true 的，再依日期由新到舊，在前端合併排序。
- Produces（cards.js）：`saveTodayCard(uid, dateKey, card)`：文件已存在時忽略 permission-denied 錯誤。`listMyCards(uid, n = 400)`。
- `home.js`：
  1. 呼叫 `initLayout({page:'home'})`。
  2. 依身分抽卡：會員用 uid，訪客用 `getGuestId()`。需要時播放開場，會員則同時存入卡冊。
  3. 中欄：最新修正，每列是處室徽章、工具名（連到 `tool.html?id=` 並加上 `data-requires="member"`）、`vN` 標籤、修改摘要、日期。下方是排行表格。
  4. 右欄：統計、公告、好運卡縮圖（點擊放大）、最近 3 個假日、Help。
  5. 手機版依規格的順序排列。
  6. Firestore 失敗時，各區塊各自顯示錯誤訊息和重試按鈕（resource-exhausted 顯示額度用完的文案），互不影響。

- [ ] **Step 1：寫失敗的測試**（加在 unit.test.js）：
  ```js
  test('shouldShowOpening once per day, true on storage failure', () => {
    const m = new Map(), s = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
    assert.equal(shouldShowOpening('20261105', s), true);
    assert.equal(shouldShowOpening('20261105', s), false);
    assert.equal(shouldShowOpening('20261106', s), true);
    assert.equal(shouldShowOpening('20261105', { getItem(){ throw 1; }, setItem(){ throw 1; } }), true);
  });
  ```
  `shouldShowOpening` 放在 `js/luckcard/opening-state.js`，讓 Node 可以直接匯入，不需要 DOM。
- [ ] **Step 2：** 執行 `npm run test:unit`。預期結果：FAIL。
- [ ] **Step 3：** 實作上述所有模組。
- [ ] **Step 4：** 執行 `npm run test:unit`。預期結果：PASS。在 Emulator 下用 Playwright 截圖以下五種情況並自行檢查：
  - 訪客首次進站（有開場）
  - 關閉開場後的主畫面
  - 手機寬度 390px
  - 強制顯示 SSR 卡（加 `?card=55` 參數，只有在 Emulator 模式下才生效）
  - 未設定 Firebase 時的離線狀態
- [ ] **Step 5：** Commit：`feat: 主畫面、今日好運卡開場與縮圖`。

### Task 8：基本資料與管理員後台

**Files:**
- Create: `profile.html`, `js/pages/profile.js`, `admin.html`, `js/pages/admin.js`, `js/admin.js`

**Interfaces:**
- `profile.js`：
  - 表單欄位依規格第 4 節。縣市和職務是下拉選單，學校是文字輸入，Email 唯讀。
  - 用 `validateProfile` 檢查，錯誤訊息顯示在各欄位下方。
  - 第一次送出時以 `setDoc` 建立 `{…, email, displayName, status:'pending', role:'user', createdAt, updatedAt}`；之後只用 `updateDoc` 更新基本資料欄位和 updatedAt。
  - 送出後顯示「已送出，請等待管理員審核」。
- `admin.js`（資料層）：
  - `listUsersByStatus(status, n = 50)`
  - `approveUser(uid)`：用批次寫入，把 status 改成 approved，並把 `stats/site.memberCount` 加 1（文件不存在時建立）。
  - `rejectUser(uid)`：刪除該使用者文件。
  - `setSuspended(uid, bool)`：同時調整 memberCount（±1）。
  - `setRole(uid, role)`
  - `countPendingUsers()`
  - `listPendingTools()`
  - `publishTool(id)`：用批次寫入，tool 改成 published，並把所有 versions 的 toolStatus 改成 published。
  - `returnTool(id)`：刪除工具，連同 links 和 versions。
  - `saveAnnouncement(a)`、`deleteAnnouncement(id)`
  - `markWishDone(wishId, toolId | null)`
- `pages/admin.js`：用 `initLayout({page:'admin', requires:'admin'})`，分頁依規格第 6 節。待審核工具可以預覽三個網址。危險操作（拒絕、停權、退回）先用 `confirm()` 確認。

- [ ] **Step 1：** 規則的行為已經由 Task 4 的測試涵蓋，這裡沒有新的純函式。改為寫 Playwright 腳本 `tests/flows.js` 的第一段 `profileAndApprove`，在 Emulator 下依序驗證：
  1. 用新帳號登入。可以用 Auth Emulator 的 `signInWithCredential` 加上假 Google token，或直接用 Emulator 的 `signInWithPopup` 選帳號畫面。
  2. 被導向 profile 頁，填寫並送出。
  3. 首頁顯示「審核中」，點工具會被攔截。
  4. 管理員登入後台、通過申請。
  5. 原本的帳號重新整理後，可以進入 `tools.html`。
- [ ] **Step 2：** 執行 `node tests/flows.js profileAndApprove`。預期結果：FAIL（頁面不存在）。
- [ ] **Step 3：** 實作上述頁面和模組。
- [ ] **Step 4：** 執行 `node tests/flows.js profileAndApprove`。預期結果：PASS。
- [ ] **Step 5：** Commit：`feat: 基本資料填寫與管理員後台`。

### Task 9：工具清單、詳細頁、按讚與收藏

**Files:**
- Create: `tools.html`, `tool.html`, `favorites.html`, `js/pages/tools.js`, `js/pages/tool.js`, `js/pages/favorites.js`
- Modify: `js/tools.js`

**Interfaces:**
- Produces（tools.js）：
  - `listTools({category = null, sort = 'new'|'likes', after = null}) -> {items, cursor}`：每頁 30 筆。
  - `getTool(id)`、`getLinks(id)`、`listVersions(id)`
  - `toggleLike(toolId, uid) -> Promise<boolean>`：在 `runTransaction` 中讀取 like 文件，存在時刪除並把 likeCount −1，否則建立並 +1。回傳的是交易完成後的狀態。
  - `hasLiked(toolId, uid)`
  - `toggleFavorite(toolId, uid) -> boolean`、`isFavorite(toolId, uid)`、`listFavorites(uid) -> tool[]`
  - `filterByKeyword(items, q) -> items`（純函式）：比對 name、summary、author，不分大小寫，忽略前後空白；q 是空的時回傳全部。
- `tools.html`：上方是處室標籤列（含「全部」，網址參數為 `?cat=`）、搜尋框、排序切換，下方是清單和「載入更多」按鈕。
- `tool.html`：依規格第 6 節。按讚和收藏按鈕在送出期間停用，避免重複觸發。網址按鈕顯示前，再用 `isHttpsUrl` 檢查一次。

- [ ] **Step 1：寫失敗的測試**（加在 unit.test.js，`filterByKeyword` 放在 `js/tool-filter.js`，讓 Node 可以直接匯入）：
  ```js
  test('filterByKeyword', () => {
    const items = [{name:'校外教學小幫手', summary:'同意書', author:'A'}, {name:'Score', summary:'成績', author:'bob'}];
    assert.equal(filterByKeyword(items, '  同意 ').length, 1);
    assert.equal(filterByKeyword(items, 'BOB').length, 1);
    assert.equal(filterByKeyword(items, '').length, 2);
  });
  ```
  另外在 `tests/flows.js` 加一段 `likeAndFavorite`：
  1. 會員打開 t1，連點讚 5 次，等請求完成後，畫面上的讚數只能是 0 或 1，而且重新整理後 Firestore 中的 likeCount 和 like 文件一致。
  2. 收藏之後，`favorites.html` 會出現該工具。
  3. 訪客直接打開 `tool.html?id=t1`，看到閘門訊息，畫面上沒有任何網址。
- [ ] **Step 2：** 執行 `npm run test:unit && node tests/flows.js likeAndFavorite`。預期結果：FAIL。
- [ ] **Step 3：** 實作。
- [ ] **Step 4：** 再執行一次相同指令。預期結果：PASS。
- [ ] **Step 5：** Commit：`feat: 工具清單、詳細頁、按讚與收藏`。

### Task 10：上傳工具與新增版本

**Files:**
- Create: `upload.html`, `js/pages/upload.js`
- Modify: `js/tools.js`

**Interfaces:**
- Produces（tools.js）：
  - `createTool(tool, links, note) -> id`：用批次寫入建立三份文件：
    - tool 文件（status 為 pending、likeCount 為 0、currentVersion 為 1、uploaderUid、時間戳記）
    - `private/links`
    - `versions/v1`（含冗餘的 toolName、category、`toolStatus:'pending'`）
  - `addVersion(toolId, note, links?)`：在交易中讀取 currentVersion，加 1 後寫入 `versions/v{n}`（toolStatus 沿用工具目前的狀態），更新工具的 currentVersion 和 updatedAt，有提供 links 時一併更新。
  - `updateTool(toolId, fields, links?)`：只能修改內容欄位。
- `upload.js`：依規格第 6 節。用 `validateTool` 檢查；沒有帶 `?id=` 時是新工具表單；有帶時要先確認目前使用者是上傳者或管理員，才顯示新增版本表單，否則顯示「無權限」。`requires:'member'`。

- [ ] **Step 1：** 在 `tests/flows.js` 加一段 `uploadFlow`：
  1. 會員上傳一個新工具，名稱是 `<img src=x onerror=alert(1)>測試`，網址填 `http://x.com`。驗證網頁會在欄位下方顯示錯誤。
  2. 把網址改成 https 後送出。
  3. 管理員在後台看到這個工具，名稱以純文字顯示（用 `page.textContent` 比對原始字串，且頁面上不會出現 `img[src=x]` 元素）。
  4. 管理員發布後，首頁的最新修正出現 v1。
  5. 上傳者新增 v2，首頁出現 v2。
- [ ] **Step 2：** 執行 `node tests/flows.js uploadFlow`。預期結果：FAIL。
- [ ] **Step 3：** 實作。
- [ ] **Step 4：** 再執行一次。預期結果：PASS。
- [ ] **Step 5：** Commit：`feat: 上傳工具與新增版本`。

### Task 11：許願池與卡冊

**Files:**
- Create: `wishes.html`, `js/pages/wishes.js`, `js/wishes.js`, `cards.html`, `js/pages/cards.js`, `js/luckcard/album.js`
- Test: `tests/unit.test.js`

**Interfaces:**
- Produces（wishes.js）：
  - `listWishes({status = 'open'|'done'}, n = 50)`：依 voteCount 由多到少排序。
  - `createWish(w, uid, name)`：voteCount 為 0、status 為 open。
  - `toggleVote(wishId, uid) -> boolean`：與 toggleLike 用同樣的交易寫法。
  - `hasVoted`
- Produces（album.js，純函式）：`buildAlbum(cardDocs) -> {owned: Map<no, {count, first, last}>, total: 60, ownedCount, byRarity: {N:{owned,total},…}, recent: [{dateKey, no}] (30 筆, 新到舊)}`。
- `cards.js` 頁面：依規格第 6 節。沒抽到的卡顯示剪影：用 emoji 加上 `filter: brightness(0)`，卡名顯示「？？？」。點擊已擁有的卡會用 `renderCard` 放大顯示，每日欄位取最後一次抽到那天的結果，以 `drawCard(last, uid)` 重新計算。`requires:'member'`。

- [ ] **Step 1：寫失敗的測試：**
  ```js
  test('buildAlbum', () => {
    const docs = [{id:'20261101', cardNo:3}, {id:'20261102', cardNo:3}, {id:'20261103', cardNo:60}];
    const a = buildAlbum(docs);
    assert.equal(a.ownedCount, 2);
    assert.equal(a.owned.get(3).count, 2);
    assert.equal(a.owned.get(3).last, '20261102');
    assert.equal(a.recent[0].dateKey, '20261103');
    assert.equal(Object.values(a.byRarity).reduce((s, r) => s + r.total, 0), 60);
  });
  ```
  另外在 `tests/flows.js` 加一段 `wishFlow`：會員許願，另一位會員 +1 兩次，結果是 voteCount 為 1；管理員標記已實現並連結到工具，「已實現」分頁出現該願望和工具連結。
- [ ] **Step 2：** 執行 `npm run test:unit && node tests/flows.js wishFlow`。預期結果：FAIL。
- [ ] **Step 3：** 實作。
- [ ] **Step 4：** 再執行一次。預期結果：PASS。
- [ ] **Step 5：** Commit：`feat: 許願池與卡冊收集`。

### Task 12：使用說明、設定文件與整站驗收

**Files:**
- Create: `help.html`, `docs/setup.md`, `tests/screenshots.js`
- Modify: `README.md`

- [ ] **Step 1：** `help.html` 的內容包括：
  - 第一次使用：登入、填資料、等待審核
  - 如何開啟或下載工具
  - 如何上傳工具和新增版本
  - 許願池說明
  - 好運卡和卡冊說明（含稀有度機率表）
  - 如何聯絡管理員

  這頁訪客也可以看，不加閘門。
- [ ] **Step 2：** `docs/setup.md` 依規格第 12 節逐步撰寫，涵蓋：
  - 建立 Firebase 專案、維持 Spark 方案的提醒
  - 啟用 Google 登入
  - 建立 Firestore（地區選 asia-east1）
  - 把網頁應用程式的設定貼進 `js/firebase-config.js`
  - 部署規則：可以執行 `npx firebase deploy --only firestore:rules,firestore:indexes`，或貼到主控台
  - 建立 GitHub repo、開啟 Pages
  - 在 Firebase 加入授權網域
  - 把自己設為管理員：在主控台把自己的 users 文件改成 `status:'approved'`、`role:'admin'`
  - 之後改用自訂網域的做法

  每一步要寫出主控台中的選單路徑。
- [ ] **Step 3：** `tests/screenshots.js`：在 Emulator 加種子資料的環境下，以 1280px 和 390px 兩種寬度，各截一張下列頁面，存到 `screenshots/`：首頁（訪客）、首頁（會員）、工具清單、工具詳細頁、上傳、許願池、卡冊、後台、說明頁、好運卡開場（SSR）。

  另外檢查兩件事：
  - 每頁都沒有水平捲軸（`document.documentElement.scrollWidth <= innerWidth`）
  - console 沒有錯誤
- [ ] **Step 4：** 執行 `npm run test:unit && npm run test:rules && node tests/flows.js all && node tests/screenshots.js`。預期結果：全部 PASS，截圖張數為 20。逐張檢查截圖，修正版面問題。
- [ ] **Step 5：** 執行 `grep -rn "innerHTML" js/`。預期結果：沒有任何結果，或只用在固定字串的模板上（每一處都要附註說明）。
- [ ] **Step 6：** Commit：`docs: 使用說明與部署設定；整站截圖驗收`。
