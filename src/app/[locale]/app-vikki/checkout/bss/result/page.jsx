"use client";

import { Button } from "@/app/components/ui/Button";
import Header from "@/app/components/vikki/sim-data/Header";
import { useUserState } from "@/app/stores/user";
import {
  BSS_LAST_ORDER_KEY,
  fetchBssOrder,
  formatBssPrice,
  getRequestErrorMessage,
} from "@/app/utils/bssCatalog";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const PAID_STATUSES = ["PAID", "COMPLETED"];
const FAILED_STATUSES = ["PAYMENT_FAILED", "CANCELLED", "PROVISIONING_FAILED", "REFUNDED"];
const KNOWN_STATUSES = ["AWAITING_PAYMENT", "PAID", "PROVISIONING", "COMPLETED", ...FAILED_STATUSES];
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 8;

export default function VikkiBssResultPage() {
  const t = useTranslations("vikki.travelEsim.bss.result");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId } = useUserState();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const pollCount = useRef(0);
  const timer = useRef(null);

  const orderNumber = searchParams.get("orderNumber") || searchParams.get("order_number");

  const loadOrder = useCallback(async ({ silent = false } = {}) => {
    const orderCode = orderNumber || window.sessionStorage.getItem(BSS_LAST_ORDER_KEY);
    if (!orderCode) {
      setError(t("errNoOrder"));
      setIsLoading(false);
      return null;
    }
    if (!silent) setIsLoading(true);
    setError("");
    try {
      const next = await fetchBssOrder(orderCode);
      setOrder(next);
      return next;
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, t("errCheck")));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber, t]);

  // The redirect back from GalaxyPay is not proof of payment: keep polling
  // (bounded) until the order leaves a pending state.
  useEffect(() => {
    let cancelled = false;
    pollCount.current = 0;

    const tick = async () => {
      const next = await loadOrder({ silent: pollCount.current > 0 });
      if (cancelled) return;
      const pending = !next || ["AWAITING_PAYMENT", "PAID", "PROVISIONING"].includes(next.status);
      if (next && pending && pollCount.current < MAX_POLLS) {
        pollCount.current += 1;
        timer.current = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [loadOrder]);

  const status = order?.status;
  const isSuccess = PAID_STATUSES.includes(status);
  const isFailed = FAILED_STATUSES.includes(status);
  const statusLabel = KNOWN_STATUSES.includes(status) ? t(`statuses.${status}`) : status;

  const goHome = () => router.push(sessionId ? `/app-vikki?sessionId=${sessionId}` : "/app-vikki");

  return (
    <div className="flex min-h-screen flex-col bg-[#F2F2F7]">
      <Header title={t("title")} onBack={goHome} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <section className="rounded-xl bg-white p-5 text-center shadow-sm">
          <h2 className={`text-[18px] font-bold ${isFailed ? "text-red-600" : "text-[#0C0C0E]"}`}>
            {isSuccess ? t("success") : isFailed ? t("failed") : t("pending")}
          </h2>
          {isLoading && !order && <p className="mt-4 text-[14px] text-[#898C93]">{t("checking")}</p>}
          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}
          {order && (
            <div className="mt-5 space-y-2 text-left text-[14px]">
              <p><strong>{t("orderCode")}:</strong> {order.order_number}</p>
              <p><strong>{t("status")}:</strong> {statusLabel}</p>
              <p><strong>{t("total")}:</strong> {formatBssPrice(order.total_amount, order.currency || "VND", locale)}</p>
              {isSuccess && <p className="text-[13px] text-[#898C93]">{t("emailNote")}</p>}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => loadOrder()} className="w-full">{t("recheck")}</Button>
          <Button onClick={goHome} className="w-full">{t("home")}</Button>
        </div>
      </div>
    </div>
  );
}
