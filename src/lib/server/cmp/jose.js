import 'server-only';
// Chép nguyên logic từ gói mã mẫu của CMP (cmp-t3-relay-samples/jose.mjs); chỉ dịch comment.
// JOSE dạng compact, chỉ cho profile CLIENT_RELAY cố định: JWS RS256 và JWE RSA-OAEP-256/A256GCM.
// Thuật toán được cố định theo cấu hình; giá trị trong header không bao giờ được dùng để chọn khóa
// từ URL hay từ khóa nhúng sẵn.
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

export class JoseError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const FORBIDDEN = ["jku", "jwk", "x5u", "x5c", "crit", "zip"];
const b64 = (value) => Buffer.from(value, "base64url");
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
const canonical = (value) => /^[A-Za-z0-9_-]*$/.test(value);
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
export function publicKeys(jwks) {
  return keyMap(jwks, false);
}
export function privateKeys(jwks) {
  return keyMap(jwks, true);
}

export function verifyJws(token, keys, type) {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts.every(canonical))
    throw new JoseError("MALFORMED");
  const header = json(parts[0]);
  if (
    header.alg !== "RS256" ||
    header.typ !== type ||
    typeof header.kid !== "string" ||
    FORBIDDEN.some((name) => name in header)
  )
    throw new JoseError("HEADER_REJECTED");
  const key = keys.get(header.kid);
  if (!key) throw new JoseError("UNKNOWN_KEY");
  const ok = verify(
    "RSA-SHA256",
    Buffer.from(parts[0] + "." + parts[1], "ascii"),
    key,
    b64(parts[2]),
  );
  if (!ok) throw new JoseError("BAD_SIGNATURE");
  return json(parts[1]);
}

export function decryptJwe(token, keys) {
  const parts = token.split(".");
  if (parts.length !== 5 || !parts.every(canonical))
    throw new JoseError("MALFORMED");
  const header = json(parts[0]);
  if (
    header.alg !== "RSA-OAEP-256" ||
    header.enc !== "A256GCM" ||
    header.cty !== "JWT" ||
    typeof header.kid !== "string" ||
    FORBIDDEN.some((name) => name in header)
  )
    throw new JoseError("HEADER_REJECTED");
  const key = keys.get(header.kid);
  if (!key) throw new JoseError("UNKNOWN_KEY");
  const iv = b64(parts[2]),
    tag = b64(parts[4]);
  if (iv.length !== 12 || tag.length !== 16) throw new JoseError("MALFORMED");
  try {
    const cek = privateDecrypt(
      { key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
      b64(parts[1]),
    );
    if (cek.length !== 32) throw new Error();
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

/** Hàm ký assertion danh tính cho backend T3; subject luôn lấy từ phiên của T3, không lấy từ request. */
export function createAssertionSigner({
  privateJwk,
  issuer,
  audience,
  appId,
  environmentId,
  ttlSeconds = 60,
}) {
  if (ttlSeconds > 60) throw new Error("Assertions live at most 60 seconds");
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
