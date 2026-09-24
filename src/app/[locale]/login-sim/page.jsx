'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '../../../i18n/navigation';
import Footer from '../../components/Footer';
import Header from '../../components/Header';

const IconMail = () => (
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="42" height="42" rx="10" fill="#FFF6F3" />
    <path
      d="M11 15.5h20c.83 0 1.5.67 1.5 1.5v14c0 .83-.67 1.5-1.5 1.5H11c-.83 0-1.5-.67-1.5-1.5V17c0-.83.67-1.5 1.5-1.5Z"
      stroke="#EC242A"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="m11 17 10 7.5L31 17" stroke="#EC242A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSim = () => (
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="42" height="42" rx="21" fill="#FFF6F3" />
    <path
      d="M16.5 12.5h7.2L27.5 16.3V29.5c0 .83-.67 1.5-1.5 1.5h-9.5c-.83 0-1.5-.67-1.5-1.5v-15.5c0-.83.67-1.5 1.5-1.5Z"
      stroke="#EC242A"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <rect x="17.5" y="19" width="7" height="8" rx="1" stroke="#EC242A" strokeWidth="1.5" />
  </svg>
);

const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M5.25 8.25V6a3.75 3.75 0 0 1 7.5 0v2.25"
      stroke="#333"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <rect x="3.75" y="8.25" width="10.5" height="7.5" rx="1.5" stroke="#333" strokeWidth="1.4" />
  </svg>
);

export default function LoginSimPage() {
  const t = useTranslations('loginSim');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [simSerial, setSimSerial] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    // No API yet — go to mock manage-sim screen
    router.push('/manage-sim');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <nav className="w-full bg-white px-4 py-4">
        <div className="container flex items-center gap-2 text-sm">
          <Link href="/" className="font-inter text-[#666] transition-colors hover:text-[#ED1B2F]">
            {t('breadcrumbHome')}
          </Link>
          <span className="text-[#999]" aria-hidden="true">›</span>
          <span className="font-inter font-semibold text-[#333]">{t('breadcrumbCurrent')}</span>
        </div>
      </nav>

      <main
        className="relative w-full flex-1 overflow-hidden bg-[#FFF8F4] bg-cover bg-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/assets/my-esim-access/bg-main.png')" }}
      >
        <div className="container px-4 py-8 lg:py-[60px]">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-[68px]">
            {/* Left illustration — row 1 on small, left column on L+ */}
            <div className="flex w-full max-w-[420px] shrink-0 justify-center lg:max-w-[560px] lg:flex-1">
              <img
                src="/assets/my-esim-access/img-left.png"
                alt=""
                className="h-auto w-full max-w-[360px] object-contain lg:max-w-[520px]"
              />
            </div>

            {/* Right form — row 2 on small, right column on L+ */}
            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-[490px] flex-col gap-4 sm:gap-5 lg:shrink-0"
            >
              <h1 className="font-inter text-[32px] font-bold leading-tight text-[#333] sm:text-[40px] lg:text-[48px] lg:leading-[48px]">
                {t('titlePrefix')}{' '}
                <span className="text-[#EC242A]">{t('titleHighlight')}</span>
              </h1>
              <p className="font-inter text-sm leading-[19px] text-black sm:text-base">
                {t('subtitle')}
              </p>

              <div className="flex w-full flex-col gap-2.5 rounded-[14px] border border-[#EAEAEA] bg-white p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                  <IconMail />
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-lg font-bold leading-[19px] text-[#333] sm:text-xl">
                      {t('emailTitle')}
                    </p>
                    <p className="mt-1.5 font-inter text-sm leading-[19px] text-[#333] sm:text-base">
                      {t('emailDesc')}
                    </p>
                  </div>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full rounded-lg border border-[#EAEAEA] px-4 py-3.5 font-inter text-base font-medium text-[#181818] outline-none placeholder:opacity-50 focus:border-[#FAA61A]"
                />
              </div>

              <div className="flex w-full flex-col gap-2.5 rounded-[14px] border border-[#EAEAEA] bg-white p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                  <IconSim />
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-lg font-bold leading-[19px] text-[#333] sm:text-xl">
                      {t('serialTitle')}
                    </p>
                    <p className="mt-1.5 font-inter text-sm leading-[19px] text-[#333] sm:text-base">
                      {t('serialDesc')}
                    </p>
                  </div>
                </div>
                <input
                  type="text"
                  value={simSerial}
                  onChange={(e) => setSimSerial(e.target.value)}
                  placeholder={t('serialPlaceholder')}
                  className="w-full rounded-lg border border-[#EAEAEA] px-4 py-3.5 font-inter text-base font-medium text-[#181818] outline-none placeholder:opacity-50 focus:border-[#FAA61A]"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#FAA61A] px-6 py-4 font-inter text-base font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('continue')}
              </button>

              <div className="flex items-center justify-center gap-1">
                <IconLock />
                <p className="font-inter text-sm leading-[19px] text-[#333]">
                  {t('secureNote')}
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
