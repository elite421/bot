import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Surrogate-Control': 'no-store',
  } as const;
  try {
    const { hash, phone } = await req.json();
    if (!hash) return NextResponse.json({ success: false, message: 'Hash code is required' }, { status: 400, headers: noStoreHeaders });
    if (!phone) return NextResponse.json({ success: false, message: 'Sender phone is required' }, { status: 400, headers: noStoreHeaders });
    // Normalize sender phone (include default country code if missing)
    const senderPhone = (() => {
      const rawDigits = String(phone).replace(/\D/g, '');
      const DEFAULT_COUNTRY_CODE = String(process.env.DEFAULT_COUNTRY_CODE || '91');
      let digits = rawDigits.replace(/^0+/, '');
      if (!digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length <= 10) {
        digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
      }
      return digits;
    })();

    // Find latest valid login request by phone + hash only (no hash-only fallback)
    const byPhone = await query<{ id: number; phone: string; isVerified: boolean; expiresAt: string }>(
      `SELECT id, phone, is_verified AS "isVerified", expires_at AS "expiresAt"
       FROM login_requests
       WHERE phone = $1 AND hash_code = $2 AND is_verified = false AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [senderPhone, String(hash)]
    );
    const loginRequest = byPhone.rows[0];

    if (!loginRequest) {
      // If there is a login request for this hash (but different phone), record a mismatch
      try {
        const byHash = await query<{ id: number; phone: string }>(
          `SELECT id, phone FROM login_requests
           WHERE hash_code = $1 AND is_verified = false AND expires_at > NOW()
           ORDER BY created_at DESC
           LIMIT 1`,
          [String(hash)]
        );
        const lr = byHash.rows[0];
        if (lr) {
          // Ensure failure columns exist
          try { await query(`ALTER TABLE public.login_requests ADD COLUMN IF NOT EXISTS last_failed_reason TEXT`); } catch {}
          try { await query(`ALTER TABLE public.login_requests ADD COLUMN IF NOT EXISTS last_failed_at TIMESTAMPTZ`); } catch {}
          await query(`UPDATE login_requests SET last_failed_reason = 'phone_mismatch', last_failed_at = NOW() WHERE id = $1`, [lr.id]);
        }
      } catch {}
      return NextResponse.json({ success: false, message: 'Phone number mismatch. Use the same number you entered on the login page.' }, { status: 400, headers: noStoreHeaders });
    }

    // Mark request verified
    await query(`UPDATE login_requests SET is_verified = true, verified_at = NOW() WHERE id = $1`, [loginRequest.id]);

    const requestPhone = String(loginRequest.phone);
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
    if (isBlocked) return NextResponse.json({ success: false, message: 'Your account is blocked. Please contact support.' }, { status: 403, headers: noStoreHeaders });

    // Best-effort: insert fallback email for admin visibility
    try {
      const fallbackEmail = `${requestPhone}@legacy.local`;
      await query(`INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, [fallbackEmail]);
    } catch {}

    const token = signToken({ userId: uid, phone: requestPhone });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token, expires_at, auth_method)
       VALUES ($1, $2, $3, 'whatsapp')`,
      [uid, token, expiresAt]
    );
    const result = { ok: true, userId: uid, phone: requestPhone, token } as const;

    if ((result as any).blocked) return NextResponse.json({ success: false, message: 'Your account is blocked. Please contact support.' }, { status: 403, headers: noStoreHeaders });
    if (!(result as any).ok) {
      const msg = (result as any).mismatch
        ? 'Phone number mismatch. Use the same number you entered on the login page.'
        : 'Invalid or expired hash code';
      return NextResponse.json({ success: false, message: msg }, { status: 400, headers: noStoreHeaders });
    }

    const { userId: outUserId, phone: reqPhone } = result as any;
    return NextResponse.json({ success: true, message: 'Login successful', data: { token, user: { id: outUserId, phone: reqPhone } } }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('verify-hash-code error:', e);
    const msg = (e && e.name === 'SyntaxError') ? 'Invalid JSON' : 'Failed to verify hash code';
    const status = (e && e.name === 'SyntaxError') ? 400 : 500;
    return NextResponse.json({ success: false, message: msg }, { status, headers: noStoreHeaders });
  }
}
