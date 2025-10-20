import { NextRequest, NextResponse } from 'next/server';
import { query, tx } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
} as const;

async function getOrgByToken(token: string) {
  const r = await query<{ id: number; name: string }>(
    `SELECT o.id, o.name
     FROM org_api_tokens t
     JOIN organizations o ON o.id = t.organization_id
     WHERE t.token = $1 AND t.active = true
     LIMIT 1`,
    [token]
  );
  return r.rows[0] || null;
}

async function getBalance(orgId: number): Promise<number> {
  const r = await query<{ balance: string }>(
    `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount WHEN type='debit' THEN -amount ELSE 0 END),0)::text AS balance
     FROM org_auth_credit_transactions WHERE organization_id = $1`,
    [orgId]
  );
  return Number(r.rows[0]?.balance || '0');
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const headerToken = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.split(' ')[1] : '';
    const xToken = req.headers.get('x-org-token') || '';
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || headerToken || xToken || '').trim();
    const hash = String(body.hash || '').trim();

    if (!token || !hash) {
      return NextResponse.json({ success: false, message: 'token and hash are required' }, { status: 400, headers: noStore });
    }

    const org = await getOrgByToken(token);
    if (!org) return NextResponse.json({ success: false, message: 'Invalid or inactive token' }, { status: 401, headers: noStore });

    // Find verified login request by hash
    const lrRes = await query<{ id: number; phone: string; is_verified: boolean; expires_at: string; verified_at: string | null }>(
      `SELECT id, phone, is_verified, expires_at, verified_at
       FROM login_requests
       WHERE hash_code = $1 AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [hash]
    );
    const lr = lrRes.rows[0];
    if (!lr) return NextResponse.json({ success: false, message: 'Invalid or expired hash' }, { status: 404, headers: noStore });
    if (!lr.is_verified) return NextResponse.json({ success: false, message: 'Pending verification' }, { status: 409, headers: noStore });

    // Charge once per login_request per org
    const result = await tx(async (client) => {
      // Ensure unique usage to avoid double charging
      const exists = await client.query<{ id: number }>(
        `SELECT id FROM org_usages WHERE organization_id = $1 AND login_request_id = $2 LIMIT 1`,
        [org.id, lr.id]
      );
      if (!exists.rows[0]) {
        // Check balance before deduct
        const balRes = await client.query<{ balance: string }>(
          `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount WHEN type='debit' THEN -amount ELSE 0 END),0)::text AS balance
           FROM org_auth_credit_transactions WHERE organization_id = $1`,
          [org.id]
        );
        const balance = Number(balRes.rows[0]?.balance || '0');
        if (balance < 1) {
          throw Object.assign(new Error('INSUFFICIENT_CREDITS'), { code: 'INSUFFICIENT_CREDITS' });
        }
        await client.query(`INSERT INTO org_usages (organization_id, login_request_id, cost) VALUES ($1, $2, 1)`, [org.id, lr.id]);
        await client.query(
          `INSERT INTO org_auth_credit_transactions (organization_id, type, amount, reason) VALUES ($1, 'debit', 1, 'api_validate_hash')`,
          [org.id]
        );
      }
      return true as const;
    });

    // Return masked details
    const phone = lr ? `+${lr.phone}` : undefined;
    return NextResponse.json({ success: true, data: { phone, hash, organizationId: org.id } }, { headers: noStore });
  } catch (e: any) {
    if (e?.code === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ success: false, message: 'Insufficient credits' }, { status: 402, headers: noStore });
    }
    // eslint-disable-next-line no-console
    console.error('public/validate-hash error:', e);
    return NextResponse.json({ success: false, message: 'Validation failed' }, { status: 500, headers: noStore });
  }
}
