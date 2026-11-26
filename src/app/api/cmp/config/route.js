// BƯỚC 2 của flow — GET /api/cmp/config
// Trang cần biết URL CMP, appId và danh sách mã cookie để khởi tạo SDK.
import { getCmpRelay, handleError, json } from '@/lib/server/cmp/relay';

// Chạy trên Node.js (cần node:crypto, node:sqlite), không chạy Edge; không cache vì mỗi khách một kết quả.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Chỉ trả cấu hình công khai cho SDK (không có khóa, không có thông tin bí mật). */
export async function GET() {
  try {
    const r = await getCmpRelay();
    return json({ cmpBaseUrl: r.cmpBaseUrl, appId: r.bundle.appId, cookieCodes: r.cookieCodes });
  } catch (error) {
    return handleError(error);
  }
}
