"use client";

import { useTranslations } from "next-intl";

/**
 * Nhãn ưu đãi cho số đẹp tặng 0đ của CTKM Vikki.
 *
 * Dùng đúng màu khuyến mại sẵn có của webview (#D2008C) thay vì thêm một tông mới:
 * cùng hệ với badge giảm giá ở PackageCard và điểm cuối của gradient banner sự kiện.
 * Giữ pill nhỏ, chữ 10px để nhãn không lấn số thuê bao đứng cạnh.
 */
const HotDealTag = ({ className = "" }) => {
  const t = useTranslations("vikki.simData");

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-[3px] rounded-full bg-[#D2008C] px-[7px] py-[3px] text-[10px] font-bold uppercase leading-none tracking-[0.04em] text-white ${className}`}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 0L6.15 3.85L10 5L6.15 6.15L5 10L3.85 6.15L0 5L3.85 3.85L5 0Z"
          fill="currentColor"
        />
      </svg>
      {t("hotDeal")}
    </span>
  );
};

export default HotDealTag;
