import { NextResponse } from 'next/server';
import { bssFetch, isBssAuthError } from '../_lib/bss-auth';
import { resolveBssBrand } from '../_lib/bss-brand';

export const dynamic = 'force-dynamic';

// Partners that pay inside their own app (no GalaxyPay redirect).
const WEBVIEW_BRANDS = new Set(['vikki']);

const normalizeItems = (items) => (Array.isArray(items) ? items : []).map((item) => ({
  package_id: Number(item?.package_id),
  quantity: Number(item?.quantity),
}));

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const brandKey = String(body?.brand || '').toLowerCase();
  if (!WEBVIEW_BRANDS.has(brandKey)) {
    return NextResponse.json({ success: false, message: 'Unsupported brand.' }, { status: 400 });
  }

  const customerName = String(body?.customer_name || '').trim();
  const contactPhone = String(body?.contact_phone || '').trim();
  const email = String(body?.email || '').trim();
  const items = normalizeItems(body?.items);

  if (!contactPhone || contactPhone.length > 30 || customerName.length > 255 ||
      (email && !/^\S+@\S+\.\S+$/.test(email)) || !items.length ||
      items.some((item) => !Number.isInteger(item.package_id) || item.package_id <= 0 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) {
    return NextResponse.json({ success: false, message: 'Invalid checkout information.' }, { status: 400 });
  }

  const { account, source, touchpoint, paymentMethod } = resolveBssBrand(brandKey);
  const idempotencyKey = request.headers.get('idempotency-key') || crypto.randomUUID();
  const orderPayload = {
    payment_method: paymentMethod,
    customer_name: customerName || null,
    contact_phone: contactPhone,
    email: email || null,
    touchpoint,
    source,
    segment: 'RETAIL',
    delivery_address: null,
    shipping_amount: 0,
    items,
  };

  try {
    const response = await bssFetch('/api/bss/app/v2/public/create-order-webview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
      cache: 'no-store',
    }, { account });
    const payload = await response.json().catch(() => null);

    // This endpoint answers with the bare postMessage shape instead of the
    // usual `{ success, data }` envelope.
    const data = payload?.data ?? payload;
    const result = response.ok && data?.bill_id
      ? NextResponse.json({
        success: true,
        data: { action: data.action, bill_id: data.bill_id, url_callback: data.url_callback },
      })
      : NextResponse.json(
        { success: false, message: payload?.message || 'Unable to create order.' },
        { status: response.ok ? 502 : response.status },
      );
    result.headers.set('Idempotency-Key', idempotencyKey);
    return result;
  } catch (error) {
    if (isBssAuthError(error)) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: 'Unable to reach BSS API.' }, { status: 502 });
  }
}
