import 'server-only';
// Phía SkyFi (T3) của tích hợp CMP theo mô hình CLIENT_RELAY, chỉ phần banner cookie (kind=BROWSER, channel=WEB).
// Backend không bao giờ gọi CMP: assertion đi ra qua SDK trên trình duyệt, receipt cũng quay về theo đường đó.
// Xem "Hướng dẫn tích hợp ứng dụng SKYFI" mục 6–9 và cmp-t3-relay-samples/server.mjs.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { createAssertionSigner, JoseError } from './jose';
import { createPermissionStore, createReceiptVerifier } from './receipts';

export { JoseError };

export const COOKIE_CODES_DEFAULT = ['COOKIE_NECESSARY', 'COOKIE_FUNCTIONAL', 'COOKIE_ANALYTICS', 'COOKIE_MARKETING'];
const BROWSER_ID_TTL_SECONDS = 180 * 24 * 60 * 60;
const MAX_BODY_BYTES = 256 * 1024;

export class CmpRelayError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

/** Đọc JSON từ biến inline (…_JSON) hoặc từ đường dẫn file (…_FILE); nếu có cả hai thì ưu tiên file. */
const readJsonEnv = (name) => {
  const file = process.env[`${name}_FILE`];
  const inline = process.env[`${name}_JSON`];
  if (file) return JSON.parse(readFileSync(file, 'utf8'));
  if (inline) return JSON.parse(inline);
  return undefined;
};

let relay;

/** Khởi tạo một lần cho mỗi tiến trình server; báo CMP_NOT_CONFIGURED (503) khi chưa onboarding xong. */
export function getCmpRelay() {
  if (relay) return relay;
  if (process.env.CMP_ENABLED !== 'true') throw new CmpRelayError('CMP_DISABLED', 404);

  const origin = process.env.CMP_WEB_ORIGIN?.replace(/\/$/, '');
  const cmpBaseUrl = process.env.CMP_BASE_URL?.replace(/\/$/, '');
  const sessionSecret = process.env.CMP_SESSION_SECRET;
  let bundle;
  let secrets;
  try {
    bundle = readJsonEnv('CMP_BUNDLE');
    secrets = readJsonEnv('CMP_SECRETS');
  } catch {
    throw new CmpRelayError('CMP_NOT_CONFIGURED', 503);
  }
  if (
    !origin || !cmpBaseUrl || !sessionSecret || sessionSecret.length < 32
    || bundle?.format !== 'cmp-relay-bundle' || bundle.version !== 1
    || !secrets?.assertionPrivateJwk || !secrets?.decryptionJwks
  ) {
    throw new CmpRelayError('CMP_NOT_CONFIGURED', 503);
  }

  const sign = createAssertionSigner({
    privateJwk: secrets.assertionPrivateJwk,
    issuer: bundle.assertion.issuer,
    audience: bundle.assertion.audience,
    appId: bundle.appId,
    environmentId: bundle.environmentId,
  });
  const verify = createReceiptVerifier({
    cmpJwks: bundle.cmpSigningKeys,
    decryptionJwks: secrets.decryptionJwks,
    issuer: bundle.receipt.issuer,
    audience: bundle.receipt.audience,
    appId: bundle.appId,
    environmentId: bundle.environmentId,
  });
  const store = createPermissionStore(process.env.CMP_DATABASE || join(process.cwd(), '.data', 'cmp-relay.sqlite'));
  const cookieCodes = (process.env.CMP_COOKIE_CODES || COOKIE_CODES_DEFAULT.join(','))
    .split(',').map((code) => code.trim()).filter(Boolean);
  const secure = new URL(origin).protocol === 'https:';

  relay = {
    origin,
    cmpBaseUrl,
    bundle,
    cookieCodes,
    store,
    sign,
    verify,
    // Tiền tố __Host- bắt buộc Secure, nên khi chạy local bằng http thường phải dùng tên khác.
    cookieName: secure ? '__Host-skyfi-cmp' : 'skyfi-cmp-local',
    secure,
    mac: (purpose, value) => createHmac('sha256', sessionSecret).update(`${purpose}:${value}`).digest('base64url'),
  };
  return relay;
}

const same = (a, b) => typeof a === 'string' && typeof b === 'string'
  && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * ID trình duyệt nằm trong cookie HttpOnly có ký HMAC, không lưu trạng thái ("<uuid>.<expiresAt>.<mac>"),
 * nên chạy được trên nhiều instance server mà không cần bảng phiên. Đây là ID trình duyệt, không phải
 * ID người dùng (tài liệu mục 3, TBD-04).
 */
const readBrowserId = (request, r) => {
  const raw = request.cookies.get(r.cookieName)?.value;
  const [id, expires, mac] = raw?.split('.') ?? [];
  if (!id || !expires || !mac) return undefined;
  if (!same(mac, r.mac('browser', `${id}.${expires}`))) return undefined;
  if (Number(expires) * 1000 <= Date.now()) return undefined;
  return id;
};

export const csrfFor = (r, browserId) => r.mac('csrf', browserId);

/** So khớp chính xác Origin ở mọi lời gọi thay đổi trạng thái (không tin Origin bị thiếu hoặc lạ). */
export const assertOrigin = (request, r) => {
  if (request.headers.get('origin') !== r.origin) throw new CmpRelayError('ORIGIN_DENIED', 403);
};

/** Trả về ID trình duyệt đang có hoặc cấp ID mới; nơi gọi tự đặt cookie được trả về. */
export const beginBrowserSession = (request, r) => {
  const existing = readBrowserId(request, r);
  if (existing) return { browserId: existing, cookie: undefined };
  const browserId = randomUUID();
  const expires = Math.floor(Date.now() / 1000) + BROWSER_ID_TTL_SECONDS;
  const value = `${browserId}.${expires}.${r.mac('browser', `${browserId}.${expires}`)}`;
  return {
    browserId,
    cookie: {
      name: r.cookieName,
      value,
      httpOnly: true,
      sameSite: 'strict',
      secure: r.secure,
      path: '/',
      maxAge: BROWSER_ID_TTL_SECONDS,
    },
  };
};

/** Kiểm tra phiên web: cookie HttpOnly + header CSRF + Origin chính xác. Subject không bao giờ lấy từ body. */
export const requireBrowserSession = (request, r) => {
  assertOrigin(request, r);
  const browserId = readBrowserId(request, r);
  if (!browserId || !same(request.headers.get('x-csrf-token'), csrfFor(r, browserId))) {
    throw new CmpRelayError('UNAUTHENTICATED', 401);
  }
  return browserId;
};

export const readJsonBody = async (request) => {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    throw new CmpRelayError('BODY_TOO_LARGE', 413);
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new CmpRelayError('BODY_TOO_LARGE', 413);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new CmpRelayError('INVALID_JSON', 400);
  }
};

const NO_STORE = { 'Cache-Control': 'no-store' };

export const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/** Lỗi đã biết trả đúng mã HTTP; lỗi khác trả 500 chung chung, không lộ chi tiết nội bộ. */
export const handleError = (error) => {
  if (error instanceof CmpRelayError) return json({ error: error.code }, error.status);
  console.error('[cmp-relay]', error?.message);
  return json({ error: 'CMP_RELAY_ERROR' }, 500);
};
