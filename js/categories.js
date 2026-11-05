// 處室分類（固定 12 類，順序即顯示順序）
export const CATEGORIES = [
  { id: 'principal',  name: '校長',     icon: '校', color: '#1f4e8c' },
  { id: 'academic',   name: '教務處',   icon: '教', color: '#2d7dd2' },
  { id: 'student',    name: '學務處',   icon: '學', color: '#2a9d5c' },
  { id: 'general',    name: '總務處',   icon: '總', color: '#e08a1e' },
  { id: 'counseling', name: '輔導室',   icon: '輔', color: '#d94f8a' },
  { id: 'personnel',  name: '人事會計', icon: '人', color: '#6c4bc4' },
  { id: 'homeroom',   name: '導師',     icon: '導', color: '#e4572e' },
  { id: 'subject',    name: '科任',     icon: '科', color: '#0f9ea8' },
  { id: 'teaching',   name: '教學',     icon: '課', color: '#7a9a01' },
  { id: 'preschool',  name: '附幼',     icon: '幼', color: '#f2a541' },
  { id: 'extension',  name: '進修部',   icon: '進', color: '#8d6e63' },
  { id: 'other',      name: '其他',     icon: '其', color: '#607d8b' },
];

export function getCategory(id) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
