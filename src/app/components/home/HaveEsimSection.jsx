'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../i18n/navigation';

/**
 * "Bạn đã có eSIM?" row shown inside the travel eSIM search card, under the search bar
 * (Figma "Update Homepage 17/11", node 12267:5378).
 */
export function HaveEsimRow({ className = '' }) {
  const t = useTranslations('home.haveEsim');

  return (
    <div className={`flex flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${className}`}>
      <div className="min-w-0 text-[#333]">
        <h2 className="font-koho text-[20px] font-bold leading-[30px] sm:text-[24px] sm:leading-[36px]">
          {t('titlePrefix')} <span className="text-[#EC242A]">{t('titleHighlight')}</span>
        </h2>
        <p className="font-inter text-[13px] leading-[18px] sm:text-[14px] sm:leading-[19px]">{t('subtitle')}</p>
      </div>
      <Link
        href="/login-sim"
        className="inline-flex min-w-[128px] shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#FAA61A] px-6 py-3 font-inter text-[16px] font-semibold leading-6 text-white transition-opacity hover:opacity-90 sm:min-w-[196px]"
      >
        {t('cta')}
      </Link>
    </div>
  );
}

export default HaveEsimRow;
