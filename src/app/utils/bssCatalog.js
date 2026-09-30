import axios from 'axios';

// Shared client helpers for the BSS Public API v2 flow. Everything goes through
// the Next.js BFF (`/api/bss/*`), so no partner credential reaches the browser.

export const BSS_BRANDS = {
  WEB: 'web',
  VIKKI: 'vikki',
};

export const BSS_CHECKOUT_ITEM_KEY = 'bssCheckoutItem';
export const BSS_LAST_ORDER_KEY = 'bssLastOrderNumber';
export const BSS_LAST_BRAND_KEY = 'bssLastOrderBrand';

const TAB_TO_REGION_TYPE = { national: 'COUNTRY', regional: 'REGION', global: 'GLOBAL' };
const REGION_TYPE_TO_TAB = { COUNTRY: 'national', REGION: 'regional', GLOBAL: 'global' };

export const normalizeBrand = (value) => {
  const brand = String(value || '').toLowerCase();
  return Object.values(BSS_BRANDS).includes(brand) ? brand : BSS_BRANDS.WEB;
};

export const mapTabToRegionType = (tab) => TAB_TO_REGION_TYPE[tab] || '';

export const mapRegionTypeToTab = (type) => REGION_TYPE_TO_TAB[type] || 'national';

// Legacy links use `REGIONAL`; BSS v2 calls the same type `REGION`.
export const normalizeRegionType = (value) => {
  const type = String(value || '').toUpperCase();
  if (type === 'REGIONAL') return 'REGION';
  return REGION_TYPE_TO_TAB[type] ? type : '';
};

export const getRegionSlug = (region) => String(region?.code || region?.id || '').toLowerCase();

// Only countries have an ISO flag; REGION/GLOBAL codes are numeric ids.
export const getRegionFlagUrl = (region) => {
  if (region?.type && region.type !== 'COUNTRY') return null;
  const isoCode = String(region?.iso_code || region?.code || '').trim().toLowerCase();
  return /^[a-z]{2}$/.test(isoCode) ? `https://flagcdn.com/w160/${isoCode}.png` : null;
};

const unwrap = (response, fallbackMessage) => {
  if (!response?.data?.success) {
    throw new Error(response?.data?.message || fallbackMessage);
  }
  return response.data.data;
};

export const getRequestErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
);

export async function fetchBssRegions({ type, brand = BSS_BRANDS.WEB }) {
  if (!type) return [];
  const response = await axios.get('/api/bss/regions', { params: { type, brand } });
  const data = unwrap(response, 'Không thể tải danh sách điểm đến.');
  return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
}

export async function fetchAllBssPackages({
  regionId,
  brand = BSS_BRANDS.WEB,
  packageType = 'NEW_ESIM',
  limit = 50,
}) {
  const request = (page) => axios.get('/api/bss/packages', {
    params: { region_id: regionId, package_type: packageType, brand, limit, page },
  });

  const first = unwrap(await request(1), 'Không thể tải danh sách gói eSIM.');
  const items = Array.isArray(first?.items) ? [...first.items] : [];
  const totalPages = Number(first?.total_pages || 1);

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => request(index + 2)),
    );
    rest.forEach((response) => {
      const data = unwrap(response, 'Không thể tải danh sách gói eSIM.');
      if (Array.isArray(data?.items)) items.push(...data.items);
    });
  }
  return items;
}

export async function fetchBssPackagePrice({ packageId, quantity, brand = BSS_BRANDS.WEB }) {
  const response = await axios.get(`/api/bss/packages/${packageId}/price`, {
    params: { quantity, brand },
  });
  return unwrap(response, 'Không thể kiểm tra giá gói.');
}

export async function createBssOrder({ order, brand = BSS_BRANDS.WEB, idempotencyKey }) {
  const response = await axios.post(
    '/api/bss/orders',
    { ...order, brand },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  const data = unwrap(response, 'Không thể tạo đơn hàng.');
  if (!data?.order_number) throw new Error('Không thể tạo đơn hàng.');
  return data;
}

export async function fetchBssOrder(orderCode) {
  const response = await axios.get(`/api/bss/orders/${encodeURIComponent(orderCode)}`);
  return unwrap(response, 'Không thể kiểm tra đơn hàng.')?.order || null;
}

// Package v2 is identified by `package_id`; keep the legacy aliases so shared
// cards/tracking helpers that expect variant_id/product_id keep working.
export const adaptPublicV2Package = (pkg, region) => ({
  ...pkg,
  variant_id: pkg.package_id,
  product_id: pkg.package_id,
  provider: pkg.provider_name,
  type: pkg.package_type,
  countries_array: [{
    name: region?.name,
    title: region?.name,
    country_code: region?.iso_code || region?.code,
    image: getRegionFlagUrl(region),
  }],
});

export const saveBssCheckoutItem = (plan, quantity, brand) => {
  window.sessionStorage.setItem(BSS_CHECKOUT_ITEM_KEY, JSON.stringify({
    package_id: plan.package_id,
    quantity,
    name: plan.name,
    validity_days: plan.validity_days,
    currency: plan.currency,
    brand,
  }));
};

export const readBssCheckoutItem = () => {
  try {
    const raw = window.sessionStorage.getItem(BSS_CHECKOUT_ITEM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const formatBssPrice = (value, currency = 'VND', locale = 'vi') => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  maximumFractionDigits: currency === 'VND' ? 0 : 2,
}).format(Number(value || 0));
