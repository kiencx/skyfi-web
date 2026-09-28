"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

/**
 * Màn ký xác nhận (Figma: node 8447-126442) - overlay tối toàn màn hình,
 * khung ký trắng bo 24px, nút "Ký lại" / "Tiếp tục".
 */
const SignatureOverlay = ({ open, onClose, onConfirm }) => {
  const t = useTranslations("mnp.signature");
  const signatureRef = useRef(null);
  const boxRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 720, height: 480 });

  // Canvas cần kích thước pixel thật, nên đo lại khung chứa mỗi khi mở / resize.
  useEffect(() => {
    if (!open) return undefined;

    const updateSize = () => {
      const box = boxRef.current;
      if (!box) return;
      setCanvasSize({ width: box.clientWidth, height: box.clientHeight });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [open]);

  // Khoá cuộn nền khi overlay đang mở
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      signatureRef.current?.clear();
      setIsEmpty(true);
    }
  }, [open]);

  if (!open) return null;

  const handleClear = () => {
    signatureRef.current?.clear();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) return;
    onConfirm(signatureRef.current.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center overflow-y-auto bg-[#1F1F1F] px-4 py-8">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute right-4 top-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#333] transition-colors hover:bg-[#444] md:right-8 md:top-8"
      >
        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>

      <h2 className="mt-12 text-center font-inter text-[24px] font-bold leading-tight text-white md:mt-[104px] md:text-[40px]">
        {t("title")}
      </h2>

      <div
        ref={boxRef}
        className="mt-8 h-[320px] w-full max-w-[720px] overflow-hidden rounded-3xl bg-white md:mt-12 md:h-[480px]"
      >
        <SignatureCanvas
          ref={signatureRef}
          penColor="#111111"
          onEnd={() => setIsEmpty(false)}
          canvasProps={{ width: canvasSize.width, height: canvasSize.height, className: "touch-none" }}
        />
      </div>

      <p className="mt-6 max-w-[595px] text-center font-inter text-[16px] leading-7 text-[#E6E7E8] md:text-[20px]">
        {t("description")}
      </p>

      <div className="mt-8 flex w-full max-w-[491px] flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleClear}
          className="h-12 flex-1 rounded-lg border border-primary bg-white px-6 font-inter text-[16px] font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          {t("clear")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isEmpty}
          className="h-12 flex-1 rounded-lg bg-primary px-6 font-inter text-[16px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {t("confirm")}
        </button>
      </div>
    </div>
  );
};

export default SignatureOverlay;
