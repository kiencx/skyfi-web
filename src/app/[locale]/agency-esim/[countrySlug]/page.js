import { redirect } from 'next/navigation';

// Legacy route kept for old links: the package list now lives under
// `/agency-esim/esim/[countrySlug]` and is served by BSS Public API v2.
export default async function LegacyAgencyCountryPage({ params, searchParams }) {
  const { locale, countrySlug } = await params;
  const query = new URLSearchParams();
  Object.entries(await searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') query.set(key, value);
  });
  const suffix = query.toString();
  redirect(`/${locale}/agency-esim/esim/${countrySlug}${suffix ? `?${suffix}` : ''}`);
}
