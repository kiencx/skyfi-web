// Vietnamese mobile rule shared by the checkout form and the /api/bss/orders BFF.
// Same rule as admin user Mobile in BSS (BE VietnamMobile.REGEX, CMS validateVietnamMobile):
// 9-digit subscriber number starting with 3/5/7/8/9, optionally prefixed with 0 (10 digits),
// 84 (11 digits) or +84 (12 characters). No spaces or separators.
export const VIETNAM_MOBILE_REGEX = /^(?:\+84|84|0)?[35789]\d{8}$/;

export const isVietnamMobile = (value) => VIETNAM_MOBILE_REGEX.test(String(value ?? '').trim());
