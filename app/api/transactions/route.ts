import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/authHelpers';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'success' | 'failed' | null;
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || 100)));

    const userId = Number((user as any).id);
    const params: any[] = [userId];
    let whereSql = 'WHERE pt.user_id = $1';
    if (status === 'success' || status === 'failed') {
      params.push(status);
      whereSql += ` AND pt.status = $${params.length}`;
    }
    params.push(limit);
    const { rows } = await query(
      `SELECT pt.id, pt.status, pt.credits_purchased AS "creditsPurchased", pt.method, pt.amount_cents AS "amountCents",
              pt.created_at AS "timestamp", pt.package_id AS "packageId",
              p.id AS "pkg_id", p.name AS "pkg_name", p.credit_amount AS "pkg_creditAmount", p.price_cents AS "pkg_priceCents"
       FROM payment_transactions pt
       LEFT JOIN packages p ON p.id = pt.package_id
       ${whereSql}
       ORDER BY pt.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    const data = rows.map((r: any) => ({
      id: r.id,
      status: r.status,
      creditsPurchased: r.creditsPurchased,
      method: r.method,
      amountCents: r.amountCents,
      timestamp: r.timestamp,
      package: r.pkg_id ? { id: r.pkg_id, name: r.pkg_name, creditAmount: r.pkg_creditAmount, priceCents: r.pkg_priceCents } : null,
    }));
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    if (e instanceof Response) return e; // from requireUser
    return NextResponse.json({ success: false, message: e?.message || 'Failed to fetch transactions' }, { status: 500 });
  }
}
