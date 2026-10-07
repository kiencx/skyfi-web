"use client";

import { Button } from '@/app/components/ui/Button';
import useBssPackageSelection, { BSS_MAX_QUANTITY } from '@/app/hooks/useBssPackageSelection';
import { BSS_BRANDS, formatBssPrice } from '@/app/utils/bssCatalog';
import { useLocale, useTranslations } from 'next-intl';

const chipClass = (state) => {
  if (state === 'selected') return 'border-[#0000FF] bg-[#0000FF] text-white';
  if (state === 'disabled') return 'cursor-not-allowed border-[#EEEEEE] bg-[#F5F5F5] text-[#C4C4C4]';
  return 'border-[#E6E7EB] bg-white text-[#0C0C0E]';
};

/**
 * Mobile package picker for the Vikki WebView. Same data flow as the web
 * `BssPackageSelector`, restyled for the Vikki brand.
 */
export default function VikkiBssPackageSelector({ region, packages, onBuyNow }) {
  const t = useTranslations('vikki.travelEsim.bss.selector');
  const locale = useLocale();
  const selection = useBssPackageSelection({ packages, brand: BSS_BRANDS.VIKKI });
  const {
    dataChoices, validityChoices, availableDays, suggestedPackages,
    selectedDataKey, selectedDays, selectedPackage, selectedPackageId,
    quantity, price, priceError, isLoadingPrice,
  } = selection;

  const currency = price?.currency || selectedPackage?.currency || 'VND';
  const total = price?.total_price ?? (selectedPackage ? Number(selectedPackage.selling_price) * Number(quantity || 1) : 0);
  const quantityValid = Number.isInteger(quantity) && quantity >= 1;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-[13px] text-[#898C93]">{t('subtitle', { region: region.name })}</p>

        <h3 className="mt-4 text-[15px] font-semibold text-[#0C0C0E]">{t('data')}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {dataChoices.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => selection.selectData(option.key)}
              className={`min-w-[72px] rounded-lg border px-3 py-2 text-[13px] font-semibold ${chipClass(selectedDataKey === option.key ? 'selected' : 'idle')}`}
            >
              {option.amount === 0 ? t('unlimited') : `${option.amount}${option.unit ? ` ${option.unit}` : ''}`}
            </button>
          ))}
        </div>
        {!dataChoices.length && <p className="mt-2 text-[13px] text-[#898C93]">{t('noData')}</p>}

        <h3 className="mt-5 text-[15px] font-semibold text-[#0C0C0E]">{t('days')}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {validityChoices.map((days) => {
            const enabled = availableDays.has(days);
            const state = selectedDays === String(days) ? 'selected' : (enabled ? 'idle' : 'disabled');
            return (
              <button
                key={days}
                type="button"
                disabled={!enabled}
                onClick={() => selection.selectDays(days)}
                className={`min-w-[56px] rounded-lg border px-3 py-2 text-[13px] font-semibold ${chipClass(state)}`}
              >
                {t('daysUnit', { days })}
              </button>
            );
          })}
        </div>
        {!validityChoices.length && <p className="mt-2 text-[13px] text-[#898C93]">{t('noDays')}</p>}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-[15px] font-semibold text-[#0C0C0E]">{t('suggested')}</h3>
        {!selectedDataKey || !selectedDays ? (
          <p className="mt-2 text-[13px] text-[#898C93]">{t('pickDefault')}</p>
        ) : suggestedPackages.length ? (
          <div className="mt-3 flex flex-col gap-3">
            {suggestedPackages.map((pkg) => {
              const isSelected = String(pkg.package_id) === String(selectedPackageId);
              return (
                <button
                  key={pkg.package_id}
                  type="button"
                  onClick={() => selection.selectPackage(pkg.package_id)}
                  className={`rounded-xl border p-3 text-left ${isSelected ? 'border-[#0000FF] bg-[#F3F3FF] ring-1 ring-[#0000FF]' : 'border-[#E6E7EB] bg-white'}`}
                >
                  <p className="text-[14px] font-semibold text-[#0C0C0E] break-words">{pkg.name}</p>
                  <p className="mt-1 text-[12px] text-[#898C93]">
                    {pkg.provider_name || 'eSIM'} · {pkg.package_type === 'TOP_UP' ? t('typeTopup') : t('typeNew')}
                  </p>
                  <p className="mt-2 text-[15px] font-bold text-[#D2008C]">
                    {formatBssPrice(pkg.selling_price, pkg.currency, locale)}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-[#898C93]">{t('noPackage')}</p>
        )}
      </section>

      {selectedPackage && (
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#0C0C0E]">{t('quantity')}</span>
            <div className="flex items-center gap-3 rounded-lg bg-[#F5F5F5] px-2 py-1">
              <button
                type="button"
                onClick={() => selection.changeQuantity(-1)}
                disabled={Number(quantity) <= 1}
                aria-label={t('decrease')}
                className="h-8 w-8 rounded-full text-lg text-[#0C0C0E] disabled:text-[#BBBBBB]"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={quantity}
                maxLength={2}
                aria-label={t('quantity')}
                onChange={(event) => selection.setQuantityFromInput(event.target.value)}
                onBlur={selection.normalizeQuantity}
                className="w-10 bg-transparent text-center text-[15px] font-semibold text-[#0C0C0E] outline-none"
              />
              <button
                type="button"
                onClick={() => selection.changeQuantity(1)}
                disabled={Number(quantity) >= BSS_MAX_QUANTITY}
                aria-label={t('increase')}
                className="h-8 w-8 rounded-full bg-[#0000FF] text-lg text-white disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#F1F1F1] pt-4">
            <div>
              <p className="text-[13px] text-[#898C93]">{t('total')}</p>
              <p className="mt-1 text-[11px] text-[#898C93]">{t('priceNote')}</p>
            </div>
            <strong className="text-[18px] text-[#D2008C]">
              {isLoadingPrice ? t('calculating') : formatBssPrice(total, currency, locale)}
            </strong>
          </div>
          {priceError && <p className="mt-3 text-[13px] text-red-600">{priceError}</p>}

          <Button
            type="button"
            className="mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoadingPrice || Boolean(priceError) || !price || !quantityValid}
            onClick={() => onBuyNow(selectedPackage, quantity)}
          >
            {t('buyNow')}
          </Button>
        </section>
      )}
    </div>
  );
}
