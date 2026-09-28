"use client";

import InputField from "@/app/components/form/inputField";
import { useTranslations } from "next-intl";

/** Ô nhập nền xám, không viền - dùng cho thông tin bóc tách từ giấy tờ. */
const READONLY_INPUT_CLASS =
  "h-[52px] !rounded-lg !border-transparent bg-[#F1F1F1] !text-[16px] text-[#181818] read-only:cursor-default";
const EDITABLE_INPUT_CLASS = "h-[52px] !rounded-lg !border-[#D8D8D8] !text-[16px] text-[#181818]";
const INFO_LABEL_CLASS = "!text-[14px] font-normal leading-5 text-[#808080]";

/**
 * Cụm thông tin hiển thị sau khi bóc tách eKYC (Figma: khối dưới 3 ảnh KYC).
 * Các field lấy từ giấy tờ ở chế độ chỉ đọc; riêng "Địa chỉ hiện tại" cho phép
 * khách sửa vì có thể khác nơi cư trú trên CCCD.
 */
const EkycInfoFields = ({ control }) => {
  const t = useTranslations("mnp.kyc.info");

  const readOnlyField = (name, label) => (
    <InputField
      control={control}
      name={name}
      label={label}
      readOnly
      className="flex-1 gap-2"
      classNameLabel={INFO_LABEL_CLASS}
      classInput={READONLY_INPUT_CLASS}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-x-[30px] gap-y-4 md:grid-cols-2">
      {readOnlyField("full_name", t("fullName"))}
      {readOnlyField("id_number", t("idNumber"))}
      {readOnlyField("birth_day", t("birthDay"))}
      {readOnlyField("gender", t("gender"))}
      {readOnlyField("issue_date", t("issueDate"))}
      {readOnlyField("issue_place", t("issuePlace"))}
      {readOnlyField("residence", t("residence"))}
      <InputField
        control={control}
        name="current_address"
        label={t("currentAddress")}
        placeholder={t("currentAddressPlaceholder")}
        className="flex-1 gap-2"
        classNameLabel={INFO_LABEL_CLASS}
        classInput={EDITABLE_INPUT_CLASS}
      />
    </div>
  );
};

export default EkycInfoFields;
