// 在 Emulator 建立示範資料：先 `npm run emu`，再 `node tests/seed.js`
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

export const PEOPLE = {
  admin: { email: 'admin@example.com', realName: '林校長', jobTitle: '校長', status: 'approved', role: 'admin' },
  alice: { email: 'alice@example.com', realName: '陳老師', jobTitle: '教師', status: 'approved', role: 'user' },
  bob:   { email: 'bob@example.com', realName: '王組長', jobTitle: '組長', status: 'approved', role: 'user' },
  pete:  { email: 'pete@example.com', realName: '張主任', jobTitle: '主任', status: 'pending', role: 'user' },
};

const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-jialan' }, 'seed');
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

export async function uidFor(email) {
  const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(
    JSON.stringify({ sub: `sub-${email}`, email, email_verified: true, name: email.split('@')[0] })));
  const uid = cred.user.uid; await signOut(auth); return uid;
}

const ts = (daysAgo, h = 9) => Timestamp.fromDate(new Date(Date.now() - daysAgo * 86400000 - h * 3600000));

const TOOLS = [
  ['field', '校外教學文件小幫手（申請表、同意書、保險名冊）', 'student', '輸入日期地點班級數，自動產出申請表、保險名冊與家長同意書。', 12, ['第一版上傳', '新增保險名冊套印']],
  ['eval', '校務評鑑減壓包', 'principal', '假設學校自己內部行政已有所屬的資料庫，快速整理評鑑資料。', 8, ['從主線 v1 建立分支', '(修正版)評鑑資料對應轉換索引範本', '補充 README']],
  ['notice', '公文自動公告小工具', 'academic', '自動處理公文並公告到校網（無障礙共構）。', 6, ['第一版上傳', '修改摘要、README']],
  ['buy', '小額採購與勞務案規格範本', 'general', '常見小額採購案的規格與流程範本。', 15, ['第一版上傳']],
  ['parent', '班親會籌備與通知', 'homeroom', '班親會通知單、議程、簽到表一次完成。', 9, ['第一版上傳', '新增簽到 QR Code']],
  ['score', '成績登錄小幫手', 'teaching', '將平時成績試算表轉成學期成績格式。', 4, ['第一版上傳']],
  ['music', '音樂課直笛練習器', 'subject', '線上節拍器與直笛指法圖。', 3, ['第一版上傳']],
  ['counsel', '輔導紀錄範本', 'counseling', '晤談紀錄與追蹤表範本。', 5, ['第一版上傳']],
];

export async function seed() {
  const uids = {};
  for (const [k, p] of Object.entries(PEOPLE)) uids[k] = await uidFor(p.email);
  const env = await initializeTestEnvironment({
    projectId: 'demo-jialan',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    for (const [k, p] of Object.entries(PEOPLE)) {
      await setDoc(doc(db, 'users', uids[k]), {
        county: '臺東縣', school: '嘉蘭國小', realName: p.realName, jobTitle: p.jobTitle,
        email: p.email, displayName: k, status: p.status, role: p.role, createdAt: ts(30), updatedAt: ts(30),
      });
    }
    let day = 0;
    for (const [id, name, category, summary, likes, versions] of TOOLS) {
      day++;
      await setDoc(doc(db, 'tools', id), {
        name, category, summary, author: '瓦特老師', authorGithub: 'water64', uploaderUid: uids.admin,
        status: 'published', likeCount: likes, currentVersion: versions.length, createdAt: ts(day + 5), updatedAt: ts(day),
      });
      await setDoc(doc(db, `tools/${id}/private/links`), {
        onlineUrl: `https://example.github.io/${id}/`, downloadUrl: `https://github.com/example/${id}/releases`, sourceUrl: `https://github.com/example/${id}`,
      });
      for (let i = 0; i < versions.length; i++) {
        await setDoc(doc(db, `tools/${id}/versions/v${i + 1}`), {
          version: i + 1, note: versions[i], createdAt: ts(day + versions.length - i, i), byUid: uids.admin,
          toolName: name, category, toolStatus: 'published',
        });
      }
    }
    await setDoc(doc(db, 'tools/pend'), {
      name: '待審核的工具', category: 'other', summary: '這個工具還在審核中。', author: '陳老師', authorGithub: '',
      uploaderUid: uids.alice, status: 'pending', likeCount: 0, currentVersion: 1, createdAt: ts(0), updatedAt: ts(0),
    });
    await setDoc(doc(db, 'tools/pend/private/links'), { onlineUrl: 'https://example.github.io/pend/', downloadUrl: '', sourceUrl: '' });
    await setDoc(doc(db, 'tools/pend/versions/v1'), { version: 1, note: '第一版上傳', createdAt: ts(0), byUid: uids.alice, toolName: '待審核的工具', category: 'other', toolStatus: 'pending' });
    const anns = [
      ['a1', '歡迎使用嘉蘭國小教學行政工具庫', '請使用 Google 帳號登入並填寫基本資料，管理員審核後即可使用全部功能。', '2026-11-04', true],
      ['a2', '許願池開放囉', '找不到需要的工具嗎？到許願池許個願，大家一起 +1！', '2026-11-03', false],
      ['a3', '每日好運卡上線', '每天進站都能抽一張今日好運卡，登入會員還能收集卡冊。', '2026-11-02', false],
    ];
    for (const [id, title, body, date, pinned] of anns) await setDoc(doc(db, 'announcements', id), { title, body, date, pinned });
    const wishes = [
      ['w1', '自動排代課表', '請假時自動找出可以代課的老師。', 'academic', 6],
      ['w2', '午餐剩食統計表', '每日剩食量登錄與圖表。', 'general', 3],
      ['w3', '學生獎懲紀錄查詢', '', 'student', 2],
    ];
    for (const [id, title, detail, category, n] of wishes)
      await setDoc(doc(db, 'wishes', id), { title, detail, category, byUid: uids.bob, byName: '王組長', voteCount: n, status: 'open', doneToolId: null, createdAt: ts(2) });
    await setDoc(doc(db, 'wishes/w4'), { title: '校外教學同意書', detail: '', category: 'student', byUid: uids.alice, byName: '陳老師', voteCount: 4, status: 'done', doneToolId: 'field', createdAt: ts(9) });
    await setDoc(doc(db, 'stats/site'), { memberCount: 3 });
  });
  await env.cleanup();
  return uids;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().then(u => { console.log('seeded', u); process.exit(0); }, e => { console.error(e); process.exit(1); });
}
