"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SectionHeading } from "./ui";

/** Khối "Chuyển mạng cùng SKYFI" + thẻ đỏ giới thiệu mạng di động SkyFi. */
const AboutSection = () => {
  const t = useTranslations("mnp.about");

  return (
    <section className="mx-auto w-full max-w-[1272px] px-4 py-8 md:px-6 lg:px-0 lg:py-[10px]">
      <SectionHeading lead={t("headingLead")} rest={t("headingRest")} leadTone="dark" underline />

      <div className="relative mt-[30px] rounded-3xl bg-[#EA0029] px-6 pb-6 pt-8 md:px-10 md:pb-6 md:pt-4 lg:min-h-[297px]">
        <div className="relative z-[1] max-w-full md:max-w-[640px]">
          <h3 className="font-inter text-[26px] font-bold leading-tight text-white md:text-[40px]">
            {t("cardTitle")}
          </h3>
          <p className="mt-4 font-inter text-[14px] leading-6 text-white md:text-[16px]">{t("cardDescription")}</p>
        </div>
        <Image
          src="/images/mnp/shopping.png"
          alt=""
          quality={95}
          width={364}
          height={326}
          className="pointer-events-none absolute -top-[29px] right-4 hidden h-[326px] w-auto select-none md:block lg:right-[79px]"
        />
      </div>
    </section>
  );
};

export default AboutSection;
