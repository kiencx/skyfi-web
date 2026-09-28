"use client";

import clsx from "clsx";
import { useController } from "react-hook-form";
import { ExclamationBadge } from "./icons";

/**
 * Tiêu đề section hai màu: phần `lead` màu nhấn, phần `rest` màu còn lại.
 * Theo Figma: Inter 48px/700, canh giữa.
 */
export const SectionHeading = ({ lead, rest, leadTone = "danger", underline = false }) => (
  <div className="flex flex-col items-center">
    <h2 className="text-center font-inter font-bold text-[28px] leading-[1.25] md:text-[38px] lg:text-[48px]">
      <span className={leadTone === "danger" ? "text-[#EC242A]" : "text-[#363F54]"}>{lead} </span>
      <span className={leadTone === "danger" ? "text-[#363F54]" : "text-[#EC242A]"}>{rest}</span>
    </h2>
    {underline ? <span className="mt-3 h-1 w-[164px] rounded-full bg-[#FF9500]" /> : null}
  </div>
);

/**
 * Nhãn cho nhóm radio và select (Inter 16px/700, dấu * đỏ).
 * Các ô nhập text dùng nhãn sẵn có của InputField.
 */
export const FieldLabel = ({ children, required, optional, className }) => (
  <span className={clsx("flex items-center gap-1 font-inter text-[16px] leading-[28px] text-[#333]", className)}>
    <span className="font-bold">{children}</span>
    {optional ? <span className="font-normal text-[#333]">{optional}</span> : null}
    {required ? <span className="font-bold text-[#E60A32]">*</span> : null}
  </span>
);

/** Hiển thị lỗi cho các field không phải InputField (radio group, upload, chữ ký...). */
export const FieldError = ({ control, name }) => {
  const {
    fieldState: { error },
  } = useController({ control, name });
  if (!error) return null;
  return <span className="font-inter text-[12px] text-[#E60A32]">{error.message}</span>;
};

/** Box cảnh báo nền hồng (bắt buộc nhập khi chọn SIM vật lý). */
export const AlertBox = ({ children }) => (
  <div className="flex items-center gap-[10px] rounded-lg bg-[#FFF6F3] px-4 py-[10px]">
    <ExclamationBadge tone="danger" />
    <p className="font-inter text-[15px] font-semibold leading-[28px] text-[#EC242A] md:text-[16px]">{children}</p>
  </div>
);

/** Box ghi chú nền xám nhạt. */
export const HintBox = ({ children }) => (
  <div className="flex items-center gap-[10px] rounded-lg bg-[#F4F4F4] px-4 py-[6px]">
    <ExclamationBadge tone="muted" />
    <p className="font-inter text-[14px] leading-[28px] text-[#B1B1B1]">{children}</p>
  </div>
);

/** Class dùng chung cho ô nhập, khớp token Figma: cao 45px, bo 8px, viền #D8D8D8. */
export const INPUT_CLASS = "h-[45px] rounded-lg border-[#D8D8D8] placeholder:text-[#808080]";

/**
 * Class dùng chung cho nhãn của InputField, khớp Figma: Inter 16px/700.
 * `gap-1` để dấu * không dính sát chữ (nhãn của InputField là flex container).
 */
export const LABEL_CLASS = "!text-[16px] gap-1 font-bold leading-[28px] text-[#333]";

/** Style cho react-select để giống ô nhập trong thiết kế. */
export const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 45,
    height: 45,
    borderRadius: 8,
    borderColor: state.isFocused ? "#FAA61A" : "#D8D8D8",
    boxShadow: "none",
    paddingLeft: 6,
    ":hover": { borderColor: state.isFocused ? "#FAA61A" : "#D8D8D8" },
  }),
  placeholder: (base) => ({ ...base, color: "#808080", fontSize: 16 }),
  singleValue: (base) => ({ ...base, color: "#333", fontSize: 16 }),
  input: (base) => ({ ...base, fontSize: 16, color: "#333" }),
  indicatorSeparator: () => ({ display: "none" }),
  option: (base, state) => ({
    ...base,
    color: "rgb(24, 24, 24)",
    backgroundColor: state.isSelected ? "rgb(241, 241, 242)" : "white",
    borderRadius: 8,
    padding: "10px 16px",
    ":hover": { background: "rgb(241, 241, 242)" },
  }),
};
