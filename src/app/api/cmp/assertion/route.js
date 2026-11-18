// BƯỚC 3 của flow — POST /api/cmp/assertion
// SDK gọi qua hàm getAssertion (CmpCookieConsent.jsx) mỗi khi cần mở phiên với CMP.
// SkyFi ký "giấy giới thiệu": "trình duyệt <ID> là khách của SkyFi" → SDK đưa cho CMP để đổi lấy phiên.
import { getCmpRelay, handleError, json, requireBrowserSession, rateLimit } from '@/lib/server/cmp/relay';

// Chạy trên Node.js (cần node:crypto, node:sqlite), không chạy Edge; không cache vì mỗi khách một kết quả.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Ký assertion danh tính (RS256, hiệu lực 60 giây) cho SDK CMP. Subject lấy từ cookie, không lấy từ body. */
export async function POST(request) {
  try {
    const r = await getCmpRelay();
    // Bắt buộc đủ Origin + cookie + CSRF; ID lấy từ cookie đã ký, body (nếu có) bị bỏ qua hoàn toàn.
    const browserId = requireBrowserSession(request, r);
    // Tối đa 30 assertion/phút cho mỗi ID trình duyệt.
    rateLimit(`assertion:${browserId}`, 30);
    // kind=BROWSER: định danh là trình duyệt (cookie), không phải tài khoản; channel=WEB.
    return json({ assertion: r.sign({ subject: browserId, kind: 'BROWSER', channel: 'WEB' }) });
  } catch (error) {
    return handleError(error);
  }
}
