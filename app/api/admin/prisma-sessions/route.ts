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
      ip: string | null;
      user_agent: string | null;
      device_info: any;
      created_at: string;
      last_seen: string;
    }>(
      `SELECT id, user_id, ip, user_agent, device_info, created_at, last_seen
       FROM prisma_sessions
       ORDER BY created_at DESC
       LIMIT ${limit}`
    );

    const data = res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      ip: r.ip,
      userAgent: r.user_agent,
      deviceInfo: r.device_info,
      createdAt: r.created_at,
      lastSeen: r.last_seen,
    }));

    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin prisma-sessions error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load prisma sessions' }, { status: 500, headers: noStoreHeaders });
  }
}
