import {
  assertOrigin, beginBrowserSession, csrfFor, getCmpRelay, handleError, json,
} from '@/lib/server/cmp/relay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Khách ẩn danh: cấp (hoặc giữ nguyên) ID trình duyệt first-party trong cookie HttpOnly và trả về CSRF token
 * để trang gửi kèm ở các lời gọi sau. ID trình duyệt chính là `sub` của assertion kind=BROWSER.
 */
export async function POST(request) {
  try {
    const r = getCmpRelay();
    assertOrigin(request, r);
    const { browserId, cookie } = beginBrowserSession(request, r);
    const response = json({ csrfToken: csrfFor(r, browserId) });
    if (cookie) response.cookies.set(cookie);
    return response;
  } catch (error) {
    return handleError(error);
  }
}
