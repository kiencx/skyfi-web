"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Banner đỏ đầu trang (Figma: "Image/ Website/ Banner-Search/ Small", 1920x340).
 * Ảnh nền là ảnh export từ Figma, nội dung nằm bên trái.
 */
const HeroBanner = ({ onRegisterClick, onConditionClick }) => {
  const t = useTranslations("mnp.hero");

  return (
    <section className="relative w-full overflow-hidden bg-[#ED1B2F]">
      <Image
        src="/images/mnp/hero-banner.png"
        alt=""
        width={1920}
        height={340}
        priority
        quality={95}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="relative mx-auto flex w-full max-w-[1272px] flex-col gap-5 px-4 py-10 md:px-6 lg:min-h-[340px] lg:justify-center lg:px-0 lg:py-[34px]">
        <h1 className="max-w-[720px] whitespace-pre-line font-koho text-[32px] font-bold leading-[1.1] text-white md:text-[48px] lg:text-[64px] lg:leading-[64px]">
          {t("title")}
        </h1>
        <p className="max-w-[592px] font-inter text-[14px] leading-[1.6] text-white md:text-[16px]">
          {t("description")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onConditionClick}
            className="h-12 rounded-lg border border-primary bg-white px-6 font-inter text-[16px] font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            {t("conditionButton")}
          </button>
          <button
            type="button"
            onClick={onRegisterClick}
            className="h-12 rounded-lg bg-primary px-6 font-inter text-[16px] font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {t("registerButton")}
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
