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
    const userId = Number(searchParams.get('userId')) || undefined;
    const type = searchParams.get('type') as 'credit' | 'debit' | null;
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 200)));

    const params: unknown[] = [];
    const conds: string[] = [];
    if (userId) {
      params.push(userId);
      conds.push(`act.user_id = $${params.length}`);
    }
    if (type === 'credit' || type === 'debit') {
      params.push(type);
      conds.push(`act.type = $${params.length}`);
    }
    const whereSql = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const res = await query<{
      id: number;
      user_id: number;
      type: 'credit' | 'debit';
      amount: number;
      reason: string;
      timestamp: string;
      user_email: string | null;
    }>(
      `SELECT act.id, act.user_id, act.type, act.amount, act.reason, act.created_at AS timestamp,
              u.email AS user_email
       FROM auth_credit_transactions act
       LEFT JOIN users u ON u.id = act.user_id
       ${whereSql}
       ORDER BY act.created_at DESC
       LIMIT ${limit}`,
      params
    );

    const data = res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      amount: r.amount,
      reason: r.reason,
      timestamp: r.timestamp,
      user: { id: r.user_id, email: r.user_email },
    }));

    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin usage-logs error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load usage logs' }, { status: 500, headers: noStoreHeaders });
  }
}
