import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authHelpers';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 200)));

    const filter = q.trim();
    const paramsUsers: unknown[] = [];
    let whereSql = '';
    if (filter) {
      paramsUsers.push(`%${filter}%`);
      paramsUsers.push(`%${filter}%`);
      whereSql = 'WHERE (email ILIKE $1 OR name ILIKE $2)';
    }

    const usersPromise = query<{
      id: number;
      email: string | null;
      name: string | null;
      role: string;
      is_blocked: boolean;
      created_at: Date;
    }>(
      `SELECT id, email, name, role, is_blocked, created_at
       FROM users
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      paramsUsers
    );

    // Count successful purchases per user
    const successCountsPromise = query<{
      user_id: number;
      count: string; // pg returns count as text
    }>(
      `SELECT user_id, COUNT(*)::text AS count
       FROM payment_transactions
       WHERE status = 'success'
       GROUP BY user_id`
    );

    // Latest session created_at per user
    const lastSeenPromise = query<{
      user_id: number;
      max_created_at: Date | null;
    }>(
      `SELECT user_id, MAX(created_at) AS max_created_at
       FROM prisma_sessions
       GROUP BY user_id`
    );

    // Sum credits/debits per user
    const creditsAggPromise = query<{
      user_id: number;
      type: 'credit' | 'debit';
      sum_amount: number | null;
    }>(
      `SELECT user_id, type, COALESCE(SUM(amount), 0) AS sum_amount
       FROM auth_credit_transactions
       GROUP BY user_id, type`
    );

    const [usersRes, successCountsRes, lastSeenRes, creditsAggRes] = await Promise.all([
      usersPromise,
      successCountsPromise,
      lastSeenPromise,
      creditsAggPromise,
    ]);
    const users = usersRes.rows;

    const successCountMap = new Map<number, number>();
    for (const row of successCountsRes.rows) {
      const uid = Number(row.user_id);
      const c = Number(row.count || '0');
      successCountMap.set(uid, c);
    }

    const lastSeenMap = new Map<number, Date | null>();
    for (const r of lastSeenRes.rows) lastSeenMap.set(r.user_id, r.max_created_at || null);

    // Compute totalAuthCredits = sum(credits) - sum(debits)
    const creditsMap = new Map<number, number>();
    for (const r of creditsAggRes.rows) {
      const uid = r.user_id as number;
      const current = creditsMap.get(uid) || 0;
      const amt = Number(r.sum_amount || 0);
      if (r.type === 'credit') creditsMap.set(uid, current + amt);
      else if (r.type === 'debit') creditsMap.set(uid, current - amt);
    }

    type U = {
      id: number;
      email: string | null;
      name: string | null;
      role: string;
      isBlocked: boolean;
      createdAt: Date;
    };
    const data = users.map((u: U) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isBlocked: (u as any).is_blocked,
      totalAuthCredits: creditsMap.get(u.id) || 0,
      created_at: (u as any).created_at,
      purchasesSuccessCount: successCountMap.get(u.id) || 0,
      last_login_at: lastSeenMap.get(u.id) || null,
    }));

    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin users error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load users' }, { status: 500, headers: noStoreHeaders });
  }
}
