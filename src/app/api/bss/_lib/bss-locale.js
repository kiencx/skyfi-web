import 'server-only';

// The browser sends the page locale in this header (see app/utils/bssLocale.js). Callers that do
// not send it (older pages, partner webviews) keep the previous Vietnamese behaviour.
export const LOCALE_HEADER = 'x-locale';

const MESSAGES = {
  vi: {
    invalidResponse: 'Phản hồi từ hệ thống không hợp lệ. Vui lòng thử lại.',
    unreachable: 'Không thể kết nối tới hệ thống. Vui lòng thử lại sau.',
    unavailable: 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.',
    invalidCheckout: 'Thông tin đặt hàng không hợp lệ.',
    invalidPhone: 'Số điện thoại phải là số di động Việt Nam, ví dụ 0912345678 hoặc +84912345678.',
    unsupportedBrand: 'Kênh bán không được hỗ trợ.',
    unsupportedRegionType: 'Loại điểm đến không được hỗ trợ.',
    countryOrRegion: 'Cần truyền đúng một trong hai tham số country_code hoặc region_id.',
    invalidPackageOrQuantity: 'Mã gói hoặc số lượng không hợp lệ.',
    invalidRegionId: 'region_id không hợp lệ.',
    missingOrder: 'Thiếu mã đơn hàng.',
    invalidBill: 'Hóa đơn hoặc kênh bán không hợp lệ.',
    checkBillFailed: 'Không thể kiểm tra hóa đơn.',
    missingSession: 'Thiếu phiên truy cập.',
  },
  en: {
    invalidResponse: 'The system returned an invalid response. Please try again.',
    unreachable: 'Unable to reach the system. Please try again later.',
    unavailable: 'The service is temporarily unavailable. Please try again later.',
    invalidCheckout: 'Invalid checkout information.',
    invalidPhone: 'Please enter a Vietnamese mobile number, e.g. 0912345678 or +84912345678.',
    unsupportedBrand: 'Unsupported brand.',
    unsupportedRegionType: 'Unsupported destination type.',
    countryOrRegion: 'Provide exactly one of country_code or region_id.',
    invalidPackageOrQuantity: 'Invalid package or quantity.',
    invalidRegionId: 'Invalid region_id.',
    missingOrder: 'The order code is missing.',
    invalidBill: 'Invalid bill or brand.',
    checkBillFailed: 'Unable to check the bill.',
    missingSession: 'The access session is missing.',
  },
};

/** Backend messages exist in Vietnamese and English; every other site locale reads English. */
export const resolveLocale = (request) => {
  const requested = String(request.headers.get(LOCALE_HEADER) || '').trim().toLowerCase();
  if (!requested || requested.startsWith('vi')) return 'vi';
  return 'en';
};

/** Headers that make BSS answer in the caller's language. */
export const localeHeaders = (request) => ({ 'Accept-Language': resolveLocale(request) });

export const bffMessage = (request, key) => {
  const messages = MESSAGES[resolveLocale(request)];
  return messages[key] || MESSAGES.vi[key] || key;
};
