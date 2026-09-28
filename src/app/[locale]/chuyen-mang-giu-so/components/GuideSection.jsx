"use client";

import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { ArrowRightIcon, StepIcons } from "./icons";
import { SectionHeading } from "./ui";

const STEP_ICONS = [StepIcons.request, StepIcons.review, StepIcons.message, StepIcons.sim, StepIcons.payment];

/** 5 bước hướng dẫn chuyển mạng, mỗi thẻ 181px trên desktop. */
const GuideSection = () => {
  const t = useTranslations("mnp.guide");
  const steps = t.raw("steps");

  return (
    <section className="w-full bg-white py-8 lg:py-3">
      <div className="mx-auto w-full max-w-[1272px] px-4 md:px-6 lg:px-0">
        <SectionHeading lead={t("headingLead")} rest={t("headingRest")} leadTone="dark" />

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-0 lg:flex lg:items-stretch lg:justify-center lg:gap-[14px] lg:py-6">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index];
            return (
              <Fragment key={step.title}>
                <div className="flex flex-col items-center gap-[13px] lg:w-[181px]">
                  <div className="flex w-full flex-1 flex-col gap-[10px] rounded-[10px] border border-[#EAEAEA] px-2 py-3 lg:min-h-[248px]">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF6F3]">
                      <Icon />
                    </div>
                    <div className="flex flex-col gap-[10px] px-1">
                      <h3 className="font-inter text-[12px] font-bold leading-[15px] text-[#333]">
                        {index + 1}. {step.title}
                      </h3>
                      {step.lines.map((line) => (
                        <p key={line} className="font-inter text-[12px] leading-[15px] text-[#979797]">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-primary font-inter text-[10px] font-bold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                {index < steps.length - 1 ? (
                  <ArrowRightIcon className="hidden h-6 w-6 shrink-0 self-center text-[#EC242A] lg:block" />
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GuideSection;
