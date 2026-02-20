const USER_ID_KEY = 'carenote_user_id';
const USER_META_KEY = 'carenote_user_meta';

function generateUUID() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  } catch (_) {
    return `fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function getOrCreateUserId() {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch (e) {
    console.warn('CareNote: userId 로드/생성 실패', e);
    return generateUUID();
  }
}

export function getDisplayId() {
  try {
    const userId = getOrCreateUserId();
    const short = userId.replace(/-/g, '').slice(0, 6).toUpperCase();
    return `DN-${short}`;
  } catch (_) {
    return 'DN-XXXXXX';
  }
}

const DEFAULT_META = {
  userId: '',
  phoneVerified: false,
  verifiedPhoneMasked: null,
  verifiedAt: null,
};

export function getUserMeta() {
  try {
    const json = localStorage.getItem(USER_META_KEY);
    if (!json) {
      const userId = getOrCreateUserId();
      const meta = { ...DEFAULT_META, userId };
      localStorage.setItem(USER_META_KEY, JSON.stringify(meta));
      return meta;
    }
    const parsed = JSON.parse(json);
    const userId = getOrCreateUserId();
    return { ...DEFAULT_META, ...parsed, userId };
  } catch (e) {
    console.warn('CareNote: user meta 로드 실패', e);
    return { ...DEFAULT_META, userId: getOrCreateUserId() };
  }
}

export function saveUserMeta(updates) {
  try {
    const current = getUserMeta();
    const next = { ...current, ...updates };
    localStorage.setItem(USER_META_KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    console.warn('CareNote: user meta 저장 실패', e);
    return getUserMeta();
  }
}

export function maskPhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 8) {
    return `010-****-${digits.slice(-4)}`;
  }
  return '010-****-****';
}
