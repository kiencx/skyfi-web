// BƯỚC 1 của flow — POST /api/cmp/cookie/begin
// Gọi từ CmpCookieConsent.jsx ngay khi trang tải. Cấp "thẻ khách" (ID trình duyệt) và CSRF token.
import {
  assertOrigin, beginBrowserSession, csrfFor, getCmpRelay, handleError, json, clientIp, rateLimit,
} from '@/lib/server/cmp/relay';

// Chạy trên Node.js (cần node:crypto, node:sqlite), không chạy Edge; không cache vì mỗi khách một kết quả.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Khách ẩn danh: cấp (hoặc giữ nguyên) ID trình duyệt first-party trong cookie HttpOnly và trả về CSRF token
 * để trang gửi kèm ở các lời gọi sau. ID trình duyệt chính là `sub` của assertion kind=BROWSER.
 */
export async function POST(request) {
  try {
    const r = await getCmpRelay();
    // Chỉ nhận request từ đúng domain SkyFi (chưa cần CSRF vì đây là lần đầu, chưa có token).
    assertOrigin(request, r);
    // Chống spam tạo ID: tối đa 120 lần/phút cho mỗi IP (cao vì nhiều khách có thể dùng chung IP qua NAT).
    rateLimit(`begin:${clientIp(request)}`, 120);
    // Lấy ID cũ từ cookie, hoặc tạo ID mới.
    const { browserId, cookie } = beginBrowserSession(request, r);
    // Trả CSRF token cho trang; các lời gọi sau phải gửi lại token này trong header X-CSRF-Token.
    const response = json({ csrfToken: csrfFor(r, browserId) });
    // Chỉ đặt cookie khi vừa tạo ID mới.
    if (cookie) response.cookies.set(cookie);
    return response;
  } catch (error) {
    return handleError(error);
  }
}
