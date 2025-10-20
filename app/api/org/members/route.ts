import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query, tx } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
} as const;

function normalizeIN(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^0+/, '');
  const cc = String(process.env.DEFAULT_COUNTRY_CODE || '91');
  if (!digits.startsWith(cc) && digits.length <= 10) return `${cc}${digits}`;
  return digits;
}

async function getOwnerOrgId(userId: number): Promise<number | null> {
  const r = await query<{ id: number }>(`SELECT id FROM organizations WHERE owner_user_id = $1 LIMIT 1`, [userId]);
  return r.rows[0]?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const orgId = await getOwnerOrgId(user.id);
    if (!orgId) return NextResponse.json({ success: true, data: [] }, { headers: noStore });
    const res = await query<{ user_id: number; role: string; name: string | null; email: string | null; phone: string | null }>(
      `SELECT ou.user_id, ou.role, u.name, u.email, u.phone
       FROM organization_users ou JOIN users u ON u.id = ou.user_id
       WHERE ou.organization_id = $1
       ORDER BY ou.role DESC, u.created_at ASC`,
      [orgId]
    );
    const data = res.rows.map(r => ({ userId: r.user_id, role: r.role, name: r.name, email: r.email, phone: r.phone }));
    return NextResponse.json({ success: true, data }, { headers: noStore });
  } catch (e: any) {
    console.error('org/members GET error:', e);
    return NextResponse.json({ success: false, message: 'Failed to load members' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const orgId = await getOwnerOrgId(user.id);
    if (!orgId) return NextResponse.json({ success: false, message: 'Organization not found' }, { status: 404, headers: noStore });

    const body = await req.json().catch(() => ({}));
    const email = body.email ? String(body.email).trim() : '';
    const phone = body.phone ? normalizeIN(String(body.phone)) : '';
    const role = (body.role || 'member').toString();

    if (!email && !phone) return NextResponse.json({ success: false, message: 'Provide email or phone' }, { status: 400, headers: noStore });

    const result = await tx(async (client) => {
      // Find or create the user minimally
      let targetUserId: number | null = null;
      if (email) {
        const byEmail = await client.query<{ id: number }>(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email]);
        if (byEmail.rows[0]) targetUserId = byEmail.rows[0].id;
      }
      if (!targetUserId && phone) {
        const byPhone = await client.query<{ id: number }>(`SELECT id FROM users WHERE phone = $1 LIMIT 1`, [phone]);
        if (byPhone.rows[0]) targetUserId = byPhone.rows[0].id;
      }
      if (!targetUserId) {
        const ins = await client.query<{ id: number }>(
          `INSERT INTO users (email, phone, is_verified)
           VALUES ($1, $2, false)
           RETURNING id`,
          [email || null, phone || null]
        );
        targetUserId = ins.rows[0].id;
      }
      await client.query(
        `INSERT INTO organization_users (organization_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [orgId, targetUserId, role]
      );
      return { userId: targetUserId };
    });

    return NextResponse.json({ success: true, data: result }, { headers: noStore });
  } catch (e: any) {
    console.error('org/members POST error:', e);
    return NextResponse.json({ success: false, message: 'Failed to add member' }, { status: 500, headers: noStore });
  }
}
