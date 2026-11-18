import 'server-only';
// =====================================================================================================
// TẦNG MẬT MÃ CỦA TÍCH HỢP CMP (chỉ chạy trên server)
// -----------------------------------------------------------------------------------------------------
// Chép nguyên logic từ gói mã mẫu của CMP (cmp-t3-relay-samples/jose.mjs); chỉ thêm comment.
// KHÔNG sửa logic file này: giữ giống hệt mẫu để hai bên chắc chắn khớp định dạng token.
//
// File này không biết gì về SkyFi, cookie hay khách hàng. Nó chỉ làm 3 việc:
//   1. Ký (signJws / createAssertionSigner): SkyFi ký "giấy giới thiệu" (assertion) gửi CMP.
//   2. Kiểm chữ ký (verifyJws): kiểm chữ ký CMP bên trong receipt.
//   3. Giải mã (decryptJwe): mở lớp mã hóa bên ngoài receipt bằng khóa riêng của SkyFi.
//
// Định dạng token (JOSE compact):
//   - JWS = header.payload.signature                       (3 phần, ngăn cách bằng dấu chấm)
//   - JWE = header.encryptedKey.iv.ciphertext.authTag      (5 phần)
// Chỉ hỗ trợ đúng profile CLIENT_RELAY: JWS RS256 và JWE RSA-OAEP-256 + A256GCM.
// Thuật toán bị cố định; giá trị trong header KHÔNG BAO GIỜ được dùng để chọn khóa từ URL hay khóa nhúng sẵn
// (chặn kiểu tấn công đổi thuật toán hoặc tự gửi kèm khóa giả).
// =====================================================================================================
import {
  constants,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  privateDecrypt,
  randomUUID,
  sign,
  verify,
} from "node:crypto";

/** Lỗi mật mã có mã ngắn (MALFORMED, BAD_SIGNATURE…) để route trả về và ghi log, không lộ chi tiết. */
export class JoseError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
// Header bị cấm: jku/x5u (tải khóa từ URL), jwk/x5c (nhúng khóa trong token) cho phép kẻ tấn công
// tự cung cấp khóa để "ký hợp lệ"; crit/zip làm phức tạp việc xử lý. Có header nào trong số này là từ chối.
const FORBIDDEN = ["jku", "jwk", "x5u", "x5c", "crit", "zip"];
// Giải mã base64url (dạng base64 an toàn cho URL mà JOSE dùng) thành Buffer.
const b64 = (value) => Buffer.from(value, "base64url");
// Giải mã một phần base64url thành object JSON; sai định dạng → MALFORMED.
const json = (value) => {
  try {
    const parsed = JSON.parse(b64(value).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed;
  } catch {
    throw new JoseError("MALFORMED");
  }
};
// Mỗi phần của token chỉ được chứa ký tự base64url (không padding, không khoảng trắng).
const canonical = (value) => /^[A-Za-z0-9_-]*$/.test(value);
/**
 * Nạp danh sách khóa JWK thành Map<kid, KeyObject>.
 * Chỉ nhận khóa RSA có kid, tối thiểu 2048 bit. usePrivate=true thì bắt buộc là khóa riêng (có trường d).
 * Lúc xác minh, khóa được tra theo kid TRONG Map này; không bao giờ nạp khóa lạ từ token.
 */
function keyMap(jwks, usePrivate) {
  const map = new Map();
  for (const jwk of Array.isArray(jwks) ? jwks : jwks.keys) {
    if (jwk.kty !== "RSA" || typeof jwk.kid !== "string")
      throw new Error("RSA JWK with kid required");
    if (usePrivate && !jwk.d) throw new Error("Private JWK required");
    const key = usePrivate
      ? createPrivateKey({ key: jwk, format: "jwk" })
      : createPublicKey({
          key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
          format: "jwk",
        });
    if (key.asymmetricKeyDetails.modulusLength < 2048)
      throw new Error("RSA key below 2048 bits");
    map.set(jwk.kid, key);
  }
  return map;
}
/** Khóa công khai (vd. khóa ký của CMP trong bundle.json) dùng để kiểm chữ ký. */
export function publicKeys(jwks) {
  return keyMap(jwks, false);
}
/** Khóa riêng của SkyFi (khóa giải mã receipt, khóa ký assertion). Không bao giờ log hay gửi đi. */
export function privateKeys(jwks) {
  return keyMap(jwks, true);
}

/**
 * Kiểm chữ ký JWS RS256 và trả về payload (claims) nếu hợp lệ.
 * @param token chuỗi JWS compact
 * @param keys  Map khóa công khai từ publicKeys()
 * @param type  giá trị typ bắt buộc (vd. "cmp-relay-receipt+jwt"), chống dùng nhầm loại token
 * Lưu ý: hàm này CHỈ kiểm chữ ký; kiểm nội dung (iss, aud, exp…) nằm ở receipts.js.
 */
export function verifyJws(token, keys, type) {
  // 1. Đúng 3 phần, chỉ chứa ký tự base64url.
  const parts = token.split(".");
  if (parts.length !== 3 || !parts.every(canonical))
    throw new JoseError("MALFORMED");
  // 2. Header phải đúng thuật toán, đúng loại token, có kid và không có header bị cấm.
  const header = json(parts[0]);
  if (
    header.alg !== "RS256" ||
    header.typ !== type ||
    typeof header.kid !== "string" ||
    FORBIDDEN.some((name) => name in header)
  )
    throw new JoseError("HEADER_REJECTED");
  // 3. Tìm khóa theo kid trong danh sách đã nạp sẵn; không có → UNKNOWN_KEY.
  const key = keys.get(header.kid);
  if (!key) throw new JoseError("UNKNOWN_KEY");
  // 4. Kiểm chữ ký RSA-SHA256 trên chuỗi "header.payload".
  const ok = verify(
    "RSA-SHA256",
    Buffer.from(parts[0] + "." + parts[1], "ascii"),
    key,
    b64(parts[2]),
  );
  if (!ok) throw new JoseError("BAD_SIGNATURE");
  // 5. Chữ ký đúng → trả về payload đã giải mã base64url.
  return json(parts[1]);
}

/**
 * Giải mã JWE (lớp "phong bì" bên ngoài receipt) và trả về nội dung bên trong (là một JWS).
 * Cơ chế: CMP sinh khóa AES ngẫu nhiên (CEK), mã hóa nội dung bằng AES-256-GCM, rồi mã hóa CEK bằng
 * khóa công khai RSA của SkyFi (RSA-OAEP-256). Chỉ SkyFi có khóa riêng nên chỉ SkyFi mở được.
 * AES-GCM còn có authTag: nội dung hay header bị sửa dù 1 byte là giải mã thất bại (DECRYPTION_FAILED).
 */
export function decryptJwe(token, keys) {
  // 1. Đúng 5 phần: header.encryptedKey.iv.ciphertext.authTag
  const parts = token.split(".");
  if (parts.length !== 5 || !parts.every(canonical))
    throw new JoseError("MALFORMED");
  // 2. Header phải đúng thuật toán mã hóa khóa (alg), mã hóa nội dung (enc), nội dung là JWT (cty).
  const header = json(parts[0]);
  if (
    header.alg !== "RSA-OAEP-256" ||
    header.enc !== "A256GCM" ||
    header.cty !== "JWT" ||
    typeof header.kid !== "string" ||
    FORBIDDEN.some((name) => name in header)
  )
    throw new JoseError("HEADER_REJECTED");
  // 3. Chọn khóa riêng theo kid (khóa mã hóa SkyFi đã đăng ký với CMP).
  const key = keys.get(header.kid);
  if (!key) throw new JoseError("UNKNOWN_KEY");
  // 4. AES-GCM chuẩn: IV 12 byte, authTag 16 byte.
  const iv = b64(parts[2]),
    tag = b64(parts[4]);
  if (iv.length !== 12 || tag.length !== 16) throw new JoseError("MALFORMED");
  try {
    // 5. Dùng khóa riêng RSA mở khóa AES (CEK); CEK phải đúng 32 byte (AES-256).
    const cek = privateDecrypt(
      { key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
      b64(parts[1]),
    );
    if (cek.length !== 32) throw new Error();
    // 6. Giải mã nội dung bằng AES-256-GCM; header được dùng làm AAD nên sửa header cũng bị phát hiện.
    const decipher = createDecipheriv("aes-256-gcm", cek, iv);
    decipher.setAAD(Buffer.from(parts[0], "ascii"));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(b64(parts[3])),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new JoseError("DECRYPTION_FAILED");
  }
}

/**
 * Ký JWS RS256: header {alg, typ, kid} + payload (claims), ký bằng khóa riêng của SkyFi.
 * CMP kiểm chữ ký này bằng khóa công khai SkyFi đã nhập trên CMS (mục "Khóa xác minh xác nhận danh tính").
 */
export function signJws(claims, privateJwk, type) {
  const header = { alg: "RS256", typ: type, kid: privateJwk.kid };
  const input =
    Buffer.from(JSON.stringify(header)).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(input, "ascii"),
    createPrivateKey({ key: privateJwk, format: "jwk" }),
  );
  return input + "." + signature.toString("base64url");
}

/**
 * Tạo "máy ký" assertion danh tính cho backend T3 (SkyFi) — "giấy giới thiệu" gửi CMP qua SDK.
 * Các giá trị cố định (issuer, audience, appId, environmentId) lấy từ bundle.json lúc khởi tạo;
 * mỗi lần ký chỉ truyền subject/kind/channel. subject luôn lấy từ phiên của T3, KHÔNG lấy từ request.
 * Claims (tài liệu mục 6):
 *   iss/aud        ai ký / gửi cho ai ("cmp")
 *   sub            ID trình duyệt (kind=BROWSER) hoặc ID người dùng (kind=ACCOUNT, làm sau)
 *   appId, environmentId  ứng dụng SKYFI và môi trường DEV/UAT/PROD
 *   kind, channel  BROWSER/ACCOUNT và WEB/IOS/ANDROID
 *   iat/exp        thời điểm ký / hết hạn (tối đa 60 giây)
 *   jti            UUID mới mỗi lần: CMP chỉ chấp nhận mỗi assertion một lần (chống dùng lại)
 */
export function createAssertionSigner({
  privateJwk,
  issuer,
  audience,
  appId,
  environmentId,
  ttlSeconds = 60,
}) {
  if (ttlSeconds > 60) throw new Error("Assertions live at most 60 seconds");
  // Nạp thử khóa ngay lúc khởi tạo để báo lỗi sớm nếu file khóa sai (thay vì lỗi khi khách đang dùng).
  privateKeys([privateJwk]);
  return ({ subject, kind, channel }) => {
    const now = Math.floor(Date.now() / 1000);
    return signJws(
      {
        iss: issuer,
        aud: audience,
        sub: subject,
        appId,
        environmentId,
        kind,
        channel,
        iat: now,
        exp: now + ttlSeconds,
        jti: randomUUID(),
      },
      privateJwk,
      "cmp-identity-assertion+jwt",
    );
  };
}
