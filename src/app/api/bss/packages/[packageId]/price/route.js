import { NextResponse } from 'next/server';
import { bssFetch, isBssAuthError } from '../../../_lib/bss-auth';
import { bffMessage, localeHeaders } from '../../../_lib/bss-locale';
import { resolveBssBrand } from '../../../_lib/bss-brand';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { packageId } = await params;
  const { searchParams } = new URL(request.url);
  const quantity = Number(searchParams.get('quantity') || 1);

  if (!Number.isInteger(Number(packageId)) || Number(packageId) <= 0 ||
      !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ success: false, message: bffMessage(request, 'invalidPackageOrQuantity') }, { status: 400 });
  }

  const { channel, account } = resolveBssBrand(searchParams.get('brand'));
  const query = new URLSearchParams({ channel, quantity: String(quantity) });

  try {
    const response = await bssFetch(
      `/api/bss/app/v2/public/packages/${encodeURIComponent(packageId)}/price?${query}`,
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
