import { NextResponse } from 'next/server';
import { bssFetch, isBssAuthError } from '../_lib/bss-auth';
import { bffMessage, localeHeaders } from '../_lib/bss-locale';
import { resolveBssBrand } from '../_lib/bss-brand';

const ALLOWED_TYPES = new Set(['COUNTRY', 'REGION', 'GLOBAL']);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || 'COUNTRY').toUpperCase();

  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json(
      { success: false, message: bffMessage(request, 'unsupportedRegionType') },
      { status: 400 },
    );
  }

  const { channel, account } = resolveBssBrand(searchParams.get('brand'));

  try {
    const query = new URLSearchParams({ type, channel });
    const response = await bssFetch(
      `/api/bss/app/v2/public/regions?${query.toString()}`,
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
