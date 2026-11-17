"use client";

import axios from 'axios';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Footer from '../../../components/Footer';
import Header from '../../../components/Header';
import BssPackageSelector from '../../../components/BssPackageSelector';
import HeaderVJ from "@/app/components/HeaderVJ";
import HeaderCart from "@/app/components/HeaderCart";
import useMyEsim from "@/app/hooks/useMyEsim";
import useTravelEsimTabs from "@/app/hooks/useTravelEsimTabs";
import TravelEsimTabBar from "@/app/components/travel-esim/TravelEsimTabBar";
import { trackPageView, trackBeginCheckout } from "@/app/utils/trackingHelper";
import { bssLocaleHeaders } from '@/app/utils/bssLocale';

// Placeholder Icons
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const getCountryFlagUrl = (country) => {
  const isoCode = String(country.iso_code || country.code || '').trim().toLowerCase();
  return isoCode ? `https://flagcdn.com/w160/${isoCode}.png` : null;
};

const adaptPublicV2Package = (pkg, country) => ({
  ...pkg,
  // Keep the current card and tracking interfaces working while Public v2
  // names the purchasable identifier `package_id`.
  variant_id: pkg.package_id,
  product_id: pkg.package_id,
  provider: pkg.provider_name,
  type: pkg.package_type,
  countries_array: [{
    name: country.name,
    title: country.name,
    country_code: country.iso_code || country.code,
    image: getCountryFlagUrl(country),
  }],
});

const getRegionTypeForTab = (tab) => ({ national: 'COUNTRY', regional: 'REGION', global: 'GLOBAL' }[tab]);

const fetchAllBssPackagePages = async (packageQuery, { locale, fallbackError }) => {
  const headers = bssLocaleHeaders(locale);
  const firstResponse = await axios.get(`/api/bss/packages?${packageQuery.toString()}`, { headers });
  if (!firstResponse.data?.success || !Array.isArray(firstResponse.data.data?.items)) {
    throw new Error(firstResponse.data?.message || fallbackError);
  }

  const firstPage = firstResponse.data.data;
  const totalPages = Number(firstPage.total_pages || 1);
  const remainingPages = totalPages > 1
    ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => {
      const pageQuery = new URLSearchParams(packageQuery);
      pageQuery.set('page', String(index + 2));
      return axios.get(`/api/bss/packages?${pageQuery.toString()}`, { headers });
    }))
    : [];

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((response) => response.data?.success && Array.isArray(response.data.data?.items)
      ? response.data.data.items
      : []),
  ];
};

export default function CountryESimPlansPage() {
  const locale = useLocale();
  const t = useTranslations();
  const params = useParams();
  const countrySlug = params.countrySlug;
  const searchParams = useSearchParams();
  const typeParam = searchParams.get( 'type' ) || 'national';
  const viewSrc = searchParams.get( 'src' ) || 'skyfi';

  const regions = searchParams.get( 'regions' );

  const [countryDetails, setCountryDetails] = useState(null);
  const [, setAllCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [packages, setPackages] = useState([]);

  const [ activeTab, setActiveTab ] = useState( typeParam );
  const router = useRouter();

  const tPage = useTranslations('countryEsimPage');
  const tCommon = useTranslations( 'common' );
  const tbaner = useTranslations('travelESimPage');
  const tFlow = useTranslations('travelEsimFlow');

  const tabs = [
    { id: 'national', label: tFlow('tabs.national') },
    { id: 'regional', label: tFlow('tabs.regional') },
    { id: 'global', label: tFlow('tabs.global') },
  ];

  const tabBarRef = useRef(null);
  const { tabHref, onTabClick } = useTravelEsimTabs({
    src: viewSrc,
    activeTab,
    currentHref: `/esim/${countrySlug}?${searchParams.toString()}`,
    tabBarRef,
  });

  const isTabActive = (tabId) => {
    if (tabId === 'national') {
      return typeParam === 'national' || regions === 'COUNTRY';
    }
    return typeParam === tabId || regions === tabId.toUpperCase();
  };

    const { showDevicesEsim } = useMyEsim();

  useEffect(() => {
    trackPageView({ page_title: `eSIM ${countrySlug} - Chọn gói cước` });
  }, [countrySlug]);

  useEffect(() => {
    // Update activeTab when URL query parameter changes
    setActiveTab(typeParam);
  }, [typeParam]);

  useEffect(() => {
    const regionType = getRegionTypeForTab(activeTab);
    if (!countrySlug || !regionType) {
      return;
    }

    const fetchCountryAndPackages = async () => {
      setIsLoading(true);
      setError(null);
      setCountryDetails(null);
      setPackages([]);

      try {
        // 1. Fetch the selected country, region, or global destination through
        // the BFF so the Public v2 JWT remains server-only.
        const countriesResponse = await axios.get(`/api/bss/regions?type=${regionType}&channel=BSS`, {
          headers: bssLocaleHeaders(locale),
        });

        let foundCountry = null;
        if (countriesResponse.data?.success && Array.isArray(countriesResponse.data.data)) {
          // Store all countries for search filter
          setAllCountries(countriesResponse.data.data);

          foundCountry = countriesResponse.data.data.find((country) =>
            String(country.code || country.id).toLowerCase() === countrySlug.toLowerCase(),
          );
        } else {
          throw new Error(countriesResponse.data.message || tFlow('loadDestinationsFailed'));
        }
        console.log("Quốc gia tìm thấy:", foundCountry);

        if (!foundCountry) {
          // Use tPage for specific error messages
          throw new Error(tPage('countryNotFound', { slug: countrySlug }));
        }
        // Load every package once; the selector derives the valid
        // data/validity combinations from this list.
        const packageItems = await fetchAllBssPackagePages(new URLSearchParams({
          limit: '50',
          page: '1',
          package_type: 'NEW_ESIM',
          region_id: String(foundCountry.id),
        }), { locale, fallbackError: tFlow('loadPackagesFailed') });
        setPackages(packageItems.map((pkg) => adaptPublicV2Package(pkg, foundCountry)));
        setCountryDetails(foundCountry);

      } catch (err) {
        console.error("Lỗi khi tải dữ liệu eSIM quốc gia cho slug:", countrySlug, err);
        // Use tCommon for generic error messages
        setError(err.response?.data?.message || err.message || tFlow('loadPackagesFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountryAndPackages();
  }, [countrySlug, activeTab, locale, tPage, tFlow]);

  // The selector asks for one data plan type (FIXED / DAILY / UNLIMITED) at a time;
  // BSS filters it server-side via `data_plan_type`.
  const loadPackagesByPlanType = async (dataPlanType) => {
    const packageItems = await fetchAllBssPackagePages(new URLSearchParams({
      limit: '50',
      page: '1',
      package_type: 'NEW_ESIM',
      region_id: String(countryDetails.id),
      data_plan_type: dataPlanType,
    }), { locale, fallbackError: tFlow('loadPackagesFailed') });
    return packageItems.map((pkg) => adaptPublicV2Package(pkg, countryDetails));
  };

  const onBuyNowClick = (plan, quantity) => {
    trackBeginCheckout({
      cart_total: plan.selling_price * quantity,
      currency: plan.currency || 'USD',
      items: [{ product_id: plan.variant_id, product_name: plan.name, quantity, price: plan.selling_price }],
    });
    window.sessionStorage.setItem('bssCheckoutItem', JSON.stringify({
      package_id: plan.package_id,
      quantity,
      name: plan.name,
      validity_days: plan.validity_days,
      currency: plan.currency,
    }));
    router.push(`/${locale}/checkout/bss?packageId=${plan.package_id}&src=${viewSrc}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
      {viewSrc==="vj"?<HeaderCart/>:<Header />}

      {/* Main Content Section */}
      <main className="w-full flex flex-col items-center">
        {/* Country Title and Plan Grid */}
        <div className="w-full px-4 xl:container xl:px-[90px] pt-6 pb-3 md:pt-10 flex flex-col gap-[20px]">
          <TravelEsimTabBar
            ref={tabBarRef}
            ariaLabel={tFlow('tabs.ariaLabel')}
            tabs={tabs}
            isActive={isTabActive}
            renderLink={(tab, { className, children, ...rest }) => (
              <Link href={`/${locale}${tabHref(tab.id)}`} scroll={false} onClick={() => onTabClick(tab.id)} className={className} {...rest}>
                {children}
              </Link>
            )}
          />
          <p className="font-inter text-[14px] md:text-[16px] text-[#333] ">
            {tbaner.rich('notice', {
              link: (chunks) => (
                  <button
                      onClick={() => showDevicesEsim()}
                      className="text-blue-600 hover:underline focus:outline-none"
                  >
                    {chunks}
                  </button>
              )
            })}
          </p>
          <div className="flex items-center gap-[8px] mb-[20px]">
              {regions!=='GLOBAL'&&
                  <p onClick={()=>{router.push(`/${locale}/travel-esim?type=${typeParam}&src=${viewSrc}`)}} className="text-[#333] hover:text-[#ED1B2F] cursor-pointer">
                      <ChevronLeftIcon />
                  </p>}
            <h2 className="font-inter font-semibold text-[24px] md:text-[28px] text-[#333]">
              {/* Display country name from state, fallback if still loading */}
              {isLoading ? tCommon('loading') : (countryDetails?.name || countrySlug)}
            </h2>
          </div>

          {isLoading && (
            <div className="text-center py-[40px] text-[18px] text-[#666]">
                {tCommon('loading')}
            </div>
          )}
          {error && (
             <div className="text-center py-[40px] text-[18px] text-red-600 bg-red-100 p-4 rounded-md">
              <p>{tFlow('errorWithDetail', { error })}</p>
            </div>
          )}

          {!isLoading && !error && countryDetails && (
            <BssPackageSelector
              country={countryDetails}
              packages={packages}
              loadPackagesByPlanType={loadPackagesByPlanType}
              locale={locale}
              onBuyNow={onBuyNowClick}
            />
          )}
        </div>
      </main>
      {viewSrc==="vj"?null: <Footer />}

    </div>
  );
}
