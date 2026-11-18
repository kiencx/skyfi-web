// BƯỚC 6 của flow — POST /api/cmp/receipts   body: { receipts: [ { receipt: "<JWE>" }, ... ] }
// Sau khi khách chọn trên banner, CMP phát receipt; SDK gọi hàm deliverReceipts (CmpCookieConsent.jsx)
// để chuyển về đây. SkyFi xác minh rồi ghi vào sổ quyền.
import {
  getCmpRelay, handleError, json, JoseError, readJsonBody, requireBrowserSession, rateLimit,
} from '@/lib/server/cmp/relay';

// Chạy trên Node.js (cần node:crypto, node:sqlite), không chạy Edge; không cache vì mỗi khách một kết quả.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tài liệu mục 8.1: các result này nghĩa là cấu hình phía CMP có vấn đề → chặn (fail-closed) và báo đội CMP.
const CMP_ALERT_RESULTS = new Set(['BINDING_DISABLED', 'ACTIVE_VERSION_NOT_FOUND', 'NOT_PERMITTED']);

/**
 * Nhận receipt do SDK chuyển tiếp: giải mã (JWE) → xác minh chữ ký CMP (JWS) → kiểm tra claim → lưu.
 * Fail-closed: receipt bị từ chối không thay đổi gì và trả 422 để SDK giữ lại, gửi lại sau.
 * Trường `allowed`/`codes` gửi kèm receipt bị bỏ qua; chỉ tin nội dung receipt đã xác minh.
 * Log (mục 15): chỉ ghi jti, kid và kết quả xác minh; không ghi receipt, assertion, token hay khóa.
 */
export async function POST(request) {
  try {
    const r = await getCmpRelay();
    // Receipt phải thuộc đúng trình duyệt đang gửi → lấy ID từ cookie để so với sub trong receipt.
    const browserId = requireBrowserSession(request, r);
    // Mỗi receipt tốn một lần giải mã RSA đồng bộ → tối đa 20 request/phút cho mỗi ID trình duyệt.
    rateLimit(`receipts:${browserId}`, 20);
    const body = await readJsonBody(request);
    // Mỗi lần tối đa 50 receipt (SDK gom các receipt chưa gửi được).
    if (!Array.isArray(body.receipts) || body.receipts.length === 0 || body.receipts.length > 50) {
      return json({ error: 'INVALID_RECEIPTS' }, 400);
    }
    const results = body.receipts.map((item) => {
      const meta = {};
      try {
        // Giải mã + kiểm chữ ký + kiểm nội dung (receipts.js). Sai → ném lỗi → nhánh catch.
        const claims = r.verify(item?.receipt, { subject: browserId, subjectKind: 'BROWSER' }, meta);
        // Ghi vào sổ: chống trùng jti, chỉ nhận revision mới hơn.
        const outcome = r.store.apply(claims);
        // Log theo mục 15: chỉ jti, kid, kết quả — tuyệt đối không log nội dung receipt.
        console.info('[cmp-relay] receipt', JSON.stringify({
          result: 'ACCEPTED',
          jti: claims.jti,
          encKid: meta.encKid,
          sigKid: meta.sigKid,
          duplicate: outcome.duplicate,
          codes: outcome.codes,
        }));
        // Mục 8.1: result báo lỗi cấu hình phía CMP → quyền vẫn bị chặn, ghi cảnh báo để báo đội CMP.
        // Nên đặt cảnh báo (Sentry/log) theo chuỗi CMP_CONFIG_ALERT.
        const alerts = Object.entries(claims.consents)
          .filter(([, state]) => CMP_ALERT_RESULTS.has(state?.result))
          .map(([code, state]) => ({ code, result: state.result }));
        if (alerts.length) {
          console.error('[cmp-relay] CMP_CONFIG_ALERT – báo đội CMP', JSON.stringify({
            jti: claims.jti,
            environmentId: claims.environmentId,
            alerts,
          }));
        }
        return { status: 'ACCEPTED', ...outcome };
      } catch (error) {
        if (error instanceof JoseError) {
          // Receipt bị từ chối (sai/giả/hết hạn/không phải của khách này): không ghi gì; chỉ log mã lỗi và kid.
          console.warn('[cmp-relay] receipt', JSON.stringify({
            result: 'REJECTED',
            error: error.code,
            encKid: meta.encKid,
            sigKid: meta.sigKid,
          }));
          return { status: 'REJECTED', error: error.code };
        }
        // Lỗi phía SkyFi (ghi DB thất bại, ổ đầy, DB bị khóa…), không phải lỗi receipt: log nguyên nhân để
        // phát hiện sự cố. Transaction đã ROLLBACK nên sổ không bị ghi dở.
        console.error('[cmp-relay] receipt', JSON.stringify({
          result: 'ERROR',
          error: error?.message,
          encKid: meta.encKid,
          sigKid: meta.sigKid,
        }));
        return { status: 'ERROR', error: 'CMP_RELAY_ERROR' };
      }
    });
    // 200: tất cả hợp lệ → SDK xóa khỏi hàng đợi.
    // 500: có lỗi phía SkyFi → SDK giữ lại, gửi lại sau (receipt vẫn hợp lệ, không phải lỗi của nó).
    // 422: có receipt bị từ chối → SDK giữ lại, gửi lại sau.
    if (results.some((result) => result.status === 'ERROR')) return json({ results }, 500);
    const ok = results.every((result) => result.status === 'ACCEPTED');
    return json({ results }, ok ? 200 : 422);
  } catch (error) {
    return handleError(error);
  }
}
