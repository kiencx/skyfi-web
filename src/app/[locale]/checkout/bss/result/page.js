"use client";

import axios from 'axios';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Footer from '../../../../components/Footer';
import Header from '../../../../components/Header';
import HeaderCart from '@/app/components/HeaderCart';
import { BSS_LAST_SRC_KEY } from '@/app/utils/bssCatalog';
import { bssLocaleHeaders } from '@/app/utils/bssLocale';

export default function BssOrderResultPage() {
  const locale = useLocale();
  const t = useTranslations('travelEsimFlow.result');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const orderNumber = searchParams.get('orderNumber') || searchParams.get('order_number');
  const [viewSrc, setViewSrc] = useState(searchParams.get('src') || 'skyfi');

  useEffect(() => {
    if (!searchParams.get('src')) {
      setViewSrc(window.sessionStorage.getItem(BSS_LAST_SRC_KEY) || 'skyfi');
    }
  }, [searchParams]);

  const loadOrder = useCallback(async () => {
    const orderCode = orderNumber || window.sessionStorage.getItem('bssLastOrderNumber');
    if (!orderCode) {
      setError(t('errNoOrder'));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/bss/orders/${encodeURIComponent(orderCode)}`, {
        headers: bssLocaleHeaders(locale),
      });
      if (!response.data?.success) throw new Error(response.data?.message || t('errCheck'));
      const foundOrder = response.data.data?.order || null;
      setOrder(foundOrder);
      // BSS answers an unknown order with success + null data and a (translated) message.
      if (!foundOrder) setError(response.data.message || t('errNoOrder'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || t('errCheck'));
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber, locale, t]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const isPaid = ['PAID', 'COMPLETED'].includes(order?.status);
  // Unknown codes (new BSS statuses) are shown as-is rather than hidden.
  const statusLabel = (group, code) => (code && t.has(`${group}.${code}`) ? t(`${group}.${code}`) : code);
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f7]">
      {viewSrc === 'vj' ? <HeaderCart /> : <Header />}
      <main className="container flex-1 py-12 md:py-20">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-[#333]">{isPaid ? t('paidTitle') : t('statusTitle')}</h1>
          {isLoading && <p className="mt-5 text-[#666]">{t('checking')}</p>}
          {error && <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {order && <div className="mt-6 space-y-2 text-left text-sm text-[#555]">
            <p><strong>{t('orderCode')}</strong> {order.order_number}</p>
            <p><strong>{t('status')}</strong> {statusLabel('statuses', order.status)}</p>
            <p><strong>{t('payment')}</strong> {statusLabel('paymentStatuses', order.payment_status)}</p>
            <p><strong>{t('total')}</strong> {new Intl.NumberFormat(locale, { style: 'currency', currency: order.currency || 'VND', maximumFractionDigits: order.currency === 'VND' ? 0 : 2 }).format(Number(order.total_amount || 0))}</p>
          </div>}
          <div className="mt-7 flex justify-center gap-3">
            <button type="button" onClick={loadOrder} className="rounded-lg border border-[#ed1b2f] px-4 py-2 font-medium text-[#ed1b2f]">{t('recheck')}</button>
            <button type="button" onClick={() => router.push(`/${locale}/travel-esim?src=${viewSrc}`)} className="rounded-lg bg-[#ed1b2f] px-4 py-2 font-medium text-white">{t('buyAgain')}</button>
          </div>
        </div>
      </main>
      {viewSrc === 'vj' ? null : <Footer />}
    </div>
  );
}
