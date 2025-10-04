import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authHelpers';
import { query } from '@/lib/db';

type TxRow = {
  id: number;
  user_id: number;
  package_id: number;
  status: 'success' | 'failed';
  credits_purchased: number;
  method: string;
  amount_cents: number;
  timestamp: string;
  user_email: string | null;
  user_name: string | null;
  package_name: string | null;
};

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
    const status = searchParams.get('status') as 'success' | 'failed' | null;
    const userId = Number(searchParams.get('userId')) || null;
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 200)));

    const params: unknown[] = [];
    const conds: string[] = [];
    if (status === 'success' || status === 'failed') {
      params.push(status);
      conds.push(`pt.status = $${params.length}`);
    }
    if (userId) {
      params.push(userId);
      conds.push(`pt.user_id = $${params.length}`);
    }
    const whereSql = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const res = await query<TxRow>(
      `SELECT pt.id, pt.user_id, pt.package_id, pt.status, pt.credits_purchased, pt.method, pt.amount_cents, pt.created_at AS timestamp,
              u.email AS user_email, u.name AS user_name,
              p.name AS package_name
       FROM payment_transactions pt
       LEFT JOIN users u ON u.id = pt.user_id
       LEFT JOIN packages p ON p.id = pt.package_id
       ${whereSql}
       ORDER BY pt.created_at DESC
       LIMIT ${limit}`,
      params
    );

    const data = res.rows.map((r: TxRow) => ({
      id: r.id,
      status: r.status,
      creditsPurchased: r.credits_purchased,
      method: r.method,
      amountCents: r.amount_cents,
      timestamp: r.timestamp,
      user: { id: r.user_id, email: r.user_email, name: r.user_name },
      package: { id: r.package_id, name: r.package_name },
    }));

    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin transactions error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load transactions' }, { status: 500, headers: noStoreHeaders });
  }
}
