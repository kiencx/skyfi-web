import { NextResponse } from 'next/server';
import { bssFetch, isBssAuthError } from '../_lib/bss-auth';
import { bffMessage, localeHeaders } from '../_lib/bss-locale';
import { resolveBssBrand } from '../_lib/bss-brand';

const FILTER_KEYS = [
  'package_type', 'min_price', 'max_price', 'currency', 'min_data', 'max_data',
  'data_unit', 'min_validity_days', 'max_validity_days', 'search', 'data_plan_type', 'page', 'limit',
];

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get('country_code');
  const regionId = searchParams.get('region_id');

  if ((!countryCode && !regionId) || (countryCode && regionId)) {
    return NextResponse.json(
      { success: false, message: bffMessage(request, 'countryOrRegion') },
      { status: 400 },
    );
  }

  const { channel, account } = resolveBssBrand(searchParams.get('brand'));
  const query = new URLSearchParams({ channel });
  if (countryCode) query.set('country_code', countryCode.toUpperCase());
  if (regionId) query.set('region_id', regionId);
  FILTER_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  });

  try {
    const response = await bssFetch(
      `/api/bss/app/v2/public/packages?${query.toString()}`,
      { cache: 'no-store', headers: localeHeaders(request) },
      { account },
    );
    const payload = await response.json().catch(() => null);

    return NextResponse.json(
      payload || { success: false, message: bffMessage(request, 'invalidResponse') },
      { status: response.status },
    );
  } catch (error) {
    if (isBssAuthError(error)) {
      return NextResponse.json({ success: false, message: bffMessage(request, 'unavailable') }, { status: error.status });
    }
    return NextResponse.json(
      { success: false, message: bffMessage(request, 'unreachable') },
      { status: 502 },
    );
  }
}
