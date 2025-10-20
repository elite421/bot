import { NextRequest, NextResponse } from 'next/server';
import { signToken, verifyToken } from '@/lib/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  } as const;
  try {
    const { hash } = await params;
    if (!hash) return NextResponse.json({ success: false, message: 'Hash is required' }, { status: 400, headers: noStoreHeaders });

    // Try extended query (with failure columns). Fallback if columns are missing.
    let request:
      | { id: number; phone: string; isVerified: boolean; expiresAt: string; lastFailedReason?: string | null; lastFailedAt?: string | null }
      | undefined;
    try {
      const ext = await query<{
        id: number;
        phone: string;
        isVerified: boolean;
        expiresAt: string;
        lastFailedReason: string | null;
        lastFailedAt: string | null;
      }>(
        `SELECT id, phone, is_verified AS "isVerified", expires_at AS "expiresAt",
                last_failed_reason AS "lastFailedReason", last_failed_at AS "lastFailedAt"
         FROM login_requests
         WHERE hash_code = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [String(hash)]
      );
      request = ext.rows[0];
    } catch (e: any) {
      const base = await query<{ id: number; phone: string; isVerified: boolean; expiresAt: string }>(
        `SELECT id, phone, is_verified AS "isVerified", expires_at AS "expiresAt"
         FROM login_requests
         WHERE hash_code = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [String(hash)]
      );
      request = base.rows[0] as any;
    }
    if (!request) return NextResponse.json({ success: true, data: { status: 'expired' } }, { headers: noStoreHeaders });

    // If a failure was recorded for this request, surface it immediately as an error and stop polling on the client.
    const failure = (request as any)?.lastFailedReason as string | null | undefined;
    if (failure && !request.isVerified) {
      const msg = failure === 'phone_mismatch'
        ? 'Phone number mismatch. Use the same number you entered on the login page.'
        : 'Verification failed. Please generate a new QR code.';
      return NextResponse.json({ success: false, message: msg }, { headers: noStoreHeaders });
    }
    const now = new Date();
    const expiresAt = new Date(request.expiresAt);
    if (!request.isVerified) {
      if (expiresAt <= now) return NextResponse.json({ success: true, data: { status: 'expired' } }, { headers: noStoreHeaders });
      return NextResponse.json({ success: true, data: { status: 'pending' } }, { headers: noStoreHeaders });
    }

    const phone = String(request.phone);
    // Ensure user exists
    let uid: number | null = null;
    let isBlocked = false;
    const uRes = await query<{ id: number; isBlocked: boolean }>(
      `SELECT id, is_blocked AS "isBlocked" FROM users WHERE phone = $1 LIMIT 1`,
      [phone]
    );
    if (uRes.rows[0]) {
      uid = uRes.rows[0].id;
      isBlocked = Boolean(uRes.rows[0].isBlocked);
    } else {
      const ins = await query<{ id: number; isBlocked: boolean }>(
        `INSERT INTO users (phone) VALUES ($1) RETURNING id, is_blocked AS "isBlocked"`,
        [phone]
      );
      uid = ins.rows[0].id;
      isBlocked = Boolean(ins.rows[0].isBlocked);
    }

    if (isBlocked) return NextResponse.json({ success: false, message: 'Your account is blocked. Please contact support.' }, { status: 403, headers: noStoreHeaders });

    // Best-effort fallback email insertion
    try {
      const fallbackEmail = `${phone}@legacy.local`;
      await query(`INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, [fallbackEmail]);
    } catch {}

    // Reuse last non-expired session, otherwise create a new one
    const lastRes = await query<{ id: number; token: string; expiresAt: string; authMethod: string | null }>(
      `SELECT id, token, expires_at AS "expiresAt", auth_method AS "authMethod"
       FROM sessions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [uid]
    );
    let token: string;
    const last = lastRes.rows[0];
    if (last && new Date(last.expiresAt) > now) {
      // Validate last token against current secrets; if invalid, rotate
      let valid = false;
      try {
        verifyToken(last.token);
        valid = true;
      } catch {}
      if (valid) {
        token = last.token;
        if (!last.authMethod || last.authMethod === 'unknown') {
          try { await query(`UPDATE sessions SET auth_method = 'whatsapp' WHERE id = $1`, [last.id]); } catch {}
        }
      } else {
        token = signToken({ userId: uid, phone });
        const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await query(
          `INSERT INTO sessions (user_id, token, expires_at, auth_method)
           VALUES ($1, $2, $3, 'whatsapp')`,
          [uid, token, newExpiresAt]
        );
      }
    } else {
      token = signToken({ userId: uid, phone });
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await query(
        `INSERT INTO sessions (user_id, token, expires_at, auth_method)
         VALUES ($1, $2, $3, 'whatsapp')`,
        [uid, token, newExpiresAt]
      );
    }

    const resp = { status: 'verified', token, user: { id: uid, phone } } as const;

    return NextResponse.json({ success: true, data: resp }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('verify-qr-status error:', e);
    return NextResponse.json({ success: false, message: 'Failed to check verification status' }, { status: 500, headers: noStoreHeaders });
  }
}
