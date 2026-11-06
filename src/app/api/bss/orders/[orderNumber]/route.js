import { NextResponse } from 'next/server';
import { bssFetch, isBssAuthError } from '../../_lib/bss-auth';
import { bffMessage, localeHeaders } from '../../_lib/bss-locale';
import { resolveBssBrand } from '../../_lib/bss-brand';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { orderNumber } = await params;
  if (!orderNumber) {
    return NextResponse.json({ success: false, message: bffMessage(request, 'missingOrder') }, { status: 400 });
  }

  const { account } = resolveBssBrand(new URL(request.url).searchParams.get('brand'));

  try {
    const response = await bssFetch(
      `/api/bss/app/v2/public/orders/${encodeURIComponent(orderNumber)}`,
      { cache: 'no-store', headers: localeHeaders(request) },
      { account },
    );
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload || { success: false, message: bffMessage(request, 'invalidResponse') }, { status: response.status });
  } catch (error) {
    if (isBssAuthError(error)) {
      return NextResponse.json({ success: false, message: bffMessage(request, 'unavailable') }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: bffMessage(request, 'unreachable') }, { status: 502 });
  }
}
