import 'server-only';
// =====================================================================================================
// TẦNG ĐIỀU PHỐI CỦA TÍCH HỢP CMP (chỉ chạy trên server) — SkyFi tự viết
// -----------------------------------------------------------------------------------------------------
// Phía SkyFi (T3) của tích hợp CMP theo mô hình CLIENT_RELAY, chỉ phần banner cookie (kind=BROWSER, channel=WEB).
// Backend không bao giờ gọi CMP: assertion đi ra qua SDK trên trình duyệt, receipt cũng quay về theo đường đó.
// Xem "Hướng dẫn tích hợp ứng dụng SKYFI" mục 6–9 và cmp-t3-relay-samples/server.mjs.
//
// File này nối jose.js (mật mã) và receipts.js (sổ quyền) vào các route Next.js /api/cmp/*:
//   1. getCmpRelay()        đọc cấu hình, tạo máy ký assertion / máy kiểm receipt / sổ quyền (1 lần)
//   2. "Thẻ khách"          cookie ID trình duyệt ký HMAC: beginBrowserSession, readBrowserId, csrfFor
//   3. Bảo vệ API           assertOrigin, requireBrowserSession (Origin + cookie + CSRF), readJsonBody
//   4. Trả kết quả          json (không cache), handleError (không lộ chi tiết lỗi)
//
//   5. Giới hạn tần suất    rateLimit, clientIp
//
// Yêu cầu Node ≥ 22.5 khi bật CMP_ENABLED (sổ quyền dùng node:sqlite). Tắt cờ thì Node cũ vẫn chạy được.
// Biến môi trường (xem .env.example): CMP_ENABLED, CMP_WEB_ORIGIN, CMP_BASE_URL, CMP_SESSION_SECRET,
// CMP_BUNDLE_FILE|JSON, CMP_SECRETS_FILE|JSON, CMP_DATABASE, CMP_COOKIE_CODES.
// =====================================================================================================
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { createAssertionSigner, JoseError } from './jose';
import { createPermissionStore, createReceiptVerifier } from './receipts';

export { JoseError };

// 4 mã cookie (kind=BROWSER) của SKYFI trên CMS; banner hiển thị đúng các mã này.
export const COOKIE_CODES_DEFAULT = ['COOKIE_NECESSARY', 'COOKIE_FUNCTIONAL', 'COOKIE_ANALYTICS', 'COOKIE_MARKETING'];
// Cookie ID trình duyệt sống 180 ngày: khách quay lại vẫn là cùng ID nên không phải chọn lại từ đầu.
const BROWSER_ID_TTL_SECONDS = 180 * 24 * 60 * 60;
// Giới hạn kích thước body request (chống gửi dữ liệu khổng lồ làm treo server).
const MAX_BODY_BYTES = 256 * 1024;

/** Lỗi "đã biết" của relay, mang sẵn mã HTTP để handleError trả về đúng status (401, 403, 404, 503…). */
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

// Bản relay dùng chung cho cả tiến trình server (singleton), tạo ở lần gọi đầu tiên.
// Lưu Promise (không lưu kết quả) để nhiều request đến cùng lúc lúc khởi động chỉ khởi tạo một lần.
let relayPromise;

/**
 * Khởi tạo một lần cho mỗi tiến trình server; báo CMP_NOT_CONFIGURED (503) khi chưa onboarding xong.
 * Bất đồng bộ vì sổ quyền import động node:sqlite. Các route gọi `await getCmpRelay()`.
 */
export function getCmpRelay() {
  // Cờ tắt/bật toàn bộ tích hợp. Tắt → mọi /api/cmp/* trả 404, web chạy như trước khi tích hợp.
  // Kiểm tra TRƯỚC mọi thứ khác nên khi tắt cờ không nạp khóa, không mở DB, không đụng node:sqlite.
  if (process.env.CMP_ENABLED !== 'true') return Promise.reject(new CmpRelayError('CMP_DISABLED', 404));
  if (!relayPromise) {
    relayPromise = createRelay().catch((error) => {
      // Khởi tạo lỗi thì không giữ Promise hỏng: lần gọi sau thử lại (vd. vừa sửa cấu hình/volume).
      relayPromise = undefined;
      throw error;
    });
  }
  return relayPromise;
}

async function createRelay() {
  // CMP_WEB_ORIGIN nhận một hoặc nhiều origin, ngăn cách bằng dấu phẩy
  // (vd. "https://skyfi.network,https://www.skyfi.network"). Mỗi origin cũng phải được đăng ký trên CMP.
  const origins = (process.env.CMP_WEB_ORIGIN || '')
    .split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean);
  const cmpBaseUrl = process.env.CMP_BASE_URL?.replace(/\/$/, '');
  const sessionSecret = process.env.CMP_SESSION_SECRET;
  // bundle.json: do đội CMP xuất ở trang "Tích hợp qua client" (appId, environmentId, issuer/audience,
  //   khóa công khai ký receipt của CMP). Chỉ chứa thông tin công khai nhưng vẫn không commit bản thật.
  // secrets: khóa riêng của SkyFi (ký assertion + giải mã receipt). BÍ MẬT: để trong secret store, không log.
  let bundle;
  let secrets;
  try {
    bundle = readJsonEnv('CMP_BUNDLE');
    secrets = readJsonEnv('CMP_SECRETS');
  } catch {
    throw new CmpRelayError('CMP_NOT_CONFIGURED', 503);
  }
  // Thiếu bất kỳ cấu hình nào → 503 CMP_NOT_CONFIGURED (banner không chạy, GA vẫn bị chặn).
  let originUrls;
  try {
    originUrls = origins.map((value) => new URL(value));
  } catch {
    throw new CmpRelayError('CMP_NOT_CONFIGURED', 503);
  }
  if (
    !origins.length || originUrls.some((url) => url.origin !== url.href.replace(/\/$/, ''))
    || !cmpBaseUrl || !sessionSecret || sessionSecret.length < 32
    || bundle?.format !== 'cmp-relay-bundle' || bundle.version !== 1
    || !secrets?.assertionPrivateJwk || !secrets?.decryptionJwks
  ) {
    throw new CmpRelayError('CMP_NOT_CONFIGURED', 503);
  }

  // Máy ký "giấy giới thiệu" (assertion) gửi CMP — jose.js.
  const sign = createAssertionSigner({
    privateJwk: secrets.assertionPrivateJwk,
    issuer: bundle.assertion.issuer,
    audience: bundle.assertion.audience,
    appId: bundle.appId,
    environmentId: bundle.environmentId,
  });
  // Máy kiểm "biên nhận" (receipt) CMP gửi về — receipts.js.
  const verify = createReceiptVerifier({
    cmpJwks: bundle.cmpSigningKeys,
    decryptionJwks: secrets.decryptionJwks,
    issuer: bundle.receipt.issuer,
    audience: bundle.receipt.audience,
    appId: bundle.appId,
    environmentId: bundle.environmentId,
  });
  // Sổ quyền SQLite — receipts.js. Trên môi trường thật CMP_DATABASE phải trỏ ra volume bền:
  // mặc định .data/ nằm trong container nên mất sau mỗi lần deploy.
  if (!process.env.CMP_DATABASE && process.env.NODE_ENV === 'production') {
    console.warn('[cmp-relay] CMP_DATABASE chưa đặt: sổ quyền nằm trong container và sẽ mất khi deploy lại');
  }
  let store;
  try {
    store = await createPermissionStore(process.env.CMP_DATABASE || join(process.cwd(), '.data', 'cmp-relay.sqlite'));
  } catch (error) {
    // Thiếu node:sqlite (Node < 22.5) hoặc không mở được file DB → 503, ghi rõ nguyên nhân vào log.
    console.error('[cmp-relay] không mở được sổ quyền:', error?.message);
    throw new CmpRelayError('CMP_STORE_UNAVAILABLE', 503);
  }
  const cookieCodes = (process.env.CMP_COOKIE_CODES || COOKIE_CODES_DEFAULT.join(','))
    .split(',').map((code) => code.trim()).filter(Boolean);
  // Cookie Secure (tên __Host-…) chỉ khi MỌI origin đều là https; có origin http (chạy local) thì dùng tên thường.
  const secure = originUrls.every((url) => url.protocol === 'https:');

  return {
    origins: new Set(origins),
    cmpBaseUrl,
    bundle,
    cookieCodes,
    store,
    sign,
    verify,
    // Tiền tố __Host- bắt buộc Secure, nên khi chạy local bằng http thường phải dùng tên khác.
    cookieName: secure ? '__Host-skyfi-cmp' : 'skyfi-cmp-local',
    secure,
    // HMAC-SHA256 bằng CMP_SESSION_SECRET; purpose ('browser' | 'csrf') tách hai mục đích để chữ ký
    // của mục đích này không dùng được cho mục đích kia.
    mac: (purpose, value) => createHmac('sha256', sessionSecret).update(`${purpose}:${value}`).digest('base64url'),
  };
}

// So sánh hai chuỗi trong thời gian không đổi (timingSafeEqual), chống đoán chữ ký qua thời gian phản hồi.
const same = (a, b) => typeof a === 'string' && typeof b === 'string'
  && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * ID trình duyệt nằm trong cookie HttpOnly có ký HMAC, không lưu trạng thái ("<uuid>.<expiresAt>.<mac>"),
 * nên chạy được trên nhiều instance server mà không cần bảng phiên. Đây là ID trình duyệt, không phải
 * ID người dùng (tài liệu mục 3, TBD-04).
 */
const readBrowserId = (request, r) => {
  // Cookie có dạng "<uuid>.<hết hạn (giây)>.<HMAC>". Sai chữ ký (bị sửa) hoặc hết hạn → coi như chưa có.
  const raw = request.cookies.get(r.cookieName)?.value;
  const [id, expires, mac] = raw?.split('.') ?? [];
  if (!id || !expires || !mac) return undefined;
  if (!same(mac, r.mac('browser', `${id}.${expires}`))) return undefined;
  if (Number(expires) * 1000 <= Date.now()) return undefined;
  return id;
};

/**
 * CSRF token = HMAC('csrf:' + ID trình duyệt). Trang SkyFi nhận token từ /cookie/begin và gửi lại qua header
 * X-CSRF-Token. Trang web lạ không đọc được token nên không thể lợi dụng cookie của khách để gọi API.
 */
export const csrfFor = (r, browserId) => r.mac('csrf', browserId);

/**
 * So khớp chính xác Origin (với một trong các origin đã khai báo) ở mọi lời gọi thay đổi trạng thái.
 * Không tin Origin bị thiếu hoặc lạ.
 */
export const assertOrigin = (request, r) => {
  if (!r.origins.has(request.headers.get('origin'))) throw new CmpRelayError('ORIGIN_DENIED', 403);
};

// -----------------------------------------------------------------------------------------------------
// Giới hạn tần suất đơn giản (cửa sổ cố định 1 phút, lưu trong bộ nhớ tiến trình).
// Mỗi instance đếm riêng; chạy nhiều instance thì nên giới hạn thêm ở gateway/WAF.
// -----------------------------------------------------------------------------------------------------
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_KEYS = 10000;
const rateBuckets = new Map();

/** IP khách: lấy địa chỉ đầu tiên trong X-Forwarded-For (do proxy/LB đặt), không có thì dùng X-Real-IP. */
export const clientIp = (request) => request.headers.get('x-forwarded-for')?.split(',')[0].trim()
  || request.headers.get('x-real-ip') || 'unknown';

/** Quá `limit` lần/phút cho cùng `key` → 429 RATE_LIMITED. */
export const rateLimit = (key, limit) => {
  const now = Date.now();
  // Dọn các cửa sổ đã hết hạn khi Map phình to (chống tốn bộ nhớ khi bị quét nhiều IP).
  if (rateBuckets.size > RATE_MAX_KEYS) {
    for (const [k, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(k);
    if (rateBuckets.size > RATE_MAX_KEYS) rateBuckets.clear();
  }
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new CmpRelayError('RATE_LIMITED', 429);
};

/** Trả về ID trình duyệt đang có hoặc cấp ID mới; nơi gọi tự đặt cookie được trả về. */
export const beginBrowserSession = (request, r) => {
  // Đã có cookie hợp lệ → dùng lại ID cũ (không đặt lại cookie).
  const existing = readBrowserId(request, r);
  if (existing) return { browserId: existing, cookie: undefined };
  // Chưa có → tạo UUID ngẫu nhiên, ký HMAC kèm thời hạn.
  const browserId = randomUUID();
  const expires = Math.floor(Date.now() / 1000) + BROWSER_ID_TTL_SECONDS;
  const value = `${browserId}.${expires}.${r.mac('browser', `${browserId}.${expires}`)}`;
  return {
    browserId,
    cookie: {
      name: r.cookieName,
      value,
      httpOnly: true, // JavaScript trên trang không đọc được → script lạ không lấy được ID
      sameSite: 'strict', // không gửi kèm khi request đến từ trang web khác
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

/** Đọc body JSON có giới hạn 256 KB (kiểm cả header Content-Length lẫn độ dài thực tế). */
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

// Không cho trình duyệt/CDN cache phản hồi (token, CSRF, quyền đều là dữ liệu riêng từng khách).
const NO_STORE = { 'Cache-Control': 'no-store' };

export const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/** Lỗi đã biết trả đúng mã HTTP; lỗi khác trả 500 chung chung, không lộ chi tiết nội bộ. */
export const handleError = (error) => {
  if (error instanceof CmpRelayError) return json({ error: error.code }, error.status);
  console.error('[cmp-relay]', error?.message);
  return json({ error: 'CMP_RELAY_ERROR' }, 500);
};
