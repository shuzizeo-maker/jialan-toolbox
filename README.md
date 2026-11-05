# 嘉蘭國小教學行政工具庫

收錄教學、行政工具的入口網站。純 HTML/CSS/JS，部署於 GitHub Pages，資料使用 Firebase（Spark 免費方案）。

- 部署設定：見 [docs/setup.md](docs/setup.md)
- 本機開發：`npm install` → `npm run emu`（另一視窗）→ `node tests/seed.js` → `npm run serve` → 開啟 http://localhost:5500/?emu
- 測試：`npm run test:unit`、`npm run test:rules`

## 國定假日備援資料（需人工核對）

`data/holidays-2026.json`、`data/holidays-2027.json` 是在無法連網核對的情況下整理的，網站平常會優先讀取線上的 TaiwanCalendar 資料，只有讀不到時才用這兩個檔案。

- 2026（115 年）：依 115 年辦公日曆表整理，請對照人事行政總處公告核對一次。
- 2027（116 年）：辦公日曆表待公告後更新。目前只列節日當天，**不含補假**。
