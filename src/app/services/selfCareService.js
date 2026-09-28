import axios from 'axios';

const BASE_PATH = '/api/bss/self-care';
const ACCESS_STORAGE_KEY = 'selfCareAccess';

export class SelfCareError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'SelfCareError';
    this.status = status;
  }
}

const request = async (method, path, { data, sessionToken } = {}) => {
  let response;
  try {
    response = await axios.request({
      method,
      url: `${BASE_PATH}${path}`,
      data,
      headers: sessionToken ? { 'X-SelfCare-Session': sessionToken } : undefined,
      validateStatus: () => true,
    });
  } catch {
    throw new SelfCareError('Network error', 0);
  }

  const payload = response.data;
  const ok = response.status >= 200 && response.status < 300;
  if (!ok || (payload && payload.success === false)) {
    throw new SelfCareError(payload?.message || 'Request failed', response.status);
  }
  return payload?.data;
};

// Session storage: the self-care session is short-lived and must not outlive the tab.
export const getSelfCareAccess = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(ACCESS_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
};

const saveSelfCareAccess = (access) => {
  window.sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(access));
};

export const clearSelfCareAccess = () => {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(ACCESS_STORAGE_KEY);
};

export const maskEmail = (email = '') => {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
};

export const startEmailSession = (email) => request('post', '/email-sessions', { data: { email } });

export const resendOtp = (email, pendingToken) => request('post', '/email-sessions/resend', {
  data: { email, pendingToken },
});

export const verifyOtp = async (email, pendingToken, code) => {
  const data = await request('post', '/email-sessions/verify', {
    data: { email, pendingToken, code },
  });
  if (!data?.accessToken) throw new SelfCareError('Missing access token', 502);
  saveSelfCareAccess({ mode: 'email', sessionToken: data.accessToken, maskedEmail: maskEmail(email) });
  return data;
};

export const lookupByIccid = async (iccid) => {
  const data = await request('post', '/current-esim/iccid', { data: { iccid } });
  saveSelfCareAccess({ mode: 'iccid', iccid });
  return data;
};

// Re-runs the lookup matching how the user signed in; the session lookup also extends the session by 15 minutes.
export const lookupCurrentEsims = (access = getSelfCareAccess()) => {
  if (access?.mode === 'email') {
    return request('post', '/current-esim/session', { sessionToken: access.sessionToken });
  }
  if (access?.mode === 'iccid') {
    return request('post', '/current-esim/iccid', { data: { iccid: access.iccid } });
  }
  return Promise.reject(new SelfCareError('Not signed in', 401));
};

export const logoutSelfCare = async () => {
  const access = getSelfCareAccess();
  clearSelfCareAccess();
  if (access?.mode !== 'email') return;
  try {
    await request('delete', '/email-sessions', { sessionToken: access.sessionToken });
  } catch {
    // The local session is already cleared; a failed revoke only means the token expires on its own.
  }
};

const SelfCareService = {
  getSelfCareAccess,
  clearSelfCareAccess,
  maskEmail,
  startEmailSession,
  resendOtp,
  verifyOtp,
  lookupByIccid,
  lookupCurrentEsims,
  logoutSelfCare,
};

export default SelfCareService;
