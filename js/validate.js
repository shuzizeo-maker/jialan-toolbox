// 表單驗證（純函式，與 firestore.rules 的限制一致）
import { CATEGORIES } from './categories.js';

export const JOB_TITLES = ['校長', '主任', '組長', '教師', '職員'];
export const COUNTIES = [
  '臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市',
  '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣',
  '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '臺東縣', '澎湖縣', '金門縣', '連江縣',
];

export function isHttpsUrl(s) {
  if (typeof s !== 'string' || /\s/.test(s)) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && !!u.hostname;
  } catch { return false; }
}

const len = s => [...(s ?? '')].length;
const t = s => (typeof s === 'string' ? s.trim() : '');
function range(errors, field, value, min, max, label) {
  const n = len(t(value));
  if (n < min || n > max) errors[field] = min > 0 && n === 0 ? `請填寫${label}` : `${label}需為 ${min}～${max} 字`;
}
const result = errors => ({ ok: Object.keys(errors).length === 0, errors });
const validCategory = id => CATEGORIES.some(c => c.id === id);

export function validateProfile(p) {
  const e = {};
  if (!COUNTIES.includes(p.county)) e.county = '請選擇縣市';
  range(e, 'school', p.school, 1, 30, '學校');
  range(e, 'realName', p.realName, 1, 20, '真實姓名');
  if (!JOB_TITLES.includes(p.jobTitle)) e.jobTitle = '請選擇職務';
  return result(e);
}

export const LINK_FIELDS = ['onlineUrl', 'downloadUrl', 'sourceUrl'];

export function validateLinks(links = {}, e = {}) {
  const filled = LINK_FIELDS.filter(f => t(links[f]));
  if (filled.length === 0) e.links = '線上使用、下載、原始碼網址至少填一個';
  for (const f of filled) if (!isHttpsUrl(t(links[f]))) e[f] = '網址必須以 https:// 開頭';
  return e;
}

export function validateTool(tool, links) {
  const e = {};
  range(e, 'name', tool.name, 1, 60, '工具名稱');
  range(e, 'summary', tool.summary, 1, 300, '摘要');
  if (!validCategory(tool.category)) e.category = '請選擇處室';
  range(e, 'author', tool.author, 1, 30, '分享者名稱');
  const gh = t(tool.authorGithub);
  if (gh && !/^[A-Za-z0-9-]{1,39}$/.test(gh)) e.authorGithub = 'GitHub 帳號格式不正確';
  validateLinks(links, e);
  return result(e);
}

export function validateWish(w) {
  const e = {};
  range(e, 'title', w.title, 1, 60, '想要的工具');
  range(e, 'detail', w.detail, 0, 500, '說明');
  if (!validCategory(w.category)) e.category = '請選擇處室';
  return result(e);
}
