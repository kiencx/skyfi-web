import 'server-only';
import { NextResponse } from 'next/server';
import { bssFetch, isBssAuthError } from './bss-auth';

const SELF_CARE_BASE_PATH = '/api/bss/app/v2/self-care';
const SESSION_HEADER = 'x-selfcare-session';

const noStore = (response) => {
  response.headers.set('Cache-Control', 'no-store');
  return response;
};

const errorResponse = (message, status) => noStore(
  NextResponse.json({ success: false, message }, { status }),
);

// BSS rate-limits OTP requests per client IP, so the end user's IP must be passed through
// instead of every request appearing to come from this Next.js server.
const getClientIp = (request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
};

// BSS returns flag as a path relative to its asset host, e.g. "/public/cdn-image/flag/x.png".
const toAssetUrl = (path) => {
  if (!path || /^https?:\/\//i.test(path)) return path || null;
  const base = (process.env.BSS_ASSET_BASE_URL || process.env.BSS_API_BASE_URL || '').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

// The full ICCID must never reach the browser, even if BSS returns it unmasked.
const maskIccid = (value) => {
  const iccid = String(value || '');
  return iccid.length > 4 && !iccid.includes('*') ? `****${iccid.slice(-4)}` : iccid;
};

const toEsimView = (item) => ({
  ...item,
  iccidMasked: maskIccid(item?.iccidMasked),
  flag: toAssetUrl(item?.flag),
});

export async function proxySelfCare(request, path, {
  method = 'POST',
  body,
  withSession = false,
  mapEsims = false,
} = {}) {
  const headers = { Accept: 'application/json' };

  const clientIp = getClientIp(request);
  if (clientIp) {
    headers['X-Forwarded-For'] = clientIp;
    headers['X-Real-IP'] = clientIp;
  }

  if (withSession) {
    const sessionToken = request.headers.get(SESSION_HEADER);
    if (!sessionToken) return errorResponse('Missing self-care session.', 401);
    headers['X-SelfCare-Session'] = sessionToken;
  }

  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const response = await bssFetch(`${SELF_CARE_BASE_PATH}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    if (response.status === 204) {
      return noStore(new NextResponse(null, { status: 204 }));
    }

    const payload = await response.json().catch(() => null);
    if (mapEsims && Array.isArray(payload?.data?.items)) {
      payload.data.items = payload.data.items.map(toEsimView);
    }
    return noStore(NextResponse.json(
      payload || { success: false, message: 'Invalid response from BSS API.' },
      { status: response.status },
    ));
  } catch (error) {
    if (isBssAuthError(error)) return errorResponse(error.message, error.status);
    return errorResponse('Unable to reach BSS API.', 502);
  }
}

export const readJsonBody = (request) => request.json().catch(() => ({}));
