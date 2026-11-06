import { NextResponse } from 'next/server';
import { bssFetch, isBssAuthError } from '../_lib/bss-auth';
import { bffMessage, localeHeaders } from '../_lib/bss-locale';
import { resolveBssBrand } from '../_lib/bss-brand';

export const dynamic = 'force-dynamic';

const normalizeItems = (items) => (Array.isArray(items) ? items : []).map((item) => ({
  package_id: Number(item?.package_id),
  quantity: Number(item?.quantity),
}));

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const customerName = String(body?.customer_name || '').trim();
  const contactPhone = String(body?.contact_phone || '').trim();
  const email = String(body?.email || '').trim();
  const items = normalizeItems(body?.items);

  if (!customerName || !contactPhone || !/^\S+@\S+\.\S+$/.test(email) || !items.length ||
      items.some((item) => !Number.isInteger(item.package_id) || item.package_id <= 0 ||
        !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    return NextResponse.json({ success: false, message: bffMessage(request, 'invalidCheckout') }, { status: 400 });
  }

  const { account, channel, source, touchpoint, paymentMethod } = resolveBssBrand(body?.brand);
  if (paymentMethod) {
    return NextResponse.json({ success: false, message: bffMessage(request, 'unsupportedBrand') }, { status: 400 });
  }

  const idempotencyKey = request.headers.get('idempotency-key') || crypto.randomUUID();
  const orderPayload = {
    channel,
    payment_method: 'GALAXYPAY',
    customer_name: customerName,
    contact_phone: contactPhone,
    email,
    touchpoint,
    source,
    segment: 'RETAIL',
    delivery_address: null,
    shipping_amount: 0,
    items,
  };

  try {
    const response = await bssFetch('/api/bss/app/v2/public/orders', {
      method: 'POST',
      headers: {
        ...localeHeaders(request),
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
      cache: 'no-store',
    }, { account });
    const payload = await response.json().catch(() => null);
    const result = NextResponse.json(
      payload || { success: false, message: bffMessage(request, 'invalidResponse') },
      { status: response.status },
    );
    result.headers.set('Idempotency-Key', idempotencyKey);
    return result;
  } catch (error) {
    if (isBssAuthError(error)) {
      return NextResponse.json({ success: false, message: bffMessage(request, 'unavailable') }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: bffMessage(request, 'unreachable') }, { status: 502 });
  }
}
