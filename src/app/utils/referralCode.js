// Mã giới thiệu đến từ link `?rf=<mã>` (vd: /vi?rf=menas001). middleware.js lưu vào cookie `rf` 24h,
// các luồng mua đọc lại khi tạo đơn: travel eSIM (checkout/payment) và eSIM quốc tế (BFF /api/bss/orders).
export const REFERRAL_COOKIE = 'rf';
export const REFERRAL_QUERY_PARAM = 'rf';
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24;

// Đọc cookie `rf` phía trình duyệt; trả '' nếu không có.
export const readReferralCodeCookie = () => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)rf=([^;]*)/);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return '';
  }
};
