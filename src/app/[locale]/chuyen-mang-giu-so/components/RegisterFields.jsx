"use client";

import InputField from "@/app/components/form/inputField";
import InputRadio from "@/app/components/form/inputRadio";
import { useCities, useDistricts, useWards } from "@/app/hooks/useAddress";
import { useTranslations } from "next-intl";
import { Controller, useWatch } from "react-hook-form";
import Select from "react-select";
import {
  CheckIcon,
  DataUsageIcon,
  ExternalLinkIcon,
  LocationIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "./icons";
import { AlertBox, FieldError, FieldLabel, HintBox, INPUT_CLASS, LABEL_CLASS, selectStyles } from "./ui";

export const DNO_OPTIONS = [
  { value: "VIETTEL", label: "Viettel" },
  { value: "VINAPHONE", label: "VinaPhone" },
  { value: "MOBIFONE", label: "MobiFone" },
  { value: "VIETNAMOBILE", label: "Vietnamobile" },
  { value: "ITEL", label: "iTel" },
  { value: "LOCAL", label: "Local" },
  { value: "REDDI", label: "Reddi" },
  { value: "WINTEL", label: "Wintel" },
];

/** Ô bọc radio có viền (nhà mạng gốc, loại SIM) - giống "Frame 1410136333" trong Figma. */
const radioCardClass = (checked) =>
  `h-11 whitespace-nowrap rounded-lg border px-[10px] ${checked ? "border-primary" : "border-[#D0D0D0]"}`;

/** Bọc react-select để đặt icon bên trái giống ô nhập có icon. */
const SelectWithIcon = ({ icon, children }) => (
  <div className="relative">
    {icon ? <span className="pointer-events-none absolute left-[10px] top-1/2 z-[1] -translate-y-1/2">{icon}</span> : null}
    {children}
  </div>
);

/**
 * Hai cột thông tin đăng ký chuyển mạng (Figma: "Frame 1410136364").
 * Cột phải đổi nội dung theo loại SIM: eSIM -> box ưu điểm, SIM vật lý -> địa chỉ nhận SIM.
 */
/**
 * Chọn tỉnh / quận-huyện / phường-xã giống web skyfi.vn (TL mục 4.2 trường 9). Lưu cả id
 * lẫn tên để BE ghép địa chỉ đầy đủ; đổi cấp trên thì xoá cấp dưới.
 */
const AddressSelects = ({ control, setValue }) => {
  const t = useTranslations("mnp.form");
  const [cityId, districtId] = useWatch({ control, name: ["city_id", "district_id"] });
  const cities = useCities();
  const districts = useDistricts(cityId);
  const wards = useWards(districtId);

  const pick = (level, option, validate = true) => {
    setValue(`${level}_id`, option?.value ?? "", { shouldValidate: validate });
    setValue(`${level}_name`, option?.label ?? "");
  };

  const levels = [
    { level: "city", options: cities, placeholder: t("cityPlaceholder"), reset: ["district", "ward"] },
    { level: "district", options: districts, placeholder: t("districtPlaceholder"), reset: ["ward"] },
    { level: "ward", options: wards, placeholder: t("wardPlaceholder"), reset: [] },
  ];

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel required>{t("addressArea")}</FieldLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {levels.map(({ level, options, placeholder, reset }) => (
          <div key={level} className="flex flex-col gap-1">
            <Controller
              control={control}
              name={`${level}_id`}
              render={({ field: { value, ref } }) => (
                <Select
                  ref={ref}
                  inputId={`${level}_id`}
                  instanceId={`mnp-${level}`}
                  styles={selectStyles}
                  placeholder={placeholder}
                  options={options}
                  value={options.find((o) => o.value === value) ?? null}
                  onChange={(option) => {
                    pick(level, option);
                    reset.forEach((child) => pick(child, null, false));
                  }}
                />
              )}
            />
            <FieldError control={control} name={`${level}_id`} />
          </div>
        ))}
      </div>
    </div>
  );
};

const RegisterFields = ({ control, setValue, numberTypeOptions, commitmentOptions, packageOptions, onCheckDevice }) => {
  const t = useTranslations("mnp.form");
  const [dno, subscriberType, simType] = useWatch({ control, name: ["dno", "subscriber_type", "sim_type"] });

  const getSelectValue = (options, value) => options.find((option) => option.value === value) ?? null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-[30px]">
      {/* Cột trái */}
      <div className="flex w-full flex-col gap-[22px] lg:max-w-[570px] lg:flex-1">
        <InputField
          control={control}
          name="msisdn"
          label={t("msisdn")}
          placeholder={t("msisdnPlaceholder")}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          required
          icon={<PhoneIcon />}
          className="gap-2"
          classNameLabel={LABEL_CLASS}
          classInput={INPUT_CLASS}
        />

        <div className="flex flex-col gap-3">
          <FieldLabel required>{t("dno")}</FieldLabel>
          <div className="flex flex-wrap gap-[14px]">
            {DNO_OPTIONS.map((option) => (
              <InputRadio
                key={option.value}
                id={`dno-${option.value}`}
                control={control}
                name="dno"
                value={option.value}
                label={option.label}
                checked={dno === option.value}
                className={`${radioCardClass(dno === option.value)} min-w-fit flex-1`}
              />
            ))}
          </div>
          <FieldError control={control} name="dno" />
        </div>

        <div className="flex flex-col gap-3">
          <FieldLabel required>{t("subscriberType")}</FieldLabel>
          <div className="flex items-center gap-[26px]">
            <InputRadio
              id="subscriber-prepaid"
              control={control}
              name="subscriber_type"
              value="PREPAID"
              label={t("prepaid")}
              checked={subscriberType === "PREPAID"}
            />
            <InputRadio
              id="subscriber-postpaid"
              control={control}
              name="subscriber_type"
              value="POSTPAID"
              label={t("postpaid")}
              checked={subscriberType === "POSTPAID"}
            />
          </div>
          <FieldError control={control} name="subscriber_type" />
        </div>

        <div className="flex flex-col gap-[33px] sm:flex-row">
          <div className="flex w-full flex-col gap-[10px] sm:w-[268px]">
            <FieldLabel optional={t("optional")}>{t("numberType")}</FieldLabel>
            <Controller
              control={control}
              name="number_type"
              render={({ field: { value, onChange, ...field } }) => (
                <Select
                  {...field}
                  instanceId="mnp-number-type"
                  styles={selectStyles}
                  placeholder={t("numberTypePlaceholder")}
                  options={numberTypeOptions}
                  value={getSelectValue(numberTypeOptions, value)}
                  onChange={(option) => onChange(option?.value ?? "")}
                  isClearable
                />
              )}
            />
          </div>
          <div className="flex w-full flex-col gap-[10px] sm:w-[268px]">
            <FieldLabel optional={t("optional")}>{t("commitment")}</FieldLabel>
            <Controller
              control={control}
              name="commitment"
              render={({ field: { value, onChange, ...field } }) => (
                <Select
                  {...field}
                  instanceId="mnp-commitment"
                  styles={selectStyles}
                  placeholder={t("commitmentPlaceholder")}
                  options={commitmentOptions}
                  value={getSelectValue(commitmentOptions, value)}
                  onChange={(option) => onChange(option?.value ?? "")}
                  isClearable
                />
              )}
            />
          </div>
        </div>

        <InputField
          control={control}
          name="contact_phone"
          label={t("contactPhone")}
          placeholder={t("contactPhonePlaceholder")}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          required
          icon={<PhoneIcon className="h-6 w-6 text-[#EC242A]" />}
          className="gap-2"
          classNameLabel={LABEL_CLASS}
          classInput={INPUT_CLASS}
        />

        <InputField
          control={control}
          name="email"
          label={t("email")}
          placeholder={t("emailPlaceholder")}
          type="email"
          required
          icon={<MailIcon />}
          className="gap-2"
          classNameLabel={LABEL_CLASS}
          classInput={INPUT_CLASS}
        />
      </div>

      {/* Đường kẻ phân cách giữa hai cột */}
      <div className="hidden w-px shrink-0 bg-[#EAEAEA] lg:block" />

      {/* Cột phải */}
      <div className="flex w-full flex-col gap-[22px] lg:max-w-[570px] lg:flex-1">
        <div className="flex flex-col gap-[10px]">
          <FieldLabel required>{t("simType")}</FieldLabel>
          <div className="flex flex-col gap-[20px] sm:flex-row">
            <InputRadio
              id="sim-type-esim"
              control={control}
              name="sim_type"
              value="ESIM"
              label={t("esim")}
              checked={simType === "ESIM"}
              className={`${radioCardClass(simType === "ESIM")} flex-1`}
            />
            <InputRadio
              id="sim-type-usim"
              control={control}
              name="sim_type"
              value="USIM"
              label={t("usim")}
              checked={simType === "USIM"}
              className={`${radioCardClass(simType === "USIM")} flex-1`}
            />
          </div>
          <FieldError control={control} name="sim_type" />
        </div>

        {simType === "USIM" ? (
          <div className="flex flex-col gap-[22px] rounded-[14px] border border-[#EAEAEA] p-3">
            <AlertBox>{t("usimAlert")}</AlertBox>

            <AddressSelects control={control} setValue={setValue} />

            <InputField
              control={control}
              name="address"
              label={t("address")}
              placeholder={t("addressPlaceholder")}
              required
              icon={<LocationIcon />}
              className="gap-2"
              classNameLabel={LABEL_CLASS}
              classInput={INPUT_CLASS}
            />

            <div className="flex flex-col gap-4 sm:flex-row">
              <InputField
                control={control}
                name="receiver_phone"
                label={t("receiverPhone")}
                placeholder={t("receiverPhonePlaceholder")}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                required
                icon={<PhoneIcon className="h-6 w-6 text-[#EC242A]" />}
                className="flex-1 gap-2"
                classNameLabel={LABEL_CLASS}
                classInput={INPUT_CLASS}
              />
              <InputField
                control={control}
                name="receiver_name"
                label={t("receiverName")}
                placeholder={t("receiverNamePlaceholder")}
                required
                icon={<UserIcon />}
                className="flex-1 gap-2"
                classNameLabel={LABEL_CLASS}
                classInput={INPUT_CLASS}
              />
            </div>

            <HintBox>{t("usimHint")}</HintBox>
          </div>
        ) : (
          <div className="flex flex-col gap-[25px] rounded-md bg-[#FEF5F6] p-[14px]">
            <h3 className="font-inter text-[18px] font-bold leading-6 text-[#EC242A] md:text-[20px]">
              {t("esimTitle")}
            </h3>
            <div className="flex flex-col gap-1">
              {t.raw("esimBenefits").map((benefit) => (
                <div key={benefit} className="flex items-center gap-[10px]">
                  <CheckIcon className="h-6 w-6 shrink-0 text-[#EC242A]" />
                  <p className="font-inter text-[14px] text-[#333]">{benefit}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onCheckDevice}
              className="flex items-center justify-center gap-[13px] rounded-md border border-dashed border-[#EC242A] px-3 py-3 transition-colors hover:bg-[#EC242A]/5"
            >
              <span className="font-inter text-[16px] font-semibold text-[#EC242A] underline">
                {t("checkDevice")}
              </span>
              <ExternalLinkIcon />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <FieldLabel required>{t("package")}</FieldLabel>
          <SelectWithIcon icon={<DataUsageIcon />}>
            <Controller
              control={control}
              name="package_code"
              render={({ field: { value, onChange, ...field } }) => (
                <Select
                  {...field}
                  instanceId="mnp-package"
                  styles={{
                    ...selectStyles,
                    control: (base, state) => ({ ...selectStyles.control(base, state), paddingLeft: 34 }),
                  }}
                  placeholder={t("packagePlaceholder")}
                  options={packageOptions}
                  value={getSelectValue(packageOptions, value)}
                  onChange={(option) => onChange(option?.value ?? "")}
                  isClearable
                  inputId="package_code"
                />
              )}
            />
          </SelectWithIcon>
          <FieldError control={control} name="package_code" />
        </div>
      </div>
    </div>
  );
};

export default RegisterFields;
