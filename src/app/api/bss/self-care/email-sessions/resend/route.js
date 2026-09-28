import { proxySelfCare, readJsonBody } from '../../../_lib/self-care-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await readJsonBody(request);
  return proxySelfCare(request, '/email-sessions/resend', {
    body: {
      email: String(body?.email || '').trim().toLowerCase(),
      pendingToken: String(body?.pendingToken || ''),
    },
  });
}
