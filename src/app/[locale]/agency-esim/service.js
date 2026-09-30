import { BSS_BRANDS, fetchBssRegions, mapTabToRegionType } from '@/app/utils/bssCatalog';

export const AGENCY_BRAND = BSS_BRANDS.AGENCY;

export function mapTabToApiType(activeTab) {
  return mapTabToRegionType(activeTab);
}

// Regions come from BSS Public API v2 through the BFF (`/api/bss/regions`).
export async function getRegionsByType(apiType) {
  if (!apiType) return [];

  try {
    return await fetchBssRegions({ type: apiType, brand: AGENCY_BRAND });
  } catch (error) {
    console.error(`Không thể tải dữ liệu ${apiType}:`, error.response ? error.response.data : error.message);
    return [];
  }
}
