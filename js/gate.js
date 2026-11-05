// 身分狀態與登入閘門（純函式）
export function stateOf(user, profile) {
  if (user === undefined) return 'loading';
  if (user === null) return 'guest';
  if (profile === undefined) return 'loading';
  if (profile === null) return 'noprofile';
  if (profile.status === 'approved') return 'approved';
  if (profile.status === 'pending') return 'pending';
  return 'suspended';
}

export const isMember = state => state === 'approved';
export const isAdmin = (state, profile) => state === 'approved' && profile?.role === 'admin';

const MESSAGES = {
  loading:   { title: '請稍候', message: '正在確認登入狀態，請稍候再試一次。', action: null },
  guest:     { title: '請先登入', message: '這個功能需要登入後才能使用。請使用 Google 帳號登入，並填寫基本資料等待審核。', action: 'login' },
  noprofile: { title: '請填寫基本資料', message: '登入成功！請先填寫基本資料，送出後由管理員審核。', action: 'profile' },
  pending:   { title: '帳號審核中', message: '您的帳號審核中，管理員通過後即可使用所有功能。', action: null },
  suspended: { title: '帳號已停用', message: '您的帳號已停用，如有疑問請聯繫網站管理員。', action: null },
  notadmin:  { title: '權限不足', message: '這個頁面只有管理員可以使用。', action: null },
};

export function gateMessage(state) { return MESSAGES[state] ?? MESSAGES.guest; }

export function gateClick(state, requires, profile) {
  if (!requires) return null;
  if (state !== 'approved') return gateMessage(state);
  if (requires === 'admin' && !isAdmin(state, profile)) return MESSAGES.notadmin;
  return null;
}
