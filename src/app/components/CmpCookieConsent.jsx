'use client';

// Banner cookie CMP (CLIENT_RELAY, kind=BROWSER). Làm theo cmp-t3-relay-samples/cookies.html:
// SDK hiển thị banner, script khai báo bằng data-cmp-code chỉ chạy khi mã đó được đồng ý,
// và mọi receipt đi qua /api/cmp/receipts để server giữ bản gốc đáng tin cậy.
// Fail-closed: nếu SDK không tải được (sai SRI, lỗi mạng) thì không script khai báo nào được kích hoạt.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SDK_URL = process.env.NEXT_PUBLIC_CMP_SDK_URL;
const SDK_INTEGRITY = process.env.NEXT_PUBLIC_CMP_SDK_INTEGRITY;

// Các bản WebView chạy trong app ngân hàng; việc xin đồng ý ở đó thuộc về app (kind=ACCOUNT).
const EXCLUDED_PREFIXES = ['/hdbank-app', '/hdbank-app-v2', '/app-vikki', '/vikki'];
// Cookie của chính SkyFi mà SDK không được xóa: ngôn ngữ của next-intl và cookie ID trình duyệt CMP.
const PROTECTED_COOKIES = ['NEXT_LOCALE', 'skyfi-cmp-local', '__Host-skyfi-cmp'];
const SDK_LANGUAGES = ['vi', 'en'];

const stripLocale = (pathname) => pathname.replace(/^\/(en|vi|ko|zh-TW|zh-CN|ja|th|ru)(?=\/|$)/, '') || '/';

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
        csrf = (await t3('/cookie/begin', {})).csrfToken;
        const config = await t3('/config');
        const CMP = await loadSdk();
        const locale = pathname.split('/')[1];
        const client = CMP.createClient({
          baseUrl: config.cmpBaseUrl,
          appId: config.appId,
          language: SDK_LANGUAGES.includes(locale) ? locale : 'en',
          getAssertion: async () => (await t3('/assertion', {})).assertion,
          // Chỉ resolve khi server đã lưu xong mọi receipt; nếu lỗi, SDK giữ lại để gửi lại sau.
          deliverReceipts: async (receipts) => {
            await t3('/receipts', { receipts: receipts.map((r) => ({ receipt: r.receipt })) });
          },
        });
        const cookies = new CMP.CookieConsent(
          client,
          config.cookieCodes,
          (error) => console.warn('[cmp]', error?.code ?? error?.message),
          undefined,
          { protectedCookies: PROTECTED_COOKIES },
        );
        cookies.activateDeclaredScripts();
        cookies.mountSettingsButton('left');
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
        await cookies.start();
      } catch (error) {
        console.warn('[cmp] cookie consent unavailable, analytics stays off:', error?.message);
      }
    })();
  }, [pathname]);

  return null;
}
