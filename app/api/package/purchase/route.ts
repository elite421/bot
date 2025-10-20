import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/authHelpers';
import { query, tx } from '@/lib/db';

type PkgRow = { id: number; name: string; creditAmount: number; priceCents: number };
type IdRow = { id: number };

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser();
    const body = await req.json();
    const { packageId, method = 'simulated', simulateStatus = 'success' } = body || {};
    const pkgId = Number(packageId);
    if (!pkgId) {
      return NextResponse.json({ success: false, message: 'packageId is required' }, { status: 400 });
    }

    const pkgRes = await query<PkgRow>(
      `SELECT id, name, credit_amount AS "creditAmount", price_cents AS "priceCents" FROM packages WHERE id = $1`,
      [pkgId]
    );
    const pkg = pkgRes.rows[0] as PkgRow;
    if (!pkg) return NextResponse.json({ success: false, message: 'Package not found' }, { status: 404 });

    const isSuccess = String(simulateStatus) === 'success';

    const result = await tx(async (client): Promise<{
      id: number;
      userId: number;
      packageId: number;
      status: string;
      creditsPurchased: number;
      method: string;
      amountCents: number;
    }> => {
      const paymentIns = await client.query<IdRow>(
        `INSERT INTO payment_transactions (user_id, package_id, status, credits_purchased, method, amount_cents)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.id, pkg.id, isSuccess ? 'success' : 'failed', pkg.creditAmount, String(method || 'simulated'), pkg.priceCents]
      );
      if (isSuccess) {
        await client.query(
          `INSERT INTO auth_credit_transactions (user_id, type, amount, reason)
           VALUES ($1, 'credit', $2, $3)`,
          [user.id, pkg.creditAmount, `Package purchase: ${pkg.name}`]
        );
      }
      const paymentId = (paymentIns.rows[0] as IdRow).id;
      return { id: paymentId, userId: user.id, packageId: pkg.id, status: isSuccess ? 'success' : 'failed', creditsPurchased: pkg.creditAmount, method: String(method || 'simulated'), amountCents: pkg.priceCents };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    if (e instanceof Response) return e; // from requireUser
    return NextResponse.json({ success: false, message: e?.message || 'Failed to purchase package' }, { status: 500 });
  }
}
