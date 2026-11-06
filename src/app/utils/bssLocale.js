import { routing } from '@/i18n/routing';

/**
 * Locale of the page the user is on, read from the `/[locale]/...` URL segment.
 * Works outside React (services, helpers) where `useLocale()` is not available.
 */
export const pageLocale = () => {
  if (typeof window === 'undefined') return routing.defaultLocale;
  const segment = window.location.pathname.split('/')[1];
  return routing.locales.includes(segment) ? segment : routing.defaultLocale;
};

/** Sent to the `/api/bss/*` proxy so BSS messages and data come back in the page language. */
export const bssLocaleHeaders = (locale = pageLocale()) => ({ 'X-Locale': locale });
