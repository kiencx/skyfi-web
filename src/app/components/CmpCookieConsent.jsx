'use client';

// =====================================================================================================
// BANNER COOKIE CMP — phía trình duyệt (CLIENT_RELAY, kind=BROWSER)
// -----------------------------------------------------------------------------------------------------
// Làm theo cmp-t3-relay-samples/cookies.html:
// SDK hiển thị banner, script khai báo bằng data-cmp-code chỉ chạy khi mã đó được đồng ý,
// và mọi receipt đi qua /api/cmp/receipts để server giữ bản gốc đáng tin cậy.
// Fail-closed: nếu SDK không tải được (sai SRI, lỗi mạng) thì không script khai báo nào được kích hoạt.
//
// Được gắn ở src/app/layout.js (chỉ khi NEXT_PUBLIC_CMP_ENABLED=true). Thứ tự chạy:
//   1. POST /api/cmp/cookie/begin   lấy ID trình duyệt (cookie HttpOnly) + CSRF token
//   2. GET  /api/cmp/config         lấy URL CMP, appId, danh sách mã cookie
//   3. Nạp SDK cmp.iife.js          có kiểm tra SRI
//   4. CMP.createClient             nối 2 "đường ống": getAssertion → /api/cmp/assertion,
//                                   deliverReceipts → /api/cmp/receipts
//   5. new CMP.CookieConsent        tạo banner; đăng ký "cổng" cho ConsentGate; quét script data-cmp-code
//   6. cookies.start()              mở phiên với CMP và hiện banner (lần đầu) hoặc áp lựa chọn cũ
// Component không render gì (return null): banner và nút "Cookie" do SDK tự vẽ.
// =====================================================================================================
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { GATED_CODES, grantConsent } from '@/app/utils/cmpConsent';

// URL SDK (vd. https://cmp.skyfi.com.vn/sdk/1.10.0/cmp.iife.js) và mã SRI sha384 của đúng file đó.
// Biến NEXT_PUBLIC_* được nhúng lúc build → đổi giá trị phải build lại.
const SDK_URL = process.env.NEXT_PUBLIC_CMP_SDK_URL;
const SDK_INTEGRITY = process.env.NEXT_PUBLIC_CMP_SDK_INTEGRITY;

// Các bản WebView chạy trong app ngân hàng; việc xin đồng ý ở đó thuộc về app (kind=ACCOUNT).
const EXCLUDED_PREFIXES = ['/hdbank-app', '/hdbank-app-v2', '/app-vikki', '/vikki'];
// Cookie của chính SkyFi mà SDK không được xóa: ngôn ngữ của next-intl và cookie ID trình duyệt CMP.
const PROTECTED_COOKIES = ['NEXT_LOCALE', 'skyfi-cmp-local', '__Host-skyfi-cmp'];
// Ngôn ngữ banner SDK hỗ trợ; locale khác (ko, ja, th…) hiển thị tiếng Anh.
const SDK_LANGUAGES = ['vi', 'en'];

// Bỏ tiền tố locale khỏi đường dẫn: "/vi/hdbank-app/x" → "/hdbank-app/x".
const stripLocale = (pathname) => pathname.replace(/^\/(en|vi|ko|zh-TW|zh-CN|ja|th|ru)(?=\/|$)/, '') || '/';

/**
 * Nạp SDK CMP bằng thẻ <script>.
 * integrity: trình duyệt băm file tải về và so với SRI; file bị sửa → từ chối chạy (onerror).
 * crossOrigin='anonymous': bắt buộc để SRI hoạt động với file khác domain → server CMP phải bật CORS.
 */
const loadSdk = () => new Promise((resolve, reject) => {
  if (window.CMP) return resolve(window.CMP);
  const script = document.createElement('script');
  script.src = SDK_URL;
  script.integrity = SDK_INTEGRITY;
  script.crossOrigin = 'anonymous';
  script.async = true;
  script.onload = () => (window.CMP ? resolve(window.CMP) : reject(new Error('CMP_SDK_MISSING')));
  script.onerror = () => reject(new Error('CMP_SDK_LOAD_FAILED'));
  document.head.appendChild(script);
});

// Chỉ khởi động một lần cho cả phiên trang (khách chuyển trang trong Next.js không khởi động lại).
let started = false;

export default function CmpCookieConsent() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (started) return;
    const path = stripLocale(pathname);
    if (EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return;
    if (!SDK_URL || !SDK_INTEGRITY) {
      console.warn('[cmp] NEXT_PUBLIC_CMP_SDK_URL / NEXT_PUBLIC_CMP_SDK_INTEGRITY missing; analytics stays off.');
      return;
    }
    started = true;

    let csrf = '';
    // hàm gọi API của SkyFi
    // (/api/cmp/*): luôn gửi kèm cookie (credentials) và CSRF token; HTTP lỗi → ném lỗi.
    const t3 = async (path, body) => {
      const response = await fetch(`/api/cmp${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw Object.assign(new Error(data?.error ?? `CMP_${response.status}`), { data });
      return data;
    };

    (async () => {
      try {
        // Bước 1–3: thẻ khách + cấu hình + SDK.
        csrf = (await t3('/cookie/begin', {})).csrfToken;
        const config = await t3('/config');
        const CMP = await loadSdk();
        const locale = pathname.split('/')[1];
        // Bước 4: client SDK. SDK không tự biết khách là ai, cũng không biết nộp biên nhận ở đâu:
        // hai hàm getAssertion / deliverReceipts là "đường ống" nối SDK về server SkyFi.
        const client = CMP.createClient({
          baseUrl: config.cmpBaseUrl,
          appId: config.appId,
          language: SDK_LANGUAGES.includes(locale) ? locale : 'en',
          // Xin "giấy giới thiệu" do server SkyFi ký (hiệu lực 60 giây) để SDK đổi lấy phiên CMP.
          getAssertion: async () => (await t3('/assertion', {})).assertion,
          // Chỉ resolve khi server đã lưu xong mọi receipt; nếu lỗi, SDK giữ lại để gửi lại sau.
          deliverReceipts: async (receipts) => {
            await t3('/receipts', { receipts: receipts.map((r) => ({ receipt: r.receipt })) });
          },
        });
        // Bước 5: banner cookie. Tham số: client, danh sách mã, hàm báo lỗi, (không dùng), tùy chọn.
        // protectedCookies: cookie của SkyFi mà SDK không được xóa khi khách từ chối.
        const cookies = new CMP.CookieConsent(
          client,
          config.cookieCodes,
          (error) => console.warn('[cmp]', error?.code ?? error?.message),
          undefined,
          { protectedCookies: PROTECTED_COOKIES },
        );
        // Phải đăng ký trước cookies.start() (SDK từ chối đăng ký sau khi đã start).
        // Mỗi mã một "cổng" cho tag của các trang render phía client (xem ConsentGate).
        GATED_CODES.filter((code) => config.cookieCodes.includes(code)).forEach((code) => {
          cookies.registerResource({
            id: `skyfi-gate:${code}`,
            consentCodes: [code],
            restartable: false,
            start: () => grantConsent(code),
            // Tag đã chạy thì không gỡ được; SDK sẽ báo khách tải lại trang khi rút đồng ý.
            stop: () => {
              throw Object.assign(new Error('RESOURCE_STOP_FAILED_RELOAD_REQUIRED'), {
                code: 'RESOURCE_STOP_FAILED_RELOAD_REQUIRED',
              });
            },
          });
        });
        // Quét các <script type="text/plain" data-cmp-code> đang có (GA ở layout gốc) để "rã đông" khi được đồng ý.
        cookies.activateDeclaredScripts();
        // Nút "Cookie" nhỏ ở góc dưới bên trái để khách mở lại banner, đổi lựa chọn.
        cookies.mountSettingsButton('left');
        // Cho phép nơi khác (vd. link "Cài đặt cookie" ở footer) mở banner: window.skyfiCookieSettings()
        window.skyfiCookieSettings = () => cookies.openSettings();
        // Tài liệu mục 10.1: có mạng trở lại thì đồng bộ và gửi lại receipt còn chờ.
        // Dùng phương thức trên client: CMP.syncConsents()/CMP.retryDelivery() chỉ chạy sau CMP.init()
        // (nếu không sẽ báo NOT_INITIALIZED), còn ở đây dùng CMP.createClient (đã đối chiếu SDK 1.10.0).
        window.addEventListener('online', () => {
          Promise.resolve()
            .then(() => client.syncConsents())
            .then(() => client.retryDelivery())
            .catch((error) => console.warn('[cmp]', error?.code ?? error?.message));
        });
        // Bước 6: mở phiên với CMP rồi hiện banner (lần đầu) hoặc áp lại lựa chọn đã lưu.
        await cookies.start();
      } catch (error) {
        // Bất kỳ lỗi nào (thiếu cấu hình, SDK sai SRI, CMP lỗi/CORS…) → không hiện gì, GA vẫn bị chặn.
        console.warn('[cmp] cookie consent unavailable, analytics stays off:', error?.message);
      }
    })();
  }, [pathname]);

  return null;
}
