import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  } as const;
  const manualEnabled = String(process.env.ENABLE_MANUAL_VERIFY || '').toLowerCase() === 'true';
  if (!manualEnabled) {
    return NextResponse.json(
      { success: false, message: 'Manual hash verification is disabled' },
      { status: 403, headers: noStoreHeaders }
    );
  }
  try {
    const { phone, hash } = await req.json();
    if (!phone || !hash) return NextResponse.json({ success: false, message: 'Phone number and hash are required' }, { status: 400, headers: noStoreHeaders });
    const cleanPhone = String(phone).replace(/\D/g, '');

    // Find a valid login request for this phone + hash
    const lrRes = await query<{ id: number }>(
      `SELECT id FROM login_requests
       WHERE phone = $1 AND hash_code = $2 AND is_verified = false AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanPhone, String(hash)]
    );
    const lr = lrRes.rows[0];
    if (!lr) return NextResponse.json({ success: false, message: 'Invalid or expired hash code' }, { status: 400, headers: noStoreHeaders });
    await query(`UPDATE login_requests SET is_verified = true, verified_at = NOW() WHERE id = $1`, [lr.id]);

    // Ensure user exists by phone
    let uid: number | null = null;
    let isBlocked = false;
    const uRes = await query<{ id: number; isBlocked: boolean }>(
      `SELECT id, is_blocked AS "isBlocked" FROM users WHERE phone = $1 LIMIT 1`,
      [cleanPhone]
    );
    if (uRes.rows[0]) {
      uid = uRes.rows[0].id;
      isBlocked = Boolean(uRes.rows[0].isBlocked);
    } else {
      const ins = await query<{ id: number; isBlocked: boolean }>(
        `INSERT INTO users (phone) VALUES ($1) RETURNING id, is_blocked AS "isBlocked"`,
        [cleanPhone]
      );
      uid = ins.rows[0].id;
      isBlocked = Boolean(ins.rows[0].isBlocked);
    }

    if (isBlocked) return NextResponse.json({ success: false, message: 'Your account is blocked. Please contact support.' }, { status: 403, headers: noStoreHeaders });

    // Best-effort fallback email insert for admin visibility
    try {
      const fallbackEmail = `${cleanPhone}@legacy.local`;
      await query(`INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, [fallbackEmail]);
    } catch {}

    const token = signToken({ userId: uid, phone: cleanPhone });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token, expires_at, auth_method)
       VALUES ($1, $2, $3, 'whatsapp')`,
      [uid, token, expiresAt]
    );
    const result = { ok: true, userId: uid, phone: cleanPhone, token } as const;

    const { token: tkn, userId } = result as any;
    return NextResponse.json({ success: true, message: 'Login successful', data: { token: tkn, user: { id: userId, phone: cleanPhone } } }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('verify-hash error:', e);
    return NextResponse.json({ success: false, message: 'Failed to verify hash' }, { status: 500, headers: noStoreHeaders });
  }
}
