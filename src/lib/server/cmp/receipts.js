import 'server-only';
// Chuyển từ gói mã mẫu của CMP (cmp-t3-relay-samples/receipts.mjs). Các bước xác minh và quy tắc
// chống trùng/so revision giữ nguyên; chỉ bỏ bảng business_operation dùng cho demo đặt hàng.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { JoseError, decryptJwe, privateKeys, publicKeys, verifyJws } from './jose';

export const RECEIPT_TYPE = 'cmp-relay-receipt+jwt';

/**
 * Đọc kid trong header (phần đầu của JWE/JWS compact) chỉ để ghi log (tài liệu mục 15).
 * Không dùng để chọn khóa; lỗi định dạng trả về undefined.
 */
export const peekKid = (token) => {
  try {
    const kid = JSON.parse(Buffer.from(String(token).split('.')[0], 'base64url').toString('utf8'))?.kid;
    return typeof kid === 'string' ? kid.slice(0, 128) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Xác minh receipt ngoại tuyến: khóa ký của CMP lấy từ bundle.json, khóa giải mã của T3 lấy từ secret store.
 * Không tải gì từ CMP, và không có dữ liệu nào trình duyệt gửi lên được dùng để chọn khóa.
 */
export function createReceiptVerifier({
  cmpJwks,
  decryptionJwks,
  issuer,
  audience,
  appId,
  environmentId,
  skewSeconds = 30,
  clock = Date.now,
}) {
  const signing = publicKeys(cmpJwks);
  const decryption = privateKeys(decryptionJwks);
  // `meta` (không bắt buộc) được điền kid của khóa mã hóa T3 và khóa ký CMP để nơi gọi ghi log,
  // kể cả khi xác minh thất bại giữa chừng.
  return (token, { subject, subjectKind }, meta = {}) => {
    if (typeof token !== 'string' || token.length > 65536) throw new JoseError('MALFORMED');
    meta.encKid = peekKid(token);
    const inner = decryptJwe(token, decryption);
    meta.sigKid = peekKid(inner);
    const claims = verifyJws(inner, signing, RECEIPT_TYPE);
    const now = Math.floor(clock() / 1000);
    if (!Number.isSafeInteger(now)) throw new Error('Invalid clock');
    const checks = [
      claims.ver === 1,
      claims.iss === issuer,
      claims.aud === audience,
      claims.appId === appId,
      claims.environmentId === environmentId,
      claims.sub === subject,
      claims.subjectKind === subjectKind,
      typeof claims.jti === 'string' && claims.jti.length > 0,
      typeof claims.transactionId === 'string',
      Number.isSafeInteger(claims.stateRevision),
      claims.consents && typeof claims.consents === 'object',
    ];
    if (!checks.every(Boolean)) throw new JoseError('CONTEXT_MISMATCH');
    if (
      !Number.isSafeInteger(claims.iat)
      || !Number.isSafeInteger(claims.exp)
      || claims.iat > now + skewSeconds
      || claims.exp + skewSeconds <= now
    ) throw new JoseError('EXPIRED');
    for (const state of Object.values(claims.consents)) {
      if (!Number.isSafeInteger(state?.revision) || typeof state.allowed !== 'boolean') {
        throw new JoseError('CONTEXT_MISMATCH');
      }
    }
    return claims;
  };
}

/** Kho quyền bền vững. Mỗi receipt một transaction SQLite: chống trùng theo jti, so revision, rồi ghi. */
export function createPermissionStore(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS processed_receipt(
      jti TEXT PRIMARY KEY, environment_id TEXT NOT NULL, subject TEXT NOT NULL,
      transaction_id TEXT NOT NULL, outcome TEXT NOT NULL, received_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS permission(
      environment_id TEXT NOT NULL, subject TEXT NOT NULL, code TEXT NOT NULL,
      revision INTEGER NOT NULL, allowed INTEGER NOT NULL, expires_at TEXT, state TEXT NOT NULL,
      updated_at TEXT NOT NULL, PRIMARY KEY(environment_id, subject, code));
  `);
  const processed = db.prepare('SELECT outcome FROM processed_receipt WHERE jti=?');
  const current = db.prepare('SELECT revision FROM permission WHERE environment_id=? AND subject=? AND code=?');
  const upsert = db.prepare(`
    INSERT INTO permission(environment_id,subject,code,revision,allowed,expires_at,state,updated_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(environment_id,subject,code) DO UPDATE SET
    revision=excluded.revision, allowed=excluded.allowed, expires_at=excluded.expires_at,
    state=excluded.state, updated_at=excluded.updated_at WHERE excluded.revision > permission.revision`);
  const record = db.prepare(
    'INSERT INTO processed_receipt(jti,environment_id,subject,transaction_id,outcome,received_at) VALUES(?,?,?,?,?,?)',
  );
  const read = db.prepare(
    'SELECT code, revision, allowed, expires_at FROM permission WHERE environment_id=? AND subject=? ORDER BY code',
  );
  const one = db.prepare('SELECT allowed, expires_at FROM permission WHERE environment_id=? AND subject=? AND code=?');
  const transaction = (work) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  return {
    /** Gửi lại receipt cũ trả về kết quả đã lưu; revision cũ hơn không bao giờ khôi phục quyền đã rút. */
    apply(claims) {
      return transaction(() => {
        const previous = processed.get(claims.jti);
        if (previous) return { ...JSON.parse(previous.outcome), duplicate: true };
        const now = new Date().toISOString();
        const codes = {};
        for (const [code, state] of Object.entries(claims.consents)) {
          const stored = current.get(claims.environmentId, claims.sub, code);
          if (stored && stored.revision >= state.revision) {
            codes[code] = stored.revision === state.revision ? 'UNCHANGED' : 'STALE';
            continue;
          }
          upsert.run(
            claims.environmentId,
            claims.sub,
            code,
            state.revision,
            state.allowed ? 1 : 0,
            state.expiresAt ?? null,
            JSON.stringify(state),
            now,
          );
          codes[code] = 'APPLIED';
        }
        const outcome = { jti: claims.jti, stateRevision: claims.stateRevision, codes };
        record.run(claims.jti, claims.environmentId, claims.sub, claims.transactionId, JSON.stringify(outcome), now);
        return { ...outcome, duplicate: false };
      });
    },
    /** Fail-closed: không có bản ghi, allowed=false hoặc đã quá expiresAt đều coi là "không được phép". */
    allowed(environmentId, subject, code) {
      const row = one.get(environmentId, subject, code);
      if (!row || row.allowed !== 1) return false;
      return !row.expires_at || Date.parse(row.expires_at) > Date.now();
    },
    permissions(environmentId, subject) {
      return read.all(environmentId, subject).map((row) => ({
        code: row.code,
        revision: row.revision,
        allowed: row.allowed === 1,
        expiresAt: row.expires_at,
      }));
    },
  };
}
