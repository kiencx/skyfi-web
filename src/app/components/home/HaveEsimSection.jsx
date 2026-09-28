'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../i18n/navigation';

const IconSecure = ({ className = 'h-10 w-10' }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3.33325 17.5003C3.33325 16.217 3.35492 14.962 3.39992 13.7503C3.53825 9.79535 3.60825 7.81701 5.21659 6.19535C6.82492 4.57535 8.85992 4.48868 12.9266 4.31368C15.2831 4.21475 17.6414 4.16585 19.9999 4.16701C22.4666 4.16701 24.8416 4.21701 27.0733 4.31368C31.1399 4.48868 33.1733 4.57535 34.7833 6.19701C36.3916 7.81701 36.4616 9.79535 36.5999 13.7503C36.6878 16.2496 36.6878 18.7511 36.5999 21.2503C36.4616 25.2053 36.3916 27.1837 34.7833 28.8053C33.1749 30.4253 31.1399 30.512 27.0733 30.687C25.8488 30.7392 24.5849 30.7781 23.2816 30.8037C22.0483 30.827 21.4299 30.837 20.8866 31.0453C20.3433 31.2537 19.8866 31.642 18.9733 32.4253L15.3416 35.542C15.1648 35.6935 14.9483 35.791 14.7178 35.8232C14.4873 35.8553 14.2524 35.8206 14.0409 35.7232C13.8295 35.6258 13.6505 35.4699 13.525 35.2738C13.3996 35.0777 13.333 34.8498 13.3333 34.617V30.7037L12.9266 30.687C8.85992 30.512 6.82659 30.4253 5.21659 28.8037C3.60825 27.1837 3.53825 25.2053 3.39992 21.2503C3.35572 20.0008 3.33349 18.7506 3.33325 17.5003Z" stroke="#EC242A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.6665 16.6673V14.1673C16.6665 13.2833 17.0177 12.4354 17.6428 11.8103C18.2679 11.1852 19.1158 10.834 19.9998 10.834C20.8839 10.834 21.7317 11.1852 22.3569 11.8103C22.982 12.4354 23.3332 13.2833 23.3332 14.1673V16.6673M16.6665 16.6673H23.3332M16.6665 16.6673C16.0035 16.6673 15.3676 16.9307 14.8987 17.3996C14.4299 17.8684 14.1665 18.5043 14.1665 19.1673V21.6673C14.1665 22.3304 14.4299 22.9662 14.8987 23.4351C15.3676 23.9039 16.0035 24.1673 16.6665 24.1673H23.3332C23.9962 24.1673 24.6321 23.9039 25.1009 23.4351C25.5698 22.9662 25.8332 22.3304 25.8332 21.6673V19.1673C25.8332 18.5043 25.5698 17.8684 25.1009 17.3996C24.6321 16.9307 23.9962 16.6673 23.3332 16.6673" stroke="#EC242A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconFlash = ({ className = 'h-10 w-10' }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M8.71004 18.8828L20.3734 3.91118C21.285 2.73952 22.995 3.46785 22.995 5.02785V16.6162C22.995 17.5495 23.665 18.3078 24.4934 18.3078H30.1667C31.455 18.3078 32.1417 20.0245 31.29 21.1178L19.6267 36.0895C18.715 37.2595 17.005 36.5312 17.005 34.9712V23.3828C17.005 22.4495 16.3334 21.6912 15.5067 21.6912H9.83337C8.54504 21.6912 7.85837 19.9762 8.71004 18.8828Z" stroke="#EC242A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconDataUsage = ({ className = 'h-10 w-10' }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M19.9999 36.6664C17.6944 36.6664 15.5277 36.2286 13.4999 35.353C11.4721 34.4775 9.70825 33.2903 8.20825 31.7914C6.70825 30.2925 5.52103 28.5286 4.64659 26.4997C3.77214 24.4708 3.33436 22.3041 3.33325 19.9997C3.33325 16.3886 4.37492 13.1386 6.45825 10.2497C8.54158 7.36081 11.3055 5.34692 14.7499 4.20803C15.5555 3.93025 16.2988 4.02748 16.9799 4.4997C17.661 4.97192 18.001 5.61081 17.9999 6.41636C17.9999 6.97192 17.8405 7.47859 17.5216 7.93637C17.2027 8.39414 16.7927 8.70692 16.2916 8.8747C13.9027 9.6247 11.9788 11.0208 10.5199 13.063C9.06103 15.1053 8.33214 17.4175 8.33325 19.9997C8.33325 23.2497 9.46547 26.0069 11.7299 28.2714C13.9944 30.5358 16.751 31.6675 19.9999 31.6664C21.4444 31.6664 22.8405 31.4164 24.1883 30.9164C25.536 30.4164 26.7371 29.6941 27.7916 28.7497C28.2083 28.3608 28.7155 28.1664 29.3132 28.1664C29.911 28.1664 30.4177 28.3608 30.8333 28.7497C31.4721 29.333 31.8055 29.993 31.8333 30.7297C31.861 31.4664 31.5555 32.1119 30.9166 32.6664C29.4166 33.9719 27.7433 34.9653 25.8966 35.6464C24.0499 36.3275 22.0844 36.6675 19.9999 36.6664ZM31.6666 19.9997C31.6666 17.4441 30.9305 15.1458 29.4583 13.1047C27.986 11.0636 26.0555 9.65359 23.6666 8.8747C23.1666 8.70803 22.7571 8.39581 22.4383 7.93803C22.1194 7.48025 21.9594 6.97303 21.9583 6.41636C21.9583 5.61081 22.2988 4.97192 22.9799 4.4997C23.661 4.02748 24.4038 3.93025 25.2083 4.20803C28.6805 5.3747 31.4583 7.40248 33.5416 10.2914C35.6249 13.1803 36.6666 16.4164 36.6666 19.9997C36.6666 20.4997 36.6455 21.0069 36.6033 21.5214C36.561 22.0358 36.4849 22.598 36.3749 23.208C36.236 24.0136 35.8266 24.5903 35.1466 24.938C34.4666 25.2858 33.7233 25.3064 32.9166 24.9997C32.3888 24.8053 31.9794 24.4508 31.6883 23.9364C31.3971 23.4219 31.3066 22.8875 31.4166 22.333C31.4999 21.8608 31.5627 21.4441 31.6049 21.083C31.6471 20.7219 31.6677 20.3608 31.6666 19.9997Z" fill="#EC242A" />
  </svg>
);

export default function HaveEsimSection() {
  const t = useTranslations('home.haveEsim');

  const benefits = [
    { key: 'secure', Icon: IconSecure },
    { key: 'fastTopup', Icon: IconFlash },
    { key: 'trackData', Icon: IconDataUsage },
  ];

  return (
    <section className="w-full bg-white px-4 py-5 sm:py-6 lg:py-[30px]">
      <div className="container">
        <div className="flex flex-col gap-5 rounded-[14px] border border-[#EAEAEA] px-4 py-4 sm:gap-6 sm:px-5 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-[30px] lg:py-[14px]">
          {/* Row 1 (< L): title + CTA | Row side (L+): left column */}
          <div className="flex w-full flex-col items-center gap-3 text-center sm:gap-4 lg:max-w-[307px] lg:items-start lg:text-left">
            <div className="flex flex-col items-center text-[#333] lg:items-start">
              <h2 className="font-inter text-[22px] font-bold leading-[1.25] sm:text-[28px] lg:text-[36px] lg:leading-[48px]">
                {t('titlePrefix')}{' '}
                <span className="text-[#EC242A]">{t('titleHighlight')}</span>
              </h2>
              <p className="mt-1 max-w-[280px] font-inter text-xs leading-[16px] text-[#333] sm:max-w-[228px] sm:text-sm sm:leading-[19px]">
                {t('subtitle')}
              </p>
            </div>
            <Link
              href="/login-sim"
              className="inline-flex min-w-[128px] items-center justify-center rounded-lg bg-[#FAA61A] px-5 py-2.5 font-inter text-sm font-semibold leading-6 text-white transition-opacity hover:opacity-90 sm:px-6 sm:py-3 sm:text-base"
            >
              {t('cta')}
            </Link>
          </div>

          <div className="hidden h-[98px] w-px shrink-0 bg-[#EAEAEA] lg:block" aria-hidden="true" />

          {/* Row 2 (< L): 3 benefits evenly | L+: right column */}
          <div className="grid w-full grid-cols-3 items-start gap-2 sm:gap-4 lg:flex lg:w-auto lg:items-center lg:justify-center lg:gap-10 lg:px-7">
            {benefits.map(({ key, Icon }) => (
              <div
                key={key}
                className="flex min-w-0 flex-col items-center gap-2 text-center sm:gap-3 lg:min-w-[100px] lg:gap-4"
              >
                <Icon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                <p className="w-full font-inter text-[11px] leading-[14px] text-black sm:text-sm sm:leading-[18px] lg:max-w-[176px] lg:text-lg lg:leading-[19px]">
                  {t(`benefits.${key}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
