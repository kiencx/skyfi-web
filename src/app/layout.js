import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Eruda from "./components/Eruda";
import CmpCookieConsent from "./components/CmpCookieConsent";

// Đồng ý cookie qua CMP (CLIENT_RELAY). Mặc định tắt: GA4 nạp y như trước.
// Khi bật: GA4 chờ đồng ý COOKIE_ANALYTICS và không chạy nếu SDK CMP không tải được (fail-closed).
const CMP_ENABLED = process.env.NEXT_PUBLIC_CMP_ENABLED === "true";
const GA_ID = "G-HBXX8BHMEV";
const GA_CONFIG = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
`;
const GA_LOADER = `
  (function () {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
    document.head.appendChild(s);
    ${GA_CONFIG}
  })();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SkyFi",
  description: "SkyFi là nhà cung cấp dịch vụ eSIM (4G, 5G) tốc độ cao toàn cầu, kết nối với các tiện ích: hàng không, ăn uống, vui chơi, giải trí, mua sắm...",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vn">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {CMP_ENABLED ? (
          <>
            {/* Không chạy cho tới khi SDK CMP thấy COOKIE_ANALYTICS được đồng ý (ca nghiệm thu S8). */}
            <script
              type="text/plain"
              data-cmp-code="COOKIE_ANALYTICS"
              dangerouslySetInnerHTML={{ __html: GA_LOADER }}
            />
            <CmpCookieConsent />
          </>
        ) : (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {GA_CONFIG}
            </Script>
          </>
        )}
        <Eruda />
        {children}
      </body>
    </html>
  );
}
