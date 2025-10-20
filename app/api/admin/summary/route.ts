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
    async function safeCount(sql: string): Promise<number> {
      try {
        const res = await query<{ count: string }>(sql);
        return Number(res.rows[0]?.count || '0');
      } catch (e: any) {
        // If relation missing or any error, default to 0 for resilience
        return 0;
      }
    }

    const [
      totalUsers,
      totalPrismaSessions,
      recentPrismaSessions,
      totalTickets,
      totalContactMessages,
      totalLoginRequests,
      totalOtpRequests,
      totalSessions,
    ] = await Promise.all([
      safeCount('SELECT COUNT(*)::text AS count FROM users'),
      safeCount('SELECT COUNT(*)::text AS count FROM prisma_sessions'),
      safeCount(`SELECT COUNT(*)::text AS count FROM prisma_sessions
                  WHERE created_at >= NOW() - INTERVAL '24 hours'`),
      safeCount('SELECT COUNT(*)::text AS count FROM support_tickets'),
      safeCount('SELECT COUNT(*)::text AS count FROM contact_messages'),
      safeCount('SELECT COUNT(*)::text AS count FROM login_requests'),
      safeCount('SELECT COUNT(*)::text AS count FROM otp_requests'),
      safeCount('SELECT COUNT(*)::text AS count FROM sessions'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        sessionsByMethod: [
          { auth_method: 'unknown', count: totalPrismaSessions }
        ],
        sessionsLast24h: [
          { auth_method: 'unknown', count: recentPrismaSessions }
        ],
        timestamp: new Date().toISOString(),
        totalTickets,
        totalContactMessages,
        totalLoginRequests,
        totalOtpRequests,
        totalSessions,
        totalPrismaSessions,
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
