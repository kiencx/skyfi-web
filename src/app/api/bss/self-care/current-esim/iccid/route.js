import { proxySelfCare, readJsonBody } from '../../../_lib/self-care-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await readJsonBody(request);
  return proxySelfCare(request, '/current-esim/iccid', {
    body: { iccid: String(body?.iccid || '').replace(/\s/g, '') },
    mapEsims: true,
  });
}
