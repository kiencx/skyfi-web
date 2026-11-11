import { getCmpRelay, handleError, json, requireBrowserSession } from '@/lib/server/cmp/relay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Quyền cookie đã lưu cho trình duyệt này từ các receipt đã xác minh (là thứ server sẽ áp dụng). */
export async function POST(request) {
  try {
    const r = getCmpRelay();
    const browserId = requireBrowserSession(request, r);
    return json({ data: r.store.permissions(r.bundle.environmentId, browserId) });
  } catch (error) {
    return handleError(error);
  }
}
