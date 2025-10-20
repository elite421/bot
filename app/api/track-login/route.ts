import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getClientIp, getUserAgent } from '@/lib/authHelpers';
import { requireAuth } from '@/lib/authApi';
import { trackActiveSession } from '@/lib/sessionTracker';
import { sendWhatsAppMessage } from '@/lib/notifyBot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let user: any | null = null;
    let method: 'session' | 'token' = 'session';

    // Try NextAuth session first
    try {
      const res = await requireUser();
      user = res.user;
      method = 'session';
    } catch (e) {
      // If not authed by session, try Bearer token (legacy JWT)
      try {
        const res2 = await requireAuth(req as any);
        user = res2.user;
        method = 'token';
      } catch {
        // fall through, will return skipped below
      }
    }

    if (!user) {
      // Don't block the flow if auth context isn't ready yet
      return NextResponse.json({ success: true, skipped: true });
    }

    // Record active session
    await trackActiveSession(req, user.id);

    // Best-effort login alert via WhatsApp to the user's phone
    const phone = user.phone as string | null;
    if (phone) {
      const ip = getClientIp(req) || 'unknown IP';
      const ua = getUserAgent(req) || 'unknown device';
      const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const text = `Login alert: Your TruOTP account was accessed on ${ts} from ${ip} using ${ua}. Method: ${method === 'token' ? 'password/QR' : 'session'}. If this wasn’t you, please revoke other sessions from Settings.`;
      try { await sendWhatsAppMessage(phone, text); } catch {}
    }

    return NextResponse.json({ success: true, alerted: Boolean(user.phone) });
  } catch (e: any) {
    // If the session isn't ready yet, don't fail the login flow; just return success.
    if (e instanceof Response) {
      const status = (e as Response).status;
      if (status === 401 || status === 403) {
        return NextResponse.json({ success: true, skipped: true });
      }
      return e;
    }
    return NextResponse.json({ success: false, message: e?.message || 'Failed to track login' }, { status: 500 });
  }
}
