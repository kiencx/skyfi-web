// Trạng thái đồng ý cookie dùng chung giữa banner CMP (CmpCookieConsent) và các tag tracking của từng trang.
// SDK CMP chỉ quét <script data-cmp-code> một lần lúc khởi động, nên tag nằm trong trang render phía client
// (travelsim, vj2…) không được SDK thấy. Thay vào đó, banner đăng ký với SDK một "cổng" cho mỗi mã;
// khi SDK mở cổng (khách đã đồng ý), các trang nhận sự kiện và mới render tag.

export const CMP_ENABLED = process.env.NEXT_PUBLIC_CMP_ENABLED === 'true';

// Các mã có tag phụ thuộc trên trang. Thêm mã mới ở đây nếu có tag mới.
export const GATED_CODES = ['COOKIE_ANALYTICS', 'COOKIE_MARKETING'];

// Tên sự kiện window phát ra khi một mã được đồng ý (detail = mã).
const EVENT = 'skyfi:cmp-consent';

// Lưu trạng thái trên window (không phải biến module) để mọi bundle/chunk của Next.js dùng chung một chỗ.
const granted = () => {
  if (typeof window === 'undefined') return {};
  window.__skyfiCmpConsent ??= {};
  return window.__skyfiCmpConsent;
};

/** SDK gọi khi mã được đồng ý. Chỉ mở cổng, không bao giờ tự đóng (rút đồng ý sẽ yêu cầu tải lại trang). */
export const grantConsent = (code) => {
  granted()[code] = true;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: code }));
};

/** Fail-closed: chưa có tín hiệu từ SDK thì coi như chưa đồng ý. */
export const isConsentGranted = (code) => granted()[code] === true;

/** Đăng ký nghe sự kiện đồng ý; trả về hàm hủy đăng ký (dùng trong useEffect cleanup). */
export const onConsentGranted = (callback) => {
  const listener = (event) => callback(event.detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
};
