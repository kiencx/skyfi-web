import axios from "axios";
import { get, post } from "./api/base";

/**
 * Dịch vụ chuyển mạng giữ số (MNP - Mobile Number Portability).
 * BE: MnpRegistrationAppController (bss-api) — `/app/mnp/*`.
 */
const MNP_REGISTER_URL = "/app/mnp/register";
const MNP_NUMBER_TYPES_URL = "/app/mnp/number-types";
const MNP_PACKAGES_URL = "/app/mnp/packages";

/**
 * eKYC đi qua proxy của BE (`/app/ekyc/v1/*`) để token provider không nằm trong bundle
 * trình duyệt. Proxy trả NGUYÊN body provider (code 0 = thành công), không bọc envelope
 * BaseResponse, nên gọi thẳng axios thay vì qua interceptor của api/base.
 */
const ekycPost = async (path, body) => {
  try {
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/app/ekyc${path}`, body);
    return res.data?.code === 0 ? res.data.result : res.data;
  } catch (error) {
    return error?.response?.data || { code: -1, message: error.message };
  }
};

const getInfoCardBoth = (imgFront, imgBack) =>
  ekycPost("/v1/ocr", { image_front_base64: imgFront, image_back_base64: imgBack });

const faceMatching = (imgFront, imgFace) =>
  ekycPost("/v1/face_matching", { image_front_base64: imgFront, image_face_base64: imgFace });

/** Ghép địa chỉ nhận SIM đầy đủ để BSS hiển thị được ngay, kèm id tỉnh/huyện/xã. */
const buildShipping = (form) => {
  if (form.sim_type !== "USIM") return null;
  return {
    address: [form.address, form.ward_name, form.district_name, form.city_name].filter(Boolean).join(", "),
    city_id: form.city_id || null,
    district_id: form.district_id || null,
    ward_id: form.ward_id || null,
    receiver_phone: form.receiver_phone,
    receiver_name: form.receiver_name,
  };
};

/**
 * Payload gửi lên BE. Ảnh KYC và chữ ký gửi dạng base64 data URL. Thông tin bóc tách ở
 * `kyc` chỉ để BE tham khảo khi OCR phía server lỗi — BE luôn tự OCR lại.
 */
const buildPayload = (form) => ({
  msisdn: form.msisdn,
  dno: form.dno,
  subscriber_type: form.subscriber_type,
  number_type: form.number_type || null,
  commitment: form.commitment || null,
  contact_phone: form.contact_phone,
  email: form.email,
  sim_type: form.sim_type,
  package_code: form.package_code || null,
  shipping: buildShipping(form),
  kyc: {
    doc_type: form.doc_type,
    id_card_front: form.id_card_front,
    id_card_back: form.doc_type === "PASSPORT" ? null : form.id_card_back,
    portrait: form.portrait,
    full_name: form.full_name || null,
    id_number: form.id_number || null,
    birth_day: form.birth_day || null,
    gender: form.gender || null,
    issue_date: form.issue_date || null,
    issue_place: form.issue_place || null,
    residence: form.residence || null,
    current_address: form.current_address || null,
  },
  signature: form.signature,
});

/**
 * Trả `{ success, code }` khi thành công; lỗi nghiệp vụ trả thêm `errorCode`
 * (MNP_IS_SKYFI, MNP_PENDING, OCR_INVALID, DOC_EXPIRED, UNDER_AGE, ...) và `pendingCode`.
 */
const register = async (form) => {
  try {
    const res = await post(MNP_REGISTER_URL, buildPayload(form));
    return { success: true, code: res.data?.code, message: res.message };
  } catch (error) {
    return {
      success: false,
      message: error?.message,
      errorCode: error?.data?.error_code,
      pendingCode: error?.data?.pending_code,
    };
  }
};

/** Danh mục "Loại số" - fallback về danh sách tĩnh nếu BE chưa có API. */
const getNumberTypes = async () => {
  try {
    const res = await get(MNP_NUMBER_TYPES_URL);
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch (error) {
    return [];
  }
};

/** Gói cước đăng ký khi chuyển mạng (đã loại SF99, SF179, SF399 phía BE). */
const getPackages = async () => {
  try {
    const res = await get(MNP_PACKAGES_URL);
    return res.success && Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    return [];
  }
};

const MnpService = {
  register,
  getNumberTypes,
  getPackages,
  getInfoCardBoth,
  faceMatching,
  buildPayload,
};

export default MnpService;
