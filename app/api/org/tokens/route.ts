import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
} as const;

async function getOwnerOrgId(userId: number): Promise<number | null> {
  const r = await query<{ id: number }>(`SELECT id FROM organizations WHERE owner_user_id = $1 LIMIT 1`, [userId]);
  return r.rows[0]?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const orgId = await getOwnerOrgId(user.id);
    if (!orgId) return NextResponse.json({ success: true, data: [] }, { headers: noStore });
    const r = await query<{ id: number; token: string; active: boolean; created_at: string }>(
      `SELECT id, token, active, created_at FROM org_api_tokens WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId]
    );
    const data = r.rows.map((t) => ({ id: t.id, token: t.token, active: t.active, createdAt: t.created_at }));
    return NextResponse.json({ success: true, data }, { headers: noStore });
  } catch (e: any) {
    console.error('org/tokens GET error:', e);
    return NextResponse.json({ success: false, message: 'Failed to load tokens' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const orgId = await getOwnerOrgId(user.id);
    if (!orgId) return NextResponse.json({ success: false, message: 'Organization not found' }, { status: 404, headers: noStore });
    const token = (await import('crypto')).randomBytes(24).toString('hex');
    await query(`INSERT INTO org_api_tokens (organization_id, token, active) VALUES ($1, $2, true)`, [orgId, token]);
    return NextResponse.json({ success: true, data: { token } }, { headers: noStore });
  } catch (e: any) {
    console.error('org/tokens POST error:', e);
    return NextResponse.json({ success: false, message: 'Failed to create token' }, { status: 500, headers: noStore });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const orgId = await getOwnerOrgId(user.id);
    if (!orgId) return NextResponse.json({ success: false, message: 'Organization not found' }, { status: 404, headers: noStore });
    const { id, active } = await req.json();
    if (!id || typeof active !== 'boolean') return NextResponse.json({ success: false, message: 'id and active are required' }, { status: 400, headers: noStore });
    await query(`UPDATE org_api_tokens SET active = $1 WHERE id = $2 AND organization_id = $3`, [active, Number(id), orgId]);
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (e: any) {
    console.error('org/tokens PATCH error:', e);
    return NextResponse.json({ success: false, message: 'Failed to update token' }, { status: 500, headers: noStore });
  }
}
