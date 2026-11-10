import { getCmpRelay, handleError, json, requireBrowserSession } from '@/lib/server/cmp/relay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Ký assertion danh tính (RS256, hiệu lực 60 giây) cho SDK CMP. Subject lấy từ cookie, không lấy từ body. */
export async function POST(request) {
  try {
    const r = getCmpRelay();
    const browserId = requireBrowserSession(request, r);
    return json({ assertion: r.sign({ subject: browserId, kind: 'BROWSER', channel: 'WEB' }) });
  } catch (error) {
    return handleError(error);
  }
}
