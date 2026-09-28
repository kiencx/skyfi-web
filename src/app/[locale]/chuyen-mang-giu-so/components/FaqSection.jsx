"use client";

import faqService from "@/app/services/faqService";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChevronDownIcon } from "./icons";

const PAGE_SIZE = 4;

/**
 * Câu hỏi thường gặp - layout theo Figma nhưng nội dung lấy từ API FAQ đang dùng
 * cho các trang khác (`/app/faq`), không dùng dữ liệu mẫu trong file thiết kế.
 */
const FaqSection = () => {
  const t = useTranslations("mnp.faq");
  const locale = useLocale();
  const [questions, setQuestions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    let mounted = true;
    const fetchFAQs = async () => {
      const res = await faqService.getFAQs(locale);
      if (mounted && res?.success && Array.isArray(res.data)) {
        setQuestions(res.data);
      }
    };
    fetchFAQs();
    return () => {
      mounted = false;
    };
  }, [locale]);

  if (questions.length === 0) return null;

  return (
    <section className="w-full bg-white py-[30px]">
      <div className="mx-auto w-full max-w-[1272px] px-4 md:px-6 lg:px-0">
        <h2 className="text-center font-inter text-[28px] font-bold text-[#333] md:text-[38px] lg:text-[48px]">
          {t("title")}
        </h2>

        <div className="mt-[30px] flex flex-col gap-4">
          {questions.slice(0, visible).map((question, index) => {
            const id = question.id ?? index;
            const isOpen = openId === id;
            return (
              <div key={id} className="rounded-2xl bg-white px-6 py-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)] md:px-10">
                <div className="flex items-start gap-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <h3 className="font-inter text-[16px] font-semibold leading-6 text-[#333]">
                      {question.display_title}
                    </h3>
                    {question.category_name ? (
                      <p className="font-inter text-[14px] leading-5 text-[#979797]">{question.category_name}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : id)}
                    className="flex shrink-0 items-center gap-2 font-inter text-[14px] font-bold text-[#333] md:text-[16px]"
                  >
                    {isOpen ? t("hideAnswer") : t("showAnswer")}
                    <ChevronDownIcon className={`h-5 w-5 text-[#333] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <hr className="my-4 border-[#F1F1F1]" />
                  <p className="whitespace-pre-line font-inter text-[15px] leading-7 text-[#5C5C5C] md:text-[16px]">
                    {question.display_content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {visible < questions.length ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((current) => current + PAGE_SIZE)}
              className="h-12 rounded-lg bg-primary px-6 font-inter text-[16px] font-semibold text-white transition-colors hover:bg-primary/90"
            >
              {t("showMore")}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default FaqSection;
