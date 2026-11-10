import { getCmpRelay, handleError, json } from '@/lib/server/cmp/relay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Chỉ trả cấu hình công khai cho SDK (không có khóa, không có thông tin bí mật). */
export async function GET() {
  try {
    const r = getCmpRelay();
    return json({ cmpBaseUrl: r.cmpBaseUrl, appId: r.bundle.appId, cookieCodes: r.cookieCodes });
  } catch (error) {
    return handleError(error);
  }
}
