import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hash = url.searchParams.get('hash');
    if (!hash) return new NextResponse('Missing hash', { status: 400 });

    const lrRes = await query<{ id: number; phone: string; isVerified: boolean; expiresAt: string }>(
      `SELECT id, phone, is_verified AS "isVerified", expires_at AS "expiresAt"
       FROM login_requests
       WHERE hash_code = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [String(hash)]
    );
    const lr = lrRes.rows[0];
    if (!lr) return new NextResponse('Invalid or expired link', { status: 400 });

    const now = new Date();
    const expiresAt = new Date(lr.expiresAt as any);
    if (expiresAt <= now) return new NextResponse('Invalid or expired link', { status: 400 });

    if (!lr.isVerified) {
      await query(`UPDATE login_requests SET is_verified = true, verified_at = NOW() WHERE id = $1`, [lr.id]);
    }

    const requestPhone = String(lr.phone);
    // Ensure user exists
    let uid: number | null = null;
    let isBlocked = false;
    const uRes = await query<{ id: number; isBlocked: boolean }>(
      `SELECT id, is_blocked AS "isBlocked" FROM users WHERE phone = $1 LIMIT 1`,
      [requestPhone]
    );
    if (uRes.rows[0]) {
      uid = uRes.rows[0].id;
      isBlocked = Boolean(uRes.rows[0].isBlocked);
    } else {
      const ins = await query<{ id: number; isBlocked: boolean }>(
        `INSERT INTO users (phone) VALUES ($1) RETURNING id, is_blocked AS "isBlocked"`,
        [requestPhone]
      );
      uid = ins.rows[0].id;
      isBlocked = Boolean(ins.rows[0].isBlocked);
    }
    if (isBlocked) return new NextResponse('Your account is blocked. Please contact support.', { status: 403 });

    const token = signToken({ userId: uid, phone: requestPhone });
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token, expires_at, auth_method)
       VALUES ($1, $2, $3, 'whatsapp')`,
      [uid, token, sessionExpiresAt]
    );

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const u = new URL('/after-login-page', frontendBase);
    u.searchParams.set('bot_token', token);
    u.searchParams.set('bot_user', JSON.stringify({ phone: requestPhone }));
    return NextResponse.redirect(u.toString(), { status: 302 });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('whatsapp-verify error:', e);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
