// 處室分類（固定 12 類，順序即顯示順序）
// 只改 name／icon 不影響既有資料：資料庫存的是 id；id 一旦上線就不要改
export const CATEGORIES = [
  { id: 'principal',  name: '校長',     icon: '校', color: '#1f4e8c' },
  { id: 'academic',   name: '教導處',   icon: '教', color: '#2d7dd2' },
  { id: 'counseling', name: '教務組',   icon: '務', color: '#d94f8a' },
  { id: 'student',    name: '訓導組',   icon: '訓', color: '#2a9d5c' },
  { id: 'general',    name: '總務處',   icon: '總', color: '#e08a1e' },
  { id: 'personnel',  name: '人事會計', icon: '人', color: '#6c4bc4' },
  { id: 'homeroom',   name: '導師',     icon: '導', color: '#e4572e' },
  { id: 'subject',    name: '科任',     icon: '科', color: '#0f9ea8' },
  { id: 'teaching',   name: '教學',     icon: '課', color: '#7a9a01' },
  { id: 'preschool',  name: '附幼',     icon: '幼', color: '#f2a541' },
  { id: 'extension',  name: '學扶',     icon: '扶', color: '#8d6e63' },
  { id: 'other',      name: '其他',     icon: '其', color: '#607d8b' },
];

export function getCategory(id) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
