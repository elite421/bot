import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTrialStatus } from '@/lib/trialStatus';
import { formatPurchaseLink } from '@/lib/notifyBot';
import { requireAuth } from '@/lib/authApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    let authCredit = 0;
    let gating: any = null;
    try {
      const userId = Number(user.id);
      if (Number.isFinite(userId)) {
        const [creditRes, debitRes, trial] = await Promise.all([
          query<{ sum: string | null }>(`SELECT COALESCE(SUM(amount), 0)::text AS sum FROM auth_credit_transactions WHERE user_id = $1 AND type = 'credit'`, [userId]),
          query<{ sum: string | null }>(`SELECT COALESCE(SUM(amount), 0)::text AS sum FROM auth_credit_transactions WHERE user_id = $1 AND type = 'debit'`, [userId]),
          getTrialStatus(userId),
        ]);
        const credits = Number(creditRes.rows[0]?.sum || '0');
        const debits = Number(debitRes.rows[0]?.sum || '0');
        authCredit = credits - debits;
        gating = {
          trialBlocked: !!trial.trialBlocked,
          reason: trial.reason || null,
          remainingTrialCredits: trial.remainingTrialCredits,
          lastActiveAt: trial.lastActiveAt,
          purchaseLink: formatPurchaseLink(),
        };
      }
    } catch {}

    return NextResponse.json({ success: true, data: { user: { ...user, authCredit }, gating } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('me error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to get user info';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
