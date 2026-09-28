import { proxySelfCare } from '../../../_lib/self-care-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return proxySelfCare(request, '/current-esim/session', { withSession: true, mapEsims: true });
}
