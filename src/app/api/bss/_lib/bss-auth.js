import 'server-only';

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

class BssAuthError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'BssAuthError';
    this.status = status;
  }
}

// Each partner account (and so each BSS channel) has its own token.
const ACCOUNT_ENV = {
  default: { username: 'BSS_PARTNER_USERNAME', password: 'BSS_PARTNER_PASSWORD' },
  vikki: { username: 'BSS_VIKKI_USERNAME', password: 'BSS_VIKKI_PASSWORD' },
};

const sessions = new Map();

const getSession = (account) => {
  if (!sessions.has(account)) {
    sessions.set(account, {
      credentials: { accessToken: null, refreshToken: null, expiresAt: 0 },
      pending: null,
    });
  }
  return sessions.get(account);
};

const getConfig = (account = 'default') => {
  const env = ACCOUNT_ENV[account] || ACCOUNT_ENV.default;
  const baseUrl = process.env.BSS_API_BASE_URL?.replace(/\/$/, '');
  const username = process.env[env.username];
  const password = process.env[env.password];

  if (!baseUrl || !username || !password) {
    throw new BssAuthError('BSS authentication is not configured.', 503);
  }

  return { baseUrl, username, password };
};

const decodeJwtExpiry = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return 0;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(decoded.exp) ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
};

const getTokenData = (payload, previousRefreshToken = null) => {
  const data = payload?.data || payload || {};
  const accessToken = data.token || data.accessToken || data.access_token;
  const refreshToken = data.refreshToken || data.refresh_token || previousRefreshToken;
  const expiresInHours = Number(data.expiresInHours ?? data.expires_in_hours);
  const expiresAt = Number.isFinite(expiresInHours) && expiresInHours > 0
    ? Date.now() + (expiresInHours * 60 * 60 * 1000)
    : decodeJwtExpiry(accessToken || '');

  if (!accessToken || !refreshToken || !expiresAt) {
    throw new BssAuthError('BSS authentication returned an invalid token response.');
  }

  return { accessToken, refreshToken, expiresAt };
};

const requestToken = async (account, path, body, previousRefreshToken = null) => {
  const { baseUrl } = getConfig(account);
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new BssAuthError('Unable to reach BSS authentication service.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new BssAuthError('BSS authentication failed.');
  }

  return getTokenData(payload, previousRefreshToken);
};

const login = async (account) => {
  const { username, password } = getConfig(account);
  return requestToken(account, '/api/v1/auth/login', { username, password });
};

const refresh = async (account, refreshToken) => requestToken(
  account,
  '/api/v1/auth/refresh',
  { refreshToken },
  refreshToken,
);

const tokenIsUsable = ({ credentials }) => (
  Boolean(credentials.accessToken) && credentials.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS
);

const refreshOrLogin = async (account, forceRefresh = false) => {
  const session = getSession(account);
  if (!forceRefresh && tokenIsUsable(session)) return session.credentials.accessToken;

  if (session.credentials.refreshToken) {
    try {
      session.credentials = await refresh(account, session.credentials.refreshToken);
      return session.credentials.accessToken;
    } catch (error) {
      if (!(error instanceof BssAuthError)) throw error;
    }
  }

  session.credentials = await login(account);
  return session.credentials.accessToken;
};

export const getBssAccessToken = async ({ forceRefresh = false, account = 'default' } = {}) => {
  const session = getSession(account);
  if (!forceRefresh && tokenIsUsable(session)) return session.credentials.accessToken;

  if (!session.pending) {
    session.pending = refreshOrLogin(account, forceRefresh).finally(() => {
      session.pending = null;
    });
  }

  return session.pending;
};

const withAuthorization = (init, accessToken) => {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return { ...init, headers };
};

export const bssFetch = async (path, init = {}, { account = 'default' } = {}) => {
  const { baseUrl } = getConfig(account);
  const request = async (accessToken) => fetch(
    `${baseUrl}${path}`,
    withAuthorization(init, accessToken),
  );

  let response = await request(await getBssAccessToken({ account }));
  if (response.status !== 401) return response;

  const session = getSession(account);
  session.credentials.accessToken = null;
  session.credentials.expiresAt = 0;
  response = await request(await getBssAccessToken({ forceRefresh: true, account }));
  return response;
};

export const isBssAuthError = (error) => error instanceof BssAuthError;
