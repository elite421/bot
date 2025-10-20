import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/authHelpers';
import { trackActiveSession } from '@/lib/sessionTracker';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser();
    const userId = Number((user as any).id);
    // Update lastSeen for this request context
    await trackActiveSession(req, userId);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)));

    const { rows } = await query(
      `SELECT id, user_id AS "userId", ip, user_agent AS "userAgent", device_info AS "deviceInfo",
              created_at AS "createdAt", last_seen AS "lastSeen"
       FROM prisma_sessions
       WHERE user_id = $1
       ORDER BY last_seen DESC, created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (e: any) {
    if (e instanceof Response) return e; // from requireUser
    return NextResponse.json({ success: false, message: e?.message || 'Failed to fetch sessions' }, { status: 500 });
  }
}
