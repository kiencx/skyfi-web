"use client";

import axios from 'axios';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Footer from '../../../components/Footer';
import Header from '../../../components/Header';
import HeaderCart from '@/app/components/HeaderCart';
import { BSS_LAST_BRAND_KEY, BSS_LAST_ORDER_KEY, BSS_LAST_SRC_KEY, normalizeBrand } from '@/app/utils/bssCatalog';
import { bssLocaleHeaders } from '@/app/utils/bssLocale';
import useMyEsim from '@/app/hooks/useMyEsim';

const SELECTED_PACKAGE_KEY = 'bssCheckoutItem';

const formatPrice = (value, currency = 'VND', locale = 'vi') => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  maximumFractionDigits: currency === 'VND' ? 0 : 2,
}).format(Number(value || 0));

export default function BssCheckoutPage() {
  const locale = useLocale();
  const t = useTranslations('travelEsimFlow.checkout');
  const tTerms = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const { showDevicesEsim } = useMyEsim();
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageId = searchParams.get('packageId');
  const brand = normalizeBrand(searchParams.get('brand'));
  const viewSrc = searchParams.get('src') || 'skyfi';
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [price, setPrice] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const idempotencyKeyRef = useRef(null);
  const [form, setForm] = useState({ customer_name: '', email: '', agree_terms: false });

  useEffect(() => {
    const storedValue = window.sessionStorage.getItem(SELECTED_PACKAGE_KEY);
    if (!storedValue) {
      setError(t('errNoPackage'));
      setIsLoadingPrice(false);
      return;
    }

    try {
      const item = JSON.parse(storedValue);
      if (!item?.package_id || String(item.package_id) !== String(packageId)) {
        throw new Error('Selected package mismatch');
      }
      setSelectedPackage(item);

      axios.get(`/api/bss/packages/${item.package_id}/price?quantity=${item.quantity}&brand=${brand}`, {
        headers: bssLocaleHeaders(locale),
      })
        .then((response) => {
          if (!response.data?.success) throw new Error(response.data?.message || t('errPrice'));
          setPrice(response.data.data);
        })
        .catch((requestError) => setError(requestError.response?.data?.message || requestError.message || t('errPrice')))
        .finally(() => setIsLoadingPrice(false));
    } catch {
      setError(t('errInvalidPackage'));
      setIsLoadingPrice(false);
    }
  }, [packageId, brand, locale, t]);

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  // Hai link trong dòng đồng ý giống trang thanh toán skyfi.vn: không đổi trạng thái checkbox khi bấm.
  const openDevicesEsim = (event) => {
    event.preventDefault();
    event.stopPropagation();
    showDevicesEsim();
  };

  const openTerms = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowTermsPopup(true);
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!selectedPackage || !price || isSubmitting) return;
    if (!form.agree_terms) {
      setError(t('errAgree'));
      return;
    }

    const orderInput = {
      brand,
      customer_name: form.customer_name,
      email: form.email,
      items: [{ package_id: selectedPackage.package_id, quantity: selectedPackage.quantity }],
    };
    const payloadFingerprint = JSON.stringify(orderInput);
    if (!idempotencyKeyRef.current || idempotencyKeyRef.current.payloadFingerprint !== payloadFingerprint) {
      idempotencyKeyRef.current = { key: crypto.randomUUID(), payloadFingerprint };
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/bss/orders', orderInput, {
        headers: { ...bssLocaleHeaders(locale), 'Idempotency-Key': idempotencyKeyRef.current.key },
      });
      const order = response.data?.data;
      if (!response.data?.success || !order?.order_number) {
        throw new Error(response.data?.message || t('errCreate'));
      }

      window.sessionStorage.setItem(BSS_LAST_ORDER_KEY, order.order_number);
      window.sessionStorage.setItem(BSS_LAST_BRAND_KEY, brand);
      window.sessionStorage.setItem(BSS_LAST_SRC_KEY, viewSrc);
      setOrderNumber(order.order_number);
      if (order.payment_url) {
        window.location.assign(order.payment_url);
        return;
      }
      setError(t('errNoPaymentUrl'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || t('errCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const amount = price?.total_price ?? price?.unit_price;
  const currency = price?.currency || selectedPackage?.currency || 'VND';

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f7]">
      {viewSrc === 'vj' ? <HeaderCart /> : <Header />}
      <main className="container flex-1 py-10 md:py-16">
        <button type="button" onClick={() => router.back()} className="mb-6 text-sm font-medium text-[#333] hover:text-[#ed1b2f]">{t('back')}</button>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form onSubmit={submitOrder} className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
            <h1 className="text-2xl font-bold text-[#333]">{t('title')}</h1>
            <p className="mt-2 text-sm text-[#666]">{t('subtitle')}</p>
            <div className="mt-7 grid gap-5">
              <label className="grid gap-2 text-sm font-medium text-[#333]">{t('fullName')}
                <input required name="customer_name" value={form.customer_name} onChange={updateField} className="rounded-lg border border-[#ddd] px-4 py-3 outline-none focus:border-[#ed1b2f]" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#333]">{t('email')}
                <input required type="email" name="email" value={form.email} onChange={updateField} className="rounded-lg border border-[#ddd] px-4 py-3 outline-none focus:border-[#ed1b2f]" />
              </label>
              <label className="flex items-start gap-3 text-sm text-[#555]">
                <input required type="checkbox" name="agree_terms" checked={form.agree_terms} onChange={updateField} className="mt-1" />
                <span>
                  {tTerms('devicePrefix')}{' '}
                  <span role="button" tabIndex={0} onClick={openDevicesEsim} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openDevicesEsim(e)} className="cursor-pointer text-[#E69818] underline transition-colors hover:text-[#D18500]">
                    {tTerms('deviceCompatibility')}
                  </span>
                  . {tTerms('agreeWith')}{' '}
                  <span role="button" tabIndex={0} onClick={openTerms} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openTerms(e)} className="cursor-pointer text-[#E69818] underline transition-colors hover:text-[#D18500]">
                    {tTerms('termsAndConditions')}
                  </span>
                  .
                </span>
              </label>
            </div>
            {error && <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}{orderNumber && <> {t('orderCode')} <strong>{orderNumber}</strong>.</>}</p>}
            <button type="submit" disabled={isLoadingPrice || !price || isSubmitting} className="mt-7 w-full rounded-lg bg-[#faa61a] px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? t('creating') : t('submit')}
            </button>
          </form>
          <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#333]">{t('orderSummary')}</h2>
            {selectedPackage && <div className="mt-5 border-b border-[#eee] pb-5">
              <p className="font-semibold text-[#333]">{selectedPackage.name}</p>
              <p className="mt-2 text-sm text-[#666]">{t('packageCount', { quantity: Number(selectedPackage.quantity) || 1, days: Number(selectedPackage.validity_days) || 0 })}</p>
            </div>}
            <div className="mt-5 flex items-center justify-between text-[#333]"><span>{t('total')}</span><strong className="text-xl text-[#faa61a]">{isLoadingPrice ? t('checkingPrice') : formatPrice(amount, currency, locale)}</strong></div>
            <p className="mt-3 text-xs leading-5 text-[#777]">{t('priceNote')}</p>
          </aside>
        </div>
      </main>
      {viewSrc === 'vj' ? null : <Footer />}

      {showTermsPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex h-[90vh] w-[90vw] flex-col overflow-hidden rounded-[12px] bg-white">
            <div className="flex-1 overflow-hidden">
              <iframe src={`/${locale}/terms-and-conditions?src=app`} className="h-full w-full border-0" title={tTerms('termsAndConditions')} />
            </div>
            <div className="border-t p-6">
              <button type="button" onClick={() => setShowTermsPopup(false)} className="w-full rounded-[8px] bg-[#E69818] py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#D18500]">
                {tCommon('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
