import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authHelpers';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id) return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400, headers: noStoreHeaders });
    const { role } = await req.json();
    if (!role || !['user', 'admin'].includes(String(role))) {
      return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400, headers: noStoreHeaders });
    }
    const res = await query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role`,
      [String(role), id]
    );
    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404, headers: noStoreHeaders });
    }
    const user = res.rows[0];
    return NextResponse.json({ success: true, data: user }, { headers: noStoreHeaders });
  } catch (e: any) {
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to update role' }, { status: 500, headers: noStoreHeaders });
  }
}
