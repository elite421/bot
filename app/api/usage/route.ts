import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/authHelpers';
import { trackActiveSession } from '@/lib/sessionTracker';
import { getTrialStatus } from '@/lib/trialStatus';
import { sendWhatsAppMessage, buildPurchaseMessage, formatName, formatPurchaseLink } from '@/lib/notifyBot';

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser();
    const userId = Number((user as any).id);
    await trackActiveSession(req, userId);

    // Enforce trial gating for inactivity or exhausted welcome credits (if no paid plan yet)
    const trial = await getTrialStatus(userId);
    if (trial.trialBlocked) {
      // Attempt to send WhatsApp prompt if user opted-in
      try {
        const uRes = await query<{ phone: string | null; name: string | null }>(
          `SELECT phone, name FROM users WHERE id = $1 LIMIT 1`,
          [userId]
        );
        const phoneDigits = (uRes.rows[0]?.phone || '').toString().replace(/\D/g, '');
        const sRes = await query<{ notify_whatsapp: boolean | null }>(
          `SELECT notify_whatsapp FROM user_settings WHERE user_id = $1`,
          [userId]
        );
        const notify = (sRes.rows[0]?.notify_whatsapp ?? true) as boolean;
        if (notify && phoneDigits) {
          const firstName = formatName(uRes.rows[0]?.name || null);
          const link = formatPurchaseLink();
          const text = buildPurchaseMessage(trial.reason === 'credits_exhausted' ? 'credits_exhausted' : 'inactive_90d', firstName, link);
          await sendWhatsAppMessage(phoneDigits, text);
        }
      } catch (e) {
        // non-fatal
        console.error('trial gating WhatsApp notify error:', (e as any)?.message);
      }

      // Block usage and surface prompt info to client
      return NextResponse.json({ success: false, message: 'Free trial access paused. Please purchase a plan to continue.', data: { reason: trial.reason, purchaseLink: formatPurchaseLink() } }, { status: 403 });
    }

    // Compute current balance from ledger (credits - debits)
    const creditRes = await query<{ sum: string | null }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS sum FROM auth_credit_transactions WHERE user_id = $1 AND type = 'credit'`,
      [userId]
    );
    const debitRes = await query<{ sum: string | null }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS sum FROM auth_credit_transactions WHERE user_id = $1 AND type = 'debit'`,
      [userId]
    );
    const balance = Number(creditRes.rows[0]?.sum || '0') - Number(debitRes.rows[0]?.sum || '0');

    if (balance <= 0) {
      return NextResponse.json({ success: false, message: 'Insufficient auth credits' }, { status: 403 });
    }

    // Log debit of 1 credit for usage
    await query(
      `INSERT INTO auth_credit_transactions (user_id, type, amount, reason)
       VALUES ($1, 'debit', 1, 'API usage')`,
      [userId]
    );

    return NextResponse.json({ success: true, data: { remaining: balance - 1 } });
  } catch (e: any) {
    if (e instanceof Response) return e; // from requireUser
    return NextResponse.json({ success: false, message: e?.message || 'Failed to deduct credit' }, { status: 500 });
  }
}
