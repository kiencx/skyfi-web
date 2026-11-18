import 'server-only';
// =====================================================================================================
// TẦNG NGHIỆP VỤ: XÁC MINH RECEIPT VÀ SỔ QUYỀN (chỉ chạy trên server)
// -----------------------------------------------------------------------------------------------------
// Chuyển từ gói mã mẫu của CMP (cmp-t3-relay-samples/receipts.mjs). Các bước xác minh và quy tắc
// chống trùng/so revision giữ nguyên; chỉ bỏ bảng business_operation dùng cho demo đặt hàng.
//
// Receipt là "biên nhận" CMP phát ra mỗi khi khách chọn đồng ý/từ chối. Nó có 2 lớp:
//   - Lớp ngoài: JWE mã hóa bằng khóa công khai của SkyFi → trình duyệt không đọc/sửa được.
//   - Lớp trong: JWS có chữ ký CMP → SkyFi biết chắc nội dung do CMP phát, không phải giả.
// Nội dung (claims) chính:
//   sub              ID trình duyệt (phải trùng ID trong cookie của request)
//   consents         { COOKIE_ANALYTICS: { allowed, revision, result, expiresAt, ... }, ... }
//   jti              ID duy nhất của receipt (chống gửi lại)
//   stateRevision    phiên bản trạng thái; revision từng mã tăng dần mỗi lần khách đổi lựa chọn
//   iat/exp          hiệu lực 300 giây
//
// File có 2 phần:
//   1. createReceiptVerifier → "kiểm tra biên nhận" (thật hay giả, có đúng của khách này không)
//   2. createPermissionStore → "sổ quyền" SQLite: lưu quyền hiện tại.
//      Ở phần cookie (kind=BROWSER) sổ này CHỈ để đối soát/kiểm toán: việc chặn GA/GTM do SDK trên trình duyệt
//      quyết định (ConsentGate). store.allowed() để sẵn cho phần ACCOUNT (SMS/email tiếp thị…), nơi backend
//      phải tự hỏi sổ trước khi xử lý dữ liệu; hiện chưa có nơi nào gọi.
//
// node:sqlite (Node ≥ 22.5) chỉ được nạp bên trong createPermissionStore, không import ở đầu file: khi
// CMP_ENABLED=false hoặc chạy trên Node cũ, việc nạp/build các route /api/cmp/* không đụng tới node:sqlite.
// =====================================================================================================
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { JoseError, decryptJwe, privateKeys, publicKeys, verifyJws } from './jose';

// Giá trị typ bắt buộc trong header JWS của receipt (chống dùng nhầm loại token khác của CMP).
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
 *
 * Trả về một hàm verify(token, { subject, subjectKind }, meta):
 *   - token        receipt dạng JWE do SDK chuyển về
 *   - subject      ID trình duyệt lấy từ cookie (KHÔNG lấy từ body) → receipt của người khác bị loại
 *   - subjectKind  'BROWSER' cho cookie (sau này 'ACCOUNT' cho tài khoản)
 *   - meta         object để điền kid phục vụ ghi log
 * Hợp lệ → trả claims; sai bất kỳ điểm nào → ném JoseError (route trả 422, SDK giữ lại gửi sau).
 *
 * skewSeconds: cho phép lệch đồng hồ 30 giây giữa server SkyFi và CMP.
 * clock: thay được khi viết test.
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
  // Nạp khóa một lần lúc khởi tạo: khóa công khai CMP (kiểm chữ ký) và khóa riêng SkyFi (giải mã).
  const signing = publicKeys(cmpJwks);
  const decryption = privateKeys(decryptionJwks);
  // `meta` (không bắt buộc) được điền kid của khóa mã hóa T3 và khóa ký CMP để nơi gọi ghi log,
  // kể cả khi xác minh thất bại giữa chừng.
  return (token, { subject, subjectKind }, meta = {}) => {
    // Bước 1: giới hạn độ dài (tài liệu mục 8: ≤ 65 536 ký tự), chống gửi dữ liệu khổng lồ.
    if (typeof token !== 'string' || token.length > 65536) throw new JoseError('MALFORMED');
    // Bước 2: mở "phong bì" JWE bằng khóa riêng của SkyFi → được JWS bên trong.
    meta.encKid = peekKid(token);
    const inner = decryptJwe(token, decryption);
    // Bước 3: kiểm chữ ký CMP trên JWS → được claims đáng tin.
    meta.sigKid = peekKid(inner);
    const claims = verifyJws(inner, signing, RECEIPT_TYPE);
    const now = Math.floor(clock() / 1000);
    if (!Number.isSafeInteger(now)) throw new Error('Invalid clock');
    // Bước 4: kiểm nội dung. Chữ ký đúng chưa đủ: receipt phải dành cho đúng ứng dụng, môi trường
    // và ĐÚNG trình duyệt đang gửi (sub === subject). Thiếu điều kiện nào → CONTEXT_MISMATCH (ca S6).
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
    // Bước 5: kiểm thời hạn: không được ký "ở tương lai" và chưa quá exp (cộng sai lệch đồng hồ) → ca S7.
    if (
      !Number.isSafeInteger(claims.iat)
      || !Number.isSafeInteger(claims.exp)
      || claims.iat > now + skewSeconds
      || claims.exp + skewSeconds <= now
    ) throw new JoseError('EXPIRED');
    // Bước 6: mỗi mã trong consents phải có revision là số nguyên và allowed là true/false.
    for (const state of Object.values(claims.consents)) {
      if (!Number.isSafeInteger(state?.revision) || typeof state.allowed !== 'boolean') {
        throw new JoseError('CONTEXT_MISMATCH');
      }
    }
    return claims;
  };
}

/**
 * Kho quyền bền vững (SQLite, dùng node:sqlite có sẵn trong Node 22+). Mỗi receipt một transaction:
 * chống trùng theo jti, so revision, rồi ghi.
 * Chạy nhiều instance server hoặc container không có ổ đĩa bền → chuyển sang DB dùng chung
 * (PostgreSQL/MySQL…), giữ nguyên logic bên dưới.
 *
 * Bảng processed_receipt: các receipt đã xử lý (khóa jti) + kết quả, để gửi lại thì trả kết quả cũ.
 * Bảng permission: quyền HIỆN TẠI, mỗi dòng = (môi trường, ID trình duyệt, mã) → allowed, revision, hạn.
 *
 * Thiếu node:sqlite (Node < 22.5) → ném Error('NODE_SQLITE_UNAVAILABLE').
 */
// Giữ bản ghi processed_receipt 7 ngày. Receipt chỉ sống 300 giây (+30 giây lệch giờ), quá hạn là bị từ chối
// EXPIRED trước khi tới bước chống trùng, nên bản ghi cũ hơn thế không còn tác dụng chống replay.
const PROCESSED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
// Dọn bảng tối đa mỗi giờ một lần (chạy ngay trong apply, không cần cron).
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

export async function createPermissionStore(path) {
  // Dùng process.getBuiltinModule thay cho import: bundler (webpack/Turbopack) không biết tới lời gọi này nên
  // không đóng gói, và Next không nạp trước (preload) node:sqlite lúc khởi động server. Node không có
  // node:sqlite (hoặc không có getBuiltinModule) → undefined → báo lỗi rõ ràng.
  const sqlite = typeof process.getBuiltinModule === 'function' ? process.getBuiltinModule('node:sqlite') : undefined;
  const DatabaseSync = sqlite?.DatabaseSync;
  if (!DatabaseSync) throw new Error('NODE_SQLITE_UNAVAILABLE');
  // Tự tạo thư mục chứa file DB (vd. .data/) nếu chưa có.
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    -- WAL: cho phép đọc trong lúc đang ghi, giảm khóa DB.
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS processed_receipt(
      jti TEXT PRIMARY KEY, environment_id TEXT NOT NULL, subject TEXT NOT NULL,
      transaction_id TEXT NOT NULL, outcome TEXT NOT NULL, received_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS permission(
      environment_id TEXT NOT NULL, subject TEXT NOT NULL, code TEXT NOT NULL,
      revision INTEGER NOT NULL, allowed INTEGER NOT NULL, expires_at TEXT, state TEXT NOT NULL,
      updated_at TEXT NOT NULL, PRIMARY KEY(environment_id, subject, code));
  `);
  // Câu lệnh chuẩn bị sẵn (prepared statement) để chạy nhanh và chống SQL injection.
  const processed = db.prepare('SELECT outcome FROM processed_receipt WHERE jti=?');
  const current = db.prepare('SELECT revision FROM permission WHERE environment_id=? AND subject=? AND code=?');
  const upsert = db.prepare(`
    INSERT INTO permission(environment_id,subject,code,revision,allowed,expires_at,state,updated_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(environment_id,subject,code) DO UPDATE SET
    revision=excluded.revision, allowed=excluded.allowed, expires_at=excluded.expires_at,
    state=excluded.state, updated_at=excluded.updated_at WHERE excluded.revision > permission.revision`);
  // ↑ Chốt an toàn thứ hai ngay trong SQL: chỉ ghi đè khi revision mới LỚN HƠN revision đang lưu.
  const record = db.prepare(
    'INSERT INTO processed_receipt(jti,environment_id,subject,transaction_id,outcome,received_at) VALUES(?,?,?,?,?,?)',
  );
  const read = db.prepare(
    'SELECT code, revision, allowed, expires_at FROM permission WHERE environment_id=? AND subject=? ORDER BY code',
  );
  const one = db.prepare('SELECT allowed, expires_at FROM permission WHERE environment_id=? AND subject=? AND code=?');
  // received_at lưu dạng ISO 8601 (UTC) nên so sánh chuỗi đúng thứ tự thời gian.
  const prune = db.prepare('DELETE FROM processed_receipt WHERE received_at < ?');
  let lastPrune = 0;
  const pruneIfDue = () => {
    const nowMs = Date.now();
    if (nowMs - lastPrune < PRUNE_INTERVAL_MS) return;
    lastPrune = nowMs;
    prune.run(new Date(nowMs - PROCESSED_RETENTION_MS).toISOString());
  };
  // BEGIN IMMEDIATE: khóa ghi ngay từ đầu, tránh hai request cùng lúc ghi chồng lên nhau.
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
    /**
     * Ghi một receipt ĐÃ XÁC MINH vào sổ. Trả về { jti, stateRevision, codes: { MÃ: kết quả }, duplicate }.
     * Gửi lại receipt cũ trả về kết quả đã lưu; revision cũ hơn không bao giờ khôi phục quyền đã rút.
     * Kết quả từng mã:
     *   APPLIED    revision mới hơn → đã ghi
     *   UNCHANGED  revision bằng bản đang lưu → không đổi
     *   STALE      revision cũ hơn (receipt đến muộn) → bỏ qua (ca S4)
     */
    apply(claims) {
      pruneIfDue();
      return transaction(() => {
        // Đã xử lý jti này rồi (SDK gửi lại, hoặc bị replay) → trả kết quả cũ, không ghi gì (ca S5).
        const previous = processed.get(claims.jti);
        if (previous) return { ...JSON.parse(previous.outcome), duplicate: true };
        const now = new Date().toISOString();
        const codes = {};
        for (const [code, state] of Object.entries(claims.consents)) {
          // So revision với bản đang lưu: chỉ thông tin MỚI HƠN mới được ghi đè.
          const stored = current.get(claims.environmentId, claims.sub, code);
          if (stored && stored.revision >= state.revision) {
            codes[code] = stored.revision === state.revision ? 'UNCHANGED' : 'STALE';
            continue;
          }
          // Ghi quyền mới: allowed lưu 1/0, giữ nguyên state gốc (JSON) để tra cứu khi cần.
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
        // Đánh dấu jti đã xử lý cùng kết quả, trong CÙNG transaction với việc ghi quyền.
        const outcome = { jti: claims.jti, stateRevision: claims.stateRevision, codes };
        record.run(claims.jti, claims.environmentId, claims.sub, claims.transactionId, JSON.stringify(outcome), now);
        return { ...outcome, duplicate: false };
      });
    },
    /**
     * Hỏi "khách này có được phép mã X không?" — dùng trước khi xử lý dữ liệu tương ứng (tài liệu mục 9).
     * HIỆN CHƯA ĐƯỢC GỌI: phần cookie do SDK chặn tag trên trình duyệt; hàm này dành cho phần ACCOUNT làm sau.
     * Fail-closed: không có bản ghi, allowed=false hoặc đã quá expiresAt đều coi là "không được phép".
     * Ví dụ sau này: if (!store.allowed(envId, userId, 'MARKETING_SMS')) không gửi SMS tiếp thị.
     */
    allowed(environmentId, subject, code) {
      const row = one.get(environmentId, subject, code);
      if (!row || row.allowed !== 1) return false;
      return !row.expires_at || Date.parse(row.expires_at) > Date.now();
    },
    /** Liệt kê toàn bộ quyền đã lưu của một khách (route /api/cmp/permissions dùng). */
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
