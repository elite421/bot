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

    const { searchParams } = new URL(req.url);
    const groupId = Number(searchParams.get('groupId') || 0);
    if (!groupId) return NextResponse.json({ success: false, message: 'groupId required' }, { status: 400, headers: noStore });

    // Verify group belongs to org
    const ok = await query<{ id: number }>(`SELECT id FROM org_groups WHERE id = $1 AND organization_id = $2 LIMIT 1`, [groupId, orgId]);
    if (!ok.rows[0]) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404, headers: noStore });

    const r = await query<{ user_id: number; name: string | null; email: string | null; phone: string | null }>(
      `SELECT u.id as user_id, u.name, u.email, u.phone
       FROM org_group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY u.created_at ASC`,
      [groupId]
    );
    const data = r.rows.map(m => ({ userId: m.user_id, name: m.name, email: m.email, phone: m.phone }));
    return NextResponse.json({ success: true, data }, { headers: noStore });
  } catch (e: any) {
    console.error('org/group-members GET error:', e);
    return NextResponse.json({ success: false, message: 'Failed to load group members' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const orgId = await getOwnerOrgId(user.id);
    if (!orgId) return NextResponse.json({ success: false, message: 'Organization not found' }, { status: 404, headers: noStore });

    const body = await req.json();
    const groupId = Number(body.groupId || 0);
    const userId = Number(body.userId || 0);
    if (!groupId || !userId) return NextResponse.json({ success: false, message: 'groupId and userId are required' }, { status: 400, headers: noStore });

    // Verify group belongs to org
    const ok = await query<{ id: number }>(`SELECT id FROM org_groups WHERE id = $1 AND organization_id = $2 LIMIT 1`, [groupId, orgId]);
    if (!ok.rows[0]) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404, headers: noStore });

    // Verify user is in organization
    const inOrg = await query<{ user_id: number }>(`SELECT user_id FROM organization_users WHERE organization_id = $1 AND user_id = $2 LIMIT 1`, [orgId, userId]);
    if (!inOrg.rows[0]) return NextResponse.json({ success: false, message: 'User is not a member of the organization' }, { status: 400, headers: noStore });

    await query(
      `INSERT INTO org_group_members (group_id, user_id) VALUES ($1, $2)
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [groupId, userId]
    );

    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (e: any) {
    console.error('org/group-members POST error:', e);
    return NextResponse.json({ success: false, message: 'Failed to add to group' }, { status: 500, headers: noStore });
  }
}
