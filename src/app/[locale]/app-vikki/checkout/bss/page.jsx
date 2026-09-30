"use client";

import { Button } from "@/app/components/ui/Button";
import Header from "@/app/components/vikki/sim-data/Header";
import { useUserActions, useUserState } from "@/app/stores/user";
import {
  BSS_BRANDS,
  BSS_LAST_BRAND_KEY,
  BSS_LAST_ORDER_KEY,
  createBssOrder,
  fetchBssPackagePrice,
  formatBssPrice,
  getRequestErrorMessage,
  readBssCheckoutItem,
} from "@/app/utils/bssCatalog";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const BRAND = BSS_BRANDS.VIKKI;

const inputClass =
  "w-full rounded-lg border border-[#E6E7EB] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#0000FF]";

export default function VikkiBssCheckoutPage() {
  const t = useTranslations("vikki.travelEsim.bss.checkout");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const packageId = searchParams.get("packageId");
  const { user } = useUserState();
  const { convertPhoneFormat } = useUserActions();

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [price, setPrice] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const idempotencyRef = useRef(null);
  const [form, setForm] = useState({
    customer_name: "",
    contact_phone: "",
    email: "",
    agree_terms: false,
  });

  // Prefill from the logged-in Vikki user, without overriding what was typed.
  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      customer_name: current.customer_name || user.full_name || user.name || "",
      contact_phone:
        current.contact_phone ||
        (user.phone ? convertPhoneFormat(String(user.phone)) : ""),
      email: current.email || user.email || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const item = readBssCheckoutItem();
    if (!item?.package_id || String(item.package_id) !== String(packageId)) {
      setError(t("errNoPackage"));
      setIsLoadingPrice(false);
      return undefined;
    }
    setSelectedPackage(item);

    let isCurrent = true;
    fetchBssPackagePrice({
      packageId: item.package_id,
      quantity: item.quantity,
      brand: BRAND,
    })
      .then((data) => { if (isCurrent) setPrice(data); })
      .catch((requestError) => {
        if (isCurrent) setError(getRequestErrorMessage(requestError, t("errPrice")));
      })
      .finally(() => { if (isCurrent) setIsLoadingPrice(false); });
    return () => { isCurrent = false; };
  }, [packageId, t]);

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!selectedPackage || !price || isSubmitting) return;
    if (!form.agree_terms) {
      setError(t("errAgree"));
      return;
    }

    const order = {
      customer_name: form.customer_name.trim(),
      contact_phone: form.contact_phone.trim(),
      email: form.email.trim(),
      items: [
        { package_id: selectedPackage.package_id, quantity: selectedPackage.quantity },
      ],
    };

    // Same payload => same key, so a retry after a network error cannot create
    // a second order.
    const fingerprint = JSON.stringify(order);
    if (idempotencyRef.current?.fingerprint !== fingerprint) {
      idempotencyRef.current = { key: crypto.randomUUID(), fingerprint };
    }

    setError("");
    setIsSubmitting(true);
    try {
      const created = await createBssOrder({
        order,
        brand: BRAND,
        idempotencyKey: idempotencyRef.current.key,
      });
      window.sessionStorage.setItem(BSS_LAST_ORDER_KEY, created.order_number);
      window.sessionStorage.setItem(BSS_LAST_BRAND_KEY, BRAND);
      setOrderNumber(created.order_number);

      if (created.payment_url) {
        window.location.assign(created.payment_url);
        return;
      }
      setError(t("errNoPaymentUrl"));
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, t("errCreate")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const amount = price?.total_price ?? price?.unit_price;
  const currency = price?.currency || selectedPackage?.currency || "VND";

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] text-[#0C0C0E]">
      <Header title={t("title")} />

      <form onSubmit={submitOrder} className="flex flex-1 flex-col gap-4 p-4 pb-8">
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-[15px] font-semibold">{t("orderSummary")}</h2>
          {selectedPackage && (
            <div className="mt-3 border-b border-[#F1F1F1] pb-3">
              <p className="break-words text-[14px] font-semibold">{selectedPackage.name}</p>
              <p className="mt-1 text-[13px] text-[#898C93]">
                {t("packageCount", {
                  quantity: selectedPackage.quantity,
                  days: selectedPackage.validity_days || "—",
                })}
              </p>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[14px]">{t("total")}</span>
            <strong className="text-[18px] text-[#D2008C]">
              {isLoadingPrice ? t("checkingPrice") : formatBssPrice(amount, currency, locale)}
            </strong>
          </div>
          <p className="mt-2 text-[11px] text-[#898C93]">{t("priceNote")}</p>
        </section>

        <section className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-[13px] text-[#898C93]">{t("subtitle")}</p>
          <label className="flex flex-col gap-2 text-[13px] font-medium">
            {t("fullName")}
            <input
              required
              name="customer_name"
              autoComplete="name"
              value={form.customer_name}
              onChange={updateField}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-medium">
            {t("phone")}
            <input
              required
              type="tel"
              name="contact_phone"
              autoComplete="tel"
              value={form.contact_phone}
              onChange={updateField}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-medium">
            {t("email")}
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              className={inputClass}
            />
          </label>
          <label className="flex items-start gap-3 text-[13px] text-[#555]">
            <input
              required
              type="checkbox"
              name="agree_terms"
              checked={form.agree_terms}
              onChange={updateField}
              className="mt-1"
            />
            {t("agree")}
          </label>
        </section>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
            {orderNumber && (
              <>
                {" "}
                {t("orderCode")}: <strong>{orderNumber}</strong>.
              </>
            )}
          </p>
        )}

        <Button
          type="submit"
          className="w-full disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoadingPrice || !price || isSubmitting}
        >
          {isSubmitting ? t("creating") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
