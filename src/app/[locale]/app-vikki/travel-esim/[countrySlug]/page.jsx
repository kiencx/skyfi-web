"use client";

import VikkiBssPackageSelector from '@/app/components/vikki/BssPackageSelector';
import {
  BSS_BRANDS,
  adaptPublicV2Package,
  fetchAllBssPackages,
  fetchBssRegions,
  getRegionSlug,
  getRequestErrorMessage,
  normalizeRegionType,
  saveBssCheckoutItem,
} from '@/app/utils/bssCatalog';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const BRAND = BSS_BRANDS.VIKKI;

// Icons
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="#0C0C0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function VikkiCountryEsimPage() {
  const t = useTranslations('vikki.travelEsim.detailPage');
  const tCommon = useTranslations('vikki.travelEsim');
  const params = useParams();
  const countrySlug = String(params.countrySlug || '');
  const router = useRouter();
  const searchParams = useSearchParams();
  const regionType = normalizeRegionType(searchParams.get('regions')) || 'COUNTRY';

  const [regionDetails, setRegionDetails] = useState(null);
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleBuyPackage = (plan, quantity) => {
    saveBssCheckoutItem(plan, quantity, BRAND);
    router.push(`/app-vikki/checkout/bss?packageId=${plan.package_id}`);
  };

  useEffect(() => {
    if (!countrySlug) return undefined;

    let isCurrent = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setRegionDetails(null);
      setPackages([]);
      try {
        const regions = await fetchBssRegions({ type: regionType, brand: BRAND });
        const found = regions.find((region) => getRegionSlug(region) === countrySlug.toLowerCase());
        if (!found) {
          throw new Error(`Không tìm thấy thông tin cho mã: ${countrySlug}`);
        }

        const items = await fetchAllBssPackages({ regionId: found.id, brand: BRAND });
        if (!isCurrent) return;
        setPackages(items.map((pkg) => adaptPublicV2Package(pkg, found)));
        setRegionDetails(found);
      } catch (err) {
        if (!isCurrent) return;
        console.error('Error fetching eSIM data:', err);
        setError(getRequestErrorMessage(err, 'Đã có lỗi xảy ra khi tải dữ liệu.'));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    load();
    return () => { isCurrent = false; };
  }, [countrySlug, regionType]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5] font-inter text-[#0C0C0E]">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 shadow-sm">
        <div className="h-11 flex items-center justify-between px-4 relative">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <BackIcon />
          </button>
          <h1 className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[16px] font-semibold truncate max-w-[200px]">
            {isLoading ? tCommon('loading') : regionDetails?.name || 'Gói cước eSIM'}
          </h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {isLoading && (
          <div className="text-center py-10 text-gray-500 text-[14px]">{t('loading')}</div>
        )}

        {error && (
          <div className="text-center py-10 text-red-500 text-[14px]">{error}</div>
        )}

        {!isLoading && !error && regionDetails && (
          packages.length > 0 ? (
            <VikkiBssPackageSelector
              region={regionDetails}
              packages={packages}
              onBuyNow={handleBuyPackage}
            />
          ) : (
            <div className="text-center py-10 text-gray-500 text-[14px]">
              {t('noPackage', { country: regionDetails.name })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
