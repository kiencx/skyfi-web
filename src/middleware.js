import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { defaultLocale, locales } from './i18n';
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE, REFERRAL_QUERY_PARAM } from './app/utils/referralCode';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // For SEO purposes, you might want to use the Accept-Language header
  localeDetection: true
});

const hasLocalePrefix = (pathname) => locales.some(
  (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
);

// GalaxyPay returns to the configured `/checkout/result` URL (no locale segment) and appends
// `language=<vi|en>` from the order. Honour it so a customer who paid in English lands on the
// English result page instead of the cookie/default locale.
const paymentReturnLocale = (request) => {
  const { pathname, searchParams } = request.nextUrl;
  if (!pathname.startsWith('/checkout/') || hasLocalePrefix(pathname)) return null;
  const language = searchParams.get('language');
  return locales.includes(language) ? language : null;
};

// Link giới thiệu `?rf=<mã>`: lưu mã vào cookie để luồng mua gắn vào đơn hàng (giữ 24h).
const rememberReferralCode = (request, response) => {
  const referralCode = request.nextUrl.searchParams.get(REFERRAL_QUERY_PARAM)?.trim();
  if (referralCode) {
    response.cookies.set(REFERRAL_COOKIE, referralCode, {
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return response;
};

export default function middleware(request) {
  const locale = paymentReturnLocale(request);
  if (locale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${request.nextUrl.pathname}`;
    return rememberReferralCode(request, NextResponse.redirect(url));
  }
  return rememberReferralCode(request, intlMiddleware(request));
}




export const config = {
  // Match all pathnames except for
  // - ... files in the public folder
  // - ... files with an extension (e.g. favicon.ico)
  // - /qr routes (global routes without locale)
  matcher: ['/((?!api|_next|_vercel|qr|qrcode|getapp|vikki|jitsi-meeting|monitoring|.*\\..*).*)']
};
