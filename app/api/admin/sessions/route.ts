import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authHelpers';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 200)));

    const res = await query<{
      id: number;
      user_id: number;
      token: string;
      expires_at: string;
      auth_method: string | null;
      created_at: string;
    }>(
      `SELECT id, user_id, token, expires_at, auth_method, created_at
       FROM sessions
       ORDER BY created_at DESC
       LIMIT ${limit}`
    );

    const data = res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      token: r.token,
      expiresAt: r.expires_at,
      authMethod: r.auth_method,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin sessions error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load sessions' }, { status: 500, headers: noStoreHeaders });
  }
}
