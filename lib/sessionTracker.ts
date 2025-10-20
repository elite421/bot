import type { NextRequest } from 'next/server';
import { getClientIp, getUserAgent } from './authHelpers';
import { query } from './db';

export async function trackActiveSession(req: NextRequest, userId: number) {
  try {
    const ip = getClientIp(req) || undefined;
    const userAgent = getUserAgent(req) || undefined;
    const key = {
      userId,
      ip: ip || null,
      userAgent: userAgent || null,
    };

    // Find an existing session record by userId + ip + ua; if none, create; else update last_seen
    const existingRes = await query<{ id: number }>(
      `SELECT id FROM prisma_sessions
       WHERE user_id = $1 AND COALESCE(ip, '') = COALESCE($2, '') AND COALESCE(user_agent, '') = COALESCE($3, '')
       ORDER BY created_at DESC
       LIMIT 1`,
      [key.userId, key.ip, key.userAgent]
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      await query(
        `INSERT INTO prisma_sessions (user_id, ip, user_agent, device_info)
         VALUES ($1, $2, $3, $4)`,
        [userId, ip || null, userAgent || null, userAgent ? JSON.stringify({ userAgent }) : null]
      );
    } else {
      await query(`UPDATE prisma_sessions SET last_seen = NOW() WHERE id = $1`, [existing.id]);
    }
  } catch (e) {
    // Non-fatal
    console.error('trackActiveSession error:', (e as any)?.message);
  }
}
