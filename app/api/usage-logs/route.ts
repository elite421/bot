import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/authHelpers';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as 'credit' | 'debit' | null;
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 200)));

    const userId = Number((user as any).id);
    const params: any[] = [userId];
    let whereSql = 'WHERE user_id = $1';
    if (type === 'credit' || type === 'debit') {
      params.push(type);
      whereSql += ` AND type = $${params.length}`;
    }
    params.push(limit);
    const { rows } = await query(
      `SELECT id, user_id AS "userId", type, amount, reason, created_at AS "timestamp"
       FROM auth_credit_transactions
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (e: any) {
    if (e instanceof Response) return e; // from requireUser
    return NextResponse.json({ success: false, message: e?.message || 'Failed to fetch usage logs' }, { status: 500 });
  }
}
