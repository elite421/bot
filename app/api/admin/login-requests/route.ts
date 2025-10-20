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

    // Ensure table exists (idempotent)
    try {
      await query(`CREATE TABLE IF NOT EXISTS login_requests (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        hash_code TEXT NOT NULL,
        qr_code_data TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        verified_at TIMESTAMPTZ NULL,
        last_failed_reason TEXT NULL,
        last_failed_at TIMESTAMPTZ NULL
      )`);
      await query(`CREATE INDEX IF NOT EXISTS idx_login_requests_phone ON login_requests(phone)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_login_requests_expires_at ON login_requests(expires_at)`);
    } catch {}

    let rows: Array<{
      id: number;
      phone: string;
      hash_code: string;
      is_verified: boolean;
      expires_at: string;
      created_at: string;
      verified_at: string | null;
      last_failed_reason?: string | null;
      last_failed_at?: string | null;
    }> = [];
    try {
      const res = await query<{
        id: number;
        phone: string;
        hash_code: string;
        is_verified: boolean;
        expires_at: string;
        created_at: string;
        verified_at: string | null;
        last_failed_reason?: string | null;
        last_failed_at?: string | null;
      }>(
        `SELECT id, phone, hash_code, is_verified, expires_at, created_at, verified_at,
                NULLIF(last_failed_reason,'') as last_failed_reason,
                last_failed_at
         FROM login_requests
         ORDER BY created_at DESC
         LIMIT ${limit}`
      );
      rows = res.rows as any[];
    } catch (e: any) {
      if (!/relation\s+"?login_requests"?\s+does not exist/i.test(String(e?.message))) {
        throw e;
      }
      rows = [];
    }

    const data = rows.map((r) => ({
      id: r.id,
      phone: r.phone,
      hash: r.hash_code,
      verified: r.is_verified,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      verifiedAt: r.verified_at,
      lastFailedReason: r.last_failed_reason || null,
      lastFailedAt: r.last_failed_at || null,
    }));

    return NextResponse.json({ success: true, data }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('Admin login-requests error:', e);
    if (e instanceof Response) return e;
    const noStoreHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    } as const;
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load login requests' }, { status: 500, headers: noStoreHeaders });
  }
}
