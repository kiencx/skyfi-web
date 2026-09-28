"use client";

import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";
import { showModalMess } from "@/app/components/modals/modalMess";
import useMyEsim from "@/app/hooks/useMyEsim";
import MnpService from "@/app/services/mnpService";
import { useLoad } from "@/app/utils/load";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { object, string } from "yup";
import AboutSection from "./components/AboutSection";
import FaqSection from "./components/FaqSection";
import GuideSection from "./components/GuideSection";
import HeroBanner from "./components/HeroBanner";
import KycSection from "./components/KycSection";
import RegisterFields from "./components/RegisterFields";
import SignatureOverlay from "./components/SignatureOverlay";
import { showMnpSuccessModal } from "./components/SuccessModal";
import { SendIcon, ShieldIcon } from "./components/icons";
import { SectionHeading } from "./components/ui";
import useMnpEkyc from "./hooks/useMnpEkyc";

const PHONE_REGEX = /^0\d{9}$/;
/** Họ tên người nhận: không chứa số và ký tự đặc biệt (TL mục 4.2). */
const NAME_REGEX = /^[\p{L}\s]+$/u;

/** Mã lỗi BE -> key i18n mnp.errors.codes.* (TL mục 7.2). */
const ERROR_CODES = ["MNP_IS_SKYFI", "MNP_PENDING", "OCR_INVALID", "DOC_EXPIRED", "UNDER_AGE", "IMAGE_TOO_LARGE", "SIGNATURE_REQUIRED", "TOO_MANY_REQUESTS", "SYSTEM_ERROR"];

const DEFAULT_VALUES = {
  msisdn: "",
  dno: "VIETTEL",
  subscriber_type: "PREPAID",
  number_type: "",
  commitment: "",
  contact_phone: "",
  email: "",
  sim_type: "USIM",
  city_id: "",
  city_name: "",
  district_id: "",
  district_name: "",
  ward_id: "",
  ward_name: "",
  address: "",
  receiver_phone: "",
  receiver_name: "",
  package_code: "",
  doc_type: "CCCD",
  id_card_front: "",
  id_card_back: "",
  portrait: "",
  signature: "",
  // Thông tin bóc tách từ eKYC (điền tự động, xem useMnpEkyc)
  full_name: "",
  id_number: "",
  birth_day: "",
  gender: "",
  issue_date: "",
  issue_place: "",
  residence: "",
  current_address: "",
  face_score: "",
};

export default function ChuyenMangGiuSoPage() {
  const t = useTranslations("mnp");
  const tError = useTranslations("mnp.errors");
  const load = useLoad();
  const { showDevicesEsim } = useMyEsim();

  const formRef = useRef(null);
  const [packages, setPackages] = useState([]);
  const [numberTypes, setNumberTypes] = useState([]);
  const [isSigning, setIsSigning] = useState(false);

  const schema = useMemo(
    () =>
      object().shape({
        msisdn: string().required(tError("msisdnRequired")).matches(PHONE_REGEX, tError("phoneInvalid")),
        dno: string().required(tError("dnoRequired")),
        subscriber_type: string().required(tError("subscriberTypeRequired")),
        contact_phone: string()
          .required(tError("contactPhoneRequired"))
          .matches(PHONE_REGEX, tError("phoneInvalid")),
        email: string().required(tError("emailRequired")).email(tError("emailInvalid")).max(100, tError("emailInvalid")),
        sim_type: string().required(tError("simTypeRequired")),
        city_id: string().when("sim_type", {
          is: "USIM",
          then: (field) => field.required(tError("cityRequired")),
          otherwise: (field) => field.optional(),
        }),
        district_id: string().when("sim_type", {
          is: "USIM",
          then: (field) => field.required(tError("districtRequired")),
          otherwise: (field) => field.optional(),
        }),
        ward_id: string().when("sim_type", {
          is: "USIM",
          then: (field) => field.required(tError("wardRequired")),
          otherwise: (field) => field.optional(),
        }),
        address: string().when("sim_type", {
          is: "USIM",
          then: (field) => field.required(tError("addressRequired")),
          otherwise: (field) => field.optional(),
        }),
        receiver_phone: string().when("sim_type", {
          is: "USIM",
          then: (field) =>
            field.required(tError("receiverPhoneRequired")).matches(PHONE_REGEX, tError("phoneInvalid")),
          otherwise: (field) => field.optional(),
        }),
        receiver_name: string().when("sim_type", {
          is: "USIM",
          then: (field) =>
            field
              .required(tError("receiverNameRequired"))
              .max(100, tError("receiverNameInvalid"))
              .matches(NAME_REGEX, tError("receiverNameInvalid")),
          otherwise: (field) => field.optional(),
        }),
        package_code: string().required(tError("packageRequired")),
        doc_type: string().required(),
        id_card_front: string().required(tError("idFrontRequired")),
        id_card_back: string().when("doc_type", {
          is: "CCCD",
          then: (field) => field.required(tError("idBackRequired")),
          otherwise: (field) => field.optional(),
        }),
        portrait: string().required(tError("portraitRequired")),
        signature: string().required(tError("signatureRequired")),
      }),
    [tError]
  );

  const method = useForm({
    defaultValues: DEFAULT_VALUES,
    resolver: yupResolver(schema),
    mode: "onTouched",
  });

  const signature = method.watch("signature");

  // Tự động gọi eKYC (bóc tách 2 mặt giấy tờ + so khớp khuôn mặt) khi đủ 3 ảnh
  const { isProcessing: isEkycProcessing, hasInfo: hasEkycInfo } = useMnpEkyc({
    control: method.control,
    setValue: method.setValue,
  });

  // Danh sách gói cước cho dropdown "Gói cước đăng ký" (BR03: BE đã loại SF99, SF179, SF399)
  useEffect(() => {
    MnpService.getPackages().then(setPackages);
  }, []);

  useEffect(() => {
    const fetchNumberTypes = async () => {
      const data = await MnpService.getNumberTypes();
      if (Array.isArray(data) && data.length > 0) {
        setNumberTypes(data);
      }
    };
    fetchNumberTypes();
  }, []);

  const packageOptions = useMemo(
    () =>
      packages.map((pack) => ({
        value: pack.code,
        label: pack.validity_day ? `${pack.name} - ${pack.validity_day} ${t("form.day")}` : pack.name,
      })),
    [packages, t]
  );

  const numberTypeOptions = useMemo(() => {
    if (numberTypes.length > 0) {
      return numberTypes.map((item) => ({ value: item.code ?? item.value, label: item.name ?? item.label }));
    }
    return t.raw("form.numberTypeOptions");
  }, [numberTypes, t]);

  const commitmentOptions = useMemo(() => t.raw("form.commitmentOptions"), [t]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Cuộn tới field lỗi đầu tiên, chừa 100px cho header cố định
  const scrollToFirstError = (errors) => {
    const firstKey = Object.keys(errors)[0];
    if (!firstKey) return;
    const element = document.getElementById(firstKey) || document.getElementsByName(firstKey)?.[0];
    const target = element || formRef.current;
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: "smooth" });
    element?.focus?.({ preventScroll: true });
  };

  const onSubmit = async (values) => {
    try {
      load.open();
      const res = await MnpService.register(values);
      if (res.success) {
        showMnpSuccessModal({
          code: res.code,
          onClose: () => {
            method.reset(DEFAULT_VALUES);
          },
        });
        return;
      }
      // E6: lỗi hệ thống/mất kết nối -> giữ nguyên dữ liệu form để KH gửi lại.
      const message = ERROR_CODES.includes(res.errorCode)
        ? tError(`codes.${res.errorCode}`, { code: res.pendingCode || "" })
        : res.message || tError("submitFailed");
      showModalMess({
        label: t("errorTitle"),
        message,
        type: "error",
      });
    } catch (error) {
      showModalMess({
        label: t("errorTitle"),
        message: error?.message || tError("submitFailed"),
        type: "error",
      });
    } finally {
      load.close();
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F1F2]">
      <Header />

      <main className="flex flex-col gap-4">
        <HeroBanner onRegisterClick={scrollToForm} onConditionClick={scrollToForm} />

        <AboutSection />

        <GuideSection />

        {/* Đăng ký chuyển mạng giữ số */}
        <section ref={formRef} className="w-full bg-white py-4">
          <div className="mx-auto w-full max-w-[1272px] px-4 py-4 md:px-6 lg:px-5">
            <div className="flex flex-col items-center gap-2">
              <SectionHeading lead={t("register.headingLead")} rest={t("register.headingRest")} />
              <div className="flex items-center gap-[10px]">
                <ShieldIcon />
                <p className="font-inter text-[14px] text-[#363F54] md:text-[16px]">{t("register.secureNote")}</p>
              </div>
            </div>

            <form
              onSubmit={method.handleSubmit(onSubmit, scrollToFirstError)}
              className="mt-8 flex flex-col gap-[50px] lg:mt-[34px]"
              noValidate
            >
              <RegisterFields
                control={method.control}
                setValue={method.setValue}
                numberTypeOptions={numberTypeOptions}
                commitmentOptions={commitmentOptions}
                packageOptions={packageOptions}
                onCheckDevice={showDevicesEsim}
              />

              <KycSection
                control={method.control}
                setValue={method.setValue}
                signature={signature}
                onOpenSignature={() => setIsSigning(true)}
                isEkycProcessing={isEkycProcessing}
                hasEkycInfo={hasEkycInfo}
              >
                <button
                  type="submit"
                  disabled={method.formState.isSubmitting || isEkycProcessing}
                  className="flex h-12 w-full items-center justify-center gap-5 rounded-lg bg-primary px-6 font-inter text-[16px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  <SendIcon />
                  {t("register.submit")}
                </button>
              </KycSection>
            </form>
          </div>
        </section>

        <FaqSection />
      </main>

      <Footer />

      <SignatureOverlay
        open={isSigning}
        onClose={() => setIsSigning(false)}
        onConfirm={(dataUrl) => {
          method.setValue("signature", dataUrl, { shouldValidate: true, shouldDirty: true });
          setIsSigning(false);
        }}
      />
    </div>
  );
}
