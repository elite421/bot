import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authHelpers';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    const [usersRes, sessionsRes, sessions24hRes, ticketsRes] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM prisma_sessions'),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM prisma_sessions
         WHERE created_at >= NOW() - INTERVAL '24 hours'`
      ),
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM support_tickets'),
    ]);
    const totalUsers = Number(usersRes.rows[0]?.count || '0');
    const totalSessions = Number(sessionsRes.rows[0]?.count || '0');
    const recentSessions = Number(sessions24hRes.rows[0]?.count || '0');
    const totalTickets = Number(ticketsRes.rows[0]?.count || '0');

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        sessionsByMethod: [
          { auth_method: 'unknown', count: totalSessions }
        ],
        sessionsLast24h: [
          { auth_method: 'unknown', count: recentSessions }
        ],
        timestamp: new Date().toISOString(),
        totalTickets,
      },
    }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin summary error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load summary' }, { status: 500, headers: noStoreHeaders });
  }
}
