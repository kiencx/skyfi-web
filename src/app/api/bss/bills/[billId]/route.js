import { NextResponse } from 'next/server';
import { bssFetch, isBssAuthError } from '../../_lib/bss-auth';
import { bffMessage, localeHeaders } from '../../_lib/bss-locale';
import { resolveBssBrand } from '../../_lib/bss-brand';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { billId } = await params;
  const brand = resolveBssBrand(new URL(request.url).searchParams.get('brand'));
  if (!billId || !brand.partnerId) {
    return NextResponse.json({ success: false, message: bffMessage(request, 'invalidBill') }, { status: 400 });
  }

  try {
    const response = await bssFetch(
      `/api/bss/app/v2/public/bills/${encodeURIComponent(billId)}`,
      { cache: 'no-store', headers: { ...localeHeaders(request), 'X-Partner-ID': brand.partnerId } },
      { account: brand.account },
    );
    const payload = await response.json().catch(() => null);
    return payload?.status === 'success'
      ? NextResponse.json({ success: true, data: payload })
      : NextResponse.json(
        { success: false, message: payload?.message || bffMessage(request, 'checkBillFailed') },
        { status: response.ok ? 502 : response.status },
      );
  } catch (error) {
    if (isBssAuthError(error)) {
      return NextResponse.json({ success: false, message: bffMessage(request, 'unavailable') }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: bffMessage(request, 'unreachable') }, { status: 502 });
  }
}
