import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { user } = await requireAuth(req as any);
    const url = new URL(req.url);
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 100)));

    // Resolve organization for this user: owner or admin
    const orgRes = await query<{ id: number }>(
      `SELECT o.id
       FROM organizations o
       LEFT JOIN organization_users ou ON ou.organization_id = o.id AND ou.user_id = $1
       WHERE o.owner_user_id = $1 OR (ou.user_id = $1 AND ou.role IN ('owner','admin'))
       ORDER BY o.created_at ASC
       LIMIT 1`,
      [user.id]
    );
    const org = orgRes.rows[0];
    if (!org) return NextResponse.json({ success: true, data: [] });

    const whereDate = (col: string) =>
      `${fromDate ? `${col} >= '${fromDate} 00:00:00'::timestamp AND ` : ''}${toDate ? `${col} <= '${toDate} 23:59:59'::timestamp AND ` : ''}${col} IS NOT NULL`;

    const usagesRes = await query<{
      id: number;
      created_at: string;
      cost: number;
      login_request_id: number;
      phone: string | null;
      hash_code: string | null;
    }>(
      `SELECT u.id, u.created_at, u.cost, u.login_request_id, lr.phone, lr.hash_code
       FROM org_usages u
       LEFT JOIN login_requests lr ON lr.id = u.login_request_id
       WHERE u.organization_id = $1 AND ${whereDate('u.created_at')}
       ORDER BY u.created_at DESC
       LIMIT ${limit}`,
      [org.id]
    );

    const creditsRes = await query<{
      id: number;
      type: string;
      amount: number;
      reason: string;
      created_at: string;
    }>(
      `SELECT id, type, amount, reason, created_at
       FROM org_auth_credit_transactions
       WHERE organization_id = $1 AND ${whereDate('created_at')}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      [org.id]
    );

    type Row = { id: string; sessionId: string; credit: number; debit: number; balance?: number; type: string; remark: string; date: string };
    const items: Row[] = [];

    for (const u of usagesRes.rows) {
      items.push({
        id: `U${u.id}`,
        sessionId: String(u.login_request_id),
        credit: 0,
        debit: u.cost || 1,
        type: 'debit',
        remark: `validate_hash ${u.hash_code?.slice(0, 8) || ''}`.trim(),
        date: u.created_at,
      });
    }
    for (const c of creditsRes.rows) {
      items.push({
        id: `C${c.id}`,
        sessionId: '-',
        credit: c.type === 'credit' ? c.amount : 0,
        debit: c.type === 'debit' ? c.amount : 0,
        type: c.type,
        remark: c.reason,
        date: c.created_at,
      });
    }
    items.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

    return NextResponse.json({ success: true, data: items });
  } catch (e: any) {
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to load usage report';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
