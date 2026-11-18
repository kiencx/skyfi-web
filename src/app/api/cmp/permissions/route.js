// PHỤ — POST /api/cmp/permissions
// Xem quyền SkyFi đang lưu cho trình duyệt hiện tại (debug, kiểm thử nghiệm thu). Chỉ xem được của chính mình.
import { getCmpRelay, handleError, json, requireBrowserSession, rateLimit } from '@/lib/server/cmp/relay';

// Chạy trên Node.js (cần node:crypto, node:sqlite), không chạy Edge; không cache vì mỗi khách một kết quả.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Quyền cookie đã lưu cho trình duyệt này từ các receipt đã xác minh (là thứ server sẽ áp dụng). */
export async function POST(request) {
  try {
    const r = await getCmpRelay();
    const browserId = requireBrowserSession(request, r);
    rateLimit(`permissions:${browserId}`, 30);
    return json({ data: r.store.permissions(r.bundle.environmentId, browserId) });
  } catch (error) {
    return handleError(error);
  }
}
