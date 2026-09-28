"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { modal, useModal } from "../../../utils/modal";

/** Popup "Gửi yêu cầu thành công" (Figma: node 8421-96902, 800x644). */
const SuccessModal = ({ code }) => {
  const t = useTranslations("mnp.success");
  const { close } = useModal();

  return (
    <div className="flex flex-col items-center gap-4 rounded-[14px] bg-white px-[30px] py-10">
      <div className="flex h-[132px] w-[132px] items-center justify-center rounded-full bg-[#F2F2F2] md:h-[172px] md:w-[172px]">
        <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[#34C759] md:h-[120px] md:w-[120px]">
          <svg className="h-[46px] w-[46px] text-white md:h-[60px] md:w-[60px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m4.5 12.5 5 5 10-11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <div className="flex flex-col items-center gap-5">
        <h2 className="text-center font-inter text-[24px] font-bold leading-tight text-[#27272A] md:text-[40px]">
          {t("title")}
        </h2>
        {code ? (
          <p className="text-center font-inter text-[16px] text-[#333] md:text-[20px]">
            {t("codeLabel")} <span className="font-bold text-[#EC242A]">{code}</span>
          </p>
        ) : null}
        <p className="max-w-[668px] text-center font-inter text-[16px] leading-7 text-[#333] md:text-[20px]">
          {t("description")}
        </p>
      </div>

      <Image
        src="/images/mnp/success-envelope.png"
        alt=""
        width={344}
        height={160}
        className="h-auto w-[280px] md:w-[344px]"
      />

      <button
        type="button"
        onClick={close}
        className="h-14 w-full max-w-[522px] rounded-lg bg-primary px-6 font-inter text-[16px] font-semibold text-white transition-colors hover:bg-primary/90"
      >
        {t("close")}
      </button>
    </div>
  );
};

export default SuccessModal;

export const showMnpSuccessModal = ({ code, onClose } = {}) => {
  modal.open({
    render: <SuccessModal code={code} />,
    boxClassName: "max-w-[800px]",
    closeButton: false,
    onClose,
    onDone: onClose,
  });
};
