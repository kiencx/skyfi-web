'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Link, useRouter } from '../../../i18n/navigation';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Pagination from '../../components/news/Pagination';
import SelfCareService from '../../services/selfCareService';

const DAY_MS = 24 * 60 * 60 * 1000;
const MB_PER_GB = 1024;
const PAGE_SIZE = 10;

const STATUS_STYLES = {
  ACTIVE: 'bg-[#E7F6EB] text-[#1AA134]',
  NOT_ACTIVE: 'bg-[#E8F1FD] text-[#1D6FD8]',
  EXPIRED: 'bg-[#EDEDED] text-[#666]',
  UNAVAILABLE: 'bg-[#FFF4DB] text-[#B7791F]',
};

const PAYMENT_STATUSES = {
  COMPLETED: { key: 'paymentCompleted', style: 'bg-[#E7F6EB] text-[#1AA134]' },
  PENDING: { key: 'paymentPending', style: 'bg-[#FFF4DB] text-[#B7791F]' },
  FAILED: { key: 'paymentFailed', style: 'bg-[#FDECEC] text-[#EC242A]' },
  REFUNDED: { key: 'paymentRefunded', style: 'bg-[#EDEDED] text-[#666]' },
};

const toNumber = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

const toTime = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
};

const startOfDay = (time) => new Date(time).setHours(0, 0, 0, 0);

// Providers only report expiresAt once the eSIM is activated; until then validity counts from purchase.
const getExpiryTime = (item) => {
  const expiresAt = toTime(item?.usage?.expiresAt);
  if (expiresAt !== null) return expiresAt;
  const createdAt = toTime(item?.createdAt);
  const validityDays = toNumber(item?.validityDays);
  return createdAt !== null && validityDays !== null ? createdAt + validityDays * DAY_MS : null;
};

const formatAmount = (value) => (value === null ? '' : String(Math.round(value * 100) / 100));

const getUsageBarColor = (percent) => {
  if (percent === null) return 'bg-[#EDEDED]';
  if (percent > 50) return 'bg-[#1AA134]';
  if (percent > 20) return 'bg-[#FAA61A]';
  return 'bg-[#EC242A]';
};

// Regions without an ISO code (null iso_code) only have the BSS-hosted flag image.
const getFlagUrl = (item) => {
  const isoCode = String(item?.iso_code || '').trim().toLowerCase();
  return isoCode ? `https://flagcdn.com/w160/${isoCode}.png` : item?.flag || null;
};

// The BSS guide (v4) nests status/expiresAt under usage and uses packageNameSnapshot;
// the Postman V5 spec puts them on the item and uses packageName. Accept both.
const normalizeEsim = (item) => ({
  ...item,
  packageNameSnapshot: item?.packageNameSnapshot ?? item?.packageName,
  usage: {
    ...item?.usage,
    status: item?.usage?.status ?? item?.status,
    expiresAt: item?.usage?.expiresAt ?? item?.expiresAt,
  },
});

function buildEsimView(item) {
  const usage = item?.usage || {};
  const isUsageAvailable = usage.state === 'AVAILABLE';
  let used = toNumber(usage.used);
  let remaining = toNumber(usage.remaining);
  let total = toNumber(usage.total);
  if (total === null && used !== null && remaining !== null) total = used + remaining;
  if (used === null && total !== null && remaining !== null) used = Math.max(0, total - remaining);

  // Airalo reports usage in MB and leaves unit null.
  let unit = usage.unit || (total === null && remaining === null ? item?.dataUnit : 'MB') || '';
  if (total === null && remaining === null) total = toNumber(item?.dataAmount);
  if (unit.toUpperCase() === 'MB' && Math.max(total ?? 0, remaining ?? 0) >= MB_PER_GB) {
    const toGb = (value) => (value === null ? null : value / MB_PER_GB);
    [used, remaining, total] = [toGb(used), toGb(remaining), toGb(total)];
    unit = 'GB';
  }

  const percent = isUsageAvailable && remaining !== null && total > 0
    ? Math.max(0, Math.min(100, Math.round((remaining / total) * 100)))
    : null;

  const expiryTime = getExpiryTime(item);
  const daysRemaining = expiryTime === null
    ? null
    : Math.max(0, Math.round((startOfDay(expiryTime) - startOfDay(Date.now())) / DAY_MS));

  let status = 'ACTIVE';
  if (!isUsageAvailable) status = 'UNAVAILABLE';
  else if (String(usage.status).toUpperCase() === 'EXPIRED') status = 'EXPIRED';
  else if (String(usage.status).toUpperCase() === 'NOT_ACTIVE') status = 'NOT_ACTIVE';

  return { isUsageAvailable, unit, used, remaining, total, percent, expiryTime, daysRemaining, status };
}

const META_ICONS = {
  globe: { src: '/assets/my-esim-access/icon-globe.svg', w: 24, h: 24 },
  pie: { src: '/assets/my-esim-access/icon-data-pie.svg', w: 22, h: 22 },
  calendar: { src: '/assets/my-esim-access/icon-calendar.svg', w: 25, h: 25 },
  datetime: { src: '/assets/my-esim-access/icon-datetime.svg', w: 24, h: 24 },
};

const MetaIcon = ({ name }) => {
  const icon = META_ICONS[name];
  return (
    <img
      src={icon.src}
      alt=""
      width={icon.w}
      height={icon.h}
      className="shrink-0 object-contain"
      style={{ width: icon.w, height: icon.h }}
      aria-hidden="true"
    />
  );
};

const IconCopy = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M17.4167 1.83301C17.9029 1.83301 18.3692 2.02616 18.713 2.36998C19.0568 2.7138 19.25 3.18011 19.25 3.66634V14.6663C19.25 15.1526 19.0568 15.6189 18.713 15.9627C18.3692 16.3065 17.9029 16.4997 17.4167 16.4997H15.5833V18.333C15.5833 18.8192 15.3902 19.2856 15.0464 19.6294C14.7025 19.9732 14.2362 20.1663 13.75 20.1663H4.58333C4.0971 20.1663 3.63079 19.9732 3.28697 19.6294C2.94315 19.2856 2.75 18.8192 2.75 18.333V7.33301C2.75 6.84678 2.94315 6.38046 3.28697 6.03665C3.63079 5.69283 4.0971 5.49967 4.58333 5.49967H6.41667V3.66634C6.41667 3.18011 6.60982 2.7138 6.95364 2.36998C7.29745 2.02616 7.76377 1.83301 8.25 1.83301H17.4167ZM13.75 7.33301H4.58333V18.333H13.75V7.33301ZM9.16667 13.7497C9.40978 13.7497 9.64294 13.8463 9.81485 14.0182C9.98676 14.1901 10.0833 14.4232 10.0833 14.6663C10.0833 14.9095 9.98676 15.1426 9.81485 15.3145C9.64294 15.4864 9.40978 15.583 9.16667 15.583H7.33333C7.09022 15.583 6.85706 15.4864 6.68515 15.3145C6.51324 15.1426 6.41667 14.9095 6.41667 14.6663C6.41667 14.4232 6.51324 14.1901 6.68515 14.0182C6.85706 13.8463 7.09022 13.7497 7.33333 13.7497H9.16667ZM17.4167 3.66634H8.25V5.49967H13.75C14.2362 5.49967 14.7025 5.69283 15.0464 6.03665C15.3902 6.38046 15.5833 6.84678 15.5833 7.33301V14.6663H17.4167V3.66634ZM11 10.083C11.2336 10.0833 11.4584 10.1727 11.6283 10.3331C11.7981 10.4935 11.9004 10.7127 11.9141 10.946C11.9278 11.1792 11.8519 11.4089 11.7019 11.588C11.552 11.7672 11.3393 11.8823 11.1073 11.9099L11 11.9163H7.33333C7.09969 11.9161 6.87497 11.8266 6.70508 11.6662C6.53519 11.5058 6.43295 11.2866 6.41926 11.0534C6.40557 10.8202 6.48145 10.5905 6.63141 10.4113C6.78137 10.2322 6.99408 10.117 7.22608 10.0894L7.33333 10.083H11Z"
      fill="#333333"
    />
  </svg>
);

const IconEye = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
      stroke="#EC242A"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="#EC242A" strokeWidth="1.6" />
  </svg>
);

const IconClose = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconCalendarRemain = () => (
  <svg width="39" height="39" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="39" height="39" rx="19.5" fill="#FFF6F3" />
    <path
      d="M9.97656 14.7385H29.0242M12.3575 9.97656H26.6432C27.2747 9.97656 27.8803 10.2274 28.3268 10.6739C28.7733 11.1204 29.0242 11.726 29.0242 12.3575V26.6432C29.0242 27.2747 28.7733 27.8803 28.3268 28.3268C27.8803 28.7733 27.2747 29.0242 26.6432 29.0242H12.3575C11.726 29.0242 11.1204 28.7733 10.6739 28.3268C10.2274 27.8803 9.97656 27.2747 9.97656 26.6432V12.3575C9.97656 11.726 10.2274 11.1204 10.6739 10.6739C11.1204 10.2274 11.726 9.97656 12.3575 9.97656Z"
      stroke="#EC242A"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.5 20.6905C20.1575 20.6905 20.6905 20.1575 20.6905 19.5C20.6905 18.8426 20.1575 18.3096 19.5 18.3096C18.8426 18.3096 18.3096 18.8426 18.3096 19.5C18.3096 20.1575 18.8426 20.6905 19.5 20.6905Z"
      fill="#EC242A"
    />
    <path
      d="M14.7383 20.6905C15.3958 20.6905 15.9288 20.1575 15.9288 19.5C15.9288 18.8426 15.3958 18.3096 14.7383 18.3096C14.0808 18.3096 13.5479 18.8426 13.5479 19.5C13.5479 20.1575 14.0808 20.6905 14.7383 20.6905Z"
      fill="#EC242A"
    />
    <path
      d="M14.7383 25.4522C15.3958 25.4522 15.9288 24.9192 15.9288 24.2618C15.9288 23.6043 15.3958 23.0713 14.7383 23.0713C14.0808 23.0713 13.5479 23.6043 13.5479 24.2618C13.5479 24.9192 14.0808 25.4522 14.7383 25.4522Z"
      fill="#EC242A"
    />
  </svg>
);

function EsimFlag({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <img src="/assets/my-esim-access/icon-globe.svg" alt="" className="size-10 sm:size-12" />;
  }
  return <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}

function MetaItem({ icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="font-inter text-sm leading-[19px] text-[#333] sm:text-base">{label}</p>
        <p className="mt-1 font-inter text-sm font-bold leading-[19px] text-[#333] sm:text-base">{value}</p>
      </div>
    </div>
  );
}

function PlanRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-base text-[#333]">
      <span className="font-inter font-normal">{label}</span>
      <span className="font-inter font-bold text-right">{value}</span>
    </div>
  );
}

export default function ManageSimPage() {
  const t = useTranslations('manageSim');
  const locale = useLocale();
  const router = useRouter();
  const [access, setAccess] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const signOut = useCallback((message) => {
    SelfCareService.clearSelfCareAccess();
    if (message) toast.error(message);
    router.replace('/login-sim');
  }, [router]);

  const loadEsims = useCallback(async (currentAccess) => {
    try {
      const data = await SelfCareService.lookupCurrentEsims(currentAccess);
      setItems(Array.isArray(data?.items) ? data.items.map(normalizeEsim) : []);
      setLoadState('ready');
    } catch (error) {
      if (error?.status === 401) {
        signOut(t('sessionExpired'));
        return;
      }
      if (error?.status === 404 && currentAccess?.mode === 'iccid') {
        signOut(t('notFound'));
        return;
      }
      setLoadState('error');
    }
  }, [signOut, t]);

  useEffect(() => {
    const storedAccess = SelfCareService.getSelfCareAccess();
    if (!storedAccess) {
      router.replace('/login-sim');
      return;
    }
    setAccess(storedAccess);
    loadEsims(storedAccess);
  }, [loadEsims, router]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEsims(access);
    setIsRefreshing(false);
  };

  const handleRetry = () => {
    setLoadState('loading');
    loadEsims(access);
  };

  const handleLogout = async () => {
    await SelfCareService.logoutSelfCare();
    router.replace('/login-sim');
  };

  const handleCopyIccid = async () => {
    try {
      await navigator.clipboard.writeText(access.iccid);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked by browser permissions; the masked ICCID is still visible.
    }
  };

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString(locale) : '—');

  const formatDateTime = (value) => (value
    ? new Date(value).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
    : '—');

  const formatMoney = (value, currency) => {
    const amount = toNumber(value);
    if (amount === null) return '—';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'VND' }).format(amount);
    } catch {
      return `${amount} ${currency || ''}`.trim();
    }
  };

  const esim = items[Math.min(selectedIndex, items.length - 1)];
  const view = esim ? buildEsimView(esim) : null;
  const statusLabel = view && {
    ACTIVE: t('statusActive'),
    NOT_ACTIVE: t('statusNotActive'),
    EXPIRED: t('statusExpired'),
    UNAVAILABLE: t('statusUnavailable'),
  }[view.status];
  const expiryLabel = view?.expiryTime != null ? formatDate(view.expiryTime) : t('noExpiry');

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openTxModal = (item) => {
    setSelectedTx(item);
    setIsTxModalOpen(true);
  };

  const closeTxModal = () => setIsTxModalOpen(false);

  const renderPaymentStatus = (paymentStatus) => {
    const config = PAYMENT_STATUSES[String(paymentStatus).toUpperCase()];
    return (
      <span className={`inline-flex rounded-[37px] px-2.5 py-0.5 text-sm font-semibold ${config?.style || 'bg-[#EDEDED] text-[#666]'}`}>
        {config ? t(config.key) : (paymentStatus || '—')}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F1F1F2]">
      <Header />

      <nav className="w-full bg-white px-4 py-4">
        <div className="container flex items-center gap-2 text-sm">
          <Link href="/" className="font-inter text-[#666] transition-colors hover:text-[#ED1B2F]">
            {t('breadcrumbHome')}
          </Link>
          <span className="text-[#999]" aria-hidden="true">›</span>
          <Link href="/login-sim" className="font-inter text-[#666] transition-colors hover:text-[#ED1B2F]">
            {t('breadcrumbLogin')}
          </Link>
          <span className="text-[#999]" aria-hidden="true">›</span>
          <span className="font-inter font-semibold text-[#333]">{t('breadcrumbCurrent')}</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-8 lg:py-14">
        <div className="container flex flex-col gap-[22px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-inter text-2xl font-bold text-[#333] sm:text-[26px]">
                {access?.mode === 'email' ? t('greeting', { name: access.maskedEmail }) : t('greetingGuest')}
              </h1>
              <p className="mt-2 font-inter text-base font-medium text-[#333]">{t('subtitle')}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loadState !== 'ready' || isRefreshing}
                className="rounded-lg border border-[#FAA61A] bg-white px-5 py-2.5 font-inter text-sm font-semibold text-[#FAA61A] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRefreshing ? t('refreshing') : t('refresh')}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-[#333] px-5 py-2.5 font-inter text-sm font-semibold text-white transition-opacity hover:opacity-80"
              >
                {t('logout')}
              </button>
            </div>
          </div>

          {loadState === 'loading' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_387px]" aria-busy="true">
              <div className="h-[260px] animate-pulse rounded-[22px] bg-white" />
              <div className="h-[260px] animate-pulse rounded-[22px] bg-white" />
            </div>
          )}

          {loadState === 'error' && (
            <div className="flex flex-col items-center gap-4 rounded-[22px] bg-white px-6 py-12 text-center">
              <p className="font-inter text-base text-[#333]">{t('loadError')}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-lg bg-[#FAA61A] px-6 py-3 font-inter text-base font-semibold text-white hover:opacity-90"
              >
                {t('retry')}
              </button>
            </div>
          )}

          {loadState === 'ready' && !esim && (
            <div className="rounded-[22px] bg-white px-6 py-12 text-center font-inter text-base text-[#333]">
              {t('empty')}
            </div>
          )}

          {loadState === 'ready' && esim && (
            <>
              {items.length > 1 && (
                <div className="flex flex-col gap-2.5">
                  <p className="font-inter text-base font-bold text-[#333]">
                    {t('selectEsim', { count: items.length })}
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {items.map((item, index) => (
                      <button
                        key={item.id ?? index}
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        className={`shrink-0 rounded-xl border bg-white px-4 py-3 text-left transition-colors ${
                          index === selectedIndex ? 'border-[#FAA61A]' : 'border-transparent hover:border-[#EAEAEA]'
                        }`}
                      >
                        <p className="font-inter text-sm font-bold text-[#333]">{item.packageNameSnapshot}</p>
                        <p className="mt-0.5 font-inter text-xs text-[#989898]">{item.iccidMasked}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_387px] xl:items-stretch xl:gap-6">
                {/* Left column */}
                <div className="flex min-w-0 flex-col gap-6">
                  {/* SIM overview card */}
                  <section className="rounded-[22px] bg-white px-5 py-5 sm:px-[26px] sm:py-[22px]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex h-[72px] w-[94px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FFF6F3] sm:h-[97px] sm:w-[127px]">
                        <EsimFlag key={getFlagUrl(esim) || 'globe'} src={getFlagUrl(esim)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`inline-flex rounded-[37px] px-2.5 py-0.5 font-inter text-sm font-semibold ${STATUS_STYLES[view.status]}`}>
                          {statusLabel}
                        </span>
                        <h2 className="mt-1 font-inter text-[28px] font-bold leading-tight text-[#333] sm:text-4xl">
                          {esim.packageNameSnapshot}
                        </h2>
                        <p className="mt-1 font-inter text-sm text-[#989898]">{t('iccidLabel')}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <p className="font-inter text-base font-semibold text-[#333]">{esim.iccidMasked}</p>
                          {access?.mode === 'iccid' && (
                            <button
                              type="button"
                              onClick={handleCopyIccid}
                              className="shrink-0 rounded p-0.5 transition-opacity hover:opacity-70"
                              aria-label={t('copyIccid')}
                              title={copied ? t('copied') : t('copyIccid')}
                            >
                              <IconCopy />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="my-6 h-px w-full bg-[#EAEAEA]" />

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-3">
                      <MetaItem icon={<MetaIcon name="globe" />} label={t('country')} value={esim.countryName || '—'} />
                      <MetaItem
                        icon={<MetaIcon name="pie" />}
                        label={t('currentPlan')}
                        value={`${formatAmount(toNumber(esim.dataAmount))}${esim.dataUnit || ''} / ${t('planValidityValue', { days: esim.validityDays ?? '—' })}`}
                      />
                      <MetaItem icon={<MetaIcon name="calendar" />} label={t('purchasedAt')} value={formatDate(esim.orderDate || esim.createdAt)} />
                      <MetaItem
                        icon={<MetaIcon name="datetime" />}
                        label={t('expiresAt')}
                        value={expiryLabel}
                      />
                    </div>
                  </section>

                  {/* Usage card */}
                  <section className="flex flex-1 flex-col">
                    <h2 className="mb-5 font-inter text-2xl font-bold text-[#333] sm:text-[26px]">
                      {t('usageTitle')}
                    </h2>
                    <div className="flex flex-1 flex-col rounded-[22px] bg-white px-5 py-[18px] sm:px-8">
                      {view.isUsageAvailable ? (
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-4">
                          {/* Data */}
                          <div className="min-w-0 flex-1">
                            <p className="font-inter text-base font-bold text-[#333]">{t('dataLabel')}</p>
                            <div className="mt-4 flex items-end gap-2">
                              <span className="font-inter text-[40px] font-bold leading-none text-[#EC242A]">
                                {view.remaining !== null ? `${formatAmount(view.remaining)}${view.unit}` : '—'}
                              </span>
                              {view.total !== null && (
                                <span className="pb-1 font-inter text-2xl font-bold text-[#333]">
                                  /{formatAmount(view.total)}{view.unit}
                                </span>
                              )}
                            </div>
                            <div className="mt-4 flex items-center gap-4">
                              <div className="h-3.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EDEDED]">
                                <div
                                  className={`h-full rounded-full ${getUsageBarColor(view.percent)}`}
                                  style={{ width: `${view.percent ?? 0}%` }}
                                />
                              </div>
                              <span className="shrink-0 font-inter text-base font-bold text-[#333]">
                                {view.percent !== null ? `${view.percent}%` : '—'}
                              </span>
                            </div>
                            {view.used !== null && (
                              <p className="mt-3 font-inter text-sm text-[#666]">
                                {t('dataUsed', { value: `${formatAmount(view.used)}${view.unit}` })}
                              </p>
                            )}
                          </div>

                          <div className="hidden h-[120px] w-px shrink-0 bg-[#EAEAEA] lg:block" />

                          {/* Days remaining */}
                          <div className="flex min-w-0 flex-col gap-2.5 lg:w-[280px] lg:shrink-0">
                            <p className="w-full whitespace-nowrap font-inter text-base font-bold text-[#333]">
                              {t('timeLabel')}
                            </p>
                            <div className="flex items-end justify-between gap-2">
                              <div className="flex items-end gap-1">
                                <span className="font-inter text-[40px] font-bold leading-none text-[#EC242A]">
                                  {view.daysRemaining ?? '—'}
                                </span>
                                {view.daysRemaining !== null && (
                                  <span className="font-inter text-2xl font-semibold leading-none text-[#333]">
                                    {t('days')}
                                  </span>
                                )}
                              </div>
                              <div className="mb-0.5 shrink-0">
                                <IconCalendarRemain />
                              </div>
                            </div>
                            <p className="w-full font-inter text-sm text-[#666]">
                              {view.expiryTime != null ? t('expiresOn', { date: expiryLabel }) : expiryLabel}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="py-6 font-inter text-base text-[#B7791F]">{t('usageUnavailable')}</p>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right sidebar — stretch to left column height */}
                <aside className="flex h-full min-h-0 w-full flex-col gap-3.5 xl:justify-between">
                  <div className="flex min-h-[254px] flex-1 flex-col justify-between gap-8 rounded-[22px] bg-white px-[30px] py-10">
                    <div>
                      <h3 className="font-inter text-[26px] font-bold text-[#333]">{t('buyMoreTitle')}</h3>
                      <p className="mt-2.5 max-w-[275px] font-inter text-base leading-[19px] text-[#333]">
                        {t('buyMoreDesc')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg bg-[#FAA61A] px-6 py-4 font-inter text-base font-semibold text-white opacity-50"
                    >
                      <img src="/assets/my-esim-access/icon-cart.svg" alt="" className="size-6" />
                      {t('buyMoreCta')}
                    </button>
                  </div>

                  <div className="flex flex-col gap-[22px] rounded-[22px] bg-white p-4">
                    <h3 className="font-inter text-xl font-bold text-[#333]">{t('planInfoTitle')}</h3>
                    <PlanRow label={t('planCurrent')} value={esim.packageNameSnapshot || '—'} />
                    <PlanRow label={t('planTotal')} value={`${formatAmount(toNumber(esim.dataAmount))}${esim.dataUnit || ''}`} />
                    <PlanRow label={t('planValidity')} value={t('planValidityValue', { days: esim.validityDays ?? '—' })} />
                    <PlanRow label={t('planProvider')} value={esim.providerCode || '—'} />
                    <PlanRow label={t('planPrice')} value={formatMoney(esim.lineTotal, esim.currency)} />
                  </div>
                </aside>
              </div>

              {/* Transaction history */}
              <section className="rounded-[22px] bg-white py-[26px]">
                <div className="mb-7 px-4 sm:px-[60px]">
                  <h2 className="font-inter text-xl font-bold text-[#333]">{t('historyTitle')}</h2>
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[1fr_1fr_1.2fr_0.8fr_0.9fr_0.7fr] gap-4 bg-[#EBEBEB] px-[60px] py-3 font-inter text-xl font-medium text-black">
                      <span>{t('colDate')}</span>
                      <span>{t('orderCode')}</span>
                      <span>{t('colPlan')}</span>
                      <span>{t('colAmount')}</span>
                      <span>{t('colStatus')}</span>
                      <span className="text-center">{t('colDetail')}</span>
                    </div>
                    {pageItems.map((item, index) => (
                      <div key={item.id ?? item.orderCode ?? index}>
                        <div className="grid grid-cols-[1fr_1fr_1.2fr_0.8fr_0.9fr_0.7fr] items-center gap-4 px-[60px] py-4 font-inter text-base font-medium text-[#333]">
                          <span>{formatDateTime(item.orderDate)}</span>
                          <span className="break-all">{item.orderCode || '—'}</span>
                          <span>{item.packageNameSnapshot || '—'}</span>
                          <span>{formatMoney(item.paymentAmount ?? item.lineTotal, item.currency)}</span>
                          <span>{renderPaymentStatus(item.paymentStatus)}</span>
                          <span className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => openTxModal(item)}
                              className="inline-flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-[#FFF6F3]"
                              aria-label={t('viewDetail')}
                              title={t('viewDetail')}
                            >
                              <IconEye />
                            </button>
                          </span>
                        </div>
                        {index < pageItems.length - 1 && (
                          <div className="mx-[60px] h-px bg-[#EAEAEA]" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="flex flex-col gap-4 px-4 md:hidden">
                  {pageItems.map((item, index) => (
                    <div key={item.id ?? item.orderCode ?? index} className="rounded-xl border border-[#EAEAEA] p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-inter text-sm text-[#989898]">{formatDateTime(item.orderDate)}</span>
                        {renderPaymentStatus(item.paymentStatus)}
                      </div>
                      <p className="font-inter text-base font-medium text-[#333]">{item.packageNameSnapshot || '—'}</p>
                      <p className="mt-1 font-inter text-sm text-[#666]">
                        {item.orderCode || '—'} · {formatMoney(item.paymentAmount ?? item.lineTotal, item.currency)}
                      </p>
                      <button
                        type="button"
                        onClick={() => openTxModal(item)}
                        className="mt-3 inline-flex items-center gap-2 font-inter text-sm font-semibold text-[#EC242A]"
                      >
                        <IconEye />
                        {t('viewDetail')}
                      </button>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 px-4 sm:px-[60px]">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Keep selectedTx until afterLeave to avoid a flicker while the modal closes */}
      <Transition appear show={isTxModalOpen} as={Fragment} afterLeave={() => setSelectedTx(null)}>
        <Dialog as="div" className="relative z-50" onClose={closeTxModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-[520px] rounded-[16px] bg-white p-6 text-left shadow-xl sm:p-8">
                  <button
                    type="button"
                    onClick={closeTxModal}
                    className="absolute right-4 top-4 rounded-lg p-1 transition-colors hover:bg-[#F5F5F5]"
                    aria-label={t('close')}
                  >
                    <IconClose />
                  </button>

                  <Dialog.Title className="pr-8 font-inter text-xl font-bold text-[#333] sm:text-2xl">
                    {t('txDetailTitle')}
                  </Dialog.Title>

                  {selectedTx && (
                    <div className="mt-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-inter text-sm text-[#666] sm:text-base">{t('colStatus')}</span>
                        {renderPaymentStatus(selectedTx.paymentStatus)}
                      </div>
                      <DetailRow label={t('colDate')} value={formatDateTime(selectedTx.orderDate)} />
                      <DetailRow label={t('orderCode')} value={selectedTx.orderCode || '—'} />
                      <DetailRow label={t('colPlan')} value={selectedTx.packageNameSnapshot || '—'} />
                      <DetailRow label={t('country')} value={selectedTx.countryName || '—'} />
                      <DetailRow
                        label={t('planTotal')}
                        value={`${formatAmount(toNumber(selectedTx.dataAmount))}${selectedTx.dataUnit || ''}`}
                      />
                      <DetailRow
                        label={t('planValidity')}
                        value={t('planValidityValue', { days: selectedTx.validityDays ?? '—' })}
                      />
                      <DetailRow
                        label={t('colAmount')}
                        value={formatMoney(selectedTx.paymentAmount ?? selectedTx.lineTotal, selectedTx.currency)}
                      />
                      <DetailRow label={t('paymentDate')} value={formatDateTime(selectedTx.paymentDate)} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={closeTxModal}
                    className="mt-8 w-full rounded-lg bg-[#FAA61A] px-6 py-3.5 font-inter text-base font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    {t('close')}
                  </button>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 font-inter text-sm text-[#666] sm:text-base">{label}</span>
      <span className="text-right font-inter text-sm font-semibold text-[#333] sm:text-base">{value}</span>
    </div>
  );
}
