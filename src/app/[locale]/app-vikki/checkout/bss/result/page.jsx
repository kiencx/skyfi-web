"use client";

import { Button } from "@/app/components/ui/Button";
import Header from "@/app/components/vikki/sim-data/Header";
import { useUserState } from "@/app/stores/user";
import {
  BSS_BRANDS,
  BSS_LAST_ORDER_KEY,
  BSS_LAST_PAYMENT_MESSAGE_KEY,
  fetchBssBill,
  fetchBssOrder,
  formatBssPrice,
  getRequestErrorMessage,
  postVikkiPaymentMessage,
} from "@/app/utils/bssCatalog";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const BRAND = BSS_BRANDS.VIKKI;
const PAID_STATUSES = ["PAID", "COMPLETED"];
const PENDING_STATUSES = ["AWAITING_PAYMENT", "PAID", "PROVISIONING"];
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
  const [billStatus, setBillStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState(null);
  const pollCount = useRef(0);
  const timer = useRef(null);

  const billIdParam = searchParams.get("bill_id") || searchParams.get("orderNumber");

  const loadOrder = useCallback(async ({ silent = false } = {}) => {
    const billId = billIdParam || window.sessionStorage.getItem(BSS_LAST_ORDER_KEY);
    if (!billId) {
      setError(t("errNoOrder"));
      setIsLoading(false);
      return null;
    }
    if (!silent) setIsLoading(true);
    setError("");
    try {
      const [nextOrder, bill] = await Promise.all([
        fetchBssOrder(billId, BRAND),
        fetchBssBill(billId, BRAND).catch(() => null),
      ]);
      setOrder(nextOrder);
      setBillStatus(bill?.bill_status || "");
      return { order: nextOrder, billStatus: bill?.bill_status };
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, t("errCheck")));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [billIdParam, t]);

  useEffect(() => {
    try {
      setPaymentMessage(JSON.parse(window.sessionStorage.getItem(BSS_LAST_PAYMENT_MESSAGE_KEY) || "null"));
    } catch {
      setPaymentMessage(null);
    }
  }, []);

  // Reopening the callback URL is not proof of payment: the bank confirms the
  // bill server-to-server, so keep polling (bounded) while it is still pending.
  useEffect(() => {
    let cancelled = false;
    pollCount.current = 0;

    const tick = async () => {
      const next = await loadOrder({ silent: pollCount.current > 0 });
      if (cancelled) return;
      const pending = next && next.billStatus !== "expired" && PENDING_STATUSES.includes(next.order?.status);
      if (pending && pollCount.current < MAX_POLLS) {
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
  const isExpired = billStatus === "expired" && !PAID_STATUSES.includes(status);
  const isSuccess = PAID_STATUSES.includes(status);
  const isFailed = FAILED_STATUSES.includes(status);
  const canPay = status === "AWAITING_PAYMENT" && !isExpired &&
    paymentMessage?.bill_id === order?.order_number;
  const statusLabel = KNOWN_STATUSES.includes(status) ? t(`statuses.${status}`) : status;

  const goHome = () => router.push(sessionId ? `/app-vikki?sessionId=${sessionId}` : "/app-vikki");
  const buyAgain = () => router.push("/app-vikki/travel-esim");
  const payAgain = () => {
    if (!postVikkiPaymentMessage(paymentMessage)) setError(t("errNoApp"));
  };

  const title = isSuccess ? t("success") : isExpired ? t("expired") : isFailed ? t("failed") : t("pending");

  return (
    <div className="flex min-h-screen flex-col bg-[#F2F2F7]">
      <Header title={t("title")} onBack={goHome} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <section className="rounded-xl bg-white p-5 text-center shadow-sm">
          <h2 className={`text-[18px] font-bold ${isFailed || isExpired ? "text-red-600" : "text-[#0C0C0E]"}`}>
            {title}
          </h2>
          {isLoading && !order && <p className="mt-4 text-[14px] text-[#898C93]">{t("checking")}</p>}
          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}
          {order && (
            <div className="mt-5 space-y-2 text-left text-[14px]">
              <p className="break-all"><strong>{t("orderCode")}:</strong> {order.order_number}</p>
              <p><strong>{t("status")}:</strong> {isExpired ? t("expired") : statusLabel}</p>
              <p><strong>{t("total")}:</strong> {formatBssPrice(order.total_amount, order.currency || "VND", locale)}</p>
              {isSuccess && <p className="text-[13px] text-[#898C93]">{t("emailNote")}</p>}
              {isExpired && <p className="text-[13px] text-[#898C93]">{t("expiredNote")}</p>}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3">
          {canPay && <Button onClick={payAgain} className="w-full">{t("payAgain")}</Button>}
          {!isSuccess && !isExpired && (
            <Button variant="outline" onClick={() => loadOrder()} className="w-full">{t("recheck")}</Button>
          )}
          {isExpired || isFailed ? (
            <Button onClick={buyAgain} className="w-full">{t("buyAgain")}</Button>
          ) : (
            <Button variant={canPay ? "outline" : undefined} onClick={goHome} className="w-full">{t("home")}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
