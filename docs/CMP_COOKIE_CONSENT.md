# CMP cookie consent (CLIENT_RELAY, kind=BROWSER)

Phần banner cookie của tài liệu "Hướng dẫn tích hợp ứng dụng SKYFI" (CMP — GALAXYTELECOM, v0.1).
Chưa làm: luồng tài khoản (`TERMS_SIGNUP`, `MARKETING_*`, kind=ACCOUNT/REGISTRATION), iOS/Android, webhook.

## Luồng

```
Trình duyệt (SDK CMP)                          SkyFi Next.js (/api/cmp/*)            CMP
  POST /api/cmp/cookie/begin  ───────────────►  cấp ID trình duyệt (cookie HttpOnly) + CSRF
  GET  /api/cmp/config        ───────────────►  cmpBaseUrl, appId, mã cookie
  POST /api/cmp/assertion     ───────────────►  ký RS256, kind=BROWSER, channel=WEB, ≤ 60 s
  đổi assertion lấy phiên, người dùng chọn  ───────────────────────────────────────►  phát receipt
  POST /api/cmp/receipts      ───────────────►  giải mã JWE, xác minh JWS, lưu SQLite
```

Backend SkyFi không gọi CMP. GA4 (`G-HBXX8BHMEV`) nằm trong
`<script type="text/plain" data-cmp-code="COOKIE_ANALYTICS">` và chỉ chạy khi SDK thấy mã này được đồng ý.
Nếu SDK không tải được (sai SRI, lỗi mạng) GA4 không chạy (fail-closed).

## File

| File | Vai trò |
|---|---|
| `src/lib/server/cmp/jose.js` | Chép nguyên từ `jose.mjs` của gói mẫu |
| `src/lib/server/cmp/receipts.js` | Từ `receipts.mjs`: xác minh receipt, chống trùng `jti`, chỉ ghi revision mới hơn |
| `src/lib/server/cmp/relay.js` | Cấu hình, cookie ID trình duyệt (HMAC, không cần bảng phiên), kiểm tra Origin + CSRF |
| `src/app/api/cmp/*/route.js` | `config`, `cookie/begin`, `assertion`, `receipts`, `permissions` |
| `src/app/components/CmpCookieConsent.jsx` | Nạp SDK có `integrity`, khởi tạo `CMP.CookieConsent` |
| `src/app/layout.js` | Chặn GA4 khi bật CMP |

### Tag tracking của từng trang

SDK chỉ quét `<script data-cmp-code>` một lần lúc khởi động, nên tag trong các trang render phía client dùng
`<ConsentGate code="...">` (`src/app/components/ConsentGate.jsx`). Banner đăng ký với SDK một "cổng" cho mỗi mã
trong `GATED_CODES` (`src/app/utils/cmpConsent.js`); khi khách đồng ý, cổng mở và trang mới render tag.

| Trang | Tag | Mã |
|---|---|---|
| layout gốc | GA4 `G-HBXX8BHMEV` | `COOKIE_ANALYTICS` (script khai báo) |
| `travelsim`, `travelsim-m2m`, `travelsim/[param]` | GA `G-JWM8CQNVB2`, `G-F9HQDJ3267` | `COOKIE_ANALYTICS` |
| `vj2` | GA `G-HR88CB3F4Y` | `COOKIE_ANALYTICS` |
| `vj2` | GTM `GTM-T54TSR6P` (cả bản `<noscript>`) | `COOKIE_MARKETING` |

Thêm tag mới thì bọc bằng `ConsentGate` với mã phù hợp. Lưu ý: GTM ở `vj2` đang gắn qua `next/head`, vốn không có
tác dụng trong App Router, nên hiện GTM thực tế không nạp. Ta chỉ bọc lại nguyên trạng, không đổi cách nạp.

Khi bật CMP, popup chính sách cũ (`PrivacyPolicyPopup`) bị ẩn để không hiện hai hộp xin đồng ý; tắt CMP thì popup cũ hiện lại.
Lưu ý: popup cũ còn có liên kết mở "Chính sách bảo vệ dữ liệu cá nhân". Nên đưa liên kết này vào mẫu đồng ý cookie trên CMS.

Banner không chạy ở các trang WebView ngân hàng (`/hdbank-app`, `/hdbank-app-v2`, `/app-vikki`, `/vikki`);
khi bật CMP, GA4 ở các trang đó cũng không chạy.

## Bật lên (theo mục 4 của tài liệu, mỗi môi trường một bộ khóa)

1. `node keys.mjs ./secrets/skyfi-dev-private.json` (gói mẫu) → gửi 2 public JWK, issuer, origin, kênh `WEB` cho đội CMP.
2. Nhận `bundle.json`, URL CMP và SRI chính thức; tự tính lại SRI (mục 10.1) và đối chiếu.
3. Điền các biến `CMP_*` trong `.env.local` (xem `.env.example`), bật `CMP_ENABLED` và `NEXT_PUBLIC_CMP_ENABLED`,
   build lại. Thêm domain CMP vào CSP `script-src`/`connect-src` nếu sau này web có CSP.
4. Chạy các ca nghiệm thu S2–S8, S10 ở mục 14.

## Lưu ý vận hành

- Kho quyền là SQLite (`.data/cmp-relay.sqlite`). Với nhiều instance hoặc container không có ổ đĩa bền,
  chuyển sang DB dùng chung, giữ nguyên logic trong `receipts.js`.
- Không commit `secrets/`, `bundle.json` thật hay `.env.local`. Không log assertion, receipt, khóa.
- Log (mục 15): mỗi receipt ghi một dòng `[cmp-relay] receipt` gồm `result`, `jti`, `encKid`, `sigKid`, `codes`.
  Receipt có `result` là `BINDING_DISABLED`, `ACTIVE_VERSION_NOT_FOUND` hoặc `NOT_PERMITTED` (mục 8.1) vẫn bị chặn
  và sinh thêm dòng `[cmp-relay] CMP_CONFIG_ALERT`. Nên đặt cảnh báo trên chuỗi này để báo đội CMP.
- Tên API của SDK (`CMP.createClient`, `CMP.CookieConsent`, `activateDeclaredScripts`, `mountSettingsButton`,
  `start`, `openSettings`, `client.syncConsents`, `client.retryDelivery`) đã đối chiếu với
  `https://cmp.skyfi.com.vn/sdk/1.10.0/cmp.iife.js` (255 085 byte, tải ngày 2026-11-10).
  SRI tự tính: `sha384-uiqc68GsiSzcd3rB4yyOMb/YoUVP2VsP5IdS+Wavf0gsxKJrOCN3BsICcgqgBIcC`; vẫn phải đối chiếu với SRI chính thức của CMP.
- **CORS:** lúc kiểm tra, file SDK trả về không có header `Access-Control-Allow-Origin`. Khi nạp với `integrity` + `crossorigin`,
  trình duyệt sẽ chặn file, banner không hiện (GA vẫn bị chặn đúng fail-closed). Cần đội CMP bật CORS cho `/sdk/`.
