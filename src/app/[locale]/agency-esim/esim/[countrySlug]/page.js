"use client";

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Footer from '@/app/components/Footer';
import Header from '@/app/components/Header';
import HeaderCart from '@/app/components/HeaderCart';
import BssPackageSelector from '@/app/components/BssPackageSelector';
import useMyEsim from '@/app/hooks/useMyEsim';
import { trackBeginCheckout, trackPageView } from '@/app/utils/trackingHelper';
import {
  BSS_BRANDS,
  adaptPublicV2Package,
  fetchAllBssPackages,
  fetchBssRegions,
  getRegionFlagUrl,
  getRegionSlug,
  getRequestErrorMessage,
  mapRegionTypeToTab,
  normalizeRegionType,
  saveBssCheckoutItem,
} from '@/app/utils/bssCatalog';

const BRAND = BSS_BRANDS.AGENCY;

const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ArrowRightIcon = () => <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fillRule="evenodd" clipRule="evenodd" d="M8.29289 6.05559C8.68342 5.66507 9.31658 5.66507 9.70711 6.05559L15.7071 12.0556C16.0976 12.4461 16.0976 13.0793 15.7071 13.4698L9.70711 19.4698C9.31658 19.8603 8.68342 19.8603 8.29289 19.4698C7.90237 19.0793 7.90237 18.4461 8.29289 18.0556L13.5858 12.7627L8.29289 7.46981C7.90237 7.07928 7.90237 6.44612 8.29289 6.05559Z" fill="#333333"/>
</svg>;

export default function AgencyCountryESimPlansPage() {
  const locale = useLocale();
  const t = useTranslations();
  const params = useParams();
  const countrySlug = String(params.countrySlug || '');
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewSrc = searchParams.get('src') || 'skyfi';

  // `regions` is written by the list page (COUNTRY | REGION | GLOBAL); fall back
  // to the tab param so hand-typed URLs still resolve.
  const regionType = normalizeRegionType(searchParams.get('regions'))
    || normalizeRegionType({ national: 'COUNTRY', regional: 'REGION', global: 'GLOBAL' }[searchParams.get('type')])
    || 'COUNTRY';
  const activeTab = mapRegionTypeToTab(regionType);

  const [regionDetails, setRegionDetails] = useState(null);
  const [allRegions, setAllRegions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const searchInputRef = useRef(null);
  const popoverRef = useRef(null);

  const tPage = useTranslations('countryEsimPage');
  const tCommon = useTranslations('common');
  const tbaner = useTranslations('travelESimPage');
  const { showDevicesEsim } = useMyEsim();

  useEffect(() => {
    trackPageView({ page_title: `Agency eSIM ${countrySlug} - Chọn gói cước` });
  }, [countrySlug]);

  useEffect(() => {
    setSearchTerm('');
    setShowFilterPopover(false);
  }, [regionType]);

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
        if (!isCurrent) return;
        setAllRegions(regions);

        const found = regions.find((region) => getRegionSlug(region) === countrySlug.toLowerCase());
        if (!found) {
          throw new Error(tPage('countryNotFound', { slug: countrySlug }));
        }

        // Load every package once; the selector derives valid data/validity
        // combinations from this list.
        const items = await fetchAllBssPackages({ regionId: found.id, brand: BRAND });
        if (!isCurrent) return;
        setPackages(items.map((pkg) => adaptPublicV2Package(pkg, found)));
        setRegionDetails(found);
      } catch (err) {
        if (!isCurrent) return;
        console.error('Lỗi khi tải dữ liệu eSIM cho slug:', countrySlug, err);
        setError(getRequestErrorMessage(err, tCommon('errorFetchingData')));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    load();
    return () => { isCurrent = false; };
  }, [countrySlug, regionType, tPage, tCommon]);

  const filteredRegions = allRegions.filter((region) => (
    region.name.toLowerCase().includes(searchTerm.toLowerCase())
    && getRegionSlug(region) !== countrySlug.toLowerCase()
  ));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)
        && searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchInputFocus = () => {
    if (allRegions.length > 0) setShowFilterPopover(true);
  };

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
    if (allRegions.length > 0) setShowFilterPopover(true);
  };

  const handlePopoverItemClick = () => {
    setShowFilterPopover(false);
    setSearchTerm('');
  };

  const renderPopoverItems = (regions) => {
    if (isLoading) {
      return <div className="text-center py-[20px] text-[#666]">{tPage('loading')}</div>;
    }

    if (!regions || regions.length === 0) {
      if (searchTerm && allRegions.length > 0) {
        return (
          <div className="text-center py-[20px] text-[#666]">
            <p>{tPage('noResultFor', { searchTerm })}</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setShowFilterPopover(false);
              }}
              className="mt-2 text-blue-600 hover:underline"
            >
              {tPage('clearSearch')}
            </button>
          </div>
        );
      }
      return <div className="text-center py-[20px] text-[#666]">{tPage('noCountryFound')}</div>;
    }

    return (
      <div className="max-h-[400px] overflow-y-auto">
        {regions.map((region) => {
          const flagUrl = getRegionFlagUrl(region);
          return (
            <Link
              key={region.id}
              href={`/${locale}/agency-esim/esim/${getRegionSlug(region)}?regions=${regionType}&src=${viewSrc}`}
              className="block"
              onClick={handlePopoverItemClick}
            >
              <div className="bg-white hover:bg-gray-50 transition-colors duration-200 flex flex-row items-center p-[12px] gap-[12px] border-b border-[#F1F1F1] last:border-b-0">
                {flagUrl && (
                  <div className="w-[40px] h-[30.5px] relative flex-shrink-0">
                    <img
                      src={flagUrl}
                      alt={region.name}
                      className="rounded-[4px] border object-cover border-[#F1F1F1] w-full h-full"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}
                <span className="font-inter font-semibold text-[16px] text-[#333] flex-1 min-w-0 line-clamp-1">
                  {region.name}
                </span>
                <span className="text-[#A1A1A1]"><ArrowRightIcon /></span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  const onBuyNowClick = (plan, quantity) => {
    trackBeginCheckout({
      cart_total: plan.selling_price * quantity,
      currency: plan.currency || 'VND',
      items: [{ product_id: plan.variant_id, product_name: plan.name, quantity, price: plan.selling_price }],
    });
    saveBssCheckoutItem(plan, quantity, BRAND);
    router.push(`/${locale}/checkout/bss?packageId=${plan.package_id}&brand=${BRAND}&src=${viewSrc}`);
  };

  const tabs = [
    { id: 'national', labelKey: 'travelESimPage.tabNational' },
    { id: 'regional', labelKey: 'travelESimPage.tabRegional' },
    { id: 'global', labelKey: 'travelESimPage.tabGlobal' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
      {viewSrc === 'vj' ? <HeaderCart /> : <Header />}

      <div
        className="relative h-[240px] md:h-[240px] flex flex-col items-start justify-start pt-[20px]"
        style={{ backgroundImage: 'url(/assets/bg-esim.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="z-10 container flex flex-col items-start gap-[24px] w-full">
          <h1 className="font-semibold text-[24px] md:text-[32px] text-center text-[#333]">
            {tbaner('bannerTitle')}
          </h1>
          <div className="relative w-full max-w-[680px]">
            <div className="absolute inset-y-0 left-0 pl-[20px] flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              ref={searchInputRef}
              type="search"
              placeholder={tbaner('searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchInputChange}
              onFocus={handleSearchInputFocus}
              className="w-full bg-white border border-[#DDDDDD] rounded-[8px] text-[16px] outline-none placeholder:text-[#A1A1A1] py-[20px] pr-[48px] pl-[52px] focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {showFilterPopover && (
              <div
                ref={popoverRef}
                className="absolute top-full left-0 right-0 mt-[8px] bg-white border border-[#DDDDDD] rounded-[8px] shadow-lg z-50 max-h-[400px] overflow-hidden"
              >
                {renderPopoverItems(filteredRegions)}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="w-full flex flex-col items-center">
        <div className="w-full bg-white border-b border-[#F1F1F1]">
          <div className="container flex justify-between md:justify-start gap-[20px] md:gap-[40px]">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={`/${locale}/agency-esim?type=${tab.id}&src=${viewSrc}`}
                className={`py-[16px] md:py-[20px] font-inter text-sm sm:text-[16px] md:text-[18px] border-b-2 hover:text-[#ED1B2F] ${
                  activeTab === tab.id
                    ? 'border-[#ED1B2F] text-[#ED1B2F] font-semibold'
                    : 'border-transparent text-[#A1A1A1] font-medium'
                }`}
              >
                {t(tab.labelKey)}
              </Link>
            ))}
          </div>
        </div>

        <div className="w-full px-4 xl:container xl:px-[90px] py-3 md:py-3 flex flex-col gap-[20px]">
          <p className="font-inter text-[14px] md:text-[16px] text-[#333]">
            {tbaner.rich('notice', {
              link: (chunks) => (
                <button
                  onClick={() => showDevicesEsim()}
                  className="text-blue-600 hover:underline focus:outline-none"
                >
                  {chunks}
                </button>
              ),
            })}
          </p>
          <div className="flex items-center gap-[8px] mb-[20px]">
            <p
              onClick={() => router.push(`/${locale}/agency-esim?type=${activeTab}&src=${viewSrc}`)}
              className="text-[#333] hover:text-[#ED1B2F] cursor-pointer"
            >
              <ChevronLeftIcon />
            </p>
            <h2 className="font-inter font-semibold text-[24px] md:text-[28px] text-[#333]">
              {isLoading ? tCommon('loading') : (regionDetails?.name || countrySlug)}
            </h2>
          </div>

          {isLoading && (
            <div className="text-center py-[40px] text-[18px] text-[#666]">
              {tCommon('loading')}
            </div>
          )}
          {error && (
            <div className="text-center py-[40px] text-[18px] text-red-600 bg-red-100 p-4 rounded-md">
              <p>{tCommon('errorOccurred')}: {error}</p>
            </div>
          )}

          {!isLoading && !error && regionDetails && (
            <BssPackageSelector
              country={regionDetails}
              packages={packages}
              locale={locale}
              brand={BRAND}
              onBuyNow={onBuyNowClick}
            />
          )}
        </div>
      </main>
      {viewSrc === 'vj' ? null : <Footer />}
    </div>
  );
}
