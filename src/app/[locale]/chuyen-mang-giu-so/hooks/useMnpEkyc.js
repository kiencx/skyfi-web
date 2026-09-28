"use client";

import MnpService from "@/app/services/mnpService";
import {
  formatImageForApi,
  getEkycMessage,
  getFaceMatchingMessage,
  isAtLeast14YearsOld,
} from "@/app/utils/ekyc";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "react-toastify";

/** Các field được điền tự động từ kết quả bóc tách eKYC. */
export const EKYC_INFO_FIELDS = [
  "full_name",
  "id_number",
  "birth_day",
  "gender",
  "issue_date",
  "issue_place",
  "residence",
  "current_address",
  "face_score",
];

/** CCCD gắn chip / thẻ căn cước mới, không nhận CMND cũ và hộ chiếu. */
const isSupportedCardType = (cardType) => cardType === "cccd" || cardType === "new_chip" || cardType === "id_card";

const isExpired = (expiredDate) => {
  if (!expiredDate) return false;
  return moment().isAfter(moment(expiredDate, "DD/MM/YYYY"));
};

/**
 * Tự động gọi eKYC khi khách đã tải đủ 3 ảnh CCCD (mặt trước, mặt sau, chân dung).
 *
 *  1. `getInfoCardBoth` - bóc tách thông tin từ 2 mặt giấy tờ
 *  2. `faceMatching`    - lấy điểm so khớp chân dung (chỉ lưu, không chặn — TL mục 5.3)
 *
 * Đây là kiểm tra sớm cho KH đỡ phải gửi lại; BE luôn tự OCR lại khi nhận hồ sơ. Gọi qua
 * proxy BE nên token provider không lộ ra trình duyệt. Hộ chiếu không OCR ở đây — BE xử lý.
 *
 * Ảnh nào gây lỗi sẽ bị xoá để khách tải lại, đồng thời các field thông tin
 * đã bóc tách cũng được reset.
 */
export const useMnpEkyc = ({ control, setValue }) => {
  const [docType, idCardFront, idCardBack, portrait] = useWatch({
    control,
    name: ["doc_type", "id_card_front", "id_card_back", "portrait"],
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInfo, setHasInfo] = useState(false);

  // Bộ ảnh đã xử lý gần nhất - tránh gọi lại API khi component re-render
  const processedRef = useRef({ front: null, back: null, portrait: null });
  // Định danh lượt gọi hiện tại - bỏ qua kết quả cũ nếu khách đổi ảnh giữa chừng
  const requestIdRef = useRef(0);

  useEffect(() => {
    const clearInfo = () => {
      EKYC_INFO_FIELDS.forEach((name) => setValue(name, ""));
      setHasInfo(false);
    };

    const clearImage = (name) => {
      processedRef.current = { front: null, back: null, portrait: null };
      setValue(name, "", { shouldValidate: true });
    };

    if (docType === "PASSPORT" || !idCardFront || !idCardBack || !portrait) {
      processedRef.current = { front: null, back: null, portrait: null };
      if (hasInfo) clearInfo();
      return;
    }

    const processed = processedRef.current;
    if (processed.front === idCardFront && processed.back === idCardBack && processed.portrait === portrait) {
      return;
    }
    processedRef.current = { front: idCardFront, back: idCardBack, portrait };

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const isStale = () => requestIdRef.current !== requestId;

    const runEkyc = async () => {
      setIsProcessing(true);
      try {
        // 1. Bóc tách thông tin từ 2 mặt giấy tờ
        const cardInfo = await MnpService.getInfoCardBoth(
          formatImageForApi(idCardFront),
          formatImageForApi(idCardBack)
        );
        if (isStale()) return;

        if (cardInfo?.code !== undefined && cardInfo?.code !== 0) {
          clearInfo();
          clearImage("id_card_back");
          toast.error(getEkycMessage(cardInfo.code) || cardInfo?.message);
          return;
        }
        if (!isSupportedCardType(cardInfo?.card_type)) {
          clearInfo();
          clearImage("id_card_front");
          toast.error("Giấy tờ không hợp lệ. Vui lòng dùng căn cước công dân gắn chip");
          return;
        }
        if (isExpired(cardInfo?.expired_date)) {
          clearInfo();
          clearImage("id_card_front");
          toast.error("CCCD đã hết hạn");
          return;
        }
        if (cardInfo?.dob && !isAtLeast14YearsOld(cardInfo.dob)) {
          clearInfo();
          clearImage("id_card_front");
          toast.error("Vui lòng sử dụng giấy tờ trên 14 tuổi!");
          return;
        }

        // 2. So khớp khuôn mặt với ảnh mặt trước
        const faceResult = await MnpService.faceMatching(
          formatImageForApi(idCardFront),
          formatImageForApi(portrait)
        );
        if (isStale()) return;

        // Lỗi ảnh chân dung (không thấy khuôn mặt...) vẫn báo để KH chụp lại; điểm so khớp
        // thấp thì không chặn, nhân viên xem điểm trên BSS (TL mục 5.3).
        if (faceResult?.code !== undefined && faceResult?.code !== 0) {
          clearInfo();
          clearImage("portrait");
          toast.error(getFaceMatchingMessage(faceResult.code) || faceResult?.message);
          return;
        }

        // 3. Điền thông tin vào form
        setValue("full_name", cardInfo?.name || "");
        setValue("id_number", cardInfo?.idnumber || "");
        setValue("birth_day", cardInfo?.dob || "");
        setValue("gender", cardInfo?.gender || "");
        setValue("issue_date", cardInfo?.issue_date || "");
        setValue("issue_place", cardInfo?.issued_place || "");
        setValue("residence", cardInfo?.address || "");
        setValue("current_address", cardInfo?.address || "");
        setValue("face_score", faceResult?.face_score ?? "");
        setHasInfo(true);
      } catch (error) {
        if (isStale()) return;
        console.error("Lỗi eKYC:", error);
        clearInfo();
        clearImage("id_card_front");
        toast.error("Có lỗi xảy ra khi xác thực giấy tờ. Vui lòng thử lại!");
      } finally {
        if (!isStale()) setIsProcessing(false);
      }
    };

    runEkyc();
    // `hasInfo` chỉ dùng để dọn dẹp, không cần chạy lại effect khi nó đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType, idCardFront, idCardBack, portrait, setValue]);

  return { isProcessing, hasInfo };
};

export default useMnpEkyc;
