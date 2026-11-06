import { NextResponse } from 'next/server';
import { bssFetch, isBssAuthError } from '../../_lib/bss-auth';
import { bffMessage, localeHeaders } from '../../_lib/bss-locale';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const regionId = searchParams.get('region_id');
  if (regionId && (!/^\d+$/.test(regionId) || Number(regionId) <= 0)) {
    return NextResponse.json({ success: false, message: bffMessage(request, 'invalidRegionId') }, { status: 400 });
  }

  const query = new URLSearchParams({ channel: process.env.BSS_CHANNEL || 'BSS' });
  if (regionId) query.set('region_id', regionId);

  try {
    const response = await bssFetch(
      `/api/bss/app/v2/public/packages/validity-days?${query.toString()}`,
      { cache: 'no-store', headers: localeHeaders(request) },
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
    return NextResponse.json({ success: false, message: bffMessage(request, 'unreachable') }, { status: 502 });
  }
}
