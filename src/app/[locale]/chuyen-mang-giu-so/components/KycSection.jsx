"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import InputRadio from "@/app/components/form/inputRadio";
import { useEffect, useRef } from "react";
import { useController, useWatch } from "react-hook-form";
import EkycInfoFields from "./EkycInfoFields";
import { ExclamationBadge, SignatureIcon } from "./icons";
import { FieldError, FieldLabel } from "./ui";

const KYC_IMAGES = ["id_card_front", "id_card_back", "portrait"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/** Ảnh placeholder dùng chung với luồng dktt. */
const PLACEHOLDERS = {
  id_card_front: { src: "/images/dktt/front-card.png", width: 321, height: 200 },
  id_card_back: { src: "/images/dktt/back-card.png", width: 321, height: 200 },
  portrait: { src: "/images/dktt/avatar.png", width: 210, height: 234 },
};

/** Ô upload ảnh KYC: label + vùng preview + nút "Tải ảnh". */
const UploadBox = ({ control, setValue, name, label, variant = "card", className, disabled }) => {
  const t = useTranslations("mnp.kyc");
  const inputRef = useRef(null);
  const placeholder = PLACEHOLDERS[name];
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  // Dùng setValue + shouldValidate để xoá lỗi cũ ngay khi khách tải ảnh mới.
  // field.onChange không validate lại trước lần submit đầu tiên nên lỗi do eKYC
  // trả về (ảnh bị xoá kèm shouldValidate) sẽ bị kẹt lại dưới ô ảnh.
  const handleChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // TL mục 4.4: chỉ nhận JPG, JPEG, PNG, tối đa 5MB/ảnh
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > MAX_IMAGE_SIZE) {
      setValue(name, "", { shouldValidate: true });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setValue(name, reader.result, { shouldValidate: true, shouldDirty: true });
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`flex flex-col items-center gap-4 rounded-2xl border px-4 py-6 ${
        error ? "border-[#EC242A]" : "border-[#E6E7E8]"
      } ${className || ""}`}
    >
      <p className="flex items-center gap-1 text-center font-inter text-[14px] font-medium leading-5 text-[#666]">
        {label}
        <span className="text-[#EA0029]">*</span>
      </p>

      <div
        className={`overflow-hidden rounded-lg ${
          variant === "card" ? "h-[175px] w-full max-w-[280px]" : "h-[175px] w-[148px]"
        }`}
      >
        {field.value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={field.value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <Image
            src={placeholder.src}
            alt=""
            width={placeholder.width}
            height={placeholder.height}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="h-11 rounded-lg bg-[#F1F1F2] px-4 font-inter text-[14px] font-bold text-[#181818] transition-colors hover:bg-[#E6E7E8] disabled:opacity-60"
      >
        {field.value ? t("reupload") : t("upload")}
      </button>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleChange} />
      {error ? <span className="font-inter text-[12px] text-[#EC242A]">{error.message}</span> : null}
    </div>
  );
};

/**
 * Khối KYC: loại giấy tờ + ảnh + lưu ý + chữ ký + nút gửi yêu cầu (nằm trong cùng thẻ viền theo Figma).
 * CCCD cần 3 ảnh; hộ chiếu nước ngoài cần 2 ảnh (trang thông tin + chân dung) — TL mục 4.4.
 */
const KycSection = ({ control, setValue, signature, onOpenSignature, isEkycProcessing, hasEkycInfo, children }) => {
  const t = useTranslations("mnp.kyc");
  const docType = useWatch({ control, name: "doc_type" });
  const isPassport = docType === "PASSPORT";

  // Đổi loại giấy tờ thì xoá ảnh đã tải để KH tải lại theo loại mới.
  const prevDocType = useRef(docType);
  useEffect(() => {
    if (prevDocType.current === docType) return;
    prevDocType.current = docType;
    KYC_IMAGES.forEach((name) => setValue(name, ""));
  }, [docType, setValue]);

  return (
    <div className="flex flex-col gap-[18px] rounded-[14px] border border-[#EAEAEA] px-4 py-5">
      <p className="flex items-center gap-1 font-inter text-[16px] font-bold leading-7 text-[#333]">
        {t("title")}
        <span className="text-[#EC242A]">*</span>
      </p>

      <div className="flex flex-col gap-3">
        <FieldLabel required>{t("docType")}</FieldLabel>
        <div className="flex items-center gap-[26px]">
          <InputRadio
            id="doc-type-cccd"
            control={control}
            name="doc_type"
            value="CCCD"
            label={t("docCccd")}
            checked={!isPassport}
          />
          <InputRadio
            id="doc-type-passport"
            control={control}
            name="doc_type"
            value="PASSPORT"
            label={t("docPassport")}
            checked={isPassport}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <UploadBox
          control={control}
          setValue={setValue}
          name="id_card_front"
          label={isPassport ? t("passportFront") : t("idFront")}
          className="flex-1"
          disabled={isEkycProcessing}
        />
        {isPassport ? null : (
          <UploadBox
            control={control}
            setValue={setValue}
            name="id_card_back"
            label={t("idBack")}
            className="flex-1"
            disabled={isEkycProcessing}
          />
        )}
        <UploadBox
          control={control}
          setValue={setValue}
          name="portrait"
          label={t("portrait")}
          variant="portrait"
          className="lg:w-[180px]"
          disabled={isEkycProcessing}
        />
      </div>

      {/* Thông tin bóc tách từ giấy tờ - chỉ hiện sau khi eKYC thành công */}
      {isEkycProcessing ? (
        <div className="flex items-center justify-center gap-3 rounded-lg bg-[#F6F6F6] px-4 py-5">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#EC242A] border-t-transparent" />
          <p className="font-inter text-[15px] text-[#333] md:text-[16px]">{t("processing")}</p>
        </div>
      ) : null}

      {!isEkycProcessing && hasEkycInfo ? <EkycInfoFields control={control} /> : null}

      <div className="flex items-start gap-[10px]">
        <ExclamationBadge tone="danger" className="mt-[2px]" />
        <p className="font-inter text-[15px] leading-7 text-[#333] md:text-[16px]">
          <span className="font-bold text-[#EC242A]">{t("noteLabel")} </span>
          {t("noteContent")}
        </p>
      </div>

      {/* Chữ ký khách hàng */}
      <div className="flex flex-col gap-4 rounded-lg bg-[#F6F6F6] px-[18px] py-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0F1]">
              <SignatureIcon />
            </span>
            <h3 className="font-inter text-[22px] font-bold leading-[48px] text-[#27272A] md:text-[32px]">
              {t("signatureTitle")}
            </h3>
          </div>
          <p className="font-inter text-[16px] leading-[30px] text-[#333] md:text-[20px]">
            {t("signatureDescription")}{" "}
            <span className="font-bold text-[#EC242A]">{t("signatureDocument")}</span>
          </p>
        </div>

        <div className="flex w-full items-center justify-center rounded-lg bg-white p-4 lg:w-[418px] lg:min-h-[122px]">
          {signature ? (
            <button type="button" onClick={onOpenSignature} className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature} alt={t("signatureTitle")} className="max-h-[80px] object-contain" />
              <span className="font-inter text-[14px] font-semibold text-primary underline">{t("signatureRedo")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSignature}
              className="rounded-lg border border-primary px-4 py-2 font-inter text-[16px] font-semibold text-primary transition-colors hover:bg-primary/10 md:text-[20px]"
            >
              {t("signatureButton")}
            </button>
          )}
        </div>
      </div>
      <FieldError control={control} name="signature" />

      {children}
    </div>
  );
};

export default KycSection;
