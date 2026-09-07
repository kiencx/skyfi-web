import createMiddleware from 'next-intl/middleware';
import { defaultLocale, locales } from './i18n';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // For SEO purposes, you might want to use the Accept-Language header
  localeDetection: true
});

export default function middleware(request) {
  const response = intlMiddleware(request);
  const referralCode = request.nextUrl.searchParams.get('rf');
  if (referralCode) {
    response.cookies.set('rf', referralCode, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
  }

  return response;
}




export const config = {
  // Match all pathnames except for
  // - ... files in the public folder
  // - ... files with an extension (e.g. favicon.ico)
  // - /qr routes (global routes without locale)
  matcher: ['/((?!api|_next|_vercel|qr|qrcode|getapp|vikki|jitsi-meeting|monitoring|.*\\..*).*)']
};
