import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authApi';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { name } = await req.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }

    const { rows } = await query<{ id: number; phone: string | null; name: string | null; email: string | null; role: string | null }>(
      `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, phone, name, email, role`,
      [String(name).trim(), user.id]
    );
    const updated = rows[0];

    return NextResponse.json({ success: true, data: { user: updated } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('profile PUT error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to update profile';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    return NextResponse.json({ success: true, data: { user } });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('profile GET error:', e);
    const msg = /Access token required|Invalid or expired session/.test(String(e?.message)) ? e.message : 'Failed to load profile';
    const status = msg === 'Access token required' || msg === 'Invalid or expired session' ? 401 : 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
