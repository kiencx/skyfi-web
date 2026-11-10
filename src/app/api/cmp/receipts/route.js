import {
  getCmpRelay, handleError, json, JoseError, readJsonBody, requireBrowserSession,
} from '@/lib/server/cmp/relay';

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
    const r = getCmpRelay();
    const browserId = requireBrowserSession(request, r);
    const body = await readJsonBody(request);
    if (!Array.isArray(body.receipts) || body.receipts.length === 0 || body.receipts.length > 50) {
      return json({ error: 'INVALID_RECEIPTS' }, 400);
    }
    const results = body.receipts.map((item) => {
      const meta = {};
      try {
        const claims = r.verify(item?.receipt, { subject: browserId, subjectKind: 'BROWSER' }, meta);
        const outcome = r.store.apply(claims);
        console.info('[cmp-relay] receipt', JSON.stringify({
          result: 'ACCEPTED',
          jti: claims.jti,
          encKid: meta.encKid,
          sigKid: meta.sigKid,
          duplicate: outcome.duplicate,
          codes: outcome.codes,
        }));
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
        const code = error instanceof JoseError ? error.code : 'INVALID_RECEIPT';
        console.warn('[cmp-relay] receipt', JSON.stringify({
          result: 'REJECTED',
          error: code,
          encKid: meta.encKid,
          sigKid: meta.sigKid,
        }));
        return { status: 'REJECTED', error: code };
      }
    });
    const ok = results.every((result) => result.status === 'ACCEPTED');
    return json({ results }, ok ? 200 : 422);
  } catch (error) {
    return handleError(error);
  }
}
