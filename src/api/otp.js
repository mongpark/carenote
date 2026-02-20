const DEMO_CODE = '123456';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/** 2차: 실서버 연결 시 requestOtp(phone, false) 호출 */
async function requestOtpApi(phone) {
  try {
    const res = await fetch(`${API_BASE}/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '인증번호 요청 실패');
    return { success: true };
  } catch (e) {
    throw e;
  }
}

/** 2차: 실서버 연결 시 verifyOtp(phone, code, false) 호출, 성공 시 meta 업데이트 */
async function verifyOtpApi(phone, code) {
  try {
    const res = await fetch(`${API_BASE}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '인증 실패');
    return { success: true, masked: data.masked };
  } catch (e) {
    throw e;
  }
}

export async function requestOtp(phone, demoMode = true) {
  if (demoMode) {
    return { success: true, demoCode: DEMO_CODE };
  }
  return requestOtpApi(phone);
}

export async function verifyOtp(phone, code, demoMode = true) {
  if (demoMode) {
    const ok = code === DEMO_CODE;
    const digits = String(phone).replace(/\D/g, '');
    const masked = digits.length >= 8 ? `010-****-${digits.slice(-4)}` : null;
    return { success: ok, masked: ok ? masked : null };
  }
  return verifyOtpApi(phone, code);
}
